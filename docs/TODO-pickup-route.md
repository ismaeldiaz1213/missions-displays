# Pickup route planner

**Status:** Phase 1 is built and live in the admin portal (`/admin?tab=recogidas`). Phases 2 and 3 are still plans.

## Goal

An admin page, "Recogidas" (Pickups), that tells the driver:

1. **Who to pick up and in what order.** Group arrivals by pickup place (airport, bus station, or other address) and time window. A driver shouldn't make three trips to IAH when three flights land within an hour of each other.
2. **Where to go.** Show a map with a pin for each pickup place and one for Iglesia Bautista Libertad (IBL).
3. **How far.** Show the driving time from IBL to each place, and a suggested "leave the church at" time.
4. **Whether the flight is late.** Still to do (see Phase 3).

## The data we collect

Every registration with `travel.needsPickup == true` has a transport mode plus that mode's details. The form and `firestore.rules` require all of them:

| Field | Example | Notes |
| --- | --- | --- |
| `travel.transport` | `plane` / `bus` / `other` | Decides which detail fields below are filled in |
| `travel.airline` | `American Airlines` | Free text |
| `travel.flightNumber` | `AA 1234` | Upper-cased by the form; spacing varies |
| `travel.airport` | `IAH` | Free text, matched against `KNOWN_PLACES` aliases |
| `travel.busCompany`, `travel.busStation` | `Greyhound`, `Houston downtown` | Bus pickups: the station is the pickup address |
| `travel.transportDetails`, `travel.pickupLocation` | `Train`, `Amtrak station` | Other pickups: free-text pickup address, geocoded |
| `travel.arrivalDate` | `2026-11-01` | YYYY-MM-DD |
| `travel.arrivalTime` | `14:30` | 24 h, local time at the pickup place |
| `registrant.phone`, `peopleCount(r)` | | Who to call and how many seats are needed |

## Phase 1 — done (no external services, $0)

Files: `src/Administrator/pickups/` (`pickupData.ts`, `PickupBoard.tsx`, `PickupMap.tsx`, `pickupSheet.ts`).

- [x] "Recogidas" tab in the admin portal, with totals (trips, people, RVs) and one tab per arrival day.
- [x] Arrivals grouped by **date → place → time window** (60/90/120/180 min, switchable). One trip covers everyone in a window, and the seat count per trip comes from `peopleCount`.
- [x] Per trip: leave the church at *last arrival + 30 min buffer − drive time*, plus the pickup time and a rough return time, written out as numbered instructions for the driver.
- [x] Map (Leaflet + OpenStreetMap tiles, no key) with the church and every pickup place for that day.
- [x] "Cómo llegar" opens Google Maps directions from the church address — turn-by-turn on the driver's phone, no API key.
- [x] Printable driver sheet per day (jsPDF), with names, phones, arrival times, flight/bus details, seats and notes.
- [x] Drive times: hardcoded in `KNOWN_PLACES` for IAH, Hobby and the downtown Greyhound station. Anything else is geocoded through OpenStreetMap Nominatim (cached in `localStorage`) and estimated from straight-line distance; the card says when the place couldn't be located.

**Tuning:** the church address, buffer, default window and per-airport drive times are all constants at the top of `pickupData.ts`. Add airports or stations to `KNOWN_PLACES` as the conference grows — aliases are matched as whole words, so "Greyhound" is not mistaken for "HOU".

Still open from this phase:

- [ ] **Assign a driver** per trip: a `pickupAssignments/{registrationId}` doc with driver name and status (pending / picked up), admin-only in `firestore.rules`. Skipped for now because it needs a rules change; `localStorage` would not sync between the admins' phones.

## Phase 2: real drive times and traffic

Only worth doing if the estimates prove to be off. Ordered cheapest first.

### Option A: Google Maps Platform (fits our Google Cloud setup)

- **Routes API `computeRouteMatrix`** gives drive time and distance from IBL to each place, optionally at the actual departure time so traffic counts. Cache in Firestore (`pickupRoutes/{placeKey}`) and refresh about once a day.
- **Routes API `computeRoutes` with `optimizeWaypointOrder: true`** handles one driver collecting people from several places in one loop (for example both airports).
- **Cost:** Google gives a monthly free allowance per API; at our volume this should stay at $0, but confirm current pricing first.
- **Setup:** enable the Routes API in `ibl-missions-display`, create a key restricted to it, and call it from a Cloud Function so the key never reaches the browser.

### Option B: open-source

- **OSRM** (`router.project-osrm.org`) for drive time and distance. No SLA and no traffic data, so no better than today's estimate for departure times.
- **OpenRouteService**: free with a key and rate limits, and offers route optimization (VROOM) for multi-stop trips.

## Phase 3: live flight status (optional)

- Look up delays and actual landing times by flight number, then re-order the pickup list automatically.
- **Services:** AeroDataBox (RapidAPI, cheap, free tier), FlightAware AeroAPI (pay per query), Aviationstack (free tier).
- Poll only on arrival days, and only for flights landing within the next ~6 hours, from a scheduled Cloud Function, which keeps the cost near zero.
- Flight numbers are free text, so normalize them (`AA1234` → carrier `AA` + number `1234`) before the lookup.

Cloud Functions need the Blaze plan, which this project already has. Keep them in `us-east1` with the rest of the project.

## Open questions for the church

- ~~What is IBL's exact street address?~~ 6111 Breen Dr, Houston, TX 77086 (in `CHURCH` in `pickupData.ts`).
- Which airports do we actually pick up from? If it's always IAH and Hobby, change `travel.airport` on the form from free text to a dropdown so the data always groups cleanly.
- How many drivers and vehicles are available, and how many seats each? The board shows seats per trip but doesn't know what fits in a vehicle.
- Do we also drive people back for their *departing* flights? That needs departure flight details, which the form doesn't ask for yet.
- Are the drive times in `KNOWN_PLACES` (IAH 30 min, Hobby 45 min, Greyhound 30 min) close enough, or should they be raised for conference-week traffic?
