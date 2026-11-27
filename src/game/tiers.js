// Points & tiers.
// Each ascent is worth more than the one below it. The highest tier requires a perfect Surface Exam.

/** Max points for ascent 1..7 (index 0..6). Ascent 7 is the surface exam. */
export const ASCENT_MAX = [100, 125, 150, 175, 200, 225, 250];
export const ASCENTS_PER_DIVE = ASCENT_MAX.length;
export const FINAL_ASCENT_INDEX = ASCENTS_PER_DIVE - 1;
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
    min: ASCENT_MAX[FINAL_ASCENT_INDEX],
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

/** Points determine the lower tiers. The top tier is awarded separately. */
function tierForPoints(points) {
  let best = TIERS[0];
  for (const t of TIERS) if (t.id !== 'shrimpion' && points >= t.min) best = t;
  return best;
}

export function tierForAscent({ ascent, points, correct, total }) {
  if (ascent === FINAL_ASCENT_INDEX && total > 0 && correct === total) return TIER_BY_ID.shrimpion;
  return tierForPoints(points);
}

/** Carry the Surface Exam award onto the summary. Overall points determine the lower tiers. */
export function tierForDive(points, surfaceTier) {
  if (surfaceTier === 'shrimpion') return TIER_BY_ID.shrimpion;
  return tierForPoints((points / MAX_DIVE_POINTS) * ASCENT_MAX[FINAL_ASCENT_INDEX]);
}
