import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Box, Typography, IconButton, CircularProgress, Divider,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { uploadData, remove } from 'aws-amplify/storage';
import type { Missionary, ContactInfo } from '../types';
import { formatBytes } from './StorageIndicator';

const FREE_TIER_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_PDF_BYTES = 100 * 1024 * 1024;

const CONTINENTS = [
  { value: 'north-america', label: 'Norte América' },
  { value: 'central-america', label: 'Centro América' },
  { value: 'south-america', label: 'Sur América' },
  { value: 'europe', label: 'Europa' },
  { value: 'africa', label: 'África' },
  { value: 'asia', label: 'Asia' },
  { value: 'oceania', label: 'Oceanía' },
];

const CONTACT_TYPES: ContactInfo['type'][] = ['email', 'phone', 'facebook', 'instagram', 'website'];

interface Props {
  open: boolean;
  missionary: Missionary | null;
  defaultContinent: string;
  storageUsedBytes: number;
  onSave: () => void;
  onClose: () => void;
  apiFetch: (path: string, method?: string, body?: unknown) => Promise<unknown>;
}

type FormData = Omit<Missionary, 'id' | 'media'> & { media: string[] };

const emptyForm = (continent: string): FormData => ({
  name: '',
  lastName: '',
  organization: '',
  continent,
  location: { city: '', country: '', latitude: 0, longitude: 0 },
  profileImage: '',
  description: '',
  prayerLetter: '',
  media: [],
  contactInfo: [],
  specialNotes: '',
  startDate: '',
  missionType: '',
});

const uploadFile = async (file: File, path: string): Promise<string> => {
  await uploadData({ path, data: file, options: { contentType: file.type } }).result;
  return path;
};

// Only attempt S3 deletion for paths that look like S3 storage keys (not local/http paths)
const isS3Key = (p?: string) => !!p && !p.startsWith('/') && !p.startsWith('http');

const MissionaryForm: React.FC<Props> = ({
  open, missionary, defaultContinent, storageUsedBytes, onSave, onClose, apiFetch,
}) => {
  const id = missionary?.id ?? crypto.randomUUID();
  const [form, setForm] = useState<FormData>(() =>
    missionary
      ? { ...missionary, media: missionary.media.map((m) => m.url) }
      : emptyForm(defaultContinent)
  );
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [prayerFile, setPrayerFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Track paths to delete from S3 on save
  const [profileToRemove, setProfileToRemove] = useState<string | null>(null);
  const [prayerToRemove, setPrayerToRemove] = useState<string | null>(null);
  const [mediaToRemove, setMediaToRemove] = useState<string[]>([]);

  const profileRef = useRef<HTMLInputElement>(null);
  const prayerRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setLocation = (field: keyof FormData['location'], value: string | number) =>
    setForm((f) => ({ ...f, location: { ...f.location, [field]: value } }));

  const addContact = () =>
    setForm((f) => ({ ...f, contactInfo: [...f.contactInfo, { type: 'email', value: '' }] }));

  const updateContact = (i: number, field: keyof ContactInfo, value: string) =>
    setForm((f) => {
      const updated = [...f.contactInfo];
      updated[i] = { ...updated[i], [field]: value } as ContactInfo;
      return { ...f, contactInfo: updated };
    });

  const removeContact = (i: number) =>
    setForm((f) => ({ ...f, contactInfo: f.contactInfo.filter((_, idx) => idx !== i) }));

  const removeCurrentProfileImage = () => {
    if (form.profileImage) setProfileToRemove(form.profileImage);
    set('profileImage', '');
    setProfileFile(null);
  };

  const removeCurrentPrayerLetter = () => {
    if (form.prayerLetter) setPrayerToRemove(form.prayerLetter);
    set('prayerLetter', '');
    setPrayerFile(null);
  };

  const removeMediaItem = (url: string) => {
    setMediaToRemove((prev) => [...prev, url]);
    setForm((f) => ({ ...f, media: f.media.filter((u) => u !== url) }));
  };

  const handleSave = async () => {
    if (!form.name || !form.lastName || !form.organization || !form.location.city) {
      setError('Nombre, apellido, organización y ciudad son obligatorios.');
      return;
    }

    const newFilesBytes = [profileFile, prayerFile, ...mediaFiles]
      .filter(Boolean)
      .reduce((acc, f) => acc + (f?.size ?? 0), 0);
    if (storageUsedBytes + newFilesBytes > FREE_TIER_BYTES) {
      setError(
        `Esta subida (${formatBytes(newFilesBytes)}) excedería el límite gratuito de 5 GB. ` +
        `Almacenamiento usado: ${formatBytes(storageUsedBytes)}.`
      );
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Delete removed files from S3 (silently ignore failures for non-S3 paths)
      if (profileToRemove && isS3Key(profileToRemove)) {
        try { await remove({ path: profileToRemove }); } catch (e) { console.warn('S3 delete skipped:', e); }
      }
      if (prayerToRemove && isS3Key(prayerToRemove)) {
        try { await remove({ path: prayerToRemove }); } catch (e) { console.warn('S3 delete skipped:', e); }
      }
      for (const path of mediaToRemove) {
        if (isS3Key(path)) {
          try { await remove({ path }); } catch (e) { console.warn('S3 delete skipped:', e); }
        }
      }

      let profileImage = form.profileImage;
      let prayerLetter = form.prayerLetter;
      let media = [...form.media];

      if (profileFile) {
        const ext = profileFile.name.split('.').pop();
        profileImage = await uploadFile(profileFile, `images/${id}-profile.${ext}`);
      }
      if (prayerFile) {
        prayerLetter = await uploadFile(prayerFile, `pdfs/${id}-prayer-letter.pdf`);
      }
      for (let i = 0; i < mediaFiles.length; i++) {
        const ext = mediaFiles[i].name.split('.').pop();
        const path = await uploadFile(mediaFiles[i], `images/${id}-media-${Date.now()}-${i}.${ext}`);
        media.push(path);
      }

      const payload: Missionary = {
        ...form,
        id,
        profileImage,
        prayerLetter,
        media: media.map((url) => ({ url })),
      };

      if (missionary) {
        await apiFetch(`missionaries/${id}`, 'PUT', payload);
      } else {
        await apiFetch('missionaries', 'POST', payload);
      }

      onSave();
    } catch (err) {
      setError(`Error al guardar: ${String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#555' } },
    '& .MuiInputLabel-root': { color: '#aaa' },
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#fff' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #333' }}>
        {missionary ? 'Editar Misionero' : 'Añadir Misionero'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>

          {/* Basic info */}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <TextField label="Nombre" value={form.name} onChange={(e) => set('name', e.target.value)} sx={inputSx} />
            <TextField label="Apellido" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} sx={inputSx} />
            <TextField label="Organización" value={form.organization} onChange={(e) => set('organization', e.target.value)} sx={inputSx} />
            <TextField label="Tipo de Misión" value={form.missionType} onChange={(e) => set('missionType', e.target.value)} sx={inputSx} />
            <TextField label="Fecha de Inicio" type="date" value={form.startDate ?? ''} onChange={(e) => set('startDate', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
            <FormControl sx={inputSx}>
              <InputLabel>Continente</InputLabel>
              <Select value={form.continent} label="Continente" onChange={(e) => set('continent', e.target.value)}
                sx={{ color: '#fff' }}>
                {CONTINENTS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* Location */}
          <Divider sx={{ borderColor: '#333' }}>
            <Typography variant="caption" color="#aaa">Ubicación</Typography>
          </Divider>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <TextField label="Ciudad" value={form.location.city} onChange={(e) => setLocation('city', e.target.value)} sx={inputSx} />
            <TextField label="País" value={form.location.country} onChange={(e) => setLocation('country', e.target.value)} sx={inputSx} />
            <TextField label="Estado / Provincia" value={form.location.state ?? ''} onChange={(e) => setLocation('state', e.target.value)} sx={inputSx} />
            <Box />
            <TextField label="Latitud" type="number" value={form.location.latitude} onChange={(e) => setLocation('latitude', parseFloat(e.target.value) || 0)} sx={inputSx}
              helperText="Búscalo en Google Maps: clic derecho → ¿Qué hay aquí?" FormHelperTextProps={{ sx: { color: '#666' } }} />
            <TextField label="Longitud" type="number" value={form.location.longitude} onChange={(e) => setLocation('longitude', parseFloat(e.target.value) || 0)} sx={inputSx} />
          </Box>

          {/* Description */}
          <TextField label="Descripción" value={form.description} onChange={(e) => set('description', e.target.value)}
            multiline rows={3} sx={inputSx} />
          <TextField label="Notas especiales" value={form.specialNotes ?? ''} onChange={(e) => set('specialNotes', e.target.value)}
            multiline rows={2} sx={inputSx} />

          {/* File uploads */}
          <Divider sx={{ borderColor: '#333' }}>
            <Typography variant="caption" color="#aaa">Archivos</Typography>
          </Divider>

          <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2}>

            {/* Profile image */}
            <Box>
              <Typography variant="caption" color="#aaa" display="block" mb={1}>Foto de perfil</Typography>
              <input ref={profileRef} type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > MAX_IMAGE_BYTES) { setError(`Imagen demasiado grande (${formatBytes(f.size)}). Máximo 50 MB.`); return; }
                setProfileFile(f);
              }} />
              <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                onClick={() => profileRef.current?.click()} sx={{ borderColor: '#555', color: '#ccc' }}>
                {form.profileImage ? 'Reemplazar' : 'Seleccionar imagen'}
              </Button>
              {profileFile && (
                <Typography variant="caption" color="#90caf9" display="block" mt={0.5}>{profileFile.name}</Typography>
              )}
              {!profileFile && form.profileImage && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                  <Typography variant="caption" color="#666" sx={{ flex: 1 }}>Foto actual guardada</Typography>
                  <IconButton size="small" onClick={removeCurrentProfileImage}
                    sx={{ color: '#ef5350', p: 0.25 }} title="Quitar foto de perfil">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Prayer letter PDF */}
            <Box>
              <Typography variant="caption" color="#aaa" display="block" mb={1}>Carta de oración (PDF)</Typography>
              <input ref={prayerRef} type="file" accept="application/pdf" hidden onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > MAX_PDF_BYTES) { setError(`PDF demasiado grande (${formatBytes(f.size)}). Máximo 100 MB.`); return; }
                setPrayerFile(f);
              }} />
              <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                onClick={() => prayerRef.current?.click()} sx={{ borderColor: '#555', color: '#ccc' }}>
                {form.prayerLetter ? 'Reemplazar' : 'Seleccionar PDF'}
              </Button>
              {prayerFile && (
                <Typography variant="caption" color="#90caf9" display="block" mt={0.5}>{prayerFile.name}</Typography>
              )}
              {!prayerFile && form.prayerLetter && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                  <Typography variant="caption" color="#666" sx={{ flex: 1 }}>PDF actual guardado</Typography>
                  <IconButton size="small" onClick={removeCurrentPrayerLetter}
                    sx={{ color: '#ef5350', p: 0.25 }} title="Quitar PDF">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Media photos */}
            <Box>
              <Typography variant="caption" color="#aaa" display="block" mb={1}>Álbum de fotos</Typography>
              <input ref={mediaRef} type="file" accept="image/*" multiple hidden onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const oversized = files.find(f => f.size > MAX_IMAGE_BYTES);
                if (oversized) { setError(`"${oversized.name}" es demasiado grande (${formatBytes(oversized.size)}). Máximo 50 MB por imagen.`); return; }
                setMediaFiles(files);
              }} />
              <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                onClick={() => mediaRef.current?.click()} sx={{ borderColor: '#555', color: '#ccc' }}>
                Añadir fotos
              </Button>
              {mediaFiles.length > 0 && (
                <Typography variant="caption" color="#90caf9" display="block" mt={0.5}>
                  {mediaFiles.length} foto(s) nueva(s)
                </Typography>
              )}
              {form.media.length > 0 && (
                <Box sx={{ mt: 0.75 }}>
                  {form.media.map((url, i) => (
                    <Box key={url} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                      <Typography variant="caption" color="#666" sx={{
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        Foto {i + 1}
                      </Typography>
                      <IconButton size="small" onClick={() => removeMediaItem(url)}
                        sx={{ color: '#ef5350', p: 0.25 }} title="Quitar foto">
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Contact info */}
          <Divider sx={{ borderColor: '#333' }}>
            <Typography variant="caption" color="#aaa">Información de Contacto</Typography>
          </Divider>

          {form.contactInfo.map((c, i) => (
            <Box key={i} display="flex" gap={1} alignItems="center">
              <FormControl sx={{ minWidth: 130, ...inputSx }}>
                <InputLabel>Tipo</InputLabel>
                <Select value={c.type} label="Tipo" onChange={(e) => updateContact(i, 'type', e.target.value)}
                  sx={{ color: '#fff' }}>
                  {CONTACT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Valor" value={c.value} onChange={(e) => updateContact(i, 'value', e.target.value)}
                fullWidth sx={inputSx} />
              <IconButton onClick={() => removeContact(i)} sx={{ color: '#ef5350' }}>
                <RemoveCircleOutlineIcon />
              </IconButton>
            </Box>
          ))}

          <Button startIcon={<AddIcon />} onClick={addContact} sx={{ color: '#90caf9', alignSelf: 'flex-start' }}>
            Añadir contacto
          </Button>

          {error && <Typography color="error.main" variant="body2">{error}</Typography>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #333' }}>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : null}>
          {uploading ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MissionaryForm;
