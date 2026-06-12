import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button, FAB } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { AvatarStack, Avatar } from '../../components/Avatar';
import { RouteTimeline } from '../../components/RouteTimeline';
import { Stack, Row, Section } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { Chip } from '../../components/Chip';
import { KpiTile } from '../../components/KpiTile';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePush } from '../../context/NotificationContext';
import { spacing, radius, typography, withAlpha } from '../../theme';
import { formatDateTime, dayLetter, formatDayOfMonth } from '../../i18n/format';

const PERIODS = [
  { key: 'week', bins: 7 },
  { key: 'month', bins: 30 },
];

const EMPTY_ANALYTICS = {
  period: 'week',
  today: 0,
  week: 0,
  month: 0,
  history: [],
  historyStart: null,
  tripsThisPeriod: 0,
  tripsPrevPeriod: 0,
  seatsSold: 0,
  seatsPrev: 0,
  occupancyPct: 0,
  occupancyPrevPct: 0,
  avgFare: 0,
  avgFarePrev: 0,
  earningsPrev: 0,
  cancelRatePct: 0,
  topRoute: null,
  rating: null,
  tripsCompleted: 0,
};

function formatTnd(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

function delta(current, prev, t) {
  if (prev === 0) {
    if (current === 0) return { sign: 0, label: '—' };
    return { sign: 1, label: t('common:new') };
  }
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return { sign: 0, label: '0%' };
  return { sign: Math.sign(pct), label: `${pct > 0 ? '+' : ''}${pct}%` };
}

function pctDelta(current, prev) {
  if (!prev) return undefined;
  return Math.round(((current - prev) / prev) * 100);
}

export default function DriverDashboard() {
  const { colors, isDark } = useTheme();
  const { t, locale } = useLocale();
  const { user, signOut } = useAuth();
  const nav = useNavigation();
  const { unreadCount } = usePush();
  const [rides, setRides] = useState([]);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [period, setPeriod] = useState('week');

  const load = useCallback(async () => {
    const [r, e] = await Promise.all([
      ridesApi.driverRides({ actor: user, status: 'scheduled' }),
      ridesApi.driverEarnings({ actor: user, period }),
    ]);
    setRides(r);
    setAnalytics(e);
  }, [user, period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = rides[0];
  const max = Math.max(...(analytics.history.length ? analytics.history : [1]), 1);
  const bins = period === 'month' ? 30 : 7;

  const labels = useMemo(
    () => buildLabels(period, analytics.historyStart, bins, locale),
    [period, analytics.historyStart, bins, locale]
  );

  const earningsDelta = delta(periodEarnings(analytics, period), analytics.earningsPrev, t);
  const heroFg = isDark ? colors.onSurface : colors.onPrimary;

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
          <Row gap={spacing.sm}>
            <Avatar name={user?.name} size={42} />
            <View>
              <Text variant="labelSm" color={withAlpha(heroFg, 0.8)}>
                {t('driver:goodDay')},
              </Text>
              <Text variant="headlineSm" color={heroFg}>
                {user?.name?.split(' ')[0]}
              </Text>
            </View>
          </Row>
          <Row gap={spacing.xs}>
            <PressableScale
              onPress={() => nav.navigate('ChatList')}
              scaleTo={0.9}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                backgroundColor: withAlpha(heroFg, 0.2),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="chat" size={20} color={heroFg} />
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
                  <Text variant="labelXs" color={colors.onError}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </PressableScale>
            <PressableScale
              onPress={() => nav.navigate('Settings')}
              scaleTo={0.9}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                backgroundColor: withAlpha(heroFg, 0.2),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="settings" size={20} color={heroFg} />
            </PressableScale>
            <PressableScale
              onPress={signOut}
              scaleTo={0.9}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                backgroundColor: withAlpha(heroFg, 0.2),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="logout" size={20} color={heroFg} />
            </PressableScale>
          </Row>
        </Row>

        <Row gap={spacing.sm} style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
          <KpiTile
            icon="route"
            tone="primary"
            label={t('driver:tripsKpi')}
            value={String(analytics.tripsThisPeriod)}
            delta={pctDelta(analytics.tripsThisPeriod, analytics.tripsPrevPeriod)}
          />
          <KpiTile
            icon="event-seat"
            tone="primary"
            label={t('driver:seatsSold')}
            value={String(analytics.seatsSold)}
            delta={pctDelta(analytics.seatsSold, analytics.seatsPrev)}
          />
          <KpiTile
            icon="donut-large"
            tone="neutral"
            label={t('driver:occupancy')}
            value={`${analytics.occupancyPct}%`}
            delta={pctDelta(analytics.occupancyPct, analytics.occupancyPrevPct)}
          />
          <KpiTile
            icon="payments"
            tone="success"
            label={t('driver:avgFare')}
            value={`${formatTnd(analytics.avgFare)} ${t('common:tnd')}`}
            delta={pctDelta(analytics.avgFare, analytics.avgFarePrev)}
          />
        </Row>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.md, gap: spacing.md }}>
        <FadeSlideIn index={0}>
          <Section title={t('driver:todaysRide')}>
            {today ? (
              <Card
                style={{
                  backgroundColor: colors.secondaryContainer,
                  gap: spacing.sm,
                  padding: spacing.lg,
                }}
              >
                <Row justify="space-between" align="flex-start">
                  <Badge label={t('driver:scheduled')} variant="neutral" icon="schedule" />
                  <Text variant="headlineMd" color={colors.onSecondaryContainer}>
                    {(today.total_seats - today.available_seats) * today.price_per_seat} {t('common:tnd')}
                  </Text>
                </Row>
                <View
                  style={{
                    backgroundColor: colors.surfaceContainerLowest,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                  }}
                >
                  <RouteTimeline
                    origin={today.route.origin_city}
                    destination={today.route.destination_city}
                    departureLabel={formatDateTime(today.departure_time)}
                    arrivalLabel={t('common:minutes', { count: today.route.estimated_duration_min })}
                  />
                </View>
                <Row justify="space-between" align="center">
                  <AvatarStack
                    names={['Ahmed M.', 'Sarra B.', 'Leila K.']}
                    size={28}
                    extra={Math.max(0, today.total_seats - today.available_seats - 3)}
                  />
                  <Button
                    label={t('driver:manageRide')}
                    variant="primary"
                    fullWidth={false}
                    small
                    iconRight="arrow-forward"
                    onPress={() => nav.navigate('RideManagement', { id: today.id })}
                  />
                </Row>
              </Card>
            ) : (
              <EmptyState
                icon="event-busy"
                title={t('driver:noRidesTitle')}
                body={t('driver:noRidesBody')}
                actionLabel={t('driver:createRide')}
                onAction={() => nav.navigate('CreateRide')}
              />
            )}
          </Section>
        </FadeSlideIn>

        <FadeSlideIn index={1}>
          <Section
            title={t('driver:earnings')}
            action={
              <Row gap={4}>
                {PERIODS.map((p) => {
                  const active = p.key === period;
                  const label = p.key === 'week' ? t('driver:thisWeek') : t('driver:thisMonth');
                  return (
                    <Chip
                      key={p.key}
                      label={label}
                      selected={active}
                      onPress={() => setPeriod(p.key)}
                      style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                    />
                  );
                })}
              </Row>
            }
          >
            <Card>
              <Row justify="space-between" align="flex-end" style={{ marginBottom: spacing.md }}>
                <Stack gap={2}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {period === 'week' ? t('driver:thisWeek') : t('driver:thisMonth')}
                  </Text>
                  <Text variant="displayLg">
                    {formatTnd(periodEarnings(analytics, period))} {t('common:tnd')}
                  </Text>
                </Stack>
                <Badge
                  label={earningsDelta.label}
                  variant={earningsDelta.sign >= 0 ? 'success' : 'error'}
                  icon={earningsDelta.sign >= 0 ? 'trending-up' : 'trending-down'}
                />
              </Row>
              <Row gap={period === 'month' ? 2 : spacing.xs} align="flex-end" style={{ height: 96 }}>
                {analytics.history.map((v, i) => {
                  const h = Math.max(6, (v / max) * 84);
                  const active = i === analytics.history.length - 1;
                  return (
                    <FadeSlideIn key={`${period}-${i}`} index={Math.min(i, 8)} style={{ flex: 1 }}>
                      <View
                        style={{
                          height: h,
                          borderRadius: radius.sm,
                          backgroundColor: active ? colors.secondaryContainer : colors.primaryFixedDim,
                        }}
                      />
                    </FadeSlideIn>
                  );
                })}
              </Row>
              <Row justify="space-between" style={{ marginTop: spacing.xs }}>
                {labels.map((d, i) => (
                  <Text key={i} variant="labelSm" color={colors.onSurfaceVariant}>
                    {d}
                  </Text>
                ))}
              </Row>
            </Card>
          </Section>
        </FadeSlideIn>

        <FadeSlideIn index={2}>
          <Row gap={spacing.sm}>
            <KpiTile
              icon="star"
              tone="warning"
              value={analytics.rating != null ? analytics.rating.toFixed(1) : '—'}
              label={t('driver:ratingLifetime', { count: analytics.tripsCompleted ?? 0 })}
            />
            <KpiTile
              icon="cancel"
              tone="neutral"
              value={`${analytics.cancelRatePct}%`}
              label={
                period === 'week'
                  ? t('driver:cancellationRateThisWeek')
                  : t('driver:cancellationRateThisMonth')
              }
            />
          </Row>
        </FadeSlideIn>

        {analytics.topRoute ? (
          <FadeSlideIn index={3}>
            <Card>
              <Row gap={spacing.sm} align="center">
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.lg,
                    backgroundColor: colors.primaryFixed,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="trending-up" size={20} color={colors.primary} />
                </View>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {period === 'week' ? t('driver:topRouteThisWeek') : t('driver:topRouteThisMonth')}
                  </Text>
                  <Text variant="bodyMd">
                    {analytics.topRoute.origin_city} → {analytics.topRoute.destination_city}
                  </Text>
                </Stack>
                <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                  <Text variant="labelMd">{t('common:ridesCount', { count: analytics.topRoute.count })}</Text>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {formatTnd(analytics.topRoute.revenue)} {t('common:tnd')}
                  </Text>
                </Stack>
              </Row>
            </Card>
          </FadeSlideIn>
        ) : null}
      </View>
      <FAB icon="add" label={t('driver:newRide')} onPress={() => nav.navigate('CreateRide')} />
    </Screen>
  );
}

function periodEarnings(analytics, period) {
  return period === 'month' ? analytics.month : analytics.week;
}

function buildLabels(period, historyStartIso, bins, locale) {
  // Week: locale-aware one-letter weekday, anchored to historyStart so "today"
  // lines up with the rightmost bar. Month: sparse labels every ~5 days so 30
  // chars don't overlap on narrow screens.
  const start = historyStartIso ? new Date(historyStartIso) : new Date();
  if (!historyStartIso) start.setDate(start.getDate() - (bins - 1));
  const out = [];
  for (let i = 0; i < bins; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (period === 'week') {
      out.push(dayLetter(d, { locale }));
    } else {
      // Show day-of-month on 1st, every 5th, and the last bar
      if (i === 0 || i === bins - 1 || (bins - 1 - i) % 5 === 0) out.push(formatDayOfMonth(d, { locale }));
      else out.push('');
    }
  }
  return out;
}
