import type { Missionary } from '../types';
import type { RegionId } from './regions';
import { hasCoords } from '../data/useMissionaries';

export interface Cluster { x: number; y: number; people: Missionary[]; region: RegionId }

/** Groups missionaries whose pins would overlap on screen into one pin. */
export const clusterMissionaries = (
  missionaries: Missionary[],
  project: (lonLat: [number, number]) => [number, number] | null,
  minDistance = 34,
): Cluster[] => {
  const out: Cluster[] = [];
  for (const m of missionaries) {
    if (!hasCoords(m)) continue;
    const p = project([m.location.longitude, m.location.latitude]);
    if (!p) continue;
    const near = out.find((c) => Math.hypot(c.x - p[0], c.y - p[1]) < minDistance);
    if (near) near.people.push(m);
    else out.push({ x: p[0], y: p[1], people: [m], region: (m.continent as RegionId) || 'north-america' });
  }
  return out;
};
