// Locale-aware date/time and number helpers. Defaults to the active i18n locale.
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

export function formatMonthYear(d, opts = {}) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const { locale } = opts;
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', year: 'numeric' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatDayOfMonth(d, opts = {}) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const { locale } = opts;
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric' }).format(date);
  } catch {
    return String(date.getDate());
  }
}

// Single-letter day abbreviation (locale-aware). Useful for tight bar charts.
export function dayLetter(d, opts = {}) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const { locale } = opts;
  try {
    const narrow = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'narrow' }).format(date);
    return narrow || formatWeekday(d, opts).slice(0, 1);
  } catch {
    return formatWeekday(d, opts).slice(0, 1);
  }
}

// Plural-safe seat label using the i18n plural rules.
export function seatsLabel(count, t) {
  return t('common:seatsCount', { count });
}

// Returns "Xh Ym" style countdown using locale-aware unit suffixes.
export function countdownFrom(fromIso, t) {
  const ms = new Date(fromIso).getTime() - Date.now();
  if (ms <= 0) return t('common:departure');
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
