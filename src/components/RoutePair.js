import React from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { spacing } from '../theme';

// Renders "from → to" with an arrow that mirrors under RTL so it always
// reads correctly. Use instead of `${origin} → ${destination}` template
// strings.
export function RoutePair({ from, to, variant = 'bodyLg', size = 16, color }) {
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const arrow = isRTL ? 'arrow-back' : 'arrow-forward';
  const fg = color || colors.onSurface;
  const arrowFg = color || colors.onSurfaceVariant;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Text variant={variant} color={fg}>
        {from}
      </Text>
      <MaterialIcons name={arrow} size={size} color={arrowFg} />
      <Text variant={variant} color={fg}>
        {to}
      </Text>
    </View>
  );
}
