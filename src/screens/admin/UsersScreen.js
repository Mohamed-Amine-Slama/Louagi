import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Banner } from '../../components/Banner';
import { Stack, Row, Section } from '../../components/Section';

import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { maskPhone } from '../../security/crypto';
import { spacing } from '../../theme';

export default function AdminUsers() {
  const { colors } = useTheme();
  const { user, applySession } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await adminApi.adminSearchUsers({ actor: user, q }));
  }, [user, q]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async () => {
    setBusy(true);
    const res = await adminApi.adminSetUserActive({
      actor: user,
      userId: selected.id,
      active: !selected.is_active,
    });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(selected.is_active ? 'User suspended' : 'User reactivated', 'success');
    setSelected({ ...selected, is_active: !selected.is_active });
    load();
  };

  const impersonate = async () => {
    setBusy(true);
    const res = await adminApi.adminImpersonate({ actor: user, userId: selected.id });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show('Impersonation session — all actions audit-logged.', 'warning');
    await applySession({
      accessToken: res.accessToken,
      refreshToken: null,
      user: { id: res.target.id, name: res.target.full_name, role: res.target.role },
    });
  };

  return (
    <Screen>
      <ScreenHeader title="User management" subtitle="Search, suspend, impersonate" />
      <Input
        label="Search users"
        value={q}
        onChangeText={setQ}
        iconLeft="search"
        placeholder="Name, phone, or email"
      />

      {rows.map((u) => (
        <Card key={u.id} onPress={() => setSelected(u)}>
          <Row justify="space-between">
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="bodyLg">{u.full_name}</Text>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {u.email} · {maskPhone(u.phone_decrypted)}
              </Text>
            </Stack>
            <Stack gap={4} style={{ alignItems: 'flex-end' }}>
              <Badge label={u.role} variant="info" />
              <Badge
                label={u.is_active ? 'active' : 'suspended'}
                variant={u.is_active ? 'success' : 'error'}
              />
            </Stack>
          </Row>
        </Card>
      ))}

      {selected ? (
        <Card style={{ gap: spacing.md }} accent={colors.primary}>
          <Section title={selected.full_name} />
          <Banner
            variant="warning"
            title="Sensitive actions"
            body="Suspending the last admin is blocked at the API. Impersonating an admin is blocked too."
          />
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              Phone
            </Text>
            <Text variant="bodyMd">{maskPhone(selected.phone_decrypted)}</Text>
          </Stack>
          <Stack gap={4}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              Email
            </Text>
            <Text variant="bodyMd">{selected.email}</Text>
          </Stack>
          {selected.driver ? (
            <Stack gap={4}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                Driver record
              </Text>
              <Text variant="bodyMd">
                {selected.driver.vehicle_brand} {selected.driver.vehicle_model} · {selected.driver.status}
              </Text>
            </Stack>
          ) : null}
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button
                label={selected.is_active ? 'Suspend' : 'Reactivate'}
                variant={selected.is_active ? 'danger' : 'secondary'}
                onPress={toggle}
                loading={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Impersonate"
                variant="outline"
                onPress={impersonate}
                loading={busy}
                disabled={selected.role === 'admin'}
              />
            </View>
          </Row>
          <Button label="Close" variant="ghost" onPress={() => setSelected(null)} />
        </Card>
      ) : null}
    </Screen>
  );
}
