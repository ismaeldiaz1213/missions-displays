/**
 * Checks the rules for private missionary profiles, the page archive, page history, and the
 * contact preference on public page requests.
 *
 * Run it with:  npm run test:rules   (emulators only; never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-rules',
  firestore: { rules: read('firestore.rules'), host: '127.0.0.1', port: 8080 },
});
await env.clearFirestore();

const admin = env.authenticatedContext('admin', { email: 'ayuda@iblibertad.org', email_verified: true }).firestore();
const outsider = env.authenticatedContext('outsider', { email: 'someone@gmail.com', email_verified: true }).firestore();
const anonymous = env.unauthenticatedContext().firestore();

let pass = 0, fail = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};

const profile = { email: 'juan@example.com', phone: '+51 999', preferredContact: 'whatsapp', language: 'es', notes: 'Llamar los martes' };

console.log('profile, archive and history rules');

await check('admin creates a profile', assertSucceeds(setDoc(doc(admin, 'missionaryProfiles/m1'), profile)));
await check('admin reads profiles', assertSucceeds(getDocs(collection(admin, 'missionaryProfiles'))));
await check('anonymous cannot read a profile', assertFails(getDoc(doc(anonymous, 'missionaryProfiles/m1'))));
await check('non-church account cannot read a profile', assertFails(getDoc(doc(outsider, 'missionaryProfiles/m1'))));
await check('non-church account cannot list profiles', assertFails(getDocs(collection(outsider, 'missionaryProfiles'))));
await check('anonymous cannot write a profile', assertFails(setDoc(doc(anonymous, 'missionaryProfiles/m2'), profile)));

await check('admin archives a page', assertSucceeds(setDoc(doc(admin, 'missionaryArchive/m1'), { page: { name: 'Juan' }, wasDraft: false })));
await check('anonymous cannot read the archive', assertFails(getDoc(doc(anonymous, 'missionaryArchive/m1'))));
await check('non-church account cannot write the archive', assertFails(setDoc(doc(outsider, 'missionaryArchive/m3'), { page: {} })));

await check('admin adds a history version', assertSucceeds(setDoc(doc(admin, 'missionaryHistory/m1/versions/v1'), { name: 'Juan' })));
await check('history versions cannot be changed', assertFails(updateDoc(doc(admin, 'missionaryHistory/m1/versions/v1'), { name: 'X' })));
await check('history versions cannot be deleted', assertFails(deleteDoc(doc(admin, 'missionaryHistory/m1/versions/v1'))));

// The public request form, with and without the new contact preference
const request = (over = {}) => ({
  language: 'es', name: 'Juan', lastName: 'Pérez', wifeName: '', email: 'juan@example.com', phone: '+51 999',
  organization: 'BIMI', sendingChurch: 'IBL', missionType: '', startYear: '2015', continent: 'south-america',
  city: 'Lima', state: '', country: 'Perú', description: 'Plantando iglesias.', prayerRequests: '',
  contact: { email: '', phone: '', website: '', facebook: '', instagram: '' },
  status: 'pending', createdAt: serverTimestamp(), ...over,
});
await check('request without a contact preference (older form)', assertSucceeds(setDoc(doc(anonymous, 'missionaryRequests/r1'), request())));
await check('request with a contact preference', assertSucceeds(setDoc(doc(anonymous, 'missionaryRequests/r2'),
  request({ preferredContact: 'whatsapp', preferredContactNote: 'Por la tarde' }))));
await check('request with an unknown contact method refused', assertFails(setDoc(doc(anonymous, 'missionaryRequests/r3'),
  request({ preferredContact: 'pigeon' }))));
await check('admin archives a request', assertSucceeds(updateDoc(doc(admin, 'missionaryRequests/r1'), { archived: true })));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
