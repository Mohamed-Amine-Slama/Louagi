// Passenger live map: polls GetDeliveryTracking (~5s) and shows the carrying
// driver's position relative to the destination. Renders a small state machine
// — loader → info screen (not started / ended / unavailable) → live map.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Platform, StatusBar } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Text } from '../../components/Text';
import { Row, Stack } from '../../components/Section';
import { PressableScale } from '../../components/motion';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { trackingApi } from '../../api';
import { spacing, radius, withAlpha, shadows } from '../../theme';
import { updatedAgo } from '../../i18n/format';
import { cityCoords, haversineKm, etaMinutes, TUNISIA_CENTER } from '../../lib/geo';
import { PASS, initialsOf } from '../../lib/tickets';

const POLL_MS = 5000;
const DRIVER_PIN = '#C8102E';
const DEST_PIN = '#1B8A5A';

export default function TrackDeliveryScreen() {
  const { colors, isDark } = useTheme();
  const { t, locale } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const deliveryId = route.params?.deliveryId;

  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const load = useCallback(async () => {
    if (!deliveryId) { setLoading(false); return; }
    const res = await trackingApi.getDeliveryTracking({ deliveryId });
    // Ignore transient network errors ({ ok:false }); only commit real states.
    if (res && typeof res.trackable !== 'undefined') setTracking(res);
    setLoading(false);
  }, [deliveryId]);

  // Poll only while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const tick = async () => { if (active) await load(); };
      tick();
      const id = setInterval(tick, POLL_MS);
      return () => { active = false; clearInterval(id); };
    }, [load])
  );

  const driverCoord = tracking?.location
    ? { latitude: tracking.location.latitude, longitude: tracking.location.longitude }
    : null;
  const destCoord = cityCoords(tracking?.route?.destination_city);

  // Recenter as new fixes arrive (no-op when the map isn't mounted).
  useEffect(() => {
    if (driverCoord && mapRef.current) {
      mapRef.current.animateCamera({ center: driverCoord }, { duration: 700 });
    }
  }, [driverCoord?.latitude, driverCoord?.longitude]);

  const goBack = () => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs', { screen: 'Delivery' }));

  if (loading && !tracking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!tracking || tracking.trackable === false) {
    return <TrackInfo reason={tracking?.reason} tracking={tracking} onBack={goBack} />;
  }

  const distance = haversineKm(driverCoord, destCoord);
  const eta = etaMinutes(driverCoord, destCoord, tracking.route);
  const initialRegion = {
    latitude: driverCoord?.latitude ?? destCoord?.latitude ?? TUNISIA_CENTER.latitude,
    longitude: driverCoord?.longitude ?? destCoord?.longitude ?? TUNISIA_CENTER.longitude,
    latitudeDelta: driverCoord ? 0.4 : 3.5,
    longitudeDelta: driverCoord ? 0.4 : 3.5,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {destCoord ? (
          <Marker coordinate={destCoord} title={tracking.route?.destination_city} pinColor={DEST_PIN} />
        ) : null}
        {driverCoord ? (
          <Marker coordinate={driverCoord} title={tracking.driver?.name} pinColor={DRIVER_PIN} />
        ) : null}
        {driverCoord && destCoord ? (
          <Polyline
            coordinates={[driverCoord, destCoord]}
            strokeColor={withAlpha(colors.primary, 0.6)}
            strokeWidth={3}
            lineDashPattern={[8, 8]}
          />
        ) : null}
      </MapView>

      {/* Top bar */}
      <View style={{ position: 'absolute', top: insets.top + spacing.sm, start: spacing.containerMargin, end: spacing.containerMargin }}>
        <Row gap={spacing.sm} align="center">
          <PressableScale onPress={goBack} scaleTo={0.9} style={[roundBtn(colors), shadows.card]}>
            <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
          </PressableScale>
          <View style={[{ flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, shadows.card]}>
            <Row gap={spacing.sm} align="center" justify="space-between">
              <Text variant="labelMd" numberOfLines={1} style={{ flex: 1 }}>
                {tracking.route?.origin_city} → {tracking.route?.destination_city}
              </Text>
              <Row gap={4} align="center">
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
                <Text variant="labelSm" color={colors.success}>{t('delivery:liveNow')}</Text>
              </Row>
            </Row>
          </View>
        </Row>
      </View>

      {/* Bottom sheet */}
      <View style={{ position: 'absolute', start: spacing.containerMargin, end: spacing.containerMargin, bottom: insets.bottom + spacing.lg }}>
        <View style={[{ backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md }, shadows.card]}>
          {!driverCoord ? (
            <Row gap={spacing.sm} align="center">
              <ActivityIndicator color={colors.primary} />
              <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ flex: 1 }}>{t('delivery:waitingFixTitle')}</Text>
            </Row>
          ) : (
            <Row gap={spacing.md} align="center">
              <View style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: PASS.driver, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="labelMd" color="#fff">{initialsOf(tracking.driver?.name)}</Text>
              </View>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text variant="labelMd" numberOfLines={1}>{tracking.driver?.name}</Text>
                <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1}>
                  {tracking.driver?.vehicle}{tracking.driver?.plate_masked ? ` · ${tracking.driver.plate_masked}` : ''}
                </Text>
              </Stack>
              {tracking.driver?.rating != null ? (
                <Row gap={3} align="center">
                  <MaterialIcons name="star" size={14} color={colors.warning} />
                  <Text variant="labelSm">{tracking.driver.rating.toFixed(1)}</Text>
                </Row>
              ) : null}
            </Row>
          )}

          <Row gap={spacing.sm} align="stretch">
            <Stat
              icon="schedule"
              label={t('delivery:etaLabel')}
              value={eta != null ? t('delivery:etaMinutes', { count: eta }) : '—'}
              colors={colors}
            />
            <Stat
              icon="straighten"
              label={t('delivery:destination')}
              value={distance != null ? t('delivery:distanceAway', { km: distance.toFixed(distance < 10 ? 1 : 0) }) : '—'}
              colors={colors}
            />
          </Row>

          <Text variant="labelXs" color={colors.onSurfaceVariant}>
            {tracking.location?.updatedAt ? updatedAgo(tracking.location.updatedAt, t) : t('delivery:sharingWaiting')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TrackInfo({ reason, tracking, onBack }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();

  const driverName = tracking?.driver?.name || t('delivery:driverLabel');
  const byReason = {
    not_started: { icon: 'schedule', title: t('delivery:notStartedTitle'), body: t('delivery:notStartedBody', { name: driverName }) },
    ended: { icon: 'check-circle', title: t('delivery:endedTitle'), body: t('delivery:endedBody') },
    forbidden: { icon: 'lock-outline', title: t('delivery:forbiddenTitle'), body: t('delivery:forbiddenBody') },
    not_found: { icon: 'help-outline', title: t('delivery:forbiddenTitle'), body: t('delivery:forbiddenBody') },
  };
  const info = byReason[reason] || byReason.forbidden;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.containerMargin }}>
      <PressableScale
        onPress={onBack}
        scaleTo={0.9}
        style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
      </PressableScale>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: insets.bottom + 80 }}>
        <View style={{ width: 96, height: 96, borderRadius: radius.full, backgroundColor: withAlpha(colors.primary, 0.08), alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={info.icon} size={40} color={colors.primary} />
        </View>
        <Text variant="headlineSm" style={{ textAlign: 'center', marginTop: spacing.sm }}>{info.title}</Text>
        <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center', paddingHorizontal: spacing.lg }}>
          {info.body}
        </Text>
        {tracking?.route?.origin_city ? (
          <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginTop: spacing.sm }}>
            {tracking.route.origin_city} → {tracking.route.destination_city}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ icon, label, value, colors }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.lg, padding: spacing.md, gap: 4 }}>
      <Row gap={6} align="center">
        <MaterialIcons name={icon} size={14} color={colors.onSurfaceVariant} />
        <Text variant="labelXs" color={colors.onSurfaceVariant}>{label}</Text>
      </Row>
      <Text variant="labelMd">{value}</Text>
    </View>
  );
}

const roundBtn = (colors) => ({
  width: 40,
  height: 40,
  borderRadius: radius.full,
  backgroundColor: colors.surfaceContainerLowest,
  alignItems: 'center',
  justifyContent: 'center',
});
