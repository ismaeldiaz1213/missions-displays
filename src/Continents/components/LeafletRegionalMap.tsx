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

const LeafletRegionalMap: React.FC<RegionMapProps> = ({
  centerLat,
  centerLong,
  missionaries = [],
  onMissionarySelect,
  selectedMissionaryId,
}) => {
  const navigate = useNavigate();

  // Create custom icon for missionaries
  const createMissionaryIcon = (isSelected: boolean = false) =>
    L.divIcon({
      className: 'missionary-marker',
      html: `
        <div style="
          width: ${isSelected ? '50px' : '40px'};
          height: ${isSelected ? '50px' : '40px'};
          background: linear-gradient(135deg, ${isSelected ? '#FCD34D' : '#2563EB'} 0%, ${isSelected ? '#F59E0B' : '#1E3A8A'} 100%);
          border: ${isSelected ? '4px' : '3px'} solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '24px' : '18px'};
          box-shadow: ${isSelected ? '0 6px 20px rgba(217, 119, 6, 0.5)' : '0 4px 12px rgba(37, 99, 235, 0.4)'};
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          ${isSelected ? '⭐' : '👤'}
        </div>
      `,
      iconSize: [isSelected ? 50 : 40, isSelected ? 50 : 40],
      iconAnchor: [isSelected ? 25 : 20, isSelected ? 25 : 20],
    });

  return (
    <MapContainer
      center={[centerLat, centerLong]}
      zoom={4}
      scrollWheelZoom={false}
      style={{ height: '70vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render missionary pins */}
      {missionaries.map((missionary) => (
        <Marker
          key={missionary.id}
          position={[missionary.location.latitude, missionary.location.longitude]}
          icon={createMissionaryIcon(selectedMissionaryId === missionary.id)}
          eventHandlers={{
            click: () => {
              if (onMissionarySelect) {
                onMissionarySelect(missionary.id);
              }
            },
          }}
        >
          <Popup>
            <Box
              sx={{
                minWidth: '280px',
                p: 1.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  mb: 1.5,
                }}
              >
                <Box
                  component="img"
                  src={missionary.profileImage}
                  alt={missionary.name}
                  sx={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      color: '#1E3A8A',
                      mb: 0.25,
                    }}
                  >
                    {missionary.name} {missionary.lastName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      color: '#666',
                      mb: 0.25,
                    }}
                  >
                    {missionary.missionType}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      color: '#999',
                    }}
                  >
                    📍 {missionary.location.city}, {missionary.location.country}
                  </Typography>
                </Box>
              </Box>

              {missionary.description && (
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    color: '#555',
                    mb: 1.5,
                    lineHeight: 1.4,
                    maxHeight: '60px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {missionary.description}
                </Typography>
              )}

              <Button
                variant="contained"
                fullWidth
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  py: 0.75,
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  },
                }}
                onClick={() => navigate(`/misionero/${missionary.id}`)}
              >
                Ver Detalles →
              </Button>
            </Box>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LeafletRegionalMap;
