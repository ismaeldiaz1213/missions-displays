// Groups the registrations that need a ride into pickup trips: who is picked up where,
// in what order, and when the driver should leave the church.
//
// Everything here is pure math over data we already collect — no paid APIs. Drive times come
// from the table below for known places, and from a straight-line estimate for anything else.
import type { Registration } from '../../Registration/conference';
import { byArrival, fullName, peopleCount } from '../registrations/registrationData';

/** Route origin: the church. */
export const CHURCH = {
  label: 'Iglesia Bautista Libertad',
  address: '6111 Breen Dr, Houston, TX 77086',
  lat: 29.899301,
  lng: -95.4815302,
};

/** Minutes to wait at the pickup place after the last arrival (bags, customs, restroom). */
export const BUFFER_MINUTES = 30;
/** Default size of the window that merges several arrivals into one trip. */
export const DEFAULT_WINDOW_MINUTES = 90;

export interface PickupPlace {
  key: string;
  label: string;
  lat: number;
  lng: number;
  /** One-way driving minutes from the church. Measured once by hand; edit if it's off. */
  driveMinutes: number;
  /** Lower-case fragments that identify this place in the free-text travel fields. */
  aliases: string[];
}

/** Places we expect to drive to. Add to this list as the conference grows. */
export const KNOWN_PLACES: PickupPlace[] = [
  {
    key: 'iah',
    label: 'Aeropuerto Bush Intercontinental (IAH)',
    lat: 29.9841416, lng: -95.332986, driveMinutes: 30,
    aliases: ['iah', 'bush', 'intercontinental'],
  },
  {
    key: 'hou',
    label: 'Aeropuerto Hobby (HOU)',
    lat: 29.6471491, lng: -95.2769303, driveMinutes: 45,
    aliases: ['hou', 'hobby', 'william p'],
  },
  {
    key: 'greyhound-downtown',
    label: 'Estación Greyhound (centro de Houston)',
    lat: 29.745, lng: -95.3755, driveMinutes: 30,
    aliases: ['greyhound', 'centro', 'downtown', 'main st'],
  },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** The free text that describes where this person is picked up. */
const placeText = (r: Registration) => {
  const t = r.travel;
  if (t.transport === 'bus') return t.busStation || t.busCompany;
  if (t.transport === 'other') return t.pickupLocation || t.transportDetails;
  return t.airport || t.airline;
};

// Whole words only: "Greyhound" contains "hou", but it isn't Hobby airport.
const hasWord = (text: string, word: string) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);

const matchKnown = (text: string) => {
  const n = norm(text);
  return n ? KNOWN_PLACES.find((p) => p.aliases.some((a) => hasWord(n, a))) : undefined;
};

export interface TripPlace {
  key: string;
  label: string;
  known?: PickupPlace;
}

/** Known airport/station when we recognize the text, otherwise a group of its own. */
export const resolvePlace = (r: Registration): TripPlace => {
  const text = placeText(r);
  const known = matchKnown(text);
  if (known) return { key: known.key, label: known.label, known };
  const label = text.trim() || 'Lugar sin especificar';
  return { key: `${r.travel.transport || 'plane'}:${norm(label)}`, label };
};

// ── Times ────────────────────────────────────────────────────────────────────

export const toMinutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const fromMinutes = (mins: number) => {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// ── Distance estimate for places we don't have a drive time for ──────────────

const EARTH_MILES = 3958.8;
const toRad = (d: number) => (d * Math.PI) / 180;

export const milesBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
};

/** Rough city drive time: straight-line miles × 1.35 of road, at ~40 mph including stops. */
export const estimateDriveMinutes = (coords: { lat: number; lng: number }) =>
  Math.max(10, Math.round((milesBetween(CHURCH, coords) * 1.35) / 40 * 60));

// ── Geocoding (OpenStreetMap Nominatim, free) ────────────────────────────────

const CACHE_KEY = 'ibl-pickup-geocache';

type Coords = { lat: number; lng: number };

const readCache = (): Record<string, Coords | null> => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}'); } catch { return {}; }
};

const writeCache = (cache: Record<string, Coords | null>) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* storage full or blocked */ }
};

/**
 * Looks up coordinates for a free-text pickup place, biased to the Houston area.
 * Results are cached in localStorage; Nominatim asks for at most one request per second.
 */
export const geocodePlace = async (label: string): Promise<Coords | null> => {
  const q = norm(label);
  if (!q) return null;
  const cache = readCache();
  if (q in cache) return cache[q];
  try {
    const query = /houston|texas|\btx\b/.test(q) ? label : `${label}, Houston, TX`;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`);
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    const coords = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
    cache[q] = coords;
    writeCache(cache);
    return coords;
  } catch {
    return null;
  }
};

// ── Trips ────────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  date: string;
  place: TripPlace;
  riders: Registration[];
  /** Minutes after midnight of the first and last arrival in this trip. */
  firstArrival: number | null;
  lastArrival: number | null;
  seats: number;
  /** Registrations in this trip with no arrival time on file. */
  missingTime: Registration[];
}

export const needsPickup = (r: Registration) => r.travel.needsPickup;

/**
 * One trip per place per time window. Arrivals land in the same trip when they are within
 * `windowMinutes` of the first arrival of that trip, so one drive covers all of them.
 */
export const buildTrips = (regs: Registration[], windowMinutes = DEFAULT_WINDOW_MINUTES): Trip[] => {
  const groups = new Map<string, { date: string; place: TripPlace; riders: Registration[] }>();
  for (const r of regs.filter(needsPickup)) {
    const place = resolvePlace(r);
    const date = r.travel.arrivalDate || 'sin-fecha';
    const key = `${date}|${place.key}`;
    const group = groups.get(key) ?? { date, place, riders: [] };
    group.riders.push(r);
    groups.set(key, group);
  }

  const trips: Trip[] = [];
  for (const group of groups.values()) {
    const timed = group.riders.filter((r) => toMinutes(r.travel.arrivalTime) !== null).sort(byArrival);
    const untimed = group.riders.filter((r) => toMinutes(r.travel.arrivalTime) === null);

    let current: Registration[] = [];
    const flush = () => {
      if (!current.length) return;
      const times = current.map((r) => toMinutes(r.travel.arrivalTime) as number);
      trips.push({
        id: `${group.date}|${group.place.key}|${times[0]}`,
        date: group.date,
        place: group.place,
        riders: current,
        firstArrival: Math.min(...times),
        lastArrival: Math.max(...times),
        seats: current.reduce((n, r) => n + peopleCount(r), 0),
        missingTime: [],
      });
      current = [];
    };
    for (const r of timed) {
      const start = current.length ? (toMinutes(current[0].travel.arrivalTime) as number) : null;
      if (start !== null && (toMinutes(r.travel.arrivalTime) as number) - start > windowMinutes) flush();
      current.push(r);
    }
    flush();

    if (untimed.length) {
      trips.push({
        id: `${group.date}|${group.place.key}|sin-hora`,
        date: group.date,
        place: group.place,
        riders: untimed,
        firstArrival: null,
        lastArrival: null,
        seats: untimed.reduce((n, r) => n + peopleCount(r), 0),
        missingTime: untimed,
      });
    }
  }

  return trips.sort((a, b) =>
    a.date.localeCompare(b.date) || (a.firstArrival ?? 1e9) - (b.firstArrival ?? 1e9) || a.place.label.localeCompare(b.place.label));
};

/** Pick up `BUFFER_MINUTES` after the last arrival, and leave the church one drive earlier. */
export const tripTimes = (trip: Trip, driveMinutes: number) => {
  if (trip.lastArrival === null) return { pickupAt: null, leaveAt: null, backAt: null };
  const pickupAt = trip.lastArrival + BUFFER_MINUTES;
  return { pickupAt, leaveAt: pickupAt - driveMinutes, backAt: pickupAt + driveMinutes };
};

/** What the driver needs to know about each rider, in pickup order. */
export const riderLine = (r: Registration) => {
  const t = r.travel;
  const how = t.transport === 'bus' ? [t.busCompany, t.busStation]
    : t.transport === 'other' ? [t.transportDetails]
      : [t.airline, t.flightNumber];
  return {
    name: fullName(r.registrant),
    phone: r.registrant.phone,
    seats: peopleCount(r),
    detail: how.filter(Boolean).join(' · '),
    time: toMinutes(t.arrivalTime) === null ? '' : fromMinutes(toMinutes(t.arrivalTime) as number),
    notes: t.notes,
  };
};

export const directionsUrl = (coords: { lat: number; lng: number } | null, label: string) => {
  const destination = coords ? `${coords.lat},${coords.lng}` : `${label}, Houston, TX`;
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving`
    + `&origin=${encodeURIComponent(CHURCH.address)}&destination=${encodeURIComponent(destination)}`;
};
