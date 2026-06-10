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
import { Stack, Row, Section } from '../../components/Section';

import { paymentsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing } from '../../theme';
import { formatDateTime, statusLabel } from '../../i18n/format';

export default function AdminPayments() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await paymentsApi.listPayments({ actor: user }));
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

  return (
    <Screen>
      <ScreenHeader title={t('admin:paymentsTitle')} subtitle={t('admin:paymentsSubtitle')} />
      {rows.length === 0 ? (
        <Banner variant="info" title={t('admin:noPaymentsTitle')} body={t('admin:noPaymentsBody')} />
      ) : (
        rows.map((p) => (
          <Card key={p.id} onPress={() => setSelected(p)}>
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
        ))
      )}

      {selected ? (
        <Card style={{ gap: spacing.md }} accent={colors.primary}>
          <Section title={t('admin:action')} />
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
          <Button label={t('common:close')} variant="ghost" onPress={() => setSelected(null)} />
        </Card>
      ) : null}
    </Screen>
  );
}
