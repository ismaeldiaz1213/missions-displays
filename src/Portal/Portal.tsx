import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, MenuItem, TextField, Typography,
} from '@mui/material';
import { isSignInWithEmailLink, onAuthStateChanged, signInWithEmailLink, signOut, type User } from 'firebase/auth';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PageShell, { CenterCard } from '../Registration/components/PageShell';
import ChoiceCard from '../Registration/components/ChoiceCard';
import FormSection from '../Registration/components/FormSection';
import { STRINGS, useLang } from '../Registration/i18n';
import { auth } from '../data/auth';
import { isAdminEmail } from '../firebase';
import { requestSignInLink, startMissionaryEdit } from '../data/functions';
import { CONTACT_METHODS, type ContactMethod } from '../data/missionaryProfiles';
import { REPORT_PDF_MAX_BYTES, loadMyAccount, listMyReports, saveMyContact, sendMyReport, type MyAccount } from '../data/portal';
import {
  formatDay, getReportSettings, quarterLabel, quartersOfYear, reportingQuarter, reportingYears, today,
  type Quarter, type ReportSettings, type ReportSubmission,
} from '../data/reports';
import { resolveUrl } from '../storageUrl';
import PageEditor from './PageEditor';
import { PORTAL_STRINGS, PORTAL_TITLES, type PortalStrings } from './portalI18n';

const EMAIL_KEY = 'ibl-portal-email';
const REPORT_KEY = 'ibl-portal-report';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* unavailable */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* unavailable */ } },
};

const bigButtonSx = { borderRadius: '999px', fontWeight: 800, px: 3, py: 1.25, fontSize: '1rem', textTransform: 'none' as const };

// ── Sign in ──────────────────────────────────────────────────────────────────

const SignIn: React.FC<{ t: PortalStrings; confirmOnly?: boolean; onConfirm?: (email: string) => void; error?: string }> = ({ t, confirmOnly, onConfirm, error }) => {
  const [email, setEmail] = useState(store.get(EMAIL_KEY));
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(error ?? '');
  const valid = EMAIL_RE.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setProblem(t.invalidEmail); return; }
    if (confirmOnly) { onConfirm?.(email.trim()); return; }
    setBusy(true);
    setProblem('');
    try {
      store.set(EMAIL_KEY, email.trim());
      await requestSignInLink(email.trim());
      setSent(true);
    } catch (err) {
      console.error(err);
      setProblem(t.error);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <CenterCard>
        <MarkEmailReadOutlinedIcon sx={{ fontSize: 56, color: 'var(--ibl-primary)' }} />
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--ibl-primary-dark)', mt: 1 }}>{t.linkSentTitle}</Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', mt: 1.5, lineHeight: 1.6 }}>{t.linkSentBody(email.trim())}</Typography>
        <Button onClick={() => setSent(false)} sx={{ mt: 2, fontWeight: 700, textTransform: 'none' }}>{t.useOtherEmail}</Button>
      </CenterCard>
    );
  }

  return (
    <CenterCard>
      <Box component="form" onSubmit={submit} noValidate>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--ibl-primary-dark)' }}>
          {confirmOnly ? t.confirmEmailTitle : t.signInTitle}
        </Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', mt: 1, mb: 2.5 }}>{confirmOnly ? t.confirmEmailSub : t.signInSub}</Typography>
        <TextField fullWidth type="email" label={t.email} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
          error={!!problem && !valid} slotProps={{ htmlInput: { style: { fontSize: '1.1rem' } } }} />
        {problem && <Alert severity="warning" sx={{ mt: 1.5, textAlign: 'left' }}>{problem}</Alert>}
        <Button type="submit" fullWidth variant="contained" size="large" disabled={busy} sx={{ ...bigButtonSx, mt: 2.5 }}>
          {busy ? <CircularProgress size={22} color="inherit" /> : confirmOnly ? t.continue : t.sendLink}
        </Button>
      </Box>
    </CenterCard>
  );
};

// ── Report ───────────────────────────────────────────────────────────────────

const ReportView: React.FC<{ t: PortalStrings; lang: 'es' | 'en'; account: MyAccount; preferred: string }> = ({ t, lang, account, preferred }) => {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [subs, setSubs] = useState<ReportSubmission[]>([]);
  const [quarterId, setQuarterId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState('');
  const [thanks, setThanks] = useState<'report' | 'noUpdates' | null>(null);
  const [confirmNoUpdates, setConfirmNoUpdates] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [s, list] = await Promise.all([getReportSettings(), listMyReports(account.missionaryId)]);
    setSettings(s);
    setSubs(list);
    return s;
  }, [account.missionaryId]);

  useEffect(() => {
    load().then((s) => {
      const all = reportingYears(s).flatMap((y) => quartersOfYear(y, s));
      const fromLink = all.find((q) => q.id === preferred);
      setQuarterId(fromLink?.id ?? reportingQuarter(s)?.id ?? all.find((q) => q.start <= today() && today() <= q.end)?.id ?? all[0]?.id ?? '');
    }).catch(() => setProblem(t.error));
  }, [load, preferred, t.error]);

  if (!settings || !quarterId) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;

  // Quarters they can report on: any that has started, newest first.
  const quarters: Quarter[] = reportingYears(settings).flatMap((y) => quartersOfYear(y, settings)).filter((q) => q.start <= today()).reverse();
  const q = quarters.find((x) => x.id === quarterId) ?? quarters[0];
  const mine = subs.filter((s) => s.quarterId === q.id);

  const send = async (kind: 'report' | 'noUpdates') => {
    setProblem('');
    if (kind === 'report' && !file && !comments.trim()) { setProblem(t.needSomething); return; }
    setBusy(true);
    try {
      await sendMyReport(account.missionaryId, q.id, kind, file, comments, setProgress);
      setFile(null);
      setComments('');
      setThanks(kind);
      setConfirmNoUpdates(false);
      await load();
    } catch (err) {
      console.error(err);
      setProblem(t.error);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  if (thanks) {
    return (
      <Box sx={{ bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: 4, textAlign: 'center', boxShadow: '0 6px 24px color-mix(in srgb, var(--ibl-primary-dark) 8%, transparent)' }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: 'var(--ibl-success)' }} />
        <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--ibl-primary-dark)', mt: 1 }}>{t.thanksTitle}</Typography>
        <Typography sx={{ mt: 1.5, color: 'var(--ibl-text-body)' }}>{thanks === 'report' ? t.thanksReport : t.thanksNoUpdates}</Typography>
        <Button onClick={() => setThanks(null)} sx={{ mt: 2, fontWeight: 700, textTransform: 'none' }}>{t.back}</Button>
      </Box>
    );
  }

  return (
    <FormSection step={1} title={t.reportTitle} subtitle={t.reportSub}>
      <TextField select fullWidth label={t.quarter} value={q.id} onChange={(e) => setQuarterId(e.target.value)} sx={{ mb: 2 }}>
        {quarters.map((x) => <MenuItem key={x.id} value={x.id}>{quarterLabel(x, lang)} · {t.due} {formatDay(x.due, lang)}</MenuItem>)}
      </TextField>

      {mine.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <strong>{t.alreadySent}</strong>
          {mine.map((s) => (
            <Box key={s.id}>
              {s.kind === 'noUpdates' ? t.noUpdatesSent : [s.fileName, s.comments && `"${s.comments.slice(0, 80)}${s.comments.length > 80 ? '…' : ''}"`].filter(Boolean).join(' · ')}
              {' · '}{t.sentOn} {new Date(s.submittedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES')}
            </Box>
          ))}
          <Box sx={{ mt: 0.5 }}>{t.sendAnother}</Box>
        </Alert>
      )}

      <input ref={fileRef} hidden type="file" accept="application/pdf" onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        if (f.type !== 'application/pdf') { setProblem(t.pdfOnly); return; }
        if (f.size >= REPORT_PDF_MAX_BYTES) { setProblem(t.pdfTooBig); return; }
        setProblem('');
        setFile(f);
      }} />
      <Button fullWidth variant="outlined" size="large" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()} disabled={busy}
        sx={{ ...bigButtonSx, borderStyle: 'dashed', borderWidth: 2, py: 2, justifyContent: 'center' }}>
        {file ? `${t.changePdf}: ${file.name}` : t.choosePdf}
      </Button>
      <TextField fullWidth multiline minRows={5} label={t.comments} value={comments} onChange={(e) => setComments(e.target.value)} sx={{ mt: 2 }}
        disabled={busy} slotProps={{ htmlInput: { maxLength: 5000 } }} />
      {problem && <Alert severity="warning" sx={{ mt: 1.5 }}>{problem}</Alert>}
      {busy && progress > 0 && <Typography sx={{ mt: 1, color: 'var(--ibl-text-muted)' }}>{t.sending} {Math.round(progress * 100)}%</Typography>}
      <Button fullWidth variant="contained" size="large" onClick={() => send('report')} disabled={busy} sx={{ ...bigButtonSx, mt: 2 }}>
        {busy ? <CircularProgress size={22} color="inherit" /> : t.sendReport}
      </Button>
      <Box sx={{ textAlign: 'center', mt: 3, pt: 2.5, borderTop: '1px solid var(--ibl-border)' }}>
        <Button variant="text" size="large" onClick={() => setConfirmNoUpdates(true)} disabled={busy} sx={{ ...bigButtonSx }}>{t.noUpdates}</Button>
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.88rem' }}>{t.noUpdatesHint}</Typography>
      </Box>

      <Dialog open={confirmNoUpdates} onClose={() => !busy && setConfirmNoUpdates(false)}>
        <DialogContent><Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{t.noUpdatesConfirm}</Typography>
          <Typography sx={{ mt: 1, color: 'var(--ibl-text-muted)' }}>{quarterLabel(q, lang)}</Typography></DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmNoUpdates(false)} disabled={busy}>{t.cancel}</Button>
          <Button variant="contained" onClick={() => send('noUpdates')} disabled={busy} sx={{ borderRadius: '999px', fontWeight: 800 }}>{t.yes}</Button>
        </DialogActions>
      </Dialog>
    </FormSection>
  );
};

// ── Contact details ──────────────────────────────────────────────────────────

const ContactView: React.FC<{ t: PortalStrings; account: MyAccount; onSaved: () => void }> = ({ t, account, onSaved }) => {
  const p = account.profile;
  const [phone, setPhone] = useState(p.phone);
  const [method, setMethod] = useState<ContactMethod>(p.preferredContact || 'email');
  const [note, setNote] = useState(p.preferredContactNote);
  const [language, setLanguage] = useState<'es' | 'en'>(p.language);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await saveMyContact(account.missionaryId, { phone, preferredContact: method, preferredContactNote: note, language });
      setNotice({ type: 'success', text: t.saved });
      onSaved();
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: t.error });
    } finally { setBusy(false); }
  };

  return (
    <FormSection step={1} title={t.contactTitle} subtitle={t.contactSub}>
      <Alert severity="info" sx={{ mb: 2 }}>{t.emailFixed(p.email)}</Alert>
      <TextField fullWidth type="tel" label={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Typography sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>{t.contactPref}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(5, minmax(0, 1fr))' }, gap: 1.25 }}>
        {CONTACT_METHODS.map((m) => <ChoiceCard key={m} selected={method === m} onClick={() => setMethod(m)} title={t.methods[m]} />)}
      </Box>
      <TextField fullWidth sx={{ mt: 2 }} label={t.contactNote} value={note} onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
      <Typography sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>{t.language}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25, maxWidth: 360 }}>
        <ChoiceCard selected={language === 'es'} onClick={() => setLanguage('es')} title="Español" />
        <ChoiceCard selected={language === 'en'} onClick={() => setLanguage('en')} title="English" />
      </Box>
      {notice && <Alert severity={notice.type} sx={{ mt: 2 }}>{notice.text}</Alert>}
      <Button fullWidth variant="contained" size="large" onClick={save} disabled={busy} sx={{ ...bigButtonSx, mt: 2.5 }}>
        {busy ? <CircularProgress size={22} color="inherit" /> : t.save}
      </Button>
    </FormSection>
  );
};

// ── Home ─────────────────────────────────────────────────────────────────────

const HomeCard: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; to?: string }> = ({ icon, label, onClick, to }) => (
  <ButtonBase {...(to ? { component: RouterLink, to } : { onClick })} sx={{
    bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: 3, minHeight: 150, display: 'flex', flexDirection: 'column', gap: 1.25,
    border: '1px solid color-mix(in srgb, var(--ibl-primary) 14%, transparent)', boxShadow: '0 6px 24px color-mix(in srgb, var(--ibl-primary-dark) 8%, transparent)',
    transition: 'transform 0.15s, box-shadow 0.15s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 32px color-mix(in srgb, var(--ibl-primary-dark) 14%, transparent)' },
    '& svg': { fontSize: 44, color: 'var(--ibl-primary)' },
  }}>
    {icon}
    <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--ibl-primary-dark)' }}>{label}</Typography>
  </ButtonBase>
);

type View = 'home' | 'report' | 'page' | 'contact';

/**
 * /misioneros/mi-pagina — the missionary's own page. They sign in with a link emailed to them
 * (no password), then send quarterly reports, propose changes to their public page (an admin
 * approves them), and update how we reach them. ?enlace=<token> opens just the page editor,
 * for missionaries without email who got a private link from the church.
 */
/** Firebase adds its own ?lang=en to sign-in links; it must not pick the page language. */
const dropLinkLang = () => {
  const url = new URL(window.location.href);
  if (url.searchParams.has('oobCode') && url.searchParams.has('lang')) {
    url.searchParams.delete('lang');
    window.history.replaceState(window.history.state, '', url);
  }
  return true;
};

const Portal: React.FC = () => {
  useState(dropLinkLang); // before useLang reads the URL
  const [lang, changeLang] = useLang(PORTAL_TITLES, 'es');
  const t = PORTAL_STRINGS[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const linkToken = searchParams.get('enlace');
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [needEmail, setNeedEmail] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [account, setAccount] = useState<MyAccount | null | undefined>(undefined);
  const [photo, setPhoto] = useState('');
  const [editToken, setEditToken] = useState('');
  const [problem, setProblem] = useState('');
  const view = (searchParams.get('vista') as View) || (searchParams.get('informe') ? 'report' : 'home');
  const preferredQuarter = searchParams.get('informe') ?? store.get(REPORT_KEY);

  const go = (v: View) => setSearchParams(v === 'home' ? {} : { vista: v });

  // Finishing sign-in from the emailed link.
  const finish = useCallback(async (email: string) => {
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      store.set(EMAIL_KEY, email);
      setNeedEmail(false);
      setSearchParams((p) => {
        const next = new URLSearchParams();
        for (const k of ['informe', 'vista']) { const v = p.get(k); if (v) next.set(k, v); }
        return next;
      }, { replace: true });
    } catch (err) {
      console.error(err);
      setNeedEmail(false);
      setLinkError(t.linkInvalid);
    }
  }, [setSearchParams, t.linkInvalid]);

  useEffect(() => {
    if (linkToken) return;
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const saved = store.get(EMAIL_KEY);
      if (saved) finish(saved); else setNeedEmail(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Remember which report a reminder email pointed to, across the sign-in round trip.
  useEffect(() => { const q = searchParams.get('informe'); if (q) store.set(REPORT_KEY, q); }, [searchParams]);

  const loadAccount = useCallback(async () => {
    if (!user?.email || !user.emailVerified || isAdminEmail(user.email)) { setAccount(null); return; }
    try {
      setAccount(await loadMyAccount(user.email));
    } catch (err) {
      console.error(err);
      setProblem(t.error);
      setAccount(null);
    }
  }, [user, t.error]);

  useEffect(() => { if (user) loadAccount(); }, [user, loadAccount]);
  useEffect(() => { resolveUrl(account?.page?.profileImage, '').then(setPhoto); }, [account?.page?.profileImage]);

  useEffect(() => {
    if (view !== 'page' || !account?.page || editToken) return;
    startMissionaryEdit().then((r) => setEditToken(r.token)).catch((err) => { console.error(err); setProblem(t.error); });
  }, [view, account, editToken, t.error]);

  const shell = (children: React.ReactNode, wide = false) => (
    <PageShell showDeadline={false} harvest={false} t={STRINGS[lang]} lang={lang} onLangChange={changeLang} title={t.pageTitle}
      backTo="/region-selection" backLabel={t.backHome}>
      <Box sx={{ position: 'relative', maxWidth: wide ? 1500 : 820, mx: 'auto', mt: { xs: -4, md: -5 }, px: { xs: 2, md: 3 }, pb: 6 }}>{children}</Box>
    </PageShell>
  );

  if (linkToken) return shell(<PageEditor token={linkToken} t={t} lang={lang} />, true);
  if (needEmail) return shell(<SignIn t={t} confirmOnly onConfirm={finish} />);
  if (user === undefined || (user && account === undefined)) return shell(<Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>);
  if (!user) return shell(<SignIn t={t} error={linkError} />);

  const signOutButton = (
    <Button onClick={() => { signOut(auth); setAccount(undefined); setEditToken(''); }} sx={{ fontWeight: 700, textTransform: 'none' }}>{t.signOut}</Button>
  );

  if (isAdminEmail(user.email)) return shell(<CenterCard><Typography sx={{ mb: 2 }}>{t.adminHere}</Typography>
    <Button component={RouterLink} to="/admin" variant="contained" sx={bigButtonSx}>/admin</Button><Box>{signOutButton}</Box></CenterCard>);
  if (!account?.page) return shell(<CenterCard>
    <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--ibl-primary-dark)' }}>{t.noPageTitle}</Typography>
    <Typography sx={{ mt: 1.5 }}>{t.noPageBody(user.email ?? '')}</Typography>
    {problem && <Alert severity="error" sx={{ mt: 2 }}>{problem}</Alert>}
    <Box sx={{ mt: 2 }}>{signOutButton}</Box></CenterCard>);

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: 2.5, mb: 3,
      boxShadow: '0 6px 24px color-mix(in srgb, var(--ibl-primary-dark) 8%, transparent)' }}>
      {view !== 'home' ? (
        <Button startIcon={<ArrowBackIcon />} onClick={() => go('home')} sx={{ ...bigButtonSx, px: 2 }}>{t.back}</Button>
      ) : (
        <Avatar src={photo || undefined} sx={{ width: 64, height: 64, bgcolor: '#EFF6FF', color: 'var(--ibl-primary-dark)', fontWeight: 800 }}>
          {account.page.name?.[0]}
        </Avatar>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', sm: '1.5rem' }, color: 'var(--ibl-primary-dark)' }}>
          {view === 'home' ? t.hello(account.page.name) : { report: t.reportTitle, page: t.editTitle, contact: t.contactTitle }[view]}
        </Typography>
        {view === 'home' && <Typography sx={{ color: 'var(--ibl-text-muted)' }}>{t.homeSub}</Typography>}
      </Box>
      {view === 'home' && signOutButton}
    </Box>
  );

  return shell(
    <>
      {header}
      {problem && <Alert severity="error" sx={{ mb: 2 }}>{problem}</Alert>}
      {view === 'home' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <HomeCard icon={<AssignmentOutlinedIcon />} label={t.reportCard} onClick={() => go('report')} />
          <HomeCard icon={<EditNoteOutlinedIcon />} label={t.pageCard} onClick={() => go('page')} />
          <HomeCard icon={<ContactPhoneOutlinedIcon />} label={t.contactCard} onClick={() => go('contact')} />
          <HomeCard icon={<VisibilityOutlinedIcon />} label={t.viewCard} to={`/misionero/${account.missionaryId}`} />
        </Box>
      )}
      {view === 'report' && <ReportView t={t} lang={lang} account={account} preferred={preferredQuarter} />}
      {view === 'contact' && <ContactView t={t} account={account} onSaved={loadAccount} />}
      {view === 'page' && (editToken ? <PageEditor token={editToken} t={t} lang={lang} /> : <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>)}
    </>,
    view === 'page',
  );
};

export default Portal;
