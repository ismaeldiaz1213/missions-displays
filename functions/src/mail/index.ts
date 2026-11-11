import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { render, type Lang, type TemplateVars } from './templates.js';
import { sendMail } from './transport.js';
import { formatDay, quarterLabel, quarterStatus, quartersOfYear, reportingYears, todayIn, type ReportSettings } from './quarters.js';

// Values live in functions/.env (see docs/EMAIL_SETUP.md). MAIL_TRANSPORT=log sends nothing.
const MAIL_TRANSPORT = defineString('MAIL_TRANSPORT', { default: 'log' });
const MAIL_FROM = defineString('MAIL_FROM', { default: 'misiones@iblibertad.org' });
const MAIL_FROM_NAME = defineString('MAIL_FROM_NAME', { default: 'Misiones · Iglesia Bautista Libertad' });
const MAIL_SIGNER = defineString('MAIL_SIGNER', { default: 'mail-sender@ibl-missions-display.iam.gserviceaccount.com' });
const NOTIFY_EMAIL = defineString('NOTIFY_EMAIL', { default: 'misiones@iblibertad.org' });
export const SITE_URL = defineString('SITE_URL', { default: 'https://misiones.iblibertad.org' });

const REGION = 'us-east1';
const TIME_ZONE = 'America/Chicago';
export const PORTAL_PATH = '/misioneros/mi-pagina';

const db = () => getFirestore();

export interface QueuedMail {
  to: string;
  template: string;
  lang: Lang;
  vars: TemplateVars;
  missionaryId?: string;
  campaignId?: string;
}

/**
 * Adds an email to the outbox (mail/{id}); sendQueuedMail sends it. With `id`, the same email is
 * never queued twice (used for reminders).
 */
export const queueMail = async (m: QueuedMail, id?: string) => {
  const data = { ...m, missionaryId: m.missionaryId ?? '', campaignId: m.campaignId ?? '', status: 'queued', createdAt: FieldValue.serverTimestamp(), createdBy: 'system' };
  if (!id) return db().collection('mail').add(data);
  try {
    await db().collection('mail').doc(id).create(data);
  } catch (err) {
    if ((err as { code?: number }).code === 6) return; // ALREADY_EXISTS: sent before
    throw err;
  }
};

export const notifyAdmins = (template: string, vars: TemplateVars) =>
  queueMail({ to: NOTIFY_EMAIL.value(), template, lang: 'es', vars });

/** Sends every email added to the outbox, and records how it went on the same document. */
export const sendQueuedMail = onDocumentCreated({ document: 'mail/{id}', region: REGION, retry: false }, async (event) => {
  const snap = event.data;
  if (!snap) return;
  const m = snap.data() as QueuedMail & { status: string };
  if (m.status !== 'queued') return;
  try {
    const msg = render(m.template, m.lang === 'en' ? 'en' : 'es', m.vars ?? {});
    const result = await sendMail(MAIL_TRANSPORT.value(), MAIL_SIGNER.value(), { from: MAIL_FROM.value(), fromName: MAIL_FROM_NAME.value() }, m.to, msg);
    await snap.ref.update({ status: result.status, messageId: result.messageId, subject: msg.subject, sentAt: FieldValue.serverTimestamp() });
  } catch (err) {
    logger.error('Email failed', { id: snap.id, to: m.to, err: String(err) });
    await snap.ref.update({ status: 'error', error: String(err).slice(0, 500) });
  }
});

// ── Missionary page requests ─────────────────────────────────────────────────

/** Confirms to the missionary that their request arrived, and tells the missions inbox. */
export const onMissionaryRequest = onDocumentCreated({ document: 'missionaryRequests/{id}', region: REGION }, async (event) => {
  const r = event.data?.data();
  if (!r) return;
  const name = [r.name, r.lastName].filter(Boolean).join(' ');
  if (typeof r.email === 'string' && r.email.includes('@')) {
    await queueMail({ to: r.email.trim(), template: 'requestReceived', lang: r.language === 'en' ? 'en' : 'es', vars: { name: r.name } });
  }
  await notifyAdmins('newRequestAdmin', {
    missionary: name,
    details: [r.organization, [r.city, r.country].filter(Boolean).join(', '), r.email, r.phone].filter(Boolean).join('\n'),
    url: `${SITE_URL.value()}/admin?tab=solicitudes`,
  });
});

// ── Quarterly reports ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ReportSettings = { startMonth: 11, firstYear: 2026, dueDays: 15 };

const getSettings = async (): Promise<ReportSettings> => {
  const snap = await db().doc('settings/reportPeriods').get();
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<ReportSettings> | undefined) };
};

const isEmail = (v: unknown): v is string => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Who to write to, their first name and language. */
export const recipientFor = async (missionaryId: string) => {
  const [page, profile] = await Promise.all([
    db().doc(`missionaries/${missionaryId}`).get(),
    db().doc(`missionaryProfiles/${missionaryId}`).get(),
  ]);
  const p = profile.data() ?? {};
  const m = page.data() ?? {};
  const publicEmail = (m.contactInfo as { type: string; value: string }[] | undefined)?.find((c) => c.type === 'email')?.value;
  const email = isEmail(p.email) ? p.email.trim() : isEmail(publicEmail) ? publicEmail.trim() : '';
  return { email, name: String(m.name ?? ''), lang: (p.language === 'en' ? 'en' : 'es') as Lang, published: page.exists };
};

/**
 * Every morning: reminders a week before a report is due, on the due day, and a week after —
 * only to missionaries with an email who haven't sent the report or said "no updates".
 * Admins can pause reminders from the Correos tab (settings/email.remindersEnabled).
 */
export const sendReportReminders = onSchedule({ schedule: 'every day 08:00', timeZone: TIME_ZONE, region: REGION }, async () => {
  const emailSettings = (await db().doc('settings/email').get()).data() ?? {};
  if (emailSettings.remindersEnabled === false) {
    logger.info('Report reminders are paused');
    return;
  }
  const s = await getSettings();
  const today = todayIn(TIME_ZONE);
  const shift = (date: string, days: number) => {
    const [y, mo, d] = date.split('-').map(Number);
    const t = new Date(Date.UTC(y, mo - 1, d + days));
    return t.toISOString().slice(0, 10);
  };
  const due = reportingYears(s, today).flatMap((y) => quartersOfYear(y, s)).flatMap((q) => {
    const stage = shift(q.due, -7) === today ? 'before' : q.due === today ? 'due' : shift(q.due, 7) === today ? 'after' : null;
    return stage ? [{ q, stage: stage as 'before' | 'due' | 'after' }] : [];
  });
  if (!due.length) return;

  const [missionaries, reports] = await Promise.all([
    db().collection('missionaries').get(),
    db().collection('missionaryReports').get(),
  ]);
  const subsBy = new Map<string, { quarterId: string; kind: string; reviewedAt: unknown }[]>();
  for (const r of reports.docs) {
    const d = r.data();
    const list = subsBy.get(d.missionaryId) ?? [];
    list.push({ quarterId: d.quarterId, kind: d.kind, reviewedAt: d.reviewedAt });
    subsBy.set(d.missionaryId, list);
  }

  let queued = 0;
  for (const { q, stage } of due) {
    for (const m of missionaries.docs) {
      const status = quarterStatus(q, subsBy.get(m.id) ?? [], today);
      if (status !== 'pending' && status !== 'late') continue;
      const who = await recipientFor(m.id);
      if (!who.email) continue; // shown on the admin's Inicio screen instead
      await queueMail({
        to: who.email, template: 'reportReminder', lang: who.lang, missionaryId: m.id,
        vars: {
          name: who.name, stage, quarter: quarterLabel(q, who.lang), due: formatDay(q.due, who.lang),
          url: `${SITE_URL.value()}${PORTAL_PATH}?informe=${q.id}`,
        },
      }, `reminder-${m.id}-${q.id}-${stage}`);
      queued++;
    }
  }
  logger.info('Report reminders queued', { queued, quarters: due.map((d) => `${d.q.id}:${d.stage}`) });
});

/** A missionary sent a report (or "no updates") from their page: thank them and tell the inbox. */
export const onReportSubmitted = onDocumentCreated({ document: 'missionaryReports/{id}', region: REGION }, async (event) => {
  const r = event.data?.data();
  if (!r || r.submittedBy !== 'missionary') return; // admins recording reports don't trigger emails
  const s = await getSettings();
  const year = Number(String(r.quarterId).slice(0, 4));
  const q = quartersOfYear(year, s).find((x) => x.id === r.quarterId);
  if (!q) return;
  const who = await recipientFor(r.missionaryId);
  const page = (await db().doc(`missionaries/${r.missionaryId}`).get()).data() ?? {};
  const fullName = [page.name, page.lastName].filter(Boolean).join(' ');
  if (r.kind === 'report' && who.email) {
    await queueMail({ to: who.email, template: 'reportReceived', lang: who.lang, missionaryId: r.missionaryId,
      vars: { name: who.name, quarter: quarterLabel(q, who.lang) } });
  }
  await notifyAdmins('reportReceivedAdmin', {
    missionary: fullName, quarter: quarterLabel(q, 'es'),
    details: r.kind === 'noUpdates' ? 'dice que no tiene novedades este trimestre.' : `envió su informe${r.pdfPath ? ' (PDF adjunto en el panel)' : ''}.${r.comments ? `\n\n${r.comments}` : ''}`,
    url: `${SITE_URL.value()}/admin?tab=misioneros&m=${r.missionaryId}&seccion=informes`,
  });
});
