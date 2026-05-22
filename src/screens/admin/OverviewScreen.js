import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Badge } from '../../components/Badge';
import { Stack, Row, Section } from '../../components/Section';
import { Banner } from '../../components/Banner';

import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { isAdminIpAllowed } from '../../security/rbac';
import { spacing, radius } from '../../theme';

export default function AdminOverview() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user, signOut } = useAuth();
  const nav = useNavigation();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
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
    { label: t('admin:activeRides'), value: stats?.activeRides ?? '—', icon: 'route', color: colors.primary },
    { label: t('admin:bookingsToday'), value: stats?.bookingsToday ?? '—', icon: 'event-seat', color: colors.success },
    { label: t('admin:revenueToday'), value: `${(stats?.revenueToday ?? 0).toFixed(0)} ${t('common:tnd')}`, icon: 'payments', color: colors.secondaryContainer, dark: true },
    { label: t('admin:newUsers24h'), value: stats?.newUsers ?? '—', icon: 'person-add', color: colors.primaryContainer },
  ];

  return (
    <Screen>
      <Row justify="space-between" align="center">
        <View>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('admin:title')}
          </Text>
          <Text variant="headlineMd">{t('admin:platformOverview')}</Text>
        </View>
        <Row gap={spacing.xs}>
          <Pressable
            onPress={() => nav.navigate('Settings')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="settings" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable
            onPress={signOut}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="logout" size={20} color={colors.onSurface} />
          </Pressable>
        </Row>
      </Row>

      <Row gap={spacing.sm}>
        {cards.slice(0, 2).map((c) => (
          <Card key={c.label} style={{ flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.lg,
                backgroundColor: colors.surfaceContainer,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <MaterialIcons name={c.icon} size={20} color={c.color} />
            </View>
            <Text variant="displayLg">{c.value}</Text>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {c.label}
            </Text>
          </Card>
        ))}
      </Row>
      <Row gap={spacing.sm}>
        {cards.slice(2).map((c) => (
          <Card key={c.label} style={{ flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.lg,
                backgroundColor: colors.surfaceContainer,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <MaterialIcons name={c.icon} size={20} color={c.dark ? colors.onSecondaryContainer : c.color} />
            </View>
            <Text variant="headlineMd">{c.value}</Text>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {c.label}
            </Text>
          </Card>
        ))}
      </Row>

      <Section title={t('admin:alerts')}>
        {alerts.length === 0 ? (
          <Banner variant="success" title={t('admin:allClearTitle')} body={t('admin:allClearBody')} />
        ) : (
          alerts.map((a) => (
            <Card key={a.id} accent={a.kind === 'verification' ? colors.secondaryContainer : colors.error}>
              <Row justify="space-between">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="labelMd">{a.title}</Text>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {a.body}
                  </Text>
                </Stack>
                <Badge
                  label={a.kind}
                  variant={a.kind === 'verification' ? 'warning' : 'error'}
                  icon={a.kind === 'verification' ? 'verified-user' : 'flag'}
                />
              </Row>
            </Card>
          ))
        )}
      </Section>

      <Banner
        variant="info"
        title={t('admin:securityPolicyTitle')}
        body={t('admin:securityPolicyBody')}
      />
    </Screen>
  );
}
