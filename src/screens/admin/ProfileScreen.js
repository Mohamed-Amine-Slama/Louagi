import React, { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { Input } from '../../components/Input';
import { Banner } from '../../components/Banner';
import { useToast } from '../../components/Toast';
import { Row, Stack, Section } from '../../components/Section';
import { KpiTile } from '../../components/KpiTile';
import { Chip } from '../../components/Chip';
import { FadeSlideIn, PressableScale } from '../../components/motion';

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
  const { colors, isDark, mode, setMode } = useTheme();
  const { t, locale, setLocale, switching } = useLocale();
  const { user, signOut } = useAuth();
  const nav = useNavigation();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [auditCount, setAuditCount] = useState(null);
  const [totp, setTotp] = useState(null);
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpOpen, setTotpOpen] = useState(false);

  const load = useCallback(async () => {
    const [p, s, c, mfa] = await Promise.all([
      usersApi.getProfile({ actor: user }).catch(() => null),
      adminApi.adminStats({ actor: user }).catch(() => null),
      adminApi.adminAuditCount({ actor: user }).catch(() => null),
      adminApi.adminTotpStatus({ actor: user }).catch(() => null),
    ]);
    setProfile(p);
    setStats(s);
    setAuditCount(typeof c === 'number' ? c : c?.total ?? null);
    setTotp(mfa);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setupTotp = async () => {
    setTotpBusy(true);
    const res = await adminApi.adminSetupTotp({ actor: user });
    setTotpBusy(false);
    if (!res?.ok) return toast.show(res?.error || t('errors:generic'), 'error');
    setTotpSetup({ secret: res.secret, uri: res.uri });
    setTotpCode('');
  };

  const activateTotp = async () => {
    if (totpCode.length !== 6) return toast.show(t('admin:totpCodeHint'), 'warning');
    setTotpBusy(true);
    const res = await adminApi.adminActivateTotp({ actor: user, code: totpCode });
    setTotpBusy(false);
    if (!res?.ok) return toast.show(res?.error || t('errors:generic'), 'error');
    toast.show(t('toast:totpEnabled'), 'success');
    setTotpSetup(null);
    setTotpCode('');
    setTotp({ enabled: true, pending: false });
  };

  const disableTotp = async () => {
    if (totpCode.length !== 6) return toast.show(t('admin:totpCodeHint'), 'warning');
    setTotpBusy(true);
    const res = await adminApi.adminDisableTotp({ actor: user, code: totpCode });
    setTotpBusy(false);
    if (!res?.ok) return toast.show(res?.error || t('errors:generic'), 'error');
    toast.show(t('toast:totpDisabled'), 'warning');
    setTotpCode('');
    setTotp({ enabled: false, pending: false });
  };

  const name = profile?.full_name || user?.name || t('admin:administrator');
  const memberSince = formatMonthYear(profile?.created_at || new Date(), { locale });
  const goToTab = (screen) => nav.navigate('Tabs', { screen });
  const heroFg = isDark ? colors.onSurface : colors.onPrimary;

  return (
    <Screen padded={false}>
      {/* Identity header */}
      <FadeSlideIn index={0}>
        <LinearGradient
          colors={isDark ? [colors.surfaceContainerHighest, colors.background] : [colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: spacing.containerMargin,
            paddingTop: spacing.md,
            paddingBottom: spacing.xl,
            borderBottomLeftRadius: radius.xxl,
            borderBottomRightRadius: radius.xxl,
            gap: spacing.md,
          }}
        >
          <Row justify="space-between" align="center">
            <Text variant="labelSm" color={withAlpha(heroFg, 0.8)}>
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
                backgroundColor: withAlpha(heroFg, 0.14),
              }}
            >
              <MaterialIcons name="shield" size={14} color={heroFg} />
              <Text variant="labelSm" color={heroFg}>{t('admin:administrator')}</Text>
            </View>
          </Row>
          <Row gap={spacing.md} align="center">
            <View
              style={{
                borderWidth: 3,
                borderColor: withAlpha(heroFg, 0.24),
                borderRadius: radius.full,
              }}
            >
              <Avatar name={name} size={72} badge />
            </View>
            <Stack gap={6} style={{ flex: 1 }}>
              <Text variant="headlineMd" color={heroFg} numberOfLines={1}>
                {name}
              </Text>
              {profile?.email ? (
                <Text variant="bodySm" color={withAlpha(heroFg, 0.8)} numberOfLines={1}>
                  {profile.email}
                </Text>
              ) : null}
              <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginTop: 2 }}>
                <MetaPill icon="event" label={t('common:since', { date: memberSince })} />
                <MetaPill icon="lock" label={t('admin:secureSession')} />
              </Row>
            </Stack>
          </Row>
        </LinearGradient>
      </FadeSlideIn>

      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.lg, paddingBottom: 120 }}>
        {/* Platform pulse */}
        <FadeSlideIn index={1}>
          <Section title={t('admin:platformPulse')}>
            <Row gap={spacing.sm}>
              <KpiTile
                icon="route"
                value={stats?.activeRides ?? '—'}
                label={t('admin:activeRides')}
                tone="primary"
              />
              <KpiTile
                icon="payments"
                value={stats ? `${(stats.revenueToday ?? 0).toFixed(0)} ${t('common:tnd')}` : '—'}
                label={t('admin:revenueToday')}
                tone="accent"
              />
            </Row>
          </Section>
        </FadeSlideIn>

        {/* Account */}
        <FadeSlideIn index={2}>
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
        </FadeSlideIn>

        {/* Admin tools — quick hub into the management tabs */}
        <FadeSlideIn index={3}>
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
        </FadeSlideIn>

        {/* Security posture */}
        <FadeSlideIn index={4}>
          <Section title={t('admin:security')}>
            <Card>
              <SettingRow
                icon="phonelink-lock"
                title={t('admin:totpTitle')}
                subtitle={totp?.enabled ? t('admin:totpOnSubtitle') : t('admin:totpOffSubtitle')}
                right={
                  <Badge
                    label={totp?.enabled ? t('admin:activeBadge') : t('admin:totpOffBadge')}
                    variant={totp?.enabled ? 'success' : 'warning'}
                    icon={totp?.enabled ? 'check' : undefined}
                  />
                }
                onPress={() => setTotpOpen((o) => !o)}
              />
              {totpOpen ? (
                <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
                  {totp?.enabled ? (
                    <>
                      <Input
                        label={t('admin:totpCodeLabel')}
                        value={totpCode}
                        onChangeText={setTotpCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        hint={t('admin:totpDisableHint')}
                      />
                      <Button
                        label={t('admin:totpDisable')}
                        variant="danger"
                        onPress={disableTotp}
                        loading={totpBusy}
                      />
                    </>
                  ) : totpSetup ? (
                    <>
                      <Banner
                        variant="info"
                        title={t('admin:totpSecretTitle')}
                        body={t('admin:totpSecretBody')}
                      />
                      <Text variant="labelMd" selectable style={{ letterSpacing: 1.5 }}>
                        {totpSetup.secret}
                      </Text>
                      <Input
                        label={t('admin:totpCodeLabel')}
                        value={totpCode}
                        onChangeText={setTotpCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        hint={t('admin:totpCodeHint')}
                      />
                      <Button
                        label={t('admin:totpActivate')}
                        variant="secondary"
                        onPress={activateTotp}
                        loading={totpBusy}
                      />
                    </>
                  ) : (
                    <Button
                      label={t('admin:totpSetup')}
                      variant="secondary"
                      onPress={setupTotp}
                      loading={totpBusy}
                    />
                  )}
                </View>
              ) : null}
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
        </FadeSlideIn>

        {/* Preferences */}
        <FadeSlideIn index={5}>
          <Section title={t('admin:preferences')}>
            <Card>
              <SettingRow
                icon="palette"
                title={t('admin:theme')}
                subtitle={t(`settings:theme${mode[0].toUpperCase()}${mode.slice(1)}`)}
                right={
                  <Row gap={4}>
                    {THEME_MODES.map((m) => (
                      <Chip
                        key={m}
                        selected={m === mode}
                        onPress={() => setMode(m)}
                        icon={THEME_ICONS[m]}
                        style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                      />
                    ))}
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
                    {LANGUAGES.map((l) => (
                      <Chip
                        key={l.code}
                        disabled={switching}
                        selected={l.code === locale}
                        onPress={() => setLocale(l.code)}
                        label={l.code.toUpperCase()}
                        style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                      />
                    ))}
                  </Row>
                }
              />
              <Divider />
              <LinkRow icon="tune" title={t('admin:allSettings')} onPress={() => nav.navigate('Settings')} />
            </Card>
          </Section>
        </FadeSlideIn>

        {/* Support & policies */}
        <FadeSlideIn index={6}>
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
        </FadeSlideIn>

        <FadeSlideIn index={7}>
          <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
            <Button label={t('common:logout')} variant="outline" iconLeft="logout" onPress={signOut} />
            <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
              {t('admin:versionFooter')}
            </Text>
          </View>
        </FadeSlideIn>
      </ScrollView>
    </Screen>
  );
}

function MetaPill({ icon, label }) {
  const { colors, isDark } = useTheme();
  const fg = isDark ? colors.onSurface : colors.onPrimary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: withAlpha(fg, 0.14),
        maxWidth: '100%',
        flexShrink: 1,
      }}
    >
      <MaterialIcons name={icon} size={14} color={fg} />
      <Text variant="labelSm" color={fg} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ icon, label, value, right }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <View
        style={{
          width: 40, height: 40, borderRadius: radius.full,
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
          width: 40, height: 40, borderRadius: radius.full,
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
    return <PressableScale onPress={onPress}>{node}</PressableScale>;
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
