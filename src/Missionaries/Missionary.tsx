import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid2, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { pdfjs } from 'react-pdf';import { getMissionaryById } from '../mockData';
import { Missionary as MissionaryType } from '../types';
import MissionaryHeader from './components/MissionaryHeader';
import MissionaryInfoPanel from './components/MissionaryInfoPanel';
import MissionaryMediaGallery from './components/MissionaryMediaGallery';
import MissionaryPrayerLetter from './components/MissionaryPrayerLetter';
import MissionaryNotes from './components/MissionaryNotes';
import ContactDialog from './components/ContactDialog';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Missionary: React.FC = () => {
  const { missionary: missionaryId } = useParams<{ missionary: string }>();
  const navigate = useNavigate();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const missionaryData = getMissionaryById(missionaryId || '') || ({
    id: '1',
    name: 'Manuel',
    lastName: 'Robles',
    organization: 'Iglesia Bautista Libertad',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    description: 'Missionary information not found',
    media: [],
    contactInfo: [],
    location: { city: 'Unknown', country: 'Unknown', latitude: 0, longitude: 0 },
    continent: 'north-america',
    missionType: 'Unknown',
  } as MissionaryType);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevPage() {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F4F8 100%)',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        pb: 3,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Section */}
      <MissionaryHeader missionary={missionaryData} />

      {/* Main 3-Column Content Section */}
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3, flex: 1 }}>
        <Grid2 container spacing={3}>
          {/* Left Column: Missionary Info */}
          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
            <MissionaryInfoPanel
              missionary={missionaryData}
              onContactClick={() => setContactDialogOpen(true)}
            />
          </Grid2>

          {/* Middle Column: Photos Grid */}
          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
            <MissionaryMediaGallery missionary={missionaryData} />
          </Grid2>

          {/* Right Column: Prayer Letter */}
          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
            <MissionaryPrayerLetter
              numPages={numPages}
              pageNumber={pageNumber}
              onLoadSuccess={onDocumentLoadSuccess}
              onNextPage={goToNextPage}
              onPrevPage={goToPrevPage}
            />
          </Grid2>
        </Grid2>
      </Box>

      {/* Footer Section: Comments and Back Button */}
      <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
        <MissionaryNotes notes={missionaryData.specialNotes} />

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            sx={{
              background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              color: 'white',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              },
            }}
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
        </Box>
      </Box>

      {/* Contact Dialog */}
      <ContactDialog
        open={contactDialogOpen}
        missionary={missionaryData}
        onClose={() => setContactDialogOpen(false)}
      />
    </Box>
  );
};

export default Missionary;
