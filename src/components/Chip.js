import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing } from '../theme';
import { PressableScale } from './motion';

// Filter / selection pill. Selected = brand red, idle = tonal surface.
export function Chip({ label, icon, selected = false, onPress, disabled, style }) {
  const { colors } = useTheme();
  const bg = selected ? colors.secondaryContainer : colors.surfaceContainer;
  const fg = selected ? colors.onSecondaryContainer : colors.onSurfaceVariant;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.94}
      style={[
        {
          borderRadius: radius.full,
          backgroundColor: bg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor: selected ? colors.secondaryContainer : colors.outlineVariant,
          opacity: disabled ? 0.5 : 1,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon ? <MaterialIcons name={icon} size={16} color={fg} /> : null}
      <Text variant="labelMd" color={fg}>
        {label}
      </Text>
    </PressableScale>
  );
}
