import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';

const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const SKIP_PATHS = ['/', '/admin'];

export const useInactivityRedirect = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    if (!isDesktop) return;
    if (SKIP_PATHS.includes(pathname)) return;

    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => navigate('/'), TIMEOUT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate, pathname, isDesktop]);
};
