import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { RouteTimeline } from '../../components/RouteTimeline';
import { Stack, Row } from '../../components/Section';
import { ScreenHeader } from '../../components/Header';

import { reservationsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius } from '../../theme';
import { formatDateTime } from '../../i18n/format';

export default function BookingConfirmScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { id } = route.params;
  const [pkg, setPkg] = useState(null);

  useEffect(() => {
    reservationsApi.getReservation({ actor: user, id }).then(setPkg);
  }, [id, user]);

  if (!pkg) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const { reservation, ride, route: r, driverUser, payment } = pkg;
  const dep = new Date(ride.departure_time);

  return (
    <Screen>
      <ScreenHeader title={t('booking:confirmedTitle')} subtitle={t('booking:confirmedSubtitle')} showBack />
      <Card style={{ alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: radius.full,
            backgroundColor: colors.successContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="check" size={42} color={colors.success} />
        </View>
        <Text variant="headlineMd">{t('booking:youAreBooked')}</Text>
        <Badge label={t('booking:ref', { id: reservation.id.slice(0, 8).toUpperCase() })} variant="info" icon="confirmation-number" />
      </Card>

      <Card>
        <RouteTimeline
          origin={r.origin_city}
          destination={r.destination_city}
          departureLabel={formatDateTime(dep)}
          arrivalLabel={t('booking:minRide', { minutes: r.estimated_duration_min })}
        />
      </Card>

      <Card>
        <Stack gap={spacing.sm}>
          <Row justify="space-between">
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('passenger:driverShort')}
            </Text>
            <Text variant="bodyMd">{driverUser?.full_name}</Text>
          </Row>
          <Row justify="space-between">
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('passenger:seatsShort')}
            </Text>
            <Text variant="bodyMd">{reservation.seats_booked}</Text>
          </Row>
          <Row justify="space-between">
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('booking:paid')}
            </Text>
            <Text variant="bodyMd">{reservation.total_price} {t('common:tnd')}</Text>
          </Row>
          <Row justify="space-between">
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('booking:reservationFee')}
            </Text>
            <Text variant="bodyMd">3.000 {t('common:tnd')}</Text>
          </Row>
          <Row justify="space-between">
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('booking:gatewayRef')}
            </Text>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {payment?.gateway_reference ?? '—'}
            </Text>
          </Row>
        </Stack>
      </Card>

      <Button label={t('booking:backToBookings')} variant="secondary" iconLeft="event" onPress={() => nav.navigate('Tabs', { screen: 'Bookings' })} />
      <Button label={t('booking:searchMore')} variant="outline" onPress={() => nav.navigate('Tabs', { screen: 'Search' })} />
    </Screen>
  );
}
