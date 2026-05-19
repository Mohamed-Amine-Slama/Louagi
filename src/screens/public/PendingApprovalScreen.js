import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';
import { ScreenHeader } from '../../components/Header';

import { driversApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius } from '../../theme';

export default function PendingApprovalScreen() {
  const { colors } = useTheme();
  const { user, setUser, signOut } = useAuth();
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    const tick = async () => {
      const res = await driversApi.getDriverStatus({ actor: user });
      setStatus(res.status);
      if (res.status === 'verified') {
        await setUser({ ...user, driverStatus: 'verified' });
      }
    };
    tick();
    const t = setInterval(tick, 7000);
    return () => clearInterval(t);
  }, [user, setUser]);

  return (
    <Screen>
      <ScreenHeader title="Application submitted" subtitle="We're reviewing your documents" />
      <Card style={{ alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: radius.full,
            backgroundColor: colors.surfaceContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons
            name={status === 'verified' ? 'verified' : status === 'rejected' ? 'block' : 'hourglass-top'}
            size={36}
            color={status === 'verified' ? colors.success : status === 'rejected' ? colors.error : colors.primary}
          />
        </View>
        <Text variant="headlineMd">
          {status === 'verified'
            ? "You're verified!"
            : status === 'rejected'
            ? 'Application rejected'
            : 'Pending review'}
        </Text>
        <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
          {status === 'verified'
            ? 'You can now create rides and start earning.'
            : status === 'rejected'
            ? 'Reach out to ops if you believe this was an error.'
            : 'Our ops team typically reviews applications within 24 hours.'}
        </Text>
      </Card>

      <Banner
        variant="info"
        title="How review works"
        body="An admin verifies your ID, license, and plate. Documents are encrypted at rest and never shared publicly."
      />

      <Stack gap={spacing.sm}>
        <Text variant="labelMd" color={colors.onSurfaceVariant}>
          Checklist
        </Text>
        <Row gap={spacing.sm}>
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
          <Text variant="bodyMd">National ID uploaded</Text>
        </Row>
        <Row gap={spacing.sm}>
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
          <Text variant="bodyMd">Driver's license uploaded</Text>
        </Row>
        <Row gap={spacing.sm}>
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
          <Text variant="bodyMd">Vehicle photo uploaded</Text>
        </Row>
      </Stack>

      <Button label="Sign out" variant="outline" onPress={signOut} />
    </Screen>
  );
}
