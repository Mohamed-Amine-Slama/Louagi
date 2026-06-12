import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { Text } from './Text';
import { spacing } from '../theme';

// tick: small brand-red bar beside the title for visual rhythm. Disable it on
// colored/hero containers where red would clash.
export function Section({ title, subtitle, action, tick = true, style, children }) {
  const { colors } = useTheme();
  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {title || action ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
              {tick ? (
                <View
                  style={{
                    width: 4,
                    height: 16,
                    borderRadius: 2,
                    backgroundColor: colors.secondaryContainer,
                  }}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text variant="headlineSm" numberOfLines={1}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View />
          )}
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
