import {
  CATEGORY_LABELS,
  CONFERENCE_DAYS,
  HEARD_ABOUT_LABELS,
  TRANSPORT_LABELS,
  adultCount,
  formatAddress,
  formatConferenceDay,
  type Category,
  type Registration,
} from '../../Registration/conference';

export const fullName = (p?: { firstName?: string; lastName?: string } | null) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ');

export const childCount = (r: Registration) => (r.bringingChildren ? r.children?.count ?? 0 : 0);
export const infantCount = (r: Registration) => (r.bringingChildren ? r.children?.infants ?? 0 : 0);
export const peopleCount = (r: Registration) => adultCount(r) + childCount(r);

export const formatDays = (days: string[]) =>
  days.length === CONFERENCE_DAYS.length ? 'Todos' : days.map((d) => formatConferenceDay(d, { day: 'numeric', month: 'short' })).join(', ');

export const formatDateShort = (iso: string) => (iso ? formatConferenceDay(iso, { weekday: 'short', day: 'numeric', month: 'short' }) : '');

export const formatTime = (hhmm: string) => {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const formatArrival = (r: Registration) =>
  [formatDateShort(r.travel.arrivalDate), formatTime(r.travel.arrivalTime)].filter(Boolean).join(' · ');

/** Pickup details for the chosen mode: flight (airline · flight · airport), bus (line · station), or other (how · where). */
export const travelDetails = (r: Registration) => {
  const t = r.travel;
  if (!t.needsPickup) return '';
  const parts = t.transport === 'bus' ? [t.busCompany, t.busStation]
    : t.transport === 'other' ? [t.transportDetails, t.pickupLocation && `Recoger en: ${t.pickupLocation}`]
      : [t.airline, t.flightNumber, t.airport];
  return parts.filter(Boolean).join(' · ');
};

export const transportLabel = (r: Registration) =>
  r.travel.needsPickup ? TRANSPORT_LABELS[r.travel.transport || 'plane'] ?? '' : '';

export const travelMode = (r: Registration) =>
  r.travel.needsPickup ? `Recoger · ${transportLabel(r)}` : r.travel.arrivingByRV ? 'En RV' : 'Por su cuenta';

export const homeChurchLabel = (r: Registration) => [r.homeChurch, r.homeChurchCity].filter(Boolean).join(', ');

export const heardAboutLabel = (r: Registration) =>
  r.heardAbout === 'other' ? `Otro: ${r.heardAboutOther}` : HEARD_ABOUT_LABELS[r.heardAbout] ?? r.heardAbout ?? '';

export const formatSubmitted = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const money = (n: number) => `$${n.toLocaleString('en-US')}`;

export const byArrival = (a: Registration, b: Registration) =>
  `${a.travel.arrivalDate} ${a.travel.arrivalTime || '99:99'}`.localeCompare(`${b.travel.arrivalDate} ${b.travel.arrivalTime || '99:99'}`);

// ── Column definitions shared by the Excel export ────────────────────────────

export interface Column {
  header: string;
  width: number;
  value: (r: Registration) => string | number;
  money?: boolean;
}

const yesNo = (b: boolean) => (b ? 'Sí' : 'No');

export const REGISTRATION_COLUMNS: Column[] = [
  { header: 'Fecha de registro', width: 16, value: (r) => formatSubmitted(r.createdAt) },
  { header: 'Idioma', width: 9, value: (r) => (r.language === 'en' ? 'Inglés' : 'Español') },
  { header: 'Categoría', width: 13, value: (r) => CATEGORY_LABELS[r.category] ?? r.category },
  { header: 'Nombre', width: 16, value: (r) => r.registrant.firstName },
  { header: 'Apellidos', width: 18, value: (r) => r.registrant.lastName },
  { header: 'Correo', width: 28, value: (r) => r.registrant.email },
  { header: 'Teléfono', width: 16, value: (r) => r.registrant.phone },
  { header: 'Dirección', width: 36, value: (r) => formatAddress(r.registrant.address) },
  { header: 'Iglesia local', width: 24, value: (r) => r.homeChurch },
  { header: 'Ciudad de la iglesia', width: 18, value: (r) => r.homeChurchCity },
  { header: 'Junta misionera', width: 22, value: (r) => r.missionaryBoard },
  { header: 'Iglesia enviadora', width: 22, value: (r) => r.sendingChurch },
  { header: 'Viene esposa', width: 10, value: (r) => yesNo(r.bringingWife) },
  { header: 'Esposa', width: 22, value: (r) => fullName(r.wife) },
  { header: 'Correo esposa', width: 26, value: (r) => r.wife?.email ?? '' },
  { header: 'Teléfono esposa', width: 16, value: (r) => r.wife?.phone ?? '' },
  { header: 'Niños', width: 8, value: (r) => childCount(r) },
  { header: 'Bebés', width: 8, value: (r) => infantCount(r) },
  { header: 'Edades', width: 14, value: (r) => r.children?.ages ?? '' },
  { header: 'Notas niños', width: 26, value: (r) => r.children?.notes ?? '' },
  { header: 'Total personas', width: 10, value: peopleCount },
  { header: 'Días', width: 20, value: (r) => formatDays(r.attendanceDays) },
  { header: 'Recoger', width: 9, value: (r) => yesNo(r.travel.needsPickup) },
  { header: 'Transporte', width: 11, value: transportLabel },
  { header: 'Aerolínea', width: 16, value: (r) => r.travel.airline },
  { header: 'Vuelo', width: 11, value: (r) => r.travel.flightNumber },
  { header: 'Aeropuerto', width: 14, value: (r) => r.travel.airport },
  { header: 'Línea de autobús', width: 16, value: (r) => r.travel.busCompany ?? '' },
  { header: 'Estación', width: 18, value: (r) => r.travel.busStation ?? '' },
  { header: 'Otro transporte', width: 22, value: (r) => r.travel.transportDetails ?? '' },
  { header: 'Lugar de recogida', width: 22, value: (r) => r.travel.pickupLocation ?? '' },
  { header: 'Fecha llegada', width: 14, value: (r) => formatDateShort(r.travel.arrivalDate) },
  { header: 'Hora llegada', width: 11, value: (r) => formatTime(r.travel.arrivalTime) },
  { header: 'Fecha salida', width: 14, value: (r) => formatDateShort(r.travel.departureDate) },
  { header: 'RV', width: 7, value: (r) => yesNo(r.travel.arrivingByRV) },
  { header: 'Notas de viaje', width: 30, value: (r) => r.travel.notes },
  { header: 'Cómo se enteró', width: 22, value: heardAboutLabel },
  { header: 'Comentarios', width: 34, value: (r) => r.specialNeeds },
  { header: 'Hotel estimado', width: 13, value: (r) => r.hotelFee ?? 0, money: true },
];

// ── Summary ──────────────────────────────────────────────────────────────────

export const summarize = (regs: Registration[]) => {
  const byCategory = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as Category[]).map((c) => [c, regs.filter((r) => r.category === c).length]),
  ) as Record<Category, number>;
  const byDay = Object.fromEntries(
    CONFERENCE_DAYS.map((d) => [d, regs.filter((r) => r.attendanceDays.includes(d)).reduce((n, r) => n + peopleCount(r), 0)]),
  ) as Record<string, number>;
  return {
    registrations: regs.length,
    adults: regs.reduce((n, r) => n + adultCount(r), 0),
    children: regs.reduce((n, r) => n + childCount(r), 0),
    infants: regs.reduce((n, r) => n + infantCount(r), 0),
    people: regs.reduce((n, r) => n + peopleCount(r), 0),
    pickups: regs.filter((r) => r.travel.needsPickup).length,
    rvs: regs.filter((r) => r.travel.arrivingByRV).length,
    hotelTotal: regs.reduce((n, r) => n + (r.hotelFee ?? 0), 0),
    byCategory,
    byDay,
  };
};
