import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
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
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn } from '../../components/motion';

import { reservationsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatDateTime } from '../../i18n/format';

export default function BookingConfirmScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { id } = route.params || {};
  const [pkg, setPkg] = useState(null);

  useEffect(() => {
    reservationsApi.getReservation({ actor: user, id }).then(setPkg);
  }, [id, user]);

  if (!pkg) {
    return (
      <Screen>
        <SkeletonList count={3} lines={2} />
      </Screen>
    );
  }

  const { reservation, ride, route: r, driverUser, payment } = pkg;
  const dep = new Date(ride.departure_time);

  const isCancelled = reservation.status === 'cancelled';
  const isExpired = ride && (ride.status === 'in_progress' || ride.status === 'completed');

  let headerTitle = t('booking:confirmedTitle');
  let headerSubtitle = t('booking:confirmedSubtitle');
  let statusText = t('booking:youAreBooked');
  let statusIcon = 'check';
  let iconColor = colors.success;
  let iconBgColor = colors.successContainer;
  let wrapperBgColor = withAlpha(colors.success, 0.08);

  if (isCancelled) {
    headerTitle = t('booking:cancelledTitle');
    headerSubtitle = t('booking:cancelledSubtitle');
    statusText = t('booking:ticketCancelled');
    statusIcon = 'close';
    iconColor = colors.error;
    iconBgColor = colors.errorContainer;
    wrapperBgColor = withAlpha(colors.error, 0.08);
  } else if (isExpired) {
    headerTitle = t('booking:expiredTitle');
    headerSubtitle = t('booking:expiredSubtitle');
    statusText = t('booking:ticketExpired');
    statusIcon = 'history';
    iconColor = colors.outline;
    iconBgColor = colors.surfaceVariant;
    wrapperBgColor = withAlpha(colors.onSurface, 0.08);
  }

  return (
    <Screen>
      <ScreenHeader title={headerTitle} subtitle={headerSubtitle} showBack />
      <FadeSlideIn index={0}>
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radius.full,
              backgroundColor: wrapperBgColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.full,
                backgroundColor: iconBgColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name={statusIcon} size={36} color={iconColor} />
            </View>
          </View>
          <Text variant="headlineMd">{statusText}</Text>
          <Badge label={t('booking:ref', { id: reservation?.id?.slice(0, 8)?.toUpperCase() || '—' })} variant={isCancelled ? 'error' : isExpired ? 'warning' : 'info'} icon="confirmation-number" />
        </Card>
      </FadeSlideIn>

      <FadeSlideIn index={1}>
        <Card>
          <RouteTimeline
            origin={r.origin_city}
            destination={r.destination_city}
            departureLabel={formatDateTime(dep)}
            arrivalLabel={t('booking:minRide', { minutes: r.estimated_duration_min })}
          />
        </Card>
      </FadeSlideIn>

      <FadeSlideIn index={2}>
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
              <Text variant="bodyMd" color={colors.success}>{reservation.total_price} {t('common:tnd')}</Text>
            </Row>
            {Number(reservation.discount_pct) > 0 ? (
              <Row justify="space-between">
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('booking:loyaltyDiscount')}
                </Text>
                <Text variant="bodyMd" color={colors.success}>−{Number(reservation.discount_pct)}%</Text>
              </Row>
            ) : null}
            <Row justify="space-between">
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('booking:reservationFee')}
              </Text>
              <Text variant="bodyMd">3.000 {t('common:tnd')}</Text>
            </Row>
            <Row justify="space-between">
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('booking:expiryDate')}
              </Text>
              <Text variant="bodyMd">{formatDateTime(dep)}</Text>
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
      </FadeSlideIn>

      <FadeSlideIn index={3} style={{ gap: spacing.md }}>
        <Button label={t('booking:backToBookings')} variant="secondary" iconLeft="event" onPress={() => nav.navigate('Tabs', { screen: 'Bookings' })} />
        <Button label={t('booking:searchMore')} variant="outline" onPress={() => nav.navigate('Tabs', { screen: 'Search' })} />
      </FadeSlideIn>
    </Screen>
  );
}
