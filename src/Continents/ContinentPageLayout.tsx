import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery, Box, Paper, Typography, CircularProgress } from '@mui/material';
import ActionAreaCard from './components/MissionaryPreviewCard';
import LeafletRegionalMap from './components/LeafletRegionalMap';
import ContinentHeader from './components/ContinentHeader';
import backButton from '../assets/leftBackButton.png';
import nextButton from '../assets/rightNextButton.png';
import returnToMap from '../assets/backToMapButton.png';
import iblLogo from '../assets/ibl_logo.png';
import type { Missionary } from '../types';
import outputs from '../../amplify_outputs.json';

const API_ENDPOINT = (outputs as { custom?: { API?: { endpoint?: string } } })?.custom?.API?.endpoint ?? '';

interface Props {
  title: string;
  slug: string;
  centerLat: number;
  centerLon: number;
}

const ContinentPageLayout: React.FC<Props> = ({ title, slug, centerLat, centerLon }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMissionaryId, setSelectedMissionaryId] = useState<string | null>(null);
  const [missionaries, setMissionaries] = useState<Missionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMissionaries = async () => {
      try {
        const res = await fetch(`${API_ENDPOINT}missionaries/continent/${slug}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: Missionary[] = await res.json();
        setMissionaries(data ?? []);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchMissionaries();
  }, [slug]);

  // Reset page when layout mode changes so we don't land on an out-of-range page
  useEffect(() => { setCurrentPage(0); }, [isMobile]);

  const perPage = isMobile ? 6 : 9;
  const totalPages = Math.max(1, Math.ceil(missionaries.length / perPage));
  const currentMissionaries = missionaries.slice(currentPage * perPage, (currentPage + 1) * perPage);

  const handleNext = () => { if (currentPage < totalPages - 1) setCurrentPage(p => p + 1); };
  const handlePrev = () => { if (currentPage > 0) setCurrentPage(p => p - 1); };

  // Shared inline content for the cards+map area
  const contentArea = () => {
    if (loading) return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#2563EB' }} />
      </Box>
    );
    if (error) return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
    return null; // signals "render normally"
  };

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #F0F4F8 0%, #E8F1FC 100%)' }}>
        <ContinentHeader title={title} count={loading ? undefined : missionaries.length} />

        <Box sx={{ flex: 1, px: 1.5, pt: 1.5, pb: 0, display: 'flex', flexDirection: 'column' }}>
          {contentArea() ?? (missionaries.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: '#9CA3AF' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Próximamente</Typography>
              <Typography variant="body2" textAlign="center">Aún no hay misioneros registrados para esta región.</Typography>
            </Box>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridTemplateRows: 'repeat(3, 160px)',
              gap: '10px',
              mb: 2,
            }}>
              {currentMissionaries.map((m) => (
                <ActionAreaCard key={m.id} missionary={m} isSelected={selectedMissionaryId === m.id} />
              ))}
            </Box>
          ))}

          {/* Map below cards on mobile */}
          {!loading && !error && missionaries.length > 0 && (
            <Paper sx={{
              mb: 2, p: 1.25, height: 360,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F4F8 100%)',
              borderRadius: '12px',
              border: '2px solid rgba(37,99,235,0.1)',
              boxShadow: '0 8px 20px rgba(30,58,138,0.12)',
              display: 'flex', flexDirection: 'column',
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 1, fontSize: '0.9rem', flexShrink: 0 }}>
                📍 Mapa Regional
              </Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <LeafletRegionalMap
                  centerLat={centerLat}
                  centerLong={centerLon}
                  missionaries={currentMissionaries}
                  selectedMissionaryId={selectedMissionaryId}
                  onMissionarySelect={setSelectedMissionaryId}
                />
              </Box>
            </Paper>
          )}
        </Box>

        {/* Bottom bar */}
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'transparent' }}>
          <Box
            component="img" src={backButton} alt="Atrás"
            onClick={handlePrev}
            sx={{ height: '44px', width: 'auto', cursor: currentPage > 0 ? 'pointer' : 'not-allowed', opacity: currentPage > 0 ? 1 : 0.4 }}
          />
          <Typography sx={{ color: '#4B5563', fontWeight: 700, fontSize: '0.95rem' }}>
            {currentPage + 1} / {totalPages}
          </Typography>
          <Box
            component="img" src={nextButton} alt="Siguiente"
            onClick={handleNext}
            sx={{ height: '44px', width: 'auto', cursor: currentPage < totalPages - 1 ? 'pointer' : 'not-allowed', opacity: currentPage < totalPages - 1 ? 1 : 0.4 }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 2.5, gap: 2 }}>
          <Box
            component="img" src={returnToMap} alt="Volver al Mapa"
            onClick={() => navigate('/region-selection')}
            sx={{ height: '48px', width: 'auto', cursor: 'pointer', transition: 'transform 0.2s', '&:active': { transform: 'scale(0.96)' } }}
          />
          <Box component="img" src={iblLogo} alt="IBL" sx={{ height: 36, width: 'auto', opacity: 0.55 }} />
        </Box>
      </Box>
    );
  }

  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #F0F4F8 0%, #E8F1FC 100%)', overflow: 'hidden' }}>
      <ContinentHeader title={title} count={loading ? undefined : missionaries.length} />

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 2, px: 3, pt: 1.5, pb: 0 }}>
        <Box sx={{ flex: 2, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {contentArea() ?? (missionaries.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Próximamente</Typography>
              <Typography variant="body2">Aún no hay misioneros registrados para esta región.</Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '10px' }}>
              {currentMissionaries.map((m) => (
                <ActionAreaCard key={m.id} missionary={m} isSelected={selectedMissionaryId === m.id} />
              ))}
            </Box>
          ))}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F4F8 100%)', borderRadius: '12px', border: '2px solid rgba(37,99,235,0.1)', boxShadow: '0 15px 30px -5px rgba(30,58,138,0.15)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 1, fontSize: '1rem', flexShrink: 0 }}>📍 Mapa Regional</Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <LeafletRegionalMap
                centerLat={centerLat}
                centerLong={centerLon}
                missionaries={currentMissionaries}
                selectedMissionaryId={selectedMissionaryId}
                onMissionarySelect={setSelectedMissionaryId}
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', px: 3, py: 1.25 }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="img" src={iblLogo} alt="IBL" sx={{ height: 36, width: 'auto', opacity: 0.55 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box component="img" src={backButton} alt="Atrás" onClick={handlePrev}
            sx={{ height: '52px', width: 'auto', cursor: currentPage > 0 ? 'pointer' : 'not-allowed', opacity: currentPage > 0 ? 1 : 0.45, transition: 'all 0.25s ease', '&:hover': currentPage > 0 ? { transform: 'scale(1.08)' } : {} }} />
          <Typography sx={{ color: '#4B5563', fontWeight: 700, fontSize: '1.1rem', minWidth: '110px', textAlign: 'center' }}>
            Página {currentPage + 1} de {totalPages}
          </Typography>
          <Box component="img" src={nextButton} alt="Siguiente" onClick={handleNext}
            sx={{ height: '52px', width: 'auto', cursor: currentPage < totalPages - 1 ? 'pointer' : 'not-allowed', opacity: currentPage < totalPages - 1 ? 1 : 0.45, transition: 'all 0.25s ease', '&:hover': currentPage < totalPages - 1 ? { transform: 'scale(1.08)' } : {} }} />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Box component="img" src={returnToMap} alt="Volver al Mapa" onClick={() => navigate('/region-selection')}
            sx={{ height: '52px', width: 'auto', cursor: 'pointer', transition: 'all 0.25s ease', '&:hover': { transform: 'scale(1.06)' } }} />
        </Box>
      </Box>
    </Box>
  );
};

export default ContinentPageLayout;
