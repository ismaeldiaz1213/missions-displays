import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery, Modal, Button, Box, Typography } from '@mui/material';
import mapTitle from '../assets/MapSelectionBanner.png';
import misionerosPasadosButton from '../assets/missionerosPasadosButton.png';
import LeafletMapContainer from './LeafletMapContainer';

const continents = [
  { name: 'Norte América',  route: '/norte-america',  colorA: '#3B82F6', colorB: '#1D4ED8' },
  { name: 'Centro América', route: '/centro-america', colorA: '#F59E0B', colorB: '#B45309' },
  { name: 'Sur América',    route: '/sur-america',    colorA: '#22C55E', colorB: '#15803D' },
  { name: 'Europa',         route: '/europa',         colorA: '#A855F7', colorB: '#6D28D9' },
  { name: 'África',         route: '/africa',         colorA: '#EF4444', colorB: '#B91C1C' },
  { name: 'Asia',           route: '/asia',           colorA: '#06B6D4', colorB: '#0E7490' },
  { name: 'Oceanía',        route: '/oceania',        colorA: '#EAB308', colorB: '#A16207' },
];

const RegionSelection: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      bgcolor: '#f1f5f9',
    }}>
      {/* Banner */}
      <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <img
          src={mapTitle}
          alt="Nuestros Misioneros por Continente"
          style={{ maxHeight: isMobile ? '10vh' : '13vh', width: '100%', objectFit: 'contain' }}
        />
      </Box>

      {/* Content: map on desktop, button grid on mobile */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isMobile ? (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'repeat(4, 1fr)',
            gap: 2,
            p: 2.5,
            height: '100%',
          }}>
            {continents.map((c) => (
              <Box
                key={c.route}
                onClick={() => navigate(c.route)}
                sx={{
                  background: `linear-gradient(135deg, ${c.colorA} 0%, ${c.colorB} 100%)`,
                  color: '#fff',
                  borderRadius: '16px',
                  p: 2.5,
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  '&:active': { transform: 'scale(0.96)' },
                }}
              >
                {c.name}
              </Box>
            ))}
          </Box>
        ) : (
          <LeafletMapContainer />
        )}
      </Box>

      {/* Bottom bar */}
      <Box sx={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1,
        bgcolor: '#fff',
        borderTop: '1px solid #e2e8f0',
        height: { xs: '64px', md: '76px' },
        gap: 2,
      }}>
        <img
          src={misionerosPasadosButton}
          alt="Misioneros Pasados"
          style={{ height: isMobile ? '44px' : '58px', width: 'auto', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/misioneros-pasados')}
        />

        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
            {isMobile ? '👆 Toca un continente' : '👆 Toca un continente para ver los misioneros'}
          </Typography>
        </Box>

        <Button
          size="small"
          onClick={() => setModalOpen(true)}
          sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.75rem', flexShrink: 0 }}
        >
          {isMobile ? 'Info' : 'Agradecimientos'}
        </Button>
      </Box>

      {/* Acknowledgments modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90vw', sm: 420 },
          bgcolor: 'background.paper',
          borderRadius: 2, boxShadow: 24, p: 4,
        }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Agradecimientos</Typography>
          <Typography variant="body2" color="text.secondary">
            Este proyecto fue posible gracias al esfuerzo y apoyo de:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2.5 }}>
            {[
              'Nuestro Salvador — El Señor Jesucristo',
              'El Pastor Roy Carrizales',
              'Los miembros de la Iglesia Bautista Libertad',
            ].map((item) => (
              <Typography key={item} component="li" variant="body2" sx={{ mb: 0.5 }}>{item}</Typography>
            ))}
          </Box>
          <Button onClick={() => setModalOpen(false)} sx={{ mt: 2 }} variant="outlined" size="small">Cerrar</Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default RegionSelection;
