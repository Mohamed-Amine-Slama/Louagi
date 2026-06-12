import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Button } from './Button';
import { spacing } from '../theme';
import { FadeSlideIn, PressableScale } from './motion';

export function PassengerActionButtons({
  seats,
  pricePerSeat,
  reservationFee,
  total,
  onBook,
  submitting,
  insets
}) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <FadeSlideIn
      style={[
        styles.stickyBottom,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          shadowColor: colors.shadow,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>
            {seats} × {pricePerSeat} {t('common:tnd')}
          </Text>
          <Text variant="labelMd">{seats * pricePerSeat} {t('common:tnd')}</Text>
        </View>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>+</Text>
        <View style={styles.priceItem}>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>
            {t('ride:bookingFee')}
          </Text>
          <Text variant="labelMd" color={colors.warning}>
            {reservationFee.toFixed(3)} {t('common:tnd')}
          </Text>
        </View>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>=</Text>
        <View style={styles.priceItem}>
          <Text variant="labelMd" color={colors.onSurfaceVariant}>
            {t('ride:total')}
          </Text>
          <Text variant="headlineSm" color={colors.primary}>
            {total} {t('common:tnd')}
          </Text>
        </View>
      </View>

      <PressableScale
        onPress={onBook}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!submitting, busy: !!submitting }}
      >
        <View pointerEvents="none">
          <Button
            label={submitting ? t('ride:processingPayment') : t('ride:bookSeats', { count: seats })}
            variant="primary"
            loading={submitting}
            style={styles.bookButton}
          />
        </View>
      </PressableScale>
    </FadeSlideIn>
  );
}

const styles = StyleSheet.create({
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    elevation: 16,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priceItem: {
    alignItems: 'center',
  },
  bookButton: {
    height: 56,
  },
});
