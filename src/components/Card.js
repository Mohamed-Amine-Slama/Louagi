import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Pressable } from 'react-native';
import { radius, spacing, shadows } from '../theme';

export function Card({
  children,
  style,
  padding = spacing.md,
  onPress,
  raised = true,
  accent,
  allowOverflow = false,
}) {
  const { colors } = useTheme();
  const node = (
    <View
      style={[
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: radius.xl,
          padding,
          overflow: allowOverflow ? 'visible' : 'hidden',
        },
        raised ? shadows.card : null,
        accent ? { borderStartWidth: 4, borderStartColor: accent } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {node}
      </Pressable>
    );
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
