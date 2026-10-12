import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, CircularProgress, Typography, useMediaQuery } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PublicIcon from '@mui/icons-material/Public';
import iblLogo from '../assets/ibl_logo.png';
import ContinentMap from './ContinentMap';
import { REGION_BY_ID, type RegionId } from '../map/regions';
import { useAllMissionaries } from '../data/useMissionaries';
import RegionNav from '../ui/RegionNav';
import QrCard from '../ui/QrCard';
import MissionaryCard from '../ui/MissionaryCard';
import { BRAND, pillSx } from '../ui/brand';
import { MISSIONARY_REQUEST_PATH } from '../Home/Home';
import { usePageTitle } from '../usePageTitle';

/**
 * A continent's missionaries: photo cards beside the region's map. On the kiosk a side panel
 * (like the world map's) holds a big "back to the map" button and the other continents.
 */
const ContinentPageLayout: React.FC<{ slug: string }> = ({ slug }) => {
  const navigate = useNavigate();
  const region = REGION_BY_ID[slug as RegionId];
  usePageTitle(`Misioneros en ${region.name}`);
  const { missionaries: all, loading, error } = useAllMissionaries();
  const missionaries = useMemo(() => all.filter((m) => m.continent === slug), [all, slug]);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const phone = useMediaQuery('(max-width: 767px)');
  const counts = useMemo(() => {
    const c: Partial<Record<RegionId, number>> = {};
    for (const m of all) c[m.continent as RegionId] = (c[m.continent as RegionId] ?? 0) + 1;
    return c;
  }, [all]);

  useEffect(() => setHighlighted([]), [slug]);

  // Tapping a pin highlights its cards and brings the first into view
  const onPinOpen = (ids: string[]) => {
    setHighlighted(ids);
    if (ids[0]) document.getElementById(`card-${ids[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const count = missionaries.length;
  const toMap = () => navigate('/region-selection');
  const requestPath = `${MISSIONARY_REQUEST_PATH}?continente=${region.id}`;

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ width: { xs: 18, md: 22 }, height: { xs: 18, md: 22 }, borderRadius: '50%', bgcolor: region.color, boxShadow: `0 0 0 6px ${region.color}33`, flexShrink: 0 }} />
      <Typography component="h1" sx={{ color: BRAND.ink, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, fontSize: { xs: '2rem', md: '2.8rem' } }}>
        {region.name}
      </Typography>
      {count > 0 && (
        <Box sx={{ px: 1.5, py: 0.5, borderRadius: '999px', bgcolor: `${region.color}1F`, color: BRAND.ink, fontWeight: 800, fontSize: { xs: '0.9rem', md: '1rem' } }}>
          {count === 1 ? '1 misionero' : `${count} misioneros`}
        </Box>
      )}
    </Box>
  );

  const body = loading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: BRAND.blue }} /></Box>
  ) : count === 0 ? (
    error ? (
      <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, px: 3 }}>
        <Typography sx={{ fontSize: '3rem', lineHeight: 1 }}>📡</Typography>
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: '1.4rem', mt: 2 }}>
          No pudimos cargar los misioneros. Revise la conexión a internet.
        </Typography>
      </Box>
    ) : (
      // We do have people serving here; we just don't have their information yet
      <Box sx={{ maxWidth: 640, mx: 'auto', textAlign: 'center', py: { xs: 4, md: 6 }, px: { xs: 1, md: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '3rem', lineHeight: 1 }}>🌍</Typography>
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.75rem' }, lineHeight: 1.25, mt: 2 }}>
          Tenemos misioneros sirviendo en {region.name}… ¡pero aún no tenemos su información!
        </Typography>
        <Typography sx={{ color: BRAND.text, fontSize: { xs: '1.05rem', md: '1.15rem' }, lineHeight: 1.6, mt: 1.5 }}>
          ¿Conoce a un misionero en {region.name}? {phone ? 'Envíele' : 'Escanee el código y envíele'} este formulario para que su familia aparezca en este mapa.
        </Typography>
        <Box sx={{ mt: 3 }}>
          {phone ? (
            <Button onClick={() => navigate(requestPath)} sx={{ ...pillSx.primary, px: 3, py: 1.25, fontSize: '1rem' }}>
              Abrir el formulario
            </Button>
          ) : (
            <QrCard path={requestPath} size={150} layout="column" color={BRAND.navy} title="Formulario para misioneros" />
          )}
        </Box>
      </Box>
    )
  ) : (
    <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 2.5 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(auto-fill, minmax(230px, 1fr))' } }}>
      {missionaries.map((m) => (
        <MissionaryCard key={m.id} id={`card-${m.id}`} missionary={m} accent={region.color} highlighted={highlighted.includes(m.id)} />
      ))}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', height: { md: '100vh' }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, bgcolor: BRAND.page, overflow: { md: 'hidden' } }}>

      {/* ── Phone top bar ─────────────────────────────────────────────── */}
      <Box sx={{
        display: { xs: 'flex', md: 'none' }, position: 'sticky', top: 0, zIndex: 20, alignItems: 'center', px: 1.5, py: 1,
        bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BRAND.line}`,
      }}>
        <Button onClick={toMap} startIcon={<PublicIcon />} sx={{ ...pillSx.navy, px: 2, py: 1 }}>Mapa</Button>
        <Box sx={{ flex: 1 }} />
        <Box component="img" src={iblLogo} alt="IBL" sx={{ height: 30, width: 'auto', opacity: 0.7 }} />
      </Box>

      {/* ── Kiosk side panel: back to the map, other continents ──────── */}
      <Box component="aside" sx={{
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', width: { md: 280, xl: 320 }, flexShrink: 0,
        px: 2.5, py: 2.5, gap: 2, bgcolor: BRAND.white, borderRight: `1px solid ${BRAND.line}`,
        boxShadow: '8px 0 30px rgba(30,58,138,0.08)', zIndex: 1, overflowY: 'auto',
      }}>
        <Box component="img" src={iblLogo} alt="Iglesia Bautista Libertad" sx={{ height: 40, width: 'auto', alignSelf: 'flex-start' }} />
        <ButtonBase onClick={toMap} sx={{
          ...pillSx.navy, flexShrink: 0, justifyContent: 'flex-start', gap: 1.5, px: 2, py: 1.75, borderRadius: '18px',
          boxShadow: '0 10px 24px rgba(30,58,138,0.25)',
        }}>
          <ArrowBackRoundedIcon sx={{ fontSize: '1.9rem' }} />
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.1 }}>Volver al mapa</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>Ver todo el mundo</Typography>
          </Box>
          <PublicIcon sx={{ ml: 'auto', fontSize: '1.8rem', opacity: 0.85 }} />
        </ButtonBase>
        <Box>
          <Typography sx={{ color: BRAND.muted, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1, px: 0.5 }}>
            Ver otro continente
          </Typography>
          <RegionNav counts={counts} current={region.id} onSelect={(id) => navigate(REGION_BY_ID[id].route)} />
        </Box>
      </Box>

      {/* ── Cards: the main thing on this page ──────────────────────── */}
      <Box sx={{ flex: { md: '1.8 1 0' }, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 2.5, md: 4 }, pb: { xs: 2, md: 2.5 } }}>
          {header}
          {count > 0 && (
            <Typography sx={{ color: BRAND.muted, fontWeight: 700, fontSize: { xs: '0.95rem', md: '1.2rem' }, mt: 1.5 }}>
              👆 Toque una foto para conocer a cada misionero
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' }, px: { xs: 2, md: 4 }, pb: { xs: 3, md: 4 } }}>
          {body}
        </Box>
      </Box>

      {/* ── Region map: a glance at where everyone is ─────────────────── */}
      <Box sx={{
        flex: { md: '1 1 0' }, minWidth: 0, height: { xs: 340, md: 'auto' }, mx: { xs: 2, md: 0 }, mr: { md: 2.5 }, my: { xs: 0, md: 2.5 }, mb: { xs: 3, md: 2.5 },
        borderRadius: '24px', overflow: 'hidden', border: `1px solid ${BRAND.line}`, boxShadow: '0 10px 30px rgba(30,58,138,0.1)',
      }}>
        <ContinentMap region={region} missionaries={missionaries} onPinOpen={onPinOpen} />
      </Box>

    </Box>
  );
};

export default ContinentPageLayout;
