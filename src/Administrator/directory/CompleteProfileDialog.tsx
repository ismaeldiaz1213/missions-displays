import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Missionary } from '../../types';
import {
  CONTACT_METHODS, CONTACT_METHOD_LABELS, MISSING_LABELS, emptyProfile, isEmail, missingFields, publicContact, saveProfile,
  type ContactMethod, type MissionaryProfile, type ProfileInput,
} from '../../data/missionaryProfiles';
import { publishWithHistory, saveDraft } from '../../data/missionaries';
import { currentUserEmail } from '../../data/currentUser';
import CityPicker from '../../ui/CityPicker';
import { A, useAdminLang } from '../adminUi';
import { fullName, requestFor, useDirectory, type DirectoryEntry } from './directoryData';

/** Prefills a new profile from the page request (if any) and the public page. */
const startingProfile = (entry: DirectoryEntry, requests: ReturnType<typeof useDirectory>['requests']): ProfileInput => {
  if (entry.profile) return { ...emptyProfile(), ...entry.profile };
  const req = requestFor(entry.id, entry.page, requests);
  return {
    ...emptyProfile(),
    email: req?.email ?? publicContact(entry.page, 'email'),
    phone: req?.phone ?? publicContact(entry.page, 'phone'),
    preferredContact: req?.preferredContact ?? '',
    preferredContactNote: req?.preferredContactNote ?? '',
    language: req?.language ?? 'es',
    spouseName: req?.wifeName ?? '',
    sendingChurch: req?.sendingChurch ?? '',
    requestId: req?.id ?? '',
  };
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ color: A.blue, fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', mt: 1 }}>
    {children}
  </Typography>
);

/**
 * "Completar perfil": the private details plus the few page fields a complete profile needs.
 * Also used later as "Editar datos privados".
 */
const CompleteProfileDialog: React.FC<{ entry: DirectoryEntry; onClose: () => void; onSaved: () => void }> = ({ entry, onClose, onSaved }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { tr, lang } = useAdminLang();
  const { requests } = useDirectory();
  const [profile, setProfile] = useState<ProfileInput>(() => startingProfile(entry, requests));
  const [page, setPage] = useState<Missionary>(entry.page);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const pageEditable = entry.status !== 'archived';
  const fromRequest = !entry.profile && !!profile.requestId;

  const setP = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setProfile((p) => ({ ...p, [k]: v }));
  const setPage1 = <K extends keyof Missionary>(k: K, v: Missionary[K]) => setPage((p) => ({ ...p, [k]: v }));

  const missing = useMemo(() => missingFields(page, { ...profile, id: entry.id } as MissionaryProfile), [page, profile, entry.id]);
  const emailInvalid = !!profile.email.trim() && !isEmail(profile.email);

  const save = async () => {
    setShowErrors(true);
    if (emailInvalid) return;
    setSaving(true);
    setError('');
    try {
      const by = currentUserEmail();
      await saveProfile(entry.id, { ...profile, email: profile.email.trim(), phone: profile.phone.trim() }, by, !entry.profile);
      const pageChanged = JSON.stringify(page) !== JSON.stringify(entry.page);
      if (pageEditable && pageChanged) {
        await (entry.status === 'draft' ? saveDraft(page) : publishWithHistory(page, by, 'profile-update'));
      }
      onSaved();
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {entry.complete ? tr('Editar datos privados', 'Edit private details') : tr('Completar perfil', 'Complete profile')}
        <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{fullName(entry.page)}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fromRequest && (
          <Alert severity="info">{tr('Rellenamos lo que el misionero envió en su solicitud. Revíselo antes de guardar.',
            'We filled in what the missionary sent with their request. Review it before saving.')}</Alert>
        )}
        {missing.length > 0 ? (
          <Alert severity="warning">
            {tr('Para un perfil completo falta: ', 'For a complete profile, still missing: ')}
            <strong>{missing.map((f) => MISSING_LABELS[f][lang]).join(', ')}</strong>
          </Alert>
        ) : (
          <Alert icon={<CheckCircleIcon />} severity="success">{tr('Todo listo: este perfil queda completo.', 'All set: this profile is complete.')}</Alert>
        )}

        <SectionTitle>{tr('Cómo comunicarnos (privado)', 'How to reach them (private)')}</SectionTitle>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label={tr('Correo electrónico', 'Email')} type="email" value={profile.email} onChange={(e) => setP('email', e.target.value)}
            error={emailInvalid} helperText={emailInvalid ? tr('Correo no válido', 'Invalid email') : tr('Para enviarle correos y su enlace de acceso', 'For emails and their sign-in link')} />
          <TextField label={tr('Teléfono / WhatsApp', 'Phone / WhatsApp')} type="tel" value={profile.phone} onChange={(e) => setP('phone', e.target.value)} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1, color: showErrors && !profile.preferredContact ? 'error.main' : 'text.primary' }}>
            {tr('¿Cómo prefiere que le contactemos?', 'How do they prefer to be contacted?')}
          </Typography>
          <ToggleButtonGroup exclusive value={profile.preferredContact} onChange={(_, v: ContactMethod | null) => v && setP('preferredContact', v)}
            sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { border: `1px solid ${A.line} !important`, borderRadius: '999px !important', px: 2, fontWeight: 700, textTransform: 'none' },
              '& .Mui-selected': { bgcolor: `${A.soft} !important`, color: `${A.navy} !important`, borderColor: `${A.blue} !important` } }}>
            {CONTACT_METHODS.map((m) => <ToggleButton key={m} value={m}>{CONTACT_METHOD_LABELS[m][lang]}</ToggleButton>)}
          </ToggleButtonGroup>
          <TextField fullWidth sx={{ mt: 1.5 }} label={profile.preferredContact === 'other' ? tr('¿Cuál?', 'Which one?') : tr('Nota (opcional)', 'Note (optional)')}
            placeholder={tr('Ej.: Facebook Messenger, mejor por la tarde…', 'E.g. Facebook Messenger, best in the afternoon…')}
            value={profile.preferredContactNote} onChange={(e) => setP('preferredContactNote', e.target.value)} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>{tr('Idioma para correos', 'Email language')}</Typography>
          <ToggleButtonGroup exclusive size="small" value={profile.language} onChange={(_, v) => v && setP('language', v)}>
            <ToggleButton value="es" sx={{ px: 2, textTransform: 'none', fontWeight: 700 }}>Español</ToggleButton>
            <ToggleButton value="en" sx={{ px: 2, textTransform: 'none', fontWeight: 700 }}>English</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <SectionTitle>{tr('Familia y ministerio', 'Family and ministry')}</SectionTitle>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label={tr('Esposa', 'Wife')} value={profile.spouseName} onChange={(e) => setP('spouseName', e.target.value)} />
          <TextField label={tr('Iglesia que lo envía', 'Sending church')} value={profile.sendingChurch} onChange={(e) => setP('sendingChurch', e.target.value)} />
          <TextField label={tr('Organización', 'Organization')} required disabled={!pageEditable} value={page.organization}
            error={showErrors && !page.organization.trim()} onChange={(e) => setPage1('organization', e.target.value)} />
          <TextField label={tr('Tipo de misión', 'Mission type')} disabled={!pageEditable} value={page.missionType} onChange={(e) => setPage1('missionType', e.target.value)} />
        </Box>

        <SectionTitle>{tr('Dónde sirven', 'Where they serve')}</SectionTitle>
        {pageEditable
          ? <CityPicker lang={lang} required showErrors={showErrors} value={page.location} onChange={(location) => setPage1('location', location)} />
          : <Typography color="text.secondary">{[page.location.city, page.location.country].filter(Boolean).join(', ')}</Typography>}
        {entry.status === 'published' && (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            {tr('Los cambios de organización, tipo de misión y ubicación se publican en su página; la versión anterior queda en el historial.',
              'Organization, mission type and location changes go live on their page; the previous version is kept in history.')}
          </Typography>
        )}

        <SectionTitle>{tr('Notas internas', 'Internal notes')}</SectionTitle>
        <TextField multiline minRows={2} placeholder={tr('Solo para el equipo de la iglesia', 'Church staff only')}
          value={profile.notes} onChange={(e) => setP('notes', e.target.value)} />

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">{tr('Cancelar', 'Cancel')}</Button>
        <Button variant="contained" onClick={save} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ px: 3 }}>
          {tr('Guardar perfil', 'Save profile')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompleteProfileDialog;
