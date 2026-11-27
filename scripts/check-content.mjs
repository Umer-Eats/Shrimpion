// Validates trivia content: run with `npm run check:content`.
import { ALL_TOPICS } from '../src/game/content/index.js';

let problems = 0;
const warn = (msg) => {
  problems++;
  console.log('✗', msg);
};

for (const t of ALL_TOPICS) {
  if (t.facts.length !== 6) warn(`${t.key}: expected 6 facts, got ${t.facts.length}`);
  for (const f of t.facts) {
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

console.log(`${ALL_TOPICS.length} topics, ${ALL_TOPICS.length * 6} facts, ${problems} problem(s).`);
process.exit(problems ? 1 : 0);
