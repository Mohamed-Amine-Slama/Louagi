import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from './Card';
import { Text } from './Text';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { spacing, radius, withAlpha } from '../theme';
import { formatTime } from '../i18n/format';

function fmtDuration(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function RideCard({ ride, onPress }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLocale();
  const r = ride.route;
  const d = ride.driver;
  const seatTone = ride.available_seats <= 2 ? 'warning' : 'info';
  const arrow = isRTL ? 'arrow-back' : 'arrow-forward';
  const duration = fmtDuration(r?.estimated_duration_min);
  return (
    <Card onPress={onPress} accent={colors.secondaryContainer} style={{ marginBottom: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.sm,
        }}
      >
        <View>
          <Text variant="headlineSm">{formatTime(ride.departure_time)}</Text>
          {duration ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <MaterialIcons name="schedule" size={13} color={colors.onSurfaceVariant} />
              <Text variant="bodySm" color={colors.onSurfaceVariant}>
                {duration}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="headlineMd">
            {ride.price_per_seat} {t('common:tnd')}
          </Text>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('common:perSeat')}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: radius.full,
            backgroundColor: withAlpha(colors.secondaryContainer, 0.15),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 11,
              height: 11,
              borderRadius: radius.full,
              borderWidth: 2.5,
              borderColor: colors.secondaryContainer,
            }}
          />
        </View>
        <Text variant="bodyMd">{r?.origin_city}</Text>
        <MaterialIcons name={arrow} size={16} color={colors.onSurfaceVariant} />
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: radius.full,
            backgroundColor: withAlpha(colors.primary, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 11,
              height: 11,
              borderRadius: radius.full,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <Text variant="bodyMd">{r?.destination_city}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          paddingTop: spacing.sm,
        }}
      >
        <Avatar name={d?.full_name} size={36} badge={d?.status === 'verified'} />
        <View style={{ flex: 1 }}>
          <Text variant="labelMd">{d?.full_name ?? t('ride:driver')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MaterialIcons name="star" size={14} color={colors.warning} />
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {(d?.rating ?? 0).toFixed(1)} · {d?.vehicle_brand} {d?.vehicle_model}
            </Text>
          </View>
        </View>
        <Badge
          variant={seatTone}
          label={t('common:seatsCount', { count: ride.available_seats })}
          icon="event-seat"
        />
      </View>
    </Card>
  );
}
