import React from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, shadows, floatingTabBar } from '../theme';

// Map navigation route names → MaterialIcons glyph + display label
const ROUTE_META = {
  Home: { icon: 'home', label: 'Home' },
  Search: { icon: 'search', label: 'Search' },
  Bookings: { icon: 'event', label: 'Bookings' },
  Profile: { icon: 'person', label: 'Profile' },
  Dashboard: { icon: 'space-dashboard', label: 'Dashboard' },
  Rides: { icon: 'directions-car', label: 'Rides' },
  Overview: { icon: 'space-dashboard', label: 'Overview' },
  Drivers: { icon: 'verified-user', label: 'Drivers' },
  Users: { icon: 'group', label: 'Users' },
  Payments: { icon: 'payments', label: 'Pay' },
  Audit: { icon: 'fact-check', label: 'Audit' },
};

const ACTIVE_SIZE = 52;
const INACTIVE_SIZE = 40;

function barWidthForTabs(count) {
  // 4 tabs → 70% of screen; ramp wider for denser admin bar so circles fit.
  if (count <= 4) return 0.72;
  if (count === 5) return 0.84;
  return 0.94;
}

export function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const screen = Dimensions.get('window');
  const widthFrac = barWidthForTabs(state.routes.length);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, floatingTabBar.bottomGap),
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: screen.width * widthFrac,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primary,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xs,
          paddingTop: 8,
          paddingBottom: 10,
          ...shadows.floating,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = ROUTE_META[route.name] ?? { icon: 'circle', label: route.name };

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

          const size = focused ? ACTIVE_SIZE : INACTIVE_SIZE;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 2,
              }}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? colors.secondaryContainer : 'transparent',
                }}
              >
                <MaterialIcons
                  name={meta.icon}
                  size={focused ? 26 : 20}
                  color={focused ? colors.onSecondaryContainer : colors.onPrimaryContainer}
                />
              </View>
              <Text
                variant="labelSm"
                color={focused ? colors.onPrimary : colors.onPrimaryContainer}
                numberOfLines={1}
                style={{ fontSize: 10, fontWeight: focused ? '700' : '500' }}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
