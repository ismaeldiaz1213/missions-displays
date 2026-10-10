import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import type { Missionary } from '../types';
import { useElementSize } from '../ui/useElementSize';
import { clusterMissionaries } from '../map/clusters';
import { loadCountries, type CountryFeature, type Region } from '../map/regions';
import MissionaryPin from '../map/MissionaryPin';
import PinCard from '../map/PinCard';

/** Corners and edge midpoints of a lon/lat box, so the projection frames all of it. */
const frame = ([[w, s], [e, n]]: Region['bounds']) => ({
  type: 'MultiPoint' as const,
  coordinates: [[w, s], [e, s], [w, n], [e, n], [(w + e) / 2, s], [(w + e) / 2, n], [w, (s + n) / 2], [e, (s + n) / 2]],
});

/**
 * One region of the world map, drawn the same way (no map tiles — works offline): the
 * region's countries in its color, everything else soft gray, missionary photos as pins.
 */
const ContinentMap: React.FC<{ region: Region; missionaries: Missionary[]; onPinOpen?: (ids: string[]) => void }> = ({ region, missionaries, onPinOpen }) => {
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(boxRef);
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => { loadCountries().then(setCountries).catch(console.error); }, []);

  const projection = useMemo(() => {
    if (!w || !h) return null;
    const pad = Math.min(w, h) * 0.06;
    return geoMercator().fitExtent([[pad, pad], [w - pad, h - pad]], frame(region.bounds));
  }, [w, h, region]);

  const shapes = useMemo(() => {
    if (!projection || !countries) return null;
    const path = geoPath(projection);
    return {
      graticule: path(geoGraticule10()) ?? '',
      countries: countries.map((c, i) => ({ key: `${c.properties.name}-${i}`, mine: c.properties.region === region.id, d: path(c) ?? '' })),
    };
  }, [projection, countries, region]);

  const clusters = useMemo(
    () => (projection ? clusterMissionaries(missionaries, (p) => projection(p)) : []),
    [projection, missionaries],
  );
  const openCluster = openIdx !== null ? clusters[openIdx] ?? null : null;

  return (
    <Box ref={boxRef} onClick={() => { setOpenIdx(null); onPinOpen?.([]); }} sx={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 40%, #EFF8FF 0%, #BFDBFE 100%)',
      userSelect: 'none', WebkitTapHighlightColor: 'transparent',
    }}>
      {shapes && (
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden>
          <path d={shapes.graticule} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.8} />
          {shapes.countries.map((c) => (
            <path key={c.key} d={c.d} fill={c.mine ? region.color : '#E2E8F0'} fillOpacity={c.mine ? 0.72 : 0.9}
              stroke="#FFFFFF" strokeWidth={c.mine ? 0.9 : 0.6} />
          ))}
        </svg>
      )}
      {clusters.map((c, i) => {
        const isOpen = openIdx === i;
        return (
          <MissionaryPin key={`${c.x},${c.y}`} cluster={c} color={region.color} open={isOpen} size={58}
            onClick={(e) => {
              e.stopPropagation();
              if (c.people.length === 1 && isOpen) { navigate(`/misionero/${c.people[0].id}`); return; }
              setOpenIdx(isOpen ? null : i);
              onPinOpen?.(isOpen ? [] : c.people.map((m) => m.id));
            }} />
        );
      })}
      {openCluster && (
        <PinCard key={openIdx} cluster={openCluster} color={region.color} mapWidth={w} mapHeight={h}
          title={openCluster.people.length > 1 ? `${openCluster.people.length} misioneros aquí` : 'Conozca a'}
          onClose={() => { setOpenIdx(null); onPinOpen?.([]); }} />
      )}
    </Box>
  );
};

export default ContinentMap;
