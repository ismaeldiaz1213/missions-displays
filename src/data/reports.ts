import {
  Timestamp, addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore/lite';
import { db } from '../firebase';

// ── Quarters ─────────────────────────────────────────────────────────────────
// The church's reporting year starts in November: Q1 Nov–Jan, Q2 Feb–Apr, Q3 May–Jul, Q4 Aug–Oct.
// Reports are due a number of days after each quarter ends. Admins can change these in
// settings/reportPeriods ("Configurar trimestres"); quarters for later years follow automatically.

export interface ReportSettings {
  /** Month the reporting year starts (1–12). */
  startMonth: number;
  /** First reporting year we track (the calendar year it starts in). */
  firstYear: number;
  /** Days after a quarter ends that its report is due. */
  dueDays: number;
}

export const DEFAULT_REPORT_SETTINGS: ReportSettings = { startMonth: 11, firstYear: 2026, dueDays: 15 };

const settingsRef = doc(db, 'settings', 'reportPeriods');

export const getReportSettings = async (): Promise<ReportSettings> => {
  const snap = await getDoc(settingsRef);
  return snap.exists() ? { ...DEFAULT_REPORT_SETTINGS, ...(snap.data() as Partial<ReportSettings>) } : DEFAULT_REPORT_SETTINGS;
};

export const saveReportSettings = (s: ReportSettings) =>
  setDoc(settingsRef, { ...s, updatedAt: serverTimestamp() });

export interface Quarter {
  /** e.g. "2026-Q1" — the reporting year it belongs to (by its start year) and the quarter number. */
  id: string;
  year: number;
  number: 1 | 2 | 3 | 4;
  /** Inclusive dates as YYYY-MM-DD (local calendar days). */
  start: string;
  end: string;
  due: string;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const quartersOfYear = (year: number, s: ReportSettings): Quarter[] =>
  ([1, 2, 3, 4] as const).map((n) => {
    const start = new Date(year, s.startMonth - 1 + (n - 1) * 3, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
    const due = new Date(end.getFullYear(), end.getMonth(), end.getDate() + s.dueDays);
    return { id: `${year}-Q${n}`, year, number: n, start: ymd(start), end: ymd(end), due: ymd(due) };
  });

export const today = () => ymd(new Date());

/** The reporting year that contains a date. */
export const yearOf = (date: string, s: ReportSettings) => {
  const [y, m] = date.split('-').map(Number);
  return m >= s.startMonth ? y : y - 1;
};

/** Every reporting year from the first one through the current one. */
export const reportingYears = (s: ReportSettings, on = today()) => {
  const last = Math.max(s.firstYear, yearOf(on, s));
  return Array.from({ length: last - s.firstYear + 1 }, (_, i) => s.firstYear + i);
};

export const quarterById = (id: string, s: ReportSettings) => {
  const m = /^(\d{4})-Q([1-4])$/.exec(id);
  return m ? quartersOfYear(Number(m[1]), s)[Number(m[2]) - 1] : null;
};

/** The quarter whose report is being collected now: the latest one that has ended. */
export const reportingQuarter = (s: ReportSettings, on = today()): Quarter | null => {
  const all = reportingYears(s, on).flatMap((y) => quartersOfYear(y, s)).filter((q) => q.end < on);
  return all[all.length - 1] ?? null;
};

const MONTHS = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const monthYear = (date: string, lang: 'es' | 'en') => {
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS[lang][m - 1]} ${y}`;
};

export const formatDay = (date: string, lang: 'es' | 'en') => {
  const [y, m, d] = date.split('-').map(Number);
  return lang === 'en' ? `${MONTHS.en[m - 1]} ${d}, ${y}` : `${d} ${MONTHS.es[m - 1]} ${y}`;
};

/** "Q1 · nov 2026 – ene 2027" */
export const quarterLabel = (q: Quarter, lang: 'es' | 'en') =>
  `Q${q.number} · ${monthYear(q.start, lang)} – ${monthYear(q.end, lang)}`;

export const yearLabel = (year: number, s: ReportSettings) => (s.startMonth === 1 ? `${year}` : `${year}–${year + 1}`);

// ── Submissions ──────────────────────────────────────────────────────────────
// Each report or "no updates" is its own missionaryReports document. Nothing is ever replaced
// or deleted: sending a new report for the same quarter adds another one.

export type SubmissionKind = 'report' | 'noUpdates';

export interface ReportSubmission {
  id: string;
  missionaryId: string;
  quarterId: string;
  kind: SubmissionKind;
  /** Storage path under reports/{missionaryId}/, or '' when there is no PDF. */
  pdfPath: string;
  fileName: string;
  comments: string;
  /** 'missionary' when sent from their page, else the admin's email. */
  submittedBy: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedBy: string;
  reviewNote: string;
  /** What an admin published from this report onto the public page, if anything. */
  usedOnPage: string;
}

const reportsCol = collection(db, 'missionaryReports');
const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : '');

const toSubmission = (id: string, d: Record<string, unknown>): ReportSubmission => ({
  missionaryId: '', quarterId: '', kind: 'report', pdfPath: '', fileName: '', comments: '', submittedBy: '',
  reviewedBy: '', reviewNote: '', usedOnPage: '',
  ...(d as Partial<ReportSubmission>),
  id, submittedAt: iso(d.submittedAt), reviewedAt: iso(d.reviewedAt),
});

export const reportFilesPrefix = (missionaryId: string) => `reports/${missionaryId}`;
export const REPORT_PDF_MAX_BYTES = 50 * 1024 * 1024;

export const listAllSubmissions = async (): Promise<ReportSubmission[]> => {
  const snap = await getDocs(reportsCol);
  return snap.docs.map((d) => toSubmission(d.id, d.data())).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
};

export const listSubmissionsFor = async (missionaryId: string): Promise<ReportSubmission[]> => {
  const snap = await getDocs(query(reportsCol, where('missionaryId', '==', missionaryId)));
  return snap.docs.map((d) => toSubmission(d.id, d.data())).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
};

export interface NewSubmission {
  missionaryId: string;
  quarterId: string;
  kind: SubmissionKind;
  pdfPath: string;
  fileName: string;
  comments: string;
  submittedBy: string;
}

export const addSubmission = (s: NewSubmission) =>
  addDoc(reportsCol, {
    ...s, submittedAt: serverTimestamp(), reviewedAt: null, reviewedBy: '', reviewNote: '', usedOnPage: '',
  });

export const markReviewed = (id: string, by: string, note: string) =>
  updateDoc(doc(reportsCol, id), { reviewedAt: serverTimestamp(), reviewedBy: by, reviewNote: note });

export const markUsedOnPage = (id: string, what: string) =>
  updateDoc(doc(reportsCol, id), { usedOnPage: what });

// ── Status of one missionary for one quarter ─────────────────────────────────

export type QuarterStatus =
  | 'future'      // hasn't started
  | 'open'        // in progress; they may send it early
  | 'pending'     // ended, not yet due
  | 'late'        // past due, nothing sent
  | 'received'    // a report came in, not reviewed yet
  | 'reviewed'    // an admin reviewed the latest report
  | 'noUpdates';  // they said they have no updates

export const quarterStatus = (q: Quarter, subs: ReportSubmission[], on = today()): QuarterStatus => {
  const mine = subs.filter((s) => s.quarterId === q.id);
  const latest = mine[0]; // newest first
  if (latest) {
    if (latest.kind === 'noUpdates') return 'noUpdates';
    return latest.reviewedAt ? 'reviewed' : 'received';
  }
  if (on < q.start) return 'future';
  if (on <= q.end) return 'open';
  return on <= q.due ? 'pending' : 'late';
};

/** Done = nothing more is needed from the missionary for that quarter. */
export const isDone = (st: QuarterStatus) => st === 'received' || st === 'reviewed' || st === 'noUpdates';
