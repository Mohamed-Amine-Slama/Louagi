import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Logo } from '../../components/Logo';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Section, Row, Stack } from '../../components/Section';
import { SectionLabel } from '../../components/SectionLabel';
import { CityPickerModal } from '../../components/CityPicker';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { useAuth } from '../../context/AuthContext';
import { ridesApi, usersApi } from '../../api';
import { spacing, radius } from '../../theme';
import { MONO, cityCode } from '../../lib/tickets';

// Static popular inter-city routes shown as quick shortcuts on Home — typical
// "from" fares; tapping pre-fills the search.
const POPULAR = [
  { from: 'Tunis', to: 'Sfax', price: 25 },
  { from: 'Tunis', to: 'Sousse', price: 12 },
  { from: 'Sfax', to: 'Gabès', price: 18 },
];

export default function LandingScreen() {
  const { colors, isDark, setMode } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const { user } = useAuth();
  const [cities, setCities] = useState([]);
  const [origin, setOrigin] = useState('Tunis');
  const [destination, setDestination] = useState('Sfax');
  const [seats, setSeats] = useState(1);
  const [editing, setEditing] = useState(null); // 'origin' | 'destination' | null

  useEffect(() => {
    ridesApi.listCities().then(setCities);
  }, []);

  useEffect(() => {
    if (user?.role !== 'passenger') return;
    let cancelled = false;
    usersApi.getProfile({ actor: user }).then((profile) => {
      if (!cancelled && profile?.preferences?.defaultSeats) {
        setSeats(Number(profile.preferences.defaultSeats) || 1);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };
  const search = () => nav.navigate('Search', { origin, destination, seats });

  const stepBtn = {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Screen>
      {/* Header: brand + auth-aware actions */}
      <Row justify="space-between" align="center" style={{ marginTop: spacing.xs }}>
        <Row gap={spacing.sm}>
          <Logo size={36} />
          <Text variant="headlineSm">{t('common:appName')}</Text>
        </Row>
        {user ? (
          <Row gap={4} align="center" style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, padding: 3 }}>
            <PressableScale onPress={() => setMode('light')} scaleTo={0.9} style={togglePill(!isDark, colors)}>
              <MaterialIcons name="light-mode" size={16} color={!isDark ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
            </PressableScale>
            <PressableScale onPress={() => setMode('dark')} scaleTo={0.9} style={togglePill(isDark, colors)}>
              <MaterialIcons name="dark-mode" size={16} color={isDark ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
            </PressableScale>
          </Row>
        ) : (
          <Row gap={spacing.sm} align="center">
            <Pressable onPress={() => nav.navigate('Login')} hitSlop={8}>
              <Text variant="labelMd" color={colors.primary}>{t('auth:login')}</Text>
            </Pressable>
            <Button label={t('auth:signup')} small fullWidth={false} variant="secondary" onPress={() => nav.navigate('Register')} />
          </Row>
        )}
      </Row>

      {/* Heading */}
      <FadeSlideIn index={0}>
        <Stack gap={spacing.sm}>
          <SectionLabel color={colors.secondaryContainer}>{t('landing:yourNextLouage')}</SectionLabel>
          <Text variant="displayLg" style={{ letterSpacing: -1 }}>{t('landing:whereTo')}</Text>
        </Stack>
      </FadeSlideIn>

      {/* Boarding-pass search ticket */}
      <FadeSlideIn index={1}>
        <Card padding={0}>
          <View style={{ padding: spacing.md }}>
            <Row justify="space-between" align="center" style={{ marginBottom: spacing.md }}>
              <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: colors.onSurfaceVariant }}>
                {t('landing:louageTicket').toUpperCase()}
              </Text>
              <View style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.onSurface }}>{t('landing:today').toUpperCase()}</Text>
              </View>
            </Row>
            <Row justify="space-between" align="flex-start">
              <Pressable onPress={() => setEditing('origin')} style={{ flex: 1 }}>
                <Text color={colors.primary} style={{ fontFamily: MONO, fontSize: 32, lineHeight: 34, letterSpacing: -0.5 }}>
                  {cityCode(origin)}
                </Text>
                <Text variant="labelMd" color={colors.onSurface} numberOfLines={1} style={{ marginTop: 4 }}>{origin}</Text>
              </Pressable>
              <PressableScale
                onPress={swap}
                scaleTo={0.88}
                style={{ width: 46, height: 46, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 }}
              >
                <MaterialIcons name="swap-horiz" size={22} color={colors.onPrimary} />
              </PressableScale>
              <Pressable onPress={() => setEditing('destination')} style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text color={colors.secondaryContainer} style={{ fontFamily: MONO, fontSize: 32, lineHeight: 34, letterSpacing: -0.5 }}>
                  {cityCode(destination)}
                </Text>
                <Text variant="labelMd" color={colors.onSurface} numberOfLines={1} style={{ marginTop: 4 }}>{destination}</Text>
              </Pressable>
            </Row>
          </View>

          {/* Perforation */}
          <View style={{ height: 22, justifyContent: 'center' }}>
            <View style={{ position: 'absolute', start: -11, top: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface }} />
            <View style={{ position: 'absolute', end: -11, top: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface }} />
            <View style={{ marginHorizontal: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.outlineVariant }} />
          </View>

          <View style={{ padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' }}>
            <Stack gap={6}>
              <SectionLabel>{t('landing:seatsLabel')}</SectionLabel>
              <Row gap={4} align="center" style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.lg, padding: 4 }}>
                <PressableScale onPress={() => setSeats((s) => Math.max(1, s - 1))} scaleTo={0.9} style={stepBtn}>
                  <MaterialIcons name="remove" size={18} color={colors.primary} />
                </PressableScale>
                <Text variant="labelMd" style={{ minWidth: 24, textAlign: 'center' }}>{seats}</Text>
                <PressableScale onPress={() => setSeats((s) => Math.min(8, s + 1))} scaleTo={0.9} style={stepBtn}>
                  <MaterialIcons name="add" size={18} color={colors.primary} />
                </PressableScale>
              </Row>
            </Stack>
            <View style={{ flex: 1 }}>
              <Button label={t('landing:searchRides')} variant="secondary" iconRight="arrow-forward" onPress={search} />
            </View>
          </View>
        </Card>
      </FadeSlideIn>

      {/* Popular routes */}
      <FadeSlideIn index={2}>
        <Stack gap={spacing.sm}>
          <SectionLabel>{t('landing:popularRoutes')}</SectionLabel>
          {POPULAR.map((r, i) => (
            <Card key={i} padding={spacing.md} onPress={() => nav.navigate('Search', { origin: r.from, destination: r.to, seats })}>
              <Row justify="space-between" align="center">
                <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ fontFamily: MONO, fontSize: 14, color: colors.primary }}>
                    {cityCode(r.from)} → {cityCode(r.to)}
                  </Text>
                  <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {r.from} · {r.to}
                  </Text>
                </View>
                <Text variant="labelMd" color={colors.secondaryContainer} numberOfLines={1}>
                  {t('landing:fromPrice', { price: r.price })}
                </Text>
              </Row>
            </Card>
          ))}
        </Stack>
      </FadeSlideIn>

      {/* Why Louagi */}
      <FadeSlideIn index={3}>
        <Section title={t('landing:whyLouagi')}>
          <View style={{ gap: spacing.sm }}>
            <TrustBadge index={4} icon="verified" title={t('landing:trustVerifiedTitle')} body={t('landing:trustVerifiedBody')} />
            <TrustBadge index={5} icon="lock" title={t('landing:trustSecureTitle')} body={t('landing:trustSecureBody')} />
            <TrustBadge index={6} icon="map" title={t('landing:trustCoverageTitle')} body={t('landing:trustCoverageBody')} />
          </View>
        </Section>
      </FadeSlideIn>

      {/* Become a driver */}
      <FadeSlideIn index={7}>
        <Card
          onPress={() => nav.navigate('Register', { preset: 'driver' })}
          style={{ backgroundColor: colors.secondaryContainer, gap: spacing.sm, padding: spacing.lg }}
        >
          <View
            style={{
              backgroundColor: colors.secondaryFixed,
              borderRadius: radius.full,
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.xs,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              alignSelf: 'flex-start',
            }}
          >
            <MaterialIcons name="local-taxi" size={12} color={colors.onSecondaryFixed} />
            <Text variant="labelSm" color={colors.onSecondaryFixed}>{t('landing:driverCtaBadge')}</Text>
          </View>
          <Text variant="headlineMd" color={colors.onSecondaryContainer}>{t('landing:driverCtaTitle')}</Text>
          <Text variant="bodyMd" color={colors.onSecondaryContainer}>{t('landing:driverCtaBody')}</Text>
          <Button
            label={t('landing:becomeDriver')}
            variant="primary"
            iconRight="arrow-forward"
            onPress={() => nav.navigate('Register', { preset: 'driver' })}
            fullWidth={false}
          />
        </Card>
      </FadeSlideIn>

      <CityPickerModal
        visible={editing === 'origin'}
        label={t('landing:from')}
        value={origin}
        cities={cities}
        onChange={setOrigin}
        onClose={() => setEditing(null)}
      />
      <CityPickerModal
        visible={editing === 'destination'}
        label={t('landing:to')}
        value={destination}
        cities={cities}
        onChange={setDestination}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

function togglePill(active, colors) {
  return {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? colors.secondaryContainer : 'transparent',
  };
}

function TrustBadge({ icon, title, body, index = 0 }) {
  const { colors } = useTheme();
  return (
    <FadeSlideIn index={index}>
      <Card style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.lg,
            backgroundColor: colors.primaryFixed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={icon} size={22} color={colors.onPrimaryFixed} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="labelMd">{title}</Text>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>{body}</Text>
        </View>
      </Card>
    </FadeSlideIn>
  );
}
