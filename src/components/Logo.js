import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { shadows } from '../theme';

const BG = '#C8102E';
const BODY = '#031634';
const WHITE = '#fbf8fc';

export function Logo({ size = 64, rotate = true, shadow = true }) {
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
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Rect width={1024} height={1024} rx={236} fill={BG} />
        <Rect x={221} y={284} width={583} height={536} rx={79} fill={BODY} />
        <Rect x={284} y={347} width={457} height={173} rx={24} fill={WHITE} />
        <Rect x={221} y={567} width={583} height={47} fill={WHITE} />
        <Circle cx={315} cy={725} r={39} fill={WHITE} />
        <Circle cx={709} cy={725} r={39} fill={WHITE} />
      </Svg>
    </View>
  );
}
