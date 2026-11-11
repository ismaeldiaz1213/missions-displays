# Missions site (misiones.iblibertad.org)

Iglesia Bautista Libertad's missions site: hallway kiosk screens + public site, a missionary portal,
and an admin page run by a church volunteer. Every page is described in `docs/PAGES.md`.

## Stack

- React 19 + TypeScript + Vite + MUI 6. Firebase project `ibl-missions-display` (us-east1):
  Firestore (**lite SDK**, no realtime listeners), Storage, Auth, Cloud Functions (`functions/`, Node 22).
- Hosting deploys automatically from GitHub Actions on push to `master`. Rules and functions are deployed
  by hand: `npm run deploy:rules`, `firebase deploy --only functions --project ibl-missions-display`.
- gcloud's default project is a different one: always pass `--project ibl-missions-display`.

## Ground rules

- **Never delete data.** Pages and requests are archived (`missionaryArchive`, `archived: true`); every page
  save first snapshots the old page into `missionaryHistory/{id}/versions` (create-only); reports,
  report PDFs and the `mail` outbox can't be deleted or edited (rules enforce it). Replaced files stay in Storage.
- **Security lives in `firestore.rules` / `storage.rules`.** Every rules change needs a test in `tests/rules/`
  (`npm run test:rules` runs them on emulators; stop any running emulators first, they share ports).
- Public/kiosk UI: light, big touch targets, no links off-site on kiosk pages, Spanish (RV1960 for verses).
  Missionary-facing pages: Spanish first with EN toggle. Admin: Spanish first, ES/EN toggle, light default
  with optional dark mode.
- Keep changes focused; the owner reviews the code.

## Data model (Firestore)

| Collection | What | Who writes |
|---|---|---|
| `missionaries/{id}` | Public page (`src/types.ts` `Missionary`, incl. `churches[]`) | admins |
| `missionaryDrafts/{id}` | Unpublished pages (from approved requests) | admins |
| `missionaryArchive/{id}` | "Deleted" pages `{ page, wasDraft, archivedAt }` | admins |
| `missionaryHistory/{id}/versions` | Old page versions + `savedAt/savedBy/reason` | admins (create only) |
| `missionaryProfiles/{id}` | Private: email, phone, preferredContact, language, spouse, sending church, notes, `ownerEmail` (= lower-case email, the sign-in identity), `invitedAt`, `openEditId` | admins; the missionary may change only phone/contact prefs/language |
| `missionaryRequests/{id}` | Public request form submissions | public create, admins |
| `missionaryEdits/{token}` | A proposed page change (draft → submitted → approved/rejected). The id is a secret token | token holder / owner saves; admins review |
| `missionaryReports/{id}` | One per report or "no updates": `missionaryId, quarterId (YYYY-Qn), kind, pdfPath, comments, submittedBy ('missionary' or admin email)`, review fields | admins or the owner; only review fields editable |
| `mail/{id}` | Email outbox + log (`template, lang, vars, status`) | admins may queue only `custom`; functions queue the rest |
| `mailCampaigns/{id}` | Mass emails + who had no email (`offlineDone`) | admins |
| `settings/reportPeriods` | `{ startMonth: 11, firstYear: 2026, dueDays: 15 }` | admins |
| `settings/email` | `{ remindersEnabled }` | admins |
| `settings/kiosk`, `settings/conference`, `settings/hotels`, `registrations`, `conferences/*` | Conference features (unchanged) | see rules |

Storage: `images/ pdfs/ videos/` public; `missionary-requests/{id}/…` and `missionary-edits/{token}/…` pending
uploads; `reports/{missionaryId}/…` private report PDFs (admins + owner, create only).

**Admins** = verified Google accounts on @iblibertad.org/.com (`isAdmin()` in rules, `isAdminEmail` in `src/firebase.ts`).
**Missionaries** sign in with an email link; rules match `request.auth.token.email` to the profile's `ownerEmail`.

## Main flows and where the code is

- **Request → page:** `/misioneros/solicitud` (`src/MissionaryRequest/`) → admin Solicitudes approves
  (`approveMissionaryRequest` in `src/data/missionaryRequests.ts`: copies files, geocodes, creates draft + profile).
- **Admin** (`src/Administrator/admin.tsx`): tabs inicio, misioneros, cambios, informes, correos, solicitudes,
  registros, recogidas, pantallas (`?tab=`; profile deep link `?tab=misioneros&m=<id>&seccion=informes|correos|historial`).
  Shared data: `directory/directoryData.tsx` (all missionaries + profiles + requests), `reports/reportsData.tsx`,
  `changes/ChangesBoard.tsx` (`PendingEditsProvider`). Theme/language: `adminUi.tsx` (`A.*` color tokens are
  CSS variables on `:root`, `tr(es, en)` for text, `LightIsland` to keep missionary-facing UI light).
- **Missionary portal** `/misioneros/mi-pagina` (`src/Portal/`): sign-in links, report form, page editor
  (`PageEditor.tsx`, also used by admins for "Ajustar"), contact details; `?enlace=<token>` opens only the editor.
- **Review:** `changes/ReviewDialog.tsx` (diff in `changes/diff.ts`), approve = `approveEdit` in
  `src/data/missionaryEdits.ts` (copy files → history snapshot → publish → mark approved).
- **Previews:** `src/ui/PreviewFrame.tsx` renders the public page in an iframe at real desktop/phone width via
  `/misioneros/vista-previa` (`src/Missionaries/PreviewHost.tsx`, gets the page by postMessage).
- **Quarters:** `src/data/reports.ts` (client) and `functions/src/mail/quarters.ts` (server copy; keep in sync).
- **Excel export:** `directory/exportMissionaries.ts` (+ reports sheet in `reports/reportTasks.tsx`).

## Cloud Functions (`functions/src/`)

- `index.ts`: video transcoding (`transcodeVideo`, `cleanUpVideo`) + exports below.
- `mail/`: `sendQueuedMail` (sends every new `mail` doc via Gmail API as misiones@ using domain-wide
  delegation through the `mail-sender` service account, no keys; `MAIL_TRANSPORT=log` only records),
  `onMissionaryRequest` (confirmation + notice), `sendReportReminders` (daily 8:00 Chicago: 7 days before,
  on, and 7 days after the due date, idempotent ids `reminder-<id>-<quarter>-<stage>`), `onReportSubmitted`.
  Templates (ES/EN) in `mail/templates.ts`. Config in `functions/.env` (live: `MAIL_TRANSPORT=gmail`).
- `portal.ts`: `requestSignInLink` (never reveals if an address exists), `inviteMissionary` (admins),
  `startMissionaryEdit`, `onEditStatusChange` (emails on submit/approve/reject).
- Setup and what each email is: `docs/EMAIL_SETUP.md`.

## Local development (made-up data, never touches production)

```
npm run emulators        # auth, firestore, storage, functions (project demo-ibl-missions)
npm run emulators:seed   # fictional missionaries, requests, reports, a pending change
npm run dev:emulators    # site against the emulators; /admin has an emulator-only sign-in button
```

Sign-in links for the portal show in the functions log (and in the `mail` docs) because emulator email is
never sent. Check phone layouts at 390px (iframe trick works well) and the admin in both light and dark.

## Ideas not built yet

`docs/FUTURE-IDEAS.md` (e.g. AI summaries of reports).
