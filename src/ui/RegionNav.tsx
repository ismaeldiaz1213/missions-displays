import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { REGIONS, type RegionId } from '../map/regions';
import { BRAND } from './brand';

/**
 * The list of continents on the kiosk's left side (world map and continent pages): one row
 * each, with its color and how many missionaries serve there.
 */
const RegionNav: React.FC<{
  counts: Partial<Record<RegionId, number>>;
  onSelect: (id: RegionId) => void;
  /** The page you're on (continent pages) */
  current?: RegionId;
  /** Lit up while the map hovers or touches that region */
  active?: RegionId | null;
  onActiveChange?: (id: RegionId | null) => void;
}> = ({ counts, onSelect, current, active, onActiveChange }) => (
  <Box component="nav" aria-label="Continentes" sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
    {REGIONS.map((r) => {
      const n = counts[r.id] ?? 0;
      const here = current === r.id;
      const lit = here || active === r.id;
      return (
        <ButtonBase
          key={r.id}
          onClick={() => onSelect(r.id)}
          onMouseEnter={() => onActiveChange?.(r.id)}
          onMouseLeave={() => onActiveChange?.(null)}
          onFocus={() => onActiveChange?.(r.id)}
          onBlur={() => onActiveChange?.(null)}
          aria-current={here ? 'page' : undefined}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, px: 1.75, py: { md: 1.4, xl: 1.7 }, borderRadius: '14px', flexShrink: 0,
            justifyContent: 'flex-start', textAlign: 'left', border: '1.5px solid',
            borderColor: lit ? r.color : BRAND.line, bgcolor: here ? r.color : lit ? `${r.color}14` : BRAND.white,
            transition: 'all 0.15s ease',
          }}
        >
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: here ? '#fff' : r.color, flexShrink: 0, boxShadow: `0 0 0 4px ${here ? 'rgba(255,255,255,0.35)' : `${r.color}33`}` }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: here ? '#fff' : BRAND.ink, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>{r.name}</Typography>
            <Typography sx={{ color: here ? 'rgba(255,255,255,0.85)' : n ? BRAND.muted : BRAND.faint, fontSize: '0.85rem', fontWeight: 600 }}>
              {n === 1 ? '1 misionero' : n ? `${n} misioneros` : 'Sin misioneros aún'}
            </Typography>
          </Box>
          {!here && <ChevronRightIcon sx={{ color: lit ? r.color : '#CBD5E1' }} />}
        </ButtonBase>
      );
    })}
  </Box>
);

export default RegionNav;
