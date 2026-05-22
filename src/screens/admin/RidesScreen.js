import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Banner } from '../../components/Banner';
import { Tabs } from '../../components/Tabs';
import { Stack, Row, Section } from '../../components/Section';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';
import { formatDateTime } from '../../i18n/format';

export default function AdminRides() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('scheduled');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await ridesApi.adminListRides({ filters: { status } }));
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cancel = async () => {
    setBusy(true);
    const res = await ridesApi.cancelRide({ actor: user, rideId: selected.id, reason: 'admin-cancel' });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(t('toast:rideCancelledAdmin', { count: res.cancelled }), 'warning');
    setSelected(null);
    load();
  };

  return (
    <Screen>
      <ScreenHeader title={t('admin:rideOversight')} subtitle={t('admin:rideOversightSubtitle')} />
      <Tabs
        value={status}
        onChange={setStatus}
        tabs={[
          { key: 'scheduled', label: t('admin:scheduled') },
          { key: 'in_progress', label: t('admin:live') },
          { key: 'completed', label: t('admin:done') },
          { key: 'cancelled', label: t('admin:cancelled') },
        ]}
      />

      {rows.map((r) => {
        const sold = (r.total_seats ?? 0) - r.available_seats;
        return (
          <Card key={r.id} onPress={() => setSelected(r)}>
            <Row justify="space-between">
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="bodyLg">
                  {r.route?.origin_city} → {r.route?.destination_city}
                </Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {formatDateTime(r.departure_time)}
                </Text>
              </Stack>
              <Badge label={`${sold}/${r.total_seats}`} variant="info" icon="event-seat" />
            </Row>
          </Card>
        );
      })}

      {selected ? (
        <Card style={{ gap: spacing.md }} accent={colors.error}>
          <Section title={t('admin:cancelRide')} />
          <Banner
            variant="warning"
            title={t('admin:adminOverrideTitle')}
            body={t('admin:adminOverrideBody')}
          />
          <Text variant="bodyMd">
            {selected.route?.origin_city} → {selected.route?.destination_city}
          </Text>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('admin:departureAt', { at: formatDateTime(selected.departure_time) })}
          </Text>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('common:close')} variant="outline" onPress={() => setSelected(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('admin:cancelAndRefund')} variant="danger" onPress={cancel} loading={busy} />
            </View>
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
