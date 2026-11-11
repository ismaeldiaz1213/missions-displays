/**
 * Checks the rules for quarterly reports: report documents, their PDFs, and the quarter settings.
 *
 * Run it with:  npm run test:rules   (emulators only; never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-rules',
  firestore: { rules: read('firestore.rules'), host: '127.0.0.1', port: 8080 },
  storage: { rules: read('storage.rules'), host: '127.0.0.1', port: 9199 },
});
await env.clearFirestore();
await env.clearStorage();

const adminCtx = env.authenticatedContext('admin', { email: 'ayuda@iblibertad.org', email_verified: true });
const outsiderCtx = env.authenticatedContext('outsider', { email: 'someone@gmail.com', email_verified: true });
const anonCtx = env.unauthenticatedContext();
const admin = adminCtx.firestore();
const outsider = outsiderCtx.firestore();
const anonymous = anonCtx.firestore();

let pass = 0, fail = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};

const submission = (over = {}) => ({
  missionaryId: 'm1', quarterId: '2026-Q1', kind: 'report', pdfPath: 'reports/m1/q1.pdf', fileName: 'q1.pdf',
  comments: 'Bautizamos a 3 personas.', submittedBy: 'ayuda@iblibertad.org',
  submittedAt: serverTimestamp(), reviewedAt: null, reviewedBy: '', reviewNote: '', usedOnPage: '', ...over,
});
const upload = (ctx, path, type) => uploadBytes(ref(ctx.storage(), path), new Uint8Array([1, 2, 3]), { contentType: type });

console.log('quarterly report rules');

await check('admin adds a report', assertSucceeds(setDoc(doc(admin, 'missionaryReports/r1'), submission())));
await check('admin records "no updates"', assertSucceeds(setDoc(doc(admin, 'missionaryReports/r2'), submission({ kind: 'noUpdates', pdfPath: '', fileName: '', comments: '' }))));
await check('report with comments only', assertSucceeds(setDoc(doc(admin, 'missionaryReports/r3'), submission({ pdfPath: '', fileName: '' }))));
await check('empty report refused', assertFails(setDoc(doc(admin, 'missionaryReports/r4'), submission({ pdfPath: '', fileName: '', comments: '' }))));
await check('"no updates" with a PDF refused', assertFails(setDoc(doc(admin, 'missionaryReports/r5'), submission({ kind: 'noUpdates' }))));
await check('PDF of another missionary refused', assertFails(setDoc(doc(admin, 'missionaryReports/r6'), submission({ pdfPath: 'reports/m2/x.pdf' }))));
await check('bad quarter id refused', assertFails(setDoc(doc(admin, 'missionaryReports/r7'), submission({ quarterId: 'Q1' }))));
await check('new report cannot arrive already reviewed', assertFails(setDoc(doc(admin, 'missionaryReports/r8'), submission({ reviewedBy: 'x' }))));
await check('admin marks a report reviewed', assertSucceeds(updateDoc(doc(admin, 'missionaryReports/r1'), { reviewedAt: serverTimestamp(), reviewedBy: 'ayuda@iblibertad.org', reviewNote: 'Gracias' })));
await check('admin records it was used on the page', assertSucceeds(updateDoc(doc(admin, 'missionaryReports/r1'), { usedOnPage: 'prayerLetter' })));
await check('report contents cannot be changed', assertFails(updateDoc(doc(admin, 'missionaryReports/r1'), { comments: 'otro' })));
await check('reports cannot be deleted', assertFails(deleteDoc(doc(admin, 'missionaryReports/r1'))));
await check('anonymous cannot read reports', assertFails(getDoc(doc(anonymous, 'missionaryReports/r1'))));
await check('non-church account cannot list reports', assertFails(getDocs(collection(outsider, 'missionaryReports'))));
await check('non-church account cannot add reports', assertFails(setDoc(doc(outsider, 'missionaryReports/r9'), submission())));

await check('admin uploads a report PDF', assertSucceeds(upload(adminCtx, 'reports/m1/q1.pdf', 'application/pdf')));
await check('report PDF cannot be overwritten', assertFails(upload(adminCtx, 'reports/m1/q1.pdf', 'application/pdf')));
await check('report PDF cannot be deleted', assertFails(deleteObject(ref(adminCtx.storage(), 'reports/m1/q1.pdf'))));
await check('non-PDF report refused', assertFails(upload(adminCtx, 'reports/m1/x.jpg', 'image/jpeg')));
await check('anonymous cannot upload a report', assertFails(upload(anonCtx, 'reports/m1/y.pdf', 'application/pdf')));

await check('anyone reads the quarter settings', assertSucceeds(getDoc(doc(anonymous, 'settings/reportPeriods'))));
await check('admin saves quarter settings', assertSucceeds(setDoc(doc(admin, 'settings/reportPeriods'), { startMonth: 11, firstYear: 2026, dueDays: 15, updatedAt: serverTimestamp() })));
await check('bad due days refused', assertFails(setDoc(doc(admin, 'settings/reportPeriods'), { startMonth: 11, firstYear: 2026, dueDays: 400, updatedAt: serverTimestamp() })));
await check('non-church account cannot change quarters', assertFails(setDoc(doc(outsider, 'settings/reportPeriods'), { startMonth: 1, firstYear: 2026, dueDays: 15, updatedAt: serverTimestamp() })));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
