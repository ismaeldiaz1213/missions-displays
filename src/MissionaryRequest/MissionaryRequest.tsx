import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, CircularProgress, IconButton, LinearProgress, TextField, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import PageShell, { CenterCard } from '../Registration/components/PageShell';
import FormSection from '../Registration/components/FormSection';
import ChoiceCard from '../Registration/components/ChoiceCard';
import { subPanelSx } from '../Registration/styles';
import { STRINGS, useLang } from '../Registration/i18n';
import { formatBytes } from '../Administrator/formatBytes';
import { uploadFile } from '../data/storageFiles';
import {
  CONTINENT_IDS, REQUEST_LIMITS, createMissionaryRequest, newRequestId, requestFilesPrefix,
  type ContinentId, type MissionaryRequestInput, type RequestFileKind,
} from '../data/missionaryRequests';
import { REQUEST_PAGE_TITLES, REQUEST_STRINGS, type RequestStrings } from './requestI18n';

type FormState = Omit<MissionaryRequestInput, 'language' | 'continent'> & { continent: ContinentId | '' };

const initialForm = (): FormState => ({
  name: '', lastName: '', wifeName: '', email: '', phone: '',
  organization: '', sendingChurch: '', missionType: '', startYear: '',
  continent: '', city: '', state: '', country: '',
  description: '', prayerRequests: '',
  contact: { email: '', phone: '', website: '', facebook: '', instagram: '' },
});

interface PendingFile { key: string; kind: RequestFileKind; file: File; status: 'queued' | 'uploading' | 'done' | 'error' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isImage = (f: File) => f.type.startsWith('image/') && f.size < REQUEST_LIMITS.imageBytes;
const isPdf = (f: File) => f.type === 'application/pdf' && f.size < REQUEST_LIMITS.pdfBytes;
const isVideo = (f: File) => f.type.startsWith('video/') && f.size < REQUEST_LIMITS.videoBytes;
const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-120);

const validate = (f: FormState, t: RequestStrings) => {
  const e: Record<string, string> = {};
  const req = (key: string, v: string) => { if (!v.trim()) e[key] = t.required; };
  req('name', f.name);
  req('lastName', f.lastName);
  req('email', f.email);
  if (f.email && !EMAIL_RE.test(f.email.trim())) e.email = t.invalidEmail;
  req('phone', f.phone);
  req('organization', f.organization);
  req('sendingChurch', f.sendingChurch);
  if (!f.continent) e.continent = t.selectContinent;
  req('city', f.city);
  req('country', f.country);
  req('description', f.description);
  return e;
};

const errorTextSx = { color: 'var(--ibl-danger)', fontSize: '0.8rem', mt: 0.75 };
const grid2 = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 };
const outlinedButtonSx = { textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: 'var(--ibl-primary)', borderColor: 'var(--ibl-primary)' };

const FileIcon: React.FC<{ file: File }> = ({ file }) =>
  file.type === 'application/pdf' ? <PictureAsPdfOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />
    : file.type.startsWith('video/') ? <MovieOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />
      : <ImageOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />;

const ImagePreview: React.FC<{ file: File }> = ({ file }) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <Box component="img" src={src} alt="" sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '10px', display: 'block', mb: 1 }} /> : null;
};

const FileRow: React.FC<{ item: PendingFile; onRemove?: () => void; t: RequestStrings }> = ({ item, onRemove, t }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: '10px', border: '1px solid var(--ibl-border)', bgcolor: 'var(--ibl-surface)' }}>
    <FileIcon file={item.file} />
    <Typography sx={{ flex: 1, minWidth: 0, color: 'var(--ibl-text)', fontSize: '0.88rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {item.file.name}
    </Typography>
    <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>{formatBytes(item.file.size)}</Typography>
    {item.status === 'done' && <CheckCircleIcon sx={{ color: 'var(--ibl-success)' }} />}
    {item.status === 'error' && <Typography sx={{ color: 'var(--ibl-danger)', fontSize: '0.8rem', fontWeight: 700 }}>✕</Typography>}
    {onRemove && <IconButton size="small" aria-label={t.remove} onClick={onRemove}><CloseIcon fontSize="small" /></IconButton>}
  </Box>
);

const MissionaryRequest: React.FC = () => {
  const [lang, changeLang] = useLang(REQUEST_PAGE_TITLES);
  const t = REQUEST_STRINGS[lang];
  const [form, setForm] = useState<FormState>(initialForm);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [fileProblems, setFileProblems] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<'form' | 'sending' | 'uploadErrors' | 'done'>('form');
  const [requestId, setRequestId] = useState('');
  const [progress, setProgress] = useState({ label: '', fraction: 0 });
  const [submitError, setSubmitError] = useState(false);
  const profileRef = useRef<HTMLInputElement>(null);
  const letterRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => (submitted ? validate(form, t) : {}), [submitted, form, t]);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const setContact = (patch: Partial<FormState['contact']>) => setForm((f) => ({ ...f, contact: { ...f.contact, ...patch } }));

  const text = (key: keyof Omit<FormState, 'contact' | 'continent'>, label: string, { helperText, ...extra }: Record<string, unknown> = {}) => (
    <TextField label={label} name={key} value={form[key]} onChange={(e) => set({ [key]: e.target.value })}
      error={!!errors[key]} helperText={errors[key] ?? (helperText as string | undefined)} fullWidth {...extra} />
  );
  const contactField = (key: keyof FormState['contact'], label: string, extra: Record<string, unknown> = {}) => (
    <TextField label={label} value={form.contact[key]} onChange={(e) => setContact({ [key]: e.target.value })} fullWidth {...extra} />
  );

  const addFiles = (kind: RequestFileKind, list: FileList | null) => {
    if (!list) return;
    const problems: string[] = [];
    const accepted: PendingFile[] = [];
    Array.from(list).forEach((file) => {
      const ok = kind === 'profile' ? isImage(file) : kind === 'prayer-letter' ? isPdf(file) : isImage(file) || isVideo(file);
      if (!ok) problems.push(kind === 'profile' ? t.badImage(file.name) : kind === 'prayer-letter' ? t.badPdf(file.name) : t.badGallery(file.name));
      else accepted.push({ key: `${kind}-${file.name}-${file.size}-${Math.random()}`, kind, file, status: 'queued' });
    });
    setFileProblems(problems);
    // Profile photo and prayer letter are single files: a new pick replaces the old one
    setFiles((prev) => [...(kind === 'gallery' ? prev : prev.filter((f) => f.kind !== kind)), ...accepted]);
  };

  const uploadAll = async (id: string, items: PendingFile[]) => {
    const todo = items.filter((f) => f.status !== 'done');
    const results = [...items];
    for (const [i, item] of todo.entries()) {
      setProgress({ label: t.uploading(i + 1, todo.length, item.file.name), fraction: 0 });
      const idx = results.findIndex((r) => r.key === item.key);
      try {
        await uploadFile(item.file, `${requestFilesPrefix(id, item.kind)}/${Date.now()}-${safeName(item.file.name)}`,
          (p) => setProgress((prev) => ({ ...prev, fraction: p })),
          { customMetadata: { originalName: item.file.name } });
        results[idx] = { ...item, status: 'done' };
      } catch (err) {
        console.error(err);
        results[idx] = { ...item, status: 'error' };
      }
    }
    setFiles(results);
    setPhase(results.some((r) => r.status === 'error') ? 'uploadErrors' : 'done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(false);
    const errs = validate(form, t);
    if (Object.keys(errs).length > 0) {
      const first = Object.keys(errs)[0];
      (document.querySelector(`[name="${first}"]`) ?? document.getElementById(`req-${first}`))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPhase('sending');
    setProgress({ label: t.sending, fraction: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Honeypot filled → a bot. Pretend it worked without saving anything.
    if (honeypot) { setPhase('done'); return; }
    try {
      const id = newRequestId();
      await createMissionaryRequest(id, { ...form, continent: form.continent as ContinentId, language: lang });
      setRequestId(id);
      await uploadAll(id, files);
    } catch (err) {
      console.error(err);
      setPhase('form');
      setSubmitError(true);
    }
  };

  const shell = (children: React.ReactNode) => (
    <PageShell showDeadline={false} t={STRINGS[lang]} lang={lang} onLangChange={changeLang} title={t.pageTitle}>{children}</PageShell>
  );

  if (phase === 'sending') {
    return shell(
      <CenterCard>
        <CircularProgress sx={{ color: 'var(--ibl-primary)', mb: 2 }} />
        <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, mb: 1.5 }}>{progress.label}</Typography>
        <LinearProgress variant="determinate" value={progress.fraction * 100} sx={{
          height: 8, borderRadius: 4, bgcolor: 'color-mix(in srgb, var(--ibl-primary) 12%, transparent)',
          '& .MuiLinearProgress-bar': { bgcolor: 'var(--ibl-primary)' },
        }} />
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.85rem', mt: 1.5 }}>{t.keepOpen}</Typography>
      </CenterCard>,
    );
  }

  if (phase === 'uploadErrors') {
    return shell(
      <CenterCard>
        <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, mb: 2 }}>{t.uploadErrors}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left', mb: 2.5 }}>
          {files.filter((f) => f.status === 'error').map((f) => <FileRow key={f.key} item={f} t={t} />)}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => { setPhase('sending'); uploadAll(requestId, files); }}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: 'var(--ibl-on-primary)', bgcolor: 'var(--ibl-primary)' }}>
            {t.retry}
          </Button>
          <Button variant="outlined" onClick={() => setPhase('done')} sx={outlinedButtonSx}>{t.finishWithout}</Button>
        </Box>
      </CenterCard>,
    );
  }

  if (phase === 'done') {
    return shell(
      <CenterCard>
        <CheckCircleIcon sx={{ fontSize: 64, color: 'var(--ibl-success)', mb: 1.5 }} />
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.6rem', mb: 1 }}>{t.doneTitle}</Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.7 }}>{t.doneBody}</Typography>
        <Button component={RouterLink} to="/region-selection" sx={{ mt: 3, textTransform: 'none', fontWeight: 600, color: 'var(--ibl-primary)' }}>
          {t.backHome}
        </Button>
      </CenterCard>,
    );
  }

  const profile = files.find((f) => f.kind === 'profile');
  const letter = files.find((f) => f.kind === 'prayer-letter');
  const gallery = files.filter((f) => f.kind === 'gallery');
  const removeFile = (key: string) => setFiles((prev) => prev.filter((f) => f.key !== key));
  let step = 0;

  return shell(
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ position: 'relative', maxWidth: 820, mx: 'auto', mt: { xs: -4, md: -5 }, px: { xs: 2, md: 3 } }}>
      <div className="reg-hp" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
      </div>

      <Box sx={{ ...subPanelSx, mt: 0, mb: 3, bgcolor: 'var(--ibl-surface)' }}>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.6 }}>{t.intro}</Typography>
      </Box>

      <FormSection step={++step} title={t.youTitle} subtitle={t.youSub}>
        <Box sx={grid2}>
          {text('name', t.name, { required: true, autoComplete: 'given-name' })}
          {text('lastName', t.lastName, { required: true, autoComplete: 'family-name' })}
          {text('email', t.email, { required: true, type: 'email', autoComplete: 'email' })}
          {text('phone', t.phone, { required: true, type: 'tel', autoComplete: 'tel' })}
          <Box sx={{ gridColumn: '1 / -1' }}>{text('wifeName', t.wifeName)}</Box>
        </Box>
      </FormSection>

      <FormSection step={++step} title={t.ministryTitle}>
        <Box sx={grid2}>
          {text('organization', t.organization, { required: true })}
          {text('sendingChurch', t.sendingChurch, { required: true })}
          {text('missionType', t.missionType, { placeholder: t.missionTypePlaceholder })}
          <TextField label={t.startYear} value={form.startYear} fullWidth inputMode="numeric"
            onChange={(e) => set({ startYear: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        </Box>
      </FormSection>

      <FormSection step={++step} title={t.fieldTitle} subtitle={t.fieldSub}>
        <Box id="req-continent" role="radiogroup" aria-label={t.continent} sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
          {CONTINENT_IDS.map((c) => (
            <ChoiceCard key={c} selected={form.continent === c} onClick={() => set({ continent: c })} title={t.continents[c]} error={!!errors.continent} />
          ))}
        </Box>
        {errors.continent && <Typography sx={errorTextSx}>{errors.continent}</Typography>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 2.5 }}>
          {text('city', t.city, { required: true })}
          {text('state', t.state)}
          {text('country', t.country, { required: true, autoComplete: 'country-name' })}
        </Box>
      </FormSection>

      <FormSection step={++step} title={t.aboutTitle} subtitle={t.aboutSub}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {text('description', t.description, { required: true, multiline: true, minRows: 5, helperText: t.descriptionHelp, slotProps: { htmlInput: { maxLength: 5000 } } })}
          {text('prayerRequests', t.prayerRequests, { multiline: true, minRows: 3, slotProps: { htmlInput: { maxLength: 3000 } } })}
        </Box>
      </FormSection>

      <FormSection step={++step} title={t.contactTitle} subtitle={t.contactSub}>
        <Box sx={grid2}>
          {contactField('email', t.email, { type: 'email' })}
          {contactField('phone', t.phone, { type: 'tel' })}
          {contactField('website', t.website, { placeholder: 'https://' })}
          {contactField('facebook', t.facebook)}
          {contactField('instagram', t.instagram, { placeholder: '@' })}
        </Box>
      </FormSection>

      <FormSection step={++step} title={t.filesTitle} subtitle={t.filesSub}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box sx={{ ...subPanelSx, mt: 0 }}>
            <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, mb: 1 }}>{t.profilePhoto}</Typography>
            {profile && (
              <Box sx={{ mb: 1 }}>
                <ImagePreview file={profile.file} />
                <FileRow item={profile} t={t} onRemove={() => removeFile(profile.key)} />
              </Box>
            )}
            <Button variant="outlined" onClick={() => profileRef.current?.click()} sx={outlinedButtonSx}>{profile ? t.replace : t.choose}</Button>
            <input ref={profileRef} type="file" accept="image/*" hidden onChange={(e) => { addFiles('profile', e.target.files); e.target.value = ''; }} />
          </Box>
          <Box sx={{ ...subPanelSx, mt: 0 }}>
            <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, mb: 1 }}>{t.prayerLetter}</Typography>
            {letter && <Box sx={{ mb: 1 }}><FileRow item={letter} t={t} onRemove={() => removeFile(letter.key)} /></Box>}
            <Button variant="outlined" onClick={() => letterRef.current?.click()} sx={outlinedButtonSx}>{letter ? t.replace : t.choose}</Button>
            <input ref={letterRef} type="file" accept="application/pdf" hidden onChange={(e) => { addFiles('prayer-letter', e.target.files); e.target.value = ''; }} />
          </Box>
          <Box sx={{ ...subPanelSx, mt: 0, gridColumn: '1 / -1' }}>
            <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, mb: 1 }}>{t.gallery}</Typography>
            {gallery.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                {gallery.map((g) => <FileRow key={g.key} item={g} t={t} onRemove={() => removeFile(g.key)} />)}
              </Box>
            )}
            <Button variant="outlined" startIcon={<AddPhotoAlternateOutlinedIcon />} onClick={() => galleryRef.current?.click()} sx={outlinedButtonSx}>{t.addFiles}</Button>
            <input ref={galleryRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { addFiles('gallery', e.target.files); e.target.value = ''; }} />
          </Box>
        </Box>
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.82rem', mt: 1.5 }}>{t.limits}</Typography>
        {fileProblems.map((p) => <Typography key={p} sx={errorTextSx}>{p}</Typography>)}
      </FormSection>

      {submitted && Object.keys(errors).length > 0 && <Typography sx={{ ...errorTextSx, textAlign: 'center', mb: 1 }}>{t.fixErrors}</Typography>}
      {submitError && <Typography sx={{ ...errorTextSx, textAlign: 'center', mb: 1 }}>{t.submitError}</Typography>}
      <Button type="submit" variant="contained" size="large" fullWidth sx={{
        py: 1.6, borderRadius: '12px', textTransform: 'none', fontWeight: 800, fontSize: '1.05rem',
        color: 'var(--ibl-on-primary)',
        background: 'linear-gradient(135deg, var(--ibl-primary-dark) 0%, var(--ibl-primary) 100%)',
        boxShadow: '0 8px 20px color-mix(in srgb, var(--ibl-primary) 35%, transparent)',
      }}>
        {t.submit}
      </Button>
    </Box>,
  );
};

export default MissionaryRequest;
