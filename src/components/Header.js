import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';
import { HeaderQuickToggles } from './HeaderQuickToggles';

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
  const dark = variant === 'primary';
  const bg = dark ? colors.primary : colors.surface;
  const fg = dark ? colors.onPrimary : colors.onSurface;
  const subFg = dark ? colors.onPrimaryContainer : colors.onSurfaceVariant;
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
          onPress={() => nav.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: dark ? colors.primaryContainer : colors.surfaceContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="arrow-back" size={22} color={fg} />
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
