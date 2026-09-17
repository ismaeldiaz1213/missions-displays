import React, { useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box } from '@mui/material';
import { CHURCH } from './pickupData';

export interface MapStop {
  key: string;
  label: string;
  lat: number;
  lng: number;
  /** Short text under the label in the popup, e.g. "2 viajes · 5 personas". */
  detail?: string;
  selected?: boolean;
}

const pin = (text: string, color: string, selected: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font:700 13px/1 system-ui,sans-serif;
      border:2.5px solid ${selected ? '#F59E0B' : '#fff'};
      box-shadow:0 3px 10px rgba(0,0,0,0.45);
    ">${text}</div>`,
  });

/** Church + every pickup place we have coordinates for, with a line from the church to each. */
const PickupMap: React.FC<{ stops: MapStop[]; height?: number }> = ({ stops, height = 380 }) => {
  const bounds = useMemo(() => {
    const points: [number, number][] = [[CHURCH.lat, CHURCH.lng], ...stops.map((s) => [s.lat, s.lng] as [number, number])];
    return L.latLngBounds(points).pad(0.25);
  }, [stops]);

  return (
    <Box sx={{
      height, borderRadius: '12px', overflow: 'hidden', border: '1px solid #2f2f2f',
      '& .ibl-pickup-tiles': { filter: 'brightness(0.78) saturate(0.85)' },
      '& .leaflet-container': { bgcolor: '#101010' },
    }}>
      <MapContainer bounds={bounds} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        {/* Plain OpenStreetMap tiles: free and key-less. Dimmed to match the dark admin theme. */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          className="ibl-pickup-tiles"
        />
        {stops.map((s, i) => (
          <React.Fragment key={s.key}>
            <Polyline positions={[[CHURCH.lat, CHURCH.lng], [s.lat, s.lng]]}
              pathOptions={{ color: s.selected ? '#F59E0B' : '#2563EB', weight: s.selected ? 3 : 2, opacity: 0.55, dashArray: '6 6' }} />
            <Marker position={[s.lat, s.lng]} icon={pin(String(i + 1), '#2563EB', !!s.selected)}>
              <Popup>
                <strong>{s.label}</strong>
                {s.detail && <><br />{s.detail}</>}
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
        <Marker position={[CHURCH.lat, CHURCH.lng]} icon={pin('⛪', '#16A34A', false)}>
          <Popup><strong>{CHURCH.label}</strong><br />{CHURCH.address}</Popup>
        </Marker>
      </MapContainer>
    </Box>
  );
};

export default PickupMap;
