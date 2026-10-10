import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { geoCircle, geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { loadLandLowRes, loadWorldLowRes, type Countries } from '../map/atlas';
import { loadCityLights, type Light } from '../map/cityLights';
import { nightCenter } from '../map/sun';
import { profilePhotoUrl } from '../storageUrl';
import { useElementSize } from '../ui/useElementSize';
import { BRAND } from '../ui/brand';
import { HOUSTON, type LonLat, type Stop } from './stops';
import { CLOSING_VERSE, INTERLUDE_VERSES, OPENING_VERSE, type Verse } from './verses';

/** What the page should show alongside the globe right now (`ms` = how long it lasts). */
export type Stage =
  | { kind: 'verse'; verse: Verse; ms: number }
  | { kind: 'fly'; stop: Stop; index: number; total: number; ms: number }
  | { kind: 'arrive'; stop: Stop; index: number; total: number; ms: number }
  | { kind: 'homeward'; ms: number }
  | { kind: 'closing'; verse: Verse; ms: number };

type Shot =
  | { kind: 'verse'; verse: Verse }
  | { kind: 'fly'; stop: Stop; index: number }
  | { kind: 'arrive'; stop: Stop; index: number }
  | { kind: 'homeward' }
  | { kind: 'closing' };

// Unhurried on purpose: this plays in a hallway while people walk by
const VERSE_MS = 17_000;
const ARRIVE_MS = 11_000;
const CLOSING_MS = 20_000;
const STOPS_BETWEEN_VERSES = 3;
const flightMs = (from: LonLat, to: LonLat) => Math.min(12_000, 5_500 + geoDistance(from, to) * 3_200);

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// Overshoots a little past 1 then settles (a "pop"); clamped at 0 because rounding can dip below it
const easeOutBack = (t: number) => Math.max(0, 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Small airliner silhouette pointing up, centered on 0,0
const PLANE = new Path2D('M0,-15 C1.6,-15 2.4,-13 2.4,-10 L2.4,-4 L14,3 L14,6 L2.4,2.5 L2,9 L6,12 L6,14.5 L0,13 L-6,14.5 L-6,12 L-2,9 L-2.4,2.5 L-14,6 L-14,3 L-2.4,-4 L-2.4,-10 C-2.4,-13 -1.6,-15 0,-15 Z');

/** The loop: opening verse → missionaries (a verse every few) → home to Houston → closing verse. */
const buildShots = (stops: Stop[]): Shot[] => {
  const shots: Shot[] = [{ kind: 'verse', verse: OPENING_VERSE }];
  let interlude = 0;
  stops.forEach((stop, index) => {
    shots.push({ kind: 'fly', stop, index }, { kind: 'arrive', stop, index });
    if ((index + 1) % STOPS_BETWEEN_VERSES === 0 && index < stops.length - 1) {
      shots.push({ kind: 'verse', verse: INTERLUDE_VERSES[interlude++ % INTERLUDE_VERSES.length] });
    }
  });
  if (stops.length) shots.push({ kind: 'homeward' });
  shots.push({ kind: 'closing' });
  return shots;
};

/**
 * The welcome screen's living globe, drawn on a canvas: a plane flies from Houston to each
 * missionary and lands with their photo, the globe turns slowly through each verse, the night
 * side glows with city lights, and the loop ends back at the church.
 */
const AttractGlobe: React.FC<{ stops: Stop[]; onStage: (s: Stage) => void; /** Globe center as a share of the width */ centerX?: number }> = ({
  stops, onStage, centerX = 0.5,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(boxRef);
  const [world, setWorld] = useState<{ countries: Countries; land: FeatureCollection } | null>(null);
  // Read each frame, so lights appearing a moment later don't restart the tour
  const lights = useRef<Light[]>([]);
  const onStageRef = useRef(onStage);
  onStageRef.current = onStage;

  useEffect(() => {
    Promise.all([loadWorldLowRes(), loadLandLowRes()]).then(([countries, land]) => setWorld({ countries, land })).catch(console.error);
    loadCityLights().then((l) => { lights.current = l; }).catch(console.error);
  }, []);

  // Photos for the pins, loaded once
  const photos = useMemo(() => {
    const map = new Map<string, HTMLImageElement>();
    for (const s of stops) {
      const img = new Image();
      img.onerror = () => { img.onerror = null; img.src = '/default-missionary.svg'; };
      img.src = profilePhotoUrl(s.people[0]);
      map.set(s.people[0].id, img);
    }
    return map;
  }, [stops]);

  const graticule = useMemo(() => geoGraticule10(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const { w, h } = size;
    if (!canvas || !ctx || !world || !w || !h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The canvas fills the screen (so glows never get cut off); the globe sits at `centerX`
    const cx = w * centerX, cy = h / 2;
    const base = Math.min(w * Math.min(centerX, 1 - centerX) * 0.82, h * 0.4);
    const close = base * 1.55;
    // Add ?rapido to the URL to preview the whole loop at 4× speed
    const speed = new URLSearchParams(window.location.search).has('rapido') ? 4 : 1;
    const projection = geoOrthographic().translate([cx, cy]).clipAngle(90).precision(0.6);
    const path = geoPath(projection, ctx);
    const shots = buildShots(stops);
    const visited = new Set<string>();

    let shotIdx = -1;
    let shot: Shot = shots[0];
    let shotStart = 0;
    let shotMs = 0;
    let from: LonLat = HOUSTON; // where the plane took off for the current flight
    let here: LonLat = HOUSTON; // where the plane is parked
    let center: LonLat = HOUSTON;
    let scale = base;
    let startCenter: LonLat = HOUSTON;
    let startScale = base;
    const nightShapes = (c: LonLat) => ({ center: c, twilight: geoCircle().center(c).radius(97)(), dark: geoCircle().center(c).radius(90)() });
    let night = nightShapes(nightCenter(new Date()));
    let lastNight = performance.now();

    // Where each moment's camera ends up. Snapping to it before the next moment keeps the tour
    // in order even if frames were skipped (screen asleep, a busy moment on the kiosk).
    const finish = () => {
      if (shotIdx < 0) return;
      if (shot.kind === 'verse') { center = [here[0], here[1]]; scale = base; }
      else if (shot.kind === 'fly') { center = shot.stop.at; scale = close; }
      else if (shot.kind === 'homeward') { center = HOUSTON; scale = close; }
      else if (shot.kind === 'arrive') { center = here; scale = close * 1.08; }
      else { center = HOUSTON; scale = close * 1.15; }
    };

    const begin = (now: number) => {
      finish();
      shotIdx = (shotIdx + 1) % shots.length;
      if (shotIdx === 0) visited.clear();
      shot = shots[shotIdx];
      shotStart = now;
      startCenter = center;
      startScale = scale;
      const total = stops.length;
      if (shot.kind === 'verse') {
        shotMs = VERSE_MS;
        onStageRef.current({ kind: 'verse', verse: shot.verse, ms: shotMs });
      } else if (shot.kind === 'fly') {
        from = here;
        shotMs = still ? 1500 : flightMs(from, shot.stop.at);
        onStageRef.current({ kind: 'fly', stop: shot.stop, index: shot.index, total, ms: shotMs });
      } else if (shot.kind === 'arrive') {
        here = shot.stop.at;
        shotMs = ARRIVE_MS;
        onStageRef.current({ kind: 'arrive', stop: shot.stop, index: shot.index, total, ms: shotMs });
      } else if (shot.kind === 'homeward') {
        from = here;
        shotMs = still ? 1500 : flightMs(from, HOUSTON);
        onStageRef.current({ kind: 'homeward', ms: shotMs });
      } else {
        here = HOUSTON;
        shotMs = CLOSING_MS;
        onStageRef.current({ kind: 'closing', verse: CLOSING_VERSE, ms: shotMs });
      }
    };

    const drawPhotoPin = (img: HTMLImageElement | undefined, x: number, y: number, r: number, ring: string) => {
      if (r < 1) return;
      ctx.beginPath(); ctx.arc(x, y + r * 0.22, r + 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(15,23,42,0.16)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = ring; ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
      if (img && img.complete && img.naturalWidth) {
        const s = Math.max((2 * r) / img.naturalWidth, (2 * r) / img.naturalHeight);
        ctx.drawImage(img, x - (img.naturalWidth * s) / 2, y - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      } else {
        ctx.fillStyle = BRAND.blueSoft; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      ctx.restore();
    };

    const drawPlane = (at: LonLat, heading: LonLat, lift: number) => {
      const p = projection(at);
      const q = projection(heading);
      if (!p || !q) return;
      const angle = Math.atan2(q[0] - p[0], -(q[1] - p[1]));
      const s = 1.35 + lift * 0.6;
      ctx.save(); // shadow on the ground drifts away as the plane climbs
      ctx.translate(p[0] + 6 + lift * 18, p[1] + 9 + lift * 26); ctx.rotate(angle); ctx.scale(s, s);
      ctx.fillStyle = `rgba(15,23,42,${0.2 - lift * 0.08})`; ctx.fill(PLANE);
      ctx.restore();
      ctx.save();
      ctx.translate(p[0], p[1]); ctx.rotate(angle); ctx.scale(s, s);
      ctx.fillStyle = BRAND.navy; ctx.fill(PLANE);
      ctx.lineWidth = 1.3; ctx.strokeStyle = '#fff'; ctx.stroke(PLANE);
      ctx.restore();
    };

    const visible = (at: LonLat) => geoDistance(at, center) < Math.PI / 2 - 0.02;

    const frame = (now: number) => {
      // Ask for the next frame first: one bad frame must never freeze the welcome screen
      raf = requestAnimationFrame(frame);
      try {
        draw(now * speed);
      } catch (err) {
        console.error('Welcome globe frame failed', err);
      }
    };

    const draw = (now: number) => {
      if (now - shotStart > shotMs) begin(now);
      const t = now - shotStart;
      const p = clamp01(t / shotMs);
      if (now - lastNight > 60_000) { night = nightShapes(nightCenter(new Date())); lastNight = now; }

      // ── Camera ────────────────────────────────────────────────────────
      let plane: { at: LonLat; heading: LonLat; lift: number; k: number; to: LonLat } | null = null;
      if (shot.kind === 'verse') {
        // One slow, full turn of the world
        const spin = still ? 0 : 360 * ease(p);
        const lat = p > 0.85 ? lerp(18, here[1], ease((p - 0.85) / 0.15)) : lerp(startCenter[1], 18, ease(clamp01(p * 4)));
        center = [startCenter[0] + spin, lat];
        scale = lerp(startScale, base, ease(clamp01(p * 5)));
      } else if (shot.kind === 'fly' || shot.kind === 'homeward') {
        const to = shot.kind === 'fly' ? shot.stop.at : HOUSTON;
        const k = ease(p);
        const route = geoInterpolate(from, to);
        plane = { at: route(k), heading: route(Math.min(1, k + 0.02)), lift: Math.sin(Math.PI * p), k, to };
        const far = Math.min(1, geoDistance(from, to) / 1.2);
        const zoom = lerp(close, lerp(close, base * 0.95, far), Math.sin(Math.PI * p));
        const blend = ease(clamp01(p / 0.3));
        center = geoInterpolate(startCenter, route(Math.min(1, k + 0.04)))(blend);
        scale = lerp(startScale, zoom, blend);
        if (p >= 1 && shot.kind === 'fly') visited.add(shot.stop.people[0].id);
      } else if (shot.kind === 'arrive') {
        center = geoInterpolate(startCenter, here)(ease(clamp01(p * 3)));
        scale = lerp(startScale, close * 1.08, ease(p)); // a slow push-in while we visit
      } else {
        center = geoInterpolate(startCenter, HOUSTON)(ease(clamp01(p * 3)));
        scale = lerp(startScale, close * 1.15, ease(p));
      }
      projection.rotate([-center[0], -center[1]]).scale(scale);

      // ── Globe ─────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, w, h);

      // Faint rings behind the globe
      ctx.lineWidth = 1;
      for (const [k, a] of [[1.22, 0.1], [1.48, 0.07], [1.8, 0.045]]) {
        ctx.beginPath(); ctx.arc(cx, cy, base * k, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(37,99,235,${a})`; ctx.stroke();
      }

      // Atmosphere
      const halo = ctx.createRadialGradient(cx, cy, scale * 0.96, cx, cy, scale * 1.14);
      halo.addColorStop(0, 'rgba(147,197,253,0.65)');
      halo.addColorStop(1, 'rgba(147,197,253,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, scale * 1.14, 0, Math.PI * 2); ctx.fill();

      // Ocean, with a soft drop shadow
      const ocean = ctx.createRadialGradient(cx - scale * 0.35, cy - scale * 0.4, scale * 0.05, cx, cy, scale);
      ocean.addColorStop(0, '#F0F9FF');
      ocean.addColorStop(0.55, '#BFDBFE');
      ocean.addColorStop(1, '#7FB2F5');
      // Soft shadow below the globe (a gradient — canvas shadowBlur is far too slow at this size)
      ctx.save();
      ctx.translate(cx, cy + scale * 0.1);
      ctx.scale(1, 0.96);
      const shade = ctx.createRadialGradient(0, 0, scale * 0.85, 0, 0, scale * 1.18);
      shade.addColorStop(0, 'rgba(30,58,138,0.22)');
      shade.addColorStop(1, 'rgba(30,58,138,0)');
      ctx.fillStyle = shade;
      ctx.beginPath(); ctx.arc(0, 0, scale * 1.18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = ocean; ctx.fill();

      ctx.beginPath(); path(graticule); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.7; ctx.stroke();

      const landFill = ctx.createLinearGradient(cx - scale, cy - scale, cx + scale, cy + scale);
      landFill.addColorStop(0, '#FFFDF7');
      landFill.addColorStop(1, '#F3E9D2');
      ctx.beginPath(); path(world.land); ctx.fillStyle = landFill; ctx.fill();
      ctx.beginPath(); path(world.countries); ctx.strokeStyle = 'rgba(148,163,184,0.55)'; ctx.lineWidth = 0.6; ctx.stroke();

      // Night side, and the lights of towns where it's dark
      ctx.beginPath(); path(night.twilight); ctx.fillStyle = 'rgba(15,30,80,0.12)'; ctx.fill();
      ctx.beginPath(); path(night.dark); ctx.fillStyle = 'rgba(15,30,80,0.30)'; ctx.fill();
      const secs = now / 1000;
      for (const l of lights.current) {
        const dark = Math.PI / 2 - geoDistance(l.at, night.center);
        if (dark <= 0 || !visible(l.at)) continue;
        const q = projection(l.at);
        if (!q) continue;
        const a = clamp01(dark / 0.18) * (0.65 + 0.35 * Math.sin(secs * l.speed + l.phase));
        ctx.beginPath(); ctx.arc(q[0], q[1], l.size * 2.6, 0, Math.PI * 2); ctx.fillStyle = `rgba(253,224,140,${a * 0.18})`; ctx.fill();
        ctx.beginPath(); ctx.arc(q[0], q[1], l.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,236,170,${a})`; ctx.fill();
      }

      // Gloss
      ctx.save();
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.clip();
      const gloss = ctx.createRadialGradient(cx - scale * 0.45, cy - scale * 0.5, 0, cx - scale * 0.45, cy - scale * 0.5, scale * 0.9);
      gloss.addColorStop(0, 'rgba(255,255,255,0.32)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss; ctx.fillRect(cx - scale, cy - scale, scale * 2, scale * 2);
      ctx.restore();
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();

      // ── Route, places, plane ──────────────────────────────────────────
      if (plane) {
        // Whole route faintly, then a contrail that fades behind the plane
        ctx.beginPath(); path({ type: 'LineString', coordinates: [from, plane.to] });
        ctx.setLineDash([2, 9]); ctx.lineCap = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(37,99,235,0.35)'; ctx.stroke();
        ctx.setLineDash([]);
        const route = geoInterpolate(from, plane.to);
        const steps = 14;
        for (let i = 0; i < steps; i++) {
          const a = Math.max(0, plane.k - 0.22 * (1 - i / steps));
          const b = Math.max(0, plane.k - 0.22 * (1 - (i + 1) / steps));
          if (b <= a) continue;
          ctx.beginPath(); path({ type: 'LineString', coordinates: [route(a), route(b)] });
          ctx.lineWidth = 3.5; ctx.strokeStyle = `rgba(255,255,255,${(i / steps) * 0.95})`; ctx.stroke();
        }
      }

      // Missionaries not yet visited: small dots; visited: little photos
      for (const s of stops) {
        if (!visible(s.at) || (shot.kind === 'arrive' && shot.stop === s)) continue;
        const q = projection(s.at);
        if (!q) continue;
        if (visited.has(s.people[0].id)) {
          drawPhotoPin(photos.get(s.people[0].id), q[0], q[1], 11, BRAND.blue);
        } else {
          ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, Math.PI * 2);
          ctx.fillStyle = BRAND.blue; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        }
      }

      // Houston, always pulsing gently
      if (visible(HOUSTON)) {
        const q = projection(HOUSTON);
        if (q) {
          const pulse = (secs % 2.4) / 2.4;
          ctx.beginPath(); ctx.arc(q[0], q[1], 8 + pulse * 22, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245,158,11,${0.55 * (1 - pulse)})`; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(q[0], q[1], 8, 0, Math.PI * 2);
          ctx.fillStyle = BRAND.amber; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        }
      }

      // Landing: the missionary's photo pops onto the globe, with ripples
      if (shot.kind === 'arrive' && visible(here)) {
        const q = projection(here);
        if (q) {
          for (const offset of [0, 0.5]) {
            const r = (secs / 2.2 + offset) % 1;
            ctx.beginPath(); ctx.arc(q[0], q[1], 34 + r * 46, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(37,99,235,${0.45 * (1 - r)})`; ctx.lineWidth = 2.5; ctx.stroke();
          }
          const pop = still ? 1 : easeOutBack(clamp01(t / 750));
          drawPhotoPin(photos.get(shot.stop.people[0].id), q[0], q[1] - 4 * pop, 30 * pop, BRAND.blue);
        }
      }

      if (plane) drawPlane(plane.at, plane.heading, plane.lift);
    };

    let raf = 0;
    begin(performance.now() * speed);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [world, size, stops, graticule, photos, centerX]);

  return (
    <Box ref={boxRef} sx={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden />
    </Box>
  );
};

export default AttractGlobe;
