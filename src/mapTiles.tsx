import React from 'react';
import { TileLayer } from 'react-leaflet';
import './mapTiles.css';

/**
 * Base map tiles for every Leaflet map on the site.
 *
 * We used CARTO's "voyager" basemap until they started stamping "API KEY REQUIRED"
 * across unregistered tiles. OpenStreetMap's own tiles are free, need no key, and
 * carry no watermark, so everything points here now.
 *
 * The attribution stays visible (OSM's license asks for it) but its links are made
 * unclickable in mapTiles.css — on the kiosk people kept tapping them and leaving the site.
 */
const BaseTiles: React.FC = () => (
  <TileLayer
    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
    maxZoom={19}
  />
);

export default BaseTiles;
