import React from 'react';
import { Box, Typography } from '@mui/material';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { BRAND } from './brand';
import './tapPrompt.css';

/**
 * "Touch the screen" invitation: one big pill with a hand that keeps pressing a glowing button
 * (ripples on every press) and an arrow nudging forward. Decorative only — the whole screen is
 * the real target, so taps on it fall through to the page.
 */
const TapPrompt: React.FC<{ title: string; subtitle?: string; size?: 'md' | 'lg' }> = ({ title, subtitle, size = 'md' }) => {
  const lg = size === 'lg';
  const disc = lg ? 132 : 96;
  return (
    <Box className="tap-prompt" aria-hidden sx={{
      display: 'flex', alignItems: 'center', gap: lg ? 3 : 2, pointerEvents: 'none',
      pl: lg ? 1.5 : 1, pr: lg ? 4.5 : 3, py: lg ? 1.5 : 1, borderRadius: '999px',
      bgcolor: 'rgba(255,255,255,0.96)', border: `3px solid ${BRAND.blueLine}`,
      boxShadow: '0 22px 60px rgba(30,58,138,0.28)',
    }}>
      <Box sx={{ position: 'relative', width: disc, height: disc, flexShrink: 0 }}>
        <span className="tap-prompt-glow" />
        <span className="tap-prompt-ripple" />
        <span className="tap-prompt-ripple tap-prompt-ripple--late" />
        <Box className="tap-prompt-button" sx={{
          position: 'absolute', inset: '8%', borderRadius: '50%',
          background: `linear-gradient(145deg, ${BRAND.blue} 0%, ${BRAND.navy} 100%)`,
          boxShadow: '0 12px 28px rgba(37,99,235,0.5), inset 0 3px 0 rgba(255,255,255,0.3)',
        }} />
        <TouchAppRoundedIcon className="tap-prompt-hand" sx={{
          position: 'absolute', left: '30%', top: '24%', fontSize: disc * 0.58, color: '#fff',
          filter: 'drop-shadow(0 4px 6px rgba(15,23,42,0.4))',
        }} />
      </Box>
      <Box>
        <Typography sx={{ color: BRAND.navy, fontWeight: 900, fontSize: lg ? '2.2rem' : '1.5rem', lineHeight: 1.1, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1 }}>
          {title}
          <ArrowForwardRoundedIcon className="tap-prompt-arrow" sx={{ fontSize: lg ? '2.2rem' : '1.5rem', color: BRAND.amber }} />
        </Typography>
        {subtitle && <Typography sx={{ color: BRAND.muted, fontWeight: 700, fontSize: lg ? '1.2rem' : '1rem', mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  );
};

export default TapPrompt;
