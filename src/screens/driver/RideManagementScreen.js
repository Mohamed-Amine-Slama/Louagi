import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable, Linking } from 'react-native';
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
import { formatDateTime } from '../../i18n/format';

function StatusBadge({ status, t }) {
  const map = {
    scheduled: { variant: 'info', label: t('driver:scheduled') },
    in_progress: { variant: 'warning', label: t('driver:live') },
    completed: { variant: 'success', label: t('driver:completedStatus') },
    cancelled: { variant: 'error', label: t('driver:cancelledStatus') },
  };
  const m = map[status] ?? map.scheduled;
  return <Badge label={m.label} variant={m.variant} />;
}

const STATUS_TOAST_KEY = {
  scheduled: 'toast:markedAsScheduled',
  in_progress: 'toast:markedAsInProgress',
  completed: 'toast:markedAsCompleted',
  cancelled: 'toast:markedAsCancelled',
};

export default function RideManagementScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
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
    toast.show(t(STATUS_TOAST_KEY[status] || 'toast:markedAsScheduled'), 'success');
    load();
  };

  const cancel = async () => {
    setBusy(true);
    const res = await ridesApi.cancelRide({ actor: user, rideId: id, reason: 'driver-cancel' });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(t('toast:rideCancelled', { count: res.cancelled }), 'warning');
    load();
  };

  return (
    <Screen>
      <ScreenHeader
        title={`${ride.route.origin_city} → ${ride.route.destination_city}`}
        subtitle={formatDateTime(ride.departure_time)}
        showBack
      />

      <Card>
        <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
          <StatusBadge status={ride.status} t={t} />
          <Badge label={t('driver:seatsCount', { count: sold, total: ride.total_seats })} variant="info" icon="event-seat" />
          <Badge label={t('driver:amountTnd', { amount: earnings })} variant="success" icon="payments" />
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
                label={t('driver:markInProgress')}
                variant="primary"
                onPress={() => setStatus('in_progress')}
                loading={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('driver:cancelRide')} variant="danger" onPress={cancel} loading={busy} />
            </View>
          </Row>
        ) : ride.status === 'in_progress' ? (
          <Button
            style={{ marginTop: spacing.md }}
            label={t('driver:markCompleted')}
            variant="secondary"
            onPress={() => setStatus('completed')}
          />
        ) : null}
        
        {ride.accepts_delivery && (
          <Button
            style={{ marginTop: spacing.md }}
            label={t('passenger:deliveries')}
            variant="outline"
            iconLeft="local-shipping"
            onPress={() => nav.navigate('DriverDelivery', { rideId: id })}
          />
        )}
      </Card>

      <Section title={t('driver:passengers', { count: passengers.length })}>
        {passengers.length === 0 ? (
          <Banner variant="info" title={t('driver:noBookingsTitle')} body={t('driver:noBookingsBody')} />
        ) : (
          passengers.map((p) => (
            <Card key={p.id}>
              <Row gap={spacing.md}>
                <Avatar name={p.user?.full_name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd">{p.user?.full_name}</Text>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {t('common:seatsCount', { count: p.seats_booked })} · {p.total_price} {t('common:tnd')}
                  </Text>
                </View>
                <Badge
                  label={p.status}
                  variant={p.status === 'confirmed' ? 'success' : p.status === 'cancelled' ? 'error' : 'info'}
                />
                <Row gap={spacing.xs}>
                  <Pressable
                    onPress={() => nav.navigate('Chat', { userId: p.user.id, userName: p.user.full_name })}
                    accessibilityRole="button"
                    accessibilityLabel={t('driver:messagePassenger')}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.surfaceContainerHigh,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="chat" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const phone = p.user?.phone_number || '+21600000000';
                      Linking.openURL(`tel:${phone}`);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('driver:callPassenger')}
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
              </Row>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
