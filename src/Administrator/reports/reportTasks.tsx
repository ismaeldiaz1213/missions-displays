import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { formatDay, quarterById, quarterLabel, quartersOfYear, yearLabel, type ReportSettings } from '../../data/reports';
import { StatTile, formatDate, useAdminLang } from '../adminUi';
import { fullName, useDirectory, type DirectoryEntry } from '../directory/directoryData';
import type { TaskGroup } from '../home/AdminHome';
import type { ExtraSheet } from '../directory/exportMissionaries';
import { fillSheet } from '../directory/exportMissionaries';
import { useReports } from './reportsData';
import { STATUS_FILL, STATUS_TEXT } from './ReportStatus';

/** Report tasks for the Inicio screen: reports to review, and late reports. */
export const useReportTasks = (): { groups: TaskGroup[]; stat: React.ReactNode } => {
  const { tr, lang } = useAdminLang();
  const { entries } = useDirectory();
  const reports = useReports();
  const [, setSearchParams] = useSearchParams();
  if (reports.loading) return { groups: [], stat: null };

  const byId = new Map(entries.map((e) => [e.id, e]));
  const people = entries.filter((e) => e.status === 'published');
  const toReview = reports.submissions.filter((s) => s.kind === 'report' && !s.reviewedAt && byId.has(s.missionaryId));
  // One line per missionary, listing every late quarter.
  const allQuarters = reports.years.flatMap((y) => quartersOfYear(y, reports.settings));
  const late = people.map((e) => ({ e, qs: allQuarters.filter((q) => reports.statusFor(e.id, q) === 'late') })).filter((x) => x.qs.length);
  const rq = reports.reportingQuarter;
  const doneNow = rq ? people.filter((e) => ['received', 'reviewed', 'noUpdates'].includes(reports.statusFor(e.id, rq))).length : 0;

  const openReports = (id: string) => setSearchParams({ tab: 'misioneros', m: id, seccion: 'informes' });

  const groups: TaskGroup[] = [
    {
      key: 'reportsToReview', icon: <FactCheckOutlinedIcon />, title: tr('Informes por revisar', 'Reports to review'),
      hint: tr('Informes que llegaron. Léalos, márquelos revisados y decida si algo va en su página.', 'Reports that came in. Read them, mark them reviewed, and decide if anything goes on their page.'),
      items: toReview.map((s) => {
        const q = quarterById(s.quarterId, reports.settings);
        return {
          key: s.id, title: fullName(byId.get(s.missionaryId)!.page),
          detail: [q ? quarterLabel(q, lang) : s.quarterId, formatDate(s.submittedAt, lang)].join(' · '),
          action: tr('Revisar', 'Review'), onAction: () => openReports(s.missionaryId),
        };
      }),
    },
    {
      key: 'reportsLate', icon: <AssignmentLateOutlinedIcon />, title: tr('Informes atrasados', 'Late reports'),
      hint: tr('Ya pasó la fecha. Los que tienen correo reciben recordatorios; a los demás hay que escribirles por otro medio.',
        'Past the due date. Those with email get reminders; reach the others another way.'),
      items: late.map(({ e, qs }) => ({
        key: e.id, title: fullName(e.page),
        detail: (qs.length === 1
          ? `${quarterLabel(qs[0], lang)} · ${tr('venció', 'was due')} ${formatDay(qs[0].due, lang)}`
          : `${qs.length} ${tr('trimestres', 'quarters')}: ${qs.map((q) => `Q${q.number} ${yearLabel(q.year, reports.settings)}`).join(', ')}`)
          + (e.email ? '' : ` · ${tr('sin correo', 'no email')}`),
        action: tr('Abrir', 'Open'), onAction: () => openReports(e.id),
      })),
    },
  ];

  const stat = rq ? (
    <StatTile tone={doneNow === people.length ? 'green' : 'amber'} label={`${tr('Informes', 'Reports')} Q${rq.number} ${tr('entregados', 'handed in')}`}
      value={`${doneNow}/${people.length}`} onClick={() => setSearchParams({ tab: 'informes' })} />
  ) : null;

  return { groups, stat };
};

/** "Informes" sheet for the Excel export: every quarter so far for each missionary, color-coded. */
export const reportsSheet = (entries: DirectoryEntry[], reports: ReturnType<typeof useReports>): ExtraSheet => (wb) => {
  const s: ReportSettings = reports.settings;
  const quarters = reports.years.flatMap((y) => quartersOfYear(y, s));
  const people = entries.filter((e) => e.status === 'published');
  const ws = wb.addWorksheet('Informes');
  fillSheet(ws, 'Informes trimestrales', `Vencen ${s.dueDays} días después de cada trimestre · ${people.length} misioneros`, [
    { header: 'Misionero', width: 30, value: (e: DirectoryEntry) => fullName(e.page) },
    { header: 'País', width: 16, value: (e: DirectoryEntry) => e.page.location?.country ?? '' },
    ...quarters.map((q) => ({
      header: `${quarterLabel(q, 'es')}\nvence ${formatDay(q.due, 'es')}`, width: 22,
      value: (e: DirectoryEntry) => STATUS_TEXT[reports.statusFor(e.id, q)].es,
    })),
  ], people);
  ws.getRow(4).height = 46;
  people.forEach((e, r) => quarters.forEach((q, i) => {
    ws.getRow(5 + r).getCell(3 + i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILL[reports.statusFor(e.id, q)] } };
  }));
};
