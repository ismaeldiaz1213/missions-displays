import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import iblLogo from '../assets/ibl_logo.png';
import { LOCALES, useLang, type Lang } from '../Registration/i18n';
import { daysUntilClose, isRegistrationOpen } from '../Registration/conference';
import ScheduleBoard from './components/ScheduleBoard';
import VideoBlock from './components/VideoBlock';
import GalleryCarousel from './components/GalleryCarousel';
import {
  CHURCH_ADDRESS, CHURCH_SITE, GLOBE_ARC, INVITATION_VIDEO, PAST_GALLERY, POSTER_SRC, POSTER_SRC_SMALL, WHEAT_TEXTURE,
} from './conferenceContent';
import { CONFERENCE_PAGE_TITLES, CONFERENCE_STRINGS, type ConferenceStrings } from './conferenceI18n';
import './conference.css';

export const CONFERENCE_PATH = '/conferencia';
const REGISTRATION_PATH = '/conferencia/registro';
const MISSIONARIES_PATH = '/region-selection';

// ── Small pieces ──────────────────────────────────────────────────────────────

/** Fades its children up the first time they scroll into view. */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <Box ref={ref} className={`conf-reveal${visible ? ' is-visible' : ''}`} sx={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Box>
  );
};

const LanguageToggle: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({ lang, onChange }) => (
  <Box role="radiogroup" aria-label="Language" sx={{
    display: 'inline-flex', p: 0.35, borderRadius: '999px',
    bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,248,236,0.3)', backdropFilter: 'blur(6px)',
  }}>
    {(['es', 'en'] as Lang[]).map((l) => (
      <ButtonBase key={l} role="radio" aria-checked={lang === l} onClick={() => onChange(l)} sx={{
        px: 1.4, py: 0.45, borderRadius: '999px', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em',
        color: lang === l ? 'var(--ibl-primary-dark)' : 'var(--ibl-on-primary)',
        bgcolor: lang === l ? 'var(--ibl-surface)' : 'transparent',
        transition: 'all 0.15s ease',
      }}>
        {l === 'es' ? 'ES' : 'EN'}
      </ButtonBase>
    ))}
  </Box>
);

const goldButtonSx = {
  display: 'inline-flex', alignItems: 'center', gap: 1, px: { xs: 3, md: 4 }, py: { xs: 1.5, md: 1.75 },
  borderRadius: '2px', fontWeight: 800, fontSize: { xs: '0.98rem', md: '1.05rem' }, letterSpacing: '0.02em',
  textDecoration: 'none', cursor: 'pointer', border: '1px solid var(--ibl-accent)',
  color: '#2E1D12', bgcolor: 'var(--ibl-accent)',
  transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
  boxShadow: '0 10px 26px rgba(192, 138, 46, 0.32)',
  '&:hover': { bgcolor: 'var(--ibl-accent-soft)', transform: 'translateY(-2px)', boxShadow: '0 14px 32px rgba(192, 138, 46, 0.4)' },
};

const ghostButtonSx = {
  display: 'inline-flex', alignItems: 'center', gap: 0.75, px: { xs: 2.5, md: 3 }, py: { xs: 1.5, md: 1.75 },
  borderRadius: '2px', fontWeight: 700, fontSize: { xs: '0.95rem', md: '1rem' }, textDecoration: 'none',
  cursor: 'pointer', color: 'var(--ibl-on-primary)', border: '1px solid rgba(255,248,236,0.45)',
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
  '&:hover': { bgcolor: 'rgba(255,248,236,0.12)', borderColor: 'var(--ibl-on-primary)' },
};

/** Gold-masked globe from the artwork, bleeding off an edge. */
const GlobeWatermark: React.FC<{ sx?: object; color?: string; opacity?: number }> = ({ sx, color = 'var(--ibl-accent)', opacity = 0.16 }) => (
  <Box className="conf-globe" aria-hidden sx={{
    position: 'absolute', bgcolor: color, opacity, '--conf-globe': `url(${GLOBE_ARC})`, ...sx,
  }} />
);

const SectionHead: React.FC<{ eyebrow: string; title: string; body?: string; light?: boolean }> = ({ eyebrow, title, body, light }) => (
  <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: { xs: 4, md: 5.5 } }}>
    <Typography className="conf-eyebrow" sx={{ color: 'var(--ibl-accent)', mb: 1.5 }}>{eyebrow}</Typography>
    <Typography className="conf-display" component="h2" sx={{
      color: light ? 'var(--ibl-on-primary)' : 'var(--ibl-primary-dark)',
      fontSize: { xs: '1.9rem', md: '2.7rem' }, mb: body ? 1.5 : 0,
    }}>
      {title}
    </Typography>
    {body && (
      <Typography sx={{
        color: light ? 'rgba(255,248,236,0.78)' : 'var(--ibl-text-body)',
        fontSize: { xs: '0.98rem', md: '1.05rem' }, lineHeight: 1.65,
      }}>
        {body}
      </Typography>
    )}
  </Box>
);

// ── Sections ──────────────────────────────────────────────────────────────────

const Hero: React.FC<{ t: ConferenceStrings; lang: Lang; onLang: (l: Lang) => void; open: boolean; days: number }> =
  ({ t, lang, onLang, open, days }) => (
    <Box component="header" sx={{
      position: 'relative', overflow: 'hidden', bgcolor: 'var(--ibl-primary-deep)',
      '--conf-texture': `url(${WHEAT_TEXTURE})`,
    }} className="conf-texture">
      {/* Bar: logo + language */}
      <Box sx={{
        position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 2, px: { xs: 2, md: 4 }, py: { xs: 1.5, md: 2 }, maxWidth: 1240, mx: 'auto',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box component="img" src={iblLogo} alt="" sx={{
            width: { xs: 34, md: 42 }, height: { xs: 34, md: 42 }, objectFit: 'contain',
            bgcolor: 'var(--ibl-surface)', borderRadius: '50%', p: 0.5, flexShrink: 0,
          }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography className="conf-eyebrow" sx={{ color: 'var(--ibl-accent-soft)', fontSize: '0.68rem', lineHeight: 1.3 }}>
              {t.church}
            </Typography>
            <Typography sx={{ color: 'rgba(255,248,236,0.65)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
              {t.city}
            </Typography>
          </Box>
        </Box>
        <LanguageToggle lang={lang} onChange={onLang} />
      </Box>

      {/* The official artwork, shown whole and framed — never cropped, in any language. */}
      <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 1.5, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
        <Box component="img"
          src={POSTER_SRC}
          srcSet={`${POSTER_SRC_SMALL} 1200w, ${POSTER_SRC} 2400w`}
          sizes="(max-width: 1280px) 100vw, 1280px"
          alt={t.posterAlt}
          sx={{
            display: 'block', width: '100%', height: 'auto', maxHeight: { md: 'min(58vh, 560px)' },
            objectFit: 'contain', border: '1px solid color-mix(in srgb, var(--ibl-accent) 55%, transparent)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          }} />
      </Box>

      {/* Seam: the globe rises through the boundary, with the date and the call to action on top */}
      <Box sx={{ position: 'relative', zIndex: 2, px: 2, pb: { xs: 5, md: 7 }, pt: { xs: 2.5, md: 1 }, textAlign: 'center' }}>
        <GlobeWatermark sx={{
          left: '50%', translate: '-50%', bottom: { xs: -30, md: -30 },
          width: { xs: '260%', md: '110%' }, aspectRatio: '2000 / 553',
          opacity: { xs: 0.3, md: 0.2 },
        }} />

        <Box sx={{ position: 'relative' }}>
          <Typography className="conf-display" component="h1" sx={{
            color: 'var(--ibl-on-primary)', fontSize: { xs: '1.55rem', md: '2.3rem' }, mb: 1,
          }}>
            {/* In Spanish the poster itself is the headline, so name the church instead of repeating it */}
            {lang === 'es' ? `${t.church} · ${t.city}` : t.title}
          </Typography>
          <Box className="conf-rule" sx={{ mb: 1.5 }}>
            <Typography component="span" className="conf-eyebrow" sx={{
              color: 'var(--ibl-accent-soft)', fontSize: { xs: '0.7rem', md: '0.95rem' },
              letterSpacing: { xs: '0.12em', md: '0.22em' }, whiteSpace: 'nowrap',
            }}>
              {t.dates}
            </Typography>
          </Box>

          <Box sx={{
            display: 'flex', gap: 1.5, mt: 3, justifyContent: 'center', alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' }, mx: 'auto', maxWidth: { xs: 320, sm: 'none' },
          }}>
            <Box component={RouterLink} to={`${REGISTRATION_PATH}?lang=${lang}`}
              sx={{ ...goldButtonSx, width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}>
              {t.register}<ArrowForwardIcon sx={{ fontSize: '1.1rem' }} />
            </Box>
            <Box component="a" href="#horario"
              sx={{ ...ghostButtonSx, width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}>
              {t.seeSchedule}<KeyboardArrowDownIcon sx={{ fontSize: '1.2rem' }} />
            </Box>
          </Box>

          <Typography sx={{ color: 'var(--ibl-accent-soft)', fontSize: '0.85rem', fontWeight: 600, mt: 2.5, letterSpacing: '0.04em' }}>
            {open ? t.daysLeft(days) : t.closed}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

const VerseBand: React.FC<{ t: ConferenceStrings }> = ({ t }) => (
  <Box component="section" sx={{
    position: 'relative', overflow: 'hidden', bgcolor: 'var(--ibl-page-top)',
    px: 2, py: { xs: 7, md: 11 }, textAlign: 'center',
  }}>
    <GlobeWatermark sx={{
      left: '50%', translate: '-50%', top: { xs: '8%', md: '4%' },
      width: { xs: '160%', md: '78%' }, aspectRatio: '2000 / 553',
    }} color="var(--ibl-primary)" opacity={0.08} />
    <Box sx={{ position: 'relative', maxWidth: 900, mx: 'auto' }}>
      <Reveal>
        <Typography className="conf-display" component="blockquote" sx={{
          m: 0, color: 'var(--ibl-primary-dark)', fontWeight: 600, fontStyle: 'italic',
          fontSize: { xs: '1.5rem', md: '2.5rem' }, lineHeight: 1.35,
        }}>
          “{t.verse}”
        </Typography>
        <Box className="conf-rule" sx={{ mt: 3 }}>
          <Typography className="conf-eyebrow" component="cite" sx={{ color: 'var(--ibl-accent)', fontStyle: 'normal' }}>
            {t.verseRef}
          </Typography>
        </Box>
      </Reveal>
    </Box>
  </Box>
);

const darkBandSx = {
  position: 'relative', overflow: 'hidden', bgcolor: 'var(--ibl-primary-dark)',
  '--conf-texture': `url(${WHEAT_TEXTURE})`, px: { xs: 2, md: 4 }, py: { xs: 7, md: 11 },
};

/** This year's invitation video, in the visitor's language. */
const InvitationSection: React.FC<{ t: ConferenceStrings; lang: Lang }> = ({ t, lang }) => {
  const source = INVITATION_VIDEO[lang];
  const portrait = source.kind === 'file' && source.portrait;
  return (
    <Box component="section" id="invitacion" className="conf-texture" sx={darkBandSx}>
      <Box sx={{
        position: 'relative', maxWidth: portrait ? 880 : 1000, mx: 'auto',
        // A vertical phone video sits beside its heading on a desktop instead of below it
        display: portrait ? { md: 'grid' } : 'block', gridTemplateColumns: { md: '1fr auto' },
        alignItems: 'center', gap: { md: 6 },
      }}>
        <Box sx={{ '& > div': portrait ? { textAlign: { md: 'left' }, mx: { md: 0 }, mb: { md: 0 } } : {} }}>
          <SectionHead eyebrow={t.inviteLabel} title={t.inviteTitle} body={t.inviteBody} light />
        </Box>
        <Reveal><VideoBlock source={source} title={t.inviteTitle} playLabel={t.videoPlay} /></Reveal>
      </Box>
    </Box>
  );
};

/** Photos and videos from past conferences, as a swipeable strip. */
const GallerySection: React.FC<{ t: ConferenceStrings; lang: Lang }> = ({ t, lang }) => (
  <Box component="section" className="conf-texture" sx={darkBandSx}>
    <Box sx={{ position: 'relative', maxWidth: 1240, mx: 'auto' }}>
      <SectionHead eyebrow={t.galleryLabel} title={t.galleryTitle} body={PAST_GALLERY.length > 1 ? t.galleryBody : undefined} light />
      <Reveal>
        <GalleryCarousel slides={PAST_GALLERY} lang={lang} playLabel={t.videoPlay} prevLabel={t.galleryPrev} nextLabel={t.galleryNext} />
      </Reveal>
    </Box>
  </Box>
);

const ScheduleSection: React.FC<{ t: ConferenceStrings; locale: string }> = ({ t, locale }) => (
  <Box component="section" id="horario" sx={{
    position: 'relative', overflow: 'hidden', bgcolor: 'var(--ibl-page-bottom)',
    px: { xs: 2, md: 4 }, py: { xs: 7, md: 11 }, scrollMarginTop: 0,
  }}>
    <GlobeWatermark sx={{
      right: { xs: '-40%', md: '-18%' }, bottom: '-12%', width: { xs: '150%', md: '70%' }, aspectRatio: '2000 / 553',
    }} color="var(--ibl-primary)" opacity={0.06} />
    <Box sx={{ position: 'relative', maxWidth: 1240, mx: 'auto' }}>
      <SectionHead eyebrow={t.scheduleLabel} title={t.scheduleTitle} body={t.scheduleBody} />
      <Reveal><ScheduleBoard t={t} locale={locale} /></Reveal>
      <Typography sx={{ textAlign: 'center', color: 'var(--ibl-text-muted)', fontSize: '0.9rem', mt: 3.5, fontStyle: 'italic' }}>
        {t.scheduleNote}
      </Typography>
    </Box>
  </Box>
);

const InfoSection: React.FC<{ t: ConferenceStrings }> = ({ t }) => (
  <Box component="section" sx={{ bgcolor: 'var(--ibl-page-top)', px: { xs: 2, md: 4 }, py: { xs: 7, md: 11 } }}>
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <SectionHead eyebrow={t.infoLabel} title={t.infoTitle} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 2, md: 3 } }}>
        {t.info.map((card, i) => (
          <Reveal key={card.title} delay={i * 80}>
            <Box sx={{
              height: '100%', bgcolor: 'var(--ibl-surface)', border: '1px solid var(--ibl-border)',
              borderRadius: '2px', p: { xs: 2.5, md: 3.25 }, position: 'relative',
            }}>
              <Typography className="conf-display" component="span" aria-hidden sx={{
                position: 'absolute', top: 10, right: 18, fontSize: '3.4rem', lineHeight: 1,
                color: 'color-mix(in srgb, var(--ibl-accent) 20%, transparent)',
              }}>
                {String(i + 1).padStart(2, '0')}
              </Typography>
              <Typography className="conf-display" component="h3" sx={{
                color: 'var(--ibl-primary-dark)', fontSize: { xs: '1.25rem', md: '1.45rem' }, mb: 1.25, position: 'relative',
              }}>
                {card.title}
              </Typography>
              <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.7, fontSize: '0.96rem' }}>
                {card.body}
              </Typography>
            </Box>
          </Reveal>
        ))}
      </Box>
    </Box>
  </Box>
);

const CtaSection: React.FC<{ t: ConferenceStrings; lang: Lang; open: boolean; days: number }> = ({ t, lang, open, days }) => (
  <Box component="section" sx={{
    position: 'relative', overflow: 'hidden', bgcolor: 'var(--ibl-primary)',
    px: 2, py: { xs: 8, md: 12 }, textAlign: 'center',
  }}>
    <GlobeWatermark sx={{
      left: '50%', translate: '-50%', bottom: '-30%', width: { xs: '200%', md: '95%' }, aspectRatio: '2000 / 553',
    }} color="var(--ibl-on-primary)" opacity={0.12} />
    <Box sx={{ position: 'relative', maxWidth: 720, mx: 'auto' }}>
      <Typography className="conf-display" component="h2" sx={{
        color: 'var(--ibl-on-primary)', fontSize: { xs: '2rem', md: '3rem' }, mb: 2,
      }}>
        {t.ctaTitle}
      </Typography>
      <Typography sx={{ color: 'rgba(255,248,236,0.85)', fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.7, mb: 4 }}>
        {t.ctaBody}
      </Typography>
      <Box component={RouterLink} to={`${REGISTRATION_PATH}?lang=${lang}`} sx={goldButtonSx}>
        {t.registerLong}<ArrowForwardIcon sx={{ fontSize: '1.1rem' }} />
      </Box>
      <Typography sx={{ color: 'var(--ibl-accent-soft)', fontSize: '0.88rem', fontWeight: 600, mt: 2.5 }}>
        {open ? t.daysLeft(days) : t.closed}
      </Typography>
    </Box>
  </Box>
);

const Footer: React.FC<{ t: ConferenceStrings }> = ({ t }) => (
  <Box component="footer" sx={{
    bgcolor: 'var(--ibl-primary-deep)', color: 'rgba(255,248,236,0.75)',
    px: 2, py: { xs: 4, md: 5 }, textAlign: 'center',
  }}>
    <Box component="img" src={iblLogo} alt="" sx={{
      width: 48, height: 48, objectFit: 'contain', bgcolor: 'var(--ibl-surface)', borderRadius: '50%', p: 0.75, mb: 1.5,
    }} />
    <Typography sx={{ color: 'var(--ibl-on-primary)', fontWeight: 700, fontSize: '0.95rem' }}>{t.footerNote}</Typography>
    <Typography sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem', mt: 0.75,
    }}>
      <PlaceOutlinedIcon sx={{ fontSize: '1rem' }} />{CHURCH_ADDRESS}
    </Typography>
    <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 2, flexWrap: 'wrap' }}>
      <Box component="a" href={CHURCH_SITE} target="_blank" rel="noopener"
        sx={{ color: 'var(--ibl-accent-soft)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
        {t.footerSite}
      </Box>
      <Box component={RouterLink} to={MISSIONARIES_PATH}
        sx={{ color: 'var(--ibl-accent-soft)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
        {t.footerMissionaries}
      </Box>
    </Box>
  </Box>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const ConferenceLanding: React.FC = () => {
  const [lang, changeLang] = useLang(CONFERENCE_PAGE_TITLES);
  const t = CONFERENCE_STRINGS[lang];
  const locale = LOCALES[lang];
  const open = isRegistrationOpen();
  const days = daysUntilClose();

  return (
    <Box className="ibl-harvest" sx={{
      bgcolor: 'var(--ibl-page-top)', color: 'var(--ibl-text)', minHeight: '100vh', overflowX: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'left',
    }}>
      <Hero t={t} lang={lang} onLang={changeLang} open={open} days={days} />
      <VerseBand t={t} />
      <InvitationSection t={t} lang={lang} />
      <ScheduleSection t={t} locale={locale} />
      <GallerySection t={t} lang={lang} />
      <InfoSection t={t} />
      <CtaSection t={t} lang={lang} open={open} days={days} />
      <Footer t={t} />
    </Box>
  );
};

export default ConferenceLanding;
