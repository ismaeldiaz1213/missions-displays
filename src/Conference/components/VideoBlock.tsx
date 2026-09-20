import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { CONFERENCE_VIDEO_ID } from '../conferenceContent';
import type { ConferenceStrings } from '../conferenceI18n';

/**
 * Shows the YouTube thumbnail until the visitor clicks play, then swaps in the player.
 * Nothing loads from YouTube on page load, so the page stays fast and sets no cookies
 * until someone actually asks for the video.
 */
const VideoBlock: React.FC<{ t: ConferenceStrings }> = ({ t }) => {
  const [playing, setPlaying] = useState(false);
  // Not every video has a maxres thumbnail; hqdefault always exists.
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${CONFERENCE_VIDEO_ID}/maxresdefault.jpg`);

  return (
    <Box sx={{
      position: 'relative', borderRadius: '2px', overflow: 'hidden', aspectRatio: '16 / 9',
      border: '1px solid color-mix(in srgb, var(--ibl-accent) 40%, transparent)',
      boxShadow: '0 30px 60px rgba(0, 0, 0, 0.35)', bgcolor: '#1b0d10',
    }}>
      {playing ? (
        <Box component="iframe"
          src={`https://www.youtube-nocookie.com/embed/${CONFERENCE_VIDEO_ID}?autoplay=1&rel=0`}
          title={t.videoTitle} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen
          sx={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
      ) : (
        <Box component="button" type="button" onClick={() => setPlaying(true)} aria-label={t.videoPlay}
          sx={{
            width: '100%', height: '100%', p: 0, border: 0, cursor: 'pointer', display: 'block',
            position: 'relative', bgcolor: '#1b0d10', overflow: 'hidden',
            '&:hover .conf-play': { transform: 'scale(1.08)', bgcolor: 'var(--ibl-accent)' },
          }}>
          <Box component="img" src={thumb} alt="" loading="lazy"
            onError={() => setThumb(`https://i.ytimg.com/vi/${CONFERENCE_VIDEO_ID}/hqdefault.jpg`)}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
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
            {t.videoPlay}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VideoBlock;
