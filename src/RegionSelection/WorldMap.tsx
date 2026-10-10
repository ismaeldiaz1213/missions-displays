import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase } from '@mui/material';
import { geoCircle, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Missionary } from '../types';
import { HOUSTON_LAT, HOUSTON_LON } from '../constants';
import { useElementSize } from '../ui/useElementSize';
import { clusterMissionaries } from '../map/clusters';
import { nightCenter } from '../map/sun';
import MissionaryPin from '../map/MissionaryPin';
import PinCard from '../map/PinCard';
import TapPrompt from '../ui/TapPrompt';
import { REGIONS, REGION_BY_ID, loadCountries, type CountryFeature, type RegionId } from '../map/regions';
import './worldMap.css';

const IDLE_MS = 25_000; // no touches for this long → start the tour
const TOUR_MS = 6_000; // time on each stop of the tour
const ZOOM = 2.6; // how far the map zooms into a region before opening it

interface Props {
  missionaries: Missionary[];
  counts: Partial<Record<RegionId, number>>;
  activeRegion: RegionId | null;
  onActiveRegionChange: (id: RegionId | null) => void;
  onRegionSelect: (id: RegionId) => void;
  /** Region being opened: the map zooms into it. */
  flyTo: RegionId | null;
  /** Share of the height kept clear at the top (for a title laid over the map). */
  topInset?: number;
}

/**
 * Custom-drawn world map for the kiosk: countries colored by region, live day/night shading,
 * flight paths from Houston, and missionary photos as pins. When nobody has touched it for a
 * while it tours the missionaries one by one to invite people over.
 */
const WorldMap: React.FC<Props> = ({ missionaries, counts, activeRegion, onActiveRegionChange, onRegionSelect, flyTo, topInset = 0 }) => {
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(boxRef);
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [touring, setTouring] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => { loadCountries().then(setCountries).catch(console.error); }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const projection = useMemo(() => {
    if (!countries || !w || !h) return null;
    const pad = Math.min(w, h) * 0.04;
    return geoNaturalEarth1().fitExtent([[pad, pad + h * topInset], [w - pad, h - pad]], { type: 'FeatureCollection', features: countries });
  }, [countries, w, h, topInset]);

  const shapes = useMemo(() => {
    if (!projection || !countries) return null;
    const path = geoPath(projection);
    return {
      sphere: path({ type: 'Sphere' }) ?? '',
      graticule: path(geoGraticule10()) ?? '',
      countries: countries.map((c, i) => ({ key: `${c.properties.name}-${i}`, region: c.properties.region, d: path(c) ?? '' })),
    };
  }, [projection, countries]);

  const night = useMemo(() => {
    if (!projection) return null;
    const center = nightCenter(now);
    const path = geoPath(projection);
    return {
      twilight: path(geoCircle().center(center).radius(96)()) ?? '',
      dark: path(geoCircle().center(center).radius(90)()) ?? '',
    };
  }, [projection, now]);

  const houston = projection?.([HOUSTON_LON, HOUSTON_LAT]) ?? null;

  // Nearby missionaries share one pin so faces never stack on top of each other
  const clusters = useMemo(
    () => (projection ? clusterMissionaries(missionaries, (p) => projection(p)) : []),
    [projection, missionaries],
  );

  const arcs = useMemo(() => {
    if (!houston) return [];
    return clusters.flatMap((c) => {
      const [x0, y0] = houston;
      const dx = c.x - x0, dy = c.y - y0;
      const dist = Math.hypot(dx, dy);
      if (dist < 24) return [];
      // Lift the midpoint perpendicular to the line (always upward) for a flight-path curve
      let nx = -dy / dist, ny = dx / dist;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const lift = Math.min(dist * 0.32, 160);
      const cx = (x0 + c.x) / 2 + nx * lift, cy = (y0 + c.y) / 2 + ny * lift;
      return [{ key: `${c.x},${c.y}`, d: `M${x0},${y0} Q${cx},${cy} ${c.x},${c.y}`, color: REGION_BY_ID[c.region]?.color ?? '#F59E0B' }];
    });
  }, [houston, clusters]);

  // Idle tour: after a while with no touches, visit each missionary pin in turn
  useEffect(() => {
    let timer = 0;
    const reset = () => {
      window.clearTimeout(timer);
      setTouring(false);
      timer = window.setTimeout(() => setTouring(true), IDLE_MS);
    };
    const events = ['pointerdown', 'pointermove', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  useEffect(() => {
    if (!touring || clusters.length === 0) return;
    let i = 0;
    setOpenIdx(0);
    const id = setInterval(() => { i = (i + 1) % clusters.length; setOpenIdx(i); }, TOUR_MS);
    // Leave the current card open when the tour stops, so a tap on it still works
    return () => clearInterval(id);
  }, [touring, clusters.length]);

  const openCluster = openIdx !== null ? clusters[openIdx] ?? null : null;
  const dimmed = (id: RegionId) => activeRegion !== null && activeRegion !== id;

  // Zoom toward the chosen region's label while the page changes
  const flyPoint = flyTo && projection ? projection(REGION_BY_ID[flyTo].label) : null;
  const zoomTransform = flyPoint ? `translate(${w / 2 - ZOOM * flyPoint[0]}px, ${h / 2 - ZOOM * flyPoint[1]}px) scale(${ZOOM})` : 'none';

  return (
    <Box ref={boxRef} className="world-map" onClick={() => setOpenIdx(null)}
      sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Box sx={{
        position: 'absolute', inset: 0, transformOrigin: '0 0', transform: zoomTransform,
        transition: 'transform 0.7s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.7s ease',
        opacity: flyTo ? 0.85 : 1,
      }}>
        {shapes && (
          <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden>
            <defs>
              <radialGradient id="wm-ocean" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#EFF8FF" />
                <stop offset="100%" stopColor="#BFDBFE" />
              </radialGradient>
            </defs>

            <path d={shapes.sphere} fill="url(#wm-ocean)" stroke="#93C5FD" strokeWidth={1.5} />
            <path d={shapes.graticule} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.8} />

            <g>
              {shapes.countries.map((c) => (
                <path
                  key={c.key}
                  d={c.d}
                  className="map-country"
                  fill={REGION_BY_ID[c.region].color}
                  fillOpacity={activeRegion === c.region ? 1 : dimmed(c.region) ? 0.3 : 0.72}
                  stroke="#FFFFFF"
                  strokeWidth={0.6}
                  onMouseEnter={() => onActiveRegionChange(c.region)}
                  onMouseLeave={() => onActiveRegionChange(null)}
                  onClick={(e) => { e.stopPropagation(); onRegionSelect(c.region); }}
                />
              ))}
            </g>

            {/* Where it's night right now */}
            {night && (
              <g pointerEvents="none">
                <path d={night.twilight} fill="#1E3A8A" fillOpacity={0.05} />
                <path d={night.dark} fill="#1E3A8A" fillOpacity={0.1} />
              </g>
            )}

            {/* Flight paths from Houston */}
            <g pointerEvents="none">
              {arcs.map((a, i) => (
                <g key={a.key}>
                  <path d={a.d} fill="none" stroke={a.color} strokeOpacity={0.55} strokeWidth={2.5} />
                  <path d={a.d} fill="none" stroke="#B45309" strokeWidth={3.5} strokeLinecap="round"
                    className="wm-arc-flow" style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
                </g>
              ))}
            </g>

            {houston && (
              <g transform={`translate(${houston[0]},${houston[1]})`} pointerEvents="none">
                <circle r={7} fill="#F59E0B" className="wm-beacon-ring" />
                <circle r={7} fill="#F59E0B" stroke="#fff" strokeWidth={2.5} />
              </g>
            )}
          </svg>
        )}

        {/* Houston tag */}
        {houston && (
          <Box sx={{
            position: 'absolute', left: houston[0] - 10, top: houston[1] - 10, transform: 'translate(-100%, -100%)',
            px: 1.25, py: 0.4, borderRadius: '8px', bgcolor: '#F59E0B', color: '#fff',
            fontWeight: 800, fontSize: '0.8rem', whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(180,83,9,0.3)',
          }}>
            Houston · IBL
          </Box>
        )}

        {/* Region labels */}
        {projection && REGIONS.map((r) => {
          const p = projection(r.label);
          if (!p) return null;
          const n = counts[r.id] ?? 0;
          const active = activeRegion === r.id;
          return (
            <ButtonBase
              key={r.id}
              onClick={(e) => { e.stopPropagation(); onRegionSelect(r.id); }}
              onMouseEnter={() => onActiveRegionChange(r.id)}
              onMouseLeave={() => onActiveRegionChange(null)}
              sx={{
                position: 'absolute', left: p[0], top: p[1], transform: `translate(-50%, -50%) scale(${active ? 1.08 : 1})`,
                display: 'flex', alignItems: 'center', gap: 1, pl: 2.25, pr: n ? 0.75 : 2.25, py: 0.9,
                borderRadius: '999px', bgcolor: '#fff',
                border: `2px solid ${r.color}`, color: '#0F172A', whiteSpace: 'nowrap',
                fontWeight: 800, fontSize: { md: '1rem', xl: '1.1rem' },
                boxShadow: active ? `0 0 0 5px ${r.color}40, 0 8px 24px rgba(15,23,42,0.18)` : '0 6px 18px rgba(15,23,42,0.14)',
                opacity: dimmed(r.id) ? 0.6 : 1, transition: 'all 0.2s ease', zIndex: 2,
              }}
            >
              {r.name}
              {n > 0 && (
                <Box component="span" sx={{
                  minWidth: 28, height: 28, px: 0.75, borderRadius: '999px', bgcolor: r.color, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                }}>
                  {n}
                </Box>
              )}
            </ButtonBase>
          );
        })}

        {/* Missionary photo pins */}
        {clusters.map((c, i) => {
          const isOpen = openIdx === i;
          return (
            <MissionaryPin key={`${c.x},${c.y}`} cluster={c} color={REGION_BY_ID[c.region]?.color ?? '#2563EB'} open={isOpen}
              onClick={(e) => {
                e.stopPropagation();
                if (c.people.length === 1 && isOpen) navigate(`/misionero/${c.people[0].id}`);
                else setOpenIdx(isOpen ? null : i);
              }} />
          );
        })}
      </Box>

      {/* Who's here card (outside the zoom layer so it stays crisp) */}
      {openCluster && !flyTo && (
        <PinCard key={openIdx} cluster={openCluster} mapWidth={w} mapHeight={h}
          color={REGION_BY_ID[openCluster.region]?.color ?? '#E2E8F0'}
          title={touring ? 'Conozca a nuestros misioneros' : openCluster.people.length > 1 ? `${openCluster.people.length} misioneros aquí` : 'Conozca a'}
          onClose={() => setOpenIdx(null)} />
      )}

      {/* Invitation while touring */}
      {touring && (
        <Box sx={{ position: 'absolute', right: 28, bottom: 24, zIndex: 11 }}>
          <TapPrompt title="Toque la pantalla" subtitle="para explorar el mapa" />
        </Box>
      )}

      {/* Legend */}
      <Box sx={{
        position: 'absolute', left: 20, bottom: 18, zIndex: 4, display: 'flex', gap: 2, alignItems: 'center',
        px: 1.75, py: 0.9, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.85)', color: '#475569', fontSize: '0.82rem', fontWeight: 600,
        pointerEvents: 'none', opacity: touring ? 0 : 1, transition: 'opacity 0.3s',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: 'rgba(30,58,138,0.22)' }} /> Donde ahora es de noche
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: '#B45309' }} /> Viaje desde Houston
        </Box>
      </Box>
    </Box>
  );
};

export default WorldMap;
