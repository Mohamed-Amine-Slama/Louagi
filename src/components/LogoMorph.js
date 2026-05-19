import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { shadows } from '../theme';

const RED = '#C8102E';
const NAVY = '#031634';
const WHITE = '#fbf8fc';

/*
 * Morphs from the "vehicle" SVG to the brand L mark.
 *
 * Implementation note: the shapes are Animated.View boxes (not <svg>) and
 * every prop is driven by an Animated.Value via interpolate(). This avoids
 * setState-per-frame, which under React 19's concurrent renderer was being
 * coalesced and producing a snap-to-end-frame instead of a smooth morph.
 */
export function LogoMorph({
  size = 64,
  rotate = true,
  shadow = true,
  duration = 1600,
  delay = 350,
  loop = false,
  loopPause = 1200,
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let stopped = false;
    let timeoutId;

    const run = () => {
      if (stopped) return;
      t.setValue(0);
      Animated.timing(t, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && loop && !stopped) {
          timeoutId = setTimeout(run, loopPause);
        }
      });
    };
    run();

    return () => {
      stopped = true;
      t.stopAnimation();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [t, duration, delay, loop, loopPause]);

  // Source SVG is authored in a 1024-unit viewBox — scale everything to `size`.
  const s = size / 1024;

  const outerBg = t.interpolate({ inputRange: [0, 1], outputRange: [RED, NAVY] });
  const bodyOpacity = t.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  // Top white rectangle → vertical white bar of the L.
  const winLeft = t.interpolate({ inputRange: [0, 1], outputRange: [284 * s, 347 * s] });
  const winTop = t.interpolate({ inputRange: [0, 1], outputRange: [347 * s, 221 * s] });
  const winWidth = t.interpolate({ inputRange: [0, 1], outputRange: [457 * s, 173 * s] });
  const winHeight = t.interpolate({ inputRange: [0, 1], outputRange: [173 * s, 662 * s] });
  const winRadius = t.interpolate({ inputRange: [0, 1], outputRange: [24 * s, 0] });

  // White strip → horizontal red bar of the L (color + box morph).
  const stripLeft = t.interpolate({ inputRange: [0, 1], outputRange: [221 * s, 520 * s] });
  const stripTop = t.interpolate({ inputRange: [0, 1], outputRange: [567 * s, 710 * s] });
  const stripWidth = t.interpolate({ inputRange: [0, 1], outputRange: [583 * s, 346 * s] });
  const stripHeight = t.interpolate({ inputRange: [0, 1], outputRange: [47 * s, 173 * s] });
  const stripBg = t.interpolate({ inputRange: [0, 1], outputRange: [WHITE, RED] });

  // Wheels: shrink+fade by the 60% mark.
  const wheelSize = t.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [78 * s, 0, 0],
    extrapolate: 'clamp',
  });
  const wheelOpacity = t.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const halfWheel = Animated.divide(wheelSize, 2);
  const wheelLeftL = Animated.subtract(315 * s, halfWheel);
  const wheelLeftR = Animated.subtract(709 * s, halfWheel);
  const wheelTop = Animated.subtract(725 * s, halfWheel);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          transform: rotate ? [{ rotate: '3deg' }] : [],
        },
        shadow && shadows.card,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: 236 * s,
          backgroundColor: outerBg,
          overflow: 'hidden',
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: 221 * s,
          top: 284 * s,
          width: 583 * s,
          height: 536 * s,
          borderRadius: 79 * s,
          backgroundColor: NAVY,
          opacity: bodyOpacity,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: winLeft,
          top: winTop,
          width: winWidth,
          height: winHeight,
          borderRadius: winRadius,
          backgroundColor: WHITE,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: stripLeft,
          top: stripTop,
          width: stripWidth,
          height: stripHeight,
          backgroundColor: stripBg,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: wheelLeftL,
          top: wheelTop,
          width: wheelSize,
          height: wheelSize,
          borderRadius: halfWheel,
          backgroundColor: WHITE,
          opacity: wheelOpacity,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: wheelLeftR,
          top: wheelTop,
          width: wheelSize,
          height: wheelSize,
          borderRadius: halfWheel,
          backgroundColor: WHITE,
          opacity: wheelOpacity,
        }}
      />
    </View>
  );
}
