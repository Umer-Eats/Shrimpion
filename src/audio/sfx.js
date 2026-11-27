// Tiny chiptune sound effects, synthesized with the Web Audio API (no audio files to load).
// The AudioContext is created on the first user gesture, as browsers require.
import { useSyncExternalStore } from 'react';

const MUTE_KEY = 'shrimpion:muted';
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set();
let ctx = null;
let master = null;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** One square/triangle blip with a quick pitch slide and decay. */
function tone({ f = 440, to = null, type = 'square', at = 0, dur = 0.08, vol = 0.5 }) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Filtered noise burst (splashes, bubbles). */
function noise({ at = 0, dur = 0.3, vol = 0.35, from = 1800, to = 400 }) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filt = a.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(from, t);
  filt.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(master);
  src.start(t);
}

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI note → Hz

const SOUNDS = {
  tap: () => tone({ f: 660, type: 'square', dur: 0.035, vol: 0.18 }),
  select: () => tone({ f: 520, to: 780, type: 'square', dur: 0.06, vol: 0.25 }),
  flip: () => {
    tone({ f: 300, to: 900, type: 'triangle', dur: 0.07, vol: 0.35 });
    noise({ dur: 0.06, vol: 0.08, from: 4000, to: 2000 });
  },
  tile: () => tone({ f: 880, to: 990, type: 'square', dur: 0.045, vol: 0.22 }),
  undo: () => tone({ f: 600, to: 380, type: 'square', dur: 0.06, vol: 0.2 }),
  pair: () => {
    tone({ f: NOTE(76), type: 'square', dur: 0.06, vol: 0.25 });
    tone({ f: NOTE(83), type: 'square', at: 0.05, dur: 0.08, vol: 0.25 });
  },
  correct: () => {
    tone({ f: NOTE(72), type: 'square', dur: 0.07, vol: 0.3 });
    tone({ f: NOTE(79), type: 'square', at: 0.07, dur: 0.12, vol: 0.3 });
  },
  wrong: () => {
    tone({ f: 220, to: 150, type: 'sawtooth', dur: 0.12, vol: 0.22 });
    tone({ f: 165, to: 110, type: 'sawtooth', at: 0.1, dur: 0.18, vol: 0.22 });
  },
  ascend: () => {
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone({ f: NOTE(n), type: 'square', at: i * 0.07, dur: 0.1, vol: 0.22 }));
    for (let i = 0; i < 6; i++) tone({ f: 500 + Math.random() * 500, to: 1400 + Math.random() * 600, type: 'sine', at: 0.25 + i * 0.18, dur: 0.07, vol: 0.12 });
  },
  descend: () => {
    [79, 74, 71, 67, 62, 55].forEach((n, i) => tone({ f: NOTE(n), type: 'triangle', at: i * 0.08, dur: 0.12, vol: 0.3 }));
    noise({ at: 0.1, dur: 0.6, vol: 0.12, from: 900, to: 200 });
  },
  reveal: () => {
    noise({ dur: 0.5, vol: 0.1, from: 600, to: 2400 });
    [67, 72, 76].forEach((n, i) => tone({ f: NOTE(n), type: 'triangle', at: 0.2 + i * 0.1, dur: 0.18, vol: 0.32 }));
  },
  shrimpion: () => {
    const seq = [72, 76, 79, 84, 79, 84, 88];
    seq.forEach((n, i) => tone({ f: NOTE(n), type: 'square', at: i * 0.09, dur: i === seq.length - 1 ? 0.5 : 0.1, vol: 0.26 }));
    [84, 88, 91].forEach((n) => tone({ f: NOTE(n), type: 'triangle', at: 0.63, dur: 0.6, vol: 0.18 }));
  },
  splash: () => {
    noise({ dur: 0.45, vol: 0.3, from: 2500, to: 300 });
    tone({ f: 900, to: 300, type: 'sine', dur: 0.2, vol: 0.15 });
  },
};

export function play(name) {
  if (muted) return;
  try {
    SOUNDS[name]?.();
  } catch {
    /* audio is best-effort */
  }
}

export function setMuted(v) {
  muted = Boolean(v);
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (!muted) play('select');
  listeners.forEach((l) => l());
}

export function useMuted() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => muted,
  );
}
