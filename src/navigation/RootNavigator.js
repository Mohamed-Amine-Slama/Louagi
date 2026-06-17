import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
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
import MyDeliveriesScreen from '../screens/passenger/MyDeliveriesScreen';
import TrackDeliveryScreen from '../screens/passenger/TrackDeliveryScreen';

import CreateRideScreen from '../screens/driver/CreateRideScreen';
import RideManagementScreen from '../screens/driver/RideManagementScreen';
import DriverDeliveryScreen from '../screens/driver/DriverDeliveryScreen';
import AdminMovedScreen from '../screens/common/AdminMovedScreen';
import { NotificationProvider } from '../context/NotificationContext';
import { DriverLocationProvider } from '../context/DriverLocationContext';

import SettingsScreen from '../screens/common/SettingsScreen';
import SupportScreen from '../screens/common/SupportScreen';
import ChatListScreen from '../screens/common/ChatListScreen';
import ChatScreen from '../screens/common/ChatScreen';

import { PassengerTabs } from './PassengerTabs';
import { DriverTabs } from './DriverTabs';

import { typography } from '../theme';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

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
      <Stack.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
      <Stack.Screen name="TrackDelivery" component={TrackDeliveryScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
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
          <Stack.Screen name="Support" component={SupportScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Admins no longer have an in-app dashboard — it now lives in the standalone
// web app. They land on a single screen pointing them there.
function AdminMovedStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AdminMoved" component={AdminMovedScreen} />
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
      ref={navigationRef}
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
      <NotificationProvider navigationRef={navigationRef}>
        {!user ? (
          <PublicStack />
        ) : user.role === 'passenger' ? (
          <PassengerStack />
        ) : user.role === 'driver' ? (
          <DriverLocationProvider>
            <DriverStack pending={user.driverStatus !== 'verified'} />
          </DriverLocationProvider>
        ) : user.role === 'admin' ? (
          <AdminMovedStack />
        ) : (
          <PublicStack />
        )}
      </NotificationProvider>
    </NavigationContainer>
  );
}
