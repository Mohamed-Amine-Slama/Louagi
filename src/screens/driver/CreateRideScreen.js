import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Stepper } from '../../components/Stepper';
import { Banner } from '../../components/Banner';
import { Stack, Row, Section } from '../../components/Section';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { formatWeekday } from '../../i18n/format';

export default function CreateRideScreen() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();
  const toast = useToast();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 30, 0, 0);
    return d;
  });
  const [seats, setSeats] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cities, setCities] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    ridesApi.listCities().then((res) => {
      if (Array.isArray(res)) setCities(res);
    });
    ridesApi.listRoutes().then((res) => {
      if (Array.isArray(res)) setRoutes(res);
    });
  }, []);

  // Look up the government-set fare for the selected route. Returns null
  // until both endpoints match a known route.
  const govFare = (() => {
    if (!origin || !destination) return null;
    const r = routes.find(
      (rt) =>
        rt.origin_city?.toLowerCase() === origin.toLowerCase() &&
        rt.destination_city?.toLowerCase() === destination.toLowerCase(),
    );
    return r ? Number(r.base_price) : null;
  })();

  const submit = async () => {
    setError(null);
    setLoading(true);
    const res = await ridesApi.createRide({
      actor: user,
      origin,
      destination,
      departureTime: date,
      availableSeats: Number(seats),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.show(t('toast:ridePublished'), 'success');
    nav.replace('RideManagement', { id: res.ride.id });
  };

  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <Screen>
      <ScreenHeader title={t('driver:createNewRide')} subtitle={t('driver:createNewRideSubtitle')} showBack />

      <Section title={t('driver:route')}>
        <Stack gap={spacing.sm}>
          <View style={{ zIndex: activeField === 'origin' ? 2 : 1 }}>
            <Input
              label={t('landing:from')}
              value={origin}
              onChangeText={setOrigin}
              onFocus={() => setActiveField('origin')}
              onBlur={() => setTimeout(() => setActiveField(null), 100)} // Delay to allow press on suggestion
              placeholder="e.g. Tunis"
            />
            {activeField === 'origin' && (
              <View style={{ backgroundColor: colors.surfaceContainer, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' }}>
                {cities.filter(c => c.toLowerCase().includes(origin.toLowerCase()) && c.toLowerCase() !== origin.toLowerCase()).slice(0, 5).map(s => (
                  <Pressable
                    key={s}
                    style={{ padding: spacing.md, borderBottomWidth: 1, borderBottomColor: withAlpha(colors.onSurface, 0.1) }}
                    onPress={() => {
                      setOrigin(s);
                      setActiveField(null);
                    }}
                  >
                    <Text variant="bodyMd" color={colors.onSurface}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <View style={{ zIndex: activeField === 'destination' ? 2 : 1 }}>
            <Input
              label={t('landing:to')}
              value={destination}
              onChangeText={setDestination}
              onFocus={() => setActiveField('destination')}
              onBlur={() => setTimeout(() => setActiveField(null), 100)} // Delay to allow press on suggestion
              placeholder="e.g. Sousse"
            />
            {activeField === 'destination' && (
              <View style={{ backgroundColor: colors.surfaceContainer, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' }}>
                {cities.filter(c => c.toLowerCase().includes(destination.toLowerCase()) && c.toLowerCase() !== destination.toLowerCase()).slice(0, 5).map(s => (
                  <Pressable
                    key={s}
                    style={{ padding: spacing.md, borderBottomWidth: 1, borderBottomColor: withAlpha(colors.onSurface, 0.1) }}
                    onPress={() => {
                      setDestination(s);
                      setActiveField(null);
                    }}
                  >
                    <Text variant="bodyMd" color={colors.onSurface}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </Stack>
      </Section>

      <Section title={t('driver:departure')}>
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          {days.map((d) => {
            const same = d.toDateString() === date.toDateString();
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => {
                  const nd = new Date(d);
                  nd.setHours(date.getHours(), date.getMinutes());
                  setDate(nd);
                }}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: same ? colors.primary : colors.surfaceContainer,
                }}
              >
                <Text variant="labelMd" color={same ? colors.onPrimary : colors.onSurface}>
                  {formatWeekday(d, { locale })} {d.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </Row>
        <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('driver:hour')}
              value={String(date.getHours()).padStart(2, '0')}
              onChangeText={(txt) => {
                const h = Math.max(0, Math.min(23, parseInt(txt || '0', 10)));
                const d = new Date(date);
                d.setHours(h);
                setDate(d);
              }}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={t('driver:minute')}
              value={String(date.getMinutes()).padStart(2, '0')}
              onChangeText={(txt) => {
                const m = Math.max(0, Math.min(59, parseInt(txt || '0', 10)));
                const d = new Date(date);
                d.setMinutes(m);
                setDate(d);
              }}
              keyboardType="number-pad"
            />
          </View>
        </Row>
      </Section>

      <Section title={t('driver:pricePerSeat')}>
        <Banner
          variant="info"
          title={t('driver:govFareTitle', 'Government-set fare')}
          body={t(
            'driver:govFareBody',
            'The Tunisian transport authority sets the per-seat fare for every route. Passengers also pay a 3 TND service fee — 2 TND goes to you, 1 TND to the platform.',
          )}
        />
        <Card>
          <Row justify="space-between" align="center">
            <View style={{ flex: 1 }}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {govFare != null
                  ? t('driver:govFareLine', 'Fare for this route')
                  : t('driver:govFarePending', 'Pick origin and destination to see the fare')}
              </Text>
              {govFare != null && (
                <Text variant="headlineMd">
                  {govFare} {t('common:tnd')}
                  <Text variant="labelMd" color={colors.onSurfaceVariant}>
                    {' '}/ {t('common:seat', 'seat')}
                  </Text>
                </Text>
              )}
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primaryFixed,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="account-balance" size={22} color={colors.primary} />
            </View>
          </Row>
        </Card>
      </Section>

      <Section title={t('driver:capacity')}>
        <Card accent={colors.primary}>
          <Row justify="space-between">
            <Text variant="bodyMd">{t('driver:seatsAvailable')}</Text>
            <Stepper value={Number(seats)} onChange={setSeats} min={1} max={8} />
          </Row>
        </Card>
      </Section>

      {error ? <Banner variant="error" title={t('driver:couldntPublish')} body={error} /> : null}

      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Button label={t('common:cancel')} variant="outline" onPress={() => nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs')} />
        </View>
        <View style={{ flex: 1.5 }}>
          <Button label={t('driver:publishRide')} variant="secondary" loading={loading} onPress={submit} />
        </View>
      </Row>
    </Screen>
  );
}
