import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  NORTH_AMERICA_LAT_CENTER, NORTH_AMERICA_LON_CENTER,
  SOUTH_AMERICA_LAT_CENTER, SOUTH_AMERICA_LON_CENTER,
  CENTRAL_AMERICA_LAT_CENTER, CENTRAL_AMERICA_LON_CENTER,
  EUROPE_LAT_CENTER, EUROPE_LON_CENTER,
  AFRICA_LAT_CENTER, AFRICA_LON_CENTER,
  ASIA_LAT_CENTER, ASIA_LON_CENTER,
  OCEANIA_LAT_CENTER, OCEANIA_LON_CENTER,
} from '../constants';

interface Continent {
  id: string;
  name: string;
  route: string;
  colorA: string; // gradient start
  colorB: string; // gradient end (darker)
  center: [number, number];
  w: number;
}

const continents: Continent[] = [
  { id: 'north-america',   name: 'Norte América',  route: '/norte-america',  colorA: '#3B82F6', colorB: '#1D4ED8', center: [NORTH_AMERICA_LAT_CENTER,  NORTH_AMERICA_LON_CENTER],  w: 152 },
  { id: 'central-america', name: 'Centro América', route: '/centro-america', colorA: '#F59E0B', colorB: '#B45309', center: [CENTRAL_AMERICA_LAT_CENTER, CENTRAL_AMERICA_LON_CENTER], w: 152 },
  { id: 'south-america',   name: 'Sur América',    route: '/sur-america',    colorA: '#22C55E', colorB: '#15803D', center: [SOUTH_AMERICA_LAT_CENTER,  SOUTH_AMERICA_LON_CENTER],  w: 128 },
  { id: 'europe',          name: 'Europa',          route: '/europa',         colorA: '#A855F7', colorB: '#6D28D9', center: [EUROPE_LAT_CENTER,          EUROPE_LON_CENTER],          w: 96  },
  { id: 'africa',          name: 'África',          route: '/africa',         colorA: '#EF4444', colorB: '#B91C1C', center: [AFRICA_LAT_CENTER,          AFRICA_LON_CENTER],          w: 96  },
  { id: 'asia',            name: 'Asia',            route: '/asia',           colorA: '#06B6D4', colorB: '#0E7490', center: [ASIA_LAT_CENTER,            ASIA_LON_CENTER],            w: 80  },
  { id: 'oceania',         name: 'Oceanía',         route: '/oceania',        colorA: '#EAB308', colorB: '#A16207', center: [OCEANIA_LAT_CENTER,         OCEANIA_LON_CENTER],         w: 104 },
];

const createLabel = ({ name, colorA, colorB, w }: Continent) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        background: linear-gradient(180deg, ${colorA} 0%, ${colorB} 100%);
        color: #fff;
        padding: 10px 18px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 800;
        white-space: nowrap;
        width: ${w}px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
        cursor: pointer;
        border: 1.5px solid rgba(255,255,255,0.4);
        letter-spacing: 0.3px;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      "
      onmouseover="this.style.filter='brightness(1.12)';this.style.transform='scale(1.06)';"
      onmouseout="this.style.filter='brightness(1)';this.style.transform='scale(1)';">
        ${name}
      </div>`,
    iconSize: [w, 44],
    iconAnchor: [w / 2, 22],
  });

const LeafletMapContainer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MapContainer
      center={[22, 12]}
      zoom={2.5}
      zoomSnap={0.5}
      zoomDelta={0.5}
      scrollWheelZoom={false}
      zoomControl={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {continents.map((c) => (
        <Marker
          key={c.id}
          position={c.center}
          icon={createLabel(c)}
          eventHandlers={{ click: () => navigate(c.route) }}
        />
      ))}
    </MapContainer>
  );
};

export default LeafletMapContainer;
