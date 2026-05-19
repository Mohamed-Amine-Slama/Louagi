import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const SUPPORTED_LOCALES = ['en', 'fr', 'ar'];
export const RTL_LOCALES = new Set(['ar']);

export function clampLocale(input) {
  if (!input) return 'en';
  const code = String(input).slice(0, 2).toLowerCase();
  if (SUPPORTED_LOCALES.includes(code)) return code;
  return 'en';
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: { en, fr, ar },
      lng: 'en',
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common', 'auth', 'landing', 'search', 'ride', 'booking', 'passenger', 'driver', 'admin', 'settings', 'errors', 'toast'],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      returnNull: false,
      saveMissing: __DEV__,
      missingKeyHandler: (lngs, ns, key) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[i18n] missing key', { ns, key, lngs });
        }
      },
    });
}

export default i18n;
