import { useEffect } from 'react';

const SITE = 'Misiones IBL';

/** Sets the browser tab title ("Juan Pérez · Misiones IBL"); no argument = the site's own name. */
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : 'Misiones · Iglesia Bautista Libertad';
  }, [title]);
};
