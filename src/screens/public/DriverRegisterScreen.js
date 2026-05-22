import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { StepIndicator } from '../../components/StepIndicator';
import { Banner } from '../../components/Banner';
import { ScreenHeader } from '../../components/Header';
import { Stack, Row } from '../../components/Section';

import { driversApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { spacing, radius } from '../../theme';

function Slot({ label, file, kind, onPick, error, fallbackHint }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPick}
      style={{
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: error ? colors.error : colors.outlineVariant,
        borderRadius: radius.xl,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: file ? colors.successContainer : colors.surfaceContainerLow,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.lg,
          backgroundColor: file ? colors.success : colors.primaryFixed,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons
          name={file ? 'check' : kind === 'vehicle' ? 'photo-camera' : 'file-upload'}
          size={22}
          color={file ? '#fff' : colors.primary}
        />
      </View>
      <Text variant="labelMd">{label}</Text>
      <Text variant="labelSm" color={colors.onSurfaceVariant}>
        {file ? file.name : fallbackHint}
      </Text>
      {error ? (
        <Text variant="labelSm" color={colors.error}>
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function DriverRegisterScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const nav = useNavigation();

  const [step, setStep] = useState(0);
  const [idCardFile, setIdCardFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [vehiclePhoto, setVehiclePhoto] = useState(null);

  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [seats, setSeats] = useState('5');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const pickFake = (setter, kind, sizeKb = 1800) =>
    setter({ name: `${kind}-${Date.now()}.jpg`, sizeBytes: sizeKb * 1024, mime: 'image/jpeg', kind });

  const submit = async () => {
    setErrors({});
    setLoading(true);
    const res = await driversApi.registerDriverApplication({
      actor: user,
      idCardNumber,
      licenseNumber,
      plateNumber: plate,
      brand,
      model,
      seatCount: Number(seats),
      files: [idCardFile, licenseFile, vehiclePhoto].filter(Boolean),
    });
    setLoading(false);
    if (!res.ok) {
      setErrors(res.errors || { plate: res.error });
      return;
    }
    await setUser({ ...user, driverStatus: 'pending' });
    toast.show(t('toast:applicationSubmitted'), 'success');
    nav.navigate('PendingApproval');
  };

  const canContinue = idCardFile && licenseFile && vehiclePhoto;
  const jpegHint = t('driver:jpegPngPdf');

  return (
    <Screen>
      <ScreenHeader title={t('driver:onboarding')} subtitle={t('driver:onboardingSubtitle')} />
      <StepIndicator
        steps={[t('driver:stepDocuments'), t('driver:stepVehicle'), t('driver:stepReview')]}
        current={step}
      />

      {step === 0 ? (
        <Stack gap={spacing.md}>
          <Banner
            variant="info"
            title={t('driver:whyAsk')}
            body={t('driver:whyAskBody')}
          />
          <Slot
            label={t('driver:nationalIdCard')}
            kind="id"
            file={idCardFile}
            onPick={() => pickFake(setIdCardFile, 'id', 1500)}
            error={errors.id}
            fallbackHint={jpegHint}
          />
          <Slot
            label={t('driver:driverLicense')}
            kind="license"
            file={licenseFile}
            onPick={() => pickFake(setLicenseFile, 'license', 1900)}
            error={errors.license}
            fallbackHint={jpegHint}
          />
          <Slot
            label={t('driver:vehiclePhoto')}
            kind="vehicle"
            file={vehiclePhoto}
            onPick={() => pickFake(setVehiclePhoto, 'vehicle', 2400)}
            error={errors.vehicle}
            fallbackHint={jpegHint}
          />
          <Button
            label={t('common:continue')}
            variant="secondary"
            iconRight="arrow-forward"
            disabled={!canContinue}
            onPress={() => setStep(1)}
          />
        </Stack>
      ) : step === 1 ? (
        <Stack gap={spacing.md}>
          <Input
            label={t('driver:nationalIdNumber')}
            value={idCardNumber}
            onChangeText={setIdCardNumber}
            iconLeft="badge"
            error={errors.idCardNumber}
            autoCapitalize="none"
          />
          <Input
            label={t('driver:licenseNumber')}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            iconLeft="credit-card"
            error={errors.licenseNumber}
            autoCapitalize="characters"
          />
          <Input
            label={t('driver:plateNumberLabel')}
            value={plate}
            onChangeText={setPlate}
            iconLeft="confirmation-number"
            error={errors.plateNumber}
            autoCapitalize="characters"
            placeholder={t('driver:plateNumberPlaceholder')}
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Input label={t('driver:vehicleBrand')} value={brand} onChangeText={setBrand} error={errors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('driver:model')} value={model} onChangeText={setModel} error={errors.model} />
            </View>
          </Row>
          <Input
            label={t('driver:seatCount')}
            value={seats}
            onChangeText={setSeats}
            keyboardType="number-pad"
            iconLeft="event-seat"
            error={errors.seatCount}
          />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('common:back')} variant="outline" onPress={() => setStep(0)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('driver:review')} variant="secondary" iconRight="arrow-forward" onPress={() => setStep(2)} />
            </View>
          </Row>
        </Stack>
      ) : (
        <Stack gap={spacing.md}>
          <Card>
            <Text variant="labelMd" color={colors.onSurfaceVariant}>
              {t('driver:documents')}
            </Text>
            <Row gap={spacing.sm}>
              <Text variant="bodyMd">{t('admin:idNumber')}</Text>
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
            </Row>
            <Row gap={spacing.sm}>
              <Text variant="bodyMd">{t('driver:license')}</Text>
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
            </Row>
            <Row gap={spacing.sm}>
              <Text variant="bodyMd">{t('driver:vehiclePhoto')}</Text>
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
            </Row>
          </Card>
          <Card>
            <Text variant="labelMd" color={colors.onSurfaceVariant}>
              {t('driver:vehicle')}
            </Text>
            <Text variant="bodyMd">
              {t('driver:vehicleSummary', { brand, model, count: seats })}
            </Text>
            <Text variant="bodyMd">{t('driver:plateValue', { plate })}</Text>
          </Card>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button label={t('common:edit')} variant="outline" onPress={() => setStep(1)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('driver:submitApplication')} variant="secondary" onPress={submit} loading={loading} />
            </View>
          </Row>
        </Stack>
      )}
    </Screen>
  );
}
