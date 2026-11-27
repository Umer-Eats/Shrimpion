// Accuracy tiers. The higher you score, the closer to the surface your creature lives.

export const TIERS = [
  {
    id: 'cucumber',
    name: 'Sea Cucumber',
    min: 0,
    emoji: '🥒',
    color: '#8fa3c4',
    sprite: 'cucumber',
    blurb: 'Still settled in the silt. Every expert started down here.',
  },
  {
    id: 'crab',
    name: 'Hermit Crab',
    min: 40,
    emoji: '🦀',
    color: '#ff9f43',
    sprite: 'crab',
    blurb: 'Peeking out of the shell. The light is calling.',
  },
  {
    id: 'octopus',
    name: 'Octopus',
    min: 55,
    emoji: '🐙',
    color: '#c77dff',
    sprite: 'octopus',
    blurb: 'Eight arms, one growing brain.',
  },
  {
    id: 'turtle',
    name: 'Sea Turtle',
    min: 70,
    emoji: '🐢',
    color: '#4ade80',
    sprite: 'turtle',
    blurb: 'A steady climb toward the light.',
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    min: 85,
    emoji: '🐬',
    color: '#4de3ff',
    sprite: 'dolphin',
    blurb: 'Leaping just below the surface.',
  },
  {
    id: 'shrimpion',
    name: 'One in a Shrimpion',
    min: 100,
    emoji: '🦐',
    color: '#ffd166',
    sprite: 'shrimpGold',
    blurb: 'Flawless. You broke the surface.',
  },
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));

export function tierFor(pct) {
  let best = TIERS[0];
  for (const t of TIERS) if (pct >= t.min - 1e-9) best = t;
  return best;
}

export const POINTS_PER_ASCENT = 100;
export const ASCENTS_PER_DIVE = 7;
export const MAX_DIVE_POINTS = POINTS_PER_ASCENT * ASCENTS_PER_DIVE;

export function pointsFor(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * POINTS_PER_ASCENT);
}
