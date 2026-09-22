import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { VideoSource } from '../conferenceContent';

const frameSx = {
  position: 'relative' as const, borderRadius: '2px', overflow: 'hidden',
  border: '1px solid color-mix(in srgb, var(--ibl-accent) 40%, transparent)',
  boxShadow: '0 30px 60px rgba(0, 0, 0, 0.35)', bgcolor: '#1b0d10',
};

const PlayButton: React.FC<{ label: string }> = ({ label }) => (
  <>
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(46, 12, 18, 0.35)' }} />
    <Box className="conf-play" aria-hidden sx={{
      position: 'absolute', top: '50%', left: '50%', translate: '-50% -50%',
      width: { xs: 66, md: 84 }, height: { xs: 66, md: 84 }, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'color-mix(in srgb, var(--ibl-accent) 88%, transparent)', color: '#2E1D12',
      transition: 'transform 0.25s ease, background-color 0.25s ease',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    }}>
      <PlayArrowIcon sx={{ fontSize: { xs: '2.2rem', md: '2.8rem' }, ml: 0.5 }} />
    </Box>
    <Typography aria-hidden sx={{
      position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center',
      color: 'var(--ibl-on-primary)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.06em',
      textShadow: '0 2px 10px rgba(0,0,0,0.6)',
    }}>
      {label}
    </Typography>
  </>
);

const coverButtonSx = {
  width: '100%', height: '100%', p: 0, border: 0, cursor: 'pointer', display: 'block',
  position: 'relative' as const, bgcolor: '#1b0d10', overflow: 'hidden', borderRadius: 0,
  '&:hover .conf-play': { transform: 'scale(1.08)', bgcolor: 'var(--ibl-accent)' },
};

/**
 * YouTube: shows the thumbnail until the visitor clicks play, then swaps in the player.
 * Nothing loads from YouTube until someone asks for the video, so the page stays fast
 * and sets no cookies.
 */
export const YouTubeBlock: React.FC<{ id: string; title: string; playLabel: string }> = ({ id, title, playLabel }) => {
  const [playing, setPlaying] = useState(false);
  // Not every video has a maxres thumbnail; hqdefault always exists.
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);

  return (
    <Box sx={{ ...frameSx, aspectRatio: '16 / 9' }}>
      {playing ? (
        <Box component="iframe"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen
          sx={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
      ) : (
        <Box component="button" type="button" onClick={() => setPlaying(true)} aria-label={`${playLabel}: ${title}`} sx={coverButtonSx}>
          <Box component="img" src={thumb} alt="" loading="lazy"
            onError={() => setThumb(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <PlayButton label={playLabel} />
        </Box>
      )}
    </Box>
  );
};

/**
 * A video we host ourselves. preload="none" matters: the English invitation is ~50 MB,
 * and nobody should download it just by opening the page.
 */
export const FileVideoBlock: React.FC<{ src: string; poster: string; portrait?: boolean; title: string; playLabel: string }> =
  ({ src, poster, portrait, title, playLabel }) => {
    const [playing, setPlaying] = useState(false);
    const ratio = portrait ? '9 / 16' : '16 / 9';

    return (
      <Box sx={{
        ...frameSx, aspectRatio: ratio, mx: 'auto',
        // A phone video would be huge on a desktop at full width; cap it by height instead.
        width: portrait ? { xs: '100%', sm: 'auto' } : '100%',
        height: portrait ? { sm: 'min(78vh, 720px)' } : undefined,
        maxWidth: '100%',
      }}>
        {playing ? (
          <Box component="video" src={src} poster={poster} controls autoPlay playsInline title={title}
            sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', bgcolor: '#000' }} />
        ) : (
          <Box component="button" type="button" onClick={() => setPlaying(true)} aria-label={`${playLabel}: ${title}`} sx={coverButtonSx}>
            <Box component="img" src={poster} alt="" loading="lazy"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <PlayButton label={playLabel} />
          </Box>
        )}
      </Box>
    );
  };

const VideoBlock: React.FC<{ source: VideoSource; title: string; playLabel: string }> = ({ source, title, playLabel }) =>
  source.kind === 'youtube'
    ? <YouTubeBlock id={source.id} title={title} playLabel={playLabel} />
    : <FileVideoBlock src={source.src} poster={source.poster} portrait={source.portrait} title={title} playLabel={playLabel} />;

export default VideoBlock;
