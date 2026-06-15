import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Stack, Row } from '../../components/Section';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { deliveriesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha, shadows } from '../../theme';
import { PASS, initialsOf } from '../../lib/tickets';

const SEVERITY_TIER_KEY = { 1: 'delivery:tierStandard', 2: 'delivery:tierSensitive', 3: 'delivery:tierCritical' };

export default function DriverDeliveryScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const route = useRoute();
  const nav = useNavigation();
  const rideId = route.params?.rideId;
  const toast = useToast();

  const [deliveries, setDeliveries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  const load = useCallback(async () => {
    const res = await deliveriesApi.listRideDeliveries({ actor: user, rideId });
    setDeliveries(res);
    setLoading(false);
  }, [rideId, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  // `rideId` means we arrived from ride management (always show the list). On
  // the standalone tab the driver opts in; opting in (or having live parcels)
  // reveals the active view.
  const showEnabled = !!rideId || enabled || deliveries.length > 0;
  const standalone = !rideId;

  if (loading) {
    return (
      <Screen>
        <Text variant="headlineMd" style={{ marginTop: spacing.xs }}>{t('passenger:deliveries')}</Text>
        <SkeletonList count={3} lines={2} />
      </Screen>
    );
  }

  // Off state — opt-in prompt.
  if (!showEnabled) {
    return (
      <Screen>
        <Text variant="headlineMd" style={{ marginTop: spacing.xs }}>{t('passenger:deliveries')}</Text>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
          <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg }}>
            <View style={{ position: 'absolute', inset: 0, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh }} />
            <View style={{ position: 'absolute', top: 14, left: 14, right: 14, bottom: 14, borderRadius: radius.full, backgroundColor: colors.surfaceContainerLowest }} />
            <MaterialIcons name="local-shipping" size={46} color={colors.primary} />
          </View>
          <Text variant="headlineSm">{t('delivery:noDeliveries')}</Text>
          <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: spacing.sm }}>
            {t('driver:enableDeliveriesBody')}
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <Button label={t('driver:enableDeliveries')} variant="secondary" iconLeft="add" fullWidth={false} onPress={() => setEnabled(true)} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Row justify="space-between" align="center" style={{ marginTop: spacing.xs }}>
        <Row gap={spacing.sm} align="center">
          {rideId ? (
            <PressableScale onPress={() => nav.canGoBack() && nav.goBack()} hitSlop={10} scaleTo={0.9} style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
            </PressableScale>
          ) : null}
          <Text variant="headlineMd">{t('passenger:deliveries')}</Text>
        </Row>
        {standalone ? (
          <Row gap={6} align="center" style={{ backgroundColor: withAlpha(colors.success, 0.14), borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
            <Text variant="labelSm" color={colors.success}>{t('driver:deliveryActive')}</Text>
          </Row>
        ) : null}
      </Row>

      {standalone ? (
        <Card>
          <Row gap={spacing.md} align="center">
            <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: withAlpha(colors.success, 0.14), alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="local-shipping" size={22} color={colors.success} />
            </View>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="labelMd">{t('driver:acceptingParcels')}</Text>
              <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={2}>{t('driver:enableDeliveriesBody')}</Text>
            </Stack>
          </Row>
        </Card>
      ) : null}

      {standalone ? (
        <Row gap={spacing.sm} align="center" style={{ marginTop: spacing.xs }}>
          <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: colors.secondaryContainer }} />
          <Text variant="headlineSm">{t('driver:incomingRequests')}</Text>
        </Row>
      ) : null}

      {deliveries.length === 0 ? (
        <Card>
          <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center', paddingVertical: spacing.md }}>
            {t('delivery:noDeliveries')}
          </Text>
        </Card>
      ) : (
        <Stack gap={spacing.md}>
          {deliveries.map((d, i) => {
            const camelStatus = d.status.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            const transKey = `delivery:status${camelStatus.charAt(0).toUpperCase() + camelStatus.slice(1)}`;
            return (
              <FadeSlideIn key={d.id} index={Math.min(i, 8)}>
                <Card>
                  <Row gap={spacing.md} align="center" style={{ marginBottom: spacing.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: PASS.driver, alignItems: 'center', justifyContent: 'center' }}>
                      <Text variant="labelSm" color="#fff">{initialsOf(d.user?.full_name)}</Text>
                    </View>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="labelMd" numberOfLines={1}>{d.user?.full_name}</Text>
                      <Text variant="labelSm" color={colors.onSurfaceVariant} numberOfLines={1}>
                        {t(SEVERITY_TIER_KEY[d.severity_tier] || '', { defaultValue: d.severity_label || '' })}
                        {d.item_description ? ` · ${d.item_description}` : ''}
                      </Text>
                    </Stack>
                    <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                      <Text variant="labelMd" color={colors.secondaryContainer} numberOfLines={1}>{d.price ?? 0} {t('common:tnd')}</Text>
                      <Badge label={t(transKey)} variant={d.status === 'delivered' ? 'success' : d.status === 'cancelled' ? 'error' : 'warning'} />
                    </Stack>
                  </Row>
                  {d.status === 'pending' || d.status === 'confirmed' ? (
                    <Button label={t('delivery:markPickedUp')} variant="primary" onPress={() => setStatus(d.id, 'picked_up')} loading={busy} />
                  ) : d.status === 'picked_up' ? (
                    <Button label={t('delivery:markDelivered')} variant="success" onPress={() => setStatus(d.id, 'delivered')} loading={busy} />
                  ) : null}
                </Card>
              </FadeSlideIn>
            );
          })}
        </Stack>
      )}

      {standalone ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button label={t('driver:pauseDeliveries')} variant="outline" iconLeft="pause" onPress={() => setEnabled(false)} />
        </View>
      ) : null}
    </Screen>
  );
}
