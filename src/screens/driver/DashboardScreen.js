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
import { Stack, Row, Section } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePush } from '../../context/NotificationContext';
import { spacing, radius, withAlpha, shadows } from '../../theme';
import { formatDateTime, dayLetter, formatDayOfMonth } from '../../i18n/format';
import { MONO, PASS, cityCode, initialsOf } from '../../lib/tickets';

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

const KPI_TONES = {
  primary: (c) => ({ bg: withAlpha(c.primary, 0.1), fg: c.primary }),
  warning: (c) => ({ bg: withAlpha(c.warning, 0.16), fg: c.warning }),
  success: (c) => ({ bg: withAlpha(c.success, 0.14), fg: c.success }),
};

// 2×2 dashboard KPI card: tinted icon squircle + trend pill, big value, label.
function DriverKpi({ icon, tone = 'primary', value, label, deltaPct }) {
  const { colors } = useTheme();
  const t = (KPI_TONES[tone] || KPI_TONES.primary)(colors);
  const up = typeof deltaPct === 'number' ? deltaPct >= 0 : null;
  const trendFg = up == null ? colors.onSurfaceVariant : up ? colors.success : colors.error;
  return (
    <Card style={{ flex: 1, minWidth: '45%' }}>
      <Row justify="space-between" align="center" style={{ marginBottom: spacing.md }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={icon} size={18} color={t.fg} />
        </View>
        {typeof deltaPct === 'number' ? (
          <Row gap={2} align="center">
            <MaterialIcons name={up ? 'trending-up' : 'trending-down'} size={13} color={trendFg} />
            <Text variant="labelSm" color={trendFg}>{up && deltaPct > 0 ? '+' : ''}{deltaPct}%</Text>
          </Row>
        ) : null}
      </Row>
      <Text variant="headlineMd" numberOfLines={1} style={{ letterSpacing: -0.5 }}>{value}</Text>
      <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

// Small metric card (Rating / Cancellation): icon squircle + value + label.
function MetricCard({ icon, tone, value, label }) {
  const { colors } = useTheme();
  const t = (KPI_TONES[tone] || KPI_TONES.primary)(colors);
  return (
    <Card style={{ flex: 1 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
        <MaterialIcons name={icon} size={18} color={t.fg} />
      </View>
      <Text variant="headlineMd" numberOfLines={1} style={{ letterSpacing: -0.5 }}>{value}</Text>
      <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

export default function DriverDashboard() {
  const { colors, isDark, setMode } = useTheme();
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

  const iconBtn = {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  };

  const booked = today ? today.total_seats - today.available_seats : 0;
  const seatTints = ['#F2A33C', '#C8102E', '#6B5B14', '#0E2C57'];

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.sm, gap: spacing.md }}>
        {/* Header */}
        <Row justify="space-between" align="center">
          <Row gap={11} align="center">
            <View style={{ width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="labelMd" color={colors.primary}>{initialsOf(user?.name)}</Text>
            </View>
            <Stack gap={1}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('driver:goodDay')},</Text>
              <Text variant="headlineSm">{user?.name?.split(' ')[0]}</Text>
            </Stack>
          </Row>
          <Row gap={spacing.xs} align="center">
            <PressableScale onPress={() => nav.navigate('ChatList')} scaleTo={0.9} style={iconBtn}>
              <MaterialIcons name="chat-bubble-outline" size={18} color={colors.onSurface} />
              {unreadCount > 0 ? (
                <View style={{ position: 'absolute', top: -3, end: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text variant="labelXs" color={colors.onError}>{unreadCount}</Text>
                </View>
              ) : null}
            </PressableScale>
            <Row gap={3} align="center" style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, padding: 3 }}>
              <PressableScale onPress={() => setMode('light')} scaleTo={0.9} style={togglePill(!isDark, colors)}>
                <MaterialIcons name="light-mode" size={15} color={!isDark ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
              </PressableScale>
              <PressableScale onPress={() => setMode('dark')} scaleTo={0.9} style={togglePill(isDark, colors)}>
                <MaterialIcons name="dark-mode" size={14} color={isDark ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
              </PressableScale>
            </Row>
            <PressableScale onPress={signOut} scaleTo={0.9} style={iconBtn}>
              <MaterialIcons name="logout" size={18} color={colors.onSurface} />
            </PressableScale>
          </Row>
        </Row>

        {/* KPI grid */}
        <FadeSlideIn index={0}>
          <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
            <DriverKpi icon="route" tone="primary" value={String(analytics.tripsThisPeriod)} label={t('driver:tripsKpi')} deltaPct={pctDelta(analytics.tripsThisPeriod, analytics.tripsPrevPeriod)} />
            <DriverKpi icon="event-seat" tone="primary" value={String(analytics.seatsSold)} label={t('driver:seatsSold')} deltaPct={pctDelta(analytics.seatsSold, analytics.seatsPrev)} />
            <DriverKpi icon="donut-large" tone="warning" value={`${analytics.occupancyPct}%`} label={t('driver:occupancy')} deltaPct={pctDelta(analytics.occupancyPct, analytics.occupancyPrevPct)} />
            <DriverKpi icon="payments" tone="success" value={`${formatTnd(analytics.avgFare)} ${t('common:tnd')}`} label={t('driver:avgFare')} deltaPct={pctDelta(analytics.avgFare, analytics.avgFarePrev)} />
          </Row>
        </FadeSlideIn>

        {/* Today's ride */}
        <FadeSlideIn index={1}>
          <Section title={t('driver:todaysRide')}>
            {today ? (
              <View style={[{ borderRadius: 22 }, shadows.card]}>
                <LinearGradient colors={['#0A2247', '#031634', '#3A1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 16 }}>
                  <Row justify="space-between" align="center" style={{ marginBottom: 14 }}>
                    <Row gap={6} align="center" style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 5 }}>
                      <MaterialIcons name="schedule" size={13} color="#fff" />
                      <Text variant="labelSm" color="#fff">{t('driver:scheduled')}</Text>
                    </Row>
                    <Row gap={4} align="flex-end">
                      <Text color="#fff" style={{ fontFamily: MONO, fontSize: 22, lineHeight: 24 }}>{booked * today.price_per_seat}</Text>
                      <Text variant="labelSm" color="rgba(255,255,255,0.7)" style={{ marginBottom: 2 }}>{t('common:tnd')}</Text>
                    </Row>
                  </Row>

                  <View style={{ backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: 15 }}>
                    <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginBottom: 10 }}>{formatDateTime(today.departure_time)}</Text>
                    <Row gap={12} align="stretch">
                      <View style={{ alignItems: 'center', paddingTop: 5 }}>
                        <View style={{ width: 13, height: 13, borderRadius: 7, borderWidth: 3, borderColor: colors.secondaryContainer }} />
                        <View style={{ flex: 1, width: 2, backgroundColor: colors.outlineVariant, marginVertical: 3 }} />
                        <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: PASS.navyDeep }} />
                      </View>
                      <Stack gap={3} style={{ flex: 1 }}>
                        <Text variant="headlineSm" numberOfLines={1}>{today.route.origin_city}</Text>
                        <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('common:minutes', { count: today.route.estimated_duration_min })}</Text>
                        <Text variant="headlineSm" numberOfLines={1}>{today.route.destination_city}</Text>
                      </Stack>
                    </Row>
                  </View>

                  <Row justify="space-between" align="center" style={{ marginTop: 14 }}>
                    <Row align="center">
                      {Array.from({ length: Math.min(booked, 3) }).map((_, i) => (
                        <View key={i} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: seatTints[i % seatTints.length], borderWidth: 2, borderColor: '#0A2247', marginStart: i === 0 ? 0 : -10 }} />
                      ))}
                      <Text variant="labelSm" color="rgba(255,255,255,0.65)" style={{ marginStart: booked > 0 ? 9 : 0 }}>
                        {t('driver:seatsCount', { count: booked, total: today.total_seats })}
                      </Text>
                    </Row>
                    <Button label={t('driver:manageRide')} variant="secondary" small fullWidth={false} iconRight="arrow-forward" onPress={() => nav.navigate('RideManagement', { id: today.id })} />
                  </Row>
                </LinearGradient>
              </View>
            ) : (
              <EmptyState icon="event-busy" title={t('driver:noRidesTitle')} body={t('driver:noRidesBody')} actionLabel={t('driver:createRide')} onAction={() => nav.navigate('CreateRide')} />
            )}
          </Section>
        </FadeSlideIn>

        {/* Earnings */}
        <FadeSlideIn index={2}>
          <Section
            title={t('driver:earnings')}
            action={
              <Row gap={3} align="center" style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: 11, padding: 3 }}>
                {[['week', t('driver:thisWeek')], ['month', t('driver:thisMonth')]].map(([k, lbl]) => {
                  const active = period === k;
                  return (
                    <PressableScale key={k} onPress={() => setPeriod(k)} scaleTo={0.95}>
                      <View style={[{ borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: active ? colors.surfaceContainerLowest : 'transparent' }, active ? shadows.soft : null]}>
                        <Text variant="labelSm" color={active ? colors.secondaryContainer : colors.onSurfaceVariant}>{lbl}</Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </Row>
            }
          >
            <Card>
              <Row justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>{period === 'week' ? t('driver:thisWeek') : t('driver:thisMonth')}</Text>
                  <Row gap={4} align="flex-end">
                    <Text variant="displayLg" style={{ fontSize: 34, lineHeight: 38 }}>{formatTnd(periodEarnings(analytics, period))}</Text>
                    <Text variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginBottom: 4 }}>{t('common:tnd')}</Text>
                  </Row>
                </Stack>
                <Row gap={4} align="center" style={{ backgroundColor: withAlpha(earningsDelta.sign >= 0 ? colors.success : colors.error, 0.14), borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <MaterialIcons name={earningsDelta.sign >= 0 ? 'trending-up' : 'trending-down'} size={13} color={earningsDelta.sign >= 0 ? colors.success : colors.error} />
                  <Text variant="labelSm" color={earningsDelta.sign >= 0 ? colors.success : colors.error}>{earningsDelta.label}</Text>
                </Row>
              </Row>
              <Row gap={period === 'month' ? 2 : spacing.xs} align="flex-end" style={{ height: 110, marginTop: spacing.md }}>
                {analytics.history.map((v, i) => {
                  const h = Math.max(6, (v / max) * 96);
                  const active = i === analytics.history.length - 1;
                  return (
                    <FadeSlideIn key={`${period}-${i}`} index={Math.min(i, 8)} style={{ flex: 1 }}>
                      <View style={{ height: h, borderRadius: 6, backgroundColor: active ? colors.secondaryContainer : colors.primary }} />
                    </FadeSlideIn>
                  );
                })}
              </Row>
              <Row justify="space-between" style={{ marginTop: spacing.xs }}>
                {labels.map((d, i) => (
                  <Text key={i} variant="labelXs" color={colors.onSurfaceVariant}>{d}</Text>
                ))}
              </Row>
            </Card>
          </Section>
        </FadeSlideIn>

        {/* Rating + cancellation */}
        <FadeSlideIn index={3}>
          <Row gap={spacing.sm}>
            <MetricCard icon="star" tone="warning" value={analytics.rating != null ? `★ ${analytics.rating.toFixed(1)}` : '—'} label={t('driver:ratingLifetime', { count: analytics.tripsCompleted ?? 0 })} />
            <MetricCard icon="check-circle" tone="success" value={`${analytics.cancelRatePct}%`} label={period === 'week' ? t('driver:cancellationRateThisWeek') : t('driver:cancellationRateThisMonth')} />
          </Row>
        </FadeSlideIn>

        {/* Top route */}
        {analytics.topRoute ? (
          <FadeSlideIn index={4}>
            <Card>
              <Row gap={spacing.md} align="center">
                <View style={{ width: 42, height: 42, borderRadius: radius.lg, backgroundColor: withAlpha('#2F6FE0', 0.14), alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="trending-up" size={20} color="#2F6FE0" />
                </View>
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant} numberOfLines={1}>
                    {(period === 'week' ? t('driver:topRouteThisWeek') : t('driver:topRouteThisMonth'))} · {t('common:ridesCount', { count: analytics.topRoute.count })}
                  </Text>
                  <Text variant="labelMd" numberOfLines={1}>{analytics.topRoute.origin_city} → {analytics.topRoute.destination_city}</Text>
                </Stack>
                <View style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, paddingHorizontal: 9, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.primary }} numberOfLines={1}>
                    {cityCode(analytics.topRoute.origin_city)} → {cityCode(analytics.topRoute.destination_city)}
                  </Text>
                </View>
              </Row>
            </Card>
          </FadeSlideIn>
        ) : null}
      </View>

      <FAB icon="add" label={t('driver:newRide')} onPress={() => nav.navigate('CreateRide')} />
    </Screen>
  );
}

function togglePill(active, colors) {
  return {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? colors.secondaryContainer : 'transparent',
  };
}

function periodEarnings(analytics, period) {
  return period === 'month' ? analytics.month : analytics.week;
}

function buildLabels(period, historyStartIso, bins, locale) {
  const start = historyStartIso ? new Date(historyStartIso) : new Date();
  if (!historyStartIso) start.setDate(start.getDate() - (bins - 1));
  const out = [];
  for (let i = 0; i < bins; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (period === 'week') {
      out.push(dayLetter(d, { locale }));
    } else {
      if (i === 0 || i === bins - 1 || (bins - 1 - i) % 5 === 0) out.push(formatDayOfMonth(d, { locale }));
      else out.push('');
    }
  }
  return out;
}
