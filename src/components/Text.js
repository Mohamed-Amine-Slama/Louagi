import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Text as RNText } from 'react-native';
import { typography } from '../theme';

const variantMap = typography;

export function Text({ variant = 'bodyMd', color, style, children, numberOfLines, ...rest }) {
  const { colors } = useTheme();
  const base = variantMap[variant] || variantMap.bodyMd;
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[{ color: color || colors.onSurface }, base, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
