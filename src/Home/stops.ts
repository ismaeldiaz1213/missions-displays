import { geoDistance } from 'd3-geo';
import type { Missionary } from '../types';
import { HOUSTON_LAT, HOUSTON_LON } from '../constants';
import { hasCoords } from '../data/useMissionaries';

export type LonLat = [number, number];

export const HOUSTON: LonLat = [HOUSTON_LON, HOUSTON_LAT];

/** A place the plane lands; missionaries within ~60 km of each other share one stop. */
export interface Stop { at: LonLat; people: Missionary[] }

/** Groups missionaries by place, today's missionary first so the first flight goes to them. */
export const buildStops = (missionaries: Missionary[], first?: Missionary | null): Stop[] => {
  const sorted = missionaries.filter(hasCoords).sort((a, b) => a.id.localeCompare(b.id));
  const start = first ? Math.max(0, sorted.findIndex((m) => m.id === first.id)) : 0;
  const ordered = [...sorted.slice(start), ...sorted.slice(0, start)];
  const stops: Stop[] = [];
  for (const m of ordered) {
    const at: LonLat = [m.location.longitude, m.location.latitude];
    const near = stops.find((s) => geoDistance(s.at, at) < 0.01); // ~60 km
    if (near) near.people.push(m);
    else stops.push({ at, people: [m] });
  }
  return stops;
};

