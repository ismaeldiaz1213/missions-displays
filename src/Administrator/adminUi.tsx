import React, { createContext, useContext, useMemo, useState } from 'react';
import { Box, GlobalStyles, Paper, ThemeProvider, Typography, createTheme } from '@mui/material';
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

// ── Theme: light (default, same look as the public site) or dark (admin only) ──

/** Admin colors as CSS variables, so every screen follows the light/dark choice. */
export const A = {
  surface: 'var(--adm-surface)', page: 'var(--adm-page)', ink: 'var(--adm-ink)', text: 'var(--adm-text)',
  muted: 'var(--adm-muted)', faint: 'var(--adm-faint)', line: 'var(--adm-line)', soft: 'var(--adm-soft)', softLine: 'var(--adm-soft-line)',
  navy: 'var(--adm-navy)', blue: 'var(--adm-blue)', blueDeep: 'var(--adm-blue-deep)', amber: 'var(--adm-amber)', amberText: 'var(--adm-amber-text)',
  amberBg: 'var(--adm-amber-bg)', amberLine: 'var(--adm-amber-line)', green: 'var(--adm-green)', greenText: 'var(--adm-green-text)',
  greenBg: 'var(--adm-green-bg)', greenLine: 'var(--adm-green-line)', red: 'var(--adm-red)', redText: 'var(--adm-red-text)',
  redBg: 'var(--adm-red-bg)', redLine: 'var(--adm-red-line)', header: 'var(--adm-header)',
};

const LIGHT_VARS = {
  '--adm-surface': BRAND.white, '--adm-page': BRAND.page, '--adm-ink': BRAND.ink, '--adm-text': BRAND.text, '--adm-muted': BRAND.muted,
  '--adm-faint': BRAND.faint, '--adm-line': BRAND.line, '--adm-soft': BRAND.blueSoft, '--adm-soft-line': BRAND.blueLine, '--adm-navy': BRAND.navy,
  '--adm-blue': BRAND.blue, '--adm-blue-deep': BRAND.blueDeep, '--adm-amber': BRAND.amber, '--adm-amber-text': BRAND.amberDeep,
  '--adm-amber-bg': '#FEF3C7', '--adm-amber-line': '#FDE68A', '--adm-green': '#15803D', '--adm-green-text': '#166534', '--adm-green-bg': '#DCFCE7',
  '--adm-green-line': '#86EFAC', '--adm-red': '#B91C1C', '--adm-red-text': '#991B1B', '--adm-red-bg': '#FEE2E2', '--adm-red-line': '#FCA5A5',
  '--adm-header': `linear-gradient(120deg, ${BRAND.navy} 0%, ${BRAND.blueDeep} 100%)`,
};

const DARK_VARS = {
  '--adm-surface': '#151B26', '--adm-page': '#0D121B', '--adm-ink': '#E8EDF5', '--adm-text': '#C7D0DD', '--adm-muted': '#93A0B4',
  '--adm-faint': '#6B778A', '--adm-line': '#263044', '--adm-soft': '#1A2A4A', '--adm-soft-line': '#2C4A7E', '--adm-navy': '#BFD4FF',
  '--adm-blue': '#6EA0FF', '--adm-blue-deep': '#4F86F7', '--adm-amber': '#FBBF24', '--adm-amber-text': '#FCD34D',
  '--adm-amber-bg': '#3A2E10', '--adm-amber-line': '#6B5417', '--adm-green': '#4ADE80', '--adm-green-text': '#86EFAC', '--adm-green-bg': '#12321F',
  '--adm-green-line': '#1F6B3C', '--adm-red': '#F87171', '--adm-red-text': '#FCA5A5', '--adm-red-bg': '#3B1618', '--adm-red-line': '#7F2A2E',
  '--adm-header': 'linear-gradient(120deg, #0F1B36 0%, #142A57 100%)',
};

export type AdminMode = 'light' | 'dark';
export const adminVars = (mode: AdminMode) => (mode === 'dark' ? DARK_VARS : LIGHT_VARS);

const baseComponents = {
  MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  MuiButton: { styleOverrides: { root: { borderRadius: 999 } } },
  MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
  MuiTab: { styleOverrides: { root: { textTransform: 'none' as const, fontWeight: 700, minHeight: 52 } } },
};

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
  components: baseComponents,
});

export const adminDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6EA0FF', dark: '#4F86F7' },
    secondary: { main: '#BFD4FF' },
    warning: { main: '#FBBF24' },
    background: { default: DARK_VARS['--adm-page'], paper: DARK_VARS['--adm-surface'] },
    text: { primary: DARK_VARS['--adm-ink'], secondary: DARK_VARS['--adm-muted'] },
    divider: DARK_VARS['--adm-line'],
  },
  shape: { borderRadius: 12 },
  typography: { button: { textTransform: 'none', fontWeight: 700 } },
  components: baseComponents,
});

const ModeContext = createContext<{ mode: AdminMode; setMode: (m: AdminMode) => void }>({ mode: 'light', setMode: () => {} });
export const useAdminMode = () => useContext(ModeContext);

/** Light by default; dark is an admin-only preference saved on this device. */
export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AdminMode>(savedMode);
  const value = useMemo(() => ({ mode, setMode: (m: AdminMode) => { setModeState(m); saveMode(m); } }), [mode]);
  return (
    <ModeContext.Provider value={value}>
      <ThemeProvider theme={mode === 'dark' ? adminDarkTheme : adminTheme}>
        {/* On :root so drawers and dialogs (rendered outside this box) get the colors too */}
        <GlobalStyles styles={{ ':root': { ...adminVars(mode), colorScheme: mode }, body: { backgroundColor: adminVars(mode)['--adm-page'] } }} />
        <Box sx={{ bgcolor: A.page, color: A.ink, minHeight: '100vh' }}>{children}</Box>
      </ThemeProvider>
    </ModeContext.Provider>
  );
};

/** Keeps a block (e.g. the missionary's own editor) in the light look even in dark mode. */
export const LightIsland: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={adminTheme}>
    <Box sx={{ ...adminVars('light'), colorScheme: 'light', color: BRAND.ink }}>{children}</Box>
  </ThemeProvider>
);

const MODE_KEY = 'ibl-admin-mode';
export const savedMode = (): AdminMode => {
  try { return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
};
export const saveMode = (m: AdminMode) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* storage unavailable */ } };

// ── Small building blocks shared by the admin screens ────────────────────────

export const panelSx = {
  bgcolor: A.surface, border: `1px solid ${A.line}`, borderRadius: '16px',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 6px 18px rgba(15,23,42,0.05)',
};

export const Panel: React.FC<{ title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; sx?: object }> = ({ title, action, children, sx }) => (
  <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 }, ...sx }}>
    {(title || action) && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography component="h3" sx={{ fontWeight: 800, fontSize: '1.05rem', color: A.ink, flex: 1 }}>{title}</Typography>
        {action}
      </Box>
    )}
    {children}
  </Paper>
);

export const StatTile: React.FC<{ label: string; value: React.ReactNode; tone?: 'blue' | 'amber' | 'green' | 'red'; onClick?: () => void }> = ({ label, value, tone = 'blue', onClick }) => {
  const color = { blue: A.blue, amber: A.amberText, green: A.green, red: A.red }[tone];
  return (
    <Paper elevation={0} onClick={onClick} sx={{
      ...panelSx, p: 2, cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s',
      ...(onClick && { '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' } }),
    }}>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ color: A.muted, fontWeight: 600, fontSize: '0.85rem', mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
};

type Tone = 'blue' | 'amber' | 'green' | 'red' | 'grey';
const TONES: Record<Tone, { fg: string; bg: string; line: string }> = {
  blue: { fg: A.navy, bg: A.soft, line: A.softLine },
  amber: { fg: A.amberText, bg: A.amberBg, line: A.amberLine },
  green: { fg: A.greenText, bg: A.greenBg, line: A.greenLine },
  red: { fg: A.redText, bg: A.redBg, line: A.redLine },
  grey: { fg: A.muted, bg: A.page, line: A.line },
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
