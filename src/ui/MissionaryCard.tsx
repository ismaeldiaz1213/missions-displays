import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { Missionary } from '../types';
import { profilePhotoUrl } from '../storageUrl';
import { BRAND } from './brand';

/** Photo-first card for a missionary in a grid; tapping it opens their page. */
const MissionaryCard: React.FC<{ missionary: Missionary; accent: string; highlighted?: boolean; id?: string }> = ({
  missionary: m, accent, highlighted, id,
}) => {
  const navigate = useNavigate();
  return (
    <ButtonBase id={id} onClick={() => navigate(`/misionero/${m.id}`)} sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left', borderRadius: '20px', overflow: 'hidden',
      bgcolor: BRAND.white, border: `2px solid ${highlighted ? accent : BRAND.line}`,
      boxShadow: highlighted ? `0 0 0 4px ${accent}40, 0 14px 34px rgba(15,23,42,0.16)` : '0 6px 20px rgba(15,23,42,0.07)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 34px rgba(15,23,42,0.14)' },
      '&:hover img': { transform: 'scale(1.04)' },
    }}>
      <Box sx={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden', bgcolor: BRAND.blueSoft }}>
        <Box component="img" src={profilePhotoUrl(m)} alt="" loading="lazy"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-missionary.svg'; }}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.35s ease' }} />
      </Box>
      <Box sx={{ p: { xs: 1.5, md: 2 }, borderTop: `4px solid ${accent}` }}>
        {m.missionType && (
          <Typography sx={{ color: BRAND.amberDeep, fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.missionType}
          </Typography>
        )}
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.2 }}>
          {[m.name, m.lastName].filter(Boolean).join(' ') || 'Misionero'}
        </Typography>
        <Typography sx={{ color: BRAND.muted, fontSize: '0.88rem', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PlaceOutlinedIcon sx={{ fontSize: '1rem', color: accent }} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[m.location?.city, m.location?.country].filter(Boolean).join(', ') || '—'}
          </Box>
        </Typography>
      </Box>
    </ButtonBase>
  );
};

export default MissionaryCard;
