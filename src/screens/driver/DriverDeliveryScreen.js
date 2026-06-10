import React, { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { Stack, Row } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';

import { deliveriesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useToast } from '../../components/Toast';
import { spacing } from '../../theme';

const SEVERITY_TIER_KEY = { 1: 'delivery:tierStandard', 2: 'delivery:tierSensitive', 3: 'delivery:tierCritical' };

export default function DriverDeliveryScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const route = useRoute();
  const rideId = route.params?.rideId;
  const toast = useToast();

  const [deliveries, setDeliveries] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await deliveriesApi.listRideDeliveries({ actor: user, rideId });
    setDeliveries(res);
  }, [rideId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const setStatus = async (id, status) => {
    setBusy(true);
    const res = await deliveriesApi.updateDeliveryStatus({ actor: user, id, status });
    setBusy(false);
    if (!res.ok) {
      toast.show(res.error, 'error');
      return;
    }
    toast.show(t('common:save'), 'success');
    load();
  };

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('passenger:deliveries')} showBack={!!rideId} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {deliveries.length === 0 ? (
          <EmptyState icon="local-shipping" title={t('delivery:noDeliveries')} />
        ) : (
          deliveries.map(d => {
            const camelStatus = d.status.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            const transKey = `delivery:status${camelStatus.charAt(0).toUpperCase() + camelStatus.slice(1)}`;
            
            return (
              <Card key={d.id}>
                <Row gap={spacing.md} style={{ marginBottom: spacing.md }}>
                  <Avatar name={d.user?.full_name} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMd">{d.user?.full_name}</Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>{d.user?.phone_number}</Text>
                  </View>
                  <Badge
                    label={t(transKey)}
                    variant={d.status === 'delivered' ? 'success' : d.status === 'cancelled' ? 'error' : 'warning'}
                  />
                </Row>
                
                <Stack gap={4} style={{ marginBottom: spacing.md }}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('delivery:title')} - {t(SEVERITY_TIER_KEY[d.severity_tier] || '', { defaultValue: d.severity_label })}</Text>
                  {d.item_description && (
                    <Text variant="bodySm" color={colors.onSurfaceVariant}>{d.item_description}</Text>
                  )}
                  <Text variant="bodyMd" color={colors.primary}>{d.price ?? 0} {t('common:tnd')}</Text>
                </Stack>
                
                <Row gap={spacing.sm}>
                  {d.status === 'pending' || d.status === 'confirmed' ? (
                    <View style={{ flex: 1 }}>
                      <Button
                        label={t('delivery:markPickedUp')}
                        variant="primary"
                        onPress={() => setStatus(d.id, 'picked_up')}
                        loading={busy}
                      />
                    </View>
                  ) : d.status === 'picked_up' ? (
                    <View style={{ flex: 1 }}>
                      <Button
                        label={t('delivery:markDelivered')}
                        variant="success"
                        onPress={() => setStatus(d.id, 'delivered')}
                        loading={busy}
                      />
                    </View>
                  ) : null}
                </Row>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
