import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Switch, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Banner } from '../../components/Banner';
import { Stack, Row, Section } from '../../components/Section';

import { driversApi, authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { formatMonthYear } from '../../i18n/format';
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
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user, signOut } = useAuth();
  const nav = useNavigation();
  const toast = useToast();
  
  const [profile, setProfile] = useState(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [seats, setSeats] = useState('');
  const [payout, setPayout] = useState('');
  const [busy, setBusy] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [biometricCap, setBiometricCap] = useState({ available: false, kind: BIOMETRIC_KIND.NONE, enrolled: false });
  const [biometricBusy, setBiometricBusy] = useState(false);

  const load = useCallback(async () => {
    const p = await driversApi.getDriverProfile({ actor: user });
    setProfile(p);
    setBrand(p?.vehicle_brand || '');
    setModel(p?.vehicle_model || '');
    setSeats(String(p?.seat_count ?? ''));
    setPayout(p?.payout_account || '');
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

  if (!profile) return <Screen />;

  const lic = expiryWarning(profile.license_expires_at, t);
  const idc = expiryWarning(profile.id_expires_at, t);
  const memberSince = formatMonthYear(profile.created_at || new Date(), { locale });

  return (
    <Screen padded={false}>
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
        <Row justify="space-between">
          <Text variant="headlineMd" color={colors.onPrimary}>
            {t('driver:driverProfile')}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: withAlpha(colors.onPrimary, 0.12),
            }}
          >
            <Text variant="labelSm" color={colors.onPrimary}>
              {t('passenger:driverShort')}
            </Text>
          </View>
        </Row>
        <Row gap={spacing.md}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.secondaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="displaySm" color={colors.onSecondaryContainer}>
              {profile.full_name?.charAt(0) || user?.name?.charAt(0) || 'D'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="headlineSm" color={colors.onPrimary}>
              {profile.full_name || user?.name}
            </Text>
            <Text variant="bodySm" color={withAlpha(colors.onPrimary, 0.8)}>
              {user?.phone_number}
            </Text>
            <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginTop: 4 }}>
              <BadgeChip icon="verified" label={profile.status === 'verified' ? t('driver:verified') : profile.status} />
              <BadgeChip icon="calendar-today" label={t('common:since', { date: memberSince })} />
            </Row>
          </View>
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.containerMargin,
          gap: spacing.lg,
          paddingBottom: 100,
        }}
      >
        <Row gap={spacing.sm}>
          <StatTile icon="star" value={(profile.rating ?? 0).toFixed(1)} label={t('driver:ratingLifetime', { count: profile.trips_completed ?? 0 })} />
          <StatTile icon="route" value={profile.trips_completed ?? 0} label={t('driver:tripsCompleted', { count: profile.trips_completed ?? 0 })} />
        </Row>

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
          </Card>
        </Section>

        <Section title={t('passenger:support')}>
          <Card>
            <LinkRow icon="help" title={t('passenger:helpCentre')} onPress={() => nav.navigate('Support', { section: 'help' })} />
            <Divider />
            <LinkRow icon="mail" title={t('passenger:contactSupport')} onPress={() => nav.navigate('Support', { section: 'contact' })} />
          </Card>
        </Section>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Button label={t('common:logout')} variant="outline" iconLeft="logout" onPress={signOut} />
          <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
            {t('passenger:versionFooter')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

// Reusable components matching PassengerProfile
function BadgeChip({ icon, label }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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
