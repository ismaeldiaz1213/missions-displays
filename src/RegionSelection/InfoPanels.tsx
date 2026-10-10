import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, IconButton, Typography, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { QRCodeSVG } from 'qrcode.react';
import { publicUrlFor } from '../siteUrl';
import { MISSIONARY_REQUEST_PATH } from '../Home/Home';
import { SCHEDULE, POSTER_SRC_SMALL, PAST_GALLERY } from '../Conference/conferenceContent';
import GalleryCarousel from '../Conference/components/GalleryCarousel';
import { CONFERENCE_STRINGS, dayParts } from '../Conference/conferenceI18n';
import { ABOUT, CONFERENCE, RECAP, type ConferencePhase } from './kioskContent';
import '../Conference/conference.css';

/**
 * Big, touch-friendly panel: a Cerrar button at the bottom (reachable for kids on the
 * kiosk) as well as the usual X in the corner.
 */
const Panel: React.FC<{ open: boolean; onClose: () => void; className?: string; bg: string; accent: string; children: React.ReactNode }> = ({
  open, onClose, className, bg, accent, children,
}) => {
  const fullScreen = useMediaQuery('(max-width: 600px)');
  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth className={className}
      slotProps={{ paper: { sx: { bgcolor: bg, borderRadius: fullScreen ? 0 : '28px', maxHeight: '92vh' } } }}>
      <IconButton onClick={onClose} aria-label="Cerrar" sx={{
        position: 'absolute', right: 14, top: 14, zIndex: 2, width: 52, height: 52,
        bgcolor: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', '&:hover': { bgcolor: '#fff' },
      }}>
        <CloseIcon />
      </IconButton>
      <Box sx={{ overflowY: 'auto' }}>{children}</Box>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <Button onClick={onClose} size="large" sx={{
          textTransform: 'none', fontWeight: 800, fontSize: '1.1rem', borderRadius: '999px', px: 6, py: 1.4,
          color: '#fff', bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' },
        }}>
          Cerrar
        </Button>
      </Box>
    </Dialog>
  );
};

/** QR code on the kiosk; a plain link button on phones (you can't scan your own screen). */
const ScanOrTap: React.FC<{ path: string; label: string; color: string; size?: number }> = ({ path, label, color, size = 150 }) => {
  const navigate = useNavigate();
  const phone = useMediaQuery('(max-width: 900px)');
  if (phone) {
    return (
      <Button onClick={() => navigate(path)} variant="contained" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3, py: 1.2, bgcolor: color }}>
        {label}
      </Button>
    );
  }
  return (
    <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: '18px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', display: 'inline-flex' }}>
      <QRCodeSVG value={publicUrlFor(path)} size={size} level="M" fgColor={color} bgColor="#ffffff" />
    </Box>
  );
};

const sectionTitleSx = { fontFamily: 'var(--ibl-display)', fontWeight: 800, color: 'var(--ibl-primary-dark)', fontSize: { xs: '1.4rem', md: '1.7rem' }, mb: 1.5 };

export const ConferencePanel: React.FC<{ open: boolean; onClose: () => void; phase: ConferencePhase }> = ({ open, onClose, phase }) => {
  const s = CONFERENCE_STRINGS.es;
  return (
    <Panel open={open} onClose={onClose} className="ibl-harvest" bg="#FFFCF6" accent="#8C2436">
      <Box component="img" src={POSTER_SRC_SMALL} alt={s.posterAlt} sx={{ display: 'block', width: '100%', aspectRatio: '2 / 1', objectFit: 'cover' }} />

      <Box sx={{ px: { xs: 2.5, md: 5 }, py: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: { xs: 3.5, md: 4.5 } }}>
        {phase === 'live' && (
          <Box sx={{
            display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3, p: { xs: 2.5, md: 3.5 },
            borderRadius: '22px', background: 'linear-gradient(135deg, #FDF3DC 0%, #F6E2B8 100%)', border: '2px solid #E3C381',
          }}>
            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography sx={{ ...sectionTitleSx, mb: 1 }}>{CONFERENCE.liveTitle}</Typography>
              <Typography sx={{ color: '#453021', fontSize: '1.1rem', lineHeight: 1.6 }}>{CONFERENCE.liveBody}</Typography>
            </Box>
            <ScanOrTap path={MISSIONARY_REQUEST_PATH} label="Enviar mi información" color="#5E1723" size={170} />
          </Box>
        )}

        <Box>
          <Typography sx={{ color: '#C08A2E', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.85rem' }}>
            {CONFERENCE.dates} · Houston, Texas
          </Typography>
          <Typography component="h2" sx={{ ...sectionTitleSx, fontSize: { xs: '1.9rem', md: '2.6rem' }, mt: 0.5 }}>{CONFERENCE.name}</Typography>
          <Box component="blockquote" sx={{ m: 0, mt: 2, pl: 2.5, borderLeft: '4px solid #C08A2E' }}>
            <Typography sx={{ fontFamily: 'var(--ibl-display)', fontStyle: 'italic', fontSize: { xs: '1.2rem', md: '1.45rem' }, color: '#5E1723', lineHeight: 1.4 }}>
              “{CONFERENCE.verse}”
            </Typography>
            <Typography sx={{ color: '#7C6650', fontWeight: 700, mt: 0.5 }}>{CONFERENCE.verseRef}</Typography>
          </Box>
          <Typography sx={{ color: '#453021', fontSize: '1.1rem', lineHeight: 1.7, mt: 2 }}>{CONFERENCE.themeBody}</Typography>
        </Box>

        {phase === 'over' && (
          <Box>
            <Typography sx={sectionTitleSx}>{RECAP.title}</Typography>
            <Typography sx={{ color: '#453021', fontSize: '1.1rem', lineHeight: 1.7, mb: 2.5 }}>{RECAP.body}</Typography>
            <GalleryCarousel slides={PAST_GALLERY} lang="es" playLabel={s.videoPlay} prevLabel={s.galleryPrev} nextLabel={s.galleryNext} />
          </Box>
        )}

        {phase !== 'over' && (<>
        <Box>
          <Typography sx={sectionTitleSx}>¿Cómo puede ayudar?</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {CONFERENCE.howToHelp.map((h) => (
              <Box key={h.title} sx={{ display: 'flex', gap: 1.75, p: 2, borderRadius: '18px', bgcolor: '#fff', border: '1px solid #E3D5BC' }}>
                <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>{h.emoji}</Typography>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: '#2E1D12', fontSize: '1.1rem' }}>{h.title}</Typography>
                  <Typography sx={{ color: '#7C6650', lineHeight: 1.5 }}>{h.body}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box>
          <Typography sx={sectionTitleSx}>{s.scheduleTitle}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.25 }}>
            {SCHEDULE.map((day) => {
              const p = dayParts(day.date, 'es-ES');
              return (
                <Box key={day.date} sx={{ p: 1.75, borderRadius: '16px', bgcolor: '#fff', border: '1px solid #E3D5BC' }}>
                  <Typography sx={{ fontWeight: 800, color: '#8C2436', textTransform: 'capitalize' }}>{p.weekday} {p.day}</Typography>
                  {day.items.map((it) => (
                    <Typography key={it.label + it.time} sx={{ color: '#453021', fontSize: '0.85rem', mt: 0.5, lineHeight: 1.35 }}>
                      <b>{it.time}</b> · {s.scheduleItems[it.label]}
                    </Typography>
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>

        </>)}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
          <ScanOrTap path="/conferencia" label="Ver la página de la conferencia" color="#5E1723" />
          <Box>
            <Typography sx={{ fontWeight: 800, color: '#2E1D12', fontSize: '1.2rem' }}>Toda la información en su teléfono</Typography>
            <Typography sx={{ color: '#7C6650', fontSize: '1rem', lineHeight: 1.5, mt: 0.5 }}>
              Horario completo, video de invitación y registro para la conferencia.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Panel>
  );
};

export const AboutPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const titleSx = { fontWeight: 800, color: '#0F172A', fontSize: { xs: '1.3rem', md: '1.5rem' }, mb: 1.25 };
  return (
    <Panel open={open} onClose={onClose} bg="#FFFFFF" accent="#1E3A8A">
      <Box sx={{ px: { xs: 2.5, md: 5 }, pt: { xs: 7, md: 5 }, pb: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box>
          <Typography component="h2" sx={{ ...titleSx, fontSize: { xs: '1.8rem', md: '2.2rem' } }}>{ABOUT.title}</Typography>
          {ABOUT.body.map((p) => (
            <Typography key={p} sx={{ color: '#334155', fontSize: '1.1rem', lineHeight: 1.7, mb: 1.5 }}>{p}</Typography>
          ))}
        </Box>

        <Box>
          <Typography sx={titleSx}>{ABOUT.thanksTitle}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {ABOUT.thanks.map((t) => <Typography key={t} component="li" sx={{ color: '#334155', fontSize: '1.05rem', mb: 0.5 }}>{t}</Typography>)}
          </Box>
          <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem', mt: 1.5 }}>
            Créditos de imágenes: North America map por Stasinho12, licencia Creative Commons. Mapas de Natural Earth.
          </Typography>
        </Box>

        {/* Tucked away here on purpose so visitors don't open the form by accident */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2.5, borderRadius: '20px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', flexDirection: { xs: 'column', sm: 'row' } }}>
          <ScanOrTap path={MISSIONARY_REQUEST_PATH} label="Enviar mi información" color="#1E3A8A" size={120} />
          <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.1rem' }}>{ABOUT.missionaryTitle}</Typography>
            <Typography sx={{ color: '#64748B', lineHeight: 1.5, mt: 0.5 }}>{ABOUT.missionaryBody}</Typography>
            <Button size="small" onClick={() => navigate(MISSIONARY_REQUEST_PATH)} sx={{
              display: { xs: 'none', md: 'inline-flex' }, mt: 1, textTransform: 'none', fontWeight: 700, color: '#2563EB', px: 0,
            }}>
              O llene el formulario aquí →
            </Button>
          </Box>
        </Box>
      </Box>
    </Panel>
  );
};
