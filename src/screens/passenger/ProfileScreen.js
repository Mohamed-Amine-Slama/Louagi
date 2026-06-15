import React, { useCallback, useEffect, useState } from 'react';
import { useTheme, THEME_MODES } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Switch } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Banner } from '../../components/Banner';
import { Chip } from '../../components/Chip';
import { MembershipCard, ProfileStatTile, AchievementsRail } from '../../components/Membership';
import { SkeletonList } from '../../components/Skeleton';
import { Stack, Row, Section } from '../../components/Section';
import { Stepper } from '../../components/Stepper';
import { ScreenHeader } from '../../components/Header';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { usersApi, authApi } from '../../api';
import { StepIndicator } from '../../components/StepIndicator';
import { PasswordStrength } from '../../components/PasswordStrength';
import { validatePassword, validatePasswordMatch, validatePasswordNotReused } from '../../validation/schemas';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius, withAlpha } from '../../theme';
import { formatMonthYear } from '../../i18n/format';
import {
  getBiometricCapability,
  promptBiometric,
  saveBiometricCredential,
  clearBiometricCredential,
  hasBiometricCredential,
  BIOMETRIC_KIND,
} from '../../security/biometric';

// Autonym labels — each language displayed in its own script.
const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];

export default function PassengerProfile() {
  const { colors, mode, setMode, isDark } = useTheme();
  const { locale, setLocale, switching, t } = useLocale();
  const nav = useNavigation();
  const { user, signOut } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ trips: 0, spent: 0, favouriteRoute: null, points: 0, achievements: [] });

  // Editable state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStep, setPasswordStep] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [otpDevHint, setOtpDevHint] = useState(null);
  const [pwChangeBusy, setPwChangeBusy] = useState(false);
  const [sms, setSms] = useState(true);
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [biometricCap, setBiometricCap] = useState({ available: false, kind: BIOMETRIC_KIND.NONE, enrolled: false });
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [defaultSeats, setDefaultSeats] = useState(1);
  const [paymentAccount, setPaymentAccount] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await usersApi.getProfile({ actor: user });
      if (!p) {
        setLoadError(t('auth:sessionInvalid'));
        return;
      }
      setLoadError(null);
      setProfile(p);
      setFullName(p.full_name || '');
      setEmail(p.email || '');
      setSms(p.notifications?.sms ?? true);
      setPush(p.notifications?.push ?? true);
      setMarketing(p.notifications?.marketing ?? false);
      setDefaultSeats(p.preferences?.defaultSeats ?? 1);
      setPaymentAccount(p.payment_method?.account || '');
      // Stats now come from the GetProfile resolver (server-side aggregate);
      // we used to fetch full listReservations here just for these three numbers.
      setStats({
        trips: p.stats?.trips ?? 0,
        spent: p.stats?.spent ?? 0,
        favouriteRoute: p.stats?.favouriteRoute ?? null,
        points: p.stats?.points ?? 0,
        achievements: p.stats?.achievements ?? [],
      });
    } catch (err) {
      setLoadError(err?.message || t('auth:profileLoadFailed'));
    }
  }, [user, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cap, enrolled] = await Promise.all([getBiometricCapability(), hasBiometricCredential()]);
      if (cancelled) return;
      setBiometricCap(cap);
      setBiometric(!!enrolled);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const onToggleBiometric = async (next) => {
    if (biometricBusy) return;
    if (!biometricCap.available) {
      const reason = !biometricCap.enrolled && biometricCap.kind !== BIOMETRIC_KIND.NONE
        ? t('auth:biometricNotEnrolled')
        : t('auth:biometricNotAvailable');
      toast.show(reason, 'error');
      return;
    }
    setBiometricBusy(true);
    try {
      if (next) {
        const promptMessage =
          biometricCap.kind === BIOMETRIC_KIND.FACE
            ? t('auth:biometricPromptEnrollFace')
            : t('auth:biometricPromptEnrollFingerprint');
        const auth = await promptBiometric({ promptMessage });
        if (!auth.success) {
          toast.show(t('auth:biometricFailedShort'), 'error');
          return;
        }
        const res = await authApi.enrollBiometric({ userId: user.id });
        if (!res.ok) {
          toast.show(res.error || t('auth:biometricCouldNotEnable'), 'error');
          return;
        }
        await saveBiometricCredential({ userId: user.id, userName: profile?.full_name || user.name, ticket: res.ticket });
        setBiometric(true);
        toast.show(t('auth:biometricEnabledToast'), 'success');
      } else {
        await clearBiometricCredential();
        setBiometric(false);
        toast.show(t('auth:biometricDisabledToast'), 'info');
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  if (loadError) {
    return (
      <Screen>
        <ScreenHeader title={t('passenger:profileTitle')} />
        <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md }}>
          <Banner variant="error" title={t('auth:couldntLoadProfile')} body={loadError} />
          <Button label={t('auth:signout')} variant="outline" iconLeft="logout" onPress={signOut} />
        </View>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <SkeletonList count={4} lines={2} />
      </Screen>
    );
  }

  const memberSince = formatMonthYear(profile.created_at || new Date(), { locale });

  const saveAccount = async () => {
    setErrors({});
    setSaving(true);
    const res = await usersApi.updateProfile({ actor: user, fullName, email });
    if (!res.ok) {
      setErrors(res.errors || {});
      setSaving(false);
      return;
    }
    setSaving(false);
    toast.show(t('toast:savedAccount'), 'success');
  };

  const resetPasswordFlow = () => {
    setPasswordStep(0);
    setOtpCode('');
    setOtpDevHint(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setPwChangeBusy(false);
  };

  const handleSendOtp = async () => {
    setErrors({});
    setPwChangeBusy(true);
    const res = await authApi.requestPasswordChangeOtp({ userId: user.id });
    setPwChangeBusy(false);
    if (!res.ok) {
      setErrors({ otp: res.error });
      return;
    }
    if (res.devOtp) setOtpDevHint(res.devOtp);
    setPasswordStep(0.5); // show OTP input
  };

  const handleVerifyOtp = async () => {
    setErrors({});
    setPwChangeBusy(true);
    const res = await authApi.verifyPasswordChangeOtp(user.id, otpCode);
    setPwChangeBusy(false);
    if (!res.ok) {
      setErrors({ otp: res.error });
      return;
    }
    setPasswordStep(1);
  };

  const handleVerifyOldPassword = async () => {
    setErrors({});
    if (!currentPassword) {
      setErrors({ currentPassword: t('auth:currentPassword') });
      return;
    }
    setPwChangeBusy(true);
    const res = await usersApi.verifyCurrentPassword({ actor: user, password: currentPassword });
    setPwChangeBusy(false);
    if (!res.ok) {
      setErrors({ currentPassword: res.error });
      return;
    }
    setPasswordStep(2);
  };

  const handleNewPasswordNext = () => {
    setErrors({});
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      setErrors({ newPassword: pwErr });
      return;
    }
    const reuseErr = validatePasswordNotReused(newPassword, currentPassword);
    if (reuseErr) {
      setErrors({ newPassword: reuseErr });
      return;
    }
    setPasswordStep(3);
  };

  const handleChangePassword = async () => {
    setErrors({});
    const matchErr = validatePasswordMatch(newPassword, confirmPassword);
    if (matchErr) {
      setErrors({ confirmPassword: matchErr });
      return;
    }
    setPwChangeBusy(true);
    const res = await usersApi.changePasswordSecure({
      actor: user,
      currentPassword,
      newPassword,
    });
    setPwChangeBusy(false);
    if (!res.ok) {
      setErrors(res.errors || {});
      return;
    }
    resetPasswordFlow();
    setShowPasswordForm(false);
    toast.show(t('toast:passwordChanged'), 'success');
  };

  const saveNotifications = async (nextSms, nextPush, nextMarketing = marketing) => {
    setSms(nextSms);
    setPush(nextPush);
    setMarketing(nextMarketing);
    await usersApi.updateNotificationPrefs({
      actor: user,
      sms: nextSms,
      push: nextPush,
      marketing: nextMarketing,
    });
  };

  const saveDefaultSeats = async (nextSeats) => {
    setDefaultSeats(nextSeats);
    const res = await usersApi.updateTravelPrefs({ actor: user, defaultSeats: nextSeats });
    if (!res.ok) {
      toast.show(res.error || Object.values(res.errors || {})[0], 'error');
    }
  };

  const savePaymentMethod = async () => {
    setErrors({});
    setSaving(true);
    const res = await usersApi.updatePaymentMethod({ actor: user, flouciAccount: paymentAccount });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.errors || { flouciAccount: res.error });
      return;
    }
    setPaymentAccount(res.payment_method?.account || '');
    setShowPaymentForm(false);
    toast.show(t('toast:paymentMethodSaved'), 'success');
  };

  const unlinkPaymentMethod = async () => {
    setErrors({});
    setSaving(true);
    const res = await usersApi.updatePaymentMethod({ actor: user, flouciAccount: '' });
    setSaving(false);
    if (!res.ok) {
      toast.show(res.error, 'error');
      return;
    }
    setPaymentAccount('');
    setShowPaymentForm(false);
    toast.show(t('toast:paymentMethodRemoved'), 'info');
  };

  const del = async () => {
    if (!deletePassword) {
      setErrors({ deletePassword: t('auth:enterPasswordConfirm') });
      return;
    }
    const res = await usersApi.deleteAccount({ actor: user, password: deletePassword });
    if (!res.ok) {
      setErrors({ deletePassword: res.error });
      return;
    }
    toast.show(t('toast:accountDeleted'), 'info');
    signOut();
  };

  const heroFg = isDark ? colors.onSurface : colors.onPrimary;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.sm, gap: spacing.md }}>
        <Text variant="headlineSm">{t("passenger:profileTitle")}</Text>
        <FadeSlideIn index={0}>
          <MembershipCard name={profile.full_name} id={profile.id} points={stats.points} memberSince={memberSince} notch={colors.surface} />
        </FadeSlideIn>
        <FadeSlideIn index={1}>
          <Row gap={spacing.sm}>
            <ProfileStatTile icon="route" value={String(stats.trips)} label={t("passenger:trips")} />
            <ProfileStatTile icon="payments" value={String(stats.spent)} unit={t("common:tnd")} label={t("passenger:spent")} />
            <ProfileStatTile icon="eco" value={String(stats.trips * 8)} unit="kg" label={t("passenger:co2Saved")} tone="success" />
          </Row>
        </FadeSlideIn>
        <FadeSlideIn index={2}>
          <Card>
            <Row gap={spacing.md} align="center">
              <View style={{ width: 42, height: 42, borderRadius: radius.lg, backgroundColor: withAlpha(colors.secondaryContainer, 0.12), alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="star" size={20} color={colors.secondaryContainer} />
              </View>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text variant="labelSm" color={colors.onSurfaceVariant}>{t("passenger:favouriteRoute")}</Text>
                <Text variant="labelMd" numberOfLines={1}>{stats.favouriteRoute || t("support:noFavouriteRoute")}</Text>
              </Stack>
            </Row>
          </Card>
        </FadeSlideIn>
        <FadeSlideIn index={3}>
          <AchievementsRail unlocked={stats.achievements} />
        </FadeSlideIn>

        {/* Account info */}
        <FadeSlideIn index={2}>
        <Section title={t('passenger:account')}>
          <Card>
            <Stack gap={spacing.md}>
              <Input label={t('auth:fullName')} value={fullName} onChangeText={setFullName} error={errors.fullName} iconLeft="person" />
              <Input
                label={t('auth:email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                iconLeft="email"
              />
              <Row justify="space-between" align="center">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="labelSm" color={colors.onSurfaceVariant}>{t('passenger:phoneVerified')}</Text>
                  <Text variant="bodyMd">{profile.phone_masked}</Text>
                </Stack>
                <MaterialIcons name="verified" size={22} color={colors.success} />
              </Row>
              <Button label={t('passenger:saveAccount')} variant="secondary" onPress={saveAccount} loading={saving} />
            </Stack>
          </Card>
        </Section>
        </FadeSlideIn>

        {/* Security */}
        <FadeSlideIn index={3}>
        <Section title={t('passenger:security')}>
          <Card>
            <SettingRow
              icon="lock"
              title={t('passenger:passwordRow')}
              subtitle={t('passenger:passwordRowSubtitle')}
              right={<MaterialIcons name={showPasswordForm ? 'expand-less' : 'expand-more'} size={22} color={colors.onSurfaceVariant} />}
              onPress={() => {
                if (showPasswordForm) resetPasswordFlow();
                setShowPasswordForm((v) => !v);
              }}
            />
            {showPasswordForm ? (
              <Stack gap={spacing.md} style={{ marginTop: spacing.sm }}>
                <StepIndicator
                  steps={[
                    t('passenger:stepVerify'),
                    t('passenger:stepOldPassword'),
                    t('passenger:stepNewPassword'),
                    t('passenger:stepConfirm'),
                  ]}
                  current={Math.floor(passwordStep)}
                />

                {/* Step 0 — 2FA OTP */}
                {passwordStep < 1 ? (
                  <Stack gap={spacing.sm}>
                    {passwordStep === 0 ? (
                      <Button
                        label={t('passenger:sendVerificationCode')}
                        onPress={handleSendOtp}
                        loading={pwChangeBusy}
                        iconLeft="sms"
                      />
                    ) : (
                      <>
                        {otpDevHint ? (
                          <Banner
                            variant="info"
                            title={t('auth:devModeTitle')}
                            body={t('auth:devModeBody', { code: otpDevHint })}
                          />
                        ) : null}
                        <Input
                          label={t('auth:verifyPhone')}
                          value={otpCode}
                          onChangeText={setOtpCode}
                          keyboardType="number-pad"
                          maxLength={6}
                          error={errors.otp}
                          iconLeft="lock"
                        />
                        <Row gap={spacing.sm}>
                          <View style={{ flex: 1 }}>
                            <Button
                              label={t('common:cancel')}
                              variant="outline"
                              onPress={() => { resetPasswordFlow(); setShowPasswordForm(false); }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Button
                              label={t('passenger:verifyCode')}
                              onPress={handleVerifyOtp}
                              loading={pwChangeBusy}
                            />
                          </View>
                        </Row>
                      </>
                    )}
                  </Stack>
                ) : null}

                {/* Step 1 — Current password */}
                {passwordStep === 1 ? (
                  <Stack gap={spacing.sm}>
                    <Input
                      label={t('auth:currentPassword')}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      error={errors.currentPassword}
                      iconLeft="lock"
                    />
                    <Row gap={spacing.sm}>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={t('common:back')}
                          variant="outline"
                          onPress={() => setPasswordStep(0)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={t('passenger:verifyOldPassword')}
                          onPress={handleVerifyOldPassword}
                          loading={pwChangeBusy}
                        />
                      </View>
                    </Row>
                  </Stack>
                ) : null}

                {/* Step 2 — New password */}
                {passwordStep === 2 ? (
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
                    <Row gap={spacing.sm}>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={t('common:back')}
                          variant="outline"
                          onPress={() => { setNewPassword(''); setPasswordStep(1); }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={t('common:next')}
                          onPress={handleNewPasswordNext}
                          disabled={!!validatePassword(newPassword)}
                        />
                      </View>
                    </Row>
                  </Stack>
                ) : null}

                {/* Step 3 — Confirm password */}
                {passwordStep === 3 ? (
                  <Stack gap={spacing.sm}>
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
                        <Button
                          label={t('common:back')}
                          variant="outline"
                          onPress={() => { setConfirmPassword(''); setPasswordStep(2); }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={t('passenger:changePassword')}
                          onPress={handleChangePassword}
                          loading={pwChangeBusy}
                        />
                      </View>
                    </Row>
                  </Stack>
                ) : null}
              </Stack>
            ) : null}
            <Divider />
            <SettingRow
              icon={biometricCap.kind === BIOMETRIC_KIND.FACE ? 'face' : 'fingerprint'}
              title={t('passenger:biometric')}
              subtitle={
                !biometricCap.available
                  ? (biometricCap.kind === BIOMETRIC_KIND.NONE
                    ? t('auth:biometricNotAvailableShort')
                    : t('auth:biometricNotEnrolledShort'))
                  : biometric
                    ? (biometricCap.kind === BIOMETRIC_KIND.FACE
                      ? t('auth:biometricLinkedFace')
                      : t('auth:biometricLinkedFingerprint'))
                    : t('auth:biometricScanOnce')
              }
              right={
                <Switch
                  value={biometric}
                  onValueChange={onToggleBiometric}
                  disabled={biometricBusy || !biometricCap.available}
                />
              }
            />
            <Divider />
            <SettingRow
              icon="devices"
              title={t('passenger:activeSessions')}
              subtitle={t('passenger:activeSessionsSubtitle')}
              right={<MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />}
              onPress={() => toast.show(t('toast:onlyThisDevice'), 'info')}
            />
            <Divider />
            <SettingRow
              icon="phonelink-lock"
              title={t('passenger:twoStep')}
              subtitle={t('passenger:twoStepSubtitle')}
              right={<Badge label={t('passenger:enforced')} variant="success" icon="check" />}
            />
          </Card>
        </Section>
        </FadeSlideIn>

        {/* Notifications */}
        <FadeSlideIn index={4}>
        <Section title={t('passenger:notifications')}>
          <Card>
            <SettingRow
              icon="sms"
              title={t('passenger:sms')}
              subtitle={t('passenger:smsSubtitle')}
              right={<Switch value={sms} onValueChange={(v) => saveNotifications(v, push)} />}
            />
            <Divider />
            <SettingRow
              icon="notifications"
              title={t('passenger:push')}
              subtitle={t('passenger:pushSubtitle')}
              right={<Switch value={push} onValueChange={(v) => saveNotifications(sms, v)} />}
            />
            <Divider />
            <SettingRow
              icon="campaign"
              title={t('passenger:marketing')}
              subtitle={t('passenger:marketingSubtitle')}
              right={<Switch value={marketing} onValueChange={(v) => saveNotifications(sms, push, v)} />}
            />
          </Card>
        </Section>
        </FadeSlideIn>

        {/* Preferences */}
        <FadeSlideIn index={5}>
        <Section title={t('passenger:preferences')}>
          <Card>
            <SettingRow
              icon="event-seat"
              title={t('passenger:defaultSeats')}
              subtitle={t('passenger:defaultSeatsSubtitle')}
              right={<Stepper value={defaultSeats} onChange={saveDefaultSeats} min={1} max={8} />}
            />
            <Divider />
            <SettingRow
              icon="translate"
              title={t('passenger:language')}
              subtitle={LANGUAGES.find((l) => l.code === locale)?.label}
              right={
                <Row gap={4}>
                  {LANGUAGES.map((l) => (
                    <Chip
                      key={l.code}
                      disabled={switching}
                      selected={l.code === locale}
                      onPress={() => setLocale(l.code)}
                      label={l.code.toUpperCase()}
                      style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                    />
                  ))}
                </Row>
              }
            />
            <Divider />
            <SettingRow
              icon="palette"
              title={t('passenger:theme')}
              subtitle={
                { light: t('passenger:themeLight'), dark: t('passenger:themeDark'), system: t('passenger:themeSystemFollows') }[mode]
              }
              right={
                <Row gap={4}>
                  {THEME_MODES.map((m) => (
                    <Chip
                      key={m}
                      selected={m === mode}
                      onPress={() => setMode(m)}
                      icon={{ light: 'light-mode', dark: 'dark-mode', system: 'brightness-auto' }[m]}
                      style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                    />
                  ))}
                </Row>
              }
            />
            <Divider />
            <SettingRow
              icon="payments"
              title={t('passenger:currency')}
              subtitle={t('passenger:currencySubtitle')}
              right={<Badge label={t('common:tnd')} variant="neutral" />}
            />
            <Divider />
            <LinkRow
              icon="tune"
              title={t('passenger:allSettings')}
              onPress={() => nav.navigate('Settings')}
            />
          </Card>
        </Section>
        </FadeSlideIn>

        {/* Payment methods */}
        <FadeSlideIn index={6}>
        <Section title={t('passenger:paymentMethods')}>
          <Card>
            <SettingRow
              icon="account-balance-wallet"
              title={paymentAccount ? t('passenger:cardEnding') : t('passenger:paymentNotLinked')}
              subtitle={paymentAccount || t('passenger:paymentNotLinkedSubtitle')}
              right={paymentAccount ? <Badge label={t('passenger:cardDefaultBadge')} variant="success" /> : null}
            />
            <Divider />
            <PressableScale
              onPress={() => setShowPaymentForm((v) => !v)}
              scaleTo={0.98}
              style={{
                paddingVertical: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: radius.full,
                  backgroundColor: withAlpha(colors.primary, 0.1),
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialIcons name="add" size={20} color={colors.primary} />
              </View>
              <Text variant="labelMd" color={colors.primary}>
                {paymentAccount ? t('passenger:editPaymentMethod') : t('passenger:addCard')}
              </Text>
            </PressableScale>
            {showPaymentForm ? (
              <Stack gap={spacing.md} style={{ marginTop: spacing.sm }}>
                <Input
                  label={t('passenger:paymentAccount')}
                  value={paymentAccount}
                  onChangeText={setPaymentAccount}
                  iconLeft="account-balance-wallet"
                  error={errors.flouciAccount}
                />
                <Row gap={spacing.sm}>
                  {paymentAccount ? (
                    <View style={{ flex: 1 }}>
                      <Button
                        label={t('passenger:unlinkPaymentMethod')}
                        variant="outline"
                        onPress={unlinkPaymentMethod}
                        loading={saving}
                      />
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t('passenger:savePaymentMethod')}
                      variant="secondary"
                      onPress={savePaymentMethod}
                      loading={saving}
                    />
                  </View>
                </Row>
              </Stack>
            ) : null}
          </Card>
        </Section>
        </FadeSlideIn>

        {/* Support */}
        <FadeSlideIn index={7}>
        <Section title={t('passenger:support')}>
          <Card>
            <LinkRow icon="help" title={t('passenger:helpCentre')} onPress={() => nav.navigate('Support', { section: 'help' })} />
            <Divider />
            <LinkRow icon="chat" title={t('passenger:contactSupport')} onPress={() => nav.navigate('Support', { section: 'contact' })} />
            <Divider />
            <LinkRow icon="description" title={t('passenger:terms')} onPress={() => nav.navigate('Support', { section: 'terms' })} />
            <Divider />
            <LinkRow icon="privacy-tip" title={t('passenger:privacy')} onPress={() => nav.navigate('Support', { section: 'privacy' })} />
            <Divider />
            <LinkRow
              icon="download"
              title={t('passenger:downloadData')}
              onPress={() => nav.navigate('Support', { section: 'data' })}
            />
          </Card>
        </Section>
        </FadeSlideIn>

        <FadeSlideIn index={8}>
          <Button label={t('common:logout')} variant="outline" onPress={signOut} iconLeft="logout" />
        </FadeSlideIn>

        {/* Danger zone */}
        <FadeSlideIn index={8}>
        <Section title={t('passenger:dangerZone')}>
          <Banner
            variant="error"
            title={t('passenger:deleteAccountTitle')}
            body={t('passenger:deleteAccountBody')}
          />
          {showDeleteForm ? (
            <Card style={{ gap: spacing.md }}>
              <Input
                label={t('passenger:confirmDeleteLabel')}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                error={errors.deletePassword}
              />
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <Button label={t('common:cancel')} variant="outline" onPress={() => setShowDeleteForm(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={t('common:deleteForever')} variant="danger" onPress={del} />
                </View>
              </Row>
            </Card>
          ) : (
            <Button label={t('passenger:deleteAccount')} variant="danger" iconLeft="delete-forever" onPress={() => setShowDeleteForm(true)} />
          )}
        </Section>
        </FadeSlideIn>

        <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: spacing.md }}>
          {t('passenger:versionFooter')}
        </Text>
      </View>
    </Screen>
  );
}


function SettingRow({ icon, title, subtitle, right, onPress }) {
  const { colors } = useTheme();
  const node = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <View
        style={{
          width: 40, height: 40, borderRadius: radius.full,
          backgroundColor: colors.surfaceContainer,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="labelMd">{title}</Text>
        {subtitle ? (
          <Text variant="labelSm" color={colors.onSurfaceVariant}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.98}>
        {node}
      </PressableScale>
    );
  }
  return node;
}

function LinkRow({ icon, title, onPress }) {
  const { colors } = useTheme();
  return (
    <SettingRow
      icon={icon}
      title={title}
      right={<MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />}
      onPress={onPress}
    />
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: 4 }} />;
}
