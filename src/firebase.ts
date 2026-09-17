import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore/lite';

// Public web-app identifiers (safe to commit — access is enforced by firestore.rules / storage.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyCj5AF_SMDVPc6kpfGJhaPbGMiiNhr2ic8',
  authDomain: 'ibl-missions-display.firebaseapp.com',
  projectId: 'ibl-missions-display',
  storageBucket: 'ibl-missions-display.firebasestorage.app',
  messagingSenderId: '588812595372',
  appId: '1:588812595372:web:86d2c8b5784a3ac4c5af09',
  measurementId: 'G-QC8SB3TE2L',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const STORAGE_BUCKET = firebaseConfig.storageBucket;

// Lite Firestore SDK: one-shot reads/writes only (no realtime listeners) — much smaller bundle.
export const db = getFirestore(firebaseApp);

export const ADMIN_EMAIL_DOMAINS = ['iblibertad.org', 'iblibertad.com'];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAIL_DOMAINS.includes(email.split('@')[1]?.toLowerCase() ?? '');
