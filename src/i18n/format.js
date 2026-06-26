// Locale-aware date/time and number helpers. Defaults to the active i18n locale.
import i18n from './index';

const LOCALE_MAP = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-TN' };

// Translate a raw backend status/method enum (e.g. 'in_progress', 'picked_up',
// 'flagged', 'card') into a localized label from the `status` namespace.
// snake_case is converted to the camelCase key; unknown values fall back to the
// raw string so nothing is ever rendered blank.
export function statusLabel(t, status) {
  if (!status) return '';
  const key = String(status).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return t(`status:${key}`, { defaultValue: String(status) });
}

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

// Group a money/number value with thousands separators and trim floating-point
// noise to at most two decimals (e.g. 1234.5600000000002 -> "1,234.56"). Manual
// grouping (not Intl.NumberFormat) to stay safe on Hermes, matching the loyalty
// card's points formatting.
export function formatAmount(value) {
  const num = Number(value) || 0;
  const fixed = Math.round(num * 100) / 100;
  const [intPart, decPart] = String(fixed).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${grouped}.${decPart}` : grouped;
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

// Full badge label for a booking's departure: the localized "Departs in Xh Ym"
// countdown while the trip is still ahead, falling back to a standalone
// "Departing now" once the scheduled time passes. Guards against the broken
// "Departs in Departure" that pairing departsIn with countdownFrom's overdue
// fallback used to produce.
export function departureLabel(fromIso, t) {
  if (!fromIso) return '';
  const ms = new Date(fromIso).getTime() - Date.now();
  if (ms <= 0) return t('common:departingNow');
  return t('common:departsIn', { duration: countdownFrom(fromIso, t) });
}

// Localized "updated X ago" for live tracking (uses the delivery namespace).
export function updatedAgo(date, t) {
  if (!date) return '';
  const then = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 5) return t('delivery:updatedJustNow');
  if (sec < 60) return t('delivery:updatedSecondsAgo', { count: sec });
  return t('delivery:updatedMinutesAgo', { count: Math.round(sec / 60) });
}
