export const spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  containerMargin: 20,
  gutter: 16,
};

// Total vertical footprint reserved for the floating bottom tab bar:
// active circle (52) + paddingTop (8) + paddingBottom (10) + label row (~14)
// + the bottom gap above the OS edge (≥12). Keep in sync with FloatingTabBar.
export const floatingTabBar = {
  height: 96,
  bottomGap: 16,
  contentClearance: 140, // padding apps should add below scroll content
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

import { getActivePalette } from './colors';

// Navy shadows at low opacity disappear on dark surfaces, so dark mode
// switches to black with a stronger opacity. Getters rebuild each profile
// from the active palette at spread time (`...shadows.card` in render),
// so toggling the theme repaints shadows along with everything else.
const SHADOW_SPECS = {
  card: { light: 0.08, dark: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  floating: { light: 0.12, dark: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  soft: { light: 0.05, dark: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
};

function buildShadow(name) {
  const palette = getActivePalette();
  const isDark = palette.mode === 'dark';
  const spec = SHADOW_SPECS[name];
  return {
    shadowColor: palette.shadow ?? '#1a2b4a',
    shadowOpacity: isDark ? spec.dark : spec.light,
    shadowRadius: spec.shadowRadius,
    shadowOffset: spec.shadowOffset,
    elevation: spec.elevation,
  };
}

export const shadows = {
  get card() {
    return buildShadow('card');
  },
  get floating() {
    return buildShadow('floating');
  },
  get soft() {
    return buildShadow('soft');
  },
};
