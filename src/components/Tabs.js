import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from './Text';
import { spacing } from '../theme';
import { SPRING } from './motion';

export function Tabs({ tabs, value, onChange }) {
  const { colors } = useTheme();
  const [layouts, setLayouts] = useState({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  useEffect(() => {
    const l = layouts[value];
    if (l) {
      if (indicatorW.value === 0) {
        // First measurement: place without animating.
        indicatorX.value = l.x;
        indicatorW.value = l.width;
      } else {
        indicatorX.value = withSpring(l.x, SPRING);
        indicatorW.value = withSpring(l.width, SPRING);
      }
    }
  }, [value, layouts, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        marginHorizontal: -spacing.containerMargin,
        paddingHorizontal: spacing.containerMargin,
      }}
    >
      {/* Unpadded inner row so tab onLayout x and the indicator's left share
          one coordinate space — no parent-padding offset to compensate for. */}
      <View style={{ flexDirection: 'row' }}>
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setLayouts((prev) =>
                  prev[t.key]?.x === x && prev[t.key]?.width === width
                    ? prev
                    : { ...prev, [t.key]: { x, width } }
                );
              }}
              style={{ flex: 1, paddingVertical: spacing.md, alignItems: 'center' }}
            >
              <Text variant="labelMd" color={active ? colors.onSurface : colors.onSurfaceVariant}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              bottom: -1,
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.secondaryContainer,
            },
            indicatorStyle,
          ]}
        />
      </View>
    </View>
  );
}
