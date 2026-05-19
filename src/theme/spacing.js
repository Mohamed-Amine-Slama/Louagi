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

export const shadows = {
  card: {
    shadowColor: '#1a2b4a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#1a2b4a',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  soft: {
    shadowColor: '#1a2b4a',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};
