import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { View } from 'react-native';
import { Text } from './Text';
import { spacing, radius, withAlpha } from '../theme';

export function RouteTimeline({ origin, destination, departureLabel, arrivalLabel }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ alignItems: 'center', width: 24 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.full,
            backgroundColor: withAlpha(colors.secondaryContainer, 0.15),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: colors.secondaryContainer,
            }}
          />
        </View>
        <View
          style={{
            flex: 1,
            width: 2.5,
            borderRadius: radius.full,
            backgroundColor: colors.outlineVariant,
            marginVertical: spacing.xs,
          }}
        />
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.full,
            backgroundColor: withAlpha(colors.primary, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: radius.full,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'space-between', minHeight: 70 }}>
        <View>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {departureLabel || t('common:departure')}
          </Text>
          <Text variant="bodyLg">{origin}</Text>
        </View>
        <View>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {arrivalLabel || t('common:arrival')}
          </Text>
          <Text variant="bodyLg">{destination}</Text>
        </View>
      </View>
    </View>
  );
}
