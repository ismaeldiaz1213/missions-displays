# Email setup (misiones@iblibertad.org)

Until these steps are done, the site runs in **test mode**: every email is recorded on the admin
page (Correos → Historial, and each missionary's Correos section) but nothing is sent.

Emails go out through the Gmail API **as** `misiones@iblibertad.org`, so they appear in that
mailbox's Sent folder and replies land in its inbox. No passwords or keys are stored: a service
account that can only send Gmail is allowed (by the Workspace admin) to act as that one mailbox.

## 1. Create the mailbox (Google Workspace admin)

Create the user `misiones@iblibertad.org` (Google for Nonprofits: no license cost). Whoever handles
missionary replies signs in to it.

## 2. Create the sending service account (Google Cloud)

```sh
P=ibl-missions-display
gcloud services enable gmail.googleapis.com iamcredentials.googleapis.com --project $P
gcloud iam service-accounts create mail-sender --display-name "Misiones: envío de correos" --project $P

# Let the Cloud Functions' runtime account sign as mail-sender (nothing else gets this right).
PROJECT_NUMBER=$(gcloud projects describe $P --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding mail-sender@$P.iam.gserviceaccount.com \
  --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role roles/iam.serviceAccountTokenCreator --project $P

# The "client ID" for step 3:
gcloud iam service-accounts describe mail-sender@$P.iam.gserviceaccount.com --format='value(oauth2ClientId)' --project $P
```

## 3. Allow it to send as misiones@ (Workspace admin console)

admin.google.com → Security → Access and data control → API controls → **Manage domain-wide
delegation** → Add new:

- Client ID: the number printed in step 2
- OAuth scope: `https://www.googleapis.com/auth/gmail.send` (send only, it can't read mail)

## 4. Turn sending on and deploy

In `functions/.env` change `MAIL_TRANSPORT=log` to `MAIL_TRANSPORT=gmail`, then:

```sh
npm run deploy:rules
firebase deploy --only functions --project ibl-missions-display
```

On the admin page, Correos → "Enviarme una prueba" should arrive in your inbox from misiones@.

## What gets sent automatically

| When | To | Template |
|---|---|---|
| Someone sends the page request form | them, and misiones@ | `requestReceived`, `newRequestAdmin` |
| 7 days before, on, and 7 days after a report's due date | missionaries with an email who haven't sent it or pressed "No tengo novedades" | `reportReminder` |
| A missionary sends a report from their page | them, and misiones@ | `reportReceived`, `reportReceivedAdmin` |

Reminders run every morning at 8:00 (Houston time) and can be paused from the Correos tab.
Texts live in `functions/src/mail/templates.ts`, in Spanish and English; each missionary gets the
language set on their profile.

## For another church

Change the values in `functions/.env` (sender, name, notify address, site URL). A church on a
different email provider only needs another `sendMail` branch in `functions/src/mail/transport.ts`
(for example SMTP); nothing else depends on Gmail.

## Missionary sign-in (their page at /misioneros/mi-pagina)

Missionaries sign in with a one-time link sent to the email on their profile; there are no
passwords. Once, in the Firebase console (project ibl-missions-display):

1. Authentication → Sign-in method → **Email/Password** → enable it and turn on
   **Email link (passwordless sign-in)**.
2. Authentication → Settings → Authorized domains: make sure `misiones.iblibertad.org` is listed.

The links themselves are sent by our functions from misiones@ (not Firebase's default sender), so
they only work after step 4 above. Admins invite a missionary from their profile (Resumen →
"Enviar invitación"); missionaries can also ask for a new link on the sign-in page.
Missionaries without email can get a private edit link instead ("Crear enlace privado").
