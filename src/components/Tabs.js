import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { spacing } from '../theme';

export function Tabs({ tabs, value, onChange }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        marginHorizontal: -spacing.containerMargin,
        paddingHorizontal: spacing.containerMargin,
      }}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'center' }}
          >
            <Text variant="labelMd" color={active ? colors.onSurface : colors.onSurfaceVariant}>
              {t.label}
            </Text>
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -1,
                height: 3,
                backgroundColor: active ? colors.secondaryContainer : 'transparent',
                borderRadius: 2,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
