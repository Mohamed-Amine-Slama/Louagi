import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Stepper } from '../../components/Stepper';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';
import { SectionLabel } from '../../components/SectionLabel';
import { CityPickerModal } from '../../components/CityPicker';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { formatWeekday } from '../../i18n/format';
import { MONO, PASS, cityCode } from '../../lib/tickets';

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
  const [editing, setEditing] = useState(null); // 'origin' | 'destination' | null

  useEffect(() => {
    ridesApi.listCities().then((res) => { if (Array.isArray(res)) setCities(res); });
    ridesApi.listRoutes().then((res) => { if (Array.isArray(res)) setRoutes(res); });
  }, []);

  // Government-set fare for the selected route (null until both endpoints match).
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
    const res = await ridesApi.createRide({ actor: user, origin, destination, departureTime: date, availableSeats: Number(seats) });
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

  const setHour = (txt) => {
    const h = Math.max(0, Math.min(23, parseInt(txt || '0', 10) || 0));
    const d = new Date(date); d.setHours(h); setDate(d);
  };
  const setMinute = (txt) => {
    const m = Math.max(0, Math.min(59, parseInt(txt || '0', 10) || 0));
    const d = new Date(date); d.setMinutes(m); setDate(d);
  };
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const swap = () => { setOrigin(destination); setDestination(origin); };

  const timeBox = {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    paddingVertical: 8,
    width: 46,
    textAlign: 'center',
    fontFamily: MONO,
    fontSize: 16,
    color: colors.onSurface,
  };

  return (
    <Screen>
      {/* Header */}
      <Row gap={spacing.sm} align="center" style={{ marginTop: spacing.xs }}>
        <PressableScale onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs'))} hitSlop={10} scaleTo={0.9} style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
        </PressableScale>
        <Text variant="headlineMd">{t('driver:newRide')}</Text>
      </Row>

      {/* Boarding-pass preview */}
      <FadeSlideIn index={0}>
        <View style={{ borderRadius: 20, overflow: 'hidden' }}>
          <LinearGradient colors={['#0A2247', '#031634', '#3A1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
            <Row justify="space-between" align="center" style={{ marginBottom: 13 }}>
              <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: PASS.onNavyFaint }}>{t('driver:ridePreview').toUpperCase()}</Text>
              <Row gap={4} align="flex-end">
                <Text color="#fff" style={{ fontFamily: MONO, fontSize: 18, lineHeight: 20 }}>{govFare != null ? govFare : '—'}</Text>
                <Text variant="labelSm" color={PASS.onNavyMut} style={{ marginBottom: 1 }}>{t('common:tnd')}</Text>
              </Row>
            </Row>
            <Row justify="space-between" align="flex-start">
              <Stack gap={3}>
                <Text color="#fff" style={{ fontFamily: MONO, fontSize: 26, lineHeight: 28 }}>{cityCode(origin)}</Text>
                <Text variant="labelSm" color={PASS.onNavyMut} numberOfLines={1}>{origin || '—'}</Text>
              </Stack>
              <MaterialIcons name="flight" size={20} color="rgba(255,255,255,0.6)" style={{ transform: [{ rotate: '90deg' }], marginTop: 4 }} />
              <Stack gap={3} style={{ alignItems: 'flex-end' }}>
                <Text color={PASS.toCode} style={{ fontFamily: MONO, fontSize: 26, lineHeight: 28 }}>{cityCode(destination)}</Text>
                <Text variant="labelSm" color={PASS.onNavyMut} numberOfLines={1}>{destination || '—'}</Text>
              </Stack>
            </Row>
            <Row gap={20} style={{ marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)' }}>
              <PreviewStat label={t('passenger:dateShort')} value={`${formatWeekday(date, { locale })} ${date.getDate()}`} />
              <PreviewStat label={t('common:departure')} value={`${hh}:${mm}`} />
              <PreviewStat label={t('passenger:seatsShort')} value={String(seats)} />
            </Row>
          </LinearGradient>
        </View>
      </FadeSlideIn>

      {/* Route selector */}
      <FadeSlideIn index={1}>
        <Card padding={spacing.sm}>
          <View style={{ position: 'relative' }}>
            <Pressable onPress={() => setEditing('origin')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: colors.secondaryContainer }} />
              <Stack gap={1} style={{ flex: 1 }}>
                <Text variant="labelXs" color={colors.onSurfaceVariant} style={{ letterSpacing: 0.5 }}>{t('landing:from').toUpperCase()}</Text>
                <Text variant="bodyLg" numberOfLines={1}>{origin || t('search:anyOrigin', 'Anywhere')}</Text>
              </Stack>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginStart: 40 }} />
            <Pressable onPress={() => setEditing('destination')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <MaterialIcons name="place" size={18} color={colors.primary} />
              <Stack gap={1} style={{ flex: 1 }}>
                <Text variant="labelXs" color={colors.onSurfaceVariant} style={{ letterSpacing: 0.5 }}>{t('landing:to').toUpperCase()}</Text>
                <Text variant="bodyLg" numberOfLines={1}>{destination || t('search:anyDestination', 'Anywhere')}</Text>
              </Stack>
            </Pressable>
            <PressableScale onPress={swap} hitSlop={10} scaleTo={0.9} style={{ position: 'absolute', end: 10, top: '50%', marginTop: -19, width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="swap-vert" size={18} color={colors.primary} />
            </PressableScale>
          </View>
        </Card>
      </FadeSlideIn>

      {/* Date */}
      <FadeSlideIn index={2}>
        <Stack gap={spacing.sm}>
          <SectionLabel>{t('driver:departure')}</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {days.map((d) => {
              const same = d.toDateString() === date.toDateString();
              return (
                <PressableScale
                  key={d.toISOString()}
                  scaleTo={0.94}
                  onPress={() => { const nd = new Date(d); nd.setHours(date.getHours(), date.getMinutes()); setDate(nd); }}
                >
                  <View style={{ paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1, borderColor: same ? colors.secondaryContainer : colors.outlineVariant, backgroundColor: same ? colors.secondaryContainer : colors.surfaceContainerLowest }}>
                    <Text variant="labelMd" color={same ? colors.onSecondaryContainer : colors.onSurface}>{`${formatWeekday(d, { locale })} ${d.getDate()}`}</Text>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Stack>
      </FadeSlideIn>

      {/* Departure time */}
      <FadeSlideIn index={3}>
        <Card>
          <Row gap={spacing.md} align="center">
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="schedule" size={18} color={colors.primary} />
            </View>
            <Stack gap={1} style={{ flex: 1 }}>
              <Text variant="labelMd">{t('driver:departure')}</Text>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('driver:minute')} · {t('driver:hour')}</Text>
            </Stack>
            <Row gap={5} align="center">
              <TextInput value={hh} onChangeText={setHour} keyboardType="number-pad" maxLength={2} style={timeBox} selectTextOnFocus />
              <Text variant="bodyLg" color={colors.onSurfaceVariant}>:</Text>
              <TextInput value={mm} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} style={timeBox} selectTextOnFocus />
            </Row>
          </Row>
        </Card>
      </FadeSlideIn>

      {/* Fare (government-set) */}
      <FadeSlideIn index={4}>
        <Stack gap={spacing.sm}>
          <SectionLabel>{t('driver:pricePerSeat')}</SectionLabel>
          <Banner variant="info" title={t('driver:govFareTitle')} body={t('driver:govFareBody')} />
          <Card>
            <Row justify="space-between" align="center">
              <View style={{ flex: 1 }}>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {govFare != null ? t('driver:govFareLine') : t('driver:govFarePending')}
                </Text>
                {govFare != null ? (
                  <Row gap={4} align="flex-end" style={{ marginTop: 2 }}>
                    <Text variant="headlineMd">{govFare}</Text>
                    <Text variant="labelMd" color={colors.onSurfaceVariant} style={{ marginBottom: 3 }}>{t('common:tnd')} / {t('common:seat')}</Text>
                  </Row>
                ) : null}
              </View>
              <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: withAlpha(colors.primary, 0.1), alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="account-balance" size={22} color={colors.primary} />
              </View>
            </Row>
          </Card>
        </Stack>
      </FadeSlideIn>

      {/* Seats */}
      <FadeSlideIn index={5}>
        <Card>
          <Row justify="space-between" align="center">
            <Stack gap={1} style={{ flex: 1 }}>
              <Text variant="labelMd">{t('driver:seatsAvailable')}</Text>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('driver:capacity')}</Text>
            </Stack>
            <Stepper value={Number(seats)} onChange={setSeats} min={1} max={8} />
          </Row>
        </Card>
      </FadeSlideIn>

      {error ? (
        <FadeSlideIn>
          <Banner variant="error" title={t('driver:couldntPublish')} body={error} />
        </FadeSlideIn>
      ) : null}

      <FadeSlideIn index={6}>
        <Button label={t('driver:publishRide')} variant="secondary" iconLeft="check" loading={loading} onPress={submit} />
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

function PreviewStat({ label, value }) {
  return (
    <Stack gap={2}>
      <Text variant="labelXs" color={PASS.onNavyFaint} style={{ letterSpacing: 0.4 }}>{String(label).toUpperCase()}</Text>
      <Text variant="labelMd" color="#fff" numberOfLines={1}>{value}</Text>
    </Stack>
  );
}

