import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  LinearProgress, MenuItem, Snackbar, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PlayCircleFilledWhiteOutlinedIcon from '@mui/icons-material/PlayCircleFilledWhiteOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import SendIcon from '@mui/icons-material/Send';
import UndoIcon from '@mui/icons-material/Undo';
import type { ContactInfo, Missionary } from '../types';
import {
  editFilesPrefix, getEdit, saveEditDraft, submitEdit, updateSubmittedEdit, type EditFileKind, type MissionaryEdit, type ProposedPage,
} from '../data/missionaryEdits';
import { CONTINENT_IDS, REQUEST_LIMITS } from '../data/missionaryRequests';
import { uploadFile } from '../data/storageFiles';
import { isVideoPath, storageUrl, videoPosterPath, webVideoPath } from '../storageUrl';
import CityPicker from '../ui/CityPicker';
import ChurchesEditor from '../ui/ChurchesEditor';
import PreviewFrame from '../ui/PreviewFrame';
import FormSection from '../Registration/components/FormSection';
import type { PortalStrings } from './portalI18n';

const CONTACT_TYPES: ContactInfo['type'][] = ['email', 'phone', 'website', 'facebook', 'instagram'];
const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-100);
const isVideo = (path: string) => isVideoPath(path) || /\.(mp4|mov|m4v|webm)$/i.test(path);
/** Published videos have a poster and a web-friendly copy; ones just uploaded don't yet. */
const isPublished = (path: string) => /^(images|videos|pdfs)\//.test(path);
const posterOf = (path: string) => (isPublished(path) ? storageUrl(videoPosterPath(path)) : '');
const videoSrcOf = (path: string) => (isPublished(path) ? storageUrl(webVideoPath(path)) : storageUrl(path));

const normalize = (p: ProposedPage): ProposedPage => ({
  ...p, location: { state: '', ...p.location }, specialNotes: p.specialNotes ?? '', startDate: p.startDate ?? '', churches: p.churches ?? [],
});

/** A gallery photo or video: tap to view it large, X to take it off the page (undoable). */
const MediaTile: React.FC<{ path: string; onOpen: () => void; onRemove: () => void; removeLabel: string; size?: number }> = ({ path, onOpen, onRemove, removeLabel, size = 112 }) => {
  const [failed, setFailed] = useState(false);
  const video = isVideo(path);
  const src = video ? posterOf(path) : storageUrl(path);
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <ButtonBase onClick={onOpen} sx={{ width: '100%', height: '100%', borderRadius: '14px', overflow: 'hidden', bgcolor: '#E2E8F0', display: 'grid', placeItems: 'center' }}>
        {src && !failed
          ? <Box component="img" src={src} alt="" loading="lazy" onError={() => setFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : video ? <MovieOutlinedIcon sx={{ fontSize: 40, color: 'var(--ibl-primary)' }} /> : <CircularProgress size={18} />}
        {video && <PlayCircleFilledWhiteOutlinedIcon sx={{ position: 'absolute', fontSize: 40, color: '#fff', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />}
      </ButtonBase>
      <IconButton aria-label={removeLabel} onClick={onRemove} sx={{
        position: 'absolute', top: -8, right: -8, width: 34, height: 34, bgcolor: '#fff', boxShadow: '0 2px 8px rgba(15,23,42,0.25)',
        '&:hover': { bgcolor: '#FEE2E2' },
      }}>
        <DeleteOutlineIcon sx={{ fontSize: 20, color: '#B91C1C' }} />
      </IconButton>
    </Box>
  );
};

/**
 * Where a missionary edits their page. Every change is a proposal (missionaryEdits/{token}) that an
 * admin approves before it goes live. Changes here stay on this screen until they press Save or
 * Send; "Descartar cambios" puts everything back as it was last saved, and each removal can be undone.
 */
const PageEditor: React.FC<{
  token: string;
  t: PortalStrings;
  lang: 'es' | 'en';
  /** Admin "Ajustar": no missionary banners; saving keeps the change in review. */
  adminMode?: boolean;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}> = ({ token, t, lang, adminMode, onSaved, onDirtyChange }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [edit, setEdit] = useState<MissionaryEdit | null | undefined>(undefined);
  const [page, setPage] = useState<ProposedPage | null>(null);
  const [saved, setSaved] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [uploads, setUploads] = useState<{ key: string; name: string; progress: number }[]>([]);
  const [busy, setBusy] = useState<'' | 'draft' | 'submit'>('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [undo, setUndo] = useState<ProposedPage | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const letterRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getEdit(token).then((e) => {
      const usable = e && !e.revoked && e.status !== 'approved' ? e : null;
      setEdit(usable);
      if (usable) {
        const p = normalize(usable.proposed);
        setPage(p);
        setSaved(JSON.stringify(p));
      }
    }).catch(() => setEdit(null));
  }, [token]);

  const dirty = useMemo(() => !!page && JSON.stringify(page) !== saved, [page, saved]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (edit === undefined) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!edit || !page) return <Alert severity="warning" sx={{ fontSize: '1rem' }}>{t.linkGone}</Alert>;

  const set = <K extends keyof ProposedPage>(k: K, v: ProposedPage[K]) => setPage((p) => (p ? { ...p, [k]: v } : p));
  /** Removing anything first remembers the page, so "Deshacer" can bring it back. */
  const remove = <K extends keyof ProposedPage>(k: K, v: ProposedPage[K]) => { setUndo(page); set(k, v); };

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
    if (submit || invalid) {
      setShowErrors(true);
      if (invalid) { setNotice({ type: 'error', text: t.fixErrors }); return; }
    }
    setBusy(submit ? 'submit' : 'draft');
    try {
      const clean: ProposedPage = {
        ...page,
        contactInfo: page.contactInfo.filter((c) => c.value.trim()).map((c) => ({ ...c, value: c.value.trim() })),
        churches: (page.churches ?? []).filter((c) => c.name.trim()).map((c) => ({ ...c, name: c.name.trim(), address: c.address.trim() })),
      };
      // Once submitted, further saves stay in review (they never withdraw it).
      const alreadySubmitted = edit.status === 'submitted';
      await (alreadySubmitted ? updateSubmittedEdit(token, clean) : submit ? submitEdit(token, clean) : saveEditDraft(token, clean));
      setEdit({ ...edit, status: alreadySubmitted || submit ? 'submitted' : 'draft' });
      setPage(clean);
      setSaved(JSON.stringify(clean));
      setUndo(null);
      setNotice({ type: 'success', text: adminMode ? t.saved : submit ? t.submittedOk : t.savedDraft });
      onSaved?.();
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: t.error });
    } finally {
      setBusy('');
    }
  };

  const discard = () => {
    setPage(JSON.parse(saved));
    setUndo(null);
    setShowErrors(false);
    setConfirmDiscard(false);
    setNotice(null);
  };

  const preview = (
    <PreviewFrame lang={lang} height={wide ? 'calc(100vh - 170px)' : '72vh'} page={{ ...page, id: edit.missionaryId } as Missionary} />
  );

  const err = (k: keyof typeof missing) => showErrors && missing[k];
  const near = [page.location.city, page.location.state, page.location.country].filter(Boolean).join(', ');

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
            <Typography sx={{ fontWeight: 700, mb: 1.25 }}>{t.profilePhoto}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {page.profileImage && (
                <MediaTile path={page.profileImage} removeLabel={t.remove} onOpen={() => setViewing(page.profileImage!)} onRemove={() => remove('profileImage', '')} />
              )}
              <Button variant="outlined" onClick={() => photoRef.current?.click()} sx={{ borderRadius: '999px', fontWeight: 700, textTransform: 'none' }}>
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
            <Typography sx={{ fontWeight: 700, mb: 1.25 }}>{t.prayerLetter}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {page.prayerLetter && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pl: 1.5, pr: 0.5, py: 0.5, borderRadius: '12px', bgcolor: '#EEF2F7' }}>
                  <PictureAsPdfOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />
                  <Box component="a" href={storageUrl(page.prayerLetter)} target="_blank" rel="noopener" sx={{ fontWeight: 700, color: 'var(--ibl-primary-dark)' }}>PDF</Box>
                  <IconButton aria-label={t.remove} onClick={() => remove('prayerLetter', '')}><DeleteOutlineIcon sx={{ color: '#B91C1C' }} /></IconButton>
                </Box>
              )}
              <Button variant="outlined" onClick={() => letterRef.current?.click()} sx={{ borderRadius: '999px', fontWeight: 700, textTransform: 'none' }}>
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

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', mt: 3, mb: 0.5 }}>
          <Typography sx={{ fontWeight: 700 }}>{t.gallery}</Typography>
          <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.88rem' }}>· {t.mediaCount(page.media.length)}</Typography>
        </Box>
        {page.media.length > 0 && <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.85rem', mb: 1.5 }}>{t.tapToView}</Typography>}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pt: 1 }}>
          {page.media.map((m) => (
            <MediaTile key={m.url} path={m.url} removeLabel={t.remove} onOpen={() => setViewing(m.url)}
              onRemove={() => remove('media', page.media.filter((x) => x.url !== m.url))} />
          ))}
          <Button onClick={() => galleryRef.current?.click()} disabled={page.media.length >= 50}
            sx={{ width: 112, height: 112, borderRadius: '14px', border: '2px dashed var(--ibl-border)', flexDirection: 'column', gap: 0.5, fontSize: '0.78rem', fontWeight: 700, textTransform: 'none' }}>
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

      <FormSection step={4} title={t.churches}>
        <ChurchesEditor lang={lang} near={near} value={page.churches ?? []}
          onChange={(churches) => (churches.length < (page.churches ?? []).length ? remove('churches', churches) : set('churches', churches))} />
      </FormSection>

      <FormSection step={5} title={t.publicContact}>
        {page.contactInfo.map((c, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: '150px 1fr auto' }, gap: 1, mb: 1.5, alignItems: 'center' }}>
            <TextField select value={c.type} sx={{ gridColumn: { xs: '1 / 2', sm: 'auto' } }}
              onChange={(e) => set('contactInfo', page.contactInfo.map((x, j) => (j === i ? { ...x, type: e.target.value as ContactInfo['type'] } : x)))}>
              {CONTACT_TYPES.map((ty) => <MenuItem key={ty} value={ty}>{t.contactTypes[ty]}</MenuItem>)}
            </TextField>
            <IconButton aria-label={t.remove} onClick={() => remove('contactInfo', page.contactInfo.filter((_, j) => j !== i))} sx={{ gridColumn: { xs: '2', sm: '3' }, gridRow: { xs: '1', sm: 'auto' } }}>
              <CloseIcon />
            </IconButton>
            <TextField fullWidth value={c.value} sx={{ gridColumn: { xs: '1 / -1', sm: '2' }, gridRow: { xs: '2', sm: '1' } }}
              onChange={(e) => set('contactInfo', page.contactInfo.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          </Box>
        ))}
        {page.contactInfo.length < 10 && (
          <Button startIcon={<AddIcon />} onClick={() => set('contactInfo', [...page.contactInfo, { type: 'email', value: '' }])} sx={{ fontWeight: 700, textTransform: 'none' }}>
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

      {/* Space so the last fields can scroll clear of the bar below */}
      <Box sx={{ height: { xs: 24, sm: 8 } }} />
      <Box sx={{
        position: 'sticky', bottom: { xs: 8, sm: 12 }, zIndex: 5, py: 1.25, px: { xs: 1.5, sm: 2 }, bgcolor: '#FFFFFF', borderRadius: '18px',
        border: '1px solid var(--ibl-border)', boxShadow: '0 -4px 28px rgba(15,23,42,0.14)', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {notice && <Alert severity={notice.type} sx={{ flex: '1 1 100%' }} onClose={() => setNotice(null)}>{notice.text}</Alert>}
        {(dirty || !phone) && (
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: dirty ? '#B45309' : 'var(--ibl-text-muted)', flex: { xs: '1 1 100%', sm: 1 } }}>
            {dirty ? `● ${t.unsaved}` : `✓ ${t.allSaved}`}
          </Typography>
        )}
        {dirty && (
          <Button onClick={() => setConfirmDiscard(true)} disabled={!!busy} color="inherit" sx={{ borderRadius: '999px', fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}>
            {phone ? t.undoAll : t.discard}
          </Button>
        )}
        {edit.status !== 'submitted' && !adminMode && (
          <Button variant="outlined" onClick={() => save(false)} disabled={!!busy || uploads.length > 0 || !dirty}
            sx={{ borderRadius: '999px', fontWeight: 800, px: 2.5, textTransform: 'none', flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap' }}>
            {busy === 'draft' ? <CircularProgress size={20} /> : phone ? t.saveShort : t.saveDraft}
          </Button>
        )}
        <Button variant="contained" onClick={() => save(true)} disabled={!!busy || uploads.length > 0 || (edit.status === 'submitted' && !dirty)} endIcon={<SendIcon />}
          sx={{ borderRadius: '999px', fontWeight: 800, px: 2.5, textTransform: 'none', flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap' }}>
          {busy === 'submit' ? <CircularProgress size={20} color="inherit" /> : adminMode ? t.save : phone ? (edit.status === 'submitted' ? t.saveShort : t.sendShort) : edit.status === 'submitted' ? t.updateSubmitted : t.submit}
        </Button>
      </Box>

      <Snackbar open={!!undo} autoHideDuration={8000} onClose={(_, reason) => reason !== 'clickaway' && setUndo(null)} message={t.removed}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: { xs: 130, sm: 120 } }}
        action={<Button color="inherit" startIcon={<UndoIcon />} onClick={() => { if (undo) setPage(undo); setUndo(null); }} sx={{ fontWeight: 800 }}>{t.undo}</Button>} />

      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t.discardTitle}</DialogTitle>
        <DialogContent><Typography>{t.discardBody}</Typography></DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDiscard(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>{t.keepEditing}</Button>
          <Button variant="contained" color="warning" onClick={discard} sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 800 }}>{t.discardYes}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0F172A' } }}>
        <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 240 }}>
          {viewing && (isVideo(viewing)
            ? <Box component="video" key={viewing} controls autoPlay playsInline poster={posterOf(viewing) || undefined}
                sx={{ width: '100%', maxHeight: '80vh', display: 'block' }}
                onError={(e: React.SyntheticEvent<HTMLVideoElement>) => { if (e.currentTarget.src !== storageUrl(viewing)) e.currentTarget.src = storageUrl(viewing); }}
                src={videoSrcOf(viewing)} />
            : <Box component="img" src={storageUrl(viewing)} alt="" sx={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} />)}
          <IconButton aria-label={t.close} onClick={() => setViewing(null)} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Dialog>
    </Box>
  );
};

export default PageEditor;
