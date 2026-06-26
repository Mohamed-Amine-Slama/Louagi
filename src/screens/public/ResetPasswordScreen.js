// Landing screen for the password-reset deep link (louagi://reset-password?token=…).
// The token in the URL is the sole credential — the user is typically logged
// out here. They set a new password twice; on success we send them to sign in.

import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Stack } from '../../components/Section';
import { PasswordStrength } from '../../components/PasswordStrength';
import { authApi } from '../../api';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { validatePassword, validatePasswordMatch } from '../../validation/schemas';
import { spacing } from '../../theme';

export default function ResetPasswordScreen() {
  const { t } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const token = route.params?.token || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(!token);

  const leave = () => {
    if (user) nav.goBack();
    else nav.navigate('Login');
  };

  const submit = async () => {
    setErrors({});
    const pwErr = validatePassword(newPassword);
    if (pwErr) return setErrors({ newPassword: pwErr });
    const matchErr = validatePasswordMatch(newPassword, confirmPassword);
    if (matchErr) return setErrors({ confirmPassword: matchErr });
    setBusy(true);
    const res = await authApi.resetPasswordWithToken({ token, newPassword });
    setBusy(false);
    if (!res.ok) {
      if (res.errors?.newPassword) return setErrors({ newPassword: res.errors.newPassword });
      setInvalid(true);
      return;
    }
    setDone(true);
  };

  return (
    <Screen>
      <ScreenHeader title={t('auth:resetScreenTitle')} />
      <View style={{ paddingHorizontal: spacing.containerMargin }}>
        {invalid ? (
          <Stack gap={spacing.md}>
            <Banner variant="error" title={t('auth:resetInvalidTitle')} body={t('auth:resetInvalidBody')} />
            <Button label={t('auth:backToSignIn')} onPress={leave} />
          </Stack>
        ) : done ? (
          <Stack gap={spacing.md}>
            <Banner variant="success" title={t('auth:resetDoneTitle')} body={t('auth:resetDoneBody')} />
            <Button label={t('auth:backToSignIn')} onPress={leave} />
          </Stack>
        ) : (
          <Stack gap={spacing.md}>
            <Text variant="bodySm" color={undefined}>{t('auth:resetScreenSubtitle')}</Text>
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
            <Button
              label={t('auth:resetScreenTitle')}
              onPress={submit}
              loading={busy}
              disabled={!!validatePassword(newPassword)}
            />
          </Stack>
        )}
      </View>
    </Screen>
  );
}
