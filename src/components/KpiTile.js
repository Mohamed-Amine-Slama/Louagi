import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing, withAlpha, shadows } from '../theme';

// Dashboard stat tile: tinted icon squircle + value + label (+ optional delta).
// Value stays onSurface for max contrast; only the icon carries the tone.
export function KpiTile({ icon, value, label, tone = 'primary', delta, style }) {
  const { colors } = useTheme();
  const tones = {
    primary: { tint: withAlpha(colors.primary, 0.1), fg: colors.primary },
    accent: { tint: withAlpha(colors.secondaryContainer, 0.12), fg: colors.secondaryContainer },
    success: { tint: withAlpha(colors.success, 0.12), fg: colors.success },
    warning: { tint: withAlpha(colors.warning, 0.15), fg: colors.warning },
    neutral: { tint: colors.surfaceContainerHigh, fg: colors.onSurfaceVariant },
  };
  const t = tones[tone] ?? tones.primary;
  const deltaUp = typeof delta === 'number' ? delta >= 0 : null;
  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: '45%',
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: radius.xl,
          padding: spacing.md,
          gap: spacing.sm,
          ...shadows.card,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.lg,
            backgroundColor: t.tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={icon} size={20} color={t.fg} />
        </View>
        {deltaUp !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <MaterialIcons
              name={deltaUp ? 'trending-up' : 'trending-down'}
              size={16}
              color={deltaUp ? colors.success : colors.error}
            />
            <Text variant="labelSm" color={deltaUp ? colors.success : colors.error}>
              {Math.abs(delta)}%
            </Text>
          </View>
        ) : null}
      </View>
      <View>
        <Text variant="headlineMd" numberOfLines={1}>
          {value}
        </Text>
        <Text variant="labelSm" color={colors.onSurfaceVariant} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}
