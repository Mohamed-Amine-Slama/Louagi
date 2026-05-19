import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { Stepper } from '../../components/Stepper';
import { RouteTimeline } from '../../components/RouteTimeline';
import { Banner } from '../../components/Banner';
import { Section, Row, Stack } from '../../components/Section';
import { ScreenHeader } from '../../components/Header';

import { ridesApi, reservationsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { peekSeatLock } from '../../security/seatLock';
import { randomBytesHex } from '../../security/crypto';
import { spacing, radius } from '../../theme';

export default function RideDetailScreen() {
  const { colors } = useTheme();
  const nav = useNavigation();
  const route = useRoute();
  const { id } = route.params;
  const { user } = useAuth();
  const toast = useToast();

  const [ride, setRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [method, setMethod] = useState('card');
  const [submitting, setSubmitting] = useState(false);
  const [lockBanner, setLockBanner] = useState(null);

  useEffect(() => {
    ridesApi.getRideDetail(id).then(setRide);
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => {
      const lock = peekSeatLock(id);
      if (lock && lock.userId !== user?.id) {
        const left = Math.max(0, Math.ceil((lock.expiresAt - Date.now()) / 1000));
        setLockBanner(`Another rider is booking now (${left}s)`);
      } else {
        setLockBanner(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [id, user?.id]);

  if (!ride) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const total = seats * ride.price_per_seat;
  const dep = new Date(ride.departure_time);

  const book = async () => {
    if (!user) {
      toast.show('Sign in to book', 'info');
      nav.navigate('Login');
      return;
    }
    if (user.role !== 'passenger') {
      toast.show('Only passengers can book rides', 'warning');
      return;
    }
    setSubmitting(true);
    const idempotencyKey = randomBytesHex(8);
    const res = await reservationsApi.createReservation({
      actor: user,
      rideId: ride.id,
      seats,
      paymentMethod: method,
      idempotencyKey,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.show(res.error, 'error');
      return;
    }
    nav.navigate('BookingConfirm', { id: res.reservation.id });
  };

  return (
    <Screen>
      <ScreenHeader title={`${ride.route.origin_city} → ${ride.route.destination_city}`} subtitle={dep.toDateString()} showBack />

      <Card>
        <Section title="Trip">
          <RouteTimeline
            origin={ride.route.origin_city}
            destination={ride.route.destination_city}
            departureLabel={`Departs ${dep.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`}
            arrivalLabel={`~${ride.route.estimated_duration_min} min ride`}
          />
        </Section>
        <Row gap={spacing.md} style={{ marginTop: spacing.md }}>
          <Pill icon="event-seat" label={`${ride.available_seats} seats left`} />
          <Pill icon="ac-unit" label="AC" />
          <Pill icon="security" label="Verified" tone="success" />
        </Row>
      </Card>

      <Card>
        <Section title="Driver">
          <Row gap={spacing.md}>
            <Avatar name={ride.driver?.full_name} size={56} badge={ride.driver?.status === 'verified'} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLg">{ride.driver?.full_name}</Text>
              <Row gap={spacing.sm}>
                <Row gap={4}>
                  <MaterialIcons name="star" size={14} color={colors.secondaryContainer} />
                  <Text variant="labelSm">
                    {(ride.driver?.rating ?? 0).toFixed(1)} · {ride.driver?.trips_completed} trips
                  </Text>
                </Row>
              </Row>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {ride.driver?.vehicle_brand} {ride.driver?.vehicle_model}
              </Text>
            </View>
          </Row>
        </Section>
      </Card>

      <Card>
        <Section title="Seats">
          <Row justify="space-between">
            <Text variant="bodyMd">How many seats?</Text>
            <Stepper value={seats} onChange={setSeats} min={1} max={ride.available_seats} />
          </Row>
        </Section>
        <Section title="Payment">
          <Row gap={spacing.sm}>
            {[
              { k: 'card', label: 'Card', icon: 'credit-card' },
              { k: 'mobile_pay', label: 'Mobile pay', icon: 'phone-android' },
              { k: 'cash', label: 'Cash', icon: 'payments' },
            ].map((opt) => {
              const active = method === opt.k;
              return (
                <Pressable
                  key={opt.k}
                  onPress={() => setMethod(opt.k)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.lg,
                    alignItems: 'center',
                    backgroundColor: active ? colors.primary : colors.surfaceContainer,
                    gap: 4,
                  }}
                >
                  <MaterialIcons
                    name={opt.icon}
                    size={20}
                    color={active ? colors.onPrimary : colors.onSurface}
                  />
                  <Text
                    variant="labelSm"
                    color={active ? colors.onPrimary : colors.onSurface}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </Row>
        </Section>
      </Card>

      {lockBanner ? <Banner variant="warning" title="Seat lock active" body={lockBanner} /> : null}

      <Card style={{ gap: spacing.sm }}>
        <Row justify="space-between">
          <Text variant="bodyMd">
            {seats} × {ride.price_per_seat} TND
          </Text>
          <Text variant="bodyMd">{total} TND</Text>
        </Row>
        <Row justify="space-between">
          <Text variant="labelMd" color={colors.onSurfaceVariant}>
            Booking fee
          </Text>
          <Text variant="labelMd" color={colors.onSurfaceVariant}>
            0 TND
          </Text>
        </Row>
        <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.xs }} />
        <Row justify="space-between">
          <Text variant="bodyLg">Total</Text>
          <Text variant="headlineMd" color={colors.primary}>
            {total} TND
          </Text>
        </Row>
        <Button
          label={submitting ? 'Processing payment…' : `Book ${seats} seat${seats > 1 ? 's' : ''}`}
          variant="secondary"
          onPress={book}
          loading={submitting}
        />
      </Card>
    </Screen>
  );
}

function Pill({ icon, label, tone = 'neutral' }) {
  const { colors } = useTheme();
  const bg = tone === 'success' ? colors.successContainer : colors.surfaceContainer;
  const fg = tone === 'success' ? colors.success : colors.onSurface;
  return (
    <Row
      gap={4}
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
        backgroundColor: bg,
      }}
    >
      <MaterialIcons name={icon} size={14} color={fg} />
      <Text variant="labelSm" color={fg}>
        {label}
      </Text>
    </Row>
  );
}
