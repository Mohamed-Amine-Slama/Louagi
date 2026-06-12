import React, { useEffect } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { radius, spacing, shadows, floatingTabBar, withAlpha } from '../theme';
import { SPRING } from './motion';

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

const ACTIVE_SIZE = 52;
const INACTIVE_SIZE = 40;

function barWidthForTabs(count) {
  // 4 tabs → 70% of screen; ramp wider for denser admin bar so circles fit.
  if (count <= 4) return 0.72;
  if (count === 5) return 0.84;
  return 0.94;
}

function TabItem({ focused, meta, label, onPress, onLongPress, colors, inactiveColor }) {
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focus.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, focus]);

  const transparentSecondary = withAlpha(colors.secondaryContainer, 0);

  const circleStyle = useAnimatedStyle(() => {
    const size = INACTIVE_SIZE + (ACTIVE_SIZE - INACTIVE_SIZE) * focus.value;
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: interpolateColor(
        focus.value,
        [0, 1],
        [transparentSecondary, colors.secondaryContainer]
      ),
    };
  });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Animated.View
        style={[
          {
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          },
          circleStyle,
        ]}
      >
        <MaterialIcons
          name={meta.icon}
          size={focused ? 26 : 20}
          color={focused ? colors.onSecondaryContainer : inactiveColor}
        />
      </Animated.View>
      <Text
        variant="labelXs"
        color={focused ? colors.onPrimary : inactiveColor}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const screen = Dimensions.get('window');
  const widthFrac = barWidthForTabs(state.routes.length);
  const inactiveColor = isDark ? withAlpha(colors.onPrimary, 0.75) : colors.onPrimaryContainer;

  return (
    <View
      pointerEvents="box-none"
      importantForAccessibility="no"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, floatingTabBar.bottomGap),
        alignItems: 'center',
      }}
    >
      <View
        accessibilityRole="tablist"
        importantForAccessibility="yes"
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
              colors={colors}
              inactiveColor={inactiveColor}
            />
          );
        })}
      </View>
    </View>
  );
}
