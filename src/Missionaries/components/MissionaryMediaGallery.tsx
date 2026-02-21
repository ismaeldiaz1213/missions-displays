import React from 'react';
import { Paper, Typography, ImageList, ImageListItem } from '@mui/material';
import { Missionary } from '../../types';

interface MissionaryMediaGalleryProps {
  missionary: Missionary;
}

const MissionaryMediaGallery: React.FC<MissionaryMediaGalleryProps> = ({ missionary }) => {
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
        🖼️ Fotos
      </Typography>
      {missionary.media.length > 0 ? (
        <ImageList cols={2} rowHeight={140} gap={12}>
          {missionary.media.map((item, idx) => (
            <ImageListItem key={idx} sx={{ aspectRatio: '16/9' }}>
              <img
                srcSet={`${item.url}?w=200&h=200&fit=crop&auto=format&dpr=2 2x`}
                src={`${item.url}?w=200&h=200&fit=crop&auto=format`}
                alt={item.title || `Foto ${idx + 1}`}
                loading="lazy"
                style={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(30, 58, 138, 0.1)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'rgba(30, 58, 138, 0.1)',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </ImageListItem>
          ))}
        </ImageList>
      ) : (
        <Typography sx={{ color: '#9CA3AF', textAlign: 'center', py: 3 }}>
          No hay fotos disponibles
        </Typography>
      )}
    </Paper>
  );
};

export default MissionaryMediaGallery;
