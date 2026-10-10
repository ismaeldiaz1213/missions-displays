import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { feature } from 'topojson-client';

export type Countries = FeatureCollection<Polygon | MultiPolygon>;

// Bundled with the app (and precached by the service worker), so globes draw with no internet.
let lowRes: Promise<Countries> | null = null;

/** Coarse world outline (~100 KB) for small or animated globes. */
export const loadWorldLowRes = () => (lowRes ??= import('world-atlas/countries-110m.json').then(({ default: topo }) => {
  const world = topo as unknown as Topology<{ countries: GeometryCollection }>;
  return feature(world, world.objects.countries) as Countries;
}));

let landLowRes: Promise<FeatureCollection> | null = null;

/** All land as one shape (~55 KB), for effects like night-time city lights. */
export const loadLandLowRes = () => (landLowRes ??= import('world-atlas/land-110m.json').then(({ default: topo }) => {
  const world = topo as unknown as Topology<{ land: GeometryCollection }>;
  return feature(world, world.objects.land) as FeatureCollection;
}));
