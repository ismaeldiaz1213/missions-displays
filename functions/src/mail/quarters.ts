// Server copy of the quarter math in src/data/reports.ts. Keep the two in sync.

export interface ReportSettings { startMonth: number; firstYear: number; dueDays: number }
export interface Quarter { id: string; year: number; number: 1 | 2 | 3 | 4; start: string; end: string; due: string }

const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

export const quartersOfYear = (year: number, s: ReportSettings): Quarter[] =>
  ([1, 2, 3, 4] as const).map((n) => {
    const start = new Date(Date.UTC(year, s.startMonth - 1 + (n - 1) * 3, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
    const due = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + s.dueDays));
    return { id: `${year}-Q${n}`, year, number: n, start: ymd(start), end: ymd(end), due: ymd(due) };
  });

/** Today's date (YYYY-MM-DD) in a time zone. */
export const todayIn = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const yearOf = (date: string, s: ReportSettings) => {
  const [y, m] = date.split('-').map(Number);
  return m >= s.startMonth ? y : y - 1;
};

export const reportingYears = (s: ReportSettings, on: string) => {
  const last = Math.max(s.firstYear, yearOf(on, s));
  return Array.from({ length: last - s.firstYear + 1 }, (_, i) => s.firstYear + i);
};

/** Same statuses as the admin page; reminders go only to 'pending' and 'late'. */
export const quarterStatus = (q: Quarter, subs: { quarterId: string; kind: string }[], on: string) => {
  if (subs.some((s) => s.quarterId === q.id)) return 'done';
  if (on < q.start) return 'future';
  if (on <= q.end) return 'open';
  return on <= q.due ? 'pending' : 'late';
};

const MONTHS = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const formatDay = (date: string, lang: 'es' | 'en') => {
  const [y, m, d] = date.split('-').map(Number);
  return lang === 'en' ? `${MONTHS.en[m - 1]} ${d}, ${y}` : `${d} de ${MONTHS.es[m - 1]} de ${y}`;
};

const monthYear = (date: string, lang: 'es' | 'en') => {
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS[lang][m - 1]} ${y}`;
};

/** "Q1 (nov 2026 – ene 2027)" */
export const quarterLabel = (q: Quarter, lang: 'es' | 'en') => `Q${q.number} (${monthYear(q.start, lang)} – ${monthYear(q.end, lang)})`;
