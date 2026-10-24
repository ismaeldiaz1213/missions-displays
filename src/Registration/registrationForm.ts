// Form state, validation, and conversion shared by the public registration page and the admin editor.
import {
  CONFERENCE_DAYS,
  type Category,
  type ChildrenInfo,
  type HeardAbout,
  type PersonInfo,
  type Registration,
  type RegistrationInput,
  type TravelInfo,
  type WifeInfo,
} from './conference';
import type { Lang, Strings } from './i18n';

const emptyContact = (): WifeInfo => ({ firstName: '', lastName: '', email: '', phone: '' });

export type FormState = Omit<RegistrationInput, 'language' | 'category' | 'wife' | 'children' | 'travel' | 'heardAbout' | 'needsLodging'> & {
  category: Category | '';
  needsLodging: boolean | null;
  registrant: PersonInfo;
  wife: WifeInfo;
  children: ChildrenInfo;
  travel: Omit<TravelInfo, 'needsPickup'> & { needsPickup: boolean | null };
  heardAbout: HeardAbout | '';
};

export const initialForm = (): FormState => ({
  category: '',
  registrant: { ...emptyContact(), address: { street: '', city: '', state: '', zip: '', country: '' } },
  homeChurch: '',
  homeChurchCity: '',
  missionaryBoard: '',
  sendingChurch: '',
  bringingWife: false,
  wife: emptyContact(),
  bringingChildren: false,
  children: { count: 1, infants: 0, ages: '', notes: '' },
  attendanceDays: [...CONFERENCE_DAYS],
  needsLodging: null,
  travel: {
    needsPickup: null, transport: '', airline: '', flightNumber: '', airport: '', busCompany: '', busStation: '',
    transportDetails: '', pickupLocation: '', arrivalDate: '', arrivalTime: '',
    departureDate: '', arrivingByRV: false, notes: '',
  },
  heardAbout: '',
  heardAboutOther: '',
  specialNeeds: '',
});

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validate = (f: FormState, msg: Strings['errors']): Record<string, string> => {
  const e: Record<string, string> = {};
  const req = (key: string, value: string) => { if (!value.trim()) e[key] = msg.required; };

  if (!f.category) e.category = msg.selectCategory;
  req('registrant.firstName', f.registrant.firstName);
  req('registrant.lastName', f.registrant.lastName);
  req('registrant.email', f.registrant.email);
  if (f.registrant.email && !EMAIL_RE.test(f.registrant.email.trim())) e['registrant.email'] = msg.invalidEmail;
  req('registrant.phone', f.registrant.phone);
  req('homeChurch', f.homeChurch);
  req('homeChurchCity', f.homeChurchCity);

  if (f.category === 'missionary') {
    req('missionaryBoard', f.missionaryBoard);
    req('sendingChurch', f.sendingChurch);
  }
  if (f.bringingWife) {
    req('wife.firstName', f.wife.firstName);
    req('wife.lastName', f.wife.lastName);
    if (f.wife.email && !EMAIL_RE.test(f.wife.email.trim())) e['wife.email'] = msg.invalidEmail;
  }
  if (f.bringingChildren && f.children.count < 1) e['children.count'] = msg.min1;
  if (f.bringingChildren && f.children.infants > f.children.count) e['children.infants'] = msg.infantsTooMany;
  if (f.attendanceDays.length === 0) e.attendanceDays = msg.selectDay;
  if (f.needsLodging === null) e.needsLodging = msg.required;

  if (f.travel.needsPickup === null) e['travel.needsPickup'] = msg.required;
  req('travel.arrivalDate', f.travel.arrivalDate);
  if (f.travel.needsPickup) {
    if (!f.travel.transport) e['travel.transport'] = msg.required;
    if (f.travel.transport === 'plane') {
      req('travel.airline', f.travel.airline);
      req('travel.flightNumber', f.travel.flightNumber);
      req('travel.airport', f.travel.airport);
    } else if (f.travel.transport === 'bus') {
      req('travel.busCompany', f.travel.busCompany);
      req('travel.busStation', f.travel.busStation);
    } else if (f.travel.transport === 'other') {
      req('travel.transportDetails', f.travel.transportDetails);
      req('travel.pickupLocation', f.travel.pickupLocation);
    }
    if (f.travel.transport) req('travel.arrivalTime', f.travel.arrivalTime);
  }

  if (!f.heardAbout) e.heardAbout = msg.selectHeardAbout;
  if (f.heardAbout === 'other') req('heardAboutOther', f.heardAboutOther);
  return e;
};

export const toInput = (f: FormState, language: Lang): RegistrationInput => {
  const pickup = !!f.travel.needsPickup;
  const mode = pickup ? f.travel.transport : '';
  return {
    ...f,
    language,
    category: f.category as Category,
    needsLodging: !!f.needsLodging,
    // Board and sending church only apply to missionaries
    missionaryBoard: f.category === 'missionary' ? f.missionaryBoard : '',
    sendingChurch: f.category === 'missionary' ? f.sendingChurch : '',
    wife: f.bringingWife ? f.wife : null,
    children: f.bringingChildren ? f.children : null,
    travel: {
      ...f.travel,
      needsPickup: pickup,
      // Only keep the details for the chosen pickup mode; RV only for people who drive in
      transport: mode,
      airline: mode === 'plane' ? f.travel.airline : '',
      flightNumber: mode === 'plane' ? f.travel.flightNumber : '',
      airport: mode === 'plane' ? f.travel.airport : '',
      busCompany: mode === 'bus' ? f.travel.busCompany : '',
      busStation: mode === 'bus' ? f.travel.busStation : '',
      transportDetails: mode === 'other' ? f.travel.transportDetails : '',
      pickupLocation: mode === 'other' ? f.travel.pickupLocation : '',
      arrivalTime: pickup ? f.travel.arrivalTime : '',
      arrivingByRV: !pickup && f.travel.arrivingByRV,
    },
    heardAbout: f.heardAbout as HeardAbout,
    heardAboutOther: f.heardAbout === 'other' ? f.heardAboutOther : '',
  };
};

/** A saved registration as form state, for the admin editor. Older registrations lack some fields; they get the form's defaults. */
export const fromRegistration = (r: Registration): FormState => {
  const blank = initialForm();
  return {
    category: r.category,
    registrant: { ...blank.registrant, ...r.registrant, address: { ...blank.registrant.address, ...r.registrant.address } },
    homeChurch: r.homeChurch ?? '',
    homeChurchCity: r.homeChurchCity ?? '',
    missionaryBoard: r.missionaryBoard ?? '',
    sendingChurch: r.sendingChurch ?? '',
    bringingWife: r.bringingWife,
    wife: { ...blank.wife, ...r.wife },
    bringingChildren: r.bringingChildren,
    children: { ...blank.children, ...r.children },
    attendanceDays: [...r.attendanceDays],
    // Registrations saved before we asked about lodging were all quoted a room (see hotelFeeOf)
    needsLodging: r.needsLodging ?? true,
    // Pickups saved before we asked how they're arriving were all flights (see transportLabel)
    travel: { ...blank.travel, ...r.travel, transport: r.travel.needsPickup ? r.travel.transport || 'plane' : '' },
    heardAbout: r.heardAbout ?? '',
    heardAboutOther: r.heardAboutOther ?? '',
    specialNeeds: r.specialNeeds ?? '',
  };
};
