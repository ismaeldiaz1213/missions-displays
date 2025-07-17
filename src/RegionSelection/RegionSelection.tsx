import React, { useState } from 'react';
import mapImage from '../assets/BlankMap-World_gray.svg';
import { useNavigate } from 'react-router-dom';
import mapTitle from '../assets/MapSelectionBanner.png';
import { Modal, Button, Box, Typography, Paper } from '@mui/material';
import LeafletMapContainer from './LeafletMapContainer';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const RegionSelection: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = (continent: string) => {
        navigate(`/${continent}`);
    };
    
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <div>
            <img
                src={mapTitle}
                alt="Map Banner"
                style={{
                    width: '100%',
                    maxWidth: '100%',  // Prevent it from overflowing
                    maxHeight: '20vh',
                    height: 'auto',
                    marginBottom: '20px',
                    objectFit: 'contain',  // Ensure the title image fits correctly
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
                >
                    <Button variant="contained" onClick={() => navigate('/memory-video')}>
                    🎥 Memory Video
                    </Button>
                    <Button variant="contained" onClick={() => navigate('/timeline')}>
                    📅 Church Timeline
                    </Button>
                    <Button variant="outlined" onClick={() => setModalOpen(true)}>
                    🙌 Acknowledgments
                    </Button>
                </Box>
            </Paper>
            {/* Acknowledgments Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Volunatarios y Reconocimientos
                    </Typography>
                    <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                        Este proyetcto fue posible gracias a los esfuerzos y apoyo de:
                        <ul className="list-disc ml-6 mt-2">
                            <li>Nuestro Salvador - El Senor Jesucristo</li>
                            <li>El Pastor Roy Carrizales</li>
                            <li>Los miembros de la Iglesia Bautista Libertad</li>
                            <li>Equipo Tecnico - Ismael Diaz</li>
                        </ul>
                    </Typography>
                </Box>
            </Modal>
        </div>
    );
};

export default RegionSelection;