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
import {
  getBiometricCapability,
  promptBiometric,
  saveBiometricCredential,
  clearBiometricCredential,
  hasBiometricCredential,
  BIOMETRIC_KIND,
} from '../../security/biometric';

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];

export default function PassengerProfile() {
  const { colors, mode, setMode } = useTheme();
  const { locale, setLocale } = useLocale();
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
        setLoadError('Your session no longer matches any account. Please sign in again.');
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
      setLoadError(err?.message || 'Failed to load your profile.');
    }
  }, [user]);

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
        ? 'No fingerprint enrolled in your device settings.'
        : 'Biometric sensor not available on this device.';
      toast.show(reason, 'error');
      return;
    }
    setBiometricBusy(true);
    try {
      if (next) {
        const promptKind = biometricCap.kind === BIOMETRIC_KIND.FACE ? 'Face ID' : 'fingerprint';
        const auth = await promptBiometric({ promptMessage: `Confirm to enable ${promptKind} sign-in` });
        if (!auth.success) {
          toast.show("Biometric check didn't succeed", 'error');
          return;
        }
        const res = await authApi.enrollBiometric({ userId: user.id });
        if (!res.ok) {
          toast.show(res.error || 'Could not enable biometric sign-in', 'error');
          return;
        }
        await saveBiometricCredential({ userId: user.id, userName: profile?.full_name || user.name, ticket: res.ticket });
        setBiometric(true);
        toast.show('Biometric sign-in enabled', 'success');
      } else {
        await clearBiometricCredential();
        setBiometric(false);
        toast.show('Biometric sign-in turned off', 'info');
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  if (loadError) {
    return (
      <Screen>
        <ScreenHeader title="Profile & settings" />
        <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md }}>
          <Banner variant="error" title="Couldn't load profile" body={loadError} />
          <Button label="Sign out" variant="outline" iconLeft="logout" onPress={signOut} />
        </View>
      </Screen>
    );
  }

  if (!profile) return <Screen />;

  const memberSince = (() => {
    const d = new Date(); // demo seed lacks an explicit signup date; show "this year"
    return d.toLocaleString('en', { month: 'short', year: 'numeric' });
  })();

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
    toast.show('Account info saved', 'success');
  };

  const savePassword = async () => {
    setErrors({});
    if (!newPassword) {
      setErrors({ newPassword: 'Enter a new password' });
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
    toast.show('Password changed', 'success');
  };

  const saveNotifications = async (nextSms, nextPush) => {
    setSms(nextSms);
    setPush(nextPush);
    await usersApi.updateNotificationPrefs({ actor: user, sms: nextSms, push: nextPush });
  };

  const del = async () => {
    if (!deletePassword) {
      setErrors({ deletePassword: 'Enter your password to confirm' });
      return;
    }
    const res = await usersApi.deleteAccount({ actor: user, password: deletePassword });
    if (!res.ok) {
      setErrors({ deletePassword: res.error });
      return;
    }
    toast.show('Account deleted', 'info');
    signOut();
  };

  return (
    <Screen padded={false}>
      <ScreenHeader title="Profile & settings" />

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
                <Badge label={`Since ${memberSince}`} variant="neutral" icon="event" />
              </Row>
            </Stack>
          </Row>
        </Card>

        {/* Travel stats */}
        <Row gap={spacing.sm}>
          <StatTile icon="route" value={stats.trips} label="Trips" />
          <StatTile icon="payments" value={`${stats.spent.toFixed(0)} TND`} label="Spent" />
          <StatTile icon="eco" value={`${(stats.trips * 5).toFixed(0)} kg`} label="CO₂ saved" />
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
                  Favourite route
                </Text>
                <Text variant="bodyMd">{stats.favouriteRoute}</Text>
              </Stack>
            </Row>
          </Card>
        ) : null}

        {/* Account info */}
        <Section title="Account">
          <Card>
            <Stack gap={spacing.md}>
              <Input label="Full name" value={fullName} onChangeText={setFullName} error={errors.fullName} iconLeft="person" />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                iconLeft="email"
              />
              <Row justify="space-between" align="center">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>Phone (verified)</Text>
                  <Text variant="bodyMd">{profile.phone_masked}</Text>
                </Stack>
                <MaterialIcons name="verified" size={22} color={colors.success} />
              </Row>
              <Button label="Save account info" variant="secondary" onPress={saveAccount} loading={saving} />
            </Stack>
          </Card>
        </Section>

        {/* Security */}
        <Section title="Security">
          <Card>
            <SettingRow
              icon="lock"
              title="Password"
              subtitle="Change your sign-in password"
              right={<MaterialIcons name={showPasswordForm ? 'expand-less' : 'expand-more'} size={22} color={colors.onSurfaceVariant} />}
              onPress={() => setShowPasswordForm((v) => !v)}
            />
            {showPasswordForm ? (
              <Stack gap={spacing.md} style={{ marginTop: spacing.sm }}>
                <Input
                  label="Current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  error={errors.currentPassword}
                />
                <Input
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  hint="Min 8 chars · 1 uppercase · 1 digit"
                  error={errors.newPassword}
                />
                <Button label="Update password" onPress={savePassword} loading={saving} />
              </Stack>
            ) : null}
            <Divider />
            <SettingRow
              icon={biometricCap.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}
              title="Biometric sign-in"
              subtitle={
                !biometricCap.available
                  ? (biometricCap.kind === BIOMETRIC_KIND.NONE
                    ? 'Biometric sensor not available on this device'
                    : 'No fingerprint enrolled in your device settings')
                  : biometric
                    ? `Linked — next login uses your ${biometricCap.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}`
                    : `Scan once to skip phone & password next time`
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
              title="Active sessions"
              subtitle="1 device · this phone"
              right={<MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />}
              onPress={() => toast.show('Only this device is signed in', 'info')}
            />
            <Divider />
            <SettingRow
              icon="phonelink-lock"
              title="Two-step verification"
              subtitle="SMS OTP on every login"
              right={<Badge label="Enforced" variant="success" icon="check" />}
            />
          </Card>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Card>
            <SettingRow
              icon="sms"
              title="SMS"
              subtitle="Booking confirmations, OTPs, ride alerts"
              right={<Switch value={sms} onValueChange={(v) => saveNotifications(v, push)} />}
            />
            <Divider />
            <SettingRow
              icon="notifications"
              title="Push"
              subtitle="Real-time ride status on this device"
              right={<Switch value={push} onValueChange={(v) => saveNotifications(sms, v)} />}
            />
            <Divider />
            <SettingRow
              icon="campaign"
              title="Marketing & promos"
              subtitle="Occasional discounts and tips"
              right={<Switch value={marketing} onValueChange={setMarketing} />}
            />
          </Card>
        </Section>

        {/* Preferences */}
        <Section title="Travel preferences">
          <Card>
            <SettingRow
              icon="event-seat"
              title="Default seats"
              subtitle="Pre-fill the seat selector when you book"
              right={<Stepper value={defaultSeats} onChange={setDefaultSeats} min={1} max={8} />}
            />
            <Divider />
            <SettingRow
              icon="translate"
              title="Language"
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
              title="Theme"
              subtitle={{ light: 'Light', dark: 'Dark', system: 'Follows system' }[mode]}
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
              title="Currency"
              subtitle="Tunisian Dinar"
              right={<Badge label="TND" variant="neutral" />}
            />
            <Divider />
            <LinkRow
              icon="tune"
              title="All settings"
              onPress={() => nav.navigate('Settings')}
            />
          </Card>
        </Section>

        {/* Payment methods */}
        <Section title="Payment methods">
          <Card>
            <SettingRow
              icon="credit-card"
              title="Card ending 4242"
              subtitle="Default · expires 09/27"
              right={<Badge label="Default" variant="success" />}
            />
            <Divider />
            <Pressable
              onPress={() => toast.show('Add card flow is part of the booking sheet', 'info')}
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
              <Text variant="labelMd" color={colors.primary}>Add a card</Text>
            </Pressable>
          </Card>
        </Section>

        {/* Support */}
        <Section title="Support & legal">
          <Card>
            <LinkRow icon="help" title="Help centre" onPress={() => toast.show('Help centre coming soon', 'info')} />
            <Divider />
            <LinkRow icon="chat" title="Contact support" onPress={() => toast.show('We reply within 24h', 'info')} />
            <Divider />
            <LinkRow icon="description" title="Terms of service" onPress={() => toast.show('Open in browser', 'info')} />
            <Divider />
            <LinkRow icon="privacy-tip" title="Privacy policy" onPress={() => toast.show('Open in browser', 'info')} />
            <Divider />
            <LinkRow
              icon="download"
              title="Download my data"
              onPress={() => toast.show('Export queued — you\'ll get an email', 'info')}
            />
          </Card>
        </Section>

        <Button label="Log out" variant="outline" onPress={signOut} iconLeft="logout" />

        {/* Danger zone */}
        <Section title="Danger zone">
          <Banner
            variant="error"
            title="Delete your account"
            body="Permanently deactivates your account. Past bookings stay in the audit log."
          />
          {showDeleteForm ? (
            <Card style={{ gap: spacing.md }}>
              <Input
                label="Confirm with your password"
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                error={errors.deletePassword}
              />
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <Button label="Cancel" variant="outline" onPress={() => setShowDeleteForm(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Delete forever" variant="danger" onPress={del} />
                </View>
              </Row>
            </Card>
          ) : (
            <Button label="Delete account" variant="danger" iconLeft="delete-forever" onPress={() => setShowDeleteForm(true)} />
          )}
        </Section>

        <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: spacing.md }}>
          Louagi · v1.0.0
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
