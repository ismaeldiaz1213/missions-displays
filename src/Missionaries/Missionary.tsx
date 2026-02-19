import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Grid2 from '@mui/material/Grid2';
import { pdfjs, Document, Page } from 'react-pdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import PublicIcon from '@mui/icons-material/Public';
import samplePdf from '../assets/2025_Junio_Carta_de_Oracion.pdf';
import { getMissionaryById } from '../mockData';
import { Missionary as MissionaryType } from '../types';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Missionary: React.FC = () => {
  const { missionary: missionaryId } = useParams<{ missionary: string }>();
  const navigate = useNavigate();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const missionaryData = getMissionaryById(missionaryId || '') || ({
    id: '1',
    name: 'Manuel',
    lastName: 'Robles',
    organization: 'Iglesia Bautista Libertad',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    description: 'Missionary information not found',
    media: [],
    contactInfo: [],
    location: { city: 'Unknown', country: 'Unknown', latitude: 0, longitude: 0 },
    continent: 'north-america',
    missionType: 'Unknown',
  } as MissionaryType);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevPage() {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <EmailIcon sx={{ mr: 1 }} />;
      case 'phone':
        return <PhoneIcon sx={{ mr: 1 }} />;
      case 'facebook':
        return <FacebookIcon sx={{ mr: 1 }} />;
      case 'instagram':
        return <InstagramIcon sx={{ mr: 1 }} />;
      case 'website':
        return <PublicIcon sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F4F8 100%)',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        pb: 3,
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          color: 'white',
          p: { xs: 2, md: 3 },
          mb: 3,
          boxShadow: '0 10px 30px rgba(30, 58, 138, 0.2)',
        }}
      >
        <Grid2 container spacing={2} alignItems="flex-start">
          <Grid2 size={{ xs: 12, sm: 4, md: 3 }}>
            <Box
              component="img"
              src={missionaryData.profileImage}
              alt={missionaryData.name}
              sx={{
                width: '100%',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                border: '4px solid rgba(255, 255, 255, 0.2)',
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 8, md: 9 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 'bold',
                mb: 1,
                color: '#fff',
                fontSize: { xs: '1.75rem', md: '2.5rem' },
              }}
            >
              {missionaryData.name} {missionaryData.lastName}
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
              {missionaryData.organization}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1.5 }}>
              📍 {missionaryData.location.city}, {missionaryData.location.country}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                sx={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1E3A8A',
                  fontWeight: 600,
                  '&:hover': {
                    background: '#fff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  },
                }}
                onClick={() => setContactDialogOpen(true)}
              >
                📧 Contactar
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: '#fff',
                    background: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate(-1)}
              >
                Atrás
              </Button>
            </Box>
          </Grid2>
        </Grid2>
      </Box>

      {/* Content Section */}
      <Box sx={{ px: { xs: 2, md: 3 } }}>
        <Paper
          sx={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(30, 58, 138, 0.1)',
            border: '1px solid rgba(30, 58, 138, 0.05)',
            p: 3,
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            📖 Acerca del Ministerio
          </Typography>
          <Typography variant="body1" sx={{ color: '#4B5563', mb: 3, lineHeight: 1.8 }}>
            {missionaryData.description}
          </Typography>

          {missionaryData.specialNotes && (
            <>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                ⭐ Notas Especiales
              </Typography>
              <Typography variant="body1" sx={{ color: '#4B5563' }}>
                {missionaryData.specialNotes}
              </Typography>
            </>
          )}
        </Paper>

        {/* Photos Section */}
        {missionaryData.media.length > 0 && (
          <Paper
            sx={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
              borderRadius: '12px',
              p: 3,
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
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
            <ImageList sx={{ mb: 2 }} cols={3} rowHeight={150} gap={12}>
              {missionaryData.media.map((item, idx) => (
                <ImageListItem key={idx}>
                  <img
                    srcSet={`${item.url}?w=200&h=200&fit=crop&auto=format&dpr=2 2x`}
                    src={`${item.url}?w=200&h=200&fit=crop&auto=format`}
                    alt={item.title || `Foto ${idx + 1}`}
                    loading="lazy"
                    style={{
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(30, 58, 138, 0.1)',
                    }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          </Paper>
        )}

        {/* Prayer Letter */}
        <Paper
          sx={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
            borderRadius: '12px',
            p: 3,
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
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
              p: 2,
              mb: 2,
              maxHeight: '400px',
              overflow: 'auto',
            }}
          >
            <Document
              file={samplePdf}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<Typography sx={{ color: '#9CA3AF' }}>Cargando PDF...</Typography>}
            >
              <Page
                pageNumber={pageNumber}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                scale={0.8}
              />
            </Document>
          </Box>

          {numPages > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                sx={{
                  borderColor: '#1E3A8A',
                  color: '#1E3A8A',
                  '&:hover': {
                    borderColor: '#2563EB',
                    background: 'rgba(37, 99, 235, 0.05)',
                  },
                }}
              >
                ← Atrás
              </Button>
              <Typography
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6B7280',
                  fontWeight: 600,
                }}
              >
                {pageNumber} / {numPages}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                sx={{
                  borderColor: '#1E3A8A',
                  color: '#1E3A8A',
                  '&:hover': {
                    borderColor: '#2563EB',
                    background: 'rgba(37, 99, 235, 0.05)',
                  },
                }}
              >
                Siguiente →
              </Button>
            </Box>
          )}
        </Paper>

        {/* Prayer Request Box */}
        <Paper
          sx={{
            p: 2.5,
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            border: '2px solid #F59E0B',
            borderRadius: '12px',
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
            🙏 Cómo Orar
          </Typography>
          <Typography variant="body2" sx={{ color: '#78350F' }}>
            Únete a nosotros en oración por {missionaryData.name} y su ministerio. Ora por su
            fortaleza, dirección divina, y un impacto duradero en las comunidades a las que sirven.
          </Typography>
        </Paper>
      </Box>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          📞 Información de Contacto
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {missionaryData.contactInfo.length > 0 ? (
            <Box>
              {missionaryData.contactInfo.map((contact, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    p: 1.5,
                    background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#2563EB',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
                    },
                  }}
                >
                  <Box sx={{ color: '#2563EB', display: 'flex', alignItems: 'center' }}>
                    {getContactIcon(contact.type)}
                  </Box>
                  {contact.type === 'email' ? (
                    <Link
                      href={`mailto:${contact.value}`}
                      sx={{
                        color: '#2563EB',
                        textDecoration: 'none',
                        fontWeight: 500,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {contact.value}
                    </Link>
                  ) : contact.type === 'phone' ? (
                    <Link
                      href={`tel:${contact.value}`}
                      sx={{
                        color: '#2563EB',
                        textDecoration: 'none',
                        fontWeight: 500,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {contact.value}
                    </Link>
                  ) : (
                    <Link
                      href={contact.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: '#2563EB',
                        textDecoration: 'none',
                        fontWeight: 500,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {contact.value}
                    </Link>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: '#9CA3AF' }}>
              No hay información de contacto disponible.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setContactDialogOpen(false)}
            sx={{
              color: '#2563EB',
              fontWeight: 600,
              '&:hover': {
                background: 'rgba(37, 99, 235, 0.05)',
              },
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Missionary;