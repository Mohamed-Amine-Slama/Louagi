import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
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
import { Row, Section } from '../../components/Section';
import { KpiTile } from '../../components/KpiTile';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { driversApi, authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { formatMonthYear, statusLabel } from '../../i18n/format';
import {
  getBiometricCapability,
  promptBiometric,
  saveBiometricCredential,
  clearBiometricCredential,
  hasBiometricCredential,
  BIOMETRIC_KIND,
} from '../../security/biometric';

function expiryWarning(iso, t) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return { tone: 'error', label: t('driver:expired', { days: -days }) };
  if (days <= 30) return { tone: 'warning', label: t('driver:expiresIn', { days }) };
  return { tone: 'success', label: t('driver:valid', { days }) };
}

export default function DriverProfile() {
  const { colors, isDark } = useTheme();
  const { t, locale } = useLocale();
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

  const load = useCallback(async () => {
    const p = await driversApi.getDriverProfile({ actor: user });
    setProfile(p);
    setBrand(p?.vehicle_brand || '');
    setModel(p?.vehicle_model || '');
    setSeats(String(p?.seat_count ?? ''));
    setPayout(p?.payout_account || '');
    const fa = await driversApi.get2FAStatus({ actor: user });
    setTwoFA(fa?.enabled ?? false);
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

  const saveVehicle = async () => {
    setBusy(true);
    const res = await driversApi.updateDriverVehicle({ actor: user, brand, model, seatCount: Number(seats) });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(t('toast:vehicleUpdated'), 'success');
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
  const memberSince = formatMonthYear(profile.created_at || new Date(), { locale });
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
          paddingBottom: spacing.xl,
          borderBottomLeftRadius: radius.xxl,
          borderBottomRightRadius: radius.xxl,
          gap: spacing.md,
        }}
      >
        <Row justify="space-between">
          <Text variant="headlineMd" color={heroFg}>
            {t('driver:driverProfile')}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: withAlpha(heroFg, 0.12),
            }}
          >
            <Text variant="labelSm" color={heroFg}>
              {t('passenger:driverShort')}
            </Text>
          </View>
        </Row>
        <Row gap={spacing.md}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.full,
              backgroundColor: colors.secondaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="headlineMd" color={colors.onSecondaryContainer}>
              {profile.full_name?.charAt(0) || user?.name?.charAt(0) || 'D'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="headlineSm" color={heroFg}>
              {profile.full_name || user?.name}
            </Text>
            <Text variant="bodySm" color={withAlpha(heroFg, 0.8)}>
              {user?.phone_number}
            </Text>
            <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginTop: 4 }}>
              <BadgeChip icon="verified" label={statusLabel(t, profile.status)} />
              <BadgeChip icon="calendar-today" label={t('common:since', { date: memberSince })} />
            </Row>
          </View>
        </Row>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.containerMargin,
          gap: spacing.lg,
          paddingBottom: 100,
        }}
      >
        <FadeSlideIn index={0}>
          <Row gap={spacing.sm}>
            <KpiTile icon="star" tone="warning" value={(profile.rating ?? 0).toFixed(1)} label={t('driver:ratingLifetime', { count: profile.trips_completed ?? 0 })} />
            <KpiTile icon="route" tone="primary" value={String(profile.trips_completed ?? 0)} label={t('driver:tripsCompleted', { count: profile.trips_completed ?? 0 })} />
          </Row>
        </FadeSlideIn>

        <FadeSlideIn index={1}>
        <Section title={t('driver:vehicle')}>
          <Card>
            <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input label={t('driver:brand')} value={brand} onChangeText={setBrand} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('driver:model')} value={model} onChangeText={setModel} />
              </View>
            </Row>
            <Input
              label={t('driver:seatCount')}
              value={seats}
              onChangeText={setSeats}
              keyboardType="number-pad"
            />
            <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginTop: 4, marginBottom: spacing.sm }}>
              {t('driver:plateLabel', { plate: profile.plate_number_masked })}
            </Text>
            <Button label={t('driver:saveVehicle')} variant="secondary" onPress={saveVehicle} loading={busy} />
          </Card>
        </Section>
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
function BadgeChip({ icon, label }) {
  const { colors, isDark } = useTheme();
  const fg = isDark ? colors.onSurface : colors.onPrimary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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
