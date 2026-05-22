import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Pressable, ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing, shadows, floatingTabBar } from '../theme';

function buildPalette(colors) {
  return {
    primary: {
      bg: colors.primary,
      fg: colors.onPrimary,
      pressed: colors.primaryContainer,
    },
    secondary: {
      bg: colors.secondaryContainer,
      fg: colors.onSecondaryContainer,
      pressed: colors.secondaryFixed,
    },
    outline: {
      bg: 'transparent',
      fg: colors.primary,
      pressed: colors.surfaceContainer,
      border: colors.primary,
    },
    ghost: {
      bg: colors.surfaceContainer,
      fg: colors.onSurface,
      pressed: colors.surfaceContainerHigh,
    },
    danger: {
      bg: colors.errorContainer,
      fg: colors.onErrorContainer,
      pressed: colors.error,
    },
  };
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  iconRight,
  iconLeft,
  loading = false,
  disabled = false,
  fullWidth = true,
  small = false,
  style,
}) {
  const { colors } = useTheme();
  const palette = buildPalette(colors);
  const v = palette[variant] || palette.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: disabled ? colors.surfaceContainerHigh : pressed ? v.pressed : v.bg,
          borderRadius: radius.full,
          paddingVertical: small ? spacing.sm : spacing.md - 2,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border ?? 'transparent',
          opacity: disabled ? 0.55 : 1,
          ...shadows.soft,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {iconLeft ? <MaterialIcons name={iconLeft} size={20} color={v.fg} /> : null}
          <Text variant="labelMd" color={v.fg}>
            {label}
          </Text>
          {iconRight ? <MaterialIcons name={iconRight} size={20} color={v.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color, bg, size = 40 }) {
  const { colors } = useTheme();
  const fg = color ?? colors.onSurface;
  const background = bg ?? colors.surfaceContainer;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pressed ? colors.surfaceContainerHigh : background,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <MaterialIcons name={icon} size={size * 0.55} color={fg} />
    </Pressable>
  );
}

export function FAB({ icon, onPress, label }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: label ? spacing.lg : spacing.md,
          height: 56,
          borderRadius: radius.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.secondaryFixed : colors.secondaryContainer,
          position: 'absolute',
          end: spacing.lg,
          bottom: floatingTabBar.height + floatingTabBar.bottomGap + 8,
          ...shadows.floating,
        },
      ]}
    >
      <MaterialIcons name={icon} size={26} color={colors.onSecondaryContainer} />
      {label ? (
        <Text variant="labelMd" color={colors.onSecondaryContainer}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
