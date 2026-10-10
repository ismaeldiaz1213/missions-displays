import { geoEquirectangular, geoPath } from 'd3-geo';
import { loadLandLowRes } from './atlas';

export interface Light {
  at: [number, number];
  size: number;
  /** Twinkle phase and speed so lights don't blink in sync */
  phase: number;
  speed: number;
}

// Deterministic pseudo-random so the lights are the same on every screen and every load
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

let cached: Promise<Light[]> | null = null;

/**
 * Scattered "city lights" over land for the night side of the globe. The land is drawn once
 * onto a small hidden map and sampled — far faster than testing points against country shapes.
 */
export const loadCityLights = () => (cached ??= loadLandLowRes().then((land) => {
  const W = 720, H = 360;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const projection = geoEquirectangular().fitSize([W, H], { type: 'Sphere' });
  ctx.fillStyle = '#000';
  ctx.beginPath(); geoPath(projection, ctx)(land); ctx.fill();
  const pixels = ctx.getImageData(0, 0, W, H).data;
  const isLand = (lon: number, lat: number) => {
    const p = projection([lon, lat]);
    if (!p) return false;
    const x = Math.min(W - 1, Math.max(0, Math.round(p[0])));
    const y = Math.min(H - 1, Math.max(0, Math.round(p[1])));
    return pixels[(y * W + x) * 4 + 3] > 0;
  };

  const rand = random(20261102);
  const lights: Light[] = [];
  for (let lat = -56; lat <= 72; lat += 1.6) {
    for (let lon = -180; lon < 180; lon += 1.6) {
      const at: [number, number] = [lon + (rand() - 0.5) * 1.6, lat + (rand() - 0.5) * 1.6];
      // Fewer lights toward the poles, and a natural, patchy spread elsewhere
      const keep = Math.abs(at[1]) > 58 ? 0.12 : 0.5;
      if (rand() > keep || !isLand(at[0], at[1])) continue;
      lights.push({ at, size: 0.7 + rand() * 1.3, phase: rand() * Math.PI * 2, speed: 0.6 + rand() * 1.6 });
    }
  }
  return lights;
}));
