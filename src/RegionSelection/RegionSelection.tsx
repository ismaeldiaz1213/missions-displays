import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapTitle from '../assets/MapSelectionBanner.png';
import misionerosPasadosButton from '../assets/missionerosPasadosButton.png';
import { Modal, Button, Box, Typography } from '@mui/material';
import LeafletMapContainer from './LeafletMapContainer';

const RegionSelection: React.FC = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f1f5f9' }}>

      {/* Banner */}
      <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <img
          src={mapTitle}
          alt="Nuestros Misioneros por Continente"
          style={{ maxHeight: '13vh', width: '100%', objectFit: 'contain' }}
        />
      </Box>

      {/* Map — fills all remaining space */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <LeafletMapContainer />
      </Box>

      {/* Bottom bar */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          bgcolor: '#fff',
          borderTop: '1px solid #e2e8f0',
          height: '76px',
          gap: 2,
        }}
      >
        {/* Left: Misioneros Pasados */}
        <img
          src={misionerosPasadosButton}
          alt="Misioneros Pasados"
          style={{ height: '58px', width: 'auto', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/misioneros-pasados')}
        />

        {/* Center: instruction */}
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography
            variant="body2"
            sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1px' }}
          >
            👆 Toca un continente para ver los misioneros
          </Typography>
        </Box>

        {/* Right: Acknowledgements (subtle) */}
        <Button
          size="small"
          onClick={() => setModalOpen(true)}
          sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.75rem', flexShrink: 0 }}
        >
          Agradecimientos
        </Button>
      </Box>

      {/* Acknowledgments modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 420, bgcolor: 'background.paper',
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
