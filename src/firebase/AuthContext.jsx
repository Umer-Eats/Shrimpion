import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, firebaseReady, googleProvider } from './client.js';
import { ensureUserDoc, watchUser, heartbeat, claimUsername, saveProfileFields } from './api.js';
import { actions, getProgress, subscribeProgress } from '../data/progress.js';
import { todayKey } from '../game/daily.js';
import { startRunSync } from '../data/runSync.js';

const AuthCtx = createContext(null);

const FRIENDLY = {
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/email-already-in-use': 'An account already uses that email. Try logging in.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/invalid-email': 'That email doesn’t look right.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
  'auth/operation-not-allowed': 'This sign-in method isn’t enabled in Firebase yet.',
};
export const friendlyAuthError = (e) => FRIENDLY[e?.code] || e?.message || 'Something went wrong.';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(!firebaseReady);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingPfp, setPendingPfp] = useState(null);
  const profileSession = useRef(null);
  const lastSynced = useRef('');

  useEffect(() => {
    if (!auth) return undefined;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const session = u ? { user: u, setup: ensureUserDoc(u, getProgress()), pfpWrites: Promise.resolve() } : null;
      profileSession.current = session;
      setUser(u);
      setProfile(null);
      setPendingPfp(null);
      if (session) {
        try {
          const p = await session.setup;
          if (profileSession.current !== session) return;
          actions.mergeStats(p.stats);
          if (p.pfp) actions.setPfp(p.pfp);
          if (p.username) actions.setUsername(p.username);
          setProfile(p);
        } catch (e) {
          console.error('Profile setup failed', e);
        }
      }
      if (profileSession.current === session) setReady(true);
    });
    return () => {
      profileSession.current = null;
      unsubscribe();
    };
  }, []);

  // keep in-progress ascents on the account so a closed tab resumes mid-ascent
  useEffect(() => (user ? startRunSync() : undefined), [user]);

  // live profile + presence heartbeat
  useEffect(() => {
    if (!user) return undefined;
    const unsub = watchUser(user.uid, (p) => {
      if (profileSession.current?.user === user) setProfile(p);
    });
    heartbeat(user.uid);
    const id = setInterval(() => heartbeat(user.uid), 60000);
    const onVis = () => document.visibilityState === 'visible' && heartbeat(user.uid);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      unsub();
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user]);

  // mirror local stats to the cloud whenever they change
  useEffect(() => {
    if (!user) return undefined;
    let timer;
    const push = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = getProgress();
        const today = todayKey();
        const todays = Object.values(s.history).filter((h) => h.mode === 'daily' && h.date === today);
        const best = todays.reduce((m, h) => Math.max(m, h.points), 0);
        const payload = { stats: s.stats, today: { date: today, points: best, dives: todays.length } };
        const key = JSON.stringify(payload);
        if (key === lastSynced.current) return;
        lastSynced.current = key;
        saveProfileFields(user.uid, payload).catch(() => {});
      }, 800);
    };
    push();
    const unsub = subscribeProgress(push);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [user]);

  const value = useMemo(
    () => ({
      configured: firebaseReady,
      ready,
      user,
      profile,
      pfp: pendingPfp?.user === user ? pendingPfp.id : profile?.pfp,
      authOpen,
      openAuth: () => setAuthOpen(true),
      closeAuth: () => setAuthOpen(false),
      async signInGoogle() {
        await signInWithPopup(auth, googleProvider);
      },
      async signUpEmail(email, password, username) {
        // set first so the new profile picks it up when the auth listener fires
        if (username) actions.setUsername(username);
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (username) await updateProfile(cred.user, { displayName: username });
      },
      async signInEmail(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async logOut() {
        if (auth) await signOut(auth);
      },
      async changeUsername(name) {
        if (user && profile) {
          await claimUsername(user.uid, name, profile.username);
        }
        actions.setUsername(name);
      },
      async changePfp(id) {
        if (!user) {
          actions.setPfp(id);
          return;
        }
        const session = profileSession.current;
        if (session?.user !== user) return;
        const selection = { user, id };
        session.selection = selection;
        setPendingPfp(selection);

        // Serialize writes so rapid clicks leave the last choice saved on the account.
        const save = session.pfpWrites.then(async () => {
          await session.setup;
          if (profileSession.current !== session || auth.currentUser !== user || session.selection !== selection) return;
          await saveProfileFields(user.uid, { pfp: id });
          if (profileSession.current !== session || auth.currentUser !== user) return;
          setProfile((current) => current && { ...current, pfp: id });
          actions.setPfp(id);
        });
        session.pfpWrites = save.catch(() => {});
        try {
          await save;
        } catch (error) {
          if (profileSession.current === session && session.selection === selection) throw error;
        } finally {
          if (profileSession.current === session && session.selection === selection) setPendingPfp(null);
        }
      },
    }),
    [ready, user, profile, pendingPfp, authOpen],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
