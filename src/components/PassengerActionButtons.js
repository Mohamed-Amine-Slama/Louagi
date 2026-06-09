import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Button } from './Button';
import { spacing } from '../theme';

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
    <View
      style={[
        styles.stickyBottom,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text variant="bodyMedium" color={colors.onSurfaceVariant}>
            {seats} × {pricePerSeat} {t('common:tnd')}
          </Text>
          <Text variant="titleSmall">{seats * pricePerSeat} {t('common:tnd')}</Text>
        </View>
        <Text variant="bodyMedium" color={colors.outline}>+</Text>
        <View style={styles.priceItem}>
          <Text variant="bodyMedium" color={colors.onSurfaceVariant}>
            {t('ride:bookingFee')}
          </Text>
          <Text variant="titleSmall" color={colors.warning}>
            {reservationFee.toFixed(3)} {t('common:tnd')}
          </Text>
        </View>
        <Text variant="bodyMedium" color={colors.outline}>=</Text>
        <View style={styles.priceItem}>
          <Text variant="titleSmall" color={colors.onSurfaceVariant}>
            {t('ride:total')}
          </Text>
          <Text variant="headlineSmall" color={colors.primary} style={{ fontWeight: '700' }}>
            {total} {t('common:tnd')}
          </Text>
        </View>
      </View>

      <Button
        label={submitting ? t('ride:processingPayment') : t('ride:bookSeats', { count: seats })}
        variant="primary"
        onPress={onBook}
        loading={submitting}
        style={styles.bookButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    elevation: 16,
    shadowColor: '#000',
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
