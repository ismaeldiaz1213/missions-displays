import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography } from '@mui/material';
import ChurchOutlinedIcon from '@mui/icons-material/ChurchOutlined';
import type { Church } from '../../types';

/** "Dónde se reúnen": the churches they planted, as pins on a street map, with the addresses. */
const ChurchMap: React.FC<{ churches: Church[] }> = ({ churches }) => {
  const pinned = churches.filter((c) => c.latitude || c.longitude);
  const bounds = useMemo(() => (pinned.length
    ? L.latLngBounds(pinned.map((c) => [c.latitude, c.longitude] as [number, number])).pad(pinned.length > 1 ? 0.3 : 0)
    : null), [pinned]);

  return (
    <Box>
      {bounds && (
        <Box sx={{ height: { xs: 260, md: 320 }, borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0', mb: 2 }}>
          <MapContainer bounds={bounds} maxZoom={16} boundsOptions={{ maxZoom: 15 }} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            {pinned.map((c, i) => (
              <CircleMarker key={i} center={[c.latitude, c.longitude]} radius={11}
                pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]} permanent={pinned.length <= 3}>{c.name}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </Box>
      )}
      <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: churches.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr' } }}>
        {churches.map((c, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 2, borderRadius: '14px', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <ChurchOutlinedIcon sx={{ color: '#2563EB', mt: 0.25 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, color: '#0F172A' }}>{c.name}</Typography>
              {c.address && <Typography sx={{ color: '#475569', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>{c.address}</Typography>}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ChurchMap;
