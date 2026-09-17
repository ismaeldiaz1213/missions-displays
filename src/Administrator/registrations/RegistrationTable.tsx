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
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  CONFERENCE_MEDIA_PREFIX, deleteRegistration, listRegistrations, mediaUploadPath,
} from '../../data/registrations';
import { listFiles, listFolders, type StoredFile } from '../../data/storageFiles';
import { formatBytes } from '../formatBytes';
import {
  CATEGORY_LABELS, REGISTRATION_LAST_DAY, TRANSPORT_LABELS, formatAddress, formatConferenceDay,
  isRegistrationOpen, type Category, type Registration,
} from '../../Registration/conference';
import {
  childCount, formatArrival, formatDateShort, formatDays, formatSubmitted, fullName,
  infantCount, money, peopleCount, summarize, travelDetails,
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

const DetailGroup: React.FC<{ title: string; rows: [string, React.ReactNode][] }> = ({ title, rows }) => {
  const visible = rows.filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (visible.length === 0) return null;
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ color: 'var(--ibl-primary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' }, columnGap: 2, rowGap: { xs: 0, sm: 0.75 } }}>
        {visible.map(([k, v]) => (
          <React.Fragment key={k}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: { xs: 1, sm: 0 } }}>{k}</Typography>
            <Typography component="div" sx={{ color: 'text.primary', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</Typography>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

const MediaSection: React.FC<{ registrationId: string }> = ({ registrationId }) => {
  const [files, setFiles] = useState<StoredFile[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const uploadLink = `${window.location.origin}${mediaUploadPath(registrationId)}`;

  useEffect(() => {
    listFiles(`${CONFERENCE_MEDIA_PREFIX}/${registrationId}`)
      .then((f) => setFiles(f.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))))
      .catch((err) => { setError(String(err)); setFiles([]); });
  }, [registrationId]);

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ color: 'var(--ibl-primary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
        Videos y fotos
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {files.map((f) => {
            const isVideo = f.contentType.startsWith('video/');
            return (
              <Paper key={f.path} elevation={0} sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {isVideo ? <MovieOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} /> : <ImageOutlinedIcon sx={{ color: 'var(--ibl-primary)' }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{formatBytes(f.size)} · {formatSubmitted(f.uploadedAt)}</Typography>
                  </Box>
                  <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setPlaying(playing === f.path ? null : f.path)}>
                    {playing === f.path ? 'Ocultar' : 'Ver'}
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<DownloadIcon />} href={f.url} sx={{ textTransform: 'none' }}>
                    Descargar
                  </Button>
                </Box>
                {playing === f.path && (
                  <Box sx={{ mt: 1.25 }}>
                    {isVideo
                      ? <video src={f.url} controls style={{ width: '100%', maxHeight: 420, borderRadius: 8, background: '#000' }} />
                      : <img src={f.url} alt={f.originalName} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 8 }} />}
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
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
        ['Iglesia', r.registrant.church],
        ['Dirección', formatAddress(r.registrant.address)],
        ['Junta misionera', r.missionaryBoard],
        ['Iglesia enviadora', r.sendingChurch],
        ['Registrado', formatSubmitted(r.createdAt)],
      ]} />
      {r.bringingSpouse && r.spouse && (
        <DetailGroup title="Cónyuge" rows={[
          ['Nombre', fullName(r.spouse)],
          ['Correo', r.spouse.email],
          ['Teléfono', r.spouse.phone],
          ['Iglesia', r.spouse.church],
          ['Dirección', r.spouse.sameAddress ? 'Misma que el registrante' : formatAddress(r.spouse.address)],
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
        ['Personas', `${peopleCount(r)} (${r.bringingSpouse ? 2 : 1} adulto${r.bringingSpouse ? 's' : ''}, ${childCount(r)} niño${childCount(r) === 1 ? '' : 's'})`],
        ['Hotel estimado', r.category === 'missionary' ? 'Sin costo (misionero)' : money(r.hotelFee ?? 0)],
      ]} />
      <DetailGroup title="Viaje" rows={[
        ['Transporte', TRANSPORT_LABELS[r.travel.transport]],
        ['Llegada', formatArrival(r)],
        ['Salida', formatDateShort(r.travel.departureDate)],
        ['Detalles', travelDetails(r)],
        ['Recoger', r.travel.transport === 'car' ? '' : r.travel.needsPickup ? 'Sí' : 'No'],
        ['Notas', r.travel.notes],
      ]} />
      <DetailGroup title="Comentarios" rows={[['Comentarios', r.specialNeeds]]} />
      {r.category === 'missionary' && <MediaSection registrationId={r.id} />}
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
      (!q || [fullName(r.registrant), fullName(r.spouse), r.registrant.email, r.registrant.phone, r.registrant.church, r.missionaryBoard, r.sendingChurch]
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
        <Stat label="Necesitan recogida" value={stats.pickups} />
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
                <Typography variant="body2" color="text.secondary">{r.registrant.church}</Typography>
                <Typography variant="body2" color="text.secondary">
                  👥 {peopleCount(r)} · 🗓 {formatDays(r.attendanceDays)} · {TRANSPORT_LABELS[r.travel.transport]} {formatArrival(r)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{r.category === 'missionary' ? 'Sin costo' : money(r.hotelFee ?? 0)}</Typography>
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
                    {r.bringingSpouse && <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>+ {fullName(r.spouse)}</Typography>}
                    {withMedia.has(r.id) && <MediaChip />}
                  </TableCell>
                  <TableCell><CategoryChip category={r.category} /></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{r.registrant.church}</TableCell>
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
                        <Typography sx={{ fontSize: '0.85rem' }}>{TRANSPORT_LABELS[r.travel.transport]} · {formatArrival(r)}</Typography>
                        {travelDetails(r) && <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{travelDetails(r)}</Typography>}
                      </Box>
                      {r.travel.needsPickup && <PickupChip />}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {r.category === 'missionary' ? <Typography sx={{ color: 'var(--ibl-success)', fontSize: '0.85rem' }}>Sin costo</Typography> : money(r.hotelFee ?? 0)}
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
