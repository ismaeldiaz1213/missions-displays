import React, { useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { HOTEL_COLORS, saveHotels, type Hotel, type HotelSettings } from '../../data/hotels';

/** Edit the hotel list: names and colors, add or remove a hotel. */
const HotelsDialog: React.FC<{
  settings: HotelSettings;
  onSaved: (s: HotelSettings) => void;
  onClose: () => void;
}> = ({ settings, onSaved, onClose }) => {
  const [hotels, setHotels] = useState<Hotel[]>(settings.hotels);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const assigned = (id: string) => Object.values(settings.assignments).filter((h) => h === id).length;
  const update = (id: string, patch: Partial<Hotel>) => setHotels((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const add = () => setHotels((hs) => [...hs, {
    id: `hotel-${Date.now().toString(36)}`,
    name: `Hotel ${hs.length + 1}`,
    color: HOTEL_COLORS.find((c) => !hs.some((h) => h.color === c)) ?? HOTEL_COLORS[hs.length % HOTEL_COLORS.length],
  }]);
  const invalid = hotels.some((h) => !h.name.trim());

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const cleaned = hotels.map((h) => ({ ...h, name: h.name.trim() }));
      const assignments = await saveHotels(cleaned, settings.assignments);
      onSaved({ hotels: cleaned, assignments });
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Hoteles</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {hotels.map((h) => (
            <Box key={h.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField size="small" label="Nombre" value={h.name} onChange={(e) => update(h.id, { name: e.target.value })}
                error={!h.name.trim()} sx={{ flex: 1, minWidth: 180 }} />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {HOTEL_COLORS.map((c) => (
                  <Box key={c} component="button" type="button" aria-label={c} onClick={() => update(h.id, { color: c })} sx={{
                    width: 22, height: 22, borderRadius: '50%', bgcolor: c, cursor: 'pointer', p: 0,
                    border: h.color === c ? '3px solid' : '2px solid transparent',
                    borderColor: h.color === c ? 'text.primary' : 'transparent',
                  }} />
                ))}
              </Box>
              <Tooltip title={assigned(h.id) ? `Quitar (${assigned(h.id)} registro${assigned(h.id) === 1 ? '' : 's'} quedarán sin hotel)` : 'Quitar'}>
                <IconButton size="small" onClick={() => setHotels((hs) => hs.filter((x) => x.id !== h.id))} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
          <Box>
            <Button startIcon={<AddIcon />} onClick={add} disabled={hotels.length >= 20} sx={{ textTransform: 'none' }}>Agregar hotel</Button>
          </Box>
          {error && <Typography color="error.main" variant="body2">{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving || invalid} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {saving ? <CircularProgress size={16} color="inherit" /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HotelsDialog;
