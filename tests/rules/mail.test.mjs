/**
 * Checks the rules for the email outbox, mass-email campaigns and email settings.
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

const ADMIN = 'ayuda@iblibertad.org';
const admin = env.authenticatedContext('admin', { email: ADMIN, email_verified: true }).firestore();
const outsider = env.authenticatedContext('outsider', { email: 'someone@gmail.com', email_verified: true }).firestore();
const anonymous = env.unauthenticatedContext().firestore();

let pass = 0, fail = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};

const mail = (over = {}) => ({
  to: 'juan@example.com', template: 'custom', lang: 'es',
  vars: { name: 'Juan', subject: 'Conferencia 2027', body: 'Hola {nombre}, …' },
  missionaryId: 'm1', campaignId: 'c1', status: 'queued', createdAt: serverTimestamp(), createdBy: ADMIN, ...over,
});

console.log('email rules');

await check('admin queues a custom email', assertSucceeds(setDoc(doc(admin, 'mail/a1'), mail())));
await check('admin reads the outbox', assertSucceeds(getDocs(collection(admin, 'mail'))));
await check('cannot queue a system template (e.g. invitation)', assertFails(setDoc(doc(admin, 'mail/a2'), mail({ template: 'invitation' }))));
await check('cannot queue as already sent', assertFails(setDoc(doc(admin, 'mail/a3'), mail({ status: 'sent' }))));
await check('cannot sign as someone else', assertFails(setDoc(doc(admin, 'mail/a4'), mail({ createdBy: 'otro@iblibertad.org' }))));
await check('invalid address refused', assertFails(setDoc(doc(admin, 'mail/a5'), mail({ to: 'not an email' }))));
await check('empty subject refused', assertFails(setDoc(doc(admin, 'mail/a6'), mail({ vars: { name: 'J', subject: '', body: 'x' } }))));
await check('sent emails cannot be edited', assertFails(updateDoc(doc(admin, 'mail/a1'), { status: 'sent' })));
await check('the outbox cannot be deleted', assertFails(deleteDoc(doc(admin, 'mail/a1'))));
await check('anonymous cannot read the outbox', assertFails(getDoc(doc(anonymous, 'mail/a1'))));
await check('non-church account cannot send email', assertFails(setDoc(doc(outsider, 'mail/a7'), mail({ createdBy: 'someone@gmail.com' }))));

await check('admin saves a campaign', assertSucceeds(setDoc(doc(admin, 'mailCampaigns/c1'), { subject: 'x', offlineDone: {} })));
await check('admin ticks someone reached by phone', assertSucceeds(updateDoc(doc(admin, 'mailCampaigns/c1'), { 'offlineDone.m2': true })));
await check('campaigns cannot be deleted', assertFails(deleteDoc(doc(admin, 'mailCampaigns/c1'))));
await check('non-church account cannot read campaigns', assertFails(getDoc(doc(outsider, 'mailCampaigns/c1'))));
await check('admin pauses reminders', assertSucceeds(setDoc(doc(admin, 'settings/email'), { remindersEnabled: false })));
await check('anonymous cannot read email settings', assertFails(getDoc(doc(anonymous, 'settings/email'))));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
