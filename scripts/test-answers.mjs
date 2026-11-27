// Tests for typed-answer autocorrect (src/game/fuzzy.js). Run: npm run test:answers
import { matchAnswer } from '../src/game/fuzzy.js';
import { FACT_BY_ID } from '../src/game/content/index.js';

const facts = Object.values(FACT_BY_ID);
const byAnswer = (a) => facts.find((f) => f.a === a) || { a, d: [] };
let failures = 0;
let checks = 0;

function expect(guess, answer, ok) {
  checks++;
  const fact = typeof answer === 'string' ? byAnswer(answer) : answer;
  const got = matchAnswer(guess, fact).ok;
  if (got !== ok) {
    failures++;
    console.log(`  ✗ "${guess}" for "${fact.a}": expected ${ok ? 'accept' : 'reject'}, got ${got ? 'accept' : 'reject'}`);
  }
}
const yes = (answer, ...guesses) => guesses.forEach((g) => expect(g, answer, true));
const no = (answer, ...guesses) => guesses.forEach((g) => expect(g, answer, false));

// --- formats and number words ---
yes('one-fifth', 'one-fifth', 'one fifth', 'One Fifth', '1/5', 'a fifth', '20%', '20 percent', '0.2', 'onefifth', 'one fith');
no('one-fifth', 'fifth', 'one', '5', '1/4', 'one quarter');
yes('two-thirds', 'two thirds', '2/3', '67%', '66.7%');
no('two-thirds', 'one-third', '1/3', 'one-half');
yes('3', '3', 'three', 'Three', ' 3 ');
no('3', '2', 'four', '33');
yes('7,000', '7000', '7,000', 'seven thousand', '7 thousand');
no('7,000', '700', '70000');
yes('6,000 years', '6000', '6,000 years', 'six thousand years', '6000 yrs');
yes('about 300', '300', 'about 300', 'around 300', 'three hundred');
yes('27th letter', '27th', '27', 'twenty-seventh', 'twenty seventh letter', 'the 27th letter');
yes('every 4 years', '4', 'four years', 'every four years', '4 years');
yes('71%', '71%', '71 percent', '71', 'seventy one percent', '71 per cent');
yes('3.8 cm', '3.8cm', '3.8 centimeters', '3.8 centimetres', '3.8 CM');
// "3.8 mm" is one of the wrong options here, so the unit is what's being tested
no('3.8 cm', '3.8', '3.8 mm', '38 cm', '3.9 cm');
yes('26.2', '26.2', '26.2 miles');
yes('1–0', '1-0', '1 0', 'one nil', '1 to 0', 'one-nothing');
no('1–0', '2-0', '0-2');
yes('11 hours', '11', 'eleven hours', '11 hrs');
yes('Toy Story 2', 'toy story 2', 'Toy Story Two', 'toy stroy 2');
no('Toy Story 2', 'toy story', '2', 'toy story 3');
yes('Jackson 5', 'jackson five', 'the jackson 5', 'Jackson 5');
no('Jackson 5', '5', 'jackson');
yes('London 1908', 'london 1908', '1908 London');
no('London 1908', 'london 1948');

// --- typos, abbreviations, word order, optional words, surnames ---
yes('Neil Armstrong', 'neil armstrong', 'Niel Armstrong', 'neil armstong', 'Armstrong', 'NEIL ARMSTRONG');
no('Neil Armstrong', 'Neil', 'Buzz Aldrin', 'louis');
yes('Mount Everest', 'Mt Everest', 'mt. everest', 'everest', 'mount everest');
yes('Mount Fuji', 'Mt. Fuji', 'fuji');
yes('Vatican City', 'vatican', 'the vatican', 'vatican city');
yes('Hillary and Norgay', 'Hillary & Norgay', 'norgay and hillary', 'hillary and norgay');
no('Hillary and Norgay', 'hillary');
yes('Luxo Jr.', 'luxo jr', 'Luxo Junior', 'luxo');
yes('a goat herder', 'goat herder', 'goatherder', 'a goat herder');
yes('hexagons', 'hexagon', 'hexagons', 'Hexagons');
yes('the Amazon', 'amazon', 'the amazon', 'amazn');
yes('Steven Spielberg', 'spielberg', 'stephen spielberg', 'Steven Speilberg');
yes('Papua New Guinea', 'papua new guinea', 'papua new guniea');
yes('blue', 'blue', 'Blue', 'BLUE', 'its blue');
no('blue', 'green', 'red', 'bl');
yes('mimic octopus', 'mimic octopus', 'mimic octopuses', 'mimik octopus');
no('mimic octopus', 'octopus', 'blue-ringed octopus', 'common octopus');
yes('aluminum dust', 'aluminium dust');
yes('Liechtenstein', 'lichtenstein', 'liechtenstien');

// --- every real answer: accepts itself, rejects each of its wrong options ---
for (const f of facts) {
  expect(f.a, f, true);
  expect(f.a.toUpperCase(), f, true);
  for (const d of f.d) expect(d, f, false);
}

console.log(`${checks - failures}/${checks} checks passed.`);
process.exit(failures ? 1 : 0);
