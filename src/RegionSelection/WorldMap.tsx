import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ZoomOutMapRoundedIcon from '@mui/icons-material/ZoomOutMapRounded';
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
const MAX_ZOOM = 6; // pinch-zoom limit

/** The visitor's pinch/drag zoom: map point (x, y) shows at (x·k + tx, y·k + ty). */
interface View { k: number; tx: number; ty: number }
const WHOLE: View = { k: 1, tx: 0, ty: 0 };

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
 * flight paths from Houston, and missionary photos as pins. Pinch or the +/− buttons zoom in
 * (pins that shared a spot split apart). When nobody has touched it for a while it zooms back
 * out and tours the missionaries one by one to invite people over.
 */
const WorldMap: React.FC<Props> = ({ missionaries, counts, activeRegion, onActiveRegionChange, onRegionSelect, flyTo, topInset = 0 }) => {
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(boxRef);
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [touring, setTouring] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<View>(WHOLE);
  const [gesturing, setGesturing] = useState(false);

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

  // Nearby missionaries share one pin so faces never stack on top of each other; zooming in
  // splits them (steps of ½ so a pinch doesn't regroup the pins on every frame)
  const clusterK = Math.floor(view.k * 2) / 2;
  const clusters = useMemo(
    () => (projection ? clusterMissionaries(missionaries, (p) => projection(p), 34 / clusterK) : []),
    [projection, missionaries, clusterK],
  );
  useEffect(() => setOpenIdx(null), [clusterK]);
  const toScreen = (x: number, y: number): [number, number] => [x * view.k + view.tx, y * view.k + view.ty];

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
      timer = window.setTimeout(() => { setView(WHOLE); setTouring(true); }, IDLE_MS);
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

  // ── Zoom: pinch with two fingers, drag with one once zoomed in, +/− buttons, mouse wheel ──
  const clampView = (v: View): View => {
    const k = Math.min(MAX_ZOOM, Math.max(1, v.k));
    return { k, tx: Math.min(0, Math.max(w - w * k, v.tx)), ty: Math.min(0, Math.max(h - h * k, v.ty)) };
  };
  /** Zoom to `k` keeping the map point under screen point (sx, sy) where it is. */
  const zoomAround = (v: View, k: number, sx: number, sy: number) =>
    clampView({ k, tx: sx - ((sx - v.tx) / v.k) * k, ty: sy - ((sy - v.ty) / v.k) * k });
  const zoomBy = (factor: number) => setView((v) => zoomAround(v, v.k * factor, w / 2, h / 2));

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; dist: number; mid: { x: number; y: number }; pan: { x: number; y: number } } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const local = (e: { clientX: number; clientY: number }) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const [a, b] = pts;
    gesture.current = {
      view: viewRef.current,
      dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      mid: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a,
      pan: a,
    };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId) || !gesture.current) return;
      pointers.current.set(e.pointerId, local(e));
      const g = gesture.current;
      const [a, b] = [...pointers.current.values()];
      if (b && g.dist) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const k = g.view.k * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist);
        // The map point that was under the fingers stays under them
        const k2 = Math.min(MAX_ZOOM, Math.max(1, k));
        setView(clampView({ k: k2, tx: mid.x - ((g.mid.x - g.view.tx) / g.view.k) * k2, ty: mid.y - ((g.mid.y - g.view.ty) / g.view.k) * k2 }));
        setGesturing(true);
      } else if (g.view.k > 1) {
        setView(clampView({ ...g.view, tx: g.view.tx + a.x - g.pan.x, ty: g.view.ty + a.y - g.pan.y }));
        if (Math.hypot(a.x - g.pan.x, a.y - g.pan.y) > 4) setGesturing(true);
      }
    };
    const up = (e: PointerEvent) => {
      if (!pointers.current.delete(e.pointerId)) return;
      if (pointers.current.size) startGesture(); // one finger left: carry on dragging from here
      else { gesture.current = null; setGesturing(false); }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (flyTo || pointers.current.size >= 2) return;
    pointers.current.set(e.pointerId, local(e));
    startGesture();
  };
  const onWheel = (e: React.WheelEvent) => {
    if (flyTo || e.ctrlKey) return;
    const p = local(e);
    setView((v) => zoomAround(v, v.k * (e.deltaY < 0 ? 1.25 : 0.8), p.x, p.y));
  };

  const zoomed = view.k > 1.01;
  const openCluster = openIdx !== null ? clusters[openIdx] ?? null : null;
  const dimmed = (id: RegionId) => activeRegion !== null && activeRegion !== id;

  // Zoom toward the chosen region's label while the page changes
  const flyMapPoint = flyTo && projection ? projection(REGION_BY_ID[flyTo].label) : null;
  const flyPoint = flyMapPoint ? toScreen(flyMapPoint[0], flyMapPoint[1]) : null;
  const zoomTransform = flyPoint ? `translate(${w / 2 - ZOOM * flyPoint[0]}px, ${h / 2 - ZOOM * flyPoint[1]}px) scale(${ZOOM})` : 'none';

  return (
    <Box ref={boxRef} className="world-map" onClick={() => setOpenIdx(null)} onPointerDown={onPointerDown} onWheel={onWheel}
      sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', touchAction: 'none' }}>
      <Box sx={{
        position: 'absolute', inset: 0, transformOrigin: '0 0', transform: zoomTransform,
        transition: 'transform 0.7s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.7s ease',
        opacity: flyTo ? 0.85 : 1,
      }}>
        {shapes && (
          <svg width={w} height={h} aria-hidden style={{
            position: 'absolute', inset: 0, display: 'block', transformOrigin: '0 0',
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`,
            transition: gesturing ? 'none' : 'transform 0.35s ease',
          }}>
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
                  vectorEffect="non-scaling-stroke"
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
                  <path d={a.d} fill="none" stroke={a.color} strokeOpacity={0.55} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
                  <path d={a.d} fill="none" stroke="#B45309" strokeWidth={3.5} strokeLinecap="round" vectorEffect="non-scaling-stroke"
                    className="wm-arc-flow" style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
                </g>
              ))}
            </g>

            {houston && (
              <g transform={`translate(${houston[0]},${houston[1]})`} pointerEvents="none">
                <circle r={7 / view.k} fill="#F59E0B" className="wm-beacon-ring" />
                <circle r={7 / view.k} fill="#F59E0B" stroke="#fff" strokeWidth={2.5 / view.k} />
              </g>
            )}
          </svg>
        )}

        {/* Houston tag */}
        {houston && (
          <Box sx={{
            position: 'absolute', left: toScreen(houston[0], houston[1])[0] - 10, top: toScreen(houston[0], houston[1])[1] - 10, transform: 'translate(-100%, -100%)',
            px: 1.25, py: 0.4, borderRadius: '8px', bgcolor: '#F59E0B', color: '#fff',
            fontWeight: 800, fontSize: '0.8rem', whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(180,83,9,0.3)',
          }}>
            Houston · IBL
          </Box>
        )}

        {/* Region labels */}
        {projection && REGIONS.map((r) => {
          const at = projection(r.label);
          if (!at) return null;
          const p = toScreen(at[0], at[1]);
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
            <MissionaryPin key={`${c.x},${c.y}`} cluster={{ ...c, x: toScreen(c.x, c.y)[0], y: toScreen(c.x, c.y)[1] }} color={REGION_BY_ID[c.region]?.color ?? '#2563EB'} open={isOpen}
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
        <PinCard key={openIdx} cluster={{ ...openCluster, x: toScreen(openCluster.x, openCluster.y)[0], y: toScreen(openCluster.x, openCluster.y)[1] }} mapWidth={w} mapHeight={h}
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

      {/* Zoom controls */}
      {!touring && !flyTo && (
        <Box onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} sx={{
          position: 'absolute', right: 20, bottom: 18, zIndex: 8, display: 'flex', alignItems: 'center', gap: 1,
        }}>
          {zoomed && (
            <ButtonBase onClick={() => setView(WHOLE)} sx={{
              gap: 1, px: 2, height: 56, borderRadius: '999px', bgcolor: '#1E3A8A', color: '#fff',
              boxShadow: '0 8px 22px rgba(30,58,138,0.3)',
            }}>
              <ZoomOutMapRoundedIcon />
              <Typography sx={{ fontWeight: 800 }}>Ver el mundo entero</Typography>
            </ButtonBase>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', borderRadius: '18px', overflow: 'hidden', bgcolor: '#fff', boxShadow: '0 8px 22px rgba(15,23,42,0.16)', border: '1px solid #E2E8F0' }}>
            <ButtonBase aria-label="Acercar" onClick={() => zoomBy(1.6)} disabled={view.k >= MAX_ZOOM}
              sx={{ width: 56, height: 52, color: '#1E3A8A', '&.Mui-disabled': { color: '#CBD5E1' } }}>
              <AddRoundedIcon sx={{ fontSize: '2rem' }} />
            </ButtonBase>
            <Box sx={{ height: '1px', bgcolor: '#E2E8F0' }} />
            <ButtonBase aria-label="Alejar" onClick={() => zoomBy(1 / 1.6)} disabled={!zoomed}
              sx={{ width: 56, height: 52, color: '#1E3A8A', '&.Mui-disabled': { color: '#CBD5E1' } }}>
              <RemoveRoundedIcon sx={{ fontSize: '2rem' }} />
            </ButtonBase>
          </Box>
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
