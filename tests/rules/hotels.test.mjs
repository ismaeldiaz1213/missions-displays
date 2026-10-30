/**
 * Checks that only church admins can read or change the hotel list and room assignments.
 *
 * Run it with:  npm run test:rules
 * (that starts the Firestore emulator; it never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { Timestamp, deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-hotels',
  firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
await env.clearFirestore();

const HOTELS = [{ id: 'h1', name: 'Hotel 1', color: '#2563EB' }, { id: 'h2', name: 'Hotel 2', color: '#16A34A' }];
const settings = (over = {}) => ({ hotels: HOTELS, assignments: { r1: 'h1' }, updatedAt: serverTimestamp(), ...over });

const admin = env.authenticatedContext('admin', { email: 'oficina@iblibertad.org', email_verified: true }).firestore();
const outsider = env.authenticatedContext('outsider', { email: 'someone@gmail.com', email_verified: true }).firestore();
const anonymous = env.unauthenticatedContext().firestore();
const ref = (db) => doc(db, 'settings/hotels');

let pass = 0, fail = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};

console.log('hotel rules');

await check('admin saves the hotel list', assertSucceeds(setDoc(ref(admin), settings())));
await check('admin reads it', assertSucceeds(getDoc(ref(admin))));
await check('admin assigns one registration', assertSucceeds(updateDoc(ref(admin), { 'assignments.r2': 'h2', updatedAt: serverTimestamp() })));
await check('admin removes an assignment', assertSucceeds(updateDoc(ref(admin), { 'assignments.r1': deleteField(), updatedAt: serverTimestamp() })));

await check('unknown field rejected', assertFails(setDoc(ref(admin), settings({ paid: true }))));
await check('missing updatedAt rejected', assertFails(updateDoc(ref(admin), { 'assignments.r3': 'h1' })));
await check('backdated updatedAt rejected', assertFails(setDoc(ref(admin), settings({ updatedAt: Timestamp.fromMillis(0) }))));
await check('hotels not a list rejected', assertFails(setDoc(ref(admin), settings({ hotels: 'Hotel 1' }))));

await check('outsider cannot read', assertFails(getDoc(ref(outsider))));
await check('anonymous cannot read', assertFails(getDoc(ref(anonymous))));
await check('outsider cannot write', assertFails(setDoc(ref(outsider), settings())));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
