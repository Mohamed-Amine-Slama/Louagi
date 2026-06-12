import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export const SPRING = { damping: 16, stiffness: 220, mass: 0.7 };
export const STAGGER_MS = 70;

// Entrance wrapper for cards/sections/list items. Vertical slide only so it
// stays RTL-neutral. Pass `index` to stagger siblings.
export function FadeSlideIn({ index = 0, delay, children, style }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay ?? index * STAGGER_MS)
        .springify()
        .damping(18)
        .stiffness(160)
        .mass(0.8)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Tactile press feedback: gentle spring scale instead of opacity flicker.
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  onPress,
  onLongPress,
  disabled,
  ...rest
}) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * 0.04,
  }));
  return (
    <AnimatedPressable
      onPressIn={() => {
        pressed.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, SPRING);
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
