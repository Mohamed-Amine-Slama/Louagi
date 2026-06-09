import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DriverDashboard from '../screens/driver/DashboardScreen';
import DriverProfile from '../screens/driver/ProfileScreen';
import DriverRides from '../screens/driver/RidesListScreen';
import DriverDeliveryScreen from '../screens/driver/DriverDeliveryScreen';

import { FloatingTabBar } from '../components/FloatingTabBar';

const Tab = createBottomTabNavigator();

export function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DriverDashboard} />
      <Tab.Screen name="Rides" component={DriverRides} />
      <Tab.Screen name="Delivery" component={DriverDeliveryScreen} />
      <Tab.Screen name="Profile" component={DriverProfile} />
    </Tab.Navigator>
  );
}
