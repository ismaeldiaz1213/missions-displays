// City → map coordinates through OpenStreetMap's free Nominatim service. Used when an admin
// (or a missionary) types where they serve, so nobody has to look up latitude/longitude.
// Nominatim allows about one request per second; we only search when someone presses a button.

export interface Place {
  label: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

export const searchPlaces = async (query: string, lang: 'es' | 'en' = 'es'): Promise<Place[]> => {
  const q = query.trim();
  if (!q) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&accept-language=${lang}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const hits = (await res.json()) as NominatimHit[];
  return hits.map((h) => {
    const a = h.address ?? {};
    return {
      label: h.display_name,
      city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '',
      state: a.state ?? a.region ?? a.province ?? '',
      country: a.country ?? '',
      latitude: Number(h.lat),
      longitude: Number(h.lon),
    };
  });
};

/** Best single match, or null. */
export const geocodeFirst = async (city: string, state: string, country: string) => {
  try {
    const [hit] = await searchPlaces([city, state, country].filter(Boolean).join(', '));
    return hit ?? null;
  } catch {
    return null;
  }
};
