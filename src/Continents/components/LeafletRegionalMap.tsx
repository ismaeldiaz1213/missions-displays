import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Missionary } from '../../types';
import { Box, Typography, Button } from '@mui/material';

type RegionMapProps = {
  centerLat: number;
  centerLong: number;
  missionaries?: Missionary[];
  onMissionarySelect?: (missionaryId: string) => void;
  selectedMissionaryId?: string | null;
};

const createMissionaryIcon = (missionary: Missionary, isSelected: boolean) => {
  const size = isSelected ? 52 : 44;
  const ring = isSelected
    ? '0 0 0 3px #F59E0B, 0 4px 16px rgba(0,0,0,0.4)'
    : '0 3px 10px rgba(0,0,0,0.3)';
  const border = isSelected ? '3px solid #F59E0B' : '2.5px solid #fff';
  const src = missionary.profileImage || '/default-missionary.svg';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px; height:${size}px;
        border-radius:50%;
        border:${border};
        box-shadow:${ring};
        overflow:hidden;
        cursor:pointer;
        background:linear-gradient(135deg,#2563EB 0%,#1E3A8A 100%);
        display:flex; align-items:center; justify-content:center;
        flex-shrink:0;
      ">
        <img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;"
          onerror="this.src='/default-missionary.svg'" />
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const LeafletRegionalMap: React.FC<RegionMapProps> = ({
  centerLat, centerLong, missionaries = [], onMissionarySelect, selectedMissionaryId,
}) => {
  const navigate = useNavigate();

  return (
    <MapContainer
      center={[centerLat, centerLong]}
      zoom={4}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {missionaries.map((missionary) => (
        <Marker
          key={missionary.id}
          position={[missionary.location.latitude, missionary.location.longitude]}
          icon={createMissionaryIcon(missionary, selectedMissionaryId === missionary.id)}
          eventHandlers={{ click: () => onMissionarySelect?.(missionary.id) }}
        >
          <Popup>
            <Box sx={{ minWidth: '260px', p: 1 }}>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.25 }}>
                <Box
                  component="img"
                  src={missionary.profileImage || '/default-missionary.svg'}
                  alt={missionary.name}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = '/default-missionary.svg';
                  }}
                  sx={{ width: 64, height: 64, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E3A8A', mb: 0.2 }}>
                    {[missionary.name, missionary.lastName].filter(Boolean).join(' ') || 'Misionero'}
                  </Typography>
                  {missionary.missionType && (
                    <Typography sx={{ fontSize: '0.8rem', color: '#666', mb: 0.2 }}>
                      {missionary.missionType}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>
                    📍 {[missionary.location?.city, missionary.location?.country].filter(Boolean).join(', ') || '—'}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                fullWidth
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textTransform: 'none',
                  borderRadius: '8px',
                }}
                onClick={() => navigate(`/misionero/${missionary.id}`)}
              >
                Ver detalles →
              </Button>
            </Box>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LeafletRegionalMap;
