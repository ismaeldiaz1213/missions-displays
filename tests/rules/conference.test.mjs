/**
 * Checks the conference settings (settings/conference) that drive the registration deadline and
 * days, and that archived conferences (conferences/{id}) are admin-only.
 *
 * Run it with:  npm run test:rules
 * (that starts the Firestore and Storage emulators; it never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { Timestamp, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const env = await initializeTestEnvironment({
  // Same project as `emulators:exec`, so storage.rules can read Firestore (firestore.get) here.
  projectId: 'demo-ibl-rules',
  firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  storage: { rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 9199 },
});
await env.clearFirestore();
await env.clearStorage();

const admin = env.authenticatedContext('admin', { email: 'oficina@iblibertad.org', email_verified: true });
const outsider = env.authenticatedContext('outsider', { email: 'someone@gmail.com', email_verified: true });
const anonymous = env.unauthenticatedContext();

const DAYS = ['2027-11-01', '2027-11-02', '2027-11-03', '2027-11-04'];
const FUTURE = Timestamp.fromMillis(Date.UTC(2100, 0, 1));
const PAST = Timestamp.fromMillis(Date.UTC(2020, 0, 1));

const settings = (over = {}) => ({
  name: 'Conferencia y Escuela de Misiones 2027', nameEn: 'Missions Conference & School 2027',
  days: DAYS, registrationOpen: true, registrationClosesAt: FUTURE, mediaUploadsCloseAt: FUTURE,
  updatedAt: serverTimestamp(), ...over,
});
// Sets the conference directly, bypassing the rules, for the registration checks.
const useConference = (over = {}) => env.withSecurityRulesDisabled((ctx) =>
  setDoc(doc(ctx.firestore(), 'settings/conference'), { ...settings(over), updatedAt: Timestamp.now() }));

const reg = (over = {}) => ({
  language: 'es', category: 'missionary',
  registrant: { firstName: 'Juan', lastName: 'Pérez', email: 'j@x.com', phone: '555', address: { street: '', city: '', state: '', zip: '', country: '' } },
  homeChurch: 'IBL', homeChurchCity: 'Houston', missionaryBoard: 'BIMI', sendingChurch: 'IBL',
  bringingWife: false, wife: null, bringingChildren: false, children: null,
  attendanceDays: DAYS, needsLodging: true,
  travel: {
    needsPickup: false, transport: '', airline: '', flightNumber: '', airport: '', busCompany: '', busStation: '',
    transportDetails: '', pickupLocation: '', arrivalDate: '2027-11-01', arrivalTime: '', departureDate: '',
    arrivingByRV: false, notes: '',
  },
  heardAbout: 'friend', heardAboutOther: '', specialNeeds: '',
  hotelFee: 0, createdAt: serverTimestamp(), ...over,
});

let pass = 0, fail = 0, n = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};
const register = (over) => setDoc(doc(anonymous.firestore(), `registrations/r${n++}`), reg(over));
const conf = (ctx) => doc(ctx.firestore(), 'settings/conference');

console.log('conference settings');
await check('no settings yet → registration closed', assertFails(register({})));

await check('admin saves the conference', assertSucceeds(setDoc(conf(admin), settings())));
await check('anyone can read it (the registration page needs it)', assertSucceeds(getDoc(conf(anonymous))));
await check('outsider cannot change it', assertFails(setDoc(conf(outsider), settings())));
await check('anonymous cannot change it', assertFails(setDoc(conf(anonymous), settings())));
await check('missing name rejected', assertFails(setDoc(conf(admin), settings({ name: '' }))));
await check('no days rejected', assertFails(setDoc(conf(admin), settings({ days: [] }))));
await check('deadline as text rejected', assertFails(setDoc(conf(admin), settings({ registrationClosesAt: '2027-10-29' }))));
await check('extra field rejected', assertFails(setDoc(conf(admin), settings({ fee: 0 }))));
await check('backdated updatedAt rejected', assertFails(setDoc(conf(admin), settings({ updatedAt: PAST }))));

console.log('registration follows the settings');
await useConference();
await check('open and before the deadline → accepted', assertSucceeds(register({})));
await check('a day that is not a conference day rejected', assertFails(register({ attendanceDays: ['2026-11-02'] })));
await check('a subset of the days accepted', assertSucceeds(register({ attendanceDays: DAYS.slice(1, 3) })));
await useConference({ registrationOpen: false });
await check('turned off by an admin → rejected', assertFails(register({})));
await useConference({ registrationClosesAt: PAST });
await check('after the deadline → rejected', assertFails(register({})));

console.log('video uploads follow the settings');
const video = () => new Uint8Array([0, 0, 0, 0]);
const upload = (ctx, id) => uploadBytes(ref(ctx.storage(), `conference-media/${id}/v${n++}.mp4`), video(), { contentType: 'video/mp4' });
await useConference();
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'registrations/m1'), reg({ createdAt: Timestamp.now() })));
await check('missionary uploads before mediaUploadsCloseAt', assertSucceeds(upload(anonymous, 'm1')));
await useConference({ mediaUploadsCloseAt: PAST });
await check('upload after mediaUploadsCloseAt rejected', assertFails(upload(anonymous, 'm1')));

console.log('archives');
const archived = (ctx) => doc(ctx.firestore(), 'conferences/2026/registrations/r1');
await check('admin copies a registration into the archive', assertSucceeds(setDoc(archived(admin), reg({ createdAt: PAST }))));
await check('admin writes the archive summary', assertSucceeds(setDoc(doc(admin.firestore(), 'conferences/2026'), { name: '2026', registrationCount: 1 })));
await check('admin reads the archive', assertSucceeds(getDoc(archived(admin))));
await check('outsider cannot read the archive', assertFails(getDoc(archived(outsider))));
await check('anonymous cannot read the archive', assertFails(getDoc(archived(anonymous))));
await check('anonymous cannot write the archive', assertFails(setDoc(doc(anonymous.firestore(), 'conferences/2026/registrations/x'), reg())));
await check('outsider cannot delete the archive', assertFails(deleteDoc(archived(outsider))));
await check('admin deletes the archive', assertSucceeds(deleteDoc(archived(admin))));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
