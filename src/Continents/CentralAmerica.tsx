import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ActionAreaCard from './components/MissionaryPreviewCard';
import Grid2 from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import './na_style.css';
import LeafletRegionalMap from './components/LeafletRegionalMap';
import ContinentHeader from './components/ContinentHeader';
import { CENTRAL_AMERICA_LAT_CENTER, CENTRAL_AMERICA_LON_CENTER } from '../constants';
import backButton from '../assets/leftBackButton.png';
import nextButton from '../assets/rightNextButton.png';
import { useNavigate } from 'react-router-dom';
import returnToMap from '../assets/backToMapButton.png';
import { getMissionariesByContinent } from '../mockData';

const CentralAmerica: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMissionaryId, setSelectedMissionaryId] = useState<string | null>(null);
  
  const missionaries = getMissionariesByContinent('central-america');
  const missionariesPerPage = 9;
  const totalPages = Math.ceil(Math.max(missionaries.length, 1) / missionariesPerPage);

  const startIdx = currentPage * missionariesPerPage;
  const endIdx = startIdx + missionariesPerPage;
  const currentMissionaries = missionaries.slice(startIdx, endIdx);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Box sx={{ background: 'linear-gradient(180deg, #FAFBFC 0%, #F0F4F8 50%, #FFF8F0 100%)', minHeight: '100vh', pb: 4 }}>
      <Box sx={{ px: 3 }}>
        <ContinentHeader
          emoji="🌎"
          title="América Central"
          count={missionaries.length}
          color="#9A3412"
          backgroundColor="#FFEDD5"
        />
      </Box>
      <Grid2 container spacing={3} sx={{ px: 3 }}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Grid2 container spacing={2} sx={{ mb: 3 }}>
            {currentMissionaries.map((missionary) => (
              <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={missionary.id}>
                <ActionAreaCard
                  missionary={missionary}
                  isSelected={selectedMissionaryId === missionary.id}
                />
              </Grid2>
            ))}
          </Grid2>
          <Grid2 container sx={{ padding: 2, justifyContent: 'center', gap: 2, borderRadius: '12px', border: '1px solid #E5E7EB' }} size={{ xs: 12 }}>
            <Box component="img" src={backButton} alt="Atrás" onClick={handlePrevPage} sx={{ cursor: currentPage > 0 ? 'pointer' : 'not-allowed', opacity: currentPage > 0 ? 1 : 0.5 }} />
            <Typography sx={{ display: 'flex', alignItems: 'center', color: '#4B5563' }}>Página {currentPage + 1} de {totalPages}</Typography>
            <Box component="img" src={nextButton} alt="Siguiente" onClick={handleNextPage} sx={{ cursor: currentPage < totalPages - 1 ? 'pointer' : 'not-allowed', opacity: currentPage < totalPages - 1 ? 1 : 0.5 }} />
          </Grid2>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)', borderRadius: '12px', position: 'sticky', top: '1rem', border: '1px solid #E5E7EB' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#FF9800', mb: 2 }}>📍 Mapa Regional</Typography>
            <LeafletRegionalMap
              centerLat={CENTRAL_AMERICA_LAT_CENTER}
              centerLong={CENTRAL_AMERICA_LON_CENTER}
              missionaries={missionaries}
              selectedMissionaryId={selectedMissionaryId}
              onMissionarySelect={setSelectedMissionaryId}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Box component="img" src={returnToMap} alt="Volver al Mapa" onClick={() => navigate('/region-selection')} sx={{ cursor: 'pointer' }} />
            </Box>
          </Paper>
        </Grid2>
      </Grid2>
    </Box>
  );
};

export default CentralAmerica;
