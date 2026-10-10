import React from 'react';
import { Box, Typography } from '@mui/material';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import { BRAND } from './brand';
import './tapPrompt.css';

/**
 * "Touch the screen" invitation: a hand that keeps tapping a button, with ripples on each tap.
 * Decorative only — the whole screen is the real target.
 */
const TapPrompt: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <Box className="tap-prompt" aria-hidden sx={{ display: 'flex', alignItems: 'center', gap: 2.5, pointerEvents: 'none' }}>
    <Box sx={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
      <span className="tap-prompt-ripple" />
      <span className="tap-prompt-ripple tap-prompt-ripple--late" />
      <Box className="tap-prompt-button" sx={{
        position: 'absolute', inset: 10, borderRadius: '50%',
        background: `linear-gradient(145deg, ${BRAND.blue} 0%, ${BRAND.navy} 100%)`,
        boxShadow: '0 12px 28px rgba(37,99,235,0.45), inset 0 2px 0 rgba(255,255,255,0.25)',
      }} />
      <TouchAppRoundedIcon className="tap-prompt-hand" sx={{
        position: 'absolute', left: 30, top: 26, fontSize: 52, color: '#fff',
        filter: 'drop-shadow(0 3px 4px rgba(15,23,42,0.35))',
      }} />
    </Box>
    <Box sx={{
      px: 3, py: 1.5, borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.94)',
      border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 14px 36px rgba(30,58,138,0.16)',
    }}>
      <Typography sx={{ color: BRAND.navy, fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.2 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: BRAND.muted, fontWeight: 600, fontSize: '0.98rem' }}>{subtitle}</Typography>}
    </Box>
  </Box>
);

export default TapPrompt;
