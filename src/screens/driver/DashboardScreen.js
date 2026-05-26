import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button, FAB } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { AvatarStack, Avatar } from '../../components/Avatar';
import { RouteTimeline } from '../../components/RouteTimeline';
import { Stack, Row, Section } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius } from '../../theme';
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

export default function DriverDashboard() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user, signOut } = useAuth();
  const nav = useNavigation();
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
          <Row gap={spacing.sm}>
            <Avatar name={user?.name} size={42} />
            <View>
              <Text variant="labelSm" color={colors.onPrimaryContainer}>
                {t('driver:goodDay')},
              </Text>
              <Text variant="headlineSm" color={colors.onPrimary}>
                {user?.name?.split(' ')[0]}
              </Text>
            </View>
          </Row>
          <Row gap={spacing.xs}>
            <Pressable
              onPress={() => nav.navigate('ChatList')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="chat" size={20} color={colors.onPrimary} />
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

        <Row gap={spacing.sm} style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
          <KpiTile
            icon="route"
            label={t('driver:tripsKpi')}
            value={String(analytics.tripsThisPeriod)}
            delta={delta(analytics.tripsThisPeriod, analytics.tripsPrevPeriod, t)}
            dark
          />
          <KpiTile
            icon="event-seat"
            label={t('driver:seatsSold')}
            value={String(analytics.seatsSold)}
            delta={delta(analytics.seatsSold, analytics.seatsPrev, t)}
            dark
          />
          <KpiTile
            icon="donut-large"
            label={t('driver:occupancy')}
            value={`${analytics.occupancyPct}%`}
            delta={delta(analytics.occupancyPct, analytics.occupancyPrevPct, t)}
            dark
          />
          <KpiTile
            icon="payments"
            label={t('driver:avgFare')}
            value={`${formatTnd(analytics.avgFare)}`}
            suffix={` ${t('common:tnd')}`}
            delta={delta(analytics.avgFare, analytics.avgFarePrev, t)}
            dark
          />
        </Row>
      </View>

      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.md, gap: spacing.md }}>
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
                <Badge label={t('driver:scheduled')} variant="info" icon="schedule" />
                <Text variant="headlineMd" color={colors.onSecondaryContainer}>
                  {(today.total_seats - today.available_seats) * today.price_per_seat} {t('common:tnd')}
                </Text>
              </Row>
              <RouteTimeline
                origin={today.route.origin_city}
                destination={today.route.destination_city}
                departureLabel={formatDateTime(today.departure_time)}
                arrivalLabel={t('common:minutes', { count: today.route.estimated_duration_min })}
              />
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

        <Section
          title={t('driver:earnings')}
          action={
            <Row gap={4}>
              {PERIODS.map((p) => {
                const active = p.key === period;
                const label = p.key === 'week' ? t('driver:thisWeek') : t('driver:thisMonth');
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => setPeriod(p.key)}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      borderRadius: radius.full,
                      backgroundColor: active ? colors.primary : colors.surfaceContainer,
                    }}
                  >
                    <Text
                      variant="labelSm"
                      color={active ? colors.onPrimary : colors.onSurface}
                    >
                      {label}
                    </Text>
                  </Pressable>
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
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: h,
                      borderRadius: radius.sm,
                      backgroundColor: active ? colors.secondaryContainer : colors.primaryFixedDim,
                    }}
                  />
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

        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Card style={{ gap: spacing.xs }}>
              <Row gap={spacing.xs} align="center">
                <MaterialIcons name="star" size={20} color={colors.secondaryContainer} />
                <Text variant="headlineSm">
                  {analytics.rating != null ? analytics.rating.toFixed(1) : '—'}
                </Text>
              </Row>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('driver:ratingLifetime', { count: analytics.tripsCompleted ?? 0 })}
              </Text>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card style={{ gap: spacing.xs }}>
              <Row gap={spacing.xs} align="center">
                <MaterialIcons name="cancel" size={20} color={colors.error} />
                <Text variant="headlineSm">{analytics.cancelRatePct}%</Text>
              </Row>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {period === 'week'
                  ? t('driver:cancellationRateThisWeek')
                  : t('driver:cancellationRateThisMonth')}
              </Text>
            </Card>
          </View>
        </Row>

        {analytics.topRoute ? (
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

function KpiTile({ icon, label, value, suffix, delta, dark }) {
  const { colors } = useTheme();
  const fg = dark ? colors.onPrimary : colors.onSurface;
  const subFg = dark ? colors.onPrimaryContainer : colors.onSurfaceVariant;
  const tileBg = dark ? colors.primaryContainer : colors.surfaceContainer;
  const deltaColor =
    delta.sign > 0 ? colors.success : delta.sign < 0 ? colors.error : subFg;
  return (
    <View
      style={{
        flex: 1,
        minWidth: '45%',
        backgroundColor: tileBg,
        borderRadius: radius.lg,
        padding: spacing.sm,
        gap: 2,
      }}
    >
      <Row gap={4} align="center">
        <MaterialIcons name={icon} size={14} color={subFg} />
        <Text variant="labelSm" color={subFg}>
          {label}
        </Text>
      </Row>
      <Text variant="headlineSm" color={fg}>
        {value}
        {suffix ? (
          <Text variant="labelSm" color={subFg}>
            {suffix}
          </Text>
        ) : null}
      </Text>
      <Row gap={2} align="center">
        <MaterialIcons
          name={delta.sign > 0 ? 'arrow-upward' : delta.sign < 0 ? 'arrow-downward' : 'remove'}
          size={11}
          color={deltaColor}
        />
        <Text variant="labelSm" color={deltaColor}>
          {delta.label}
        </Text>
      </Row>
    </View>
  );
}
