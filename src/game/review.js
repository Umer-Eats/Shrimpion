import { dailyPlan, finalFacts, learnFacts, LEARN_ASCENTS } from './plan.js';
import { buildTest, testTypeForAscent } from './tests.js';
import { ASCENTS_PER_DIVE } from './tiers.js';

const truthLabel = (value) => value ? 'True' : 'Tall tale';

function reviewQuestion(type, item, given) {
  const { fact } = item;
  switch (type) {
    case 'match':
      return { prompt: item.prompt, correct: fact.a, given: item.choices.find((choice) => choice.id === given)?.text };
    case 'truefalse':
      return {
        prompt: item.statement,
        correct: truthLabel(item.isTrue),
        given: typeof given === 'boolean' ? truthLabel(given) : undefined,
        explanation: item.isTrue ? null : fact.f,
      };
    case 'spotfake':
      return {
        prompt: 'Which of these facts was tampered with?',
        choices: item.options.map((option) => option.text),
        correct: item.options.find((option) => option.fake)?.text,
        given: item.options[given]?.text,
        explanation: fact.f,
      };
    case 'fill':
      return { prompt: item.text, correct: fact.a, given };
    case 'reverse':
      return { prompt: `Which question goes with “${fact.a}”?`, correct: fact.q, given: item.options[given]?.text };
    case 'final':
      return { prompt: fact.q, correct: fact.a, given: item.options[given] };
    default:
      return { prompt: fact.q, correct: fact.a, given };
  }
}

/** Rebuild the tests with the same facts, order, and seeds as the original dive. */
export function buildDiveReview(record) {
  const plan = dailyPlan(record.date, record.cat);
  const seed = record.seed ?? plan?.seed;
  const blocks = record.topics?.length ? [{ topics: record.topics }] : plan?.blocks;
  if (!blocks) return [];
  return Array.from({ length: ASCENTS_PER_DIVE }, (_, ascent) => {
    const result = record.results?.find((entry) => entry.ascent === ascent);
    const type = testTypeForAscent(ascent);
    const facts = ascent < LEARN_ASCENTS ? learnFacts(blocks[0], ascent) : finalFacts(blocks, 0, seed);
    const test = buildTest(type.id, facts, `${seed}|0|${ascent}`);
    const answers = new Map(result?.answers?.map((answer) => [answer.id, answer]));
    const items = test.items ?? test.left.map(({ id, text }) => ({
      fact: test.facts.find((fact) => fact.id === id),
      prompt: text,
      choices: test.right,
    }));
    return {
      type,
      points: result?.points ?? record.perAscent?.[ascent],
      tier: result?.tier ?? record.tiers?.[ascent],
      questions: items.map((item) => {
        const answer = answers.get(item.fact.id);
        return { ...reviewQuestion(type.id, item, answer?.given), ok: answer?.ok };
      }),
    };
  });
}
