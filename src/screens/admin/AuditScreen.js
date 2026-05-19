import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';

import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing } from '../../theme';

function actionVariant(action) {
  if (action.startsWith('login') || action.startsWith('register')) return 'info';
  if (action.includes('refund') || action.includes('cancel')) return 'warning';
  if (action.includes('suspend') || action.includes('flag') || action.includes('failed')) return 'error';
  if (action.includes('verified') || action.includes('success') || action.includes('confirmed')) return 'success';
  return 'neutral';
}

export default function AdminAudit() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const res = await adminApi.adminListAudit({ actor: user, filters: { actionType: q || undefined } });
    setRows(res.rows);
    setTotal(res.total);
  }, [user, q]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <ScreenHeader title="Audit log" subtitle="Immutable — append-only" />
      <Banner
        variant="info"
        title="Tamper-resistant"
        body="No edit or delete endpoints exist. Old entries are never overwritten."
      />
      <Input
        label="Filter by action type"
        value={q}
        onChangeText={setQ}
        iconLeft="search"
        placeholder="e.g. ride.cancelled, login.success"
      />
      <Text variant="labelSm" color={colors.onSurfaceVariant}>
        Showing {rows.length} of {total} entries
      </Text>
      {rows.map((e) => (
        <Card key={e.id}>
          <Row justify="space-between">
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="labelMd">{e.action_type}</Text>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {e.actor_role} · {e.actor_id?.slice(0, 8) ?? 'anon'} · {e.ip_address}
              </Text>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {new Date(e.created_at).toLocaleString()}
              </Text>
              {e.metadata ? (
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {JSON.stringify(e.metadata)}
                </Text>
              ) : null}
            </Stack>
            <Badge label={e.target_entity ?? '—'} variant={actionVariant(e.action_type)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
