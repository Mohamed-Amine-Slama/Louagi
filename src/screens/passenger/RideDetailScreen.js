import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, ScrollView, Platform, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

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
import { PassengerActionButtons } from '../../components/PassengerActionButtons';

import { ridesApi, reservationsApi, usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { peekSeatLock } from '../../security/seatLock';
import { randomBytesHex } from '../../security/crypto';
import { spacing, radius, typography } from '../../theme';
import { formatDate, formatTime } from '../../i18n/format';

export default function RideDetailScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const { id } = params;
  const { user } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

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
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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

  const HEADER_HEIGHT = 220;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}
        bounces={false}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { height: HEADER_HEIGHT, paddingTop: insets.top }]}
        >
          {/* Top Nav */}
          <View style={styles.topNav}>
            <Pressable
              onPress={() => nav.goBack()}
              style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.navTitleContainer}>
              <Text style={styles.navTitle} numberOfLines={1}>
                {ride.route.origin_city} → {ride.route.destination_city}
              </Text>
              <Text style={styles.navSubtitle}>{formatDate(dep)}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        {/* Content overlapping header */}
        <View style={styles.contentWrapper}>
          <Card style={[styles.overlapCard, { shadowColor: isDark ? '#000' : colors.primary }]}>
            <Section title={t('ride:trip')}>
              <RouteTimeline
                origin={ride.route.origin_city}
                destination={ride.route.destination_city}
                departureLabel={t('ride:departsAt', { time: formatTime(dep) })}
                arrivalLabel={t('ride:duration', { minutes: ride.route.estimated_duration_min })}
              />
            </Section>
            <Row gap={spacing.sm} style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
              <Pill icon="event-seat" label={t('ride:seatsLeft', { count: ride.available_seats })} />
              <Pill icon="ac-unit" label={t('ride:ac')} />
              <Pill icon="security" label={t('ride:verified')} tone="success" />
            </Row>
          </Card>

          {lockBanner ? (
            <View style={{ marginBottom: spacing.md }}>
              <Banner variant="warning" title={t('ride:seatLockActive')} body={lockBanner} />
            </View>
          ) : null}

          <Card style={styles.cardSpacing}>
            <Section title={t('ride:driver')}>
              <Row gap={spacing.md} style={styles.driverRow}>
                <Avatar name={ride.driver?.full_name} size={64} badge={ride.driver?.status === 'verified'} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {ride.driver?.full_name}
                  </Text>
                  <Row gap={spacing.sm} style={{ marginTop: 4 }}>
                    <Row gap={4} style={styles.ratingBadge}>
                      <MaterialIcons name="star" size={16} color="#FFB800" />
                      <Text variant="labelMedium" style={{ fontWeight: '600' }}>
                        {(ride.driver?.rating ?? 0).toFixed(1)}
                      </Text>
                    </Row>
                    <Text variant="labelMedium" color={colors.onSurfaceVariant}>
                      • {t('ride:trips', { count: ride.driver?.trips_completed ?? 0 })}
                    </Text>
                  </Row>
                  <Text variant="bodyMedium" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
                    {ride.driver?.vehicle_brand} {ride.driver?.vehicle_model}
                  </Text>
                </View>
              </Row>
            </Section>
          </Card>

          <Card style={styles.cardSpacing}>
            <Section title={t('ride:seats')}>
              <Row justify="space-between" style={{ alignItems: 'center' }}>
                <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                  {t('ride:howManySeats')}
                </Text>
                <Stepper value={seats} onChange={setSeats} min={1} max={ride.available_seats} />
              </Row>
            </Section>
            
            <View style={styles.divider} backgroundColor={colors.outlineVariant} />

            <Section title={t('ride:payment')}>
              <View
                style={[
                  styles.paymentBox,
                  { backgroundColor: isDark ? colors.surfaceContainerHighest : colors.primaryContainer }
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="account-balance-wallet" size={20} color={colors.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: isDark ? colors.onSurface : colors.onPrimaryContainer }}>
                    {t('ride:flouci')}
                  </Text>
                  <Text variant="bodySmall" style={{ color: isDark ? colors.onSurfaceVariant : colors.onPrimaryContainer, opacity: 0.8 }}>
                    {t('ride:flouciHint')}
                  </Text>
                </View>
                <Badge label={t('ride:secure')} variant="success" icon="lock" />
              </View>
            </Section>
          </Card>
        </View>
      </ScrollView>

      <PassengerActionButtons
        seats={seats}
        pricePerSeat={ride.price_per_seat}
        reservationFee={reservationFee}
        total={total}
        onBook={book}
        submitting={submitting}
        insets={insets}
      />
    </View>
  );
}

function Pill({ icon, label, tone = 'neutral' }) {
  const { colors } = useTheme();
  const bg = tone === 'success' ? colors.successContainer : colors.surfaceContainer;
  const fg = tone === 'success' ? colors.success : colors.onSurface;
  return (
    <Row gap={6} style={[styles.pill, { backgroundColor: bg }]}>
      <MaterialIcons name={icon} size={16} color={fg} />
      <Text variant="labelMedium" style={{ color: fg, fontWeight: '600' }}>
        {label}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: '#fff',
    ...typography.titleMedium,
    fontWeight: '700',
  },
  navSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    ...typography.labelSmall,
  },
  headerSpacer: {
    width: 40,
  },
  contentWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: 120, // To overlap the hero header
    zIndex: 2,
  },
  overlapCard: {
    marginBottom: spacing.lg,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardSpacing: {
    marginBottom: spacing.lg,
  },
  driverRow: {
    alignItems: 'center',
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  paymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: 'center',
  },
});
