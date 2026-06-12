import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { spacing, radius, withAlpha } from '../theme';
import { FadeSlideIn } from './motion';

export function EmptyState({ icon = 'inbox', title, body, actionLabel, onAction }) {
  const { colors } = useTheme();
  return (
    <FadeSlideIn>
      <View
        style={{
          alignItems: 'center',
          paddingVertical: spacing.xl,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.full,
            backgroundColor: withAlpha(colors.primary, 0.06),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name={icon} size={32} color={colors.primary} />
          </View>
        </View>
        <Text variant="headlineSm" style={{ marginTop: spacing.xs }}>
          {title}
        </Text>
        {body ? (
          <Text
            variant="bodyMd"
            color={colors.onSurfaceVariant}
            style={{ textAlign: 'center', paddingHorizontal: spacing.lg }}
          >
            {body}
          </Text>
        ) : null}
        {actionLabel ? (
          <View style={{ marginTop: spacing.sm }}>
            <Button label={actionLabel} onPress={onAction} fullWidth={false} variant="secondary" />
          </View>
        ) : null}
      </View>
    </FadeSlideIn>
  );
}
