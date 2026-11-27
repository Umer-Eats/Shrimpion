// Forgiving answer matching for typed answers ("autocorrect").
//
// A typed guess counts when it means the same thing as the answer, even if it's spelled or
// formatted differently:
//   - typos, scaled to word length          "Niel Armstong"  -> Neil Armstrong
//   - number words, digits and fractions    "1/5", "one fifth", "a fifth", "20%", "0.2" -> one-fifth
//   - ordinals                               "twenty-seventh", "27" -> 27th letter
//   - thousands separators and units         "6000", "six thousand" -> 6,000 years
//   - abbreviations and symbols              "Mt Fuji", "Hillary & Norgay", "Luxo Junior"
//   - word order                             "Norgay and Hillary"
//   - left-out generic words                 "Everest", "Vatican" -> Mount Everest, Vatican City
//   - a surname on its own                   "Spielberg" -> Steven Spielberg
// A guess that matches one of the question's wrong options is never accepted.

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

const UNITS_WORDS = {
  zero: 0, nil: 0, nought: 0, none: 0, nothing: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, dozen: 12,
};
const TENS_WORDS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
const ORDINAL_WORDS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60,
  seventieth: 70, eightieth: 80, ninetieth: 90, hundredth: 100, thousandth: 1000,
};
// denominators spoken as words ("a fifth", "two thirds", "three quarters")
const DENOMS = {
  half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, fourth: 4, fourths: 4,
  fifth: 5, fifths: 5, sixth: 6, sixths: 6, seventh: 7, sevenths: 7, eighth: 8, eighths: 8,
  ninth: 9, ninths: 9, tenth: 10, tenths: 10, hundredth: 100, hundredths: 100,
};

// spelled-out forms mapped to one canonical spelling
const SYNONYMS = {
  mt: 'mount', mnt: 'mount', st: 'saint', ste: 'sainte', jr: 'junior', sr: 'senior', dr: 'doctor',
  vs: 'versus', ft: 'feet', foot: 'feet', '&': 'and', plus: 'and',
  centimeter: 'cm', centimeters: 'cm', centimetre: 'cm', centimetres: 'cm',
  millimeter: 'mm', millimeters: 'mm', millimetre: 'mm', millimetres: 'mm',
  kilometer: 'km', kilometers: 'km', kilometre: 'km', kilometres: 'km',
  meter: 'metre', meters: 'metre', metres: 'metre',
  kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg', gram: 'g', grams: 'g',
  pound: 'lb', pounds: 'lb', lbs: 'lb', mile: 'mile', miles: 'mile', mi: 'mile',
  hr: 'hour', hrs: 'hour', hours: 'hour', min: 'minute', mins: 'minute', minutes: 'minute',
  sec: 'second', secs: 'second', seconds: 'second', yr: 'year', yrs: 'year', years: 'year',
  days: 'day', weeks: 'week', months: 'month', percent: '%', pct: '%', percentage: '%',
  usa: 'united states', us: 'united states', america: 'united states', uk: 'united kingdom', britain: 'united kingdom',
  okay: 'ok', colour: 'color', grey: 'gray', aluminium: 'aluminum', labour: 'labor',
};

// words that carry no meaning in an answer ("about 300", "every 4 years", "it's blue")
const FILLER = new Set(['the', 'a', 'an', 'about', 'around', 'roughly', 'approximately', 'approx', 'nearly', 'almost',
  'circa', 'ca', 'some', 'every', 'each', 'its', 'it', 'is', 'was', 'called', 'just', 'only', 'exactly', 'to']);

// measurement words that may be left off a numeric answer ("11" for "11 hours")
const UNIT_WORDS = new Set(['cm', 'mm', 'km', 'metre', 'kg', 'g', 'lb', 'mile', 'feet', 'inch', 'inches', 'hour', 'minute',
  'second', 'year', 'day', 'week', 'month', '%', 'letter', 'time', 'point', 'goal', 'run', 'degree', 'degrees', 'mph',
  'kmh', 'people', 'person', 'bone', 'heart', 'player', 'meter', 'mark']);

// generic words a name can do without ("Everest", "Vatican", "Sargasso")
const OPTIONAL = new Set(['mount', 'mountain', 'city', 'river', 'lake', 'sea', 'ocean', 'island', 'islands', 'desert',
  'junior', 'senior', 'saint', 'and']);

const NUMBER_VOCAB = [...Object.keys(UNITS_WORDS), ...Object.keys(TENS_WORDS), ...Object.keys(SCALES), ...Object.keys(DENOMS)];
const GLUED_NUMBERS = new RegExp(
  `\\b(a|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)` +
    `(half|halves|thirds?|quarters?|fourths?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?|hundred|thousand|million|one|two|three|four|five|six|seven|eight|nine)\\b`,
  'g',
);

/* ------------------------------------------------------------------ */
/* Text → canonical tokens                                             */
/* ------------------------------------------------------------------ */

function baseClean(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’'`´"“”]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/&/g, ' & ')
    // number words typed together: "onefifth", "twentyone", "afifth"
    .replace(GLUED_NUMBERS, '$1 $2')
    .replace(/(\d),(?=\d{3}\b)/g, '$1') // 7,000 -> 7000
    .replace(/(\d)\s*%/g, '$1 %')
    .replace(/\bper cent\b/g, 'percent')
    .replace(/(\d)(st|nd|rd|th)\b/g, '$1 $2') // 27th -> 27 th
    .replace(/(\d)([a-z])/g, '$1 $2') // 3.8cm -> 3.8 cm
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1/$2')
    .replace(/[^a-z0-9%&./ -]+/g, ' ')
    .replace(/(^|\s)\.|\.(\s|$)/g, ' ') // stray periods, keep decimals
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const num = (v) => ({ kind: 'num', v });
const isNum = (t) => typeof t === 'object';

/** Turn number words into number tokens: "six thousand" -> 6000, "two thirds" -> 2/3, "27 th" -> 27. */
function parseNumbers(words) {
  const out = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i];

    // digits: 3, 3.8, 1/5
    if (/^\d+(\.\d+)?$/.test(w) || /^\d+\/\d+$/.test(w)) {
      let v = w.includes('/') ? Number(w.split('/')[0]) / Number(w.split('/')[1]) : Number(w);
      let j = i + 1;
      if (['st', 'nd', 'rd', 'th'].includes(words[j])) j++; // 27 th
      else if (SCALES[words[j]]) v *= SCALES[words[j++]]; // 1.5 million
      else if (DENOMS[words[j]] && !w.includes('.') && !w.includes('/')) v /= DENOMS[words[j++]]; // 2 thirds
      if (words[j] === '%') {
        out.push({ kind: 'pct', v });
        i = j + 1;
        continue;
      }
      out.push(num(v));
      i = j;
      continue;
    }

    // "a half", "a fifth", "half"
    if ((w === 'a' || w === 'an') && DENOMS[words[i + 1]] && words[i + 1] !== 'second') {
      out.push(num(1 / DENOMS[words[i + 1]]));
      i += 2;
      continue;
    }
    if (w === 'half') {
      out.push(num(0.5));
      i++;
      continue;
    }

    // spelled-out numbers: "twenty seven", "one hundred and five", "six thousand"
    if (UNITS_WORDS[w] !== undefined || TENS_WORDS[w] !== undefined) {
      let total = 0;
      let cur = 0;
      let j = i;
      let used = false;
      let prev = null; // 'unit' | 'tens' | 'scale': "one nil" is two numbers, "twenty one" is one
      while (j < words.length) {
        const x = words[j];
        if (UNITS_WORDS[x] !== undefined) {
          if (prev === 'unit') break;
          cur += UNITS_WORDS[x];
          prev = 'unit';
        } else if (TENS_WORDS[x] !== undefined) {
          if (prev === 'unit' || prev === 'tens') break;
          cur += TENS_WORDS[x];
          prev = 'tens';
        } else if (x === 'hundred' && used) {
          cur = (cur || 1) * 100;
          prev = 'scale';
        } else if (SCALES[x] && used) {
          total += (cur || 1) * SCALES[x];
          cur = 0;
          prev = 'scale';
        } else if (x === 'and' && prev === 'scale' && (UNITS_WORDS[words[j + 1]] !== undefined || TENS_WORDS[words[j + 1]] !== undefined)) {
          /* "one hundred and five" */
        } else break;
        used = true;
        j++;
      }
      let v = total + cur;
      // ordinal ending: "twenty seventh"
      if (ORDINAL_WORDS[words[j]] !== undefined && ORDINAL_WORDS[words[j]] < 10 && TENS_WORDS[words[j - 1]] !== undefined) {
        v += ORDINAL_WORDS[words[j]];
        j++;
      } else if (DENOMS[words[j]] && v > 0 && v < 20) {
        // fraction: "one fifth", "two thirds", "three quarters"
        v /= DENOMS[words[j]];
        j++;
      }
      if (words[j] === '%') {
        out.push({ kind: 'pct', v });
        i = j + 1;
        continue;
      }
      out.push(num(v));
      i = j;
      continue;
    }

    // ordinal words on their own: "first", "twelfth" (but "11 seconds" is a unit, not "2nd")
    if (ORDINAL_WORDS[w] !== undefined && !(w === 'second' && isNum(out[out.length - 1]))) {
      out.push(num(ORDINAL_WORDS[w]));
      i++;
      continue;
    }

    out.push(w);
    i++;
  }
  return out;
}

function singular(w) {
  if (w.length <= 3 || /(ss|us|is)$/.test(w)) return w;
  if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
  if (/(ches|shes|xes|zes|sses)$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}

/** Fix a misspelled number word in a guess ("fith" -> "fifth", "sevn" -> "seven"). */
function fixNumberTypo(w) {
  if (w.length < 4 || NUMBER_VOCAB.includes(w) || /\d/.test(w)) return w;
  const hit = NUMBER_VOCAB.find((v) => Math.abs(v.length - w.length) <= 1 && editDistance(w, v) === 1);
  return hit || w;
}

/** Canonical form: number tokens + canonical words, with fillers dropped. */
export function tokens(s, { fixNumbers = false } = {}) {
  const words = baseClean(s)
    .split(' ')
    .filter(Boolean)
    .map((w) => (fixNumbers ? fixNumberTypo(w) : w))
    .flatMap((w) => (SYNONYMS[w] ? SYNONYMS[w].split(' ') : [w]));
  const all = parseNumbers(words).map((t) => (isNum(t) ? t : singular(SYNONYMS[t] || t)));
  const kept = all.filter((t) => isNum(t) || !FILLER.has(t));
  return kept.length ? kept : all; // an answer that is only a filler word ("the")
}

/* ------------------------------------------------------------------ */
/* Comparing                                                           */
/* ------------------------------------------------------------------ */

/** Damerau–Levenshtein distance (adjacent swaps count as one typo). */
export function editDistance(a, b) {
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (!n) return m;
  if (!m) return n;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)]);
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[n][m];
}

/** How many typos a word of this length may have. */
const allowance = (len) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : 3);

const numValue = (t) => (t.kind === 'pct' ? t.v / 100 : t.v);
function numEqual(a, b) {
  if (a.kind === b.kind) return Math.abs(a.v - b.v) < 1e-9 * Math.max(1, Math.abs(a.v));
  // "71" for "71%"
  if (Math.abs(a.v - b.v) < 1e-9 && a.v >= 1) return true;
  // a percent equals a fraction ("20%" = "one fifth", "67%" ≈ "two thirds"), never a whole count
  const frac = (t) => t.kind === 'pct' || (t.v > 0 && t.v < 1);
  return frac(a) && frac(b) && Math.abs(numValue(a) - numValue(b)) < 0.006;
}

const wordClose = (g, a) => g === a || (!/^\d/.test(a) && editDistance(g, a) <= allowance(a.length));

/**
 * Match every answer word to a guess word (any order). Answer words in `canSkip` may be missing.
 * Extra guess words are only allowed if they're in `extraOk`. Returns the number of typos used, or -1.
 */
function matchWords(guess, answer, { canSkip = () => false, extraOk = () => false } = {}) {
  const left = [...guess];
  let typos = 0;
  for (const a of answer) {
    let best = -1;
    let bestD = Infinity;
    left.forEach((g, k) => {
      if (!wordClose(g, a)) return;
      const d = editDistance(g, a);
      if (d < bestD) (best = k), (bestD = d);
    });
    if (best >= 0) {
      typos += bestD;
      left.splice(best, 1);
    } else if (!canSkip(a)) return -1;
  }
  return left.every(extraOk) ? typos : -1;
}

/**
 * How well a guess matches one answer string. Returns a score (lower is closer) or null for no match.
 * `proper` marks a capitalized multi-word name (so a surname alone is allowed).
 */
function scoreAgainst(guessToks, answerText) {
  const ans = tokens(answerText);
  const aNums = ans.filter(isNum);
  const gNums = guessToks.filter(isNum);
  const aWords = ans.filter((t) => !isNum(t));
  const gWords = guessToks.filter((t) => !isNum(t));

  // numbers must agree exactly (no typo tolerance for numbers)
  if (aNums.length || gNums.length) {
    if (aNums.length !== gNums.length) return null;
    const pool = [...gNums];
    for (const a of aNums) {
      const k = pool.findIndex((g) => numEqual(g, a));
      if (k < 0) return null;
      pool.splice(k, 1);
    }
    // units may be dropped, but a different unit is wrong ("3.8 mm" for "3.8 cm");
    // a unit may be added when the answer names none ("26.2 miles" for "26.2")
    const answerHasUnit = aWords.some((w) => UNIT_WORDS.has(w));
    const typos = matchWords(gWords, aWords, {
      canSkip: (w) => UNIT_WORDS.has(w) || OPTIONAL.has(w),
      extraOk: (w) => !answerHasUnit && UNIT_WORDS.has(w),
    });
    return typos < 0 ? null : typos;
  }

  if (!aWords.length) return gWords.length ? null : 0;

  // whole phrase, ignoring spaces ("goatherder", "deepblue")
  const g = gWords.join('');
  const a = aWords.join('');
  if (g === a) return 0;
  const whole = editDistance(g, a);
  if (whole <= Math.min(3, Math.floor(a.length / 4))) return whole;

  // word by word, any order, generic words optional ("Everest", "Norgay and Hillary")
  const typos = matchWords(gWords, aWords, { canSkip: (w) => OPTIONAL.has(w) });
  if (typos >= 0 && gWords.some((w) => !OPTIONAL.has(w))) return typos + 0.5;

  // a surname on its own for a person's name ("Spielberg", "Armstrong")
  const raw = String(answerText).trim().split(/\s+/);
  const isName = raw.length >= 2 && raw.length <= 3 && raw.every((w) => /^[A-Z]/.test(w)) && aWords.length === raw.length;
  const last = aWords[aWords.length - 1];
  if (isName && gWords.length === 1 && last.length >= 4 && !OPTIONAL.has(last) && wordClose(gWords[0], last)) {
    return editDistance(gWords[0], last) + 1;
  }
  return null;
}

/**
 * Check a typed guess against a fact ({ a, d? , alts? }) or a plain answer string.
 * Returns { ok, corrected } where corrected means it was accepted but typed differently.
 */
export function matchAnswer(guess, fact) {
  const answer = typeof fact === 'string' ? fact : fact.a;
  const alts = typeof fact === 'string' ? [] : fact.alts || [];
  const wrong = typeof fact === 'string' ? [] : fact.d || [];
  if (!baseClean(guess)) return { ok: false, corrected: false };
  // misspelled number words are only fixed when the answer is a number ("one fith")
  const numeric = [answer, ...alts].some((x) => tokens(x).some(isNum));
  const g = tokens(guess, { fixNumbers: numeric });
  if (!g.length) return { ok: false, corrected: false };

  const scores = [answer, ...alts].map((x) => scoreAgainst(g, x)).filter((x) => x !== null);
  if (!scores.length) return { ok: false, corrected: false };
  const best = Math.min(...scores);

  // never accept a guess that is as close (or closer) to one of the wrong options
  for (const w of wrong) {
    const s = scoreAgainst(g, w);
    if (s !== null && s <= best) return { ok: false, corrected: false };
  }

  const typedSame = baseClean(guess) === baseClean(answer);
  return { ok: true, corrected: !typedSame };
}

/** True when a typed guess is close enough to the answer (kept for older callers). */
export function isCloseEnough(guess, answer) {
  return matchAnswer(guess, answer).ok;
}
