// Locale-aware date/time helpers. Defaults to the active i18n locale.
import i18n from './index';

const LOCALE_MAP = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-TN' };

function intlLocale(locale) {
  return LOCALE_MAP[locale ?? i18n.language] ?? 'en-GB';
}

export function formatDate(d, opts = {}) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const { locale, time = false, dateStyle = 'medium', timeStyle = 'short' } = opts;
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      dateStyle,
      ...(time ? { timeStyle } : {}),
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatTime(d, opts = {}) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const { locale } = opts;
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

export function formatDateTime(d, opts = {}) {
  return formatDate(d, { ...opts, time: true });
}

export function formatWeekday(d, opts = {}) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const { locale } = opts;
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}
