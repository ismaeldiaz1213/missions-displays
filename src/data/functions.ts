import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { EMULATOR_HOST, USE_EMULATORS, firebaseApp } from '../firebase';

// Callable Cloud Functions (functions/src/portal.ts). Same region as the rest of the project.
const functions = getFunctions(firebaseApp, 'us-east1');
if (USE_EMULATORS) connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);

/** Emails a one-time sign-in link if the address belongs to a missionary (always "ok"). */
export const requestSignInLink = (email: string) =>
  httpsCallable<{ email: string }, { ok: boolean }>(functions, 'requestSignInLink')({ email });

/** Admin: emails the missionary their invitation and makes their email their sign-in. */
export const inviteMissionary = (missionaryId: string) =>
  httpsCallable<{ missionaryId: string }, { ok: boolean }>(functions, 'inviteMissionary')({ missionaryId });

/** Signed-in missionary: the page change they're working on (created if needed). */
export const startMissionaryEdit = async () =>
  (await httpsCallable<void, { token: string; missionaryId: string }>(functions, 'startMissionaryEdit')()).data;
