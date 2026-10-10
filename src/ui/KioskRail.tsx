import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { BRAND } from './brand';

export interface RailItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  /** `soft` and `navy` set apart navigation (Volver, Mapa) from the page's own sections. */
  tone?: 'plain' | 'soft' | 'navy';
  /** Accent for the active state (defaults to brand blue). */
  color?: string;
}

/**
 * Column of big icon buttons for the hallway touchscreens. Sits low on the right edge so
 * kids can reach it. `floating` pins it to the viewport; otherwise it's a normal column.
 * A `null` entry draws a divider.
 */
const KioskRail: React.FC<{ items: (RailItem | null)[]; floating?: boolean; label: string }> = ({ items, floating, label }) => (
  <Box component="nav" aria-label={label} sx={{
    display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 0.75, p: 0.75, width: 112,
    bgcolor: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)', borderRadius: '24px',
    border: `1px solid ${BRAND.line}`, boxShadow: '0 16px 48px rgba(30,58,138,0.16)',
    maxHeight: '90vh', overflowY: 'auto', flexShrink: 0,
    ...(floating && { position: 'fixed', right: 16, bottom: '5vh', zIndex: 998 }),
  }}>
    {items.map((item, i) => {
      if (!item) return <Box key={`divider-${i}`} sx={{ height: '1px', bgcolor: BRAND.line, mx: 1, my: 0.25, flexShrink: 0 }} />;
      const accent = item.color ?? BRAND.blue;
      const tone = item.tone ?? 'plain';
      const colors = item.active
        ? { color: BRAND.white, bgcolor: accent, '&:hover': { bgcolor: accent } }
        : tone === 'navy'
          ? { color: BRAND.white, bgcolor: BRAND.navy, '&:hover': { bgcolor: BRAND.blue } }
          : tone === 'soft'
            ? { color: BRAND.navy, bgcolor: BRAND.blueSoft, '&:hover': { bgcolor: '#DBEAFE' } }
            : { color: BRAND.navy, '&:hover': { bgcolor: BRAND.blueSoft } };
      return (
        <ButtonBase key={item.key} onClick={item.onClick} aria-current={item.active || undefined} sx={{
          display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.4, px: 0.5, borderRadius: '18px', flexShrink: 0,
          transition: 'background-color 0.15s ease', '& svg': { fontSize: '2rem' }, ...colors,
        }}>
          {item.icon}
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.2, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {item.label}
          </Typography>
        </ButtonBase>
      );
    })}
  </Box>
);

export default KioskRail;
