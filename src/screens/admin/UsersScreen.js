import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
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
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn } from '../../components/motion';

import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { maskPhone } from '../../security/crypto';
import { spacing } from '../../theme';

export default function AdminUsers() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user, applySession } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [stepUpCode, setStepUpCode] = useState('');
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
    toast.show(selected.is_active ? t('toast:userSuspended') : t('toast:userReactivated'), 'success');
    setSelected({ ...selected, is_active: !selected.is_active });
    load();
  };

  const impersonate = async () => {
    setBusy(true);
    const res = await adminApi.adminImpersonate({
      actor: user,
      userId: selected.id,
      mfaCode: stepUpCode.trim(),
    });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    setStepUpCode('');
    toast.show(t('toast:impersonating'), 'warning');
    await applySession({
      accessToken: res.accessToken,
      refreshToken: null,
      user: { id: res.target.id, name: res.target.full_name, role: res.target.role },
    });
  };

  return (
    <Screen>
      <FadeSlideIn index={0}>
        <ScreenHeader title={t('admin:userManagement')} subtitle={t('admin:userManagementSubtitle')} />
      </FadeSlideIn>
      <FadeSlideIn index={1}>
        <Input
          label={t('admin:searchUsers')}
          value={q}
          onChangeText={setQ}
          iconLeft="search"
          placeholder={t('admin:searchPlaceholder')}
        />
      </FadeSlideIn>

      {rows === null ? (
        <SkeletonList count={4} lines={1} />
      ) : rows.length === 0 ? (
        <EmptyState icon="person-search" title={t('errors:userNotFound')} />
      ) : (
        rows.map((u, i) => (
          <FadeSlideIn key={u.id} index={Math.min(i, 8)}>
            <Card
              onPress={() => {
                setSelected(u);
                setStepUpCode('');
              }}
            >
              <Row justify="space-between">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="bodyLg">{u.full_name}</Text>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>
                    {u.email} · {maskPhone(u.phone_number)}
                  </Text>
                </Stack>
                <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                  <Badge label={u.role} variant="info" />
                  <Badge
                    label={u.is_active ? t('admin:active') : t('admin:suspended')}
                    variant={u.is_active ? 'success' : 'error'}
                  />
                </Stack>
              </Row>
            </Card>
          </FadeSlideIn>
        ))
      )}

      {selected ? (
        <FadeSlideIn>
          <Card style={{ gap: spacing.md }} accent={colors.primary}>
            <Section title={selected.full_name} />
            <Banner
              variant="warning"
              title={t('admin:sensitiveActionsTitle')}
              body={t('admin:sensitiveActionsBody')}
            />
            <Stack gap={4}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('admin:phone')}
              </Text>
              <Text variant="bodyMd">{maskPhone(selected.phone_number)}</Text>
            </Stack>
            <Stack gap={4}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('admin:email')}
              </Text>
              <Text variant="bodyMd">{selected.email}</Text>
            </Stack>
            {selected.driver ? (
              <Stack gap={4}>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('admin:driverRecord')}
                </Text>
                <Text variant="bodyMd">
                  {selected.driver.vehicle_brand} {selected.driver.vehicle_model} · {selected.driver.status}
                </Text>
              </Stack>
            ) : null}
            <Input
              label={t('admin:stepUpCode')}
              value={stepUpCode}
              onChangeText={setStepUpCode}
              placeholder={t('admin:stepUpCodePlaceholder')}
              autoCapitalize="none"
              secureTextEntry
            />
            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Button
                  label={selected.is_active ? t('admin:suspend') : t('admin:reactivate')}
                  variant={selected.is_active ? 'danger' : 'secondary'}
                  onPress={toggle}
                  loading={busy}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('admin:impersonate')}
                  variant="outline"
                  onPress={impersonate}
                  loading={busy}
                  disabled={selected.role === 'admin' || !stepUpCode.trim()}
                />
              </View>
            </Row>
            <Button
              label={t('common:close')}
              variant="ghost"
              onPress={() => {
                setSelected(null);
                setStepUpCode('');
              }}
            />
          </Card>
        </FadeSlideIn>
      ) : null}
    </Screen>
  );
}
