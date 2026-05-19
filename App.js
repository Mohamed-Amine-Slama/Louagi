import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LocaleProvider } from './src/context/LocaleContext';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Logo } from './src/components/Logo';

function Splash() {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, gap: 24 }}>
      <Logo size={112} />
      <ActivityIndicator color={isDark ? colors.onPrimary : '#fff'} size="large" />
    </View>
  );
}

function AppShell({ fontsLoaded }) {
  if (!fontsLoaded) return <Splash />;
  return (
    <ToastProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ToastProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LocaleProvider>
          <ThemeProvider>
            <AppShell fontsLoaded={fontsLoaded} />
          </ThemeProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
