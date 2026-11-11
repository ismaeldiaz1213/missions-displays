import React, { useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem,
  TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import {
  REPORT_PDF_MAX_BYTES, addSubmission, formatDay, markReviewed, markUsedOnPage, quarterLabel, reportFilesPrefix,
  type Quarter, type ReportSubmission,
} from '../../data/reports';
import { copyFile, fileUrl, uploadFile } from '../../data/storageFiles';
import { publishWithHistory, saveDraft } from '../../data/missionaries';
import { currentUserEmail } from '../../data/currentUser';
import type { Missionary } from '../../types';
import { A, formatDate, useAdminLang } from '../adminUi';
import { formatBytes } from '../formatBytes';
import { fullName, useDirectory, type DirectoryEntry } from '../directory/directoryData';
import { useReports } from './reportsData';
import { ReportStatusTag } from './ReportStatus';

const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-80);

const USED_LABELS: Record<string, { es: string; en: string }> = {
  prayerLetter: { es: 'Publicado como carta de oración', en: 'Published as prayer letter' },
  specialNotes: { es: 'Comentarios usados en peticiones / notas', en: 'Comments used in prayer requests / notes' },
  description: { es: 'Comentarios usados en la descripción', en: 'Comments used in the description' },
};

/** Saves the page (published pages keep their previous version in history). */
const savePage = (entry: DirectoryEntry, page: Missionary, by: string) =>
  entry.status === 'draft' ? saveDraft(page) : publishWithHistory(page, by, 'from-report');

const SubmissionCard: React.FC<{ s: ReportSubmission; entry: DirectoryEntry; onChanged: () => void }> = ({ s, entry, onChanged }) => {
  const { tr, lang } = useAdminLang();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [useComments, setUseComments] = useState<{ field: 'specialNotes' | 'description'; text: string } | null>(null);
  const pageEditable = entry.status !== 'archived';

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError('');
    try { await fn(); onChanged(); } catch (err) { console.error(err); setError(String(err)); } finally { setBusy(''); }
  };

  const openPdf = () => run(tr('Abriendo…', 'Opening…'), async () => {
    window.open(await fileUrl(s.pdfPath), '_blank', 'noopener');
  });

  const publishLetter = () => run(tr('Publicando carta…', 'Publishing letter…'), async () => {
    const path = await copyFile(s.pdfPath, `pdfs/${entry.id}-prayer-letter-${Date.now()}.pdf`, 'application/pdf');
    await savePage(entry, { ...entry.page, prayerLetter: path }, currentUserEmail());
    await markUsedOnPage(s.id, 'prayerLetter');
  });

  const saveComments = () => useComments && run(tr('Guardando…', 'Saving…'), async () => {
    await savePage(entry, { ...entry.page, [useComments.field]: useComments.text }, currentUserEmail());
    await markUsedOnPage(s.id, useComments.field);
    setUseComments(null);
  });

  return (
    <Box sx={{ border: `1px solid ${A.line}`, borderRadius: '14px', p: 2, bgcolor: A.surface }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 800, flex: 1 }}>
          {s.kind === 'noUpdates' ? tr('Sin novedades este trimestre', 'No updates this quarter') : tr('Informe', 'Report')}
        </Typography>
        <Typography sx={{ color: A.muted, fontSize: '0.85rem' }}>
          {formatDate(s.submittedAt, lang)} · {s.submittedBy === 'missionary' ? tr('enviado por el misionero', 'sent by the missionary') : `${tr('subido por', 'uploaded by')} ${s.submittedBy}`}
        </Typography>
      </Box>
      {s.comments && (
        <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1.25, p: 1.5, bgcolor: A.page, borderRadius: '10px', fontSize: '0.92rem' }}>{s.comments}</Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
        {s.pdfPath && (
          <Button size="small" variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} onClick={openPdf} disabled={!!busy}>
            {s.fileName || 'PDF'}
          </Button>
        )}
        {s.kind === 'report' && !s.reviewedAt && (
          <Button size="small" variant="contained" color="success" startIcon={<DoneAllIcon />} onClick={() => setReviewing(true)} disabled={!!busy}>
            {tr('Marcar revisado', 'Mark reviewed')}
          </Button>
        )}
        {s.kind === 'report' && pageEditable && s.pdfPath && (
          <Button size="small" startIcon={<PublishOutlinedIcon />} onClick={publishLetter} disabled={!!busy}>
            {tr('Publicar como carta de oración', 'Publish as prayer letter')}
          </Button>
        )}
        {s.kind === 'report' && pageEditable && s.comments && (
          <Button size="small" startIcon={<ChatBubbleOutlineIcon />} disabled={!!busy}
            onClick={() => setUseComments({ field: 'specialNotes', text: s.comments })}>
            {tr('Usar comentarios en la página', 'Use comments on the page')}
          </Button>
        )}
      </Box>
      {reviewing && (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField size="small" sx={{ flex: 1, minWidth: 220 }} label={tr('Nota (opcional, solo para el equipo)', 'Note (optional, staff only)')}
            value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
          <Button variant="contained" color="success" disabled={!!busy}
            onClick={() => run(tr('Guardando…', 'Saving…'), async () => { await markReviewed(s.id, currentUserEmail(), reviewNote.trim()); setReviewing(false); })}>
            {tr('Guardar', 'Save')}
          </Button>
        </Box>
      )}
      {useComments && (
        <Box sx={{ mt: 1.5, p: 1.5, border: `1px dashed ${A.softLine}`, borderRadius: '12px' }}>
          <TextField select size="small" label={tr('¿Dónde en la página?', 'Where on the page?')} value={useComments.field} sx={{ mb: 1.5, minWidth: 260 }}
            onChange={(e) => setUseComments({ ...useComments, field: e.target.value as 'specialNotes' | 'description' })}>
            <MenuItem value="specialNotes">{tr('Peticiones de oración / notas', 'Prayer requests / notes')}</MenuItem>
            <MenuItem value="description">{tr('Descripción', 'Description')}</MenuItem>
          </TextField>
          <TextField fullWidth multiline minRows={4} value={useComments.text} onChange={(e) => setUseComments({ ...useComments, text: e.target.value })}
            helperText={tr('Reemplaza ese texto en la página pública. La versión anterior queda en el historial.', 'Replaces that text on the public page. The previous version stays in history.')} />
          <Typography sx={{ color: A.muted, fontSize: '0.8rem', mt: 1 }}>
            {tr('Texto actual: ', 'Current text: ')}{(entry.page[useComments.field] as string) || '—'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Button onClick={() => setUseComments(null)} color="inherit">{tr('Cancelar', 'Cancel')}</Button>
            <Button variant="contained" onClick={saveComments} disabled={!!busy || !useComments.text.trim()}>{tr('Publicar en la página', 'Publish on the page')}</Button>
          </Box>
        </Box>
      )}
      {(s.reviewedAt || s.usedOnPage) && (
        <Typography sx={{ color: A.greenText, fontSize: '0.82rem', mt: 1.25 }}>
          {s.reviewedAt && `✓ ${tr('Revisado', 'Reviewed')} ${formatDate(s.reviewedAt, lang)} · ${s.reviewedBy}${s.reviewNote ? ` — ${s.reviewNote}` : ''}`}
          {s.reviewedAt && s.usedOnPage && <br />}
          {s.usedOnPage && `✓ ${USED_LABELS[s.usedOnPage]?.[lang] ?? s.usedOnPage}`}
        </Typography>
      )}
      {busy && <Typography sx={{ color: A.muted, fontSize: '0.85rem', mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={14} /> {busy}</Typography>}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
};

/**
 * One missionary's report for one quarter: everything they sent (all versions are kept), and
 * the admin's tools: upload on their behalf, mark "no updates", review, and use it on the page.
 */
const ReportDialog: React.FC<{ entry: DirectoryEntry; quarter: Quarter; onClose: () => void }> = ({ entry: initial, quarter, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { tr, lang } = useAdminLang();
  const reports = useReports();
  const { entries, reload: reloadDirectory } = useDirectory();
  // Always the latest page, so publishing twice from reports never undoes the first change.
  const entry = entries.find((e) => e.id === initial.id) ?? initial;
  const subs = reports.submissionsFor(entry.id).filter((s) => s.quarterId === quarter.id);
  const status = reports.statusFor(entry.id, quarter);
  const [file, setFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(subs.length === 0);
  const fileRef = useRef<HTMLInputElement>(null);

  const changed = () => { reports.reload(); reloadDirectory(); };

  const submit = async (kind: 'report' | 'noUpdates') => {
    setError('');
    if (kind === 'report' && !file && !comments.trim()) {
      setError(tr('Adjunte el PDF o escriba comentarios.', 'Attach the PDF or write comments.'));
      return;
    }
    setBusy(kind === 'report' ? tr('Subiendo…', 'Uploading…') : tr('Guardando…', 'Saving…'));
    try {
      let pdfPath = '';
      if (kind === 'report' && file) {
        pdfPath = await uploadFile(file, `${reportFilesPrefix(entry.id)}/${quarter.id}-${Date.now()}-${safeName(file.name)}`, undefined,
          { customMetadata: { originalName: file.name } });
      }
      await addSubmission({
        missionaryId: entry.id, quarterId: quarter.id, kind, pdfPath, fileName: kind === 'report' ? file?.name ?? '' : '',
        comments: kind === 'report' ? comments.trim() : '', submittedBy: currentUserEmail(),
      });
      setFile(null);
      setComments('');
      setAdding(false);
      changed();
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {fullName(entry.page)}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
          <Typography sx={{ color: A.muted, fontWeight: 600 }}>
            {quarterLabel(quarter, lang)} · {tr('vence', 'due')} {formatDay(quarter.due, lang)}
          </Typography>
          <ReportStatusTag status={status} lang={lang} />
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: A.page, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {subs.length === 0 && (
          <Typography sx={{ color: A.muted }}>{tr('Todavía no hay nada para este trimestre.', 'Nothing for this quarter yet.')}</Typography>
        )}
        {subs.map((s) => <SubmissionCard key={s.id} s={s} entry={entry} onChanged={changed} />)}

        {subs.length > 0 && !adding && (
          <Button onClick={() => setAdding(true)} sx={{ alignSelf: 'flex-start' }}>
            {tr('Agregar otro informe para este trimestre', 'Add another report for this quarter')}
          </Button>
        )}
        {adding && (
          <Box sx={{ border: `1px solid ${A.line}`, borderRadius: '14px', p: 2, bgcolor: A.surface }}>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{tr('Registrar en su nombre', 'Record on their behalf')}</Typography>
            <Typography sx={{ color: A.muted, fontSize: '0.85rem', mb: 1.5 }}>
              {tr('Por ejemplo, si lo mandó por correo o WhatsApp. Los informes anteriores no se reemplazan.',
                'For example, if they sent it by email or WhatsApp. Earlier reports are never replaced.')}
            </Typography>
            <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (f.type !== 'application/pdf') { setError(tr('El informe debe ser un PDF.', 'The report must be a PDF.')); return; }
              if (f.size > REPORT_PDF_MAX_BYTES) { setError(tr(`PDF demasiado grande (${formatBytes(f.size)}). Máximo 50 MB.`, `PDF too large (${formatBytes(f.size)}). Max 50 MB.`)); return; }
              setError('');
              setFile(f);
            }} />
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()} disabled={!!busy}>
              {file ? file.name : tr('Elegir PDF', 'Choose PDF')}
            </Button>
            <TextField fullWidth multiline minRows={3} sx={{ mt: 1.5 }} label={tr('Comentarios (opcional)', 'Comments (optional)')}
              value={comments} onChange={(e) => setComments(e.target.value)} disabled={!!busy} />
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={() => submit('report')} disabled={!!busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>{tr('Guardar informe', 'Save report')}</Button>
              <Divider orientation="vertical" flexItem />
              <Button onClick={() => submit('noUpdates')} disabled={!!busy}>{tr('Marcar "sin novedades"', 'Mark "no updates"')}</Button>
            </Box>
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={!!busy} variant="contained">{tr('Listo', 'Done')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
