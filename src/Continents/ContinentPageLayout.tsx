import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import iblLogo from '../assets/ibl_logo.png';
import ContinentMap from './ContinentMap';
import { REGIONS, REGION_BY_ID, type RegionId } from '../map/regions';
import { useAllMissionaries } from '../data/useMissionaries';
import KioskRail from '../ui/KioskRail';
import MissionaryCard from '../ui/MissionaryCard';
import { BRAND, pillSx } from '../ui/brand';

// Rail labels broken over two lines so the buttons stay narrow
const SHORT: Record<RegionId, string> = {
  'north-america': 'Norte\nAmérica', 'central-america': 'Centro\nAmérica', 'south-america': 'Sur\nAmérica',
  europe: 'Europa', africa: 'África', asia: 'Asia', oceania: 'Oceanía',
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: color, border: '3px solid #fff', boxShadow: `0 0 0 2px ${color}` }} />
);

/**
 * A continent's missionaries: photo cards on one side, the region's map on the other, and on
 * the kiosk a rail (low on the right, within kids' reach) to jump to another continent or the map.
 */
const ContinentPageLayout: React.FC<{ slug: string }> = ({ slug }) => {
  const navigate = useNavigate();
  const region = REGION_BY_ID[slug as RegionId];
  const { missionaries: all, loading, error } = useAllMissionaries();
  const missionaries = useMemo(() => all.filter((m) => m.continent === slug), [all, slug]);
  const [highlighted, setHighlighted] = useState<string[]>([]);

  useEffect(() => setHighlighted([]), [slug]);

  // Tapping a pin highlights its cards and brings the first into view
  const onPinOpen = (ids: string[]) => {
    setHighlighted(ids);
    if (ids[0]) document.getElementById(`card-${ids[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const count = missionaries.length;
  const toMap = () => navigate('/region-selection');

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
    <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, px: 3, color: BRAND.muted }}>
      <Typography sx={{ fontSize: '3rem', lineHeight: 1 }}>🌍</Typography>
      <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: '1.4rem', mt: 2 }}>
        {error ? 'No pudimos cargar los misioneros. Revise la conexión a internet.' : `Aún no tenemos misioneros en ${region.name}`}
      </Typography>
      {!error && (
        <Typography sx={{ fontSize: '1.05rem', mt: 1, lineHeight: 1.6 }}>
          Oremos al Señor de la mies que envíe obreros a {region.name}.
        </Typography>
      )}
      <Button onClick={toMap} startIcon={<PublicIcon />} sx={{ ...pillSx.navy, mt: 3, px: 3, py: 1.25, fontSize: '1rem' }}>
        Volver al mapa
      </Button>
    </Box>
  ) : (
    <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 2.5 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
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

      {/* ── Cards ─────────────────────────────────────────────────────── */}
      <Box sx={{ flex: { md: '1 1 0' }, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 2.5, md: 4 }, pb: { xs: 2, md: 2.5 } }}>
          {header}
          {count > 0 && (
            <Typography sx={{ color: BRAND.muted, fontWeight: 700, fontSize: { xs: '0.95rem', md: '1.05rem' }, mt: 1.5 }}>
              👆 Toque una foto para conocer a cada misionero
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' }, px: { xs: 2, md: 4 }, pb: { xs: 3, md: 4 } }}>
          {body}
        </Box>
      </Box>

      {/* ── Region map ────────────────────────────────────────────────── */}
      <Box sx={{
        flex: { md: '1.1 1 0' }, minWidth: 0, height: { xs: 340, md: 'auto' }, mx: { xs: 2, md: 0 }, my: { xs: 0, md: 2.5 }, mb: { xs: 3, md: 2.5 },
        borderRadius: '24px', overflow: 'hidden', border: `1px solid ${BRAND.line}`, boxShadow: '0 10px 30px rgba(30,58,138,0.1)',
      }}>
        <ContinentMap region={region} missionaries={missionaries} onPinOpen={onPinOpen} />
      </Box>

      {/* ── Kiosk rail: other continents + map, within reach ──────────── */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'flex-end', p: 2, pl: 2 }}>
        <KioskRail label="Continentes" items={[
          ...REGIONS.map((r) => ({
            key: r.id, label: SHORT[r.id], icon: <Dot color={r.color} />, active: r.id === region.id, color: r.color,
            onClick: () => navigate(r.route),
          })),
          null,
          { key: 'map', label: 'Mapa', icon: <PublicIcon />, onClick: toMap, tone: 'navy' as const },
        ]} />
      </Box>
    </Box>
  );
};

export default ContinentPageLayout;
