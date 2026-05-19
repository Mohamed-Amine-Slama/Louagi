import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/Button';
import { Input, PhoneInput, OtpInput } from '../../components/Input';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { authApi } from '../../api';
import { spacing } from '../../theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const { applySession } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState('credentials');
  const [phone, setPhone] = useState('98765432');
  const [password, setPassword] = useState('Passenger1');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const onCredentials = async () => {
    setError(null);
    setLoading(true);
    const res = await authApi.startLogin(phone, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      if (res.lockedUntil) setLockedUntil(res.lockedUntil);
      return;
    }
    setUserId(res.userId);
    setDevOtp(res.devOtp);
    setStep('otp');
    setResendIn(45);
  };

  const onOtp = async () => {
    setError(null);
    setLoading(true);
    const res = await authApi.completeLogin(userId, otp);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await applySession(res);
    toast.show(t('toast:welcomeBack', { name: res.user.name.split(' ')[0] }), 'success');
  };

  const resend = async () => {
    const res = await authApi.resendOtp(userId, 'login');
    setDevOtp(res.devOtp);
    setResendIn(45);
    toast.show(t('toast:codeResent'), 'info');
  };

  const lockSecs = lockedUntil > Date.now() ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  return (
    <Screen padded={false}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          alignItems: 'center',
          gap: spacing.sm,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <Logo size={56} />
        <Text variant="displayLg" color={colors.onPrimary}>
          {t('common:appName')}
        </Text>
        <Text variant="bodyMd" color={colors.onPrimaryContainer}>
          {t('landing:heroSubtitle')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.lg, gap: spacing.md }}>
        {step === 'credentials' ? (
          <Stack gap={spacing.md}>
            <Text variant="headlineMd">{t('auth:welcomeBack')}</Text>
            <Banner
              variant="info"
              title={t('auth:tryDemoTitle')}
              body={t('auth:tryDemoBody')}
            />
            {lockSecs > 0 ? (
              <Banner
                variant="error"
                title={t('auth:tooManyAttemptsTitle')}
                body={t('auth:tooManyAttemptsBody', { seconds: lockSecs })}
              />
            ) : null}
            <PhoneInput value={phone} onChangeText={setPhone} error={error && phone.length === 0 ? error : null} />
            <Input
              label={t('auth:password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            {error && lockSecs === 0 ? (
              <Text variant="labelSm" color={colors.error}>
                {error}
              </Text>
            ) : null}
            <Button
              label={t('common:continue')}
              variant="secondary"
              iconRight="arrow-forward"
              onPress={onCredentials}
              loading={loading}
              disabled={lockSecs > 0}
            />
            <Row justify="center" gap={4}>
              <Text variant="bodySm" color={colors.onSurfaceVariant}>
                {t('auth:noAccount')}
              </Text>
              <Pressable onPress={() => nav.navigate('Register')}>
                <Text variant="labelMd" color={colors.primary}>
                  {t('auth:register')}
                </Text>
              </Pressable>
            </Row>
          </Stack>
        ) : (
          <Stack gap={spacing.md}>
            <Pressable
              onPress={() => setStep('credentials')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="labelMd">{'←'}</Text>
            </Pressable>
            <Text variant="headlineMd">{t('auth:verifyPhone')}</Text>
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {t('auth:verifyPhoneSubtitle', { phone: phone.replace(/\D/g, '') })}
            </Text>
            {devOtp ? (
              <Banner
                variant="warning"
                title={t('auth:devModeTitle')}
                body={t('auth:devModeBody', { code: devOtp })}
              />
            ) : null}
            <OtpInput value={otp} onChange={setOtp} />
            {error ? (
              <Text variant="labelSm" color={colors.error}>
                {error}
              </Text>
            ) : null}
            <Row justify="center">
              {resendIn > 0 ? (
                <Text variant="labelSm" color={colors.onSurfaceVariant}>
                  {t('auth:resendCodeIn', { seconds: `0:${resendIn.toString().padStart(2, '0')}` })}
                </Text>
              ) : (
                <Pressable onPress={resend}>
                  <Text variant="labelMd" color={colors.primary}>
                    {t('auth:resendCode')}
                  </Text>
                </Pressable>
              )}
            </Row>
            <Button label={t('auth:verify')} onPress={onOtp} loading={loading} disabled={otp.length !== 6} />
          </Stack>
        )}
      </View>
    </Screen>
  );
}
