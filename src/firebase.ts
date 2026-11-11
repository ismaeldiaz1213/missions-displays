import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';

/**
 * `npm run dev:emulators` runs the site against local Firebase emulators with made-up data
 * (see scripts/seed-emulator.mjs). The "demo-" project id guarantees nothing reaches the real project.
 */
export const USE_EMULATORS = import.meta.env.VITE_EMULATORS === 'true';
export const EMULATOR_HOST = '127.0.0.1';

// Public web-app identifiers (safe to commit — access is enforced by firestore.rules / storage.rules).
const productionConfig = {
  apiKey: 'AIzaSyCj5AF_SMDVPc6kpfGJhaPbGMiiNhr2ic8',
  authDomain: 'ibl-missions-display.firebaseapp.com',
  projectId: 'ibl-missions-display',
  storageBucket: 'ibl-missions-display.firebasestorage.app',
  messagingSenderId: '588812595372',
  appId: '1:588812595372:web:86d2c8b5784a3ac4c5af09',
  measurementId: 'G-QC8SB3TE2L',
};

const firebaseConfig = USE_EMULATORS
  ? { ...productionConfig, projectId: 'demo-ibl-missions', storageBucket: 'demo-ibl-missions.appspot.com', authDomain: 'demo-ibl-missions.firebaseapp.com' }
  : productionConfig;

export const firebaseApp = initializeApp(firebaseConfig);
export const STORAGE_BUCKET = firebaseConfig.storageBucket;

// Lite Firestore SDK: one-shot reads/writes only (no realtime listeners) — much smaller bundle.
export const db = getFirestore(firebaseApp);
if (USE_EMULATORS) connectFirestoreEmulator(db, EMULATOR_HOST, 8080);

export const ADMIN_EMAIL_DOMAINS = ['iblibertad.org', 'iblibertad.com'];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAIL_DOMAINS.includes(email.split('@')[1]?.toLowerCase() ?? '');
