import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, PhoneInput, OtpInput } from '../../components/Input';
import { StepIndicator } from '../../components/StepIndicator';
import { PasswordStrength } from '../../components/PasswordStrength';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';
import { ScreenHeader } from '../../components/Header';

import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const { applySession } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(route.params?.preset ?? 'passenger');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [devOtp, setDevOtp] = useState(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onSubmitDetails = async () => {
    setErrors({});
    setLoading(true);
    const res = await authApi.register({ fullName, phone, email, password, role });
    setLoading(false);
    if (!res.ok) {
      setErrors(res.errors || {});
      return;
    }
    setUserId(res.userId);
    setDevOtp(res.devOtp);
    setStep(1);
  };

  const onVerify = async () => {
    setLoading(true);
    const res = await authApi.verifyRegistration(userId, otp);
    setLoading(false);
    if (!res.ok) {
      setErrors({ otp: res.error });
      return;
    }
    await applySession(res);
    if (role === 'driver') {
      toast.show(t('toast:completeDriverNext'), 'info');
    } else {
      toast.show(t('toast:welcomeNew', { name: res.user.name.split(' ')[0] }), 'success');
    }
  };

  return (
    <Screen>
      <ScreenHeader title={t('auth:createAccount')} subtitle={t('auth:createAccountSubtitle')} showBack />
      <View style={{ paddingHorizontal: 0, gap: spacing.lg }}>
        <StepIndicator steps={['1', '2', '3']} current={step} />

        {step === 0 ? (
          <Stack gap={spacing.md}>
            <Input
              label={t('auth:fullName')}
              value={fullName}
              onChangeText={setFullName}
              iconLeft="person"
              error={errors.fullName}
            />
            <PhoneInput value={phone} onChangeText={setPhone} error={errors.phone} />
            <Input
              label={t('auth:email')}
              value={email}
              onChangeText={setEmail}
              iconLeft="email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <Input
              label={t('auth:password')}
              value={password}
              onChangeText={setPassword}
              iconLeft="lock"
              secureTextEntry
              error={errors.password}
              hint={t('auth:phoneFormatHint')}
            />
            <PasswordStrength value={password} />
            <RoleSelector role={role} onChange={setRole} />
            <Button
              label={t('common:continue')}
              variant="secondary"
              iconRight="arrow-forward"
              onPress={onSubmitDetails}
              loading={loading}
            />
          </Stack>
        ) : (
          <Stack gap={spacing.md}>
            <Text variant="headlineMd">{t('auth:verifyPhone')}</Text>
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {t('auth:verifyPhoneSubtitle', { phone: phone.replace(/\D/g, '') })}
            </Text>
            {devOtp ? (
              <Banner variant="warning" title={t('auth:devModeTitle')} body={t('auth:devModeBody', { code: devOtp })} />
            ) : null}
            <OtpInput value={otp} onChange={setOtp} />
            {errors.otp ? (
              <Text variant="labelSm" color={colors.error}>
                {errors.otp}
              </Text>
            ) : null}
            <Button
              label={role === 'driver' ? t('auth:verifyAndStartApplication') : t('auth:verifyContinue')}
              onPress={onVerify}
              loading={loading}
              disabled={otp.length !== 6}
            />
          </Stack>
        )}
      </View>
    </Screen>
  );
}

function RoleSelector({ role, onChange }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="labelSm" color={colors.onSurfaceVariant}>
        {t('auth:iAmA')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { key: 'passenger', label: t('auth:passenger'), icon: 'event-seat' },
          { key: 'driver', label: t('auth:driver'), icon: 'directions-car' },
        ].map((opt) => {
          const selected = opt.key === role;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={{
                flex: 1,
                padding: spacing.md,
                borderRadius: radius.xl,
                backgroundColor: selected ? colors.primary : colors.surfaceContainer,
                borderWidth: selected ? 0 : 1,
                borderColor: colors.outlineVariant,
                gap: spacing.sm,
                alignItems: 'center',
              }}
            >
              <MaterialIcons
                name={opt.icon}
                size={26}
                color={selected ? colors.onPrimary : colors.onSurface}
              />
              <Text
                variant="labelMd"
                color={selected ? colors.onPrimary : colors.onSurface}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
