import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { SUPPORTED_LOCALES } from '../i18n';
import { spacing, radius } from '../theme';

const THEME_CYCLE = ['light', 'dark', 'system'];

const ICONS = {
  light: 'light-mode',
  dark: 'dark-mode',
  system: 'brightness-auto',
};

export function HeaderQuickToggles({ dark = false }) {
  const { mode, setMode, colors } = useTheme();
  const { locale, setLocale, switching, t } = useLocale();

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(mode) + 1) % THEME_CYCLE.length];
    setMode(next);
  };

  const cycleLocale = () => {
    const next = SUPPORTED_LOCALES[(SUPPORTED_LOCALES.indexOf(locale) + 1) % SUPPORTED_LOCALES.length];
    setLocale(next);
  };

  const bg = dark ? colors.primaryContainer : colors.surfaceContainer;
  const fg = dark ? colors.onPrimary : colors.onSurface;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      <Pressable
        onPress={cycleTheme}
        accessibilityRole="button"
        accessibilityLabel={t('passenger:theme')}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={ICONS[mode]} size={20} color={fg} />
      </Pressable>
      <Pressable
        onPress={cycleLocale}
        disabled={switching}
        accessibilityRole="button"
        accessibilityLabel={t('passenger:language')}
        style={{
          paddingHorizontal: spacing.sm,
          height: 40,
          minWidth: 52,
          borderRadius: radius.full,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 4,
        }}
      >
        <MaterialIcons name="translate" size={16} color={fg} />
        <Text variant="labelSm" color={fg}>
          {locale.toUpperCase()}
        </Text>
      </Pressable>
    </View>
  );
}
