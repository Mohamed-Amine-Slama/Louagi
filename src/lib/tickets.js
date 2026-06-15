// Shared building blocks for the boarding-pass UI used across the passenger
// (and later driver) screens. Pure helpers + fixed accent palette — no React,
// no theme context, so any screen can import them freely.
import { Platform } from 'react-native';

// No bundled monospace font — fall back to the platform's system mono for the
// boarding-pass station codes (the signature "ticket" look).
export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

// The ticket cards stay deep navy in both light and dark, like a real louage
// pass; brand red/green still come from the theme tokens around them.
export const PASS = {
  navy: '#0A2247',
  navyDeep: '#031634',
  driver: '#0E2C57',
  gold: '#FFD27A',
  toCode: '#FF6470',
  onNavy: '#FFFFFF',
  onNavyMut: 'rgba(255,255,255,0.55)',
  onNavyFaint: 'rgba(255,255,255,0.5)',
  line: 'rgba(255,255,255,0.24)',
};

// Tunisian city → 3-letter louage code for the ticket. Falls back to the first
// three (accent-stripped) letters so unmapped cities still render a code.
const CITY_CODES = {
  Tunis: 'TUN', Sfax: 'SFX', Sousse: 'SOU', Nabeul: 'NAB', Bizerte: 'BIZ',
  'Gabès': 'GAB', Gabes: 'GAB', Kairouan: 'KAI', Monastir: 'MON', Djerba: 'DJE',
  Tozeur: 'TOZ', Gafsa: 'GAF', Kasserine: 'KAS', 'Médenine': 'MED', Medenine: 'MED',
  Tataouine: 'TAT', 'Béja': 'BEJ', Beja: 'BEJ', Jendouba: 'JEN', 'Le Kef': 'KEF',
  Kef: 'KEF', Mahdia: 'MAH', 'Sidi Bouzid': 'SBZ', Siliana: 'SIL', Zaghouan: 'ZAG',
  Manouba: 'MAN', Ariana: 'ARI', 'Ben Arous': 'BEN', 'Kébili': 'KEB', Kebili: 'KEB',
  Hammamet: 'HAM', Zarzis: 'ZRZ', Douz: 'DOZ',
};

export function cityCode(name = '') {
  if (!name) return '—';
  if (CITY_CODES[name]) return CITY_CODES[name];
  const letters = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '');
  return (letters.slice(0, 3) || name.slice(0, 3)).toUpperCase();
}

export function initialsOf(name = '') {
  return (
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function ticketRef(id) {
  const slug = String(id ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return `LGI-${slug || '----'}`;
}
