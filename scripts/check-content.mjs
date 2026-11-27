// Validates trivia content: run with `npm run check:content`.
import { ALL_TOPICS, CATEGORIES, CATEGORY_PACKS, DAILY_TOPICS_BY_DATE } from '../src/game/content/index.js';
import { DAILY_CONTENT } from '../src/game/content/daily-content/index.js';
import { dailyPlan, LAST_LEGACY_DATE, TOPICS_PER_DIVE } from '../src/game/plan.js';
import { addDays, EPOCH } from '../src/game/daily.js';

let problems = 0;
const warn = (msg) => {
  problems++;
  console.log('✗', msg);
};

const normalize = (text) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const topics = [...ALL_TOPICS, ...Object.values(DAILY_TOPICS_BY_DATE).flat()];
const topicIds = new Set();
const facts = new Map();
const questions = new Map();

for (const t of topics) {
  if (topicIds.has(t.key)) warn(`${t.key}: repeated topic ID`);
  topicIds.add(t.key);
  if (t.facts.length !== 6) warn(`${t.key}: expected 6 facts, got ${t.facts.length}`);
  for (const f of t.facts) {
    for (const [label, text, seen] of [['fact', f.f, facts], ['question', f.q, questions]]) {
      const key = normalize(text);
      if (!key) warn(`${f.id}: empty ${label}`);
      if (seen.has(key)) warn(`${f.id}: ${label} repeats ${seen.get(key)}`);
      seen.set(key, f.id);
    }
    const count = f.f.split(f.a).length - 1;
    if (count !== 1) warn(`${f.id}: answer "${f.a}" appears ${count}x in fact`);
    if (f.d.length !== 3) warn(`${f.id}: needs 3 distractors`);
    for (const d of f.d) {
      if (d.toLowerCase() === f.a.toLowerCase()) warn(`${f.id}: distractor equals answer`);
    }
    if (new Set(f.d.map((d) => d.toLowerCase())).size !== 3) warn(`${f.id}: duplicate distractors`);
    if (f.a.length > 24) warn(`${f.id}: answer longer than 24 chars (${f.a})`);
  }
}

for (const [date, packs] of Object.entries(DAILY_CONTENT)) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const valid = Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  if (!valid || date < EPOCH || date === LAST_LEGACY_DATE) warn(`${date}: invalid scheduled date`);

  const categoryIds = CATEGORY_PACKS.map((category) => category.id);
  for (const id of Object.keys(packs)) {
    if (!categoryIds.includes(id)) warn(`${date}: unknown category ${id}`);
  }
  for (const id of categoryIds) {
    if (packs[id]?.length !== TOPICS_PER_DIVE) warn(`${date}: ${id} needs exactly ${TOPICS_PER_DIVE} topics`);
  }

  const allowed = new Set(DAILY_TOPICS_BY_DATE[date].map((topic) => topic.key));
  for (const { id } of CATEGORIES) {
    const selected = dailyPlan(date, id).blocks[0].topics;
    if (new Set(selected).size !== TOPICS_PER_DIVE || selected.some((topic) => !allowed.has(topic))) {
      warn(`${date}: ${id} needs ${TOPICS_PER_DIVE} distinct topics from this date`);
    }
  }
}

const topicDates = new Map();
const dates = [...Object.keys(DAILY_CONTENT), LAST_LEGACY_DATE].sort();
const end = dates.at(-1);
for (let date = EPOCH; date <= end; date = addDays(date, 1)) {
  for (const { id } of CATEGORIES) {
    const plan = dailyPlan(date, id);
    if (!plan) {
      warn(`${date}: missing ${id} daily plan`);
      continue;
    }
    for (const key of plan.blocks[0].topics) {
      const previousDate = topicDates.get(key);
      if (previousDate && previousDate !== date) warn(`${date}: ${key} already appeared on ${previousDate}`);
      topicDates.set(key, date);
    }
  }
}

console.log(`${topics.length} topics, ${facts.size} distinct facts, ${questions.size} distinct questions, ${dates.length} non-repeating daily ascents, ${problems} problem(s).`);
process.exit(problems ? 1 : 0);
