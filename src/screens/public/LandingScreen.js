import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Logo } from '../../components/Logo';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Section, Row } from '../../components/Section';
import { CityPicker } from '../../components/CityPicker';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { useAuth } from '../../context/AuthContext';
import { ridesApi, usersApi } from '../../api';
import { spacing, radius, withAlpha } from '../../theme';

export default function LandingScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const { user, signOut } = useAuth();
  const [cities, setCities] = useState([]);
  const [origin, setOrigin] = useState('Tunis');
  const [destination, setDestination] = useState('Sfax');
  const [seats, setSeats] = useState('1');

  useEffect(() => {
    ridesApi.listCities().then(setCities);
  }, []);

  useEffect(() => {
    if (user?.role !== 'passenger') return;
    let cancelled = false;
    usersApi.getProfile({ actor: user }).then((profile) => {
      if (!cancelled && profile?.preferences?.defaultSeats) {
        setSeats(String(profile.preferences.defaultSeats));
      }
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const heroText = isDark ? colors.onSurface : colors.onPrimary;
  const heroSub = withAlpha(heroText, 0.8);

  return (
    <Screen padded={false}>
      <LinearGradient
        colors={isDark ? [colors.surfaceContainerHighest, colors.background] : [colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          borderBottomLeftRadius: radius.xxl,
          borderBottomRightRadius: radius.xxl,
          gap: spacing.lg,
        }}
      >
        <FadeSlideIn index={0}>
          <Row justify="space-between">
            <Row gap={spacing.sm}>
              <Logo size={42} />
              <Text variant="headlineSm" color={heroText}>
                {t('common:appName')}
              </Text>
            </Row>
            {user ? (
              <Pressable onPress={signOut}>
                <Text variant="labelMd" color={heroText}>
                  {t('common:logout')}
                </Text>
              </Pressable>
            ) : (
              <Row gap={spacing.sm}>
                <Pressable onPress={() => nav.navigate('Login')}>
                  <Text variant="labelMd" color={heroText}>
                    {t('auth:login')}
                  </Text>
                </Pressable>
                <Button
                  label={t('auth:signup')}
                  small
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => nav.navigate('Register')}
                />
              </Row>
            )}
          </Row>
        </FadeSlideIn>
        <FadeSlideIn index={1}>
          <Text variant="displayLg" color={heroText}>
            {t('landing:heroTitle')}
          </Text>
          <Text variant="bodyMd" color={heroSub} style={{ marginTop: spacing.sm }}>
            {t('landing:heroSubtitle')}
          </Text>
        </FadeSlideIn>
        <FadeSlideIn index={2}>
          <Card style={{ gap: spacing.md }} allowOverflow>
            <Section title={t('landing:findARide')} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <CityPicker label={t('landing:from')} value={origin} onChange={setOrigin} cities={cities} />
              </View>
              <PressableScale
                onPress={swap}
                scaleTo={0.9}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.full,
                  backgroundColor: colors.surfaceContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.xs,
                }}
              >
                <MaterialIcons name="swap-horiz" size={22} color={colors.primary} />
              </PressableScale>
              <View style={{ flex: 1 }}>
                <CityPicker label={t('landing:to')} value={destination} onChange={setDestination} cities={cities} />
              </View>
            </View>
            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Input label={t('landing:seatsLabel')} value={seats} onChangeText={setSeats} keyboardType="number-pad" iconLeft="event-seat" />
              </View>
              <View style={{ flex: 2 }}>
                <Button
                  label={t('landing:searchRides')}
                  iconRight="arrow-forward"
                  variant="secondary"
                  onPress={() =>
                    nav.navigate('Search', { origin, destination, seats: Number(seats) || 1 })
                  }
                />
              </View>
            </Row>
          </Card>
        </FadeSlideIn>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md, marginTop: spacing.lg }}>
        <FadeSlideIn index={3}>
          <Section title={t('landing:whyLouagi')}>
            <View style={{ gap: spacing.sm }}>
              <TrustBadge
                index={4}
                icon="verified"
                title={t('landing:trustVerifiedTitle')}
                body={t('landing:trustVerifiedBody')}
              />
              <TrustBadge
                index={5}
                icon="lock"
                title={t('landing:trustSecureTitle')}
                body={t('landing:trustSecureBody')}
              />
              <TrustBadge
                index={6}
                icon="map"
                title={t('landing:trustCoverageTitle')}
                body={t('landing:trustCoverageBody')}
              />
            </View>
          </Section>
        </FadeSlideIn>

        <FadeSlideIn index={7}>
          <Card
            onPress={() => nav.navigate('Register', { preset: 'driver' })}
            style={{
              backgroundColor: colors.secondaryContainer,
              gap: spacing.sm,
              padding: spacing.lg,
            }}
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
              <Text variant="labelSm" color={colors.onSecondaryFixed}>
                {t('landing:driverCtaBadge')}
              </Text>
            </View>
            <Text variant="headlineMd" color={colors.onSecondaryContainer}>
              {t('landing:driverCtaTitle')}
            </Text>
            <Text variant="bodyMd" color={colors.onSecondaryContainer}>
              {t('landing:driverCtaBody')}
            </Text>
            <Button
              label={t('landing:becomeDriver')}
              variant="primary"
              iconRight="arrow-forward"
              onPress={() => nav.navigate('Register', { preset: 'driver' })}
              fullWidth={false}
            />
          </Card>
        </FadeSlideIn>
      </View>
    </Screen>
  );
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
          <Text variant="bodySm" color={colors.onSurfaceVariant}>
            {body}
          </Text>
        </View>
      </Card>
    </FadeSlideIn>
  );
}
