import React from 'react';
import { Box, Typography } from '@mui/material';

interface ContinentHeaderProps {
  emoji: string;
  title: string;
  count: number;
  color: string;
  backgroundColor: string;
}

const ContinentHeader: React.FC<ContinentHeaderProps> = ({ emoji, title, count, color, backgroundColor }) => {
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${backgroundColor} 0%, ${color === '#1E40AF' ? '#EFF6FF' : backgroundColor} 100%)`,
        borderBottom: `4px solid ${color}`,
        p: 2,
        mb: 2,
        boxShadow: `0 4px 12px ${color}22`,
      }}
    >
      <h1 style={{ color: color, margin: 0, marginBottom: '0.25rem', fontSize: '1.75rem' }}>
        {emoji} {title}
      </h1>
      <Typography variant="caption" sx={{ color: color, fontSize: '0.9rem', fontWeight: 500 }}>
        {count} misioneros activos
      </Typography>
    </Box>
  );
};

export default ContinentHeader;
