// Firestore reads and writes for profiles, leaderboards (the 7 Seas) and friends.
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './client.js';
import { mergeStatObjects } from '../data/progress.js';

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
export const ONLINE_WINDOW_MS = 2.5 * 60 * 1000;

const userRef = (uid) => doc(db, 'users', uid);

/** Create the user's profile on first sign-in, or merge local progress into it. */
export async function ensureUserDoc(user, local) {
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const stats = mergeStatObjects(data.stats, local.stats);
    await updateDoc(ref, { stats, lastSeen: serverTimestamp() });
    return { id: user.uid, ...data, stats };
  }
  const base = (local.profile.username || user.displayName || 'shrimp').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 10) || 'shrimp';
  let username = null;
  for (let i = 0; i < 8 && !username; i++) {
    const candidate = i === 0 && USERNAME_RE.test(base) ? base : `${base.slice(0, 10)}${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await claimUsername(user.uid, candidate, null);
      username = candidate;
    } catch {
      /* taken: try another */
    }
  }
  const profile = {
    username: username || `shrimp${user.uid.slice(0, 6)}`,
    usernameLower: (username || `shrimp${user.uid.slice(0, 6)}`).toLowerCase(),
    pfp: local.profile.pfp || 'basic',
    stats: mergeStatObjects(local.stats, {}),
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: user.uid, ...profile };
}

/** Reserve a unique username (case-insensitive). Throws if taken. */
export async function claimUsername(uid, desired, previous) {
  if (!USERNAME_RE.test(desired)) throw new Error('Use 3–16 letters, numbers or underscores.');
  const lower = desired.toLowerCase();
  await runTransaction(db, async (tx) => {
    const nameRef = doc(db, 'usernames', lower);
    const taken = await tx.get(nameRef);
    if (taken.exists() && taken.data().uid !== uid) throw new Error('That username is taken.');
    const uref = userRef(uid);
    const usnap = await tx.get(uref);
    tx.set(nameRef, { uid });
    if (previous && previous.toLowerCase() !== lower) tx.delete(doc(db, 'usernames', previous.toLowerCase()));
    if (usnap.exists()) tx.update(uref, { username: desired, usernameLower: lower });
  });
}

export function watchUser(uid, cb) {
  return onSnapshot(userRef(uid), (s) => s.exists() && cb({ id: s.id, ...s.data() }));
}

export function heartbeat(uid) {
  return updateDoc(userRef(uid), { lastSeen: serverTimestamp() }).catch(() => {});
}

export function saveProfileFields(uid, fields) {
  return updateDoc(userRef(uid), fields);
}

export function isOnline(profile) {
  const t = profile?.lastSeen?.toMillis?.();
  return Boolean(t && Date.now() - t < ONLINE_WINDOW_MS);
}

/* ---------- The 7 Seas (leaderboards) ---------- */

const boardId = (date, cat) => `${date}_${cat}`;

export async function submitDailyScore({ uid, username, pfp, date, cat, points, pct }) {
  const ref = doc(db, 'daily', boardId(date, cat), 'scores', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return false; // first attempt only
  await setDoc(ref, { uid, username, pfp, points, pct, at: serverTimestamp() });
  return true;
}

export async function fetchDailyBoard(date, cat, n = 50) {
  const q = query(collection(db, 'daily', boardId(date, cat), 'scores'), orderBy('points', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function submitUnlimited({ uid, username, pfp, points, ascents }) {
  const ref = doc(db, 'unlimited', uid);
  const existing = await getDoc(ref);
  if (existing.exists() && (existing.data().points || 0) >= points) return false;
  await setDoc(ref, { uid, username, pfp, points, ascents, at: serverTimestamp() });
  return true;
}

export async function fetchUnlimitedBoard(n = 50) {
  const q = query(collection(db, 'unlimited'), orderBy('points', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/* ---------- Friends ---------- */

export async function sendFriendRequest(me, username) {
  const lower = username.trim().toLowerCase();
  if (!lower) throw new Error('Type a username.');
  const nameSnap = await getDoc(doc(db, 'usernames', lower));
  if (!nameSnap.exists()) throw new Error('No shrimp by that name.');
  const to = nameSnap.data().uid;
  if (to === me.id) throw new Error('That’s you!');
  const already = await getDoc(doc(db, 'users', me.id, 'friends', to));
  if (already.exists()) throw new Error('You’re already friends.');
  // if they already asked us, accept instead
  const reverse = await getDoc(doc(db, 'friendRequests', `${to}_${me.id}`));
  if (reverse.exists()) {
    await acceptRequest(me.id, { id: reverse.id, ...reverse.data() });
    return 'accepted';
  }
  await setDoc(doc(db, 'friendRequests', `${me.id}_${to}`), {
    from: me.id,
    to,
    fromName: me.username,
    fromPfp: me.pfp || 'basic',
    createdAt: serverTimestamp(),
  });
  return 'sent';
}

export function watchIncomingRequests(uid, cb) {
  const q = query(collection(db, 'friendRequests'), where('to', '==', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function watchOutgoingRequests(uid, cb) {
  const q = query(collection(db, 'friendRequests'), where('from', '==', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function acceptRequest(myUid, req) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', myUid, 'friends', req.from), { since: serverTimestamp() });
  batch.set(doc(db, 'users', req.from, 'friends', myUid), { since: serverTimestamp() });
  batch.delete(doc(db, 'friendRequests', req.id));
  await batch.commit();
}

export function declineRequest(req) {
  return deleteDoc(doc(db, 'friendRequests', req.id));
}

export async function removeFriend(myUid, friendUid) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', myUid, 'friends', friendUid));
  batch.delete(doc(db, 'users', friendUid, 'friends', myUid));
  await batch.commit();
}

/** Live list of friend profiles (with online status). */
export function watchFriends(uid, cb) {
  const profileUnsubs = new Map();
  const profiles = new Map();
  const emit = () => cb([...profiles.values()]);
  const unsub = onSnapshot(collection(db, 'users', uid, 'friends'), (snap) => {
    const ids = new Set(snap.docs.map((d) => d.id));
    for (const [id, u] of profileUnsubs) {
      if (!ids.has(id)) {
        u();
        profileUnsubs.delete(id);
        profiles.delete(id);
      }
    }
    for (const id of ids) {
      if (profileUnsubs.has(id)) continue;
      profileUnsubs.set(
        id,
        onSnapshot(userRef(id), (s) => {
          if (s.exists()) profiles.set(id, { id, ...s.data() });
          emit();
        }),
      );
    }
    emit();
  });
  return () => {
    unsub();
    profileUnsubs.forEach((u) => u());
  };
}
