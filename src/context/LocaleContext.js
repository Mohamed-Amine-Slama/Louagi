import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { I18nManager, Platform, Alert, NativeModules } from 'react-native';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LOCALES, RTL_LOCALES, clampLocale } from '../i18n';
import { getSecure, setSecure } from '../security/secureStorage';

const KEY = 'louagi.locale';
const LocaleCtx = createContext(null);

function reloadApp(t) {
  // Expo Go (DEV) — DevSettings.reload() exists when __DEV__ is true.
  if (__DEV__ && NativeModules?.DevSettings?.reload) {
    NativeModules.DevSettings.reload();
    return;
  }
  // Production / web: fall back to a polite alert in the active locale.
  const title = t ? t('settings:rtlReloadTitle') : 'Restart required';
  const body = t ? t('settings:rtlReloadBody') : 'Please reopen the app to finish applying the new layout direction.';
  Alert.alert(title, body, [{ text: t ? t('common:close') : 'OK' }]);
}

export function LocaleProvider({ children }) {
  const { t } = useTranslation();
  const [locale, setLocaleState] = useState('en');
  const [ready, setReady] = useState(false);
  // Guards setLocale from being called repeatedly while a change is in flight
  // (avoids racing the RTL reload).
  const switchingRef = useRef(false);
  const [switching, setSwitching] = useState(false);
  const reloadTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(reloadTimerRef.current), []);

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
        // First boot mismatch — flip and reload so AR renders right.
        I18nManager.forceRTL(desiredRTL);
        setLocaleState(stored);
        setReady(true);
        reloadApp(t);
        return;
      }
      setLocaleState(stored);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback(
    async (next, { skipReload = false } = {}) => {
      const clamped = clampLocale(next);
      if (clamped === locale) return;
      if (switchingRef.current) return;
      switchingRef.current = true;
      setSwitching(true);
      let reloadScheduled = false;
      try {
        await setSecure(KEY, clamped);
        await i18n.changeLanguage(clamped);
        const desiredRTL = RTL_LOCALES.has(clamped);
        const currentRTL = RTL_LOCALES.has(locale);
        setLocaleState(clamped);
        if (Platform.OS !== 'web' && desiredRTL !== currentRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(desiredRTL);
          if (!skipReload) {
            // Give React a tick to commit the state before reloading so the
            // user briefly sees translations in the new locale before reload.
            // The guard stays held until the reload actually fires so a
            // second tap during the window can't flip RTL again.
            reloadScheduled = true;
            reloadTimerRef.current = setTimeout(() => {
              reloadTimerRef.current = null;
              switchingRef.current = false;
              setSwitching(false);
              reloadApp(t);
            }, 250);
          }
        }
      } finally {
        if (!reloadScheduled) {
          switchingRef.current = false;
          setSwitching(false);
        }
      }
    },
    [locale, t]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      switching,
      t,
      isRTL: RTL_LOCALES.has(locale),
      ready,
    }),
    [locale, setLocale, switching, t, ready]
  );

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export const useLocale = () => {
  const v = useContext(LocaleCtx);
  if (!v) throw new Error('useLocale must be inside LocaleProvider');
  return v;
};
