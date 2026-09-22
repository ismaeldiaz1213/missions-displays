import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Lang } from '../../Registration/i18n';
import type { GallerySlide } from '../conferenceContent';
import { YouTubeBlock } from './VideoBlock';

const arrowSx = {
  display: { xs: 'none', md: 'inline-flex' },
  position: 'absolute' as const, top: '50%', translate: '0 -50%', zIndex: 2,
  width: 52, height: 52, color: '#2E1D12', bgcolor: 'var(--ibl-accent)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  '&:hover': { bgcolor: 'var(--ibl-accent-soft)' },
  '&.Mui-disabled': { opacity: 0, pointerEvents: 'none' },
};

/**
 * Horizontal gallery of photos and videos. It is a native scroll-snap strip, so swiping
 * on a phone and trackpad scrolling on a laptop just work; the arrows move one slide.
 * The next slide peeks in from the side so it's obvious there is more to see.
 */
const GalleryCarousel: React.FC<{ slides: GallerySlide[]; lang: Lang; playLabel: string; prevLabel: string; nextLabel: string }> =
  ({ slides, lang, playLabel, prevLabel, nextLabel }) => {
    const track = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);

    // Keep the counter and arrows in sync with wherever the user has scrolled to
    const onScroll = useCallback(() => {
      const el = track.current;
      if (!el) return;
      const items = Array.from(el.children) as HTMLElement[];
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      items.forEach((item, i) => {
        const mid = item.offsetLeft + item.offsetWidth / 2;
        if (Math.abs(mid - center) < Math.abs(items[best].offsetLeft + items[best].offsetWidth / 2 - center)) best = i;
      });
      setIndex(best);
    }, []);

    useEffect(() => {
      const el = track.current;
      if (!el) return;
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    }, [onScroll]);

    const go = (to: number) => {
      const el = track.current;
      const item = el?.children[to] as HTMLElement | undefined;
      if (!el || !item) return;
      // Update right away; the scroll listener only keeps up with swipes
      setIndex(to);
      const left = item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2;
      const before = el.scrollLeft;
      el.scrollTo({ left, behavior: 'smooth' });
      // Some browsers (older iOS, background tabs) ignore smooth scrolling entirely; jump instead.
      setTimeout(() => { if (Math.abs(el.scrollLeft - before) < 2) el.scrollLeft = left; }, 350);
    };

    const single = slides.length === 1;

    return (
      <Box sx={{ position: 'relative' }}>
        <IconButton aria-label={prevLabel} onClick={() => go(index - 1)} disabled={index === 0} sx={{ ...arrowSx, left: { md: -8, lg: -26 } }}>
          <ChevronLeftIcon />
        </IconButton>
        <IconButton aria-label={nextLabel} onClick={() => go(index + 1)} disabled={index >= slides.length - 1} sx={{ ...arrowSx, right: { md: -8, lg: -26 } }}>
          <ChevronRightIcon />
        </IconButton>

        <Box ref={track} role="region" aria-roledescription="carousel" tabIndex={0} sx={{
          display: 'flex', gap: { xs: 1.5, md: 2.5 }, overflowX: 'auto', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          py: 1,
          // Spacers let the first and last slides snap to the center. They're pseudo-elements, so they
          // share the slides' percentage base and don't count as children for the index math below.
          ...(single ? {} : {
            '&::before, &::after': {
              content: '""', flex: '0 0 auto',
              width: { xs: 'calc(7.5% - 12px)', md: 'calc(12% - 20px)' },
            },
          }),
          justifyContent: single ? 'center' : 'flex-start',
          outline: 'none',
        }}>
          {slides.map((slide, i) => (
            <Box key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${slides.length}`} sx={{
              flex: '0 0 auto', width: single ? '100%' : { xs: '85%', md: '76%' }, maxWidth: 1000,
              scrollSnapAlign: 'center',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              opacity: single || i === index ? 1 : 0.45,
              transform: single || i === index ? 'none' : 'scale(0.96)',
            }}>
              {slide.kind === 'youtube' ? (
                <YouTubeBlock id={slide.id} title={slide.caption[lang]} playLabel={playLabel} />
              ) : (
                <Box component="img" src={slide.src} alt={slide.alt[lang]} loading="lazy" sx={{
                  display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '2px',
                  border: '1px solid color-mix(in srgb, var(--ibl-accent) 40%, transparent)',
                  boxShadow: '0 30px 60px rgba(0, 0, 0, 0.35)',
                }} />
              )}
              {slide.caption?.[lang] && (
                <Typography sx={{ color: 'rgba(255,248,236,0.8)', fontSize: '0.88rem', mt: 1.25, textAlign: 'center' }}>
                  {slide.caption[lang]}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {!single && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2.5 }}>
            {slides.map((_, i) => (
              <Box key={i} component="button" type="button" aria-label={`${i + 1} / ${slides.length}`} onClick={() => go(i)} sx={{
                width: i === index ? 26 : 8, height: 8, p: 0, border: 0, borderRadius: '999px', cursor: 'pointer',
                bgcolor: i === index ? 'var(--ibl-accent)' : 'rgba(255,248,236,0.35)',
                transition: 'width 0.25s ease, background-color 0.25s ease',
              }} />
            ))}
          </Box>
        )}
      </Box>
    );
  };

export default GalleryCarousel;
