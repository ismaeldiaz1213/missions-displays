import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Missionary } from '../../types';

interface MissionaryInfoPanelProps {
  missionary: Missionary;
  onContactClick: () => void;
}

const MissionaryInfoPanel: React.FC<MissionaryInfoPanelProps> = ({ missionary, onContactClick }) => {
  return (
    <Paper
      sx={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: '12px',
        p: 2.5,
        boxShadow: '0 10px 15px -3px rgba(30, 58, 138, 0.1)',
        border: '1px solid rgba(30, 58, 138, 0.05)',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2,
        }}
      >
        📋 Información
      </Typography>

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#9CA3AF', fontSize: '0.85rem', mb: 0.5 }}>
          ORGANIZACIÓN
        </Typography>
        <Typography variant="body1" sx={{ color: '#1F2937', fontWeight: 500 }}>
          {missionary.organization}
        </Typography>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#9CA3AF', fontSize: '0.85rem', mb: 0.5 }}>
          UBICACIÓN
        </Typography>
        <Typography variant="body1" sx={{ color: '#1F2937', fontWeight: 500 }}>
          📍 {missionary.location.city}, {missionary.location.country}
        </Typography>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#9CA3AF', fontSize: '0.85rem', mb: 0.5 }}>
          TIPO DE MINISTERIO
        </Typography>
        <Typography variant="body1" sx={{ color: '#1F2937', fontWeight: 500 }}>
          {missionary.missionType}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ color: '#4B5563', lineHeight: 1.6 }}>
          {missionary.description}
        </Typography>
      </Box>

      <Button
        variant="contained"
        fullWidth
        sx={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          color: 'white',
          fontWeight: 600,
          mb: 1,
          py: 1.5,
          fontSize: '1rem',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          },
        }}
        onClick={onContactClick}
      >
        📧 Contactar
      </Button>
    </Paper>
  );
};

export default MissionaryInfoPanel;
