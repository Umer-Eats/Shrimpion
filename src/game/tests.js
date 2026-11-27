import { rngFor, shuffle, pick } from './rng.js';

/** A different way of testing at every ascent. The 7th is always the multiple-choice surface exam. */
export const TEST_TYPES = [
  {
    id: 'match',
    name: 'Tide Match',
    icon: '⇄',
    how: 'Pair each question with its answer. Tap a question, then tap the answer it belongs to.',
  },
  {
    id: 'truefalse',
    name: 'Truth or Tall Tale',
    icon: '◐',
    how: 'Some of these facts were quietly changed. Decide which are true and which are tall tales.',
  },
  {
    id: 'spotfake',
    name: 'Spot the Fake',
    icon: '◎',
    how: 'Each round shows three facts. Two are real. Find the one that was tampered with.',
  },
  {
    id: 'fill',
    name: 'Fill the Gap',
    icon: '▭',
    how: 'A word is missing from each fact. Type it in. Small typos are forgiven.',
  },
  {
    id: 'tiles',
    name: 'Letter Tiles',
    icon: '▦',
    how: 'The answer has been scrambled into tiles. Tap them in order to rebuild it.',
  },
  {
    id: 'reverse',
    name: 'Reverse Reef',
    icon: '⟲',
    how: 'You get the answer. Pick the question it belongs to.',
  },
  {
    id: 'final',
    name: 'The Surface Exam',
    icon: '★',
    how: 'Multiple choice on everything from this ascent. Answer it all to break the surface.',
  },
];

export const TEST_BY_ID = Object.fromEntries(TEST_TYPES.map((t) => [t.id, t]));

export function testTypeForAscent(ascentIdx) {
  return TEST_TYPES[Math.min(ascentIdx, TEST_TYPES.length - 1)];
}

/** Replace the first occurrence of the answer inside a fact sentence. */
export function swapAnswer(fact, replacement) {
  const i = fact.f.indexOf(fact.a);
  if (i < 0) return fact.f;
  return fact.f.slice(0, i) + replacement + fact.f.slice(i + fact.a.length);
}

export function blankAnswer(fact) {
  return swapAnswer(fact, '_____');
}

export function hintFor(answer) {
  return answer
    .split('')
    .map((ch, i) => (i === 0 ? ch : /[a-z0-9]/i.test(ch) ? '•' : ch))
    .join('');
}

/** Build every question for one test. All randomness is seeded so a resumed ascent is identical. */
export function buildTest(typeId, facts, seed) {
  const rng = rngFor(`${seed}|${typeId}`);
  switch (typeId) {
    case 'match':
      return {
        type: typeId,
        left: shuffle(facts, rng).map((f) => ({ id: f.id, text: f.q })),
        right: shuffle(facts, rng).map((f) => ({ id: f.id, text: f.a })),
        facts,
      };

    case 'truefalse': {
      const trueIdx = new Set(shuffle(facts.map((_, i) => i), rng).slice(0, Math.ceil(facts.length / 2)));
      return {
        type: typeId,
        items: shuffle(
          facts.map((f, i) => {
            const isTrue = trueIdx.has(i);
            return { fact: f, isTrue, statement: isTrue ? f.f : swapAnswer(f, pick(f.d, rng)) };
          }),
          rng,
        ),
      };
    }

    case 'spotfake':
      return {
        type: typeId,
        items: shuffle(facts, rng).map((fake) => {
          const others = shuffle(facts.filter((f) => f.id !== fake.id), rng).slice(0, 2);
          const options = shuffle(
            [
              { text: swapAnswer(fake, pick(fake.d, rng)), fake: true, fact: fake },
              ...others.map((o) => ({ text: o.f, fake: false, fact: o })),
            ],
            rng,
          );
          return { fact: fake, options };
        }),
      };

    case 'fill':
      return {
        type: typeId,
        items: shuffle(facts, rng).map((f) => ({ fact: f, text: blankAnswer(f), hint: hintFor(f.a) })),
      };

    case 'tiles':
      return {
        type: typeId,
        items: shuffle(facts, rng).map((f) => {
          const chars = [...f.a];
          const tiles = chars
            .map((ch, i) => ({ id: i, ch }))
            .filter((t) => t.ch !== ' ');
          let scrambled = shuffle(tiles, rng);
          // make sure it actually looks scrambled
          for (let tries = 0; tries < 5 && scrambled.map((t) => t.ch).join('') === tiles.map((t) => t.ch).join('') && tiles.length > 1; tries++) {
            scrambled = shuffle(tiles, rng);
          }
          return { fact: f, tiles: scrambled, layout: chars.map((ch) => (ch === ' ' ? ' ' : '_')) };
        }),
      };

    case 'reverse':
      return {
        type: typeId,
        items: shuffle(facts, rng).map((f) => {
          const others = shuffle(facts.filter((o) => o.id !== f.id), rng).slice(0, 3);
          return { fact: f, options: shuffle([f, ...others], rng).map((o) => ({ id: o.id, text: o.q })) };
        }),
      };

    case 'final':
    case 'mc':
    default:
      return {
        type: 'final',
        items: facts.map((f) => ({ fact: f, options: shuffle([f.a, ...f.d], rng) })),
      };
  }
}
