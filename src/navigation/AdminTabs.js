import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AdminOverview from '../screens/admin/OverviewScreen';
import AdminDrivers from '../screens/admin/DriversScreen';
import AdminUsers from '../screens/admin/UsersScreen';
import AdminRides from '../screens/admin/RidesScreen';
import AdminPayments from '../screens/admin/PaymentsScreen';
import AdminAudit from '../screens/admin/AuditScreen';

import { FloatingTabBar } from '../components/FloatingTabBar';

const Tab = createBottomTabNavigator();

export function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Overview" component={AdminOverview} />
      <Tab.Screen name="Drivers" component={AdminDrivers} />
      <Tab.Screen name="Users" component={AdminUsers} />
      <Tab.Screen name="Rides" component={AdminRides} />
      <Tab.Screen name="Payments" component={AdminPayments} />
      <Tab.Screen name="Audit" component={AdminAudit} />
    </Tab.Navigator>
  );
}
