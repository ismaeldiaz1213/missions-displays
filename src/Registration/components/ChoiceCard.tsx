import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Props {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  role?: 'radio' | 'checkbox';
  error?: boolean;
}

const ChoiceCard: React.FC<Props> = ({ selected, onClick, title, description, icon, role = 'radio', error }) => (
  <ButtonBase
    onClick={onClick}
    role={role}
    aria-checked={selected}
    sx={{
      position: 'relative', width: '100%', height: '100%', minWidth: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.5,
      textAlign: 'left', p: 1.75, borderRadius: '12px',
      bgcolor: selected ? 'color-mix(in srgb, var(--ibl-primary) 7%, var(--ibl-surface))' : 'var(--ibl-surface)',
      border: '1.5px solid',
      borderColor: selected
        ? 'var(--ibl-primary)'
        : error ? 'var(--ibl-danger)' : 'var(--ibl-border)',
      boxShadow: selected ? '0 4px 14px color-mix(in srgb, var(--ibl-primary) 18%, transparent)' : 'none',
      transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
      '&:hover': { borderColor: selected ? 'var(--ibl-primary)' : 'color-mix(in srgb, var(--ibl-primary) 50%, transparent)' },
      '&.Mui-focusVisible': { outline: '3px solid color-mix(in srgb, var(--ibl-primary) 35%, transparent)', outlineOffset: 2 },
    }}
  >
    {icon && (
      <Box sx={{
        width: 42, height: 42, borderRadius: '10px', flexShrink: 0,
        display: 'grid', placeItems: 'center',
        bgcolor: selected ? 'var(--ibl-primary)' : 'color-mix(in srgb, var(--ibl-primary) 8%, transparent)',
        color: selected ? 'var(--ibl-on-primary)' : 'var(--ibl-primary)',
        transition: 'all 0.15s ease',
      }}>
        {icon}
      </Box>
    )}
    <Box sx={{ flex: 1, minWidth: 0, pr: 2.5 }}>
      <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.3 }}>{title}</Typography>
      {description && (
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.82rem', lineHeight: 1.35, mt: 0.25 }}>{description}</Typography>
      )}
    </Box>
    <CheckCircleIcon sx={{
      position: 'absolute', top: 10, right: 10, fontSize: '1.15rem',
      color: 'var(--ibl-primary)', opacity: selected ? 1 : 0, transition: 'opacity 0.15s ease',
    }} />
  </ButtonBase>
);

export default ChoiceCard;
