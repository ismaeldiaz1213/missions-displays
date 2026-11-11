import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import PhoneInTalkOutlinedIcon from '@mui/icons-material/PhoneInTalkOutlined';
import {
  getEmailSettings, listCampaigns, listMailForCampaign, listRecentMail, saveEmailSettings, sendCampaign, sendTest, setOfflineDone,
  type Campaign, type MailRecord, type Message, type Recipient,
} from '../../data/mail';
import { CONTACT_METHOD_LABELS } from '../../data/missionaryProfiles';
import { currentUserEmail } from '../../data/currentUser';
import { quarterLabel } from '../../data/reports';
import { BRAND } from '../../ui/brand';
import { Panel, Tag, formatDate, useAdminLang } from '../adminUi';
import { fullName, useDirectory, type DirectoryEntry } from '../directory/directoryData';
import { CONTINENT_LABELS } from '../directory/exportMissionaries';
import { useReports } from '../reports/reportsData';
import { MailStatusTag } from './MailStatus';

type Audience = 'all' | 'missingReport' | 'continent' | 'complete' | 'pick';

const firstName = (e: DirectoryEntry) => e.page.name?.split(/\s+y\s+|\s+and\s+/i)[0] ?? '';

const offlineContact = (e: DirectoryEntry, lang: 'es' | 'en') => [
  e.profile?.preferredContact ? CONTACT_METHOD_LABELS[e.profile.preferredContact][lang] : '',
  e.phone, e.profile?.preferredContactNote,
].filter(Boolean).join(' · ');

/** How the email will look (same layout the Cloud Function sends). */
const Preview: React.FC<{ subject: string; body: string; name: string; lang: 'es' | 'en' }> = ({ subject, body, name, lang }) => {
  const fill = (s: string) => s.replace(/\{(nombre|name)\}/gi, name);
  return (
    <Box sx={{ border: `1px solid ${BRAND.line}`, borderRadius: '14px', overflow: 'hidden', bgcolor: BRAND.white }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${BRAND.line}`, bgcolor: BRAND.page }}>
        <Typography sx={{ fontSize: '0.8rem', color: BRAND.muted }}>{lang === 'en' ? 'Subject' : 'Asunto'}</Typography>
        <Typography sx={{ fontWeight: 800 }}>{fill(subject) || '—'}</Typography>
      </Box>
      <Box sx={{ bgcolor: BRAND.navy, color: BRAND.white, px: 2.5, py: 1.5, fontWeight: 800 }}>
        {lang === 'en' ? 'Missions' : 'Misiones'} · Iglesia Bautista Libertad
      </Box>
      <Typography component="div" sx={{ p: 2.5, whiteSpace: 'pre-wrap', lineHeight: 1.6, minHeight: 120 }}>{fill(body) || '…'}</Typography>
      <Typography sx={{ px: 2.5, pb: 2, color: BRAND.muted, fontSize: '0.8rem' }}>
        {lang === 'en' ? 'You can reply to this email; a member of our missions team reads every message.' : 'Puede responder a este correo; alguien de nuestro equipo de misiones lee cada mensaje.'}
      </Typography>
    </Box>
  );
};

const CampaignDetail: React.FC<{ c: Campaign; onClose: () => void; onChanged: () => void }> = ({ c, onClose, onChanged }) => {
  const { tr, lang } = useAdminLang();
  const [mails, setMails] = useState<MailRecord[] | null>(null);
  const [done, setDone] = useState(c.offlineDone);
  useEffect(() => { listMailForCampaign(c.id).then(setMails).catch(() => setMails([])); }, [c.id]);

  const toggle = async (id: string, v: boolean) => {
    setDone((d) => ({ ...d, [id]: v }));
    await setOfflineDone(c.id, id, v);
    onChanged();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {c.subject}
        <Typography sx={{ color: BRAND.muted }}>{formatDate(c.createdAt, lang)} · {c.createdBy} · {c.audience}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ whiteSpace: 'pre-wrap', bgcolor: BRAND.page, p: 2, borderRadius: '12px' }}>{c.body}</Typography>
        {c.offline.length > 0 && (
          <Panel title={tr(`Sin correo: avisar por otro medio (${c.offline.filter((o) => done[o.missionaryId]).length}/${c.offline.length})`,
            `No email: reach another way (${c.offline.filter((o) => done[o.missionaryId]).length}/${c.offline.length})`)}>
            {c.offline.map((o) => (
              <FormControlLabel key={o.missionaryId} sx={{ display: 'flex', py: 0.25 }}
                control={<Checkbox checked={!!done[o.missionaryId]} onChange={(e) => toggle(o.missionaryId, e.target.checked)} />}
                label={<><strong>{o.name}</strong>{o.contact ? ` · ${o.contact}` : ''}</>} />
            ))}
          </Panel>
        )}
        <Panel title={tr('Destinatarios', 'Recipients')}>
          {mails === null ? <CircularProgress size={20} /> : mails.map((m) => (
            <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderTop: `1px solid ${BRAND.line}` }}>
              <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>{m.vars?.name ? `${m.vars.name} · ` : ''}{m.to}</Typography>
              {m.lang === 'en' && <Tag>EN</Tag>}
              <MailStatusTag status={m.status} error={m.error} />
            </Box>
          ))}
        </Panel>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button variant="contained" onClick={onClose}>{tr('Cerrar', 'Close')}</Button></DialogActions>
    </Dialog>
  );
};

/**
 * The Correos tab: write to many missionaries at once (Spanish, with an optional English
 * version for those who prefer it), see who has no email so they can be reached another way,
 * and turn the automatic report reminders on or off.
 */
const MailCenter: React.FC = () => {
  const { tr, lang } = useAdminLang();
  const { entries } = useDirectory();
  const reports = useReports();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('para');
  const [audience, setAudience] = useState<Audience>(preselected ? 'pick' : 'all');
  const [continent, setContinent] = useState('south-america');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(preselected ? [preselected] : []));
  const [msg, setMsg] = useState<Message>({ subject: '', body: '', subjectEn: '', bodyEn: '' });
  const [withEnglish, setWithEnglish] = useState(false);
  const [previewLang, setPreviewLang] = useState<'es' | 'en'>('es');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [open, setOpen] = useState<Campaign | null>(null);
  const [remindersOn, setRemindersOn] = useState<boolean | null>(null);
  const [recent, setRecent] = useState<MailRecord[]>([]);
  const [showPick, setShowPick] = useState(!!preselected);

  const load = useCallback(() => {
    listCampaigns().then(setCampaigns).catch(console.error);
    listRecentMail(50).then(setRecent).catch(console.error);
  }, []);
  useEffect(() => {
    load();
    getEmailSettings().then((s) => setRemindersOn(s.remindersEnabled)).catch(() => setRemindersOn(true));
  }, [load]);

  const rq = reports.reportingQuarter;
  const active = useMemo(() => entries.filter((e) => e.status !== 'archived'), [entries]);
  const audienceEntries = useMemo(() => active.filter((e) => {
    switch (audience) {
      case 'missingReport': return !!rq && e.status === 'published' && ['pending', 'late'].includes(reports.statusFor(e.id, rq));
      case 'continent': return e.page.continent === continent;
      case 'complete': return e.complete;
      case 'pick': return picked.has(e.id);
      default: return true;
    }
  }), [active, audience, continent, picked, rq, reports]);

  const recipients: Recipient[] = audienceEntries.filter((e) => e.email)
    .map((e) => ({ missionaryId: e.id, email: e.email, name: firstName(e), lang: e.profile?.language === 'en' ? 'en' : 'es' }));
  const offline = audienceEntries.filter((e) => !e.email);
  const englishCount = recipients.filter((r) => r.lang === 'en').length;

  const audienceLabel = {
    all: tr('Todos los misioneros', 'All missionaries'),
    missingReport: rq ? tr(`Les falta el informe ${quarterLabel(rq, 'es')}`, `Missing the ${quarterLabel(rq, 'en')} report`) : '',
    continent: CONTINENT_LABELS[continent],
    complete: tr('Perfiles completos', 'Complete profiles'),
    pick: tr('Elegidos a mano', 'Hand-picked'),
  }[audience];

  const valid = !!msg.subject.trim() && !!msg.body.trim() && (!withEnglish || (!!msg.subjectEn.trim() && !!msg.bodyEn.trim()));
  const message: Message = withEnglish ? msg : { ...msg, subjectEn: '', bodyEn: '' };

  const test = async () => {
    setBusy('test');
    setNotice(null);
    try {
      const me = currentUserEmail();
      await sendTest(message, { missionaryId: '', email: me, name: tr('Juan', 'John'), lang: previewLang }, me);
      setNotice({ type: 'success', text: tr(`Prueba enviada a ${me}.`, `Test sent to ${me}.`) });
      load();
    } catch (err) { setNotice({ type: 'error', text: String(err) }); } finally { setBusy(''); }
  };

  const send = async () => {
    setBusy('send');
    setNotice(null);
    try {
      await sendCampaign(message, audienceLabel, recipients,
        offline.map((e) => ({ missionaryId: e.id, name: fullName(e.page), contact: offlineContact(e, 'es') })), currentUserEmail());
      setConfirm(false);
      setMsg({ subject: '', body: '', subjectEn: '', bodyEn: '' });
      setNotice({ type: 'success', text: offline.length
        ? tr(`Enviando a ${recipients.length}. No olvide avisar a los ${offline.length} sin correo (en Historial puede marcarlos).`,
          `Sending to ${recipients.length}. Remember to reach the ${offline.length} without email (tick them off in History).`)
        : tr(`Enviando a ${recipients.length} misioneros.`, `Sending to ${recipients.length} missionaries.`) });
      load();
    } catch (err) { setNotice({ type: 'error', text: String(err) }); } finally { setBusy(''); }
  };

  const toggleReminders = async (v: boolean) => {
    setRemindersOn(v);
    try { await saveEmailSettings({ remindersEnabled: v }); } catch (err) { setRemindersOn(!v); setNotice({ type: 'error', text: String(err) }); }
  };

  const notSending = recent.some((m) => m.status === 'logged');
  const failing = recent.filter((m) => m.status === 'error');

  return (
    <Box>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.5rem', color: BRAND.ink }}>{tr('Correos', 'Email')}</Typography>
      <Typography sx={{ color: BRAND.muted, mb: 2 }}>
        {tr('Se envían desde misiones@iblibertad.org; las respuestas llegan a ese buzón.', 'Sent from misiones@iblibertad.org; replies land in that inbox.')}
      </Typography>

      {notSending && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {tr('Modo de prueba: los correos se guardan aquí pero todavía no salen. Se activan cuando el buzón misiones@ esté listo (ver docs/EMAIL_SETUP.md).',
            "Test mode: emails are recorded here but don't go out yet. They start once the misiones@ mailbox is ready (see docs/EMAIL_SETUP.md).")}
        </Alert>
      )}
      {failing.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {tr(`${failing.length} correo(s) recientes no se pudieron enviar. Último error: `, `${failing.length} recent email(s) failed. Last error: `)}{failing[0].error}
        </Alert>
      )}
      {notice && <Alert severity={notice.type} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' }, gap: 2, alignItems: 'start' }}>
        <Panel title={tr('Escribir a los misioneros', 'Write to missionaries')}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
            <TextField select size="small" label={tr('¿A quién?', 'To whom?')} value={audience} onChange={(e) => setAudience(e.target.value as Audience)} sx={{ minWidth: 260 }}>
              <MenuItem value="all">{tr('Todos los misioneros', 'All missionaries')}</MenuItem>
              {rq && <MenuItem value="missingReport">{tr(`Les falta el informe Q${rq.number}`, `Missing the Q${rq.number} report`)}</MenuItem>}
              <MenuItem value="continent">{tr('Por continente', 'By continent')}</MenuItem>
              <MenuItem value="complete">{tr('Solo perfiles completos', 'Complete profiles only')}</MenuItem>
              <MenuItem value="pick">{tr('Elegir a mano', 'Pick by hand')}</MenuItem>
            </TextField>
            {audience === 'continent' && (
              <TextField select size="small" value={continent} onChange={(e) => setContinent(e.target.value)} sx={{ minWidth: 200 }}>
                {Object.entries(CONTINENT_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            )}
            {audience === 'pick' && <Button onClick={() => setShowPick(!showPick)}>{showPick ? tr('Ocultar lista', 'Hide list') : tr('Mostrar lista', 'Show list')}</Button>}
          </Box>
          <Collapse in={audience === 'pick' && showPick}>
            <Box sx={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${BRAND.line}`, borderRadius: '12px', p: 1, mb: 1.5 }}>
              {active.map((e) => (
                <FormControlLabel key={e.id} sx={{ display: 'flex' }} label={<>{fullName(e.page)}{!e.email && <Typography component="span" sx={{ color: BRAND.muted }}> · {tr('sin correo', 'no email')}</Typography>}</>}
                  control={<Checkbox size="small" checked={picked.has(e.id)} onChange={(ev) => setPicked((p) => {
                    const next = new Set(p);
                    if (ev.target.checked) next.add(e.id); else next.delete(e.id);
                    return next;
                  })} />} />
              ))}
            </Box>
          </Collapse>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Tag tone="blue">{tr(`${recipients.length} recibirán el correo`, `${recipients.length} will get the email`)}</Tag>
            {englishCount > 0 && <Tag>{tr(`${englishCount} prefieren inglés`, `${englishCount} prefer English`)}</Tag>}
            {offline.length > 0 && <Tag tone="red" icon={<PhoneInTalkOutlinedIcon />}>{tr(`${offline.length} sin correo`, `${offline.length} without email`)}</Tag>}
          </Box>
          {offline.length > 0 && (
            <Alert severity="warning" icon={<PhoneInTalkOutlinedIcon />} sx={{ mb: 2 }}>
              <strong>{tr('Avisar por otro medio:', 'Reach another way:')}</strong>
              {offline.map((e) => <Box key={e.id}>{fullName(e.page)}{offlineContact(e, lang) ? ` — ${offlineContact(e, lang)}` : ` — ${tr('sin teléfono', 'no phone')}`}</Box>)}
            </Alert>
          )}

          <TextField fullWidth label={tr('Asunto', 'Subject')} value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} sx={{ mb: 1.5 }} />
          <TextField fullWidth multiline minRows={8} label={tr('Mensaje', 'Message')} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })}
            helperText={tr('Escriba {nombre} y se cambiará por el nombre de cada misionero.', 'Write {nombre} and it becomes each missionary\'s name.')} />
          <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={withEnglish} onChange={(e) => { setWithEnglish(e.target.checked); if (!e.target.checked) setPreviewLang('es'); }} />}
            label={tr('Añadir versión en inglés (para quienes la prefieren)', 'Add an English version (for those who prefer it)')} />
          <Collapse in={withEnglish}>
            <TextField fullWidth label="Subject (English)" value={msg.subjectEn} onChange={(e) => setMsg({ ...msg, subjectEn: e.target.value })} sx={{ my: 1.5 }} />
            <TextField fullWidth multiline minRows={6} label="Message (English)" value={msg.bodyEn} onChange={(e) => setMsg({ ...msg, bodyEn: e.target.value })}
              helperText="{name} becomes each missionary's name." />
          </Collapse>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
            <Button variant="outlined" startIcon={busy === 'test' ? <CircularProgress size={16} /> : <ScienceOutlinedIcon />} onClick={test} disabled={!valid || !!busy}>
              {tr('Enviarme una prueba', 'Send me a test')}
            </Button>
            <Button variant="contained" startIcon={<SendIcon />} onClick={() => setConfirm(true)} disabled={!valid || !!busy || recipients.length === 0}>
              {tr(`Enviar a ${recipients.length}`, `Send to ${recipients.length}`)}
            </Button>
          </Box>
        </Panel>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Panel title={tr('Vista previa', 'Preview')} action={withEnglish ? (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {(['es', 'en'] as const).map((l) => <Button key={l} size="small" variant={previewLang === l ? 'contained' : 'text'} onClick={() => setPreviewLang(l)}>{l.toUpperCase()}</Button>)}
            </Box>
          ) : null}>
            <Preview lang={previewLang} name={recipients[0]?.name ?? tr('Juan', 'John')}
              subject={previewLang === 'en' ? msg.subjectEn : msg.subject} body={previewLang === 'en' ? msg.bodyEn : msg.body} />
          </Panel>

          <Panel title={tr('Recordatorios de informes', 'Report reminders')} action={remindersOn === null ? <CircularProgress size={18} /> : (
            <Switch checked={remindersOn} onChange={(e) => toggleReminders(e.target.checked)} />
          )}>
            <Typography sx={{ color: BRAND.muted, fontSize: '0.9rem' }}>
              {tr(`Automáticos: una semana antes de la fecha límite, ese mismo día y una semana después (${reports.settings.dueDays} días después de cada trimestre). Dejan de llegar cuando el misionero envía su informe o pulsa "No tengo novedades". Los que no tienen correo aparecen en Inicio.`,
                `Automatic: a week before the due date, on the day, and a week after (${reports.settings.dueDays} days after each quarter). They stop once the missionary sends the report or presses "I have no updates". Those without email show on Home.`)}
            </Typography>
            {remindersOn === false && <Alert severity="warning" sx={{ mt: 1.5 }}>{tr('Recordatorios en pausa.', 'Reminders are paused.')}</Alert>}
          </Panel>

          <Panel title={tr('Historial', 'History')}>
            {campaigns.length === 0 && <Typography sx={{ color: BRAND.muted }}>{tr('Todavía no se ha enviado ningún correo masivo.', 'No mass emails sent yet.')}</Typography>}
            {campaigns.map((c) => {
              const pendingOffline = c.offline.filter((o) => !c.offlineDone[o.missionaryId]).length;
              return (
                <Box key={c.id} onClick={() => setOpen(c)} sx={{ py: 1.1, borderTop: `1px solid ${BRAND.line}`, cursor: 'pointer', '&:hover': { bgcolor: BRAND.page } }}>
                  <Typography sx={{ fontWeight: 700 }}>{c.subject}</Typography>
                  <Typography sx={{ color: BRAND.muted, fontSize: '0.85rem' }}>
                    {formatDate(c.createdAt, lang)} · {c.recipients.length} {tr('correos', 'emails')} · {c.audience}
                    {pendingOffline > 0 && ` · ${tr(`${pendingOffline} por avisar`, `${pendingOffline} to reach`)}`}
                  </Typography>
                </Box>
              );
            })}
          </Panel>
        </Box>
      </Box>

      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{tr('¿Enviar el correo?', 'Send the email?')}</DialogTitle>
        <DialogContent>
          <Typography><strong>{msg.subject}</strong></Typography>
          <Typography sx={{ mt: 1 }}>{tr(`Se enviará a ${recipients.length} misioneros (${audienceLabel}).`, `It goes to ${recipients.length} missionaries (${audienceLabel}).`)}</Typography>
          {offline.length > 0 && <Typography sx={{ mt: 1, color: '#991B1B' }}>{tr(`${offline.length} no tienen correo: quedan en el Historial para avisarles por otro medio.`, `${offline.length} have no email: they stay in History so you can reach them another way.`)}</Typography>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirm(false)} color="inherit" disabled={!!busy}>{tr('Cancelar', 'Cancel')}</Button>
          <Button variant="contained" onClick={send} disabled={!!busy} startIcon={busy === 'send' ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}>
            {tr('Enviar', 'Send')}
          </Button>
        </DialogActions>
      </Dialog>

      {open && <CampaignDetail c={open} onClose={() => setOpen(null)} onChanged={load} />}
    </Box>
  );
};

export default MailCenter;
