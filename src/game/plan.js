import { rngFor, shuffle } from './rng.js';
import { DAILY_TOPICS_BY_DATE, topicsFor, TOPIC_BY_KEY } from './content/index.js';
import { EPOCH, todayKey } from './daily.js';
import { ORIGINAL_DRAW_DATE } from './content/daily-content/archive/index.js';

export const TOPICS_PER_DIVE = 7;
export const LEARN_ASCENTS = 6; // ascents 1–6 teach; ascent 7 is the surface exam
export const FINAL_BASE_QUESTIONS = 14;

// Released ascents keep their original topics and test order in the Archive.
export const LAST_LEGACY_DATE = ORIGINAL_DRAW_DATE;

export function hasDailyPlan(date) {
  return date === ORIGINAL_DRAW_DATE || Object.hasOwn(DAILY_TOPICS_BY_DATE, date);
}

export function originalDailyPlan(date, cat = 'random') {
  if (date < EPOCH || date > ORIGINAL_DRAW_DATE) return null;
  return planFromPool(date, cat, topicsFor(cat));
}

/** The daily ascent: same seven topics for every player on a given day + category. */
export function dailyPlan(date, cat = 'random') {
  if (!hasDailyPlan(date)) return null;
  const scheduled = DAILY_TOPICS_BY_DATE[date];
  // Daily Random draws from the same date's packs, so changing categories can't
  // expose material reserved for a different day.
  const pool = scheduled ? scheduled.filter((t) => cat === 'random' || t.cat === cat) : topicsFor(cat);
  return planFromPool(date, cat, pool);
}

function planFromPool(date, cat, pool) {
  const seed = `shrimpion|${date}|${cat}`;
  const rng = rngFor(seed);
  const topics = shuffle(pool, rng)
    .slice(0, TOPICS_PER_DIVE)
    .map((t) => t.key);
  return { id: `daily:${date}:${cat}`, mode: 'daily', date, cat, seed, blocks: [{ topics }] };
}

/** Shuffle each block, favoring topics that the player hasn't seen in this run. */
export function unlimitedBlock(runSeed, cat, previousBlocks = [], today = todayKey()) {
  const released = Object.entries(DAILY_TOPICS_BY_DATE)
    .filter(([date]) => date <= today)
    .flatMap(([, topics]) => topics.filter((topic) => cat === 'random' || topic.cat === cat));
  const pool = [...topicsFor(cat), ...released];
  const lastSeen = new Map();
  previousBlocks.forEach((block, index) => {
    block.topics.forEach((key) => lastSeen.set(key, index));
  });
  const rng = rngFor(`${runSeed}|block|${previousBlocks.length}`);
  const topics = shuffle(pool, rng)
    .sort((a, b) => (lastSeen.get(a.key) ?? -1) - (lastSeen.get(b.key) ?? -1))
    .slice(0, TOPICS_PER_DIVE)
    .map((topic) => topic.key);
  return { topics: shuffle(topics, rng) };
}

export function topicsOf(block) {
  return block.topics.map((k) => TOPIC_BY_KEY[k]).filter(Boolean);
}

/** The seven facts taught in ascent `ascentIdx` (0–5) of a block: one level deeper each time. */
export function learnFacts(block, ascentIdx) {
  return topicsOf(block).map((t) => t.facts[Math.min(ascentIdx, t.facts.length - 1)]);
}

/**
 * Facts for the 7th-ascent multiple-choice exam.
 * 14 questions from the current block (2 per topic) plus 7 from every earlier block in an unlimited run.
 */
export function finalFacts(blocks, blockIndex, seed) {
  const rng = rngFor(`${seed}|final|${blockIndex}`);
  const current = topicsOf(blocks[blockIndex]).flatMap((t) => shuffle(t.facts, rng).slice(0, 2));
  const earlier = [];
  for (let b = 0; b < blockIndex; b++) {
    for (const t of topicsOf(blocks[b])) earlier.push(shuffle(t.facts, rng)[0]);
  }
  return shuffle([...current, ...earlier], rng);
}

export function finalQuestionCount(blockIndex) {
  return FINAL_BASE_QUESTIONS + TOPICS_PER_DIVE * blockIndex;
}
