import { rngFor, shuffle } from './rng.js';
import { topicsFor, TOPIC_BY_KEY } from './content/index.js';

export const TOPICS_PER_DIVE = 7;
export const LEARN_ASCENTS = 6; // ascents 1–6 teach; ascent 7 is the surface exam
export const FINAL_BASE_QUESTIONS = 14;

/** The daily ascent: same seven topics for every player on a given day + category. */
export function dailyPlan(date, cat = 'random') {
  const seed = `shrimpion|${date}|${cat}`;
  const rng = rngFor(seed);
  const topics = shuffle(topicsFor(cat), rng)
    .slice(0, TOPICS_PER_DIVE)
    .map((t) => t.key);
  return { id: `daily:${date}:${cat}`, mode: 'daily', date, cat, seed, blocks: [{ topics }] };
}

/** Unlimited: an endless run of 7-ascent blocks. Topics cycle through the whole pool. */
export function unlimitedBlock(runSeed, cat, blockIndex) {
  const pool = topicsFor(cat);
  const out = [];
  let cursor = blockIndex * TOPICS_PER_DIVE;
  while (out.length < TOPICS_PER_DIVE) {
    const cycle = Math.floor(cursor / pool.length);
    const order = shuffle(pool, rngFor(`${runSeed}|cycle|${cycle}`));
    const t = order[cursor % pool.length];
    if (!out.includes(t.key)) out.push(t.key);
    cursor++;
  }
  return { topics: out };
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
