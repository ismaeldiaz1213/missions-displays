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
| Missionary video conversion (`functions/`) | Cloud Functions | Firebase console → Functions |
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
- **Security rules** (`firestore.rules`, `storage.rules`): not deployed by GitHub. After changing them, run `npx firebase-tools login` once, then `npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage --project ibl-missions-display`.
- **Video conversion function** (`functions/`): not deployed by GitHub. `npx firebase-tools deploy --only functions --project ibl-missions-display`. Phone videos uploaded to `videos/` are often HEVC, which most PCs can't play, so `transcodeVideo` writes an H.264 copy to `videos/web/` and a still frame to `videos/posters/`; the missionary page uses them when they exist.
- **Storage CORS** (`storage.cors.json`): lets the kiosks (which run the site on `localhost`) read prayer letters and videos. Apply with `npm run cors:storage`.

### Who can do what
- **Admins** (`/admin`): any Google account ending in `@iblibertad.org` or `@iblibertad.com`. Enforced in `firestore.rules` and `storage.rules`, not just in the UI.
- **Developers / console access:** Firebase console → Project settings → Users and permissions.

### Key routes
| Route | What it is |
|---|---|
| `/` | Kiosk welcome screen — a live globe that flies to each missionary with Scripture along the way (phones skip to the map). Add `?rapido` to watch it at 4× speed |
| `/region-selection`, `/norte-america`, … | Missionary map & continent pages |
| `/misionero/:id` | Missionary mini-site |
| `/admin` | Admin portal (missionaries, page requests, conference registrations with Excel/PDF export, the pickup planner, and **Pantallas**: the conference stage the kiosks show) |
| `/conferencia` | Conference landing page — the link to give the church website. Poster, video, schedule, info and the registration button. `?lang=en` for English |
| `/conferencia/registro` | Conference registration — unlisted, linked from the church website. `?lang=en` for English |
| `/conferencia/subir/:registrationId` | Private MP4 upload link shown to missionaries and evangelists after registering |
| `/misioneros/solicitud` | Public missionary page request form (linked from the home page). Admins approve requests in **Admin → Solicitudes**, which creates a hidden draft to review and publish |

### Kiosk conference stage
The map page's conference card follows **Admin → Pantallas**: *Automático* (by date), *Próximamente*, *En vivo* (shows the missionary QR code) or *Terminó* (shows the recap). Preview any stage without changing it with `/region-selection?conferencia=antes|en-vivo|despues`. The text lives in `src/RegionSelection/kioskContent.ts`.

### Offline
Kiosks remember the last missionary list, so they keep working when the Wi-Fi drops: every page shows the saved copy first and refreshes it in the background (`src/data/useCachedLoad.ts`). Photos, posters and prayer letters are cached by the service worker (`vite.config.ts`).

### Conference settings
Dates, deadline, and hotel fee live in `src/Registration/conference.ts`. The deadline and fee are **also enforced** in `firestore.rules` / `storage.rules` — update both, then run `npm run deploy:rules`.


## Hotel fee

The fee is **per room per night**, not per person: `HOTEL_FEE_PER_DAY × nights × rooms`.
A room sleeps `ROOM_CAPACITY` (4) — the registrant, his wife and up to two children — and
infants under 2 don't count toward it, so a couple with two kids and a baby still needs one
room. Missionaries, evangelists and anyone with their own lodging pay nothing. All of it lives
in `calculateHotelFee` / `roomCount` in `src/Registration/conference.ts` and is mirrored in
`firestore.rules`.

The admin table, detail dialog and exports call `hotelFeeOf(r)`, which **recomputes** at today's
rules rather than trusting the `hotelFee` stored on the document, so registrations saved under an
older formula still show the right amount.

```bash
npm run test:rules              # fee rules against the Firestore emulator (20 cases)
npm run test:rules:transition   # same, with the legacy amounts still allowed
```

**Changing the formula** means the rules and already-loaded pages disagree for a while, so:

```bash
npm run deploy:rules:transition   # 1. accept both the old and new amounts
git push                          # 2. ship the new site
npm run deploy:rules              # 3. a day later, back to strict
```

## Maps

Every Leaflet map renders `src/mapTiles.tsx`, which points at OpenStreetMap's own tiles.
CARTO's basemap (used until Sept 2026) now stamps "API KEY REQUIRED" across tiles from
unregistered sites, so it was swapped out. OSM tiles are free and need no key; keep the
attribution visible if you change providers. `src/mapTiles.css` keeps the attribution
readable but not clickable, because kiosk visitors kept tapping the Leaflet link.

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
| Invitation video (per language) | `INVITATION_VIDEO` in `src/Conference/conferenceContent.ts` |
| Past-conference photos and videos | `PAST_GALLERY` in the same file; see `docs/TODO-conference-photos.md` |
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

The English invitation came from an iPhone as a 1.9 GB 4K/120 fps HDR (HLG) HEVC `.MOV`,
which most browsers can't play and which washes out on normal screens. It was converted to a
~50 MB 1080×1920 H.264 MP4, tone-mapped to regular color (the `.MOV` master stays out of git):

```bash
VF="zscale=w=1080:h=1920:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,fps=30"
ffmpeg -i in.MOV -map 0:v:0 -vf "$VF" -c:v libx264 -preset slow -profile:v high -b:v 2500k -pass 1 -an -f mp4 /dev/null
ffmpeg -i in.MOV -map 0:v:0 -map 0:a:0 -vf "$VF" -c:v libx264 -preset slow -profile:v high -b:v 2500k -pass 2 \
  -c:a aac -b:a 128k -movflags +faststart public/conferencia/english-2026-invitation.mp4
```

For a landscape video swap `w=1080:h=1920` for `w=1920:h=1080`. Keep the result under 100 MB
(GitHub's limit); `-b:v` controls the size.

`globe-arc.png` is a white silhouette of the globe from the artwork, used through a CSS mask
(`.conf-globe`) so it can be tinted gold, maroon or cream per section.
