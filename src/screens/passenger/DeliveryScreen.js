import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Row, Stack } from '../../components/Section';
import { SectionLabel } from '../../components/SectionLabel';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { deliveriesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { formatDateTime } from '../../i18n/format';
import { MONO, PASS, cityCode } from '../../lib/tickets';

export default function DeliveryScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigation();

  const [availableRides, setAvailableRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pricing, setPricing] = useState(null);
  const price = pricing?.price;

  // Flat delivery price comes from the DB (app_config), not a bundled constant.
  useEffect(() => {
    deliveriesApi.getDeliveryPricing().then(setPricing);
  }, []);

  const load = useCallback(async () => {
    const res = await deliveriesApi.listAvailableDeliveryRides({});
    setAvailableRides(res);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const book = async () => {
    if (!selectedRide) return;
    setSubmitting(true);
    const res = await deliveriesApi.createDelivery({ actor: user, rideId: selectedRide.id, description });
    setSubmitting(false);
    if (!res.ok) {
      toast.show(res.error, 'error');
      return;
    }
    toast.show(t('delivery:receiptTitle'), 'success');
    setSelectedRide(null);
    setDescription('');
    nav.navigate('Tabs', { screen: 'Bookings' });
  };

  const startNewDelivery = () => {
    if (availableRides.length > 0) {
      setSelectedRide(availableRides[0]);
      setDescription('');
    }
  };

  return (
    <Screen>
      {/* Header */}
      <Row align="center" justify="space-between" gap={spacing.md} style={{ marginTop: spacing.xs }}>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text variant="headlineMd">{t('delivery:title')}</Text>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>{t('delivery:subtitle')}</Text>
        </Stack>
        <Button
          label={t('delivery:trackParcelShort')}
          variant="ghost"
          iconLeft="search"
          small
          fullWidth={false}
          onPress={() => nav.navigate('MyDeliveries')}
        />
      </Row>

      {/* Send-a-box hero */}
      <FadeSlideIn index={0}>
        <View style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
          <LinearGradient colors={['#031634', '#0A2247', '#5A132A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: spacing.lg }}>
            <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.4, color: PASS.onNavyMut, marginBottom: spacing.sm }}>
              {t('delivery:sendBoxKicker').toUpperCase()}
            </Text>
            <Text variant="headlineSm" color={PASS.onNavy} style={{ maxWidth: 230, marginBottom: spacing.md }}>
              {t('delivery:sendBoxTitle')}
            </Text>
            <Button label={t('delivery:newDelivery')} variant="secondary" iconLeft="add" fullWidth={false} onPress={startNewDelivery} />
            <MaterialIcons name="inventory-2" size={56} color="rgba(255,255,255,0.18)" style={{ position: 'absolute', end: spacing.lg, bottom: spacing.md }} />
          </LinearGradient>
        </View>
      </FadeSlideIn>

      {/* How it works */}
      <FadeSlideIn index={1}>
        <Row gap={spacing.sm}>
          <HowStep icon="archive" label={t('delivery:stepDrop')} />
          <HowStep icon="local-shipping" label={t('delivery:stepRide')} />
          <HowStep icon="check-circle" label={t('delivery:stepCollect')} tone="success" />
        </Row>
      </FadeSlideIn>

      {/* Routes with space */}
      <Row justify="space-between" align="center" style={{ marginTop: spacing.xs }}>
        <Text variant="headlineSm">{t('delivery:routesWithSpace')}</Text>
        {!loading ? (
          <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('delivery:routesCount', { count: availableRides.length })}</Text>
        ) : null}
      </Row>

      {loading ? (
        <SkeletonList count={3} lines={2} />
      ) : availableRides.length === 0 ? (
        <EmptyState icon="inventory" title={t('delivery:noDeliveries')} />
      ) : (
        <Stack gap={spacing.md}>
          {availableRides.map((ride, index) => {
            const total = ride.max_delivery_slots || 0;
            const taken = ride.delivery_slots_taken || 0;
            const free = Math.max(0, total - taken);
            const fillPct = total ? Math.round((taken / total) * 100) : 0;
            const selected = selectedRide?.id === ride.id;
            return (
              <FadeSlideIn key={ride.id} index={Math.min(index, 8)}>
                <Card accent={selected ? colors.secondaryContainer : undefined}>
                  <Row gap={spacing.md} align="center">
                    <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="inventory-2" size={22} color={colors.primary} />
                    </View>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="labelMd" numberOfLines={1}>
                        {ride.route?.origin_city} → {ride.route?.destination_city}
                      </Text>
                      <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.onSurfaceVariant }} numberOfLines={1}>
                        {cityCode(ride.route?.origin_city)} → {cityCode(ride.route?.destination_city)} · {formatDateTime(ride.departure_time)}
                      </Text>
                    </Stack>
                    <Stack gap={0} style={{ alignItems: 'flex-end' }}>
                      <Text variant="labelMd" color={colors.secondaryContainer} numberOfLines={1}>{price ?? '—'} {t('common:tnd')}</Text>
                      <Text variant="labelXs" color={colors.onSurfaceVariant}>{t('delivery:from')}</Text>
                    </Stack>
                  </Row>

                  <Row gap={spacing.md} align="center" style={{ marginTop: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${fillPct}%`, backgroundColor: colors.primary, borderRadius: radius.full }} />
                      </View>
                      <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginTop: 6 }}>
                        {t('delivery:slotsFree', { free, total })}
                      </Text>
                    </View>
                    {!selected ? (
                      <Button label={t('delivery:reserve')} variant="primary" small fullWidth={false} onPress={() => { setSelectedRide(ride); setDescription(''); }} />
                    ) : null}
                  </Row>

                  {selected ? (
                    <FadeSlideIn style={{ marginTop: spacing.md, gap: spacing.sm }}>
                      {price != null ? (
                        <Text variant="labelSm" color={colors.onSurfaceVariant}>
                          {t('delivery:fixedPrice', { price })}
                        </Text>
                      ) : null}
                      <TextInput
                        placeholder={t('delivery:itemDescription')}
                        value={description}
                        onChangeText={setDescription}
                        style={{
                          borderWidth: 1,
                          borderColor: colors.outlineVariant,
                          borderRadius: radius.md,
                          padding: 12,
                          color: colors.onSurface,
                          backgroundColor: colors.surfaceContainerHigh,
                        }}
                        placeholderTextColor={colors.onSurfaceVariant}
                      />
                      <Row gap={spacing.sm}>
                        <View style={{ flex: 1 }}>
                          <Button label={t('common:cancel')} variant="ghost" onPress={() => { setSelectedRide(null); setDescription(''); }} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button label={t('delivery:bookDelivery')} onPress={book} loading={submitting} />
                        </View>
                      </Row>
                    </FadeSlideIn>
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

function HowStep({ icon, label, tone }) {
  const { colors } = useTheme();
  const fg = tone === 'success' ? colors.success : colors.primary;
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.lg, backgroundColor: withAlpha(fg, 0.12), alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
        <MaterialIcons name={icon} size={18} color={fg} />
      </View>
      <Text variant="labelMd">{label}</Text>
    </Card>
  );
}
