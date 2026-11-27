// Points & tiers.
// Each ascent is worth more than the one below it, and tiers are earned by POINTS, not raw accuracy.
// So a perfect first ascent can't reach the top tier, but a high-accuracy late ascent can.

/** Max points for ascent 1..7 (index 0..6). Ascent 7 is the surface exam. */
export const ASCENT_MAX = [100, 125, 150, 175, 200, 225, 250];
export const ASCENTS_PER_DIVE = ASCENT_MAX.length;
export const MAX_DIVE_POINTS = ASCENT_MAX.reduce((s, n) => s + n, 0); // 1225

// `min` is the points needed on a single ascent.
export const TIERS = [
  {
    id: 'cucumber',
    name: 'Sea Cucumber',
    min: 0,
    color: '#8fa3c4',
    sprite: 'cucumber',
    blurb: 'Still settled in the silt. Every expert started down here.',
  },
  {
    id: 'crab',
    name: 'Hermit Crab',
    min: 35,
    color: '#ff9f43',
    sprite: 'crab',
    blurb: 'Peeking out of the shell. The light is calling.',
  },
  {
    id: 'octopus',
    name: 'Octopus',
    min: 60,
    color: '#c77dff',
    sprite: 'octopus',
    blurb: 'Eight arms, one growing brain.',
  },
  {
    id: 'turtle',
    name: 'Sea Turtle',
    min: 85,
    color: '#4ade80',
    sprite: 'turtle',
    blurb: 'A steady climb toward the light.',
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    min: 130,
    color: '#4de3ff',
    sprite: 'dolphin',
    blurb: 'Leaping just below the surface.',
  },
  {
    id: 'shrimpion',
    name: 'One in a Shrimpion',
    min: 200,
    color: '#ffd166',
    sprite: 'shrimpGold',
    blurb: 'Deep knowledge, high up. You broke the surface.',
  },
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));

/** Max points for an ascent index (0-based). Unlimited blocks reuse the same ladder. */
export function ascentMax(ascentIdx) {
  return ASCENT_MAX[Math.min(ASCENT_MAX.length - 1, Math.max(0, ascentIdx))];
}

/** Points for one ascent: accuracy × that ascent's max. */
export function pointsFor(correct, total, ascentIdx) {
  if (!total) return 0;
  return Math.round((correct / total) * ascentMax(ascentIdx));
}

/** Tier for the points earned on a single ascent. */
export function tierForPoints(points) {
  let best = TIERS[0];
  for (const t of TIERS) if (points >= t.min) best = t;
  return best;
}

/** The best tier an ascent can possibly award (used to show what's locked). */
export function topTierFor(ascentIdx) {
  return tierForPoints(ascentMax(ascentIdx));
}

/** Overall tier for a whole dive: scale the dive's points onto the final-exam ladder. */
export function tierForDive(points, maxPoints = MAX_DIVE_POINTS) {
  if (!maxPoints) return TIERS[0];
  return tierForPoints((points / maxPoints) * ASCENT_MAX[ASCENT_MAX.length - 1]);
}
