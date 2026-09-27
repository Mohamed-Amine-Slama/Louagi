# Hyperframes Composition Brief: Louagi

## Objective
Create a short launch-style brag video for **Louagi** — an Expo/React Native app
for booking intercity louage (Tunisian shared-taxi) seats and sending parcels,
built as a confident, feature-forward product film out of the app's own
boarding-pass design language.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: **22.4 seconds** (root `data-duration="22.4"`)

## Source Material
- Project root: `/mnt/c/Users/moham/OneDrive/Desktop/Projects/app structure/louagi-app`
- Primary files read:
  - `README.md`, `package.json`, `app.json`
  - `src/theme/colors.js`, `src/theme/typography.js` (design tokens)
  - `src/lib/tickets.js` (`PASS` palette, `cityCode()`, `ticketRef()`, MONO)
  - `src/components/Logo.js` (SVG logo geometry), `src/components/RideCard.js`
  - `src/screens/public/LandingScreen.js` (boarding-pass search ticket)
  - `src/screens/passenger/BookingConfirmScreen.js`
  - `src/i18n/locales/en.json` (`landing`, `search`, `ride`, `booking`, `delivery`)
- Product name: **Louagi**
- Tagline / strongest claim: *"No queues. No double-bookings."*
- Key UI to recreate: the **boarding-pass search ticket** from `LandingScreen` —
  navy body, 3-letter mono city codes (`TUN` / `SFX`), circular swap button,
  dashed perforation with two punched notches, 16px card radius.

### Copy that must appear verbatim (all from the app's own strings)
- `YOUR NEXT LOUAGE` — `landing:yourNextLouage`, red kicker, mono, letterspaced
- `Where to today?` — `landing:whereTo`, display headline
- `LOUAGE TICKET` / `TODAY` — `landing:louageTicket` / `landing:today`, ticket chrome
- `TUN` / `SFX`, `Tunis` / `Sfax` — from `cityCode()` in `src/lib/tickets.js`
- `Search rides`, `Seats` — `landing:searchRides`, `landing:seatsLabel`
- `25 TND` + `per seat` — `RideCard` price block (`common:tnd`, `common:perSeat`)
- `3 seats left` / `2 seats left` — `ride:seatsLeft_plural`
- `Seat lock active` + `Another rider is booking now (0:09)` — `ride:seatLockActive`, `ride:seatLockBody`
- `Flouci` + `Secure mobile payment` — `ride:flouci`, `ride:flouciHint`
- `Book 1 seat · 28 TND` — `ride:bookSeats` + total; `Processing payment…` — `ride:processingPayment`
- `You're booked!` — `booking:youAreBooked`; `Ref: LGI-4F2A` — `booking:ref` + `ticketRef()`
- `Paid` — `booking:paid`; `~135 min ride` — `booking:minRide`
- `LOUAGI DELIVERY` — `delivery:sendBoxKicker`
- `Send a box on a ride already going your way.` — `delivery:sendBoxTitle`
- `Drop` / `Ride` / `Collect` — `delivery:stepDrop` / `stepRide` / `stepCollect`
- `4 of 6 slots free` — `delivery:slotsFree`; `LIVE` — `delivery:liveNow`
- `Louagi` — `common:appName`; `No queues. No double-bookings.` — from `landing:heroSubtitle`
- `EN` `FR` `AR` locale chips; Arabic RTL line for the final beat

## Creative Direction
- Tone preset: **app-store**
- Creative direction: *a premium transit-ticket product film — the louage gets a boarding pass*
- Interpretation: Clean, feature-forward, confident. Recreate the real UI faithfully
  rather than abstracting it. Slides and smooth wipes; no hard cuts, no chaos, no
  jokes. Entrances are snappy (0.3–0.5s) but every readable line holds past its
  reading floor. The product is real, so play it completely straight.
- Angle: A louage is the least formal vehicle in Tunisia — you show up at the
  station, you queue, you hope the seat is still there. Louagi gives it the
  interface of an airline: three-letter city codes, a perforated ticket, a seat
  that is genuinely *locked* while you pay, a reference number. The brag is not
  "we made an app" — it's "the louage has a boarding pass now."
- Hook: warm sand field, red mono kicker `YOUR NEXT LOUAGE`, the app's real
  headline **"Where to today?"** slamming in, and the navy boarding-pass card
  dropping in beneath it with `TUN` and `SFX` on the tear line.
- Outro / punchline: logo + `Louagi` + **"No queues. No double-bookings."**, then
  `EN` `FR` `AR` chips, and the `AR` chip flipping the line to Arabic RTL on the
  last beat.
- Avoid:
  - Generic SaaS language (no "streamline your workflow")
  - Abstract filler visuals, particle fields, gradient text, equalizer graphics
  - Unrelated visual redesign — this is the app's palette and the app's copy
  - Anything that reads as a meme edit or hype reel

## Visual Identity
All values lifted directly from `src/theme/colors.js` and `src/lib/tickets.js`.

- Background: `#F4EFE6` (theme `surface`, warm sand) — **light canvas, keep it light**
- Surfaces: `#ffffff` (`surfaceContainerLowest`), `#FAF6EE`, `#EAE2D2` (`surfaceVariant`)
- Ticket navy: `#0A2247` (`PASS.navy`), deep `#031634` (`PASS.navyDeep`), driver `#0E2C57`
- Accent (louage red): `#DC2626` (`secondaryContainer`); pressed `#b91c1c`; logo red `#C8102E`
- Primary navy: `#07214b`; on-navy gold `#FFD27A` (`PASS.gold`); destination code `#FF6470` (`PASS.toCode`)
- Text: `#1b1b1e` (`onSurface`), muted `#44474e` (`onSurfaceVariant`), outline `#DED5C3` (`outlineVariant`)
- Success `#157347` on `#d1f1de`; warning `#5c4300` on `#ffdf9e`
- Display + body font: **Plus Jakarta Sans** — ship the real TTFs the app loads from
  `node_modules/@expo-google-fonts/plus-jakarta-sans/{500Medium,600SemiBold,700Bold,800ExtraBold}/`
- Mono (city codes, ticket chrome, refs): **Ubuntu Sans Mono**
  (`/usr/share/fonts/truetype/ubuntu/UbuntuSansMono[wght].ttf`) standing in for the
  app's platform mono (`Menlo` / `monospace`)
- Arabic: **Cairo** — `node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf`
- Copy every font into `composition/assets/fonts/` and declare in-file `@font-face`
  rules (lint requires it for any named family).
- Visual references from the project:
  - Boarding-pass ticket (perforation + punched notches + mono codes)
  - `RideCard`: white card, red left accent bar, time / duration left, price right,
    dot → arrow → dot route row, seats badge, driver avatar + ★ rating
  - `Logo`: red rounded square (`#C8102E`, rx 236/1024), navy body, white window
    band, white stripe, two white wheel circles — rebuild as inline SVG from
    `src/components/Logo.js`
  - `RouteTimeline` / `StepIndicator` shapes for the booked + parcel scenes
- Light-canvas discipline (per hyperframes-creative `video-composition.md`):
  use 2–4px borders and real structural rules rather than 1px web hairlines;
  add subtle paper grain so the sand field is not a blank slide; accent hits at
  full saturation.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary (absolute times on a 22.4s root):
1. **The ticket** — 4.2s (0.0→4.2) — `YOUR NEXT LOUAGE`, `Where to today?`, the navy
   boarding pass drops in; city codes flip; perforation draws.
2. **The rides** — 4.0s (4.2→8.2) — `Tunis → Sfax`, `12 results`; three real RideCards
   deal in one by one, then the full set holds 1.9s.
3. **The seat lock** — 4.4s (8.2→12.6) — ride detail lands; amber `Seat lock active`
   pill with a counter ticking `0:09 → 0:07`; `Flouci` payment row; a cursor taps
   `Book 1 seat · 28 TND`; `Processing payment…`.
4. **Booked** — 2.9s (12.6→15.5) — green check ring, `You're booked!`, `Ref: LGI-4F2A`,
   route timeline `Tunis 07:30 ── Sfax`, `Paid` chip.
5. **Parcels** — 3.8s (15.5→19.3) — `LOUAGI DELIVERY`, `Send a box on a ride already
   going your way.`, `Drop → Ride → Collect` stepper, route card with `4 of 6 slots
   free` and a pulsing `LIVE` badge.
6. **Louagi** — 3.1s (19.3→22.4) — logo, `Louagi`, `No queues. No double-bookings.`,
   `EN` `FR` `AR` chips, `AR` flips the line to Arabic RTL.

## Audio
- Audio role: **warm confident bed with a light, consistent UI accent layer** (app-store posture)
- Audio arc: bed in under the kicker → steady through the flow → small lift on the
  booking payoff → steady through parcels → fade out over the final 1.2s on the Arabic flip.
- Music: `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3`
- Music treatment: `data-start="0"`, `data-volume` ≈ `0.32`, 0.8s fade-in, fade out
  21.2 → 22.4 (use the `data-automation` volume lane per `hyperframes-audio` /
  `creator-editing-recipes.md`). Never above 0.4.
- Music cue guidance: **bundled preset**, read from
  `/home/th3r3bel/.claude/skills/brag/assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`
  (tempo 114.84 BPM, beat spacing ≈0.52s).
  - **Strong-cue locks (3, mark `// beat-locked`):** `1.60s` ticket card drop ·
    `8.96s` ride detail lands · `12.65s` booked check ring.
  - **Beat-grid sequences (mark `// beat-grid`):** ride cards `5.28 / 5.80 / 6.34`;
    parcel steps `16.34 / 16.86 / 17.39`. Both sets hold afterwards (cards to 8.2,
    steps to 19.3) so the ~0.52s spacing never outruns reading.
  - Other cues available if useful: 3.70, 9.50, 17.91, 18.96.
  - Ignore any cue that hurts readability or the product story.
- Audio-reactive treatment: **subtle**. Pre-extract bands with
  `hyperframes-creative/scripts/extract-audio-data.py` and sample per frame with
  `tl.call()`. Wire bass/RMS to the **navy ticket card's shadow depth and a
  ±2–3% presence on the card**, and to the **warmth of the sand background's
  radial glow**. No waveforms, no equalizer bars, no strobing, no text scaling.
  If extraction fails, document it and skip — do not block the render.
- Audio-coupled moments:
  - S1 1.60s — ticket card drops (major reveal, beat-locked)
  - S1 3.70s — perforation draws across (soft accent)
  - S2 5.28 / 5.80 / 6.34 — three ride cards deal in (card sequence, beat-grid)
  - S3 8.96s — ride detail lands (major reveal, beat-locked)
  - S3 ~10.0 / ~10.7 — seat-lock counter ticks (very quiet)
  - S3 ~11.75s — simulated cursor tap on `Book 1 seat · 28 TND`
  - S4 12.65s — booked check ring (payoff, beat-locked)
  - S5 16.34 / 16.86 / 17.39 — Drop / Ride / Collect steps (soft drops, beat-grid)
  - S6 ~19.4s — logo lands (single accent); ~21.3s — `AR` flip (light switch)
- SFX selection guidance (examples, not a fixed cue sheet — choose after the
  animation exists, and match the visible gesture):
  - Major reveals → `impact/impactSoft_medium_*` (low HF risk, warm)
  - Card sequence → `casino/card-slide-1.ogg` (the low-risk one in that family)
  - Simulated tap → `interface/click_002.ogg` / `click_003.ogg`
  - Booking payoff → `impact/impactBell_heavy_000.ogg`, once, nothing after it
  - Parcel steps → `interface/drop_001–003.ogg`
  - Toggle / AR flip → `interface/switch_007.ogg`
  - Soft accents → `ui/rollover2.ogg`
  - Volumes 0.65–0.75 for accents, 0.20–0.45 for ticks and soft cues.
- SFX analysis guidance: `/home/th3r3bel/.claude/skills/brag/assets/sfx/sfx-analysis.md`
  (+ `.json`). Prefer **low / medium** `highFrequencyRisk` files — this is a polished
  tone with repeated sequences, so avoid the high-risk casino and ui/switch entries.
- Exact SFX choice: Hyperframes picks filenames, timestamps, density, and volume
  based on the implemented animation.
- Audio files: copy the chosen music and SFX into `brag-output/composition/assets/`.
  Give the music `data-track-index="10"` and each SFX its own ascending index from
  `11` up — never share an index between overlapping audio. Every `<audio>` needs an `id`.

## Hyperframes Instructions
Use `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation`
(motion), `hyperframes-creative` (light-canvas video composition, audio-reactive),
`hyperframes-keyframes` (seek-safe keyframes where a punch-in is used), and
`hyperframes-cli` (lint / check / render). This is the `/brag` workflow — do not enter
the `hyperframes` entry-point intent interview or its generic promo workflow.

Requirements:
- Show real UI, copy and visual elements from the project (the whole video is built
  from them — see "Copy that must appear verbatim" and "Visual references").
- Keep all text readable in the final render; respect the per-scene reading floors
  documented in `brag-plan.md`.
- Total duration 22.4s (inside the 15–25s band).
- Include the music + SFX layer and the subtle audio-reactive treatment.
- 3 strong-cue locks, 2 beat-grid sequences, marked in the source.
- Single paused GSAP timeline registered on `window.__timelines["louagi-brag"]`.
- No `Math.random`, no clocks, no `repeat: -1`, no `autoAlpha`/`visibility` tweens on
  `.clip` elements, no CSS initial `transform` paired with a GSAP tween on the same
  property, no `crossorigin` on media.
- Run `npx hyperframes check` before render — it is brag's single gate.
