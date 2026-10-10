import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublicIcon from '@mui/icons-material/Public';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { QRCodeSVG } from 'qrcode.react';
import type { Missionary as MissionaryType } from '../types';
import ContactDialog from './components/ContactDialog';
import MissionaryLocalInfo from './components/MissionaryLocalInfo';
import ImageLightbox from './components/ImageLightbox';
import VideoPlayer from './components/VideoPlayer';
import LocationGlobe from './components/LocationGlobe';
import iblLogo from '../assets/ibl_logo.png';
import { isVideoPath, resolveUrl } from '../storageUrl';
import { getMissionary } from '../data/missionaries';
import { useCachedLoad } from '../data/useCachedLoad';
import { publicUrlFor } from '../siteUrl';
import { HOUSTON_LAT, HOUSTON_LON, distanceKm } from '../constants';
import './missionaryStyle.css';
import KioskRail from '../ui/KioskRail';
import { cardSx } from '../ui/brand';

const PrayerLetterDialog = lazy(() => import('./components/PrayerLetterDialog'));

const CONTINENTS: Record<string, { route: string; name: string }> = {
  'north-america': { route: '/norte-america', name: 'Norte América' },
  'central-america': { route: '/centro-america', name: 'Centro América' },
  'south-america': { route: '/sur-america', name: 'Sur América' },
  'europe': { route: '/europa', name: 'Europa' },
  'africa': { route: '/africa', name: 'África' },
  'asia': { route: '/asia', name: 'Asia' },
  'oceania': { route: '/oceania', name: 'Oceanía' },
};

const DEFAULTS: MissionaryType = {
  id: '', name: '', lastName: '', organization: '', continent: '',
  location: { city: '', country: '', latitude: 0, longitude: 0 },
  description: '', media: [], contactInfo: [], missionType: '',
};

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

const scrollToId = (id: string) => {
  if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** Which section is on screen, for the rail's highlight. */
const useActiveSection = (ids: string[]) => {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(',');
  useEffect(() => {
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
      const first = ids.find((id) => visible.get(id));
      if (first) setActive(first);
    }, { rootMargin: '-35% 0px -55% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
};

const SectionTitle: React.FC<{ children: React.ReactNode; count?: number }> = ({ children, count }) => (
  <Typography component="h2" sx={{ color: '#0F172A', fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
    {children}
    {count !== undefined && (
      <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563EB', bgcolor: '#DBEAFE', px: 1.2, py: 0.3, borderRadius: '999px' }}>
        {count}
      </Box>
    )}
  </Typography>
);

const HeroPill: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderRadius: '999px',
    bgcolor: 'rgba(255,255,255,0.85)', border: '1px solid #DBEAFE',
    color: '#1E3A8A', fontWeight: 600, fontSize: { xs: '0.85rem', md: '0.95rem' },
    boxShadow: '0 2px 8px rgba(30,58,138,0.06)',
    '& svg': { fontSize: '1.1rem', color: '#2563EB' },
  }}>
    {icon}{children}
  </Box>
);

interface Action { key: string; label: string; railLabel: string; icon: React.ReactNode; onClick: () => void; section?: string }

const Missionary: React.FC = () => {
  const { missionary: missionaryId } = useParams<{ missionary: string }>();
  const navigate = useNavigate();

  // Saved copy first (instant on slow Wi-Fi), then refreshed from the network
  const { data, loading, error } = useCachedLoad(missionaryId ? `missionary:${missionaryId}` : null, () => getMissionary(missionaryId!));
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [profileUrl, setProfileUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const m: MissionaryType = { ...DEFAULTS, ...data };

  useEffect(() => {
    resolveUrl(m.profileImage, '').then(setProfileUrl);
  }, [m.profileImage]);

  useEffect(() => {
    Promise.all(m.media.filter((item) => !isVideoPath(item.url)).map((item) => resolveUrl(item.url, '')))
      .then((urls) => setPhotoUrls(urls.filter(Boolean)));
  }, [m.media]);

  useEffect(() => {
    resolveUrl(m.prayerLetter, '').then((url) => setPdfUrl(url || null));
  }, [m.prayerLetter]);

  const displayName = [m.name, m.lastName].filter(Boolean).join(' ');
  const videos = m.media.filter((item) => isVideoPath(item.url));
  const hasPhotos = photoUrls.length > 0;
  const hasVideos = videos.length > 0;
  const hasContactInfo = m.contactInfo.length > 0;
  const hasAbout = !!(m.description || m.specialNotes);
  const locationText = [m.location?.city, m.location?.state, m.location?.country].filter(Boolean).join(', ');
  const hasCoords = !!m.location && m.location.latitude !== 0 && m.location.longitude !== 0;
  const continent = m.continent ? CONTINENTS[m.continent] : undefined;
  const kmFromHouston = hasCoords ? distanceKm(HOUSTON_LAT, HOUSTON_LON, m.location.latitude, m.location.longitude) : 0;

  const actions: Action[] = [
    ...(hasVideos ? [{ key: 'videos', section: 'videos', label: videos.length > 1 ? 'Ver videos' : 'Ver video', railLabel: videos.length > 1 ? 'Videos' : 'Video', icon: <PlayCircleOutlineIcon />, onClick: () => scrollToId('videos') }] : []),
    ...(hasPhotos ? [{ key: 'fotos', section: 'fotos', label: `Fotos (${photoUrls.length})`, railLabel: 'Fotos', icon: <PhotoLibraryOutlinedIcon />, onClick: () => scrollToId('fotos') }] : []),
    ...(pdfUrl ? [{ key: 'carta', label: 'Carta de oración', railLabel: 'Carta de\noración', icon: <ArticleOutlinedIcon />, onClick: () => setLetterOpen(true) }] : []),
    ...(hasContactInfo ? [{ key: 'contacto', label: 'Contactar', railLabel: 'Contactar', icon: <ContactMailOutlinedIcon />, onClick: () => setContactDialogOpen(true) }] : []),
  ];
  const railItems: Action[] = [
    { key: 'top', section: 'top', label: 'Inicio', railLabel: hasAbout ? 'Sobre\nellos' : 'Inicio', icon: <InfoOutlinedIcon />, onClick: () => scrollToId('top') },
    ...actions.slice(0, hasVideos && hasPhotos ? 2 : hasVideos || hasPhotos ? 1 : 0),
    ...(hasCoords ? [{ key: 'ubicacion', section: 'ubicacion', label: 'Dónde sirven', railLabel: 'Dónde\nsirven', icon: <TravelExploreIcon />, onClick: () => scrollToId('ubicacion') }] : []),
    ...actions.slice(hasVideos && hasPhotos ? 2 : hasVideos || hasPhotos ? 1 : 0),
  ];
  const activeSection = useActiveSection(railItems.filter((r) => r.section).map((r) => r.section!));

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#F4F7FB' }}>
        <CircularProgress sx={{ color: '#2563EB' }} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#F4F7FB', gap: 2, px: 3, textAlign: 'center' }}>
        <Typography sx={{ color: '#334155', fontWeight: 700, fontSize: '1.2rem' }}>
          {error ? 'No pudimos cargar esta página. Revise la conexión a internet.' : 'Misionero no encontrado'}
        </Typography>
        <Button variant="contained" size="large" startIcon={<PublicIcon />} onClick={() => navigate('/region-selection')}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', px: 3, bgcolor: '#1E3A8A' }}>
          Volver al mapa
        </Button>
      </Box>
    );
  }

  const goBack = () => navigate(continent?.route ?? '/region-selection');

  return (
    <Box id="top" sx={{ minHeight: '100vh', width: '100%', bgcolor: '#F4F7FB', display: 'flex', flexDirection: 'column' }}>

      {/* ── MOBILE TOP BAR (the kiosk uses the side rail instead) ────────── */}
      <Box component="nav" sx={{
        position: 'sticky', top: 0, zIndex: 1000, display: { xs: 'flex', md: 'none' },
        bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'saturate(180%) blur(14px)',
        borderBottom: '1px solid rgba(15,23,42,0.08)', px: 1.5, py: 1, alignItems: 'center', gap: 1,
      }}>
        <Button onClick={goBack} startIcon={<ArrowBackIcon />} sx={{
          textTransform: 'none', fontWeight: 700, color: '#1E3A8A', bgcolor: '#EFF6FF', borderRadius: '999px', px: 1.75, py: 1,
        }}>
          {continent ? continent.name : 'Volver'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={() => navigate('/region-selection')} startIcon={<PublicIcon />} sx={{
          textTransform: 'none', fontWeight: 700, color: '#fff', bgcolor: '#1E3A8A', borderRadius: '999px', px: 1.75, py: 1,
          '&:hover': { bgcolor: '#2563EB' },
        }}>
          Mapa
        </Button>
      </Box>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <Box component="header" sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#EFF6FF' }}>
        {profileUrl && (
          <Box component="img" src={profileUrl} alt="" aria-hidden sx={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            filter: 'blur(48px) saturate(1.3)', transform: 'scale(1.2)', opacity: 0.55,
          }} />
        )}
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(100deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.82) 45%, rgba(239,246,255,0.55) 100%)',
        }} />

        <Box sx={{
          position: 'relative', maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 4 }, pr: { md: '150px', xl: 4 }, py: { xs: 3, md: 6 },
          display: 'grid', gap: { xs: 3, md: 5 }, alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: profileUrl ? 'minmax(0, 1fr) minmax(0, 1.05fr)' : '1fr' },
        }}>
          {/* Family photo — tap to see it full screen */}
          {profileUrl && (
            <ButtonBase
              onClick={() => setLightbox({ images: [profileUrl], index: 0 })}
              aria-label="Ver la foto en grande"
              sx={{
                order: { xs: 0, md: 2 }, position: 'relative', justifySelf: 'center', borderRadius: '22px', overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(30,58,138,0.25)', border: '5px solid #fff',
                '&:hover img': { transform: 'scale(1.03)' },
              }}
            >
              <Box component="img" src={profileUrl} alt={displayName}
                onError={() => setProfileUrl('')}
                sx={{
                  display: 'block', maxWidth: '100%', maxHeight: { xs: 300, md: 440 }, width: 'auto', height: 'auto',
                  transition: 'transform 0.4s ease',
                }} />
              <Box sx={{
                position: 'absolute', right: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.75, py: 0.9, borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.95)', color: '#1E3A8A',
                fontSize: '0.95rem', fontWeight: 800, boxShadow: '0 4px 14px rgba(15,23,42,0.2)',
              }}>
                <OpenInFullIcon sx={{ fontSize: '1.05rem' }} /> Ver foto
              </Box>
            </ButtonBase>
          )}

          <Box sx={{ order: 1, textAlign: { xs: 'center', md: profileUrl ? 'left' : 'center' } }}>
            {m.missionType && (
              <Typography sx={{ color: '#B45309', fontWeight: 800, fontSize: { xs: '0.8rem', md: '0.9rem' }, letterSpacing: '0.14em', textTransform: 'uppercase', mb: 1 }}>
                {m.missionType}
              </Typography>
            )}
            <Typography component="h1" sx={{
              color: '#0F1E46', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em',
              fontSize: { xs: '2.1rem', sm: '2.6rem', md: '3.4rem' },
            }}>
              {displayName || 'Misionero'}
            </Typography>

            {(locationText || m.organization || m.startDate) && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2.5, justifyContent: { xs: 'center', md: profileUrl ? 'flex-start' : 'center' } }}>
                {locationText && <HeroPill icon={<PlaceOutlinedIcon />}>{locationText}</HeroPill>}
                {m.organization && <HeroPill icon={<ApartmentOutlinedIcon />}>{m.organization}</HeroPill>}
                {m.startDate && <HeroPill icon={<EventOutlinedIcon />}>Sirviendo desde {formatStartDate(m.startDate)}</HeroPill>}
              </Box>
            )}

            {actions.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: { xs: 3, md: 4 }, justifyContent: { xs: 'center', md: profileUrl ? 'flex-start' : 'center' } }}>
                {actions.map((a, i) => (
                  <Button key={a.key} onClick={a.onClick} startIcon={a.icon} sx={{
                    textTransform: 'none', fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.05rem' },
                    borderRadius: '999px', px: { xs: 2.25, md: 3 }, py: { xs: 1.1, md: 1.4 },
                    ...(i === 0
                      ? { bgcolor: '#2563EB', color: '#fff', boxShadow: '0 8px 22px rgba(37,99,235,0.35)', '&:hover': { bgcolor: '#1D4ED8' } }
                      : { color: '#1E3A8A', bgcolor: '#fff', border: '1.5px solid #BFDBFE', '&:hover': { bgcolor: '#EFF6FF', borderColor: '#2563EB' } }),
                  }}>
                    {a.label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1, width: '100%', maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 4 }, pr: { md: '150px', xl: 4 }, py: { xs: 3, md: 5 },
        display: 'grid', gap: { xs: 3, md: 4 }, alignItems: 'start',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px', lg: 'minmax(0, 1fr) 360px' },
        '& [id]': { scrollMarginTop: { xs: '84px', md: '24px' } },
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, md: 4 }, minWidth: 0 }}>
          {hasAbout && (
            <Box id="sobre" sx={cardSx}>
              {m.description && (
                <>
                  <SectionTitle>Sobre nosotros</SectionTitle>
                  <Typography sx={{ color: '#334155', fontSize: { xs: '1.05rem', md: '1.15rem' }, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                    {m.description}
                  </Typography>
                </>
              )}
              {m.specialNotes && (
                <Box sx={{ mt: m.description ? 3 : 0, p: 2.5, borderRadius: '14px', bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <Typography sx={{ color: '#92400E', fontWeight: 800, fontSize: '0.8rem', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Notas
                  </Typography>
                  <Typography sx={{ color: '#451A03', fontSize: '1rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {m.specialNotes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {hasVideos && (
            <Box id="videos">
              <SectionTitle count={videos.length > 1 ? videos.length : undefined}>{videos.length > 1 ? 'Videos' : 'Video'}</SectionTitle>
              <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: videos.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr' } }}>
                {videos.map((v, i) => (
                  <Box key={v.url} sx={{ gridColumn: { md: i === 0 && videos.length > 1 ? '1 / -1' : 'auto' } }}>
                    <VideoPlayer path={v.url} title={v.title} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {hasPhotos && (
            <Box id="fotos">
              <SectionTitle count={photoUrls.length}>Fotos</SectionTitle>
              <Box sx={{
                display: 'grid', gap: { xs: 1, md: 1.5 },
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
                gridAutoRows: { xs: '140px', sm: '170px', md: '190px' },
              }}>
                {photoUrls.map((url, i) => (
                  <ButtonBase
                    key={url}
                    onClick={() => setLightbox({ images: photoUrls, index: i })}
                    aria-label={`Ver foto ${i + 1}`}
                    sx={{
                      borderRadius: '14px', overflow: 'hidden', bgcolor: '#E2E8F0',
                      ...(i === 0 && photoUrls.length >= 3 && { gridColumn: 'span 2', gridRow: 'span 2' }),
                      '&:hover img': { transform: 'scale(1.05)' },
                    }}
                  >
                    <Box component="img" src={url} alt={`Foto ${i + 1}`} loading="lazy"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.visibility = 'hidden'; }}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.35s ease' }} />
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {hasCoords && (
            <Box id="ubicacion" sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
              <Box sx={{ height: 240 }}>
                <LocationGlobe latitude={m.location.latitude} longitude={m.location.longitude} />
              </Box>
              <Box sx={{ p: { xs: 2.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography sx={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.5 }}>
                    Dónde sirven
                  </Typography>
                  <Typography sx={{ color: '#0F172A', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.3 }}>{locationText}</Typography>
                  {kmFromHouston > 50 && (
                    <Typography sx={{ color: '#2563EB', fontWeight: 700, fontSize: '0.9rem', mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <FlightTakeoffIcon sx={{ fontSize: '1.1rem' }} />
                      A {Math.round(kmFromHouston).toLocaleString('es-MX')} km de Houston
                    </Typography>
                  )}
                </Box>
                <Box sx={{ height: '1px', bgcolor: '#E2E8F0' }} />
                <MissionaryLocalInfo latitude={m.location.latitude} longitude={m.location.longitude} />
              </Box>
            </Box>
          )}

          {/* On the kiosk the rail has these; phones get them here */}
          {(pdfUrl || hasContactInfo) && (
            <Box sx={{ ...cardSx, display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {pdfUrl && (
                <Button onClick={() => setLetterOpen(true)} startIcon={<ArticleOutlinedIcon />} fullWidth sx={{
                  textTransform: 'none', fontWeight: 800, fontSize: '1rem', borderRadius: '14px', py: 1.4,
                  color: '#fff', bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' },
                }}>
                  Leer carta de oración
                </Button>
              )}
              {hasContactInfo && (
                <Button onClick={() => setContactDialogOpen(true)} startIcon={<ContactMailOutlinedIcon />} fullWidth sx={{
                  textTransform: 'none', fontWeight: 800, fontSize: '1rem', borderRadius: '14px', py: 1.4,
                  color: '#1E3A8A', bgcolor: '#EFF6FF', '&:hover': { bgcolor: '#DBEAFE' },
                }}>
                  Contactar
                </Button>
              )}
            </Box>
          )}

          {/* Take this page home — kiosk/desktop only */}
          <Box sx={{ ...cardSx, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2, p: 2.5 }}>
            <QRCodeSVG value={publicUrlFor(`/misionero/${m.id}`)} size={96} level="M" bgColor="#ffffff" fgColor="#1E3A8A" />
            <Box>
              <Typography sx={{ color: '#0F172A', fontWeight: 800, lineHeight: 1.3 }}>Llévelo en su teléfono</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.88rem', mt: 0.5, lineHeight: 1.4 }}>
                Escanee el código para ver esta página y orar por ellos.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, pb: 5, pt: 1, pr: { md: '120px', xl: 0 } }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {continent && (
            <Button onClick={goBack} variant="outlined" startIcon={<ArrowBackIcon />} sx={{
              textTransform: 'none', fontWeight: 700, fontSize: '1rem', borderRadius: '999px', px: 3, py: 1.25,
              color: '#1E3A8A', borderColor: 'rgba(30,58,138,0.3)', bgcolor: '#fff',
            }}>
              Más misioneros en {continent.name}
            </Button>
          )}
          <Button onClick={() => navigate('/region-selection')} variant="contained" startIcon={<PublicIcon />} sx={{
            textTransform: 'none', fontWeight: 700, fontSize: '1rem', borderRadius: '999px', px: 3, py: 1.25,
            bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#2563EB' },
          }}>
            Volver al mapa
          </Button>
        </Box>
        <Box component="img" src={iblLogo} alt="IBL" sx={{ height: 40, width: 'auto', opacity: 0.5 }} />
      </Box>

      {/* ── KIOSK SIDE RAIL — big buttons within reach, lower half of the screen ── */}
      <KioskRail floating label="Secciones" items={[
        ...railItems.map((item) => ({ key: item.key, label: item.railLabel, icon: item.icon, onClick: item.onClick, active: item.section === activeSection })),
        null,
        { key: 'back', label: continent ? continent.name : 'Volver', icon: <ArrowBackIcon />, onClick: goBack, tone: 'soft' },
        { key: 'map', label: 'Mapa', icon: <PublicIcon />, onClick: () => navigate('/region-selection'), tone: 'navy' },
      ]} />

      <ContactDialog
        open={contactDialogOpen}
        missionary={m}
        onClose={() => setContactDialogOpen(false)}
      />

      {letterOpen && pdfUrl && (
        <Suspense fallback={null}>
          <PrayerLetterDialog url={pdfUrl} name={displayName} onClose={() => setLetterOpen(false)} />
        </Suspense>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </Box>
  );
};

export default Missionary;
