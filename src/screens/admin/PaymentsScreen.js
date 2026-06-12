import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Banner } from '../../components/Banner';
import { Tabs } from '../../components/Tabs';
import { KpiTile } from '../../components/KpiTile';
import { Stack, Row, Section } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn } from '../../components/motion';

import { paymentsApi, adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing } from '../../theme';
import { formatDateTime, statusLabel } from '../../i18n/format';

function compactTnd(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Number(n ?? 0).toFixed(0);
}

export default function AdminPayments() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [selected, setSelected] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [list, sum, pay] = await Promise.all([
      paymentsApi.listPayments({ actor: user }),
      adminApi.adminPaymentsSummary({ actor: user }),
      adminApi.adminDriverPayouts({ actor: user }),
    ]);
    setRows(list);
    setSummary(sum);
    setPayouts(pay);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refund = async () => {
    const amount = Number(refundAmount);
    if (!amount) return toast.show(t('admin:enterAmount'), 'warning');
    setBusy(true);
    const res = await paymentsApi.adminRefund({ actor: user, paymentId: selected.id, amount });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(t('toast:refundIssued', { amount }), 'success');
    setSelected(null);
    setRefundAmount('');
    load();
  };

  const flag = async () => {
    if (!flagReason) return toast.show(t('admin:addReason'), 'warning');
    setBusy(true);
    const res = await paymentsApi.adminFlagPayment({ actor: user, paymentId: selected.id, reason: flagReason });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(t('toast:flagged'), 'warning');
    setSelected(null);
    setFlagReason('');
    load();
  };

  const unflag = async () => {
    setBusy(true);
    const res = await paymentsApi.adminUnflagPayment({ actor: user, paymentId: selected.id });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(t('toast:flagResolved'), 'success');
    setSelected(null);
    load();
  };

  const flaggedRows = rows?.filter((p) => p.flagged) ?? null;
  const listForTab = tab === 'flagged' ? flaggedRows : rows;

  const renderPaymentCard = (p, i) => (
    <FadeSlideIn key={p.id} index={Math.min(i, 8)}>
      <Card onPress={() => setSelected(p)} accent={p.flagged ? colors.error : undefined}>
        <Row justify="space-between">
          <Stack gap={2} style={{ flex: 1 }}>
            <Text variant="bodyLg">{p.amount} {t('common:tnd')}</Text>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {statusLabel(t, p.method)} · {p.gateway_reference} · {formatDateTime(p.paid_at)}
            </Text>
          </Stack>
          <Stack gap={4} style={{ alignItems: 'flex-end' }}>
            <Badge
              label={statusLabel(t, p.status)}
              variant={
                p.status === 'succeeded'
                  ? 'success'
                  : p.status === 'refunded' || p.status === 'flagged'
                    ? 'warning'
                    : 'error'
              }
            />
            {p.flagged ? <Badge label={t('toast:flagged')} variant="error" icon="flag" /> : null}
          </Stack>
        </Row>
      </Card>
    </FadeSlideIn>
  );

  return (
    <Screen>
      <FadeSlideIn index={0}>
        <ScreenHeader title={t('admin:paymentsTitle')} subtitle={t('admin:paymentsSubtitle')} />
      </FadeSlideIn>

      <Row gap={spacing.sm}>
        <FadeSlideIn index={1} style={{ flex: 1 }}>
          <KpiTile
            icon="trending-up"
            tone="accent"
            value={`${compactTnd(summary?.revenue7d ?? 0)} ${t('common:tnd')}`}
            label={t('admin:revenue7d')}
          />
        </FadeSlideIn>
        <FadeSlideIn index={2} style={{ flex: 1 }}>
          <KpiTile
            icon="flag"
            tone="warning"
            value={summary?.flaggedCount ?? '—'}
            label={t('admin:flaggedKpi')}
          />
        </FadeSlideIn>
      </Row>
      <Row gap={spacing.sm}>
        <FadeSlideIn index={3} style={{ flex: 1 }}>
          <KpiTile
            icon="undo"
            tone="neutral"
            value={`${compactTnd(summary?.refundedSum ?? 0)} ${t('common:tnd')}`}
            label={t('admin:refundedTotal')}
          />
        </FadeSlideIn>
        <FadeSlideIn index={4} style={{ flex: 1 }}>
          <KpiTile
            icon="account-balance-wallet"
            tone="success"
            value={`${compactTnd(summary?.driverFees ?? 0)} ${t('common:tnd')}`}
            label={t('admin:driverFeesOwed')}
          />
        </FadeSlideIn>
      </Row>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: t('admin:tabAllPayments') },
          { key: 'flagged', label: t('admin:tabFlagged') },
          { key: 'payouts', label: t('admin:tabPayouts') },
        ]}
      />

      {tab === 'payouts' ? (
        payouts === null ? (
          <SkeletonList count={4} lines={1} />
        ) : payouts.length === 0 ? (
          <EmptyState
            icon="account-balance-wallet"
            title={t('admin:payoutsEmptyTitle')}
            body={t('admin:payoutsEmptyBody')}
          />
        ) : (
          payouts.map((row, i) => (
            <FadeSlideIn key={row.driver_id} index={Math.min(i, 8)}>
              <Card>
                <Row justify="space-between">
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text variant="bodyLg">{row.full_name}</Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('admin:paymentsCount', { count: row.payments_count })}
                      {row.last_payment_at ? ` · ${formatDateTime(row.last_payment_at)}` : ''}
                    </Text>
                    {!row.payout_account ? (
                      <Badge label={t('admin:payoutAccountMissing')} variant="warning" icon="warning-amber" />
                    ) : null}
                  </Stack>
                  <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('admin:owedToDriver')}
                    </Text>
                    <Text variant="headlineSm" color={colors.success}>
                      {Number(row.driver_fees).toFixed(3)} {t('common:tnd')}
                    </Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {t('admin:platformShare')}: {Number(row.platform_fees).toFixed(3)} {t('common:tnd')}
                    </Text>
                  </Stack>
                </Row>
              </Card>
            </FadeSlideIn>
          ))
        )
      ) : listForTab === null ? (
        <SkeletonList count={5} lines={1} />
      ) : listForTab.length === 0 ? (
        tab === 'flagged' ? (
          <EmptyState icon="flag" title={t('admin:noFlaggedTitle')} body={t('admin:noFlaggedBody')} />
        ) : (
          <EmptyState icon="payments" title={t('admin:noPaymentsTitle')} body={t('admin:noPaymentsBody')} />
        )
      ) : (
        listForTab.map(renderPaymentCard)
      )}

      {selected ? (
        <FadeSlideIn>
          <Card style={{ gap: spacing.md }} accent={colors.primary}>
            <Section title={t('admin:action')} />
            {selected.flagged ? (
              <>
                <Banner
                  variant="warning"
                  title={t('admin:refundBlockedTitle')}
                  body={t('admin:refundBlockedBody', {
                    reason: selected.flag_reason ?? selected.flagged_reason ?? '—',
                  })}
                />
                <Button
                  label={t('admin:resolveFlag')}
                  variant="secondary"
                  onPress={unflag}
                  loading={busy}
                />
              </>
            ) : (
              <>
                <Banner
                  variant="info"
                  title={t('admin:cardTokenizedTitle')}
                  body={t('admin:cardTokenizedBody', { ref: selected.gateway_reference })}
                />
                <Input
                  label={t('admin:refundAmount')}
                  value={refundAmount}
                  onChangeText={setRefundAmount}
                  keyboardType="decimal-pad"
                  hint={t('admin:maxAmount', { amount: selected.amount })}
                />
                <Row gap={spacing.sm}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t('admin:fullRefund')}
                      variant="outline"
                      onPress={() => setRefundAmount(String(selected.amount))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label={t('admin:refund')} variant="secondary" onPress={refund} loading={busy} />
                  </View>
                </Row>
                <Input
                  label={t('admin:flagReason')}
                  value={flagReason}
                  onChangeText={setFlagReason}
                  placeholder={t('admin:flagPlaceholder')}
                />
                <Button label={t('admin:flagForReview')} variant="danger" onPress={flag} loading={busy} />
              </>
            )}
            <Button label={t('common:close')} variant="ghost" onPress={() => setSelected(null)} />
          </Card>
        </FadeSlideIn>
      ) : null}
    </Screen>
  );
}
