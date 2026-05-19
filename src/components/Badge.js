import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing, withAlpha } from '../theme';

export function Badge({ label, variant = 'info', icon }) {
  const { colors } = useTheme();
  const tone = {
    success: { bg: withAlpha(colors.success, 0.12), fg: colors.success },
    warning: { bg: withAlpha(colors.secondaryContainer, 0.18), fg: colors.onSecondaryContainer },
    info: { bg: withAlpha(colors.primary, 0.1), fg: colors.primary },
    error: { bg: withAlpha(colors.error, 0.1), fg: colors.error },
    neutral: { bg: colors.surfaceContainerHigh, fg: colors.onSurfaceVariant },
  };
  const t = tone[variant] ?? tone.info;
  return (
    <View
      style={{
        backgroundColor: t.bg,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <MaterialIcons name={icon} size={12} color={t.fg} /> : null}
      <Text variant="labelSm" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}
