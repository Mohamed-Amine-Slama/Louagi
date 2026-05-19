import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Logo } from '../../components/Logo';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Section, Row, Stack } from '../../components/Section';
import { useAuth } from '../../context/AuthContext';
import { ridesApi } from '../../api';
import { spacing, radius, shadows } from '../../theme';

export default function LandingScreen() {
  const { colors } = useTheme();
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

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <Screen padded={false}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          gap: spacing.lg,
        }}
      >
        <Row justify="space-between">
          <Row gap={spacing.sm}>
            <Logo size={42} />
            <Text variant="headlineSm" color={colors.onPrimary}>
              {t('common:appName')}
            </Text>
          </Row>
          {user ? (
            <Pressable onPress={signOut}>
              <Text variant="labelMd" color={colors.onPrimaryContainer}>
                {t('common:logout')}
              </Text>
            </Pressable>
          ) : (
            <Row gap={spacing.sm}>
              <Pressable onPress={() => nav.navigate('Login')}>
                <Text variant="labelMd" color={colors.onPrimaryContainer}>
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
        <View>
          <Text variant="displayLg" color={colors.onPrimary}>
            {t('landing:heroTitle')}
          </Text>
          <Text variant="bodyMd" color={colors.onPrimaryContainer} style={{ marginTop: spacing.sm }}>
            {t('landing:heroSubtitle')}
          </Text>
        </View>
        <Card style={{ gap: spacing.md }} allowOverflow>
          <Section title={t('landing:findARide')} />
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <CityPicker label={t('landing:from')} value={origin} onChange={setOrigin} cities={cities} />
            </View>
            <Pressable
              onPress={swap}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceContainer,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <MaterialIcons name="swap-horiz" size={22} color={colors.primary} />
            </Pressable>
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
      </View>

      <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md, marginTop: spacing.lg }}>
        <Section title={t('landing:whyLouagi')}>
          <View style={{ gap: spacing.sm }}>
            <TrustBadge
              icon="verified"
              title={t('landing:trustVerifiedTitle')}
              body={t('landing:trustVerifiedBody')}
            />
            <TrustBadge
              icon="lock"
              title={t('landing:trustSecureTitle')}
              body={t('landing:trustSecureBody')}
            />
            <TrustBadge
              icon="map"
              title={t('landing:trustCoverageTitle')}
              body={t('landing:trustCoverageBody')}
            />
          </View>
        </Section>

        <Card
          style={{
            backgroundColor: colors.secondaryContainer,
            gap: spacing.sm,
            padding: spacing.lg,
          }}
        >
          <Badge label={t('landing:driverCtaBadge')} variant="warning" icon="local-taxi" />
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
      </View>
    </Screen>
  );
}

function TrustBadge({ icon, title, body }) {
  const { colors } = useTheme();
  return (
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
        <MaterialIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="labelMd">{title}</Text>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>
          {body}
        </Text>
      </View>
    </Card>
  );
}

function CityPicker({ label, value, onChange, cities }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.surfaceContainer,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md - 2,
        }}
      >
        <Text variant="labelSm" color={colors.onSurfaceVariant}>
          {label}
        </Text>
        <Text variant="bodyLg">{value}</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(3, 22, 52, 0.45)',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.surfaceContainerLowest,
              borderRadius: radius.xl,
              paddingVertical: spacing.sm,
              maxHeight: '70%',
              ...shadows.floating,
            }}
          >
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {label}
              </Text>
              <Text variant="headlineSm">{t('landing:chooseCity')}</Text>
            </View>
            <FlatList
              data={cities}
              keyExtractor={(c) => c}
              contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }}
              renderItem={({ item: c }) => (
                <Pressable
                  onPress={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    paddingHorizontal: spacing.md,
                    marginVertical: 2,
                    borderRadius: radius.lg,
                    backgroundColor: c === value
                      ? colors.primaryFixed
                      : pressed
                      ? colors.surfaceContainer
                      : 'transparent',
                  })}
                >
                  <Text
                    variant="bodyLg"
                    color={c === value ? colors.primary : colors.onSurface}
                  >
                    {c}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
