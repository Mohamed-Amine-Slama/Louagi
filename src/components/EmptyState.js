import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { spacing, radius } from '../theme';

export function EmptyState({ icon = 'inbox', title, body, actionLabel, onAction }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
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
        <MaterialIcons name={icon} size={32} color={colors.onSurfaceVariant} />
      </View>
      <Text variant="headlineSm">{title}</Text>
      {body ? (
        <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
          {body}
        </Text>
      ) : null}
      {actionLabel ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
