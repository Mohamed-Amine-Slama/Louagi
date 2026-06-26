import React, { useCallback, useEffect, useState } from 'react';
import { useTheme, THEME_MODES } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Switch, Pressable, ScrollView, Modal, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Banner } from '../../components/Banner';
import { Chip } from '../../components/Chip';
import { Stack, Row, Section } from '../../components/Section';
import { AccountCard, VehicleCard } from '../../components/ProfileCards';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

import { driversApi, usersApi, authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha, shadows, floatingTabBar } from '../../theme';
import { formatMonthYear, statusLabel } from '../../i18n/format';
import { MONO, PASS, initialsOf } from '../../lib/tickets';
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

function expiryWarning(iso, t) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return { tone: 'error', label: t('driver:expired', { days: -days }) };
  if (days <= 30) return { tone: 'warning', label: t('driver:expiresIn', { days }) };
  return { tone: 'success', label: t('driver:valid', { days }) };
}

export default function DriverProfile() {
  const { colors, mode, setMode } = useTheme();
  const { t, locale, setLocale, switching } = useLocale();
  const { user, signOut } = useAuth();
  const nav = useNavigation();
  const toast = useToast();
  
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [seats, setSeats] = useState('');
  const [payout, setPayout] = useState('');
  const [busy, setBusy] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [biometricCap, setBiometricCap] = useState({ available: false, kind: BIOMETRIC_KIND.NONE, enrolled: false });
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [twoFABusy, setTwoFABusy] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsModal, setSessionsModal] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);

  // Shared user-account fields (name/email/phone/notifications) come from the
  // role-agnostic GetProfile — GetDriverProfile does not return them.
  const [account, setAccount] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    const [p, fa, acct] = await Promise.all([
      driversApi.getDriverProfile({ actor: user }),
      driversApi.get2FAStatus({ actor: user }),
      usersApi.getProfile({ actor: user }),
    ]);
    setProfile(p);
    setBrand(p?.vehicle_brand || '');
    setModel(p?.vehicle_model || '');
    setSeats(String(p?.seat_count ?? ''));
    setPayout(p?.payout_account || '');
    setTwoFA(fa?.enabled ?? false);
    if (acct) {
      setAccount(acct);
      setFullName(acct.full_name || '');
      setEmail(acct.email || '');
      setSms(acct.notifications?.sms ?? true);
      setPush(acct.notifications?.push ?? true);
      setMarketing(acct.notifications?.marketing ?? false);
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

  const onToggle2FA = async (next) => {
    if (twoFABusy) return;
    setTwoFABusy(true);
    try {
      if (next) {
        const res = await driversApi.enable2FA({ actor: user });
        if (!res.ok) { toast.show(res.error, 'error'); return; }
        setTwoFA(true);
        toast.show(t('driver:twoFAEnabled'), 'success');
      } else {
        const res = await driversApi.disable2FA({ actor: user });
        if (!res.ok) { toast.show(res.error, 'error'); return; }
        setTwoFA(false);
        toast.show(t('driver:twoFADisabled'), 'info');
      }
    } finally {
      setTwoFABusy(false);
    }
  };

  const openSessions = async () => {
    setSessionsBusy(true);
    try {
      const list = await driversApi.listSessions({ actor: user });
      setSessions(list || []);
      setSessionsModal(true);
    } finally {
      setSessionsBusy(false);
    }
  };

  const onRevokeSession = async (sessionId) => {
    const res = await driversApi.revokeSession({ actor: user, sessionId });
    if (!res.ok) { toast.show(res.error, 'error'); return; }
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, isRevoked: true } : s));
    toast.show(t('driver:sessionRevoked'), 'success');
  };

  const onRequestDataDeletion = async () => {
    setDeletionBusy(true);
    try {
      const res = await driversApi.requestDataDeletion({ actor: user, reason: 'user_request' });
      if (!res.ok) { toast.show(res.error, 'error'); return; }
      toast.show(res.message || t('driver:deletionRequested'), 'success');
    } finally {
      setDeletionBusy(false);
    }
  };

  const saveAccount = async () => {
    setErrors({});
    setSavingAccount(true);
    const res = await usersApi.updateProfile({ actor: user, fullName, email });
    setSavingAccount(false);
    if (!res.ok) { setErrors(res.errors || {}); return false; }
    toast.show(t('toast:savedAccount'), 'success');
    return true;
  };

  const saveNotifications = async (nextSms, nextPush, nextMarketing = marketing) => {
    setSms(nextSms);
    setPush(nextPush);
    setMarketing(nextMarketing);
    await usersApi.updateNotificationPrefs({ actor: user, sms: nextSms, push: nextPush, marketing: nextMarketing });
  };

  const saveVehicle = async () => {
    setBusy(true);
    const res = await driversApi.updateDriverVehicle({ actor: user, brand, model, seatCount: Number(seats) });
    setBusy(false);
    if (!res.ok) { toast.show(res.error, 'error'); return false; }
    toast.show(t('toast:vehicleUpdated'), 'success');
    return true;
  };

  const savePayout = async () => {
    setBusy(true);
    const res = await driversApi.updateDriverPayout({ actor: user, account: payout });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(t('toast:payoutSaved'), 'success');
  };

  if (!profile) {
    return (
      <Screen>
        <SkeletonList count={4} lines={2} />
      </Screen>
    );
  }

  const lic = expiryWarning(profile.license_expires_at, t);
  const idc = expiryWarning(profile.id_expires_at, t);
  const memberSince = formatMonthYear(account?.created_at || profile.created_at || new Date(), { locale });

  return (
    <Screen padded={false} scroll={false} contentStyle={{ paddingBottom: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.containerMargin,
          gap: spacing.lg,
          paddingBottom: insets.bottom + floatingTabBar.contentClearance,
        }}
      >
        <FadeSlideIn index={0}>
          <Row justify="space-between" align="center">
            <Text variant="headlineMd">{t('driver:driverProfile')}</Text>
            <View style={[{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' }, shadows.soft]}>
              <MaterialIcons name="edit" size={17} color={colors.onSurface} />
            </View>
          </Row>
        </FadeSlideIn>
        <FadeSlideIn index={0}>
          <DriverCard profile={profile} user={user} memberSince={memberSince} notch={colors.surface} />
        </FadeSlideIn>

        <FadeSlideIn index={1}>
          <AccountCard
            title={t('passenger:account')}
            displayName={profile.full_name || user?.name}
            memberId={account?.id || profile.id}
            name={fullName}
            email={email}
            onChangeName={setFullName}
            onChangeEmail={setEmail}
            phoneMasked={account?.phone_masked}
            errors={errors}
            saving={savingAccount}
            onSave={saveAccount}
          />
        </FadeSlideIn>

        <FadeSlideIn index={1}>
          <VehicleCard
            title={t('driver:vehicle')}
            brand={brand}
            model={model}
            seats={seats}
            onChangeBrand={setBrand}
            onChangeModel={setModel}
            onChangeSeats={setSeats}
            plateMasked={profile.plate_number_masked}
            plateNote={t('driver:plateLabel', { plate: profile.plate_number_masked })}
            saving={busy}
            onSave={saveVehicle}
          />
        </FadeSlideIn>

        <FadeSlideIn index={2}>
        <Section title={t('driver:documents')}>
          <Card>
            <SettingRow
              icon="badge"
              title={t('driver:nationalId')}
              right={idc ? <Badge label={idc.label} variant={idc.tone} /> : null}
            />
            <Divider />
            <SettingRow
              icon="directions-car"
              title={t('driver:driverLicense')}
              right={lic ? <Badge label={lic.label} variant={lic.tone} /> : null}
            />
          </Card>
          {lic?.tone === 'error' || idc?.tone === 'error' ? (
            <Banner
              variant="error"
              title={t('driver:documentsExpired')}
              body={t('driver:documentsExpiredBody')}
            />
          ) : null}
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={3}>
        <Section title={t('driver:payout')}>
          <Card>
            <Input
              label={t('driver:payoutAccount')}
              value={payout}
              onChangeText={setPayout}
              iconLeft="account-balance-wallet"
            />
            <View style={{ marginTop: spacing.sm }}>
              <Button label={t('driver:savePayout')} onPress={savePayout} loading={busy} variant="secondary" />
            </View>
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={4}>
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
              <ChangePasswordForm
                actor={user}
                email={account?.email}
                onClose={() => setShowPasswordForm(false)}
              />
            ) : null}
            <Divider />
            <SettingRow
              icon={biometricCap.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}
              title={t('auth:biometricSignIn')}
              subtitle={!biometricCap.available
                  ? (biometricCap.kind === BIOMETRIC_KIND.NONE
                    ? t('auth:biometricNotAvailableShort')
                    : t('auth:biometricNotEnrolledShort'))
                  : biometric
                    ? (biometricCap.kind === BIOMETRIC_KIND.FACE
                      ? t('auth:biometricLinkedFace')
                      : t('auth:biometricLinkedFingerprint'))
                    : t('auth:biometricScanOnce')}
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
              icon="lock"
              title={t('driver:twoStepVerification')}
              subtitle={twoFA ? t('driver:twoFAEnabled') : t('driver:twoFADisabled')}
              right={
                <Switch
                  value={twoFA}
                  onValueChange={onToggle2FA}
                  disabled={twoFABusy}
                />
              }
            />
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={5}>
        <Section title={t('driver:activeSessions')}>
          <Card>
            <LinkRow
              icon="devices"
              title={t('driver:sessionsCount', { count: sessions.filter((s) => !s.isRevoked).length })}
              onPress={openSessions}
            />
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={6}>
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
              right={<Switch value={marketing} onValueChange={(v) => saveNotifications(sms, push, v)} />}
            />
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={6}>
        <Section title={t('passenger:preferences')}>
          <Card>
            <SettingRow
              icon="translate"
              title={t('passenger:language')}
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
            <SettingRow
              icon="palette"
              title={t('passenger:theme')}
              subtitle={
                { light: t('passenger:themeLight'), dark: t('passenger:themeDark'), system: t('passenger:themeSystemFollows') }[mode]
              }
              right={
                <Row gap={4}>
                  {THEME_MODES.map((m) => (
                    <Chip
                      key={m}
                      selected={m === mode}
                      onPress={() => setMode(m)}
                      icon={{ light: 'light-mode', dark: 'dark-mode', system: 'brightness-auto' }[m]}
                      style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                    />
                  ))}
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
        </FadeSlideIn>

        <FadeSlideIn index={6}>
        <Section title={t('driver:privacyAndData')}>
          <Card>
            <LinkRow icon="download" title={t('driver:exportMyData')} onPress={() => nav.navigate('Support', { section: 'data' })} />
            <Divider />
            <LinkRow icon="delete-forever" title={t('driver:deleteAccount')} onPress={onRequestDataDeletion} />
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={7}>
        <Section title={t('driver:policies')}>
          <Card>
            <LinkRow icon="gavel" title={t('driver:termsOfService')} onPress={() => nav.navigate('Support', { section: 'terms' })} />
            <Divider />
            <LinkRow icon="policy" title={t('driver:privacyPolicy')} onPress={() => nav.navigate('Support', { section: 'privacy' })} />
            <Divider />
            <LinkRow icon="request-quote" title={t('driver:refundPolicy')} onPress={() => nav.navigate('Support', { section: 'refund' })} />
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={8}>
        <Section title={t('passenger:support')}>
          <Card>
            <LinkRow icon="help" title={t('passenger:helpCentre')} onPress={() => nav.navigate('Support', { section: 'help' })} />
            <Divider />
            <LinkRow icon="mail" title={t('passenger:contactSupport')} onPress={() => nav.navigate('Support', { section: 'contact' })} />
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={8}>
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Button label={t('common:logout')} variant="outline" iconLeft="logout" onPress={signOut} />
          <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
            {t('passenger:versionFooter')}
          </Text>
        </View>
        </FadeSlideIn>
      </ScrollView>
      <SessionsModal
        visible={sessionsModal}
        sessions={sessions}
        onRevoke={onRevokeSession}
        onClose={() => setSessionsModal(false)}
      />
    </Screen>
  );
}

// Reusable components matching PassengerProfile
// Navy driver membership card — VERIFIED badge, red avatar, plate · vehicle,
// and a rating/trips/since stub. Stays navy in both themes.
function DriverCard({ profile, user, memberSince, notch }) {
  const { t } = useLocale();
  const name = profile.full_name || user?.name;
  const subline = [profile.plate_number_masked, [profile.vehicle_brand, profile.vehicle_model].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');
  const rating = profile.rating != null ? profile.rating.toFixed(1) : '—';
  return (
    <View style={[{ borderRadius: 22 }, shadows.card]}>
      <View style={{ borderRadius: 22, overflow: 'hidden' }}>
        <LinearGradient colors={['#0A2247', '#031634', '#3A1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ padding: 18, paddingBottom: 15 }}>
            <Row justify="space-between" align="center" style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.4, color: PASS.onNavyMut }}>{t('driver:cardLabel').toUpperCase()}</Text>
              <Row gap={6} align="center" style={{ backgroundColor: '#27B36B', borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 5 }}>
                <MaterialIcons name="verified" size={13} color="#0A2247" />
                <Text variant="labelSm" color="#0A2247" numberOfLines={1}>{statusLabel(t, profile.status).toUpperCase()}</Text>
              </Row>
            </Row>
            <Row gap={14} align="center">
              <LinearGradient colors={['#E0433F', '#C8102E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="headlineSm" color="#fff">{initialsOf(name)}</Text>
              </LinearGradient>
              <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                <Text variant="headlineSm" color={PASS.onNavy} numberOfLines={1}>{name}</Text>
                {subline ? <Text style={{ fontFamily: MONO, fontSize: 12, color: PASS.onNavyMut }} numberOfLines={1}>{subline}</Text> : null}
              </Stack>
            </Row>
          </View>
          <View style={{ height: 20, justifyContent: 'center' }}>
            <View style={{ position: 'absolute', start: -10, top: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: notch }} />
            <View style={{ position: 'absolute', end: -10, top: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: notch }} />
            <View style={{ marginHorizontal: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }} />
          </View>
          <Row style={{ padding: 18, paddingTop: 14 }}>
            <DriverStat label={t('driver:ratingShort')} value={'★ ' + rating} align="flex-start" />
            <DriverStat label={t('passenger:trips')} value={String(profile.trips_completed ?? 0)} align="center" />
            <DriverStat label={t('driver:sinceShort')} value={memberSince} align="flex-end" />
          </Row>
        </LinearGradient>
      </View>
    </View>
  );
}

function DriverStat({ label, value, align }) {
  const items = align === 'flex-start' ? 'flex-start' : align === 'flex-end' ? 'flex-end' : 'center';
  return (
    <Stack gap={3} style={{ flex: 1, alignItems: items }}>
      <Text variant="labelXs" color={PASS.onNavyFaint} style={{ letterSpacing: 0.5 }}>{String(label).toUpperCase()}</Text>
      <Text variant="headlineSm" color={PASS.onNavy} numberOfLines={1}>{value}</Text>
    </Stack>
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
    return (
      <PressableScale onPress={onPress} scaleTo={0.98}>
        {node}
      </PressableScale>
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

function SessionsModal({ visible, sessions, onRevoke, onClose }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: withAlpha(colors.scrim, 0.5) }}>
        <View
          style={{
            flex: 1,
            marginTop: insets.top + 60,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            padding: spacing.containerMargin,
          }}
        >
          <Row justify="space-between" style={{ marginBottom: spacing.lg }}>
            <Text variant="headlineSm">{t('driver:activeSessions')}</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
            </Pressable>
          </Row>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SettingRow
                icon={item.isRevoked ? 'block' : 'devices'}
                title={item.deviceName || t('driver:unknownDevice')}
                subtitle={`${t('driver:lastActive')}: ${new Date(item.lastActiveAt).toLocaleDateString()}${item.isRevoked ? ` · ${t('driver:revoked')}` : ''}`}
                right={
                  !item.isRevoked ? (
                    <PressableScale
                      onPress={() => onRevoke(item.id)}
                      scaleTo={0.94}
                      style={{
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 6,
                        borderRadius: radius.sm,
                        backgroundColor: colors.errorContainer,
                      }}
                    >
                      <Text variant="labelSm" color={colors.onErrorContainer}>{t('driver:revoke')}</Text>
                    </PressableScale>
                  ) : null
                }
              />
            )}
            ListEmptyComponent={
              <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: spacing.xl }}>
                {t('driver:noSessions')}
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}
