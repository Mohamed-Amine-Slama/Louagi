import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Platform } from 'react-native';
import { radius, spacing, shadows } from '../theme';
import { PressableScale } from './motion';

// variants: 'elevated' (default white card + shadow), 'tonal' (flat tinted, no
// shadow), 'hero' (navy container for emphasis blocks — pair text with
// onPrimaryContainer/onPrimary).
export function Card({
  children,
  style,
  padding = spacing.md,
  onPress,
  raised = true,
  accent,
  variant = 'elevated',
  allowOverflow = false,
}) {
  const { colors } = useTheme();
  const variantBg = {
    elevated: colors.surfaceContainerLowest,
    tonal: colors.surfaceContainer,
    hero: colors.primaryContainer,
  };
  const elevated = raised && variant !== 'tonal';
  // Android composites an elevated + rounded + `overflow:'hidden'` view's
  // children onto a separate layer that can paint blank — the card surface
  // shows (a white rectangle) but its content doesn't until the view is
  // re-laid-out (e.g. switching tabs). Drop the clip for elevated cards on
  // Android; iOS/web have no such bug and keep the rounded clip.
  const overflow =
    allowOverflow || (elevated && Platform.OS === 'android') ? 'visible' : 'hidden';
  const node = (
    <View
      style={[
        {
          backgroundColor: variantBg[variant] ?? variantBg.elevated,
          borderRadius: radius.xl,
          padding,
          overflow,
        },
        elevated ? shadows.card : null,
        accent ? { borderStartWidth: 4, borderStartColor: accent } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return <PressableScale onPress={onPress}>{node}</PressableScale>;
  }
  return node;
}

export function Divider({ vertical, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: colors.outlineVariant }
          : { height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.sm },
        style,
      ]}
    />
  );
}
