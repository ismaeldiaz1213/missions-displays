// Shared by the registration page, the media upload page, and the admin tab.
// The fee is ALSO enforced in firestore.rules — keep them in sync.
//
// The conference itself (name, days, deadlines) is NOT hard-coded: admins set it on the admin
// page (Registros → Configurar), it's saved in Firestore at settings/conference, and the rules
// read the same document. See src/data/conference.ts.

/** The 2026 conference. Used until an admin saves settings/conference, and by the kiosk's 2026 text. */
export const CONFERENCE_NAME = 'Conferencia y Escuela de Misiones 2026';
export const CONFERENCE_DAYS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'] as const;

export interface ConferenceConfig {
  name: string;
  nameEn: string;
  /** Conference days, YYYY-MM-DD. The hotel fee is charged per day selected. */
  days: string[];
  /** Admins turn this on once the dates are final; registration also closes at registrationClosesAt. */
  registrationOpen: boolean;
  /** ISO timestamps */
  registrationClosesAt: string;
  mediaUploadsCloseAt: string;
}

export const DEFAULT_CONFERENCE: ConferenceConfig = {
  name: CONFERENCE_NAME,
  nameEn: 'Missions Conference & School 2026',
  days: [...CONFERENCE_DAYS],
  registrationOpen: true,
  registrationClosesAt: '2026-10-30T22:00:00.000Z', // 5:00 PM Central
  mediaUploadsCloseAt: '2026-11-02T06:00:00.000Z', // conference start, midnight Central
};

/** The church is in Houston; deadlines are shown and entered in Central time. */
export const CHURCH_TIME_ZONE = 'America/Chicago';

export const conferenceName = (c: ConferenceConfig, locale: string) => (locale.startsWith('en') ? c.nameEn || c.name : c.name);

/** The discounted rate everyone gets, except laymen who pay LAYMAN_HOTEL_FEE_PER_DAY. */
export const HOTEL_FEE_PER_DAY = 40;
export const LAYMAN_HOTEL_FEE_PER_DAY = 80;

/** Per room, per day. */
export const hotelRateFor = (category: string) => (category === 'layman' ? LAYMAN_HOTEL_FEE_PER_DAY : HOTEL_FEE_PER_DAY);

export const MEDIA_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const MEDIA_CONTENT_TYPE = 'video/mp4';

// Missionaries and evangelists can upload MP4 videos until mediaUploadsCloseAt (usually the first day).
export const isMediaUploadOpen = (c: ConferenceConfig, now: Date = new Date()) =>
  now.getTime() < new Date(c.mediaUploadsCloseAt).getTime();

export const isRegistrationOpen = (c: ConferenceConfig, now: Date = new Date()) =>
  c.registrationOpen && now.getTime() < new Date(c.registrationClosesAt).getTime();

/** Turned off by an admin before the deadline: the dates aren't announced yet. */
export const isRegistrationNotYetOpen = (c: ConferenceConfig, now: Date = new Date()) =>
  !c.registrationOpen && now.getTime() < new Date(c.registrationClosesAt).getTime();

// Display order on the form
export const CATEGORIES = ['missionary', 'evangelist', 'pastor', 'layman'] as const;
export type Category = (typeof CATEGORIES)[number];

// No hotel fee, and they get the video-upload step
const MINISTRY_CATEGORIES: readonly Category[] = ['missionary', 'evangelist'];
export const isFreeCategory = (c: string) => (MINISTRY_CATEGORIES as readonly string[]).includes(c);
export const canUploadMedia = isFreeCategory;

export const CATEGORY_LABELS: Record<Category, string> = {
  missionary: 'Misionero',
  evangelist: 'Evangelista',
  pastor: 'Pastor',
  layman: 'Laico',
};

export const HEARD_ABOUT = ['pastor', 'missionary', 'friend', 'social', 'website', 'attended', 'other'] as const;
export type HeardAbout = (typeof HEARD_ABOUT)[number];

export const HEARD_ABOUT_LABELS: Record<HeardAbout, string> = {
  pastor: 'Pastor / iglesia',
  missionary: 'Un misionero',
  friend: 'Amigo o familiar',
  social: 'Redes sociales',
  website: 'Sitio web de la iglesia',
  attended: 'Asistió antes',
  other: 'Otro',
};

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PersonInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
}

export interface WifeInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface ChildrenInfo {
  count: number;
  infants: number; // under 2 years
  ages: string;
  notes: string;
}

export const PICKUP_TRANSPORTS = ['plane', 'bus', 'other'] as const;
export type PickupTransport = (typeof PICKUP_TRANSPORTS)[number];

export const TRANSPORT_LABELS: Record<PickupTransport, string> = {
  plane: 'Avión',
  bus: 'Autobús',
  other: 'Otro',
};

export interface TravelInfo {
  needsPickup: boolean;
  // Pickup details — required when needsPickup (used to plan pickups). Empty otherwise.
  transport: PickupTransport | '';
  airline: string; // plane
  flightNumber: string; // plane
  airport: string; // plane
  busCompany: string; // bus
  busStation: string; // bus
  transportDetails: string; // other: how they're arriving
  pickupLocation: string; // other: where to pick them up
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  arrivingByRV: boolean; // only asked when no pickup is needed
  notes: string;
}

export interface RegistrationInput {
  language: 'es' | 'en'; // language the form was filled out in
  category: Category;
  registrant: PersonInfo;
  homeChurch: string;
  homeChurchCity: string;
  missionaryBoard: string;
  sendingChurch: string;
  bringingWife: boolean;
  wife: WifeInfo | null;
  bringingChildren: boolean;
  children: ChildrenInfo | null;
  attendanceDays: string[];
  // Some pastors stay with family or book their own room; they aren't charged for the hotel.
  needsLodging: boolean;
  travel: TravelInfo;
  heardAbout: HeardAbout;
  heardAboutOther: string;
  specialNeeds: string;
}

export interface Registration extends Omit<RegistrationInput, 'needsLodging'> {
  id: string;
  createdAt: string;
  hotelFee: number;
  /** Optional: registrations saved before we started asking don't have it. */
  needsLodging?: boolean;
}

export const adultCount = (r: Pick<RegistrationInput, 'bringingWife'>) => (r.bringingWife ? 2 : 1);

/** A hotel room sleeps four: the registrant, their wife, and up to two children. */
export const ROOM_CAPACITY = 4;

/** Who takes up space in a room. Infants (under 2) share with their parents and don't count. */
export const occupantCount = (r: {
  bringingWife: boolean; bringingChildren: boolean; children?: { count: number; infants: number } | null;
}) => adultCount(r) + (r.bringingChildren ? Math.max(0, (r.children?.count ?? 0) - (r.children?.infants ?? 0)) : 0);

/** Rooms needed, rounded up — a family of five needs two rooms. Always at least one. */
export const roomCount = (r: Parameters<typeof occupantCount>[0]) =>
  Math.max(1, Math.ceil(occupantCount(r) / ROOM_CAPACITY));

/**
 * The fee is per ROOM per day, not per person: a man and his wife share one room.
 * Missionaries and evangelists don't pay, and neither does anyone with their own lodging.
 * Laymen pay the full rate; everyone else gets the discount.
 */
export const calculateHotelFee = (r: {
  category: string; attendanceDays: readonly string[]; needsLodging: boolean;
} & Parameters<typeof occupantCount>[0]) =>
  (isFreeCategory(r.category) || !r.needsLodging ? 0 : hotelRateFor(r.category) * r.attendanceDays.length * roomCount(r));

export const formatConferenceDay = (
  iso: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
  locale = 'es-ES',
) => {
  const d = new Date(`${iso}T12:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, opts);
};

export const formatAddress = (a?: Partial<Address> | null) =>
  a ? [a.street, a.city, [a.state, a.zip].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ') : '';

// Whole days left after today (0 = today is the last day)
export const daysUntilClose = (c: ConferenceConfig) =>
  Math.max(0, Math.floor((new Date(c.registrationClosesAt).getTime() - Date.now()) / 86_400_000));

const inChurchTime = (iso: string, locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString(locale, { ...opts, timeZone: CHURCH_TIME_ZONE });

export const closeDateLabel = (c: ConferenceConfig, locale: string) =>
  inChurchTime(c.registrationClosesAt, locale, { day: 'numeric', month: 'long' });

// "5:00 p. m. (hora del centro)" / "5:00 PM Central Time"
export const closeTimeLabel = (c: ConferenceConfig, locale: string) => {
  const time = inChurchTime(c.registrationClosesAt, locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  return locale.startsWith('es') ? `${time} (hora del centro)` : `${time} Central Time`;
};

// "2–5 de noviembre de 2026" / "November 2 – 5, 2026"
export const conferenceRangeLabel = (c: ConferenceConfig, locale: string) => {
  if (!c.days.length) return '';
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }) as Intl.DateTimeFormat & {
    formatRange?: (a: Date, b: Date) => string;
  };
  const start = new Date(`${c.days[0]}T12:00:00`);
  const end = new Date(`${c.days[c.days.length - 1]}T12:00:00`);
  return fmt.formatRange ? fmt.formatRange(start, end) : `${fmt.format(start)} – ${fmt.format(end)}`;
};

// Last day uploads are accepted (the day before mediaUploadsCloseAt, in church time)
export const mediaUploadsCloseLabel = (c: ConferenceConfig, locale: string) =>
  inChurchTime(new Date(new Date(c.mediaUploadsCloseAt).getTime() - 1).toISOString(), locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  });

// ── Admin date fields (entered in church time) ───────────────────────────────

/** Minutes Central time is behind UTC at that instant (300 in summer, 360 in winter). */
const centralOffsetMinutes = (at: Date) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: CHURCH_TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(at).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((at.getTime() - asUtc) / 60_000);
};

/** "2027-10-29" + "17:00" in Houston → ISO timestamp. */
export const centralToIso = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = (time || '00:00').split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, h, min);
  // Twice, so a date on the other side of a DST change from the first guess still lands right.
  let t = naive + centralOffsetMinutes(new Date(naive)) * 60_000;
  t = naive + centralOffsetMinutes(new Date(t)) * 60_000;
  return new Date(t).toISOString();
};

/** ISO timestamp → { date: "2027-10-29", time: "17:00" } in Houston. */
export const isoToCentral = (iso: string) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: CHURCH_TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
};

/** Every day from `first` to `last`, YYYY-MM-DD. */
export const dayRange = (first: string, last: string) => {
  const out: string[] = [];
  for (let t = Date.parse(`${first}T12:00:00Z`); t <= Date.parse(`${last}T12:00:00Z`) && out.length < 14; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
};

/** A guess at next year's conference: same weekdays (52 weeks later), registration closed until an admin opens it. */
export const suggestNextConference = (c: ConferenceConfig): ConferenceConfig => {
  const shiftDay = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + 364 * 86_400_000).toISOString().slice(0, 10);
  // Same wall-clock time in Houston, even when daylight saving differs.
  const shift = (iso: string) => {
    const { date, time } = isoToCentral(iso);
    return centralToIso(shiftDay(date), time);
  };
  const year = (c.days[0] ?? '').slice(0, 4);
  const nextYear = String(Number(year) + 1);
  const bump = (s: string) => (year ? s.split(year).join(nextYear) : s);
  return {
    name: bump(c.name),
    nameEn: bump(c.nameEn),
    days: c.days.map(shiftDay),
    registrationOpen: false,
    registrationClosesAt: shift(c.registrationClosesAt),
    mediaUploadsCloseAt: shift(c.mediaUploadsCloseAt),
  };
};
