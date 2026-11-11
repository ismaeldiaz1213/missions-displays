import React, { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Button, CircularProgress, IconButton, List, ListItemButton, ListItemText, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Church } from '../types';
import { searchPlaces, type Place } from '../data/geocode';

const T = {
  es: {
    intro: 'Si plantaron o pastorean una iglesia, ponga su dirección y aparecerá en el mapa de su página.',
    name: 'Nombre de la iglesia', address: 'Dirección', addressHelp: 'Calle y número, barrio, ciudad',
    find: 'Ubicar en el mapa', found: 'En el mapa', notFound: 'No encontramos esa dirección. Pruebe solo con la calle y la ciudad, y luego toque el mapa para ajustar el punto.',
    pick: 'Elija la ubicación correcta:', tap: 'Toque el mapa para mover el punto exactamente a la iglesia.', add: 'Añadir iglesia', remove: 'Quitar',
    error: 'No se pudo buscar ahora. Intente de nuevo.',
  },
  en: {
    intro: "If you planted or pastor a church, add its address and it will show on your page's map.",
    name: 'Church name', address: 'Address', addressHelp: 'Street and number, neighborhood, city',
    find: 'Find on the map', found: 'On the map', notFound: "We couldn't find that address. Try just the street and city, then tap the map to adjust the pin.",
    pick: 'Choose the right location:', tap: 'Tap the map to move the pin exactly to the church.', add: 'Add church', remove: 'Remove',
    error: "Couldn't search right now. Please try again.",
  },
};

const Recenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], Math.max(map.getZoom(), 15)); }, [lat, lng, map]);
  return null;
};

const ClickToMove: React.FC<{ onMove: (lat: number, lng: number) => void }> = ({ onMove }) => {
  useMapEvents({ click: (e) => onMove(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))) });
  return null;
};

const ChurchRow: React.FC<{ c: Church; near: string; lang: 'es' | 'en'; onChange: (c: Church) => void; onRemove: () => void }> = ({ c, near, lang, onChange, onRemove }) => {
  const t = T[lang];
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState('');
  const pinned = !!(c.latitude || c.longitude);

  const find = async () => {
    setBusy(true);
    setError('');
    setResults(null);
    try {
      const q = [c.address, near].filter(Boolean).join(', ');
      const hits = await searchPlaces(q, lang);
      if (hits.length === 1) onChange({ ...c, latitude: Number(hits[0].latitude.toFixed(6)), longitude: Number(hits[0].longitude.toFixed(6)) });
      else setResults(hits);
    } catch { setError(t.error); } finally { setBusy(false); }
  };

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '14px', p: 2, mb: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, display: 'grid', gap: 1.5 }}>
          <TextField label={t.name} value={c.name} onChange={(e) => onChange({ ...c, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField label={t.address} helperText={t.addressHelp} multiline minRows={2} value={c.address}
            onChange={(e) => onChange({ ...c, address: e.target.value })} slotProps={{ htmlInput: { maxLength: 300 } }} />
        </Box>
        <IconButton aria-label={t.remove} onClick={onRemove}><DeleteOutlineIcon /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.25, flexWrap: 'wrap' }}>
        <Button variant={pinned ? 'outlined' : 'contained'} onClick={find} disabled={busy || !c.address.trim()}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <TravelExploreIcon />} sx={{ borderRadius: '999px', fontWeight: 700, textTransform: 'none' }}>
          {t.find}
        </Button>
        {pinned && <Typography sx={{ color: 'success.main', fontWeight: 700, display: 'flex', gap: 0.5, alignItems: 'center' }}><CheckCircleIcon fontSize="small" />{t.found}</Typography>}
      </Box>
      {error && <Typography sx={{ color: 'error.main', mt: 1, fontSize: '0.9rem' }}>{error}</Typography>}
      {results && (results.length === 0
        ? <Typography sx={{ color: 'warning.dark', mt: 1, fontSize: '0.9rem' }}>{t.notFound}</Typography>
        : (
          <Box sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: '12px' }}>
            <Typography sx={{ px: 2, pt: 1, fontWeight: 700, fontSize: '0.85rem', color: 'text.secondary' }}>{t.pick}</Typography>
            <List dense>
              {results.map((p) => (
                <ListItemButton key={`${p.latitude},${p.longitude}`} onClick={() => { setResults(null); onChange({ ...c, latitude: Number(p.latitude.toFixed(6)), longitude: Number(p.longitude.toFixed(6)) }); }}>
                  <ListItemText primary={p.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      {pinned && (
        <>
          <Box sx={{ height: 220, mt: 1.5, borderRadius: '12px', overflow: 'hidden', border: 1, borderColor: 'divider' }}>
            <MapContainer center={[c.latitude, c.longitude]} zoom={15} scrollWheelZoom={false} dragging={!L.Browser.mobile} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              <CircleMarker center={[c.latitude, c.longitude]} radius={10} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }} />
              <Recenter lat={c.latitude} lng={c.longitude} />
              <ClickToMove onMove={(latitude, longitude) => onChange({ ...c, latitude, longitude })} />
            </MapContainer>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.5 }}>{t.tap}</Typography>
        </>
      )}
    </Box>
  );
};

/** List of churches (name + address + exact pin) for a missionary page. `near` helps the search (their city/country). */
const ChurchesEditor: React.FC<{ value: Church[]; onChange: (v: Church[]) => void; near: string; lang?: 'es' | 'en' }> = ({ value, onChange, near, lang = 'es' }) => {
  const t = T[lang];
  return (
    <Box>
      <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{t.intro}</Typography>
      {value.map((c, i) => (
        <ChurchRow key={i} c={c} near={near} lang={lang}
          onChange={(nc) => onChange(value.map((x, j) => (j === i ? nc : x)))}
          onRemove={() => onChange(value.filter((_, j) => j !== i))} />
      ))}
      {value.length < 10 && (
        <Button startIcon={<AddIcon />} onClick={() => onChange([...value, { name: '', address: '', latitude: 0, longitude: 0 }])}
          sx={{ fontWeight: 700, textTransform: 'none' }}>{t.add}</Button>
      )}
    </Box>
  );
};

export default ChurchesEditor;
