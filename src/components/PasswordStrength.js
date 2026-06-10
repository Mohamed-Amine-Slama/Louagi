import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { passwordStrength, PASSWORD_RULES } from '../validation/schemas';
import { radius, spacing } from '../theme';

const STRENGTH_KEYS = ['pwVeryWeak', 'pwWeak', 'pwFair', 'pwGood', 'pwStrong', 'pwExcellent'];
const RULE_KEYS = {
  minLength: 'pwRuleMinLength',
  uppercase: 'pwRuleUppercase',
  lowercase: 'pwRuleLowercase',
  digit: 'pwRuleDigit',
  special: 'pwRuleSpecial',
};

export function PasswordStrength({ value }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const palette = [colors.error, colors.error, colors.warning, colors.warning, colors.success, colors.success];
  const { score } = passwordStrength(value);
  const label = t(`auth:${STRENGTH_KEYS[Math.min(score, 5)]}`);
  return (
    <View style={{ gap: spacing.xs }}>
      {/* Strength bar */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: radius.full,
                backgroundColor: i < score ? palette[score] : colors.surfaceContainer,
              }}
            />
          ))}
        </View>
        <Text variant="labelSm" color={colors.onSurfaceVariant}>
          {t('auth:strengthLabel', { label })}
        </Text>
      </View>

      {/* Live checklist */}
      <View style={{ gap: 2 }}>
        {PASSWORD_RULES.map((rule) => {
          const pass = rule.test(value);
          return (
            <View
              key={rule.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <MaterialIcons
                name={pass ? 'check-circle' : 'cancel'}
                size={16}
                color={pass ? colors.success : colors.onSurfaceVariant}
              />
              <Text
                variant="labelSm"
                color={pass ? colors.success : colors.onSurfaceVariant}
              >
                {t(`auth:${RULE_KEYS[rule.key] || ''}`, { defaultValue: rule.label })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
