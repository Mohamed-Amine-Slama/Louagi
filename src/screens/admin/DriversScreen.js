import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Tabs } from '../../components/Tabs';
import { Stack, Row, Section } from '../../components/Section';
import { Banner } from '../../components/Banner';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { maskId } from '../../security/crypto';

import { driversApi, adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { statusLabel, formatDate } from '../../i18n/format';

const EMPTY_DRIVER_KEY = {
  pending: 'admin:noDriversPending',
  verified: 'admin:noDriversVerified',
  rejected: 'admin:noDriversRejected',
};

const DOC_KIND_ICON = {
  id_card: 'badge',
  license: 'card-membership',
  vehicle: 'directions-car',
  other: 'description',
};
const DOC_KIND_KEY = {
  id_card: 'admin:docKindIdCard',
  license: 'admin:docKindLicense',
  vehicle: 'admin:docKindVehicle',
  other: 'admin:docKindOther',
};

function formatSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function AdminDrivers() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await driversApi.adminListDrivers({ actor: user, status: tab }));
  }, [tab, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Selection only makes sense within one tab's list.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab]);

  // Fetch the applicant's uploaded documents whenever a driver is opened.
  useEffect(() => {
    const userId = selected?.user?.id;
    if (!userId) {
      setDocs(null);
      return undefined;
    }
    let cancelled = false;
    setDocs(null);
    adminApi.adminListUserDocuments({ actor: user, userId }).then((d) => {
      if (!cancelled) setDocs(Array.isArray(d) ? d : []);
    });
    return () => {
      cancelled = true;
    };
  }, [selected?.user?.id, user]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkApprove = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(
      ids.map((driverId) =>
        driversApi.adminVerifyDriver({ actor: user, driverId, approve: true, reason: null })
      )
    );
    setBulkBusy(false);
    const ok = results.filter((r) => r.status === 'fulfilled' && r.value?.ok).length;
    const fail = ids.length - ok;
    toast.show(
      fail === 0 ? t('toast:bulkApproved', { count: ok }) : t('toast:bulkPartial', { ok, fail }),
      fail === 0 ? 'success' : 'warning'
    );
    setSelectedIds(new Set());
    setSelected(null);
    load();
  };

  const decide = async (approve) => {
    if (!selected) return;
    setBusy(true);
    const res = await driversApi.adminVerifyDriver({
      actor: user,
      driverId: selected.id,
      approve,
      reason: approve ? null : rejectReason,
    });
    setBusy(false);
    if (!res.ok) {
      toast.show(res.error, 'error');
      return;
    }
    toast.show(approve ? t('toast:driverVerified') : t('toast:driverRejected'), approve ? 'success' : 'warning');
    setSelected(null);
    setRejectReason('');
    load();
  };

  return (
    <Screen>
      <FadeSlideIn index={0}>
        <ScreenHeader title={t('admin:driverVerifications')} subtitle={t('admin:driverVerificationsSubtitle')} />
      </FadeSlideIn>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'pending', label: t('admin:pending') },
          { key: 'verified', label: t('admin:verified') },
          { key: 'rejected', label: t('admin:rejected') },
        ]}
      />

      {tab === 'pending' && selectedIds.size > 0 ? (
        <FadeSlideIn>
          <Card variant="tonal">
            <Row justify="space-between" align="center">
              <Text variant="labelMd">{t('admin:selectedCount', { count: selectedIds.size })}</Text>
              <Row gap={spacing.sm}>
                <Button
                  label={t('admin:clearSelection')}
                  variant="ghost"
                  small
                  fullWidth={false}
                  onPress={() => setSelectedIds(new Set())}
                />
                <Button
                  label={t('admin:bulkApprove', { count: selectedIds.size })}
                  variant="secondary"
                  small
                  fullWidth={false}
                  onPress={bulkApprove}
                  loading={bulkBusy}
                />
              </Row>
            </Row>
          </Card>
        </FadeSlideIn>
      ) : null}

      {rows === null ? (
        <SkeletonList count={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon="verified-user" title={t(EMPTY_DRIVER_KEY[tab] || 'admin:noDriversPending')} />
      ) : (
        rows.map((d, i) => {
          const checked = selectedIds.has(d.id);
          return (
            <FadeSlideIn key={d.id} index={Math.min(i, 8)}>
              <Card onPress={() => setSelected(d)}>
                <Row justify="space-between">
                  {tab === 'pending' ? (
                    <PressableScale
                      onPress={() => toggleSelect(d.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={d.user?.full_name}
                      style={{ marginEnd: spacing.sm, alignSelf: 'center' }}
                    >
                      <MaterialIcons
                        name={checked ? 'check-circle' : 'radio-button-unchecked'}
                        size={24}
                        color={checked ? colors.secondaryContainer : colors.outline}
                      />
                    </PressableScale>
                  ) : null}
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text variant="bodyLg">{d.user?.full_name}</Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('driver:vehicleSummary', { brand: d.vehicle_brand, model: d.vehicle_model, count: d.seat_count })}
                    </Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('driver:plateValue', { plate: d.plate_number })}
                    </Text>
                  </Stack>
                  <Badge label={statusLabel(t, d.status)} variant={d.status === 'verified' ? 'success' : d.status === 'rejected' ? 'error' : 'warning'} />
                </Row>
              </Card>
            </FadeSlideIn>
          );
        })
      )}

      {selected ? (
        <FadeSlideIn>
          <Card accent={colors.primary} style={{ gap: spacing.md }}>
            <Section title={t('admin:reviewLabel', { name: selected.user?.full_name })} />
            <Banner
              variant="info"
              title={t('admin:fieldEncryptedTitle')}
              body={t('admin:fieldEncryptedBody')}
            />
            <Stack gap={4}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('admin:idNumber')}
              </Text>
              <Text variant="bodyMd">{maskId(selected.id_card_number)}</Text>
            </Stack>
            <Stack gap={4}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('admin:license')}
              </Text>
              <Text variant="bodyMd">{selected.license_number}</Text>
            </Stack>
            <Stack gap={4}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('driver:plate')}
              </Text>
              <Text variant="bodyMd">{selected.plate_number}</Text>
            </Stack>
            <Stack gap={spacing.xs}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('admin:documents')}
              </Text>
              {docs === null ? (
                <SkeletonList count={2} lines={1} />
              ) : docs.length === 0 ? (
                <Text variant="bodySm" color={colors.onSurfaceVariant}>
                  {t('admin:noDocuments')}
                </Text>
              ) : (
                docs.map((doc) => (
                  <Row key={doc.id} gap={spacing.sm} align="center">
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: radius.md,
                        backgroundColor: withAlpha(colors.primary, 0.1),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons
                        name={DOC_KIND_ICON[doc.kind] || 'description'}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Stack gap={0} style={{ flex: 1 }}>
                      <Text variant="labelMd" numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <Text variant="labelSm" color={colors.onSurfaceVariant}>
                        {t(DOC_KIND_KEY[doc.kind] || 'admin:docKindOther')} · {formatSize(doc.size_bytes)} · {formatDate(doc.uploaded_at)}
                      </Text>
                    </Stack>
                    {doc.storage_path && /^https?:\/\//.test(doc.storage_path) ? (
                      <PressableScale onPress={() => Linking.openURL(doc.storage_path)}>
                        <Text variant="labelMd" color={colors.primary}>
                          {t('admin:viewDocument')}
                        </Text>
                      </PressableScale>
                    ) : null}
                  </Row>
                ))
              )}
            </Stack>
            <Input
              label={t('admin:rejectReason')}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t('admin:rejectReasonPlaceholder')}
            />
            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Button label={t('admin:reject')} variant="danger" onPress={() => decide(false)} loading={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={t('admin:approve')} variant="secondary" onPress={() => decide(true)} loading={busy} />
              </View>
            </Row>
            <Button label={t('common:close')} variant="ghost" onPress={() => setSelected(null)} />
          </Card>
        </FadeSlideIn>
      ) : null}
    </Screen>
  );
}
