import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, floatingTabBar } from '../theme';

export function Screen({ children, scroll = true, padded = true, dark = false, contentStyle }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bg = dark ? colors.primary : colors.surface;
  const statusStyle = dark || isDark ? 'light-content' : 'dark-content';

  const containerPadding = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom + floatingTabBar.contentClearance,
    paddingHorizontal: padded ? spacing.containerMargin : 0,
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={statusStyle} backgroundColor={bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              containerPadding,
              { gap: spacing.md, flexGrow: 1 },
              contentStyle,
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            bounces
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, containerPadding, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
