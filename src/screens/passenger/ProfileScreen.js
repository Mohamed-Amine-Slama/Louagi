import React, { useCallback, useEffect, useState } from 'react';
import { useTheme, THEME_MODES } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Switch, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Banner } from '../../components/Banner';
import { Stack, Row, Section } from '../../components/Section';
import { Stepper } from '../../components/Stepper';
import { ScreenHeader } from '../../components/Header';

import { usersApi, reservationsApi, authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, shadows } from '../../theme';
import { formatMonthYear } from '../../i18n/format';
import {
  getBiometricCapability,
  promptBiometric,
  saveBiometricCredential,
  clearBiometricCredential,
  hasBiometricCredential,
  BIOMETRIC_KIND,
} from '../../security/biometric';

// Autonym labels — each language displayed in its own script.
const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];

export default function PassengerProfile() {
  const { colors, mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const nav = useNavigation();
  const { user, signOut } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ trips: 0, spent: 0, favouriteRoute: null });

  // Editable state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [biometricCap, setBiometricCap] = useState({ available: false, kind: BIOMETRIC_KIND.NONE, enrolled: false });
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [defaultSeats, setDefaultSeats] = useState(1);
  const [language, setLanguage] = useState('fr');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [p, all] = await Promise.all([
        usersApi.getProfile({ actor: user }),
        reservationsApi.listReservations({ actor: user }),
      ]);
      if (!p) {
        setLoadError(t('auth:sessionInvalid'));
        return;
      }
      setLoadError(null);
      setProfile(p);
      setFullName(p.full_name || '');
      setEmail(p.email || '');
      setSms(p.notifications?.sms ?? true);
      setPush(p.notifications?.push ?? true);

      const trips = all.filter((r) => r.reservation.status === 'confirmed' || r.reservation.status === 'completed').length;
      const spent = all
        .filter((r) => r.reservation.status !== 'cancelled')
        .reduce((sum, r) => sum + (r.reservation.total_price || 0), 0);
      const routeCounts = new Map();
      all.forEach((r) => {
        if (!r.route) return;
        const key = `${r.route.origin_city} → ${r.route.destination_city}`;
        routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
      });
      const fav = [...routeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      setStats({ trips, spent, favouriteRoute: fav });
    } catch (err) {
      setLoadError(err?.message || t('auth:profileLoadFailed'));
    }
  }, [user, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cap, enrolled] = await Promise.all([getBiometricCapability(), hasBiometricCredential()]);
      if (cancelled) return;
      setBiometricCap(cap);
      setBiometric(!!enrolled);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const onToggleBiometric = async (next) => {
    if (biometricBusy) return;
    if (!biometricCap.available) {
      const reason = !biometricCap.enrolled && biometricCap.kind !== BIOMETRIC_KIND.NONE
        ? t('auth:biometricNotEnrolled')
        : t('auth:biometricNotAvailable');
      toast.show(reason, 'error');
      return;
    }
    setBiometricBusy(true);
    try {
      if (next) {
        const promptMessage =
          biometricCap.kind === BIOMETRIC_KIND.FACE
            ? t('auth:biometricPromptEnrollFace')
            : t('auth:biometricPromptEnrollFingerprint');
        const auth = await promptBiometric({ promptMessage });
        if (!auth.success) {
          toast.show(t('auth:biometricFailedShort'), 'error');
          return;
        }
        const res = await authApi.enrollBiometric({ userId: user.id });
        if (!res.ok) {
          toast.show(res.error || t('auth:biometricCouldNotEnable'), 'error');
          return;
        }
        await saveBiometricCredential({ userId: user.id, userName: profile?.full_name || user.name, ticket: res.ticket });
        setBiometric(true);
        toast.show(t('auth:biometricEnabledToast'), 'success');
      } else {
        await clearBiometricCredential();
        setBiometric(false);
        toast.show(t('auth:biometricDisabledToast'), 'info');
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  if (loadError) {
    return (
      <Screen>
        <ScreenHeader title={t('passenger:profileTitle')} />
        <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md }}>
          <Banner variant="error" title={t('auth:couldntLoadProfile')} body={loadError} />
          <Button label={t('auth:signout')} variant="outline" iconLeft="logout" onPress={signOut} />
        </View>
      </Screen>
    );
  }

  if (!profile) return <Screen />;

  const memberSince = formatMonthYear(new Date(), { locale });

  const saveAccount = async () => {
    setErrors({});
    setSaving(true);
    const res = await usersApi.updateProfile({ actor: user, fullName, email });
    if (!res.ok) {
      setErrors(res.errors || {});
      setSaving(false);
      return;
    }
    setSaving(false);
    toast.show(t('toast:savedAccount'), 'success');
  };

  const savePassword = async () => {
    setErrors({});
    if (!newPassword) {
      setErrors({ newPassword: t('auth:enterNewPassword') });
      return;
    }
    setSaving(true);
    const res = await usersApi.updateProfile({
      actor: user,
      currentPassword,
      newPassword,
    });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.errors || {});
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setShowPasswordForm(false);
    toast.show(t('toast:passwordChanged'), 'success');
  };

  const saveNotifications = async (nextSms, nextPush) => {
    setSms(nextSms);
    setPush(nextPush);
    await usersApi.updateNotificationPrefs({ actor: user, sms: nextSms, push: nextPush });
  };

  const del = async () => {
    if (!deletePassword) {
      setErrors({ deletePassword: t('auth:enterPasswordConfirm') });
      return;
    }
    const res = await usersApi.deleteAccount({ actor: user, password: deletePassword });
    if (!res.ok) {
      setErrors({ deletePassword: res.error });
      return;
    }
    toast.show(t('toast:accountDeleted'), 'info');
    signOut();
  };

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('passenger:profileTitle')} />

      <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md }}>
        {/* Hero card */}
        <Card style={{ gap: spacing.md, padding: spacing.lg }}>
          <Row gap={spacing.md}>
            <View>
              <Avatar name={profile.full_name} size={64} badge />
            </View>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="headlineSm">{profile.full_name}</Text>
              <Text variant="bodySm" color={colors.onSurfaceVariant}>
                {profile.email}
              </Text>
              <Row gap={spacing.xs} style={{ marginTop: 4 }}>
                <Badge label={profile.role} variant="info" icon="badge" />
                <Badge label={t('common:since', { date: memberSince })} variant="neutral" icon="event" />
              </Row>
            </Stack>
          </Row>
        </Card>

        {/* Travel stats */}
        <Row gap={spacing.sm}>
          <StatTile icon="route" value={stats.trips} label={t('passenger:trips')} />
          <StatTile icon="payments" value={`${stats.spent.toFixed(0)} ${t('common:tnd')}`} label={t('passenger:spent')} />
          <StatTile icon="eco" value={`${(stats.trips * 5).toFixed(0)} kg`} label={t('passenger:co2Saved')} />
        </Row>
        {stats.favouriteRoute ? (
          <Card>
            <Row gap={spacing.sm}>
              <View
                style={{
                  width: 40, height: 40, borderRadius: radius.lg,
                  backgroundColor: colors.primaryFixed,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialIcons name="favorite" size={20} color={colors.primary} />
              </View>
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('passenger:favouriteRoute')}
                </Text>
                <Text variant="bodyMd">{stats.favouriteRoute}</Text>
              </Stack>
            </Row>
          </Card>
        ) : null}

        {/* Account info */}
        <Section title={t('passenger:account')}>
          <Card>
            <Stack gap={spacing.md}>
              <Input label={t('auth:fullName')} value={fullName} onChangeText={setFullName} error={errors.fullName} iconLeft="person" />
              <Input
                label={t('auth:email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                iconLeft="email"
              />
              <Row justify="space-between" align="center">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('passenger:phoneVerified')}</Text>
                  <Text variant="bodyMd">{profile.phone_masked}</Text>
                </Stack>
                <MaterialIcons name="verified" size={22} color={colors.success} />
              </Row>
              <Button label={t('passenger:saveAccount')} variant="secondary" onPress={saveAccount} loading={saving} />
            </Stack>
          </Card>
        </Section>

        {/* Security */}
        <Section title={t('passenger:security')}>
          <Card>
            <SettingRow
              icon="lock"
              title={t('passenger:passwordRow')}
              subtitle={t('passenger:passwordRowSubtitle')}
              right={<MaterialIcons name={showPasswordForm ? 'expand-less' : 'expand-more'} size={22} color={colors.onSurfaceVariant} />}
              onPress={() => setShowPasswordForm((v) => !v)}
            />
            {showPasswordForm ? (
              <Stack gap={spacing.md} style={{ marginTop: spacing.sm }}>
                <Input
                  label={t('auth:currentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  error={errors.currentPassword}
                />
                <Input
                  label={t('auth:newPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  hint={t('auth:phoneFormatHint')}
                  error={errors.newPassword}
                />
                <Button label={t('passenger:updatePassword')} onPress={savePassword} loading={saving} />
              </Stack>
            ) : null}
            <Divider />
            <SettingRow
              icon={biometricCap.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}
              title={t('passenger:biometric')}
              subtitle={
                !biometricCap.available
                  ? (biometricCap.kind === BIOMETRIC_KIND.NONE
                    ? t('auth:biometricNotAvailableShort')
                    : t('auth:biometricNotEnrolledShort'))
                  : biometric
                    ? (biometricCap.kind === BIOMETRIC_KIND.FACE
                      ? t('auth:biometricLinkedFace')
                      : t('auth:biometricLinkedFingerprint'))
                    : t('auth:biometricScanOnce')
              }
              right={
                <Switch
                  value={biometric}
                  onValueChange={onToggleBiometric}
                  disabled={biometricBusy || !biometricCap.available}
                />
              }
            />
            <Divider />
            <SettingRow
              icon="devices"
              title={t('passenger:activeSessions')}
              subtitle={t('passenger:activeSessionsSubtitle')}
              right={<MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />}
              onPress={() => toast.show(t('toast:onlyThisDevice'), 'info')}
            />
            <Divider />
            <SettingRow
              icon="phonelink-lock"
              title={t('passenger:twoStep')}
              subtitle={t('passenger:twoStepSubtitle')}
              right={<Badge label={t('passenger:enforced')} variant="success" icon="check" />}
            />
          </Card>
        </Section>

        {/* Notifications */}
        <Section title={t('passenger:notifications')}>
          <Card>
            <SettingRow
              icon="sms"
              title={t('passenger:sms')}
              subtitle={t('passenger:smsSubtitle')}
              right={<Switch value={sms} onValueChange={(v) => saveNotifications(v, push)} />}
            />
            <Divider />
            <SettingRow
              icon="notifications"
              title={t('passenger:push')}
              subtitle={t('passenger:pushSubtitle')}
              right={<Switch value={push} onValueChange={(v) => saveNotifications(sms, v)} />}
            />
            <Divider />
            <SettingRow
              icon="campaign"
              title={t('passenger:marketing')}
              subtitle={t('passenger:marketingSubtitle')}
              right={<Switch value={marketing} onValueChange={setMarketing} />}
            />
          </Card>
        </Section>

        {/* Preferences */}
        <Section title={t('passenger:preferences')}>
          <Card>
            <SettingRow
              icon="event-seat"
              title={t('passenger:defaultSeats')}
              subtitle={t('passenger:defaultSeatsSubtitle')}
              right={<Stepper value={defaultSeats} onChange={setDefaultSeats} min={1} max={8} />}
            />
            <Divider />
            <SettingRow
              icon="translate"
              title={t('passenger:language')}
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
            <SettingRow
              icon="palette"
              title={t('passenger:theme')}
              subtitle={
                { light: t('passenger:themeLight'), dark: t('passenger:themeDark'), system: t('passenger:themeSystemFollows') }[mode]
              }
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
                          paddingVertical: 4,
                          borderRadius: radius.full,
                          backgroundColor: active ? colors.primary : colors.surfaceContainer,
                        }}
                      >
                        <MaterialIcons
                          name={{ light: 'light-mode', dark: 'dark-mode', system: 'brightness-auto' }[m]}
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
              icon="payments"
              title={t('passenger:currency')}
              subtitle={t('passenger:currencySubtitle')}
              right={<Badge label={t('common:tnd')} variant="neutral" />}
            />
            <Divider />
            <LinkRow
              icon="tune"
              title={t('passenger:allSettings')}
              onPress={() => nav.navigate('Settings')}
            />
          </Card>
        </Section>

        {/* Payment methods */}
        <Section title={t('passenger:paymentMethods')}>
          <Card>
            <SettingRow
              icon="credit-card"
              title={t('passenger:cardEnding', { last4: '4242' })}
              subtitle={t('passenger:cardDefault', { exp: '09/27' })}
              right={<Badge label={t('passenger:cardDefaultBadge')} variant="success" />}
            />
            <Divider />
            <Pressable
              onPress={() => toast.show(t('toast:addCardHint'), 'info')}
              style={({ pressed }) => ({
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              })}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: colors.primaryFixed,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialIcons name="add" size={20} color={colors.primary} />
              </View>
              <Text variant="labelMd" color={colors.primary}>{t('passenger:addCard')}</Text>
            </Pressable>
          </Card>
        </Section>

        {/* Support */}
        <Section title={t('passenger:support')}>
          <Card>
            <LinkRow icon="help" title={t('passenger:helpCentre')} onPress={() => toast.show(t('toast:helpComingSoon'), 'info')} />
            <Divider />
            <LinkRow icon="chat" title={t('passenger:contactSupport')} onPress={() => toast.show(t('toast:weReplyIn24h'), 'info')} />
            <Divider />
            <LinkRow icon="description" title={t('passenger:terms')} onPress={() => toast.show(t('toast:openInBrowser'), 'info')} />
            <Divider />
            <LinkRow icon="privacy-tip" title={t('passenger:privacy')} onPress={() => toast.show(t('toast:openInBrowser'), 'info')} />
            <Divider />
            <LinkRow
              icon="download"
              title={t('passenger:downloadData')}
              onPress={() => toast.show(t('toast:exportQueued'), 'info')}
            />
          </Card>
        </Section>

        <Button label={t('common:logout')} variant="outline" onPress={signOut} iconLeft="logout" />

        {/* Danger zone */}
        <Section title={t('passenger:dangerZone')}>
          <Banner
            variant="error"
            title={t('passenger:deleteAccountTitle')}
            body={t('passenger:deleteAccountBody')}
          />
          {showDeleteForm ? (
            <Card style={{ gap: spacing.md }}>
              <Input
                label={t('passenger:confirmDeleteLabel')}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                error={errors.deletePassword}
              />
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <Button label={t('common:cancel')} variant="outline" onPress={() => setShowDeleteForm(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={t('common:deleteForever')} variant="danger" onPress={del} />
                </View>
              </Row>
            </Card>
          ) : (
            <Button label={t('passenger:deleteAccount')} variant="danger" iconLeft="delete-forever" onPress={() => setShowDeleteForm(true)} />
          )}
        </Section>

        <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: spacing.md }}>
          {t('passenger:versionFooter', { version: '1.0.0' })}
        </Text>
      </View>
    </Screen>
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
      <Text variant="headlineSm">{value}</Text>
      <Text variant="labelSm" color={colors.onSurfaceVariant}>{label}</Text>
    </Card>
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

function LinkRow({ icon, title, onPress }) {
  const { colors } = useTheme();
  return (
    <SettingRow
      icon={icon}
      title={title}
      right={<MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />}
      onPress={onPress}
    />
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: 4 }} />;
}
