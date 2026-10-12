import React, { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import { isS3Key, storageUrl, videoPosterPath, webVideoPath } from '../../storageUrl';
import { ACTIVITY_EVENT } from '../../useInactivityRedirect';
import { useIsKiosk, videoLockProps } from '../../kioskMode';

/** Picks the transcoded copy when it exists (a 1-byte range request), else the original upload. */
const useVideoSource = (path: string, stored: boolean) => {
  const [src, setSrc] = useState<string | null>(stored ? null : path);
  useEffect(() => {
    if (!stored) { setSrc(path); return; }
    let cancelled = false;
    const web = storageUrl(webVideoPath(path));
    fetch(web, { headers: { Range: 'bytes=0-0' } })
      .then((r) => (r.ok ? web : storageUrl(path)))
      .catch(() => storageUrl(path))
      .then((url) => { if (!cancelled) setSrc(url); });
    return () => { cancelled = true; };
  }, [path, stored]);
  return src;
};

/**
 * Gallery video. Plays the H.264 copy made by the transcodeVideo function, or the original upload
 * until that copy exists. Portrait and landscape clips both sit in a 16:9 frame over a blurred poster.
 */
const VideoPlayer: React.FC<{ path: string; title?: string }> = ({ path, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPing = useRef(0);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterOk, setPosterOk] = useState(true);
  const kiosk = useIsKiosk();

  const stored = isS3Key(path) && path.startsWith('videos/');
  const src = useVideoSource(path, stored);
  const poster = stored && posterOk ? storageUrl(videoPosterPath(path)) : undefined;

  const play = () => {
    setStarted(true);
    videoRef.current?.play().catch(() => { /* the native controls are showing now */ });
  };

  // Watching a long video produces no mouse events; keep the kiosk from timing out mid-video
  const keepAwake = () => {
    const now = Date.now();
    if (now - lastPing.current > 15_000) {
      lastPing.current = now;
      window.dispatchEvent(new Event(ACTIVITY_EVENT));
    }
  };

  return (
    <Box sx={{
      position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden',
      borderRadius: '18px', bgcolor: '#0B1220',
      boxShadow: '0 12px 36px rgba(15,23,42,0.22)',
    }}>
      {poster && (
        <Box component="img" src={poster} alt="" aria-hidden onError={() => setPosterOk(false)} sx={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          filter: 'blur(28px) brightness(0.55)', transform: 'scale(1.15)',
        }} />
      )}

      {!failed && (
        <Box
          component="video"
          ref={videoRef}
          controls={started}
          {...videoLockProps(kiosk)}
          playsInline
          preload="metadata"
          poster={poster}
          src={src ?? undefined}
          onPlay={() => setStarted(true)}
          onTimeUpdate={keepAwake}
          onError={() => setFailed(true)}
          // Audio but no picture: this browser can't decode the codec (e.g. iPhone HEVC on many PCs)
          onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => { if (!e.currentTarget.videoWidth) setFailed(true); }}
          sx={{ position: 'relative', display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}

      {!started && !failed && (
        <ButtonBase onClick={play} disabled={!src} aria-label={title ? `Reproducir ${title}` : 'Reproducir video'} sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 1.5,
          background: 'linear-gradient(180deg, rgba(2,6,23,0) 45%, rgba(2,6,23,0.65) 100%)',
          '&:hover .play-disc': { transform: 'scale(1.08)' },
        }}>
          <Box className="play-disc" sx={{
            width: { xs: 72, md: 96 }, height: { xs: 72, md: 96 }, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.92)', color: '#1E3A8A',
            boxShadow: '0 10px 40px rgba(0,0,0,0.45)', transition: 'transform 0.2s ease',
          }}>
            <PlayArrowRoundedIcon sx={{ fontSize: { xs: 48, md: 64 } }} />
          </Box>
          {title && (
            <Typography sx={{
              position: 'absolute', left: 20, right: 20, bottom: 16, textAlign: 'left',
              color: '#fff', fontWeight: 700, fontSize: { xs: '0.95rem', md: '1.1rem' }, textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            }}>
              {title}
            </Typography>
          )}
        </ButtonBase>
      )}

      {failed && (
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1, p: 3, textAlign: 'center', color: '#fff',
        }}>
          <HourglassTopRoundedIcon sx={{ fontSize: 44, opacity: 0.85 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>Este video se está preparando</Typography>
          <Typography sx={{ opacity: 0.75, fontSize: '0.9rem', maxWidth: 380 }}>
            Estamos convirtiéndolo para que se pueda ver en cualquier pantalla. Vuelva a intentarlo en unos minutos.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VideoPlayer;
