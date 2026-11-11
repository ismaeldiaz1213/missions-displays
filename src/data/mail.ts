import {
  Timestamp, addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore/lite';
import { db } from '../firebase';

// The email outbox (mail/{id}): admins queue emails here and the sendQueuedMail Cloud Function
// sends them and records the result. Automatic emails (confirmations, reminders) are queued by
// the functions. Nothing is deleted, so this is also the history of every email.

export type MailStatus = 'queued' | 'sent' | 'logged' | 'error';

export interface MailRecord {
  id: string;
  to: string;
  template: string;
  lang: 'es' | 'en';
  subject: string;
  missionaryId: string;
  campaignId: string;
  status: MailStatus;
  error: string;
  createdAt: string;
  createdBy: string;
  sentAt: string;
  vars: Record<string, string>;
}

const mailCol = collection(db, 'mail');
const campaignsCol = collection(db, 'mailCampaigns');
const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : '');

const toMail = (id: string, d: Record<string, unknown>): MailRecord => ({
  to: '', template: '', lang: 'es', subject: '', missionaryId: '', campaignId: '', status: 'queued', error: '', createdBy: '', vars: {},
  ...(d as Partial<MailRecord>),
  id, createdAt: iso(d.createdAt), sentAt: iso(d.sentAt),
});

const newestFirst = (a: MailRecord, b: MailRecord) => b.createdAt.localeCompare(a.createdAt);

export const listMailFor = async (missionaryId: string) =>
  (await getDocs(query(mailCol, where('missionaryId', '==', missionaryId)))).docs.map((d) => toMail(d.id, d.data())).sort(newestFirst);

export const listMailForCampaign = async (campaignId: string) =>
  (await getDocs(query(mailCol, where('campaignId', '==', campaignId)))).docs.map((d) => toMail(d.id, d.data())).sort(newestFirst);

/** Text the admin wrote, in Spanish and (optionally) English. {nombre} becomes each person's name. */
export interface Message { subject: string; body: string; subjectEn: string; bodyEn: string }

export interface Recipient { missionaryId: string; email: string; name: string; lang: 'es' | 'en' }

export interface Campaign extends Message {
  id: string;
  audience: string;
  recipients: Recipient[];
  /** Missionaries in the audience with no email: reach them another way. */
  offline: { missionaryId: string; name: string; contact: string }[];
  offlineDone: Record<string, boolean>;
  createdAt: string;
  createdBy: string;
}

const pick = (m: Message, lang: 'es' | 'en') =>
  lang === 'en' && m.subjectEn.trim() && m.bodyEn.trim() ? { subject: m.subjectEn.trim(), body: m.bodyEn.trim() } : { subject: m.subject.trim(), body: m.body.trim() };

const mailDoc = (r: Recipient, m: Message, by: string, campaignId: string) => {
  const lang = r.lang === 'en' && m.subjectEn.trim() && m.bodyEn.trim() ? 'en' : 'es';
  return {
    to: r.email, template: 'custom', lang, vars: { name: r.name, ...pick(m, lang) },
    missionaryId: r.missionaryId, campaignId, status: 'queued', createdAt: serverTimestamp(), createdBy: by,
  };
};

/** "Enviarme una prueba": the message as one recipient would get it, sent to the admin. */
export const sendTest = (m: Message, as: Recipient, to: string) =>
  addDoc(mailCol, mailDoc({ ...as, email: to, missionaryId: '' }, m, to, ''));

/** Saves the campaign and queues one email per recipient (in batches of 400). */
export const sendCampaign = async (
  m: Message, audience: string, recipients: Recipient[], offline: Campaign['offline'], by: string,
) => {
  const ref = doc(campaignsCol);
  await setDoc(ref, {
    ...m, audience, recipients, offline, offlineDone: {}, createdAt: serverTimestamp(), createdBy: by,
  });
  for (let i = 0; i < recipients.length; i += 400) {
    const batch = writeBatch(db);
    for (const r of recipients.slice(i, i + 400)) batch.set(doc(mailCol), mailDoc(r, m, by, ref.id));
    await batch.commit();
  }
  return ref.id;
};

export const listCampaigns = async (): Promise<Campaign[]> =>
  (await getDocs(campaignsCol)).docs.map((d) => {
    const data = d.data();
    return {
      subject: '', body: '', subjectEn: '', bodyEn: '', audience: '', recipients: [], offline: [], offlineDone: {}, createdBy: '',
      ...(data as Partial<Campaign>), id: d.id, createdAt: iso(data.createdAt),
    } as Campaign;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const setOfflineDone = (campaignId: string, missionaryId: string, done: boolean) =>
  updateDoc(doc(campaignsCol, campaignId), { [`offlineDone.${missionaryId}`]: done });

// ── Switches ─────────────────────────────────────────────────────────────────

export interface EmailSettings { remindersEnabled: boolean }

const settingsRef = doc(db, 'settings', 'email');

export const getEmailSettings = async (): Promise<EmailSettings> => {
  const snap = await getDoc(settingsRef);
  return { remindersEnabled: true, ...(snap.data() as Partial<EmailSettings> | undefined) };
};

export const saveEmailSettings = (s: EmailSettings) => setDoc(settingsRef, s, { merge: true });

/** The most recent emails of any kind (for the "Historial" list and the "not sending yet" notice). */
export const listRecentMail = async (max = 200) =>
  (await getDocs(mailCol)).docs.map((d) => toMail(d.id, d.data())).sort(newestFirst).slice(0, max);
