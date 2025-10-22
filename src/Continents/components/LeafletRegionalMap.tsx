import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type RegionMapProps = {
    centerLat: number,
    centerLong: number,
    //TODO: Add coordinates of missionary points to the type
};

const LeafletRegionalMap: React.FC <RegionMapProps> = ({centerLat, centerLong}) => {

  return (
    <MapContainer center={[centerLat, centerLong]} zoom={4} scrollWheelZoom={false} style={{ height: '70vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
};

export default LeafletRegionalMap;
