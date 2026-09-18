import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import type { Strings } from '../i18n';
import {
  HOTEL_FEE_PER_DAY,
  adultCount,
  calculateHotelFee,
  formatConferenceDay,
  isFreeCategory,
  type Category,
} from '../conference';

export interface SummaryInput {
  category: Category | '';
  bringingWife: boolean;
  bringingChildren: boolean;
  children: { count: number } | null;
  attendanceDays: string[];
  needsLodging: boolean | null;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.6 }}>
    <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.9rem' }}>{label}</Typography>
    <Typography component="div" sx={{ color: 'var(--ibl-text)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
  </Box>
);

const RegistrationSummary: React.FC<{ form: SummaryInput; t: Strings; locale: string }> = ({ form, t, locale }) => {
  const adults = adultCount(form);
  const days = form.attendanceDays.length;
  const children = form.bringingChildren ? form.children?.count ?? 0 : 0;
  const isFree = isFreeCategory(form.category);
  // Until they answer, show the full estimate rather than a $0 that could look final.
  const needsLodging = form.needsLodging !== false;
  const fee = calculateHotelFee({ ...form, needsLodging });

  return (
    <Box sx={{
      bgcolor: 'var(--ibl-surface)', borderRadius: '16px', overflow: 'hidden',
      border: '1px solid color-mix(in srgb, var(--ibl-primary) 12%, transparent)',
      boxShadow: '0 10px 30px color-mix(in srgb, var(--ibl-primary-dark) 12%, transparent)',
    }}>
      <Box sx={{ px: 2.5, py: 1.75, background: 'linear-gradient(135deg, var(--ibl-primary-dark), var(--ibl-primary))' }}>
        <Typography sx={{ color: 'var(--ibl-on-primary)', fontWeight: 800, fontSize: '1rem' }}>{t.summary}</Typography>
      </Box>
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Row label={t.category} value={form.category ? t.categories[form.category].label : '—'} />
        <Row label={t.adults} value={adults} />
        <Row label={t.children} value={children} />
        <Row
          label={t.days}
          value={days === 0 ? '—' : (
            <Box>{form.attendanceDays.map((d) => <div key={d}>{formatConferenceDay(d, undefined, locale)}</div>)}</Box>
          )}
        />
        <Row label={t.lodging} value={form.needsLodging === null ? '—' : form.needsLodging ? t.yes : t.no} />
        <Divider sx={{ my: 1.25, borderColor: 'var(--ibl-border)' }} />
        <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t.hotelEstimate}
        </Typography>
        {isFree ? (
          <>
            <Typography sx={{ color: 'var(--ibl-success)', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.3 }}>{t.noCost}</Typography>
            <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.82rem' }}>{t.freeCategoryNote}</Typography>
          </>
        ) : (
          <>
            <Typography sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.3 }}>
              ${fee.toLocaleString('en-US')}
            </Typography>
            <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.82rem' }}>
              {needsLodging ? t.feeFormula(HOTEL_FEE_PER_DAY, days, adults) : t.noLodgingNote}
            </Typography>
          </>
        )}
        <Box sx={{
          mt: 1.5, p: 1.25, borderRadius: '8px',
          bgcolor: 'color-mix(in srgb, var(--ibl-accent) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ibl-accent) 35%, transparent)',
        }}>
          <Typography sx={{ color: 'var(--ibl-text-body)', fontSize: '0.8rem', lineHeight: 1.45 }}>
            {t.notCharged}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RegistrationSummary;
