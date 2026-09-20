import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import iblLogo from '../../assets/ibl_logo.png';
import { closeDateLabel, conferenceRangeLabel, daysUntilClose } from '../conference';
import { LOCALES, type Lang, type Strings } from '../i18n';
import '../registration.css';
import '../../Conference/conference.css';

const LanguageToggle: React.FC<{ lang: Lang; onChange: (l: Lang) => void; label: string }> = ({ lang, onChange, label }) => (
  <Box role="radiogroup" aria-label={label} sx={{
    display: 'inline-flex', p: 0.4, borderRadius: '999px',
    bgcolor: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.22)',
  }}>
    {(['es', 'en'] as Lang[]).map((l) => (
      <ButtonBase key={l} role="radio" aria-checked={lang === l} onClick={() => onChange(l)} sx={{
        px: 1.5, py: 0.5, borderRadius: '999px', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em',
        color: lang === l ? 'var(--ibl-primary-dark)' : 'var(--ibl-on-primary)',
        bgcolor: lang === l ? 'var(--ibl-surface)' : 'transparent',
        transition: 'all 0.15s ease',
      }}>
        {l === 'es' ? 'ES' : 'EN'}
      </ButtonBase>
    ))}
  </Box>
);

interface HeroProps {
  showDeadline: boolean;
  t: Strings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  /** Replaces the conference name and hides the conference dates (used by non-conference pages). */
  title?: string;
  /** Shows a "back to the conference page" link above the title. */
  backTo?: string;
}

const Hero: React.FC<HeroProps> = ({ showDeadline, t, lang, onLangChange, title, backTo }) => {
  const days = daysUntilClose();
  const locale = LOCALES[lang];
  const pillSx = {
    display: 'inline-flex', alignItems: 'center', gap: 0.75,
    px: 1.5, py: 0.75, borderRadius: '999px',
    bgcolor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)',
    color: 'var(--ibl-on-primary)', fontWeight: 600, fontSize: { xs: '0.85rem', md: '0.92rem' },
  };

  return (
    <Box component="header" sx={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--ibl-primary-dark) 0%, var(--ibl-primary) 60%, var(--ibl-primary-deep) 100%)',
      boxShadow: '0 4px 24px color-mix(in srgb, var(--ibl-primary-dark) 45%, transparent)',
      px: { xs: 2.5, md: 4 }, pt: { xs: 2, md: 3 }, pb: { xs: 7, md: 9 },
    }}>
      {/* soft decorative glow */}
      <Box sx={{
        position: 'absolute', width: 520, height: 520, borderRadius: '50%', right: -160, top: -220,
        background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 65%)', pointerEvents: 'none',
      }} />
      <Box sx={{ position: 'relative', maxWidth: 1080, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: { xs: 1.5, md: 1 } }}>
          {backTo ? (
            <Box component={RouterLink} to={backTo} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, textDecoration: 'none',
              color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.85rem',
              '&:hover': { color: 'var(--ibl-on-primary)' },
            }}>
              <ArrowBackIcon sx={{ fontSize: '1rem' }} />{t.backToConference}
            </Box>
          ) : <span />}
          <LanguageToggle lang={lang} onChange={onLangChange} label={t.language} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3.5 } }}>
          <Box component="img" src={iblLogo} alt={t.churchName} sx={{
            width: { xs: 64, md: 96 }, height: { xs: 64, md: 96 }, objectFit: 'contain', flexShrink: 0,
            bgcolor: 'var(--ibl-surface)', borderRadius: '50%', p: { xs: 0.75, md: 1 },
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: { xs: '0.72rem', md: '0.8rem' }, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {t.churchName}
            </Typography>
            <Typography component="h1" sx={{ color: 'var(--ibl-on-primary)', fontWeight: 800, fontSize: { xs: '1.65rem', md: '2.6rem' }, lineHeight: 1.1, my: 0.5, textShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              {title ?? t.conferenceName}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              {!title && <Box sx={pillSx}><EventIcon sx={{ fontSize: '1.05rem' }} />{conferenceRangeLabel(locale)}</Box>}
              {showDeadline && (
                <Box sx={pillSx}>
                  <HourglassBottomIcon sx={{ fontSize: '1.05rem' }} />
                  {t.registerUntil(closeDateLabel(locale))}{days <= 14 && ` · ${days === 0 ? t.lastDay : t.daysLeft(days)}`}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export const CenterCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ maxWidth: 560, mx: 'auto', mt: { xs: -4, md: -5 }, px: 2, position: 'relative' }}>
    <Box className="reg-reveal" sx={{
      bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: { xs: 3, md: 5 }, textAlign: 'center',
      boxShadow: '0 15px 40px color-mix(in srgb, var(--ibl-primary-dark) 15%, transparent)',
    }}>
      {children}
    </Box>
  </Box>
);


/**
 * Branded page frame (gradient background + conference header) shared by the registration and upload pages.
 * Conference pages use the 2026 harvest palette; other pages (the missionary page request) keep the site blue.
 */
const PageShell: React.FC<HeroProps & { children: React.ReactNode; harvest?: boolean }> = ({ children, harvest = true, ...hero }) => (
  <Box className={`ibl-reg${harvest ? ' ibl-harvest' : ''}`} sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--ibl-page-top) 0%, var(--ibl-page-bottom) 100%)', pb: 6 }}>
    <Hero {...hero} />
    {children}
  </Box>
);

export default PageShell;
