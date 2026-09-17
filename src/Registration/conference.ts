// Shared by the registration page, the media upload page, and the admin tab.
// The deadline, days, and fee are ALSO enforced in firestore.rules / storage.rules — keep them in sync.

export const CONFERENCE_NAME = 'Conferencia de Misiones 2026';

// Conference days (YYYY-MM-DD). The hotel fee is charged per day selected.
export const CONFERENCE_DAYS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'] as const;

// Last day to register. Registration stays open through 11:59 PM of this day.
export const REGISTRATION_LAST_DAY = '2026-10-30';
// UTC offset for the deadline (-05:00 = US Central Daylight Time). Change if the church is elsewhere.
export const REGISTRATION_UTC_OFFSET = '-05:00';

export const registrationClosesAt = () => new Date(`${REGISTRATION_LAST_DAY}T23:59:59.999${REGISTRATION_UTC_OFFSET}`);

export const HOTEL_FEE_PER_DAY = 50;

// Missionaries can upload videos/photos until the conference starts (Nov 2, 00:00 Central).
export const MEDIA_UPLOADS_CLOSE_AT = '2026-11-02T00:00:00-06:00';
export const MEDIA_MAX_BYTES = 2 * 1024 * 1024 * 1024;

export const isMediaUploadOpen = (now: Date = new Date()) =>
  now.getTime() < new Date(MEDIA_UPLOADS_CLOSE_AT).getTime();

export const isRegistrationOpen = (now: Date = new Date()) =>
  now.getTime() <= registrationClosesAt().getTime();

export type Category = 'missionary' | 'pastor' | 'evangelist' | 'layman';
export type Transport = 'plane' | 'bus' | 'car' | 'other';

export const CATEGORY_LABELS: Record<Category, string> = {
  missionary: 'Misionero',
  pastor: 'Pastor',
  evangelist: 'Evangelista',
  layman: 'Laico',
};

export const TRANSPORT_LABELS: Record<Transport, string> = {
  plane: 'Avión',
  bus: 'Autobús',
  car: 'Automóvil',
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
  church: string;
  address: Address;
}

export interface SpouseInfo extends PersonInfo {
  sameAddress: boolean;
}

export interface ChildrenInfo {
  count: number;
  infants: number; // under 2 years
  ages: string;
  notes: string;
}

export interface TravelInfo {
  transport: Transport;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  needsPickup: boolean;
  airline: string;
  flightNumber: string;
  airport: string;
  busCompany: string;
  busStation: string;
  notes: string;
}

export interface RegistrationInput {
  language: 'es' | 'en'; // language the form was filled out in
  category: Category;
  registrant: PersonInfo;
  missionaryBoard: string;
  sendingChurch: string;
  bringingSpouse: boolean;
  spouse: SpouseInfo | null;
  bringingChildren: boolean;
  children: ChildrenInfo | null;
  attendanceDays: string[];
  travel: TravelInfo;
  specialNeeds: string;
}

export interface Registration extends RegistrationInput {
  id: string;
  createdAt: string;
  hotelFee: number;
}

export const adultCount = (r: Pick<RegistrationInput, 'bringingSpouse'>) => (r.bringingSpouse ? 2 : 1);

// Missionaries (and their spouses) don't pay. Everyone else: $50 per adult per day.
export const calculateHotelFee = (r: { category: string; bringingSpouse: boolean; attendanceDays: readonly string[] }) =>
  r.category === 'missionary' ? 0 : HOTEL_FEE_PER_DAY * r.attendanceDays.length * adultCount(r);

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

// "2–5 de noviembre de 2026" / "November 2 – 5, 2026"
export const conferenceRangeLabel = (locale: string) => {
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }) as Intl.DateTimeFormat & {
    formatRange?: (a: Date, b: Date) => string;
  };
  const start = new Date(`${CONFERENCE_DAYS[0]}T12:00:00`);
  const end = new Date(`${CONFERENCE_DAYS[CONFERENCE_DAYS.length - 1]}T12:00:00`);
  return fmt.formatRange ? fmt.formatRange(start, end) : `${fmt.format(start)} – ${fmt.format(end)}`;
};
