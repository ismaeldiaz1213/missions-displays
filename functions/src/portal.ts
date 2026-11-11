import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { PORTAL_PATH, SITE_URL, notifyAdmins, queueMail, recipientFor } from './mail/index.js';

// The missionary portal (/misioneros/mi-pagina). Missionaries sign in with a one-time link sent to
// the email on their profile (ownerEmail); there are no passwords. Links are generated here and
// sent from misiones@ with our own branded email.

const REGION = 'us-east1';
const db = () => getFirestore();

const isAdmin = (req: CallableRequest) => {
  const t = req.auth?.token;
  return !!t && t.email_verified === true && /^[^@]+@iblibertad\.(org|com)$/i.test(t.email ?? '');
};

/** A one-time sign-in link. A setup problem becomes a readable message instead of "INTERNAL". */
const signInLink = async (email: string) => {
  try {
    return await getAuth().generateSignInWithEmailLink(email, { url: `${SITE_URL.value()}${PORTAL_PATH}`, handleCodeInApp: true });
  } catch (err) {
    logger.error('Could not create a sign-in link', { err: String(err) });
    const code = (err as { code?: string }).code ?? '';
    throw new HttpsError('failed-precondition', code.includes('operation-not-allowed') || /provider is disabled/i.test(String(err))
      ? 'El inicio de sesión por enlace de correo no está activado en Firebase (Authentication → Sign-in method → Email/Password → Email link). / Email-link sign-in is not enabled in Firebase.'
      : code.includes('unauthorized-continue-uri')
        ? 'El dominio del sitio no está autorizado en Firebase (Authentication → Settings → Authorized domains). / The site domain is not authorized in Firebase.'
        : 'No se pudo crear el enlace para entrar. / Could not create the sign-in link.');
  }
};

/** The profile whose ownerEmail is this address, with its page, if the page is published. */
const ownedProfile = async (email: string) => {
  const snap = await db().collection('missionaryProfiles').where('ownerEmail', '==', email.trim().toLowerCase()).limit(1).get();
  const profile = snap.docs[0];
  if (!profile) return null;
  const page = await db().doc(`missionaries/${profile.id}`).get();
  return page.exists ? { id: profile.id, profile: profile.data(), page: page.data()! } : null;
};

/**
 * "Send me a sign-in link": anyone may ask, but a link only goes to an address that belongs to a
 * missionary. The answer is the same either way, so the form can't be used to discover addresses.
 */
export const requestSignInLink = onCall({ region: REGION }, async (req) => {
  const email = String(req.data?.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'email');
  const found = await ownedProfile(email);
  if (!found) {
    logger.info('Sign-in link asked for an unknown address');
    return { ok: true };
  }
  const last = found.profile.lastLinkAt?.toMillis?.() ?? 0;
  if (Date.now() - last < 60_000) return { ok: true }; // one link a minute is plenty
  await db().doc(`missionaryProfiles/${found.id}`).update({ lastLinkAt: FieldValue.serverTimestamp() });
  await queueMail({
    to: email, template: 'signInLink', lang: found.profile.language === 'en' ? 'en' : 'es', missionaryId: found.id,
    vars: { name: String(found.page.name ?? ''), url: await signInLink(email) },
  });
  return { ok: true };
});

/** Admin: email a missionary the invitation to their page (and make their email their sign-in). */
export const inviteMissionary = onCall({ region: REGION }, async (req) => {
  if (!isAdmin(req)) throw new HttpsError('permission-denied', 'admins only');
  const id = String(req.data?.missionaryId ?? '');
  const [profileSnap, pageSnap] = await Promise.all([db().doc(`missionaryProfiles/${id}`).get(), db().doc(`missionaries/${id}`).get()]);
  if (!pageSnap.exists) throw new HttpsError('failed-precondition', 'La página debe estar publicada antes de invitar.');
  const email = String(profileSnap.data()?.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('failed-precondition', 'El perfil no tiene un correo válido.');
  // Make the link first: the profile only says "invited" once the email is really on its way.
  const url = await signInLink(email);
  await profileSnap.ref.set({ ownerEmail: email }, { merge: true });
  await queueMail({
    to: email, template: 'invitation', lang: profileSnap.data()?.language === 'en' ? 'en' : 'es', missionaryId: id,
    vars: { name: String(pageSnap.data()?.name ?? ''), url },
  });
  await profileSnap.ref.set({ invitedAt: FieldValue.serverTimestamp(), invitedBy: req.auth?.token.email ?? '' }, { merge: true });
  return { ok: true };
});

const EDITABLE = ['draft', 'submitted', 'rejected'];

/**
 * Signed-in missionary: the page change they're working on. Reuses the open one (drafts stack
 * until an admin acts), or starts a new one from the page as it is published now.
 */
export const startMissionaryEdit = onCall({ region: REGION }, async (req) => {
  const t = req.auth?.token;
  if (!t?.email || t.email_verified !== true) throw new HttpsError('unauthenticated', 'sign in first');
  const found = await ownedProfile(t.email);
  if (!found) throw new HttpsError('not-found', 'no page for this email');

  const openId = String(found.profile.openEditId ?? '');
  if (openId) {
    const open = await db().doc(`missionaryEdits/${openId}`).get();
    const e = open.data();
    if (e && !e.revoked && EDITABLE.includes(e.status)) return { token: openId, missionaryId: found.id };
  }
  const proposed = { ...found.page };
  delete (proposed as Record<string, unknown>).id;
  const ref = db().collection('missionaryEdits').doc();
  await ref.set({
    missionaryId: found.id, proposed, status: 'draft', rejectionReason: '', revoked: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    submittedAt: null, reviewedAt: null, reviewedBy: '',
  });
  await db().doc(`missionaryProfiles/${found.id}`).update({ openEditId: ref.id });
  return { token: ref.id, missionaryId: found.id };
});

/** Emails around page changes: the inbox hears about submissions, the missionary about the outcome. */
export const onEditStatusChange = onDocumentUpdated({ document: 'missionaryEdits/{token}', region: REGION }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;
  const id = String(after.missionaryId);
  if (after.status === 'submitted') {
    const name = [after.proposed?.name, after.proposed?.lastName].filter(Boolean).join(' ');
    await notifyAdmins('editSubmittedAdmin', { missionary: name, url: `${SITE_URL.value()}/admin?tab=cambios&cambio=${event.params.token}` });
    return;
  }
  if (after.status !== 'approved' && after.status !== 'rejected') return;
  const who = await recipientFor(id);
  if (!who.email) return;
  await queueMail({
    to: who.email, template: after.status === 'approved' ? 'editApproved' : 'editRejected', lang: who.lang, missionaryId: id,
    vars: {
      name: who.name, reason: String(after.rejectionReason ?? ''),
      url: after.status === 'approved' ? `${SITE_URL.value()}/misionero/${id}` : `${SITE_URL.value()}${PORTAL_PATH}`,
    },
  });
});
