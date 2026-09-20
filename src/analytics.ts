import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Measurement ID is configured in index.html; this only reports the SPA route changes.
declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

/**
 * Google Analytics counts the first load by itself, but this is a single-page app:
 * every later navigation happens without a page load, so we send it by hand.
 */
export const usePageViews = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.gtag?.('event', 'page_view', {
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);
};
