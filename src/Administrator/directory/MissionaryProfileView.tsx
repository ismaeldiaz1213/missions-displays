import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Drawer, IconButton, Tab, Tabs, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import { resolveUrl, isVideoPath } from '../../storageUrl';
import { archiveMissionary, restoreMissionary } from '../../data/missionaries';
import { CONTACT_METHOD_LABELS, MISSING_LABELS } from '../../data/missionaryProfiles';
import { currentUserEmail } from '../../data/currentUser';
import { DetailGroup } from '../shared';
import { BRAND } from '../../ui/brand';
import { formatDate, useAdminLang } from '../adminUi';
import { fullName, type DirectoryEntry } from './directoryData';
import { CONTINENT_LABELS } from './exportMissionaries';
import StatusTags from './StatusTags';

const MissionaryPage = lazy(() => import('../../Missionaries/Missionary'));

export interface ProfileSection {
  key: string;
  label: string;
  render: (entry: DirectoryEntry) => React.ReactNode;
}

const Summary: React.FC<{ entry: DirectoryEntry; onCompleteProfile: () => void }> = ({ entry, onCompleteProfile }) => {
  const { tr, lang } = useAdminLang();
  const { page: m, profile: p } = entry;
  const contacts = m.contactInfo ?? [];
  const photos = m.media?.filter((x) => !isVideoPath(x.url)).length ?? 0;
  const videos = (m.media?.length ?? 0) - photos;
  const method = p?.preferredContact ? CONTACT_METHOD_LABELS[p.preferredContact][lang] : '';

  return (
    <Box>
      {entry.missing.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2.5 }} action={
          <Button color="inherit" size="small" onClick={onCompleteProfile} sx={{ fontWeight: 800 }}>{tr('Completar', 'Complete')}</Button>
        }>
          {tr('Perfil básico. Falta: ', 'Basic profile. Missing: ')}{entry.missing.map((f) => MISSING_LABELS[f][lang]).join(', ')}
        </Alert>
      )}
      {!entry.email && (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          {tr('No tenemos correo de este misionero: comuníquese por ', 'We have no email for this missionary: reach them by ')}
          <strong>{method || entry.phone || tr('otro medio', 'another way')}</strong>{entry.phone ? ` · ${entry.phone}` : ''}.
        </Alert>
      )}
      <DetailGroup title={tr('Contacto privado', 'Private contact')} rows={[
        [tr('Correo', 'Email'), p?.email ?? ''],
        [tr('Teléfono / WhatsApp', 'Phone / WhatsApp'), p?.phone ?? ''],
        [tr('Prefiere', 'Prefers'), method + (p?.preferredContactNote ? ` · ${p.preferredContactNote}` : '')],
        [tr('Idioma', 'Language'), p ? (p.language === 'en' ? 'English' : 'Español') : ''],
      ]} />
      <DetailGroup title={tr('Familia y ministerio', 'Family and ministry')} rows={[
        [tr('Esposa', 'Wife'), p?.spouseName ?? ''],
        [tr('Organización', 'Organization'), m.organization],
        [tr('Iglesia que envía', 'Sending church'), p?.sendingChurch ?? ''],
        [tr('Tipo de misión', 'Mission type'), m.missionType],
        [tr('En la misión desde', 'On the field since'), m.startDate ?? ''],
      ]} />
      <DetailGroup title={tr('Ubicación', 'Location')} rows={[
        [tr('Ciudad', 'City'), [m.location?.city, m.location?.state].filter(Boolean).join(', ')],
        [tr('País', 'Country'), m.location?.country ?? ''],
        [tr('Continente', 'Continent'), CONTINENT_LABELS[m.continent] ?? m.continent],
        [tr('Mapa', 'Map'), m.location && (m.location.latitude || m.location.longitude) ? `${m.location.latitude}, ${m.location.longitude}` : ''],
      ]} />
      <DetailGroup title={tr('En su página pública', 'On their public page')} rows={[
        ...contacts.map((c, i) => [`${c.type}${contacts.filter((x) => x.type === c.type).length > 1 ? ` ${i + 1}` : ''}`, c.value] as [string, string]),
        [tr('Descripción', 'Description'), m.description],
        [tr('Peticiones / notas', 'Prayer requests / notes'), m.specialNotes ?? ''],
        [tr('Archivos', 'Files'), [
          m.profileImage ? tr('foto de perfil', 'profile photo') : '',
          m.prayerLetter ? tr('carta de oración', 'prayer letter') : '',
          photos ? `${photos} ${tr('fotos', 'photos')}` : '',
          videos ? `${videos} videos` : '',
        ].filter(Boolean).join(' · ')],
      ]} />
      <DetailGroup title={tr('Notas internas', 'Internal notes')} rows={[[tr('Notas', 'Notes'), p?.notes ?? '']]} />
      <DetailGroup title={tr('Registro', 'Record')} rows={[
        [tr('Perfil creado', 'Profile created'), p?.createdAt ? formatDate(p.createdAt, lang) : ''],
        [tr('Última actualización', 'Last update'), p?.updatedAt ? `${formatDate(p.updatedAt, lang)}${p.updatedBy ? ` · ${p.updatedBy}` : ''}` : ''],
        [tr('Archivado', 'Archived'), entry.archive ? `${formatDate(entry.archive.archivedAt, lang)} · ${entry.archive.archivedBy}` : ''],
      ]} />
    </Box>
  );
};

/**
 * Everything about one missionary in a side panel: summary, page preview, and (in later
 * sections) reports, emails and history.
 */
const MissionaryProfileView: React.FC<{
  entry: DirectoryEntry;
  extraSections?: ProfileSection[];
  initialSection?: string;
  onClose: () => void;
  onEditPage: () => void;
  onCompleteProfile: () => void;
  onChanged: () => void;
}> = ({ entry, extraSections = [], initialSection, onClose, onEditPage, onCompleteProfile, onChanged }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { tr } = useAdminLang();
  const [section, setSection] = useState(initialSection ?? 'summary');
  const [photo, setPhoto] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const m = entry.page;

  useEffect(() => { resolveUrl(m.profileImage, '').then(setPhoto); }, [m.profileImage]);

  const archive = async () => {
    setBusy(true);
    setError('');
    try {
      await archiveMissionary(m, entry.status === 'draft', currentUserEmail());
      setConfirmArchive(false);
      onChanged();
    } catch (err) { setError(String(err)); } finally { setBusy(false); }
  };

  const restore = async () => {
    if (!entry.archive) return;
    setBusy(true);
    setError('');
    try {
      await restoreMissionary(entry.archive);
      onChanged();
    } catch (err) { setError(String(err)); } finally { setBusy(false); }
  };

  const sections: ProfileSection[] = [
    { key: 'summary', label: tr('Resumen', 'Summary'), render: () => <Summary entry={entry} onCompleteProfile={onCompleteProfile} /> },
    ...extraSections,
    {
      key: 'preview', label: tr('Vista previa', 'Preview'), render: () => (
        <Box sx={{ border: `1px solid ${BRAND.line}`, borderRadius: '16px', overflow: 'hidden', height: { xs: '70vh', md: '74vh' }, overflowY: 'auto', position: 'relative', transform: 'translateZ(0)' }}>
          <Suspense fallback={<Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>}>
            <MissionaryPage preview={m} />
          </Suspense>
        </Box>
      ),
    },
  ];
  const current = sections.find((s) => s.key === section) ?? sections[0];

  return (
    <Drawer anchor="right" open onClose={onClose} PaperProps={{ sx: { width: fullScreen ? '100%' : 'min(980px, 92vw)', bgcolor: BRAND.page } }}>
      <Box sx={{ bgcolor: BRAND.white, borderBottom: `1px solid ${BRAND.line}`, px: { xs: 2, sm: 3 }, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={photo || undefined} sx={{ width: 64, height: 64, bgcolor: BRAND.blueSoft, color: BRAND.navy, fontWeight: 800, fontSize: '1.4rem' }}>
            {m.name?.[0]}{m.lastName?.[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', sm: '1.45rem' }, color: BRAND.ink, lineHeight: 1.2 }}>{fullName(m)}</Typography>
            <Typography sx={{ color: BRAND.muted, fontWeight: 600 }}>
              {[m.location?.city, m.location?.country].filter(Boolean).join(', ')}{m.organization ? ` · ${m.organization}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}><StatusTags entry={entry} /></Box>
          </Box>
          <IconButton onClick={onClose} aria-label={tr('Cerrar', 'Close')}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          {entry.status !== 'archived' && (
            <Button variant="contained" startIcon={<EditIcon />} onClick={onEditPage}>
              {entry.status === 'draft' ? tr('Editar y publicar', 'Edit and publish') : tr('Editar página', 'Edit page')}
            </Button>
          )}
          <Button variant={entry.complete ? 'outlined' : 'contained'} color={entry.complete ? 'primary' : 'warning'} startIcon={<BadgeOutlinedIcon />} onClick={onCompleteProfile}>
            {entry.complete ? tr('Editar datos privados', 'Edit private details') : tr('Completar perfil', 'Complete profile')}
          </Button>
          {entry.status === 'published' && (
            <Button variant="outlined" startIcon={<OpenInNewIcon />} href={`/misionero/${m.id}`} target="_blank" rel="noopener">
              {tr('Ver en el sitio', 'View on site')}
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          {entry.status === 'archived' ? (
            <Button color="primary" startIcon={busy ? <CircularProgress size={16} /> : <UnarchiveOutlinedIcon />} onClick={restore} disabled={busy}>
              {tr('Restaurar', 'Restore')}
            </Button>
          ) : (
            <Button color="inherit" startIcon={<Inventory2OutlinedIcon />} onClick={() => setConfirmArchive(true)} sx={{ color: BRAND.muted }}>
              {tr('Archivar', 'Archive')}
            </Button>
          )}
        </Box>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        <Tabs value={current.key} onChange={(_, v) => setSection(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mt: 1 }}>
          {sections.map((s) => <Tab key={s.key} value={s.key} label={s.label} />)}
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto', flex: 1 }}>
        {current.render(entry)}
      </Box>

      <Dialog open={confirmArchive} onClose={() => !busy && setConfirmArchive(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{tr('¿Archivar a ', 'Archive ')}{fullName(m)}?</DialogTitle>
        <DialogContent>
          <Typography>
            {tr('Su página se quita del sitio y de las pantallas. No se borra nada: la información, los archivos y los informes se guardan y puede restaurarlo cuando quiera.',
              'Their page is taken off the site and the screens. Nothing is deleted: details, files and reports are kept and you can restore it any time.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmArchive(false)} color="inherit" disabled={busy}>{tr('Cancelar', 'Cancel')}</Button>
          <Button variant="contained" onClick={archive} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
            {tr('Archivar', 'Archive')}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default MissionaryProfileView;
