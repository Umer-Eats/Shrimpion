// Ten shrimp profile pictures. You start with the Basic Shrimp; the rest unlock as you learn.

export const PFPS = [
  { id: 'basic', name: 'Basic Shrimp', label: 'Unlocked from the start', goal: () => [1, 1] },
  { id: 'cleaner', name: 'Cleaner Shrimp', label: 'Finish your first ascent', goal: (s) => [s.ascents, 1] },
  { id: 'blue', name: 'Blue Shrimp', label: 'Reach a 3-day streak', goal: (s) => [s.bestStreak, 3] },
  { id: 'ghost', name: 'Ghost Shrimp', label: 'Learn 100 facts', goal: (s) => [s.factsLearned, 100] },
  { id: 'pistol', name: 'Pistol Shrimp', label: 'Complete 5 daily ascents', goal: (s) => [s.dives, 5] },
  { id: 'peppermint', name: 'Peppermint Shrimp', label: 'Reach a 7-day streak', goal: (s) => [s.bestStreak, 7] },
  { id: 'glow', name: 'Glow Shrimp', label: 'Learn 500 facts', goal: (s) => [s.factsLearned, 500] },
  { id: 'mantis', name: 'Mantis Shrimp', label: 'Reach a 14-day streak', goal: (s) => [s.bestStreak, 14] },
  { id: 'golden', name: 'Golden Shrimp', label: 'Earn 10 “One in a Shrimpion” ascents', goal: (s) => [s.shrimpions, 10] },
  { id: 'crowned', name: 'Crowned Shrimpion', label: 'Reach a 30-day streak', goal: (s) => [s.bestStreak, 30] },
];

export const PFP_BY_ID = Object.fromEntries(PFPS.map((p) => [p.id, p]));

export function pfpProgress(pfp, stats) {
  const [cur, goal] = pfp.goal(stats);
  return { cur: Math.min(cur || 0, goal), goal, unlocked: (cur || 0) >= goal };
}

export function isUnlocked(id, stats) {
  const p = PFP_BY_ID[id];
  return p ? pfpProgress(p, stats).unlocked : false;
}
