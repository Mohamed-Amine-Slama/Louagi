import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View } from 'react-native';
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

import { driversApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';

function expiryWarning(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return { tone: 'error', label: `Expired ${-days}d ago` };
  if (days <= 30) return { tone: 'warning', label: `Expires in ${days}d` };
  return { tone: 'success', label: `Valid · ${days}d left` };
}

export default function DriverProfile() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [seats, setSeats] = useState('');
  const [payout, setPayout] = useState('');
  const [busy, setBusy] = useState(false);

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

  if (!profile) return <Screen />;

  const lic = expiryWarning(profile.license_expires_at);
  const idc = expiryWarning(profile.id_expires_at);

  const saveVehicle = async () => {
    setBusy(true);
    const res = await driversApi.updateDriverVehicle({ actor: user, brand, model, seatCount: Number(seats) });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show('Vehicle updated', 'success');
  };

  const savePayout = async () => {
    setBusy(true);
    const res = await driversApi.updateDriverPayout({ actor: user, account: payout });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show('Payout account saved', 'success');
  };

  return (
    <Screen>
      <ScreenHeader title="Driver profile" />

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
          {profile.trips_completed} trips completed
        </Text>
        <Badge label={profile.status} variant={profile.status === 'verified' ? 'success' : 'warning'} icon="verified" />
      </Card>

      <Section title="Documents">
        <Card>
          <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
            <Text variant="bodyMd">Driver's license</Text>
            {lic ? <Badge label={lic.label} variant={lic.tone} /> : null}
          </Row>
          <Row justify="space-between">
            <Text variant="bodyMd">National ID</Text>
            {idc ? <Badge label={idc.label} variant={idc.tone} /> : null}
          </Row>
        </Card>
        {lic?.tone === 'error' || idc?.tone === 'error' ? (
          <Banner
            variant="error"
            title="Documents expired"
            body="You can't publish new rides until expired documents are renewed."
          />
        ) : null}
      </Section>

      <Section title="Vehicle">
        <Card>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Input label="Brand" value={brand} onChangeText={setBrand} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Model" value={model} onChangeText={setModel} />
            </View>
          </Row>
          <Input
            label="Seat count"
            value={seats}
            onChangeText={setSeats}
            keyboardType="number-pad"
          />
          <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
            Plate: {profile.plate_number_masked}
          </Text>
          <Button label="Save vehicle" variant="secondary" onPress={saveVehicle} loading={busy} />
        </Card>
      </Section>

      <Section title="Payout">
        <Card>
          <Input
            label="Bank / Konnect account"
            value={payout}
            onChangeText={setPayout}
            iconLeft="account-balance"
          />
          <Button label="Save payout details" onPress={savePayout} loading={busy} />
        </Card>
      </Section>

      <Button label="Log out" variant="outline" onPress={signOut} />
    </Screen>
  );
}
