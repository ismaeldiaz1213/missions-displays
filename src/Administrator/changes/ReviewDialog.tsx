import React, { useEffect, useState } from 'react';
import PreviewFrame from '../../ui/PreviewFrame';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField,
  ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import TuneIcon from '@mui/icons-material/Tune';
import ReplyIcon from '@mui/icons-material/Reply';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import type { Missionary } from '../../types';
import { approveEdit, getEdit, rejectEdit, type MissionaryEdit } from '../../data/missionaryEdits';
import { getPublishedFresh } from '../../data/missionaries';
import { currentUserEmail } from '../../data/currentUser';
import { isVideoPath, resolveUrl } from '../../storageUrl';
import PageEditor from '../../Portal/PageEditor';
import { PORTAL_STRINGS } from '../../Portal/portalI18n';
import { A, LightIsland, formatDate, useAdminLang } from '../adminUi';
import { FIELD_LABELS, pageChanges, type Change } from './diff';


const FileThumb: React.FC<{ path: string }> = ({ path }) => {
  const [url, setUrl] = useState('');
  const video = isVideoPath(path) || /\.(mp4|mov|m4v|webm)$/i.test(path);
  const pdf = /\.pdf$/i.test(path) || path.includes('/prayer-letter/');
  useEffect(() => { if (path && !video && !pdf) resolveUrl(path, '').then(setUrl); }, [path, video, pdf]);
  if (!path) return <Typography sx={{ color: A.muted, fontSize: '0.85rem' }}>—</Typography>;
  const box = { width: 72, height: 72, borderRadius: '10px', bgcolor: A.page, border: `1px solid ${A.line}`, display: 'grid', placeItems: 'center', overflow: 'hidden' };
  if (video) return <Box sx={box}><MovieOutlinedIcon sx={{ color: A.blue }} /></Box>;
  if (pdf) return <Box sx={{ ...box, fontWeight: 800, color: A.blue }}>PDF</Box>;
  return <Box sx={box}>{url ? <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CircularProgress size={16} />}</Box>;
};

const ChangeItem: React.FC<{ c: Change }> = ({ c }) => {
  const { lang, tr } = useAdminLang();
  return (
    <Box sx={{ py: 1.5, borderTop: `1px solid ${A.line}` }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: A.blue, mb: 0.75 }}>
        {FIELD_LABELS[c.field]?.[lang] ?? c.field}
      </Typography>
      {c.kind === 'value' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ textDecoration: 'line-through', color: A.redText, bgcolor: A.redBg, px: 0.75, borderRadius: '6px' }}>{c.before || '—'}</Typography>
          <ArrowForwardIcon sx={{ fontSize: 16, color: A.muted }} />
          <Typography sx={{ color: A.greenText, bgcolor: A.greenBg, px: 0.75, borderRadius: '6px' }}>{c.after || '—'}</Typography>
        </Box>
      )}
      {c.kind === 'text' && (
        <Typography component="div" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.92rem' }}>
          {c.parts.map((p, i) => (
            <Box key={i} component="span" sx={p.kind === 'added' ? { bgcolor: A.greenBg, color: A.greenText } : p.kind === 'removed' ? { bgcolor: A.redBg, color: A.redText, textDecoration: 'line-through' } : {}}>{p.text}</Box>
          ))}
        </Typography>
      )}
      {c.kind === 'file' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileThumb path={c.before} /><ArrowForwardIcon sx={{ color: A.muted }} /><FileThumb path={c.after} />
        </Box>
      )}
      {c.kind === 'list' && (
        <Box>
          {c.added.length === 0 && c.removed.length === 0 && <Typography sx={{ color: A.muted, fontSize: '0.9rem' }}>{tr('Cambió el orden', 'The order changed')}</Typography>}
          {c.field === 'media' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {c.added.map((p) => <Box key={p} sx={{ outline: `3px solid ${A.greenLine}`, borderRadius: '12px' }}><FileThumb path={p} /></Box>)}
              {c.removed.map((p) => <Box key={p} sx={{ outline: `3px solid ${A.redLine}`, borderRadius: '12px', opacity: 0.6 }}><FileThumb path={p} /></Box>)}
            </Box>
          ) : (
            <>
              {c.added.map((x) => <Typography key={x} sx={{ color: A.greenText }}>+ {x}</Typography>)}
              {c.removed.map((x) => <Typography key={x} sx={{ color: A.redText, textDecoration: 'line-through' }}>− {x}</Typography>)}
            </>
          )}
          {c.field === 'media' && (c.added.length > 0 || c.removed.length > 0) && (
            <Typography sx={{ color: A.muted, fontSize: '0.8rem', mt: 0.75 }}>
              {tr(`${c.added.length} nuevas (verde) · ${c.removed.length} quitadas (rojo)`, `${c.added.length} added (green) · ${c.removed.length} removed (red)`)}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

/**
 * Reviewing a missionary's proposed page like a pull request: what changed on the left, the page
 * before/after on the right, and Aprobar / Ajustar / Pedir cambios.
 */
const ReviewDialog: React.FC<{ token: string; onClose: () => void; onDone: () => void }> = ({ token, onClose, onDone }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { tr, lang } = useAdminLang();
  const [edit, setEdit] = useState<MissionaryEdit | null | undefined>(undefined);
  const [current, setCurrent] = useState<Missionary | null>(null);
  const [side, setSide] = useState<'after' | 'before'>('after');
  const [mode, setMode] = useState<'review' | 'adjust' | 'reject'>('review');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [adjustDirty, setAdjustDirty] = useState(false);

  const load = async () => {
    const e = await getEdit(token);
    setEdit(e);
    if (e) setCurrent(await getPublishedFresh(e.missionaryId));
  };
  useEffect(() => { load().catch((err) => { console.error(err); setEdit(null); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const approve = async () => {
    if (!edit) return;
    setError('');
    try {
      await approveEdit(edit, currentUserEmail(), setBusy);
      onDone();
    } catch (err) {
      console.error(err);
      setError(tr(`No se pudo publicar; la página quedó como estaba. ${String(err)}`, `Couldn't publish; the page was left as it was. ${String(err)}`));
    } finally { setBusy(''); }
  };

  const reject = async () => {
    if (!edit || !reason.trim()) return;
    setBusy(tr('Guardando…', 'Saving…'));
    try {
      await rejectEdit(edit.token, reason.trim(), currentUserEmail());
      onDone();
    } catch (err) { setError(String(err)); } finally { setBusy(''); }
  };

  const changes = edit && current ? pageChanges(current, edit.proposed) : [];
  const name = edit ? [edit.proposed.name, edit.proposed.lastName].filter(Boolean).join(' ') : '';

  const preview = edit && (
    <Box>
      <ToggleButtonGroup exclusive size="small" value={side} onChange={(_, v) => v && setSide(v)} sx={{ mb: 1 }}>
        <ToggleButton value="before" sx={{ px: 2, fontWeight: 700, textTransform: 'none' }}>{tr('Antes (publicado)', 'Before (published)')}</ToggleButton>
        <ToggleButton value="after" sx={{ px: 2, fontWeight: 700, textTransform: 'none' }}>{tr('Después (propuesto)', 'After (proposed)')}</ToggleButton>
      </ToggleButtonGroup>
      <PreviewFrame key={side} lang={lang} height="68vh" page={side === 'before' && current ? current : ({ ...edit.proposed, id: edit.missionaryId } as Missionary)} />
    </Box>
  );

  return (
    <Dialog open fullScreen onClose={busy ? undefined : onClose} PaperProps={{ sx: { bgcolor: A.page, borderRadius: 0 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: A.surface, borderBottom: `1px solid ${A.line}` }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem' }}>{tr('Cambios de', 'Changes from')} {name}</Typography>
          {edit && <Typography sx={{ color: A.muted }}>{tr('Enviado', 'Submitted')} {formatDate(edit.submittedAt || edit.updatedAt, lang)} · {changes.length} {tr('campos cambiaron', 'fields changed')}</Typography>}
        </Box>
        <IconButton onClick={onClose} disabled={!!busy}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
        {edit === undefined ? <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
          : !edit ? <Alert severity="info">{tr('Este cambio ya no está disponible.', 'This change is no longer available.')}</Alert>
            : mode === 'adjust' ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>{tr('Sus ajustes se guardan en la propuesta (el misionero los verá). Luego vuelva y apruebe.', 'Your adjustments are saved into the proposal (the missionary will see them). Then go back and approve.')}</Alert>
                <LightIsland>
                  <PageEditor token={edit.token} t={PORTAL_STRINGS[lang]} lang={lang} adminMode onDirtyChange={setAdjustDirty} onSaved={() => { load(); setMode('review'); }} />
                </LightIsland>
              </Box>
            ) : edit.status !== 'submitted' ? (
              <Alert severity="info">{edit.status === 'approved' ? tr('Este cambio ya se publicó.', 'This change was already published.') : tr('El misionero todavía no lo ha enviado.', "The missionary hasn't sent it yet.")}</Alert>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: wide ? 'minmax(320px, 0.9fr) 1.1fr' : '1fr', gap: 3, alignItems: 'start' }}>
                <Box sx={{ bgcolor: A.surface, border: `1px solid ${A.line}`, borderRadius: '16px', p: 2.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 0.5 }}>{tr('Qué cambió', 'What changed')}</Typography>
                  {changes.length === 0 && <Typography sx={{ color: A.muted }}>{tr('No hay diferencias con la página publicada.', 'No differences from the published page.')}</Typography>}
                  {changes.map((c) => <ChangeItem key={c.field} c={c} />)}
                </Box>
                {preview}
              </Box>
            )}
        {mode === 'reject' && (
          <Box sx={{ mt: 2, bgcolor: A.surface, border: `1px solid ${A.line}`, borderRadius: '16px', p: 2.5 }}>
            <TextField fullWidth multiline minRows={3} autoFocus label={tr('¿Qué necesita cambiar? (lo verá el misionero)', 'What needs to change? (the missionary will see this)')}
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </Box>
        )}
        {busy && <Typography sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}><CircularProgress size={16} /> {busy}</Typography>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      {edit?.status === 'submitted' && mode !== 'adjust' && (
        <DialogActions sx={{ p: 2, bgcolor: A.surface, borderTop: `1px solid ${A.line}`, gap: 1, flexWrap: 'wrap' }}>
          {mode === 'reject' ? (
            <>
              <Button color="inherit" onClick={() => setMode('review')} disabled={!!busy}>{tr('Cancelar', 'Cancel')}</Button>
              <Button variant="contained" color="warning" onClick={reject} disabled={!!busy || !reason.trim()} startIcon={<ReplyIcon />}>{tr('Enviar al misionero', 'Send to the missionary')}</Button>
            </>
          ) : (
            <>
              <Button color="warning" startIcon={<ReplyIcon />} onClick={() => setMode('reject')} disabled={!!busy}>{tr('Pedir cambios', 'Request changes')}</Button>
              <Button startIcon={<TuneIcon />} onClick={() => setMode('adjust')} disabled={!!busy}>{tr('Ajustar', 'Adjust')}</Button>
              <Box sx={{ flex: 1 }} />
              <Button variant="contained" color="success" size="large" startIcon={<CheckIcon />} onClick={approve} disabled={!!busy}>{tr('Aprobar y publicar', 'Approve and publish')}</Button>
            </>
          )}
        </DialogActions>
      )}
      {mode === 'adjust' && (
        <DialogActions sx={{ p: 2, bgcolor: A.surface }}>
          {adjustDirty && <Typography sx={{ flex: 1, color: A.amberText, fontWeight: 700 }}>{tr('Tiene ajustes sin guardar: se perderán si vuelve.', 'You have unsaved adjustments: they are lost if you go back.')}</Typography>}
          <Button onClick={() => { load(); setAdjustDirty(false); setMode('review'); }}>{adjustDirty ? tr('Volver sin guardar', 'Go back without saving') : tr('Volver a la revisión', 'Back to review')}</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ReviewDialog;
