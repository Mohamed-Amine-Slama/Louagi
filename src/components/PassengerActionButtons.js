import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  discountPct = 0,
  discountAmount = 0,
  total,
  onBook,
  submitting,
  insets
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const seatCost = seats * pricePerSeat;

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
      {discountPct > 0 ? (
        // With a loyalty discount the inline "a + b = c" row no longer reads
        // cleanly, so break the fare, discount, fee and total onto their own lines.
        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {seats} × {pricePerSeat} {t('common:tnd')}
            </Text>
            <Text variant="labelMd">{seatCost} {t('common:tnd')}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <View style={styles.discountLabel}>
              <MaterialIcons name="local-offer" size={14} color={colors.success} />
              <Text variant="bodySm" color={colors.success}>
                {t('ride:loyaltyDiscount', { pct: discountPct })}
              </Text>
            </View>
            <Text variant="labelMd" color={colors.success}>
              −{discountAmount.toFixed(3)} {t('common:tnd')}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>{t('ride:bookingFee')}</Text>
            <Text variant="labelMd" color={colors.warning}>
              {reservationFee.toFixed(3)} {t('common:tnd')}
            </Text>
          </View>
          <View style={[styles.breakdownDivider, { backgroundColor: colors.outlineVariant }]} />
          <View style={styles.breakdownRow}>
            <Text variant="labelMd">{t('ride:total')}</Text>
            <Text variant="headlineSm" color={colors.primary}>{total} {t('common:tnd')}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.priceRow}>
          <View style={styles.priceItem}>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {seats} × {pricePerSeat} {t('common:tnd')}
            </Text>
            <Text variant="labelMd">{seatCost} {t('common:tnd')}</Text>
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
      )}

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
  breakdown: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 2,
  },
  bookButton: {
    height: 56,
  },
});
