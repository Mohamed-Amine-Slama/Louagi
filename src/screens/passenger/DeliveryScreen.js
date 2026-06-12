import React, { useState, useCallback } from 'react';
import { View, TextInput, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Stack, Row } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn } from '../../components/motion';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { deliveriesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';
import { formatDateTime } from '../../i18n/format';

export default function DeliveryScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigation();

  const [availableRides, setAvailableRides] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const [selectedRide, setSelectedRide] = useState(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const book = async () => {
    if (!selectedRide) return;
    setSubmitting(true);
    const res = await deliveriesApi.createDelivery({
      actor: user,
      rideId: selectedRide.id,
      description
    });
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

  return (
    <Screen padded={false}>
      <LinearGradient
        colors={isDark ? [colors.surfaceContainerHighest, colors.background] : [colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: spacing.lg,
          paddingBottom: spacing.xl,
          borderBottomLeftRadius: radius.xxl,
          borderBottomRightRadius: radius.xxl,
        }}
      >
        <Text variant="headlineMd" color={isDark ? colors.onSurface : colors.onPrimary}>{t('delivery:title')}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {loading ? (
          <SkeletonList count={4} />
        ) : availableRides.length === 0 ? (
          <EmptyState icon="inventory" title={t('delivery:noDeliveries')} />
        ) : (
          availableRides.map((ride, index) => (
            <FadeSlideIn key={ride.id} index={Math.min(index, 8)}>
              <Card
                accent={selectedRide?.id === ride.id ? colors.secondaryContainer : undefined}
                onPress={() => { setSelectedRide(ride); }}
              >
                <Row justify="space-between">
                  <Stack gap={4}>
                    <Text variant="headlineSm">{ride.route?.origin_city} → {ride.route?.destination_city}</Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>{formatDateTime(ride.departure_time)}</Text>
                  </Stack>
                  <Badge label={t('delivery:availableSlots', { count: ride.max_delivery_slots - ride.delivery_slots_taken })} variant="info" />
                </Row>
                {selectedRide?.id === ride.id && (
                  <FadeSlideIn style={{ marginTop: spacing.md, gap: spacing.md }}>
                    <Text variant="labelMd">{t('delivery:priceLabel')}</Text>
                    <View style={{ gap: spacing.sm }}>
                      <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                        {t('delivery:fixedPrice', { price: '10.000' })}
                      </Text>
                    </View>
                    <TextInput
                      placeholder={t('delivery:itemDescription')}
                      value={description}
                      onChangeText={setDescription}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.outline,
                        borderRadius: radius.md,
                        padding: 12,
                        color: colors.onSurface,
                      }}
                      placeholderTextColor={colors.onSurfaceVariant}
                    />
                    <Button label={submitting ? t('common:loading') : t('delivery:bookDelivery')} onPress={book} loading={submitting} />
                  </FadeSlideIn>
                )}
              </Card>
            </FadeSlideIn>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
