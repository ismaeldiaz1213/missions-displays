import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';

export type RegionId = 'north-america' | 'central-america' | 'south-america' | 'europe' | 'africa' | 'asia' | 'oceania';

export interface Region {
  id: RegionId;
  name: string;
  route: string;
  color: string;
  /** [lon, lat] where the region's label sits (placed clear of the missionary pins) */
  label: [number, number];
  /** [[west, south], [east, north]] framed by the region's own map */
  bounds: [[number, number], [number, number]];
}

export const REGIONS: Region[] = [
  { id: 'north-america',   name: 'Norte América',  route: '/norte-america',  color: '#3B82F6', label: [-104, 56], bounds: [[-168, 12], [-52, 72]] },
  { id: 'central-america', name: 'Centro América', route: '/centro-america', color: '#F59E0B', label: [-63, 14], bounds: [[-96, 6], [-59, 27]] },
  { id: 'south-america',   name: 'Sur América',    route: '/sur-america',    color: '#22C55E', label: [-50, -12], bounds: [[-84, -56], [-33, 13]] },
  { id: 'europe',          name: 'Europa',         route: '/europa',         color: '#A855F7', label: [14, 53], bounds: [[-24, 35], [45, 71]] },
  { id: 'africa',          name: 'África',         route: '/africa',         color: '#EF4444', label: [19, 6], bounds: [[-19, -36], [53, 38]] },
  { id: 'asia',            name: 'Asia',           route: '/asia',           color: '#06B6D4', label: [95, 46], bounds: [[25, -11], [148, 56]] },
  { id: 'oceania',         name: 'Oceanía',        route: '/oceania',        color: '#EAB308', label: [134, -25], bounds: [[110, -48], [180, 0]] },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>;

// Matches how the church files missionaries (e.g. Mexico is Norte América, the Caribbean is Centro América).
const OVERRIDES: Record<string, RegionId> = {
  Mexico: 'north-america', Greenland: 'north-america', Bermuda: 'north-america', 'St. Pierre and Miquelon': 'north-america',
  Panama: 'central-america', 'Trinidad and Tobago': 'central-america',
  'Falkland Is.': 'south-america', 'S. Geo. and the Is.': 'south-america',
  Russia: 'europe',
  Turkey: 'asia', Cyprus: 'asia', 'N. Cyprus': 'asia', Georgia: 'asia', Armenia: 'asia', Azerbaijan: 'asia',
  Eritrea: 'africa',
  Fiji: 'oceania',
};

const HIDDEN = new Set(['Antarctica', 'Fr. S. Antarctic Lands', 'Heard I. and McDonald Is.']);

/** Rough continent boxes by centroid; OVERRIDES handles the countries these get wrong. */
const regionAt = ([lon, lat]: [number, number]): RegionId => {
  if (lon < -140 || (lon > 140 && lat < 25) || (lat < -10 && lon > 110)) return 'oceania';
  if (lon < -25) {
    if (lat < 0 || (lat < 12 && lon > -80)) return 'south-america';
    return lat < 28 ? 'central-america' : 'north-america';
  }
  if (lon >= 34 && lat >= 12) return 'asia';
  if (lat >= 35 && lon < 45) return 'europe';
  if (lon <= 60 && lat < 35) return 'africa';
  return 'asia';
};

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string; region: RegionId }>;

/** Loads the world atlas and tags each country (France's overseas parts separately) with its region. */
export const loadCountries = async (): Promise<CountryFeature[]> => {
  const { default: topo } = await import('world-atlas/countries-50m.json');
  const world = topo as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const fc = feature(world, world.objects.countries) as FeatureCollection<Polygon | MultiPolygon, { name: string }>;

  const out: CountryFeature[] = [];
  for (const f of fc.features) {
    const name = f.properties.name;
    if (HIDDEN.has(name) || !f.geometry) continue;
    if (name === 'France' && f.geometry.type === 'MultiPolygon') {
      // French Guiana is part of France's shape but belongs in Sur América
      for (const coords of f.geometry.coordinates) {
        const part: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coords } };
        out.push({ ...part, properties: { name, region: regionAt(geoCentroid(part) as [number, number]) } });
      }
      continue;
    }
    out.push({ ...f, properties: { name, region: OVERRIDES[name] ?? regionAt(geoCentroid(f) as [number, number]) } });
  }
  return out;
};
