import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { Box, Button, CircularProgress, Typography, Chip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { Missionary as MissionaryType } from '../types';
import ContactDialog from './components/ContactDialog';
import MissionaryLocalInfo from './components/MissionaryLocalInfo';
import ImageLightbox from './components/ImageLightbox';
import returnToMap from '../assets/backToMapButton.png';
import iblLogo from '../assets/ibl_logo.png';
import outputs from '../../amplify_outputs.json';
import { resolveUrl } from '../storageUrl';

Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0]);

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const API_ENDPOINT = (outputs as { custom?: { API?: { endpoint?: string } } })?.custom?.API?.endpoint ?? '';

const CONTINENT_ROUTES: Record<string, string> = {
  'north-america': '/norte-america',
  'central-america': '/centro-america',
  'south-america': '/sur-america',
  'europe': '/europa',
  'africa': '/africa',
  'asia': '/asia',
  'oceania': '/oceania',
};

const DEFAULTS: MissionaryType = {
  id: '', name: '', lastName: '', organization: '', continent: '',
  location: { city: '', country: '', latitude: 0, longitude: 0 },
  description: '', media: [], contactInfo: [], missionType: '',
};

type Section = 'about' | 'carta';

const formatStartDate = (date: string): string => {
  if (/^\d{4}$/.test(date)) return date;
  if (/^\d{4}-\d{2}$/.test(date)) {
    const d = new Date(`${date}-01T12:00:00`);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  const d = new Date(`${date}T12:00:00`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const Missionary: React.FC = () => {
  const { missionary: missionaryId } = useParams<{ missionary: string }>();
  const navigate = useNavigate();
  const photosRef = useRef<HTMLDivElement>(null);

  const [missionaryData, setMissionaryData] = useState<MissionaryType>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<Section>('about');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resolvedProfileImage, setResolvedProfileImage] = useState('/default-missionary.svg');
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!missionaryId) { setLoading(false); return; }
    const fetchMissionary = async () => {
      try {
        const res = await fetch(`${API_ENDPOINT}missionaries/${missionaryId}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: Partial<MissionaryType> = await res.json();
        setMissionaryData({ ...DEFAULTS, ...data });
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchMissionary();
  }, [missionaryId]);

  // Resolve profile image
  useEffect(() => {
    resolveUrl(missionaryData.profileImage, '/default-missionary.svg').then(setResolvedProfileImage);
  }, [missionaryData.profileImage]);

  // Resolve all media photos
  useEffect(() => {
    if (missionaryData.media.length === 0) { setResolvedMediaUrls([]); return; }
    Promise.all(missionaryData.media.map((item) => resolveUrl(item.url, ''))).then((urls) =>
      setResolvedMediaUrls(urls.filter(Boolean))
    );
  }, [missionaryData.media]);

  // Resolve prayer letter URL (S3 key → signed URL, or use directly if already a full URL)
  useEffect(() => {
    resolveUrl(missionaryData.prayerLetter, '').then((url) => setPdfUrl(url || null));
  }, [missionaryData.prayerLetter]);

  const scrollToPhotos = () => {
    setActiveSection('about');
    setTimeout(() => photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const m = missionaryData;
  const displayName = [m.name, m.lastName].filter(Boolean).join(' ');
  const hasMedia = resolvedMediaUrls.length > 0;
  const hasPrayerLetter = !!pdfUrl;
  const hasContactInfo = m.contactInfo.length > 0;
  const locationText = [m.location?.city, m.location?.state, m.location?.country].filter(Boolean).join(', ');
  const continentRoute = m.continent ? (CONTINENT_ROUTES[m.continent] ?? null) : null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#F0F4F8' }}>
        <CircularProgress sx={{ color: '#2563EB' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#F0F4F8', gap: 2 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => navigate(-1)}
          sx={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', color: 'white' }}>
          Volver
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', width: '100%', background: 'linear-gradient(180deg, #F0F4F8 0%, #E8F1FC 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* ── STICKY NAVBAR ─────────────────────────────────────────────────── */}
      <Box component="nav" sx={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #1D4ED8 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(30,58,138,0.45)',
        px: { xs: 2, md: 4 },
        py: { xs: 1, md: 1.25 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 0.75, md: 3 },
      }}>
        {/* Identity row — always */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 3 }, flex: { md: 1 }, minWidth: 0 }}>
          <Box
            component="img"
            src={resolvedProfileImage}
            alt={displayName}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-missionary.svg'; }}
            sx={{
              width: { xs: 42, md: 52 }, height: { xs: 42, md: 52 },
              borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
              border: '2.5px solid rgba(255,255,255,0.45)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName || 'Misionero'}
            </Typography>
            {m.missionType && (
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: { xs: '0.78rem', md: '0.85rem' }, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.missionType}
              </Typography>
            )}
          </Box>

          {/* Back to continent — mobile top-right */}
          {continentRoute && (
            <IconButton
              onClick={() => navigate(continentRoute)}
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                color: '#fff', bgcolor: 'rgba(255,255,255,0.12)', flexShrink: 0,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                '&:active': { bgcolor: 'rgba(255,255,255,0.32)' },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
        </Box>

        {/* Mobile tab row — hidden on desktop */}
        <Box sx={{ position: 'relative', display: { xs: 'block', md: 'none' } }}>
          <Box sx={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, zIndex: 1,
            pointerEvents: 'none',
            background: 'linear-gradient(to right, transparent, rgba(30,58,138,0.72))',
            borderRadius: '0 8px 8px 0',
          }} />
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.25,
            overflowX: 'auto', bgcolor: 'rgba(0,0,0,0.18)', borderRadius: '8px',
            px: 0.5, py: 0.25,
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            {([
              { label: 'Sobre el Misionero', icon: <InfoOutlinedIcon sx={{ fontSize: '1rem' }} />, active: activeSection === 'about', onClick: () => setActiveSection('about') },
              ...(hasMedia ? [{ label: 'Fotos', icon: <PhotoLibraryOutlinedIcon sx={{ fontSize: '1rem' }} />, active: false, onClick: scrollToPhotos }] : []),
              ...(hasPrayerLetter ? [{ label: 'Carta de Oración', icon: <ArticleOutlinedIcon sx={{ fontSize: '1rem' }} />, active: activeSection === 'carta', onClick: () => { setActiveSection('carta'); setPageNumber(1); } }] : []),
              ...(hasContactInfo ? [{ label: 'Contactar', icon: <ContactMailOutlinedIcon sx={{ fontSize: '1rem' }} />, active: false, onClick: () => setContactDialogOpen(true) }] : []),
            ] as { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }[]).map((tab, i) => (
              <Box
                key={i}
                component="button"
                onClick={tab.onClick}
                sx={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 0.6, flexShrink: 0,
                  color: tab.active ? '#fff' : 'rgba(255,255,255,0.65)',
                  fontWeight: tab.active ? 700 : 500, fontSize: '0.88rem',
                  px: 1.25, py: 0.75, borderRadius: '6px',
                  borderBottom: tab.active ? '2px solid #fff' : '2px solid transparent',
                  transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                  '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {tab.icon}
                {tab.label}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── ABOUT SECTION ─────────────────────────────────────────────────── */}
      {activeSection === 'about' && (
        <Box sx={{ flex: 1, maxWidth: 920, mx: 'auto', width: '100%', pl: { xs: 2, md: 3 }, pr: { xs: 2, md: '134px' }, py: { xs: 2.5, md: 4 } }}>

          {/* Info chips row */}
          {(locationText || m.organization || m.startDate) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 4, justifyContent: 'center' }}>
              {locationText && (
                <Chip
                  label={`📍 ${locationText}`}
                  sx={{ bgcolor: '#fff', border: '1.5px solid rgba(37,99,235,0.2)', color: '#1E3A8A', fontWeight: 600, fontSize: { xs: '0.9rem', md: '0.95rem' }, height: 40, px: 0.5, boxShadow: '0 2px 10px rgba(30,58,138,0.12)' }}
                />
              )}
              {m.organization && (
                <Chip
                  label={`🏛 ${m.organization}`}
                  sx={{ bgcolor: '#fff', border: '1.5px solid rgba(37,99,235,0.2)', color: '#1E3A8A', fontWeight: 600, fontSize: { xs: '0.9rem', md: '0.95rem' }, height: 40, px: 0.5, boxShadow: '0 2px 10px rgba(30,58,138,0.12)' }}
                />
              )}
              {m.startDate && (
                <Chip
                  label={`📅 Sirviendo desde ${formatStartDate(m.startDate)}`}
                  sx={{ bgcolor: '#fff', border: '1.5px solid rgba(37,99,235,0.2)', color: '#1E3A8A', fontWeight: 600, fontSize: { xs: '0.9rem', md: '0.95rem' }, height: 40, px: 0.5, boxShadow: '0 2px 10px rgba(30,58,138,0.12)' }}
                />
              )}
            </Box>
          )}

          {/* Description */}
          {m.description && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ color: '#1E3A8A', fontWeight: 800, fontSize: '1.2rem', mb: 1.25 }}>
                Descripción
              </Typography>
              <Box sx={{
                bgcolor: '#fff', borderRadius: '16px', p: 3.5,
                borderLeft: '5px solid #2563EB',
                boxShadow: '0 4px 24px rgba(30,58,138,0.08)',
              }}>
                <Typography sx={{ color: '#374151', fontSize: '1.05rem', lineHeight: 1.8, fontWeight: 400 }}>
                  {m.description}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Special notes */}
          {m.specialNotes && (
            <Box sx={{
              bgcolor: 'rgba(37,99,235,0.06)', borderRadius: '12px', p: 2.5, mb: 3,
              border: '1px solid rgba(37,99,235,0.15)',
            }}>
              <Typography sx={{ color: '#1E3A8A', fontWeight: 700, fontSize: '0.85rem', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Notas
              </Typography>
              <Typography sx={{ color: '#374151', fontSize: '0.95rem', lineHeight: 1.7 }}>
                {m.specialNotes}
              </Typography>
            </Box>
          )}

          {/* Location map */}
          {m.location?.latitude !== 0 && m.location?.longitude !== 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ color: '#1E3A8A', fontWeight: 800, fontSize: '1.2rem', mb: 1.25 }}>
                Ubicación
              </Typography>
              <Box sx={{
                borderRadius: '16px', overflow: 'hidden', height: 280,
                boxShadow: '0 4px 24px rgba(30,58,138,0.12)',
                border: '2px solid rgba(37,99,235,0.1)',
              }}>
                <MapContainer
                  center={[m.location.latitude, m.location.longitude]}
                  zoom={5}
                  scrollWheelZoom={false}
                  zoomControl={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <Marker
                    position={[m.location.latitude, m.location.longitude]}
                    icon={L.divIcon({
                      className: '',
                      html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 2px 10px rgba(30,58,138,0.5);"></div>`,
                      iconSize: [18, 18],
                      iconAnchor: [9, 9],
                    })}
                  />
                </MapContainer>
              </Box>
            </Box>
          )}

          {/* Local time & weather */}
          {m.location?.latitude !== 0 && m.location?.longitude !== 0 && (
            <MissionaryLocalInfo
              latitude={m.location.latitude}
              longitude={m.location.longitude}
            />
          )}

          {/* Photo gallery */}
          {hasMedia && (
            <Box ref={photosRef} sx={{ mt: 2 }}>
              <Typography sx={{ color: '#1E3A8A', fontWeight: 800, fontSize: '1.2rem', mb: 2.5, pb: 1, borderBottom: '2px solid rgba(37,99,235,0.15)' }}>
                Fotos
              </Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(220px, 1fr))' },
                gap: 2,
              }}>
                {resolvedMediaUrls.map((url, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={url}
                    alt={m.media[i]?.title || `Foto ${i + 1}`}
                    onClick={() => setLightboxIndex(i)}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    sx={{
                      width: '100%', aspectRatio: '4/3', objectFit: 'cover',
                      borderRadius: '12px',
                      boxShadow: '0 4px 16px rgba(30,58,138,0.15)',
                      border: '2px solid rgba(255,255,255,0.8)',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      '&:hover': { transform: 'scale(1.03)', boxShadow: '0 8px 28px rgba(30,58,138,0.25)' },
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ── CARTA DE ORACIÓN SECTION ──────────────────────────────────────── */}
      {activeSection === 'carta' && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pl: 3, pr: { xs: 3, md: '134px' }, py: 4 }}>
          <Typography sx={{ color: '#1E3A8A', fontWeight: 800, fontSize: '1.3rem', mb: 3 }}>
            Carta de Oración
          </Typography>

          {pdfUrl ? (
            <Box sx={{ width: '100%', maxWidth: 700 }}>
              <Box sx={{
                bgcolor: '#fff', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 8px 40px rgba(30,58,138,0.15)',
                border: '2px solid rgba(37,99,235,0.1)',
              }}>
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
                  loading={
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                      <CircularProgress sx={{ color: '#2563EB' }} />
                    </Box>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    width={Math.min(660, window.innerWidth - (window.innerWidth < 768 ? 32 : 80))}
                  />
                </Document>
              </Box>

              {numPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2.5 }}>
                  <Button
                    onClick={() => setPageNumber(p => Math.max(p - 1, 1))}
                    disabled={pageNumber <= 1}
                    variant="outlined"
                    sx={{ borderColor: '#2563EB', color: '#2563EB', minWidth: 40, '&:hover': { bgcolor: 'rgba(37,99,235,0.06)' } }}
                  >
                    ←
                  </Button>
                  <Typography sx={{ color: '#4B5563', fontWeight: 600 }}>
                    {pageNumber} / {numPages}
                  </Typography>
                  <Button
                    onClick={() => setPageNumber(p => Math.min(p + 1, numPages))}
                    disabled={pageNumber >= numPages}
                    variant="outlined"
                    sx={{ borderColor: '#2563EB', color: '#2563EB', minWidth: 40, '&:hover': { bgcolor: 'rgba(37,99,235,0.06)' } }}
                  >
                    →
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', color: '#9CA3AF', py: 8 }}>
              <Typography>No hay carta de oración disponible.</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── BACK BUTTONS ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2.5, pr: { xs: 0, md: '110px' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
          {continentRoute && (
            <Button
              onClick={() => navigate(continentRoute)}
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                color: '#1E3A8A', borderColor: 'rgba(30,58,138,0.35)',
                px: 3.5, py: 1.25, borderRadius: '28px',
                fontSize: '0.95rem', fontWeight: 600,
                '&:hover': { borderColor: '#1E3A8A', bgcolor: 'rgba(30,58,138,0.06)' },
              }}
            >
              Volver al continente
            </Button>
          )}
          <Box
            component="img"
            src={returnToMap}
            alt="Volver al mapa"
            onClick={() => navigate('/region-selection')}
            sx={{
              height: 60, width: 'auto', cursor: 'pointer',
              transition: 'transform 0.25s ease',
              '&:hover': { transform: 'scale(1.06)' },
            }}
          />
        </Box>
        <Box component="img" src={iblLogo} alt="IBL" sx={{ height: 44, width: 'auto', opacity: 0.55 }} />
      </Box>

      {/* ── FLOATING SIDE NAV — desktop only ──────────────────────────────── */}
      <Box sx={{
        position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
        zIndex: 998, display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
        bgcolor: 'rgba(20,46,120,0.95)', backdropFilter: 'blur(10px)',
        borderRadius: '18px 0 0 18px',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.28)',
        overflow: 'hidden',
      }}>
        {(
          [
            {
              label: 'Sobre el\nMisionero',
              icon: <InfoOutlinedIcon sx={{ fontSize: '2.2rem' }} />,
              active: activeSection === 'about',
              onClick: () => setActiveSection('about'),
            },
            ...(hasMedia ? [{
              label: 'Fotos',
              icon: <PhotoLibraryOutlinedIcon sx={{ fontSize: '2.2rem' }} />,
              active: false,
              onClick: scrollToPhotos,
            }] : []),
            ...(hasPrayerLetter ? [{
              label: 'Carta\nde Oración',
              icon: <ArticleOutlinedIcon sx={{ fontSize: '2.2rem' }} />,
              active: activeSection === 'carta',
              onClick: () => { setActiveSection('carta'); setPageNumber(1); },
            }] : []),
            ...(hasContactInfo ? [{
              label: 'Contactar',
              icon: <ContactMailOutlinedIcon sx={{ fontSize: '2.2rem' }} />,
              active: false,
              onClick: () => setContactDialogOpen(true),
            }] : []),
          ] as { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }[]
        ).map((item, i, arr) => (
          <Box
            key={i}
            onClick={item.onClick}
            sx={{
              display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              px: 2.5, py: 2.5, gap: 1, cursor: 'pointer', minWidth: 110,
              bgcolor: item.active ? 'rgba(255,255,255,0.2)' : 'transparent',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              transition: 'background-color 0.15s ease',
              '&:hover': { bgcolor: item.active ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.12)' },
              '&:active': { bgcolor: 'rgba(255,255,255,0.35)' },
            }}
          >
            <Box sx={{ color: item.active ? '#fff' : 'rgba(255,255,255,0.82)' }}>{item.icon}</Box>
            <Typography sx={{
              color: item.active ? '#fff' : 'rgba(255,255,255,0.75)',
              fontSize: '0.72rem', fontWeight: item.active ? 700 : 600,
              textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line',
            }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <ContactDialog
        open={contactDialogOpen}
        missionary={m}
        onClose={() => setContactDialogOpen(false)}
      />

      {lightboxIndex !== null && (
        <ImageLightbox
          images={resolvedMediaUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </Box>
  );
};

export default Missionary;
