import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import { HOUSTON_LAT, HOUSTON_LON } from '../../constants';
import { loadWorldLowRes, type Countries } from '../../map/atlas';
import { useElementSize } from '../../ui/useElementSize';

const INTRO_MS = 1600;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * A small globe that turns from Houston to where the missionary serves and draws the trip
 * between them. Zooms in automatically when they're close (e.g. Mexico) so the route reads.
 * People on the kiosk tap it to see what it does, so a tap flies the trip again.
 */
const LocationGlobe: React.FC<{ latitude: number; longitude: number }> = ({ latitude, longitude }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(boxRef);
  const [countries, setCountries] = useState<Countries | null>(null);
  const [t, setT] = useState(0); // intro progress 0 → 1
  const [replays, setReplays] = useState(0);

  useEffect(() => { loadWorldLowRes().then(setCountries).catch(console.error); }, []);

  useEffect(() => {
    if (!countries) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setT(1); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / INTRO_MS);
      setT(easeInOut(p));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [countries, latitude, longitude, replays]);

  const houston: [number, number] = [HOUSTON_LON, HOUSTON_LAT];
  const place: [number, number] = [longitude, latitude];
  const angle = geoDistance(houston, place); // radians

  const shapes = useMemo(() => {
    const { w, h } = size;
    if (!countries || !w || !h) return null;
    // Turn from Houston toward the midpoint of the trip, zooming as we go
    const mid = geoInterpolate(houston, place)(0.5);
    const center = geoInterpolate(houston, mid)(t);
    const whole = Math.min(w, h) * 0.46;
    const fitted = Math.min(w, h) * 0.34 / Math.max(Math.sin(angle / 2), 0.02);
    const radius = whole + (Math.min(Math.max(fitted, whole), whole * 7) - whole) * t;
    const projection = geoOrthographic().rotate([-center[0], -center[1]]).scale(radius).translate([w / 2, h / 2]).clipAngle(90);
    const path = geoPath(projection);
    return {
      sphere: path({ type: 'Sphere' }) ?? '',
      graticule: path(geoGraticule10()) ?? '',
      land: path(countries) ?? '',
      route: path({ type: 'LineString', coordinates: [houston, place] }) ?? '',
      houston: projection(houston),
      place: projection(place),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, size, t, latitude, longitude]);

  return (
    <Box ref={boxRef} onClick={() => { if (t === 1) setReplays((n) => n + 1); }} sx={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer', background: 'linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%)' }}>
      {shapes && (
        <svg width={size.w} height={size.h} style={{ display: 'block' }} role="img" aria-label="Mapa de la ruta desde Houston">
          <defs>
            <radialGradient id="lg-ocean" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#93C5FD" />
            </radialGradient>
          </defs>
          <path d={shapes.sphere} fill="url(#lg-ocean)" stroke="#93C5FD" strokeWidth={1} />
          <path d={shapes.graticule} fill="none" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={0.6} />
          <path d={shapes.land} fill="#FEF9EE" stroke="#CBD5E1" strokeWidth={0.6} />
          {t > 0.6 && (
            <path d={shapes.route} fill="none" stroke="#2563EB" strokeWidth={3} strokeLinecap="round"
              strokeDasharray="2 7" style={{ opacity: (t - 0.6) / 0.4 }} />
          )}
          {shapes.houston && (
            <g transform={`translate(${shapes.houston[0]},${shapes.houston[1]})`}>
              <circle r={6} fill="#F59E0B" stroke="#fff" strokeWidth={2.5} />
            </g>
          )}
          {shapes.place && t > 0.85 && (
            <g transform={`translate(${shapes.place[0]},${shapes.place[1]})`}>
              <circle r={8} fill="#2563EB" className="lg-pulse" />
              <circle r={8} fill="#2563EB" stroke="#fff" strokeWidth={3} />
            </g>
          )}
        </svg>
      )}
    </Box>
  );
};

export default LocationGlobe;
