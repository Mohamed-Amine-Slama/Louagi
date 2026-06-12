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
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { radius, spacing } from '../theme';
import { PressableScale, SPRING } from './motion';

export function Stepper({ value, onChange, min = 1, max = 9, large = false }) {
  const { colors } = useTheme();
  const pop = useSharedValue(1);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      pop.value = withSequence(withTiming(1.15, { duration: 70 }), withSpring(1, SPRING));
    }
  }, [value, pop]);
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));
  const inc = () => onChange(Math.min(max, value + 1));
  const dec = () => onChange(Math.max(min, value - 1));
  const btn = (icon, fn, disabled) => (
    <PressableScale
      onPress={fn}
      disabled={disabled}
      scaleTo={0.88}
      style={{
        width: large ? 56 : 40,
        height: large ? 56 : 40,
        borderRadius: radius.full,
        backgroundColor: disabled ? colors.surfaceContainer : colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <MaterialIcons name={icon} size={large ? 28 : 20} color={colors.primary} />
    </PressableScale>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {btn('remove', dec, value <= min)}
      <Animated.View style={popStyle}>
        <Text variant={large ? 'displayLg' : 'headlineSm'}>{value}</Text>
      </Animated.View>
      {btn('add', inc, value >= max)}
    </View>
  );
}
