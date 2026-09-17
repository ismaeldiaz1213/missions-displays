# TODO: Optimal pickup route

**Status:** not started. This is a plan only.

## Goal

An admin page, "Recogidas" (Pickups), that tells the driver:

1. **Who to pick up and in what order.** Group arrivals by airport and time window. A driver shouldn't make three trips to IAH when three flights land within an hour of each other.
2. **Where to go.** Show a map with a pin for each airport and one for Iglesia Bautista Libertad (IBL).
3. **How far.** Show the driving distance and time from IBL to each airport, and from the airport back to IBL.
4. **Whether the flight is late.** This is optional (see Phase 3).

## The data we already collect

Every registration with `travel.needsPickup == true` has these fields. The form and `firestore.rules` require all of them:

| Field | Example | Notes |
| --- | --- | --- |
| `travel.airline` | `American Airlines` | Free text |
| `travel.flightNumber` | `AA 1234` | Upper-cased by the form; spacing varies |
| `travel.airport` | `IAH` | Free text. Could become a dropdown later (see open questions) |
| `travel.arrivalDate` | `2026-11-01` | YYYY-MM-DD |
| `travel.arrivalTime` | `14:30` | 24 h, local time at the airport |
| `registrant.phone`, `peopleCount(r)` | | Who to call and how many seats are needed |

Helpers already exist in `src/Administrator/registrations/registrationData.ts`: `byArrival`, `travelDetails`, `peopleCount`.

## Phase 1: pickup schedule (no external services, $0)

- [ ] Add a "Recogidas" tab (or a section in "Registros") listing pickups sorted by `byArrival`.
- [ ] Group rows by **date → airport → time window**. Start with 90-minute windows and make the size configurable.
  - Within a window, one trip covers everyone. Wait for the latest arrival, plus about 30 min for bags.
  - Show the seats needed per trip (the sum of `peopleCount`) so we know whether it takes a car or a van.
- [ ] Add a suggested "leave IBL at" time: the first arrival in the window, minus the drive time. Phase 1 uses a hardcoded drive time per airport, entered once in a config such as `PICKUP_AIRPORTS` (`{ code, name, lat, lng, driveMinutes }`).
- [ ] Add a printable/PDF "driver sheet" per day, reusing the jspdf setup in `exportRegistrations.ts`. Include name, phone, flight, landing time, seats and notes.
- [ ] Add "Assign driver" (optional): a `pickupAssignments/{registrationId}` doc with the driver name and status (pending, picked up), admin-only in rules.

## Phase 2: real distances and a map

The options below are ordered cheapest first.

### Option A: Google Maps Platform (recommended; fits our Google Cloud setup)

- **Distance Matrix / Routes API (`computeRouteMatrix`)** gives drive time and distance from IBL to each airport, optionally at the actual departure time for traffic.
  - Airports rarely change, so cache results in Firestore (`pickupRoutes/{airport}`) and refresh about once a day. Calls then stay in the low hundreds per month.
- **Routes API `computeRoutes` with `optimizeWaypointOrder: true`** handles one driver collecting people from several locations in one loop, such as two airports.
- **Maps Embed API or a Google Maps link** shows directions. Zero-cost option: `https://www.google.com/maps/dir/?api=1&origin=<IBL>&destination=<airport>&travelmode=driving`. It opens turn-by-turn directions on the driver's phone with no API key.
- **Cost:** Google gives a monthly free usage allowance per API. At our volume (dozens of pickups a year) this should stay at $0, but confirm current pricing before enabling.
- **Setup:** enable the Routes API in `ibl-missions-display` and create a separate API key restricted to that API. Call it from a Cloud Function, never from the browser, so the key isn't public.

### Option B: open-source / free

- **OSRM** (`router.project-osrm.org`) for drive time and distance, and **Leaflet**, already used in `RegionSelection`, for the map.
  - The public OSRM demo server has no SLA and no traffic data. Fine for rough estimates, not for real departure times.
- **OpenRouteService** is free with a key and rate limits, and also offers route optimization (VROOM) for multi-stop routes.

### Option C: no API

- Store `driveMinutes` per airport by hand (Phase 1) and use Google Maps directions links. This is probably enough for a conference-sized event.

## Phase 3: live flight status (optional)

- Look up delays and actual landing times by flight number, then re-order the pickup list automatically.
- **Services:**
  - **AeroDataBox (RapidAPI):** cheap, with a free tier.
  - **FlightAware AeroAPI:** pay-per-query.
  - **Aviationstack:** has a free tier.
- Poll only on arrival days, and only for flights landing within the next ~6 hours, from a scheduled Cloud Function. This keeps costs near zero.
- Flight numbers are free text, so normalize them (`AA1234` → IATA carrier `AA` + number `1234`) before lookup.

## Suggested architecture

```
registrations (Firestore)
   └─▶ admin "Recogidas" page (React)
          ├─ groups arrivals into trips (pure function, unit-testable)
          ├─ reads cached drive times: pickupRoutes/{airport}
          └─ "Open in Google Maps" links for each trip

Cloud Function (scheduled, daily; Phase 2+)
   └─ Routes API → writes pickupRoutes/{airport}
Cloud Function (scheduled, arrival days only; Phase 3)
   └─ Flight status API → writes flightStatus/{registrationId}
```

Cloud Functions require the Blaze plan, which this project already has. Keep them in `us-east1` with the rest of the project.

## Open questions for the church

- What is IBL's exact street address, used as the route origin?
- Which airports do we pick up from? If it's always the same one or two, change `travel.airport` from free text to a dropdown so the data groups cleanly.
- How many drivers and vehicles are available, and how many seats each?
- Do we also pick up people *departing* after the conference? That would need departure flight details, which we don't collect yet.
