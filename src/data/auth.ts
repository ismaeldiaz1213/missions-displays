import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { EMULATOR_HOST, USE_EMULATORS, firebaseApp } from '../firebase';

/** The one Firebase Auth instance (admins sign in with Google; missionaries with an email link). */
export const auth = getAuth(firebaseApp);
if (USE_EMULATORS) connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
