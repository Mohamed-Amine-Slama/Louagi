import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { Text } from './Text';
import { spacing, radius } from '../theme';

export function StepIndicator({ steps, current }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {steps.map((s, i) => {
        const active = i <= current;
        const last = i === steps.length - 1;
        return (
          <React.Fragment key={s}>
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  borderWidth: 2,
                  borderColor: active ? colors.secondaryContainer : colors.outlineVariant,
                  backgroundColor: active ? colors.secondaryContainer : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  variant="labelSm"
                  color={active ? colors.onSecondaryContainer : colors.outline}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                variant="labelSm"
                color={active ? colors.onSurface : colors.outline}
                style={{ marginTop: 4 }}
              >
                {s}
              </Text>
            </View>
            {!last ? (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  marginTop: -16,
                  backgroundColor: i < current ? colors.secondaryContainer : colors.outlineVariant,
                  marginHorizontal: 4,
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}
