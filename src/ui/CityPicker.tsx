import React, { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Button, CircularProgress, List, ListItemButton, ListItemText, TextField, Typography,
} from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { searchPlaces, type Place } from '../data/geocode';
import { BRAND } from './brand';

export interface CityValue {
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
}

const T = {
  es: {
    city: 'Ciudad', state: 'Estado / Provincia', country: 'País', find: 'Buscar en el mapa',
    pick: 'Elija el lugar correcto:', none: 'No encontramos ese lugar. Revise la ortografía o pruebe con una ciudad cercana.',
    error: 'No se pudo buscar ahora. Intente de nuevo en un momento.',
    hint: 'Toque el mapa para mover el punto si hace falta.', found: 'Ubicación en el mapa lista',
    missing: 'Escriba la ciudad y el país, y luego pulse "Buscar en el mapa".',
  },
  en: {
    city: 'City', state: 'State / Province', country: 'Country', find: 'Find on the map',
    pick: 'Choose the right place:', none: "We couldn't find that place. Check the spelling or try a nearby city.",
    error: "Couldn't search right now. Please try again in a moment.",
    hint: 'Tap the map to move the pin if needed.', found: 'Map location set',
    missing: 'Type the city and country, then press "Find on the map".',
  },
};

const Recenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], Math.max(map.getZoom(), 9)); }, [lat, lng, map]);
  return null;
};

const ClickToMove: React.FC<{ onMove: (lat: number, lng: number) => void }> = ({ onMove }) => {
  useMapEvents({ click: (e) => onMove(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))) });
  return null;
};

/**
 * City, state and country fields with a "find on the map" search, so nobody has to type
 * latitude and longitude. The pin can be nudged by tapping the map.
 */
const CityPicker: React.FC<{
  value: CityValue;
  onChange: (v: CityValue) => void;
  lang?: 'es' | 'en';
  required?: boolean;
  showErrors?: boolean;
}> = ({ value, onChange, lang = 'es', required, showErrors }) => {
  const t = T[lang];
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState('');
  const hasPin = value.latitude !== 0 || value.longitude !== 0;

  const set = (field: keyof CityValue, v: string) => onChange({ ...value, [field]: v });

  const find = async () => {
    setError('');
    setResults(null);
    setSearching(true);
    try {
      const hits = await searchPlaces([value.city, value.state, value.country].filter(Boolean).join(', '), lang);
      if (hits.length === 1) choose(hits[0]);
      else setResults(hits);
    } catch {
      setError(t.error);
    } finally {
      setSearching(false);
    }
  };

  const choose = (p: Place) => {
    setResults(null);
    onChange({
      city: value.city || p.city, state: value.state || p.state, country: value.country || p.country,
      latitude: Number(p.latitude.toFixed(5)), longitude: Number(p.longitude.toFixed(5)),
    });
  };

  const err = (v: string) => !!(required && showErrors && !v.trim());

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
        <TextField label={t.city} required={required} value={value.city} onChange={(e) => set('city', e.target.value)} error={err(value.city)} />
        <TextField label={t.state} value={value.state ?? ''} onChange={(e) => set('state', e.target.value)} />
        <TextField label={t.country} required={required} value={value.country} onChange={(e) => set('country', e.target.value)} error={err(value.country)} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, flexWrap: 'wrap' }}>
        <Button variant={hasPin ? 'outlined' : 'contained'} startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <TravelExploreIcon />}
          onClick={find} disabled={searching || !(value.city.trim() || value.country.trim())}>
          {t.find}
        </Button>
        {hasPin ? (
          <Typography sx={{ color: '#15803D', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon fontSize="small" /> {t.found}
          </Typography>
        ) : (
          <Typography sx={{ color: showErrors && required ? '#B91C1C' : BRAND.muted, fontSize: '0.85rem' }}>{t.missing}</Typography>
        )}
      </Box>
      {error && <Typography sx={{ color: '#B91C1C', fontSize: '0.85rem', mt: 1 }}>{error}</Typography>}
      {results && (
        results.length === 0
          ? <Typography sx={{ color: BRAND.amberDeep, fontSize: '0.9rem', mt: 1 }}>{t.none}</Typography>
          : (
            <Box sx={{ mt: 1, border: `1px solid ${BRAND.line}`, borderRadius: '12px', overflow: 'hidden' }}>
              <Typography sx={{ px: 2, pt: 1.25, fontWeight: 700, fontSize: '0.85rem', color: BRAND.muted }}>{t.pick}</Typography>
              <List dense>
                {results.map((p) => (
                  <ListItemButton key={`${p.latitude},${p.longitude}`} onClick={() => choose(p)}>
                    <ListItemText primary={p.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          )
      )}
      {hasPin && (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ height: 220, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${BRAND.line}` }}>
            <MapContainer center={[value.latitude, value.longitude]} zoom={9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              <CircleMarker center={[value.latitude, value.longitude]} radius={10}
                pathOptions={{ color: BRAND.white, weight: 3, fillColor: BRAND.blue, fillOpacity: 1 }} />
              <Recenter lat={value.latitude} lng={value.longitude} />
              <ClickToMove onMove={(latitude, longitude) => onChange({ ...value, latitude, longitude })} />
            </MapContainer>
          </Box>
          <Typography sx={{ color: BRAND.muted, fontSize: '0.8rem', mt: 0.5 }}>
            {t.hint} ({value.latitude}, {value.longitude})
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CityPicker;
