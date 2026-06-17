import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Card } from './Card';
import { Row, Stack, Section } from './Section';
import { spacing, radius, withAlpha, shadows } from '../theme';
import { MONO, PASS, initialsOf } from '../lib/tickets';
import { tierForPoints } from '../lib/tiers';
import { usersApi } from '../api';

const GOLD = ['#F8D27A', '#E0A23C'];

const groupThousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Premium navy loyalty card — stays navy in both themes, like a real membership
// card. Tier and points are derived from the passenger's trip count.
export function MembershipCard({ name, id, points = 0, memberSince, notch }) {
  const { t } = useLocale();
  const [tiers, setTiers] = useState(null);
  useEffect(() => { usersApi.listTiers().then(setTiers); }, []);
  const idStr = String(id ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padEnd(8, '0');
  const memberNo = `LGI ${idStr.slice(0, 4)} ${idStr.slice(4, 8)}`;

  const { tier: band, next, progress, pointsToNext: toNext } = tierForPoints(points, tiers);
  const hasNext = next != null;
  const discountPct = band.discount_pct;

  return (
    <View style={[{ borderRadius: 22 }, shadows.card]}>
      <View style={{ borderRadius: 22, overflow: 'hidden' }}>
        <LinearGradient colors={['#0A2247', '#031634', '#3A1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ padding: 18, paddingBottom: 14 }}>
            <Row justify="space-between" align="center" style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.4, color: PASS.onNavyMut }}>
                {t('passenger:member').toUpperCase()}
              </Text>
              <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <MaterialIcons name="star" size={12} color="#3A2A0A" />
                <Text variant="labelSm" color="#3A2A0A" numberOfLines={1}>{t('passenger:' + band.i18n_key).toUpperCase()}</Text>
              </LinearGradient>
            </Row>
            <Row gap={14} align="center">
              <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="headlineSm" color="#031634">{initialsOf(name)}</Text>
              </LinearGradient>
              <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                <Text variant="headlineSm" color={PASS.onNavy} numberOfLines={1}>{name}</Text>
                <Text style={{ fontFamily: MONO, fontSize: 12, color: PASS.onNavyMut }}>{memberNo}</Text>
              </Stack>
            </Row>
          </View>

          {/* Perforation */}
          <View style={{ height: 20, justifyContent: 'center' }}>
            <View style={{ position: 'absolute', start: -10, top: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: notch }} />
            <View style={{ position: 'absolute', end: -10, top: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: notch }} />
            <View style={{ marginHorizontal: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }} />
          </View>

          <View style={{ padding: 18, paddingTop: 13 }}>
            <Row justify="space-between" align="flex-end" style={{ marginBottom: 11 }}>
              <Stack gap={2}>
                <Text variant="labelXs" color={PASS.onNavyFaint} style={{ letterSpacing: 0.5 }}>{t('passenger:pointsBalance').toUpperCase()}</Text>
                <Row gap={5} align="flex-end">
                  <Text color={PASS.onNavy} style={{ fontFamily: MONO, fontSize: 24, lineHeight: 26 }}>{groupThousands(points)}</Text>
                  <Text variant="labelSm" color={PASS.onNavyMut} style={{ marginBottom: 2 }}>{t('passenger:pts')}</Text>
                </Row>
              </Stack>
              <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                <Text variant="labelXs" color={PASS.onNavyFaint}>{t('passenger:memberSince').toUpperCase()}</Text>
                <Text variant="labelMd" color={PASS.onNavy}>{memberSince}</Text>
              </Stack>
            </Row>
            <View style={{ height: 7, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.round(progress * 100)}%`, borderRadius: radius.full, backgroundColor: PASS.gold }} />
            </View>
            <Row justify="space-between" align="center" style={{ marginTop: 8 }}>
              {hasNext ? (
                <Text variant="labelSm" color={PASS.onNavyMut}>
                  {t('passenger:pointsToNext', { points: toNext, tier: t('passenger:' + next.i18n_key) })}
                </Text>
              ) : <View />}
              {discountPct > 0 ? (
                <Row gap={5} align="center">
                  <MaterialIcons name="local-offer" size={12} color={PASS.gold} />
                  <Text variant="labelSm" color={PASS.gold}>
                    {t('passenger:discountOffRides', { pct: discountPct })}
                  </Text>
                </Row>
              ) : null}
            </Row>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

// Compact stat card (Trips / Spent / CO₂) — three across.
export function ProfileStatTile({ icon, value, unit, label, tone }) {
  const { colors } = useTheme();
  const fg = tone === 'success' ? colors.success : colors.primary;
  return (
    <Card style={{ flex: 1 }}>
      <View style={{ width: 32, height: 32, borderRadius: radius.lg, backgroundColor: withAlpha(fg, 0.12), alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
        <MaterialIcons name={icon} size={17} color={fg} />
      </View>
      <Row gap={3} align="flex-end">
        <Text variant="headlineSm" numberOfLines={1}>{value}</Text>
        {unit ? <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginBottom: 2 }}>{unit}</Text> : null}
      </Row>
      <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

// Horizontally-scrolling milestone badges; locked ones dim with a padlock. The
// badge catalogue (icons + label keys + unlock thresholds) is fetched from the
// DB (public.achievements); `unlocked` is the server-computed list of earned ids.
export function AchievementsRail({ unlocked = [] }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [catalogue, setCatalogue] = useState([]);

  useEffect(() => {
    usersApi.listAchievements().then(setCatalogue);
  }, []);

  if (!catalogue.length) return null;
  const count = catalogue.filter((a) => unlocked.includes(a.id)).length;
  return (
    <Section
      title={t('passenger:achievements')}
      action={
        <View style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 }}>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('passenger:achProgress', { count, total: catalogue.length })}
          </Text>
        </View>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
        {catalogue.map((a) => {
          const got = unlocked.includes(a.id);
          return (
            <View
              key={a.id}
              style={[
                { width: 92, alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, opacity: got ? 1 : 0.55 },
                shadows.soft,
              ]}
            >
              <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: got ? withAlpha(colors.secondaryContainer, 0.14) : colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
                <MaterialIcons name={got ? a.icon : 'lock'} size={22} color={got ? colors.secondaryContainer : colors.onSurfaceVariant} />
              </View>
              <Text variant="labelSm" numberOfLines={1} style={{ textAlign: 'center' }}>{t('passenger:' + a.i18n_key)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </Section>
  );
}
