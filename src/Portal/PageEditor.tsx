import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, LinearProgress, MenuItem, TextField, ToggleButton, ToggleButtonGroup,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import SendIcon from '@mui/icons-material/Send';
import type { ContactInfo, Missionary } from '../types';
import {
  editFilesPrefix, getEdit, saveEditDraft, submitEdit, updateSubmittedEdit, type EditFileKind, type MissionaryEdit, type ProposedPage,
} from '../data/missionaryEdits';
import { CONTINENT_IDS, REQUEST_LIMITS } from '../data/missionaryRequests';
import { uploadFile } from '../data/storageFiles';
import { isVideoPath, resolveUrl } from '../storageUrl';
import CityPicker from '../ui/CityPicker';
import FormSection from '../Registration/components/FormSection';
import type { PortalStrings } from './portalI18n';

const MissionaryPage = lazy(() => import('../Missionaries/Missionary'));

const CONTACT_TYPES: ContactInfo['type'][] = ['email', 'phone', 'website', 'facebook', 'instagram'];
const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-100);

const Thumb: React.FC<{ path: string; onRemove: () => void; label: string }> = ({ path, onRemove, label }) => {
  const [url, setUrl] = useState('');
  const video = isVideoPath(path) || /\/gallery\/.*\.(mp4|mov|m4v|webm)$/i.test(path);
  useEffect(() => { if (!video) resolveUrl(path, '').then(setUrl); }, [path, video]);
  return (
    <Box sx={{ position: 'relative', width: 96, height: 96, borderRadius: '12px', overflow: 'hidden', bgcolor: '#EEF2F7', display: 'grid', placeItems: 'center' }}>
      {video ? <MovieOutlinedIcon sx={{ fontSize: 36, color: 'var(--ibl-primary)' }} />
        : url ? <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CircularProgress size={20} />}
      <IconButton size="small" aria-label={label} onClick={onRemove}
        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.92)', '&:hover': { bgcolor: '#fff' }, p: 0.4 }}>
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
};

/**
 * Where a missionary edits their page. Every change is a proposal (missionaryEdits/{token}):
 * nothing goes live until an admin approves it. Uploads go to missionary-edits/{token}/…
 */
const PageEditor: React.FC<{
  token: string;
  t: PortalStrings;
  lang: 'es' | 'en';
  /** Admin "Ajustar": no missionary banners; saving keeps the change in review. */
  adminMode?: boolean;
  onSaved?: () => void;
}> = ({ token, t, lang, adminMode, onSaved }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const [edit, setEdit] = useState<MissionaryEdit | null | undefined>(undefined);
  const [page, setPage] = useState<ProposedPage | null>(null);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [uploads, setUploads] = useState<{ key: string; name: string; progress: number }[]>([]);
  const [busy, setBusy] = useState<'' | 'draft' | 'submit'>('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const letterRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getEdit(token).then((e) => {
      const usable = e && !e.revoked && e.status !== 'approved' ? e : null;
      setEdit(usable);
      if (usable) setPage({ ...usable.proposed, location: { state: '', ...usable.proposed.location }, specialNotes: usable.proposed.specialNotes ?? '', startDate: usable.proposed.startDate ?? '' });
    }).catch(() => setEdit(null));
  }, [token]);

  if (edit === undefined) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!edit || !page) return <Alert severity="warning" sx={{ fontSize: '1rem' }}>{t.linkGone}</Alert>;

  const set = <K extends keyof ProposedPage>(k: K, v: ProposedPage[K]) => setPage((p) => (p ? { ...p, [k]: v } : p));

  const upload = async (file: File, kind: EditFileKind): Promise<string | null> => {
    const isImg = file.type.startsWith('image/');
    const max = kind === 'prayer-letter' ? REQUEST_LIMITS.pdfBytes : isImg ? REQUEST_LIMITS.imageBytes : REQUEST_LIMITS.videoBytes;
    if (file.size >= max) { setNotice({ type: 'error', text: `${t.fileTooBig}: ${file.name}` }); return null; }
    const key = `${Date.now()}-${Math.random()}`;
    setUploads((u) => [...u, { key, name: file.name, progress: 0 }]);
    try {
      return await uploadFile(file, `${editFilesPrefix(token, kind)}/${Date.now()}-${safeName(file.name)}`,
        (f) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: f } : x))),
        { customMetadata: { originalName: file.name } });
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: t.error });
      return null;
    } finally {
      setUploads((u) => u.filter((x) => x.key !== key));
    }
  };

  const missing = {
    name: !page.name.trim(), lastName: !page.lastName.trim(), description: !page.description.trim(),
    city: !page.location.city.trim(), country: !page.location.country.trim(),
  };
  const invalid = Object.values(missing).some(Boolean);

  const save = async (submit: boolean) => {
    setNotice(null);
    if (submit) {
      setShowErrors(true);
      if (invalid) { setNotice({ type: 'error', text: t.fixErrors }); return; }
    }
    setBusy(submit ? 'submit' : 'draft');
    try {
      const clean: ProposedPage = {
        ...page,
        contactInfo: page.contactInfo.filter((c) => c.value.trim()).map((c) => ({ ...c, value: c.value.trim() })),
      };
      // Once submitted, further saves stay in review (they never withdraw it).
      const alreadySubmitted = edit.status === 'submitted';
      await (alreadySubmitted ? updateSubmittedEdit(token, clean) : submit ? submitEdit(token, clean) : saveEditDraft(token, clean));
      setEdit({ ...edit, status: alreadySubmitted || submit ? 'submitted' : 'draft' });
      setNotice({ type: 'success', text: adminMode ? t.saved : submit ? t.submittedOk : t.savedDraft });
      onSaved?.();
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: t.error });
    } finally {
      setBusy('');
    }
  };

  const preview = (
    <Box sx={{ border: '1px solid var(--ibl-border)', borderRadius: '16px', overflow: 'hidden', height: wide ? 'calc(100vh - 120px)' : '75vh', overflowY: 'auto', transform: 'translateZ(0)', bgcolor: '#fff' }}>
      <Suspense fallback={<Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>}>
        <MissionaryPage preview={{ ...page, id: edit.missionaryId } as Missionary} />
      </Suspense>
    </Box>
  );

  const err = (k: keyof typeof missing) => showErrors && missing[k];

  const form = (
    <Box>
      <FormSection step={1} title={t.about}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label={t.name} required value={page.name} onChange={(e) => set('name', e.target.value)} helperText={err('name') ? t.required : t.nameHelp} error={err('name')} />
          <TextField label={t.lastName} required value={page.lastName} onChange={(e) => set('lastName', e.target.value)} error={err('lastName')} helperText={err('lastName') ? t.required : ''} />
          <TextField label={t.organization} value={page.organization} onChange={(e) => set('organization', e.target.value)} />
          <TextField label={t.missionType} value={page.missionType} onChange={(e) => set('missionType', e.target.value)} />
          <TextField label={t.startYear} value={page.startDate ?? ''} slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
            onChange={(e) => set('startDate', e.target.value.replace(/[^\d-]/g, '').slice(0, 10))} />
          <TextField select label={t.continent} value={page.continent} onChange={(e) => set('continent', e.target.value)}>
            {CONTINENT_IDS.map((c) => <MenuItem key={c} value={c}>{t.continents[c]}</MenuItem>)}
          </TextField>
        </Box>
        <TextField sx={{ mt: 2 }} fullWidth multiline minRows={5} required label={t.description} value={page.description}
          error={err('description')} helperText={err('description') ? t.required : ''} onChange={(e) => set('description', e.target.value)}
          slotProps={{ htmlInput: { maxLength: 5000 } }} />
        <TextField sx={{ mt: 2 }} fullWidth multiline minRows={3} label={t.prayer} value={page.specialNotes ?? ''}
          onChange={(e) => set('specialNotes', e.target.value)} slotProps={{ htmlInput: { maxLength: 3000 } }} />
      </FormSection>

      <FormSection step={2} title={t.where}>
        <CityPicker lang={lang} required showErrors={showErrors} value={{ ...page.location, state: page.location.state ?? '' }}
          onChange={(location) => set('location', { ...location, state: location.state ?? '' })} />
      </FormSection>

      <FormSection step={3} title={t.photos}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>{t.profilePhoto}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {page.profileImage && <Thumb path={page.profileImage} label={t.remove} onRemove={() => set('profileImage', '')} />}
              <Button variant="outlined" onClick={() => photoRef.current?.click()} sx={{ borderRadius: '999px', fontWeight: 700 }}>
                {page.profileImage ? t.replace : t.choose}
              </Button>
            </Box>
            <input ref={photoRef} hidden type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) { const path = await upload(f, 'profile'); if (path) set('profileImage', path); }
            }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>{t.prayerLetter}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {page.prayerLetter && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 1, borderRadius: '12px', bgcolor: '#EEF2F7' }}>
                  <PictureAsPdfOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} /> PDF
                  <IconButton size="small" aria-label={t.remove} onClick={() => set('prayerLetter', '')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
                </Box>
              )}
              <Button variant="outlined" onClick={() => letterRef.current?.click()} sx={{ borderRadius: '999px', fontWeight: 700 }}>
                {page.prayerLetter ? t.replace : t.choose}
              </Button>
            </Box>
            <input ref={letterRef} hidden type="file" accept="application/pdf" onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) { const path = await upload(f, 'prayer-letter'); if (path) set('prayerLetter', path); }
            }} />
          </Box>
        </Box>
        <Typography sx={{ fontWeight: 700, mt: 3, mb: 1 }}>{t.gallery}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
          {page.media.map((m) => (
            <Thumb key={m.url} path={m.url} label={t.remove} onRemove={() => set('media', page.media.filter((x) => x.url !== m.url))} />
          ))}
          <Button onClick={() => galleryRef.current?.click()} disabled={page.media.length >= 50}
            sx={{ width: 96, height: 96, borderRadius: '12px', border: '2px dashed var(--ibl-border)', flexDirection: 'column', fontSize: '0.75rem', fontWeight: 700 }}>
            <AddPhotoAlternateOutlinedIcon />{t.addPhotos}
          </Button>
        </Box>
        <input ref={galleryRef} hidden type="file" accept="image/*,video/*" multiple onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          for (const f of files) {
            const path = await upload(f, 'gallery');
            if (path) setPage((p) => (p ? { ...p, media: [...p.media, { url: path }] } : p));
          }
        }} />
        {uploads.map((u) => (
          <Box key={u.key} sx={{ mt: 1.5 }}>
            <Typography sx={{ fontSize: '0.85rem' }}>{t.uploading} {u.name}</Typography>
            <LinearProgress variant="determinate" value={u.progress * 100} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        ))}
      </FormSection>

      <FormSection step={4} title={t.publicContact}>
        {page.contactInfo.map((c, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
            <TextField select value={c.type} sx={{ minWidth: 140 }} onChange={(e) => set('contactInfo', page.contactInfo.map((x, j) => (j === i ? { ...x, type: e.target.value as ContactInfo['type'] } : x)))}>
              {CONTACT_TYPES.map((ty) => <MenuItem key={ty} value={ty}>{t.contactTypes[ty]}</MenuItem>)}
            </TextField>
            <TextField fullWidth value={c.value} onChange={(e) => set('contactInfo', page.contactInfo.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
            <IconButton aria-label={t.remove} onClick={() => set('contactInfo', page.contactInfo.filter((_, j) => j !== i))}><CloseIcon /></IconButton>
          </Box>
        ))}
        {page.contactInfo.length < 10 && (
          <Button startIcon={<AddIcon />} onClick={() => set('contactInfo', [...page.contactInfo, { type: 'email', value: '' }])} sx={{ fontWeight: 700 }}>
            {t.addContact}
          </Button>
        )}
      </FormSection>
    </Box>
  );

  return (
    <Box>
      {!adminMode && <Alert severity="info" sx={{ mb: 2, fontSize: '0.95rem', fontWeight: 600 }}>{t.notPublishedBanner}</Alert>}
      {!adminMode && edit.status === 'submitted' && <Alert severity="success" sx={{ mb: 2 }}>{t.submittedBanner}</Alert>}
      {!adminMode && edit.status === 'rejected' && edit.rejectionReason && (
        <Alert severity="warning" sx={{ mb: 2 }}><strong>{t.rejectedBanner}</strong><Box sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{edit.rejectionReason}</Box></Alert>
      )}
      {!wide && (
        <ToggleButtonGroup exclusive fullWidth value={view} onChange={(_, v) => v && setView(v)} sx={{ mb: 2, bgcolor: '#fff' }}>
          <ToggleButton value="edit" sx={{ fontWeight: 800, textTransform: 'none', py: 1.25 }}>{t.editTab}</ToggleButton>
          <ToggleButton value="preview" sx={{ fontWeight: 800, textTransform: 'none', py: 1.25 }}>{t.previewTab}</ToggleButton>
        </ToggleButtonGroup>
      )}
      {wide ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 3, alignItems: 'start' }}>
          {form}
          <Box sx={{ position: 'sticky', top: 16 }}>{preview}</Box>
        </Box>
      ) : view === 'edit' ? form : preview}

      <Box sx={{
        position: 'sticky', bottom: 0, zIndex: 5, mt: 2, py: 1.5, px: 2, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: '16px',
        border: '1px solid var(--ibl-border)', boxShadow: '0 -6px 24px rgba(15,23,42,0.08)', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {notice && <Alert severity={notice.type} sx={{ flex: '1 1 100%' }} onClose={() => setNotice(null)}>{notice.text}</Alert>}
        <Box sx={{ flex: 1 }} />
        {edit.status !== 'submitted' && (
          <Button size="large" variant="outlined" onClick={() => save(false)} disabled={!!busy || uploads.length > 0} sx={{ borderRadius: '999px', fontWeight: 800, px: 3, textTransform: 'none' }}>
            {busy === 'draft' ? <CircularProgress size={20} /> : t.saveDraft}
          </Button>
        )}
        <Button size="large" variant="contained" onClick={() => save(true)} disabled={!!busy || uploads.length > 0} endIcon={<SendIcon />}
          sx={{ borderRadius: '999px', fontWeight: 800, px: 3, textTransform: 'none' }}>
          {busy === 'submit' ? <CircularProgress size={20} color="inherit" /> : adminMode ? t.save : edit.status === 'submitted' ? t.updateSubmitted : t.submit}
        </Button>
      </Box>
    </Box>
  );
};

export default PageEditor;
