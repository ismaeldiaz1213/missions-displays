import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import ChurchRoundedIcon from '@mui/icons-material/ChurchRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import type { Missionary } from '../types';
import { profilePhotoUrl } from '../storageUrl';
import { HOUSTON_LAT, HOUSTON_LON, distanceKm } from '../constants';
import { BRAND, glassSx } from '../ui/brand';
import DistanceFromHouston from '../ui/DistanceFromHouston';
import type { Stage } from './AttractGlobe';
import type { Verse } from './verses';
import { HOW_TO_HELP } from './verses';

const SERIF = "'Playfair Display', Georgia, serif";

const Eyebrow: React.FC<{ icon: React.ReactNode; children: React.ReactNode; color?: string }> = ({ icon, children, color = BRAND.blue }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.6, borderRadius: '999px', bgcolor: `${color}14`, color, mb: 2.5 }}>
    {icon}
    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{children}</Typography>
  </Box>
);

/** Thin bar that fills over the length of the current moment. */
const Timer: React.FC<{ ms: number }> = ({ ms }) => (
  <Box sx={{ mt: 3.5, height: 4, borderRadius: 2, bgcolor: 'rgba(37,99,235,0.12)', overflow: 'hidden' }}>
    <Box className="home-timer" style={{ animationDuration: `${ms}ms` }} sx={{ height: '100%', bgcolor: BRAND.blue, borderRadius: 2 }} />
  </Box>
);

const VerseBlock: React.FC<{ verse: Verse; size?: 'lg' | 'md' }> = ({ verse, size = 'lg' }) => (
  <Box sx={{ position: 'relative' }}>
    <Typography aria-hidden sx={{ position: 'absolute', top: -58, left: -18, fontFamily: SERIF, fontSize: '9rem', lineHeight: 1, color: BRAND.amber, opacity: 0.22 }}>“</Typography>
    <Typography sx={{
      position: 'relative', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, color: BRAND.ink, lineHeight: 1.3,
      fontSize: size === 'lg' ? 'clamp(1.8rem, 2.5vw, 2.8rem)' : 'clamp(1.4rem, 1.9vw, 2.1rem)',
    }}>
      {verse.text}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2.5 }}>
      <Box sx={{ width: 36, height: 3, borderRadius: 2, bgcolor: BRAND.amber }} />
      <Typography sx={{ color: BRAND.amberDeep, fontWeight: 800, fontSize: '1.15rem', letterSpacing: '0.04em' }}>{verse.ref} · RV1960</Typography>
    </Box>
  </Box>
);

const PersonButton: React.FC<{ m: Missionary }> = ({ m }) => {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={(e) => { e.stopPropagation(); navigate(`/misionero/${m.id}`); }} sx={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 2.5, textAlign: 'left', borderRadius: '24px', p: 1, pr: 2,
      '&:hover': { bgcolor: 'rgba(37,99,235,0.06)' }, '&:hover .go': { transform: 'translateX(4px)' },
    }}>
      <Box component="img" src={profilePhotoUrl(m)} alt=""
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-missionary.svg'; }}
        sx={{
          width: 156, height: 156, borderRadius: '26px', objectFit: 'cover', flexShrink: 0,
          border: '4px solid #fff', boxShadow: '0 12px 30px rgba(15,23,42,0.18)',
        }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {m.missionType && (
          <Typography sx={{ color: BRAND.amberDeep, fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5 }}>
            {m.missionType}
          </Typography>
        )}
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: '2.1rem', lineHeight: 1.12, letterSpacing: '-0.01em' }}>
          {[m.name, m.lastName].filter(Boolean).join(' ')}
        </Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 1.25, px: 1.5, py: 0.6, borderRadius: '999px', bgcolor: BRAND.blue, color: '#fff' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.92rem' }}>Conózcalos</Typography>
          <ArrowForwardRoundedIcon className="go" sx={{ fontSize: '1.1rem', transition: 'transform 0.2s' }} />
        </Box>
      </Box>
    </ButtonBase>
  );
};

/** Several missionaries at one stop sit side by side (a list of three looked like it scrolled). */
const PersonTile: React.FC<{ m: Missionary }> = ({ m }) => {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={(e) => { e.stopPropagation(); navigate(`/misionero/${m.id}`); }} sx={{
      minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, textAlign: 'center',
      borderRadius: '22px', p: 1.25, '&:hover': { bgcolor: 'rgba(37,99,235,0.06)' },
    }}>
      <Box component="img" src={profilePhotoUrl(m)} alt=""
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-missionary.svg'; }}
        sx={{
          width: '100%', maxWidth: 150, aspectRatio: '1', borderRadius: '22px', objectFit: 'cover',
          border: '4px solid #fff', boxShadow: '0 12px 30px rgba(15,23,42,0.18)',
        }} />
      <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.15, overflowWrap: 'anywhere' }}>
        {[m.name, m.lastName].filter(Boolean).join(' ')}
      </Typography>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.5, borderRadius: '999px', bgcolor: BRAND.blue, color: '#fff' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Conózcalos</Typography>
        <ArrowForwardRoundedIcon sx={{ fontSize: '1rem' }} />
      </Box>
    </ButtonBase>
  );
};

const placeOf = (m: Missionary) => ({
  city: [m.location?.city, m.location?.state].filter(Boolean).join(', '),
  country: m.location?.country?.trim() ?? '',
});

/** The glass card beside the globe, one design per moment of the tour. */
const HomeStage: React.FC<{ stage: Stage }> = ({ stage }) => {
  if (stage.kind === 'verse') {
    return (
      <Box sx={{ ...glassSx, p: { md: 4.5, xl: 5.5 } }}>
        <Eyebrow icon={<MenuBookRoundedIcon sx={{ fontSize: '1.15rem' }} />} color={BRAND.amberDeep}>Palabra de Dios</Eyebrow>
        <VerseBlock verse={stage.verse} />
      </Box>
    );
  }

  if (stage.kind === 'fly') {
    const m = stage.stop.people[0];
    const { city, country } = placeOf(m);
    const km = Math.round(distanceKm(HOUSTON_LAT, HOUSTON_LON, m.location.latitude, m.location.longitude));
    return (
      <Box sx={{ ...glassSx, p: { md: 4.5, xl: 5.5 } }}>
        <Eyebrow icon={<FlightRoundedIcon className="home-plane-icon" sx={{ fontSize: '1.15rem' }} />}>En camino</Eyebrow>
        <Typography sx={{ color: BRAND.muted, fontWeight: 700, fontSize: '1.3rem' }}>Volando a</Typography>
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.02, fontSize: 'clamp(2.6rem, 4.2vw, 4.6rem)', mt: 0.5 }}>
          {city || country}
        </Typography>
        {city && country && <Typography sx={{ color: BRAND.navy, fontWeight: 700, fontSize: 'clamp(1.3rem, 1.8vw, 1.9rem)', mt: 0.5 }}>{country}</Typography>}
        {km > 50 && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mt: 2.5, color: BRAND.muted }}>
            <PlaceRoundedIcon sx={{ fontSize: '1.2rem', color: BRAND.amber }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}><DistanceFromHouston km={km} /></Typography>
          </Box>
        )}
        <Timer ms={stage.ms} />
      </Box>
    );
  }

  if (stage.kind === 'arrive') {
    const people = stage.stop.people.slice(0, 3);
    return (
      <Box sx={{ ...glassSx, p: { md: 3.5, xl: 4.5 } }}>
        <Eyebrow icon={<PlaceRoundedIcon sx={{ fontSize: '1.15rem' }} />}>{people.length > 1 ? 'Aquí sirven' : 'Aquí sirve'}</Eyebrow>
        {people.length === 1 ? (
          <PersonButton m={people[0]} />
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${people.length}, minmax(0, 1fr))`, gap: 1 }}>
            {people.map((m) => <PersonTile key={m.id} m={m} />)}
          </Box>
        )}
        <Typography sx={{ color: BRAND.muted, fontWeight: 600, fontSize: '1.05rem', mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlaceRoundedIcon sx={{ fontSize: '1.15rem', color: BRAND.amber }} />
          {[placeOf(people[0]).city, placeOf(people[0]).country].filter(Boolean).join(', ')}
        </Typography>
      </Box>
    );
  }

  if (stage.kind === 'homeward') {
    return (
      <Box sx={{ ...glassSx, p: { md: 4.5, xl: 5.5 } }}>
        <Eyebrow icon={<ChurchRoundedIcon sx={{ fontSize: '1.15rem' }} />} color={BRAND.amberDeep}>De regreso a casa</Eyebrow>
        <Typography sx={{ color: BRAND.ink, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, fontSize: 'clamp(2.4rem, 3.6vw, 3.9rem)' }}>
          Iglesia Bautista Libertad
        </Typography>
        <Typography sx={{ color: BRAND.navy, fontWeight: 700, fontSize: 'clamp(1.3rem, 1.8vw, 1.9rem)', mt: 0.75 }}>Houston, Texas</Typography>
        <Timer ms={stage.ms} />
      </Box>
    );
  }

  return (
    <Box sx={{ ...glassSx, p: { md: 4.5, xl: 5.5 } }}>
      <Eyebrow icon={<ChurchRoundedIcon sx={{ fontSize: '1.15rem' }} />} color={BRAND.amberDeep}>¿Cómo puede ayudar?</Eyebrow>
      <VerseBlock verse={stage.verse} size="md" />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.5, mt: 3.5 }}>
        {HOW_TO_HELP.map((h, i) => (
          <Box key={h.title} className="home-help" style={{ animationDelay: `${0.6 + i * 0.25}s` }} sx={{
            p: 2, borderRadius: '20px', bgcolor: '#fff', border: `1px solid ${BRAND.line}`, boxShadow: '0 8px 20px rgba(30,58,138,0.08)',
          }}>
            <Typography sx={{ fontSize: '1.9rem', lineHeight: 1 }}>{h.emoji}</Typography>
            <Typography sx={{ color: BRAND.ink, fontWeight: 800, fontSize: '1.25rem', mt: 1 }}>{h.title}</Typography>
            <Typography sx={{ color: BRAND.muted, fontSize: '0.92rem', lineHeight: 1.4, mt: 0.25 }}>{h.body}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default HomeStage;
