import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, ActivityIndicator } from 'react-native';
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

import { ridesApi, reservationsApi, usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { peekSeatLock } from '../../security/seatLock';
import { randomBytesHex } from '../../security/crypto';
import { spacing, radius } from '../../theme';
import { formatDate, formatTime } from '../../i18n/format';

export default function RideDetailScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const { id } = params;
  const { user } = useAuth();
  const toast = useToast();

  const [ride, setRide] = useState(null);
  const [seats, setSeats] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [lockBanner, setLockBanner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const detail = await ridesApi.getRideDetail(id);
      if (cancelled) return;
      setRide(detail);
      if (!detail) return;

      let initialSeats = Number(params.seats) || 1;
      if (!params.seats && user?.role === 'passenger') {
        const profile = await usersApi.getProfile({ actor: user });
        if (cancelled) return;
        initialSeats = Number(profile?.preferences?.defaultSeats) || 1;
      }
      const maxSeats = Math.max(1, detail.available_seats || 1);
      setSeats(Math.min(maxSeats, Math.max(1, initialSeats)));
    })();
    return () => { cancelled = true; };
  }, [id, params.seats, user?.id, user?.role]);

  useEffect(() => {
    const interval = setInterval(() => {
      const lock = peekSeatLock(id);
      if (lock && lock.userId !== user?.id) {
        const left = Math.max(0, Math.ceil((lock.expiresAt - Date.now()) / 1000));
        setLockBanner(t('ride:seatLockBody', { seconds: left }));
      } else {
        setLockBanner(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [id, user?.id, t]);

  if (!ride) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const seatCost = seats * ride.price_per_seat;
  const reservationFee = 3;
  const total = seatCost + reservationFee;
  const dep = new Date(ride.departure_time);

  const book = async () => {
    if (!user) {
      toast.show(t('toast:signInToBook'), 'info');
      nav.navigate('Login');
      return;
    }
    if (user.role !== 'passenger') {
      toast.show(t('toast:onlyPassengersBook'), 'warning');
      return;
    }
    setSubmitting(true);
    const idempotencyKey = randomBytesHex(8);
    const res = await reservationsApi.createReservation({
      actor: user,
      rideId: ride.id,
      seats,
      paymentMethod: 'flouci',
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
      <ScreenHeader title={`${ride.route.origin_city} → ${ride.route.destination_city}`} subtitle={formatDate(dep)} showBack />

      <Card>
        <Section title={t('ride:trip')}>
          <RouteTimeline
            origin={ride.route.origin_city}
            destination={ride.route.destination_city}
            departureLabel={t('ride:departsAt', { time: formatTime(dep) })}
            arrivalLabel={t('ride:duration', { minutes: ride.route.estimated_duration_min })}
          />
        </Section>
        <Row gap={spacing.md} style={{ marginTop: spacing.md }}>
          <Pill icon="event-seat" label={t('ride:seatsLeft', { count: ride.available_seats })} />
          <Pill icon="ac-unit" label={t('ride:ac')} />
          <Pill icon="security" label={t('ride:verified')} tone="success" />
        </Row>
      </Card>

      <Card>
        <Section title={t('ride:driver')}>
          <Row gap={spacing.md}>
            <Avatar name={ride.driver?.full_name} size={56} badge={ride.driver?.status === 'verified'} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLg">{ride.driver?.full_name}</Text>
              <Row gap={spacing.sm}>
                <Row gap={4}>
                  <MaterialIcons name="star" size={14} color={colors.secondaryContainer} />
                  <Text variant="labelSm">
                    {(ride.driver?.rating ?? 0).toFixed(1)} · {t('ride:trips', { count: ride.driver?.trips_completed ?? 0 })}
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
        <Section title={t('ride:seats')}>
          <Row justify="space-between">
            <Text variant="bodyMd">{t('ride:howManySeats')}</Text>
            <Stepper value={seats} onChange={setSeats} min={1} max={ride.available_seats} />
          </Row>
        </Section>
        <Section title={t('ride:payment')}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.primaryFixed,
            }}
          >
            <MaterialIcons name="account-balance-wallet" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="labelMd">{t('ride:flouci')}</Text>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('ride:flouciHint')}</Text>
            </View>
            <Badge label={t('ride:secure')} variant="success" icon="lock" />
          </View>
        </Section>
      </Card>

      {lockBanner ? <Banner variant="warning" title={t('ride:seatLockActive')} body={lockBanner} /> : null}

      <Card style={{ gap: spacing.sm }}>
        <Row justify="space-between" style={{ alignItems: 'flex-start' }}>
          <Text variant="bodyMd">
            {seats} × {ride.price_per_seat} {t('common:tnd')}
          </Text>
          <Text variant="bodyMd">{seatCost} {t('common:tnd')}</Text>
        </Row>
        <Row justify="space-between" style={{ alignItems: 'flex-start' }}>
          <Stack>
            <Text variant="labelMd" color={colors.onSurfaceVariant}>
              {t('ride:reservationFee')}
            </Text>
            <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ fontStyle: 'italic' }}>
              {t('ride:reservationFeeBreakdown')}
            </Text>
          </Stack>
          <Text variant="labelMd" color={colors.warning}>
            {reservationFee.toFixed(3)} {t('common:tnd')}
          </Text>
        </Row>
        <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.xs }} />
        <Row justify="space-between" style={{ alignItems: 'center' }}>
          <Text variant="bodyLg">{t('ride:total')}</Text>
          <Text variant="headlineMd" color={colors.primary}>
            {total} {t('common:tnd')}
          </Text>
        </Row>
        <Button
          label={submitting ? t('ride:processingPayment') : t('ride:bookSeats', { count: seats })}
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
