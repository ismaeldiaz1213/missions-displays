import React from 'react';
import { MapContainer, Polygon, TileLayer } from 'react-leaflet';
//import { MapContainer, Marker, Popup, Polygon, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

const LeafletMapContainer: React.FC = () => {
  const navigate = useNavigate();

  // Rough approximation of North America polygon (bounding box)
  const northAmericaCoords: [number, number][] = [
    [72.0, -168.0], // Alaska NW
    [72.0, -52.0],  // Canada NE
    [7.0, -52.0],   // Panama SE
    [7.0, -168.0],  // Central America SW
  ];

  return (
    <MapContainer center={[15.0, 0.0]} zoom={2.75} scrollWheelZoom={false} style={{ height: '70vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Polygon for North America. TODO: Add custom Icon so user is inclined to click on the region */}
      <Polygon
        positions={northAmericaCoords}
        pathOptions={{ color: 'transparent', fillOpacity: 0 }}
        eventHandlers={{
          click: () => navigate('/norte-america'),
        }}
      />
    </MapContainer>
  );
};

export default LeafletMapContainer;
