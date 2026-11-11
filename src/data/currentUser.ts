import { auth } from './auth';

/** Email of whoever is signed in (recorded on changes as "who did it"). */
export const currentUserEmail = () => auth.currentUser?.email ?? '';
