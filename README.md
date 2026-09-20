# Interactive Missions Displays
- Goal: Allow church members at Iglesia Bautista Libertad to learn more about the missionaries the church supports through a visual interactive user experience.

## Phase 0: Planning (Proof of Concept)
### Platform
- PowerPoint was the best approach at the time as it appeared to be the easiest to implement as well as the easiest to update (or so we thought) given that PowerPoint will sync nicely to the OneDrive which our mini PC's should connect to.

### Hardware
- Attached is *most* the hardware that was purchased:
     - 2 Mini PC's (AMD CPUs, 16GB of RAM, other specs I can't fully remember)
     - 2 SMART Boards (repurposed)
     - 2 LED Light Strips
     - 4 KASA Smart Plugs
     - 2 600 lb rated TV wall mounts

## Phase 1: First Product (PowerPoint)
- The PowerPoint project can be accessed through this [link] (https://iblibertad.sharepoint.com/:p:/s/IBLMediaContent/EQlWjgaeKe1OqhZlpR6YQ3oBrpYATDbiFQZpPVzEXDTaBQ?e=mtVs8d). 
- This is the **current** product that was launched to the church to use. However, there could still be significant improvement in the automation of updating a missionary and since the file is now over a GB, it takes a while for onedrive to load in the new file after a change has been made. Sometimes when a change is made, someone has to manually turn it on and close the existing PowerPoint instance so that it can 

### Hardware & Windows Implementation
- For each SMART Board, we use a KASA Smart Plug that allows us to schedule when it should turn on. These should turn on a couple of minutes after the Mini PC's have turned on in order for users to not see the Windows startup screens. 
- For each Mini PC we use a KASA Smart Plug that allows us to schedule when it should turn on.
- Windows was configured to auto log in on startup
- Task Scheduler was used for running the startup and shutdown sequences. Startup is essentially opening the presentation powerpoint file. Shutdown does what it says, it shutsdown the PC. Power to the MiniPCs is turned off a couple of minutes after the shutdown sequence should have ended. This shut down sequence was done in order to protect the hardware so that it turns off properly.

## Phase 2: Improved Product (React Website)
- Below will outline the plans and goals for the improvement of this product through the conversion of the powerpoint to a React website. A React website has great potential to automate the creation of a missionary page through the power of a database or some cloud services like AWS or Google Cloud.

### Goal 1: New Proof of Concept
- Currently the Proof of Concept is still a work in progress and pretty limited. 
- Live site: https://misiones.iblibertad.org — every push to `master` deploys automatically (see **Development** below).
- Estimated Time of Completion: December 31st, 2025

### Goal 2: Automation
- Automate the creation of a new missionary. Have an Admin page that can create and modify missionaries of the church. 
- Estimated Time of Completion: May 18th, 2026

### Goal 3: Continuous Updates
- Refining the UI, bug fixes, and code clean up.
- Estimated Time of Completion: August 10, 2026

### Goal 4: Improve Visuals/ User Experience
- Get a small sample of people to try out this new website and gather their feedback.
- Estimated Time of Completion: August 20th, 2026

### Goal 5: Debugg
- Add unit tests to backend.
- Stretch goal: add units to frontend.
- Estiamted Time of Completion: TBD

### Goal 6: Soft Launch
- Change one missions display board to have this react website shown to users and gather user feedback.
- Estimated Time of Soft Launch: TBD.

## Phase 3: New Launch
- Once this new website has been tested and we can guarantee that missionaries can get updated automatically, then this new product will be launched with a key emphasis placed on ensuring the user experience is of the highest quality. (surveys will be necessary for this in order to attain a quantitative measure).

## Phase 4: Updates and Expansion
- Assuming all goes well, other church's can benefit from a website like this. We shall see how that goes though!

## Development

Everything runs on **Google Cloud via Firebase** (project `ibl-missions-display`, owned by diazismael@iblibertad.com).

| Piece | Service | Where to manage it |
|---|---|---|
| Website hosting | Firebase Hosting | [Firebase console](https://console.firebase.google.com/project/ibl-missions-display) → Hosting |
| Missionaries & conference registrations | Cloud Firestore | Firebase console → Firestore Database |
| Photos, prayer letters, conference videos | Cloud Storage | Firebase console → Storage |
| Admin login (Google) | Firebase Authentication | Firebase console → Authentication |
| Billing & budget alert | Google Cloud | [Google Cloud console](https://console.cloud.google.com) → Billing |

### Run locally
```bash
npm install
npm run dev          # http://localhost:5173
```
The local site uses the real Firebase project — changes made in `/admin` locally are real.

### Deploy
- **Website:** push to `master`. GitHub Actions builds and deploys to Firebase Hosting (see the repo's **Actions** tab). Pull requests get a temporary preview link.
- **Security rules** (`firestore.rules`, `storage.rules`): not deployed by GitHub. After changing them, run `npx firebase-tools login` once, then `npm run deploy:rules`.

### Who can do what
- **Admins** (`/admin`): any Google account ending in `@iblibertad.org` or `@iblibertad.com`. Enforced in `firestore.rules` and `storage.rules`, not just in the UI.
- **Developers / console access:** Firebase console → Project settings → Users and permissions.

### Key routes
| Route | What it is |
|---|---|
| `/` | Kiosk home video |
| `/region-selection`, `/norte-america`, … | Missionary map & continent pages |
| `/misionero/:id` | Missionary mini-site |
| `/admin` | Admin portal (missionaries, page requests, conference registrations with Excel/PDF export, and the pickup planner) |
| `/conferencia` | Conference landing page — the link to give the church website. Poster, video, schedule, info and the registration button. `?lang=en` for English |
| `/conferencia/registro` | Conference registration — unlisted, linked from the church website. `?lang=en` for English |
| `/conferencia/subir/:registrationId` | Private MP4 upload link shown to missionaries and evangelists after registering |
| `/misioneros/solicitud` | Public missionary page request form (linked from the home page). Admins approve requests in **Admin → Solicitudes**, which creates a hidden draft to review and publish |

### Conference settings
Dates, deadline, and hotel fee live in `src/Registration/conference.ts`. The deadline and fee are **also enforced** in `firestore.rules` / `storage.rules` — update both, then run `npm run deploy:rules`.


## Conference pages (2026)

The landing page at `/conferencia` and the registration flow share the **harvest theme** taken from the
official artwork in `src/assets/MC 2026`: wheat, gold and deep maroon, with Playfair Display for headings.
The palette lives in `src/Conference/conference.css` under the `.ibl-harvest` class, so the rest of the
missionary site keeps its blue palette. `PageShell` opts in by default; pass `harvest={false}` for a page
that should stay blue (the missionary page request form does).

What to edit for next year:

| Change | Where |
| --- | --- |
| Dates, deadline, fee | `src/Registration/conference.ts` (also mirrored in `firestore.rules`) |
| Schedule times | `SCHEDULE` in `src/Conference/conferenceContent.ts` |
| Conference video | `CONFERENCE_VIDEO_ID` in `src/Conference/conferenceContent.ts` (currently the 2023 recap as a placeholder) |
| Wording, both languages | `src/Conference/conferenceI18n.ts` |
| Artwork | Drop new files in `src/assets/MC <year>`, then re-export to `public/conferencia/` (see below) |

The images in `public/conferencia/` are generated from the artwork with ImageMagick, because the originals
are ~24 MB each:

```bash
magick "src/assets/MC 2026/2.png" -resize 2400x -quality 82 public/conferencia/poster-2026.jpg
magick "src/assets/MC 2026/2.png" -resize 1200x -quality 80 public/conferencia/poster-2026-sm.jpg
# wheat texture: a text-free corner of the artwork
magick "src/assets/MC 2026/4.png" -crop 1400x856+5500+2600 +repage -resize 1800x -quality 80 public/conferencia/wheat-texture.jpg
```

`globe-arc.png` is a white silhouette of the globe from the artwork, used through a CSS mask
(`.conf-globe`) so it can be tinted gold, maroon or cream per section.
