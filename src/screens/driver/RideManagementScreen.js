import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View, Pressable } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { Stack, Row, Section } from '../../components/Section';
import { Banner } from '../../components/Banner';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';

function StatusBadge({ status }) {
  const map = {
    scheduled: { variant: 'info', label: 'Scheduled' },
    in_progress: { variant: 'warning', label: 'Live' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'error', label: 'Cancelled' },
  };
  const m = map[status] ?? map.scheduled;
  return <Badge label={m.label} variant={m.variant} />;
}

export default function RideManagementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const nav = useNavigation();
  const route = useRoute();
  const { id } = route.params;
  const toast = useToast();

  const [ride, setRide] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([
      ridesApi.getRideDetail(id),
      ridesApi.ridePassengers({ actor: user, rideId: id }),
    ]);
    setRide(d);
    setPassengers(p);
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!ride) return <Screen />;

  const sold = ride.total_seats - ride.available_seats;
  const earnings = sold * ride.price_per_seat;

  const setStatus = async (status) => {
    setBusy(true);
    const res = await ridesApi.updateRideStatus({ actor: user, rideId: id, status });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(`Marked as ${status.replace('_', ' ')}`, 'success');
    load();
  };

  const cancel = async () => {
    setBusy(true);
    const res = await ridesApi.cancelRide({ actor: user, rideId: id, reason: 'driver-cancel' });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(`Ride cancelled. ${res.cancelled} passenger${res.cancelled !== 1 ? 's' : ''} refunded.`, 'warning');
    load();
  };

  return (
    <Screen>
      <ScreenHeader
        title={`${ride.route.origin_city} → ${ride.route.destination_city}`}
        subtitle={new Date(ride.departure_time).toLocaleString()}
        showBack
      />

      <Card>
        <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
          <StatusBadge status={ride.status} />
          <Badge label={`${sold}/${ride.total_seats} seats`} variant="info" icon="event-seat" />
          <Badge label={`${earnings} TND`} variant="success" icon="payments" />
        </Row>
        <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                height: 8,
                backgroundColor: colors.surfaceContainer,
                borderRadius: radius.full,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 8,
                  width: `${Math.min(100, (sold / Math.max(1, ride.total_seats)) * 100)}%`,
                  backgroundColor: colors.secondaryContainer,
                }}
              />
            </View>
          </View>
        </Row>

        {ride.status === 'scheduled' ? (
          <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Mark as in progress"
                variant="primary"
                onPress={() => setStatus('in_progress')}
                loading={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Cancel ride" variant="danger" onPress={cancel} loading={busy} />
            </View>
          </Row>
        ) : ride.status === 'in_progress' ? (
          <Button
            style={{ marginTop: spacing.md }}
            label="Mark as completed"
            variant="secondary"
            onPress={() => setStatus('completed')}
          />
        ) : null}
      </Card>

      <Section title={`Passengers (${passengers.length})`}>
        {passengers.length === 0 ? (
          <Banner variant="info" title="No bookings yet" body="Once someone books, they'll appear here." />
        ) : (
          passengers.map((p) => (
            <Card key={p.id}>
              <Row gap={spacing.md}>
                <Avatar name={p.user?.full_name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd">{p.user?.full_name}</Text>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {p.seats_booked} seat{p.seats_booked > 1 ? 's' : ''} · {p.total_price} TND
                  </Text>
                </View>
                <Badge
                  label={p.status}
                  variant={p.status === 'confirmed' ? 'success' : p.status === 'cancelled' ? 'error' : 'info'}
                />
                <Pressable
                  onPress={() => toast.show('Calling…', 'info')}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primaryFixed,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="call" size={18} color={colors.primary} />
                </Pressable>
              </Row>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
