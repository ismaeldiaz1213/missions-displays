import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ActionAreaCard from './components/MissionaryPreviewCard';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import './na_style.css';
import LeafletRegionalMap from './components/LeafletRegionalMap';
import ContinentHeader from './components/ContinentHeader';
import { SOUTH_AMERICA_LAT_CENTER, SOUTH_AMERICA_LON_CENTER } from '../constants';
import backButton from '../assets/leftBackButton.png';
import nextButton from '../assets/rightNextButton.png';
import { useNavigate } from 'react-router-dom';
import returnToMap from '../assets/backToMapButton.png';
import type { Missionary } from '../types';
import outputs from '../../amplify_outputs.json';

const API_ENDPOINT = (outputs as { custom?: { API?: { endpoint?: string } } })?.custom?.API?.endpoint ?? '';

const SouthAmerica: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMissionaryId, setSelectedMissionaryId] = useState<string | null>(null);
  const [missionaries, setMissionaries] = useState<Missionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMissionaries = async () => {
      try {
        const res = await fetch(`${API_ENDPOINT}missionaries/continent/south-america`);
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
  }, []);

  const missionariesPerPage = 9;
  const totalPages = Math.ceil(missionaries.length / missionariesPerPage);
  const currentMissionaries = missionaries.slice(currentPage * missionariesPerPage, currentPage * missionariesPerPage + missionariesPerPage);
  const handleNextPage = () => { if (currentPage < totalPages - 1) setCurrentPage(p => p + 1); };
  const handlePrevPage = () => { if (currentPage > 0) setCurrentPage(p => p - 1); };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #F0F4F8 0%, #E8F1FC 100%)', overflow: 'hidden' }}>
      <ContinentHeader title="Sur América" count={missionaries.length} />
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 2, px: 3, pt: 1.5, pb: 0 }}>
        <Box sx={{ flex: 2, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {missionaries.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Próximamente</Typography>
              <Typography variant="body2">Aún no hay misioneros registrados para esta región.</Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '10px' }}>
              {currentMissionaries.map((m) => <ActionAreaCard key={m.id} missionary={m} isSelected={selectedMissionaryId === m.id} />)}
            </Box>
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F4F8 100%)', borderRadius: '12px', border: '2px solid rgba(37,99,235,0.1)', boxShadow: '0 15px 30px -5px rgba(30,58,138,0.15)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E3A8A', mb: 1, fontSize: '1rem', flexShrink: 0 }}>📍 Mapa Regional</Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <LeafletRegionalMap centerLat={SOUTH_AMERICA_LAT_CENTER} centerLong={SOUTH_AMERICA_LON_CENTER} missionaries={currentMissionaries} selectedMissionaryId={selectedMissionaryId} onMissionarySelect={setSelectedMissionaryId} />
            </Box>
          </Paper>
        </Box>
      </Box>
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', px: 3, py: 1.25 }}>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box component="img" src={backButton} alt="Atrás" onClick={handlePrevPage} sx={{ height: '52px', width: 'auto', cursor: currentPage > 0 ? 'pointer' : 'not-allowed', opacity: currentPage > 0 ? 1 : 0.45, transition: 'all 0.25s ease', '&:hover': currentPage > 0 ? { transform: 'scale(1.08)' } : {} }} />
          <Typography sx={{ color: '#4B5563', fontWeight: 700, fontSize: '1.1rem', minWidth: '110px', textAlign: 'center' }}>Página {currentPage + 1} de {totalPages || 1}</Typography>
          <Box component="img" src={nextButton} alt="Siguiente" onClick={handleNextPage} sx={{ height: '52px', width: 'auto', cursor: currentPage < totalPages - 1 ? 'pointer' : 'not-allowed', opacity: currentPage < totalPages - 1 ? 1 : 0.45, transition: 'all 0.25s ease', '&:hover': currentPage < totalPages - 1 ? { transform: 'scale(1.08)' } : {} }} />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Box component="img" src={returnToMap} alt="Volver al Mapa" onClick={() => navigate('/region-selection')} sx={{ height: '52px', width: 'auto', cursor: 'pointer', transition: 'all 0.25s ease', '&:hover': { transform: 'scale(1.06)' } }} />
        </Box>
      </Box>
    </Box>
  );
};

export default SouthAmerica;
