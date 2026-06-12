import React, { useCallback, useState } from 'react';
import { View, Pressable, Linking, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
import { Row, Section } from '../../components/Section';
import { Banner } from '../../components/Banner';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, typography, withAlpha } from '../../theme';
import { formatDateTime, statusLabel } from '../../i18n/format';

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
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();
  const route = useRoute();
  const { id } = route.params;
  const toast = useToast();
  const insets = useSafeAreaInsets();

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

  if (!ride) {
    return (
      <Screen>
        <SkeletonList count={4} lines={2} />
      </Screen>
    );
  }

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

  const HEADER_HEIGHT = 220;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}
        bounces={false}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={isDark ? [colors.surfaceContainerHighest, colors.background] : [colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { height: HEADER_HEIGHT, paddingTop: insets.top }]}
        >
          {/* Top Nav */}
          <View style={styles.topNav}>
            <Pressable
              onPress={() => nav.goBack()}
              style={[styles.backButton, { backgroundColor: withAlpha(isDark ? colors.onSurface : colors.onPrimary, 0.2) }]}
            >
              <MaterialIcons name="arrow-back" size={24} color={isDark ? colors.onSurface : colors.onPrimary} />
            </Pressable>
            <View style={styles.navTitleContainer}>
              <Text style={[styles.navTitle, { color: isDark ? colors.onSurface : colors.onPrimary }]} numberOfLines={1}>
                {ride.route.origin_city} → {ride.route.destination_city}
              </Text>
              <Text style={[styles.navSubtitle, { color: withAlpha(isDark ? colors.onSurface : colors.onPrimary, 0.8) }]}>{formatDateTime(ride.departure_time)}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        {/* Content overlapping header */}
        <View style={styles.contentWrapper}>
          <FadeSlideIn index={0}>
          <Card style={[styles.overlapCard, { shadowColor: colors.shadow }]}>
            <Row justify="space-between" style={{ marginBottom: spacing.md }}>
              <StatusBadge status={ride.status} t={t} />
              <View style={[styles.earningsBadge, { backgroundColor: withAlpha(colors.success, 0.1) }]}>
                <MaterialIcons name="payments" size={16} color={colors.success} style={{ marginEnd: 4 }} />
                <Text variant="labelMd" color={colors.success}>
                  {earnings.toFixed(2)} {t('common:tnd')}
                </Text>
              </View>
            </Row>

            <View style={{ marginBottom: spacing.sm }}>
              <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
                <Text variant="labelMd" color={colors.onSurfaceVariant}>
                  {t('driver:seatsCount', { count: sold, total: ride.total_seats })}
                </Text>
                <Text variant="labelMd" color={colors.primary}>
                  {Math.round((sold / Math.max(1, ride.total_seats)) * 100)}% {t('driver:occupancy')}
                </Text>
              </Row>
              <View style={[styles.progressBarContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, (sold / Math.max(1, ride.total_seats)) * 100)}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

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
          </FadeSlideIn>

          <FadeSlideIn index={1}>
          <Section title={t('driver:passengers', { count: passengers.length })} style={{ marginTop: spacing.sm }}>
            {passengers.length === 0 ? (
              <Banner variant="info" title={t('driver:noBookingsTitle')} body={t('driver:noBookingsBody')} />
            ) : (
              passengers.map((p, i) => (
                <FadeSlideIn key={p.id} index={Math.min(i, 8)}>
                <Card style={[styles.passengerCard, { borderColor: isDark ? colors.outlineVariant : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 }]}>
                <Row gap={spacing.md} style={{ alignItems: 'center', marginBottom: spacing.md }}>
                  <Avatar name={p.user?.full_name} size={56} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLg">{p.user?.full_name}</Text>
                    <Row gap={spacing.xs} style={{ marginTop: 4, alignItems: 'center' }}>
                      <MaterialIcons name="event-seat" size={14} color={colors.primary} />
                      <Text variant="labelMd" color={colors.primary}>
                        {t('common:seatsCount', { count: p.seats_booked })}
                      </Text>
                      <Text variant="labelMd" color={colors.onSurfaceVariant}> · </Text>
                      <Text variant="labelMd" color={colors.onSurfaceVariant}>
                        {p.total_price} {t('common:tnd')}
                      </Text>
                    </Row>
                  </View>
                  <Badge
                    label={statusLabel(t, p.status)}
                    variant={p.status === 'confirmed' ? 'success' : p.status === 'cancelled' ? 'error' : 'info'}
                  />
                </Row>
                
                <View style={{ height: 1, backgroundColor: isDark ? colors.surfaceVariant : withAlpha(colors.scrim, 0.05), marginVertical: spacing.sm }} />
                
                {p.status !== 'cancelled' && (
                  <Row gap={spacing.md} style={{ justifyContent: 'flex-end', marginTop: spacing.sm }}>
                    <PressableScale
                      onPress={() => nav.navigate('Chat', {
                        userId: p.user?.id,
                        userName: p.user?.full_name,
                        phoneNumber: p.user?.phone_number,
                      })}
                      scaleTo={0.9}
                      style={{
                        width: 44,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.secondaryContainer,
                        borderRadius: radius.full,
                      }}
                    >
                      <MaterialIcons name="chat" size={22} color={colors.onSecondaryContainer} />
                    </PressableScale>
                    <PressableScale
                      onPress={() => {
                        const phone = p.user?.phone_number;
                        if (!phone) {
                          toast.show(t('toast:phoneUnavailable'), 'warning');
                          return;
                        }
                        Linking.openURL(`tel:${phone}`);
                      }}
                      scaleTo={0.9}
                      style={{
                        width: 44,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primary,
                        borderRadius: radius.full,
                      }}
                    >
                      <MaterialIcons name="call" size={22} color={colors.onPrimary} />
                    </PressableScale>
                  </Row>
                )}
              </Card>
              </FadeSlideIn>
              ))
            )}
          </Section>
          </FadeSlideIn>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      {(ride.status === 'scheduled' || ride.status === 'in_progress') && (
        <View
          style={[
            styles.stickyBottom,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.outlineVariant,
              shadowColor: colors.shadow,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {ride.status === 'scheduled' ? (
            <View style={{ gap: spacing.sm }}>
              <Button
                label={t('driver:markInProgress')}
                variant="primary"
                onPress={() => setStatus('in_progress')}
                loading={busy}
                style={styles.actionBtnHeight}
              />
              <Button
                label={t('driver:cancelRide')}
                variant="danger"
                onPress={cancel}
                loading={busy}
                style={styles.actionBtnHeight}
              />
            </View>
          ) : ride.status === 'in_progress' ? (
            <Button
              label={t('driver:markCompleted')}
              variant="primary"
              onPress={() => setStatus('completed')}
              loading={busy}
              style={styles.actionBtnHeight}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  navSubtitle: {
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
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: radius.full,
  },
  passengerCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  passengerActions: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    elevation: 16,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  actionBtnHeight: {
    height: 56,
  },
});
