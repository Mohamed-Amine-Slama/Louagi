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
  const [tier, setTier] = useState(1);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const book = async () => {
    if (!selectedRide) return;
    setSubmitting(true);
    const res = await deliveriesApi.createDelivery({
      actor: user,
      rideId: selectedRide.id,
      severityTier: tier,
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

  const TIER_PRICES = { 1: 7, 2: 9, 3: 12 };

  return (
    <Screen padded={false}>
      <View style={{ backgroundColor: colors.primary, padding: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <Text variant="headlineMd" color={colors.onPrimary}>{t('delivery:title')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {availableRides.map(ride => (
          <Card key={ride.id} onPress={() => { setSelectedRide(ride); setTier(1); }}>
            <Row justify="space-between">
              <Stack gap={4}>
                <Text variant="headlineSm">{ride.route?.origin_city} → {ride.route?.destination_city}</Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>{formatDateTime(ride.departure_time)}</Text>
              </Stack>
              <Badge label={t('delivery:availableSlots', { count: ride.max_delivery_slots - ride.delivery_slots_taken })} variant="info" />
            </Row>
            {selectedRide?.id === ride.id && (
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                <Text variant="labelMd">{t('delivery:selectTier')}</Text>
                <View style={{ gap: spacing.sm }}>
                  {[1, 2, 3].map(tLevel => {
                    const tierColors = {
                      1: { bg: '#16A34A', pressed: '#15803D', border: '#16A34A', fg: '#fff' }, // green  – Standard
                      2: { bg: '#E69500', pressed: '#CA8A04', border: '#E69500', fg: '#fff' }, // amber  – Sensitive
                      3: { bg: '#DC2626', pressed: '#B91C1C', border: '#DC2626', fg: '#fff' }, // red    – Critical
                    };
                    const tc = tierColors[tLevel];
                    const selected = tier === tLevel;
                    return (
                      <Button 
                        key={tLevel} 
                        label={`${t(`delivery:tier${tLevel === 1 ? 'Standard' : tLevel === 2 ? 'Sensitive' : 'Critical'}`)} - ${TIER_PRICES[tLevel]} ${t('common:tnd')}`} 
                        variant={selected ? 'primary' : 'outline'} 
                        onPress={() => setTier(tLevel)} 
                        style={selected
                          ? { backgroundColor: tc.bg, borderColor: tc.bg, borderWidth: 1.5 }
                          : { backgroundColor: 'transparent', borderColor: tc.border, borderWidth: 1.5 }
                        }
                      />
                    );
                  })}
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
