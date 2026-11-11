import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_REPORT_SETTINGS, getReportSettings, listAllSubmissions, quarterStatus, quartersOfYear, reportingQuarter,
  reportingYears, today, yearOf, type Quarter, type QuarterStatus, type ReportSettings, type ReportSubmission,
} from '../../data/reports';

interface ReportsValue {
  settings: ReportSettings;
  submissions: ReportSubmission[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  /** Reporting years we track, oldest first. */
  years: number[];
  currentYear: number;
  /** The latest quarter that has ended (whose report we're collecting), if any. */
  reportingQuarter: Quarter | null;
  submissionsFor: (missionaryId: string) => ReportSubmission[];
  statusFor: (missionaryId: string, q: Quarter) => QuarterStatus;
}

const ReportsContext = createContext<ReportsValue | null>(null);

export const ReportsProvider: React.FC<{ enabled: boolean; children: React.ReactNode }> = ({ enabled, children }) => {
  const [settings, setSettings] = useState<ReportSettings>(DEFAULT_REPORT_SETTINGS);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [s, subs] = await Promise.all([getReportSettings(), listAllSubmissions()]);
      setSettings(s);
      setSubmissions(subs);
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);

  const value = useMemo<ReportsValue>(() => {
    const byMissionary = new Map<string, ReportSubmission[]>();
    for (const s of submissions) {
      const list = byMissionary.get(s.missionaryId) ?? [];
      list.push(s);
      byMissionary.set(s.missionaryId, list);
    }
    const submissionsFor = (id: string) => byMissionary.get(id) ?? [];
    return {
      settings, submissions, loading, error, reload,
      years: reportingYears(settings),
      currentYear: Math.max(settings.firstYear, yearOf(today(), settings)),
      reportingQuarter: reportingQuarter(settings),
      submissionsFor,
      statusFor: (id, q) => quarterStatus(q, submissionsFor(id)),
    };
  }, [settings, submissions, loading, error, reload]);

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
};

export const useReports = () => {
  const v = useContext(ReportsContext);
  if (!v) throw new Error('useReports outside ReportsProvider');
  return v;
};

export const quartersFor = (year: number, s: ReportSettings) => quartersOfYear(year, s);
