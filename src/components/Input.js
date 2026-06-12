import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { View, TextInput, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing, typography, withAlpha } from '../theme';
import { SPRING } from './motion';

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  iconLeft,
  iconRight,
  error,
  hint,
  autoCapitalize = 'sentences',
  prefix,
  multiline = false,
  maxLength,
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const focus = useSharedValue(0);
  const isSecure = secureTextEntry && !reveal;
  const primary = colors.primary;
  const errorColor = colors.error;
  const idleBg = colors.surfaceContainer;
  const focusBg = colors.surfaceContainerHighest;
  const idleBorder = withAlpha(primary, 0);
  const hasError = !!error;
  const fieldStyle = useAnimatedStyle(
    () => ({
      borderColor: hasError
        ? errorColor
        : interpolateColor(focus.value, [0, 1], [idleBorder, primary]),
      backgroundColor: interpolateColor(focus.value, [0, 1], [idleBg, focusBg]),
    }),
    [hasError, errorColor, idleBorder, primary, idleBg, focusBg]
  );
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="labelSm" color={focused ? colors.primary : colors.onSurfaceVariant}>
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: multiline ? spacing.sm : 0,
            borderWidth: 1.5,
            minHeight: multiline ? 96 : 52,
          },
          fieldStyle,
        ]}
      >
        {iconLeft ? (
          <MaterialIcons
            name={iconLeft}
            size={20}
            color={focused ? colors.primary : colors.onSurfaceVariant}
            style={{ marginEnd: spacing.sm }}
          />
        ) : null}
        {prefix ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginEnd: spacing.sm }}>
            <Text variant="bodyMd" color={colors.onSurface}>
              {prefix}
            </Text>
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          keyboardType={keyboardType}
          secureTextEntry={isSecure}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          onFocus={() => {
            setFocused(true);
            focus.value = withSpring(1, SPRING);
          }}
          onBlur={() => {
            setFocused(false);
            focus.value = withSpring(0, SPRING);
          }}
          multiline={multiline}
          style={{
            flex: 1,
            color: colors.onSurface,
            paddingVertical: multiline ? 0 : spacing.md - 2,
            ...typography.bodyMd,
          }}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setReveal((r) => !r)} style={{ padding: spacing.xs }}>
            <MaterialIcons
              name={reveal ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        ) : iconRight ? (
          <MaterialIcons name={iconRight} size={20} color={colors.onSurfaceVariant} />
        ) : null}
      </Animated.View>
      {error ? (
        <Text variant="labelSm" color={colors.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="labelSm" color={colors.onSurfaceVariant}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function PhoneInput({ value, onChangeText, error, label, placeholder }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const primary = colors.primary;
  const errorColor = colors.error;
  const idleBorder = withAlpha(primary, 0);
  const hasError = !!error;
  const fieldStyle = useAnimatedStyle(
    () => ({
      borderColor: hasError
        ? errorColor
        : interpolateColor(focus.value, [0, 1], [idleBorder, primary]),
    }),
    [hasError, errorColor, idleBorder, primary]
  );
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="labelSm" color={focused ? colors.primary : colors.onSurfaceVariant}>
        {label || t('auth:phoneNumber')}
      </Text>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceContainer,
            borderRadius: radius.lg,
            overflow: 'hidden',
            borderWidth: 1.5,
          },
          fieldStyle,
        ]}
      >
        <View
          style={{
            backgroundColor: colors.surfaceContainerHigh,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md - 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderEndWidth: 1,
            borderEndColor: colors.outlineVariant + '55',
          }}
        >
          <View
            style={{
              width: 22,
              height: 14,
              borderRadius: 2,
              backgroundColor: '#e70013',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#fff',
              }}
            />
          </View>
          <Text variant="bodyMd" color={colors.onSurface}>
            +216
          </Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || t('auth:phonePlaceholder')}
          placeholderTextColor={colors.outline}
          keyboardType="phone-pad"
          onFocus={() => {
            setFocused(true);
            focus.value = withSpring(1, SPRING);
          }}
          onBlur={() => {
            setFocused(false);
            focus.value = withSpring(0, SPRING);
          }}
          style={{
            flex: 1,
            paddingHorizontal: spacing.md,
            color: colors.onSurface,
            ...typography.bodyLg,
          }}
        />
      </Animated.View>
      {error ? (
        <Text variant="labelSm" color={colors.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function OtpInput({ length = 6, value, onChange }) {
  const { colors } = useTheme();
  const chars = (value || '').padEnd(length, ' ').split('').slice(0, length);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
      {chars.map((c, i) => {
        const focused = (value || '').length === i;
        const filled = c.trim().length > 0;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 56,
              borderRadius: radius.lg,
              backgroundColor: filled ? colors.surfaceContainerHighest : colors.surfaceContainer,
              borderWidth: focused ? 2 : 0,
              borderColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="headlineMd">{c.trim()}</Text>
          </View>
        );
      })}
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        style={{
          position: 'absolute',
          width: '100%',
          height: 56,
          opacity: 0,
        }}
        autoFocus
      />
    </View>
  );
}
