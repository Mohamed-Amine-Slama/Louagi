import React, { useState, useCallback } from 'react';
import { View, TextInput, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Stack, Row } from '../../components/Section';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { deliveriesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing } from '../../theme';
import { formatDateTime } from '../../i18n/format';

export default function DeliveryScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigation();

  const [availableRides, setAvailableRides] = useState([]);
  
  const load = useCallback(async () => {
    const res = await deliveriesApi.listAvailableDeliveryRides({});
    setAvailableRides(res);
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
      <View style={{ backgroundColor: colors.primary, padding: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <Text variant="headlineMd" color={colors.onPrimary}>{t('delivery:title')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {availableRides.map(ride => (
          <Card key={ride.id} onPress={() => { setSelectedRide(ride); }}>
            <Row justify="space-between">
              <Stack gap={4}>
                <Text variant="headlineSm">{ride.route?.origin_city} → {ride.route?.destination_city}</Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>{formatDateTime(ride.departure_time)}</Text>
              </Stack>
              <Badge label={t('delivery:availableSlots', { count: ride.max_delivery_slots - ride.delivery_slots_taken })} variant="info" />
            </Row>
            {selectedRide?.id === ride.id && (
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
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
                  style={{ borderWidth: 1, borderColor: colors.outline, borderRadius: 8, padding: 12, color: colors.onSurface }}
                  placeholderTextColor={colors.onSurfaceVariant}
                />
                <Button label={submitting ? t('common:loading') : t('delivery:bookDelivery')} onPress={book} loading={submitting} />
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
