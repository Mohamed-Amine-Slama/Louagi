import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Tabs } from '../../components/Tabs';
import { Stack, Row } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';
import { RateDriverModal } from '../../components/RateDriverModal';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { reservationsApi, paymentsApi, reviewsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePush } from '../../context/NotificationContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { formatDateTime, formatDate, countdownFrom, statusLabel } from '../../i18n/format';

export default function PassengerDashboard() {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const { user, signOut } = useAuth();
  const toast = useToast();
  const nav = useNavigation();
  const { unreadCount } = usePush();

  const [tab, setTab] = useState('upcoming');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setRefreshing(false); return; }
    setRefreshing(true);
    const [allRes, py] = await Promise.all([
      reservationsApi.listReservations({ actor: user }),
      paymentsApi.listPayments({ actor: user }),
    ]);

    const upcomingList = [];
    const pastList = [];

    (allRes || []).forEach((row) => {
      const isCancelled = row.reservation.status === 'cancelled';
      const isRideLiveOrDone = row.ride && (row.ride.status === 'in_progress' || row.ride.status === 'completed' || row.ride.status === 'cancelled');

      if (isCancelled || isRideLiveOrDone) {
        pastList.push(row);
      } else {
        upcomingList.push(row);
      }
    });

    setUpcoming(upcomingList);
    setPast(pastList);
    setPayments(py);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const [cancellingId, setCancellingId] = useState(null);
  
  // Rating state
  const [ratingRide, setRatingRide] = useState(null);
  const [ratingDriver, setRatingDriver] = useState(null);

  const handleRateSubmit = async ({ rating, comment }) => {
    const res = await reviewsApi.submitReview({
      actor: user,
      rideId: ratingRide,
      driverId: ratingDriver,
      rating,
      comment,
    });
    if (res.ok) {
      toast.show(t('passenger:ratingSubmitted'), 'success');
      setRatingRide(null);
      setRatingDriver(null);
    } else {
      toast.show(res.error, 'error');
    }
  };

  const confirmCancel = async (id) => {
    const res = await reservationsApi.cancelReservation({ actor: user, id });
    if (!res.ok) {
      toast.show(res.error, 'error');
      setCancellingId(null);
      return;
    }
    toast.show(t('toast:bookingCancelled'), 'success');
    setCancellingId(null);
    load();
  };

  const heroFg = isDark ? colors.onSurface : colors.onPrimary;
  const heroCardFg = isDark ? colors.onPrimaryContainer : colors.onPrimary;
  const heroCardMuted = isDark ? withAlpha(colors.onPrimaryContainer, 0.8) : colors.onPrimaryContainer;
  const heroIconBtn = {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: withAlpha(heroFg, 0.16),
    alignItems: 'center',
    justifyContent: 'center',
  };
  const nextTrip = upcoming[0];

  return (
    <Screen padded={false}>
      <LinearGradient
        colors={isDark ? [colors.surfaceContainerHighest, colors.background] : [colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
          borderBottomLeftRadius: radius.xxl,
          borderBottomRightRadius: radius.xxl,
        }}
      >
        <Row justify="space-between">
          <View>
            <Text variant="labelSm" color={withAlpha(heroFg, 0.8)}>
              {t('passenger:hello')},
            </Text>
            <Text variant="headlineMd" color={heroFg}>
              {user?.name?.split(' ')[0]} 👋
            </Text>
          </View>
          <Row gap={spacing.sm}>
            <PressableScale onPress={() => nav.navigate('ChatList')} scaleTo={0.92} style={heroIconBtn}>
              <MaterialIcons name="chat" size={20} color={heroFg} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    end: -4,
                    minWidth: 16,
                    height: 16,
                    borderRadius: radius.full,
                    backgroundColor: colors.error,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text variant="labelSm" color={colors.onError}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </PressableScale>
            <PressableScale
              onPress={() => toast.show(t('toast:noNewNotifications'), 'info')}
              scaleTo={0.92}
              style={heroIconBtn}
            >
              <MaterialIcons name="notifications" size={20} color={heroFg} />
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  end: 8,
                  width: 8,
                  height: 8,
                  borderRadius: radius.full,
                  backgroundColor: colors.error,
                }}
              />
            </PressableScale>
            <PressableScale onPress={() => nav.navigate('Settings')} scaleTo={0.92} style={heroIconBtn}>
              <MaterialIcons name="settings" size={20} color={heroFg} />
            </PressableScale>
            <PressableScale onPress={signOut} scaleTo={0.92} style={heroIconBtn}>
              <MaterialIcons name="logout" size={20} color={heroFg} />
            </PressableScale>
          </Row>
        </Row>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.md, gap: spacing.md }}>
        {nextTrip ? (
          <FadeSlideIn index={0}>
            <Card
              variant="hero"
              accent={colors.secondaryContainer}
              onPress={() => nav.navigate('BookingConfirm', { id: nextTrip.reservation.id })}
            >
              <Row justify="space-between" align="flex-start">
                <Text variant="labelSm" color={heroCardMuted}>
                  {t('passenger:upcoming')}
                </Text>
                <Row
                  gap={4}
                  style={{
                    backgroundColor: withAlpha(colors.secondaryFixedDim, 0.1),
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <MaterialIcons name="schedule" size={14} color={colors.secondaryFixedDim} />
                  <Text variant="labelSm" color={colors.secondaryFixedDim}>
                    {t('common:departsIn', { duration: countdownFrom(nextTrip.ride?.departure_time, t) })}
                  </Text>
                </Row>
              </Row>
              <Stack gap={2} style={{ marginTop: spacing.sm }}>
                <Text variant="headlineMd" color={heroCardFg}>
                  {nextTrip.route?.origin_city} → {nextTrip.route?.destination_city}
                </Text>
                <Text variant="bodySm" color={heroCardMuted}>
                  {formatDateTime(nextTrip.ride?.departure_time)}
                </Text>
              </Stack>
              <Row justify="space-between" style={{ marginTop: spacing.md }}>
                <Row gap={spacing.sm} style={{ flex: 1 }}>
                  <Avatar name={nextTrip.driverUser?.full_name} size={32} />
                  <Stack gap={0} style={{ flexShrink: 1 }}>
                    <Text variant="labelSm" color={heroCardMuted}>
                      {t('passenger:driverShort')}
                    </Text>
                    <Text variant="labelMd" color={heroCardFg} numberOfLines={1}>
                      {nextTrip.driverUser?.full_name}
                    </Text>
                  </Stack>
                </Row>
                <Row
                  gap={4}
                  style={{
                    backgroundColor: colors.secondaryContainer,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <MaterialIcons name="confirmation-number" size={14} color={colors.onSecondaryContainer} />
                  <Text variant="labelMd" color={colors.onSecondaryContainer}>
                    {t('passenger:viewTicket')}
                  </Text>
                </Row>
              </Row>
            </Card>
          </FadeSlideIn>
        ) : null}

        <FadeSlideIn index={1}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'upcoming', label: t('passenger:upcoming') },
              { key: 'past', label: t('passenger:past') },
              { key: 'payments', label: t('passenger:payments') },
            ]}
          />
        </FadeSlideIn>

        {tab === 'upcoming' &&
          (refreshing && upcoming.length === 0 ? (
            <SkeletonList count={3} lines={2} />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon="event-note"
              title={t('passenger:noUpcomingTitle')}
              body={t('passenger:noUpcomingBody')}
              actionLabel={t('landing:searchRides')}
              onAction={() => nav.navigate('Search')}
            />
          ) : (
            upcoming.map((row, index) => (
              <FadeSlideIn key={row.reservation.id} index={Math.min(index, 8)}>
                <Card
                  accent={colors.secondaryContainer}
                  onPress={() => nav.navigate('BookingConfirm', { id: row.reservation.id })}
                >
                <Row justify="space-between" align="flex-start">
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="headlineSm">
                      {row.route?.origin_city} → {row.route?.destination_city}
                    </Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {formatDateTime(row.ride?.departure_time)}
                    </Text>
                  </View>
                  <Badge
                    label={t('common:departsIn', { duration: countdownFrom(row.ride?.departure_time, t) })}
                    variant="warning"
                    icon="schedule"
                  />
                </Row>
                <Row gap={spacing.md} style={{ marginTop: spacing.sm }}>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('passenger:driverShort')}
                    </Text>
                    <Row gap={spacing.sm}>
                      <Avatar name={row.driverUser?.full_name} size={28} />
                      <Text variant="bodyMd">{row.driverUser?.full_name}</Text>
                    </Row>
                  </Stack>
                  <Stack gap={2}>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('passenger:seatsShort')}
                    </Text>
                    <Text variant="bodyMd">{row.reservation.seats_booked}</Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('passenger:paidShort')}
                    </Text>
                    <Text variant="bodyMd">{row.reservation.total_price} {t('common:tnd')}</Text>
                  </Stack>
                </Row>
                {cancellingId === row.reservation.id ? (
                  <View style={{ backgroundColor: colors.errorContainer, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md, gap: spacing.md }}>
                    <Text variant="labelSm" color={colors.error}>{t('ride:feeNonRefundable')}</Text>
                    <Row gap={spacing.sm}>
                      <View style={{ flex: 1 }}>
                        <Button label={t('common:back')} variant="outline" onPress={() => setCancellingId(null)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button label={t('common:confirm')} variant="danger" onPress={() => confirmCancel(row.reservation.id)} />
                      </View>
                    </Row>
                  </View>
                ) : (
                  <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={t('passenger:viewTicket')}
                        variant="primary"
                        onPress={() => nav.navigate('BookingConfirm', { id: row.reservation.id })}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label={t('common:cancel')} variant="danger" onPress={() => setCancellingId(row.reservation.id)} />
                    </View>
                  </Row>
                )}
                </Card>
              </FadeSlideIn>
            ))
          ))}

        {tab === 'past' &&
          (refreshing && past.length === 0 ? (
            <SkeletonList count={3} lines={1} />
          ) : past.length === 0 ? (
            <EmptyState
              icon="history"
              title={t('passenger:noPastTitle')}
              body={t('passenger:noPastBody')}
            />
          ) : (
            past.map((row, index) => (
              <FadeSlideIn key={row.reservation.id} index={Math.min(index, 8)}>
              <Card onPress={() => nav.navigate('BookingConfirm', { id: row.reservation.id })}>
                <Row justify="space-between">
                  <Stack gap={2}>
                    <Text variant="bodyLg">
                      {row.route?.origin_city} → {row.route?.destination_city}
                    </Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {formatDate(row.reservation.booked_at)}
                    </Text>
                  </Stack>
                  <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
                    <Badge
                      label={
                        row.reservation.status === 'cancelled'
                          ? statusLabel(t, 'cancelled')
                          : row.ride?.status === 'in_progress'
                            ? t('booking:ticketExpired')
                            : row.ride?.status === 'completed'
                              ? statusLabel(t, 'completed')
                              : row.ride?.status === 'cancelled'
                                ? statusLabel(t, 'cancelled')
                                : statusLabel(t, row.reservation.status)
                      }
                      variant={
                        row.reservation.status === 'cancelled' || row.ride?.status === 'cancelled'
                          ? 'error'
                          : row.ride?.status === 'in_progress'
                            ? 'warning'
                            : 'success'
                      }
                    />
                    {row.ride?.status === 'completed' && (
                      <Button
                        label={t('passenger:rateDriver')}
                        variant="outline"
                        small
                        fullWidth={false}
                        onPress={() => {
                          setRatingRide(row.ride?.id);
                          setRatingDriver(row.ride?.driver_id);
                        }}
                      />
                    )}
                  </View>
                </Row>
              </Card>
              </FadeSlideIn>
            ))
          ))}

        {tab === 'payments' &&
          (refreshing && payments.length === 0 ? (
            <SkeletonList count={3} lines={1} />
          ) : payments.length === 0 ? (
            <EmptyState icon="payments" title={t('passenger:noPaymentsTitle')} />
          ) : (
            payments.map((p, index) => (
              <FadeSlideIn key={p.id} index={Math.min(index, 8)}>
              <Card>
                <Row justify="space-between">
                  <Stack gap={2}>
                    <Text variant="bodyLg">{p.amount} {t('common:tnd')}</Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {statusLabel(t, p.method)} · {formatDate(p.paid_at)}
                    </Text>
                  </Stack>
                  <Badge
                    label={statusLabel(t, p.status)}
                    variant={
                      p.status === 'succeeded' ? 'success' : p.status === 'refunded' ? 'warning' : 'error'
                    }
                  />
                </Row>
              </Card>
              </FadeSlideIn>
            ))
          ))}

      </View>
      
      <RateDriverModal
        visible={!!ratingRide}
        driverName={past.find(r => r.ride?.id === ratingRide)?.driverUser?.full_name}
        onClose={() => {
          setRatingRide(null);
          setRatingDriver(null);
        }}
        onSubmit={handleRateSubmit}
      />
    </Screen>
  );
}
