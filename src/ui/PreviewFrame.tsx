import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import type { Missionary } from '../types';

const PREVIEW_PATH = '/misioneros/vista-previa';
const DEVICES = { desktop: { w: 1366, h: 900 }, phone: { w: 390, h: 844 } };
type Device = keyof typeof DEVICES;

/**
 * A missionary page exactly as it will look: rendered in a real-size frame (a desktop or a phone)
 * and scaled down to fit. Because the frame has the device's true width, the page uses its own
 * desktop or phone layout instead of squeezing the desktop one into a narrow box.
 */
const PreviewFrame: React.FC<{ page: Missionary; height?: number | string; lang?: 'es' | 'en' }> = ({ page, height = '70vh', lang = 'es' }) => {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [device, setDevice] = useState<Device | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Narrow spaces start on the phone view; the toggle switches.
  const current: Device = device ?? (size.w && size.w < 700 ? 'phone' : 'desktop');
  const d = DEVICES[current];

  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'ibl-preview', page: JSON.parse(JSON.stringify(page)) }, window.location.origin);
  }, [page]);

  useEffect(() => { send(); }, [send]);
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'ibl-preview-ready' && e.source === frame.current?.contentWindow) send();
    };
    window.addEventListener('message', onReady);
    return () => window.removeEventListener('message', onReady);
  }, [send]);

  // Desktop fills the width (taller virtual height); the phone fits inside the box.
  const scale = current === 'desktop'
    ? Math.min(1, size.w / d.w || 1)
    : Math.min(1, (size.h - 16) / d.h || 1, (size.w - 16) / d.w || 1);
  const frameH = current === 'desktop' ? Math.max(d.h, size.h / scale) : d.h;

  return (
    <Box>
      <ToggleButtonGroup exclusive size="small" value={current} onChange={(_, v) => v && setDevice(v)} sx={{ mb: 1 }}>
        <ToggleButton value="desktop" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 700 }}>
          <DesktopWindowsOutlinedIcon fontSize="small" />{lang === 'en' ? 'Computer' : 'Computadora'}
        </ToggleButton>
        <ToggleButton value="phone" sx={{ px: 1.5, gap: 0.75, textTransform: 'none', fontWeight: 700 }}>
          <PhoneIphoneOutlinedIcon fontSize="small" />{lang === 'en' ? 'Phone' : 'Teléfono'}
        </ToggleButton>
      </ToggleButtonGroup>
      <Box ref={box} sx={{
        height, position: 'relative', overflow: 'hidden', borderRadius: '16px', border: 1, borderColor: 'divider',
        bgcolor: current === 'phone' ? 'action.hover' : '#F4F7FB',
      }}>
        {size.w > 0 && (
          <Box sx={{
            position: 'absolute', top: current === 'phone' ? 8 : 0, left: '50%',
            width: d.w, height: frameH, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center',
            ...(current === 'phone' && { borderRadius: '28px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(15,23,42,0.25)', border: '6px solid #0F172A' }),
          }}>
            <iframe ref={frame} src={PREVIEW_PATH} title="preview" onLoad={send}
              style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#F4F7FB' }} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PreviewFrame;
