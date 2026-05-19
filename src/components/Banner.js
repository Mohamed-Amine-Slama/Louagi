import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing, withAlpha } from '../theme';

export function Banner({ variant = 'info', title, body, icon }) {
  const { colors } = useTheme();
  const variants = {
    info: { bg: withAlpha(colors.primary, 0.08), fg: colors.primary, icon: 'info' },
    warning: { bg: withAlpha(colors.secondaryContainer, 0.18), fg: colors.onSecondaryContainer, icon: 'warning-amber' },
    error: { bg: withAlpha(colors.error, 0.1), fg: colors.error, icon: 'error-outline' },
    success: { bg: withAlpha(colors.success, 0.12), fg: colors.success, icon: 'check-circle' },
  };
  const v = variants[variant] ?? variants.info;
  return (
    <View
      style={{
        backgroundColor: v.bg,
        borderRadius: radius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'flex-start',
      }}
    >
      <MaterialIcons name={icon || v.icon} size={22} color={v.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="labelMd" color={v.fg}>
            {title}
          </Text>
        ) : null}
        {body ? (
          <Text variant="bodySm" color={v.fg}>
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
