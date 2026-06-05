import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Badge } from '../../components/Badge';
import { Button, FAB } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Row, Stack } from '../../components/Section';
import { Tabs } from '../../components/Tabs';
import { ridesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatDateTime } from '../../i18n/format';

const EMPTY_TITLE_KEY = {
  scheduled: 'driver:noTabRidesScheduled',
  in_progress: 'driver:noTabRidesLive',
  completed: 'driver:noTabRidesDone',
  cancelled: 'driver:noTabRidesCancelled',
};

export default function DriverRides() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();
  const [tab, setTab] = useState('scheduled');
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setRows(await ridesApi.driverRides({ actor: user, status: tab }));
  }, [tab, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <ScreenHeader title={t('driver:ridesTitle')} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'scheduled', label: t('driver:tabsScheduled') },
          { key: 'in_progress', label: t('driver:tabsLive') },
          { key: 'completed', label: t('driver:tabsDone') },
          { key: 'cancelled', label: t('driver:tabsCancelled') },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon="route"
          title={t(EMPTY_TITLE_KEY[tab] || 'driver:noRidesTitle')}
          body={t('driver:createRideListBody')}
          actionLabel={t('driver:createRide')}
          onAction={() => nav.navigate('CreateRide')}
        />
      ) : (
        rows.map((r) => {
          const sold = (r.total_seats ?? r.available_seats) - r.available_seats;
          return (
            <Card key={r.id} onPress={() => nav.navigate('RideManagement', { id: r.id })}>
              <Row justify="space-between">
                <Stack gap={2}>
                  <Text variant="bodyLg">
                    {r.route?.origin_city} → {r.route?.destination_city}
                  </Text>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {formatDateTime(r.departure_time)}
                  </Text>
                </Stack>
                <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                  <Text variant="headlineSm" color={colors.primary}>
                    {sold * r.price_per_seat} {t('common:tnd')}
                  </Text>
                  <Badge label={t('driver:seatsCount', { count: sold, total: r.total_seats })} variant="info" icon="event-seat" />
                </Stack>
              </Row>
              {/* Tap hint */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: spacing.sm,
                paddingTop: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: withAlpha(colors.outlineVariant, 0.3),
                gap: 4,
              }}>
                <MaterialIcons name="touch-app" size={14} color={colors.onSurfaceVariant} />
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('driver:tapForDetails', 'Tap to view details')}
                </Text>
                <MaterialIcons name="chevron-right" size={16} color={colors.onSurfaceVariant} />
              </View>
            </Card>
          );
        })
      )}
      <FAB icon="add" label={t('driver:newRide')} onPress={() => nav.navigate('CreateRide')} />
    </Screen>
  );
}
