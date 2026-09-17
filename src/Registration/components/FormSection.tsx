import React from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const FormSection: React.FC<Props> = ({ step, title, subtitle, children }) => (
  <Box
    component="section"
    sx={{
      bgcolor: 'var(--ibl-surface)',
      borderRadius: '16px',
      p: { xs: 2.5, md: 3.5 },
      mb: 3,
      border: '1px solid color-mix(in srgb, var(--ibl-primary) 12%, transparent)',
      boxShadow: '0 4px 24px color-mix(in srgb, var(--ibl-primary-dark) 8%, transparent)',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75, mb: 2.5 }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: 'linear-gradient(135deg, var(--ibl-primary-dark), var(--ibl-primary))',
        color: 'var(--ibl-on-primary)', fontWeight: 800, fontSize: '0.95rem',
      }}>
        {step}
      </Box>
      <Box>
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: { xs: '1.1rem', md: '1.2rem' }, lineHeight: 1.3, mt: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.9rem', mt: 0.25 }}>{subtitle}</Typography>
        )}
      </Box>
    </Box>
    {children}
  </Box>
);

export default FormSection;
