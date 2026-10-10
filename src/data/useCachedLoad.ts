import { useEffect, useRef, useState } from 'react';
import { readCache } from './missionaries';

/**
 * Shows the copy saved on this device right away (no spinner on a slow connection), then
 * swaps in fresh data when the network answers. `key` must match the cache key `load` writes.
 */
export const useCachedLoad = <T>(key: string | null, load: () => Promise<T>) => {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [data, setData] = useState<T | null>(() => (key ? readCache<T>(key) : null));
  const [loading, setLoading] = useState(data === null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!key) { setLoading(false); return; }
    let cancelled = false;
    const cached = readCache<T>(key);
    setData(cached);
    setLoading(cached === null);
    loadRef.current()
      .then((fresh) => { if (!cancelled) { setData(fresh); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key]);

  return { data, loading, error };
};
