import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

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
import { spacing, radius } from '../../theme';
import {
  getBiometricCapability,
  promptBiometric,
  readBiometricCredential,
  saveBiometricCredential,
  clearBiometricCredential,
  BIOMETRIC_KIND,
} from '../../security/biometric';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const { applySession } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState('credentials');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState({
    available: false,
    kind: BIOMETRIC_KIND.NONE,
    credential: null,
  });
  const biometricAutoTried = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cap, cred] = await Promise.all([getBiometricCapability(), readBiometricCredential()]);
      if (cancelled) return;
      if (cap.available && cred) {
        setBiometricInfo({ available: true, kind: cap.kind, credential: cred });
        setStep('biometric');
      }
      setBiometricChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const runBiometricLogin = async () => {
    if (!biometricInfo.credential) return;
    setError(null);
    const auth = await promptBiometric({ promptMessage: t('auth:biometricPromptLogin') });
    if (!auth.success) {
      setError(t('auth:biometricFailed'));
      return;
    }
    setLoading(true);
    const res = await authApi.biometricLogin(biometricInfo.credential.ticket);
    setLoading(false);
    if (!res.ok) {
      // Expired or revoked — drop the stale credential and fall back.
      await clearBiometricCredential();
      setBiometricInfo({ available: false, kind: BIOMETRIC_KIND.NONE, credential: null });
      setStep('credentials');
      setError(res.error || t('auth:biometricSignInFailed'));
      return;
    }
    if (res.ticket) {
      await saveBiometricCredential({ userId: res.user.id, userName: res.user.name, ticket: res.ticket });
    }
    await applySession(res);
    toast.show(t('toast:welcomeBack', { name: res.user.name.split(' ')[0] }), 'success');
  };

  useEffect(() => {
    if (step !== 'biometric') return;
    if (biometricAutoTried.current) return;
    if (!biometricInfo.credential) return;
    biometricAutoTried.current = true;
    runBiometricLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, biometricInfo.credential]);

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
    // If a biometric credential is still bound to a different account on this
    // device, drop it — biometric is a single-account device link.
    const stale = await readBiometricCredential();
    if (stale && stale.userId !== res.user.id) {
      await clearBiometricCredential();
    }
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
        {!biometricChecked ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : step === 'biometric' ? (
          <Stack gap={spacing.md}>
            <Text variant="headlineMd">
              {biometricInfo.credential?.userName
                ? t('auth:biometricSignInTitle', { name: biometricInfo.credential.userName.split(' ')[0] })
                : t('auth:biometricSignInTitleAnon')}
            </Text>
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {biometricInfo.kind === BIOMETRIC_KIND.FACE
                ? t('auth:biometricSignInBodyFace')
                : t('auth:biometricSignInBody')}
            </Text>

            <Pressable
              onPress={runBiometricLogin}
              disabled={loading}
              style={({ pressed }) => ({
                alignSelf: 'center',
                width: 132,
                height: 132,
                borderRadius: 66,
                backgroundColor: colors.primaryFixed,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || loading ? 0.7 : 1,
                marginVertical: spacing.md,
              })}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <MaterialIcons
                  name={biometricInfo.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}
                  size={72}
                  color={colors.primary}
                />
              )}
            </Pressable>

            {error ? (
              <Text variant="labelSm" color={colors.error} style={{ textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}

            <Button
              label={biometricInfo.kind === BIOMETRIC_KIND.FACE ? t('auth:useFaceId') : t('auth:useFingerprint')}
              iconLeft={biometricInfo.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}
              onPress={runBiometricLogin}
              loading={loading}
            />
            <Pressable
              onPress={() => {
                setError(null);
                setStep('credentials');
              }}
              style={({ pressed }) => ({
                alignSelf: 'center',
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="labelMd" color={colors.primary}>
                {t('auth:usePhonePassword')}
              </Text>
            </Pressable>
          </Stack>
        ) : step === 'credentials' ? (
          <Stack gap={spacing.md}>
            <Text variant="headlineMd">{t('auth:welcomeBack')}</Text>
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
              accessibilityRole="button"
              accessibilityLabel={t('common:back')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
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
