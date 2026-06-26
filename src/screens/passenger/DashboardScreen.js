import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { Row, Stack } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { RateDriverModal } from '../../components/RateDriverModal';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { reservationsApi, paymentsApi, reviewsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePush } from '../../context/NotificationContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha, shadows } from '../../theme';
import { formatDate, formatTime, formatDateTime, statusLabel, formatAmount } from '../../i18n/format';
import { MONO, PASS, cityCode, initialsOf, ticketRef } from '../../lib/tickets';
import { useDepartureLabel } from '../../lib/useDepartureLabel';
import { SectionLabel } from '../../components/SectionLabel';

// A single column in the ticket stub (DATE / SEATS / PAID).
function PassStat({ label, value, align = 'center' }) {
  const items = align === 'flex-start' ? 'flex-start' : align === 'flex-end' ? 'flex-end' : 'center';
  return (
    <Stack gap={3} style={{ alignItems: items, flex: 1 }}>
      <Text variant="labelXs" color={PASS.onNavyMut} style={{ letterSpacing: 0.6 }}>
        {String(label).toUpperCase()}
      </Text>
      <Text variant="labelMd" color={PASS.onNavy} numberOfLines={1}>
        {value}
      </Text>
    </Stack>
  );
}

// Featured next-trip ticket: navy boarding pass with mono station codes, a
// perforated stub and driver row. `notch` is the page colour showing through
// the punched holes.
function BoardingPass({ row, notch, onTicket, onMessage }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const origin = row.route?.origin_city;
  const dest = row.route?.destination_city;
  const depart = row.ride?.departure_time;
  const departLabel = useDepartureLabel(depart, t);
  const driverName = row.driverUser?.full_name;

  return (
    <View style={[{ borderRadius: 22 }, shadows.card]}>
      <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: PASS.navy }}>
        {/* Top: header + route */}
        <View style={{ padding: 18, paddingBottom: 14 }}>
          <Row justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: PASS.onNavyMut }} numberOfLines={1}>
              {t('passenger:boardingPass').toUpperCase()} · {ticketRef(row.reservation?.id)}
            </Text>
            {depart ? (
              <Row
                gap={6}
                style={{
                  backgroundColor: withAlpha(PASS.gold, 0.16),
                  borderRadius: radius.full,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <MaterialIcons name="schedule" size={12} color={PASS.gold} />
                <Text variant="labelSm" color={PASS.gold} numberOfLines={1}>
                  {departLabel}
                </Text>
              </Row>
            ) : null}
          </Row>

          <Row justify="space-between" align="flex-start">
            <Stack gap={3} style={{ flex: 1 }}>
              <Text color={PASS.onNavy} style={{ fontFamily: MONO, fontSize: 30, lineHeight: 32, letterSpacing: -0.5 }}>
                {cityCode(origin)}
              </Text>
              <Text variant="labelSm" color={PASS.onNavyMut} numberOfLines={1}>
                {origin}
              </Text>
            </Stack>
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6, paddingTop: 4 }}>
              <MaterialIcons
                name="flight"
                size={20}
                color="rgba(255,255,255,0.7)"
                style={{ transform: [{ rotate: '90deg' }] }}
              />
              <View style={{ alignSelf: 'stretch', borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: PASS.line, marginTop: 8 }} />
              <Text color={PASS.onNavy} style={{ fontFamily: MONO, fontSize: 12, marginTop: 6 }}>
                {formatTime(depart)}
              </Text>
            </View>
            <Stack gap={3} style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text color={PASS.toCode} style={{ fontFamily: MONO, fontSize: 30, lineHeight: 32, letterSpacing: -0.5 }}>
                {cityCode(dest)}
              </Text>
              <Text variant="labelSm" color={PASS.onNavyMut} numberOfLines={1}>
                {dest}
              </Text>
            </Stack>
          </Row>
        </View>

        {/* Perforation: bg-coloured notches biting into each edge + dashed line */}
        <View style={{ height: 22, justifyContent: 'center' }}>
          <View style={{ position: 'absolute', start: -11, top: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: notch }} />
          <View style={{ position: 'absolute', end: -11, top: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: notch }} />
          <View style={{ marginHorizontal: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: PASS.line }} />
        </View>

        {/* Stub: trip facts + driver + actions */}
        <View style={{ padding: 18, paddingTop: 14 }}>
          <Row justify="space-between" align="flex-start" style={{ marginBottom: 16 }}>
            <PassStat label={t('passenger:dateShort')} value={formatDate(depart)} align="flex-start" />
            <PassStat label={t('passenger:seatsShort')} value={String(row.reservation?.seats_booked ?? '—')} align="center" />
            <PassStat
              label={t('passenger:paidShort')}
              value={`${row.reservation?.total_price ?? '—'} ${t('common:tnd')}`}
              align="flex-end"
            />
          </Row>
          <Row justify="space-between" align="center">
            <Row gap={9} style={{ flex: 1 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: PASS.driver, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="labelSm" color={PASS.onNavy}>
                  {initialsOf(driverName)}
                </Text>
              </View>
              <Stack gap={1} style={{ flexShrink: 1 }}>
                <Text variant="labelSm" color={PASS.onNavyMut}>
                  {t('passenger:driverShort')}
                </Text>
                <Text variant="labelMd" color={PASS.onNavy} numberOfLines={1}>
                  {driverName}
                </Text>
              </Stack>
            </Row>
            <Row gap={8}>
              <PressableScale
                onPress={onMessage}
                style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialIcons name="chat-bubble-outline" size={18} color={PASS.onNavy} />
              </PressableScale>
              <PressableScale
                onPress={onTicket}
                style={{ height: 40, borderRadius: 11, paddingHorizontal: 16, backgroundColor: colors.secondaryContainer, flexDirection: 'row', alignItems: 'center', gap: 7 }}
              >
                <MaterialIcons name="confirmation-number" size={16} color={colors.onSecondaryContainer} />
                <Text variant="labelMd" color={colors.onSecondaryContainer}>
                  {t('passenger:viewTicket')}
                </Text>
              </PressableScale>
            </Row>
          </Row>
        </View>
      </View>
    </View>
  );
}

// Pill segmented control (Upcoming · Past · Payments) — active tab is a raised
// white pill with brand-red label.
function Segmented({ value, onChange, items }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceContainerHigh, borderRadius: 14, padding: 4, gap: 4 }}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <PressableScale key={it.key} onPress={() => onChange(it.key)} style={{ flex: 1 }}>
            <View
              style={[
                { borderRadius: 11, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? colors.surfaceContainerLowest : 'transparent' },
                active ? shadows.soft : null,
              ]}
            >
              <Text variant="labelMd" color={active ? colors.secondaryContainer : colors.onSurfaceVariant}>
                {it.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

// Upcoming reservation card with a brand-red accent bar; keeps the inline
// cancel-confirm flow from before.
function UpcomingCard({ row, cancelling, onView, onCancelStart, onCancelConfirm, onCancelAbort }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const departLabel = useDepartureLabel(row.ride?.departure_time, t);
  return (
    <Card accent={colors.secondaryContainer} onPress={onView}>
      <Row justify="space-between" align="flex-start">
        <Text variant="headlineSm" numberOfLines={1} style={{ flex: 1, paddingEnd: spacing.sm }}>
          {row.route?.origin_city} → {row.route?.destination_city}
        </Text>
        <Badge
          label={departLabel}
          variant="warning"
          icon="schedule"
        />
      </Row>
      <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ marginTop: 2 }}>
        {formatDateTime(row.ride?.departure_time)}
      </Text>
      <Row justify="space-between" align="center" style={{ marginTop: spacing.md }}>
        <Row gap={spacing.sm} style={{ flex: 1 }}>
          <Avatar name={row.driverUser?.full_name} size={30} />
          <Stack gap={1} style={{ flexShrink: 1 }}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('passenger:driverShort')}
            </Text>
            <Text variant="labelMd" numberOfLines={1}>
              {row.driverUser?.full_name}
            </Text>
          </Stack>
        </Row>
        <Row gap={spacing.lg}>
          <Stack gap={1} style={{ alignItems: 'flex-end' }}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('passenger:seatsShort')}
            </Text>
            <Text variant="bodyLg">{row.reservation.seats_booked}</Text>
          </Stack>
          <Stack gap={1} style={{ alignItems: 'flex-end' }}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('passenger:paidShort')}
            </Text>
            <Text variant="bodyLg" numberOfLines={1}>
              {row.reservation.total_price} {t('common:tnd')}
            </Text>
          </Stack>
        </Row>
      </Row>
      {cancelling ? (
        <View style={{ backgroundColor: colors.errorContainer, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md, gap: spacing.md }}>
          <Text variant="labelSm" color={colors.error}>
            {t('ride:feeNonRefundable')}
          </Text>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('common:back')} variant="outline" onPress={onCancelAbort} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('common:confirm')} variant="danger" onPress={onCancelConfirm} />
            </View>
          </Row>
        </View>
      ) : (
        <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button label={t('passenger:viewTicket')} variant="primary" onPress={onView} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={t('common:cancel')} variant="danger" onPress={onCancelStart} />
          </View>
        </Row>
      )}
    </Card>
  );
}

// Past trip card: status badge plus a contextual action (rate when completed,
// rebook when cancelled).
function PastCard({ row, onOpen, onRate, onRebook }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const reservationCancelled = row.reservation.status === 'cancelled';
  const rideStatus = row.ride?.status;
  const cancelled = reservationCancelled || rideStatus === 'cancelled';
  const inProgress = rideStatus === 'in_progress';
  const completed = rideStatus === 'completed';

  const statusText = reservationCancelled
    ? statusLabel(t, 'cancelled')
    : inProgress
      ? t('booking:ticketExpired')
      : completed
        ? statusLabel(t, 'completed')
        : rideStatus === 'cancelled'
          ? statusLabel(t, 'cancelled')
          : statusLabel(t, row.reservation.status);
  const variant = cancelled ? 'error' : inProgress ? 'warning' : 'success';

  return (
    <Card onPress={onOpen}>
      <Row justify="space-between" align="flex-start">
        <Stack gap={2} style={{ flex: 1, paddingEnd: spacing.sm }}>
          <Text variant="bodyLg" numberOfLines={1}>
            {row.route?.origin_city} → {row.route?.destination_city}
          </Text>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {formatDate(row.reservation.booked_at)}
          </Text>
        </Stack>
        <Stack gap={spacing.sm} style={{ alignItems: 'flex-end' }}>
          <Badge label={statusText} variant={variant} />
          {completed ? (
            <Button label={t('passenger:rateDriver')} variant="outline" small fullWidth={false} onPress={onRate} />
          ) : null}
          {cancelled ? (
            <Button label={t('passenger:rebook')} variant="ghost" small fullWidth={false} onPress={onRebook} />
          ) : null}
        </Stack>
      </Row>
    </Card>
  );
}

// Navy "total spent" summary — stays premium-navy in both themes.
function TotalSpentCard({ total }) {
  const { t } = useLocale();
  const year = new Date().getFullYear();
  return (
    <View style={[{ borderRadius: radius.xl }, shadows.card]}>
      <LinearGradient
        colors={['#031634', '#0A2247']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xl, padding: spacing.md + 2 }}
      >
        <Text variant="labelSm" color="rgba(255,255,255,0.6)">
          {t('passenger:totalSpent')} · {year}
        </Text>
        <Row align="flex-end" gap={6} style={{ marginTop: 4 }}>
          <Text
            variant="displayLg"
            color={PASS.onNavy}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            style={{ fontSize: 34, lineHeight: 40, flexShrink: 1 }}
          >
            {formatAmount(total)}
          </Text>
          <Text variant="bodyLg" color="rgba(255,255,255,0.7)" style={{ marginBottom: 5, flexShrink: 0 }}>
            {t('common:tnd')}
          </Text>
        </Row>
      </LinearGradient>
    </View>
  );
}

function PaymentRow({ p }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const cash = p.method === 'cash';
  const refunded = p.status === 'refunded';
  const settled = p.status === 'succeeded';
  return (
    <Card>
      <Row gap={spacing.md} align="center">
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            backgroundColor: cash ? withAlpha(colors.success, 0.14) : colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={cash ? 'payments' : 'credit-card'} size={18} color={cash ? colors.success : colors.primary} />
        </View>
        <Stack gap={2} style={{ flex: 1 }}>
          <Text variant="labelMd" numberOfLines={1}>
            {statusLabel(t, p.method)}
          </Text>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {statusLabel(t, p.status)} · {formatDate(p.paid_at)}
          </Text>
        </Stack>
        <Text variant="bodyLg" color={refunded ? colors.success : settled ? colors.onSurface : colors.onSurfaceVariant} numberOfLines={1}>
          {refunded ? '+' : '−'}
          {p.amount} {t('common:tnd')}
        </Text>
      </Row>
    </Card>
  );
}

export default function PassengerDashboard() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigation();
  const { unreadCount } = usePush();

  const [tab, setTab] = useState('upcoming');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [ratingRide, setRatingRide] = useState(null);
  const [ratingDriver, setRatingDriver] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    const [allRes, py] = await Promise.all([
      reservationsApi.listReservations({ actor: user }),
      paymentsApi.listPayments({ actor: user }),
    ]);

    const upcomingList = [];
    const pastList = [];

    (allRes || []).forEach((row) => {
      const isCancelled = row.reservation.status === 'cancelled';
      const isRideLiveOrDone =
        row.ride &&
        (row.ride.status === 'in_progress' || row.ride.status === 'completed' || row.ride.status === 'cancelled');

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

  const nextTrip = upcoming[0];
  const firstName = user?.name?.split(' ')[0];
  const totalSpent = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const iconBtn = {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  };

  const openBooking = (id) => nav.navigate('BookingConfirm', { id });

  return (
    <Screen>
      {/* Greeting header */}
      <Row justify="space-between" align="center" style={{ marginTop: spacing.xs }}>
        <Stack gap={2}>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('passenger:hello')},
          </Text>
          <Text variant="headlineMd">{firstName} 👋</Text>
        </Stack>
        <Row gap={spacing.sm}>
          <PressableScale onPress={() => nav.navigate('ChatList')} scaleTo={0.92} style={iconBtn}>
            <MaterialIcons name="chat-bubble-outline" size={20} color={colors.onSurface} />
            {unreadCount > 0 ? (
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
                <Text variant="labelXs" color={colors.onError}>
                  {unreadCount}
                </Text>
              </View>
            ) : null}
          </PressableScale>
          <PressableScale onPress={() => toast.show(t('toast:noNewNotifications'), 'info')} scaleTo={0.92} style={iconBtn}>
            <MaterialIcons name="notifications-none" size={20} color={colors.onSurface} />
            <View style={{ position: 'absolute', top: 9, end: 10, width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.secondaryContainer }} />
          </PressableScale>
        </Row>
      </Row>

      {/* Featured next-trip ticket */}
      {nextTrip ? (
        <FadeSlideIn index={0}>
          <Stack gap={spacing.sm}>
            <SectionLabel>{t('passenger:nextTrip')}</SectionLabel>
            <BoardingPass
              row={nextTrip}
              notch={colors.surface}
              onTicket={() => openBooking(nextTrip.reservation.id)}
              onMessage={() => nav.navigate('ChatList')}
            />
          </Stack>
        </FadeSlideIn>
      ) : null}

      {/* Segmented control */}
      <FadeSlideIn index={1}>
        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { key: 'upcoming', label: t('passenger:upcoming') },
            { key: 'past', label: t('passenger:past') },
            { key: 'payments', label: t('passenger:payments') },
          ]}
        />
      </FadeSlideIn>

      {/* Upcoming */}
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
          <Stack gap={spacing.md}>
            {upcoming.map((row, index) => (
              <FadeSlideIn key={row.reservation.id} index={Math.min(index, 8)}>
                <UpcomingCard
                  row={row}
                  cancelling={cancellingId === row.reservation.id}
                  onView={() => openBooking(row.reservation.id)}
                  onCancelStart={() => setCancellingId(row.reservation.id)}
                  onCancelAbort={() => setCancellingId(null)}
                  onCancelConfirm={() => confirmCancel(row.reservation.id)}
                />
              </FadeSlideIn>
            ))}
          </Stack>
        ))}

      {/* Past */}
      {tab === 'past' &&
        (refreshing && past.length === 0 ? (
          <SkeletonList count={3} lines={1} />
        ) : past.length === 0 ? (
          <EmptyState icon="history" title={t('passenger:noPastTitle')} body={t('passenger:noPastBody')} />
        ) : (
          <Stack gap={spacing.md}>
            {past.map((row, index) => (
              <FadeSlideIn key={row.reservation.id} index={Math.min(index, 8)}>
                <PastCard
                  row={row}
                  onOpen={() => openBooking(row.reservation.id)}
                  onRate={() => {
                    setRatingRide(row.ride?.id);
                    setRatingDriver(row.ride?.driver_id);
                  }}
                  onRebook={() => nav.navigate('Search')}
                />
              </FadeSlideIn>
            ))}
          </Stack>
        ))}

      {/* Payments */}
      {tab === 'payments' &&
        (refreshing && payments.length === 0 ? (
          <SkeletonList count={3} lines={1} />
        ) : payments.length === 0 ? (
          <EmptyState icon="payments" title={t('passenger:noPaymentsTitle')} />
        ) : (
          <Stack gap={spacing.md}>
            <FadeSlideIn index={0}>
              <TotalSpentCard total={totalSpent} />
            </FadeSlideIn>
            <SectionLabel>{t('passenger:recentPayments')}</SectionLabel>
            {payments.map((p, index) => (
              <FadeSlideIn key={p.id} index={Math.min(index + 1, 8)}>
                <PaymentRow p={p} />
              </FadeSlideIn>
            ))}
          </Stack>
        ))}

      <RateDriverModal
        visible={!!ratingRide}
        driverName={past.find((r) => r.ride?.id === ratingRide)?.driverUser?.full_name}
        onClose={() => {
          setRatingRide(null);
          setRatingDriver(null);
        }}
        onSubmit={handleRateSubmit}
      />
    </Screen>
  );
}
