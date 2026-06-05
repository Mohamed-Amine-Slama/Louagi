# Louagi App — Comprehensive Implementation Plan
**Date:** June 5, 2026  
**Stack:** Expo / React Native · GraphQL (Apollo or custom) · Supabase (PostgreSQL + Realtime) · Node.js resolver layer

---

## Table of Contents

1. [Booking: Prevent Duplicate Seats & Seat-Count Control](#1-booking-prevent-duplicate-seats--seat-count-control)
2. [UI: Button Style Updates (Message / Call Passenger)](#2-ui-button-style-updates-message--call-passenger)
3. [Navigation: Go Back Button in Ride Management](#3-navigation-go-back-button-in-ride-management)
4. [Messaging: Both-Sides Delete](#4-messaging-both-sides-delete)
5. [Real-Time Data Across the Entire App](#5-real-time-data-across-the-entire-app)
6. [Driver Profile: Security, Policies & More Details](#6-driver-profile-security-policies--more-details)
7. [Driver Earnings: Real-Time with Day-to-Day, Rate & Top Route](#7-driver-earnings-real-time-with-day-to-day-rate--top-route)
8. [Passenger Dashboard: Filters with Real-Time Sorting Algorithms](#8-passenger-dashboard-filters-with-real-time-sorting-algorithms)
9. [API & GraphQL Performance — Target < 200 ms per Request](#9-api--graphql-performance--target--200-ms-per-request)
10. [Endpoint Protection, Request Encryption & Zero-Trust Policy](#10-endpoint-protection-request-encryption--zero-trust-policy)
11. [Accessibility Fix: aria-hidden on Focused Descendant](#11-accessibility-fix-aria-hidden-on-focused-descendant)
12. [429 Too Many Requests: Stop Blind Polling of ListChats](#12-429-too-many-requests-stop-blind-polling-of-listchats)
13. [Testing, Monitoring & Rollout Checklist](#13-testing-monitoring--rollout-checklist)

---

## 1. Booking: Prevent Duplicate Seats & Seat-Count Control

### Problem
A passenger can submit a booking form multiple times, resulting in duplicate records. There is no seat-count input, so each submission implicitly books 1 seat without giving the passenger the option to book 2–4 seats in a single transaction.

### Root Cause
- No DB-level unique constraint on `(ride_id, passenger_id)`.
- No optimistic lock or transaction guard on the resolver.
- Booking mutation fires on every button press with no debounce or loading guard.

### Solution

#### 1.1 Database — Unique Constraint + Seats Column

```sql
-- Migration: add seats_count + unique booking constraint
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS seats_count INTEGER NOT NULL DEFAULT 1
    CHECK (seats_count >= 1 AND seats_count <= 4);

ALTER TABLE bookings
  ADD CONSTRAINT unique_passenger_ride
    UNIQUE (ride_id, passenger_id);

-- Index for fast duplicate check
CREATE INDEX IF NOT EXISTS idx_bookings_ride_passenger
  ON bookings (ride_id, passenger_id);
```

#### 1.2 GraphQL Resolver — Atomic Transaction with Lock

```typescript
// resolvers/booking.ts
async function createBooking(_, { input }, { supabase, userId }) {
  const { rideId, seatsCount } = input;

  // 1. Validate seats_count range server-side (zero trust)
  if (seatsCount < 1 || seatsCount > 4) {
    throw new GraphQLError('seats_count must be between 1 and 4', {
      extensions: { code: 'VALIDATION_ERROR' },
    });
  }

  const { data, error } = await supabase.rpc('book_ride', {
    p_ride_id: rideId,
    p_passenger_id: userId,
    p_seats: seatsCount,
  });

  if (error?.code === '23505') {  // unique_violation
    throw new GraphQLError('You already have a booking on this ride', {
      extensions: { code: 'DUPLICATE_BOOKING' },
    });
  }
  if (error) throw new GraphQLError(error.message);
  return data;
}
```

#### 1.3 Supabase RPC — Atomic Check + Insert

```sql
CREATE OR REPLACE FUNCTION book_ride(
  p_ride_id   UUID,
  p_passenger_id UUID,
  p_seats     INTEGER
) RETURNS bookings AS $$
DECLARE
  v_available INTEGER;
  v_booking   bookings;
BEGIN
  -- Row-level lock on the ride row
  SELECT (capacity - booked_seats) INTO v_available
  FROM rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Ride not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats available' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO bookings (ride_id, passenger_id, seats_count, status)
  VALUES (p_ride_id, p_passenger_id, p_seats, 'pending')
  RETURNING * INTO v_booking;

  UPDATE rides
  SET booked_seats = booked_seats + p_seats
  WHERE id = p_ride_id;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.4 Frontend — Seat Picker + Loading Guard

```tsx
// BookingScreen.tsx
const [seats, setSeats] = useState(1);
const [loading, setLoading] = useState(false);

const handleBook = async () => {
  if (loading) return;          // prevent double-tap
  setLoading(true);
  try {
    await bookRide({ variables: { rideId, seatsCount: seats } });
  } catch (e) {
    if (e.message.includes('DUPLICATE_BOOKING')) {
      Alert.alert('Already booked', 'You already have a seat on this ride.');
    } else {
      Alert.alert('Error', e.message);
    }
  } finally {
    setLoading(false);
  }
};

// Seat counter UI
<View style={styles.seatRow}>
  <TouchableOpacity onPress={() => setSeats(s => Math.max(1, s - 1))}>
    <Text style={styles.seatBtn}>−</Text>
  </TouchableOpacity>
  <Text style={styles.seatCount}>{seats} seat{seats > 1 ? 's' : ''}</Text>
  <TouchableOpacity
    onPress={() => setSeats(s => Math.min(availableSeats, s + 1))}
    disabled={seats >= availableSeats}
  >
    <Text style={[styles.seatBtn, seats >= availableSeats && styles.disabled]}>+</Text>
  </TouchableOpacity>
</View>

<PrimaryButton
  label={loading ? 'Booking…' : `Book ${seats} seat${seats > 1 ? 's' : ''}`}
  onPress={handleBook}
  disabled={loading}
/>
```

---

## 2. UI: Button Style Updates (Message / Call Passenger)

### Problem
"Message Passenger" and "Call Passenger" action buttons have inconsistent or unclear styles that do not visually communicate their distinct actions.

### Solution

Use icon-left pill buttons with semantic color differentiation:
- **Message** → brand primary (Louagi red `#C8102E`) with a chat bubble icon
- **Call** → success green with a phone icon

```tsx
// components/PassengerActionButtons.tsx
import { Feather } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';

interface Props {
  onMessage: () => void;
  onCall: () => void;
  disabled?: boolean;
}

export const PassengerActionButtons = ({ onMessage, onCall, disabled }: Props) => (
  <View style={styles.row}>
    <TouchableOpacity
      style={[styles.btn, styles.messageBtn, disabled && styles.disabledBtn]}
      onPress={onMessage}
      disabled={disabled}
      accessibilityLabel="Message passenger"
      accessibilityRole="button"
    >
      <Feather name="message-circle" size={16} color="#fff" />
      <Text style={styles.btnText}>Message</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.btn, styles.callBtn, disabled && styles.disabledBtn]}
      onPress={onCall}
      disabled={disabled}
      accessibilityLabel="Call passenger"
      accessibilityRole="button"
    >
      <Feather name="phone" size={16} color="#fff" />
      <Text style={styles.btnText}>Call</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  messageBtn: {
    backgroundColor: '#C8102E',
  },
  callBtn: {
    backgroundColor: '#1A9E5C',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
```

---

## 3. Navigation: Go Back Button in Ride Management

### Problem
The back button in the Ride Management screen does not navigate back. The most common causes in Expo/React Navigation:
- Using `navigation.goBack()` when the screen was pushed as a modal or via `reset()`, so there is no stack entry to go back to.
- Wrapping the screen in a component that swallows the press event.
- Missing `headerLeft` override that calls `goBack` on the wrong navigator instance.

### Diagnosis Steps
```bash
# Add this log to the back button handler temporarily:
console.log('nav state:', navigation.getState());
# If routes.length === 1, there is no back entry — must use navigate() instead.
```

### Fix A — Standard Stack Screen

```tsx
// RideManagementScreen.tsx
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// Option 1: header back (React Navigation built-in)
useLayoutEffect(() => {
  navigation.setOptions({
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('DriverDashboard'); // explicit fallback
          }
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Feather name="arrow-left" size={22} color="#C8102E" />
      </TouchableOpacity>
    ),
  });
}, [navigation]);
```

### Fix B — If Screen Is Presented as Modal

```tsx
// navigator/DriverNavigator.tsx
<Stack.Screen
  name="RideManagement"
  component={RideManagementScreen}
  options={{
    presentation: 'card',      // NOT 'modal' unless intentional
    gestureEnabled: true,
  }}
/>
```

### Fix C — Nested Navigator Issue

If `RideManagement` lives inside a nested navigator (e.g., a Tab inside a Stack), `navigation.goBack()` only pops within the inner navigator. Use the parent:

```tsx
const rootNavigation = useRootNavigation(); // custom hook
// or
navigation.getParent()?.goBack();
```

---

## 4. Messaging: Both-Sides Delete

### Problem
Only one side (likely the sender) can delete messages. The receiver cannot delete messages from their conversation view.

### Solution

#### 4.1 Database Schema

```sql
-- Soft-delete with per-user visibility flags
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_by_sender    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_receiver  BOOLEAN NOT NULL DEFAULT false;

-- RLS: each user only sees messages not deleted for them
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (
    (sender_id = auth.uid()    AND deleted_by_sender   = false) OR
    (receiver_id = auth.uid()  AND deleted_by_receiver = false)
  );
```

#### 4.2 GraphQL Mutation

```graphql
mutation DeleteMessage($messageId: UUID!, $forEveryone: Boolean) {
  DeleteMessage(messageId: $messageId, forEveryone: $forEveryone) {
    id
    deleted_by_sender
    deleted_by_receiver
  }
}
```

```typescript
// resolver
async function deleteMessage(_, { messageId, forEveryone = false }, { supabase, userId }) {
  const { data: msg } = await supabase
    .from('messages')
    .select('sender_id, receiver_id')
    .eq('id', messageId)
    .single();

  if (!msg) throw new GraphQLError('Message not found');

  const isSender   = msg.sender_id === userId;
  const isReceiver = msg.receiver_id === userId;

  if (!isSender && !isReceiver) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'FORBIDDEN' } });
  }

  const updates: Record<string, boolean> = {};

  if (forEveryone && isSender) {
    // Sender deletes for both parties
    updates.deleted_by_sender   = true;
    updates.deleted_by_receiver = true;
  } else if (isSender) {
    updates.deleted_by_sender = true;
  } else {
    updates.deleted_by_receiver = true;
  }

  const { data } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single();

  return data;
}
```

#### 4.3 Frontend — Swipe-to-Delete or Long-Press Menu

```tsx
// MessageBubble.tsx
const handleLongPress = () => {
  const options = ['Delete for me'];
  const isSender = message.sender_id === currentUserId;
  if (isSender) options.unshift('Delete for everyone');
  options.push('Cancel');

  ActionSheetIOS.showActionSheetWithOptions(
    { options, destructiveButtonIndex: isSender ? 0 : undefined, cancelButtonIndex: options.length - 1 },
    (index) => {
      if (index === 0 && isSender) deleteMessage({ forEveryone: true });
      else if (index === (isSender ? 1 : 0)) deleteMessage({ forEveryone: false });
    }
  );
};
```

---

## 5. Real-Time Data Across the Entire App

### Problem
Driver dashboard "Today's Rides" still shows May 26 data. The app is fetching static/cached data instead of filtering by the current local date and subscribing to live changes.

### Root Cause
1. The `today` filter in the query is hard-coded or computed once on mount and never re-evaluated.
2. There is no Supabase Realtime subscription — data is fetched once on screen load.
3. No date-boundary reset when the app transitions from one day to the next.

### Solution

#### 5.1 Always Derive "Today" at Query Time

```typescript
// utils/date.ts
export const getTodayISO = () => new Date().toISOString().split('T')[0]; // "2026-06-05"

export const getTodayRange = () => {
  const today = getTodayISO();
  return {
    start: `${today}T00:00:00.000Z`,
    end:   `${today}T23:59:59.999Z`,
  };
};
```

#### 5.2 GraphQL Query with Date Filter

```graphql
query TodayRides($driverId: UUID!, $dateStart: Timestamp!, $dateEnd: Timestamp!) {
  rides(
    where: {
      driver_id: { _eq: $driverId }
      departure_time: { _gte: $dateStart, _lte: $dateEnd }
    }
    order_by: { departure_time: asc }
  ) {
    id
    origin
    destination
    departure_time
    status
    passengers_aggregate { aggregate { count } }
  }
}
```

```tsx
// DriverDashboard.tsx
const { start, end } = getTodayRange();
const { data, subscribeToMore } = useQuery(TODAY_RIDES, {
  variables: { driverId: user.id, dateStart: start, dateEnd: end },
  fetchPolicy: 'network-only',   // never serve stale cache
});
```

#### 5.3 Supabase Realtime Subscription (Replace All Polling)

```typescript
// hooks/useRealtimeRides.ts
export function useRealtimeRides(driverId: string) {
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    const { start, end } = getTodayRange();

    // Initial fetch
    fetchTodayRides(driverId, start, end).then(setRides);

    // Subscribe to changes
    const channel = supabase
      .channel(`driver-rides-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          setRides(prev => {
            switch (payload.eventType) {
              case 'INSERT': return [...prev, payload.new as Ride];
              case 'UPDATE': return prev.map(r => r.id === payload.new.id ? payload.new as Ride : r);
              case 'DELETE': return prev.filter(r => r.id !== payload.old.id);
              default: return prev;
            }
          });
        }
      )
      .subscribe();

    // Midnight reset: re-fetch when day changes
    const msUntilMidnight = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    };
    const timer = setTimeout(() => window.location.reload(), msUntilMidnight());

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timer);
    };
  }, [driverId]);

  return rides;
}
```

#### 5.4 App State (Background → Foreground) Refresh

```tsx
// hooks/useAppStateRefresh.ts
import { AppState } from 'react-native';

export function useAppStateRefresh(refetch: () => void) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch(); // re-fetch when user returns to app
    });
    return () => sub.remove();
  }, [refetch]);
}
```

---

## 6. Driver Profile: Security, Policies & More Details

### Problem
Driver profile shows minimal information. No security features (2FA status, device sessions, data deletion), no policy agreements, and no operational detail (ratings breakdown, vehicle info, verification status).

### Solution

#### 6.1 Schema Additions

```sql
-- Driver extended profile
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS
  national_id_verified   BOOLEAN DEFAULT false,
  license_expiry_date    DATE,
  vehicle_insurance_expiry DATE,
  criminal_record_check  BOOLEAN DEFAULT false,
  two_fa_enabled         BOOLEAN DEFAULT false,
  accepted_terms_version VARCHAR(10),
  accepted_terms_at      TIMESTAMPTZ,
  accepted_privacy_at    TIMESTAMPTZ,
  data_deletion_requested BOOLEAN DEFAULT false,
  account_suspension_reason TEXT;

-- Device sessions table
CREATE TABLE IF NOT EXISTS driver_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     UUID REFERENCES drivers(id),
  device_name   TEXT,
  device_os     TEXT,
  ip_address    INET,
  last_active   TIMESTAMPTZ DEFAULT now(),
  revoked       BOOLEAN DEFAULT false
);
```

#### 6.2 Driver Profile Screen Sections

```
📋 PROFILE SECTIONS:
┌─────────────────────────────────────────────────────┐
│ 1. Personal Details                                  │
│    Name · Phone · Email · Profile Photo · NID status │
├─────────────────────────────────────────────────────┤
│ 2. Vehicle Details                                   │
│    Make / Model / Year · Plate · Color · Capacity    │
│    Insurance expiry · Technical inspection date      │
├─────────────────────────────────────────────────────┤
│ 3. License & Compliance                              │
│    Driving license number · Expiry · Category        │
│    Criminal background check: ✅ Verified            │
│    Last verification date                            │
├─────────────────────────────────────────────────────┤
│ 4. Security Settings                                 │
│    Two-Factor Authentication (ON/OFF toggle)         │
│    Active Sessions (list + "Revoke" per session)     │
│    Change Password                                   │
│    Biometric Login (ON/OFF)                          │
├─────────────────────────────────────────────────────┤
│ 5. Policies & Agreements                             │
│    Terms of Service (version · accepted date)        │
│    Privacy Policy                                    │
│    Driver Code of Conduct                            │
│    Cancellation Policy (display, not just checkbox)  │
├─────────────────────────────────────────────────────┤
│ 6. Account Management                               │
│    Download my data (GDPR)                           │
│    Request account deletion                          │
│    Report a problem                                  │
└─────────────────────────────────────────────────────┘
```

#### 6.3 Two-Factor Authentication Flow

```tsx
// Enable TOTP 2FA via Supabase Auth
const enable2FA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Louagi',
  });
  // Show QR code from data.totp.qr_code to user
  // Verify with:
  await supabase.auth.mfa.verify({ factorId: data.id, code: userEnteredCode });
};
```

#### 6.4 Session Management

```tsx
// Show active devices with revoke button
const DriverSessions = () => {
  const { data } = useQuery(GET_DRIVER_SESSIONS);

  return data?.sessions.map(session => (
    <View key={session.id} style={styles.sessionRow}>
      <Feather name="smartphone" size={18} />
      <View>
        <Text>{session.device_name} · {session.device_os}</Text>
        <Text style={styles.meta}>Last active: {formatRelative(session.last_active)}</Text>
      </View>
      <TouchableOpacity onPress={() => revokeSession(session.id)}>
        <Text style={styles.revoke}>Revoke</Text>
      </TouchableOpacity>
    </View>
  ));
};
```

---

## 7. Driver Earnings: Real-Time with Day-to-Day, Rate & Top Route

### Problem
Earnings section shows static data. No day-by-day breakdown, live rating calculation, or top-route identification for the current week.

### Solution

#### 7.1 Database Views

```sql
-- Daily earnings view
CREATE OR REPLACE VIEW driver_daily_earnings AS
SELECT
  driver_id,
  DATE(departure_time AT TIME ZONE 'Africa/Tunis') AS ride_date,
  COUNT(*)                                          AS total_rides,
  SUM(fare)                                         AS total_earned,
  AVG(fare)                                         AS avg_fare
FROM rides
WHERE status = 'completed'
GROUP BY driver_id, ride_date;

-- Top routes this week
CREATE OR REPLACE VIEW driver_top_routes_week AS
SELECT
  driver_id,
  origin,
  destination,
  COUNT(*)  AS ride_count,
  SUM(fare) AS total_revenue
FROM rides
WHERE
  status = 'completed'
  AND departure_time >= DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Tunis')
GROUP BY driver_id, origin, destination
ORDER BY ride_count DESC;

-- Driver rating from reviews
CREATE OR REPLACE VIEW driver_current_rating AS
SELECT
  driver_id,
  ROUND(AVG(rating)::NUMERIC, 2)  AS average_rating,
  COUNT(*)                         AS total_reviews,
  COUNT(*) FILTER (WHERE rating = 5) AS five_star_count
FROM ride_reviews
GROUP BY driver_id;
```

#### 7.2 GraphQL Earnings Query

```graphql
query DriverEarnings($driverId: UUID!, $weekStart: Date!, $today: Date!) {
  dailyEarnings: driver_daily_earnings(
    where: {
      driver_id: { _eq: $driverId }
      ride_date: { _gte: $weekStart, _lte: $today }
    }
    order_by: { ride_date: asc }
  ) {
    ride_date
    total_rides
    total_earned
    avg_fare
  }
  topRoutes: driver_top_routes_week(
    where: { driver_id: { _eq: $driverId } }
    limit: 3
  ) {
    origin
    destination
    ride_count
    total_revenue
  }
  rating: driver_current_rating_by_pk(driver_id: $driverId) {
    average_rating
    total_reviews
    five_star_count
  }
}
```

#### 7.3 Real-Time Earnings Update via Subscription

```typescript
// When a ride is completed, earnings update in real time
const channel = supabase
  .channel(`earnings-${driverId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rides',
    filter: `driver_id=eq.${driverId}`,
  }, (payload) => {
    if (payload.new.status === 'completed') {
      refetchEarnings(); // re-run the earnings query
    }
  })
  .subscribe();
```

#### 7.4 UI — Earnings Card

```tsx
const EarningsCard = ({ earnings, rating, topRoutes }: EarningsData) => {
  const weekTotal = earnings.reduce((sum, d) => sum + d.total_earned, 0);
  const todayEarnings = earnings.find(d => d.ride_date === getTodayISO());

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>This Week</Text>
      <Text style={styles.bigNumber}>{weekTotal.toFixed(3)} TND</Text>

      {/* Day-by-day bar mini chart */}
      <MiniBarChart data={earnings} xKey="ride_date" yKey="total_earned" />

      <View style={styles.row}>
        <StatChip icon="star" label="Rating" value={`${rating.average_rating} ★`} />
        <StatChip icon="trending-up" label="Today" value={`${(todayEarnings?.total_earned ?? 0).toFixed(3)} TND`} />
        <StatChip icon="repeat" label="Rides" value={`${todayEarnings?.total_rides ?? 0}`} />
      </View>

      <Text style={styles.sectionLabel}>Top Routes This Week</Text>
      {topRoutes.map((r, i) => (
        <View key={i} style={styles.routeRow}>
          <Text style={styles.routeText}>{r.origin} → {r.destination}</Text>
          <Text style={styles.routeCount}>{r.ride_count}x · {r.total_revenue.toFixed(3)} TND</Text>
        </View>
      ))}
    </View>
  );
};
```

---

## 8. Passenger Dashboard: Filters with Real-Time Sorting Algorithms

### Problem
Filters (Earliest, Cheapest, Best Rated) either use stale data or don't sort correctly because they are applied client-side on a cached list without real comparators.

### Solution

#### 8.1 Sort Types

```typescript
// types/sort.ts
export type SortMode = 'earliest' | 'cheapest' | 'best_rated';
```

#### 8.2 Server-Side Sorting in GraphQL

Always pass `sort_by` to the resolver and sort in PostgreSQL — never sort a partial list client-side.

```graphql
query SearchRides(
  $origin: String!
  $destination: String!
  $date: Date!
  $sortBy: RideSortMode!
) {
  SearchRides(
    origin: $origin
    destination: $destination
    date: $date
    sortBy: $sortBy
  ) {
    id
    origin
    destination
    departure_time
    fare
    available_seats
    driver {
      id
      name
      avatar_url
      rating: driver_current_rating { average_rating }
    }
  }
}
```

```typescript
// resolver/rides.ts
const SORT_MAP: Record<string, string> = {
  earliest:   'departure_time ASC',
  cheapest:   'fare ASC, departure_time ASC',
  best_rated: 'drivers.average_rating DESC, departure_time ASC',
};

async function searchRides(_, { origin, destination, date, sortBy }) {
  const orderClause = SORT_MAP[sortBy] ?? SORT_MAP.earliest;

  const { data } = await supabase.rpc('search_rides', {
    p_origin:      origin,
    p_destination: destination,
    p_date:        date,
    p_order:       orderClause,
  });
  return data;
}
```

#### 8.3 Supabase SQL Function for Sorting

```sql
CREATE OR REPLACE FUNCTION search_rides(
  p_origin      TEXT,
  p_destination TEXT,
  p_date        DATE,
  p_order       TEXT
) RETURNS SETOF ride_search_view AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT r.*, dcr.average_rating
     FROM rides r
     LEFT JOIN driver_current_rating dcr ON dcr.driver_id = r.driver_id
     WHERE r.origin = %L
       AND r.destination = %L
       AND r.departure_time::DATE = %L
       AND r.status = ''active''
       AND r.available_seats > 0
     ORDER BY %s',
    p_origin, p_destination, p_date, p_order
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

#### 8.4 Real-Time Filter — Subscription on Active Rides

```typescript
// When a ride's fare, status, or available_seats changes, re-run the active filter
supabase.channel('active-rides')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rides',
    filter: `status=eq.active`,
  }, () => refetchSearch())
  .subscribe();
```

#### 8.5 Frontend Filter Bar

```tsx
const SORT_OPTIONS: { label: string; value: SortMode; icon: string }[] = [
  { label: 'Earliest',    value: 'earliest',   icon: 'clock' },
  { label: 'Cheapest',    value: 'cheapest',   icon: 'tag' },
  { label: 'Best Rated',  value: 'best_rated', icon: 'star' },
];

const FilterBar = ({ active, onChange }: FilterBarProps) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bar}>
    {SORT_OPTIONS.map(opt => (
      <TouchableOpacity
        key={opt.value}
        style={[styles.chip, active === opt.value && styles.activeChip]}
        onPress={() => onChange(opt.value)}
        accessibilityState={{ selected: active === opt.value }}
      >
        <Feather name={opt.icon} size={13} color={active === opt.value ? '#fff' : '#666'} />
        <Text style={[styles.chipLabel, active === opt.value && styles.activeLabel]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);
```

---

## 9. API & GraphQL Performance — Target < 200 ms per Request

### Problem
Average API response is ~980 ms. This is ~5× the target. Root causes typically span: missing DB indexes, N+1 query patterns, cold connection pool, non-selective field fetching, and lack of any caching layer.

### Multi-Layer Optimization Strategy

#### 9.1 Layer 1 — PostgreSQL Indexes (Biggest Win, Fastest to Ship)

```sql
-- Most-queried patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_driver_date
  ON rides (driver_id, departure_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_status_date
  ON rides (status, departure_time)
  WHERE status IN ('active', 'upcoming');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_origin_dest_date
  ON rides (origin, destination, (departure_time::DATE));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_passenger
  ON bookings (passenger_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat
  ON messages (chat_id, created_at DESC)
  WHERE deleted_by_sender = false AND deleted_by_receiver = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender
  ON messages (sender_id, created_at DESC);

-- Run EXPLAIN ANALYZE on every slow query and verify index usage
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM rides WHERE driver_id = '<uuid>' AND departure_time::DATE = '2026-06-05';
```

#### 9.2 Layer 2 — DataLoader (Eliminate N+1 Queries)

Every resolver that loads a related entity inside a list is an N+1 candidate.

```typescript
// loaders/driverLoader.ts
import DataLoader from 'dataloader';

export const createDriverLoader = (supabase: SupabaseClient) =>
  new DataLoader<string, Driver>(async (driverIds) => {
    const { data } = await supabase
      .from('drivers')
      .select('*, driver_current_rating(*)')
      .in('id', driverIds as string[]);

    const map = new Map(data?.map(d => [d.id, d]));
    return driverIds.map(id => map.get(id) ?? new Error(`Driver ${id} not found`));
  });

// In GraphQL context factory:
export const createContext = ({ req }) => ({
  supabase,
  userId: req.user?.id,
  loaders: {
    driver: createDriverLoader(supabase),
    passenger: createPassengerLoader(supabase),
    booking: createBookingLoader(supabase),
  },
});

// In ride resolver — uses loader, not individual query per ride:
driver: (ride, _, { loaders }) => loaders.driver.load(ride.driver_id),
```

#### 9.3 Layer 3 — Connection Pooling with PgBouncer

```
Supabase Dashboard → Settings → Database → Connection pooling
Mode: Transaction (lowest overhead for short queries)
Pool size: 15–20 (tune based on your Supabase plan)
```

```typescript
// Use the pooler connection string in your .env:
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
```

#### 9.4 Layer 4 — Query Projection (Select Only Needed Fields)

```typescript
// Never SELECT * — always specify columns
const { data } = await supabase
  .from('rides')
  .select('id, origin, destination, departure_time, fare, available_seats, driver_id')
  // NOT .select('*')
  .eq('status', 'active')
  .gte('departure_time', start)
  .lte('departure_time', end);
```

#### 9.5 Layer 5 — Redis Cache for Reference Data

Reference data (list of 24 governorates, driver base info, fare config) does not change on every request — cache it.

```typescript
// cache/redis.ts
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;

  const value = await fetcher();
  await redis.setEx(key, ttlSeconds, JSON.stringify(value));
  return value;
}

// Usage in resolver
const governorates = await cached('governorates:all', 86400, () =>
  supabase.from('governorates').select('*').then(r => r.data)
);
```

#### 9.6 Layer 6 — Apollo Client Caching (Frontend)

```typescript
// apollo/client.ts
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Ride: {
        keyFields: ['id'],
        fields: {
          passengers: {
            merge(existing = [], incoming) {
              return [...incoming]; // replace on update
            },
          },
        },
      },
      Query: {
        fields: {
          // Paginated rides: merge pages instead of replacing
          SearchRides: {
            keyArgs: ['origin', 'destination', 'date', 'sortBy'],
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network', // show cache immediately, refresh in bg
      nextFetchPolicy: 'cache-first',
    },
  },
});
```

#### 9.7 Layer 7 — Query Complexity Limiting

Prevent expensive deeply-nested queries from slowing the server:

```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  schema,
  validationRules: [
    createComplexityLimitRule(1000, {
      scalarCost: 1,
      objectCost: 5,
      listFactor: 10,
    }),
  ],
});
```

#### 9.8 Measuring & Monitoring

```typescript
// Apollo plugin — log slow queries
const timingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const start = Date.now();
    return {
      async willSendResponse(ctx) {
        const ms = Date.now() - start;
        if (ms > 200) {
          console.warn(`[SLOW] ${ctx.request.operationName} took ${ms}ms`);
        }
        ctx.response.http?.headers.set('X-Response-Time', `${ms}ms`);
      },
    };
  },
};
```

#### 9.9 Expected Gains

| Optimization             | Estimated Gain |
|--------------------------|---------------|
| PostgreSQL Indexes       | −400–500 ms   |
| DataLoader (N+1 fix)     | −200–300 ms   |
| PgBouncer pool           | −50–100 ms    |
| Select projection        | −30–50 ms     |
| Redis cache (ref data)   | −50–100 ms    |
| Apollo InMemoryCache      | −50–200 ms (perceived) |
| **Total expected**       | **< 200 ms** ✅ |

---

## 10. Endpoint Protection, Request Encryption & Zero-Trust Policy

### Principle
Never trust anything from the client. Every GraphQL operation, Supabase RPC, and REST endpoint must verify identity independently of what the frontend claims.

### 10.1 JWT Middleware on Every Request

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';

export async function verifyToken(req: Request): Promise<AuthUser> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new GraphQLError('Missing authorization token', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  const token = header.slice(7);
  let payload: JWTPayload;

  try {
    payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as JWTPayload;
  } catch (e) {
    throw new GraphQLError('Invalid or expired token', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  // Verify token is not revoked (check DB sessions table)
  const { data: session } = await supabase
    .from('driver_sessions')
    .select('id, revoked')
    .eq('id', payload.session_id)
    .single();

  if (!session || session.revoked) {
    throw new GraphQLError('Session has been revoked', {
      extensions: { code: 'FORBIDDEN', http: { status: 403 } },
    });
  }

  return { userId: payload.sub, role: payload.role };
}
```

### 10.2 Zero-Trust Resolver Guard

```typescript
// Every resolver that accesses user-specific data must validate:
async function getMyBookings(_, __, { userId }) {
  if (!userId) throw forbidden();

  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('passenger_id', userId)   // ← ALWAYS filter by server-verified userId
    // Never use an ID from the input — only from the token
    .order('created_at', { ascending: false });

  return data;
}

// Helper
const forbidden = () => new GraphQLError('Access denied', {
  extensions: { code: 'FORBIDDEN', http: { status: 403 } },
});
```

### 10.3 Supabase Row Level Security (RLS)

```sql
-- Enable RLS on every table
ALTER TABLE bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages  ENABLE ROW LEVEL SECURITY;

-- Passengers can only see their own bookings
CREATE POLICY "passenger_own_bookings" ON bookings
  FOR ALL USING (passenger_id = auth.uid());

-- Drivers can only see rides they own
CREATE POLICY "driver_own_rides" ON rides
  FOR ALL USING (driver_id = auth.uid());

-- Messages: only sender or receiver
CREATE POLICY "message_participants" ON messages
  FOR ALL USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );
```

### 10.4 Rate Limiting per User

```typescript
// middleware/rateLimit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({
  points: 60,       // 60 operations
  duration: 60,     // per 60 seconds
});

export async function rateLimit(userId: string) {
  try {
    await limiter.consume(userId);
  } catch {
    throw new GraphQLError('Too many requests. Please wait before retrying.', {
      extensions: { code: 'RATE_LIMITED', http: { status: 429 } },
    });
  }
}
```

### 10.5 Input Validation / Sanitization

```typescript
import { z } from 'zod';

const BookRideSchema = z.object({
  rideId:     z.string().uuid(),
  seatsCount: z.number().int().min(1).max(4),
});

const SearchSchema = z.object({
  origin:      z.string().min(2).max(50),
  destination: z.string().min(2).max(50),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sortBy:      z.enum(['earliest', 'cheapest', 'best_rated']),
});

// Use in resolver:
const input = BookRideSchema.parse(rawInput); // throws ZodError on invalid
```

### 10.6 HTTPS + Certificate Pinning (Mobile)

```typescript
// app.json / expo config
{
  "expo": {
    "plugins": [
      ["expo-build-properties", {
        "ios": { "useFrameworks": "static" },
        "android": { "networkSecurityConfig": "./network_security_config.xml" }
      }]
    ]
  }
}
```

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">your-api.supabase.co</domain>
    <pin-set expiration="2027-01-01">
      <pin digest="SHA-256">REPLACE_WITH_ACTUAL_PIN_HASH</pin>
    </pin-set>
  </domain-config>
</network-security-config>
```

### 10.7 Security Headers on API

```typescript
// Express / Hono middleware
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  next();
});
```

---

## 11. Accessibility Fix: aria-hidden on Focused Descendant

### Problem
```
Blocked aria-hidden on an element because its descendant retained focus.
Ancestor with aria-hidden: <div.css-view-g5y9jx r-flex-13awgt0 r-bottom-1p0dtai ...>
```

This is the React Native Web bottom tab bar being `aria-hidden` while a focusable child inside it retains keyboard/screen-reader focus.

### Root Cause
React Navigation's bottom tab bar sets `aria-hidden="true"` on the inactive screen container but does not move focus away first. This violates WCAG 1.3.1.

### Fix A — Use `inert` Instead of `aria-hidden`

```tsx
// If you have a custom tab bar or modal overlay, replace:
// aria-hidden={true}
// with:
// inert={isHidden ? '' : undefined}   (HTML inert attribute — prevents focus)

// In React Native Web context (Expo Web), patch via style override:
<View
  style={styles.overlay}
  // @ts-ignore — inert is valid HTML but not in RN types yet
  inert={isHidden ? '' : undefined}
>
  {children}
</View>
```

### Fix B — Force Focus Out Before Hiding

```tsx
// Before setting aria-hidden on a container, move focus to a safe target:
const safeRef = useRef<View>(null);

const hidePanel = () => {
  safeRef.current?.focus(); // move focus to safe element first
  setIsHidden(true);
};
```

### Fix C — React Navigation Tab Bar Patch

```tsx
// CustomTabBar.tsx — if using a custom tab bar
import { useFocusEffect } from '@react-navigation/native';

const TabBar = ({ state, ...props }) => {
  const inactiveScreenRef = useRef(null);

  // When a tab becomes inactive, blur all children before hiding
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // screen losing focus — ensure no child retains focus
        if (inactiveScreenRef.current) {
          inactiveScreenRef.current.blur?.();
        }
      };
    }, [])
  );

  return (
    <View
      ref={inactiveScreenRef}
      // Use inert instead of aria-hidden
      // @ts-ignore
      inert={!state.routes[state.index] ? '' : undefined}
      {...props}
    />
  );
};
```

---

## 12. 429 Too Many Requests: Stop Blind Polling of ListChats

### Problem
```
POST http://localhost:3000/graphql 429 (Too Many Requests)
// Continuously firing:
{"operationName":"ListChats","variables":{},"query":"query ListChats ..."}
```

The `ListChats` query is being polled in a `useEffect` or via Apollo's `pollInterval` unconditionally — even when the user is on a different screen, the app is in the background, or no new messages exist.

### Root Cause
Likely one of:
```tsx
// Offender pattern A — Apollo pollInterval never paused
useQuery(LIST_CHATS, { pollInterval: 2000 }); // fires every 2 seconds forever

// Offender pattern B — useEffect with setInterval, no cleanup
useEffect(() => {
  const id = setInterval(() => refetch(), 3000); // no cleanup = memory leak + 429
}, []);
```

### Fix — Replace Polling with Supabase Realtime Subscription

```typescript
// hooks/useChats.ts
export function useChats(userId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial fetch — ONE request, not repeated
    fetchChats(userId).then(data => {
      setChats(data);
      setLoading(false);
    });

    // 2. Real-time subscription — zero polling
    const channel = supabase
      .channel(`chats-user-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      }, (payload) => {
        // Update the relevant chat in state
        setChats(prev => {
          const chatId = (payload.new as Message).chat_id;
          return prev.map(chat =>
            chat.id === chatId
              ? { ...chat, last_message: payload.new, unread_count: chat.unread_count + 1 }
              : chat
          );
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // critical — cleanup on unmount
    };
  }, [userId]);

  return { chats, loading };
}
```

### Remove All pollInterval Usages

```typescript
// Search and remove ALL instances of pollInterval in your codebase:
// grep -r "pollInterval" src/

// Before:
useQuery(LIST_CHATS, { pollInterval: 3000 });

// After:
useQuery(LIST_CHATS, {
  fetchPolicy: 'cache-and-network',
  // NO pollInterval
});
// + add Supabase Realtime subscription for updates
```

### Visibility-Aware Fetching (Fallback if Polling Is Needed Anywhere)

```typescript
// If you must poll something (e.g., a 3rd party endpoint with no webhooks),
// pause when app is in background:
import { AppState } from 'react-native';

useEffect(() => {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const startPolling = () => {
    intervalId = setInterval(refetch, 30_000); // 30s minimum
  };
  const stopPolling = () => {
    if (intervalId) clearInterval(intervalId);
  };

  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') startPolling();
    else stopPolling();
  });

  if (AppState.currentState === 'active') startPolling();

  return () => {
    stopPolling();
    sub.remove();
  };
}, []);
```

---

## 13. Testing, Monitoring & Rollout Checklist

### Performance Benchmark (Before / After)

```bash
# Run k6 load test to validate < 200ms target
k6 run --vus 20 --duration 60s load_test.js
```

```javascript
// load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  const res = http.post('http://localhost:3000/graphql', JSON.stringify({
    operationName: 'TodayRides',
    variables: { driverId: TEST_DRIVER_ID, dateStart: '...', dateEnd: '...' },
    query: `query TodayRides(...) { ... }`,
  }), { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` } });

  check(res, {
    'status 200':    r => r.status === 200,
    'under 200ms':   r => r.timings.duration < 200,  // ← hard SLA
  });

  sleep(1);
}
```

### Pre-Deploy Checklist

```
Security
  [ ] RLS enabled on ALL tables
  [ ] JWT verified on every resolver
  [ ] Input validation (Zod) on all mutations
  [ ] Rate limiting active per userId
  [ ] No SELECT * in any query
  [ ] .env secrets not committed

Performance
  [ ] EXPLAIN ANALYZE run on every query listed in §9
  [ ] All indexes created and confirmed used
  [ ] DataLoader implemented for all relationship fields
  [ ] PgBouncer connection string used in production
  [ ] pollInterval removed from all Apollo queries
  [ ] Redis cache active for reference data

Real-Time
  [ ] Supabase Realtime subscriptions replace ALL polling
  [ ] AppState listener refreshes data on foreground
  [ ] getTodayRange() used at query time, not component mount

Booking
  [ ] DB unique constraint on (ride_id, passenger_id)
  [ ] book_ride() RPC used for atomic seat reservation
  [ ] Frontend loading guard prevents double-tap

Accessibility
  [ ] aria-hidden replaced with inert on all tab/modal overlays
  [ ] PassengerActionButtons have accessibilityLabel + accessibilityRole
  [ ] FilterBar chips have accessibilityState.selected

Navigation
  [ ] canGoBack() checked before goBack() on all back buttons
  [ ] Fallback navigate() specified for all screens

Messaging
  [ ] Both sender and receiver can delete messages
  [ ] Soft-delete columns prevent data loss
  [ ] RLS policy reflects deleted_by_* flags
```

### Monitoring (Post-Deploy)

```typescript
// Add to your Apollo server for p95 alerting
const metrics = {
  p95: [] as number[],
};

// Every 5 minutes, log p95 latency
setInterval(() => {
  if (metrics.p95.length > 0) {
    const sorted = [...metrics.p95].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    console.log(`[METRICS] p95 latency: ${p95}ms`);
    if (p95 > 200) console.error('[ALERT] p95 latency exceeds 200ms SLA');
    metrics.p95 = [];
  }
}, 5 * 60 * 1000);
```

---

*End of Louagi Implementation Plan — June 5, 2026*