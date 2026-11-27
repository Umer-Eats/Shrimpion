// Mirrors in-progress ascents (progress.runs) to the signed-in account, so closing the tab
// mid-ascent (or switching devices) resumes where you left off. Newest copy wins.
import { getProgress, subscribeProgress, actions } from './progress.js';
import { fetchRuns, putRun, deleteRun, beaconRun, fetchHistory, putHistory } from '../firebase/api.js';

const DEBOUNCE_MS = 1500;

const clean = (run) => {
  const { fromServer, updatedAt, ...rest } = run;
  return rest;
};

/** Start syncing for the signed-in user. Returns a stop function. */
export function startRunSync() {
  let stopped = false;
  let ready = false;
  let timer = null;
  const synced = new Map(); // run id -> updatedAt last pushed to (or pulled from) the account
  const savedHistory = new Set(); // finished ascents the account already has
  let historyReady = false;

  const pending = () => {
    const runs = getProgress().runs;
    const puts = [];
    for (const [id, run] of Object.entries(runs)) {
      if (!run?.updatedAt || run.fromServer) continue;
      if (synced.get(id) !== run.updatedAt) puts.push([id, run]);
    }
    // gone locally (finished or abandoned) but still on the account
    const dels = [...synced.keys()].filter((id) => !runs[id]);
    return { puts, dels };
  };

  const send = (useBeacon) => {
    clearTimeout(timer);
    timer = null;
    if (stopped || !ready) return;
    const { puts, dels } = pending();
    for (const [id, run] of puts) {
      synced.set(id, run.updatedAt);
      if (useBeacon) beaconRun(id, clean(run), run.updatedAt);
      else putRun(id, clean(run), run.updatedAt).catch(() => synced.delete(id));
    }
    for (const id of dels) {
      synced.delete(id);
      deleteRun(id);
    }
    sendHistory();
  };

  // finished ascents never change, so each one is uploaded once
  const sendHistory = () => {
    if (!historyReady) return;
    const fresh = Object.values(getProgress().history).filter((r) => r?.id && !savedHistory.has(r.id));
    if (!fresh.length) return;
    fresh.forEach((r) => savedHistory.add(r.id));
    putHistory(fresh).catch(() => fresh.forEach((r) => savedHistory.delete(r.id)));
  };

  const schedule = () => {
    if (!ready || stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => send(false), DEBOUNCE_MS);
  };
  // the tab is closing or going to the background: send what's left right now
  const onHidden = () => document.visibilityState === 'hidden' && send(true);
  const onPageHide = () => send(true);

  const unsub = subscribeProgress(schedule);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onHidden);

  // the logbook: pull past ascents from the account, then upload any this browser has that it doesn't
  fetchHistory()
    .then((remote) => {
      if (stopped) return;
      for (const r of remote) if (r?.id) savedHistory.add(r.id);
      actions.mergeHistory(remote);
      historyReady = true;
      sendHistory();
    })
    .catch(() => {});

  // pull first, then start pushing local changes
  fetchRuns()
    .then((remote) => {
      if (stopped) return;
      for (const r of remote) synced.set(r.id, r.updatedAt);
      actions.mergeRuns(remote);
    })
    .catch(() => {})
    .finally(() => {
      if (stopped) return;
      ready = true;
      send(false);
    });

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsub();
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onHidden);
  };
}
