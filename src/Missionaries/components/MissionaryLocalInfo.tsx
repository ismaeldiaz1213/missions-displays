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
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ color: '#1E3A8A', fontWeight: 800, fontSize: '1.15rem', mb: 1.25 }}>
        Hora y Clima Local
      </Typography>

      <Box sx={{
        bgcolor: '#fff', borderRadius: '16px', p: { xs: 2.5, sm: 3 },
        boxShadow: '0 4px 24px rgba(30,58,138,0.08)', border: '1px solid rgba(37,99,235,0.1)',
        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'stretch' }, gap: { xs: 2.5, sm: 0 },
      }}>

        {/* ── Time & date ──────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: { xs: '2.4rem', sm: '3rem' }, fontWeight: 800, color: '#1E3A8A', lineHeight: 1 }}>
            {localTime}
          </Typography>
          <Typography sx={{ color: '#4B5563', fontSize: { xs: '0.9rem', sm: '1rem' }, mt: 0.75 }}>
            {localDate}
          </Typography>
          {timeDiff && (
            <Chip label={timeDiff} size="small" sx={{
              mt: 1.25, alignSelf: 'flex-start',
              bgcolor: 'rgba(37,99,235,0.08)', color: '#1E3A8A',
              fontWeight: 600, fontSize: '0.78rem', border: '1px solid rgba(37,99,235,0.15)',
            }} />
          )}
        </Box>

        {/* ── Dividers ─────────────────────────────────────────────── */}
        <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', bgcolor: 'rgba(37,99,235,0.12)', mx: 3, flexShrink: 0 }} />
        <Box sx={{ display: { xs: 'block', sm: 'none' }, height: '1px', width: '100%', bgcolor: 'rgba(37,99,235,0.12)' }} />

        {/* ── Weather ──────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {weatherLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%', py: 1 }}>
              <CircularProgress size={22} sx={{ color: '#2563EB' }} />
              <Typography variant="caption" sx={{ color: '#9CA3AF', textAlign: 'center', lineHeight: 1.4 }}>
                Cargando datos<br />del clima...
              </Typography>
            </Box>
          ) : weather ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>

              {/* Big emoji */}
              <Typography sx={{ fontSize: '3.5rem', lineHeight: 1, flexShrink: 0 }}>
                {getWeather(weather.weatherCode).emoji}
              </Typography>

              {/* Temp + condition */}
              <Box sx={{ flexShrink: 0 }}>
                <Typography sx={{ fontSize: '1.9rem', fontWeight: 800, color: '#1E3A8A', lineHeight: 1 }}>
                  {toF(weather.temperatureC)}°F
                </Typography>
                <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem', mt: 0.25 }}>
                  {weather.temperatureC}°C
                </Typography>
                <Typography sx={{ color: '#4B5563', fontSize: '0.82rem', mt: 0.3 }}>
                  {getWeather(weather.weatherCode).label}
                </Typography>
              </Box>

              {/* Stats column */}
              <Box sx={{ ml: { xs: 0, sm: 'auto' }, display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-end' }}>
                <StatRow icon="💧" text={`${weather.precipitationProbability}% lluvia`} />
                <StatRow icon="💦" text={`${weather.humidity}% humedad`} />
                <StatRow icon="🌡️" text={`↑ ${toF(weather.dailyHighC)}° / ↓ ${toF(weather.dailyLowC)}°F`} />
              </Box>

            </Box>
          ) : null}
        </Box>

      </Box>
    </Box>
  );
};

export default MissionaryLocalInfo;
