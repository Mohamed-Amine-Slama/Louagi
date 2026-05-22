import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
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
  const { t } = useLocale();
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
      <ScreenHeader title={t('auth:applicationSubmittedTitle')} subtitle={t('auth:applicationSubmittedSubtitle')} />
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
            ? t('auth:youAreVerified')
            : status === 'rejected'
            ? t('auth:applicationRejected')
            : t('auth:pendingReview')}
        </Text>
        <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
          {status === 'verified'
            ? t('auth:verifiedBody')
            : status === 'rejected'
            ? t('auth:rejectedBody')
            : t('auth:pendingBody')}
        </Text>
      </Card>

      <Banner
        variant="info"
        title={t('auth:howReviewWorks')}
        body={t('auth:howReviewWorksBody')}
      />

      <Stack gap={spacing.sm}>
        <Text variant="labelMd" color={colors.onSurfaceVariant}>
          {t('auth:checklist')}
        </Text>
        <Row gap={spacing.sm}>
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
          <Text variant="bodyMd">{t('auth:checklistId')}</Text>
        </Row>
        <Row gap={spacing.sm}>
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
          <Text variant="bodyMd">{t('auth:checklistLicense')}</Text>
        </Row>
        <Row gap={spacing.sm}>
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
          <Text variant="bodyMd">{t('auth:checklistVehicle')}</Text>
        </Row>
      </Stack>

      <Button label={t('auth:signout')} variant="outline" onPress={signOut} />
    </Screen>
  );
}
