import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Document, Page } from 'react-pdf';
import samplePdf from '../../assets/2025_Junio_Carta_de_Oracion.pdf';

interface MissionaryPrayerLetterProps {
  numPages: number;
  pageNumber: number;
  onLoadSuccess: (data: { numPages: number }) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

const MissionaryPrayerLetter: React.FC<MissionaryPrayerLetterProps> = ({
  numPages,
  pageNumber,
  onLoadSuccess,
  onNextPage,
  onPrevPage,
}) => {
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
        ✉️ Carta de Oración
      </Typography>
      <Box
        sx={{
          backgroundColor: '#f9fafb',
          border: '2px solid #E5E7EB',
          borderRadius: '8px',
          p: 1,
          mb: 2,
          maxHeight: '380px',
          overflow: 'auto',
        }}
      >
        <Document
          file={samplePdf}
          onLoadSuccess={onLoadSuccess}
          loading={<Typography sx={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Cargando PDF...</Typography>}
        >
          <Page
            pageNumber={pageNumber}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            scale={0.6}
          />
        </Document>
      </Box>

      {numPages > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onPrevPage}
            disabled={pageNumber <= 1}
            sx={{
              borderColor: '#1E3A8A',
              color: '#1E3A8A',
              fontSize: '0.75rem',
              padding: '4px 8px',
              '&:hover': {
                borderColor: '#2563EB',
                background: 'rgba(37, 99, 235, 0.05)',
              },
            }}
          >
            ←
          </Button>
          <Typography
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: '#6B7280',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {pageNumber}/{numPages}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={onNextPage}
            disabled={pageNumber >= numPages}
            sx={{
              borderColor: '#1E3A8A',
              color: '#1E3A8A',
              fontSize: '0.75rem',
              padding: '4px 8px',
              '&:hover': {
                borderColor: '#2563EB',
                background: 'rgba(37, 99, 235, 0.05)',
              },
            }}
          >
            →
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default MissionaryPrayerLetter;
