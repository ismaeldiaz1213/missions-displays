import React, { useMemo, useState } from 'react';
import {
  Box, Button, CircularProgress, Collapse, FormControlLabel, Switch,
  TextField, Typography,
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import ChurchIcon from '@mui/icons-material/Church';
import CampaignIcon from '@mui/icons-material/Campaign';
import PersonIcon from '@mui/icons-material/Person';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import LockClockIcon from '@mui/icons-material/LockClock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { createRegistration, mediaUploadPath, newRegistrationId } from '../data/registrations';
import FormSection from './components/FormSection';
import ChoiceCard from './components/ChoiceCard';
import PersonFields from './components/PersonFields';
import RegistrationSummary from './components/RegistrationSummary';
import PageShell, { CenterCard } from './components/PageShell';
import { subPanelSx } from './styles';
import {
  CONFERENCE_DAYS,
  HOTEL_FEE_PER_DAY,
  isMediaUploadOpen,
  closeDateLabel,
  TRANSPORT_LABELS,
  calculateHotelFee,
  formatConferenceDay,
  isRegistrationOpen,
  type Category,
  type ChildrenInfo,
  type PersonInfo,
  type RegistrationInput,
  type SpouseInfo,
  type Transport,
  type TravelInfo,
} from './conference';
import { LOCALES, STRINGS, useLang, type Lang, type Strings } from './i18n';

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  missionary: <PublicIcon />, pastor: <ChurchIcon />, evangelist: <CampaignIcon />, layman: <PersonIcon />,
};

const TRANSPORT_ICONS: Record<Transport, React.ReactNode> = {
  plane: <FlightIcon />, bus: <DirectionsBusIcon />, car: <DirectionsCarIcon />, other: <MoreHorizIcon />,
};

const emptyPerson = (): PersonInfo => ({
  firstName: '', lastName: '', email: '', phone: '', church: '',
  address: { street: '', city: '', state: '', zip: '', country: '' },
});

type FormState = Omit<RegistrationInput, 'language' | 'category' | 'spouse' | 'children' | 'travel'> & {
  category: Category | '';
  spouse: SpouseInfo;
  children: ChildrenInfo;
  travel: Omit<TravelInfo, 'transport'> & { transport: Transport | '' };
};

const initialForm = (): FormState => ({
  category: '',
  registrant: emptyPerson(),
  missionaryBoard: '',
  sendingChurch: '',
  bringingSpouse: false,
  spouse: { ...emptyPerson(), sameAddress: true },
  bringingChildren: false,
  children: { count: 1, infants: 0, ages: '', notes: '' },
  attendanceDays: [...CONFERENCE_DAYS],
  travel: {
    transport: '', arrivalDate: '', arrivalTime: '', departureDate: '', needsPickup: false,
    airline: '', flightNumber: '', airport: '', busCompany: '', busStation: '', notes: '',
  },
  specialNeeds: '',
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (f: FormState, msg: Strings['errors']): Record<string, string> => {
  const e: Record<string, string> = {};
  const req = (key: string, value: string) => { if (!value.trim()) e[key] = msg.required; };

  if (!f.category) e.category = msg.selectCategory;
  req('registrant.firstName', f.registrant.firstName);
  req('registrant.lastName', f.registrant.lastName);
  req('registrant.email', f.registrant.email);
  if (f.registrant.email && !EMAIL_RE.test(f.registrant.email.trim())) e['registrant.email'] = msg.invalidEmail;
  req('registrant.phone', f.registrant.phone);
  req('registrant.church', f.registrant.church);

  if (f.category === 'missionary') {
    req('missionaryBoard', f.missionaryBoard);
    req('sendingChurch', f.sendingChurch);
  }
  if (f.bringingSpouse) {
    req('spouse.firstName', f.spouse.firstName);
    req('spouse.lastName', f.spouse.lastName);
    if (f.spouse.email && !EMAIL_RE.test(f.spouse.email.trim())) e['spouse.email'] = msg.invalidEmail;
  }
  if (f.bringingChildren && f.children.count < 1) e['children.count'] = msg.min1;
  if (f.bringingChildren && f.children.infants > f.children.count) e['children.infants'] = msg.infantsTooMany;
  if (f.attendanceDays.length === 0) e.attendanceDays = msg.selectDay;
  if (!f.travel.transport) e['travel.transport'] = msg.selectTransport;
  req('travel.arrivalDate', f.travel.arrivalDate);
  return e;
};

const toInput = (f: FormState, language: Lang): RegistrationInput => ({
  ...f,
  language,
  category: f.category as Category,
  spouse: f.bringingSpouse ? f.spouse : null,
  children: f.bringingChildren ? f.children : null,
  travel: { ...f.travel, transport: f.travel.transport as Transport },
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const labelSx = { color: 'var(--ibl-text)', fontWeight: 700, fontSize: '0.95rem', mb: 1.25 };
const errorTextSx = { color: 'var(--ibl-danger)', fontSize: '0.8rem', mt: 0.75 };

const YesNo: React.FC<{ value: boolean; onChange: (v: boolean) => void; yes: string; no: string }> = ({ value, onChange, yes, no }) => (
  <Box role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, maxWidth: 420 }}>
    <ChoiceCard selected={value} onClick={() => onChange(true)} title={yes} />
    <ChoiceCard selected={!value} onClick={() => onChange(false)} title={no} />
  </Box>
);

const MediaUploadCard: React.FC<{ t: Strings; lang: Lang; registrationId: string }> = ({ t, lang, registrationId }) => {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${mediaUploadPath(registrationId)}?lang=${lang}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* clipboard unavailable */ }
  };
  return (
    <Box sx={{ ...subPanelSx, mt: 3, textAlign: 'left' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <CloudUploadOutlinedIcon sx={{ color: 'var(--ibl-primary)', fontSize: '2rem' }} />
        <Typography sx={{ color: 'var(--ibl-text)', fontWeight: 700 }}>{t.mediaTitle}</Typography>
      </Box>
      <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.88rem', mb: 1.5 }}>{t.mediaBody}</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button component={RouterLink} to={`${mediaUploadPath(registrationId)}?lang=${lang}`} variant="contained"
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: 'var(--ibl-on-primary)', bgcolor: 'var(--ibl-primary)' }}>
          {t.mediaButton}
        </Button>
        <Button onClick={copy} variant="outlined"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', color: 'var(--ibl-primary)', borderColor: 'var(--ibl-primary)' }}>
          {copied ? t.linkCopied : t.copyLink}
        </Button>
      </Box>
    </Box>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Registration: React.FC = () => {
  const [lang, changeLang] = useLang();
  const [open, setOpen] = useState(isRegistrationOpen);
  const [form, setForm] = useState<FormState>(initialForm);
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [done, setDone] = useState(false);
  const [registrationId, setRegistrationId] = useState('');

  const t = STRINGS[lang];
  const locale = LOCALES[lang];

  const errors = useMemo(() => (submitted ? validate(form, t.errors) : {}), [submitted, form, t]);
  const fee = calculateHotelFee(form);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const setTravel = (patch: Partial<FormState['travel']>) => setForm((f) => ({ ...f, travel: { ...f.travel, ...patch } }));
  const setChildren = (patch: Partial<ChildrenInfo>) => setForm((f) => ({ ...f, children: { ...f.children, ...patch } }));
  const toggleDay = (d: string) => set({
    attendanceDays: form.attendanceDays.includes(d)
      ? form.attendanceDays.filter((x) => x !== d)
      : CONFERENCE_DAYS.filter((x) => x === d || form.attendanceDays.includes(x)),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(false);
    const errs = validate(form, t.errors);
    if (Object.keys(errs).length > 0) {
      const first = Object.keys(errs)[0];
      const el = document.querySelector(`[name="${first}"]`) ?? document.getElementById(`reg-${first.split('.')[0]}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!isRegistrationOpen()) { setOpen(false); return; }

    setSubmitting(true);
    try {
      const id = newRegistrationId();
      // Honeypot filled → a bot. Pretend it worked without saving anything.
      if (!honeypot) await createRegistration(id, toInput(form, lang));
      setRegistrationId(id);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      if (!isRegistrationOpen()) { setOpen(false); return; }
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <PageShell showDeadline={open && !done} t={t} lang={lang} onLangChange={changeLang}>{children}</PageShell>
  );

  if (!open) {
    return shell(
      <CenterCard>
        <LockClockIcon sx={{ fontSize: 56, color: 'var(--ibl-primary)', mb: 1.5 }} />
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.6rem', mb: 1 }}>
          {t.closedTitle}
        </Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.7 }}>
          {t.closedBody(closeDateLabel(locale))}
        </Typography>
      </CenterCard>,
    );
  }

  if (done) {
    return shell(
      <CenterCard>
        <CheckCircleIcon sx={{ fontSize: 64, color: 'var(--ibl-success)', mb: 1.5 }} />
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.6rem', mb: 1 }}>
          {t.successTitle(form.registrant.firstName)}
        </Typography>
        <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.7 }}>
          {t.successBody(t.conferenceName)}
        </Typography>
        {form.category !== 'missionary' && fee > 0 && (
          <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.9rem', mt: 2 }}>
            {t.successFee} <strong style={{ color: 'var(--ibl-primary-dark)' }}>${fee.toLocaleString('en-US')}</strong> {t.successFeeNote}
          </Typography>
        )}
        {form.category === 'missionary' && !honeypot && isMediaUploadOpen() && (
          <MediaUploadCard t={t} lang={lang} registrationId={registrationId} />
        )}
        <Button onClick={() => { setForm(initialForm()); setSubmitted(false); setDone(false); }}
          sx={{ mt: 3, textTransform: 'none', fontWeight: 600, color: 'var(--ibl-primary)' }}>
          {t.registerAnother}
        </Button>
      </CenterCard>,
    );
  }

  const isMissionary = form.category === 'missionary';
  const showPickup = form.travel.transport !== '' && form.travel.transport !== 'car';
  let step = 0;

  return shell(
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{
      position: 'relative', maxWidth: 1080, mx: 'auto', mt: { xs: -4, md: -5 }, px: { xs: 2, md: 3 },
      display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 300px' }, gap: 3, alignItems: 'start',
    }}>
      <Box>
        {/* Honeypot */}
        <div className="reg-hp" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
        </div>

        <FormSection step={++step} title={t.participationTitle} subtitle={t.participationSub}>
          <Box id="reg-category" role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            {(Object.keys(CATEGORY_ICONS) as Category[]).map((c) => (
              <ChoiceCard key={c} selected={form.category === c} onClick={() => set({ category: c })}
                title={t.categories[c].label} description={t.categories[c].description} icon={CATEGORY_ICONS[c]} error={!!errors.category} />
            ))}
          </Box>
          {errors.category && <Typography sx={errorTextSx}>{errors.category}</Typography>}

          <Collapse in={isMissionary} unmountOnExit>
            <Box sx={{ ...subPanelSx, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label={t.missionaryBoard} name="missionaryBoard" required fullWidth
                value={form.missionaryBoard} onChange={(e) => set({ missionaryBoard: e.target.value })}
                error={!!errors.missionaryBoard} helperText={errors.missionaryBoard} />
              <TextField label={t.sendingChurch} name="sendingChurch" required fullWidth
                value={form.sendingChurch} onChange={(e) => set({ sendingChurch: e.target.value })}
                error={!!errors.sendingChurch} helperText={errors.sendingChurch} />
            </Box>
          </Collapse>
        </FormSection>

        <FormSection step={++step} title={t.yourInfo}>
          <PersonFields prefix="registrant" value={form.registrant} errors={errors} labels={t.person} requireContact
            onChange={(p) => set({ registrant: { ...form.registrant, ...p } })} />
        </FormSection>

        <FormSection step={++step} title={t.familyTitle} subtitle={t.familySub}>
          <Typography sx={labelSx}>{t.spouseQuestion}</Typography>
          <YesNo value={form.bringingSpouse} onChange={(v) => set({ bringingSpouse: v })} yes={t.spouseYes} no={t.no} />
          <Collapse in={form.bringingSpouse} unmountOnExit>
            <Box sx={subPanelSx}>
              <Typography sx={{ ...labelSx, color: 'var(--ibl-primary-dark)' }}>{t.spouseInfo}</Typography>
              <PersonFields prefix="spouse" value={form.spouse} errors={errors} labels={t.person} hideAddress={form.spouse.sameAddress}
                onChange={(p) => set({ spouse: { ...form.spouse, ...p } })} />
              <FormControlLabel sx={{ mt: 1 }}
                control={<Switch checked={form.spouse.sameAddress} onChange={(e) => set({ spouse: { ...form.spouse, sameAddress: e.target.checked } })} />}
                label={<Typography sx={{ fontSize: '0.92rem', color: 'var(--ibl-text-body)' }}>{t.sameAddress}</Typography>} />
            </Box>
          </Collapse>

          <Typography sx={{ ...labelSx, mt: 3 }}>{t.childrenQuestion}</Typography>
          <YesNo value={form.bringingChildren} onChange={(v) => set({ bringingChildren: v })} yes={t.yes} no={t.no} />
          <Collapse in={form.bringingChildren} unmountOnExit>
            <Box sx={{ ...subPanelSx, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 2fr' }, gap: 2 }}>
              <TextField label={t.childrenCount} name="children.count" type="number" required
                value={form.children.count} onChange={(e) => setChildren({ count: Math.max(0, parseInt(e.target.value) || 0) })}
                slotProps={{ htmlInput: { min: 1, max: 20 } }}
                error={!!errors['children.count']} helperText={errors['children.count']} />
              <TextField label={t.infants} name="children.infants" type="number"
                value={form.children.infants} onChange={(e) => setChildren({ infants: Math.max(0, parseInt(e.target.value) || 0) })}
                slotProps={{ htmlInput: { min: 0, max: 20 } }}
                error={!!errors['children.infants']} helperText={errors['children.infants']} />
              <TextField label={t.ages} placeholder={t.agesPlaceholder} sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                value={form.children.ages} onChange={(e) => setChildren({ ages: e.target.value })} />
              <TextField label={t.childrenNotes} multiline minRows={2} sx={{ gridColumn: '1 / -1' }}
                value={form.children.notes} onChange={(e) => setChildren({ notes: e.target.value })} />
            </Box>
          </Collapse>
        </FormSection>

        <FormSection step={++step} title={t.daysTitle} subtitle={isMissionary ? t.daysSubMissionary : t.daysSub(HOTEL_FEE_PER_DAY)}>
          <Box id="reg-attendanceDays" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
            {CONFERENCE_DAYS.map((d) => (
              <ChoiceCard key={d} role="checkbox" selected={form.attendanceDays.includes(d)} onClick={() => toggleDay(d)}
                title={capitalize(formatConferenceDay(d, { weekday: 'long' }, locale))}
                description={formatConferenceDay(d, { day: 'numeric', month: 'long' }, locale)}
                error={!!errors.attendanceDays} />
            ))}
          </Box>
          {errors.attendanceDays && <Typography sx={errorTextSx}>{errors.attendanceDays}</Typography>}
        </FormSection>

        <FormSection step={++step} title={t.travelTitle} subtitle={t.travelSub}>
          <Typography sx={labelSx}>{t.howArrive}</Typography>
          <Box id="reg-travel" role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
            {(Object.keys(TRANSPORT_LABELS) as Transport[]).map((tr) => (
              <ChoiceCard key={tr} selected={form.travel.transport === tr} onClick={() => setTravel({ transport: tr })}
                title={t.transport[tr]} icon={TRANSPORT_ICONS[tr]} error={!!errors['travel.transport']} />
            ))}
          </Box>
          {errors['travel.transport'] && <Typography sx={errorTextSx}>{errors['travel.transport']}</Typography>}

          <Collapse in={form.travel.transport === 'plane'} unmountOnExit>
            <Box sx={{ ...subPanelSx, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <TextField label={t.airline} value={form.travel.airline} onChange={(e) => setTravel({ airline: e.target.value })} />
              <TextField label={t.flightNumber} placeholder={t.flightPlaceholder} value={form.travel.flightNumber} onChange={(e) => setTravel({ flightNumber: e.target.value })} />
              <TextField label={t.airport} value={form.travel.airport} onChange={(e) => setTravel({ airport: e.target.value })} />
            </Box>
          </Collapse>
          <Collapse in={form.travel.transport === 'bus'} unmountOnExit>
            <Box sx={{ ...subPanelSx, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label={t.busCompany} value={form.travel.busCompany} onChange={(e) => setTravel({ busCompany: e.target.value })} />
              <TextField label={t.busStation} value={form.travel.busStation} onChange={(e) => setTravel({ busStation: e.target.value })} />
            </Box>
          </Collapse>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 3 }}>
            <TextField label={t.arrivalDate} name="travel.arrivalDate" type="date" required
              value={form.travel.arrivalDate} onChange={(e) => setTravel({ arrivalDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: CONFERENCE_DAYS[CONFERENCE_DAYS.length - 1] } }}
              error={!!errors['travel.arrivalDate']} helperText={errors['travel.arrivalDate']} />
            <TextField label={t.arrivalTime} type="time"
              value={form.travel.arrivalTime} onChange={(e) => setTravel({ arrivalTime: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label={t.departureDate} type="date" sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
              value={form.travel.departureDate} onChange={(e) => setTravel({ departureDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.travel.arrivalDate || undefined } }} />
          </Box>

          <Collapse in={showPickup} unmountOnExit>
            <Typography sx={{ ...labelSx, mt: 3 }}>{t.pickupQuestion(form.travel.transport)}</Typography>
            <YesNo value={form.travel.needsPickup} onChange={(v) => setTravel({ needsPickup: v })} yes={t.pickupYes} no={t.pickupNo} />
          </Collapse>

          <TextField label={t.travelNotes} multiline minRows={2} fullWidth sx={{ mt: 3 }}
            value={form.travel.notes} onChange={(e) => setTravel({ notes: e.target.value })} />
        </FormSection>

        <FormSection step={++step} title={t.moreTitle} subtitle={t.moreSub}>
          <TextField label={t.comments} multiline minRows={3} fullWidth
            value={form.specialNeeds} onChange={(e) => set({ specialNeeds: e.target.value })} />
        </FormSection>
      </Box>

      {/* Summary + submit — sticky sidebar on desktop, below the form on mobile */}
      <Box sx={{ position: { md: 'sticky' }, top: { md: 24 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <RegistrationSummary form={form} t={t} locale={locale} />
        {submitted && Object.keys(errors).length > 0 && (
          <Typography sx={{ ...errorTextSx, mt: 0, textAlign: 'center' }}>{t.fixErrors}</Typography>
        )}
        {submitError && <Typography sx={{ ...errorTextSx, mt: 0, textAlign: 'center' }}>{t.submitError}</Typography>}
        <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{
          py: 1.6, borderRadius: '12px', textTransform: 'none', fontWeight: 800, fontSize: '1.05rem',
          color: 'var(--ibl-on-primary)',
          background: 'linear-gradient(135deg, var(--ibl-primary-dark) 0%, var(--ibl-primary) 100%)',
          boxShadow: '0 8px 20px color-mix(in srgb, var(--ibl-primary) 35%, transparent)',
          '&:hover': { boxShadow: '0 10px 26px color-mix(in srgb, var(--ibl-primary) 45%, transparent)' },
        }}>
          {submitting ? <CircularProgress size={24} sx={{ color: 'var(--ibl-on-primary)' }} /> : t.submit}
        </Button>
      </Box>
    </Box>,
  );
};

export default Registration;
