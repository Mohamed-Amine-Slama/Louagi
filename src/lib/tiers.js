// Loyalty tiers — client helpers.
//
// The ladder itself is server reference data (public.tiers), fetched via
// usersApi.listTiers(). DEFAULT_TIERS below is only a fallback for first paint /
// offline / mock mode, and MUST stay shaped like the DB rows
// ({ id, i18n_key, min_points, discount_pct, perks }). The server is always
// authoritative for the discount actually charged (public.create_reservation).

export const DEFAULT_TIERS = [
  { id: 'bronze', i18n_key: 'tierBronze', min_points: 0, discount_pct: 0, perks: [] },
  { id: 'silver', i18n_key: 'tierSilver', min_points: 500, discount_pct: 5, perks: [] },
  { id: 'gold', i18n_key: 'tierGold', min_points: 1500, discount_pct: 10, perks: [] },
  { id: 'platinum', i18n_key: 'tierPlatinum', min_points: 3000, discount_pct: 15, perks: [] },
  { id: 'diamond', i18n_key: 'tierDiamond', min_points: 6000, discount_pct: 15, perks: ['perkPrioritySupport'] },
  { id: 'elite', i18n_key: 'tierElite', min_points: 12000, discount_pct: 15, perks: ['perkPrioritySupport', 'perkPriorityAccess'] },
];

// Perk code → MaterialIcon. The label is the perk code itself, looked up in the
// passenger i18n namespace by the rendering component.
export const PERK_META = {
  perkPrioritySupport: { icon: 'support-agent' },
  perkPriorityAccess: { icon: 'bolt' },
};

// Loyalty points from raw activity (mirrors the server). Used by the mock
// booking path; the real points come from GetProfile.
export function loyaltyPoints({ trips = 0, spent = 0 } = {}) {
  return trips * 100 + Math.round(spent);
}

const ladder = (tiers) => (Array.isArray(tiers) && tiers.length ? tiers : DEFAULT_TIERS);

// Index of the highest tier the points have reached.
export function tierIndexForPoints(points = 0, tiers) {
  const list = ladder(tiers);
  let idx = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (points >= list[i].min_points) idx = i;
  }
  return idx;
}

// Current tier + progress toward the next one. `next` is null at the top tier.
export function tierForPoints(points = 0, tiers) {
  const list = ladder(tiers);
  const index = tierIndexForPoints(points, list);
  const tier = list[index];
  const next = list[index + 1] || null;
  const span = next ? next.min_points - tier.min_points : 0;
  const progress = next ? Math.min(1, Math.max(0, (points - tier.min_points) / span)) : 1;
  const pointsToNext = next ? Math.max(0, next.min_points - points) : 0;
  return { index, tier, next, progress, pointsToNext };
}

// Seat-fare discount (whole percent) for a points balance.
export function discountPctForPoints(points = 0, tiers) {
  return ladder(tiers)[tierIndexForPoints(points, tiers)].discount_pct;
}
