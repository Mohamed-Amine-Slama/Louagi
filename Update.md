# Louagi — Feature Implementation Prompt

## Context

Louagi is a React Native mobile app built with **Expo Go**, targeting interstate ride-booking across Tunisia. The app communicates with the backend exclusively through a **GraphQL API** and uses **Supabase** as the database and backend-as-a-service layer (PostgreSQL under the hood, with Supabase Auth, Supabase Realtime for live updates, and Supabase Storage for file uploads). Payment is handled through a Tunisia-native gateway (Konnect / Flouci).

> All SQL migration examples below are written for **Supabase's SQL editor** and should be applied via the Supabase dashboard or CLI (`supabase db push`). All API calls described as REST endpoints should be implemented as **GraphQL mutations and queries** instead — the endpoint descriptions serve as a contract for what each operation does.

The mobile app uses the following theme palette (referenced throughout this prompt as design tokens):

```js
primary: '#07214b'          // deep navy — primary actions, headers
secondary: '#835500'        // amber-brown — secondary accents
secondaryContainer: '#DC2626' // red — destructive / alert badges
surface: '#fbf8fc'          // page background
onSurface: '#1b1b1e'        // primary text
onSurfaceVariant: '#44474e' // secondary text / labels
outline: '#75777e'          // borders, dividers
primaryContainer: '#1a2b4a' // dark navy — cards, modals
onPrimaryContainer: '#8293b7' // muted blue — card body text
success: '#198754'
successContainer: '#d1f1de'
error: '#ba1a1a'
errorContainer: '#ffdad6'
warning: '#b88700'
```

---

## Change 1 — Update Reservation Fee Logic

### Current behaviour
A flat reservation fee is charged when a passenger books a seat.

### New behaviour
The total reservation fee is **3 TND**, split as:

| Recipient | Amount |
|-----------|--------|
| App (platform) | 1.5 TND |
| Driver | 1.5 TND |

This fee is charged **in addition to** the seat price at the time of booking. It is non-refundable on cancellation.

---

### Backend changes (Supabase)

#### 1. `payment` table migration — add fee split columns
Run in the **Supabase SQL editor**:

```sql
ALTER TABLE payment
  ADD COLUMN platform_fee    NUMERIC(6,3) NOT NULL DEFAULT 1.500,
  ADD COLUMN driver_fee      NUMERIC(6,3) NOT NULL DEFAULT 1.500,
  ADD COLUMN reservation_fee NUMERIC(6,3) GENERATED ALWAYS AS (platform_fee + driver_fee) STORED;
```

Update your **Row Level Security (RLS)** policies so passengers can only read their own payment rows, and drivers can read the `driver_fee` field for rides they own.

#### 2. GraphQL mutation — create reservation with fee
The `createReservation` mutation should be handled in a **Supabase Edge Function** (Deno) to keep fee logic server-side:

```ts
// supabase/functions/create-reservation/index.ts
const PLATFORM_FEE = 1.5;  // TND
const DRIVER_FEE   = 1.5;  // TND

const seatCost   = ride.price_per_seat * seatsBooked;
const totalPrice = seatCost + PLATFORM_FEE + DRIVER_FEE;

const { data, error } = await supabase
  .from('payment')
  .insert({
    reservation_id: reservationId,
    amount:         totalPrice,
    platform_fee:   PLATFORM_FEE,
    driver_fee:     DRIVER_FEE,
    status:         'pending',
  });
```

Expose this as a GraphQL mutation via your schema (e.g. using **pg_graphql**, Hasura, or a custom resolver layer sitting in front of Supabase).

#### 3. Driver earnings query
In the driver earnings GraphQL query, compute net earnings server-side:

```graphql
query DriverEarnings($driverId: UUID!) {
  payment(where: { reservation: { ride: { driver_id: { _eq: $driverId } } } }) {
    amount
    platform_fee
    driver_fee
    # net = amount - platform_fee (= seat cost + driver_fee)
  }
}
```

#### 4. Admin payment oversight
Expose `platform_fee` and `driver_fee` in the admin payments GraphQL query so the ledger can display the platform revenue split per transaction. Restrict this query to `role=admin` via RLS.

---

### Frontend changes (React Native)

#### Price summary component — `PriceSummary.tsx`
Display the fee breakdown clearly before the user confirms booking:

```tsx
// Colors from theme
const styles = {
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  label:     { color: colors.onSurfaceVariant, fontSize: 14 },
  value:     { color: colors.onSurface, fontSize: 14 },
  feeLabel:  { color: colors.onSurfaceVariant, fontSize: 13, fontStyle: 'italic' },
  feeValue:  { color: colors.warning, fontSize: 13 },
  totalRow:  { borderTopWidth: 1, borderTopColor: colors.outline, marginTop: 8, paddingTop: 8 },
  totalVal:  { color: colors.primary, fontSize: 16, fontWeight: '700' },
};

// Render
<View style={styles.row}>
  <Text style={styles.label}>Seat price × {seats}</Text>
  <Text style={styles.value}>{seatCost.toFixed(3)} TND</Text>
</View>

<View style={styles.row}>
  <Text style={styles.feeLabel}>Reservation fee (app 1.5 + driver 1.5)</Text>
  <Text style={styles.feeValue}>3.000 TND</Text>
</View>

<View style={[styles.row, styles.totalRow]}>
  <Text style={styles.label}>Total</Text>
  <Text style={styles.totalVal}>{totalPrice.toFixed(3)} TND</Text>
</View>
```

#### Booking confirmation screen
Add a receipt line in the `BookingCard` component confirming the fee split was applied.

#### Cancellation notice
In the `CancelButton` confirmation dialog, add a callout:

> "The 3 TND reservation fee is non-refundable. Only the seat cost will be returned."

Style the callout with `backgroundColor: colors.errorContainer` and `color: colors.onErrorContainer`.

---

## Change 2 — Boxes Delivery Feature

Passengers can send a package with a departing driver. They browse upcoming rides, see the driver's scheduled departure time, and book a delivery slot. The cost is **7–12 TND** and is determined by the severity level of the item being sent.

---

### Severity / price tiers

| Tier | Label | Price | Examples |
|------|-------|-------|---------|
| 1 | Standard | 7 TND | Clothes, books, household items |
| 2 | Sensitive | 9 TND | Electronics, fragile items, food |
| 3 | Critical | 12 TND | Cash / money, phone, urgent documents, medical items |

The passenger selects the tier at booking. The driver receives the tier label and price so both parties agree before departure.

---

### Database changes (Supabase)

#### New table — `delivery`
Run in the **Supabase SQL editor**:

```sql
CREATE TABLE delivery (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  ride_id          UUID NOT NULL REFERENCES ride(id),
  severity_tier    SMALLINT NOT NULL CHECK (severity_tier IN (1, 2, 3)),
  severity_label   TEXT NOT NULL,          -- 'Standard' | 'Sensitive' | 'Critical'
  item_description TEXT,                   -- optional free-text from sender
  price            NUMERIC(6,3) NOT NULL,  -- 7.000 | 9.000 | 12.000
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','picked_up','delivered','cancelled')),
  booked_at        TIMESTAMP NOT NULL DEFAULT now(),
  cancelled_at     TIMESTAMP,
  driver_notes     TEXT
);

-- RLS: passengers see only their own deliveries
ALTER TABLE delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passenger_own_deliveries" ON delivery
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "driver_ride_deliveries" ON delivery
  FOR SELECT USING (
    ride_id IN (SELECT id FROM ride WHERE driver_id = auth.uid())
  );
```

#### `payment` table — link delivery payments
```sql
ALTER TABLE payment
  ADD COLUMN delivery_id UUID REFERENCES delivery(id);
-- delivery_id and reservation_id are mutually exclusive per row
-- enforce with a check constraint:
ALTER TABLE payment
  ADD CONSTRAINT payment_single_source CHECK (
    (reservation_id IS NULL) <> (delivery_id IS NULL)
  );
```

#### `ride` table — delivery availability columns
```sql
ALTER TABLE ride
  ADD COLUMN accepts_delivery     BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN max_delivery_slots   SMALLINT NOT NULL DEFAULT 3,
  ADD COLUMN delivery_slots_taken SMALLINT NOT NULL DEFAULT 0;
```

Enable **Supabase Realtime** on the `delivery` table so the driver's ride management screen receives live updates when a new delivery is booked:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE delivery;
```

---

### GraphQL operations

All delivery operations are exposed through the GraphQL API. Business logic that must stay server-side (price validation, slot decrement) should live in **Supabase Edge Functions** called by the resolvers.

#### Queries
```graphql
# Passenger — fetch rides that accept deliveries
query AvailableDeliveryRides($origin: String, $destination: String) {
  ride(where: {
    accepts_delivery: { _eq: true }
    status: { _eq: "scheduled" }
    origin_city: { _eq: $origin }
    destination_city: { _eq: $destination }
  }, order_by: { departure_time: asc }) {
    id
    departure_time
    origin_city
    destination_city
    max_delivery_slots
    delivery_slots_taken
    driver { full_name rating }
  }
}

# Passenger — own delivery history
query MyDeliveries($userId: UUID!) {
  delivery(where: { user_id: { _eq: $userId } }, order_by: { booked_at: desc }) {
    id status severity_tier severity_label price booked_at
    ride { departure_time origin_city destination_city }
  }
}

# Driver — deliveries on a specific ride
query RideDeliveries($rideId: UUID!) {
  delivery(where: { ride_id: { _eq: $rideId } }) {
    id severity_tier severity_label item_description status
    user { full_name phone_number }
  }
}
```

#### Mutations
```graphql
# Book a delivery — call via Supabase Edge Function to enforce server-side price
mutation CreateDelivery($rideId: UUID!, $severityTier: Int!, $description: String) {
  insert_delivery_one(object: {
    ride_id: $rideId
    severity_tier: $severityTier
    item_description: $description
    # severity_label and price resolved server-side from tier
  }) {
    id status price severity_label
  }
}

# Driver updates delivery status
mutation UpdateDeliveryStatus($id: UUID!, $status: String!) {
  update_delivery_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
    id status
  }
}

# Cancel delivery (passenger, before picked_up)
mutation CancelDelivery($id: UUID!) {
  update_delivery_by_pk(pk_columns: { id: $id }, _set: {
    status: "cancelled"
    cancelled_at: "now()"
  }) { id }
}
```

#### Supabase Edge Function — `create-delivery`
Validate the price server-side so clients can never send their own price:

```ts
// supabase/functions/create-delivery/index.ts
const TIER_PRICES: Record<number, number> = { 1: 7, 2: 9, 3: 12 };
const TIER_LABELS: Record<number, string>  = {
  1: 'Standard', 2: 'Sensitive', 3: 'Critical'
};

const { ride_id, severity_tier, item_description } = await req.json();
const price         = TIER_PRICES[severity_tier];
const severity_label = TIER_LABELS[severity_tier];

// check slots still available
const { data: ride } = await supabase
  .from('ride')
  .select('max_delivery_slots, delivery_slots_taken')
  .eq('id', ride_id)
  .single();

if (ride.delivery_slots_taken >= ride.max_delivery_slots) {
  return new Response('No delivery slots available', { status: 409 });
}

// insert delivery + increment slot counter atomically
const { data } = await supabase.rpc('book_delivery', {
  p_ride_id:       ride_id,
  p_user_id:       user.id,
  p_severity_tier: severity_tier,
  p_severity_label: severity_label,
  p_price:         price,
  p_description:   item_description,
});
```

Create the corresponding Supabase database function `book_delivery` as a `SECURITY DEFINER` RPC that inserts into `delivery` and increments `delivery_slots_taken` in a single transaction.

---

### Frontend changes (React Native)

#### New screen — `DeliveryBookingScreen.tsx`

**Route:** linked from the new dock tab and from `RideDetailScreen`

**Flow:**
1. User opens the Delivery tab → sees a list of rides that `accepts_delivery === true`, sorted by `departure_time` ascending (soonest first).
2. Each ride card shows: **route**, **driver name**, **departure time**, **available delivery slots** (e.g. "2 of 3 slots free").
3. Tapping a ride opens a bottom sheet with the severity tier selector and an optional description field.
4. Price is shown immediately on tier selection. User confirms → payment flow → delivery confirmation screen.

**Severity selector UI:**
```tsx
const TIERS = [
  { tier: 1, label: 'Standard',  price: 7,  color: colors.success,
    examples: 'Clothes, books, household items' },
  { tier: 2, label: 'Sensitive', price: 9,  color: colors.warning,
    examples: 'Electronics, fragile items, food' },
  { tier: 3, label: 'Critical',  price: 12, color: colors.error,
    examples: 'Cash, phone, documents, medical' },
];

// Render each tier as a selectable card:
// border: selected ? `2px solid ${tier.color}` : `1px solid ${colors.outline}`
// background: selected ? withAlpha(tier.color, 0.08) : colors.surface
// Price badge: backgroundColor: tier.color, color: colors.onPrimary
```

**Delivery ride card — key fields to display:**
```tsx
<Text style={{ color: colors.primary, fontWeight: '700' }}>
  {ride.origin_city} → {ride.destination_city}
</Text>
<Text style={{ color: colors.onSurfaceVariant }}>
  Departs {formatTime(ride.departure_time)}   •   {ride.driver.full_name}
</Text>
<Text style={{ color: colors.success }}>
  {availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
</Text>
```

When `availableSlots === 0`, render the card greyed out (`opacity: 0.5`) with a "Full" badge using `colors.outline`.

#### Passenger dashboard update
Add a **Deliveries** tab alongside the existing Upcoming / Past / Payments tabs. Each delivery row shows: route, departure time, tier badge (colour-coded by severity), status badge, and price.

#### Driver — ride management update (`/driver/rides/:id`)
Add a **Deliveries** section to the `PassengerManifest` area:

```
─── Deliveries (2) ───────────────────────
  [SENSITIVE] Clothes and a phone charger
  Contact: +216 XX XXX XXX
  [CRITICAL]  Cash envelope
  Contact: +216 XX XXX XXX
─────────────────────────────────────────
```

Driver can tap each delivery to mark it as **Picked up** or **Delivered**. Status transitions:
`pending → confirmed → picked_up → delivered`

#### Notifications
- **Sender** receives a push + SMS when the driver marks the delivery as `picked_up` and again as `delivered`.
- **Driver** receives a push notification when a new delivery is booked on their ride.

---

## Change 3 — Dock Bar: Add Delivery Tab (5th element)

The current dock bar contains **4 elements**. Add a **5th element** for the new Deliveries feature.

### Updated dock bar structure

| Position | Label | Icon | Screen |
|----------|-------|------|--------|
| 1 | Home | `home` | HomeScreen |
| 2 | Search | `search` | SearchScreen |
| 3 | **Delivery** | `package` (or `box`) | DeliveryScreen ← **NEW** |
| 4 | Bookings | `calendar` (or `ticket`) | DashboardScreen |
| 5 | Profile | `person` | ProfileScreen |

> Adjust positions 3–5 if your current order differs — the key requirement is that Delivery appears between Search and Bookings so the flow feels natural (find a ride → send a package → view your bookings).

### Implementation — `BottomTabNavigator.tsx`

```tsx
import { Package } from 'lucide-react-native'; // or your existing icon set

<Tab.Screen
  name="Delivery"
  component={DeliveryScreen}
  options={{
    tabBarLabel: 'Delivery',
    tabBarIcon: ({ color, size }) => (
      <Package color={color} size={size} />
    ),
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.onSurfaceVariant,
  }}
/>
```

Add an **unread badge** on the Delivery tab icon when a delivery the user sent has been picked up or delivered and has not been viewed yet. Use `tabBarBadge` with `backgroundColor: colors.secondaryContainer` (red `#DC2626`).

---

## Summary of all files to create / modify

### New files
- `screens/DeliveryScreen.tsx` — ride list + booking flow
- `screens/DeliveryConfirmScreen.tsx` — success receipt for a delivery
- `components/SeveritySelector.tsx` — tier picker with colour-coded cards
- `components/DeliveryRideCard.tsx` — ride card variant for delivery listings
- `components/DeliveryStatusBadge.tsx` — colour-coded status pill

### Modified files
- `navigation/BottomTabNavigator.tsx` — add 5th Delivery tab
- `components/PriceSummary.tsx` — add 3 TND fee breakdown rows
- `screens/BookingConfirmScreen.tsx` — add fee receipt line
- `components/CancelButton.tsx` — add non-refundable fee callout
- `screens/PassengerDashboard.tsx` — add Deliveries tab
- `screens/DriverRideManagement.tsx` — add deliveries section
- `services/reservationService.ts` — inject PLATFORM_FEE + DRIVER_FEE
- `services/deliveryService.ts` — new service for all delivery API calls

### Backend (Supabase + GraphQL)
- Migration: alter `payment`, alter `ride`, create `delivery` tables (SQL editor / `supabase db push`)
- RLS policies for `delivery` table (passenger own rows, driver ride rows)
- Enable Supabase Realtime on `delivery` table
- New Edge Function: `create-delivery` (price validation + atomic slot booking via `book_delivery` RPC)
- New Edge Function: `create-reservation` (inject fee split into payment row)
- Update GraphQL schema: add delivery queries + mutations, expose `platform_fee`/`driver_fee` on payment type
- Update driver earnings query to compute net payout from fee columns
- Update notification triggers: delivery `picked_up` and `delivered` status changes fire push + SMS via Supabase Database Webhooks or Edge Function hooks




read the whole codebase understand the logic, structure and security then read this file 

Update.md
 and apply the update step by step without skipping any part it is critical 