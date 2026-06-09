import React, { useCallback, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { Row, Stack, Section } from '../../components/Section';

import { adminApi, usersApi } from '../../api';
import { useTheme, THEME_MODES } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatMonthYear } from '../../i18n/format';

// Autonym labels — each language displayed in its own script.
const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];
const THEME_ICONS = { light: 'light-mode', dark: 'dark-mode', system: 'brightness-auto' };

export default function AdminProfile() {
  const { colors, mode, setMode } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const { user, signOut } = useAuth();
  const nav = useNavigation();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [auditCount, setAuditCount] = useState(null);

  const load = useCallback(async () => {
    const [p, s, c] = await Promise.all([
      usersApi.getProfile({ actor: user }).catch(() => null),
      adminApi.adminStats({ actor: user }).catch(() => null),
      adminApi.adminAuditCount({ actor: user }).catch(() => null),
    ]);
    setProfile(p);
    setStats(s);
    setAuditCount(typeof c === 'number' ? c : c?.total ?? null);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const name = profile?.full_name || user?.name || 'Admin';
  const memberSince = formatMonthYear(profile?.created_at || new Date(), { locale });
  const goToTab = (screen) => nav.navigate('Tabs', { screen });

  return (
    <Screen padded={false}>
      {/* Identity header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          gap: spacing.md,
        }}
      >
        <Row justify="space-between" align="center">
          <Text variant="labelSm" color={withAlpha(colors.onPrimary, 0.8)}>
            {t('admin:profileTitle')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: withAlpha(colors.onPrimary, 0.14),
            }}
          >
            <MaterialIcons name="shield" size={14} color={colors.onPrimary} />
            <Text variant="labelSm" color={colors.onPrimary}>{t('admin:administrator')}</Text>
          </View>
        </Row>
        <Row gap={spacing.md} align="center">
          <View
            style={{
              borderWidth: 3,
              borderColor: withAlpha(colors.onPrimary, 0.24),
              borderRadius: 40,
            }}
          >
            <Avatar name={name} size={72} badge />
          </View>
          <Stack gap={6} style={{ flex: 1 }}>
            <Text variant="headlineMd" color={colors.onPrimary} numberOfLines={1}>
              {name}
            </Text>
            {profile?.email ? (
              <Text variant="bodySm" color={withAlpha(colors.onPrimary, 0.8)} numberOfLines={1}>
                {profile.email}
              </Text>
            ) : null}
            <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginTop: 2 }}>
              <MetaPill icon="event" label={t('common:since', { date: memberSince })} />
              <MetaPill icon="lock" label={t('admin:secureSession')} />
            </Row>
          </Stack>
        </Row>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.lg, paddingBottom: 120 }}>
        {/* Platform pulse */}
        <Section title={t('admin:platformPulse')}>
          <Row gap={spacing.sm}>
            <StatTile
              icon="route"
              value={stats?.activeRides ?? '—'}
              label={t('admin:activeRides')}
            />
            <StatTile
              icon="payments"
              value={stats ? `${(stats.revenueToday ?? 0).toFixed(0)} ${t('common:tnd')}` : '—'}
              label={t('admin:revenueToday')}
            />
          </Row>
        </Section>

        {/* Account */}
        <Section title={t('admin:account')}>
          <Card>
            <InfoRow icon="badge" label={t('auth:fullName')} value={name} />
            {profile?.email ? (
              <>
                <Divider />
                <InfoRow icon="email" label={t('auth:email')} value={profile.email} />
              </>
            ) : null}
            {profile?.phone_masked ? (
              <>
                <Divider />
                <InfoRow
                  icon="phone"
                  label={t('admin:phoneNumber')}
                  value={profile.phone_masked}
                  right={<MaterialIcons name="verified" size={20} color={colors.success} />}
                />
              </>
            ) : null}
          </Card>
        </Section>

        {/* Admin tools — quick hub into the management tabs */}
        <Section title={t('admin:adminTools')}>
          <Card>
            <LinkRow
              icon="verified-user"
              title={t('admin:driverVerifications')}
              subtitle={t('admin:verifyDriversSubtitle')}
              onPress={() => goToTab('Drivers')}
            />
            <Divider />
            <LinkRow
              icon="group"
              title={t('admin:userManagement')}
              subtitle={t('admin:manageUsersSubtitle')}
              onPress={() => goToTab('Users')}
            />
            <Divider />
            <LinkRow
              icon="payments"
              title={t('admin:paymentsTitle')}
              subtitle={t('admin:paymentsSubtitleShort')}
              onPress={() => goToTab('Payments')}
            />
            <Divider />
            <LinkRow
              icon="fact-check"
              title={t('admin:auditLog')}
              subtitle={t('admin:auditSubtitleShort')}
              right={
                auditCount != null ? (
                  <Badge label={t('admin:auditEntries', { count: auditCount })} variant="neutral" />
                ) : null
              }
              onPress={() => goToTab('Audit')}
            />
          </Card>
        </Section>

        {/* Security posture */}
        <Section title={t('admin:security')}>
          <Card>
            <SettingRow
              icon="verified"
              title={t('admin:stepUp')}
              subtitle={t('admin:stepUpSubtitle')}
              right={<Badge label={t('admin:enforced')} variant="success" icon="check" />}
            />
            <Divider />
            <SettingRow
              icon="vpn-lock"
              title={t('admin:ipAllowlist')}
              subtitle={t('admin:ipAllowlistSubtitle')}
              right={<Badge label={t('admin:activeBadge')} variant="success" icon="check" />}
            />
            <Divider />
            <SettingRow
              icon="history"
              title={t('admin:auditTrail')}
              subtitle={t('admin:auditTrailSubtitle')}
              right={<Badge label={t('admin:enforced')} variant="neutral" />}
            />
            <Divider />
            <SettingRow
              icon="devices"
              title={t('admin:thisDevice')}
              subtitle={t('admin:thisDeviceSubtitle')}
            />
          </Card>
        </Section>

        {/* Preferences */}
        <Section title={t('admin:preferences')}>
          <Card>
            <SettingRow
              icon="palette"
              title={t('admin:theme')}
              subtitle={t(`settings:theme${mode[0].toUpperCase()}${mode.slice(1)}`)}
              right={
                <Row gap={4}>
                  {THEME_MODES.map((m) => {
                    const active = m === mode;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setMode(m)}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 6,
                          borderRadius: radius.full,
                          backgroundColor: active ? colors.primary : colors.surfaceContainer,
                        }}
                      >
                        <MaterialIcons
                          name={THEME_ICONS[m]}
                          size={14}
                          color={active ? colors.onPrimary : colors.onSurface}
                        />
                      </Pressable>
                    );
                  })}
                </Row>
              }
            />
            <Divider />
            <SettingRow
              icon="translate"
              title={t('admin:language')}
              subtitle={LANGUAGES.find((l) => l.code === locale)?.label}
              right={
                <Row gap={4}>
                  {LANGUAGES.map((l) => {
                    const active = l.code === locale;
                    return (
                      <Pressable
                        key={l.code}
                        onPress={() => setLocale(l.code)}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 4,
                          borderRadius: radius.full,
                          backgroundColor: active ? colors.primary : colors.surfaceContainer,
                        }}
                      >
                        <Text variant="labelSm" color={active ? colors.onPrimary : colors.onSurface}>
                          {l.code.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Row>
              }
            />
            <Divider />
            <LinkRow icon="tune" title={t('admin:allSettings')} onPress={() => nav.navigate('Settings')} />
          </Card>
        </Section>

        {/* Support & policies */}
        <Section title={t('admin:supportAndPolicies')}>
          <Card>
            <LinkRow icon="help" title={t('admin:helpCentre')} onPress={() => nav.navigate('Support', { section: 'help' })} />
            <Divider />
            <LinkRow icon="mail" title={t('admin:contactSupport')} onPress={() => nav.navigate('Support', { section: 'contact' })} />
            <Divider />
            <LinkRow icon="gavel" title={t('admin:terms')} onPress={() => nav.navigate('Support', { section: 'terms' })} />
            <Divider />
            <LinkRow icon="policy" title={t('admin:privacy')} onPress={() => nav.navigate('Support', { section: 'privacy' })} />
          </Card>
        </Section>

        <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
          <Button label={t('common:logout')} variant="outline" iconLeft="logout" onPress={signOut} />
          <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
            {t('admin:versionFooter')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function MetaPill({ icon, label }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: withAlpha(colors.onPrimary, 0.14),
        maxWidth: '100%',
        flexShrink: 1,
      }}
    >
      <MaterialIcons name={icon} size={14} color={colors.onPrimary} />
      <Text variant="labelSm" color={colors.onPrimary} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function StatTile({ icon, value, label }) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'flex-start', gap: 6 }}>
      <View
        style={{
          width: 36, height: 36, borderRadius: radius.lg,
          backgroundColor: colors.primaryFixed,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={18} color={colors.primary} />
      </View>
      <Text variant="headlineSm" numberOfLines={1} style={{ maxWidth: '100%' }}>{value}</Text>
      <Text variant="labelSm" color={colors.onSurfaceVariant} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

function InfoRow({ icon, label, value, right }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <View
        style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: colors.surfaceContainer,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="labelSm" color={colors.onSurfaceVariant}>{label}</Text>
        <Text variant="bodyMd" numberOfLines={1}>{value}</Text>
      </View>
      {right}
    </View>
  );
}

function SettingRow({ icon, title, subtitle, right, onPress }) {
  const { colors } = useTheme();
  const node = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <View
        style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: colors.surfaceContainer,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="labelMd">{title}</Text>
        {subtitle ? (
          <Text variant="labelSm" color={colors.onSurfaceVariant}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {node}
      </Pressable>
    );
  }
  return node;
}

function LinkRow({ icon, title, subtitle, right, onPress }) {
  const { colors } = useTheme();
  return (
    <SettingRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      right={
        <Row gap={spacing.xs}>
          {right}
          <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
        </Row>
      }
      onPress={onPress}
    />
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: 4 }} />;
}
