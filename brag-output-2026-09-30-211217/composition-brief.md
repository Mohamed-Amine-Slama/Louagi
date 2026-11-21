# Hyperframes Composition Brief: Louagi — How-to (vertical)

## Objective
Create a short vertical **how-to demo** video for Louagi. It shows a fingertip booking a
louage on a phone in 4 numbered steps plus a bonus, and ends on the logo.

## Output
- Composition directory: `brag-output-2026-09-30-211217/composition/`
- Rendered video: `brag-output-2026-09-30-211217/brag.mp4`
- Format: vertical, 1080x1920, 30fps
- Duration: 25.0 seconds

## Source Material
- Project root: `louagi-app/` (Expo / React Native)
- Primary files read: `src/screens/public/LandingScreen.js`,
  `src/screens/passenger/{SearchScreen,RideDetailScreen,BookingConfirmScreen,DashboardScreen,DeliveryScreen}.js`,
  `src/components/{RideCard,PassengerActionButtons,FloatingTabBar,CityPicker,Button,Badge,Chip}.js`,
  `src/lib/tickets.js`, `src/theme/{colors,typography}.js`, `src/i18n/locales/en.json`,
  `supabase/seed.sql` (Tunis→Sfax 195 min, base 22 TND), `README.md`
- Product name: Louagi
- Tagline / strongest claim: "No queues. No double-bookings." (`landing:heroSubtitle`)
- Key UI to recreate: the full passenger flow inside a phone. That means the Home search
  ticket with its perforation, the city picker sheet, RideCards, the Ride detail screen with
  the sticky price footer, the Booking-confirmed check ring, the navy BoardingPass, and the
  Delivery screen.
- Copy that must appear verbatim (all from `en.json`):
  - "Where to today?", "Your next louage", "Louage ticket", "Search rides", "Choose city",
    "Search a city", "Popular routes"
  - "Find a ride", "Filters", "per seat"
  - "Seats", "Payment", "Flouci", "Secure mobile payment", "Secure", "Booking fee",
    "Total", "Book 1 seat", "Processing payment…"
  - "Booking confirmed", "See you at the station", "You're booked!", "Ref: …",
    "Back to bookings"
  - "Your next trip", "Boarding pass", "Departs in 2h 10m", "View ticket"
  - "Boxes & Parcels", "Louagi delivery", "Send a box on a ride already going your way.",
    "Drop", "Ride", "Collect", "Routes with space today", "4 of 6 slots free", "Reserve"
  - "No queues. No double-bookings."

## Creative Direction
- Tone preset: app-store
- Creative direction: a friendly step-by-step phone tutorial, where a fingertip walks
  through a real booking one numbered step at a time
- Interpretation: calm and clear. The caption above the phone does the teaching, and the
  phone shows the real app doing it. Use iOS-style push and tab transitions, and never
  flash text. Motion inside the phone only happens where a real user gesture would cause it.
- Angle: this is a how-to, not a pitch (the pitch already exists in `brag-output/`).
  Booking a louage now takes 4 taps instead of a trip to the station and a queue.
- Hook: `HOW TO · LOUAGI` / **"Book a louage in 4 steps."** The phone rises and lands on
  the 1.59s beat, already showing the Home screen.
- Outro / punchline: logo, then "Louagi", then **"No queues. No double-bookings."**
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Redesigning the app's UI. The screens must look like Louagi.
  - Showing the "Seat lock active / Another rider is booking now" banner on the booking
    user's own screen. In the app only *other* riders see it, so the caption states the
    seat-hold claim in words instead.

## Visual Identity
- Background: `#F4EFE6` (surface); cards `#ffffff`, `#FAF6EE`, `#EFE9DD`, `#EAE2D2`
- Text: `#1b1b1e`, muted `#44474e`; outline `#DED5C3`
- Accent: `#DC2626` (secondaryContainer, the louage red). Primary navy is `#07214b`.
- Ticket: navy `#0A2247`, gold `#FFD27A`, to-code `#FF6470`, on-navy muted `rgba(255,255,255,.55)`
- Tab dock: `#241A12`, active `#FF5A6E`, inactive `rgba(255,255,255,.5)`
- Success `#157347` / `#d1f1de`; warning `#8f6900`
- Display + body font: Plus Jakarta Sans (bundled TTFs, 500/600/700/800)
- Mono: Ubuntu Sans Mono (stands in for the platform `monospace` used by `MONO`)
- Visual references: the search ticket perforation with its punched notches, the city-code
  typography, the RideCard red accent bar, and the navy BoardingPass

## Storyboard
Use the storyboard in `brag-output-2026-09-30-211217/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.65s — "Book a louage in 4 steps."; the phone lands on Home
2. Step 1 Pick your route — 3.69s — tap SOU, the city sheet, tap Sfax, the code flips, tap Search rides
3. Step 2 Choose a ride — 3.16s — Find a ride results, 3 RideCards, tap 07:30
4. Step 3 Book & pay — 4.20s — Ride detail, scroll, footer total 25 TND, tap Book 1 seat, Processing, You're booked!
5. Step 4 Show your pass — 5.26s — Back to bookings, then the Bookings tab with the navy boarding pass
6. Bonus Send a parcel — 3.16s — Delivery tab, Drop → Ride → Collect, route with slots, Reserve
7. Outro — 2.88s — logo, "Louagi", "No queues. No double-bookings."

## Audio
- Audio role: a warm bed with a tactile, touch-driven UI layer
- Audio arc: the bed fades in under the hook and stays steady through the steps. Taps and
  pushes punctuate it, one bell lands on the booking, and the bed fades out under the logo.
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: ~0.30 bed, 0.6s fade-in, fade out 23.8 → 25.0
- Music cue guidance: bundled preset
  `~/.claude/skills/brag/assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`
  (114.84 BPM). Strong cues to lock: 3.70 (tap SOU), 8.44 (tap the ride card), 12.65
  (You're booked!). Beat grid for Drop / Ride / Collect: 19.48 / 20.02 / 20.54.
- Audio-reactive treatment: subtle. Background glows breathe on RMS/bass only, and nothing
  inside the phone reacts.
- Audio-coupled moments:
  - every fingertip tap (click)
  - the city sheet up/down and each screen push (soft slide)
  - "You're booked!" check ring (bell)
  - the boarding pass landing (soft impact) and the perforation (light tick)
  - the delivery steps (soft drops)
  - the logo (soft accent)
- SFX selection guidance: interface clicks for taps, casino card-slide for pushes and
  sheets, impactBell_heavy_000 for the booking, interface drops for the steps,
  impactSoft_medium for landings
- SFX analysis guidance: `~/.claude/skills/brag/assets/sfx/sfx-analysis.md`. Prefer low
  HF-risk files for the repeated taps.
- Exact SFX choice: Hyperframes picks the files and timestamps from the implemented motion
- Audio files are copied into `composition/assets/`

## Hyperframes Instructions
Build with `hyperframes-core` / `-animation` / `-creative` / `-keyframes` / `-cli`. Use one
paused GSAP timeline registered at `window.__timelines[<composition-id>]`. Keep all UI state
changes (code flip, button label, counters) derived from timeline time so every seek is
correct. Run `npx hyperframes check` before rendering.
