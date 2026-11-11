import React, { useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  formatDay, isDone, quarterLabel, quartersOfYear, saveReportSettings, today, yearLabel, type Quarter, type ReportSettings,
} from '../../data/reports';
import { A, panelSx, useAdminLang } from '../adminUi';
import { fullName, useDirectory, type DirectoryEntry } from '../directory/directoryData';
import { useReports } from './reportsData';
import { ReportStatusTag } from './ReportStatus';
import ReportDialog from './ReportDialog';

const MONTH_NAMES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { tr, lang } = useAdminLang();
  const reports = useReports();
  const [s, setS] = useState<ReportSettings>(reports.settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const preview = quartersOfYear(s.firstYear, s);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveReportSettings(s);
      await reports.reload();
      onClose();
    } catch (err) { setError(String(err)); } finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{tr('Configurar trimestres', 'Set up quarters')}</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField select label={tr('El año de informes empieza en', 'The reporting year starts in')} value={s.startMonth}
          onChange={(e) => setS({ ...s, startMonth: Number(e.target.value) })}>
          {MONTH_NAMES[lang].map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField type="number" label={tr('Primer año que seguimos', 'First year we track')} value={s.firstYear}
          onChange={(e) => setS({ ...s, firstYear: Math.round(Number(e.target.value)) || s.firstYear })} />
        <TextField type="number" label={tr('Días después del trimestre para entregar', 'Days after the quarter ends to hand it in')} value={s.dueDays}
          onChange={(e) => setS({ ...s, dueDays: Math.max(0, Math.min(90, Math.round(Number(e.target.value)) || 0)) })} />
        <Box sx={{ bgcolor: A.page, borderRadius: '12px', p: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.5 }}>{tr('Vista previa', 'Preview')}</Typography>
          {preview.map((q) => (
            <Typography key={q.id} sx={{ fontSize: '0.9rem' }}>
              {quarterLabel(q, lang)} — {tr('vence', 'due')} {formatDay(q.due, lang)}
            </Typography>
          ))}
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>{tr('Cancelar', 'Cancel')}</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{tr('Guardar', 'Save')}</Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * The Informes tab: who has sent each quarter's report, at a glance. Click any cell to see
 * the report, review it, or record one on the missionary's behalf.
 */
const ReportsBoard: React.FC = () => {
  const { tr, lang } = useAdminLang();
  const { entries, loading: dirLoading } = useDirectory();
  const reports = useReports();
  const [year, setYear] = useState(reports.currentYear);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [open, setOpen] = useState<{ entry: DirectoryEntry; quarter: Quarter } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const on = today();

  const quarters = quartersOfYear(year, reports.settings);
  const people = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const rows = onlyMissing
    ? people.filter((e) => quarters.some((q) => ['pending', 'late'].includes(reports.statusFor(e.id, q))))
    : people;

  if (dirLoading || reports.loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.5rem', color: A.ink }}>{tr('Informes trimestrales', 'Quarterly reports')}</Typography>
          <Typography sx={{ color: A.muted }}>
            {tr(`Se entregan ${reports.settings.dueDays} días después de cada trimestre. Todo informe se guarda para siempre.`,
              `Due ${reports.settings.dueDays} days after each quarter. Every report is kept forever.`)}
          </Typography>
        </Box>
        <TextField select size="small" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 170, bgcolor: A.surface }}>
          {reports.years.map((y) => <MenuItem key={y} value={y}>{tr('Año', 'Year')} {yearLabel(y, reports.settings)}</MenuItem>)}
        </TextField>
        <Button variant="outlined" startIcon={<SettingsOutlinedIcon />} onClick={() => setSettingsOpen(true)}>{tr('Configurar', 'Settings')}</Button>
      </Box>
      {reports.error && <Alert severity="error" sx={{ mb: 2 }}>{reports.error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        {quarters.map((q) => {
          const done = people.filter((e) => isDone(reports.statusFor(e.id, q))).length;
          const isCurrent = on >= q.start && on <= q.end;
          const collecting = reports.reportingQuarter?.id === q.id;
          return (
            <Paper key={q.id} elevation={0} sx={{ ...panelSx, p: 2, borderColor: collecting ? A.blue : A.line, borderWidth: collecting ? 2 : 1 }}>
              <Typography sx={{ fontWeight: 800, color: A.ink }}>Q{q.number}</Typography>
              <Typography sx={{ color: A.muted, fontSize: '0.85rem' }}>{quarterLabel(q, lang).replace(/^Q\d · /, '')}</Typography>
              <Typography sx={{ color: A.muted, fontSize: '0.85rem' }}>{tr('Vence', 'Due')} {formatDay(q.due, lang)}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: done === people.length && people.length ? A.green : A.blue, mt: 0.75 }}>
                {done}/{people.length}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: A.muted, fontWeight: 600 }}>
                {collecting ? tr('Recogiendo ahora', 'Collecting now') : isCurrent ? tr('Trimestre en curso', 'Current quarter') : q.start > on ? tr('Próximo', 'Upcoming') : tr('Entregados', 'Handed in')}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <ToggleButtonGroup exclusive size="small" value={onlyMissing ? 'missing' : 'all'} onChange={(_, v) => v && setOnlyMissing(v === 'missing')} sx={{ mb: 1.5, bgcolor: A.surface }}>
        <ToggleButton value="all" sx={{ px: 2, fontWeight: 700, textTransform: 'none' }}>{tr('Todos', 'Everyone')} ({people.length})</ToggleButton>
        <ToggleButton value="missing" sx={{ px: 2, fontWeight: 700, textTransform: 'none' }}>{tr('Pendientes o atrasados', 'Pending or late')}</ToggleButton>
      </ToggleButtonGroup>

      {phone ? (
        // Phones: one card per missionary with the four quarters as big buttons.
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {rows.length === 0 && <Typography sx={{ p: 3, color: A.muted, textAlign: 'center' }}>{tr('Nadie tiene informes pendientes. 🎉', 'Nobody has reports pending. 🎉')}</Typography>}
          {rows.map((e) => (
            <Paper key={e.id} elevation={0} sx={{ ...panelSx, p: 1.75 }}>
              <Typography sx={{ fontWeight: 800 }}>{fullName(e.page)}</Typography>
              <Typography sx={{ color: A.muted, fontSize: '0.8rem', mb: 1 }}>{e.page.location?.country}{!e.email && ` · ${tr('sin correo', 'no email')}`}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {quarters.map((q) => {
                  const st = reports.statusFor(e.id, q);
                  return (
                    <ButtonBase key={q.id} onClick={() => setOpen({ entry: e, quarter: q })} disabled={st === 'future'}
                      sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, p: 1, borderRadius: '12px', border: `1px solid ${A.line}`, minHeight: 56, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Q{q.number}</Typography>
                      <ReportStatusTag status={st} lang={lang} />
                    </ButtonBase>
                  );
                })}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
      <Paper elevation={0} sx={{ ...panelSx, overflowX: 'auto' }}>
        <Box sx={{ minWidth: 760 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', px: 2, py: 1.25, borderBottom: `1px solid ${A.line}`, bgcolor: A.page }}>
            <Typography sx={{ fontWeight: 700, color: A.muted, fontSize: '0.8rem' }}>{tr('MISIONERO', 'MISSIONARY')}</Typography>
            {quarters.map((q) => <Typography key={q.id} sx={{ fontWeight: 700, color: A.muted, fontSize: '0.8rem' }}>Q{q.number}</Typography>)}
          </Box>
          {rows.length === 0 && (
            <Typography sx={{ p: 3, color: A.muted, textAlign: 'center' }}>{tr('Nadie tiene informes pendientes. 🎉', 'Nobody has reports pending. 🎉')}</Typography>
          )}
          {rows.map((e) => (
            <Box key={e.id} sx={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', alignItems: 'center', px: 2, py: 1, borderBottom: `1px solid ${A.line}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: A.soft, color: A.navy, fontWeight: 800 }}>{e.page.name?.[0]}{e.page.lastName?.[0]}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>{fullName(e.page)}</Typography>
                  <Typography sx={{ color: A.muted, fontSize: '0.8rem' }} noWrap>{e.page.location?.country}{!e.email && ` · ${tr('sin correo', 'no email')}`}</Typography>
                </Box>
              </Box>
              {quarters.map((q) => {
                const st = reports.statusFor(e.id, q);
                return (
                  <ButtonBase key={q.id} onClick={() => setOpen({ entry: e, quarter: q })} disabled={st === 'future'}
                    sx={{ justifySelf: 'start', borderRadius: '999px', '&:hover': { filter: 'brightness(0.96)' } }}>
                    <ReportStatusTag status={st} lang={lang} />
                  </ButtonBase>
                );
              })}
            </Box>
          ))}
        </Box>
      </Paper>
      )}

      {open && <ReportDialog entry={open.entry} quarter={open.quarter} onClose={() => setOpen(null)} />}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </Box>
  );
};

export default ReportsBoard;
