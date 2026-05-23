import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid2, Button, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { pdfjs } from 'react-pdf';
import type { Missionary as MissionaryType } from '../types';
import MissionaryHeader from './components/MissionaryHeader';
import MissionaryInfoPanel from './components/MissionaryInfoPanel';
import MissionaryMediaGallery from './components/MissionaryMediaGallery';
import MissionaryPrayerLetter from './components/MissionaryPrayerLetter';
import MissionaryNotes from './components/MissionaryNotes';
import ContactDialog from './components/ContactDialog';
import outputs from '../../amplify_outputs.json';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const API_ENDPOINT = (outputs as { custom?: { API?: { endpoint?: string } } })?.custom?.API?.endpoint ?? '';

const DEFAULTS: MissionaryType = {
  id: '',
  name: '',
  lastName: '',
  organization: '',
  continent: '',
  location: { city: '', country: '', latitude: 0, longitude: 0 },
  description: '',
  media: [],
  contactInfo: [],
  missionType: '',
};

const Missionary: React.FC = () => {
  const { missionary: missionaryId } = useParams<{ missionary: string }>();
  const navigate = useNavigate();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [missionaryData, setMissionaryData] = useState<MissionaryType>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!missionaryId) { setLoading(false); return; }
    const fetchMissionary = async () => {
      try {
        const res = await fetch(`${API_ENDPOINT}missionaries/${missionaryId}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: Partial<MissionaryType> = await res.json();
        setMissionaryData({ ...DEFAULTS, ...data });
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchMissionary();
  }, [missionaryId]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}
          sx={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', color: 'white' }}>
          Volver
        </Button>
      </Box>
    );
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
      <MissionaryHeader missionary={missionaryData} />

      <Box sx={{ px: { xs: 2, md: 3 }, py: 3, flex: 1 }}>
        <Grid2 container spacing={3}>
          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
            <MissionaryInfoPanel
              missionary={missionaryData}
              onContactClick={() => setContactDialogOpen(true)}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
            <MissionaryMediaGallery missionary={missionaryData} />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
            <MissionaryPrayerLetter
              numPages={numPages}
              pageNumber={pageNumber}
              onLoadSuccess={onDocumentLoadSuccess}
              onNextPage={() => setPageNumber(p => Math.min(p + 1, numPages))}
              onPrevPage={() => setPageNumber(p => Math.max(p - 1, 1))}
            />
          </Grid2>
        </Grid2>
      </Box>

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
              '&:hover': { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' },
            }}
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
        </Box>
      </Box>

      <ContactDialog
        open={contactDialogOpen}
        missionary={missionaryData}
        onClose={() => setContactDialogOpen(false)}
      />
    </Box>
  );
};

export default Missionary;
