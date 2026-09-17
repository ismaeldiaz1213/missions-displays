import React, { useMemo, useState } from 'react';
import {
  Box, Button, CircularProgress, Collapse, TextField, Typography,
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import ChurchIcon from '@mui/icons-material/Church';
import CampaignIcon from '@mui/icons-material/Campaign';
import PersonIcon from '@mui/icons-material/Person';
import LockClockIcon from '@mui/icons-material/LockClock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { createRegistration, mediaUploadPath, newRegistrationId } from '../data/registrations';
import FormSection from './components/FormSection';
import ChoiceCard from './components/ChoiceCard';
import PersonFields from './components/PersonFields';
import RegistrationSummary from './components/RegistrationSummary';
import MediaUploader from './components/MediaUploader';
import PageShell, { CenterCard } from './components/PageShell';
import { subPanelSx } from './styles';
import {
  CATEGORIES,
  CONFERENCE_DAYS,
  HEARD_ABOUT,
  HOTEL_FEE_PER_DAY,
  calculateHotelFee,
  canUploadMedia,
  closeDateLabel,
  formatConferenceDay,
  isFreeCategory,
  isMediaUploadOpen,
  isRegistrationOpen,
  mediaUploadsCloseLabel,
  type Category,
  type ChildrenInfo,
  type HeardAbout,
  type PersonInfo,
  type RegistrationInput,
  type TravelInfo,
  type WifeInfo,
} from './conference';
import { LOCALES, STRINGS, useLang, type Lang, type Strings } from './i18n';

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  missionary: <PublicIcon />, evangelist: <CampaignIcon />, pastor: <ChurchIcon />, layman: <PersonIcon />,
};

const emptyContact = (): WifeInfo => ({ firstName: '', lastName: '', email: '', phone: '' });

type FormState = Omit<RegistrationInput, 'language' | 'category' | 'wife' | 'children' | 'travel' | 'heardAbout'> & {
  category: Category | '';
  registrant: PersonInfo;
  wife: WifeInfo;
  children: ChildrenInfo;
  travel: Omit<TravelInfo, 'needsPickup'> & { needsPickup: boolean | null };
  heardAbout: HeardAbout | '';
};

const initialForm = (): FormState => ({
  category: '',
  registrant: { ...emptyContact(), address: { street: '', city: '', state: '', zip: '', country: '' } },
  homeChurch: '',
  homeChurchCity: '',
  missionaryBoard: '',
  sendingChurch: '',
  bringingWife: false,
  wife: emptyContact(),
  bringingChildren: false,
  children: { count: 1, infants: 0, ages: '', notes: '' },
  attendanceDays: [...CONFERENCE_DAYS],
  travel: {
    needsPickup: null, airline: '', flightNumber: '', airport: '', arrivalDate: '', arrivalTime: '',
    departureDate: '', arrivingByRV: false, notes: '',
  },
  heardAbout: '',
  heardAboutOther: '',
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
  req('homeChurch', f.homeChurch);
  req('homeChurchCity', f.homeChurchCity);

  if (f.category === 'missionary') {
    req('missionaryBoard', f.missionaryBoard);
    req('sendingChurch', f.sendingChurch);
  }
  if (f.bringingWife) {
    req('wife.firstName', f.wife.firstName);
    req('wife.lastName', f.wife.lastName);
    if (f.wife.email && !EMAIL_RE.test(f.wife.email.trim())) e['wife.email'] = msg.invalidEmail;
  }
  if (f.bringingChildren && f.children.count < 1) e['children.count'] = msg.min1;
  if (f.bringingChildren && f.children.infants > f.children.count) e['children.infants'] = msg.infantsTooMany;
  if (f.attendanceDays.length === 0) e.attendanceDays = msg.selectDay;

  if (f.travel.needsPickup === null) e['travel.needsPickup'] = msg.required;
  req('travel.arrivalDate', f.travel.arrivalDate);
  if (f.travel.needsPickup) {
    req('travel.airline', f.travel.airline);
    req('travel.flightNumber', f.travel.flightNumber);
    req('travel.airport', f.travel.airport);
    req('travel.arrivalTime', f.travel.arrivalTime);
  }

  if (!f.heardAbout) e.heardAbout = msg.selectHeardAbout;
  if (f.heardAbout === 'other') req('heardAboutOther', f.heardAboutOther);
  return e;
};

const toInput = (f: FormState, language: Lang): RegistrationInput => {
  const pickup = !!f.travel.needsPickup;
  return {
    ...f,
    language,
    category: f.category as Category,
    // Board and sending church only apply to missionaries
    missionaryBoard: f.category === 'missionary' ? f.missionaryBoard : '',
    sendingChurch: f.category === 'missionary' ? f.sendingChurch : '',
    wife: f.bringingWife ? f.wife : null,
    children: f.bringingChildren ? f.children : null,
    travel: {
      ...f.travel,
      needsPickup: pickup,
      // Flight details only matter for pickups; RV only for people who drive in
      airline: pickup ? f.travel.airline : '',
      flightNumber: pickup ? f.travel.flightNumber : '',
      airport: pickup ? f.travel.airport : '',
      arrivalTime: pickup ? f.travel.arrivalTime : '',
      arrivingByRV: !pickup && f.travel.arrivingByRV,
    },
    heardAbout: f.heardAbout as HeardAbout,
    heardAboutOther: f.heardAbout === 'other' ? f.heardAboutOther : '',
  };
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const labelSx = { color: 'var(--ibl-text)', fontWeight: 700, fontSize: '0.95rem', mb: 1.25 };
const errorTextSx = { color: 'var(--ibl-danger)', fontSize: '0.8rem', mt: 0.75 };
const primaryButtonSx = {
  py: 1.6, borderRadius: '12px', textTransform: 'none', fontWeight: 800, fontSize: '1.05rem',
  color: 'var(--ibl-on-primary)',
  background: 'linear-gradient(135deg, var(--ibl-primary-dark) 0%, var(--ibl-primary) 100%)',
  boxShadow: '0 8px 20px color-mix(in srgb, var(--ibl-primary) 35%, transparent)',
  '&:hover': { boxShadow: '0 10px 26px color-mix(in srgb, var(--ibl-primary) 45%, transparent)' },
};

const YesNo: React.FC<{ value: boolean | null; onChange: (v: boolean) => void; yes: string; no: string; error?: boolean; id?: string }> = ({ value, onChange, yes, no, error, id }) => (
  <Box id={id} role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, maxWidth: 420 }}>
    <ChoiceCard selected={value === true} onClick={() => onChange(true)} title={yes} error={error} />
    <ChoiceCard selected={value === false} onClick={() => onChange(false)} title={no} error={error} />
  </Box>
);

const StepIndicator: React.FC<{ labels: string[]; current: number }> = ({ labels, current }) => (
  <Box component="ol" sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, listStyle: 'none', p: 0, m: 0, mb: 3, flexWrap: 'wrap' }}>
    {labels.map((label, i) => {
      const state = i < current ? 'done' : i === current ? 'current' : 'todo';
      return (
        <Box component="li" key={label} aria-current={state === 'current' ? 'step' : undefined} sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: '999px',
          bgcolor: state === 'current' ? 'var(--ibl-primary)' : 'var(--ibl-surface)',
          border: '1px solid', borderColor: state === 'todo' ? 'var(--ibl-border)' : 'var(--ibl-primary)',
          color: state === 'current' ? 'var(--ibl-on-primary)' : state === 'done' ? 'var(--ibl-primary)' : 'var(--ibl-text-muted)',
          fontWeight: 700, fontSize: '0.85rem',
        }}>
          {state === 'done' ? <CheckCircleIcon sx={{ fontSize: '1rem' }} /> : <span>{i + 1}</span>}
          {label}
        </Box>
      );
    })}
  </Box>
);

const InfoPanel: React.FC<{ t: Strings; locale: string }> = ({ t, locale }) => {
  const day = (iso: string) => formatConferenceDay(iso, { weekday: 'long', day: 'numeric', month: 'long' }, locale);
  return (
    <Box component="section" sx={{
      mb: 3, p: { xs: 2.5, md: 3 }, borderRadius: '16px',
      bgcolor: 'color-mix(in srgb, var(--ibl-accent) 10%, var(--ibl-surface))',
      border: '1px solid color-mix(in srgb, var(--ibl-accent) 35%, transparent)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: 'var(--ibl-primary-dark)' }} />
        <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.05rem' }}>{t.infoTitle}</Typography>
      </Box>
      <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {t.infoItems(day(CONFERENCE_DAYS[0]), day(CONFERENCE_DAYS[CONFERENCE_DAYS.length - 1])).map((item) => (
          <Typography component="li" key={item} sx={{ color: 'var(--ibl-text-body)', fontSize: '0.92rem', lineHeight: 1.55 }}>{item}</Typography>
        ))}
        <Typography component="li" sx={{ color: 'var(--ibl-text-body)', fontSize: '0.92rem', lineHeight: 1.55, fontWeight: 700 }}>{t.infoVideoNote}</Typography>
      </Box>
    </Box>
  );
};

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
      <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.88rem', mb: 1 }}>{t.mediaBody}</Typography>
      <Typography sx={{ color: 'var(--ibl-text)', fontSize: '0.82rem', fontFamily: 'monospace', wordBreak: 'break-all', mb: 1.5 }}>{link}</Typography>
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

type Phase = 'form' | 'media' | 'done';

const Registration: React.FC = () => {
  const [lang, changeLang] = useLang();
  const [open, setOpen] = useState(isRegistrationOpen);
  const [form, setForm] = useState<FormState>(initialForm);
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [registrationId, setRegistrationId] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);

  const t = STRINGS[lang];
  const locale = LOCALES[lang];

  const errors = useMemo(() => (submitted ? validate(form, t.errors) : {}), [submitted, form, t]);
  const fee = calculateHotelFee(form);
  // Missionaries/evangelists get a video step after the form (while uploads are open)
  const hasMediaStep = canUploadMedia(form.category) && isMediaUploadOpen() && !honeypot;

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const setTravel = (patch: Partial<FormState['travel']>) => setForm((f) => ({ ...f, travel: { ...f.travel, ...patch } }));
  const setChildren = (patch: Partial<ChildrenInfo>) => setForm((f) => ({ ...f, children: { ...f.children, ...patch } }));
  const toggleDay = (d: string) => set({
    attendanceDays: form.attendanceDays.includes(d)
      ? form.attendanceDays.filter((x) => x !== d)
      : CONFERENCE_DAYS.filter((x) => x === d || form.attendanceDays.includes(x)),
  });

  const goTo = (next: Phase) => {
    setPhase(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(false);
    const errs = validate(form, t.errors);
    if (Object.keys(errs).length > 0) {
      const first = Object.keys(errs)[0];
      const el = document.querySelector(`[name="${first}"]`) ?? document.getElementById(`reg-${first.split('.').pop()}`);
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
      goTo(hasMediaStep ? 'media' : 'done');
    } catch (err) {
      console.error(err);
      if (!isRegistrationOpen()) { setOpen(false); return; }
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <PageShell showDeadline={open && phase === 'form'} t={t} lang={lang} onLangChange={changeLang}>{children}</PageShell>
  );

  if (!open && phase === 'form') {
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

  if (phase === 'media') {
    return shell(
      <Box sx={{ maxWidth: 720, mx: 'auto', mt: { xs: -4, md: -5 }, px: 2, position: 'relative' }}>
        <StepIndicator labels={t.steps} current={1} />
        <Box className="reg-reveal" sx={{
          bgcolor: 'var(--ibl-surface)', borderRadius: '20px', p: { xs: 2.5, md: 4 },
          boxShadow: '0 15px 40px color-mix(in srgb, var(--ibl-primary-dark) 15%, transparent)',
        }}>
          <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.5rem' }, mb: 0.75 }}>
            {t.uploadTitle}
          </Typography>
          <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.6, mb: 1 }}>{t.uploadIntro}</Typography>
          <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.88rem', mb: 2.5 }}>
            {t.uploadLater} {t.uploadClosesOn(mediaUploadsCloseLabel(locale))}
          </Typography>
          <MediaUploader registrationId={registrationId} t={t} onUploadingChange={setMediaUploading} />
          <Button fullWidth variant="contained" size="large" disabled={mediaUploading} onClick={() => goTo('done')} sx={{ ...primaryButtonSx, mt: 3 }}>
            {t.finish}
          </Button>
        </Box>
      </Box>,
    );
  }

  if (phase === 'done') {
    return shell(
      <>
        {hasMediaStep && (
          <Box sx={{ maxWidth: 560, mx: 'auto', mt: { xs: -4, md: -5 }, mb: { xs: 5, md: 6 }, px: 2, position: 'relative' }}>
            <StepIndicator labels={t.steps} current={2} />
          </Box>
        )}
        <CenterCard>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'var(--ibl-success)', mb: 1.5 }} />
          <Typography component="h2" sx={{ color: 'var(--ibl-primary-dark)', fontWeight: 800, fontSize: '1.6rem', mb: 1 }}>
            {t.successTitle(form.registrant.firstName)}
          </Typography>
          <Typography sx={{ color: 'var(--ibl-text-body)', lineHeight: 1.7 }}>
            {t.successBody(t.conferenceName)}
          </Typography>
          {!isFreeCategory(form.category) && fee > 0 && (
            <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.9rem', mt: 2 }}>
              {t.successFee} <strong style={{ color: 'var(--ibl-primary-dark)' }}>${fee.toLocaleString('en-US')}</strong> {t.successFeeNote}
            </Typography>
          )}
          {hasMediaStep && <MediaUploadCard t={t} lang={lang} registrationId={registrationId} />}
          <Button onClick={() => { setForm(initialForm()); setSubmitted(false); goTo('form'); }}
            sx={{ mt: 3, textTransform: 'none', fontWeight: 600, color: 'var(--ibl-primary)' }}>
            {t.registerAnother}
          </Button>
        </CenterCard>
      </>,
    );
  }

  const isMissionary = form.category === 'missionary';
  const pickup = form.travel.needsPickup;
  let step = 0;

  return shell(
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{
      position: 'relative', maxWidth: 1080, mx: 'auto', mt: { xs: -4, md: -5 }, px: { xs: 2, md: 3 },
      display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 300px' }, gap: 3, alignItems: 'start',
    }}>
      <Box>
        {hasMediaStep && <StepIndicator labels={t.steps} current={0} />}
        <InfoPanel t={t} locale={locale} />

        {/* Honeypot */}
        <div className="reg-hp" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
        </div>

        <FormSection step={++step} title={t.participationTitle} subtitle={t.participationSub}>
          <Box id="reg-category" role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            {CATEGORIES.map((c) => (
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '3fr 2fr' }, gap: 2, mt: 2 }}>
            <TextField label={t.homeChurch} name="homeChurch" required fullWidth
              value={form.homeChurch} onChange={(e) => set({ homeChurch: e.target.value })}
              error={!!errors.homeChurch} helperText={errors.homeChurch} />
            <TextField label={t.homeChurchCity} name="homeChurchCity" required fullWidth
              value={form.homeChurchCity} onChange={(e) => set({ homeChurchCity: e.target.value })}
              error={!!errors.homeChurchCity} helperText={errors.homeChurchCity} />
          </Box>
        </FormSection>

        <FormSection step={++step} title={t.familyTitle} subtitle={t.familySub}>
          <Typography sx={labelSx}>{t.wifeQuestion}</Typography>
          <YesNo value={form.bringingWife} onChange={(v) => set({ bringingWife: v })} yes={t.wifeYes} no={t.no} />
          <Collapse in={form.bringingWife} unmountOnExit>
            <Box sx={subPanelSx}>
              <Typography sx={{ ...labelSx, color: 'var(--ibl-primary-dark)' }}>{t.wifeInfo}</Typography>
              <PersonFields prefix="wife" value={form.wife} errors={errors} labels={t.person}
                onChange={(p) => set({ wife: { ...form.wife, ...p } })} />
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

        <FormSection step={++step} title={t.daysTitle} subtitle={isFreeCategory(form.category) ? t.daysSubFree : t.daysSub(HOTEL_FEE_PER_DAY)}>
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
          <Typography sx={labelSx}>{t.pickupQuestion}</Typography>
          <YesNo id="reg-needsPickup" value={pickup} onChange={(v) => setTravel({ needsPickup: v })} yes={t.pickupYes} no={t.pickupNo}
            error={!!errors['travel.needsPickup']} />
          {errors['travel.needsPickup'] && <Typography sx={errorTextSx}>{errors['travel.needsPickup']}</Typography>}

          <Collapse in={pickup === true} unmountOnExit>
            <Box sx={subPanelSx}>
              <Typography sx={{ ...labelSx, color: 'var(--ibl-primary-dark)' }}>{t.flightInfo}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label={t.airline} name="travel.airline" required
                  value={form.travel.airline} onChange={(e) => setTravel({ airline: e.target.value })}
                  error={!!errors['travel.airline']} helperText={errors['travel.airline']} />
                <TextField label={t.flightNumber} name="travel.flightNumber" required placeholder={t.flightPlaceholder}
                  value={form.travel.flightNumber} onChange={(e) => setTravel({ flightNumber: e.target.value.toUpperCase() })}
                  error={!!errors['travel.flightNumber']} helperText={errors['travel.flightNumber']} />
                <TextField label={t.arrivalDate} name="travel.arrivalDate" type="date" required
                  value={form.travel.arrivalDate} onChange={(e) => setTravel({ arrivalDate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: CONFERENCE_DAYS[CONFERENCE_DAYS.length - 1] } }}
                  error={!!errors['travel.arrivalDate']} helperText={errors['travel.arrivalDate']} />
                <TextField label={t.arrivalTime} name="travel.arrivalTime" type="time" required
                  value={form.travel.arrivalTime} onChange={(e) => setTravel({ arrivalTime: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors['travel.arrivalTime']} helperText={errors['travel.arrivalTime']} />
                <TextField label={t.airport} name="travel.airport" required placeholder={t.airportPlaceholder}
                  value={form.travel.airport} onChange={(e) => setTravel({ airport: e.target.value })}
                  error={!!errors['travel.airport']} helperText={errors['travel.airport']} />
                <TextField label={t.departureDate} type="date"
                  value={form.travel.departureDate} onChange={(e) => setTravel({ departureDate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.travel.arrivalDate || undefined } }} />
              </Box>
            </Box>
          </Collapse>

          <Collapse in={pickup === false} unmountOnExit>
            <Box sx={subPanelSx}>
              <Typography sx={labelSx}>{t.rvQuestion}</Typography>
              <YesNo value={form.travel.arrivingByRV} onChange={(v) => setTravel({ arrivingByRV: v })} yes={t.yes} no={t.no} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2.5 }}>
                <TextField label={t.approxArrivalDate} name="travel.arrivalDate" type="date" required
                  value={form.travel.arrivalDate} onChange={(e) => setTravel({ arrivalDate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: CONFERENCE_DAYS[CONFERENCE_DAYS.length - 1] } }}
                  error={!!errors['travel.arrivalDate']} helperText={errors['travel.arrivalDate']} />
                <TextField label={t.departureDate} type="date"
                  value={form.travel.departureDate} onChange={(e) => setTravel({ departureDate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.travel.arrivalDate || undefined } }} />
              </Box>
            </Box>
          </Collapse>

          <TextField label={t.travelNotes} multiline minRows={2} fullWidth sx={{ mt: 3 }}
            value={form.travel.notes} onChange={(e) => setTravel({ notes: e.target.value })} />
        </FormSection>

        <FormSection step={++step} title={t.moreTitle} subtitle={t.moreSub}>
          <Typography sx={labelSx}>{t.heardAboutQuestion}</Typography>
          <Box id="reg-heardAbout" role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
            {HEARD_ABOUT.map((h) => (
              <ChoiceCard key={h} selected={form.heardAbout === h} onClick={() => set({ heardAbout: h })}
                title={t.heardAbout[h]} error={!!errors.heardAbout} />
            ))}
          </Box>
          {errors.heardAbout && <Typography sx={errorTextSx}>{errors.heardAbout}</Typography>}
          <Collapse in={form.heardAbout === 'other'} unmountOnExit>
            <TextField label={t.heardAboutOther} name="heardAboutOther" required fullWidth sx={{ mt: 2 }}
              value={form.heardAboutOther} onChange={(e) => set({ heardAboutOther: e.target.value })}
              error={!!errors.heardAboutOther} helperText={errors.heardAboutOther} />
          </Collapse>

          <TextField label={t.comments} multiline minRows={3} fullWidth sx={{ mt: 3 }}
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
        <Button type="submit" variant="contained" size="large" disabled={submitting} sx={primaryButtonSx}>
          {submitting ? <CircularProgress size={24} sx={{ color: 'var(--ibl-on-primary)' }} /> : hasMediaStep ? t.next : t.submit}
        </Button>
        {hasMediaStep && (
          <Typography sx={{ color: 'var(--ibl-text-muted)', fontSize: '0.82rem', textAlign: 'center', mt: -1 }}>{t.nextHint}</Typography>
        )}
      </Box>
    </Box>,
  );
};

export default Registration;
