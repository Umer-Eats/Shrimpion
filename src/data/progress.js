// Local progress (works signed-out, saved in localStorage). When signed in, stats and
// in-progress and finished ascents are mirrored to your account in Turso (see data/runSync.js).
import { useSyncExternalStore } from 'react';
import { todayKey, addDays } from '../game/daily.js';
import { tierForAscent } from '../game/tiers.js';

const KEY = 'shrimpion:v1';

export const DEFAULT_STATS = {
  dives: 0, // completed daily ascents (not archive)
  ascents: 0, // every completed ascent, any mode
  streak: 0,
  bestStreak: 0,
  lastDailyDate: null,
  factsLearned: 0,
  correct: 0,
  answered: 0,
  bestDaily: 0,
  shrimpions: 0, // perfect Surface Exams earned under the current rule, plus prior awards
  unlimitedBest: 0,
  unlimitedRuns: 0,
};

const DEFAULT = {
  profile: { username: '', pfp: 'basic' },
  category: 'random',
  stats: { ...DEFAULT_STATS },
  history: {},
  runs: {},
};

let activeUid = null;
let guestAscents;
let accountAscents = {};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return structuredClone(DEFAULT);
    const { accountAscents: savedAccounts = {}, ...progress } = raw;
    accountAscents = savedAccounts;
    return {
      ...structuredClone(DEFAULT),
      ...progress,
      profile: { ...DEFAULT.profile, ...(raw.profile || {}) },
      stats: { ...DEFAULT_STATS, ...(raw.stats || {}) },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

let state = load();
guestAscents = { history: state.history, runs: state.runs };
const listeners = new Set();

function commit(next) {
  state = next;
  const ascents = { history: next.history, runs: next.runs };
  if (activeUid) accountAscents[activeUid] = ascents;
  else guestAscents = ascents;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, ...guestAscents, accountAscents }));
  } catch {
    /* storage full or blocked: keep going in memory */
  }
  listeners.forEach((l) => l());
}

export function getProgress() {
  return state;
}

export function subscribeProgress(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useProgress(selector = (s) => s) {
  return useSyncExternalStore(subscribeProgress, () => selector(state));
}

/** Streak only counts if the last daily ascent was today or yesterday. */
export function liveStreak(stats, today = todayKey()) {
  if (!stats.lastDailyDate) return 0;
  if (stats.lastDailyDate === today || stats.lastDailyDate === addDays(today, -1)) return stats.streak;
  return 0;
}

export const actions = {
  setAscentAccount(uid) {
    if (activeUid === uid) return;
    activeUid = uid;
    if (!uid) {
      commit({ ...state, ...guestAscents });
      return;
    }
    const saved = Object.hasOwn(accountAscents, uid) ? accountAscents[uid] : null;
    const history = { ...guestAscents.history, ...saved?.history };
    const runs = { ...saved?.runs };
    for (const [id, run] of Object.entries(guestAscents.runs)) {
      if ((runs[id]?.updatedAt || 0) < run.updatedAt) runs[id] = run;
    }
    for (const id of Object.keys(history)) delete runs[id];
    guestAscents = { history: {}, runs: {} };
    commit({ ...state, history, runs });
  },
  setCategory(category) {
    commit({ ...state, category });
  },
  setPfp(pfp) {
    commit({ ...state, profile: { ...state.profile, pfp } });
  },
  setUsername(username) {
    commit({ ...state, profile: { ...state.profile, username } });
  },
  saveRun(id, run) {
    commit({ ...state, runs: { ...state.runs, [id]: { ...run, updatedAt: Date.now() } } });
  },
  /** Adopt runs saved to your account when they're newer than this browser's copy. */
  mergeRuns(remote) {
    let changed = false;
    const runs = { ...state.runs };
    for (const { id, data, updatedAt } of remote) {
      if (!data || typeof data !== 'object' || state.history[id]) continue; // already finished here
      if ((runs[id]?.updatedAt || 0) >= updatedAt) continue;
      runs[id] = { ...data, updatedAt, fromServer: true };
      changed = true;
    }
    if (changed) commit({ ...state, runs });
  },
  /** Add finished ascents saved to your account that this browser doesn't have yet. */
  mergeHistory(remote) {
    const history = { ...state.history };
    const runs = { ...state.runs };
    let changed = false;
    for (const rec of remote || []) {
      if (!rec?.id || history[rec.id]) continue;
      history[rec.id] = rec;
      delete runs[rec.id];
      changed = true;
    }
    if (changed) commit({ ...state, history, runs });
  },
  clearRun(id) {
    const runs = { ...state.runs };
    delete runs[id];
    commit({ ...state, runs });
  },
  /** Called after every finished test. */
  recordAscent(result, learned) {
    const { correct, total } = result;
    const s = state.stats;
    commit({
      ...state,
      stats: {
        ...s,
        ascents: s.ascents + 1,
        correct: s.correct + correct,
        answered: s.answered + total,
        factsLearned: s.factsLearned + (learned || 0),
        shrimpions: s.shrimpions + (tierForAscent(result).id === 'shrimpion' ? 1 : 0),
      },
    });
  },
  /** Called when a daily or archive ascent reaches the surface. */
  recordDive(record) {
    if (state.history[record.id]) return false;
    const s = { ...state.stats };
    const today = todayKey();
    let counted = false;
    if (record.mode === 'daily' && record.date === today && s.lastDailyDate !== today) {
      s.streak = s.lastDailyDate === addDays(today, -1) ? s.streak + 1 : 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.lastDailyDate = today;
      counted = true;
    }
    if (record.mode === 'daily' && record.date === today) {
      s.dives += 1;
      s.bestDaily = Math.max(s.bestDaily, record.points);
    }
    commit({ ...state, stats: s, history: { ...state.history, [record.id]: record } });
    return counted;
  },
  recordUnlimited({ points }) {
    const s = state.stats;
    commit({
      ...state,
      stats: { ...s, unlimitedRuns: s.unlimitedRuns + 1, unlimitedBest: Math.max(s.unlimitedBest, points) },
    });
  },
  /** Merge stats from the cloud (keeps the best of both). */
  mergeStats(remote = {}) {
    const merged = mergeStatObjects(state.stats, remote);
    commit({ ...state, stats: merged });
    return merged;
  },
};

export function mergeStatObjects(a = {}, b = {}) {
  const out = { ...DEFAULT_STATS };
  for (const k of Object.keys(DEFAULT_STATS)) {
    if (k === 'lastDailyDate' || k === 'streak') continue;
    out[k] = Math.max(Number(a[k]) || 0, Number(b[k]) || 0);
  }
  const aDate = a.lastDailyDate || '';
  const bDate = b.lastDailyDate || '';
  if (aDate > bDate) {
    out.lastDailyDate = a.lastDailyDate;
    out.streak = a.streak || 0;
  } else if (bDate > aDate) {
    out.lastDailyDate = b.lastDailyDate;
    out.streak = b.streak || 0;
  } else {
    out.lastDailyDate = a.lastDailyDate || b.lastDailyDate || null;
    out.streak = Math.max(a.streak || 0, b.streak || 0);
  }
  return out;
}
