import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Missionary } from '../types';
import { profilePhotoUrl } from '../storageUrl';
import { BRAND, eyebrowSx } from '../ui/brand';
import { PIN_SIZE } from './MissionaryPin';
import type { Cluster } from './clusters';

const PIN_CARD_WIDTH = 330;

/** One tappable row: photo, name, city — used in map cards and lists. */
const MissionaryRow: React.FC<{ m: Missionary }> = ({ m }) => {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate(`/misionero/${m.id}`)} sx={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: '14px', textAlign: 'left',
      '&:hover': { bgcolor: '#F1F5F9' },
    }}>
      <Box component="img" src={profilePhotoUrl(m)} alt=""
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-missionary.svg'; }}
        sx={{ width: 60, height: 60, borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[m.name, m.lastName].filter(Boolean).join(' ')}
        </Typography>
        <Typography sx={{ color: BRAND.muted, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[m.location?.city, m.location?.country].filter(Boolean).join(', ')}
        </Typography>
      </Box>
      <ChevronRightIcon sx={{ color: BRAND.faint }} />
    </ButtonBase>
  );
};

/** "Who's here" card that pops up beside a pin, kept inside the map's box. */
const PinCard: React.FC<{ cluster: Cluster; title: string; color: string; mapWidth: number; mapHeight: number; onClose: () => void }> = ({
  cluster, title, color, mapWidth, mapHeight, onClose,
}) => {
  const left = cluster.x + PIN_SIZE / 2 + 16 + PIN_CARD_WIDTH < mapWidth
    ? cluster.x + PIN_SIZE / 2 + 16
    : Math.max(8, cluster.x - PIN_SIZE / 2 - 16 - PIN_CARD_WIDTH);
  const top = Math.max(16, Math.min(cluster.y - 60, mapHeight - 100 - cluster.people.length * 76));
  return (
    <Box onClick={(e) => e.stopPropagation()} className="map-card" sx={{
      position: 'absolute', left, top, width: PIN_CARD_WIDTH, zIndex: 10,
      bgcolor: '#fff', borderRadius: '20px', p: 1, boxShadow: '0 20px 50px rgba(15,23,42,0.25)', border: `2px solid ${color}`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5 }}>
        <Typography sx={{ ...eyebrowSx, flex: 1, fontWeight: 800 }}>{title}</Typography>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar"><CloseIcon fontSize="small" /></IconButton>
      </Box>
      {cluster.people.map((m) => <MissionaryRow key={m.id} m={m} />)}
    </Box>
  );
};

export default PinCard;
