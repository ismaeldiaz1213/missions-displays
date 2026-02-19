import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ActionAreaCard from './components/MissionaryPreviewCard';
import Grid2 from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import './na_style.css';
import LeafletRegionalMap from './components/LeafletRegionalMap';
import { SOUTH_AMERICA_LAT_CENTER, SOUTH_AMERICA_LON_CENTER } from '../constants';
import backButton from '../assets/leftBackButton.png';
import nextButton from '../assets/rightNextButton.png';
import { useNavigate } from 'react-router-dom';
import returnToMap from '../assets/backToMapButton.png';
import { getMissionariesByContinent } from '../mockData';

const SouthAmerica: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  
  const missionaries = getMissionariesByContinent('south-america');
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
        background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F4F8 100%)',
        minHeight: '100vh',
        pb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
          borderBottom: '4px solid',
          borderImage: 'linear-gradient(90deg, #4CAF50 0%, #388E3C 100%) 1',
          p: 3,
          mb: 3,
          boxShadow: '0 10px 15px -3px rgba(76, 175, 80, 0.1)',
        }}
      >
        <h1 className="north-america-title" style={{ color: '#4CAF50', margin: 0, marginBottom: '0.5rem' }}>
          🌎 América del Sur
        </h1>
        <Typography variant="body1" sx={{ color: '#6B7280', mt: 1 }}>
          {missionaries.length} misioneros activos en esta región
        </Typography>
      </Box>

      <Grid2 container spacing={3} sx={{ px: 3 }}>
        {/* Main Cards Section */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Grid2 container spacing={2} sx={{ mb: 3 }}>
            {currentMissionaries.map((missionary) => (
              <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={missionary.id}>
                <ActionAreaCard missionary={missionary} />
              </Grid2>
            ))}
          </Grid2>

          {/* Pagination Controls */}
          <Grid2
            container
            sx={{
              padding: 2,
              justifyContent: 'center',
              gap: 2,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(249,250,251,0.7) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px -1px rgba(76, 175, 80, 0.1)',
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
              }}
            />
          </Grid2>
        </Grid2>

        {/* Right Sidebar - Map */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
              borderRadius: '12px',
              position: 'sticky',
              top: '1rem',
              border: '1px solid #E5E7EB',
              boxShadow: '0 10px 15px -3px rgba(76, 175, 80, 0.1)',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              📍 Mapa Regional
            </Typography>
            <LeafletRegionalMap
              centerLat={SOUTH_AMERICA_LAT_CENTER}
              centerLong={SOUTH_AMERICA_LON_CENTER}
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
                }}
              />
            </Box>
          </Paper>
        </Grid2>
      </Grid2>
    </Box>
  );
};

export default SouthAmerica;
