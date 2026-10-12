import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery, Button, Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import iblLogo from '../assets/ibl_logo.png';
import mapTitle from '../assets/MapSelectionBanner.png';
import misionerosPasadosButton from '../assets/missionerosPasadosButton.png';
import naMobile from '../assets/na_mobile.png';
import caMobile from '../assets/ca_mobile.png';
import saMobile from '../assets/sa_mobile.png';
import eMobile from '../assets/e_mobile.png';
import aMobile from '../assets/a_mobile.png';
import asiaMobile from '../assets/asia_mobile.png';
import oMobile from '../assets/o_mobile.png';
import WorldMap from './WorldMap';
import ConferenceCard from './ConferenceCard';
import { AboutPanel, ConferencePanel } from './InfoPanels';
import { REGION_BY_ID, type RegionId } from '../map/regions';
import { conferencePhase } from './kioskContent';
import { useAllMissionaries, missionaryOfTheDay } from '../data/useMissionaries';
import { useCachedLoad } from '../data/useCachedLoad';
import { DEFAULT_KIOSK_SETTINGS, KIOSK_SETTINGS_CACHE_KEY, getKioskSettings, type KioskSettings } from '../data/settings';
import MissionaryOfTheDay from '../ui/MissionaryOfTheDay';
import RegionNav from '../ui/RegionNav';
import { BRAND } from '../ui/brand';
import { usePageTitle } from '../usePageTitle';

const continents = [
  { id: 'north-america' as RegionId, name: 'Norte América',  route: '/norte-america',  colorA: '#1D6FA4', colorB: '#0D3F6B', mobileImg: naMobile },
  { id: 'central-america' as RegionId, name: 'Centro América', route: '/centro-america', colorA: '#E07B1A', colorB: '#9A4E00', mobileImg: caMobile },
  { id: 'south-america' as RegionId, name: 'Sur América',    route: '/sur-america',    colorA: '#1A8A4A', colorB: '#0D5A2E', mobileImg: saMobile },
  { id: 'europe' as RegionId, name: 'Europa',         route: '/europa',         colorA: '#0E7490', colorB: '#064E63', mobileImg: eMobile },
  { id: 'africa' as RegionId, name: 'África',         route: '/africa',         colorA: '#CA8A04', colorB: '#854D0E', mobileImg: aMobile },
  { id: 'asia' as RegionId, name: 'Asia',           route: '/asia',           colorA: '#DC2626', colorB: '#7F1D1D', mobileImg: asiaMobile },
  { id: 'oceania' as RegionId, name: 'Oceanía',        route: '/oceania',        colorA: '#BE185D', colorB: '#6D0F38', mobileImg: oMobile },
];

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const RegionSelection: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [aboutOpen, setAboutOpen] = useState(false);
  const [conferenceOpen, setConferenceOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<RegionId | null>(null);
  const [flyTo, setFlyTo] = useState<RegionId | null>(null);
  const leaving = useRef(false);
  usePageTitle('Mapa de nuestros misioneros');

  // One small request feeds the whole site; the saved copy shows instantly on bad Wi-Fi
  const { missionaries } = useAllMissionaries();
  const { data: settings } = useCachedLoad<KioskSettings>(KIOSK_SETTINGS_CACHE_KEY, getKioskSettings);
  const phase = conferencePhase((settings ?? DEFAULT_KIOSK_SETTINGS).conferencePhase);
  const today = useMemo(() => missionaryOfTheDay(missionaries), [missionaries]);

  const counts = useMemo(() => {
    const c: Partial<Record<RegionId, number>> = {};
    for (const m of missionaries) c[m.continent as RegionId] = (c[m.continent as RegionId] ?? 0) + 1;
    return c;
  }, [missionaries]);
  const countryCount = useMemo(
    () => new Set(missionaries.map((m) => m.location?.country?.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).filter(Boolean)).size,
    [missionaries],
  );
  const countLabel = (n: number) => (n === 1 ? '1 misionero' : `${n} misioneros`);

  // Zoom the map into the region, then open its page
  const selectRegion = (id: RegionId) => {
    if (leaving.current) return;
    leaving.current = true;
    setFlyTo(id);
    window.setTimeout(() => navigate(REGION_BY_ID[id].route), 650);
  };

  const panels = (
    <>
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ConferencePanel open={conferenceOpen} onClose={() => setConferenceOpen(false)} phase={phase} />
    </>
  );

  if (!isMobile) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden', bgcolor: '#F8FBFF' }}>
        {/* ── Side panel: what to do ──────────────────────────────────── */}
        <Box component="aside" sx={{
          '& > *': { flexShrink: 0 },
          width: { md: 320, xl: 380 }, flexShrink: 0, bgcolor: BRAND.white, display: 'flex', flexDirection: 'column',
          px: { md: 2.5, xl: 3.5 }, py: { md: 2.5, xl: 3 }, borderRight: `1px solid ${BRAND.line}`,
          boxShadow: '8px 0 30px rgba(30,58,138,0.08)', zIndex: 1, overflowY: 'auto',
        }}>
          <Box component="img" src={iblLogo} alt="Iglesia Bautista Libertad" sx={{ height: 44, width: 'auto', alignSelf: 'flex-start' }} />

          {missionaries.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 2.5, '@media (max-height: 900px)': { display: 'none' } }}>
              {([[missionaries.length, 'misioneros'], [countryCount, countryCount === 1 ? 'país' : 'países']] as [number, string][]).map(([n, label]) => (
                <Box key={label} sx={{ p: 1.25, borderRadius: '14px', bgcolor: BRAND.blueSoft }}>
                  <Typography sx={{ color: BRAND.navy, fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>{n}</Typography>
                  <Typography sx={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem', mt: 0.3 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ mt: 2.5, mb: 1.25, display: 'flex', alignItems: 'center', gap: 1, color: '#475569', '@media (max-height: 900px)': { mt: 1.5 } }}>
            <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>👆</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.35 }}>
              Toque un continente o la foto de un misionero
            </Typography>
          </Box>

          <RegionNav counts={counts} onSelect={selectRegion} active={activeRegion} onActiveChange={setActiveRegion} />

          <Box sx={{ flex: 1, minHeight: 16 }} />

          <ConferenceCard phase={phase} onClick={() => setConferenceOpen(true)} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, gap: 1 }}>
            <Box component="img" src={misionerosPasadosButton} alt="Misioneros Pasados"
              sx={{ height: 36, width: 'auto', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }} />
            <Button size="small" startIcon={<InfoOutlinedIcon />} onClick={() => setAboutOpen(true)}
              sx={{ color: BRAND.muted, textTransform: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
              Acerca de este sitio
            </Button>
          </Box>
        </Box>

        {/* ── Map, with the title on top ───────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <WorldMap missionaries={missionaries} counts={counts} activeRegion={activeRegion}
            onActiveRegionChange={setActiveRegion} onRegionSelect={selectRegion} flyTo={flyTo} topInset={0.13} />
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center',
            pt: { md: 2, xl: 3 }, pb: 4, px: 4, pointerEvents: 'none', zIndex: 6,
            background: 'linear-gradient(180deg, rgba(248,251,255,0.95) 0%, rgba(248,251,255,0.7) 60%, rgba(248,251,255,0) 100%)',
            opacity: flyTo ? 0 : 1, transition: 'opacity 0.4s ease',
          }}>
            <Box component="img" src={mapTitle} alt="Nuestros misioneros por continente — De Houston para todo el mundo"
              sx={{ width: '100%', maxWidth: 1100, height: 'auto', maxHeight: '11vh', objectFit: 'contain' }} />
          </Box>
        </Box>

        {panels}
      </Box>
    );
  }

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      bgcolor: '#f1f5f9',
    }}>
      {/* Banner */}
      <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <img
          src={mapTitle}
          alt="Nuestros Misioneros por Continente"
          style={{ maxHeight: '10vh', width: '100%', objectFit: 'contain' }}
        />
      </Box>

      {/* Continent grid (desktop gets the world map above) */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: 1.5,
          p: 1.5,
          height: '100%',
          boxSizing: 'border-box',
        }}>
          {continents.map((c, i) => (
            <Box
              key={c.route}
              onClick={() => navigate(c.route)}
              sx={{
                ...(i === continents.length - 1 && continents.length % 2 === 1 && {
                  gridColumn: '1 / -1',
                  width: 'calc(50% - 6px)',
                  mx: 'auto',
                }),
                background: c.mobileImg
                  ? `linear-gradient(135deg, ${hexToRgba(c.colorA, 0.70)} 0%, ${hexToRgba(c.colorB, 0.82)} 100%), url(${c.mobileImg})`
                  : `linear-gradient(135deg, ${c.colorA} 0%, ${c.colorB} 100%)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: '#fff',
                borderRadius: '14px',
                textAlign: 'center',
                fontWeight: 800,
                fontSize: '1.35rem',
                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.96)' },
              }}
            >
              <Box>
                {c.name}
                {!!counts[c.id] && (
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.9 }}>{countLabel(counts[c.id]!)}</Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Bottom bar */}
      <Box sx={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        px: 2,
        pt: 1.25,
        pb: 1.5,
        bgcolor: '#fff',
        borderTop: '1px solid #e2e8f0',
      }}>
        <Typography sx={{ color: '#475569', fontWeight: 700, fontSize: '1rem' }}>
          👆 Toca un continente para explorar
        </Typography>
        {today && (
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <MissionaryOfTheDay missionary={today} />
          </Box>
        )}
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <ConferenceCard phase={phase} onClick={() => setConferenceOpen(true)} compact />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: -0.25 }}>
          <Box component="img" src={misionerosPasadosButton} alt="Misioneros Pasados"
            sx={{ height: 30, width: 'auto', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }} />
          <Button size="small" startIcon={<InfoOutlinedIcon />} onClick={() => setAboutOpen(true)}
            sx={{ color: BRAND.muted, textTransform: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            Acerca de este sitio
          </Button>
        </Box>
      </Box>

      {panels}
    </Box>
  );
};

export default RegionSelection;
