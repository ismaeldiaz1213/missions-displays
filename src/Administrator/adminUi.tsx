import React, { createContext, useContext, useMemo, useState } from 'react';
import { Box, Paper, Typography, createTheme } from '@mui/material';
import { BRAND } from '../ui/brand';

// ── Language: Spanish first, English toggle ──────────────────────────────────

export type AdminLang = 'es' | 'en';
const LANG_KEY = 'ibl-admin-lang';

interface LangValue {
  lang: AdminLang;
  setLang: (l: AdminLang) => void;
  /** Picks the Spanish or English text: tr('Guardar', 'Save'). */
  tr: (es: string, en: string) => string;
}

const LangContext = createContext<LangValue>({ lang: 'es', setLang: () => {}, tr: (es) => es });

const savedLang = (): AdminLang => {
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'es'; } catch { return 'es'; }
};

export const AdminLangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AdminLang>(savedLang);
  const value = useMemo<LangValue>(() => ({
    lang,
    setLang: (l) => {
      setLangState(l);
      try { localStorage.setItem(LANG_KEY, l); } catch { /* storage unavailable */ }
    },
    tr: (es, en) => (lang === 'en' ? en : es),
  }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useAdminLang = () => useContext(LangContext);

export const dateLocale = (lang: AdminLang) => (lang === 'en' ? 'en-US' : 'es-ES');

export const formatDate = (iso: string, lang: AdminLang) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Theme: the same light, bright look as the public site ────────────────────

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND.blue, dark: BRAND.blueDeep },
    secondary: { main: BRAND.navy },
    warning: { main: BRAND.amber, dark: BRAND.amberDeep },
    background: { default: BRAND.page, paper: BRAND.white },
    text: { primary: BRAND.ink, secondary: BRAND.muted },
    divider: BRAND.line,
  },
  shape: { borderRadius: 12 },
  typography: { button: { textTransform: 'none', fontWeight: 700 } },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, minHeight: 52 } } },
  },
});

// ── Small building blocks shared by the admin screens ────────────────────────

export const panelSx = {
  bgcolor: BRAND.white, border: `1px solid ${BRAND.line}`, borderRadius: '16px',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 6px 18px rgba(15,23,42,0.05)',
};

export const Panel: React.FC<{ title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; sx?: object }> = ({ title, action, children, sx }) => (
  <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 }, ...sx }}>
    {(title || action) && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography component="h3" sx={{ fontWeight: 800, fontSize: '1.05rem', color: BRAND.ink, flex: 1 }}>{title}</Typography>
        {action}
      </Box>
    )}
    {children}
  </Paper>
);

export const StatTile: React.FC<{ label: string; value: React.ReactNode; tone?: 'blue' | 'amber' | 'green' | 'red'; onClick?: () => void }> = ({ label, value, tone = 'blue', onClick }) => {
  const color = { blue: BRAND.blue, amber: BRAND.amberDeep, green: '#15803D', red: '#B91C1C' }[tone];
  return (
    <Paper elevation={0} onClick={onClick} sx={{
      ...panelSx, p: 2, cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s',
      ...(onClick && { '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' } }),
    }}>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ color: BRAND.muted, fontWeight: 600, fontSize: '0.85rem', mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
};

type Tone = 'blue' | 'amber' | 'green' | 'red' | 'grey';
const TONES: Record<Tone, { fg: string; bg: string; line: string }> = {
  blue: { fg: BRAND.navy, bg: BRAND.blueSoft, line: BRAND.blueLine },
  amber: { fg: BRAND.amberDeep, bg: '#FEF3C7', line: '#FDE68A' },
  green: { fg: '#166534', bg: '#DCFCE7', line: '#BBF7D0' },
  red: { fg: '#991B1B', bg: '#FEE2E2', line: '#FECACA' },
  grey: { fg: BRAND.muted, bg: '#F1F5F9', line: BRAND.line },
};

/** Small rounded status label. */
export const Tag: React.FC<{ tone?: Tone; icon?: React.ReactNode; children: React.ReactNode }> = ({ tone = 'grey', icon, children }) => {
  const t = TONES[tone];
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 700, color: t.fg, bgcolor: t.bg, border: `1px solid ${t.line}`, whiteSpace: 'nowrap',
      '& svg': { fontSize: '0.95rem' },
    }}>
      {icon}{children}
    </Box>
  );
};
