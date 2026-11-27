import classic from './2026-11-28-classic.js';
import words from './2026-11-28-words.js';
import movies from './2026-11-28-movies.js';
import sports from './2026-11-28-sports.js';
import geography from './2026-11-28-geography.js';
import music from './2026-11-28-music.js';
import { WINTER_CONTENT } from './january/index.js';
import { ARCHIVE_CONTENT } from './archive/index.js';

// Append new dates with fresh topics. Published packs are used to rebuild Archive reviews.
export const DAILY_CONTENT = {
  ...ARCHIVE_CONTENT,
  '2026-11-28': { classic, words, movies, sports, geography, music },
  ...WINTER_CONTENT,
};
