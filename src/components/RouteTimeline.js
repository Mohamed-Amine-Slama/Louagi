import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { Text } from './Text';
import { spacing } from '../theme';

export function RouteTimeline({ origin, destination, departureLabel, arrivalLabel }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ alignItems: 'center', width: 18 }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: colors.secondaryContainer,
          }}
        />
        <View style={{ flex: 1, width: 2, backgroundColor: colors.outlineVariant, marginVertical: 4 }} />
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.primary,
          }}
        />
      </View>
      <View style={{ flex: 1, justifyContent: 'space-between', minHeight: 70 }}>
        <View>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {departureLabel || 'Departure'}
          </Text>
          <Text variant="bodyLg">{origin}</Text>
        </View>
        <View>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {arrivalLabel || 'Arrival'}
          </Text>
          <Text variant="bodyLg">{destination}</Text>
        </View>
      </View>
    </View>
  );
}
