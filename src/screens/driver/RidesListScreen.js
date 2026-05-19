import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

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
import { spacing } from '../../theme';

export default function DriverRides() {
  const { colors } = useTheme();
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
      <ScreenHeader title="My rides" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'scheduled', label: 'Scheduled' },
          { key: 'in_progress', label: 'Live' },
          { key: 'completed', label: 'Done' },
          { key: 'cancelled', label: 'Cancelled' },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon="route"
          title={`No ${tab.replace('_', ' ')} rides`}
          body="Create a ride to start filling seats."
          actionLabel="Create ride"
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
                    {new Date(r.departure_time).toLocaleString()}
                  </Text>
                </Stack>
                <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                  <Text variant="headlineSm" color={colors.primary}>
                    {sold * r.price_per_seat} TND
                  </Text>
                  <Badge label={`${sold}/${r.total_seats} seats`} variant="info" icon="event-seat" />
                </Stack>
              </Row>
            </Card>
          );
        })
      )}
      <FAB icon="add" label="New ride" onPress={() => nav.navigate('CreateRide')} />
    </Screen>
  );
}
