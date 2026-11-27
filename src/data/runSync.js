// Mirrors in-progress ascents (progress.runs) to the signed-in account, so closing the tab
// mid-ascent (or switching devices) resumes where you left off. Newest copy wins.
import { getProgress, subscribeProgress, actions } from './progress.js';
import { fetchRuns, putRun, deleteRun, beaconRun, fetchHistory, putHistory } from '../firebase/api.js';
import { auth } from '../firebase/client.js';

const DEBOUNCE_MS = 1500;
const HISTORY_RETRY_MS = 15000;
const HISTORY_BATCH_BYTES = 56 * 1024;

const clean = (run) => {
  const { fromServer, updatedAt, ...rest } = run;
  return rest;
};

/** Start syncing for the signed-in user. Returns a stop function. */
export function startRunSync(uid) {
  let stopped = false;
  let ready = false;
  let timer = null;
  const synced = new Map(); // run id -> updatedAt last pushed to (or pulled from) the account
  const savedHistory = new Set(); // finished ascents the account already has
  let historyReady = false;
  let historyBusy = false;
  let historyRetry;
  const isCurrent = () => !stopped && auth.currentUser?.uid === uid;

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
    if (!isCurrent()) return;
    void syncHistory();
    if (!ready) return;
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
  };

  const syncHistory = async () => {
    if (!isCurrent() || historyBusy) return;
    clearTimeout(historyRetry);
    historyBusy = true;
    try {
      if (!historyReady) {
        const remote = await fetchHistory();
        if (!isCurrent()) return;
        for (const record of remote) savedHistory.add(record.id);
        actions.mergeHistory(remote);
        historyReady = true;
      }
      const encoder = new TextEncoder();
      while (isCurrent()) {
        const batch = [];
        let bytes = 0;
        for (const record of Object.values(getProgress().history)) {
          if (savedHistory.has(record.id)) continue;
          const size = encoder.encode(JSON.stringify(record)).length + 1;
          if (batch.length && bytes + size > HISTORY_BATCH_BYTES) break;
          batch.push(record);
          bytes += size;
        }
        if (!batch.length) break;
        await putHistory(batch, bytes <= HISTORY_BATCH_BYTES);
        for (const record of batch) savedHistory.add(record.id);
      }
    } catch {
      if (isCurrent()) historyRetry = setTimeout(syncHistory, HISTORY_RETRY_MS);
    } finally {
      historyBusy = false;
    }
  };

  const schedule = () => {
    if (!isCurrent()) return;
    clearTimeout(timer);
    timer = setTimeout(() => send(false), DEBOUNCE_MS);
  };
  // the tab is closing or going to the background: send what's left right now
  const onHidden = () => document.visibilityState === 'hidden' && send(true);
  const onPageHide = () => send(true);
  const onOnline = () => send(false);

  const unsub = subscribeProgress(schedule);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onHidden);

  // the logbook: pull past ascents from the account, then upload any this browser has that it doesn't
  void syncHistory();

  // pull first, then start pushing local changes
  fetchRuns()
    .then((remote) => {
      if (!isCurrent()) return;
      for (const r of remote) synced.set(r.id, r.updatedAt);
      actions.mergeRuns(remote);
    })
    .catch(() => {})
    .finally(() => {
      if (!isCurrent()) return;
      ready = true;
      send(false);
    });

  return () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(historyRetry);
    unsub();
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onHidden);
  };
}
