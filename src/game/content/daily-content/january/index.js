import { addDays } from '../../../daily.js';
import elements from './elements.js';
import planets from './exoplanets.js';
import quakes from './earthquakes.js';
import movies from './movies.js';
import baseball from './baseball.js';
import soccer from './soccer.js';
import tracks from './tracks.js';
import cities from './cities.js';
import words from './words.js';

import { buildTopicPools } from "../topic-pools.js";

const START = '2026-11-29';
const END = '2027-01-01';
const TOPICS_PER_DAY = 7;

const available = buildTopicPools({ elements, planets, quakes, movies, baseball, soccer, tracks, cities, words }, "winter");

export const WINTER_CONTENT = {};
let scheduledCount = 0;
for (let date = START, offset = 0; date <= END; date = addDays(date, 1), offset += TOPICS_PER_DAY) {
  WINTER_CONTENT[date] = Object.fromEntries(Object.entries(available).map(([category, pool]) =>
    [category, pool.slice(offset, offset + TOPICS_PER_DAY)]));
  scheduledCount = offset + TOPICS_PER_DAY;
}

export const WINTER_RESERVE = Object.fromEntries(Object.entries(available).map(([category, pool]) =>
  [category, pool.slice(scheduledCount)]));

