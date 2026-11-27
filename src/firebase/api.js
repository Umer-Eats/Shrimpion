// Game data lives in Turso, behind the /api/rpc serverless function (server/rpc.js).
// Firebase is only used to sign in; every private call carries the user's Firebase ID token.
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from './client.js';
import { mergeStatObjects } from '../data/progress.js';

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
export const ONLINE_WINDOW_MS = 2.5 * 60 * 1000;
const PROFILE_POLL_MS = 5000;

// Last known token, so a closing tab can still save synchronously.
let cachedToken = null;
if (auth) onIdTokenChanged(auth, async (u) => (cachedToken = u ? await u.getIdToken() : null));

async function rpc(action, args = {}, { signedIn = true, keepalive = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (signedIn) {
    const u = auth?.currentUser;
    if (!u) throw new Error('Sign in first.');
    headers.Authorization = `Bearer ${await u.getIdToken()}`;
  }
  const res = await fetch('/api/rpc', { method: 'POST', headers, keepalive, body: JSON.stringify({ action, ...args }) });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error || 'Couldn’t reach the deep sea right now.');
    err.status = res.status;
    throw err;
  }
  return json.data;
}

/** Refresh visible profile views and ignore reads superseded by a newer refresh. */
function poll(fn, cb, onError = () => {}) {
  let alive = true;
  let revision = 0;
  let loading = false;
  const run = (force = false) => {
    if (!alive || (loading && !force)) return;
    const current = ++revision;
    loading = document.visibilityState !== 'hidden';
    if (!loading) return;
    fn()
      .then((v) => alive && current === revision && cb(v))
      .catch((error) => alive && current === revision && onError(error))
      .finally(() => {
        if (current === revision) loading = false;
      });
  };
  run();
  const id = setInterval(run, PROFILE_POLL_MS);
  const onVis = () => document.visibilityState === 'visible' && run(true);
  document.addEventListener('visibilitychange', onVis);
  const unsub = () => {
    alive = false;
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVis);
  };
  unsub.refresh = () => run(true);
  return unsub;
}

/* ---------- profile ---------- */

/** Create the user's profile on first sign-in, or merge local progress into it. */
export async function ensureUserDoc(user, local) {
  const p = await rpc('me.ensure', {
    username: local.profile.username || user.displayName || '',
    pfp: local.profile.pfp || 'basic',
    stats: mergeStatObjects(local.stats, {}),
  });
  const stats = mergeStatObjects(p.stats, local.stats);
  if (JSON.stringify(stats) !== JSON.stringify(p.stats)) await rpc('me.save', { stats }).catch(() => {});
  return { ...p, stats };
}

/** Reserve a unique username (case-insensitive). Throws if taken. */
export async function claimUsername(_uid, desired) {
  if (!USERNAME_RE.test(desired)) throw new Error('Use 3–16 letters, numbers or underscores.');
  await rpc('me.claimUsername', { username: desired });
  userWatchers.forEach((w) => w.refresh?.());
}

const userWatchers = new Set();
export function watchUser(_uid, cb) {
  const unsub = poll(() => rpc('me.get'), (p) => p && cb(p));
  userWatchers.add(unsub);
  return () => {
    userWatchers.delete(unsub);
    unsub();
  };
}

export function heartbeat() {
  return rpc('me.heartbeat').catch(() => {});
}

export async function saveProfileFields(uid, fields) {
  const result = await rpc('me.save', fields);
  if (fields.pfp !== undefined && auth?.currentUser?.uid === uid) {
    userWatchers.forEach((w) => w.refresh());
  }
  return result;
}

export function isOnline(profile) {
  const t = Number(profile?.lastSeen) || 0;
  return Boolean(t && Date.now() - t < ONLINE_WINDOW_MS);
}

/* ---------- in-progress ascents ---------- */

export const fetchRuns = () => rpc('runs.list');
export const putRun = (id, data, updatedAt) => rpc('runs.put', { id, data, updatedAt });
export const deleteRun = (id) => rpc('runs.delete', { id }).catch(() => {});
export const fetchHistory = () => rpc('history.list');
export const putHistory = (records, keepalive) => rpc('history.put', { records }, { keepalive });

/** Fire-and-forget save that survives the tab closing (keepalive fetch). */
export function beaconRun(id, data, updatedAt) {
  if (!cachedToken || !auth?.currentUser) return;
  try {
    fetch('/api/rpc', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cachedToken}` },
      body: JSON.stringify({ action: 'runs.put', id, data, updatedAt }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/* ---------- The 7 Seas (leaderboards) ---------- */

export function submitDailyScore({ date, cat, points, pct }) {
  return rpc('daily.submit', { date, cat, points, pct });
}

export function fetchDailyBoard(date, cat) {
  return rpc('daily.board', { date, cat }, { signedIn: false });
}

export function submitUnlimited({ points, ascents }) {
  return rpc('unlimited.submit', { points, ascents });
}

export function fetchUnlimitedBoard() {
  return rpc('unlimited.board', {}, { signedIn: false });
}

/** A 7 Seas board ranked by `type` (daily: today, accuracy, week, alltime, friends · unlimited: best, ascents, friends). */
function fetchSeasBoard({ board, type, date }) {
  if (type === 'friends') return rpc('seas.friends', { board, date });
  return rpc('seas.board', { board, type, date }, { signedIn: false });
}

export function watchSeasBoard(params, cb, onError) {
  return poll(() => fetchSeasBoard(params), cb, onError);
}

/* ---------- Friends ---------- */

const friendWatchers = new Set();
const refreshFriends = () => friendWatchers.forEach((w) => w.refresh?.());

export async function sendFriendRequest(_me, username) {
  if (!username.trim()) throw new Error('Type a username.');
  const r = await rpc('friends.request', { username: username.trim() });
  refreshFriends();
  return r;
}

function watchRequests(key, cb) {
  const unsub = poll(() => rpc('friends.requests'), (r) => cb(r[key] || []));
  friendWatchers.add(unsub);
  return () => {
    friendWatchers.delete(unsub);
    unsub();
  };
}
export const watchIncomingRequests = (_uid, cb) => watchRequests('incoming', cb);
export const watchOutgoingRequests = (_uid, cb) => watchRequests('outgoing', cb);

export async function acceptRequest(_myUid, req) {
  await rpc('friends.accept', { from: req.from });
  refreshFriends();
}

export async function declineRequest(req) {
  await rpc('friends.decline', { from: req.from, to: req.to });
  refreshFriends();
}

export async function removeFriend(_myUid, friendUid) {
  await rpc('friends.remove', { fid: friendUid });
  refreshFriends();
}

/** Friend profiles with online status. */
export function watchFriends(_uid, cb) {
  const unsub = poll(() => rpc('friends.list'), cb);
  friendWatchers.add(unsub);
  return () => {
    friendWatchers.delete(unsub);
    unsub();
  };
}
