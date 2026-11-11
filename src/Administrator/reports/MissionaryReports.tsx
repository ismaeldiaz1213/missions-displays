import React, { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { formatDay, quarterLabel, quartersOfYear, today, yearLabel, type Quarter } from '../../data/reports';
import { A, useAdminLang } from '../adminUi';
import type { DirectoryEntry } from '../directory/directoryData';
import { useReports } from './reportsData';
import { ReportStatusTag } from './ReportStatus';
import ReportDialog from './ReportDialog';

/** "Informes" section of a missionary's profile: every quarter so far, newest first. */
const MissionaryReports: React.FC<{ entry: DirectoryEntry }> = ({ entry }) => {
  const { tr, lang } = useAdminLang();
  const reports = useReports();
  const [open, setOpen] = useState<Quarter | null>(null);
  const on = today();
  const years = [...reports.years].reverse();

  return (
    <Box>
      {years.map((y) => {
        const quarters = quartersOfYear(y, reports.settings).filter((q) => q.start <= on).reverse();
        if (!quarters.length) return null;
        return (
          <Box key={y} sx={{ mb: 2.5 }}>
            <Typography sx={{ color: A.blue, fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>
              {tr('Año', 'Year')} {yearLabel(y, reports.settings)}
            </Typography>
            {quarters.map((q) => {
              const subs = reports.submissionsFor(entry.id).filter((s) => s.quarterId === q.id);
              return (
                <ButtonBase key={q.id} onClick={() => setOpen(q)} sx={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, mb: 1,
                  bgcolor: A.surface, border: `1px solid ${A.line}`, borderRadius: '14px', '&:hover': { borderColor: A.softLine },
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800 }}>{quarterLabel(q, lang)}</Typography>
                    <Typography sx={{ color: A.muted, fontSize: '0.85rem' }}>
                      {tr('Vence', 'Due')} {formatDay(q.due, lang)}{subs.length > 1 ? ` · ${subs.length} ${tr('envíos', 'submissions')}` : ''}
                    </Typography>
                  </Box>
                  <ReportStatusTag status={reports.statusFor(entry.id, q)} lang={lang} />
                </ButtonBase>
              );
            })}
          </Box>
        );
      })}
      {open && <ReportDialog entry={entry} quarter={open} onClose={() => setOpen(null)} />}
    </Box>
  );
};

export default MissionaryReports;
