import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { spacing } from '../theme';
import { HeaderQuickToggles } from './HeaderQuickToggles';

import { useAuth } from '../context/AuthContext';

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  rightIcon,
  onRightPress,
  variant = 'light',
  quickToggles = false,
}) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { isRTL, t } = useLocale();
  const { user } = useAuth();
  const dark = variant === 'primary';
  const bg = dark ? colors.primary : colors.surface;
  const fg = dark ? colors.onPrimary : colors.onSurface;
  const subFg = dark ? colors.onPrimaryContainer : colors.onSurfaceVariant;
  const backIcon = isRTL ? 'arrow-forward' : 'arrow-back';

  const handleBack = () => {
    if (nav.canGoBack()) {
      nav.goBack();
    } else {
      if (user) {
        nav.navigate('Tabs');
      } else {
        nav.navigate('Landing');
      }
    }
  };

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: spacing.containerMargin,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      {showBack ? (
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t('common:back')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: dark ? colors.primaryContainer : colors.surfaceContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={backIcon} size={22} color={fg} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="headlineSm" color={fg}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" color={subFg}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {quickToggles ? <HeaderQuickToggles dark={dark} /> : null}
      {rightIcon ? (
        <Pressable
          onPress={onRightPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: dark ? colors.primaryContainer : colors.surfaceContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={rightIcon} size={22} color={fg} />
        </Pressable>
      ) : null}
    </View>
  );
}
