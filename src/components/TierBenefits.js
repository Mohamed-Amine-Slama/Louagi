import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Card } from './Card';
import { Row, Stack, Section } from './Section';
import { spacing, radius, withAlpha } from '../theme';
import { DEFAULT_TIERS, PERK_META, tierIndexForPoints } from '../lib/tiers';
import { usersApi } from '../api';

const TIER_ICON = 'workspace-premium';

// Full loyalty ladder: every tier, the seat discount it grants, and its perks.
// The catalogue is fetched from the DB (public.tiers); the tier the passenger is
// on is highlighted, higher ones read as locked with the points needed to reach
// them. DEFAULT_TIERS is the first-paint / offline fallback.
export function TierBenefits({ points = 0 }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [tiers, setTiers] = useState(null);

  useEffect(() => {
    usersApi.listTiers().then(setTiers);
  }, []);

  const list = tiers && tiers.length ? tiers : DEFAULT_TIERS;
  const currentIdx = tierIndexForPoints(points, list);

  return (
    <Section title={t('passenger:tierBenefits')} subtitle={t('passenger:tierBenefitsSubtitle')}>
      <Card>
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
      </Card>
    </Section>
  );
}
