import { useEffect, useRef } from 'react';
import { scene } from './sceneStore.js';
import { MARKERS, WATERLINE_V, FLOOR_V, vAtDepth } from './depth.js';
import { drawSprite, spriteSize, spriteCanvas } from '../art/render.js';
import { SPRITES } from '../art/spriteData.js';
import { rngFor } from '../game/rng.js';

// Water color by height in the world: plum-black trench → violet twilight → turquoise lagoon.
const WATER = [
  [-1.2, [1, 0, 3]],
  [0, [4, 1, 9]],
  [1, [9, 3, 18]],
  [2, [16, 6, 32]],
  [3, [26, 10, 50]],
  [4, [34, 22, 72]],
  [5, [30, 48, 96]],
  [6, [28, 96, 128]],
  [7, [40, 150, 160]],
  [WATERLINE_V, [90, 200, 196]],
];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function waterRGB(v) {
  if (v <= WATER[0][0]) return WATER[0][1];
  for (let i = 0; i < WATER.length - 1; i++) {
    const [v0, c0] = WATER[i];
    const [v1, c1] = WATER[i + 1];
    if (v <= v1) {
      const t = (v - v0) / (v1 - v0);
      return c0.map((c, k) => Math.round(c + (c1[k] - c) * t));
    }
  }
  return WATER[WATER.length - 1][1];
}
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Who lives where. [sprite, variant, weight, scale]
const POOLS = [
  { from: -0.25, to: 1.3, density: 12, list: [['amphipod', null, 5, 1], ['snailfish', null, 3, 1], ['jelly', 'deep', 1, 1], ['fish', 'deep', 2, 1], ['squid', 'pale', 1, 1]] },
  { from: 1.3, to: 2.7, density: 11, list: [['dumbo', null, 2, 1], ['snailfish', null, 1, 1], ['fish', 'deep', 3, 1], ['amphipod', null, 2, 1], ['jelly', 'deep', 1, 1], ['angler', null, 1, 1], ['shark', 'deep', 1, 1]] },
  { from: 2.7, to: 4.7, density: 12, list: [['angler', null, 3, 1], ['lantern', null, 4, 1], ['squid', null, 1, 1], ['whale', null, 1, 2], ['jelly', null, 2, 1], ['eel', null, 1, 1], ['fish', 'deep', 2, 1]] },
  { from: 4.7, to: 6.0, density: 12, list: [['lantern', null, 4, 1], ['jelly', null, 2, 1], ['squid', 'pale', 2, 1], ['fish', 'silver', 3, 1], ['shark', 'deep', 1, 1], ['puffer', 'deep', 1, 1]] },
  { from: 6.0, to: 7.35, density: 16, list: [['fish', 'reef', 4, 1], ['fish', 'blue', 4, 1], ['clown', null, 3, 1], ['puffer', null, 1, 1], ['turtle', null, 1, 1], ['manta', null, 1, 1], ['dolphin', null, 1, 1], ['shark', null, 1, 1], ['eel', null, 1, 1], ['jelly', 'moon', 2, 1], ['seahorse', null, 1, 1], ['whale', 'humpback', 1, 2]] },
];

// ---- Side scenery: trench rock in the deep, thinning into reef shelves near the surface ----
// [fill, edge highlight, bevel] — bright enough to read through the deep-water vignette.
const ROCK_DEEP = [[30, 14, 40], [92, 52, 108], [48, 24, 62]];
const ROCK_HIGH = [[58, 44, 84], [130, 104, 160], [82, 64, 112]];
const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));

// Trench walls only exist in the hadal levels; above this the water opens up.
const WALL_TOP = 2.7;

/** Wall thickness (fraction of screen width) at height v. */
function wallProfile(v, seed) {
  if (v >= WALL_TOP) return 0;
  const n = Math.sin(v * 6.1 + seed) * 0.5 + Math.sin(v * 15.3 + seed * 2.3) * 0.3 + Math.sin(v * 37.7 + seed * 4.1) * 0.2;
  const base = 0.12 - v * 0.012;
  const fade = v > 1.9 ? clamp((WALL_TOP - v) / (WALL_TOP - 1.9), 0, 1) : 1;
  return Math.max(0, (base + n * base * 0.45) * Math.sqrt(fade));
}

const CORAL_COLORS = ['#ff5d8f', '#ff9f43', '#ff6b5a', '#c77dff', '#ffd166', '#4de3ff'];

/** Growth types by height: trench, abyss, twilight, reef. */
function growthTypeAt(v, pick) {
  if (v >= 5.8) return pick(['branch', 'branch', 'brain', 'fan', 'anemone', 'anemone', 'star', 'kelp']);
  if (v >= 5.0) return pick(['kelp', 'sponge', 'fan', 'star']);
  if (v >= 2.6) return pick(['sponge', 'crinoid', 'lump', 'glow']);
  return pick(['tube', 'tube', 'glow', 'crinoid', 'lump', 'glow']);
}

/** Pre-baked growth on the trench walls (the walls only exist down in the trench). */
function buildDecor() {
  const rng = rngFor('shrimpion-walls');
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const out = [];
  for (const side of [0, 1]) {
    let v = FLOOR_V + 0.1;
    while (v < WALL_TOP - 0.15) {
      v += 0.03 + rng() * 0.06;
      const type = growthTypeAt(v, pick);
      out.push({ side, v, type, ...makeGrowth(type, rng, pick), phase: rng() * 6 });
    }
  }
  return out;
}

/** Reef mounds and rock outcrops out in open water. x is a fraction of screen width, w/peak in low-res pixels. */
const MOUNDS = [
  // abyss: bare rock outcrops carrying the wrecks
  { v: vAtDepth(3800), x: 0.8, w: 110, peak: 6, wreck: ['wreck', 2, 0.85] }, // the Titanic marker on the ruler
  { v: 4.35, x: 0.25, w: 80, peak: 5, wreck: ['sub', 1, 0.8] },
  // sunlit reef: just three wide, low reefs
  { v: 5.95, x: 0.62, w: 150, peak: 7, wreck: ['anchor', 1, 0.9] },
  { v: 6.4, x: 0.3, w: 170, peak: 8, wreck: ['wreck', 2, 1] },
  { v: 6.9, x: 0.75, w: 140, peak: 7 },
];

function buildMounds() {
  const rng = rngFor('shrimpion-mounds');
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return MOUNDS.map((m) => {
    const half = Math.round(m.w / 2);
    // Column heights: a rounded reef top with sloping skirts on both sides, so it reads as a hill, not a pillar.
    const skirt = Math.round(m.w * 0.3);
    const ext = half + skirt;
    const cols = [];
    for (let dx = -ext; dx <= ext; dx++) {
      const a = Math.abs(dx);
      const hgt = a <= half ? Math.pow(Math.max(0, 1 - (dx / half) ** 2), 0.5) * m.peak : -((a - half) ** 1.15) * 0.6;
      cols.push(Math.round(hgt + (rng() - 0.5) * 2));
    }
    const growth = [];
    const wreckW = m.wreck ? spriteSize(m.wreck[0]).w * m.wreck[1] : 0;
    for (let dx = -half + 3; dx < half - 3; dx += 4 + Math.floor(rng() * 5)) {
      if (m.wreck && Math.abs(dx) < wreckW / 2 + 2) continue; // leave room for the wreck
      const type = growthTypeAt(m.v, pick);
      growth.push({ dx, type, ...makeGrowth(type, rng, pick), phase: rng() * 6 });
    }
    return { ...m, half, ext, cols, growth };
  });
}

/** Pre-baked pixel shape for one piece of growth. dx grows sideways, dy grows up. */
function makeGrowth(type, rng, pick) {
      const px = [];
      const sway = type === 'kelp' || type === 'anemone' || type === 'crinoid';
      if (type === 'branch') {
        const c = pick(CORAL_COLORS);
        const h = 6 + Math.floor(rng() * 7);
        for (let y = 0; y < h; y++) px.push([0, y, c]);
        const nb = 2 + Math.floor(rng() * 3);
        for (let b = 0; b < nb; b++) {
          const at = 1 + Math.floor(rng() * (h - 2));
          const dir = rng() < 0.75 ? 1 : -1;
          const len = 1 + Math.floor(rng() * 3);
          for (let i = 1; i <= len; i++) px.push([i * dir, at, c]);
          const up = 2 + Math.floor(rng() * 3);
          for (let i = 1; i <= up; i++) px.push([len * dir, at + i, c]);
        }
      } else if (type === 'brain') {
        const c1 = pick(['#ffb347', '#ff9fb4', '#a8e063']);
        const r = 3 + Math.floor(rng() * 3);
        for (let x = -1; x <= r * 2; x++)
          for (let y = 0; y <= r; y++) {
            const dx = x - r + 0.5;
            if (dx * dx + (y * 1.6) ** 2 <= r * r) px.push([x, y, (x + y) % 3 === 0 ? '#5a2a3a' : c1]);
          }
      } else if (type === 'fan') {
        const c = pick(['#9b5de5', '#c77dff', '#ff5d8f']);
        const h = 7 + Math.floor(rng() * 6);
        for (let y = 0; y < h; y++) {
          const w = Math.round((y / h) * 6);
          for (let x = 0; x <= w; x++) if (x === 0 || x === w || (x + y) % 2 === 0) px.push([x, y + 1, c]);
        }
      } else if (type === 'anemone') {
        const c = pick(['#ff9fb4', '#ffd166', '#4ff0c8', '#ff7ab8']);
        for (let x = 0; x < 4; x++) px.push([x, 0, '#7a2440'], [x, 1, '#b0405e']);
        for (let x = -1; x < 5; x += 1) {
          const th = 2 + Math.floor(rng() * 3);
          for (let y = 2; y < 2 + th; y++) px.push([x, y, y === 1 + th ? '#fff0f4' : c]);
        }
      } else if (type === 'kelp') {
        const strands = 2 + Math.floor(rng() * 2);
        for (let s = 0; s < strands; s++) {
          const h = 14 + Math.floor(rng() * 26);
          for (let y = 0; y < h; y++) px.push([s * 3, y, y % 5 === 2 ? '#7fd05a' : '#3f8f3a']);
          for (let y = 4; y < h; y += 5) px.push([s * 3 + 1, y, '#6abf4b']);
        }
      } else if (type === 'sponge') {
        const c = pick(['#a86b3a', '#8a4a5a', '#c08a4a']);
        const n = 2 + Math.floor(rng() * 2);
        for (let s = 0; s < n; s++) {
          const h = 4 + Math.floor(rng() * 6);
          for (let y = 0; y < h; y++) px.push([s * 3, y, c], [s * 3 + 1, y, y === h - 1 ? '#2a1418' : c]);
        }
      } else if (type === 'crinoid') {
        const h = 6 + Math.floor(rng() * 6);
        for (let y = 0; y < h; y++) px.push([0, y, '#c9b88f']);
        for (const [dx, dy] of [[-2, 1], [-1, 1], [1, 1], [2, 1], [-2, 2], [2, 2], [-1, 0], [1, 0], [-3, 3], [3, 3]]) px.push([dx, h + dy, '#f0d8b8']);
      } else if (type === 'tube') {
        const n = 3 + Math.floor(rng() * 3);
        for (let s = 0; s < n; s++) {
          const h = 3 + Math.floor(rng() * 6);
          for (let y = 0; y < h; y++) px.push([s * 2, y, '#d8d2c4']);
          px.push([s * 2, h, '#ff3b4f'], [s * 2 + 1, h, '#ff3b4f']);
        }
      } else if (type === 'lump') {
        const r = 2 + Math.floor(rng() * 4);
        for (let x = -r; x <= r; x++) for (let y = 0; y <= r; y++) if (x * x + (y * 1.4) ** 2 <= r * r) px.push([x + r, y, y === r || x === -r ? '#3a2a46' : '#1a0f22']);
      } else if (type === 'glow') {
        const n = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < n; i++) px.push([Math.floor(rng() * 6), Math.floor(rng() * 8), pick(['#7cf6ff', '#c77dff', '#4ff0c8'])]);
      }
  return { px, sway };
}

function buildWorld() {
  const rng = rngFor('shrimpion-world');
  const out = [];
  for (const pool of POOLS) {
    const total = pool.list.reduce((s, e) => s + e[2], 0);
    const n = Math.round((pool.to - pool.from) * pool.density);
    for (let i = 0; i < n; i++) {
      let r = rng() * total;
      let entry = pool.list[0];
      for (const e of pool.list) {
        r -= e[2];
        if (r <= 0) {
          entry = e;
          break;
        }
      }
      const [name, variant, , scale] = entry;
      const school = (name === 'fish' || name === 'clown') && rng() < 0.55 ? 3 + Math.floor(rng() * 4) : 1;
      const base = {
        name,
        variant,
        scale,
        v: pool.from + rng() * (pool.to - pool.from),
        x: rng(),
        dir: rng() < 0.5 ? -1 : 1,
        speed: name === 'whale' ? 5 : name === 'jelly' || name === 'dumbo' ? 2 + rng() * 2 : 6 + rng() * 10,
        phase: rng() * 10,
        bob: name === 'jelly' || name === 'dumbo' ? 3 : 1 + rng(),
        layer: rng() < 0.35 ? 0.55 : 1, // far creatures are fainter
      };
      for (let s = 0; s < school; s++) {
        out.push({ ...base, x: base.x + s * 0.025 * -base.dir, v: base.v + (rng() - 0.5) * 0.05, phase: base.phase + s });
      }
    }
  }
  return out;
}

function buildFloor(lw, lh) {
  const rng = rngFor('shrimpion-floor');
  const a = rng() * 10;
  const b = rng() * 10;
  const c = rng() * 10;
  const h = new Array(lw);
  for (let x = 0; x < lw; x++) {
    const n = Math.sin(x * 0.07 + a) * 4 + Math.sin(x * 0.023 + b) * 7 + Math.sin(x * 0.17 + c) * 1.5;
    const edgeDist = Math.min(x, lw - x) / (lw * 0.2);
    const wall = Math.pow(Math.max(0, 1 - edgeDist), 2) * lh * 0.5;
    h[x] = 12 + n + wall;
  }
  return h;
}

function buildSnow(lw, lh, n) {
  const rng = rngFor('snow');
  return Array.from({ length: n }, () => ({
    x: rng() * lw,
    y: rng() * lh,
    spd: 1.5 + rng() * 4,
    a: 0.15 + rng() * 0.35,
    drift: rng() * 6,
  }));
}

const CLOUDS = [
  { x: 0.1, y: 0.3, w: 26 },
  { x: 0.45, y: 0.55, w: 18 },
  { x: 0.7, y: 0.2, w: 30 },
  { x: 0.92, y: 0.5, w: 16 },
];

export default function OceanScene() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    // Two low-res layers: background (water, reefs) and foreground (rock, sky, effects); creatures and the
    // shrimp are drawn between them at full resolution so they move smoothly.
    const bg = document.createElement('canvas');
    const bgc = bg.getContext('2d');
    const fg = document.createElement('canvas');
    const fgc = fg.getContext('2d');
    const vignette = document.createElement('canvas');
    let lc = bgc;
    const world = buildWorld();
    const decor = buildDecor();
    const mounds = buildMounds();
    let W, H, PIX, lw, lh, floor, snow;
    let dpr = 1;
    const bubbles = [];
    const sparkles = [];
    let bubbleTimer = 0;
    let raf;
    let last = performance.now();

    function resize() {
      // A hidden or collapsing pane can report 0×0; keep a sane minimum so the floor never empties.
      W = Math.max(64, window.innerWidth);
      H = Math.max(64, window.innerHeight);
      PIX = W < 700 ? 2 : 3;
      // Back the canvas with real device pixels so the browser never stretches (and blurs) it.
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      lw = Math.ceil(W / PIX);
      lh = Math.ceil(H / PIX);
      for (const c of [bg, fg]) {
        c.width = lw;
        c.height = lh + 2; // a spare row above and below for sub-pixel scrolling
      }
      // Resizing a canvas resets its context state, so re-disable smoothing every time.
      bgc.imageSmoothingEnabled = false;
      fgc.imageSmoothingEnabled = false;
      // The vignette only changes on resize; its strength is applied with globalAlpha each frame.
      vignette.width = lw;
      vignette.height = lh;
      const vc = vignette.getContext('2d');
      const vg = vc.createRadialGradient(lw / 2, lh / 2, Math.min(lw, lh) * 0.3, lw / 2, lh / 2, Math.max(lw, lh) * 0.75);
      vg.addColorStop(0, 'rgba(10,0,12,0)');
      vg.addColorStop(1, 'rgba(10,0,12,1)');
      vc.fillStyle = vg;
      vc.fillRect(0, 0, lw, lh);
      ctx.imageSmoothingEnabled = false;
      floor = buildFloor(lw, lh);
      snow = buildSnow(lw, lh, Math.round((lw * lh) / 900));
    }
    resize();
    window.addEventListener('resize', resize);

    function drawRays(t, light, waterY) {
      lc.save();
      lc.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = (i / 6) * lw + Math.sin(t * 0.3 + i) * 12 + lw * 0.05;
        const w = 10 + (i % 3) * 7;
        const top = Math.max(0, waterY);
        const g = lc.createLinearGradient(0, top, 0, top + lh * 0.9);
        g.addColorStop(0, `rgba(200,255,240,${0.12 * light})`);
        g.addColorStop(1, 'rgba(200,255,240,0)');
        lc.fillStyle = g;
        lc.beginPath();
        lc.moveTo(x, top);
        lc.lineTo(x + w, top);
        lc.lineTo(x + w + 40, top + lh * 0.9);
        lc.lineTo(x + 25, top + lh * 0.9);
        lc.closePath();
        lc.fill();
      }
      lc.restore();
    }

    function drawFloor(floorY, t) {
      // rock
      for (let x = 0; x < lw; x++) {
        const top = Math.round(floorY - floor[x]);
        if (top > lh) continue;
        lc.fillStyle = '#08030b';
        lc.fillRect(x, top, 1, lh - top + 2);
        lc.fillStyle = '#1f0f26';
        lc.fillRect(x, top, 1, 1);
        if (x % 7 === 0) {
          lc.fillStyle = '#150a1a';
          lc.fillRect(x, top + 3, 2, 1);
        }
      }
      const ground = (fx) => Math.round(floorY - floor[Math.min(lw - 1, Math.max(0, Math.round(fx * lw)))]);

      // hydrothermal vent with tube worms
      const vx = Math.round(lw * 0.7);
      const vy = ground(0.7);
      lc.fillStyle = '#120914';
      lc.fillRect(vx - 3, vy - 14, 7, 15);
      lc.fillRect(vx - 5, vy - 6, 11, 7);
      lc.fillStyle = '#2a1636';
      lc.fillRect(vx - 3, vy - 14, 7, 1);
      for (let i = 0; i < 16; i++) {
        const life = ((t * 9 + i * 7) % 70) / 70;
        const py = vy - 15 - life * 70;
        const px = vx + Math.sin(t * 1.5 + i) * (2 + life * 8);
        lc.fillStyle = `rgba(20,24,34,${0.75 * (1 - life)})`;
        const s = 2 + Math.round(life * 6);
        lc.fillRect(Math.round(px - s / 2), Math.round(py), s, s);
      }
      lc.save();
      lc.globalCompositeOperation = 'lighter';
      const vg = lc.createRadialGradient(vx, vy - 12, 0, vx, vy - 12, 16);
      vg.addColorStop(0, 'rgba(255,120,60,0.25)');
      vg.addColorStop(1, 'rgba(255,120,60,0)');
      lc.fillStyle = vg;
      lc.fillRect(vx - 16, vy - 28, 32, 32);
      lc.restore();
      const worms = [-14, -11, -9, 9, 12, 15, 18];
      worms.forEach((dx, i) => {
        const hgt = 6 + ((i * 5) % 5) + Math.round(Math.sin(t * 2 + i) * 0.6);
        const wy = ground((vx + dx) / lw);
        lc.fillStyle = '#d8d2c4';
        lc.fillRect(vx + dx, wy - hgt, 1, hgt);
        lc.fillStyle = '#ff3b4f';
        lc.fillRect(vx + dx - 1, wy - hgt - 2, 3, 2);
      });

      // floor dwellers
      drawSprite(lc, 'cucumber', lw * 0.3, ground(0.3) - 5, { scale: 1 });
      drawSprite(lc, 'cucumber', lw * 0.52, ground(0.52) - 5, { scale: 1, flip: true });
      drawSprite(lc, 'tripod', lw * 0.85, ground(0.85) - 8, { scale: 1 });
      drawSprite(lc, 'tripod', lw * 0.42, ground(0.42) - 8, { scale: 1, flip: true, alpha: 0.7 });
    }

    // Rock colors by height, cached so the per-row loop never builds color strings.
    const rockCache = new Map();
    function rockAt(v) {
      const key = Math.round(clamp(v / 7, 0, 1) * 64);
      let c = rockCache.get(key);
      if (!c) {
        const tv = key / 64;
        c = ROCK_DEEP.map((col, i) => rgb(mix(col, ROCK_HIGH[i], tv)));
        rockCache.set(key, c);
      }
      return c; // [fill, edge, bevel]
    }

    function drawGrowth(d, x, by, t) {
      if (d.type === 'star') {
        drawSprite(lc, 'starfish', x - 2, by - 4, { scale: 1 });
        return;
      }
      const glow = d.type === 'glow';
      if (glow) {
        lc.save();
        lc.globalCompositeOperation = 'lighter';
        lc.globalAlpha = 0.45 + 0.45 * Math.sin(t * 1.7 + d.phase);
      }
      const dir = d.dir || 1;
      for (const [dx, dy, c] of d.px) {
        const s = d.sway ? Math.round(Math.sin(t * 1.3 + d.phase + dy * 0.18) * dy * 0.08) : 0;
        lc.fillStyle = c;
        lc.fillRect(x + (dx + s) * dir, by - dy, 1, 1);
      }
      if (glow) lc.restore();
    }

    function drawWalls(t, cam, unit, sy, yOf) {
      // Nothing to draw once the trench is off screen.
      if (yOf(WALL_TOP) > lh) return;
      const sw = W < 700 ? 0.55 : 1;
      const wallL = (v) => Math.round(wallProfile(v, 1.7) * lw * sw);
      const wallR = (v) => Math.round(wallProfile(v, 4.2) * lw * sw * 0.8);
      // Row by row in world coordinates, so the rock texture stays pixel-stable while the camera moves.
      const off = Math.round(cam * unit + sy);
      const yStart = Math.max(0, Math.floor(yOf(WALL_TOP)));
      for (let y = yStart; y < lh; y++) {
        const k = off - y;
        const v = k / unit;
        if (v < FLOOR_V - 0.6) break;
        const l = wallL(v);
        const r = wallR(v);
        if (l <= 0 && r <= 0) continue;
        const [fill, edge, bevel] = rockAt(v);
        const h = Math.imul(k, 2654435761) >>> 0;
        if (l > 0) {
          lc.fillStyle = fill;
          lc.fillRect(0, y, l, 1);
          lc.fillStyle = bevel;
          lc.fillRect(Math.max(0, l - 4), y, 3, 1);
          if (h % 4 === 0) lc.fillRect(h % l, y, 3, 1);
          lc.fillStyle = edge;
          lc.fillRect(l - 1, y, 1, 1);
          if (h % 23 === 0) lc.fillRect((h >>> 7) % l, y, 1, 1);
        }
        if (r > 0) {
          lc.fillStyle = fill;
          lc.fillRect(lw - r, y, r, 1);
          lc.fillStyle = bevel;
          lc.fillRect(lw - r + 1, y, Math.min(3, r), 1);
          if ((h >>> 3) % 4 === 0) lc.fillRect(lw - 1 - ((h >>> 5) % r), y, 3, 1);
          lc.fillStyle = edge;
          lc.fillRect(lw - r, y, 1, 1);
          if ((h >>> 2) % 23 === 0) lc.fillRect(lw - 1 - ((h >>> 9) % r), y, 1, 1);
        }
      }

      // Tube worms, crinoids and glow on the trench walls.
      for (const d of decor) {
        const by = Math.round(yOf(d.v));
        if (by < -50 || by > lh + 10) continue;
        const edgeX = d.side === 0 ? wallL(d.v) - 1 : lw - wallR(d.v);
        if (d.side === 0 ? edgeX < 2 : edgeX > lw - 3) continue;
        d.dir = d.side === 0 ? 1 : -1;
        drawGrowth(d, edgeX, by, t);
      }
    }

    /** Reef mounds and rock outcrops in open water, with wrecks resting on some of them. */
    function drawMounds(t, yOf, light) {
      const sc = W < 700 ? 0.7 : 1;
      for (const m of mounds) {
        const top = Math.round(yOf(m.v));
        const depth = Math.round(30 * sc);
        if (top - 60 > lh || top + depth < 0) continue;
        const cx = Math.round(m.x * lw);
        const [fill, edge, bevel] = rockAt(m.v);
        // The hill fades into the water below, so it reads as the top of a seamount far beneath.
        const g = lc.createLinearGradient(0, top - m.peak, 0, top + depth);
        g.addColorStop(0, fill);
        g.addColorStop(0.4, fill);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        const half = Math.round(m.half * sc);
        const ext = Math.round(m.ext * sc);
        const colAt = (i) => m.cols[Math.round(((i + ext) / (2 * ext)) * (m.cols.length - 1))] * sc;
        for (let i = -ext; i <= ext; i++) {
          const ch = colAt(i);
          const y0 = Math.round(top - ch);
          if (y0 >= top + depth) continue;
          lc.fillStyle = g;
          lc.fillRect(cx + i, y0, 1, top + depth - y0);
          lc.fillStyle = Math.abs(i) > half ? bevel : edge;
          lc.fillRect(cx + i, y0, 1, 1);
          if ((i * 7 + m.half) % 9 === 0) {
            lc.fillStyle = bevel;
            lc.fillRect(cx + i, y0 + 3 + ((i * 13) & 7), 2, 1);
          }
        }
        const colTop = (dx) => Math.round(top - colAt(clamp(Math.round(dx * sc), -ext, ext)));
        for (const d of m.growth) drawGrowth(d, cx + Math.round(d.dx * sc), colTop(d.dx) + 1, t);
        if (m.wreck) {
          const [name, scale, alpha] = m.wreck;
          const { w, h } = spriteSize(name);
          const tv = clamp(m.v / 7, 0, 1);
          drawSprite(lc, name, cx - Math.round((w * scale) / 2), colTop(0) - h * scale + 3, {
            scale,
            flip: m.x > 0.5,
            alpha: alpha * (0.55 + 0.45 * Math.max(light, tv)),
          });
        }
      }
    }

    function drawSky(waterY, t) {
      const g = lc.createLinearGradient(0, waterY - lh * 0.7, 0, waterY);
      g.addColorStop(0, '#ff9fcf');
      g.addColorStop(1, '#ffe3f1');
      for (let x = 0; x < lw; x++) {
        const wy = Math.round(waterY + Math.sin(x * 0.12 + t * 1.8) * 1.2 + Math.sin(x * 0.045 - t) * 1);
        if (wy <= 0) continue;
        lc.fillStyle = g;
        lc.fillRect(x, 0, 1, wy);
        lc.fillStyle = '#e8f8ff';
        lc.fillRect(x, wy, 1, 1);
        lc.fillStyle = 'rgba(232,248,255,0.35)';
        lc.fillRect(x, wy + 1, 1, 1);
      }
      // sun
      const sx = Math.round(lw * 0.8);
      const sy = Math.round(waterY - lh * 0.42);
      if (sy > -20) {
        lc.fillStyle = 'rgba(255,240,180,0.35)';
        lc.beginPath();
        lc.arc(sx, sy, 17, 0, Math.PI * 2);
        lc.fill();
        lc.fillStyle = '#ffe28a';
        for (let y = -11; y <= 11; y++) {
          const half = Math.floor(Math.sqrt(121 - y * y));
          lc.fillRect(sx - half, sy + y, half * 2 + 1, 1);
        }
      }
      // clouds
      CLOUDS.forEach((c, i) => {
        const cx = Math.round(((c.x * lw + t * (2 + i)) % (lw + 60)) - 30);
        const cy = Math.round(waterY - lh * 0.15 - c.y * lh * 0.4);
        if (cy > waterY - 4) return;
        lc.fillStyle = '#ffffff';
        lc.fillRect(cx, cy, c.w, 4);
        lc.fillRect(cx + 4, cy - 3, c.w - 10, 3);
        lc.fillRect(cx + 9, cy - 6, Math.max(4, c.w - 20), 3);
        lc.fillStyle = '#ffe6f2';
        lc.fillRect(cx, cy + 3, c.w, 1);
      });
    }

    // Soft glows, pre-rendered once per color instead of building a gradient for every creature every frame.
    const glowCache = new Map();
    function glowCanvas(color, r) {
      const key = `${color}|${r}`;
      let c = glowCache.get(key);
      if (!c) {
        c = document.createElement('canvas');
        c.width = c.height = r * 2;
        const g = c.getContext('2d');
        const rg = g.createRadialGradient(r, r, 0, r, r, r);
        // Hex colors get a soft 40% core; rgba() colors carry their own alpha.
        const hex = color.startsWith('#');
        rg.addColorStop(0, hex ? color + '66' : color);
        rg.addColorStop(1, hex ? color + '00' : color.replace(/[\d.]+\)$/, '0)'));
        g.fillStyle = rg;
        g.fillRect(0, 0, r * 2, r * 2);
        glowCache.set(key, c);
      }
      return c;
    }

    /** Draws a sprite on the full-resolution canvas at a fractional low-res position, so motion is smooth. */
    function drawHi(name, x, y, { scale = 1, variant = null, flip = false, alpha = 1, rotate = 0 } = {}) {
      const cv = spriteCanvas(name, { variant, flip });
      const k = PIX;
      const w = cv.width * scale * k;
      const h = cv.height * scale * k;
      // Snap to device pixels: crisp edges, but steps of one device pixel instead of one art pixel.
      const sx = Math.round(x * k * dpr) / dpr;
      const sy = Math.round(y * k * dpr) / dpr;
      ctx.globalAlpha = alpha;
      if (rotate) {
        ctx.save();
        ctx.translate(sx + w / 2, sy + h / 2);
        ctx.rotate(rotate);
        ctx.drawImage(cv, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(cv, sx, sy, w, h);
      }
      ctx.globalAlpha = 1;
    }

    function drawGlowHi(color, cx, cy, r, alpha) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = true;
      const k = PIX;
      ctx.drawImage(glowCanvas(color, r), (cx - r) * k, (cy - r) * k, r * 2 * k, r * 2 * k);
      ctx.restore();
    }

    /** Blits a low-res layer (one spare row above and below) to the screen, shifted by a sub-pixel amount. */
    function blit(layer, shift) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(layer, 0, Math.round((shift - 1) * PIX * dpr) / dpr, lw * PIX, (lh + 2) * PIX);
    }

    function useLayer(c) {
      lc = c;
      lc.setTransform(1, 0, 0, 1, 0, 1); // row -1 is the spare row above the screen
    }

    function draw(t, dt, vel) {
      const cam = scene.camV;
      const sy = Math.round(lh * 0.6);
      const unit = lh * 0.95;
      // Low-res layers render at a whole-row camera and are shifted by the leftover fraction when blitted,
      // so scrolling is smooth while the pixel art stays on its grid.
      const camRow = cam * unit;
      const frac = camRow - Math.round(camRow);
      const camQ = Math.round(camRow) / unit;
      const yOf = (v) => sy - (v - cam) * unit; // exact (full-res drawing, ruler)
      const yOfQ = (v) => sy - (v - camQ) * unit; // whole rows (low-res layers)
      const vOf = (y) => camQ + (sy - y) / unit;
      const light = clamp((cam - 4.3) / 3, 0, 1);
      const deep = 1 - clamp(cam / 5.5, 0, 1);
      const waterY = yOf(WATERLINE_V);
      const waterYQ = yOfQ(WATERLINE_V);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. background: water, light rays, reef mounds
      useLayer(bgc);
      const g = lc.createLinearGradient(0, -1, 0, lh + 1);
      for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, rgb(waterRGB(vOf((i / 8) * (lh + 2) - 1))));
      lc.fillStyle = g;
      lc.fillRect(0, -1, lw, lh + 2);
      if (light > 0.01) drawRays(t, light, waterYQ);
      drawMounds(t, yOfQ, light);
      blit(bg, frac);

      // 2. creatures, full resolution
      for (const e of world) {
        e.x += (e.dir * e.speed * dt) / lw;
        if (e.x > 1.2) e.x = -0.2;
        if (e.x < -0.2) e.x = 1.2;
        const py = yOf(e.v) + Math.sin(t * 0.9 + e.phase) * e.bob;
        if (py < -50 || py > lh + 50) continue;
        const { w, h } = spriteSize(e.name);
        const px = e.x * lw;
        drawHi(e.name, px, py - (h * e.scale) / 2, { scale: e.scale, variant: e.variant, flip: e.dir > 0, alpha: e.layer });
        const glow = SPRITES[e.name].glow;
        if (glow && deep > 0.15) {
          const gx = e.name === 'angler' ? (e.dir > 0 ? px + w - 1 : px) : px + (w * e.scale) / 2;
          const gy = e.name === 'angler' ? py - (h * e.scale) / 2 : py;
          drawGlowHi(glow, gx, gy, 12, Math.min(1, deep * 1.3) * e.layer);
        }
      }

      // 3. foreground rock: trench walls, floor, sky
      useLayer(fgc);
      lc.clearRect(0, -1, lw, lh + 2);
      drawWalls(t, camQ, unit, sy, yOfQ);
      const floorY = yOfQ(FLOOR_V);
      if (floorY - 120 < lh) drawFloor(floorY, t);
      if (waterYQ > -4) drawSky(waterYQ, t);
      blit(fg, frac);

      // 4. the shrimp, full resolution
      const swimming = scene.swimming;
      const shrimpScale = 2;
      const ss = spriteSize('shrimp');
      const shX = Math.round(lw * (W < 700 ? 0.07 : 0.14));
      const bob = Math.sin(t * 2.2) * (swimming ? 1 : 2.5);
      const shY = sy - (ss.h * shrimpScale) / 2 + bob;
      if (scene.shrimpVisible) {
        if (deep > 0.05) drawGlowHi('rgba(255,79,160,0.13)', shX + ss.w, shY + ss.h, 46, deep);
        // Tilt only while actually swimming.
        const tilt = swimming ? (vel > 0 ? -0.38 : vel < 0 ? 0.38 : 0) : 0;
        drawHi('shrimp', shX, shY, { scale: shrimpScale, variant: scene.shrimpVariant, rotate: tilt });
        if (scene.shrimpVariant === 'crowned') drawHi('crown', shX + 20, shY - 4, { scale: 1, rotate: tilt });
      }

      // 5. screen-space effects: bubbles, sparkles, marine snow, vignette
      useLayer(fgc);
      lc.clearRect(0, -1, lw, lh + 2);
      bubbleTimer -= dt;
      if (scene.shrimpVisible && bubbleTimer <= 0) {
        bubbleTimer = swimming ? 0.05 : 0.7 + Math.random() * 0.8;
        bubbles.push({
          x: shX + (swimming ? 4 : 34) + Math.random() * 6,
          y: shY + (swimming ? 22 : 10),
          vy: -(10 + Math.random() * 10),
          r: Math.random() < 0.3 ? 2 : 1,
          ph: Math.random() * 6,
        });
      }
      for (const b of scene.bursts.splice(0)) {
        const gold = b.kind === 'shrimpion';
        for (let i = 0; i < (gold ? 70 : 30); i++) {
          bubbles.push({ x: shX + 20 + (Math.random() - 0.5) * 40, y: shY + 14 + (Math.random() - 0.5) * 20, vy: -(12 + Math.random() * 30), r: Math.random() < 0.4 ? 2 : 1, ph: Math.random() * 6 });
          if (gold) sparkles.push({ x: shX + 20, y: shY + 12, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 1 + Math.random() });
        }
      }
      lc.fillStyle = 'rgba(210,240,255,0.75)';
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += (b.vy + vel * unit) * dt;
        b.x += Math.sin(t * 3 + b.ph) * 0.15;
        if (b.y < Math.max(-4, waterY + 2) || b.y > lh + 10) {
          bubbles.splice(i, 1);
          continue;
        }
        const x = Math.round(b.x);
        const y = Math.round(b.y);
        if (b.r === 2) {
          lc.fillRect(x, y, 2, 1);
          lc.fillRect(x - 1, y + 1, 1, 2);
          lc.fillRect(x + 2, y + 1, 1, 2);
          lc.fillRect(x, y + 3, 2, 1);
        } else {
          lc.fillRect(x, y, 1, 1);
        }
      }
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.97;
        s.vy *= 0.97;
        if (s.life <= 0) {
          sparkles.splice(i, 1);
          continue;
        }
        lc.fillStyle = `rgba(255,224,138,${Math.min(1, s.life)})`;
        const x = Math.round(s.x);
        const y = Math.round(s.y);
        lc.fillRect(x - 1, y, 3, 1);
        lc.fillRect(x, y - 1, 1, 3);
      }
      const streak = Math.min(14, Math.abs(vel) * 9);
      const snowBoost = 0.5 + deep * 0.6;
      for (const p of snow) {
        p.y += (p.spd + vel * unit) * dt;
        p.x += Math.sin(t * 0.4 + p.drift) * 0.05;
        if (p.y > lh + 16) p.y = -16;
        if (p.y < -16) p.y = lh + 16;
        if (p.y < waterY) continue;
        lc.globalAlpha = p.a * snowBoost;
        lc.fillStyle = '#f5e1fa';
        lc.fillRect(Math.round(p.x), Math.round(p.y - streak), 1, 1 + Math.round(streak));
      }
      lc.globalAlpha = 0.25 + deep * 0.45;
      lc.drawImage(vignette, 0, 0, lw, lh);
      lc.globalAlpha = 1;
      blit(fg, 0);

      // depth ruler (full resolution)
      const toScreen = (v) => yOf(v) * PIX;
      ctx.save();
      ctx.strokeStyle = 'rgba(235,190,230,0.18)';
      ctx.beginPath();
      ctx.moveTo(W - 12.5, 0);
      ctx.lineTo(W - 12.5, H);
      ctx.stroke();
      ctx.font = `${W < 700 ? 13 : 17}px VT323, monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const m of MARKERS) {
        const v = m.d === 0 ? WATERLINE_V : vAtDepth(m.d);
        const y = toScreen(v);
        if (y < -20 || y > H + 20) continue;
        const onLight = y < waterY * PIX;
        ctx.fillStyle = onLight ? 'rgba(70,20,60,0.75)' : m.zone ? 'rgba(240,200,235,0.62)' : 'rgba(235,190,230,0.4)';
        ctx.fillRect(W - 18, Math.round(y), 11, 1);
        if (W > 520) ctx.fillText(m.t, W - 24, y);
      }
      for (let v = Math.floor(cam - 2) * 4; v <= (cam + 2) * 4; v++) {
        const y = toScreen(v / 4);
        ctx.fillStyle = 'rgba(235,190,230,0.25)';
        ctx.fillRect(W - 15, Math.round(y), 5, 1);
      }
      ctx.restore();

      if (scene.dim > 0.01) {
        ctx.fillStyle = `rgba(18,5,26,${scene.dim * 0.55})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Schedule first: a bad frame must never stop the ocean (or the ascent's travel promise).
      raf = requestAnimationFrame(frame);
      const prev = scene.tick(now);
      const vel = dt > 0 ? (scene.camV - prev) / dt : 0;
      scene.velocity = vel;
      try {
        draw(now / 1000, dt, vel);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[ocean] frame skipped:', err);
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="ocean-canvas" aria-hidden="true" />;
}
