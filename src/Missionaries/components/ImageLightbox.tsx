import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Box, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface Props {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const NAV_BTN = {
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.12)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
  '&:active': { bgcolor: 'rgba(255,255,255,0.32)' },
  '&.Mui-disabled': { opacity: 0, pointerEvents: 'none' },
};

const ImageLightbox: React.FC<Props> = ({ images, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length]
  );

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onClose]);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) { if (delta > 0) next(); else prev(); }
    touchStartX.current = null;
  };

  const multi = images.length > 1;

  const Dot = ({ i }: { i: number }) => (
    <Box
      onClick={() => setIndex(i)}
      sx={{
        width: i === index ? 22 : 9, height: 9, borderRadius: '5px',
        bgcolor: i === index ? '#fff' : 'rgba(255,255,255,0.38)',
        cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    />
  );

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 2000, bgcolor: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar — X */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: { xs: 1.5, sm: 2 }, flexShrink: 0 }}>
        <IconButton onClick={onClose} sx={{ ...NAV_BTN, width: 52, height: 52 }}>
          <CloseIcon sx={{ fontSize: '1.5rem' }} />
        </IconButton>
      </Box>

      {/* Image — swipeable, desktop has side arrows */}
      <Box sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: { xs: 2, sm: 3 }, overflow: 'hidden', gap: { xs: 0, sm: 2.5 },
      }}>
        {/* Desktop-only prev (md+) */}
        {multi && (
          <IconButton onClick={prev} sx={{ ...NAV_BTN, display: { xs: 'none', md: 'inline-flex' }, width: 64, height: 64, flexShrink: 0 }}>
            <ArrowBackIosNewIcon sx={{ fontSize: '1.6rem' }} />
          </IconButton>
        )}

        <Box
          component="img"
          src={images[index]}
          alt={`Foto ${index + 1}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          draggable={false}
          sx={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', borderRadius: '10px',
            boxShadow: '0 12px 60px rgba(0,0,0,0.6)',
            userSelect: 'none', touchAction: 'pan-y',
          }}
        />

        {/* Desktop-only next (md+) */}
        {multi && (
          <IconButton onClick={next} sx={{ ...NAV_BTN, display: { xs: 'none', md: 'inline-flex' }, width: 64, height: 64, flexShrink: 0 }}>
            <ArrowForwardIosIcon sx={{ fontSize: '1.6rem' }} />
          </IconButton>
        )}
      </Box>

      {/* Bottom bar */}
      <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: { xs: 2.5, sm: 3 } }}>

        {/* Mobile/tablet nav row: big ← dots → (up to md) */}
        {multi && (
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 2.5 }}>
            <IconButton onClick={prev} sx={{ ...NAV_BTN, width: 60, height: 60 }}>
              <ArrowBackIosNewIcon sx={{ fontSize: '1.6rem' }} />
            </IconButton>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {images.map((_, i) => <Dot key={i} i={i} />)}
            </Box>
            <IconButton onClick={next} sx={{ ...NAV_BTN, width: 60, height: 60 }}>
              <ArrowForwardIosIcon sx={{ fontSize: '1.6rem' }} />
            </IconButton>
          </Box>
        )}

        {/* Desktop dots only — side arrows handle navigation (md+) */}
        {multi && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.75 }}>
            {images.map((_, i) => <Dot key={i} i={i} />)}
          </Box>
        )}

        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            color: '#fff', borderColor: 'rgba(255,255,255,0.45)',
            px: 5, py: 1.5, borderRadius: '28px',
            fontSize: { xs: '1.05rem', sm: '0.95rem' }, fontWeight: 600,
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          Regresar
        </Button>
      </Box>

    </Box>
  );
};

export default ImageLightbox;
