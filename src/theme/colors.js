export const colorsLight = {
  surface: '#fbf8fc',
  surfaceDim: '#dbd9dc',
  surfaceBright: '#fbf8fc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f3f6',
  surfaceContainer: '#efedf0',
  surfaceContainerHigh: '#e9e7eb',
  surfaceContainerHighest: '#e4e2e5',
  onSurface: '#1b1b1e',
  onSurfaceVariant: '#44474e',
  inverseSurface: '#303033',
  inverseOnSurface: '#f2f0f3',
  outline: '#75777e',
  outlineVariant: '#c5c6cf',
  surfaceTint: '#4e5e80',
  primary: '#07214b',
  onPrimary: '#ffffff',
  primaryContainer: '#1a2b4a',
  onPrimaryContainer: '#8293b7',
  inversePrimary: '#b6c6ee',
  secondary: '#835500',
  onSecondary: '#ffffff',
  secondaryContainer: '#DC2626',
  onSecondaryContainer: '#ffffff',
  tertiary: '#14171a',
  onTertiary: '#ffffff',
  tertiaryContainer: '#282c2e',
  onTertiaryContainer: '#909396',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  primaryFixed: '#d8e2ff',
  primaryFixedDim: '#b6c6ee',
  onPrimaryFixed: '#081b39',
  onPrimaryFixedVariant: '#364767',
  secondaryFixed: '#ffddb4',
  secondaryFixedDim: '#ffb955',
  onSecondaryFixed: '#291800',
  onSecondaryFixedVariant: '#633f00',
  tertiaryFixed: '#e0e3e6',
  tertiaryFixedDim: '#c4c7ca',
  onTertiaryFixed: '#191c1e',
  onTertiaryFixedVariant: '#44474a',
  background: '#fbf8fc',
  onBackground: '#1b1b1e',
  surfaceVariant: '#e4e2e5',
  success: '#198754',
  successContainer: '#d1f1de',
  onSuccess: '#ffffff',
  warning: '#b88700',
};

// Live palette pointer — mutable so static `colors` imports always read the
// currently active theme. ThemeProvider calls setActivePalette() on toggle and
// also bumps a React context value to trigger a re-render of every consumer.
let activePalette = colorsLight;

export function setActivePalette(palette) {
  activePalette = palette || colorsLight;
}

export function getActivePalette() {
  return activePalette;
}

// Proxy-backed export so `import { colors } from '../theme'` always returns
// fresh values for the active theme.
export const colors = new Proxy(
  {},
  {
    get(_target, prop) {
      return activePalette[prop];
    },
    ownKeys() {
      return Reflect.ownKeys(activePalette);
    },
    getOwnPropertyDescriptor(_target, prop) {
      return {
        enumerable: true,
        configurable: true,
        value: activePalette[prop],
      };
    },
  }
);

export const withAlpha = (hex, alpha) => {
  if (!hex) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};
