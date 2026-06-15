import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Text } from './Text';

// Small spaced-out uppercase caption used above sections in the boarding-pass
// screens ("YOUR NEXT TRIP", "POPULAR ROUTES", "RECENT PAYMENTS").
export function SectionLabel({ children, color, style }) {
  const { colors } = useTheme();
  return (
    <Text
      variant="labelSm"
      color={color || colors.onSurfaceVariant}
      style={[{ letterSpacing: 1.4 }, style]}
    >
      {String(children).toUpperCase()}
    </Text>
  );
}
