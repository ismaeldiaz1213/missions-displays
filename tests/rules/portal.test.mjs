/**
 * Checks what a missionary signed in with their email link may do: read their own profile and
 * reports, change how we reach them, and send reports — and nothing for anyone else.
 *
 * Run it with:  npm run test:rules   (emulators only; never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-rules',
  firestore: { rules: read('firestore.rules'), host: '127.0.0.1', port: 8080 },
  storage: { rules: read('storage.rules'), host: '127.0.0.1', port: 9199 },
});
await env.clearFirestore();
await env.clearStorage();

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'missionaryProfiles/m1'), { email: 'Juan@Example.com', ownerEmail: 'juan@example.com', phone: '1', preferredContact: 'email', preferredContactNote: '', language: 'es', notes: 'interno' });
  await setDoc(doc(db, 'missionaryProfiles/m2'), { email: 'ana@example.com', ownerEmail: 'ana@example.com', phone: '2', preferredContact: 'email', language: 'es', notes: '' });
  await setDoc(doc(db, 'missionaryReports/other'), { missionaryId: 'm2', quarterId: '2026-Q1', kind: 'noUpdates' });
  await uploadBytes(ref(ctx.storage(), 'reports/m2/x.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' });
});

// Email-link sign-in gives a verified email; the token may keep the address's original case.
const juanCtx = env.authenticatedContext('juan', { email: 'Juan@Example.com', email_verified: true });
const juan = juanCtx.firestore();
const unverified = env.authenticatedContext('fake', { email: 'juan@example.com', email_verified: false }).firestore();

let pass = 0, fail = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};

const submission = (over = {}) => ({
  missionaryId: 'm1', quarterId: '2026-Q1', kind: 'report', pdfPath: 'reports/m1/q1.pdf', fileName: 'q1.pdf', comments: '',
  submittedBy: 'missionary', submittedAt: serverTimestamp(), reviewedAt: null, reviewedBy: '', reviewNote: '', usedOnPage: '', ...over,
});
const myContact = (over = {}) => updateDoc(doc(juan, 'missionaryProfiles/m1'), {
  phone: '+51 999', preferredContact: 'whatsapp', preferredContactNote: 'tardes', language: 'en', updatedAt: serverTimestamp(), updatedBy: 'missionary', ...over,
});

console.log('missionary portal rules');

await check('missionary finds their profile by email', assertSucceeds(getDocs(query(collection(juan, 'missionaryProfiles'), where('ownerEmail', '==', 'juan@example.com')))));
await check('missionary reads their profile', assertSucceeds(getDoc(doc(juan, 'missionaryProfiles/m1'))));
await check("missionary cannot read someone else's profile", assertFails(getDoc(doc(juan, 'missionaryProfiles/m2'))));
await check('missionary cannot list all profiles', assertFails(getDocs(collection(juan, 'missionaryProfiles'))));
await check('unverified email gets nothing', assertFails(getDoc(doc(unverified, 'missionaryProfiles/m1'))));
await check('missionary updates how to reach them', assertSucceeds(myContact()));
await check('missionary cannot change their sign-in email', assertFails(myContact({ ownerEmail: 'otro@example.com' })));
await check('missionary cannot edit internal notes', assertFails(myContact({ notes: 'x' })));
await check('unknown contact method refused', assertFails(myContact({ preferredContact: 'fax' })));

await check('missionary sends a report', assertSucceeds(setDoc(doc(juan, 'missionaryReports/r1'), submission())));
await check('missionary says "no updates"', assertSucceeds(setDoc(doc(juan, 'missionaryReports/r2'), submission({ kind: 'noUpdates', pdfPath: '', fileName: '' }))));
await check('missionary cannot report as an admin', assertFails(setDoc(doc(juan, 'missionaryReports/r3'), submission({ submittedBy: 'ayuda@iblibertad.org' }))));
await check('missionary cannot report for someone else', assertFails(setDoc(doc(juan, 'missionaryReports/r4'), submission({ missionaryId: 'm2', pdfPath: 'reports/m2/x.pdf' }))));
await check('missionary lists their reports', assertSucceeds(getDocs(query(collection(juan, 'missionaryReports'), where('missionaryId', '==', 'm1')))));
await check("missionary cannot read someone else's report", assertFails(getDoc(doc(juan, 'missionaryReports/other'))));
await check('missionary cannot mark their report reviewed', assertFails(updateDoc(doc(juan, 'missionaryReports/r1'), { reviewedBy: 'me' })));

const upload = (path, type = 'application/pdf') => uploadBytes(ref(juanCtx.storage(), path), new Uint8Array([1, 2]), { contentType: type });
await check('missionary uploads their report PDF', assertSucceeds(upload('reports/m1/portal-q1.pdf')));
await check('missionary reads their report PDF', assertSucceeds(getBytes(ref(juanCtx.storage(), 'reports/m1/portal-q1.pdf'))));
await check("missionary cannot upload to someone else's reports", assertFails(upload('reports/m2/y.pdf')));
await check("missionary cannot read someone else's report PDF", assertFails(getBytes(ref(juanCtx.storage(), 'reports/m2/x.pdf'))));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
