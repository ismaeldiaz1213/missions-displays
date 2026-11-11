import { GoogleAuth } from 'google-auth-library';
import { logger } from 'firebase-functions';
import type { Rendered } from './templates.js';

/**
 * How mail actually leaves:
 *   'log'   – nothing is sent; the message is only recorded (default, and on the emulators).
 *   'gmail' – sent through the Gmail API as MAIL_FROM (a Google Workspace mailbox), so it shows in
 *             that mailbox's Sent folder and replies land in its inbox. Uses domain-wide delegation
 *             granted to MAIL_SIGNER (a service account) — no keys are stored anywhere.
 * Another church using a different provider only needs one more function with the same shape.
 * Setup steps: docs/EMAIL_SETUP.md.
 */
export interface Sender {
  from: string;
  fromName: string;
}

export interface SendResult { status: 'sent' | 'logged'; messageId: string }

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);

const mime = (sender: Sender, to: string, msg: Rendered) => {
  const boundary = `ibl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const from = `${encodeHeader(sender.fromName)} <${sender.from}>`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${sender.from}`,
    `Subject: ${encodeHeader(msg.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(msg.text).toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(msg.html).toString('base64'),
    `--${boundary}--`,
    '',
  ].join('\r\n');
};

// ── Gmail with domain-wide delegation, keyless ───────────────────────────────

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
let cached: { token: string; expires: number; key: string } | null = null;

/** An access token that acts as `subject` for gmail.send, signed by the `signer` service account. */
const gmailToken = async (signer: string, subject: string) => {
  const key = `${signer}|${subject}`;
  if (cached && cached.key === key && cached.expires > Date.now() + 60_000) return cached.token;
  const client = await auth.getClient();
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: signer, sub: subject, scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  };
  const signed = await client.request<{ signedJwt: string }>({
    url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(signer)}:signJwt`,
    method: 'POST',
    data: { payload: JSON.stringify(claims) },
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signed.data.signedJwt }),
  });
  const body = await res.json() as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !body.access_token) throw new Error(`Gmail token: ${body.error_description ?? body.error ?? res.status}`);
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000, key };
  return body.access_token;
};

export const sendMail = async (
  transport: string, signer: string, sender: Sender, to: string, msg: Rendered,
): Promise<SendResult> => {
  if (transport !== 'gmail') {
    // On the local emulators, print the whole text so sign-in links can be clicked from the log.
    logger.info('Email not sent (MAIL_TRANSPORT=log)', { to, subject: msg.subject, ...(process.env.FUNCTIONS_EMULATOR === 'true' && { text: msg.text }) });
    return { status: 'logged', messageId: '' };
  }
  const token = await gmailToken(signer, sender.from);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: b64url(mime(sender, to, msg)) }),
  });
  const body = await res.json() as { id?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(`Gmail send ${res.status}: ${body.error?.message ?? ''}`);
  return { status: 'sent', messageId: body.id ?? '' };
};
