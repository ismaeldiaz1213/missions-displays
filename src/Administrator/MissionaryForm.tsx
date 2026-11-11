import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Box, Typography, IconButton, CircularProgress, Divider,
  Stack, useTheme, useMediaQuery, LinearProgress,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import { uploadFile } from '../data/storageFiles';
import { deleteDraft, publishWithHistory, saveDraft } from '../data/missionaries';
import { currentUserEmail } from '../data/currentUser';
import CityPicker from '../ui/CityPicker';
import type { Missionary, ContactInfo } from '../types';
import { formatBytes } from './formatBytes';
import { isVideoPath, resolveUrl } from '../storageUrl';

const FREE_TIER_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_PDF_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;

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
  /** Editing an unpublished draft: "Guardar" keeps it hidden, "Publicar" makes it public. */
  isDraft?: boolean;
  onSave: (saved: Missionary) => void;
  onClose: () => void;
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


const MissionaryForm: React.FC<Props> = ({
  open, missionary, defaultContinent, storageUsedBytes, isDraft = false, onSave, onClose,
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
  const [published, setPublished] = useState(false);
  const savedPage = useRef<Missionary | null>(null);
  const lastPublishAttempt = useRef(false); // so "Reintentar" repeats a failed publish, not a plain save
  const [fileError, setFileError] = useState('');   // inline — file type/size issues
  const [saveError, setSaveError] = useState('');   // dialog — shown when save fails
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [datePrecision, setDatePrecision] = useState<'year' | 'month' | 'full'>(() => {
    const d = form.startDate ?? '';
    if (/^\d{4}$/.test(d)) return 'year';
    if (/^\d{4}-\d{2}$/.test(d)) return 'month';
    return 'full';
  });

  // Files taken off the page are only unlinked, never deleted: older versions in history still use them.
  const [filesUnlinked, setFilesUnlinked] = useState(false);

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
    const photos = form.media.filter((url) => !isVideoPath(url));
    if (photos.length === 0) { setMediaPreviews({}); return; }
    Promise.all(
      photos.map(async (url) => [url, await resolveUrl(url, '')] as [string, string])
    ).then((pairs) => setMediaPreviews(Object.fromEntries(pairs.filter(([, v]) => v))));
  }, [form.media]);

  const set = (field: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

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
    setFilesUnlinked(true);
    set('profileImage', '');
    setProfileFile(null);
  };

  const removeCurrentPrayerLetter = () => {
    setFilesUnlinked(true);
    set('prayerLetter', '');
    setPrayerFile(null);
  };

  const removeMediaItem = (url: string) => {
    setFilesUnlinked(true);
    setForm((f) => ({ ...f, media: f.media.filter((u) => u !== url) }));
  };

  const handleSave = async (publish = false) => {
    lastPublishAttempt.current = publish;
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
    const totalUploads = (profileFile ? 1 : 0) + (prayerFile ? 1 : 0) + mediaFiles.length;
    // Weights: deletes=5, each upload=15 (capped so API call always gets 20)
    const uploadWeight = totalUploads > 0 ? Math.min(15, 60 / totalUploads) : 0;
    const apiWeight = 20;
    const totalWeight = totalUploads * uploadWeight + apiWeight;
    let done = 0;
    const advance = (weight: number, label: string) => {
      done += weight;
      setSaveProgress(Math.round((done / totalWeight) * 100));
      setSaveStep(label);
    };

    try {
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
        setSaveStep(`Subiendo archivo ${i + 1} de ${mediaFiles.length}...`);
        const ext = mediaFiles[i].name.split('.').pop();
        const folder = mediaFiles[i].type.startsWith('video/') ? 'videos' : 'images';
        const path = await uploadFile(mediaFiles[i], `${folder}/${id}-media-${Date.now()}-${i}.${ext}`);
        media.push(path);
        advance(uploadWeight, `Archivo ${i + 1} subido.`);
      }

      setSaveStep('Guardando información...');
      const payload: Missionary = {
        ...form,
        id,
        profileImage,
        prayerLetter,
        media: media.map((url) => ({ url })),
      };

      if (isDraft && !publish) {
        await saveDraft(payload);
      } else {
        // The version being replaced is kept in history so it can be restored.
        await publishWithHistory(payload, currentUserEmail(), isDraft ? 'published-draft' : 'admin-edit');
        if (isDraft) await deleteDraft(id);
      }
      savedPage.current = payload;
      setPublished(publish);
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
  const filesChanged = !!profileFile || !!prayerFile || mediaFiles.length > 0 || filesUnlinked;
  const formChanged = stableStringify(form) !== initialForm.current;
  const canSave = requiredFilled && (formChanged || filesChanged);
  const canPublish = isDraft && requiredFilled;

  const captionSx = { fontSize: isMobile ? '0.9rem' : '0.75rem', fontWeight: 600 };

  const inputSx = {
    '& .MuiOutlinedInput-root': { '& input, & textarea': { fontSize: isMobile ? '1.05rem' : undefined } },
    '& .MuiInputLabel-root': { fontSize: isMobile ? '1rem' : undefined },
    '& .MuiSelect-select': { fontSize: isMobile ? '1.05rem' : undefined },
  };

  // Returns true when a required field is empty AND the user has attempted to save
  const reqErr = (val: string) => showFieldErrors && !val.trim();

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid var(--ibl-border)', display: 'flex', alignItems: 'center', fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 700 }}>
        <Box sx={{ flex: 1 }}>{isDraft ? 'Editar Borrador' : missionary ? 'Editar Misionero' : 'Añadir Misionero'}</Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Progress bar — shown during save */}
      {uploading && (
        <Box sx={{ px: 3, pt: 1.5, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.85rem' }}>
              {saveStep}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {saveProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={saveProgress}
            sx={{ height: 6, borderRadius: 3, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
          />
        </Box>
      )}

      <DialogContent sx={{ pt: 2, opacity: uploading ? 0.45 : 1, pointerEvents: uploading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
        <Stack spacing={3}>

          {/* Required fields legend — hidden once all required fields are filled */}
          {!requiredFilled && (
            <Box sx={{ bgcolor: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 1.5, px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ color: 'error.main', ...captionSx }}>
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
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: isMobile ? '0.9rem' : '0.75rem', display: 'block', mb: 0.75 }}>
                Fecha de inicio en misión
              </Typography>
              <ToggleButtonGroup
                value={datePrecision}
                exclusive
                onChange={(_, val: 'year' | 'month' | 'full') => {
                  if (!val) return;
                  const cur = form.startDate ?? '';
                  let next = cur;
                  if (val === 'year') {
                    next = cur.slice(0, 4);
                  } else if (val === 'month') {
                    if (cur.length >= 7) next = cur.slice(0, 7);
                    else if (cur.length >= 4) next = `${cur.slice(0, 4)}-01`;
                  } else {
                    if (cur.length >= 10) next = cur.slice(0, 10);
                    else if (cur.length >= 7) next = `${cur.slice(0, 7)}-01`;
                    else if (cur.length >= 4) next = `${cur.slice(0, 4)}-01-01`;
                  }
                  setDatePrecision(val);
                  set('startDate', next);
                }}
                size="small"
                fullWidth
                sx={{
                  mb: 1,
                  '& .MuiToggleButton-root': {
                    color: 'text.secondary', borderColor: 'divider',
                    fontSize: isMobile ? '0.85rem' : '0.72rem',
                    py: isMobile ? 1.25 : 0.5,
                    flex: 1,
                    '&.Mui-selected': { color: 'primary.main', borderColor: '#90caf9', bgcolor: 'rgba(144,202,249,0.1)' },
                  },
                }}
              >
                <ToggleButton value="year">Solo año</ToggleButton>
                <ToggleButton value="month">Mes y año</ToggleButton>
                <ToggleButton value="full">Fecha completa</ToggleButton>
              </ToggleButtonGroup>
              {datePrecision === 'year' && (
                <TextField
                  label="Año"
                  type="number"
                  value={form.startDate ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (val.length <= 4 && /^\d+$/.test(val))) set('startDate', val);
                  }}
                  inputProps={{ min: 1900, max: 2099 }}
                  sx={{ ...inputSx, '& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button': { display: 'none' }, '& input[type=number]': { MozAppearance: 'textfield' } }}
                  fullWidth
                />
              )}
              {datePrecision === 'month' && (
                <TextField
                  label="Mes y año"
                  type="month"
                  value={form.startDate ?? ''}
                  onChange={(e) => set('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={inputSx}
                  fullWidth
                />
              )}
              {datePrecision === 'full' && (
                <TextField
                  label="Fecha completa"
                  type="date"
                  value={form.startDate ?? ''}
                  onChange={(e) => set('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={inputSx}
                  fullWidth
                />
              )}
            </Box>
            <FormControl sx={inputSx}>
              <InputLabel>Continente</InputLabel>
              <Select value={form.continent} label="Continente" onChange={(e) => set('continent', e.target.value)}
                sx={{}}>
                {CONTINENTS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* Location */}
          <Divider>
            <Typography variant="caption" color="text.secondary" sx={captionSx}>Ubicación</Typography>
          </Divider>
          <CityPicker value={form.location} onChange={(location) => set('location', location)} required showErrors={showFieldErrors} />

          {/* Description */}
          <TextField label="Descripción" value={form.description} onChange={(e) => set('description', e.target.value)}
            multiline rows={3} sx={inputSx} />
          <TextField label="Notas especiales" value={form.specialNotes ?? ''} onChange={(e) => set('specialNotes', e.target.value)}
            multiline rows={2} sx={inputSx} />

          {/* File uploads */}
          <Divider>
            <Typography variant="caption" color="text.secondary" sx={captionSx}>Archivos</Typography>
          </Divider>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>

            {/* Profile image */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={captionSx}>Foto de perfil</Typography>
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
                    sx={{ display: 'block', width: 80, height: 80, objectFit: 'cover', borderRadius: '8px', border: '1.5px solid var(--ibl-border)' }}
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
                onClick={() => profileRef.current?.click()} sx={{ borderColor: 'divider', display: 'block' }}>
                {form.profileImage || profileFile ? 'Reemplazar' : 'Seleccionar imagen'}
              </Button>
              {profileFile && (
                <Typography variant="caption" color="primary" display="block" mt={0.5}>{profileFile.name}</Typography>
              )}
            </Box>

            {/* Prayer letter PDF */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={captionSx}>Carta de oración (PDF)</Typography>
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
                    width: 80, height: 80, borderRadius: '8px', border: '1.5px solid var(--ibl-border)',
                    bgcolor: 'grey.100', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 0.5,
                  }}>
                    <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>📄</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>PDF</Typography>
                  </Box>
                  <IconButton size="small" onClick={removeCurrentPrayerLetter} title="Quitar PDF"
                    sx={{ position: 'absolute', top: -6, right: -6, bgcolor: '#ef5350', color: '#fff', p: 0.2, '&:hover': { bgcolor: '#c62828' }, width: 20, height: 20 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              )}
              <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                onClick={() => prayerRef.current?.click()} sx={{ borderColor: 'divider', display: 'block' }}>
                {form.prayerLetter ? 'Reemplazar' : 'Seleccionar PDF'}
              </Button>
              {prayerFile && (
                <Typography variant="caption" color="primary" display="block" mt={0.5}>{prayerFile.name}</Typography>
              )}
            </Box>

            {/* Media photos */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={captionSx}>Álbum de fotos y videos</Typography>
              <input ref={mediaRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const invalid = files.find(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
                if (invalid) { setFileError(`"${invalid.name}" no es válido. El álbum acepta imágenes (JPG, PNG, etc.) y videos (MP4, MOV, etc.).`); e.target.value = ''; return; }
                const oversized = files.find(f => f.size > (f.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES));
                if (oversized) { setFileError(`"${oversized.name}" es demasiado grande (${formatBytes(oversized.size)}). Máximo 50 MB por imagen y 1 GB por video.`); e.target.value = ''; return; }
                setFileError('');
                setMediaFiles(files);
              }} />
              <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                onClick={() => mediaRef.current?.click()} sx={{ borderColor: 'divider' }}>
                Añadir fotos o videos
              </Button>
              {mediaFiles.length > 0 && (
                <Typography variant="caption" color="primary" display="block" mt={0.5}>
                  {mediaFiles.length} archivo(s) nuevo(s)
                </Typography>
              )}
              {form.media.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {form.media.map((url, i) => (
                    <Box key={url} sx={{ position: 'relative' }}>
                      {isVideoPath(url) ? (
                        <Box title="Video" sx={{ width: 64, height: 64, borderRadius: '6px', border: '1.5px solid var(--ibl-border)', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                          🎬
                        </Box>
                      ) : mediaPreviews[url] ? (
                        <Box component="img"
                          src={mediaPreviews[url]}
                          alt={`Foto ${i + 1}`}
                          sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '6px', border: '1.5px solid var(--ibl-border)', display: 'block' }}
                        />
                      ) : (
                        <Box sx={{ width: 64, height: 64, borderRadius: '6px', border: '1.5px solid var(--ibl-border)', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={20} sx={{ color: 'text.disabled' }} />
                        </Box>
                      )}
                      <IconButton size="small" onClick={() => removeMediaItem(url)}
                        title="Quitar"
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
          <Divider>
            <Typography variant="caption" color="text.secondary" sx={captionSx}>Información de Contacto</Typography>
          </Divider>

          {form.contactInfo.map((c, i) => (
            <Box key={i} display="flex" gap={1} alignItems="center">
              <FormControl sx={{ minWidth: 130, ...inputSx }}>
                <InputLabel>Tipo</InputLabel>
                <Select value={c.type} label="Tipo" onChange={(e) => updateContact(i, 'type', e.target.value)}
                  sx={{}}>
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
            sx={{ color: 'primary.main', alignSelf: 'flex-start', fontSize: isMobile ? '1rem' : undefined }}>
            Añadir contacto
          </Button>

          {fileError && (
            <Box sx={{ bgcolor: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.35)', borderRadius: 1.5, px: 2, py: 1.25, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography sx={{ fontSize: '1.1rem', lineHeight: 1.4 }}>⚠️</Typography>
              <Typography variant="body2" sx={{ color: 'error.main', lineHeight: 1.5 }}>{fileError}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid var(--ibl-border)', gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
        <Button onClick={onClose} fullWidth={isMobile} sx={{ color: 'text.secondary' }}>Cancelar</Button>
        <Button variant={isDraft ? 'outlined' : 'contained'} onClick={() => handleSave()} disabled={uploading || !canSave}
          fullWidth={isMobile} size={isMobile ? 'large' : 'medium'}
          startIcon={uploading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
          sx={{ fontWeight: 700, minWidth: 140 }}>
          {uploading ? saveStep : isDraft ? 'Guardar borrador' : 'Guardar'}
        </Button>
        {isDraft && (
          <Button variant="contained" color="success" onClick={() => handleSave(true)} disabled={uploading || !canPublish}
            fullWidth={isMobile} size={isMobile ? 'large' : 'medium'} sx={{ fontWeight: 700, minWidth: 140 }}>
            Publicar
          </Button>
        )}
      </DialogActions>
    </Dialog>

      {/* ── SAVE ERROR ───────────────────────────────────────────────────── */}
      <Dialog open={!!saveError} onClose={() => setSaveError('')}
        slotProps={{ paper: { sx: { borderRadius: 3, textAlign: 'center', px: 4, py: 3, maxWidth: 400 } } }}>
        <Typography sx={{ fontSize: '3rem', mb: 1 }}>❌</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.75 }}>Error al guardar</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.75 }}>
          Algo salió mal durante el proceso de guardado. Por favor intenta de nuevo.
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 3, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {saveError}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => setSaveError('')} sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={() => { setSaveError(''); handleSave(lastPublishAttempt.current); }} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Reintentar
          </Button>
        </Box>
      </Dialog>

      {/* ── SUCCESS CONFIRMATION ─────────────────────────────────────────── */}
      <Dialog open={savedOk} onClose={() => savedPage.current && onSave(savedPage.current)}
        slotProps={{ paper: { sx: { borderRadius: 3, textAlign: 'center', px: 4, py: 3, maxWidth: 360 } } }}>
        <Typography sx={{ fontSize: '3rem', mb: 1 }}>✅</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.75 }}>
          {published ? '¡Página publicada!' : isDraft ? '¡Borrador guardado!' : missionary ? '¡Misionero actualizado!' : '¡Misionero guardado!'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {published ? 'La página ya es visible en el sitio.' : isDraft ? 'El borrador sigue oculto hasta que lo publiques.' : 'Los cambios han sido guardados correctamente.'}
        </Typography>
        <Button variant="contained" fullWidth onClick={() => savedPage.current && onSave(savedPage.current)} sx={{ fontWeight: 700, py: 1.25, borderRadius: 2 }}>
          Volver a la lista
        </Button>
      </Dialog>
    </>
  );
};

export default MissionaryForm;
