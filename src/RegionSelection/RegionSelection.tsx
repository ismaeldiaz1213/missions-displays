import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapTitle from '../assets/MapSelectionBanner.png';
import misionerosPasadosButton from '../assets/missionerosPasadosButton.png';
import { Modal, Button, Box, Typography, Paper } from '@mui/material';
import LeafletMapContainer from './LeafletMapContainer';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '3px solid #000',
  boxShadow: 24,
  p: 4,
};

const RegionSelection: React.FC = () => {
    const navigate = useNavigate();
    
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <div>
            <img
                src={mapTitle}
                alt="Map Banner"
                style={{
                    width: '100%',
                    maxWidth: '100%',
                    maxHeight: '15vh',
                    height: 'auto',
                    marginBottom: '20px',
                    objectFit: 'contain',
                }}
            />
            <LeafletMapContainer></LeafletMapContainer>
             {/* Bottom Buttons */}
            <Paper sx={{ p: 2 }}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                    gap={2}
                    flexWrap="wrap"
                >
                    <img
                        src={misionerosPasadosButton}
                        alt='Misioneros Pasados Button'
                        style={{cursor: 'pointer'}}
                        onClick={() => navigate('/misioneros-pasados')}
                    />
                    <Paper
                      sx={{
                        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                        border: '2px solid #F59E0B',
                        borderRadius: '12px',
                        p: 2,
                        flex: 1,
                        minWidth: '200px',
                        textAlign: 'center',
                        boxShadow: '0 4px 15px rgba(217, 119, 6, 0.15)',
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: '#92400E',
                          fontSize: '0.95rem',
                        }}
                      >
                        💡 Toca un continente o su ícono para ver los misioneros
                      </Typography>
                    </Paper>
                    <Button variant="outlined" onClick={() => setModalOpen(true)}>
                    🙌 Acknowledgments
                    </Button>
                </Box>
            </Paper>
            {/* Acknowledgments Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Agradecimientos
                    </Typography>
                    <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                        Este proyetcto fue posible gracias a los esfuerzos y apoyo de:
                        <ul className="list-disc ml-6 mt-2">
                            <li>Nuestro Salvador - El Senor Jesucristo</li>
                            <li>El Pastor Roy Carrizales</li>
                            <li>Los miembros de la Iglesia Bautista Libertad</li>
                        </ul>
                    </Typography>
                </Box>
            </Modal>
        </div>
    );
};

export default RegionSelection;