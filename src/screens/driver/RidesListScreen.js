import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { FAB } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Row, Stack } from '../../components/Section';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, shadows } from '../../theme';
import { formatDateTime } from '../../i18n/format';

const EMPTY_TITLE_KEY = {
  scheduled: 'driver:noTabRidesScheduled',
  in_progress: 'driver:noTabRidesLive',
  completed: 'driver:noTabRidesDone',
  cancelled: 'driver:noTabRidesCancelled',
};

// Pill segmented control for the four ride states.
function Segmented({ value, onChange, items }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceContainerHigh, borderRadius: 13, padding: 4, gap: 4 }}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <PressableScale key={it.key} onPress={() => onChange(it.key)} style={{ flex: 1 }}>
            <View style={[{ borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: active ? colors.surfaceContainerLowest : 'transparent' }, active ? shadows.soft : null]}>
              <Text variant="labelSm" color={active ? colors.secondaryContainer : colors.onSurfaceVariant} numberOfLines={1}>{it.label}</Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function DriverRides() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();
  const [tab, setTab] = useState('scheduled');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await ridesApi.driverRides({ actor: user, status: tab }));
    setLoading(false);
  }, [tab, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Text variant="headlineMd" style={{ marginTop: spacing.xs }}>{t('driver:ridesTitle')}</Text>
      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { key: 'scheduled', label: t('driver:tabsScheduled') },
          { key: 'in_progress', label: t('driver:tabsLive') },
          { key: 'completed', label: t('driver:tabsDone') },
          { key: 'cancelled', label: t('driver:tabsCancelled') },
        ]}
      />

      {loading ? (
        <SkeletonList count={4} lines={1} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="route"
          title={t(EMPTY_TITLE_KEY[tab] || 'driver:noRidesTitle')}
          body={t('driver:createRideListBody')}
          actionLabel={t('driver:createRide')}
          onAction={() => nav.navigate('CreateRide')}
        />
      ) : (
        <Stack gap={spacing.md}>
          {rows.map((r, i) => {
            const sold = (r.total_seats ?? r.available_seats) - r.available_seats;
            return (
              <FadeSlideIn key={r.id} index={Math.min(i, 8)}>
                <Card onPress={() => nav.navigate('RideManagement', { id: r.id })}>
                  <Row justify="space-between" align="flex-start">
                    <Stack gap={2} style={{ flex: 1, minWidth: 0, paddingEnd: spacing.sm }}>
                      <Text variant="headlineSm" numberOfLines={1}>{r.route?.origin_city} → {r.route?.destination_city}</Text>
                      <Text variant="labelSm" color={colors.onSurfaceVariant}>{formatDateTime(r.departure_time)}</Text>
                    </Stack>
                    <Text variant="headlineSm" color={colors.primary} numberOfLines={1}>{sold * r.price_per_seat} {t('common:tnd')}</Text>
                  </Row>
                  <Row justify="space-between" align="center" style={{ marginTop: 13, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.outlineVariant }}>
                    <Row gap={7} align="center" style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 6 }}>
                      <MaterialIcons name="group" size={14} color={colors.primary} />
                      <Text variant="labelSm" color={colors.primary}>{t('driver:seatsCount', { count: sold, total: r.total_seats })}</Text>
                    </Row>
                    <Row gap={4} align="center">
                      <Text variant="labelMd" color={colors.onSurfaceVariant}>{t('driver:viewDetails')}</Text>
                      <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />
                    </Row>
                  </Row>
                </Card>
              </FadeSlideIn>
            );
          })}
        </Stack>
      )}

      <FAB icon="add" label={t('driver:newRide')} onPress={() => nav.navigate('CreateRide')} />
    </Screen>
  );
}
