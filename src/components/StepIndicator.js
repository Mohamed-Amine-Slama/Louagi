import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { spacing, radius } from '../theme';
import { SPRING } from './motion';

function StepDot({ label, index, active }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      scale.value = withSequence(withTiming(1.2, { duration: 90 }), withSpring(1, SPRING));
    }
    wasActive.current = active;
  }, [active, scale]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            width: 28,
            height: 28,
            borderRadius: radius.full,
            borderWidth: 2,
            borderColor: active ? colors.secondaryContainer : colors.outlineVariant,
            backgroundColor: active ? colors.secondaryContainer : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          },
          dotStyle,
        ]}
      >
        <Text variant="labelSm" color={active ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
          {index + 1}
        </Text>
      </Animated.View>
      <Text
        variant="labelSm"
        color={active ? colors.onSurface : colors.onSurfaceVariant}
        style={{ marginTop: 4 }}
      >
        {label}
      </Text>
    </View>
  );
}

function StepLine({ filled }) {
  const { colors } = useTheme();
  const progress = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(filled ? 1 : 0, SPRING);
  }, [filled, progress]);
  const fillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: progress.value }],
  }));
  return (
    <View
      style={{
        flex: 1,
        height: 3,
        marginTop: -16,
        marginHorizontal: 4,
        borderRadius: radius.full,
        backgroundColor: colors.outlineVariant,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            borderRadius: radius.full,
            backgroundColor: colors.secondaryContainer,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

export function StepIndicator({ steps, current }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {steps.map((s, i) => {
        const active = i <= current;
        const last = i === steps.length - 1;
        return (
          <React.Fragment key={s}>
            <StepDot label={s} index={i} active={active} />
            {!last ? <StepLine filled={i < current} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}
