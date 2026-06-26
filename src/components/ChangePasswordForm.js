// Shared change-password flow used by both the passenger and driver Profile
// screens. Two branches:
//
//   change  — knows the current password:  password → email OTP → new ×2
//   forgot  — wrong/forgotten password:    enter email → reset link by email
//
// The current password is proven FIRST; only then does the backend email a
// 6-digit code (StartPasswordChange). The forgot branch is anti-enumeration:
// it always reports the same "check your email" outcome.

import React, { useState } from 'react';
import { View } from 'react-native';

import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './Toast';
import { Input } from './Input';
import { Button } from './Button';
import { Banner } from './Banner';
import { Text } from './Text';
import { Stack, Row } from './Section';
import { StepIndicator } from './StepIndicator';
import { PasswordStrength } from './PasswordStrength';
import { PressableScale } from './motion';
import { authApi, usersApi } from '../api';
import {
  validatePassword,
  validatePasswordMatch,
  validatePasswordNotReused,
  validateEmail,
} from '../validation/schemas';
import { spacing } from '../theme';

const STEP = { PASSWORD: 0, CODE: 1, NEWPASS: 2 };

export function ChangePasswordForm({ actor, email, onClose }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const toast = useToast();

  const [mode, setMode] = useState('change'); // 'change' | 'forgot'
  const [step, setStep] = useState(STEP.PASSWORD);
  const [currentPassword, setCurrentPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpDevHint, setOtpDevHint] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState(email || '');
  const [resetSent, setResetSent] = useState(false);
  const [resetDevLink, setResetDevLink] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const close = () => onClose?.();

  // ─── Change branch ────────────────────────────────────────────────────────

  const submitPassword = async () => {
    setErrors({});
    if (!currentPassword) {
      setErrors({ currentPassword: t('auth:enterCurrentPassword') });
      return;
    }
    setBusy(true);
    const res = await authApi.startPasswordChange({ actor, currentPassword });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.errors || { currentPassword: res.error });
      return;
    }
    setOtpDevHint(res.devOtp || null);
    setStep(STEP.CODE);
  };

  const submitCode = async () => {
    setErrors({});
    setBusy(true);
    const res = await authApi.verifyPasswordChangeOtp(actor.id, otpCode);
    setBusy(false);
    if (!res.ok) {
      setErrors({ otp: res.error });
      return;
    }
    setStep(STEP.NEWPASS);
  };

  const submitNewPassword = async () => {
    setErrors({});
    const pwErr = validatePassword(newPassword);
    if (pwErr) return setErrors({ newPassword: pwErr });
    const reuseErr = validatePasswordNotReused(newPassword, currentPassword);
    if (reuseErr) return setErrors({ newPassword: reuseErr });
    const matchErr = validatePasswordMatch(newPassword, confirmPassword);
    if (matchErr) return setErrors({ confirmPassword: matchErr });
    setBusy(true);
    const res = await usersApi.changePasswordSecure({ actor, currentPassword, newPassword });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.errors || {});
      return;
    }
    toast.show(t('toast:passwordChanged'), 'success');
    close();
  };

  // ─── Forgot branch ────────────────────────────────────────────────────────

  const goForgot = () => {
    setErrors({});
    setMode('forgot');
  };

  const sendReset = async () => {
    setErrors({});
    const emailErr = validateEmail(resetEmail);
    if (emailErr) return setErrors({ resetEmail: emailErr });
    setBusy(true);
    const res = await authApi.requestPasswordReset({ email: resetEmail });
    setBusy(false);
    // Anti-enumeration: the backend always resolves ok. devLink only in dev.
    if (res?.devLink) setResetDevLink(res.devLink);
    setResetSent(true);
    toast.show(t('toast:passwordResetSent'), 'info');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (mode === 'forgot') {
    return (
      <Stack gap={spacing.md} style={{ marginTop: spacing.sm }}>
        {resetSent ? (
          <>
            <Banner
              variant="success"
              title={t('auth:resetLinkSentTitle')}
              body={t('auth:resetLinkSentBody')}
            />
            {resetDevLink ? (
              <Banner
                variant="info"
                title={t('auth:devModeTitle')}
                body={t('auth:devLinkBody', { link: resetDevLink })}
              />
            ) : null}
            <Button label={t('common:close')} onPress={close} />
          </>
        ) : (
          <>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {t('auth:resetEmailIntro')}
            </Text>
            <Input
              label={t('auth:email')}
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.resetEmail}
              iconLeft="mail"
            />
            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Button label={t('common:back')} variant="outline" onPress={() => setMode('change')} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={t('auth:sendResetLink')} onPress={sendReset} loading={busy} />
              </View>
            </Row>
          </>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap={spacing.md} style={{ marginTop: spacing.sm }}>
      <StepIndicator
        steps={[t('auth:stepPassword'), t('auth:stepCode'), t('auth:stepNew')]}
        current={step}
      />

      {/* Step 0 — current password */}
      {step === STEP.PASSWORD ? (
        <Stack gap={spacing.sm}>
          <Input
            label={t('auth:currentPassword')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            error={errors.currentPassword}
            iconLeft="lock"
          />
          <PressableScale onPress={goForgot} scaleTo={0.98} style={{ alignSelf: 'flex-start' }}>
            <Text variant="labelSm" color={colors.primary}>{t('auth:forgotPassword')}</Text>
          </PressableScale>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('common:cancel')} variant="outline" onPress={close} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('common:continue')} onPress={submitPassword} loading={busy} />
            </View>
          </Row>
        </Stack>
      ) : null}

      {/* Step 1 — email OTP */}
      {step === STEP.CODE ? (
        <Stack gap={spacing.sm}>
          <Banner variant="info" title={t('auth:emailCodeSentTitle')} body={t('auth:emailCodeSentBody')} />
          {otpDevHint ? (
            <Banner variant="info" title={t('auth:devModeTitle')} body={t('auth:devModeBody', { code: otpDevHint })} />
          ) : null}
          <Input
            label={t('auth:emailCodeLabel')}
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.otp}
            iconLeft="lock"
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('common:cancel')} variant="outline" onPress={close} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('passenger:verifyCode')} onPress={submitCode} loading={busy} />
            </View>
          </Row>
        </Stack>
      ) : null}

      {/* Step 2 — new password ×2 */}
      {step === STEP.NEWPASS ? (
        <Stack gap={spacing.sm}>
          <Input
            label={t('auth:newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            error={errors.newPassword}
            iconLeft="vpn-key"
          />
          <PasswordStrength value={newPassword} />
          <Input
            label={t('auth:confirmNewPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
            iconLeft="vpn-key"
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('common:cancel')} variant="outline" onPress={close} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t('passenger:changePassword')}
                onPress={submitNewPassword}
                loading={busy}
                disabled={!!validatePassword(newPassword)}
              />
            </View>
          </Row>
        </Stack>
      ) : null}
    </Stack>
  );
}
