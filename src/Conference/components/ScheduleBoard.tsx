import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import ChurchIcon from '@mui/icons-material/Church';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { SCHEDULE, type ScheduleDay, type ScheduleKind } from '../conferenceContent';
import { dayParts, type ConferenceStrings } from '../conferenceI18n';

const ICONS: Record<ScheduleKind, React.ReactNode> = {
  service: <ChurchIcon fontSize="small" />,
  session: <MenuBookIcon fontSize="small" />,
  meal: <RestaurantIcon fontSize="small" />,
  registration: <HowToRegIcon fontSize="small" />,
};

/** Services carry the gold accent; meals and logistics stay quiet. */
const isFeatured = (kind: ScheduleKind) => kind === 'service' || kind === 'session';

const DayHeading: React.FC<{ day: ScheduleDay; locale: string; compact?: boolean }> = ({ day, locale, compact }) => {
  const p = dayParts(day.date, locale);
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
      <Typography className="conf-display" component="span" sx={{
        fontSize: compact ? '2.1rem' : '2.6rem', color: 'var(--ibl-accent)', lineHeight: 1,
      }}>
        {p.day}
      </Typography>
      <Box>
        <Typography component="span" sx={{
          display: 'block', color: 'var(--ibl-primary-dark)', fontWeight: 800,
          fontSize: '1rem', textTransform: 'capitalize', lineHeight: 1.2,
        }}>
          {p.weekday}
        </Typography>
        <Typography component="span" sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.78rem', textTransform: 'capitalize' }}>
          {p.month}
        </Typography>
      </Box>
    </Box>
  );
};

const Items: React.FC<{ day: ScheduleDay; t: ConferenceStrings }> = ({ day, t }) => (
  <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, mt: 2, position: 'relative' }}>
    {/* The rail the dots sit on */}
    <Box aria-hidden sx={{
      position: 'absolute', left: 13, top: 8, bottom: 8, width: '1px',
      bgcolor: 'color-mix(in srgb, var(--ibl-accent) 45%, transparent)',
    }} />
    {day.items.map((item) => (
      <Box component="li" key={`${item.label}-${item.time}`} sx={{ display: 'flex', gap: 1.75, py: 1.1, position: 'relative' }}>
        <Box sx={{
          flex: '0 0 auto', width: 27, height: 27, borderRadius: '50%', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isFeatured(item.kind) ? 'var(--ibl-on-primary)' : 'var(--ibl-primary-dark)',
          bgcolor: isFeatured(item.kind) ? 'var(--ibl-primary)' : 'var(--ibl-surface)',
          border: '1px solid', borderColor: isFeatured(item.kind) ? 'var(--ibl-primary)' : 'var(--ibl-border)',
          '& svg': { fontSize: '0.95rem' },
        }}>
          {ICONS[item.kind]}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{
            color: 'var(--ibl-text)', fontWeight: isFeatured(item.kind) ? 800 : 600,
            fontSize: '0.95rem', lineHeight: 1.35,
          }}>
            {t.scheduleItems[item.label] ?? item.label}
          </Typography>
          <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
            {item.time}
          </Typography>
        </Box>
      </Box>
    ))}
  </Box>
);

const cardSx = {
  position: 'relative' as const,
  bgcolor: 'var(--ibl-surface)',
  border: '1px solid var(--ibl-border)',
  borderRadius: '2px',
  p: { xs: 2.25, md: 2.75 },
  // A gold hairline along the top edge instead of a heavy border
  '&::before': {
    content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
    background: 'linear-gradient(90deg, var(--ibl-accent), color-mix(in srgb, var(--ibl-accent) 25%, transparent))',
  },
};

/**
 * Desktop: the four days side by side, so the whole week reads at a glance.
 * Phones: day tabs with one day open at a time, because four columns become unreadable.
 */
const ScheduleBoard: React.FC<{ t: ConferenceStrings; locale: string }> = ({ t, locale }) => {
  const [openDay, setOpenDay] = useState(0);

  return (
    <>
      {/* ── Desktop ───────────────────────────────────────────────────────── */}
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2.5 }}>
        {SCHEDULE.map((day) => (
          <Box key={day.date} sx={{
            ...cardSx,
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 18px 40px rgba(94, 23, 35, 0.14)' },
          }}>
            <DayHeading day={day} locale={locale} />
            <Items day={day} t={t} />
          </Box>
        ))}
      </Box>

      {/* ── Phones ────────────────────────────────────────────────────────── */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Box role="tablist" aria-label={t.scheduleLabel} sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 0.5 }}>
          {SCHEDULE.map((day, i) => {
            const p = dayParts(day.date, locale);
            const selected = i === openDay;
            return (
              <Box key={day.date} component="button" type="button" role="tab" aria-selected={selected}
                onClick={() => setOpenDay(i)}
                sx={{
                  flex: '1 0 auto', font: 'inherit', cursor: 'pointer', px: 1.75, py: 1, borderRadius: '2px',
                  textAlign: 'center', transition: 'background-color 0.2s ease, color 0.2s ease',
                  color: selected ? 'var(--ibl-on-primary)' : 'var(--ibl-primary-dark)',
                  bgcolor: selected ? 'var(--ibl-primary)' : 'var(--ibl-surface)',
                  border: '1px solid', borderColor: selected ? 'var(--ibl-primary)' : 'var(--ibl-border)',
                }}>
                <Box component="span" sx={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
                  {p.short}
                </Box>
                <Box component="span" className="conf-display" sx={{ display: 'block', fontSize: '1.35rem', fontWeight: 800 }}>
                  {p.day}
                </Box>
              </Box>
            );
          })}
        </Box>
        <Box key={openDay} className="conf-reveal is-visible" sx={cardSx}>
          <DayHeading day={SCHEDULE[openDay]} locale={locale} compact />
          <Items day={SCHEDULE[openDay]} t={t} />
        </Box>
      </Box>
    </>
  );
};

export default ScheduleBoard;
