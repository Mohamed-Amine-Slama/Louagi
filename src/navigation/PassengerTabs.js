import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LandingScreen from '../screens/public/LandingScreen';
import SearchScreen from '../screens/passenger/SearchScreen';
import PassengerDashboard from '../screens/passenger/DashboardScreen';
import PassengerProfile from '../screens/passenger/ProfileScreen';

import { FloatingTabBar } from '../components/FloatingTabBar';

const Tab = createBottomTabNavigator();

export function PassengerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={LandingScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Bookings" component={PassengerDashboard} />
      <Tab.Screen name="Profile" component={PassengerProfile} />
    </Tab.Navigator>
  );
}
