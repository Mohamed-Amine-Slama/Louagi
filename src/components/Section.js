import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { Text } from './Text';
import { spacing } from '../theme';

export function Section({ title, action, children }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {title || action ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {title ? <Text variant="headlineSm">{title}</Text> : <View />}
          {action ?? null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Row({ children, gap = spacing.sm, align = 'center', justify = 'flex-start', style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Stack({ children, gap = spacing.sm, style }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
