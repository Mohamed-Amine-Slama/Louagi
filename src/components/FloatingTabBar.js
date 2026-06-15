import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

// Map navigation route names → MaterialIcons glyph + display label
const ROUTE_META = {
  Home: { icon: 'home', label: 'Home' },
  Search: { icon: 'search', label: 'Search' },
  Bookings: { icon: 'event', label: 'Bookings' },
  Delivery: { icon: 'local-shipping', label: 'Delivery' },
  Profile: { icon: 'person', label: 'Profile' },
  Dashboard: { icon: 'space-dashboard', label: 'Dashboard' },
  Rides: { icon: 'directions-car', label: 'Rides' },
  Overview: { icon: 'space-dashboard', label: 'Overview' },
  Drivers: { icon: 'verified-user', label: 'Drivers' },
  Users: { icon: 'group', label: 'Users' },
  Payments: { icon: 'payments', label: 'Pay' },
  Audit: { icon: 'fact-check', label: 'Audit' },
};

// Design dock: warm espresso bar, no active circle — the active tab simply reads
// brand red, inactive tabs faint white. Fixed-light colors since the bar is dark
// in both themes.
const ACTIVE = '#FF5A6E';
const INACTIVE = 'rgba(255,255,255,0.5)';

function TabItem({ focused, meta, label, onPress, onLongPress }) {
  const color = focused ? ACTIVE : INACTIVE;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 }}
    >
      <MaterialIcons name={meta.icon} size={22} color={color} />
      <Text variant="labelXs" color={color} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useLocale();
  const dockBg = isDark ? '#0C0A06' : '#241A12';

  return (
    <View
      pointerEvents="box-none"
      importantForAccessibility="no"
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: Math.max(insets.bottom, 14),
      }}
    >
      <View
        accessibilityRole="tablist"
        importantForAccessibility="yes"
        style={{
          height: 66,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          backgroundColor: dockBg,
          borderRadius: 22,
          paddingHorizontal: 6,
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 16 },
          elevation: 12,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = ROUTE_META[route.name] ?? { icon: 'circle', label: route.name };
          const label = t(`tabs:${route.name}`, { defaultValue: meta.label });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              meta={meta}
              label={label}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}
