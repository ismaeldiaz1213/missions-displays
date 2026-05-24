import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery, Modal, Button, Box, Typography } from '@mui/material';
import mapTitle from '../assets/MapSelectionBanner.png';
import misionerosPasadosButton from '../assets/missionerosPasadosButton.png';
import naMobile from '../assets/na_mobile.png';
import caMobile from '../assets/ca_mobile.png';
import saMobile from '../assets/sa_mobile.png';
import eMobile from '../assets/e_mobile.png';
import aMobile from '../assets/a_mobile.png';
import asiaMobile from '../assets/asia_mobile.png';
import oMobile from '../assets/o_mobile.png';
import LeafletMapContainer from './LeafletMapContainer';

const continents = [
  { name: 'Norte América',  route: '/norte-america',  colorA: '#1D6FA4', colorB: '#0D3F6B', mobileImg: naMobile },
  { name: 'Centro América', route: '/centro-america', colorA: '#E07B1A', colorB: '#9A4E00', mobileImg: caMobile },
  { name: 'Sur América',    route: '/sur-america',    colorA: '#1A8A4A', colorB: '#0D5A2E', mobileImg: saMobile },
  { name: 'Europa',         route: '/europa',         colorA: '#0E7490', colorB: '#064E63', mobileImg: eMobile },
  { name: 'África',         route: '/africa',         colorA: '#CA8A04', colorB: '#854D0E', mobileImg: aMobile },
  { name: 'Asia',           route: '/asia',           colorA: '#DC2626', colorB: '#7F1D1D', mobileImg: asiaMobile },
  { name: 'Oceanía',        route: '/oceania',        colorA: '#BE185D', colorB: '#6D0F38', mobileImg: oMobile },
];

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

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
            gap: 1.5,
            p: 1.5,
            height: '100%',
            boxSizing: 'border-box',
          }}>
            {continents.map((c, i) => (
              <Box
                key={c.route}
                onClick={() => navigate(c.route)}
                sx={{
                  ...(i === continents.length - 1 && continents.length % 2 === 1 && {
                    gridColumn: '1 / -1',
                    width: 'calc(50% - 6px)',
                    mx: 'auto',
                  }),
                  background: c.mobileImg
                    ? `linear-gradient(135deg, ${hexToRgba(c.colorA, 0.70)} 0%, ${hexToRgba(c.colorB, 0.82)} 100%), url(${c.mobileImg})`
                    : `linear-gradient(135deg, ${c.colorA} 0%, ${c.colorB} 100%)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: '#fff',
                  borderRadius: '14px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
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

      {/* Bottom bar — column on mobile, row on desktop */}
      {isMobile ? (
        <Box sx={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          px: 2,
          pt: 1.25,
          pb: 1.5,
          bgcolor: '#fff',
          borderTop: '1px solid #e2e8f0',
        }}>
          <Typography sx={{ color: '#475569', fontWeight: 700, fontSize: '1rem' }}>
            👆 Toca un continente para explorar
          </Typography>
          <Box component="img"
            src={misionerosPasadosButton}
            alt="Misioneros Pasados"
            sx={{ height: '44px', width: 'auto', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}
          />
          <Button
            size="small"
            onClick={() => setModalOpen(true)}
            sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.85rem', mt: -0.5 }}
          >
            Agradecimientos
          </Button>
        </Box>
      ) : (
        <Box sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          bgcolor: '#fff',
          borderTop: '1px solid #e2e8f0',
          height: '76px',
          gap: 2,
        }}>
          <img
            src={misionerosPasadosButton}
            alt="Misioneros Pasados"
            style={{ height: '58px', width: 'auto', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => navigate('/misioneros-pasados')}
          />
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
              👆 Toca un continente para ver los misioneros
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => setModalOpen(true)}
            sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.75rem', flexShrink: 0 }}
          >
            Agradecimientos
          </Button>
        </Box>
      )}

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
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 2, borderTop: '1px solid #eee', pt: 1.5 }}>
            Créditos de imágenes:{' '}
            <Box component="a" href="https://www.flickr.com/photos/80497449@N04/8280699806" target="_blank" rel="noopener noreferrer"
              sx={{ color: 'text.disabled', textDecoration: 'underline' }}>
              North America map
            </Box>
            {' '}por Stasinho12, licencia Creative Commons.
          </Typography>
          <Button onClick={() => setModalOpen(false)} sx={{ mt: 1.5 }} variant="outlined" size="small">Cerrar</Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default RegionSelection;
