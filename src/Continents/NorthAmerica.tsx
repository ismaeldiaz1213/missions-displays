import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ActionAreaCard from './components/MissionaryPreviewCard';
import Grid2 from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import './na_style.css';
import LeafletRegionalMap from './components/LeafletRegionalMap';
import { NORTH_AMERICA_LAT_CENTER, NORTH_AMERICA_LON_CENTER } from '../constants';
import backButton from '../assets/leftBackButton.png';
import nextButton from '../assets/rightNextButton.png';
import { useNavigate } from 'react-router-dom';
import returnToMap from '../assets/backToMapButton.png';
import { getMissionariesByContinent } from '../mockData';

const NorthAmerica: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMissionaryId, setSelectedMissionaryId] = useState<string | null>(null);
  
  const missionaries = getMissionariesByContinent('north-america');
  const missionariesPerPage = 9;
  const totalPages = Math.ceil(missionaries.length / missionariesPerPage);

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
    <Box
      sx={{
        background: 'linear-gradient(180deg, #FAFBFC 0%, #F0F4F8 50%, #E8F1FC 100%)',
        minHeight: '100vh',
        pb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
          borderBottom: '4px solid #2563EB',
          p: 2,
          mb: 2,
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
          position: 'relative',
        }}
      >
        <h1 className="north-america-title" style={{ color: '#1E40AF', margin: 0, marginBottom: '0.25rem', fontSize: '1.75rem' }}>
          🌍 América del Norte
        </h1>
        <Typography variant="caption" sx={{ color: '#1E40AF', fontSize: '0.9rem', fontWeight: 500 }}>
          {missionaries.length} misioneros activos
        </Typography>
      </Box>

      <Grid2 container spacing={3} sx={{ px: 3 }}>
        {/* Main Cards Section */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Grid2 container spacing={2} sx={{ mb: 3 }}>
            {/* Render current page of cards in a 3x3 pattern */}
            {currentMissionaries.map((missionary) => (
              <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={missionary.id}>
                <ActionAreaCard
                  missionary={missionary}
                  isSelected={selectedMissionaryId === missionary.id}
                />
              </Grid2>
            ))}
          </Grid2>

          {/* Pagination Controls */}
          <Grid2
            container
            sx={{
              padding: 2.5,
              justifyContent: 'center',
              gap: 2,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(249,250,251,0.8) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '2px solid',
              borderColor: 'rgba(37, 99, 235, 0.2)',
              boxShadow: '0 8px 16px -2px rgba(30, 58, 138, 0.15)',
            }}
            size={{ xs: 12 }}
          >
            <Box
              component="img"
              src={backButton}
              alt="Atrás"
              onClick={handlePrevPage}
              sx={{
                cursor: currentPage > 0 ? 'pointer' : 'not-allowed',
                opacity: currentPage > 0 ? 1 : 0.5,
                transition: 'all 0.3s ease',
                '&:hover': currentPage > 0 ? { transform: 'scale(1.1)', filter: 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.3))' } : {},
              }}
            />
            <Typography sx={{ display: 'flex', alignItems: 'center', color: '#4B5563', fontWeight: 600 }}>
              Página {currentPage + 1} de {totalPages}
            </Typography>
            <Box
              component="img"
              src={nextButton}
              alt="Siguiente"
              onClick={handleNextPage}
              sx={{
                cursor: currentPage < totalPages - 1 ? 'pointer' : 'not-allowed',
                opacity: currentPage < totalPages - 1 ? 1 : 0.5,
                transition: 'all 0.3s ease',
                '&:hover': currentPage < totalPages - 1 ? { transform: 'scale(1.1)', filter: 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.3))' } : {},
              }}
            />
          </Grid2>
        </Grid2>

        {/* Right Sidebar - Map */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 50%, #F0F4F8 100%)',
              borderRadius: '12px',
              position: 'sticky',
              top: '1rem',
              border: '2px solid rgba(37, 99, 235, 0.1)',
              boxShadow: '0 15px 30px -5px rgba(30, 58, 138, 0.15)',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              📍 Mapa Regional
            </Typography>
            <LeafletRegionalMap
              centerLat={NORTH_AMERICA_LAT_CENTER}
              centerLong={NORTH_AMERICA_LON_CENTER}
              missionaries={missionaries}
              selectedMissionaryId={selectedMissionaryId}
              onMissionarySelect={setSelectedMissionaryId}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Box
                component="img"
                src={returnToMap}
                alt="Volver al Mapa"
                onClick={() => navigate('/region-selection')}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'scale(1.05)', filter: 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.3))' },
                }}
              />
            </Box>
          </Paper>
        </Grid2>
      </Grid2>
    </Box>
  );
};

export default NorthAmerica;
