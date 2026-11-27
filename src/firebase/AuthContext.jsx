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
  const lastSynced = useRef('');

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await ensureUserDoc(u, getProgress());
          actions.mergeStats(p.stats);
          if (p.pfp) actions.setPfp(p.pfp);
          if (p.username) actions.setUsername(p.username);
          setProfile(p);
        } catch (e) {
          console.error('Profile setup failed', e);
        }
      } else {
        setProfile(null);
      }
      setReady(true);
    });
  }, []);

  // live profile + presence heartbeat
  useEffect(() => {
    if (!user) return undefined;
    const unsub = watchUser(user.uid, setProfile);
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
        actions.setPfp(id);
        if (user) await saveProfileFields(user.uid, { pfp: id });
      },
    }),
    [ready, user, profile, authOpen],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
