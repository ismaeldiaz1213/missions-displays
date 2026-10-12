import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';

// The public pages people touch on the hallway screens. Admin, registration and the
// request form keep normal browser behavior (people type and copy there).
const KIOSK_PATHS = ['/', '/region-selection', '/norte-america', '/centro-america', '/sur-america', '/europa', '/africa', '/asia', '/oceania'];
const KIOSK_PREFIXES = ['/misionero/'];

export const isKioskPath = (pathname: string) => KIOSK_PATHS.includes(pathname) || KIOSK_PREFIXES.some((p) => pathname.startsWith(p));

/** True on a kiosk page shown on a wide screen (phones and the admin pages keep normal browsing). */
export const useIsKiosk = () => {
  const { pathname } = useLocation();
  const wide = useMediaQuery('(min-width: 768px)');
  return wide && isKioskPath(pathname);
};

/** A finger that travels farther than this between touching and lifting was swiping, not tapping. */
const TAP_SLOP_PX = 14;

/**
 * On the kiosk screens (wide screen + kiosk page) turn off the browser's own touch features:
 * pinch/double-tap zoom, text selection, the long-press menu (save image, copy…), image
 * dragging, and full screen video. Also drops "taps" that were really swipes, so sliding a
 * finger across the screen never opens a page by accident.
 */
export const useKioskMode = () => {
  const on = useIsKiosk();

  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.classList.add('kiosk');

    let down: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => { if (e.isPrimary) down = { x: e.clientX, y: e.clientY }; };
    const onClick = (e: MouseEvent) => {
      const start = down;
      down = null;
      if (!start || e.target instanceof HTMLVideoElement) return; // let the video's own controls be
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const block = (e: Event) => e.preventDefault();
    // Touchpad pinch arrives as ctrl + wheel; Ctrl +/-/0 zoom from a keyboard left plugged in
    const onWheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault(); };
    // Videos can't go full screen on the kiosk (there's no Esc key to get back)
    const onFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('contextmenu', block, true);
    window.addEventListener('dragstart', block, true);
    window.addEventListener('selectstart', block, true);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      root.classList.remove('kiosk');
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('contextmenu', block, true);
      window.removeEventListener('dragstart', block, true);
      window.removeEventListener('selectstart', block, true);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [on]);
};

/**
 * Props for every <video> people can play: no download, picture-in-picture or casting
 * anywhere, and no full screen on the kiosk. Seeking stays (the kiosks have no sound, so
 * skipping around is how people watch).
 */
export const videoLockProps = (kiosk: boolean) => ({
  controlsList: kiosk ? 'nodownload noremoteplayback noplaybackrate nofullscreen' : 'nodownload noremoteplayback',
  disablePictureInPicture: true,
  disableRemotePlayback: true,
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
});
