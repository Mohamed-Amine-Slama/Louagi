import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View } from 'react-native';
import { Text } from './Text';
import { radius } from '../theme';

const PALETTE = [
  '#031634',
  '#feae2c',
  '#1a2b4a',
  '#835500',
  '#198754',
  '#5e548e',
  '#ba1a1a',
];

function colorFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function onColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a2b4a' : '#ffffff';
}

export function Avatar({ name, size = 40, badge }) {
  const { colors } = useTheme();
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const bg = colorFor(name);
  const fg = onColorFor(bg);
  return (
    <View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          variant="labelMd"
          color={fg}
          style={{ fontSize: size * 0.42, lineHeight: size }}
        >
          {initials}
        </Text>
      </View>
      {badge ? (
        <View
          style={{
            position: 'absolute',
            end: -2,
            bottom: -2,
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size,
            backgroundColor: colors.success,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      ) : null}
    </View>
  );
}

export function AvatarStack({ names = [], size = 32, extra = 0 }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {names.map((n, i) => (
        <View key={i} style={{ marginStart: i === 0 ? 0 : -size * 0.35 }}>
          <View
            style={{
              borderWidth: 2,
              borderColor: colors.surface,
              borderRadius: size,
            }}
          >
            <Avatar name={n} size={size} />
          </View>
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={{
            marginStart: -size * 0.35,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceContainerHigh,
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="labelSm">+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}
