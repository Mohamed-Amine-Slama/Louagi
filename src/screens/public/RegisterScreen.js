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
import { OtpInput } from '../../components/Input';
import { PasswordStrength } from '../../components/PasswordStrength';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { AuthHero, AuthField, PhonePrefixField, StepDots, RoleCards } from '../../components/AuthKit';

import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';
import { LegalDocModal } from './LegalDocModal';
import { validateName, validateTunisianPhone, validateEmail, validatePassword } from '../../validation/schemas';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useLocale();
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

  const [readToS, setReadToS] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);
  const [readRefunds, setReadRefunds] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [modalKey, setModalKey] = useState(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onSubmitDetails = () => {
    const errs = {};
    if (validateName(fullName)) errs.fullName = t('errors:nameShort');
    if (validateTunisianPhone(phone)) errs.phone = t('errors:phoneFormat');
    if (validateEmail(email)) errs.email = t('errors:emailInvalid');
    if (validatePassword(password)) errs.password = t('errors:passwordMin');
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(1);
  };

  const onAgreeAndRegister = async () => {
    setErrors({});
    setLoading(true);
    const res = await authApi.register({ fullName, phone, email, password, role });
    setLoading(false);
    if (!res.ok) {
      setErrors(res.errors || { general: res.error });
      setStep(0);
      return;
    }
    setUserId(res.userId);
    setDevOtp(res.devOtp);
    setStep(2);
  };

  const onVerify = async () => {
    setLoading(true);
    const res = await authApi.verifyRegistration(userId, otp);
    setLoading(false);
    if (!res.ok) { setErrors({ otp: res.error }); return; }
    await applySession(res);
    if (role === 'driver') {
      toast.show(t('toast:completeDriverNext'), 'info');
    } else {
      toast.show(t('toast:welcomeNew', { name: res.user.name.split(' ')[0] }), 'success');
    }
  };

  const allRead = readToS && readPrivacy && readRefunds;
  const canContinueLegal = allRead && agreed;
  const onBack = () => (step > 0 ? setStep(step - 1) : nav.canGoBack() ? nav.goBack() : nav.navigate('Login'));

  const backBtn = (
    <PressableScale onPress={onBack} hitSlop={10} scaleTo={0.9} style={{ width: 46, height: 46, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.onSurface} />
    </PressableScale>
  );

  // Step 3 — OTP verification gets the navy hero, matching the design.
  if (step === 2) {
    return (
      <Screen padded={false}>
        <AuthHero compact />
        <View style={{ paddingHorizontal: 22, paddingTop: spacing.lg, gap: spacing.md }}>
          <FadeSlideIn index={1}>
            <Stack gap={spacing.md}>
              {backBtn}
              <Text variant="headlineMd">{t('auth:verifyPhone')}</Text>
              <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                {t('auth:verifyPhoneSubtitle', { phone: phone.replace(/\D/g, '') })}
              </Text>
              {devOtp ? <Banner variant="warning" title={t('auth:devModeTitle')} body={t('auth:devModeBody', { code: devOtp })} /> : null}
              <OtpInput value={otp} onChange={setOtp} />
              {errors.otp ? <Text variant="labelSm" color={colors.error}>{errors.otp}</Text> : null}
              <Button
                label={role === 'driver' ? t('auth:verifyAndStartApplication') : t('auth:verifyContinue')}
                variant="secondary"
                onPress={onVerify}
                loading={loading}
                disabled={otp.length !== 6}
              />
            </Stack>
          </FadeSlideIn>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Row gap={14} align="flex-start" style={{ marginTop: spacing.xs }}>
        {backBtn}
        <Stack gap={5} style={{ flex: 1, minWidth: 0 }}>
          <Text variant="headlineMd">{t('auth:createAccount')}</Text>
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>{t('auth:createAccountSubtitle')}</Text>
        </Stack>
      </Row>

      <View style={{ paddingVertical: spacing.sm }}>
        <StepDots current={step} labels={[t('auth:stepDetails'), t('auth:stepLegal'), t('auth:stepVerify')]} />
      </View>

      {step === 0 ? (
        <FadeSlideIn index={1}>
          <Stack gap={spacing.md}>
            {errors.general ? <Banner variant="error" title={t('errors:otpFailed')} body={errors.general} /> : null}
            <AuthField label={t('auth:fullName')} value={fullName} onChangeText={setFullName} placeholder={t('auth:namePlaceholder')} icon="person-outline" error={errors.fullName} />
            <PhonePrefixField label={t('auth:phoneNumber')} value={phone} onChangeText={setPhone} error={errors.phone} />
            <AuthField label={t('auth:email')} value={email} onChangeText={setEmail} placeholder={t('auth:emailPlaceholder')} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
            <AuthField label={t('auth:password')} value={password} onChangeText={setPassword} placeholder={t('auth:passwordCreate')} icon="lock" secure error={errors.password} />
            <PasswordStrength value={password} />
            <RoleCards role={role} onChange={setRole} />
            <Button label={t('common:continue')} variant="secondary" iconRight="arrow-forward" onPress={onSubmitDetails} loading={loading} />
          </Stack>
        </FadeSlideIn>
      ) : (
        <FadeSlideIn index={1}>
          <Stack gap={spacing.md}>
            <Stack gap={5}>
              <Text variant="headlineSm">{t('auth:stepLegalTitle')}</Text>
              <Text variant="bodyMd" color={colors.onSurfaceVariant}>{t('auth:stepLegalSubtitle')}</Text>
            </Stack>

            <DocCard label={t('passenger:terms')} read={readToS} onPress={() => setModalKey('terms')} />
            <DocCard label={t('passenger:privacy')} read={readPrivacy} onPress={() => setModalKey('privacy')} />
            <DocCard label={t('auth:refundPolicy')} read={readRefunds} onPress={() => setModalKey('refunds')} />

            <PressableScale onPress={() => setAgreed(!agreed)}>
              <Row gap={spacing.sm} align="center" style={{ paddingVertical: spacing.xs }}>
                <MaterialIcons name={agreed ? 'check-box' : 'check-box-outline-blank'} size={24} color={agreed ? colors.secondaryContainer : colors.outline} />
                <Text variant="bodyMd" style={{ flex: 1 }}>{t('auth:agreeCheckbox')}</Text>
              </Row>
            </PressableScale>

            <Button label={t('common:continue')} variant="secondary" iconRight="arrow-forward" onPress={onAgreeAndRegister} loading={loading} disabled={!canContinueLegal} />
          </Stack>
        </FadeSlideIn>
      )}

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

// Agreement card — a checkbox-style indicator that fills once the doc has been
// read (and accepted) in the modal.
function DocCard({ label, read, onPress }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <Card onPress={onPress}>
      <Row gap={spacing.md} align="center">
        <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: read ? colors.secondaryContainer : colors.outlineVariant, backgroundColor: read ? colors.secondaryContainer : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {read ? <MaterialIcons name="check" size={15} color={colors.onSecondaryContainer} /> : null}
        </View>
        <Text variant="bodyMd" style={{ flex: 1 }} numberOfLines={2}>{label}</Text>
        <Text variant="labelSm" color={read ? colors.success : colors.onSurfaceVariant}>{read ? t('auth:read') : t('auth:unread')}</Text>
      </Row>
    </Card>
  );
}
