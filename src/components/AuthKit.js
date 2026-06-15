import React, { useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Logo } from './Logo';
import { Stack, Row } from './Section';
import { spacing, radius } from '../theme';
import { getFontFamily } from '../theme/typography';

// Navy welcome hero shared by the Login and OTP screens.
export function AuthHero({ compact }) {
  const { t } = useLocale();
  return (
    <LinearGradient
      colors={['#0A2247', '#031634', '#3A1020']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        paddingTop: compact ? 54 : 60,
        paddingBottom: compact ? 30 : 34,
        paddingHorizontal: 26,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: 'center',
      }}
    >
      <Logo size={compact ? 52 : 60} />
      <Text variant="displayLg" color="#fff" style={{ marginTop: 14, fontSize: compact ? 32 : 38, lineHeight: compact ? 36 : 42 }}>
        {t('common:appName')}
      </Text>
      <Text variant="bodyMd" color="rgba(255,255,255,0.7)" style={{ textAlign: 'center', marginTop: 10, maxWidth: 280 }}>
        {t('landing:heroSubtitle')}
      </Text>
    </LinearGradient>
  );
}

// Small Tunisian flag chip used in phone fields.
function TnFlag() {
  return (
    <View style={{ width: 24, height: 17, borderRadius: 3, backgroundColor: '#E70013', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#E70013' }} />
      </View>
    </View>
  );
}

// Warm "field" text input matching the V2 auth design — optional left icon,
// optional password eye toggle, optional error line.
export function AuthField({ label, value, onChangeText, placeholder, icon, secure, keyboardType, autoCapitalize, error, ...rest }) {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const [hidden, setHidden] = useState(!!secure);
  return (
    <Stack gap={7}>
      {label ? (
        <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: '700' }}>{label}</Text>
      ) : null}
      <View style={{ justifyContent: 'center' }}>
        {icon ? (
          <MaterialIcons name={icon} size={19} color={colors.onSurfaceVariant} style={{ position: 'absolute', start: 15, zIndex: 1 }} />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={{
            backgroundColor: colors.surfaceContainerHigh,
            borderRadius: 14,
            paddingVertical: 15,
            paddingStart: icon ? 44 : 16,
            paddingEnd: secure ? 48 : 16,
            fontSize: 16,
            fontFamily: getFontFamily(locale, 'semiBold'),
            color: colors.onSurface,
          }}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} style={{ position: 'absolute', end: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={hidden ? 'visibility-off' : 'visibility'} size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text variant="labelSm" color={colors.error}>{error}</Text> : null}
    </Stack>
  );
}

// Phone field with a fixed +216 (Tunisia) prefix chip.
export function PhonePrefixField({ label, value, onChangeText, error }) {
  const { colors } = useTheme();
  const { locale } = useLocale();
  return (
    <Stack gap={7}>
      {label ? (
        <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: '700' }}>{label}</Text>
      ) : null}
      <Row gap={8} align="stretch">
        <Row gap={8} align="center" style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: 14, paddingHorizontal: 14 }}>
          <TnFlag />
          <Text variant="bodyLg" style={{ fontWeight: '700' }}>+216</Text>
        </Row>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="XX XXX XXX"
          placeholderTextColor={colors.onSurfaceVariant}
          keyboardType="phone-pad"
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: colors.surfaceContainerHigh,
            borderRadius: 14,
            paddingVertical: 15,
            paddingHorizontal: 16,
            fontSize: 16,
            fontFamily: getFontFamily(locale, 'semiBold'),
            letterSpacing: 1,
            color: colors.onSurface,
          }}
        />
      </Row>
      {error ? <Text variant="labelSm" color={colors.error}>{error}</Text> : null}
    </Stack>
  );
}

// Three-step progress header (Details · Agreement · Verify).
export function StepDots({ current, labels }) {
  const { colors } = useTheme();
  return (
    <Row align="flex-start">
      {labels.map((label, i) => {
        const done = i <= current;
        const lineDone = current > i;
        return (
          <React.Fragment key={i}>
            <Stack gap={6} style={{ alignItems: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? colors.secondaryContainer : 'transparent', borderWidth: done ? 0 : 2, borderColor: colors.outlineVariant }}>
                <Text variant="labelMd" color={done ? colors.onSecondaryContainer : colors.onSurfaceVariant}>{i + 1}</Text>
              </View>
              <Text variant="labelSm" color={done ? colors.onSurface : colors.onSurfaceVariant} numberOfLines={1}>{label}</Text>
            </Stack>
            {i < labels.length - 1 ? (
              <View style={{ flex: 1, height: 2, borderRadius: 2, marginTop: 16, marginHorizontal: 6, backgroundColor: lineDone ? colors.secondaryContainer : colors.outlineVariant }} />
            ) : null}
          </React.Fragment>
        );
      })}
    </Row>
  );
}

// Passenger / Driver role picker cards.
export function RoleCards({ role, onChange }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const options = [
    { key: 'passenger', label: t('auth:passenger'), icon: 'event-seat' },
    { key: 'driver', label: t('auth:driver'), icon: 'directions-car' },
  ];
  return (
    <Stack gap={10}>
      <Text variant="labelMd" style={{ fontWeight: '700' }}>{t('auth:iAmA')}</Text>
      <Row gap={11}>
        {options.map((opt) => {
          const selected = opt.key === role;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={{
                flex: 1,
                paddingVertical: 20,
                borderRadius: 16,
                alignItems: 'center',
                gap: 10,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.outlineVariant,
                backgroundColor: selected ? colors.primary : colors.surfaceContainerLowest,
              }}
            >
              <MaterialIcons name={opt.icon} size={26} color={selected ? colors.onPrimary : colors.onSurface} />
              <Text variant="bodyLg" color={selected ? colors.onPrimary : colors.onSurface}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </Row>
    </Stack>
  );
}
