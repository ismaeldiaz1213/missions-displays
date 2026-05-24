import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Box, Typography, IconButton, CircularProgress, Divider,
  Stack, useTheme, useMediaQuery, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import { uploadData, remove } from 'aws-amplify/storage';
import type { Missionary, ContactInfo } from '../types';
import { formatBytes } from './formatBytes';
import { resolveUrl } from '../storageUrl';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStep, setSaveStep] = useState('');
  const [savedOk, setSavedOk] = useState(false);
  const [fileError, setFileError] = useState('');   // inline — file type/size issues
  const [saveError, setSaveError] = useState('');   // dialog — shown when save fails
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  // Track paths to delete from S3 on save
  const [profileToRemove, setProfileToRemove] = useState<string | null>(null);
  const [prayerToRemove, setPrayerToRemove] = useState<string | null>(null);
  const [mediaToRemove, setMediaToRemove] = useState<string[]>([]);

  const profileRef = useRef<HTMLInputElement>(null);
  const prayerRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  // Snapshot of form at open time — used to detect unsaved changes.
  // JSON.stringify with a replacer normalizes undefined → null so the comparison
  // is stable across re-renders even when optional fields are absent in the raw data.
  const stableStringify = (v: unknown) => JSON.stringify(v, (_, val) => val ?? null);
  const initialForm = useRef(stableStringify(form));

  // Resolved preview URLs for existing S3 files
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!form.profileImage) { setProfilePreview(null); return; }
    resolveUrl(form.profileImage, '').then((url) => setProfilePreview(url || null));
  }, [form.profileImage]);

  useEffect(() => {
    if (form.media.length === 0) { setMediaPreviews({}); return; }
    Promise.all(
      form.media.map(async (url) => [url, await resolveUrl(url, '')] as [string, string])
    ).then((pairs) => setMediaPreviews(Object.fromEntries(pairs.filter(([, v]) => v))));
  }, [form.media]);

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
    setShowFieldErrors(true);
    if (!form.name.trim() || !form.lastName.trim() || !form.organization.trim() || !form.location.city.trim()) {
      setFileError('Por favor completa los campos obligatorios marcados en rojo.');
      return;
    }

    const newFilesBytes = [profileFile, prayerFile, ...mediaFiles]
      .filter(Boolean)
      .reduce((acc, f) => acc + (f?.size ?? 0), 0);
    if (storageUsedBytes + newFilesBytes > FREE_TIER_BYTES) {
      setFileError(
        `Esta subida (${formatBytes(newFilesBytes)}) excedería el límite gratuito de 5 GB. ` +
        `Almacenamiento usado: ${formatBytes(storageUsedBytes)}.`
      );
      return;
    }

    setFileError('');
    setUploading(true);
    setSaveProgress(0);
    setSaveStep('Preparando...');

    // Calculate total weighted steps for progress tracking
    const hasDeletes = (profileToRemove && isS3Key(profileToRemove)) ||
      (prayerToRemove && isS3Key(prayerToRemove)) || mediaToRemove.some(isS3Key);
    const totalUploads = (profileFile ? 1 : 0) + (prayerFile ? 1 : 0) + mediaFiles.length;
    // Weights: deletes=5, each upload=15 (capped so API call always gets 20)
    const uploadWeight = totalUploads > 0 ? Math.min(15, 60 / totalUploads) : 0;
    const deleteWeight = hasDeletes ? 5 : 0;
    const apiWeight = 20;
    const totalWeight = deleteWeight + totalUploads * uploadWeight + apiWeight;
    let done = 0;
    const advance = (weight: number, label: string) => {
      done += weight;
      setSaveProgress(Math.round((done / totalWeight) * 100));
      setSaveStep(label);
    };

    try {
      // Delete removed files from S3
      if (hasDeletes) {
        setSaveStep('Eliminando archivos anteriores...');
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
        advance(deleteWeight, 'Archivos eliminados.');
      }

      let profileImage = form.profileImage;
      let prayerLetter = form.prayerLetter;
      const media = [...form.media];

      if (profileFile) {
        setSaveStep('Subiendo foto de perfil...');
        const ext = profileFile.name.split('.').pop();
        profileImage = await uploadFile(profileFile, `images/${id}-profile.${ext}`);
        advance(uploadWeight, 'Foto de perfil subida.');
      }
      if (prayerFile) {
        setSaveStep('Subiendo carta de oración...');
        prayerLetter = await uploadFile(prayerFile, `pdfs/${id}-prayer-letter.pdf`);
        advance(uploadWeight, 'Carta de oración subida.');
      }
      for (let i = 0; i < mediaFiles.length; i++) {
        setSaveStep(`Subiendo foto ${i + 1} de ${mediaFiles.length}...`);
        const ext = mediaFiles[i].name.split('.').pop();
        const path = await uploadFile(mediaFiles[i], `images/${id}-media-${Date.now()}-${i}.${ext}`);
        media.push(path);
        advance(uploadWeight, `Foto ${i + 1} subida.`);
      }

      setSaveStep('Guardando información...');
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
      advance(apiWeight, '¡Guardado!');
      setSaveProgress(100);
      setSavedOk(true);
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const requiredFilled = !!form.name.trim() && !!form.lastName.trim() && !!form.organization.trim() && !!form.location.city.trim();
  const filesChanged = !!profileFile || !!prayerFile || mediaFiles.length > 0
    || profileToRemove !== null || prayerToRemove !== null || mediaToRemove.length > 0;
  const formChanged = stableStringify(form) !== initialForm.current;
  const canSave = requiredFilled && (formChanged || filesChanged);

  const captionSx = { fontSize: isMobile ? '0.9rem' : '0.75rem', fontWeight: 600 };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      '& fieldset': { borderColor: '#555' },
      '&.Mui-error fieldset': { borderColor: '#ef5350' },
      '& input, & textarea': { fontSize: isMobile ? '1.05rem' : undefined },
    },
    '& .MuiInputLabel-root': { color: '#aaa', fontSize: isMobile ? '1rem' : undefined },
    '& .MuiInputLabel-root.Mui-error': { color: '#ef9a9a' },
    '& .MuiFormHelperText-root.Mui-error': { color: '#ef9a9a' },
    '& .MuiSelect-select': { fontSize: isMobile ? '1.05rem' : undefined },
  };

  // Returns true when a required field is empty AND the user has attempted to save
  const reqErr = (val: string) => showFieldErrors && !val.trim();

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#fff' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 700 }}>
        <Box sx={{ flex: 1 }}>{missionary ? 'Editar Misionero' : 'Añadir Misionero'}</Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#ef5350', '&:hover': { bgcolor: 'rgba(239,83,80,0.12)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Progress bar — shown during save */}
      {uploading && (
        <Box sx={{ px: 3, pt: 1.5, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: '#90caf9', fontWeight: 600, fontSize: '0.85rem' }}>
              {saveStep}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
              {saveProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={saveProgress}
            sx={{ height: 6, borderRadius: 3, bgcolor: '#2a2a2a', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
          />
        </Box>
      )}

      <DialogContent sx={{ pt: 2, opacity: uploading ? 0.45 : 1, pointerEvents: uploading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
        <Stack spacing={3}>

          {/* Required fields legend — hidden once all required fields are filled */}
          {!requiredFilled && (
            <Box sx={{ bgcolor: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 1.5, px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ color: '#ef9a9a', ...captionSx }}>
                * Campos obligatorios — deben llenarse para poder guardar
              </Typography>
            </Box>
          )}

          {/* Basic info */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 0.5 }}>
            <TextField label="Nombre *" value={form.name} onChange={(e) => set('name', e.target.value)} sx={inputSx}
              error={reqErr(form.name)} helperText={reqErr(form.name) ? 'Obligatorio' : ''}
              InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: '#ef5350' } } }} />
            <TextField label="Apellido *" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} sx={inputSx}
              error={reqErr(form.lastName)} helperText={reqErr(form.lastName) ? 'Obligatorio' : ''}
              InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: '#ef5350' } } }} />
            <TextField label="Organización *" value={form.organization} onChange={(e) => set('organization', e.target.value)} sx={inputSx}
              error={reqErr(form.organization)} helperText={reqErr(form.organization) ? 'Obligatorio' : ''}
              InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: '#ef5350' } } }} />
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
            <Typography variant="caption" color="#aaa" sx={captionSx}>Ubicación</Typography>
          </Divider>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label="Ciudad *" value={form.location.city} onChange={(e) => setLocation('city', e.target.value)} sx={inputSx}
              error={reqErr(form.location.city)} helperText={reqErr(form.location.city) ? 'Obligatorio' : ''}
              InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: '#ef5350' } } }} />
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
            <Typography variant="caption" color="#aaa" sx={captionSx}>Archivos</Typography>
          </Divider>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>

            {/* Profile image */}
            <Box>
              <Typography variant="caption" color="#aaa" display="block" mb={1} sx={captionSx}>Foto de perfil</Typography>
              <input ref={profileRef} type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (!f) return;
                if (!f.type.startsWith('image/')) { setFileError('La foto de perfil debe ser una imagen (JPG, PNG, etc.), no un PDF u otro archivo.'); e.target.value = ''; return; }
                if (f.size > MAX_IMAGE_BYTES) { setFileError(`Imagen demasiado grande (${formatBytes(f.size)}). Máximo 50 MB.`); e.target.value = ''; return; }
                setFileError('');
                setProfileFile(f);
              }} />
              {/* Preview with badge delete */}
              {(profileFile || profilePreview) && (
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
                  <Box component="img"
                    src={profileFile ? URL.createObjectURL(profileFile) : (profilePreview ?? '')}
                    sx={{ display: 'block', width: 80, height: 80, objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #444' }}
                  />
                  {!profileFile && (
                    <IconButton size="small" onClick={removeCurrentProfileImage} title="Quitar foto de perfil"
                      sx={{ position: 'absolute', top: -6, right: -6, bgcolor: '#ef5350', color: '#fff', p: 0.2, '&:hover': { bgcolor: '#c62828' }, width: 20, height: 20 }}>
                      <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  )}
                </Box>
              )}
              <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                onClick={() => profileRef.current?.click()} sx={{ borderColor: '#555', color: '#ccc', display: 'block' }}>
                {form.profileImage || profileFile ? 'Reemplazar' : 'Seleccionar imagen'}
              </Button>
              {profileFile && (
                <Typography variant="caption" color="#90caf9" display="block" mt={0.5}>{profileFile.name}</Typography>
              )}
            </Box>

            {/* Prayer letter PDF */}
            <Box>
              <Typography variant="caption" color="#aaa" display="block" mb={1} sx={captionSx}>Carta de oración (PDF)</Typography>
              <input ref={prayerRef} type="file" accept="application/pdf" hidden onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (!f) return;
                if (f.type !== 'application/pdf') { setFileError('La carta de oración debe ser un archivo PDF. Si tienes una imagen, conviértela a PDF primero.'); e.target.value = ''; return; }
                if (f.size > MAX_PDF_BYTES) { setFileError(`PDF demasiado grande (${formatBytes(f.size)}). Máximo 100 MB.`); e.target.value = ''; return; }
                setFileError('');
                setPrayerFile(f);
              }} />
              {/* PDF card with badge delete */}
              {!prayerFile && form.prayerLetter && (
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
                  <Box sx={{
                    width: 80, height: 80, borderRadius: '8px', border: '1.5px solid #444',
                    bgcolor: '#2a2a2a', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 0.5,
                  }}>
                    <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>📄</Typography>
                    <Typography variant="caption" sx={{ color: '#aaa', fontSize: '0.65rem' }}>PDF</Typography>
                  </Box>
                  <IconButton size="small" onClick={removeCurrentPrayerLetter} title="Quitar PDF"
                    sx={{ position: 'absolute', top: -6, right: -6, bgcolor: '#ef5350', color: '#fff', p: 0.2, '&:hover': { bgcolor: '#c62828' }, width: 20, height: 20 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              )}
              <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                onClick={() => prayerRef.current?.click()} sx={{ borderColor: '#555', color: '#ccc', display: 'block' }}>
                {form.prayerLetter ? 'Reemplazar' : 'Seleccionar PDF'}
              </Button>
              {prayerFile && (
                <Typography variant="caption" color="#90caf9" display="block" mt={0.5}>{prayerFile.name}</Typography>
              )}
            </Box>

            {/* Media photos */}
            <Box>
              <Typography variant="caption" color="#aaa" display="block" mb={1} sx={captionSx}>Álbum de fotos</Typography>
              <input ref={mediaRef} type="file" accept="image/*" multiple hidden onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const nonImage = files.find(f => !f.type.startsWith('image/'));
                if (nonImage) { setFileError(`"${nonImage.name}" no es una imagen válida. El álbum solo acepta imágenes (JPG, PNG, etc.).`); e.target.value = ''; return; }
                const oversized = files.find(f => f.size > MAX_IMAGE_BYTES);
                if (oversized) { setFileError(`"${oversized.name}" es demasiado grande (${formatBytes(oversized.size)}). Máximo 50 MB por imagen.`); e.target.value = ''; return; }
                setFileError('');
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
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {form.media.map((url, i) => (
                    <Box key={url} sx={{ position: 'relative' }}>
                      {mediaPreviews[url] ? (
                        <Box component="img"
                          src={mediaPreviews[url]}
                          alt={`Foto ${i + 1}`}
                          sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #444', display: 'block' }}
                        />
                      ) : (
                        <Box sx={{ width: 64, height: 64, borderRadius: '6px', border: '1.5px solid #444', bgcolor: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={20} sx={{ color: '#555' }} />
                        </Box>
                      )}
                      <IconButton size="small" onClick={() => removeMediaItem(url)}
                        title="Quitar foto"
                        sx={{
                          position: 'absolute', top: -6, right: -6,
                          bgcolor: '#ef5350', color: '#fff', p: 0.2,
                          '&:hover': { bgcolor: '#c62828' },
                          width: 20, height: 20,
                        }}>
                        <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Contact info */}
          <Divider sx={{ borderColor: '#333' }}>
            <Typography variant="caption" color="#aaa" sx={captionSx}>Información de Contacto</Typography>
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

          <Button startIcon={<AddIcon />} onClick={addContact} size={isMobile ? 'large' : 'medium'}
            sx={{ color: '#90caf9', alignSelf: 'flex-start', fontSize: isMobile ? '1rem' : undefined }}>
            Añadir contacto
          </Button>

          {fileError && (
            <Box sx={{ bgcolor: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.35)', borderRadius: 1.5, px: 2, py: 1.25, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography sx={{ fontSize: '1.1rem', lineHeight: 1.4 }}>⚠️</Typography>
              <Typography variant="body2" sx={{ color: '#ef9a9a', lineHeight: 1.5 }}>{fileError}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #333', gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
        <Button onClick={onClose} fullWidth={isMobile} sx={{ color: '#aaa' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={uploading || !canSave}
          fullWidth={isMobile} size={isMobile ? 'large' : 'medium'}
          startIcon={uploading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
          sx={{ fontWeight: 700, minWidth: 140 }}>
          {uploading ? saveStep : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>

      {/* ── SAVE ERROR ───────────────────────────────────────────────────── */}
      <Dialog open={!!saveError} onClose={() => setSaveError('')}
        slotProps={{ paper: { sx: { bgcolor: '#1a1a1a', color: '#fff', borderRadius: 3, textAlign: 'center', px: 4, py: 3, maxWidth: 400 } } }}>
        <Typography sx={{ fontSize: '3rem', mb: 1 }}>❌</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.75 }}>Error al guardar</Typography>
        <Typography variant="body2" sx={{ color: '#aaa', mb: 0.75 }}>
          Algo salió mal durante el proceso de guardado. Por favor intenta de nuevo.
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 3, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {saveError}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => setSaveError('')} sx={{ borderColor: '#555', color: '#aaa', borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={() => { setSaveError(''); handleSave(); }} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Reintentar
          </Button>
        </Box>
      </Dialog>

      {/* ── SUCCESS CONFIRMATION ─────────────────────────────────────────── */}
      <Dialog open={savedOk} onClose={onSave}
        slotProps={{ paper: { sx: { bgcolor: '#1a1a1a', color: '#fff', borderRadius: 3, textAlign: 'center', px: 4, py: 3, maxWidth: 360 } } }}>
        <Typography sx={{ fontSize: '3rem', mb: 1 }}>✅</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.75 }}>
          {missionary ? '¡Misionero actualizado!' : '¡Misionero guardado!'}
        </Typography>
        <Typography variant="body2" color="#aaa" sx={{ mb: 3 }}>
          Los cambios han sido guardados correctamente.
        </Typography>
        <Button variant="contained" fullWidth onClick={onSave} sx={{ fontWeight: 700, py: 1.25, borderRadius: 2 }}>
          Volver a la lista
        </Button>
      </Dialog>
    </>
  );
};

export default MissionaryForm;
