import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Tabs } from '../../components/Tabs';
import { Stack, Row, Section } from '../../components/Section';
import { Banner } from '../../components/Banner';
import { EmptyState } from '../../components/EmptyState';
import { maskId } from '../../security/crypto';

import { driversApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing } from '../../theme';

export default function AdminDrivers() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await driversApi.adminListDrivers({ actor: user, status: tab }));
  }, [tab, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const decide = async (approve) => {
    if (!selected) return;
    setBusy(true);
    const res = await driversApi.adminVerifyDriver({
      actor: user,
      driverId: selected.id,
      approve,
      reason: approve ? null : rejectReason,
    });
    setBusy(false);
    if (!res.ok) {
      toast.show(res.error, 'error');
      return;
    }
    toast.show(approve ? 'Driver verified' : 'Driver rejected', approve ? 'success' : 'warning');
    setSelected(null);
    setRejectReason('');
    load();
  };

  return (
    <Screen>
      <ScreenHeader title="Driver verifications" subtitle="Review documents and approve drivers" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'pending', label: 'Pending' },
          { key: 'verified', label: 'Verified' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'suspended', label: 'Suspended' },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState icon="verified-user" title={`No ${tab} drivers`} />
      ) : (
        rows.map((d) => (
          <Card key={d.id} onPress={() => setSelected(d)}>
            <Row justify="space-between">
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="bodyLg">{d.user?.full_name}</Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {d.vehicle_brand} {d.vehicle_model} · {d.seat_count} seats
                </Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  Plate {d.plate_decrypted}
                </Text>
              </Stack>
              <Badge label={d.status} variant={d.status === 'verified' ? 'success' : d.status === 'rejected' ? 'error' : 'warning'} />
            </Row>
          </Card>
        ))
      )}

      {selected ? (
        <Card accent={colors.primary} style={{ gap: spacing.md }}>
          <Section title={`Review · ${selected.user?.full_name}`} />
          <Banner
            variant="info"
            title="Field-encrypted PII"
            body="Decrypted only inside this admin session. Not exported to logs."
          />
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              ID number
            </Text>
            <Text variant="bodyMd">{maskId(selected.id_decrypted)}</Text>
          </Stack>
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              License
            </Text>
            <Text variant="bodyMd">{selected.license_decrypted}</Text>
          </Stack>
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              Plate
            </Text>
            <Text variant="bodyMd">{selected.plate_decrypted}</Text>
          </Stack>
          <Input
            label="Rejection reason (optional)"
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="e.g. License unreadable, please re-upload"
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label="Reject" variant="danger" onPress={() => decide(false)} loading={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Approve" variant="secondary" onPress={() => decide(true)} loading={busy} />
            </View>
          </Row>
          <Button label="Close" variant="ghost" onPress={() => setSelected(null)} />
        </Card>
      ) : null}
    </Screen>
  );
}
