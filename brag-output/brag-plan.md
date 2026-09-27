# Brag Plan: Louagi

## What is this app?
Louagi is an Expo/React Native app that puts a real boarding pass on Tunisia's
louage network — reserve an intercity shared-taxi seat (or send a parcel on a
ride already going your way) before you ever reach the station, with verified
drivers, atomic seat locks, Flouci/Konnect payments, live parcel tracking, and
full Arabic / French / English support including an RTL flip.

## The angle
A louage is the least formal vehicle in Tunisia — you show up at the station,
you queue, you hope the seat is still there. Louagi gives it the interface of an
airline: three-letter city codes, a perforated ticket, a seat that is *locked*
while you pay, a reference number. The video is a straight, confident product
film built entirely out of the app's own boarding-pass design language. The
brag is not "we made an app" — it's "the louage has a boarding pass now, and
the seat is genuinely held while you pay."

## Hook (first 2-3 seconds)
Warm sand background, red mono kicker `YOUR NEXT LOUAGE`, then the app's real
display headline **"Where to today?"** lands hard — and the navy boarding-pass
card drops into frame beneath it, `TUN` on the left, `SFX` on the right, the
dashed perforation drawing across the middle. Ticket iconography on a louage is
the whole idea in one image.

## Key moments (the middle)
- **The ticket assembles**: city codes flip into place, the round swap button
  pulses, the perforation dashes draw across with the two punched notches.
- **Three real ride cards deal in one by one** — departure time, `25 TND` per
  seat, `Tunis → Sfax`, `3 seats left`, driver name + ★ rating. Real card shape,
  red left accent bar, the app's actual data vocabulary.
- **The seat lock**: amber pill reading *"Seat lock active — another rider is
  booking now (0:09)"* with the counter ticking down while a cursor taps
  **Book 1 seat · 28 TND**. This is the most impressive thing in the codebase and
  the one detail nobody expects from a louage app.
- **"You're booked!"** — green check ring, `Ref: LGI-4F2A`, the route timeline.
- **Parcels**: "Send a box on a ride already going your way." — Drop → Ride →
  Collect, with the `LIVE` tracking badge pulsing.

## Outro / punchline
Logo mark, `Louagi`, and the product's own promise: **"No queues. No
double-bookings."** Underneath, three small locale chips — `EN` `FR` `AR` — and
the `AR` chip flips the line to Arabic right-to-left on the last beat. The
punchline is quiet: it already works in all three.

## User flow worth showing
Entry → key action → result, straight from the passenger stack:
1. **Entry** — Landing ticket search: pick origin/destination (`TUN → SFX`) and seats.
2. **Key action** — Search results → open a ride → seat lock holds it → pay with Flouci.
3. **Result** — Booking confirmed: "You're booked!", reference `LGI-xxxx`, route timeline.
Secondary flow shown in one scene: **Boxes & Parcels** — Drop → Ride → Collect with live driver tracking.

## Tone
- Preset: **app-store**
- Creative direction: *a premium transit-ticket product film — the louage gets a boarding pass*
- Interpretation: Clean, feature-forward, confident. Real UI recreated faithfully
  rather than abstracted. Slides and smooth wipes, no chaos, no jokes. Motion is
  snappy (0.3–0.5s entrances) but every line holds long enough to read. The
  product is real, so it is played completely straight.

## Format: landscape — 1920x1080
## Duration: 22.4 seconds

## Visual identity (from the project)
- Background: `#F4EFE6` (theme `surface`, warm sand) — cards `#ffffff` / `#FAF6EE`
- Ticket navy: `#0A2247` (`PASS.navy`), deep `#031634` (`PASS.navyDeep`)
- Accent (louage red): `#DC2626` (`secondaryContainer`) — logo red `#C8102E`
- Primary navy: `#07214b`; on-navy gold `#FFD27A`; destination code `#FF6470`
- Text: `#1b1b1e` (`onSurface`), muted `#44474e` (`onSurfaceVariant`), outline `#DED5C3`
- Success: `#157347` / container `#d1f1de`; warning amber `#8f6900` on `#ffdf9e`
- Display + body font: **Plus Jakarta Sans** (bold 700 / extrabold 800 for display,
  500–600 for labels) — the app loads it via `@expo-google-fonts/plus-jakarta-sans`
- Mono (city codes, ticket chrome): a clean grotesque mono — **IBM Plex Mono** or
  **JetBrains Mono** — standing in for the app's platform mono (`Menlo`/`monospace`)
- Arabic font: **Cairo** (the app's `familyAr`) for the RTL outro beat
- Strongest visual element: the **boarding-pass card** — navy body, 32px mono city
  codes, circular swap button, dashed perforation with two punched notches, 16px radius

## Share copy (draft)
Tunisia's louages now have a boarding pass. Pick your route, the seat is *locked*
while you pay, and you can send a parcel on a ride already going your way — in
Arabic, French or English. Built with Expo + Supabase.

## Audio direction
- Role: **warm confident bed with a light, consistent UI accent layer** (app-store posture)
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` — warm, business-y, 114.84 BPM
- Music treatment: start at 0.0, volume 0.32, 0.8s fade-in, fade out over the last
  1.2s (21.2 → 22.4). Never louder than the SFX accents at their peak.
- Music cue guidance: bundled preset read from
  `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`.
  Tempo 114.84 BPM, beat spacing ≈0.52s.
  **Strong-cue locks (3 majors):** `1.60s` (ticket card drops), `8.96s` (ride detail
  lands), `12.65s` (booked check ring). **Secondary cues available:** 3.70, 5.80,
  6.34, 9.50, 17.91, 18.96.
  **Beat-grid windows for sequential reveals:** ride cards on `5.28 / 5.80 / 6.34`;
  parcel steps on `16.34 / 16.86 / 17.39`. Both are ~0.52s apart, which is fine for
  card/step arrivals only because the **full set holds on screen afterwards**
  (cards hold 6.34→8.2, steps hold 17.39→19.3). Do not put a readable sentence on
  that spacing.
- Audio-reactive treatment: **subtle** — use music RMS/bass to let the navy ticket
  card's shadow/presence and the sand background's warmth breathe. No waveforms,
  no equalizer bars, no text scaling.
- SFX posture: **moderate-light, motion-matched, professional restraint** — roughly
  8–10 cues total at 0.65–0.75 volume. Card/drop family for arrivals, one click for
  the simulated tap, one bell for the booking payoff, one soft accent for the logo.
- Audio-coupled moments: ticket card drop; perforation draw; three ride cards
  dealing one by one; the seat-lock counter ticking; the cursor tap on *Book 1 seat*;
  the confirmation check ring; the three parcel steps; the logo landing.
- Restraint rule: no sound on every element, no stacked hits, nothing comedic or
  glitchy, nothing that makes this read as a meme edit. This product is real and
  the audio must sound like a product film, not a hype reel.

## Storyboard

### Scene 1 — The ticket — 4.2s (0.0 → 4.2)
Warm sand field (`#F4EFE6`). Red mono kicker `YOUR NEXT LOUAGE` fades up at 0.25s.
The app's real display headline **"Where to today?"** slams in at 0.55s (0.35s ease)
and holds. At **1.60s (strong cue)** the navy boarding-pass card drops in from above
and settles with a soft overshoot: mono label `LOUAGE TICKET` top-left, `TODAY` chip
top-right, `TUN` in white-gold at left, `SFX` in `#FF6470` at right, city names
beneath, circular red-navy swap button between them. The dashed perforation with its
two punched notches draws left-to-right at **3.70s (cue)**, and the `Search rides`
button and `Seats 1` stepper settle below the tear line.
Sequential/interaction: yes — city codes flip into place character-style, then the
perforation draws across; the swap button gives one pulse.
Audio intent: arrival and confidence — something solid just landed on the table.
Audio-coupled idea: card-place on the ticket drop; a light, dry accent on the
perforation draw.
Music: warm bed entering under the kicker.
Transition mood: clean slide (ticket slides up and out of frame) → Scene 2

### Scene 2 — The rides — 4.0s (4.2 → 8.2)
Search results view. Small header row: `Tunis → Sfax` with `Today · 1 seat` and a
right-aligned `12 results`. Three real ride cards deal in from the right at
**5.28 / 5.80 (cue) / 6.34 (cue)** — white cards, 16px radius, red left accent bar,
each carrying: departure time (`06:30`, `07:30`, `09:15`), duration (`2h 15m`),
price (`25 TND` / `per seat`), the `Tunis → Sfax` dot-arrow-dot row, a seats badge
(`3 seats left`, the last one amber `2 seats left`), and driver avatar + `★ 4.8`.
Full set holds from 6.34 → 8.2 (1.9s) so every card is readable.
Sequential/interaction: yes — three cards arrive one by one, 0.52s apart, then the
whole set holds.
Audio intent: momentum — real options, arriving fast, under control.
Audio-coupled idea: card-slide on each arrival; accent the first and last, keep the
middle softer.
Music: bed continues, unchanged.
Transition mood: smooth scale-through (the 07:30 card grows into the next scene) → Scene 3

### Scene 3 — The seat lock — 4.4s (8.2 → 12.6)
The 07:30 card expands into the ride detail sheet and lands at **8.96s (strong cue)**:
route header `Tunis → Sfax`, `Departs 07:30`, `~135 min ride`, driver row with
`★ 4.8 · 128 trips` and a `Verified` badge. At **9.50s (cue)** an amber pill drops in:
**"Seat lock active — another rider is booking now (0:09)"** and the counter visibly
ticks `0:09 → 0:08 → 0:07`. Beneath it the payment row: `Flouci · Secure mobile
payment` with a `Secure` chip, then the price breakdown `25 TND + 3 TND reservation
fee`. At ~11.7s a cursor moves in and taps the red **Book 1 seat · 28 TND** button;
the button presses, and `Processing payment…` replaces the label.
Sequential/interaction: yes — simulated cursor tap on the book button; live ticking
counter on the seat-lock pill; the pill stays on screen through the tap (9.5 → 12.6,
3.1s settled) so the whole sentence is readable.
Audio intent: tension then resolution — the clock is running and you beat it.
Audio-coupled idea: soft tick on each counter decrement (very quiet), a single clean
click on the cursor tap.
Music: bed holds; let the ticks sit on top of it.
Transition mood: smooth wipe on the payment confirm → Scene 4

### Scene 4 — Booked — 2.9s (12.6 → 15.5)
At **12.65s (strong cue)** a green check ring scales in (`#d1f1de` inner, `#157347`
mark) with a soft ripple. **"You're booked!"** sets beneath it in display weight, and
a badge `Ref: LGI-4F2A` pops under that. A compact route timeline resolves below:
`Tunis 07:30` ── ── `Sfax` `~135 min ride`, plus a small `Paid` chip. Everything holds
to the cut.
Sequential/interaction: yes — check ring, then headline, then ref badge, then the
timeline draws its dashed connector.
Audio intent: payoff — clean, earned, not triumphant.
Audio-coupled idea: one bell hit exactly on the check ring; nothing after it.
Music: bed lifts slightly with the reveal.
Transition mood: clean slide → Scene 5

### Scene 5 — Parcels — 3.8s (15.5 → 19.3)
Red kicker `LOUAGI DELIVERY`, then the product's own line in two display lines:
**"Send a box on a ride already going your way."** (holds 16.0 → 19.3 = 3.3s, above
the ~3.0s floor for a 10-word sentence). Beneath it a three-step stepper animates at
**16.34 / 16.86 / 17.39**: `Drop` → `Ride` → `Collect`, connector filling between
them, full set holding 17.39 → 19.3. To the right, a compact route card `Tunis → Sfax`
with `4 of 6 slots free` and a `LIVE` badge that starts pulsing at **17.91s (cue)`
beside a small moving driver dot on a simplified route line.
Sequential/interaction: yes — three short step labels appear one by one (0.52s apart,
each ≥0.8s settled), then the LIVE badge begins pulsing.
Audio intent: a second product quietly revealing itself — additive, not a new pitch.
Audio-coupled idea: a soft drop per step; one light ping when `LIVE` starts pulsing.
Music: bed steady.
Transition mood: smooth wipe to sand → Scene 6

### Scene 6 — Louagi — 3.1s (19.3 → 22.4)
Clean sand field. At **18.96s→19.4s** the logo mark lands centre-stage (red rounded
square, navy louage body, white windows and wheels) with a small settle. `Louagi`
sets beside or beneath it in display weight, and the tagline — the app's own landing
copy — resolves under it: **"No queues. No double-bookings."** At ~20.6s three small
locale chips appear in a row: `EN` `FR` `AR`. On the final beat (~21.3s) the `AR`
chip highlights and the tagline line flips to its Arabic RTL form in Cairo, holding
to the end. Music fades out 21.2 → 22.4.
Sequential/interaction: yes — logo, name, tagline, then the three locale chips, then
the RTL flip as the last beat.
Audio intent: settle and close — one accent, then let the bed fade.
Audio-coupled idea: one soft accent on the logo landing; a very light switch sound on
the AR flip; nothing else.
Music: fade out over the last 1.2s.
Transition mood: hold to black / end

**Music mood for this video:** upbeat-warm, restrained (app-store)
**Audio summary:** A warm 114 BPM bed runs the whole 22.4s under a light, motion-matched
UI layer — a card landing, three cards dealing, a quiet ticking seat lock, one clean tap,
one bell on the booking payoff, three soft parcel steps, and a single accent on the logo —
fading out on the Arabic flip.

---

## Vertical cut (added after the landscape master)

`brag-vertical.mp4` — 1080x1920, same 22.4s edit, same timeline, same audio.
Built in `composition-vertical/` as a copy of the landscape project with a
portrait override block appended to the stylesheet, so the storyboard, beat locks
and SFX map are identical and only layout changes:

- Split frames become stacked frames: headline over ticket (S1), three ride cards
  stacked instead of a row (S2), detail card over booking panel (S3), check +
  headline over the ticket stub (S4), headline + stepper over the route card (S5).
- Type scaled up ~12-15% so the frame reads at phone size; content stays centred
  with air top and bottom, which keeps it clear of Reels/TikTok UI chrome.
- Frame-dependent coordinates retimed, not re-authored: the simulated cursor taps
  at (505, 1528), the parcel dot travels 583px, the grain overlay is 1080x1920.

Poster: `brag-vertical.jpg`, same 4.05s settled hook beat, baked as frame 0.
