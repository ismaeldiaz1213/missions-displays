# Every page on misiones.iblibertad.org

What each page is for, who sees it, and what you can do there. Screen names are the Spanish ones
shown on the site.

## Public pages (the hallway screens and anyone's phone)

| Address | What it is |
|---|---|
| `/` | **Home screen.** Turning globe with missionary pins and a Bible verse. On a phone it goes straight to the map. Tap a pin to open that missionary. |
| `/region-selection` | **World map.** Pick a continent; pinch or use +/− to zoom. Shows the conference card when there's a conference coming. |
| `/norte-america`, `/centro-america`, `/sur-america`, `/europa`, `/africa`, `/asia`, `/oceania` | **Continent pages.** Missionary cards (the main attraction) and a map of where each one serves. An empty continent shows a QR code to the request form. |
| `/misionero/<id>` | **A missionary's page.** About them, notes/prayer requests, videos, photos, **churches** (new: a street map with a pin for each church they planted, with its address), where they serve, local time and weather, prayer letter, contact, and a QR code to take the page home. |
| `/misioneros/solicitud` | **Request form** ("Solicitud de página misionera"). A missionary sends their info, photos and prayer letter to ask for a page. Spanish first, English toggle. They get a confirmation email; the missions inbox gets a notice. |
| `/conferencia` | **Conference page**: schedule, videos, photo gallery. |
| `/conferencia/registro` | **Conference registration** (unlisted; linked from the church website). |
| `/conferencia/subir/<id>` | **Video upload** for registered missionaries and evangelists (link sent after registering). |
| `/timeline` | An old placeholder (the pastor's timeline); not linked anywhere. |
| anything else | "Page not found" with a button back to the map. |

## The missionary's own page: `/misioneros/mi-pagina`

Spanish first, English toggle, made for phones.

- **Sign in.** They type their email and receive a one-time link from misiones@ (no password). If they open
  the link on another device, it asks them to confirm the email.
- **Home ("Hola, …")** with four big buttons:
  - **Enviar mi informe.** Choose the quarter, attach a PDF (optional), write comments or prayer requests, and send. Or
    press **"No tengo novedades este trimestre"**, which stops that quarter's reminders. Earlier reports are never replaced.
  - **Editar mi página.** Everything on their public page, with a live preview (computer or phone):
    - Name, ministry, description, prayer requests, where they serve (city search + map pin), and public contact info.
    - Profile photo, prayer letter, and gallery. They see their current photos and videos; tap one to view it large,
      tap the red trash button to take it off. Every removal shows **Deshacer** (undo).
    - **Iglesias:** the churches they planted, with name, address, "Ubicar en el mapa", and tapping the map to place the pin exactly.
    - Nothing changes until they press a button. The bar at the bottom says "Cambios sin guardar" while there are
      changes. **Descartar** puts everything back as it was last saved. Leaving with unsaved changes asks first.
    - **Guardar borrador** keeps working later; **Enviar para revisión** sends it to the church. Nothing goes live until an admin approves it.
    - If the church asks for a fix, the reason shows at the top.
  - **Mis datos de contacto.** Phone/WhatsApp, how they prefer to be reached, and email language. Their email is how
    they sign in, so only the church changes it.
  - **Ver mi página.** Opens their public page.
- **`?enlace=<code>`**: for missionaries without email. A private link from the church (sent by WhatsApp, etc.)
  opens just the page editor, no sign-in.

## Admin: `/admin`

Church Google accounts only (@iblibertad.org / @iblibertad.com). Spanish first with an **ES/EN** toggle, and a
**moon/sun** button for dark mode (light is the default; the choice is saved on that computer). Works on phones.

| Tab | What it's for |
|---|---|
| **Inicio** | Today's to-do list, each with its button: new requests, changes to approve, reports to review, late reports, unpublished drafts, profiles to complete, and missionaries without email (with their phone and preferred method). Totals at the top. |
| **Misioneros** | Every missionary as a card. Search, filter by continent, and chips for Publicados / Borradores / Perfil por completar / Sin correo / Archivados. **Exportar Excel** (formatted workbook: everyone, reports, no-email list, archived). **Añadir misionero** creates a page, then asks for the private details. Click a card to open the profile below. |
| **Cambios** | Page changes missionaries sent. The review screen shows what changed (old → new, word by word for texts, photos added/removed) next to a before/after preview. **Aprobar y publicar**, **Pedir cambios** (with a reason the missionary sees and gets by email), or **Ajustar** (fix it yourself, then approve). |
| **Informes** | Missionaries × quarters (Q1 Nov–Jan … Q4 Aug–Oct, due 15 days after each quarter), color-coded: en curso, pendiente, atrasado, recibido, revisado, sin novedades. Click any cell to read the report, record one on their behalf, mark it reviewed, or publish the PDF/comments on their page. **Configurar** changes the start month and due days. |
| **Correos** | Write to everyone, those missing a report, a continent, complete profiles, or people you pick. Optional English version for those who prefer it, preview, "Enviarme una prueba". Missionaries without email are listed to reach another way and can be ticked off in **Historial**. Switch to pause the automatic report reminders. |
| **Solicitudes** | Page requests from the public form, with everything they sent and their files. **Aprobar y crear borrador** makes a hidden draft page and their private profile. **Archivar** hides a request (nothing is deleted). |
| **Registros** | Conference registrations, hotels, Excel/PDF exports, video ZIP, archive a past conference. |
| **Recogidas** | Airport/bus pickups grouped into trips, with a map and driver sheets. |
| **Pantallas** | What the hallway screens show about the conference (automatic, upcoming, live, over). |

### A missionary's profile (opens from Misioneros)

Buttons at the top: **Editar página** (the full admin editor, including churches), **Completar perfil / Editar datos
privados**, **Ver en el sitio**, **Archivar / Restaurar**. Sections:

- **Resumen**:
  - **Acceso a su página**: send or resend the invitation email, or, without email, create and turn off a private edit link.
  - Private contact and preferred method, family and ministry, location, what's on their public page, internal notes, and when things changed.
- **Informes**: every quarter so far and its status; click to open.
- **Correos**: every email we've sent them, and **Escribirle**.
- **Historial**: every earlier version of their page (saved automatically before each change); view it and **Restaurar**
  (restoring also saves the current version, so it can be undone).
- **Vista previa**: their page exactly as it looks, on a computer or a phone.

## Behind the scenes (not pages)

- `/misioneros/vista-previa` only draws page previews inside the admin and the editor; nobody visits it directly.
- Emails (confirmations, invitations, sign-in links, reminders, approval notices) are sent by Cloud Functions from
  misiones@; see `EMAIL_SETUP.md`.
- Nothing is ever deleted: archived pages and requests, old page versions, reports, report PDFs and sent emails are all kept.
