import React, { useCallback, useState } from 'react';
import { View, Pressable, Linking, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
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

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, typography } from '../../theme';
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
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
              style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.navTitleContainer}>
              <Text style={styles.navTitle} numberOfLines={1}>
                {ride.route.origin_city} → {ride.route.destination_city}
              </Text>
              <Text style={styles.navSubtitle}>{formatDateTime(ride.departure_time)}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        {/* Content overlapping header */}
        <View style={styles.contentWrapper}>
          <Card style={[styles.overlapCard, { shadowColor: isDark ? '#000' : colors.primary }]}>
            <Row justify="space-between" style={{ marginBottom: spacing.md }}>
              <StatusBadge status={ride.status} t={t} />
              <View style={styles.earningsBadge}>
                <MaterialIcons name="payments" size={16} color={colors.success} style={{ marginRight: 4 }} />
                <Text variant="labelMedium" color={colors.success} style={{ fontWeight: '700' }}>
                  {earnings.toFixed(2)} {t('common:tnd')}
                </Text>
              </View>
            </Row>

            <View style={{ marginBottom: spacing.sm }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text variant="labelMedium" color={colors.onSurfaceVariant}>
                  {t('driver:seatsCount', { count: sold, total: ride.total_seats })}
                </Text>
                <Text variant="labelMedium" color={colors.primary} style={{ fontWeight: '600' }}>
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

          <Section title={t('driver:passengers', { count: passengers.length })} style={{ marginTop: spacing.sm }}>
            {passengers.length === 0 ? (
              <Banner variant="info" title={t('driver:noBookingsTitle')} body={t('driver:noBookingsBody')} />
            ) : (
              passengers.map((p) => (
                <Card key={p.id} style={[styles.passengerCard, { borderColor: isDark ? colors.outlineVariant : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 }]}>
                <Row gap={spacing.md} style={{ alignItems: 'center', marginBottom: spacing.md }}>
                  <Avatar name={p.user?.full_name} size={56} />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>{p.user?.full_name}</Text>
                    <Row gap={spacing.xs} style={{ marginTop: 4, alignItems: 'center' }}>
                      <MaterialIcons name="event-seat" size={14} color={colors.primary} />
                      <Text variant="labelMedium" color={colors.primary} style={{ fontWeight: '600' }}>
                        {t('common:seatsCount', { count: p.seats_booked })}
                      </Text>
                      <Text variant="labelMedium" color={colors.onSurfaceVariant}> · </Text>
                      <Text variant="labelMedium" color={colors.onSurfaceVariant} style={{ fontWeight: '600' }}>
                        {p.total_price} {t('common:tnd')}
                      </Text>
                    </Row>
                  </View>
                  <Badge
                    label={p.status}
                    variant={p.status === 'confirmed' ? 'success' : p.status === 'cancelled' ? 'error' : 'info'}
                  />
                </Row>
                
                <View style={{ height: 1, backgroundColor: isDark ? colors.surfaceVariant : 'rgba(0,0,0,0.05)', marginVertical: spacing.sm }} />
                
                {p.status !== 'cancelled' && (
                  <Row gap={spacing.sm}>
                    <Pressable
                      onPress={() => nav.navigate('Chat', {
                        userId: p.user?.id,
                        userName: p.user?.full_name,
                        phoneNumber: p.user?.phone_number,
                      })}
                      style={({ pressed }) => ({
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.xs,
                        backgroundColor: pressed ? colors.secondaryFixed : colors.secondaryContainer,
                        paddingVertical: spacing.sm,
                        borderRadius: 100,
                      })}
                    >
                      <MaterialIcons name="chat" size={20} color={colors.onSecondaryContainer} />
                      <Text variant="labelMedium" color={colors.onSecondaryContainer} style={{ fontWeight: '600' }}>
                        {t('driver:messagePassenger')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const phone = p.user?.phone_number;
                        if (!phone) {
                          toast.show(t('toast:phoneUnavailable'), 'warning');
                          return;
                        }
                        Linking.openURL(`tel:${phone}`);
                      }}
                      style={({ pressed }) => ({
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.xs,
                        backgroundColor: pressed ? colors.primaryContainer : colors.primary,
                        paddingVertical: spacing.sm,
                        borderRadius: 100,
                      })}
                    >
                      <MaterialIcons name="call" size={20} color={colors.onPrimary} />
                      <Text variant="labelMedium" color={colors.onPrimary} style={{ fontWeight: '600' }}>
                        {t('driver:callPassenger')}
                      </Text>
                    </Pressable>
                  </Row>
                )}
              </Card>
              ))
            )}
          </Section>
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
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  actionBtnHeight: {
    height: 56,
  },
});
