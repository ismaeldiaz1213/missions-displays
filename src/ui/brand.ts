// Shared look for the public kiosk pages (map, continents, missionary pages, home screen).
// Light and bright on purpose — the pastor prefers it, and it reads well on hallway screens.

export const BRAND = {
  navy: '#1E3A8A',
  blue: '#2563EB',
  blueDeep: '#1D4ED8',
  blueSoft: '#EFF6FF',
  blueLine: '#BFDBFE',
  ink: '#0F172A',
  text: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#E2E8F0',
  page: '#F4F7FB',
  amber: '#F59E0B',
  amberDeep: '#B45309',
  white: '#FFFFFF',
} as const;

/** White rounded card used for every content block. */
export const cardSx = {
  bgcolor: BRAND.white, borderRadius: '20px', p: { xs: 2.5, md: 3.5 },
  border: `1px solid ${BRAND.line}`, boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
};

/** Small uppercase label above a value ("DÓNDE SIRVEN", "HORA LOCAL"). */
export const eyebrowSx = {
  color: BRAND.muted, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
};

const pillBase = { textTransform: 'none' as const, fontWeight: 800, borderRadius: '999px' };

/** Big rounded buttons: `primary` is the main action, `soft` and `outline` the rest. */
export const pillSx = {
  primary: { ...pillBase, color: BRAND.white, bgcolor: BRAND.blue, boxShadow: '0 8px 22px rgba(37,99,235,0.3)', '&:hover': { bgcolor: BRAND.blueDeep } },
  navy: { ...pillBase, color: BRAND.white, bgcolor: BRAND.navy, '&:hover': { bgcolor: BRAND.blue } },
  soft: { ...pillBase, color: BRAND.navy, bgcolor: BRAND.blueSoft, '&:hover': { bgcolor: '#DBEAFE' } },
  outline: { ...pillBase, color: BRAND.navy, bgcolor: BRAND.white, border: `1.5px solid ${BRAND.blueLine}`, '&:hover': { bgcolor: BRAND.blueSoft, borderColor: BRAND.blue } },
};

/** Light card floating over the animated globe (home screen). No backdrop blur: blurring a
 *  canvas that redraws every frame is very slow on kiosk hardware. */
export const glassSx = {
  bgcolor: 'rgba(255,255,255,0.88)',
  border: '1px solid rgba(255,255,255,0.95)', borderRadius: '32px',
  boxShadow: '0 30px 70px rgba(30,58,138,0.14), 0 2px 6px rgba(30,58,138,0.06)',
};
