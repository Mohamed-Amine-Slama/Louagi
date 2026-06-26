# Profile credential cards — design

**Date:** 2026-06-26
**Status:** Approved (defaults: keep MRZ strip, combined Make / Model)

## Problem

The driver and passenger `ProfileScreen`s present the **account details** (name /
email / phone) and the **driver vehicle details** (brand / model / seats / plate)
as plain `Card`s containing a vertical stack of always-on `Input` boxes plus a
Save button. That stack — avatar → name → email field → phone field — reads as a
login/auth form. It is the weakest part of two screens whose hero areas (the navy
`MembershipCard` / `DriverCard` boarding passes) are otherwise distinctive.

## Goal

Replace those three blocks with read-first **credential data-pages**: light
surface cards laid out like a passport data-page / vehicle registration document —
a monogram, tiny uppercase monospace micro-labels over larger values arranged in a
field grid, a perforated divider borrowed from the boarding pass, and a
machine-readable (MRZ) strip flourish. An **Edit** affordance reveals the existing
form inline only when needed. This reuses the app's existing `MONO` / member-number
/ perforation vocabulary so the cards read as part of the boarding-pass family, not
a form.

Out of scope: the navy hero cards (untouched), security / notifications /
preferences / payment / support / danger-zone sections (untouched).

## Approach

Read-first **credential** layout (chosen over: restyled always-on form;
per-field edit rows; navy ticket cards; official "carte grise" document frame;
flat editorial spec-sheet). It is the most on-brand evolution and most clearly
*not* a form.

## New shared component: `src/components/ProfileCards.js`

Two exported cards plus small internal primitives. The cards are **controlled** —
all API/state logic stays in the screens (where it lives today); each card owns
only its own `editing` boolean and collapses on a successful save.

### `AccountCard` (passenger **and** driver)

Props: `title`, `displayName`, `memberId`, `name`, `email`, `onChangeName`,
`onChangeEmail`, `phoneMasked`, `errors` (`{ fullName, email }`), `saving`,
`onSave` (`async () => boolean`).

- **Read mode:** `Monogram` (initials) + a column with a `HOLDER` micro-label over
  `displayName`, and a `MEMBER NO · LGI 1234 5678` mono line. `Perforation`
  divider. A 2-up field grid: `EMAIL` and `PHONE` (phone carries a green ✔ verified
  accent). A faint `MrzStrip` (`LGI<<SALAH<<MOHAMED<<<<<<<1234`) on a tinted band
  at the bottom.
- **Edit mode:** monogram + `HOLDER` label stay for continuity; the grid swaps to
  Full name + Email `Input`s; phone remains a read-only verified field; Save button.
  MRZ hides while editing.

### `VehicleCard` (driver only)

Props: `title`, `brand`, `model`, `seats`, `onChangeBrand`, `onChangeModel`,
`onChangeSeats`, `plateMasked`, `errors`, `saving`, `onSave`.

- **Read mode:** a field grid — `MAKE / MODEL` (combined → `Peugeot 301`) and
  `SEATS`; `Perforation` divider; `REGISTRATION` label over the `PlateChip`
  (license-plate motif `123 · تونس · 4567`) with a faint car glyph alongside.
- **Edit mode:** Brand + Model `Input`s (in a row), Seat count `Input`, the existing
  plate label note, Save button.

### Internal primitives (same file)

- `Monogram({ name, size })` — initials in a tonal rounded square.
- `CredentialField({ label, value, trailing, mono, align })` — uppercase micro-label
  over value, optional trailing node (the verified check). Building block of both grids.
- `Perforation({ notch })` — dashed line + two surface-colored side notches, matching
  the boarding pass; `notch` = `colors.surface` so the notches read as cut-outs.
- `PlateChip({ plate })` — white bordered plate frame, masked number in `MONO`, with
  a `تونس` marker. Splits the masked value on whitespace/`·`/`-` to place `تونس`
  between segments; falls back to value + `تونس`.
- `MrzStrip({ name, id })` — renders the `mrzLine(name, id)` string on a faint band,
  monospace, forced LTR.
- `EditPill({ editing, onPress })` — lives in the `Section` `action` slot; toggles
  Edit ⇄ Cancel.

Toggle uses `LayoutAnimation.easeInEaseOut()` (with the Android
`UIManager.setLayoutAnimationEnabledExperimental(true)` guard at module load) for a
smooth expand/collapse. `submit()` calls `onSave()` and collapses to read mode only
when it resolves truthy.

## DRY refactor: `src/lib/tickets.js`

The member-number string (`LGI 1234 5678`) is currently computed inline inside
`MembershipCard`. Extract it as `memberNo(id)` and add `mrzLine(name, id)`; reuse
`memberNo` in **both** `MembershipCard` and the new `AccountCard` so the format lives
in one place.

- `memberNo(id)` → `"LGI 1234 5678"` (8 alphanumerics from id, upper-cased,
  zero-padded, grouped).
- `mrzLine(name, id)` → passport-style decorative string, e.g.
  `"LGI<<SALAH<<MOHAMED<<<<<<<<<<1234"` (accent-stripped, upper-cased, non-`[A-Z<]`
  collapsed to `<`, last 4 of id appended). Decorative only; locale-independent.

## Screen edits (contained)

- **`src/screens/passenger/ProfileScreen.js`:** replace the Account `<Section>` block
  with `<AccountCard … />`; `saveAccount` returns `res.ok`.
- **`src/screens/driver/ProfileScreen.js`:** replace the Account block with
  `<AccountCard … />` and the Vehicle block with `<VehicleCard … />`;
  `saveAccount` + `saveVehicle` return `res.ok`. Navy `DriverCard` hero untouched.

### Separate fix bundled in (same file): driver bottom dead-band

The driver screen renders `<Screen scroll={false}>` with its **own** nested
`ScrollView`, so `Screen`'s `containerPadding` (`insets.bottom +
floatingTabBar.contentClearance`, ≈ `insets.bottom + 140`) is applied to the outer
frame — leaving a tall, non-interactive empty band at the bottom. Fix: pass
`contentStyle={{ paddingBottom: 0 }}` to `Screen`, give the inner `ScrollView`
`style={{ flex: 1 }}`, and move the dock clearance onto its `contentContainerStyle`
(`paddingBottom: insets.bottom + floatingTabBar.contentClearance`). Add
`floatingTabBar` to the theme import. This matches how the passenger screen already
behaves. Clearly labeled as a separate change in the commit.

## i18n (en / fr / ar parity)

Reuse existing keys where they fit: `common:edit`, `common:cancel`, `common:seats`,
`auth:email`, `auth:fullName`, `passenger:account`, `driver:vehicle`,
`driver:plateLabel`, `passenger:phoneVerified`. Add 5 keys to the shared `common`
namespace (uppercased in code via `.toUpperCase()`, matching existing convention):

| key            | en            | fr               | ar           |
|----------------|---------------|------------------|--------------|
| `holder`       | Holder        | Titulaire        | صاحب الحساب  |
| `phone`        | Phone         | Téléphone        | هاتف         |
| `memberNo`     | Member no     | N° de membre     | رقم العضوية  |
| `makeModel`    | Make / Model  | Marque / Modèle  | الصنع / الطراز |
| `registration` | Registration  | Immatriculation  | التسجيل      |

The MRZ string and the `تونس` plate marker are literals, not translated.

## Testing

- Unit: `memberNo` and `mrzLine` for a couple of name/id shapes (incl. single-word
  name and accented name).
- Render-smoke: each card mounts in read + edit mode without throwing.
- i18n: key-parity check for the 5 new `common` keys across the three locale files.
- Manual: edit → save → collapse, and Cancel, on both passenger and driver screens;
  confirm the driver bottom band is gone and the dock clearance is correct.
