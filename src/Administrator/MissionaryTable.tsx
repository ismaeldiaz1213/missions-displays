import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Select, MenuItem,
  FormControl, InputLabel, Typography, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, useMediaQuery, Card, CardContent, CardActions,
  TextField, InputAdornment, Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fetchAuthSession } from 'aws-amplify/auth';
import { remove } from 'aws-amplify/storage';
import { isS3Key } from '../storageUrl';
import type { Missionary } from '../types';
import MissionaryForm from './MissionaryForm';
import outputs from '../../amplify_outputs.json';

const API_ENDPOINT = (outputs as { custom?: { API?: { endpoint?: string } } })?.custom?.API?.endpoint ?? '';

const CONTINENTS = [
  { value: 'north-america', label: 'Norte América' },
  { value: 'central-america', label: 'Centro América' },
  { value: 'south-america', label: 'Sur América' },
  { value: 'europe', label: 'Europa' },
  { value: 'africa', label: 'África' },
  { value: 'asia', label: 'Asia' },
  { value: 'oceania', label: 'Oceanía' },
];

const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#555' } },
  '& .MuiInputLabel-root': { color: '#aaa' },
};

interface Props {
  storageUsedBytes: number;
  onSaveComplete: () => void;
}

const MissionaryTable: React.FC<Props> = ({ storageUsedBytes, onSaveComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [missionaries, setMissionaries] = useState<Missionary[]>([]);
  const [continent, setContinent] = useState('north-america');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Missionary | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Missionary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const apiFetch = useCallback(async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString() ?? '';
    const res = await fetch(`${API_ENDPOINT}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    if (res.status === 204) return null;
    return res.json();
  }, []);

  const load = useCallback(async () => {
    if (!API_ENDPOINT || API_ENDPOINT === 'PLACEHOLDER') {
      setApiError('El backend aún no está configurado. Ejecuta npm run sandbox primero.');
      return;
    }
    setLoading(true);
    setApiError('');
    try {
      const data = await apiFetch(`missionaries/continent/${continent}`) as Missionary[];
      setMissionaries(data ?? []);
    } catch (err) {
      setApiError(String(err));
    } finally {
      setLoading(false);
    }
  }, [continent, apiFetch]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async (m: Missionary) => {
    setLoadingEditId(m.id);
    try {
      const full = await apiFetch(`missionaries/${m.id}`) as Missionary;
      setEditing(full);
    } catch {
      setEditing(m);
    } finally {
      setLoadingEditId(null);
      setFormOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Collect all S3 keys attached to this missionary
      const s3Keys: string[] = [
        deleteTarget.profileImage,
        deleteTarget.prayerLetter,
        ...(deleteTarget.media ?? []).map((item) => item.url),
      ].filter((p): p is string => isS3Key(p));

      // Remove S3 files first (best-effort — don't block delete if one fails)
      await Promise.allSettled(s3Keys.map((path) => remove({ path })));

      await apiFetch(`missionaries/${deleteTarget.id}`, 'DELETE');
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? missionaries.filter((m) =>
        [m.name, m.lastName, m.organization, m.location.city, m.location.country, m.missionType]
          .some((f) => f?.toLowerCase().includes(q))
      )
    : missionaries;

  const cellSx = { color: '#fff', borderColor: '#333' };
  const subCellSx = { color: '#aaa', borderColor: '#333' };
  const headerSx = { color: '#888', borderColor: '#444', fontWeight: 600 };

  return (
    <Box>
      {/* Toolbar row 1: continent + add button */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 220, ...inputSx }}>
          <InputLabel>Continente</InputLabel>
          <Select value={continent} label="Continente" onChange={(e) => { setContinent(e.target.value); setSearch(''); }}
            sx={{ color: '#fff' }}>
            {CONTINENTS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} size={isMobile ? 'large' : 'medium'}
          onClick={() => { setEditing(null); setFormOpen(true); }}
          sx={{ fontWeight: 700, py: { xs: 1.5, sm: 1 } }}>
          Añadir Misionero
        </Button>
      </Box>

      {/* Toolbar row 2: search */}
      <TextField
        placeholder="Buscar por nombre, organización, ciudad…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3, ...inputSx }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#666' }} />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch('')} sx={{ color: '#666', '&:hover': { color: '#aaa' } }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {apiError && (
        <Box sx={{ bgcolor: '#2a1a1a', border: '1px solid #5a2a2a', borderRadius: 1, p: 2, mb: 2 }}>
          <Typography color="error.main" variant="body2">{apiError}</Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : missionaries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: '#555' }}>
          {apiError ? 'Error cargando datos.' : 'No hay misioneros para este continente todavía.'}
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: '#555' }}>
          Sin resultados para "<em>{search}</em>"
        </Box>
      ) : isMobile ? (
        /* ── Mobile: card list ── */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map((m) => (
            <Card key={m.id} sx={{ bgcolor: '#141414', border: '1px solid #2a2a2a', borderRadius: 2 }}>
              <CardContent sx={{ pb: 0.5 }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                  {m.name} {m.lastName}
                </Typography>
                <Typography sx={{ color: '#aaa', fontSize: '0.85rem' }}>{m.organization}</Typography>
                {(m.location.city || m.location.country) && (
                  <Typography sx={{ color: '#666', fontSize: '0.8rem', mt: 0.25 }}>
                    📍 {[m.location.city, m.location.country].filter(Boolean).join(', ')}
                  </Typography>
                )}
                {m.missionType && (
                  <Typography sx={{ color: '#666', fontSize: '0.8rem' }}>⛪ {m.missionType}</Typography>
                )}
                <Box sx={{ mt: 0.75 }}>
                  {m.prayerLetter
                    ? <Chip icon={<CheckCircleIcon />} label="PDF subido" size="small"
                        sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', fontSize: '0.75rem' }} />
                    : <Chip label="Sin PDF" size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#666', border: '1px solid #333', fontSize: '0.75rem' }} />
                  }
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Button size="small" startIcon={loadingEditId === m.id ? <CircularProgress size={12} /> : <EditIcon />}
                  onClick={() => openEdit(m)} disabled={loadingEditId === m.id}
                  sx={{ color: '#90caf9', textTransform: 'none', fontWeight: 600 }}>
                  Editar
                </Button>
                <Button size="small" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(m)}
                  sx={{ color: '#ef5350', textTransform: 'none', fontWeight: 600 }}>
                  Eliminar
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      ) : (
        /* ── Desktop: table ── */
        <TableContainer component={Paper} sx={{ bgcolor: '#141414', border: '1px solid #2a2a2a' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Nombre</TableCell>
                <TableCell sx={headerSx}>Organización</TableCell>
                <TableCell sx={headerSx}>Ciudad</TableCell>
                <TableCell sx={headerSx}>País</TableCell>
                <TableCell sx={headerSx}>Tipo de Misión</TableCell>
                <TableCell sx={{ ...headerSx, width: 80 }}>PDF</TableCell>
                <TableCell sx={{ ...headerSx, width: 100 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} hover sx={{ '&:hover': { bgcolor: '#1f1f1f' } }}>
                  <TableCell sx={cellSx}>{m.name} {m.lastName}</TableCell>
                  <TableCell sx={subCellSx}>{m.organization}</TableCell>
                  <TableCell sx={subCellSx}>{m.location.city}</TableCell>
                  <TableCell sx={subCellSx}>{m.location.country}</TableCell>
                  <TableCell sx={subCellSx}>{m.missionType ?? '—'}</TableCell>
                  <TableCell sx={{ borderColor: '#333' }}>
                    {m.prayerLetter
                      ? <CheckCircleIcon fontSize="small" sx={{ color: '#4ade80', verticalAlign: 'middle' }} />
                      : <Typography sx={{ color: '#555', fontSize: '1rem', lineHeight: 1 }}>—</Typography>
                    }
                  </TableCell>
                  <TableCell sx={{ borderColor: '#333' }}>
                    <IconButton size="small" onClick={() => openEdit(m)} disabled={loadingEditId === m.id}
                      sx={{ color: '#90caf9', mr: 0.5 }}>
                      {loadingEditId === m.id
                        ? <CircularProgress size={14} sx={{ color: '#90caf9' }} />
                        : <EditIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(m)} sx={{ color: '#ef5350' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {formOpen && (
        <MissionaryForm
          open={formOpen}
          missionary={editing}
          defaultContinent={continent}
          storageUsedBytes={storageUsedBytes}
          onSave={() => { setFormOpen(false); setEditing(null); load(); onSaveComplete(); }}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          apiFetch={apiFetch}
        />
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#fff' } }}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar a <strong>{deleteTarget?.name} {deleteTarget?.lastName}</strong>?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: '#aaa' }}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MissionaryTable;
