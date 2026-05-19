// Per-key sliding-window rate limiter used for login attempts and sensitive endpoints.
const buckets = new Map();

export function rateLimit(key, { max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [], lockedUntil: 0 };
  if (bucket.lockedUntil > now) {
    return { allowed: false, lockedUntil: bucket.lockedUntil, remaining: 0 };
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= max) {
    bucket.lockedUntil = now + windowMs;
    buckets.set(key, bucket);
    return { allowed: false, lockedUntil: bucket.lockedUntil, remaining: 0 };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: max - bucket.hits.length };
}

export function clearRateLimit(key) {
  buckets.delete(key);
}

export function checkRateLimit(key) {
  const bucket = buckets.get(key);
  if (!bucket) return { lockedUntil: 0, hits: 0 };
  return { lockedUntil: bucket.lockedUntil, hits: bucket.hits.length };
}
