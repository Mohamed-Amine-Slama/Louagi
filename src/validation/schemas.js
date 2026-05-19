// Input validators. Mirrors the server-side checks called out in the docs:
// Tunisian phone format, password strength, OTP shape, file size limits,
// plate-number uniqueness, ride-creation guards.

export function validateTunisianPhone(raw) {
  if (!raw) return 'Phone number required';
  const compact = raw.replace(/\s/g, '');
  if (!/^(\+216)?\d{8}$/.test(compact)) return 'Use Tunisian format: +216 XXXXXXXX';
  return null;
}

export function normalizeTunisianPhone(raw) {
  const c = raw.replace(/\s/g, '');
  if (c.startsWith('+216')) return c;
  return '+216' + c;
}

export function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Min 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Needs 1 uppercase letter';
  if (!/\d/.test(pw)) return 'Needs 1 digit';
  return null;
}

export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: 'Empty' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  return { score, label: labels[Math.min(score, 5)] };
}

export function validateEmail(email) {
  if (!email) return 'Email required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email';
  return null;
}

export function validateName(name) {
  if (!name || name.trim().length < 2) return 'Name too short';
  if (name.length > 60) return 'Name too long';
  return null;
}

export function validateOtp(code) {
  if (!/^\d{6}$/.test(code || '')) return 'Enter the 6-digit code';
  return null;
}

export function validatePlate(plate) {
  if (!plate) return 'Plate required';
  if (!/^[A-Z0-9\s-]{4,12}$/i.test(plate)) return 'Invalid plate';
  return null;
}

export function validateSeatCount(n, max = 8) {
  const v = Number(n);
  if (!Number.isInteger(v) || v < 1 || v > max) return `1-${max} seats only`;
  return null;
}

// Sanitiser stripping HTML/script payloads and control bytes from free-text inputs.
export function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, 500);
}

export function validateFileSize(bytes, maxMb) {
  if (bytes > maxMb * 1024 * 1024) return `File exceeds ${maxMb} MB`;
  return null;
}
