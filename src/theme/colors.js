export const colorsLight = {
  mode: 'light',
  surface: '#F4EFE6',
  surfaceDim: '#E4DCCB',
  surfaceBright: '#FBF8F1',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#FAF6EE',
  surfaceContainer: '#EFE9DD',
  surfaceContainerHigh: '#EAE2D2',
  surfaceContainerHighest: '#E3D9C7',
  onSurface: '#1b1b1e',
  onSurfaceVariant: '#44474e',
  inverseSurface: '#303033',
  inverseOnSurface: '#f2f0f3',
  outline: '#75777e',
  outlineVariant: '#DED5C3',
  surfaceTint: '#4e5e80',
  primary: '#07214b',
  onPrimary: '#ffffff',
  primaryContainer: '#1a2b4a',
  onPrimaryContainer: '#8293b7',
  inversePrimary: '#b6c6ee',
  secondary: '#835500',
  onSecondary: '#ffffff',
  // Brand accent (louage red) — same in both modes for brand consistency.
  secondaryContainer: '#DC2626',
  onSecondaryContainer: '#ffffff',
  secondaryContainerPressed: '#b91c1c',
  tertiary: '#14171a',
  onTertiary: '#ffffff',
  tertiaryContainer: '#e0e3e6',
  onTertiaryContainer: '#191c1e',
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
  background: '#F4EFE6',
  onBackground: '#1b1b1e',
  surfaceVariant: '#EAE2D2',
  success: '#157347',
  successContainer: '#d1f1de',
  onSuccess: '#ffffff',
  warning: '#8f6900',
  onWarning: '#ffffff',
  warningContainer: '#ffdf9e',
  onWarningContainer: '#5c4300',
  shadow: '#1a2b4a',
  scrim: '#000000',
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

