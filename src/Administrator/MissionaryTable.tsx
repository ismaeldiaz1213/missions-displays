import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Select, MenuItem,
  FormControl, InputLabel, Typography, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { fetchAuthSession } from 'aws-amplify/auth';
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

const MissionaryTable: React.FC = () => {
  const [missionaries, setMissionaries] = useState<Missionary[]>([]);
  const [continent, setContinent] = useState('north-america');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Missionary | null>(null);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`missionaries/${deleteTarget.id}`, 'DELETE');
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const cellSx = { color: '#fff', borderColor: '#333' };
  const subCellSx = { color: '#aaa', borderColor: '#333' };
  const headerSx = { color: '#888', borderColor: '#444', fontWeight: 600 };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <FormControl sx={{ minWidth: 220, ...inputSx }}>
          <InputLabel>Continente</InputLabel>
          <Select value={continent} label="Continente" onChange={(e) => setContinent(e.target.value)}
            sx={{ color: '#fff' }}>
            {CONTINENTS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditing(null); setFormOpen(true); }}>
          Añadir Misionero
        </Button>
      </Box>

      {apiError && (
        <Box sx={{ bgcolor: '#2a1a1a', border: '1px solid #5a2a2a', borderRadius: 1, p: 2, mb: 2 }}>
          <Typography color="error.main" variant="body2">{apiError}</Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: '#141414', border: '1px solid #2a2a2a' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Nombre</TableCell>
                <TableCell sx={headerSx}>Organización</TableCell>
                <TableCell sx={headerSx}>Ciudad</TableCell>
                <TableCell sx={headerSx}>País</TableCell>
                <TableCell sx={headerSx}>Tipo de Misión</TableCell>
                <TableCell sx={headerSx}>Inicio</TableCell>
                <TableCell sx={{ ...headerSx, width: 100 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {missionaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ color: '#555', textAlign: 'center', py: 6, border: 'none' }}>
                    {apiError ? 'Error cargando datos.' : 'No hay misioneros para este continente todavía.'}
                  </TableCell>
                </TableRow>
              ) : missionaries.map((m) => (
                <TableRow key={m.id} hover sx={{ '&:hover': { bgcolor: '#1f1f1f' } }}>
                  <TableCell sx={cellSx}>{m.name} {m.lastName}</TableCell>
                  <TableCell sx={subCellSx}>{m.organization}</TableCell>
                  <TableCell sx={subCellSx}>{m.location.city}</TableCell>
                  <TableCell sx={subCellSx}>{m.location.country}</TableCell>
                  <TableCell sx={subCellSx}>{m.missionType}</TableCell>
                  <TableCell sx={subCellSx}>{m.startDate ?? '—'}</TableCell>
                  <TableCell sx={{ borderColor: '#333' }}>
                    <IconButton size="small" onClick={() => { setEditing(m); setFormOpen(true); }}
                      sx={{ color: '#90caf9', mr: 0.5 }}>
                      <EditIcon fontSize="small" />
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
          onSave={() => { setFormOpen(false); setEditing(null); load(); }}
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
