import React, { useEffect, useState } from 'react';
import PreviewFrame from '../../ui/PreviewFrame';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { listHistory, restoreVersion, type PageVersion } from '../../data/missionaries';
import { currentUserEmail } from '../../data/currentUser';
import { A, formatDate, useAdminLang } from '../adminUi';
import { useDirectory, type DirectoryEntry } from '../directory/directoryData';
import { FIELD_LABELS, pageChanges } from './diff';


const REASONS: Record<string, { es: string; en: string }> = {
  // Each version is the page as it was just BEFORE this happened.
  'admin-edit': { es: 'Antes de una edición del equipo', en: 'Before a staff edit' },
  'published-draft': { es: 'Antes de publicar un borrador', en: 'Before a draft was published' },
  'profile-update': { es: 'Antes de actualizar el perfil', en: 'Before a profile update' },
  'from-report': { es: 'Antes de usar un informe en la página', en: 'Before using a report on the page' },
  'approved-change': { es: 'Antes de aprobar un cambio del misionero', en: "Before approving the missionary's change" },
  restore: { es: 'Antes de restaurar otra versión', en: 'Before restoring another version' },
};

/**
 * "Historial" section of a profile: every earlier version of the page (saved automatically before
 * each change). Restoring one keeps the current version in history too, so it can be undone.
 */
const HistorySection: React.FC<{ entry: DirectoryEntry }> = ({ entry }) => {
  const { tr, lang } = useAdminLang();
  const { reload } = useDirectory();
  const [versions, setVersions] = useState<PageVersion[] | null>(null);
  const [open, setOpen] = useState<PageVersion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => listHistory(entry.id).then(setVersions).catch((err) => { setError(String(err)); setVersions([]); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [entry.id]);

  const restore = async () => {
    if (!open) return;
    setBusy(true);
    setError('');
    try {
      await restoreVersion(open, currentUserEmail());
      setOpen(null);
      await Promise.all([load(), reload()]);
    } catch (err) { setError(String(err)); } finally { setBusy(false); }
  };

  if (versions === null) return <CircularProgress size={22} />;
  return (
    <Box>
      <Typography sx={{ color: A.muted, mb: 2 }}>
        {tr('Antes de cada cambio a la página se guarda la versión anterior. Puede ver cualquiera y restaurarla.',
          'Before every change to the page, the previous version is saved. You can view any of them and restore it.')}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {versions.length === 0 && <Typography sx={{ color: A.muted }}>{tr('Todavía no hay versiones anteriores.', 'No earlier versions yet.')}</Typography>}
      {versions.map((v) => {
        const diff = pageChanges(v.page, entry.page);
        return (
          <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, mb: 1, bgcolor: A.surface, border: `1px solid ${A.line}`, borderRadius: '14px' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{formatDate(v.savedAt, lang)} · {REASONS[v.reason]?.[lang] ?? v.reason}</Typography>
              <Typography sx={{ color: A.muted, fontSize: '0.85rem' }} noWrap>
                {v.savedBy}{diff.length ? ` · ${tr('distinto en', 'differs in')}: ${diff.map((c) => FIELD_LABELS[c.field]?.[lang] ?? c.field).join(', ')}` : ` · ${tr('igual a la actual', 'same as current')}`}
              </Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => setOpen(v)}>{tr('Ver', 'View')}</Button>
          </Box>
        );
      })}

      <Dialog open={!!open} onClose={() => !busy && setOpen(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {tr('Versión del', 'Version from')} {open && formatDate(open.savedAt, lang)}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {open && (
            <Box sx={{ p: 2 }}><PreviewFrame page={open.page} lang={lang} height="66vh" /></Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Typography sx={{ flex: 1, color: A.muted, fontSize: '0.85rem' }}>
            {tr('La versión actual también se guarda, así que esto se puede deshacer.', 'The current version is saved too, so this can be undone.')}
          </Typography>
          <Button color="inherit" onClick={() => setOpen(null)} disabled={busy}>{tr('Cerrar', 'Close')}</Button>
          <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <RestoreIcon />} onClick={restore}
            disabled={busy || entry.status !== 'published'}>
            {tr('Restaurar esta versión', 'Restore this version')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistorySection;
