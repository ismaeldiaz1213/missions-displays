import { useMemo } from 'react';
import type { Missionary } from '../types';
import { listMissionaries } from './missionaries';
import { useCachedLoad } from './useCachedLoad';

/** Every published missionary, from the device's saved copy first, then the network. */
export const useAllMissionaries = () => {
  const { data, loading, error } = useCachedLoad<Missionary[]>('all', listMissionaries);
  const missionaries = useMemo(() => data ?? [], [data]);
  return { missionaries, loading: loading && !data, error: data ? null : error };
};

export const hasCoords = (m: Missionary) => !!m.location && !(m.location.latitude === 0 && m.location.longitude === 0);

/**
 * Same missionary all day on every screen, a different one each day (in a fixed order, so
 * everyone gets a turn before anyone repeats).
 */
export const missionaryOfTheDay = (list: Missionary[], now = new Date()): Missionary | null => {
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return sorted[day % sorted.length];
};
