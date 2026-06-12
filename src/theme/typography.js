const family = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
};

const familyAr = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extraBold: 'Cairo_700Bold',
};

export function getFontFamily(locale, weight) {
  const map = locale === 'ar' ? familyAr : family;
  return map[weight] || map.regular;
}

export const typography = {
  family,
  familyAr,
  displayLg: {
    fontFamily: family.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  headlineMd: {
    fontFamily: family.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.24,
  },
  headlineSm: {
    fontFamily: family.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  bodyLg: {
    fontFamily: family.medium,
    fontSize: 18,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: family.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: family.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  labelMd: {
    fontFamily: family.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  labelSm: {
    fontFamily: family.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.24,
  },
  // Micro size for badges, tab labels and timestamps — smallest legible step.
  labelXs: {
    fontFamily: family.semiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
};
