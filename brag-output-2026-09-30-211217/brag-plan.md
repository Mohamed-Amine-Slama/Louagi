# Brag Plan: Louagi — "How to book a louage" (vertical demo)

## What is this app?
Louagi is an Expo / React Native app for Tunisia's intercity louages (shared taxis). You
pick a route on a boarding-pass search ticket, choose a ride, pay with Flouci while the
seat is held for you, and board with a boarding pass. You can also send a parcel on a
louage that's already heading your way.

## The angle
This run is a **how-to**, not a launch film. The Sep 20 run already covered the pitch in
`brag-output/`. This video teaches: a phone sits centre-frame running the real passenger
flow, a fingertip taps through it, and a big numbered caption above the phone says what to
do at each step. It is four steps plus a bonus. Every screen in the phone is rebuilt from
the actual components (`LandingScreen`, `SearchScreen` + `RideCard`, `RideDetailScreen` +
`PassengerActionButtons`, `BookingConfirmScreen`, the Bookings `BoardingPass`, and
`DeliveryScreen`), using the app's own copy, colours and tab dock. The main message is
how simple it is: booking a louage now takes four taps instead of a trip to the station
and a queue.

## Hook (first 2-3 seconds)
Warm sand frame. The red mono kicker `HOW TO · LOUAGI` comes up, then the headline lands
in two lines: **"Book a louage / in 4 steps."** The phone rises from below and settles on
the 1.59s beat, already showing the real home screen ("Where to today?" plus the search
ticket). A 4-segment step tracker appears at the top. The first frame tells the viewer
what this is and how long it takes.

## Key moments (the middle)
- **The city picker.** The finger taps the destination code, and the real "Choose city"
  sheet slides up with a list of city codes. Tapping `SFX Sfax` makes the ticket code flip
  from `SOU` to `SFX`. Then comes the tap on **Search rides**.
- **Ride cards stack in** under the "Find a ride" header: `06:30 · 22 TND`,
  `07:30 · 22 TND`, `09:15 · 20 TND`, each with the driver, ★ rating, Peugeot Boxer and a
  seats badge. The finger taps the 07:30 card.
- **Book 1 seat.** The detail screen scrolls to the Flouci payment row and the sticky
  footer (`1 × 22 TND + Booking fee 3.000 TND = Total 25 TND`). A tap turns the button
  into *"Processing payment…"*, which lands on **"You're booked!"** with a check ring and
  the ref badge.
- **The boarding pass** in the Bookings tab: a navy pass showing `BOARDING PASS · LGI-4F2A`,
  a gold `Departs in 2h 10m` chip, `TUN ✈ SFX` and 07:30, a perforation that draws itself,
  and a DATE / SEATS / PAID stub.

## Outro / punchline
The phone drops out. The Louagi logo lands, the name sets beneath it, and then the app's
own promise appears: **"No queues. No double-bookings."** The ending stays quiet and
confident.

## User flow worth showing
1. **Entry**: Home tab. Pick origin/destination on the search ticket (city picker), keep
   1 seat, and tap Search rides.
2. **Key action**: Search results, tap a ride, the Ride detail screen, then Book 1 seat
   (Flouci, with the seat held while you pay).
3. **Result**: "You're booked!" with the ref, then the boarding pass in the Bookings tab.
   Bonus: the Delivery tab (Drop → Ride → Collect, routes with space, Reserve).

## Tone
- Preset: **app-store**
- Creative direction: *friendly step-by-step phone tutorial, where a fingertip walks through
  a real booking one numbered step at a time*
- Interpretation: clear, calm and confident. The caption carries the instruction in big
  type, and the phone carries the proof. Screen transitions are iOS-style pushes and tab
  switches, with no flashy effects. Each step caption holds long enough to read twice.
  Motion only happens where a user would actually cause it (taps, pushes, sheets).

## Format: vertical — 1080x1920
## Duration: 25.0 seconds

## Visual identity (from the project)
- Background: `#F4EFE6` (`surface`, warm sand); cards `#ffffff`, `#FAF6EE`, `#EFE9DD`
- Text: `#1b1b1e` (`onSurface`), muted `#44474e`; outline `#DED5C3`
- Primary navy `#07214b`; ticket navy `#0A2247` / `#031634`; gold `#FFD27A`; to-code `#FF6470`
- Accent (louage red): `#DC2626` (`secondaryContainer`, Search rides / chips / kicker)
- Tab dock: `#241A12`, radius 22, active `#FF5A6E`, inactive `rgba(255,255,255,0.5)`
- Success `#157347` / `#d1f1de`; warning `#8f6900`
- Display + body font: **Plus Jakarta Sans** (bundled TTFs, 500–800)
- Mono (city codes, kickers, ticket chrome): Ubuntu Sans Mono (stands in for platform mono)
- Strongest visual element: the **boarding-pass UI**. That covers the search ticket with its
  perforation and notches, and the navy boarding pass in Bookings.
- Phone mockup: near-black bezel, rounded screen, status bar `9:41`, the real floating tab
  dock (Home · Search · Bookings · Delivery · Profile)

## Share copy (draft)
How to book a louage in Tunisia in 4 steps: pick your route, choose a ride, pay with
Flouci while your seat is held, and board with your pass. Bonus: send a parcel on a ride
already going your way.

## Audio direction
- Role: **warm, friendly bed with a tactile UI layer**. The taps matter here because this
  is a tutorial.
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM). It is a
  different bed from the launch film but the same family.
- Music treatment: start at 0.0, bed at ~0.30, 0.6s fade-in, fade out over 23.8 → 25.0.
- Music cue guidance: bundled preset
  `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`.
  Beat spacing is ≈0.52s.
  **Strong-cue locks:** `3.70s` (tap on the destination code), `8.44s` (tap on the 07:30
  ride card), `12.65s` (push to "You're booked!").
  **Secondary cues used:** 1.59 (phone lands), 4.23 (pick Sfax), 5.28 (tap Search rides),
  6.34 (step 2 caption), 11.60 (tap Book), 23.17 (tagline).
  **Beat-grid windows:** delivery steps Drop / Ride / Collect on `19.48 / 20.02 / 20.54`.
  They are icon+word pairs, and the whole set holds 20.54 → 22.12 (1.6s).
- Audio-reactive treatment: **subtle**. Only the background glows breathe with RMS/bass.
  Nothing on the phone reacts, because the UI must read as a real app.
- SFX posture: **moderate, touch-driven**. One soft click per tap, a light slide on each
  screen push, a whisper on each step-caption change, one bell on "You're booked!", three
  soft drops for delivery steps, and one accent on the logo. There are about 16 cues, all
  under the bed's perceived loudness except the bell.
- Audio-coupled moments: every fingertip tap; the city sheet sliding up; the code flip;
  screen pushes; the booking confirmation; the boarding pass landing; the parcel steps;
  the logo.
- Restraint rule: no whooshes on caption text, no stacked hits, and nothing cartoonish.
  A tap sounds like a tap.

## Storyboard

Layout constant: caption zone y≈150–460 (kicker `STEP n OF 4`, headline, one-line sub);
phone centred below (≈740×1360, top ≈500); a 4-segment step tracker under the top chrome.

### Scene 1: Hook, 2.65s (0.00 → 2.65)
Kicker `HOW TO · LOUAGI`, headline **"Book a louage / in 4 steps."** (holds 0.8 → 2.65).
The phone rises and lands on the **1.59** beat. The Home screen content fades and slides in
the app's own way: header (logo, "Louagi", light/dark pill), `YOUR NEXT LOUAGE`,
**"Where to today?"**, and the search ticket `TUN ⇄ SOU` with Tunis / Sousse, seats stepper
`1` and the red **Search rides →** button, then popular routes (`TUN → BIZ  from 6 TND`,
`TUN → SOU  from 12 TND`). The floating tab dock shows Home as active. The step tracker
draws in.
Sequential/interaction: yes. The phone lands, then screen blocks stagger in.
Audio intent: a friendly start.
Audio-coupled idea: a soft landing on the phone settle.
Music: the bed fades in.
Transition mood: the caption swaps in place → Scene 2

### Scene 2: Step 1, pick your route, 3.69s (2.65 → 6.34)
Caption: `STEP 1 OF 4` / **"Pick your route"** / *"Tap a city, then Search rides."*
(settled 2.95 → 6.34). The tracker fills segment 1. A fingertip appears over `SOU` and
taps on **3.70**. The "Choose city" sheet slides up with a search field *"Search a city"*
and rows `SFX Sfax`, `SOU Sousse`, `BIZ Bizerte`, `NAB Nabeul`. The finger taps `Sfax` on
**4.23**, the sheet drops, and the code flips `SOU → SFX` (city label Sousse → Sfax). The
finger taps **Search rides** on **5.28**. The button presses and the screen pushes left on
5.80 while the tab dock moves its active item to Search.
Sequential/interaction: yes, three simulated taps plus a sheet and a flip.
Audio intent: tactile and easy.
Audio-coupled idea: a click on each tap and a soft slide on the sheet and the push.
Transition mood: iOS push → Scene 3

### Scene 3: Step 2, choose a ride, 3.16s (6.34 → 9.50)
Caption: `STEP 2 OF 4` / **"Choose a ride"** / *"Compare time, price, rating and seats."*
(settled 6.6 → 9.5). The Search screen shows "← Find a ride", a route card (○ Tunis /
📍 Sfax, date, `1 seat`), day chips (`Wed 30` selected in red), `Filters` and `12 results`,
then three RideCards staggered in (06:30 / 07:30 / 09:15, with red accent bars and
`3 seats` / `4 seats` / `2 seats` badges, the last in warning tone). The fingertip taps
the 07:30 card on **8.44**, the card presses, and the view pushes to Ride detail on 8.96
while the tab dock slides away.
Sequential/interaction: yes. Three cards arrive one by one (≈0.25s apart, part of the
push), the set holds, then a tap follows.
Audio intent: momentum with real options.
Audio-coupled idea: a light card slide on arrival and a click on the tap.
Transition mood: iOS push → Scene 4

### Scene 4: Step 3, book & pay, 4.20s (9.50 → 13.70)
Caption: `STEP 3 OF 4` / **"Book & pay"** / *"Your seat is held while you pay with Flouci."*
(settled 9.8 → 13.7). Ride detail shows the header "Tunis → Sfax", a Trip timeline
(`Departs 07:30`, `~195 min ride`), and the pills `4 seats left` · `AC` · `Verified Account`.
The content scrolls up around 10.0–10.6 to reveal the driver card (Mehdi T., ★ 4.9 ·
128 trips, Peugeot Boxer) and the Seats + Payment card (Flouci, *Secure mobile payment*,
🔒 Secure). The sticky footer reads `1 × 22 TND  +  Booking fee 3.000 TND  =  Total 25 TND`
above the navy **Book 1 seat** button. The camera punches in gently on the footer. The
finger taps on **11.60**, and the label becomes *"Processing payment…"* with a spinner. On
**12.65** the screen pushes to Booking confirmed, the green check ring pops, and
**"You're booked!"** appears with the badge `Ref: 4F2A91C0`.
Sequential/interaction: yes, a scroll, a tap, a processing state, then the confirmation.
Audio intent: a small tension, then the payoff.
Audio-coupled idea: a click on the tap, and one bell exactly on the check ring.
Transition mood: push → the confirmation holds into Scene 5

### Scene 5: Step 4, board with your pass, 5.26s (13.70 → 18.96)
Caption: `STEP 4 OF 4` / **"Show your pass"** / *"It's saved in Bookings. See you at the
station."* (settled 14.0 → 18.96). The confirmation screen shows the route timeline and a
receipt (Driver / Seats / Paid `25 TND`). The finger taps **Back to bookings** on 14.76,
the tab dock slides back up with Bookings active, and the dashboard pushes in: "Hello, /
Yasmine 👋", `YOUR NEXT TRIP`, then the navy boarding pass drops in on 15.28 with
`BOARDING PASS · LGI-4F2A`, a gold `Departs in 2h 10m` chip, `TUN ✈ SFX` and 07:30. The
perforation draws, the notches punch in, and the stub shows DATE `Wed 30 Sep` · SEATS `1`
· PAID `25 TND`, the driver row, a chat button and a red **View ticket** button. It holds.
Sequential/interaction: yes, a tap, a tab switch, then the pass assembles.
Audio intent: arrival.
Audio-coupled idea: a click on the tap, a soft impact on the pass landing, and a light
tick on the perforation.
Transition mood: tab switch → Scene 6

### Scene 6: Bonus, send a parcel, 3.16s (18.96 → 22.12)
Caption: `BONUS` / **"Send a parcel"** / *"Put a box on a louage already going your way."*
(settled 19.25 → 22.12). The finger taps the **Delivery** tab on 18.96, and the screen
switches to "Boxes & Parcels", then the navy promo card (`LOUAGI DELIVERY`, *"Send a box
on a ride already going your way."*, **+ New delivery**). The HowStep row shows **Drop →
Ride → Collect** on 19.48 / 20.02 / 20.54. Under "Routes with space today" there is a
route card: Tunis → Sfax, `from 8 TND`, `4 of 6 slots free`, **Reserve**.
Sequential/interaction: yes, a tab tap, then three step pills one by one, holding as a set.
Audio intent: a light "one more thing".
Audio-coupled idea: a click on the tab and a soft drop per step.
Transition mood: the phone drops out → Scene 7

### Scene 7: Outro, 2.88s (22.12 → 25.00)
The caption and phone clear, and the tracker completes. The logo lands centre stage on
22.64 (at the app's own 3° tilt), with **Louagi** beneath it and then **"No queues. No
double-bookings."** on **23.17**, holding to the end. The music fades out 23.8 → 25.0.
Sequential/interaction: logo, then name, then tagline.
Audio intent: settle.
Audio-coupled idea: one soft accent on the logo.
Transition mood: hold to end

Scene total: 2.65 + 3.69 + 3.16 + 4.20 + 5.26 + 3.16 + 2.88 = **25.00s**

**Music mood for this video:** upbeat-warm, friendly, restrained (app-store tutorial)
**Audio summary:** A warm 114 BPM bed carries a tap-by-tap walkthrough. It has clicks on
every touch, soft slides on each screen push, one bell on the booking, and quiet drops on
the parcel steps, then it fades out under the logo.
