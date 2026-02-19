import React, { useState } from 'react';
import { MapContainer, Polygon, TileLayer, Marker, Popup } from 'react-leaflet';
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

const LeafletMapContainer: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);

  // Continent polygons (approximate bounding coordinates)
  const continentPolygons = [
    {
      id: 'north-america',
      name: 'Norte América',
      route: '/norte-america',
      color: '#2563EB',
      coordinates: [
        [72.0, -168.0],
        [72.0, -52.0],
        [7.0, -52.0],
        [7.0, -168.0],
      ] as [number, number][],
      center: [NORTH_AMERICA_LAT_CENTER, NORTH_AMERICA_LON_CENTER] as [number, number],
    },
    {
      id: 'south-america',
      name: 'Sud América',
      route: '/sur-america',
      color: '#4CAF50',
      coordinates: [
        [15.0, -32.0],
        [15.0, -82.0],
        [-56.0, -82.0],
        [-56.0, -32.0],
      ] as [number, number][],
      center: [SOUTH_AMERICA_LAT_CENTER, SOUTH_AMERICA_LON_CENTER] as [number, number],
    },
    {
      id: 'central-america',
      name: 'Centro América',
      route: '/centro-america',
      color: '#FF9800',
      coordinates: [
        [18.0, -77.0],
        [18.0, -92.0],
        [7.0, -92.0],
        [7.0, -77.0],
      ] as [number, number][],
      center: [CENTRAL_AMERICA_LAT_CENTER, CENTRAL_AMERICA_LON_CENTER] as [number, number],
    },
    {
      id: 'europe',
      name: 'Europa',
      route: '/europa',
      color: '#9C27B0',
      coordinates: [
        [71.0, -10.0],
        [71.0, 40.0],
        [35.0, 40.0],
        [35.0, -10.0],
      ] as [number, number][],
      center: [EUROPE_LAT_CENTER, EUROPE_LON_CENTER] as [number, number],
    },
    {
      id: 'africa',
      name: 'África',
      route: '/africa',
      color: '#F44336',
      coordinates: [
        [37.0, -17.0],
        [37.0, 55.0],
        [-35.0, 55.0],
        [-35.0, -17.0],
      ] as [number, number][],
      center: [AFRICA_LAT_CENTER, AFRICA_LON_CENTER] as [number, number],
    },
    {
      id: 'asia',
      name: 'Asia',
      route: '/asia',
      color: '#00BCD4',
      coordinates: [
        [77.0, 26.0],
        [77.0, 150.0],
        [-10.0, 150.0],
        [-10.0, 26.0],
      ] as [number, number][],
      center: [ASIA_LAT_CENTER, ASIA_LON_CENTER] as [number, number],
    },
    {
      id: 'oceania',
      name: 'Oceanía',
      route: '/oceania',
      color: '#FFC107',
      coordinates: [
        [-10.0, 113.0],
        [-10.0, 180.0],
        [-47.0, 180.0],
        [-47.0, 113.0],
      ] as [number, number][],
      center: [OCEANIA_LAT_CENTER, OCEANIA_LON_CENTER] as [number, number],
    },
  ];

  // Create custom icon marker
  const createContinentIcon = (color: string) =>
    L.divIcon({
      className: 'continent-marker',
      html: `
        <div style="
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.1) 100%);
          border: 3px solid ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          🌍
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });

  return (
    <MapContainer center={[20.0, 0.0]} zoom={2.5} scrollWheelZoom={false} style={{ height: '70vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render all continent polygons with interactive features */}
      {continentPolygons.map((continent) => (
        <div key={continent.id}>
          {/* Polygon outline */}
          <Polygon
            positions={continent.coordinates}
            pathOptions={{
              color: continent.color,
              weight: 3,
              opacity: hoveredContinent === continent.id ? 1 : 0.5,
              fillOpacity: hoveredContinent === continent.id ? 0.25 : 0.1,
              fillColor: continent.color,
            }}
            eventHandlers={{
              click: () => navigate(continent.route),
              mouseover: () => setHoveredContinent(continent.id),
              mouseout: () => setHoveredContinent(null),
            }}
          />

          {/* Icon marker at continent center */}
          <Marker
            position={continent.center}
            icon={createContinentIcon(continent.color)}
            eventHandlers={{
              click: () => navigate(continent.route),
            }}
          >
            <Popup>
              <div style={{ textAlign: 'center', fontWeight: 'bold', color: continent.color }}>
                {continent.name}
                <br />
                <small style={{ fontSize: '0.8em', color: '#666' }}>Haz clic para ver misioneros</small>
              </div>
            </Popup>
          </Marker>
        </div>
      ))}
    </MapContainer>
  );
};

export default LeafletMapContainer;
