import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';

interface WeatherData {
  timezone: string;
  utcOffsetSeconds: number;
  temperatureC: number;
  weatherCode: number;
  humidity: number;
  precipitationProbability: number;
  dailyHighC: number;
  dailyLowC: number;
}

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Cielo despejado',            emoji: '☀️' },
  1:  { label: 'Mayormente despejado',        emoji: '🌤️' },
  2:  { label: 'Parcialmente nublado',        emoji: '⛅' },
  3:  { label: 'Nublado',                     emoji: '☁️' },
  45: { label: 'Neblina',                     emoji: '🌫️' },
  48: { label: 'Neblina con escarcha',        emoji: '🌫️' },
  51: { label: 'Llovizna ligera',             emoji: '🌦️' },
  53: { label: 'Llovizna moderada',           emoji: '🌦️' },
  55: { label: 'Llovizna intensa',            emoji: '🌧️' },
  61: { label: 'Lluvia ligera',               emoji: '🌧️' },
  63: { label: 'Lluvia moderada',             emoji: '🌧️' },
  65: { label: 'Lluvia intensa',              emoji: '🌧️' },
  71: { label: 'Nieve ligera',                emoji: '🌨️' },
  73: { label: 'Nieve moderada',              emoji: '❄️' },
  75: { label: 'Nieve intensa',               emoji: '❄️' },
  77: { label: 'Granizo',                     emoji: '🌨️' },
  80: { label: 'Chubascos ligeros',           emoji: '🌦️' },
  81: { label: 'Chubascos moderados',         emoji: '🌧️' },
  82: { label: 'Chubascos intensos',          emoji: '⛈️' },
  85: { label: 'Nevadas ligeras',             emoji: '🌨️' },
  86: { label: 'Nevadas intensas',            emoji: '❄️' },
  95: { label: 'Tormenta eléctrica',          emoji: '⛈️' },
  96: { label: 'Tormenta con granizo',        emoji: '⛈️' },
  99: { label: 'Tormenta con granizo fuerte', emoji: '⛈️' },
};

const getWeather = (code: number) => WMO[code] ?? { label: 'Condición desconocida', emoji: '🌡️' };
const toF = (c: number) => Math.round(c * 9 / 5 + 32);
const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatTimeDiff = (missionaryOffsetSec: number): string => {
  const localOffsetSec = -new Date().getTimezoneOffset() * 60;
  const diffSec = missionaryOffsetSec - localOffsetSec;
  if (diffSec === 0) return 'misma zona horaria que tú';
  const totalMinutes = Math.round(diffSec / 60);
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return totalMinutes > 0 ? `${parts.join(' ')} adelante de ti` : `${parts.join(' ')} atrás de ti`;
};

const StatRow: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
    <Typography sx={{ fontSize: '0.88rem', lineHeight: 1 }}>{icon}</Typography>
    <Typography sx={{ fontSize: '0.82rem', color: '#4B5563' }}>{text}</Typography>
  </Box>
);

interface Props { latitude: number; longitude: number }

const MissionaryLocalInfo: React.FC<Props> = ({ latitude, longitude }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,weather_code,relative_humidity_2m,precipitation_probability` +
          `&daily=temperature_2m_max,temperature_2m_min` +
          `&timezone=auto&forecast_days=1`
        );
        const json = await res.json();
        setWeather({
          timezone: json.timezone,
          utcOffsetSeconds: json.utc_offset_seconds,
          temperatureC: Math.round(json.current.temperature_2m),
          weatherCode: json.current.weather_code,
          humidity: json.current.relative_humidity_2m ?? 0,
          precipitationProbability: json.current.precipitation_probability ?? 0,
          dailyHighC: Math.round(json.daily.temperature_2m_max[0]),
          dailyLowC: Math.round(json.daily.temperature_2m_min[0]),
        });
      } catch {
        // silently skip
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchData();
  }, [latitude, longitude]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const timezone = weather?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const localTime = now.toLocaleTimeString('es-ES', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const localDate = capitalizeFirst(now.toLocaleDateString('es-ES', {
    timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }));
  const timeDiff = weather ? formatTimeDiff(weather.utcOffsetSeconds) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Time & date ──────────────────────────────────────────── */}
      <Box>
        <Typography sx={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.5 }}>
          Hora local
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '2.1rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
            {localTime}
          </Typography>
          {timeDiff && (
            <Chip label={timeDiff} size="small" sx={{
              bgcolor: 'rgba(37,99,235,0.08)', color: '#1E3A8A', fontWeight: 600, fontSize: '0.75rem',
            }} />
          )}
        </Box>
        <Typography sx={{ color: '#64748B', fontSize: '0.88rem', mt: 0.5 }}>{localDate}</Typography>
      </Box>

      {/* ── Weather ──────────────────────────────────────────────── */}
      {weatherLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#94A3B8' }}>
          <CircularProgress size={18} sx={{ color: '#2563EB' }} />
          <Typography variant="caption">Cargando el clima…</Typography>
        </Box>
      ) : weather ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: 1.75, borderRadius: '14px', bgcolor: '#F1F5F9' }}>
          <Typography sx={{ fontSize: '2.6rem', lineHeight: 1, flexShrink: 0 }}>
            {getWeather(weather.weatherCode).emoji}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {toF(weather.temperatureC)}°F <Box component="span" sx={{ color: '#94A3B8', fontSize: '0.95rem', fontWeight: 600 }}>{weather.temperatureC}°C</Box>
            </Typography>
            <Typography sx={{ color: '#475569', fontSize: '0.85rem' }}>{getWeather(weather.weatherCode).label}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end', flexShrink: 0 }}>
            <StatRow icon="💧" text={`${weather.precipitationProbability}% lluvia`} />
            <StatRow icon="💦" text={`${weather.humidity}% humedad`} />
            <StatRow icon="🌡️" text={`${toF(weather.dailyHighC)}° / ${toF(weather.dailyLowC)}°F`} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default MissionaryLocalInfo;
