import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getKioskSettings, saveKioskSettings, type ConferencePhaseSetting } from '../../data/settings';
import { conferencePhase } from '../../RegionSelection/kioskContent';

const OPTIONS: { value: ConferencePhaseSetting; label: string; help: string; preview?: string }[] = [
  { value: 'auto', label: 'Automático', help: 'Cambia solo según las fechas de la conferencia.' },
  { value: 'upcoming', label: 'Antes', help: 'Tarjeta con la cuenta regresiva, el tema, el horario y cómo ayudar.', preview: 'antes' },
  { value: 'live', label: 'Durante', help: '"¡Es esta semana!" con el código QR para que los misioneros envíen su información.', preview: 'en-vivo' },
  { value: 'over', label: 'Después', help: '"¿Cómo nos fue?" con fotos y videos de la conferencia.', preview: 'despues' },
];

const LABEL: Record<string, string> = { upcoming: 'Antes', live: 'Durante', over: 'Después' };

/** Admin control for what the hallway screens show about the conference. */
const KioskSettingsPanel: React.FC = () => {
  const [value, setValue] = useState<ConferencePhaseSetting | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getKioskSettings().then((s) => setValue(s.conferencePhase)).catch(() => setValue('auto'));
  }, []);

  const change = async (next: ConferencePhaseSetting | null) => {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);
    setSaving(true);
    setMessage(null);
    try {
      await saveKioskSettings({ conferencePhase: next });
      setMessage({ ok: true, text: 'Guardado. Las pantallas lo mostrarán la próxima vez que abran el mapa.' });
    } catch (err) {
      console.error(err);
      setValue(previous);
      setMessage({ ok: false, text: 'No se pudo guardar. Revise la conexión e inténtelo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  if (value === null) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const selected = OPTIONS.find((o) => o.value === value)!;

  return (
    <Paper sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 820, border: '1px solid #2a2a2a' }}>
      <Typography variant="h6" fontWeight={700}>Conferencia en las pantallas</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Elija qué muestra la tarjeta de la conferencia en el mapa de los pasillos y en el sitio.
      </Typography>

      <ToggleButtonGroup exclusive value={value} onChange={(_, v) => change(v)} disabled={saving} fullWidth
        sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, py: 1.5, flex: { xs: '1 1 45%', sm: 1 } } }}>
        {OPTIONS.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
      </ToggleButtonGroup>

      <Box sx={{ mt: 2.5, p: 2, borderRadius: 1, bgcolor: '#111', border: '1px solid #2a2a2a' }}>
        <Typography variant="body2">{selected.help}</Typography>
        {value === 'auto' && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Hoy se está mostrando: <b>{LABEL[conferencePhase('auto')]}</b>
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>Vista previa (no cambia las pantallas):</Typography>
        {OPTIONS.filter((o) => o.preview).map((o) => (
          <Button key={o.value} size="small" variant="outlined" endIcon={<OpenInNewIcon />} href={`/region-selection?conferencia=${o.preview}`}
            target="_blank" rel="noopener" sx={{ textTransform: 'none' }}>
            {o.label}
          </Button>
        ))}
      </Box>

      {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mt: 2.5 }}>{message.text}</Alert>}
    </Paper>
  );
};

export default KioskSettingsPanel;
