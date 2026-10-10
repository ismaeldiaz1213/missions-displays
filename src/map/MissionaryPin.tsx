import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { profilePhotoUrl } from '../storageUrl';
import { BRAND } from '../ui/brand';
import type { Cluster } from './clusters';
import './map.css';

export const PIN_SIZE = 52;

/** Round photo pin on a map; shows a count when several missionaries share the spot. */
const MissionaryPin: React.FC<{ cluster: Cluster; color: string; open: boolean; onClick: (e: React.MouseEvent) => void; size?: number }> = ({
  cluster, color, open, onClick, size = PIN_SIZE,
}) => (
  <ButtonBase
    aria-label={cluster.people.map((m) => m.name).join(', ')}
    onClick={onClick}
    className={`map-pin${open ? ' is-open' : ''}`}
    sx={{
      position: 'absolute', left: cluster.x - size / 2, top: cluster.y - size / 2, width: size, height: size,
      borderRadius: '50%', border: '3px solid #fff', boxShadow: `0 0 0 3px ${color}, 0 8px 20px rgba(15,23,42,0.3)`,
      overflow: 'visible', zIndex: open ? 5 : 3, '--pin-color': color,
    }}
  >
    <Box component="img" src={profilePhotoUrl(cluster.people[0])} alt="" draggable={false}
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-missionary.svg'; }}
      sx={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
    {cluster.people.length > 1 && (
      <Box sx={{
        position: 'absolute', top: -8, right: -10, minWidth: 24, height: 24, px: 0.6, borderRadius: '999px',
        bgcolor: BRAND.amber, color: '#fff', fontWeight: 800, fontSize: '0.8rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
      }}>
        {cluster.people.length}
      </Box>
    )}
  </ButtonBase>
);

export default MissionaryPin;
