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
import { spacing, radius } from '../../theme';
import { formatWeekday } from '../../i18n/format';

export default function CreateRideScreen() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();
  const toast = useToast();

  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState(null);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 30, 0, 0);
    return d;
  });
  const [price, setPrice] = useState(20);
  const [seats, setSeats] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    ridesApi.listRoutes().then((rs) => {
      setRoutes(rs);
      if (rs[0]) {
        setRouteId(rs[0].id);
        setPrice(rs[0].base_price);
      }
    });
  }, []);

  const route = routes.find((r) => r.id === routeId);
  const min = route ? Math.round(route.base_price * 0.5) : 0;
  const max = route ? Math.round(route.base_price * 1.5) : 0;

  const submit = async () => {
    setError(null);
    setLoading(true);
    const res = await ridesApi.createRide({
      actor: user,
      routeId,
      departureTime: date,
      pricePerSeat: Number(price),
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
          {routes.map((r) => {
            const active = r.id === routeId;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  setRouteId(r.id);
                  setPrice(r.base_price);
                }}
                style={{
                  padding: spacing.md,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.outlineVariant,
                  backgroundColor: active ? colors.primaryFixed : colors.surfaceContainerLowest,
                }}
              >
                <Row justify="space-between">
                  <Text variant="bodyLg">
                    {r.origin_city} → {r.destination_city}
                  </Text>
                  <Text variant="labelMd" color={colors.onSurfaceVariant}>
                    {r.distance_km} km · {r.base_price} {t('common:tnd')}
                  </Text>
                </Row>
              </Pressable>
            );
          })}
        </Stack>
      </Section>

      <Section title={t('driver:departure')}>
        <Row gap={spacing.sm}>
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
        {route ? (
          <Banner
            variant="warning"
            title={t('driver:suggestedRange')}
            body={t('driver:suggestedRangeBody', { min, max, base: route.base_price })}
          />
        ) : null}
        <Card>
          <Row justify="space-between">
            <Text variant="bodyMd">{t('driver:priceTnd')}</Text>
            <Stepper value={Number(price)} onChange={setPrice} min={min || 1} max={max || 50} large />
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
          <Button label={t('common:cancel')} variant="outline" onPress={() => nav.goBack()} />
        </View>
        <View style={{ flex: 1.5 }}>
          <Button label={t('driver:publishRide')} variant="secondary" loading={loading} onPress={submit} />
        </View>
      </Row>
    </Screen>
  );
}
