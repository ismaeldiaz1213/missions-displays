import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardActionArea, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TableViewIcon from '@mui/icons-material/TableView';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  CONFERENCE_MEDIA_PREFIX, deleteRegistration, listRegistrations, mediaUploadPath,
} from '../../data/registrations';
import { listFiles, listFolders, type StoredFile } from '../../data/storageFiles';
import { DetailGroup, StoredFileList } from '../shared';
import {
  CATEGORY_LABELS, REGISTRATION_LAST_DAY, canUploadMedia, formatAddress, formatConferenceDay,
  isFreeCategory, isRegistrationOpen, type Category, type Registration,
} from '../../Registration/conference';
import {
  childCount, formatArrival, formatDateShort, formatDays, formatSubmitted, fullName,
  heardAboutLabel, homeChurchLabel, infantCount, money, peopleCount, summarize, travelDetails, travelMode,
} from './registrationData';

const REGISTRATION_PATH = '/conferencia/registro';

const CATEGORY_COLORS: Record<Category, string> = {
  missionary: 'var(--ibl-success)',
  pastor: 'var(--ibl-primary)',
  evangelist: 'var(--ibl-accent)',
  layman: 'var(--ibl-text-muted)',
};

const CategoryChip: React.FC<{ category: Category }> = ({ category }) => (
  <Chip label={CATEGORY_LABELS[category] ?? category} size="small" sx={{
    fontWeight: 600, fontSize: '0.75rem',
    color: `color-mix(in srgb, ${CATEGORY_COLORS[category]} 70%, white)`,
    bgcolor: `color-mix(in srgb, ${CATEGORY_COLORS[category]} 16%, transparent)`,
    border: `1px solid color-mix(in srgb, ${CATEGORY_COLORS[category]} 40%, transparent)`,
  }} />
);

const PickupChip: React.FC = () => (
  <Chip label="Recoger" size="small" sx={{
    fontWeight: 700, fontSize: '0.72rem', color: 'var(--ibl-on-primary)', bgcolor: 'var(--ibl-primary)',
  }} />
);

const MediaChip: React.FC = () => (
  <Chip icon={<MovieOutlinedIcon />} label="Multimedia" size="small" sx={{
    mt: 0.5, fontWeight: 600, fontSize: '0.7rem', height: 22,
    color: 'var(--ibl-primary)', bgcolor: 'color-mix(in srgb, var(--ibl-primary) 14%, transparent)',
    '& .MuiChip-icon': { color: 'var(--ibl-primary)', fontSize: '0.95rem' },
  }} />
);

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
    <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
    <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.3 }}>{value}</Typography>
    {hint && <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>{hint}</Typography>}
  </Paper>
);

// ── Detail dialog ────────────────────────────────────────────────────────────

const MediaSection: React.FC<{ registrationId: string }> = ({ registrationId }) => {
  const [files, setFiles] = useState<StoredFile[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const uploadLink = `${window.location.origin}${mediaUploadPath(registrationId)}`;

  useEffect(() => {
    listFiles(`${CONFERENCE_MEDIA_PREFIX}/${registrationId}`)
      .then((f) => setFiles(f.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))))
      .catch((err) => { setError(String(err)); setFiles([]); });
  }, [registrationId]);

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ color: 'var(--ibl-primary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
        Videos
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', wordBreak: 'break-all' }}>{uploadLink}</Typography>
        <Button size="small" startIcon={<ContentCopyIcon fontSize="small" />} sx={{ textTransform: 'none' }}
          onClick={() => navigator.clipboard.writeText(uploadLink).then(() => setCopied(true)).catch(() => {})}>
          {copied ? 'Copiado' : 'Copiar enlace de subida'}
        </Button>
      </Box>
      {files === null ? <CircularProgress size={20} /> : error ? (
        <Typography color="error.main" variant="body2">{error}</Typography>
      ) : files.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Todavía no ha subido archivos.</Typography>
      ) : (
        <StoredFileList files={files} />
      )}
    </Box>
  );
};

const RegistrationDetail: React.FC<{ r: Registration; onClose: () => void; fullScreen: boolean }> = ({ r, onClose, fullScreen }) => (
  <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Box component="span" sx={{ fontWeight: 800 }}>{fullName(r.registrant)}</Box>
      <CategoryChip category={r.category} />
      {r.travel.needsPickup && <PickupChip />}
    </DialogTitle>
    <DialogContent dividers>
      <DetailGroup title="Registrante" rows={[
        ['Correo', r.registrant.email],
        ['Teléfono', r.registrant.phone],
        ['Dirección', formatAddress(r.registrant.address)],
        ['Iglesia local', homeChurchLabel(r)],
        ['Junta misionera', r.missionaryBoard],
        ['Iglesia enviadora', r.sendingChurch],
        ['Registrado', formatSubmitted(r.createdAt)],
      ]} />
      {r.bringingWife && r.wife && (
        <DetailGroup title="Esposa" rows={[
          ['Nombre', fullName(r.wife)],
          ['Correo', r.wife.email],
          ['Teléfono', r.wife.phone],
        ]} />
      )}
      {r.bringingChildren && r.children && (
        <DetailGroup title="Niños" rows={[
          ['Cantidad', String(r.children.count)],
          ['Bebés (0–2)', String(r.children.infants)],
          ['Edades', r.children.ages],
          ['Necesidades', r.children.notes],
        ]} />
      )}
      <DetailGroup title="Asistencia y hotel" rows={[
        ['Días', r.attendanceDays.map((d) => formatConferenceDay(d, { weekday: 'long', day: 'numeric', month: 'long' })).join('\n')],
        ['Personas', `${peopleCount(r)} (${r.bringingWife ? 2 : 1} adulto${r.bringingWife ? 's' : ''}, ${childCount(r)} niño${childCount(r) === 1 ? '' : 's'})`],
        ['Hotel estimado', isFreeCategory(r.category) ? `Sin costo (${CATEGORY_LABELS[r.category].toLowerCase()})` : money(r.hotelFee ?? 0)],
      ]} />
      <DetailGroup title="Viaje" rows={[
        ['Llegada', travelMode(r)],
        ['Detalles', travelDetails(r)],
        ['Fecha/hora', formatArrival(r)],
        ['Salida', formatDateShort(r.travel.departureDate)],
        ['Notas', r.travel.notes],
      ]} />
      <DetailGroup title="Otros" rows={[
        ['Cómo se enteró', heardAboutLabel(r)],
        ['Comentarios', r.specialNeeds],
      ]} />
      {canUploadMedia(r.category) && <MediaSection registrationId={r.id} />}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cerrar</Button>
    </DialogActions>
  </Dialog>
);

// ── Tab ──────────────────────────────────────────────────────────────────────

const RegistrationTable: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [viewing, setViewing] = useState<Registration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [withMedia, setWithMedia] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = await listRegistrations();
      setRegistrations(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      // Which registrations have uploaded media (one folder per registration id)
      listFolders(CONFERENCE_MEDIA_PREFIX).then((ids) => setWithMedia(new Set(ids))).catch(console.error);
    } catch (err) {
      setApiError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((r) =>
      (category === 'all' || r.category === category) &&
      (!q || [fullName(r.registrant), fullName(r.wife), r.registrant.email, r.registrant.phone, r.homeChurch, r.homeChurchCity, r.missionaryBoard, r.sendingChurch, r.travel.flightNumber]
        .some((f) => f?.toLowerCase().includes(q))),
    );
  }, [registrations, search, category]);

  const stats = useMemo(() => summarize(filtered), [filtered]);
  const open = isRegistrationOpen();
  const isFiltered = category !== 'all' || !!search.trim();

  const runExport = async (kind: 'excel' | 'pdf') => {
    setExporting(kind);
    try {
      const mod = await import('./exportRegistrations');
      await (kind === 'excel' ? mod.exportRegistrationsExcel : mod.exportRegistrationsPdf)(filtered);
    } catch (err) {
      console.error(err);
      setApiError(`Error al exportar: ${String(err)}`);
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRegistration(deleteTarget.id);
      setRegistrations((rs) => rs.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setApiError(String(err));
    } finally {
      setDeleting(false);
    }
  };

  const headerSx = { color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' };
  const exportLabel = isFiltered ? ` (${filtered.length})` : '';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Registros de la conferencia</Typography>
            <Chip size="small" label={open ? 'Abierto' : 'Cerrado'} sx={{
              fontWeight: 700,
              color: open ? 'var(--ibl-success)' : 'text.secondary',
              bgcolor: open ? 'color-mix(in srgb, var(--ibl-success) 15%, transparent)' : 'action.hover',
            }} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Fecha límite: {formatConferenceDay(REGISTRATION_LAST_DAY, { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
            <Box component="a" href={REGISTRATION_PATH} target="_blank" rel="noopener noreferrer"
              sx={{ color: 'var(--ibl-primary)', display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              {REGISTRATION_PATH}<OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
            </Box>
          </Typography>
        </Box>
        <Tooltip title="Actualizar">
          <span>
            <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
          </span>
        </Tooltip>
        <Button variant="outlined" onClick={() => runExport('excel')} disabled={!!exporting || filtered.length === 0}
          startIcon={exporting === 'excel' ? <CircularProgress size={16} /> : <TableViewIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}>
          Excel{exportLabel}
        </Button>
        <Button variant="outlined" onClick={() => runExport('pdf')} disabled={!!exporting || filtered.length === 0}
          startIcon={exporting === 'pdf' ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}>
          PDF{exportLabel}
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        <Stat label="Registros" value={stats.registrations}
          hint={(Object.keys(CATEGORY_LABELS) as Category[]).filter((k) => stats.byCategory[k]).map((k) => `${stats.byCategory[k]} ${CATEGORY_LABELS[k].toLowerCase()}`).join(' · ') || undefined} />
        <Stat label="Personas" value={stats.people} hint={`${stats.adults} adultos · ${stats.children} niños${stats.infants ? ` (${stats.infants} bebés)` : ''}`} />
        <Stat label="Necesitan recogida" value={stats.pickups} hint={stats.rvs ? `${stats.rvs} llegan en RV` : undefined} />
        <Stat label="Hotel estimado" value={money(stats.hotelTotal)} hint="No se ha cobrado" />
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 2.5 }}>
        <TextField placeholder="Buscar por nombre, correo, teléfono, iglesia…" value={search} onChange={(e) => setSearch(e.target.value)}
          size="small" fullWidth
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            },
          }} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Categoría</InputLabel>
          <Select value={category} label="Categoría" onChange={(e) => setCategory(e.target.value as Category | 'all')}>
            <MenuItem value="all">Todas</MenuItem>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((k) => <MenuItem key={k} value={k}>{CATEGORY_LABELS[k]}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {apiError && (
        <Box sx={{ bgcolor: 'color-mix(in srgb, var(--ibl-danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--ibl-danger) 35%, transparent)', borderRadius: 1, p: 2, mb: 2 }}>
          <Typography color="error.main" variant="body2">{apiError}</Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : registrations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          {apiError ? 'Error cargando datos.' : 'Todavía no hay registros.'}
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>Sin resultados.</Box>
      ) : isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map((r) => (
            <Card key={r.id} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <CardActionArea onClick={() => setViewing(r)} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, flex: 1 }}>{fullName(r.registrant)}</Typography>
                  {withMedia.has(r.id) && <MediaChip />}
                  <CategoryChip category={r.category} />
                </Box>
                <Typography variant="body2" color="text.secondary">{homeChurchLabel(r)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  👥 {peopleCount(r)} · 🗓 {formatDays(r.attendanceDays)} · {travelMode(r)} · {formatArrival(r)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{isFreeCategory(r.category) ? 'Sin costo' : money(r.hotelFee ?? 0)}</Typography>
                  {r.travel.needsPickup && <PickupChip />}
                </Box>
              </CardActionArea>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pb: 1 }}>
                <Button size="small" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(r)} sx={{ color: 'error.main', textTransform: 'none' }}>
                  Eliminar
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Nombre</TableCell>
                <TableCell sx={headerSx}>Categoría</TableCell>
                <TableCell sx={headerSx}>Iglesia</TableCell>
                <TableCell sx={headerSx}>Contacto</TableCell>
                <TableCell sx={headerSx} align="center">Personas</TableCell>
                <TableCell sx={headerSx}>Días</TableCell>
                <TableCell sx={headerSx}>Llegada</TableCell>
                <TableCell sx={headerSx} align="right">Hotel</TableCell>
                <TableCell sx={{ ...headerSx, width: 96 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} hover onClick={() => setViewing(r)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{fullName(r.registrant)}</Typography>
                    {r.bringingWife && <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>+ {fullName(r.wife)}</Typography>}
                    {withMedia.has(r.id) && <MediaChip />}
                  </TableCell>
                  <TableCell><CategoryChip category={r.category} /></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{homeChurchLabel(r)}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    <div>{r.registrant.phone}</div>
                    <div>{r.registrant.email}</div>
                  </TableCell>
                  <TableCell align="center">
                    {peopleCount(r)}
                    {childCount(r) > 0 && (
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                        {childCount(r)} niño{childCount(r) > 1 ? 's' : ''}{infantCount(r) ? ` · ${infantCount(r)} bebé` : ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDays(r.attendanceDays)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem' }}>{travelMode(r)} · {formatArrival(r)}</Typography>
                        {travelDetails(r) && <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{travelDetails(r)}</Typography>}
                      </Box>
                      {r.travel.needsPickup && <PickupChip />}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {isFreeCategory(r.category) ? <Typography sx={{ color: 'var(--ibl-success)', fontSize: '0.85rem' }}>Sin costo</Typography> : money(r.hotelFee ?? 0)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" onClick={() => setViewing(r)} sx={{ color: 'var(--ibl-primary)' }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {viewing && <RegistrationDetail r={viewing} onClose={() => setViewing(null)} fullScreen={isMobile} />}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el registro de <strong>{fullName(deleteTarget?.registrant)}</strong>? Esta acción no se puede deshacer.
            {deleteTarget && withMedia.has(deleteTarget.id) && ' Los videos y fotos que subió se conservarán en el almacenamiento.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegistrationTable;
