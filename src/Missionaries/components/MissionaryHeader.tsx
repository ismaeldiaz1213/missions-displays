import React from 'react';
import { Box, Grid2, Typography } from '@mui/material';
import { Missionary } from '../../types';

interface MissionaryHeaderProps {
  missionary: Missionary;
}

const MissionaryHeader: React.FC<MissionaryHeaderProps> = ({ missionary }) => {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
        color: 'white',
        p: 1,
        boxShadow: '0 4px 12px rgba(30, 58, 138, 0.15)',
      }}
    >
      <Grid2 container spacing={1} alignItems="center">
        <Grid2 size={{ xs: 2.5, sm: 2 }}>
          <Box
            component="img"
            src={missionary.profileImage}
            alt={missionary.name}
            sx={{
              width: '100%',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
            }}
          />
        </Grid2>
        <Grid2 size={{ xs: 9.5, sm: 10 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: '#fff',
              fontSize: { xs: '1rem', md: '1.25rem' },
              mb: 0.1,
            }}
          >
            {missionary.name} {missionary.lastName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 500 }}>
            {missionary.missionType}
          </Typography>
        </Grid2>
      </Grid2>
    </Box>
  );
};

export default MissionaryHeader;
