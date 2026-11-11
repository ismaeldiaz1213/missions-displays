// Admin dialogs for the conference itself: its dates and deadline, archiving it to start the
// next one, and permanently deleting an old archive.
import React, { useMemo, useState } from 'react';
import { currentUserEmail } from '../../data/currentUser';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, LinearProgress, Switch, TextField, Typography,
} from '@mui/material';
import {
  centralToIso, dayRange, formatConferenceDay, isoToCentral, suggestNextConference, type ConferenceConfig,
} from '../../Registration/conference';
import { saveConference } from '../../data/conference';
import {
  archiveConference, archiveIdFor, deleteArchivedConference, type ArchiveStep, type ArchivedConference,
} from '../../data/conferenceArchive';

/** firestore.rules allow up to this many conference days. */
const MAX_DAYS = 10;

const sectionTitleSx = { color: 'var(--ibl-primary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', mt: 2.5, mb: 1 } as const;
const date = { type: 'date', size: 'small' as const, slotProps: { inputLabel: { shrink: true } } };
const time = { type: 'time', size: 'small' as const, slotProps: { inputLabel: { shrink: true } } };

const validateConference = (c: ConferenceConfig) => {
  if (!c.name.trim()) return 'Escriba el nombre de la conferencia.';
  if (!c.days.length) return 'Elija el primer y el último día.';
  if (c.days.length > MAX_DAYS) return `La conferencia puede durar hasta ${MAX_DAYS} días.`;
  if (Number.isNaN(Date.parse(c.registrationClosesAt))) return 'Elija la fecha límite del registro.';
  if (Number.isNaN(Date.parse(c.mediaUploadsCloseAt))) return 'Elija hasta cuándo pueden subir videos.';
  return '';
};

/** The editable fields of a conference. Dates and times are in Houston (Central) time. */
const ConferenceFields: React.FC<{ value: ConferenceConfig; onChange: (c: ConferenceConfig) => void; hideOpenSwitch?: boolean }> =
  ({ value: c, onChange, hideOpenSwitch }) => {
    // Keep the raw first/last day while typing; days is only rebuilt when both are valid.
    const [first, setFirst] = useState(c.days[0] ?? '');
    const [last, setLast] = useState(c.days[c.days.length - 1] ?? '');
    const close = isoToCentral(c.registrationClosesAt);
    const media = isoToCentral(c.mediaUploadsCloseAt);
    const set = (patch: Partial<ConferenceConfig>) => onChange({ ...c, ...patch });
    const setRange = (f: string, l: string) => {
      setFirst(f); setLast(l);
      set({ days: f && l && l >= f ? dayRange(f, l) : [] });
    };
    const setClose = (d: string, t: string) => d && set({ registrationClosesAt: centralToIso(d, t) });
    const setMedia = (d: string, t: string) => d && set({ mediaUploadsCloseAt: centralToIso(d, t) });

    return (
      <Box>
        <Typography sx={{ ...sectionTitleSx, mt: 0 }}>Nombre</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField label="Español" size="small" value={c.name} onChange={(e) => set({ name: e.target.value })} required />
          <TextField label="Inglés" size="small" value={c.nameEn} onChange={(e) => set({ nameEn: e.target.value })} />
        </Box>

        <Typography sx={sectionTitleSx}>Días de la conferencia</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField label="Primer día" {...date} value={first} onChange={(e) => setRange(e.target.value, last < e.target.value ? e.target.value : last)} />
          <TextField label="Último día" {...date} value={last} onChange={(e) => setRange(first, e.target.value)}
            error={!!first && !!last && last < first} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
          {c.days.map((d) => (
            <Chip key={d} size="small" label={formatConferenceDay(d, { weekday: 'long', day: 'numeric', month: 'short' })} />
          ))}
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.75 }}>
          El costo del hotel se calcula por cada día que elijan.
        </Typography>

        <Typography sx={sectionTitleSx}>Registro en línea</Typography>
        {!hideOpenSwitch && (
          <FormControlLabel sx={{ mb: 1 }}
            control={<Switch checked={c.registrationOpen} onChange={(e) => set({ registrationOpen: e.target.checked })} />}
            label={c.registrationOpen ? 'Abierto al público' : 'Cerrado: la página dice que pronto anunciaremos las fechas'} />
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField label="Cierra el día" {...date} value={close.date} onChange={(e) => setClose(e.target.value, close.time)} />
          <TextField label="A la hora (Houston)" {...time} value={close.time} onChange={(e) => setClose(close.date, e.target.value)} />
        </Box>

        <Typography sx={sectionTitleSx}>Videos de misioneros y evangelistas</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField label="Pueden subir hasta el día" {...date} value={media.date} onChange={(e) => setMedia(e.target.value, media.time)} />
          <TextField label="A la hora (Houston)" {...time} value={media.time} onChange={(e) => setMedia(media.date, e.target.value)} />
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.75 }}>
          Normalmente a las 12:00 a. m. del primer día de la conferencia.
        </Typography>
      </Box>
    );
  };

// ── Configure the current conference ─────────────────────────────────────────

export const ConferenceSettingsDialog: React.FC<{
  conference: ConferenceConfig; registrationCount: number; fullScreen: boolean;
  onClose: () => void; onSaved: () => void;
}> = ({ conference, registrationCount, fullScreen, onClose, onSaved }) => {
  const [value, setValue] = useState(conference);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const removedDays = conference.days.filter((d) => !value.days.includes(d));

  const save = async () => {
    const problem = validateConference(value);
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    try {
      await saveConference(value);
      onSaved();
    } catch (err) {
      console.error(err);
      setError(`No se pudo guardar: ${String(err)}`);
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Configurar la conferencia</DialogTitle>
      <DialogContent dividers>
        <ConferenceFields value={value} onChange={setValue} />
        {registrationCount > 0 && removedDays.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Ya hay {registrationCount} registros. Quien eligió {removedDays.map((d) => formatConferenceDay(d)).join(', ')} seguirá
            apareciendo con ese día; corrija esos registros con "Editar".
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Archive this conference and start the next one ───────────────────────────

const STEP_LABEL: Record<ArchiveStep, string> = {
  copying: 'Copiando registros al archivo…',
  checking: 'Verificando la copia…',
  clearing: 'Vaciando la pestaña para la próxima conferencia…',
  next: 'Guardando la próxima conferencia…',
  done: 'Listo',
};

export const ArchiveConferenceDialog: React.FC<{
  conference: ConferenceConfig; archives: ArchivedConference[]; registrationCount: number; fullScreen: boolean;
  onClose: () => void; onArchived: (archiveId: string) => void;
}> = ({ conference, archives, registrationCount, fullScreen, onClose, onArchived }) => {
  const id = useMemo(() => archiveIdFor(conference, archives.map((a) => a.id)), [conference, archives]);
  const [next, setNext] = useState(() => suggestNextConference(conference));
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState<ArchiveStep | null>(null);
  const [error, setError] = useState('');
  const running = step !== null && step !== 'done';
  const today = new Date().toISOString().slice(0, 10);
  const notOverYet = conference.days.length > 0 && conference.days[conference.days.length - 1] >= today;

  const run = async () => {
    const problem = validateConference(next);
    if (problem) { setError(`Próxima conferencia: ${problem}`); return; }
    setError('');
    try {
      const email = currentUserEmail();
      await archiveConference(id, conference, next, email, setStep);
      onArchived(id);
    } catch (err) {
      console.error(err);
      setStep(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open onClose={running ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Archivar {conference.name}</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ lineHeight: 1.6 }}>
          Los <strong>{registrationCount} registros</strong>, las asignaciones de hotel y las recogidas pasan a un archivo
          llamado <strong>{id}</strong>. Podrá verlos y exportarlos cuando quiera eligiendo esa conferencia arriba de la tabla.
          Las pestañas Registros y Recogidas quedarán vacías para la próxima conferencia.
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem', mt: 1 }}>
          Nada se borra: primero se copia y se verifica cada registro. Los videos que subieron se quedan donde están.
        </Typography>
        {notOverYet && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            La conferencia todavía no ha terminado (último día: {formatConferenceDay(conference.days[conference.days.length - 1])}).
          </Alert>
        )}

        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 3, mb: 1.5 }}>Próxima conferencia</Typography>
        <ConferenceFields value={next} onChange={setNext} hideOpenSwitch />
        <Alert severity="info" sx={{ mt: 2 }}>
          El registro quedará <strong>cerrado</strong> hasta que confirme las fechas y lo abra en "Configurar". Puede cambiar
          todo esto después.
        </Alert>

        <FormControlLabel sx={{ mt: 2 }} disabled={running}
          control={<Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />}
          label={`Sí, archivar ${conference.name} y empezar ${next.name || 'la próxima conferencia'}`} />

        {step && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 1 }}>{STEP_LABEL[step]}</Typography>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={running} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" color="warning" onClick={run} disabled={!confirmed || running}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {running ? <CircularProgress size={18} color="inherit" /> : 'Archivar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Permanently delete an archive ────────────────────────────────────────────

export const DeleteArchiveDialog: React.FC<{
  archive: ArchivedConference; registrationCount: number; videoCount: number; fullScreen: boolean;
  onClose: () => void; onDeleted: () => void;
}> = ({ archive, registrationCount, videoCount, fullScreen, onClose, onDeleted }) => {
  const [typed, setTyped] = useState('');
  const [withVideos, setWithVideos] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteArchivedConference(archive.id, withVideos);
      onDeleted();
    } catch (err) {
      console.error(err);
      setError(`No se pudo eliminar todo: ${String(err)}. Lo que quedó sigue en el archivo; intente de nuevo.`);
      setDeleting(false);
    }
  };

  return (
    <Dialog open onClose={deleting ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Eliminar el archivo {archive.id}</DialogTitle>
      <DialogContent dividers>
        <Alert severity="error" sx={{ mb: 2 }}>
          Esto borra para siempre los <strong>{registrationCount} registros</strong> de {archive.name}, junto con sus hoteles
          y recogidas. <strong>No se puede deshacer.</strong>
        </Alert>
        <Typography sx={{ lineHeight: 1.6 }}>
          Guardar el archivo cuesta casi nada (unos pocos kilobytes). Si solo quiere una copia fuera del sistema, descargue
          el Excel o el PDF y no lo elimine.
        </Typography>
        {videoCount > 0 && (
          <FormControlLabel sx={{ mt: 2, alignItems: 'flex-start' }}
            control={<Checkbox checked={withVideos} onChange={(e) => setWithVideos(e.target.checked)} sx={{ mt: -0.5 }} />}
            label={(
              <Box>
                <Typography>También borrar los videos que subieron ({videoCount} {videoCount === 1 ? 'registro' : 'registros'} con videos)</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                  Los videos son lo que ocupa espacio. Descárguelos primero con "Videos (ZIP)" si los quiere conservar.
                </Typography>
              </Box>
            )} />
        )}
        <TextField sx={{ mt: 2.5 }} fullWidth size="small" disabled={deleting}
          label={`Escriba ${archive.id} para confirmar`} value={typed} onChange={(e) => setTyped(e.target.value)} />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={run} disabled={typed.trim() !== archive.id || deleting}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {deleting ? <CircularProgress size={18} color="inherit" /> : 'Eliminar para siempre'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
