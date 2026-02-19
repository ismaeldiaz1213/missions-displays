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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Section with Family Picture - Navigation Style */}
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
              src={missionaryData.profileImage}
              alt={missionaryData.name}
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
              {missionaryData.name} {missionaryData.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 500 }}>
              {missionaryData.missionType}
            </Typography>
          </Grid2>
        </Grid2>
      </Box>

      {/* Main 3-Column Content Section */}
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3, flex: 1 }}>
        <Grid2 container spacing={3}>
          {/* Left Column: Missionary Info */}
          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
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
                  {missionaryData.organization}
                </Typography>
              </Box>

              <Box sx={{ mb: 2.5 }}>
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontSize: '0.85rem', mb: 0.5 }}>
                  UBICACIÓN
                </Typography>
                <Typography variant="body1" sx={{ color: '#1F2937', fontWeight: 500 }}>
                  📍 {missionaryData.location.city}, {missionaryData.location.country}
                </Typography>
              </Box>

              <Box sx={{ mb: 2.5 }}>
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontSize: '0.85rem', mb: 0.5 }}>
                  TIPO DE MINISTERIO
                </Typography>
                <Typography variant="body1" sx={{ color: '#1F2937', fontWeight: 500 }}>
                  {missionaryData.missionType}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: '#4B5563', lineHeight: 1.6 }}>
                  {missionaryData.description}
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
                onClick={() => setContactDialogOpen(true)}
              >
                📧 Contactar
              </Button>
            </Paper>
          </Grid2>

          {/* Middle Column: Photos Grid */}
          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
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
              {missionaryData.media.length > 0 ? (
                <ImageList cols={2} rowHeight={140} gap={12}>
                  {missionaryData.media.map((item, idx) => (
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
          </Grid2>

          {/* Right Column: Prayer Letter */}
          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
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
                  onLoadSuccess={onDocumentLoadSuccess}
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
                    onClick={goToPrevPage}
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
                    onClick={goToNextPage}
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
          </Grid2>
        </Grid2>
      </Box>

      {/* Footer Section: Comments and Back Button */}
      <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
        {missionaryData.specialNotes && (
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
              {missionaryData.specialNotes}
            </Typography>
          </Paper>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            sx={{
              background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              color: 'white',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              },
            }}
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
        </Box>
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