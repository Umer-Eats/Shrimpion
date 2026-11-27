import classic from './classic.js';
import words from './words.js';
import movies from './movies.js';
import sports from './sports.js';
import geography from './geography.js';
import music from './music.js';

/** The same categories Krillion has today. More are coming. */
export const CATEGORY_PACKS = [classic, words, movies, sports, geography, music];

export const RANDOM_CATEGORY = {
  id: 'random',
  name: 'Daily Random',
  icon: 'icon-dice',
  blurb: 'A mix from every category. Same seven topics for everyone today.',
};

export const CATEGORIES = [RANDOM_CATEGORY, ...CATEGORY_PACKS];
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

/** Every topic, with category info and stable fact ids attached. */
export const ALL_TOPICS = CATEGORY_PACKS.flatMap((cat) =>
  cat.topics.map((t) => ({
    ...t,
    key: `${cat.id}.${t.id}`,
    cat: cat.id,
    catName: cat.name,
    facts: t.facts.map((f, i) => ({
      ...f,
      id: `${cat.id}.${t.id}.${i + 1}`,
      level: i + 1,
      topic: t.name,
      cat: cat.id,
    })),
  })),
);

export const TOPIC_BY_KEY = Object.fromEntries(ALL_TOPICS.map((t) => [t.key, t]));
export const FACT_BY_ID = Object.fromEntries(ALL_TOPICS.flatMap((t) => t.facts.map((f) => [f.id, f])));

export function topicsFor(catId) {
  if (!catId || catId === 'random') return ALL_TOPICS;
  return ALL_TOPICS.filter((t) => t.cat === catId);
}

export function categoryName(id) {
  return CATEGORY_BY_ID[id]?.name ?? 'Daily Random';
}

export const LEVELS = [
  'Common Knowledge',
  'Lesser Known',
  'Curious',
  'Obscure',
  'Niche',
  'Deep Cut',
];
