import React, { useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormHelperText, InputLabel, MenuItem, Select, Switch, TextField, Typography,
} from '@mui/material';
import { updateRegistration } from '../../data/registrations';
import PersonFields from '../../Registration/components/PersonFields';
import {
  CATEGORIES, CATEGORY_LABELS, CONFERENCE_DAYS, HEARD_ABOUT, HEARD_ABOUT_LABELS, PICKUP_TRANSPORTS, TRANSPORT_LABELS,
  calculateHotelFee, formatConferenceDay, type Category, type ChildrenInfo, type HeardAbout, type PickupTransport,
  type Registration,
} from '../../Registration/conference';
import { STRINGS } from '../../Registration/i18n';
import { fromRegistration, toInput, validate, type FormState } from '../../Registration/registrationForm';
import { fullName, money } from './registrationData';

// The admin works in Spanish; labels and messages come from the public form so both read the same.
const t = STRINGS.es;

const grid = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 };

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography sx={{ color: 'var(--ibl-primary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
      {title}
    </Typography>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
  </Box>
);

interface Props {
  registration: Registration;
  fullScreen: boolean;
  onSaved: (updated: Registration) => void;
  onClose: () => void;
}

const RegistrationEditDialog: React.FC<Props> = ({ registration: r, fullScreen, onSaved, onClose }) => {
  const [form, setForm] = useState<FormState>(() => fromRegistration(r));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const errors = useMemo(() => (submitted ? validate(form, t.errors) : {}), [submitted, form]);
  const fee = calculateHotelFee(toInput(form, r.language));

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const setTravel = (patch: Partial<FormState['travel']>) => setForm((f) => ({ ...f, travel: { ...f.travel, ...patch } }));
  const setChildren = (patch: Partial<ChildrenInfo>) => setForm((f) => ({ ...f, children: { ...f.children, ...patch } }));
  const toggleDay = (day: string) => set({
    attendanceDays: form.attendanceDays.includes(day)
      ? form.attendanceDays.filter((d) => d !== day)
      : CONFERENCE_DAYS.filter((d) => d === day || form.attendanceDays.includes(d)),
  });

  const text = (key: string, label: string, value: string, onChange: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <TextField label={label} value={value} onChange={(e) => onChange(e.target.value)}
      error={!!errors[key]} helperText={errors[key]} fullWidth {...extra} />
  );
  const count = (key: string, label: string, value: number, onChange: (n: number) => void) => (
    <TextField label={label} type="number" value={value} onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
      error={!!errors[key]} helperText={errors[key]} slotProps={{ htmlInput: { min: 0, max: 20 } }} fullWidth />
  );
  const date = { type: 'date', slotProps: { inputLabel: { shrink: true } } };

  const handleSave = async () => {
    setSubmitted(true);
    setSaveError('');
    if (Object.keys(validate(form, t.errors)).length) return;
    setSaving(true);
    try {
      const input = toInput(form, r.language);
      await updateRegistration(r.id, input);
      onSaved({ ...r, ...input, hotelFee: calculateHotelFee(input) });
    } catch (err) {
      setSaveError(`No se pudo guardar: ${String(err)}`);
      setSaving(false);
    }
  };

  const travel = form.travel;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    // A stray click outside shouldn't throw away edits; close with the buttons.
    <Dialog open onClose={(_, reason) => reason !== 'backdropClick' && !saving && onClose()} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Editar registro · {fullName(r.registrant)}</DialogTitle>
      <DialogContent dividers>
        <Section title="Categoría">
          <FormControl fullWidth>
            <InputLabel>{t.category}</InputLabel>
            <Select value={form.category} label={t.category} onChange={(e) => set({ category: e.target.value as Category })}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{CATEGORY_LABELS[c]}</MenuItem>)}
            </Select>
          </FormControl>
          {form.category === 'missionary' && (
            <Box sx={grid}>
              {text('missionaryBoard', t.missionaryBoard, form.missionaryBoard, (v) => set({ missionaryBoard: v }), { required: true })}
              {text('sendingChurch', t.sendingChurch, form.sendingChurch, (v) => set({ sendingChurch: v }), { required: true })}
            </Box>
          )}
        </Section>

        <Section title="Registrante">
          <PersonFields prefix="registrant" value={form.registrant} onChange={(p) => set({ registrant: { ...form.registrant, ...p } })}
            errors={errors} labels={t.person} requireContact />
          <Box sx={grid}>
            {text('homeChurch', t.homeChurch, form.homeChurch, (v) => set({ homeChurch: v }), { required: true })}
            {text('homeChurchCity', t.homeChurchCity, form.homeChurchCity, (v) => set({ homeChurchCity: v }), { required: true })}
          </Box>
        </Section>

        <Section title={t.familyTitle}>
          <FormControlLabel label="Viene su esposa" control={<Switch checked={form.bringingWife} onChange={(e) => set({ bringingWife: e.target.checked })} />} />
          {form.bringingWife && (
            <PersonFields prefix="wife" value={form.wife} onChange={(p) => set({ wife: { ...form.wife, ...p } })} errors={errors} labels={t.person} />
          )}
          <FormControlLabel label="Trae niños" control={<Switch checked={form.bringingChildren} onChange={(e) => set({ bringingChildren: e.target.checked })} />} />
          {form.bringingChildren && (
            <>
              <Box sx={grid}>
                {count('children.count', t.childrenCount, form.children.count, (n) => setChildren({ count: n }))}
                {count('children.infants', t.infants, form.children.infants, (n) => setChildren({ infants: n }))}
              </Box>
              {text('children.ages', t.ages, form.children.ages, (v) => setChildren({ ages: v }), { placeholder: t.agesPlaceholder })}
              {text('children.notes', t.childrenNotes, form.children.notes, (v) => setChildren({ notes: v }), { multiline: true, minRows: 2 })}
            </>
          )}
        </Section>

        <Section title="Asistencia y hotel">
          <Box>
            {CONFERENCE_DAYS.map((d) => (
              <FormControlLabel key={d} label={formatConferenceDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}
                control={<Checkbox checked={form.attendanceDays.includes(d)} onChange={() => toggleDay(d)} />} />
            ))}
            {errors.attendanceDays && <FormHelperText error>{errors.attendanceDays}</FormHelperText>}
          </Box>
          <FormControlLabel label="Necesita hospedaje" control={<Switch checked={!!form.needsLodging} onChange={(e) => set({ needsLodging: e.target.checked })} />} />
        </Section>

        <Section title={t.travelTitle}>
          <FormControlLabel label="Necesita que lo recojan"
            control={<Switch checked={!!travel.needsPickup} onChange={(e) => setTravel({ needsPickup: e.target.checked, transport: e.target.checked ? travel.transport || 'plane' : '' })} />} />
          {travel.needsPickup ? (
            <>
              <FormControl fullWidth error={!!errors['travel.transport']}>
                <InputLabel>{t.transportQuestion}</InputLabel>
                <Select value={travel.transport} label={t.transportQuestion} onChange={(e) => setTravel({ transport: e.target.value as PickupTransport })}>
                  {PICKUP_TRANSPORTS.map((m) => <MenuItem key={m} value={m}>{TRANSPORT_LABELS[m]}</MenuItem>)}
                </Select>
                {errors['travel.transport'] && <FormHelperText>{errors['travel.transport']}</FormHelperText>}
              </FormControl>
              {travel.transport === 'plane' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  {text('travel.airline', t.airline, travel.airline, (v) => setTravel({ airline: v }), { required: true })}
                  {text('travel.flightNumber', t.flightNumber, travel.flightNumber, (v) => setTravel({ flightNumber: v }), { required: true })}
                  {text('travel.airport', t.airport, travel.airport, (v) => setTravel({ airport: v }), { required: true })}
                </Box>
              )}
              {travel.transport === 'bus' && (
                <Box sx={grid}>
                  {text('travel.busCompany', t.busCompany, travel.busCompany, (v) => setTravel({ busCompany: v }), { required: true })}
                  {text('travel.busStation', t.busStation, travel.busStation, (v) => setTravel({ busStation: v }), { required: true })}
                </Box>
              )}
              {travel.transport === 'other' && (
                <Box sx={grid}>
                  {text('travel.transportDetails', t.transportDetails, travel.transportDetails, (v) => setTravel({ transportDetails: v }), { required: true })}
                  {text('travel.pickupLocation', t.pickupLocation, travel.pickupLocation, (v) => setTravel({ pickupLocation: v }), { required: true })}
                </Box>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                {text('travel.arrivalDate', t.arrivalDate, travel.arrivalDate, (v) => setTravel({ arrivalDate: v }), { ...date, required: true })}
                {text('travel.arrivalTime', t.arrivalTime, travel.arrivalTime, (v) => setTravel({ arrivalTime: v }),
                  { type: 'time', required: true, slotProps: { inputLabel: { shrink: true } } })}
                {text('travel.departureDate', t.departureDate, travel.departureDate, (v) => setTravel({ departureDate: v }), date)}
              </Box>
            </>
          ) : (
            <>
              <Box sx={grid}>
                {text('travel.arrivalDate', t.approxArrivalDate, travel.arrivalDate, (v) => setTravel({ arrivalDate: v }), { ...date, required: true })}
                {text('travel.departureDate', t.departureDate, travel.departureDate, (v) => setTravel({ departureDate: v }), date)}
              </Box>
              <FormControlLabel label="Llega en RV" control={<Switch checked={travel.arrivingByRV} onChange={(e) => setTravel({ arrivingByRV: e.target.checked })} />} />
            </>
          )}
          {text('travel.notes', t.travelNotes, travel.notes, (v) => setTravel({ notes: v }), { multiline: true, minRows: 2 })}
        </Section>

        <Section title="Otros">
          <FormControl fullWidth error={!!errors.heardAbout}>
            <InputLabel>{t.heardAboutQuestion}</InputLabel>
            <Select value={form.heardAbout} label={t.heardAboutQuestion} onChange={(e) => set({ heardAbout: e.target.value as HeardAbout })}>
              {HEARD_ABOUT.map((h) => <MenuItem key={h} value={h}>{HEARD_ABOUT_LABELS[h]}</MenuItem>)}
            </Select>
            {errors.heardAbout && <FormHelperText>{errors.heardAbout}</FormHelperText>}
          </FormControl>
          {form.heardAbout === 'other' && text('heardAboutOther', t.heardAboutOther, form.heardAboutOther, (v) => set({ heardAboutOther: v }), { required: true })}
          {text('specialNeeds', 'Comentarios', form.specialNeeds, (v) => set({ specialNeeds: v }), { multiline: true, minRows: 2 })}
        </Section>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ flex: 1, color: hasErrors || saveError ? 'error.main' : 'text.secondary', fontSize: '0.85rem' }}>
          {saveError || (hasErrors ? t.fixErrors : `Hotel estimado: ${fee ? money(fee) : 'Sin costo'}`)}
        </Typography>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary', textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700, minWidth: 110 }}>
          {saving ? <CircularProgress size={18} /> : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RegistrationEditDialog;
