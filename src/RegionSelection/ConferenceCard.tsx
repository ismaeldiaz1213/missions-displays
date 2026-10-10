import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { POSTER_SRC_SMALL } from '../Conference/conferenceContent';
import { CONFERENCE, RECAP, daysUntilConference, type ConferencePhase } from './kioskContent';

/** Harvest-themed card that opens the conference panel. Its text follows the conference stage. */
const ConferenceCard: React.FC<{ phase: ConferencePhase; onClick: () => void; compact?: boolean }> = ({ phase, onClick, compact }) => {
  const days = daysUntilConference();
  const live = phase === 'live';
  const [eyebrow, title, sub] =
    phase === 'over' ? [RECAP.cardEyebrow, RECAP.cardTitle, 'Vea fotos y videos']
      : live ? ['¡Es esta semana!', 'Conferencia de Misiones 2026', 'Misioneros: toque aquí para agregar su información']
        : [days > 1 ? `Faltan ${days} días` : days === 1 ? '¡Mañana!' : 'Muy pronto', 'Conferencia de Misiones 2026', CONFERENCE.dates];

  return (
    <ButtonBase onClick={onClick} sx={{
      width: '100%', flexShrink: 0, display: 'flex', alignItems: 'stretch', textAlign: 'left', borderRadius: '18px', overflow: 'hidden',
      border: `2px solid ${live ? '#C08A2E' : '#E3C381'}`,
      background: live ? 'linear-gradient(135deg, #FDF3DC 0%, #F3D9A4 100%)' : 'linear-gradient(135deg, #FFFCF6 0%, #FBF0DA 100%)',
      boxShadow: live ? '0 8px 24px rgba(192,138,46,0.35)' : '0 4px 14px rgba(192,138,46,0.15)',
      animation: live ? 'conf-glow 2.4s ease-in-out infinite' : undefined,
      '@keyframes conf-glow': { '0%, 100%': { boxShadow: '0 8px 24px rgba(192,138,46,0.3)' }, '50%': { boxShadow: '0 8px 34px rgba(192,138,46,0.6)' } },
    }}>
      {!compact && <Box component="img" src={POSTER_SRC_SMALL} alt="" sx={{ width: 84, objectFit: 'cover', objectPosition: 'left', flexShrink: 0 }} />}
      <Box sx={{ px: 1.5, py: 1.1, flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: '#8C2436', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{eyebrow}</Typography>
        <Typography sx={{ color: '#2E1D12', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2, mt: 0.25 }}>{title}</Typography>
        <Typography sx={{ color: '#7C6650', fontSize: '0.82rem', fontWeight: 600, mt: 0.25 }}>{sub}</Typography>
      </Box>
    </ButtonBase>
  );
};

export default ConferenceCard;
