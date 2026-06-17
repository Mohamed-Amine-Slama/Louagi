import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Row, Stack } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { deliveriesApi } from '../../api';
import { spacing, radius } from '../../theme';
import { formatDateTime } from '../../i18n/format';
import { MONO, cityCode } from '../../lib/tickets';

const STATUS_VARIANT = { pending: 'warning', confirmed: 'info', picked_up: 'info', delivered: 'success', cancelled: 'error' };
const STATUS_KEY = { pending: 'statusPending', confirmed: 'statusConfirmed', picked_up: 'statusPickedUp', delivered: 'statusDelivered', cancelled: 'statusCancelled' };

export default function MyDeliveriesScreen() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await deliveriesApi.listMyDeliveries({ actor: user });
    setDeliveries(Array.isArray(res) ? res : []);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Row gap={spacing.sm} align="center" style={{ marginTop: spacing.xs }}>
        <PressableScale
          onPress={() => nav.canGoBack() && nav.goBack()}
          hitSlop={10}
          scaleTo={0.9}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
        </PressableScale>
        <Stack gap={1} style={{ flex: 1 }}>
          <Text variant="headlineMd">{t('delivery:myParcels')}</Text>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>{t('delivery:myParcelsSubtitle')}</Text>
        </Stack>
      </Row>

      {loading ? (
        <SkeletonList count={3} lines={2} />
      ) : deliveries.length === 0 ? (
        <EmptyState icon="inventory-2" title={t('delivery:noParcels')} body={t('delivery:noParcelsBody')} />
      ) : (
        <Stack gap={spacing.md}>
          {deliveries.map((d, i) => {
            const live = d.ride?.status === 'in_progress' && ['confirmed', 'picked_up'].includes(d.status);
            const terminal = ['delivered', 'cancelled'].includes(d.status);
            return (
              <FadeSlideIn key={d.id} index={Math.min(i, 8)}>
                <Card accent={live ? colors.success : undefined}>
                  <Row gap={spacing.md} align="center">
                    <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="inventory-2" size={22} color={colors.primary} />
                    </View>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="labelMd" numberOfLines={1}>
                        {d.ride?.origin_city} → {d.ride?.destination_city}
                      </Text>
                      <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.onSurfaceVariant }} numberOfLines={1}>
                        {cityCode(d.ride?.origin_city)} → {cityCode(d.ride?.destination_city)} · {formatDateTime(d.ride?.departure_time, { locale })}
                      </Text>
                    </Stack>
                    <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                      {live ? (
                        <Badge label={t('delivery:liveNow')} variant="success" icon="circle" />
                      ) : (
                        <Badge label={t(`delivery:${STATUS_KEY[d.status] || 'statusPending'}`)} variant={STATUS_VARIANT[d.status] || 'neutral'} />
                      )}
                      <Text variant="labelSm" color={colors.onSurfaceVariant}>{d.price} {t('common:tnd')}</Text>
                    </Stack>
                  </Row>

                  {!terminal ? (
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        label={t('delivery:trackLive')}
                        variant={live ? 'primary' : 'outline'}
                        iconLeft="location-on"
                        onPress={() => nav.navigate('TrackDelivery', { deliveryId: d.id })}
                      />
                    </View>
                  ) : null}
                </Card>
              </FadeSlideIn>
            );
          })}
        </Stack>
      )}
    </Screen>
  );
}
