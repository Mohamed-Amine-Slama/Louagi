// Driver-dashboard control for sharing live location with passengers tracking a
// parcel on the driver's trip. Wraps DriverLocationContext.

import React from 'react';
import { View, Switch, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from './Card';
import { Text } from './Text';
import { Row, Stack } from './Section';
import { PressableScale } from './motion';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useDriverLocation } from '../context/DriverLocationContext';
import { spacing, radius, withAlpha } from '../theme';
import { updatedAgo } from '../i18n/format';

export function DriverLiveLocationCard() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { sharing, permission, lastFix, error, toggle } = useDriverLocation();

  const denied = permission === 'denied' || error === 'permission';
  const accent = sharing ? colors.success : colors.onSurfaceVariant;

  const statusLine = sharing
    ? lastFix
      ? updatedAgo(lastFix.at, t)
      : t('delivery:sharingWaiting')
    : t('delivery:sharingOff');

  return (
    <Card>
      <Row gap={spacing.md} align="center">
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.lg,
            backgroundColor: withAlpha(accent, 0.14),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={sharing ? 'my-location' : 'location-off'} size={22} color={accent} />
        </View>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Row gap={spacing.sm} align="center">
            <Text variant="labelMd">{t('delivery:shareLocationTitle')}</Text>
            {sharing ? (
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
            ) : null}
          </Row>
          <Text variant="bodySm" color={sharing ? colors.success : colors.onSurfaceVariant} numberOfLines={1}>
            {sharing ? t('delivery:sharingOn') : statusLine}
          </Text>
          {sharing ? (
            <Text variant="labelXs" color={colors.onSurfaceVariant} numberOfLines={1}>{statusLine}</Text>
          ) : null}
        </Stack>
        <Switch
          value={sharing}
          onValueChange={toggle}
          trackColor={{ true: withAlpha(colors.success, 0.5), false: colors.surfaceContainerHigh }}
          thumbColor={sharing ? colors.success : colors.surfaceContainerLowest}
        />
      </Row>

      {denied ? (
        <Row gap={spacing.sm} align="center" justify="space-between" style={{ marginTop: spacing.md }}>
          <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
            {t('delivery:locationPermissionBody')}
          </Text>
          <PressableScale
            onPress={() => Linking.openSettings()}
            scaleTo={0.95}
            style={{
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: radius.full,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Text variant="labelSm" color={colors.primary}>{t('delivery:openSettings')}</Text>
          </PressableScale>
        </Row>
      ) : (
        <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ marginTop: spacing.md }}>
          {t('delivery:sharingBody')}
        </Text>
      )}
    </Card>
  );
}
