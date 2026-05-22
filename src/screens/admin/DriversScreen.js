import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
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

const EMPTY_DRIVER_KEY = {
  pending: 'admin:noDriversPending',
  verified: 'admin:noDriversVerified',
  rejected: 'admin:noDriversRejected',
  suspended: 'admin:noDriversSuspended',
};

export default function AdminDrivers() {
  const { colors } = useTheme();
  const { t } = useLocale();
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
    toast.show(approve ? t('toast:driverVerified') : t('toast:driverRejected'), approve ? 'success' : 'warning');
    setSelected(null);
    setRejectReason('');
    load();
  };

  return (
    <Screen>
      <ScreenHeader title={t('admin:driverVerifications')} subtitle={t('admin:driverVerificationsSubtitle')} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'pending', label: t('admin:pending') },
          { key: 'verified', label: t('admin:verified') },
          { key: 'rejected', label: t('admin:rejected') },
          { key: 'suspended', label: t('admin:suspended') },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState icon="verified-user" title={t(EMPTY_DRIVER_KEY[tab] || 'admin:noDriversPending')} />
      ) : (
        rows.map((d) => (
          <Card key={d.id} onPress={() => setSelected(d)}>
            <Row justify="space-between">
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="bodyLg">{d.user?.full_name}</Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('driver:vehicleSummary', { brand: d.vehicle_brand, model: d.vehicle_model, count: d.seat_count })}
                </Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('driver:plateValue', { plate: d.plate_decrypted })}
                </Text>
              </Stack>
              <Badge label={d.status} variant={d.status === 'verified' ? 'success' : d.status === 'rejected' ? 'error' : 'warning'} />
            </Row>
          </Card>
        ))
      )}

      {selected ? (
        <Card accent={colors.primary} style={{ gap: spacing.md }}>
          <Section title={t('admin:reviewLabel', { name: selected.user?.full_name })} />
          <Banner
            variant="info"
            title={t('admin:fieldEncryptedTitle')}
            body={t('admin:fieldEncryptedBody')}
          />
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('admin:idNumber')}
            </Text>
            <Text variant="bodyMd">{maskId(selected.id_decrypted)}</Text>
          </Stack>
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('admin:license')}
            </Text>
            <Text variant="bodyMd">{selected.license_decrypted}</Text>
          </Stack>
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('driver:plate')}
            </Text>
            <Text variant="bodyMd">{selected.plate_decrypted}</Text>
          </Stack>
          <Input
            label={t('admin:rejectReason')}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder={t('admin:rejectReasonPlaceholder')}
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('admin:reject')} variant="danger" onPress={() => decide(false)} loading={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('admin:approve')} variant="secondary" onPress={() => decide(true)} loading={busy} />
            </View>
          </Row>
          <Button label={t('common:close')} variant="ghost" onPress={() => setSelected(null)} />
        </Card>
      ) : null}
    </Screen>
  );
}
