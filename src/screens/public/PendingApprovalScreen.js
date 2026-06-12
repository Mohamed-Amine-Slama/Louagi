import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';
import { ScreenHeader } from '../../components/Header';
import { FadeSlideIn } from '../../components/motion';

import { driversApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';

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

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (status !== 'pending') {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 250 });
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [status, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.14 }],
    opacity: 1 - pulse.value * 0.45,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.04 }],
  }));

  const statusColor =
    status === 'verified' ? colors.success : status === 'rejected' ? colors.error : colors.primary;

  return (
    <Screen>
      <ScreenHeader title={t('auth:applicationSubmittedTitle')} subtitle={t('auth:applicationSubmittedSubtitle')} />
      <FadeSlideIn index={0}>
        <Card style={{ alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
          <View style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 104,
                  height: 104,
                  borderRadius: radius.full,
                  backgroundColor: withAlpha(statusColor, 0.12),
                },
                haloStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  width: 84,
                  height: 84,
                  borderRadius: radius.full,
                  backgroundColor: colors.surfaceContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                iconStyle,
              ]}
            >
              <MaterialIcons
                name={status === 'verified' ? 'verified' : status === 'rejected' ? 'block' : 'hourglass-top'}
                size={36}
                color={statusColor}
              />
            </Animated.View>
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
      </FadeSlideIn>

      <FadeSlideIn index={1}>
        <Banner
          variant="info"
          title={t('auth:howReviewWorks')}
          body={t('auth:howReviewWorksBody')}
        />
      </FadeSlideIn>

      <FadeSlideIn index={2}>
        <Stack gap={spacing.sm}>
          <Text variant="labelMd" color={colors.onSurfaceVariant}>
            {t('auth:checklist')}
          </Text>
          <FadeSlideIn index={3}>
            <Row gap={spacing.sm}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text variant="bodyMd">{t('auth:checklistId')}</Text>
            </Row>
          </FadeSlideIn>
          <FadeSlideIn index={4}>
            <Row gap={spacing.sm}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text variant="bodyMd">{t('auth:checklistLicense')}</Text>
            </Row>
          </FadeSlideIn>
          <FadeSlideIn index={5}>
            <Row gap={spacing.sm}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text variant="bodyMd">{t('auth:checklistVehicle')}</Text>
            </Row>
          </FadeSlideIn>
        </Stack>
      </FadeSlideIn>

      <FadeSlideIn index={6}>
        <Button label={t('auth:signout')} variant="outline" onPress={signOut} />
      </FadeSlideIn>
    </Screen>
  );
}
