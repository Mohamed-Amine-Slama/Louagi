import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { Text } from './Text';
import { passwordStrength } from '../validation/schemas';
import { radius, spacing } from '../theme';

const palette = ['#ba1a1a', '#ba1a1a', '#feae2c', '#feae2c', '#198754', '#198754'];

export function PasswordStrength({ value }) {
  const { colors } = useTheme();
  const { score, label } = passwordStrength(value);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: radius.full,
              backgroundColor: i < score ? palette[score] : colors.surfaceContainer,
            }}
          />
        ))}
      </View>
      <Text variant="labelSm" color={colors.onSurfaceVariant}>
        Strength: {label}
      </Text>
    </View>
  );
}
