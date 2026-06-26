import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Card } from './Card';
import { Row, Stack, Section } from './Section';
import { SPRING } from './motion';
import { spacing, radius, withAlpha } from '../theme';
import { DEFAULT_TIERS, PERK_META, tierIndexForPoints } from '../lib/tiers';
import { usersApi } from '../api';

const TIER_ICON = 'workspace-premium';

// Slide-up entering animation for the bottom sheet (mirrors RateDriverModal).
const sheetEntering = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 48 }, { scale: 0.97 }] },
    animations: {
      opacity: withTiming(1, { duration: 180 }),
      transform: [{ translateY: withSpring(0, SPRING) }, { scale: withSpring(1, SPRING) }],
    },
  };
};

// The loyalty ladder rows: every tier, the seat discount it grants, and its
// perks. The tier the passenger is on is highlighted; higher ones read as locked
// with the points needed to reach them.
function TierLadder({ list, currentIdx }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <Stack gap={spacing.xs}>
      {list.map((tier, i) => {
        const unlocked = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const accent = isCurrent ? colors.secondaryContainer : colors.primary;
        const perks = tier.perks || [];
        return (
          <View
            key={tier.id || tier.i18n_key}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.md,
              padding: spacing.sm,
              borderRadius: radius.lg,
              backgroundColor: isCurrent ? withAlpha(colors.secondaryContainer, 0.1) : 'transparent',
              borderWidth: 1,
              borderColor: isCurrent ? withAlpha(colors.secondaryContainer, 0.4) : 'transparent',
              opacity: unlocked ? 1 : 0.55,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: radius.full,
                backgroundColor: unlocked ? withAlpha(accent, 0.14) : colors.surfaceContainerHigh,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons
                name={unlocked ? TIER_ICON : 'lock'}
                size={20}
                color={unlocked ? accent : colors.onSurfaceVariant}
              />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Row justify="space-between" align="center">
                <Row gap={spacing.sm} align="center" style={{ flexShrink: 1 }}>
                  <Text variant="labelMd" numberOfLines={1}>{t('passenger:' + tier.i18n_key)}</Text>
                  {isCurrent ? (
                    <View
                      style={{
                        backgroundColor: colors.secondaryContainer,
                        borderRadius: radius.full,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 1,
                      }}
                    >
                      <Text variant="labelXs" color={colors.onSecondaryContainer}>
                        {t('passenger:tierCurrent')}
                      </Text>
                    </View>
                  ) : null}
                </Row>
                <Text
                  variant="labelMd"
                  color={tier.discount_pct > 0 ? colors.success : colors.onSurfaceVariant}
                >
                  {tier.discount_pct > 0
                    ? t('passenger:discountOffRides', { pct: tier.discount_pct })
                    : '—'}
                </Text>
              </Row>

              <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginTop: 2 }}>
                {unlocked
                  ? (isCurrent ? t('passenger:tierCurrentHint') : t('passenger:tierUnlocked'))
                  : t('passenger:tierUnlockAt', { points: tier.min_points })}
              </Text>

              {perks.length ? (
                <Stack gap={2} style={{ marginTop: spacing.xs }}>
                  {perks.map((perk) => (
                    <Row key={perk} gap={6} align="center">
                      <MaterialIcons name={PERK_META[perk]?.icon || 'check'} size={14} color={accent} />
                      <Text variant="labelSm" color={colors.onSurface}>{t('passenger:' + perk)}</Text>
                    </Row>
                  ))}
                </Stack>
              ) : null}
            </View>
          </View>
        );
      })}
    </Stack>
  );
}

// Loads the tier catalogue (public.tiers) once; DEFAULT_TIERS is the first-paint
// / offline fallback. Returns { list, currentIdx } for the given points.
function useTiers(points) {
  const [tiers, setTiers] = useState(null);
  useEffect(() => {
    usersApi.listTiers().then(setTiers);
  }, []);
  const list = tiers && tiers.length ? tiers : DEFAULT_TIERS;
  return { list, currentIdx: tierIndexForPoints(points, list) };
}

// Inline full loyalty ladder section (kept for reuse). The profile now surfaces
// this through TierBenefitsModal instead, opened by tapping the membership tier.
export function TierBenefits({ points = 0 }) {
  const { t } = useLocale();
  const { list, currentIdx } = useTiers(points);
  return (
    <Section title={t('passenger:tierBenefits')} subtitle={t('passenger:tierBenefitsSubtitle')}>
      <Card>
        <TierLadder list={list} currentIdx={currentIdx} />
      </Card>
    </Section>
  );
}

// Bottom-sheet variant of the loyalty ladder — opened when the passenger taps
// their tier on the membership card.
export function TierBenefitsModal({ visible, points = 0, onClose }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { list, currentIdx } = useTiers(points);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: withAlpha(colors.scrim, 0.5), justifyContent: 'flex-end' }}
      >
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={sheetEntering}
            style={{
              backgroundColor: colors.surface,
              borderTopStartRadius: radius.xxl,
              borderTopEndRadius: radius.xxl,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
              maxHeight: '85%',
            }}
          >
            <Row justify="space-between" align="flex-start" style={{ marginBottom: spacing.md }}>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text variant="headlineSm">{t('passenger:tierBenefits')}</Text>
                <Text variant="bodySm" color={colors.onSurfaceVariant}>
                  {t('passenger:tierBenefitsSubtitle')}
                </Text>
              </Stack>
              <Pressable onPress={onClose} hitSlop={8} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </Pressable>
            </Row>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <TierLadder list={list} currentIdx={currentIdx} />
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
