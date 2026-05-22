import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { spacing, radius } from '../../theme';
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
  const { t } = useLocale();
  const { user, signOut } = useAuth();
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        await saveBiometricCredential({ userId: user.id, userName: user.name, ticket: res.ticket });
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

  if (!profile) return <Screen />;

  const lic = expiryWarning(profile.license_expires_at, t);
  const idc = expiryWarning(profile.id_expires_at, t);

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

  return (
    <Screen>
      <ScreenHeader title={t('driver:driverProfile')} />

      <Card style={{ alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primaryFixed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="star" size={28} color={colors.primary} />
        </View>
        <Text variant="displayLg">{(profile.rating ?? 0).toFixed(1)}</Text>
        <Text variant="bodyMd" color={colors.onSurfaceVariant}>
          {t('driver:tripsCompleted', { count: profile.trips_completed ?? 0 })}
        </Text>
        <Badge label={profile.status} variant={profile.status === 'verified' ? 'success' : 'warning'} icon="verified" />
      </Card>

      <Section title={t('driver:documents')}>
        <Card>
          <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
            <Text variant="bodyMd">{t('driver:driverLicense')}</Text>
            {lic ? <Badge label={lic.label} variant={lic.tone} /> : null}
          </Row>
          <Row justify="space-between">
            <Text variant="bodyMd">{t('driver:nationalId')}</Text>
            {idc ? <Badge label={idc.label} variant={idc.tone} /> : null}
          </Row>
        </Card>
        {lic?.tone === 'error' || idc?.tone === 'error' ? (
          <Banner
            variant="error"
            title={t('driver:documentsExpired')}
            body={t('driver:documentsExpiredBody')}
          />
        ) : null}
      </Section>

      <Section title={t('driver:vehicle')}>
        <Card>
          <Row gap={spacing.sm}>
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
          <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
            {t('driver:plateLabel', { plate: profile.plate_number_masked })}
          </Text>
          <Button label={t('driver:saveVehicle')} variant="secondary" onPress={saveVehicle} loading={busy} />
        </Card>
      </Section>

      <Section title={t('driver:payout')}>
        <Card>
          <Input
            label={t('driver:payoutAccount')}
            value={payout}
            onChangeText={setPayout}
            iconLeft="account-balance"
          />
          <Button label={t('driver:savePayout')} onPress={savePayout} loading={busy} />
        </Card>
      </Section>

      <Section title={t('passenger:security')}>
        <Card>
          <Row gap={spacing.md} align="center">
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: colors.surfaceContainer,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MaterialIcons
                name={biometricCap.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="labelMd">{t('auth:biometricSignIn')}</Text>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {!biometricCap.available
                  ? (biometricCap.kind === BIOMETRIC_KIND.NONE
                    ? t('auth:biometricNotAvailableShort')
                    : t('auth:biometricNotEnrolledShort'))
                  : biometric
                    ? (biometricCap.kind === BIOMETRIC_KIND.FACE
                      ? t('auth:biometricLinkedFace')
                      : t('auth:biometricLinkedFingerprint'))
                    : t('auth:biometricScanOnce')}
              </Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={onToggleBiometric}
              disabled={biometricBusy || !biometricCap.available}
            />
          </Row>
        </Card>
      </Section>

      <Button label={t('common:logout')} variant="outline" onPress={signOut} />
    </Screen>
  );
}
