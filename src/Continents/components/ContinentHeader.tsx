import React from 'react';
import { Box, Typography } from '@mui/material';

interface ContinentHeaderProps {
  emoji?: string;
  title: string;
  count: number;
  color?: string;
  backgroundColor?: string;
}

const ContinentHeader: React.FC<ContinentHeaderProps> = ({ title, count }) => {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #1D4ED8 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 3px 10px rgba(30,58,138,0.35)',
        px: 3,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography
        sx={{
          color: '#fff',
          fontWeight: 800,
          fontSize: '1.5rem',
          letterSpacing: '0.3px',
          textShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        {title}
      </Typography>

      {count > 0 && (
        <Box
          sx={{
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: '100px',
            px: 1.5,
            py: 0.4,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
            Apoyando {count} misioneros
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ContinentHeader;
