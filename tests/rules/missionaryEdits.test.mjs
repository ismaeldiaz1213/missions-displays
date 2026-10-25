/**
 * Checks that firestore.rules and storage.rules let a missionary holding a private edit link
 * save and submit changes to their page, and nothing more.
 *
 * Run it with:  npm run test:rules
 * (that starts the Firestore and Storage emulators; it never touches the real project)
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  Timestamp, collection, deleteField, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
// Same project as `firebase emulators:exec`, so storage.rules' firestore.get() sees the edits seeded here.
const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-rules',
  firestore: { rules: read('firestore.rules'), host: '127.0.0.1', port: 8080 },
  storage: { rules: read('storage.rules'), host: '127.0.0.1', port: 9199 },
});
await env.clearFirestore();
await env.clearStorage();

const CREATED = Timestamp.fromMillis(Date.UTC(2026, 9, 1));

// The page as the missionary wants it: the Missionary fields minus id.
const proposed = (token, over = {}) => ({
  name: 'Juan y Ana', lastName: 'Pérez', organization: 'BIMI', continent: 'south-america',
  location: { city: 'Lima', state: '', country: 'Perú', latitude: -12.05, longitude: -77.04 },
  profileImage: `missionary-edits/${token}/profile/foto.jpg`,
  description: 'Plantando iglesias en Lima.',
  prayerLetter: 'pdfs/m1-prayer-letter.pdf',
  media: [{ url: 'images/m1-media-1.jpg' }],
  contactInfo: [{ type: 'email', value: 'juan@example.com' }],
  specialNotes: '', startDate: '2015', missionType: 'Plantador de iglesias', ...over,
});

let n = 0;
/** A fresh edit link as an admin created it, written with the rules off. */
const seed = async (over = {}) => {
  const token = `t${n++}`;
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), `missionaryEdits/${token}`), {
    missionaryId: 'm1', proposed: proposed(token), status: 'draft', rejectionReason: '', revoked: false,
    createdAt: CREATED, updatedAt: CREATED, submittedAt: null, reviewedAt: null, reviewedBy: '', ...over,
  }));
  return token;
};
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'missionaries/m1'), { name: 'Juan', lastName: 'Pérez' }));

const adminCtx = env.authenticatedContext('admin', { email: 'oficina@iblibertad.org', email_verified: true });
const admin = adminCtx.firestore();
const outsider = env.authenticatedContext('outsider', { email: 'someone@gmail.com', email_verified: true }).firestore();
const anonCtx = env.unauthenticatedContext();
const anonymous = anonCtx.firestore();

// What saveEditDraft / submitEdit send.
const save = async (token, over = {}, db = anonymous) =>
  updateDoc(doc(db, `missionaryEdits/${token}`), { proposed: proposed(token), status: 'draft', updatedAt: serverTimestamp(), ...over });
const submit = (token, over = {}) => save(token, { status: 'submitted', submittedAt: serverTimestamp(), ...over });

let pass = 0, fail = 0;
const check = async (name, promise) => {
  try { await promise; pass++; console.log('  ✔', name); }
  catch (err) { fail++; console.log('  ✘', name, '→', String(err.message).slice(0, 90)); }
};

console.log('missionary edit rules');

// The link holder can read and work on their own edit
await check('link holder reads their edit', assertSucceeds(getDoc(doc(anonymous, `missionaryEdits/${await seed()}`))));
await check('link holder saves a draft', assertSucceeds(save(await seed())));
await check('link holder submits', assertSucceeds(submit(await seed())));
await check('link holder edits again after a rejection', assertSucceeds(submit(await seed({ status: 'rejected', rejectionReason: 'Falta foto' }))));
await check('link holder withdraws a submission to draft', assertSucceeds(save(await seed({ status: 'submitted', submittedAt: CREATED }))));
await check('signed-in non-admin also works as a link holder', assertSucceeds(save(await seed(), {}, outsider)));

// …but never lists them, or creates or deletes them
await check('listing edits refused', assertFails(getDocs(collection(anonymous, 'missionaryEdits'))));
await check('listing edits refused for a non-admin account', assertFails(getDocs(collection(outsider, 'missionaryEdits'))));
await check('creating an edit link refused', assertFails(setDoc(doc(anonymous, 'missionaryEdits/new'), {
  missionaryId: 'm1', proposed: proposed('new'), status: 'draft', revoked: false,
})));

// The fields only admins set
await check('changing missionaryId refused', assertFails(save(await seed(), { missionaryId: 'm2' })));
await check('setting approved refused', assertFails(save(await seed(), { status: 'approved' })));
await check('setting rejected refused', assertFails(save(await seed(), { status: 'rejected' })));
await check('changing revoked refused', assertFails(save(await seed(), { revoked: true })));
await check('setting reviewedBy refused', assertFails(save(await seed(), { reviewedBy: 'me' })));
await check('clearing the rejection reason refused', assertFails(save(await seed({ status: 'rejected', rejectionReason: 'x' }), { rejectionReason: '' })));
await check('backdated updatedAt refused', assertFails(save(await seed(), { updatedAt: CREATED })));
await check('submitting without submittedAt refused', assertFails(save(await seed(), { status: 'submitted' })));
await check('changing submittedAt on a draft save refused', assertFails(save(await seed(), { submittedAt: serverTimestamp() })));
await check('deleting submittedAt refused', assertFails(save(await seed({ status: 'submitted', submittedAt: CREATED }), { submittedAt: deleteField() })));

// Revoked links and approved edits are locked
const revoked = await seed({ revoked: true });
await check('revoked link: read refused', assertFails(getDoc(doc(anonymous, `missionaryEdits/${revoked}`))));
await check('revoked link: save refused', assertFails(save(revoked)));
await check('revoked link: un-revoke refused', assertFails(save(revoked, { revoked: false })));
const approved = await seed({ status: 'approved' });
await check('approved edit: read refused', assertFails(getDoc(doc(anonymous, `missionaryEdits/${approved}`))));
await check('approved edit: save refused', assertFails(save(approved)));
await check('approved edit: submit refused', assertFails(submit(approved)));

// The proposed page is validated
const bad = async (over) => { const t = await seed(); return save(t, { proposed: proposed(t, over) }); };
await check('blank name refused', assertFails(bad({ name: '' })));
await check('unknown continent refused', assertFails(bad({ continent: 'antarctica' })));
await check('huge description refused', assertFails(bad({ description: 'x'.repeat(5001) })));
await check('unknown field refused', assertFails(bad({ published: true })));
await check('id inside proposed refused', assertFails(bad({ id: 'm2' })));
await check('latitude out of range refused', assertFails(bad({ location: { city: 'Lima', country: 'Perú', latitude: 200, longitude: 0 } })));
await check('too many gallery items refused', assertFails(bad({ media: Array.from({ length: 51 }, (_, i) => ({ url: `images/${i}.jpg` })) })));
await check('profile image from another edit refused', assertFails(bad({ profileImage: 'missionary-edits/other/profile/foto.jpg' })));
await check('profile image from a page request refused', assertFails(bad({ profileImage: 'missionary-requests/r1/profile/foto.jpg' })));
await check('prayer letter pointing at an image refused', assertFails(bad({ prayerLetter: 'images/x.pdf' })));
await check('no profile image is fine', assertSucceeds(bad({ profileImage: '' })));

// The published page and history are admin-only
await check('non-admin write to missionaries refused', assertFails(setDoc(doc(anonymous, 'missionaries/m1'), { name: 'Hacked' })));
await check('signed-in non-admin write to missionaries refused', assertFails(updateDoc(doc(outsider, 'missionaries/m1'), { name: 'Hacked' })));
await check('non-admin read of history refused', assertFails(getDocs(collection(anonymous, 'missionaryHistory/m1/versions'))));
await check('non-admin write to history refused', assertFails(setDoc(doc(anonymous, 'missionaryHistory/m1/versions/v1'), { name: 'x' })));

// Admins manage everything
await check('admin lists edits', assertSucceeds(getDocs(collection(admin, 'missionaryEdits'))));
await check('admin creates a link', assertSucceeds(setDoc(doc(admin, 'missionaryEdits/admin-new'), { missionaryId: 'm1', revoked: false })));
await check('admin approves', assertSucceeds(updateDoc(doc(admin, `missionaryEdits/${await seed({ status: 'submitted' })}`), {
  status: 'approved', reviewedAt: serverTimestamp(), reviewedBy: 'oficina@iblibertad.org',
})));
await check('admin revokes', assertSucceeds(updateDoc(doc(admin, `missionaryEdits/${await seed()}`), { revoked: true })));
await check('admin reads a revoked link', assertSucceeds(getDoc(doc(admin, `missionaryEdits/${revoked}`))));
await check('admin writes history', assertSucceeds(setDoc(doc(admin, 'missionaryHistory/m1/versions/v1'), { name: 'Juan' })));
await check('admin writes missionaries', assertSucceeds(updateDoc(doc(admin, 'missionaries/m1'), { name: 'Juan y Ana' })));

console.log('missionary edit storage rules');

const MB = 1024 * 1024;
const upload = (ctx, path, contentType, size = 1024) =>
  uploadBytes(ref(ctx.storage(), path), new Uint8Array(size), { contentType });
const open = await seed();

await check('profile photo upload', assertSucceeds(upload(anonCtx, `missionary-edits/${open}/profile/foto.jpg`, 'image/jpeg')));
await check('prayer letter upload', assertSucceeds(upload(anonCtx, `missionary-edits/${open}/prayer-letter/carta.pdf`, 'application/pdf')));
await check('gallery image upload', assertSucceeds(upload(anonCtx, `missionary-edits/${open}/gallery/1.png`, 'image/png')));
await check('gallery video upload', assertSucceeds(upload(anonCtx, `missionary-edits/${open}/gallery/1.mp4`, 'video/mp4')));

await check('overwriting an upload refused', assertFails(upload(anonCtx, `missionary-edits/${open}/profile/foto.jpg`, 'image/jpeg')));
await check('pdf as profile photo refused', assertFails(upload(anonCtx, `missionary-edits/${open}/profile/x.pdf`, 'application/pdf')));
await check('image as prayer letter refused', assertFails(upload(anonCtx, `missionary-edits/${open}/prayer-letter/x.jpg`, 'image/jpeg')));
await check('html in gallery refused', assertFails(upload(anonCtx, `missionary-edits/${open}/gallery/x.html`, 'text/html')));
await check('profile photo over 20 MB refused', assertFails(upload(anonCtx, `missionary-edits/${open}/profile/big.jpg`, 'image/jpeg', 20 * MB)));
await check('prayer letter over 50 MB refused', assertFails(upload(anonCtx, `missionary-edits/${open}/prayer-letter/big.pdf`, 'application/pdf', 50 * MB)));
await check('unknown folder refused', assertFails(upload(anonCtx, `missionary-edits/${open}/other/x.jpg`, 'image/jpeg')));
await check('nested path refused', assertFails(upload(anonCtx, `missionary-edits/${open}/gallery/a/b.jpg`, 'image/jpeg')));
await check('made-up token refused', assertFails(upload(anonCtx, 'missionary-edits/nope/profile/x.jpg', 'image/jpeg')));
await check('revoked link upload refused', assertFails(upload(anonCtx, `missionary-edits/${revoked}/profile/x.jpg`, 'image/jpeg')));
await check('approved edit upload refused', assertFails(upload(anonCtx, `missionary-edits/${approved}/profile/x.jpg`, 'image/jpeg')));
await check('upload into images/ refused', assertFails(upload(anonCtx, 'images/x.jpg', 'image/jpeg')));
await check('upload into pdfs/ refused', assertFails(upload(anonCtx, 'pdfs/x.pdf', 'application/pdf')));
await check('upload into videos/ refused', assertFails(upload(anonCtx, 'videos/x.mp4', 'video/mp4')));
await check('admin uploads to an edit', assertSucceeds(upload(adminCtx, `missionary-edits/${open}/profile/admin.jpg`, 'image/jpeg')));

console.log(`${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
