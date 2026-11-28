// Points & tiers.
// Each ascent is worth more than the one below it. The highest tier requires 95%+ on every section of the dive.

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
    min: 12,
    color: '#ff9f43',
    sprite: 'crab',
    blurb: 'Peeking out of the shell. The light is calling.',
  },
  {
    id: 'seahorse',
    name: 'Seahorse',
    min: 24,
    color: '#ffb347',
    sprite: 'seahorse',
    blurb: 'Holding on with your tail, but facing up.',
  },
  {
    id: 'jelly',
    name: 'Moon Jelly',
    min: 36,
    color: '#bcd7ff',
    sprite: 'jelly',
    blurb: 'Pulsing upward, one gentle beat at a time.',
  },
  {
    id: 'squid',
    name: 'Vampire Squid',
    min: 48,
    color: '#ff5a6e',
    sprite: 'squid',
    blurb: 'Out of the gloom and gaining speed.',
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
    id: 'reef',
    name: 'Reef Fish',
    min: 75,
    color: '#ffcf4a',
    sprite: 'fish',
    blurb: 'Darting through the coral with the rest of the school.',
  },
  {
    id: 'manta',
    name: 'Manta Ray',
    min: 90,
    color: '#7fb3e0',
    sprite: 'manta',
    blurb: 'Wide wings, smooth glide.',
  },
  {
    id: 'puffer',
    name: 'Pufferfish',
    min: 100,
    color: '#ffd84a',
    sprite: 'puffer',
    blurb: 'All puffed up, and you earned it.',
  },
  {
    id: 'eel',
    name: 'Moray Eel',
    min: 110,
    color: '#a8c35a',
    sprite: 'eel',
    blurb: 'Out of the crevice and into open water.',
  },
  {
    id: 'turtle',
    name: 'Sea Turtle',
    min: 120,
    color: '#4ade80',
    sprite: 'turtle',
    blurb: 'A steady climb toward the light.',
  },
  {
    id: 'clown',
    name: 'Clownfish',
    min: 130,
    color: '#ff7a1a',
    sprite: 'clown',
    blurb: 'Safe in the anemone, bright in the shallows.',
  },
  {
    id: 'tang',
    name: 'Blue Tang',
    min: 140,
    color: '#3fa9f5',
    sprite: 'fish',
    blurb: 'Just keep swimming upward.',
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    min: 150,
    color: '#4de3ff',
    sprite: 'dolphin',
    blurb: 'Leaping just below the surface.',
  },
  {
    id: 'barracuda',
    name: 'Barracuda',
    min: 160,
    color: '#c8d6e5',
    sprite: 'fish',
    blurb: 'Fast, sharp and nearly at the top.',
  },
  {
    id: 'shark',
    name: 'Great White',
    min: 170,
    color: '#b8cce0',
    sprite: 'shark',
    blurb: 'Top of the food chain, almost top of the sea.',
  },
  {
    id: 'whale',
    name: 'Humpback Whale',
    min: 185,
    color: '#6aa6ff',
    sprite: 'whale',
    blurb: 'So close to the surface you can hear it sing.',
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

/** Accuracy needed on every section of the dive for One in a Shrimpion. */
export const SHRIMPION_ACCURACY = 0.95;

const sectionPasses = (r) => r && r.total > 0 && r.correct / r.total >= SHRIMPION_ACCURACY;

/**
 * One in a Shrimpion is awarded on the Surface Exam only when every section of the dive
 * (all seven ascents, the Surface Exam included) scored 95% or higher.
 * `sections` is the dive's results; anything outside this result's block is ignored.
 */
export function tierForAscent(result, sections = []) {
  const { ascent, points, block } = result;
  if (ascent === FINAL_ASCENT_INDEX) {
    const byAscent = [];
    for (const r of [...sections, result]) if ((r.block ?? 0) === (block ?? 0)) byAscent[r.ascent] = r;
    let all = true;
    for (let i = 0; i < ASCENTS_PER_DIVE; i++) if (!sectionPasses(byAscent[i])) all = false;
    if (all) return TIER_BY_ID.shrimpion;
  }
  return tierForPoints(points);
}

/** Carry the Surface Exam award onto the summary. Overall points determine the lower tiers. */
export function tierForDive(points, surfaceTier) {
  if (surfaceTier === 'shrimpion') return TIER_BY_ID.shrimpion;
  return tierForPoints((points / MAX_DIVE_POINTS) * ASCENT_MAX[FINAL_ASCENT_INDEX]);
}
