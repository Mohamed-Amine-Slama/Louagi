import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Text as RNText } from 'react-native';
import { typography } from '../theme';
import { useLocale } from '../context/LocaleContext';

const variantMap = typography;

const WEIGHT_BY_VARIANT = {
  displayLg: 'bold',
  headlineMd: 'bold',
  headlineSm: 'bold',
  bodyLg: 'medium',
  bodyMd: 'regular',
  bodySm: 'regular',
  labelMd: 'semiBold',
  labelSm: 'semiBold',
  labelXs: 'semiBold',
};

export function Text({ variant = 'bodyMd', color, style, children, numberOfLines, ...rest }) {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const base = variantMap[variant] || variantMap.bodyMd;
  const weight = WEIGHT_BY_VARIANT[variant] || 'regular';
  const fontFamily =
    locale === 'ar'
      ? typography.familyAr?.[weight] || typography.familyAr?.regular || base.fontFamily
      : base.fontFamily;
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[{ color: color || colors.onSurface }, base, { fontFamily }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
