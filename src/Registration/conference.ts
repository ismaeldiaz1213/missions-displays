// Shared by the registration page, the media upload page, and the admin tab.
// The deadline, days, and fee are ALSO enforced in firestore.rules / storage.rules — keep them in sync.

export const CONFERENCE_NAME = 'Conferencia y Escuela de Misiones 2026';

// Conference days (YYYY-MM-DD). The hotel fee is charged per day selected.
export const CONFERENCE_DAYS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'] as const;

// Last day to register. Online registration closes at 5:00 PM Central that day.
export const REGISTRATION_LAST_DAY = '2026-10-30';
// -05:00 = US Central Daylight Time (DST ends Nov 1). Change if the church is elsewhere.
export const REGISTRATION_CLOSES_AT = `${REGISTRATION_LAST_DAY}T17:00:00-05:00`;

export const registrationClosesAt = () => new Date(REGISTRATION_CLOSES_AT);

/** The discounted rate everyone gets, except laymen who pay LAYMAN_HOTEL_FEE_PER_DAY. */
export const HOTEL_FEE_PER_DAY = 40;
export const LAYMAN_HOTEL_FEE_PER_DAY = 80;

/** Per room, per day. */
export const hotelRateFor = (category: string) => (category === 'layman' ? LAYMAN_HOTEL_FEE_PER_DAY : HOTEL_FEE_PER_DAY);

// Missionaries and evangelists can upload MP4 videos until the conference starts (Nov 2, 00:00 Central).
export const MEDIA_UPLOADS_CLOSE_AT = '2026-11-02T00:00:00-06:00';
export const MEDIA_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const MEDIA_CONTENT_TYPE = 'video/mp4';

export const isMediaUploadOpen = (now: Date = new Date()) =>
  now.getTime() < new Date(MEDIA_UPLOADS_CLOSE_AT).getTime();

export const isRegistrationOpen = (now: Date = new Date()) =>
  now.getTime() < registrationClosesAt().getTime();

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
export const daysUntilClose = () =>
  Math.max(0, Math.floor((registrationClosesAt().getTime() - Date.now()) / 86_400_000));

export const closeDateLabel = (locale: string) => formatConferenceDay(REGISTRATION_LAST_DAY, { day: 'numeric', month: 'long' }, locale);

// "5:00 p. m. (hora del centro)" / "5:00 PM Central Time"
export const closeTimeLabel = (locale: string) => {
  const time = registrationClosesAt().toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' });
  return locale.startsWith('es') ? `${time} (hora del centro)` : `${time} Central Time`;
};

// "2–5 de noviembre de 2026" / "November 2 – 5, 2026"
export const conferenceRangeLabel = (locale: string) => {
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }) as Intl.DateTimeFormat & {
    formatRange?: (a: Date, b: Date) => string;
  };
  const start = new Date(`${CONFERENCE_DAYS[0]}T12:00:00`);
  const end = new Date(`${CONFERENCE_DAYS[CONFERENCE_DAYS.length - 1]}T12:00:00`);
  return fmt.formatRange ? fmt.formatRange(start, end) : `${fmt.format(start)} – ${fmt.format(end)}`;
};

// Last day uploads are accepted (the day before MEDIA_UPLOADS_CLOSE_AT, in church time)
export const mediaUploadsCloseLabel = (locale: string) =>
  new Date(new Date(MEDIA_UPLOADS_CLOSE_AT).getTime() - 1).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Chicago',
  });
