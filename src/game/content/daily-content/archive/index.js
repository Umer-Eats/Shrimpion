import { addDays, EPOCH } from '../../../daily.js';
import { buildTopicPools } from '../topic-pools.js';
import { WINTER_RESERVE } from '../january/index.js';
import planets from './exoplanets.js';
import quakes from './earthquakes.js';
import movies from './movies.js';
import baseball from './baseball.js';
import soccer from './soccer.js';
import tracks from './tracks.js';
import cities from './cities.js';
import words from './words.js';

// Keep the already-live November 27 ascent and its leaderboard on its original draw.
export const ORIGINAL_DRAW_DATE = '2026-11-27';
const TOPICS_PER_DAY = 7;
const pools = buildTopicPools({ elements: [], planets, quakes, movies, baseball, soccer, tracks, cities, words }, 'archive');
const available = Object.fromEntries(Object.entries(pools).map(([category, pool]) =>
  [category, [...pool, ...WINTER_RESERVE[category]]]));

export const ARCHIVE_CONTENT = {};
for (let date = EPOCH, offset = 0; date < ORIGINAL_DRAW_DATE; date = addDays(date, 1), offset += TOPICS_PER_DAY) {
  ARCHIVE_CONTENT[date] = Object.fromEntries(Object.entries(available).map(([category, pool]) =>
    [category, pool.slice(offset, offset + TOPICS_PER_DAY)]));
}
