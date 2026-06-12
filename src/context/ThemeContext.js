import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { colorsLight, setActivePalette } from '../theme/colors';
import { colorsDark } from '../theme/colors-dark';
import { getSecure, setSecure } from '../security/secureStorage';

const KEY = 'louagi.themeMode';
const ThemeCtx = createContext(null);

export const THEME_MODES = ['light', 'dark', 'system'];

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('system');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() ?? 'light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getSecure(KEY);
      if (stored && THEME_MODES.includes(stored)) setModeState(stored);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    return () => sub.remove();
  }, []);

  const setMode = async (next) => {
    if (!THEME_MODES.includes(next)) return;
    setModeState(next);
    await setSecure(KEY, next);
  };

  const scheme = mode === 'system' ? systemScheme : mode;
  const isDark = scheme === 'dark';
  const colors = isDark ? colorsDark : colorsLight;

  // Push the active palette down to the static-import proxy so every
  // `// colors now via useTheme()` reads the right tokens this render.
  setActivePalette(colors);

  const value = useMemo(
    () => ({ mode, setMode, scheme, isDark, colors, ready }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, scheme, isDark, ready]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme must be inside ThemeProvider');
  return v;
};
