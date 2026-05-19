import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing } from '../theme';

export function Stepper({ value, onChange, min = 1, max = 9, large = false }) {
  const { colors } = useTheme();
  const inc = () => onChange(Math.min(max, value + 1));
  const dec = () => onChange(Math.max(min, value - 1));
  const btn = (icon, fn, disabled) => (
    <Pressable
      onPress={fn}
      disabled={disabled}
      style={({ pressed }) => ({
        width: large ? 56 : 40,
        height: large ? 56 : 40,
        borderRadius: radius.full,
        backgroundColor: disabled
          ? colors.surfaceContainer
          : pressed
          ? colors.surfaceContainerHigh
          : colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <MaterialIcons name={icon} size={large ? 28 : 20} color={colors.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {btn('remove', dec, value <= min)}
      <Text variant={large ? 'displayLg' : 'headlineSm'}>{value}</Text>
      {btn('add', inc, value >= max)}
    </View>
  );
}
