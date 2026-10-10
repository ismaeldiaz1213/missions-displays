import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Missionary } from '../types';
import { profilePhotoUrl } from '../storageUrl';
import { BRAND } from './brand';

/**
 * "Ore hoy por…" — today's missionary (see missionaryOfTheDay). `pill` is the small button
 * at the bottom of the phone layout; `card` is the larger version on the home screen.
 */
const MissionaryOfTheDay: React.FC<{ missionary: Missionary; variant?: 'pill' | 'card'; onClick?: () => void }> = ({
  missionary: m, variant = 'pill', onClick,
}) => {
  const navigate = useNavigate();
  const card = variant === 'card';
  const name = [m.name, m.lastName].filter(Boolean).join(' ');
  const place = [m.location?.city, m.location?.country].filter(Boolean).join(', ');
  return (
    <ButtonBase onClick={onClick ?? (() => navigate(`/misionero/${m.id}`))} sx={{
      width: '100%', display: 'flex', alignItems: 'center', gap: card ? 2 : 1.25, textAlign: 'left',
      p: card ? 2 : 1, pr: card ? 2.5 : 1.5, borderRadius: card ? '24px' : '999px',
      bgcolor: BRAND.white, border: `2px solid ${BRAND.blueLine}`,
      boxShadow: card ? '0 18px 48px rgba(30,58,138,0.18)' : '0 4px 14px rgba(30,58,138,0.1)',
    }}>
      <Box component="img" src={profilePhotoUrl(m)} alt=""
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-missionary.svg'; }}
        sx={{ width: card ? 88 : 40, height: card ? 88 : 40, borderRadius: card ? '18px' : '50%', objectFit: 'cover', flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: BRAND.amberDeep, fontWeight: 800, fontSize: card ? '0.85rem' : '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🙏 Misionero del día
        </Typography>
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: card ? '1.35rem' : '0.95rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: card ? 'normal' : 'nowrap' }}>
          {card ? `Ore hoy por ${name}` : name}
        </Typography>
        {card && place && <Typography sx={{ color: BRAND.muted, fontSize: '0.95rem', mt: 0.25 }}>{place}</Typography>}
      </Box>
      <ChevronRightIcon sx={{ color: BRAND.faint, fontSize: card ? '2rem' : '1.5rem' }} />
    </ButtonBase>
  );
};

export default MissionaryOfTheDay;
