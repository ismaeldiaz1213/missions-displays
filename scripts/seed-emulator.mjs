/**
 * Fills the LOCAL emulators with made-up missionaries so the admin page can be tried out safely.
 *
 *   npm run emulators          (terminal 1: starts auth, firestore and storage emulators)
 *   npm run emulators:seed     (terminal 2: this script)
 *   npm run dev:emulators      (terminal 2: the site, talking to the emulators)
 *
 * Sign in on /admin with the emulator's fake Google popup using any @iblibertad.org address.
 * Everything here is fictional. The "demo-" project id means the real project is never touched.
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, setDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-ibl-missions',
  firestore: { host: '127.0.0.1', port: 8080 },
});

const days = (n) => Timestamp.fromMillis(Date.now() - n * 86400000);

const page = (over) => ({
  name: '', lastName: '', organization: '', continent: 'south-america',
  location: { city: '', state: '', country: '', latitude: 0, longitude: 0 },
  profileImage: '', description: 'Sirviendo al Señor plantando iglesias y discipulando creyentes.',
  prayerLetter: '', media: [], contactInfo: [], specialNotes: '', startDate: '2015', missionType: 'Plantación de iglesias',
  ...over,
});

const missionaries = {
  'demo-perez': page({ name: 'Juan y Ana', lastName: 'Pérez', organization: 'Misión Ejemplo', continent: 'south-america',
    location: { city: 'Lima', state: '', country: 'Perú', latitude: -12.0464, longitude: -77.0428 },
    contactInfo: [{ type: 'email', value: 'juan.perez@example.com' }] }),
  'demo-garcia': page({ name: 'Carlos', lastName: 'García', organization: 'Junta de Prueba', continent: 'central-america',
    location: { city: 'Tegucigalpa', state: '', country: 'Honduras', latitude: 14.0723, longitude: -87.1921 } }),
  'demo-smith': page({ name: 'David y Ruth', lastName: 'Smith', organization: 'Example Missions', continent: 'africa',
    location: { city: 'Nairobi', state: '', country: 'Kenia', latitude: -1.2921, longitude: 36.8219 },
    contactInfo: [{ type: 'phone', value: '+254 700 000 000' }] }),
  'demo-lopez': page({ name: 'Miguel', lastName: 'López', organization: '', continent: 'europe',
    location: { city: 'Madrid', state: '', country: 'España', latitude: 0, longitude: 0 } }),
  'demo-kim': page({ name: 'Daniel y Sara', lastName: 'Kim', organization: 'Misión Asia (ficticia)', continent: 'asia',
    location: { city: 'Manila', state: '', country: 'Filipinas', latitude: 14.5995, longitude: 120.9842 } }),
  'demo-rojas': page({ name: 'Pedro', lastName: 'Rojas', organization: 'Misión Ejemplo', continent: 'north-america',
    location: { city: 'Monterrey', state: 'Nuevo León', country: 'México', latitude: 25.6866, longitude: -100.3161 } }),
};

const profile = (over) => ({
  email: '', phone: '', preferredContact: '', preferredContactNote: '', language: 'es',
  spouseName: '', sendingChurch: '', notes: '', requestId: '',
  createdAt: days(30), updatedAt: days(3), updatedBy: 'ayuda@iblibertad.org', ...over,
});

const profiles = {
  'demo-perez': profile({ email: 'juan.perez@example.com', phone: '+51 900 000 000', preferredContact: 'email', spouseName: 'Ana', sendingChurch: 'Iglesia Bautista Ejemplo' }),
  'demo-smith': profile({ phone: '+254 700 000 000', preferredContact: 'whatsapp', preferredContactNote: 'Por la tarde (hora de Kenia)', language: 'en', spouseName: 'Ruth' }),
  'demo-kim': profile({ email: 'daniel.kim@example.com', preferredContact: 'email', language: 'en', notes: 'Pidió oración por la visa.' }),
  'demo-rojas': profile({ email: 'pedro.rojas@example.com', phone: '+52 81 0000 0000', preferredContact: 'phone' }),
};

const request = (over) => ({
  language: 'es', name: '', lastName: '', wifeName: '', email: '', phone: '', preferredContact: 'email', preferredContactNote: '',
  organization: 'Misión Ejemplo', sendingChurch: 'Iglesia Ejemplo', missionType: '', startYear: '2020', continent: 'south-america',
  city: '', state: '', country: '', description: 'Queremos compartir lo que Dios está haciendo.', prayerRequests: '',
  contact: { email: '', phone: '', website: '', facebook: '', instagram: '' }, status: 'pending', createdAt: days(2), ...over,
});

const report = (over) => ({
  missionaryId: '', quarterId: '', kind: 'report', pdfPath: '', fileName: '', comments: '', submittedBy: 'missionary',
  submittedAt: days(20), reviewedAt: null, reviewedBy: '', reviewNote: '', usedOnPage: '', ...over,
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  // Track from the 2025 reporting year so the demo has finished quarters (the real default is 2026).
  await setDoc(doc(db, 'settings', 'reportPeriods'), { startMonth: 11, firstYear: 2025, dueDays: 15, updatedAt: days(90) });
  await setDoc(doc(db, 'missionaryReports', 'demo-rep-1'), report({ missionaryId: 'demo-perez', quarterId: '2025-Q4',
    comments: 'Este trimestre bautizamos a 3 personas y empezamos un estudio bíblico en un barrio nuevo. Oren por un local para reunirnos.' }));
  await setDoc(doc(db, 'missionaryReports', 'demo-rep-2'), report({ missionaryId: 'demo-kim', quarterId: '2025-Q4', kind: 'noUpdates', submittedAt: days(25) }));
  await setDoc(doc(db, 'missionaryReports', 'demo-rep-3'), report({ missionaryId: 'demo-perez', quarterId: '2025-Q3', comments: 'Seguimos con la obra en Lima.',
    submittedAt: days(100), reviewedAt: days(95), reviewedBy: 'ayuda@iblibertad.org' }));
  for (const [id, m] of Object.entries(missionaries)) await setDoc(doc(db, 'missionaries', id), m);
  for (const [id, p] of Object.entries(profiles)) await setDoc(doc(db, 'missionaryProfiles', id), p);
  await setDoc(doc(db, 'missionaryDrafts', 'demo-torres'), page({ name: 'Lucas', lastName: 'Torres', organization: 'Junta de Prueba',
    continent: 'oceania', location: { city: 'Suva', state: '', country: 'Fiyi', latitude: -18.1416, longitude: 178.4419 } }));
  await setDoc(doc(db, 'missionaryArchive', 'demo-vega'), { page: page({ name: 'Rosa', lastName: 'Vega', organization: 'Misión Antigua',
    location: { city: 'Quito', state: '', country: 'Ecuador', latitude: -0.1807, longitude: -78.4678 } }), wasDraft: false, archivedAt: days(60), archivedBy: 'ayuda@iblibertad.org' });
  await setDoc(doc(db, 'missionaryRequests', 'demo-req-1'), request({ name: 'Andrés', lastName: 'Mora', email: 'andres.mora@example.com',
    phone: '+57 300 000 0000', preferredContact: 'whatsapp', city: 'Medellín', country: 'Colombia' }));
  await setDoc(doc(db, 'missionaryRequests', 'demo-req-2'), request({ language: 'en', name: 'Tom', lastName: 'Baker', wifeName: 'Grace',
    email: 'tom.baker@example.com', phone: '+1 555 0100', continent: 'europe', city: 'Lyon', country: 'France', createdAt: days(6) }));
});

console.log('Seeded made-up data into the demo-ibl-missions emulators.');
await env.cleanup();
