import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

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

import { reservationsApi, paymentsApi, reviewsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePush } from '../../context/NotificationContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';
import { formatDateTime, formatDate, countdownFrom } from '../../i18n/format';

export default function PassengerDashboard() {
  const { colors } = useTheme();
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
    const [u, p, py] = await Promise.all([
      reservationsApi.listReservations({ actor: user, status: 'confirmed' }),
      reservationsApi.listReservations({ actor: user, status: 'cancelled' }),
      paymentsApi.listPayments({ actor: user }),
    ]);
    setUpcoming(u);
    setPast(p);
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

  return (
    <Screen padded={false}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <Row justify="space-between">
          <View>
            <Text variant="labelSm" color={colors.onPrimaryContainer}>
              {t('passenger:hello')},
            </Text>
            <Text variant="headlineMd" color={colors.onPrimary}>
              {user?.name?.split(' ')[0]} 👋
            </Text>
          </View>
          <Row gap={spacing.sm}>
            <Pressable
              onPress={() => nav.navigate('ChatList')}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MaterialIcons name="chat" size={20} color={colors.onPrimary} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    end: -4,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: colors.error,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text variant="labelSm" color={colors.onError} style={{ fontSize: 9, fontWeight: '700' }}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => toast.show(t('toast:noNewNotifications'), 'info')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="notifications" size={20} color={colors.onPrimary} />
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  end: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.error,
                }}
              />
            </Pressable>
            <Pressable
              onPress={() => nav.navigate('Settings')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="settings" size={20} color={colors.onPrimary} />
            </Pressable>
            <Pressable
              onPress={signOut}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="logout" size={20} color={colors.onPrimary} />
            </Pressable>
          </Row>
        </Row>
      </View>

      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.md, gap: spacing.md }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'upcoming', label: t('passenger:upcoming') },
            { key: 'past', label: t('passenger:past') },
            { key: 'payments', label: t('passenger:payments') },
          ]}
        />

        {tab === 'upcoming' &&
          (upcoming.length === 0 ? (
            <EmptyState
              icon="event-note"
              title={t('passenger:noUpcomingTitle')}
              body={t('passenger:noUpcomingBody')}
              actionLabel={t('landing:searchRides')}
              onAction={() => nav.navigate('Search')}
            />
          ) : (
            upcoming.map((row) => (
              <Card key={row.reservation.id} accent={colors.secondaryContainer}>
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
            ))
          ))}

        {tab === 'past' &&
          (past.length === 0 ? (
            <EmptyState
              icon="history"
              title={t('passenger:noPastTitle')}
              body={t('passenger:noPastBody')}
            />
          ) : (
            past.map((row) => (
              <Card key={row.reservation.id}>
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
                    <Badge label={row.reservation.status} variant={row.reservation.status === 'cancelled' ? 'error' : 'success'} />
                    {row.reservation.status === 'completed' && (
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
            ))
          ))}

        {tab === 'payments' &&
          (payments.length === 0 ? (
            <EmptyState icon="payments" title={t('passenger:noPaymentsTitle')} />
          ) : (
            payments.map((p) => (
              <Card key={p.id}>
                <Row justify="space-between">
                  <Stack gap={2}>
                    <Text variant="bodyLg">{p.amount} {t('common:tnd')}</Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {p.method} · {formatDate(p.paid_at)}
                    </Text>
                  </Stack>
                  <Badge
                    label={p.status}
                    variant={
                      p.status === 'succeeded' ? 'success' : p.status === 'refunded' ? 'warning' : 'error'
                    }
                  />
                </Row>
              </Card>
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
