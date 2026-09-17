import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, CardActionArea, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import {
  approveMissionaryRequest, deleteMissionaryRequest, listMissionaryRequests, listRequestFiles, setRequestStatus,
  type MissionaryRequest, type RequestFileKind, type RequestStatus,
} from '../../data/missionaryRequests';
import type { StoredFile } from '../../data/storageFiles';
import { DetailGroup, StoredFileList } from '../shared';

export const REQUEST_FORM_PATH = '/misioneros/solicitud';

const CONTINENT_LABELS: Record<string, string> = {
  'north-america': 'Norte América',
  'central-america': 'Centro América',
  'south-america': 'Sur América',
  europe: 'Europa',
  africa: 'África',
  asia: 'Asia',
  oceania: 'Oceanía',
};

const STATUS: Record<RequestStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'var(--ibl-accent)' },
  approved: { label: 'Aprobada', color: 'var(--ibl-success)' },
  rejected: { label: 'Rechazada', color: 'var(--ibl-danger)' },
};

const FILE_GROUPS: [RequestFileKind, string][] = [
  ['profile', 'Foto de perfil'],
  ['prayer-letter', 'Carta de oración'],
  ['gallery', 'Galería'],
];

const StatusChip: React.FC<{ status: RequestStatus }> = ({ status }) => (
  <Chip label={STATUS[status].label} size="small" sx={{
    fontWeight: 600, fontSize: '0.75rem',
    color: `color-mix(in srgb, ${STATUS[status].color} 70%, white)`,
    bgcolor: `color-mix(in srgb, ${STATUS[status].color} 16%, transparent)`,
    border: `1px solid color-mix(in srgb, ${STATUS[status].color} 40%, transparent)`,
  }} />
);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fullName = (r: MissionaryRequest) => [r.name, r.lastName].filter(Boolean).join(' ');

// ── Detail dialog ────────────────────────────────────────────────────────────

const RequestDetail: React.FC<{
  r: MissionaryRequest;
  fullScreen: boolean;
  onClose: () => void;
  onChanged: () => void;
  onDelete: () => void;
}> = ({ r, fullScreen, onClose, onChanged, onDelete }) => {
  const [, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<Record<RequestFileKind, StoredFile[]> | null>(null);
  const [filesError, setFilesError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listRequestFiles(r.id).then(setFiles).catch((err) => { setFilesError(String(err)); });
  }, [r.id]);

  const openDraft = (draftId: string) =>
    setSearchParams({ tab: 'misioneros', continent: r.continent, draft: draftId });

  const approve = async () => {
    setError('');
    try {
      const draft = await approveMissionaryRequest(r, setBusy);
      onChanged();
      openDraft(draft.id);
    } catch (err) {
      console.error(err);
      setError(`No se pudo aprobar: ${String(err)}`);
    } finally {
      setBusy('');
    }
  };

  const reject = async () => {
    setBusy('Guardando…');
    try {
      await setRequestStatus(r.id, r.status === 'rejected' ? 'pending' : 'rejected');
      onChanged();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy('');
    }
  };

  const contact = r.contact ?? {};

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontWeight: 800 }}>{fullName(r)}</Box>
        <StatusChip status={r.status} />
      </DialogTitle>
      <DialogContent dividers>
        <DetailGroup title="Contacto (privado)" rows={[
          ['Correo', r.email],
          ['Teléfono', r.phone],
          ['Esposa', r.wifeName],
          ['Idioma', r.language === 'en' ? 'Inglés' : 'Español'],
          ['Enviada', formatDate(r.createdAt)],
        ]} />
        <DetailGroup title="Ministerio" rows={[
          ['Junta / Organización', r.organization],
          ['Iglesia enviadora', r.sendingChurch],
          ['Tipo de ministerio', r.missionType],
          ['Inicio en el campo', r.startYear],
          ['Continente', CONTINENT_LABELS[r.continent] ?? r.continent],
          ['Ubicación', [r.city, r.state, r.country].filter(Boolean).join(', ')],
        ]} />
        <DetailGroup title="Para la página" rows={[
          ['Descripción', r.description],
          ['Peticiones de oración', r.prayerRequests],
        ]} />
        <DetailGroup title="Contacto público" rows={[
          ['Correo', contact.email],
          ['Teléfono', contact.phone],
          ['Sitio web', contact.website],
          ['Facebook', contact.facebook],
          ['Instagram', contact.instagram],
        ]} />

        <Typography sx={{ color: 'var(--ibl-primary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          Archivos
        </Typography>
        {filesError ? <Typography color="error.main" variant="body2">{filesError}</Typography>
          : files === null ? <CircularProgress size={20} />
            : FILE_GROUPS.every(([k]) => files[k].length === 0) ? (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>No subió archivos.</Typography>
            ) : FILE_GROUPS.filter(([k]) => files[k].length > 0).map(([k, label]) => (
              <Box key={k} sx={{ mb: 2 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 0.75 }}>{label}</Typography>
                <StoredFileList files={files[k]} />
              </Box>
            ))}

        {r.status === 'approved' && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: 'color-mix(in srgb, var(--ibl-success) 12%, transparent)' }}>
            <Typography sx={{ fontSize: '0.9rem' }}>
              Aprobada. Se creó un borrador en <strong>{CONTINENT_LABELS[r.continent]}</strong>. Si ya lo publicaste, aparece como misionero normal.
            </Typography>
          </Box>
        )}
        {busy && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: '0.9rem' }}>{busy}</Typography>
          </Box>
        )}
        {error && <Typography color="error.main" variant="body2" sx={{ mt: 2 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, p: 2 }}>
        <Button onClick={onDelete} disabled={!!busy} startIcon={<DeleteIcon />} sx={{ color: 'error.main', textTransform: 'none', mr: 'auto' }}>
          Eliminar
        </Button>
        <Button onClick={onClose} disabled={!!busy} sx={{ textTransform: 'none' }}>Cerrar</Button>
        {r.status !== 'approved' && (
          <Button onClick={reject} disabled={!!busy} variant="outlined" color={r.status === 'rejected' ? 'inherit' : 'error'} sx={{ textTransform: 'none' }}>
            {r.status === 'rejected' ? 'Marcar pendiente' : 'Rechazar'}
          </Button>
        )}
        {r.status === 'approved' && r.draftId ? (
          <Button onClick={() => openDraft(r.draftId!)} variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Abrir borrador
          </Button>
        ) : (
          <Tooltip title="Crea una página oculta (borrador) en el continente. Luego la revisas y la publicas.">
            <span>
              <Button onClick={approve} disabled={!!busy} variant="contained" color="success" startIcon={<CheckIcon />} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Aprobar y crear borrador
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Tab ──────────────────────────────────────────────────────────────────────

const RequestTable: React.FC<{ onPendingCount?: (n: number) => void }> = ({ onPendingCount }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [requests, setRequests] = useState<MissionaryRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [viewing, setViewing] = useState<MissionaryRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MissionaryRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const formLink = `${window.location.origin}${REQUEST_FORM_PATH}`;

  const load = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = (await listMissionaryRequests()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRequests(data);
      setViewing((v) => (v ? data.find((r) => r.id === v.id) ?? null : null));
      onPendingCount?.(data.filter((r) => r.status === 'pending').length);
    } catch (err) {
      setApiError(String(err));
    } finally {
      setLoading(false);
    }
  }, [onPendingCount]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => requests.filter((r) => filter === 'all' || r.status === filter), [requests, filter]);
  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMissionaryRequest(deleteTarget.id);
      setDeleteTarget(null);
      setViewing(null);
      load();
    } catch (err) {
      setApiError(String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: { md: 'center' }, mb: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Solicitudes de misioneros</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', wordBreak: 'break-all' }}>{formLink}</Typography>
            <IconButton size="small" title="Copiar enlace del formulario"
              onClick={() => navigator.clipboard.writeText(formLink).then(() => setCopied(true)).catch(() => {})}>
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
        <ToggleButtonGroup value={filter} exclusive size="small" onChange={(_, v) => v && setFilter(v)}>
          <ToggleButton value="pending" sx={{ textTransform: 'none' }}>Pendientes ({counts.pending})</ToggleButton>
          <ToggleButton value="approved" sx={{ textTransform: 'none' }}>Aprobadas ({counts.approved})</ToggleButton>
          <ToggleButton value="rejected" sx={{ textTransform: 'none' }}>Rechazadas ({counts.rejected})</ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: 'none' }}>Todas</ToggleButton>
        </ToggleButtonGroup>
        <IconButton onClick={load} disabled={loading} title="Actualizar"><RefreshIcon /></IconButton>
      </Box>

      {apiError && (
        <Box sx={{ bgcolor: '#2a1a1a', border: '1px solid #5a2a2a', borderRadius: 1, p: 2, mb: 2 }}>
          <Typography color="error.main" variant="body2">{apiError}</Typography>
        </Box>
      )}

      {loading && requests.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          {filter === 'pending' ? 'No hay solicitudes pendientes.' : 'No hay solicitudes.'}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          {filtered.map((r) => (
            <Card key={r.id} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <CardActionArea onClick={() => setViewing(r)} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>{fullName(r)}</Typography>
                  <StatusChip status={r.status} />
                </Box>
                <Typography variant="body2" color="text.secondary" noWrap>{r.organization}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  📍 {[r.city, r.country].filter(Boolean).join(', ')} · {CONTINENT_LABELS[r.continent] ?? r.continent}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.75 }}>Enviada {formatDate(r.createdAt)}</Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      {viewing && (
        <RequestDetail r={viewing} fullScreen={isMobile} onClose={() => setViewing(null)} onChanged={load}
          onDelete={() => setDeleteTarget(viewing)} />
      )}

      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>¿Eliminar solicitud?</DialogTitle>
        <DialogContent>
          <Typography>
            Se eliminará la solicitud de <strong>{deleteTarget && fullName(deleteTarget)}</strong> y los archivos que subió.
            {deleteTarget?.status === 'approved' && ' El borrador o la página ya creada no se verán afectados.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestTable;
