import { useEffect } from 'react';

const SITE = 'Misiones IBL';

/** Sets the browser tab title ("Juan Pérez · Misiones IBL"); no argument = the site's own name; null = leave it. */
export const usePageTitle = (title?: string | null) => {
  useEffect(() => {
    if (title === null) return;
    document.title = title ? `${title} · ${SITE}` : 'Misiones · Iglesia Bautista Libertad';
  }, [title]);
};
