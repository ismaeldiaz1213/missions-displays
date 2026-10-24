/**
 * Checks that firestore.rules lets admins edit a registration, with the same checks as a new one,
 * and that nobody else can.
 *
 * Run it with:  npm run test:rules
 * (that starts the Firestore emulator; it never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { Timestamp, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-edit',
  firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
await env.clearFirestore();

const DAYS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
const CREATED = Timestamp.fromMillis(Date.UTC(2026, 9, 1));

// What updateRegistration sends: every form field, the recomputed fee, and updatedAt.
const edit = (over = {}) => ({
  language: 'es', category: 'pastor',
  registrant: { firstName: 'Juan', lastName: 'Pérez', email: 'j@x.com', phone: '555', address: { street: '', city: '', state: '', zip: '', country: '' } },
  homeChurch: 'IBL', homeChurchCity: 'Houston', missionaryBoard: '', sendingChurch: '',
  bringingWife: false, wife: null,
  bringingChildren: false, children: null,
  attendanceDays: DAYS, needsLodging: true,
  travel: {
    needsPickup: false, transport: '', airline: '', flightNumber: '', airport: '', busCompany: '', busStation: '',
    transportDetails: '', pickupLocation: '', arrivalDate: '2026-11-02', arrivalTime: '', departureDate: '',
    arrivingByRV: false, notes: '',
  },
  heardAbout: 'friend', heardAboutOther: '', specialNeeds: '',
  hotelFee: 160, updatedAt: serverTimestamp(), ...over,
});

const { updatedAt: _, ...saved } = edit();
let n = 0;
/** A fresh registration as it was saved by the public form, written with the rules off. */
const seed = async () => {
  const id = `r${n++}`;
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), `registrations/${id}`), { ...saved, createdAt: CREATED }));
  return id;
};

const admin = env.authenticatedContext('admin', { email: 'oficina@iblibertad.org', email_verified: true }).firestore();
const unverified = env.authenticatedContext('unverified', { email: 'oficina@iblibertad.org', email_verified: false }).firestore();
const outsider = env.authenticatedContext('outsider', { email: 'someone@gmail.com', email_verified: true }).firestore();
const anonymous = env.unauthenticatedContext().firestore();

const update = async (db, over) => updateDoc(doc(db, `registrations/${await seed()}`), edit(over));

let pass = 0, fail = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};

console.log('registration edit rules');

// Admins can fix anything the form collects, as long as it would pass on create
await check('admin fixes a phone number', assertSucceeds(update(admin, { registrant: { ...saved.registrant, phone: '713-555-0100' } })));
await check('admin adds a wife (fee unchanged, same room)', assertSucceeds(update(admin, {
  bringingWife: true, wife: { firstName: 'Ana', lastName: 'Pérez', email: '', phone: '' },
})));
await check('admin drops two days → fee recomputed to $80', assertSucceeds(update(admin, { attendanceDays: DAYS.slice(0, 2), hotelFee: 80 })));
await check('admin switches to missionary → $0', assertSucceeds(update(admin, {
  category: 'missionary', missionaryBoard: 'BIMI', sendingChurch: 'IBL', hotelFee: 0,
})));
await check('admin adds a flight pickup', assertSucceeds(update(admin, {
  travel: { ...saved.travel, needsPickup: true, transport: 'plane', airline: 'United', flightNumber: 'UA 1', airport: 'IAH', arrivalTime: '14:30' },
})));

// The same validation as the public form
await check('fee that does not match rejected', assertFails(update(admin, { attendanceDays: DAYS.slice(0, 2) })));
await check('blank first name rejected', assertFails(update(admin, { registrant: { ...saved.registrant, firstName: '' } })));
await check('missionary without a board rejected', assertFails(update(admin, { category: 'missionary', hotelFee: 0 })));
await check('pickup without flight details rejected', assertFails(update(admin, { travel: { ...saved.travel, needsPickup: true, transport: 'plane' } })));
await check('unknown field rejected', assertFails(update(admin, { paid: true })));

// The record of when they registered is kept
await check('changing createdAt rejected', assertFails(update(admin, { createdAt: Timestamp.now() })));
await check('missing updatedAt rejected', assertFails((async () => {
  const { updatedAt: _u, ...noStamp } = edit();
  return updateDoc(doc(admin, `registrations/${await seed()}`), noStamp);
})()));
await check('backdated updatedAt rejected', assertFails(update(admin, { updatedAt: CREATED })));

// Only verified church accounts
await check('unverified church email rejected', assertFails(update(unverified, {})));
await check('outside account rejected', assertFails(update(outsider, {})));
await check('anonymous rejected', assertFails(update(anonymous, {})));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
