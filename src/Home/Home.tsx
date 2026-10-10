import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import iblLogo from '../assets/ibl_logo.png';
import AttractGlobe, { type Stage } from './AttractGlobe';
import HomeStage from './HomeStage';
import { buildStops } from './stops';
import { OPENING_VERSE } from './verses';
import { useAllMissionaries, missionaryOfTheDay } from '../data/useMissionaries';
import MissionaryOfTheDay from '../ui/MissionaryOfTheDay';
import TapPrompt from '../ui/TapPrompt';
import { BRAND } from '../ui/brand';
import './style.css';

export const MISSIONARY_REQUEST_PATH = '/misioneros/solicitud';

/** Church logo + "Misiones" lockup for the corner of the welcome screen. */
const BrandLockup: React.FC = () => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 2.25, px: 2.75, py: 1.5, borderRadius: '22px',
    bgcolor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.95)',
    boxShadow: '0 12px 30px rgba(30,58,138,0.1)',
  }}>
    <Box component="img" src={iblLogo} alt="Iglesia Bautista Libertad" sx={{ height: 40, width: 'auto' }} />
    <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: BRAND.line }} />
    <Box>
      <Typography sx={{ color: BRAND.navy, fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.1, letterSpacing: '0.02em' }}>Misiones</Typography>
      <Typography sx={{ color: BRAND.muted, fontWeight: 600, fontSize: '0.92rem' }}>De Houston para todo el mundo</Typography>
    </Box>
  </Box>
);

/** "Misionero 3 de 9" with a dot per stop. */
const TourProgress: React.FC<{ index: number; total: number }> = ({ index, total }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2.5, px: 1 }}>
    <Typography sx={{ color: BRAND.muted, fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
      Misionero {index + 1} de {total}
    </Typography>
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
      {Array.from({ length: total }, (_, i) => (
        <Box key={i} sx={{
          width: i === index ? 22 : 8, height: 8, borderRadius: 4, transition: 'all 0.4s ease',
          bgcolor: i < index ? BRAND.blue : i === index ? BRAND.amber : 'rgba(37,99,235,0.18)',
        }} />
      ))}
    </Box>
  </Box>
);

/**
 * Kiosk welcome screen, drawn live in the browser (it replaced a large looping video): a plane
 * flies from Houston to each of our missionaries with Scripture along the way, then comes home
 * with how we can help. Touch anywhere to start exploring.
 */
const Home: React.FC = () => {
  const navigate = useNavigate();
  const { missionaries } = useAllMissionaries();
  const today = useMemo(() => missionaryOfTheDay(missionaries), [missionaries]);
  // Only rebuild the tour when the people or places actually change (not on every refresh)
  const tourKey = missionaries.map((m) => `${m.id}:${m.location?.latitude}:${m.location?.longitude}:${m.profileImage}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stops = useMemo(() => buildStops(missionaries, today), [tourKey]);
  const [stage, setStage] = useState<Stage>({ kind: 'verse', verse: OPENING_VERSE, ms: 0 });
  const [stageKey, setStageKey] = useState(0);

  useEffect(() => {
    // Phones skip the welcome screen and go straight to the map
    if (window.innerWidth < 768) navigate('/region-selection', { replace: true });
  }, [navigate]);

  const onStage = useCallback((s: Stage) => { setStage(s); setStageKey((k) => k + 1); }, []);
  const touring = stage.kind === 'fly' || stage.kind === 'arrive';

  return (
    <Box className="home" onClick={() => navigate('/region-selection')} sx={{
      position: 'fixed', inset: 0, overflow: 'hidden', cursor: 'pointer', userSelect: 'none',
      background: 'radial-gradient(ellipse at 68% 48%, #FFFFFF 0%, #F1F7FF 40%, #DCEAFE 100%)',
    }}>
      {/* Faint dot texture */}
      <Box aria-hidden sx={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'radial-gradient(rgba(37,99,235,0.12) 1px, transparent 1.2px)', backgroundSize: '26px 26px',
        maskImage: 'radial-gradient(ellipse at 30% 50%, #000 0%, transparent 75%)',
      }} />

      {/* Globe, right of center */}
      <AttractGlobe stops={stops} onStage={onStage} centerX={0.68} />

      {/* Left column */}
      <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '46%', display: 'flex', flexDirection: 'column', px: '3.5vw', py: '4.5vh' }}>
        <Box onClick={(e) => e.stopPropagation()} sx={{ alignSelf: 'flex-start' }}>
          <BrandLockup />
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, py: 3 }}>
          <Box key={stageKey} className="home-stage" sx={{ maxWidth: 760 }}>
            <HomeStage stage={stage} />
            {touring && <TourProgress index={stage.index} total={stage.total} />}
          </Box>
        </Box>

        {today && (
          <Box onClick={(e) => e.stopPropagation()} sx={{ maxWidth: 540 }}>
            <MissionaryOfTheDay missionary={today} variant="card" />
          </Box>
        )}
      </Box>

      {/* Invitation to touch */}
      <Box sx={{ position: 'absolute', right: '3.5vw', bottom: '5vh' }}>
        <TapPrompt title="Toque la pantalla" subtitle="para conocer a nuestros misioneros" />
      </Box>
    </Box>
  );
};

export default Home;
