import './pdfPolyfills';
import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Dialog, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const pageWidth = () => Math.min(820, window.innerWidth - (window.innerWidth < 768 ? 24 : 200));

/** Fullscreen reader for a missionary's prayer letter (loaded on demand — react-pdf is heavy). */
const PrayerLetterDialog: React.FC<{ url: string; name: string; onClose: () => void }> = ({ url, name, onClose }) => {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(pageWidth);
  // If pdf.js can't open it on this device, fall back to the browser's own PDF viewer
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onResize = () => setWidth(pageWidth());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navBtn = {
    color: '#1E3A8A', bgcolor: '#fff', width: 56, height: 56,
    boxShadow: '0 4px 16px rgba(15,23,42,0.18)',
    '&:hover': { bgcolor: '#EFF6FF' },
    '&.Mui-disabled': { opacity: 0.35, bgcolor: '#fff' },
  };

  return (
    <Dialog open fullScreen onClose={onClose} slotProps={{ paper: { sx: { bgcolor: '#E2E8F0' } } }}>
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 2,
        px: { xs: 2, md: 3 }, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid #E2E8F0',
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: '#64748B', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Carta de oración
          </Typography>
          <Typography sx={{ color: '#0F172A', fontWeight: 800, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </Typography>
        </Box>
        {numPages > 1 && (
          <Typography sx={{ color: '#475569', fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
            Página {page} de {numPages}
          </Typography>
        )}
        <Button onClick={onClose} variant="contained" startIcon={<CloseIcon />} sx={{
          textTransform: 'none', fontWeight: 700, borderRadius: '999px', px: 2.5,
          bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#2563EB' },
        }}>
          Cerrar
        </Button>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 3, py: { xs: 2, md: 4 }, px: 1.5 }}>
        {numPages > 1 && !failed && (
          <IconButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Página anterior"
            sx={{ ...navBtn, display: { xs: 'none', md: 'inline-flex' }, position: 'sticky', top: '45vh' }}>
            <ArrowBackIosNewIcon />
          </IconButton>
        )}
        <Box sx={{ bgcolor: '#fff', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
          {failed ? (
            <Box component="iframe" src={url} title={`Carta de oración — ${name}`} sx={{ display: 'block', border: 0, width, height: '78vh' }} />
          ) : (
            <Document
              file={url}
              onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPage(1); }}
              onLoadError={(err) => { console.error('Prayer letter failed in pdf.js', err); setFailed(true); }}
              loading={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width, height: width * 1.3 }}><CircularProgress /></Box>}
            >
              <Page pageNumber={page} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
            </Document>
          )}
        </Box>
        {numPages > 1 && !failed && (
          <IconButton onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} aria-label="Página siguiente"
            sx={{ ...navBtn, display: { xs: 'none', md: 'inline-flex' }, position: 'sticky', top: '45vh' }}>
            <ArrowForwardIosIcon />
          </IconButton>
        )}
      </Box>

      {numPages > 1 && (
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', gap: 2.5, pb: 3 }}>
          <IconButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Página anterior" sx={navBtn}>
            <ArrowBackIosNewIcon />
          </IconButton>
          <Typography sx={{ color: '#475569', fontWeight: 700 }}>{page} / {numPages}</Typography>
          <IconButton onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} aria-label="Página siguiente" sx={navBtn}>
            <ArrowForwardIosIcon />
          </IconButton>
        </Box>
      )}
    </Dialog>
  );
};

export default PrayerLetterDialog;
