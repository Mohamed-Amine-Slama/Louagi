import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from './Card';
import { Text } from './Text';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { spacing } from '../theme';
import { formatTime } from '../i18n/format';

function fmtDuration(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function RideCard({ ride, onPress }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const r = ride.route;
  const d = ride.driver;
  const seatTone = ride.available_seats <= 1 ? 'warning' : 'info';
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <View>
          <Text variant="headlineMd">{formatTime(ride.departure_time)}</Text>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>
            {fmtDuration(r?.estimated_duration_min)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="headlineMd" color={colors.primary}>
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
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: colors.secondaryContainer,
          }}
        />
        <Text variant="bodyMd">{r?.origin_city}</Text>
        <MaterialIcons name="arrow-forward" size={16} color={colors.onSurfaceVariant} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="star" size={14} color={colors.secondaryContainer} />
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
