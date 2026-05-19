import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
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

export default function AdminPayments() {
  const { colors } = useTheme();
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
    if (!amount) return toast.show('Enter an amount', 'warning');
    setBusy(true);
    const res = await paymentsApi.adminRefund({ actor: user, paymentId: selected.id, amount });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show(`Refund issued (${amount} TND)`, 'success');
    setSelected(null);
    setRefundAmount('');
    load();
  };

  const flag = async () => {
    if (!flagReason) return toast.show('Add a reason', 'warning');
    setBusy(true);
    const res = await paymentsApi.adminFlagPayment({ actor: user, paymentId: selected.id, reason: flagReason });
    setBusy(false);
    if (!res.ok) return toast.show(res.error, 'error');
    toast.show('Flagged for review', 'warning');
    setSelected(null);
    setFlagReason('');
    load();
  };

  return (
    <Screen>
      <ScreenHeader title="Payments" subtitle="Refunds, flags, and gateway references" />
      {rows.length === 0 ? (
        <Banner variant="info" title="No payments yet" body="Once passengers book, transactions appear here." />
      ) : (
        rows.map((p) => (
          <Card key={p.id} onPress={() => setSelected(p)}>
            <Row justify="space-between">
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="bodyLg">{p.amount} TND</Text>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {p.method} · {p.gateway_reference} · {new Date(p.paid_at).toLocaleString()}
                </Text>
              </Stack>
              <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                <Badge
                  label={p.status}
                  variant={
                    p.status === 'succeeded' ? 'success' : p.status === 'refunded' ? 'warning' : 'error'
                  }
                />
                {p.flagged ? <Badge label="flagged" variant="error" icon="flag" /> : null}
              </Stack>
            </Row>
          </Card>
        ))
      )}

      {selected ? (
        <Card style={{ gap: spacing.md }} accent={colors.primary}>
          <Section title="Action" />
          <Banner
            variant="info"
            title="Card data is tokenized"
            body={`Gateway ref: ${selected.gateway_reference}. Louagi only stores the reference, never the card.`}
          />
          <Input
            label="Refund amount"
            value={refundAmount}
            onChangeText={setRefundAmount}
            keyboardType="decimal-pad"
            hint={`Max ${selected.amount} TND`}
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button
                label="Full refund"
                variant="outline"
                onPress={() => setRefundAmount(String(selected.amount))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Refund" variant="secondary" onPress={refund} loading={busy} />
            </View>
          </Row>
          <Input
            label="Flag reason"
            value={flagReason}
            onChangeText={setFlagReason}
            placeholder="e.g. Possible fraud, chargeback risk"
          />
          <Button label="Flag for review" variant="danger" onPress={flag} loading={busy} />
          <Button label="Close" variant="ghost" onPress={() => setSelected(null)} />
        </Card>
      ) : null}
    </Screen>
  );
}
