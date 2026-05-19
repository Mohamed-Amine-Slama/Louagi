import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { I18nManager, Platform, Alert, NativeModules } from 'react-native';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LOCALES, RTL_LOCALES, clampLocale } from '../i18n';
import { getSecure, setSecure } from '../security/secureStorage';

const KEY = 'louagi.locale';
const LocaleCtx = createContext(null);

function reloadApp() {
  // Expo Go (DEV) — DevSettings.reload() exists when __DEV__ is true.
  if (__DEV__ && NativeModules?.DevSettings?.reload) {
    NativeModules.DevSettings.reload();
    return;
  }
  // Production / web: fall back to a polite alert.
  Alert.alert(
    'Restart required',
    'Please reopen Louagi to finish applying the new layout direction.',
    [{ text: 'OK' }]
  );
}

export function LocaleProvider({ children }) {
  const { t } = useTranslation();
  const [locale, setLocaleState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      let stored = await getSecure(KEY);
      if (!stored || !SUPPORTED_LOCALES.includes(stored)) {
        const deviceLocale = Localization.getLocales?.()[0]?.languageCode;
        stored = clampLocale(deviceLocale);
        await setSecure(KEY, stored);
      }
      await i18n.changeLanguage(stored);
      // Align RTL flag without forcing reload on every cold start; only reload
      // when the user *changes* locale and direction has flipped.
      const desiredRTL = RTL_LOCALES.has(stored);
      I18nManager.allowRTL(true);
      if (I18nManager.isRTL !== desiredRTL && Platform.OS !== 'web') {
        // On first boot we *do* need a reload to make AR render right.
        I18nManager.forceRTL(desiredRTL);
        reloadApp();
      }
      setLocaleState(stored);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(
    async (next, { skipReload = false } = {}) => {
      const clamped = clampLocale(next);
      if (clamped === locale) return;
      await setSecure(KEY, clamped);
      await i18n.changeLanguage(clamped);
      const desiredRTL = RTL_LOCALES.has(clamped);
      const currentRTL = RTL_LOCALES.has(locale);
      setLocaleState(clamped);
      if (Platform.OS !== 'web' && desiredRTL !== currentRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(desiredRTL);
        if (!skipReload) {
          // Give React a tick to commit the state before reloading.
          setTimeout(reloadApp, 250);
        }
      }
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      isRTL: RTL_LOCALES.has(locale),
      ready,
    }),
    [locale, setLocale, t, ready]
  );

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export const useLocale = () => {
  const v = useContext(LocaleCtx);
  if (!v) throw new Error('useLocale must be inside LocaleProvider');
  return v;
};
