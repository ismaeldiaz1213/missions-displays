import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Divider, IconButton, MenuItem,
  Paper, Select, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tooltip, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MapIcon from '@mui/icons-material/Map';
import PhoneIcon from '@mui/icons-material/Phone';
import { listRegistrations } from '../../data/registrations';
import { formatConferenceDay, type Registration } from '../../Registration/conference';
import PickupMap, { type MapStop } from './PickupMap';
import { exportPickupSheet } from './pickupSheet';
import {
  BUFFER_MINUTES, CHURCH, DEFAULT_WINDOW_MINUTES, buildTrips, directionsUrl, estimateDriveMinutes,
  fromMinutes, geocodePlace, needsPickup, riderLine, tripTimes, type Trip,
} from './pickupData';

const WINDOW_OPTIONS = [60, 90, 120, 180];

const cardSx = {
  p: 2.5, bgcolor: '#151515', border: '1px solid #2a2a2a', borderRadius: '14px',
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Paper sx={{ ...cardSx, p: 2, minWidth: 120, flex: '1 1 120px' }}>
    <Typography sx={{ color: '#888', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
    <Typography sx={{ fontWeight: 800, fontSize: '1.4rem' }}>{value}</Typography>
  </Paper>
);

/** One numbered instruction inside a trip card. */
const Step: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}>
    <Box sx={{
      flex: '0 0 auto', width: 20, height: 20, borderRadius: '50%', bgcolor: '#2563EB', color: '#fff',
      fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{n}</Box>
    <Typography sx={{ color: '#ddd', fontSize: '0.88rem', lineHeight: 1.5 }}>{children}</Typography>
  </Box>
);

const TripCard: React.FC<{ trip: Trip; index: number; driveMinutes: number; estimated: boolean; coords: { lat: number; lng: number } | null }> =
  ({ trip, index, driveMinutes, estimated, coords }) => {
    const { pickupAt, leaveAt, backAt } = tripTimes(trip, driveMinutes);
    return (
      <Paper sx={{ ...cardSx, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Chip label={`Viaje ${index + 1}`} size="small" sx={{ bgcolor: '#2563EB', color: '#fff', fontWeight: 700 }} />
          <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{trip.place.label}</Typography>
          <Chip label={`${trip.seats} persona${trip.seats === 1 ? '' : 's'}`} size="small" variant="outlined" sx={{ borderColor: '#444', color: '#bbb' }} />
          <Button size="small" startIcon={<MapIcon />} href={directionsUrl(coords, trip.place.label)} target="_blank" rel="noopener"
            sx={{ textTransform: 'none' }}>
            Cómo llegar
          </Button>
        </Box>

        {leaveAt === null ? (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            Esta persona no puso hora de llegada. Llámela para confirmar antes de planear el viaje.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
            <Step n={1}>
              Salga de la iglesia a las <strong>{fromMinutes(leaveAt)}</strong> ({driveMinutes} min de camino{estimated ? ', estimado' : ''}).
            </Step>
            <Step n={2}>
              Recoja a las <strong>{fromMinutes(pickupAt as number)}</strong>, es decir {BUFFER_MINUTES} minutos después de la última llegada
              ({fromMinutes(trip.lastArrival as number)}), para dar tiempo de equipaje.
            </Step>
            <Step n={3}>Llame o escriba a cada persona cuando esté en camino; los teléfonos están abajo.</Step>
            <Step n={4}>De regreso en la iglesia alrededor de las <strong>{fromMinutes(backAt as number)}</strong>.</Step>
          </Box>
        )}

        {!trip.place.known && !coords && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            No pudimos ubicar este lugar en el mapa, así que el tiempo de viaje es solo aproximado. Confirme la dirección con la persona.
          </Alert>
        )}

        {/* Scrolls sideways on a phone instead of stretching the card */}
        <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 520, '& td, & th': { borderColor: '#2a2a2a' } }}>
          <TableHead>
            <TableRow>
              {['Nombre', 'Llegada', 'Detalle', 'Pers.', 'Teléfono'].map((h) => (
                <TableCell key={h} sx={{ color: '#888', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {trip.riders.map((r) => {
              const l = riderLine(r);
              return (
                <TableRow key={r.id}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {l.name}
                    {l.notes && <Typography sx={{ color: '#888', fontSize: '0.75rem' }}>{l.notes}</Typography>}
                  </TableCell>
                  <TableCell>{l.time || '—'}</TableCell>
                  <TableCell sx={{ color: '#bbb' }}>{l.detail}</TableCell>
                  <TableCell align="center">{l.seats}</TableCell>
                  <TableCell>
                    {l.phone && (
                      <Button size="small" startIcon={<PhoneIcon />} href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} sx={{ textTransform: 'none' }}>
                        {l.phone}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </TableContainer>
      </Paper>
    );
  };

const PickupBoard: React.FC = () => {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [windowMinutes, setWindowMinutes] = useState(DEFAULT_WINDOW_MINUTES);
  const [day, setDay] = useState('');
  // Coordinates for pickup places that aren't in KNOWN_PLACES, looked up once via OpenStreetMap.
  const [geo, setGeo] = useState<Record<string, { lat: number; lng: number } | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRegs(await listRegistrations());
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const trips = useMemo(() => buildTrips(regs, windowMinutes), [regs, windowMinutes]);
  const days = useMemo(() => [...new Set(trips.map((t) => t.date))].sort(), [trips]);
  const activeDay = days.includes(day) ? day : days[0] ?? '';
  const dayTrips = useMemo(() => trips.filter((t) => t.date === activeDay), [trips, activeDay]);

  // Look up unknown places one at a time (Nominatim asks for ≤1 request/second).
  useEffect(() => {
    const pending = trips.filter((t) => !t.place.known && !(t.place.key in geo)).map((t) => t.place);
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      for (const place of pending) {
        const coords = await geocodePlace(place.label);
        if (cancelled) return;
        setGeo((g) => ({ ...g, [place.key]: coords }));
        await new Promise((r) => setTimeout(r, 1100));
      }
    })();
    return () => { cancelled = true; };
  }, [trips, geo]);

  const coordsOf = useCallback((trip: Trip) => trip.place.known ?? geo[trip.place.key] ?? null, [geo]);
  const driveOf = useCallback((trip: Trip) => {
    if (trip.place.known) return { minutes: trip.place.known.driveMinutes, estimated: false };
    const c = geo[trip.place.key];
    return c ? { minutes: estimateDriveMinutes(c), estimated: true } : { minutes: 30, estimated: true };
  }, [geo]);

  const stops: MapStop[] = useMemo(() => {
    const seen = new Map<string, MapStop>();
    dayTrips.forEach((t) => {
      const c = coordsOf(t);
      if (!c || seen.has(t.place.key)) return;
      const tripsHere = dayTrips.filter((x) => x.place.key === t.place.key);
      seen.set(t.place.key, {
        key: t.place.key, label: t.place.label, lat: c.lat, lng: c.lng,
        detail: `${tripsHere.length} viaje(s) · ${tripsHere.reduce((n, x) => n + x.seats, 0)} persona(s)`,
      });
    });
    return [...seen.values()];
  }, [dayTrips, coordsOf]);

  const totals = useMemo(() => ({
    people: trips.reduce((n, t) => n + t.seats, 0),
    pickups: regs.filter(needsPickup).length,
    rvs: regs.filter((r) => r.travel.arrivingByRV).length,
  }), [trips, regs]);

  if (loading && !regs.length) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>Recogidas</Typography>
        <Tooltip title="Arribos dentro de esta ventana se juntan en un solo viaje">
          <Select size="small" value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))}
            sx={{ minWidth: 150, bgcolor: '#151515' }}>
            {WINDOW_OPTIONS.map((m) => <MenuItem key={m} value={m}>Ventana de {m} min</MenuItem>)}
          </Select>
        </Tooltip>
        <Tooltip title="Actualizar"><span><IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton></span></Tooltip>
        {activeDay && (
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} sx={{ textTransform: 'none' }}
            onClick={() => exportPickupSheet(activeDay, dayTrips.map((t) => ({ trip: t, driveMinutes: driveOf(t).minutes })))}>
            Hoja del chofer
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <Stat label="Viajes" value={trips.length} />
        <Stat label="Personas a recoger" value={totals.people} />
        <Stat label="Registros con recogida" value={totals.pickups} />
        <Stat label="Llegan en RV" value={totals.rvs} />
      </Box>

      {!trips.length ? (
        <Paper sx={{ ...cardSx, textAlign: 'center', py: 6 }}>
          <DirectionsCarIcon sx={{ fontSize: 48, color: '#444', mb: 1 }} />
          <Typography sx={{ color: '#888' }}>Todavía nadie ha pedido transporte.</Typography>
        </Paper>
      ) : (
        <>
          <Tabs value={activeDay} onChange={(_, v) => setDay(v)} variant="scrollable" allowScrollButtonsMobile
            sx={{ mb: 2, borderBottom: '1px solid #2a2a2a' }}>
            {days.map((d) => (
              <Tab key={d} value={d} sx={{ textTransform: 'none', fontWeight: 600 }}
                label={d === 'sin-fecha' ? 'Sin fecha' : formatConferenceDay(d, { weekday: 'long', day: 'numeric', month: 'long' })} />
            ))}
          </Tabs>

          {stops.length > 0 && (
            <Card sx={{ ...cardSx, p: 1.5, mb: 2 }}>
              <PickupMap stops={stops} />
              <Typography sx={{ color: '#888', fontSize: '0.78rem', mt: 1 }}>
                ⛪ {CHURCH.label} ({CHURCH.address}). Los números marcan cada lugar de recogida de este día.
              </Typography>
            </Card>
          )}

          {dayTrips.map((trip, i) => {
            const drive = driveOf(trip);
            return (
              <TripCard key={trip.id} trip={trip} index={i} driveMinutes={drive.minutes}
                estimated={drive.estimated} coords={coordsOf(trip)} />
            );
          })}

          <Divider sx={{ my: 2, borderColor: '#2a2a2a' }} />
          <Typography sx={{ color: '#777', fontSize: '0.8rem' }}>
            Los tiempos de viaje a los aeropuertos están guardados en <code>pickupData.ts</code>; los demás lugares se estiman por distancia
            en línea recta. Ajuste la ventana si prefiere más viajes cortos o menos viajes largos.
          </Typography>
        </>
      )}
    </Box>
  );
};

export default PickupBoard;
