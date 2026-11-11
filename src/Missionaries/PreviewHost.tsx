import React, { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { Missionary as MissionaryType } from '../types';
import Missionary from './Missionary';

export const PREVIEW_PATH = '/misioneros/vista-previa';

/**
 * /misioneros/vista-previa — only ever shown inside a preview frame (src/ui/PreviewFrame.tsx).
 * The page to show arrives from the parent window, so unpublished changes can be previewed at
 * a real desktop or phone width, with the public page's own layout.
 */
const PreviewHost: React.FC = () => {
  const [page, setPage] = useState<MissionaryType | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'ibl-preview') return;
      setPage(e.data.page as MissionaryType);
    };
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'ibl-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!page) return <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  return <Missionary preview={page} />;
};

export default PreviewHost;
