import React from 'react';
import { Paper, Typography } from '@mui/material';

interface MissionaryNotesProps {
  notes: string | undefined;
}

const MissionaryNotes: React.FC<MissionaryNotesProps> = ({ notes }) => {
  if (!notes) return null;

  return (
    <Paper
      sx={{
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        border: '2px solid #F59E0B',
        borderRadius: '12px',
        p: 2.5,
        mb: 2,
        boxShadow: '0 4px 15px rgba(217, 119, 6, 0.15)',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 'bold',
          color: '#92400E',
          mb: 1,
        }}
      >
        ⭐ Comentarios Adicionales
      </Typography>
      <Typography variant="body2" sx={{ color: '#78350F', lineHeight: 1.6 }}>
        {notes}
      </Typography>
    </Paper>
  );
};

export default MissionaryNotes;
