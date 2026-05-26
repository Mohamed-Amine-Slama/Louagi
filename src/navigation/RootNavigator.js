import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Logo } from '../components/Logo';

import LandingScreen from '../screens/public/LandingScreen';
import LoginScreen from '../screens/public/LoginScreen';
import RegisterScreen from '../screens/public/RegisterScreen';
import DriverRegisterScreen from '../screens/public/DriverRegisterScreen';
import PendingApprovalScreen from '../screens/public/PendingApprovalScreen';

import SearchScreen from '../screens/passenger/SearchScreen';
import RideDetailScreen from '../screens/passenger/RideDetailScreen';
import BookingConfirmScreen from '../screens/passenger/BookingConfirmScreen';

import CreateRideScreen from '../screens/driver/CreateRideScreen';
import RideManagementScreen from '../screens/driver/RideManagementScreen';
import DriverDeliveryScreen from '../screens/driver/DriverDeliveryScreen';
import { NotificationProvider } from '../context/NotificationContext';

import SettingsScreen from '../screens/common/SettingsScreen';
import ChatListScreen from '../screens/common/ChatListScreen';
import ChatScreen from '../screens/common/ChatScreen';

import { PassengerTabs } from './PassengerTabs';
import { DriverTabs } from './DriverTabs';
import { AdminTabs } from './AdminTabs';

import { typography } from '../theme';

const Stack = createNativeStackNavigator();

function useStackScreenOptions() {
  const { colors } = useTheme();
  return { headerShown: false, contentStyle: { backgroundColor: colors.surface } };
}

function PublicStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="RideDetail" component={RideDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function PassengerStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Tabs" component={PassengerTabs} />
      <Stack.Screen name="RideDetail" component={RideDetailScreen} />
      <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function DriverStack({ pending }) {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {pending ? (
        <>
          <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} />
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={DriverTabs} />
          <Stack.Screen name="CreateRide" component={CreateRideScreen} />
          <Stack.Screen name="RideManagement" component={RideManagementScreen} />
          <Stack.Screen name="DriverDelivery" component={DriverDeliveryScreen} />
          <Stack.Screen name="RideDetail" component={RideDetailScreen} />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AdminStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Tabs" component={AdminTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { user, ready: authReady } = useAuth();
  const { colors, isDark, ready: themeReady } = useTheme();
  const { ready: localeReady } = useLocale();

  if (!authReady || !themeReady || !localeReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, gap: 24 }}>
        <Logo size={112} />
        <ActivityIndicator size="large" color={isDark ? colors.onPrimary : '#fff'} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.surface,
          card: colors.surfaceContainerLowest,
          text: colors.onSurface,
          border: colors.outlineVariant,
          notification: colors.secondaryContainer,
        },
        fonts: {
          regular: { fontFamily: typography.family.regular, fontWeight: '400' },
          medium: { fontFamily: typography.family.medium, fontWeight: '500' },
          bold: { fontFamily: typography.family.bold, fontWeight: '700' },
          heavy: { fontFamily: typography.family.extraBold, fontWeight: '800' },
        },
      }}
    >
      <NotificationProvider>
        {!user ? (
          <PublicStack />
        ) : user.role === 'passenger' ? (
          <PassengerStack />
        ) : user.role === 'driver' ? (
          <DriverStack pending={user.driverStatus !== 'verified'} />
        ) : user.role === 'admin' ? (
          <AdminStack />
        ) : (
          <PublicStack />
        )}
      </NotificationProvider>
    </NavigationContainer>
  );
}
