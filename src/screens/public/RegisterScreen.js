import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View } from 'react-native';
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
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { Badge } from '../../components/Badge';

import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';
import { LegalDocModal } from './LegalDocModal';
import { validateName, validateTunisianPhone, validateEmail, validatePassword } from '../../validation/schemas';

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

  // Legal agreement state
  const [readToS, setReadToS] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);
  const [readRefunds, setReadRefunds] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [modalKey, setModalKey] = useState(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onSubmitDetails = () => {
    const errs = {};
    const nameErr = validateName(fullName);
    const phoneErr = validateTunisianPhone(phone);
    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password);

    if (nameErr) errs.fullName = t('errors:nameShort');
    if (phoneErr) errs.phone = t('errors:phoneFormat');
    if (emailErr) errs.email = t('errors:emailInvalid');
    if (pwErr) errs.password = t('errors:passwordMin');

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(1); // Advance to legal agreement step
  };

  const onAgreeAndRegister = async () => {
    setErrors({});
    setLoading(true);
    const res = await authApi.register({ fullName, phone, email, password, role });
    setLoading(false);
    if (!res.ok) {
      setErrors(res.errors || { general: res.error });
      setStep(0); // Go back to details to fix mistakes
      return;
    }
    setUserId(res.userId);
    setDevOtp(res.devOtp);
    setStep(2); // Advance to OTP verification
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

  const allRead = readToS && readPrivacy && readRefunds;
  const canContinueLegal = allRead && agreed;

  return (
    <Screen>
      <ScreenHeader title={t('auth:createAccount')} subtitle={t('auth:createAccountSubtitle')} showBack />
      <View style={{ paddingHorizontal: 0, gap: spacing.lg }}>
        <FadeSlideIn index={0}>
          <StepIndicator 
            steps={[t('auth:stepDetails'), t('auth:stepLegal'), t('auth:stepVerify')]} 
            current={step} 
          />
        </FadeSlideIn>

        {step === 0 ? (
          <FadeSlideIn index={1}>
          <Stack gap={spacing.md}>
            {errors.general ? (
              <Banner variant="error" title={t('errors:otpFailed')} body={errors.general} />
            ) : null}
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
          </FadeSlideIn>
        ) : step === 1 ? (
          <FadeSlideIn index={1}>
          <Stack gap={spacing.md}>
            <Text variant="headlineMd">{t('auth:stepLegalTitle')}</Text>
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {t('auth:stepLegalSubtitle')}
            </Text>

            <Card onPress={() => setModalKey('terms')}>
              <Row justify="space-between" align="center">
                <Text variant="labelLg">{t('passenger:terms')}</Text>
                <Badge
                  label={readToS ? t('auth:read') : t('auth:unread')}
                  variant={readToS ? 'success' : 'warning'}
                  icon={readToS ? 'check' : 'error'}
                />
              </Row>
            </Card>

            <Card onPress={() => setModalKey('privacy')}>
              <Row justify="space-between" align="center">
                <Text variant="labelLg">{t('passenger:privacy')}</Text>
                <Badge
                  label={readPrivacy ? t('auth:read') : t('auth:unread')}
                  variant={readPrivacy ? 'success' : 'warning'}
                  icon={readPrivacy ? 'check' : 'error'}
                />
              </Row>
            </Card>

            <Card onPress={() => setModalKey('refunds')}>
              <Row justify="space-between" align="center">
                <Text variant="labelLg">{t('auth:refundPolicy')}</Text>
                <Badge
                  label={readRefunds ? t('auth:read') : t('auth:unread')}
                  variant={readRefunds ? 'success' : 'warning'}
                  icon={readRefunds ? 'check' : 'error'}
                />
              </Row>
            </Card>

            <PressableScale onPress={() => setAgreed(!agreed)}>
              <Row gap={spacing.sm} align="center" style={{ paddingVertical: spacing.xs }}>
                <MaterialIcons
                  name={agreed ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={agreed ? colors.primary : colors.outline}
                />
                <Text variant="bodyMd" style={{ flex: 1 }}>{t('auth:agreeCheckbox')}</Text>
              </Row>
            </PressableScale>

            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('common:back')}
                  variant="outline"
                  onPress={() => setStep(0)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('common:continue')}
                  variant="primary"
                  iconRight="arrow-forward"
                  onPress={onAgreeAndRegister}
                  loading={loading}
                  disabled={!canContinueLegal}
                />
              </View>
            </Row>
          </Stack>
          </FadeSlideIn>
        ) : (
          <FadeSlideIn index={1}>
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
          </FadeSlideIn>
        )}
      </View>

      <LegalDocModal
        visible={!!modalKey}
        docKey={modalKey}
        onClose={(accepted) => {
          if (accepted) {
            if (modalKey === 'terms') setReadToS(true);
            if (modalKey === 'privacy') setReadPrivacy(true);
            if (modalKey === 'refunds') setReadRefunds(true);
          }
          setModalKey(null);
        }}
      />
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
            <PressableScale
              key={opt.key}
              onPress={() => onChange(opt.key)}
              scaleTo={0.95}
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
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
