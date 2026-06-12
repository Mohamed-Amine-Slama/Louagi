import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { Stack, Row, Section } from '../../components/Section';
import { Banner } from '../../components/Banner';
import { KpiTile } from '../../components/KpiTile';
import { Chip } from '../../components/Chip';
import { SkeletonCard } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { isAdminIpAllowed } from '../../security/rbac';
import { spacing, radius } from '../../theme';
import { dayLetter, formatDayOfMonth } from '../../i18n/format';

// Admin alerts arrive from the API with English title/kind strings; map by the
// stable `kind` to a localized label (falls back to the raw value if unknown).
const ALERT_TITLE_KEY = {
  verification: 'admin:alertDriverPending',
  flag: 'admin:alertPaymentFlagged',
  fail: 'admin:alertFailedPayment',
};
const ALERT_KIND_KEY = {
  verification: 'admin:alertKindVerification',
  flag: 'admin:alertKindFlag',
  fail: 'admin:alertKindFail',
};

const TREND_PERIODS = [7, 14, 30];
const TREND_METRICS = [
  { key: 'revenue', labelKey: 'admin:metricRevenue', money: true },
  { key: 'bookings', labelKey: 'admin:metricBookings' },
  { key: 'rides', labelKey: 'admin:metricRides' },
  { key: 'newUsers', labelKey: 'admin:metricNewUsers' },
];

function compactTnd(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

// Weekday letters for the 7-day view; sparse day-of-month for longer spans so
// labels never collide on narrow screens (mirrors the driver dashboard chart).
function trendLabels(startIso, bins, locale) {
  const start = startIso ? new Date(startIso) : new Date();
  if (!startIso) start.setDate(start.getDate() - (bins - 1));
  const out = [];
  for (let i = 0; i < bins; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (bins <= 7) out.push(dayLetter(d, { locale }));
    else if (i === 0 || i === bins - 1 || (bins - 1 - i) % 5 === 0) out.push(formatDayOfMonth(d, { locale }));
    else out.push('');
  }
  return out;
}

export default function AdminOverview() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trendDays, setTrendDays] = useState(14);
  const [trendMetric, setTrendMetric] = useState('revenue');
  const [series, setSeries] = useState(null);
  const ipAllowed = isAdminIpAllowed('dev-local');

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([
      adminApi.adminStats({ actor: user }),
      adminApi.adminAlerts({ actor: user }),
    ]);
    setStats(s);
    setAlerts(a);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    adminApi.adminTimeSeries({ actor: user, days: trendDays }).then((s) => {
      if (!cancelled) setSeries(s);
    });
    return () => {
      cancelled = true;
    };
  }, [user, trendDays]);

  const metricDef = TREND_METRICS.find((m) => m.key === trendMetric) ?? TREND_METRICS[0];
  const values = Array.isArray(series?.[trendMetric]) ? series[trendMetric] : [];
  const maxValue = Math.max(...(values.length ? values : [1]), 1);
  const trendTotal = values.reduce((a, v) => a + v, 0);
  const labels = useMemo(
    () => trendLabels(series?.start, values.length || trendDays, locale),
    [series?.start, values.length, trendDays, locale]
  );

  if (!ipAllowed) {
    return (
      <Screen>
        <Banner
          variant="error"
          title={t('admin:ipDeniedTitle')}
          body={t('admin:ipDeniedBody')}
        />
      </Screen>
    );
  }

  const cards = [
    { label: t('admin:activeRides'), value: stats?.activeRides ?? '—', icon: 'route', tone: 'primary' },
    { label: t('admin:bookingsToday'), value: stats?.bookingsToday ?? '—', icon: 'event-seat', tone: 'success' },
    { label: t('admin:revenueToday'), value: `${(stats?.revenueToday ?? 0).toFixed(0)} ${t('common:tnd')}`, icon: 'payments', tone: 'accent' },
    { label: t('admin:newUsers24h'), value: stats?.newUsers ?? '—', icon: 'person-add', tone: 'neutral' },
  ];

  return (
    <Screen>
      <FadeSlideIn index={0}>
        <Row justify="space-between" align="center">
          <View>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('admin:title')}
            </Text>
            <Text variant="headlineMd">{t('admin:platformOverview')}</Text>
          </View>
          <PressableScale
            onPress={() => nav.navigate('AdminProfile')}
            accessibilityRole="button"
            accessibilityLabel={t('admin:profileTitle')}
            style={{
              borderRadius: radius.full,
              borderWidth: 2,
              borderColor: colors.outlineVariant,
            }}
          >
            <Avatar name={user?.name} size={40} />
          </PressableScale>
        </Row>
      </FadeSlideIn>

      <Row gap={spacing.sm}>
        {cards.slice(0, 2).map((c, i) => (
          <FadeSlideIn key={c.label} index={1 + i} style={{ flex: 1 }}>
            <KpiTile icon={c.icon} value={c.value} label={c.label} tone={c.tone} />
          </FadeSlideIn>
        ))}
      </Row>
      <Row gap={spacing.sm}>
        {cards.slice(2).map((c, i) => (
          <FadeSlideIn key={c.label} index={3 + i} style={{ flex: 1 }}>
            <KpiTile icon={c.icon} value={c.value} label={c.label} tone={c.tone} />
          </FadeSlideIn>
        ))}
      </Row>

      <FadeSlideIn index={5}>
        <Section
          title={t('admin:trendsTitle')}
          action={
            <Row gap={4}>
              {TREND_PERIODS.map((d) => (
                <Chip
                  key={d}
                  label={t('admin:daysShort', { count: d })}
                  selected={trendDays === d}
                  onPress={() => setTrendDays(d)}
                  style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                />
              ))}
            </Row>
          }
        >
          {series === null ? (
            <SkeletonCard lines={3} />
          ) : (
            <Card>
              <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
                {TREND_METRICS.map((m) => (
                  <Chip
                    key={m.key}
                    label={t(m.labelKey)}
                    selected={trendMetric === m.key}
                    onPress={() => setTrendMetric(m.key)}
                    style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                  />
                ))}
              </Row>
              <Stack gap={2} style={{ marginBottom: spacing.md }}>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('admin:trendTotal', { count: trendDays })}
                </Text>
                <Text variant="displayLg">
                  {metricDef.money ? `${compactTnd(trendTotal)} ${t('common:tnd')}` : trendTotal}
                </Text>
              </Stack>
              <Row gap={trendDays === 30 ? 2 : spacing.xs} align="flex-end" style={{ height: 96 }}>
                {values.map((v, i) => {
                  const h = Math.max(6, (v / maxValue) * 84);
                  const active = i === values.length - 1;
                  return (
                    <FadeSlideIn key={`${trendMetric}-${trendDays}-${i}`} index={Math.min(i, 8)} style={{ flex: 1 }}>
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
          )}
        </Section>
      </FadeSlideIn>

      <FadeSlideIn index={6}>
        <Section title={t('admin:alerts')}>
          {alerts.length === 0 ? (
            <Banner variant="success" title={t('admin:allClearTitle')} body={t('admin:allClearBody')} />
          ) : (
            alerts.map((a, i) => (
              <FadeSlideIn key={a.id} index={Math.min(i, 8)}>
                <Card accent={a.kind === 'verification' ? colors.secondaryContainer : colors.error}>
                  <Row justify="space-between">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text variant="labelMd">{t(ALERT_TITLE_KEY[a.kind] || '', { defaultValue: a.title })}</Text>
                      <Text variant="labelSm" color={colors.onSurfaceVariant}>
                        {a.body}
                      </Text>
                    </Stack>
                    <Badge
                      label={t(ALERT_KIND_KEY[a.kind] || '', { defaultValue: a.kind })}
                      variant={a.kind === 'verification' ? 'warning' : 'error'}
                      icon={a.kind === 'verification' ? 'verified-user' : 'flag'}
                    />
                  </Row>
                </Card>
              </FadeSlideIn>
            ))
          )}
        </Section>
      </FadeSlideIn>

      <FadeSlideIn index={7}>
        <Banner
          variant="info"
          title={t('admin:securityPolicyTitle')}
          body={t('admin:securityPolicyBody')}
        />
      </FadeSlideIn>
    </Screen>
  );
}
