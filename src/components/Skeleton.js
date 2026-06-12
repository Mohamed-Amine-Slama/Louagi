import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme';

// Pulsing placeholder block shown while content loads.
export function Skeleton({ width = '100%', height = 16, round = radius.md, style }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.35,
  }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: round, backgroundColor: colors.surfaceContainerHigh },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Card-shaped placeholder matching the standard Card silhouette.
export function SkeletonCard({ lines = 2, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: radius.xl,
          padding: spacing.md,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Skeleton width={40} height={40} round={radius.full} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} />
        </View>
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={10} />
      ))}
    </View>
  );
}

// Convenience list of skeleton cards for screen-level loading states.
export function SkeletonList({ count = 3, lines = 2, gap = spacing.md, style }) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </View>
  );
}
