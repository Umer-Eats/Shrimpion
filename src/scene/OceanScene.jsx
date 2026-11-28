import { useEffect, useRef } from 'react';
import { scene } from './sceneStore.js';
import { MARKERS, WATERLINE_V, FLOOR_V, vAtDepth } from './depth.js';
import { drawSprite, spriteSize } from '../art/render.js';
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

/** Wall thickness (fraction of screen width) at height v. */
function wallProfile(v, seed) {
  const n = Math.sin(v * 6.1 + seed) * 0.5 + Math.sin(v * 15.3 + seed * 2.3) * 0.3 + Math.sin(v * 37.7 + seed * 4.1) * 0.2;
  const base = v < 3 ? 0.11 - v * 0.012 : v < 5.6 ? 0.074 - (v - 3) * 0.007 : 0.056;
  const top = WATERLINE_V - 0.12;
  const fade = v > 6.9 ? clamp((top - v) / (top - 6.9), 0, 1) : 1;
  return Math.max(0, (base + n * base * 0.45) * fade);
}

const CORAL_COLORS = ['#ff5d8f', '#ff9f43', '#ff6b5a', '#c77dff', '#ffd166', '#4de3ff'];

/** Pre-baked pixel shapes for the growth on the walls. dx grows away from the wall, dy grows up. */
function buildDecor() {
  const rng = rngFor('shrimpion-walls');
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const out = [];
  for (const side of [0, 1]) {
    let v = FLOOR_V + 0.1;
    while (v < 7.15) {
      v += 0.03 + rng() * 0.06;
      let type;
      if (v >= 5.8) type = pick(['branch', 'branch', 'brain', 'fan', 'anemone', 'anemone', 'star', 'kelp', 'kelp']);
      else if (v >= 5.0) type = pick(['kelp', 'sponge', 'fan', 'star']);
      else if (v >= 3.2) type = pick(['sponge', 'crinoid', 'lump', 'glow']);
      else type = pick(['tube', 'tube', 'glow', 'crinoid', 'lump', 'glow']);
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
      out.push({ side, v, type, px, sway, phase: rng() * 6 });
    }
  }
  return out;
}

// Wrecks rest on rock shelves at fixed depths. [sprite, v, side (0 = left), scale, alpha]
const WRECKS = [
  ['wreck', vAtDepth(3800), 1, 2, 0.85], // the Titanic marker on the ruler
  ['sub', 4.35, 0, 1, 0.8],
  ['wreck', 6.3, 0, 2, 1],
  ['anchor', 5.85, 1, 1, 0.9],
];

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
    const low = document.createElement('canvas');
    const lc = low.getContext('2d');
    const world = buildWorld();
    const decor = buildDecor();
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
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      lw = Math.ceil(W / PIX);
      lh = Math.ceil(H / PIX);
      low.width = lw;
      low.height = lh;
      // Resizing a canvas resets its context state, so re-disable smoothing every time.
      lc.imageSmoothingEnabled = false;
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

    function drawWalls(t, cam, unit, sy, yOf, light) {
      const sw = W < 700 ? 0.55 : 1;
      const wallL = (v) => Math.round(wallProfile(v, 1.7) * lw * sw);
      const wallR = (v) => Math.round(wallProfile(v, 4.2) * lw * sw * 0.8);
      // Row by row in world coordinates, so the rock texture stays pixel-stable while the camera moves.
      const off = Math.round(cam * unit + sy);
      for (let y = 0; y < lh; y++) {
        const k = off - y;
        const v = k / unit;
        if (v > WATERLINE_V - 0.1 || v < FLOOR_V - 0.6) continue;
        const tv = clamp(v / 7, 0, 1);
        const fill = rgb(mix(ROCK_DEEP[0], ROCK_HIGH[0], tv));
        const edge = rgb(mix(ROCK_DEEP[1], ROCK_HIGH[1], tv));
        const bevel = rgb(mix(ROCK_DEEP[2], ROCK_HIGH[2], tv));
        const h = Math.imul(k, 2654435761) >>> 0;
        const l = wallL(v);
        const r = wallR(v);
        if (l > 0) {
          lc.fillStyle = fill;
          lc.fillRect(0, y, l, 1);
          lc.fillStyle = bevel;
          lc.fillRect(Math.max(0, l - 4), y, 3, 1);
          if (h % 4 === 0) lc.fillRect(h % Math.max(1, l), y, 3, 1);
          lc.fillStyle = edge;
          lc.fillRect(l - 1, y, 1, 1);
          if (h % 23 === 0) lc.fillRect((h >>> 7) % Math.max(1, l), y, 1, 1);
        }
        if (r > 0) {
          lc.fillStyle = fill;
          lc.fillRect(lw - r, y, r, 1);
          lc.fillStyle = bevel;
          lc.fillRect(lw - r + 1, y, Math.min(3, r), 1);
          if ((h >>> 3) % 4 === 0) lc.fillRect(lw - 1 - ((h >>> 5) % Math.max(1, r)), y, 3, 1);
          lc.fillStyle = edge;
          lc.fillRect(lw - r, y, 1, 1);
          if ((h >>> 2) % 23 === 0) lc.fillRect(lw - 1 - ((h >>> 9) % Math.max(1, r)), y, 1, 1);
        }
      }

      // Growth on the walls: coral and kelp up top, sponges in the twilight, tube worms and glow in the trench.
      for (const d of decor) {
        const by = Math.round(yOf(d.v));
        if (by < -50 || by > lh + 10) continue;
        const edgeX = d.side === 0 ? wallL(d.v) - 1 : lw - wallR(d.v);
        if (d.side === 0 ? edgeX < 2 : edgeX > lw - 3) continue;
        const dir = d.side === 0 ? 1 : -1;
        if (d.type === 'star') {
          drawSprite(lc, 'starfish', edgeX - (d.side === 0 ? 4 : 0), by - 5, { scale: 1 });
          continue;
        }
        const glow = d.type === 'glow';
        if (glow) {
          lc.save();
          lc.globalCompositeOperation = 'lighter';
          lc.globalAlpha = 0.45 + 0.45 * Math.sin(t * 1.7 + d.phase);
        }
        for (const [dx, dy, c] of d.px) {
          const s = d.sway ? Math.round(Math.sin(t * 1.3 + d.phase + dy * 0.18) * dy * 0.08) : 0;
          lc.fillStyle = c;
          lc.fillRect(edgeX + (dx + s) * dir, by - dy, 1, 1);
        }
        if (glow) lc.restore();
      }

      // Wrecks on rock shelves.
      for (const [name, v, side, scale, alpha] of WRECKS) {
        const by = Math.round(yOf(v));
        const { w, h } = spriteSize(name);
        if (by < -20 || by - h * scale > lh + 20) continue;
        const shelf = (side === 0 ? wallL(v) : wallR(v)) + Math.round(w * scale * 0.85);
        const tv = clamp(v / 7, 0, 1);
        lc.fillStyle = rgb(mix(ROCK_DEEP[0], ROCK_HIGH[0], tv));
        const sx = side === 0 ? 0 : lw - shelf;
        lc.fillRect(sx, by, shelf, 4);
        lc.fillRect(side === 0 ? 0 : lw - shelf + 3, by + 4, shelf - 3, 3);
        lc.fillStyle = rgb(mix(ROCK_DEEP[1], ROCK_HIGH[1], tv));
        lc.fillRect(sx, by, shelf, 1);
        lc.fillRect(side === 0 ? shelf - 1 : sx, by, 1, 4);
        const x = side === 0 ? shelf - w * scale - 2 : lw - shelf + 2;
        drawSprite(lc, name, x, by - h * scale + 1, { scale, flip: side === 1, alpha: alpha * (0.55 + 0.45 * Math.max(light, tv)) });
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

    function draw(t, dt, vel) {
      const cam = scene.camV;
      const sy = lh * 0.6;
      const unit = lh * 0.95;
      const yOf = (v) => sy - (v - cam) * unit;
      const vOf = (y) => cam + (sy - y) / unit;
      const light = clamp((cam - 4.3) / 3, 0, 1);
      const deep = 1 - clamp(cam / 5.5, 0, 1);

      // water
      const g = lc.createLinearGradient(0, 0, 0, lh);
      for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, rgb(waterRGB(vOf((i / 8) * lh))));
      lc.fillStyle = g;
      lc.fillRect(0, 0, lw, lh);

      const waterY = yOf(WATERLINE_V);
      if (light > 0.01) drawRays(t, light, waterY);

      // creatures
      for (const e of world) {
        e.x += (e.dir * e.speed * dt) / lw;
        if (e.x > 1.2) e.x = -0.2;
        if (e.x < -0.2) e.x = 1.2;
        const py = yOf(e.v) + Math.sin(t * 0.9 + e.phase) * e.bob;
        if (py < -50 || py > lh + 50) continue;
        const { w, h } = spriteSize(e.name);
        const px = e.x * lw;
        drawSprite(lc, e.name, px, py - (h * e.scale) / 2, {
          scale: e.scale,
          variant: e.variant,
          flip: e.dir > 0,
          alpha: e.layer,
        });
        const glow = SPRITES[e.name].glow;
        if (glow && deep > 0.15) {
          lc.save();
          lc.globalCompositeOperation = 'lighter';
          const gx = e.name === 'angler' ? (e.dir > 0 ? px + w - 1 : px) : px + (w * e.scale) / 2;
          const gy = e.name === 'angler' ? py - (h * e.scale) / 2 : py;
          const rg = lc.createRadialGradient(gx, gy, 0, gx, gy, 12);
          rg.addColorStop(0, glow + '66');
          rg.addColorStop(1, glow + '00');
          lc.globalAlpha = Math.min(1, deep * 1.3) * e.layer;
          lc.fillStyle = rg;
          lc.fillRect(gx - 12, gy - 12, 24, 24);
          lc.restore();
        }
      }

      drawWalls(t, cam, unit, sy, yOf, light);

      const floorY = yOf(FLOOR_V);
      if (floorY - 120 < lh) drawFloor(floorY, t);
      if (waterY > -4) drawSky(waterY, t);

      // the shrimp
      const swimming = scene.swimming;
      const shrimpScale = 2;
      const ss = spriteSize('shrimp');
      const shX = Math.round(lw * (W < 700 ? 0.07 : 0.14));
      const bob = Math.sin(t * 2.2) * (swimming ? 1 : 2.5);
      const shY = Math.round(sy - (ss.h * shrimpScale) / 2 + bob);
      if (scene.shrimpVisible) {
        if (deep > 0.05) {
          lc.save();
          lc.globalCompositeOperation = 'lighter';
          const cx = shX + ss.w;
          const cy = shY + ss.h;
          const rg = lc.createRadialGradient(cx, cy, 0, cx, cy, 46);
          rg.addColorStop(0, `rgba(255,79,160,${0.13 * deep})`);
          rg.addColorStop(1, 'rgba(255,79,160,0)');
          lc.fillStyle = rg;
          lc.fillRect(cx - 46, cy - 46, 92, 92);
          lc.restore();
        }
        // No idle wobble: a sub-pixel rotation smears every pixel. Tilt only while actually swimming.
        const tilt = swimming ? (vel > 0 ? -0.38 : vel < 0 ? 0.38 : 0) : 0;
        drawSprite(lc, 'shrimp', shX, shY, { scale: shrimpScale, variant: scene.shrimpVariant, rotate: tilt });
        if (scene.shrimpVariant === 'crowned') {
          drawSprite(lc, 'crown', shX + 20, shY - 4, { scale: 1, rotate: tilt });
        }
      }

      // bubbles from the shrimp
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
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += (b.vy + vel * unit) * dt;
        b.x += Math.sin(t * 3 + b.ph) * 0.15;
        if (b.y < Math.max(-4, waterY + 2) || b.y > lh + 10) {
          bubbles.splice(i, 1);
          continue;
        }
        lc.fillStyle = 'rgba(210,240,255,0.75)';
        if (b.r === 2) {
          lc.fillRect(Math.round(b.x), Math.round(b.y), 2, 1);
          lc.fillRect(Math.round(b.x) - 1, Math.round(b.y) + 1, 1, 2);
          lc.fillRect(Math.round(b.x) + 2, Math.round(b.y) + 1, 1, 2);
          lc.fillRect(Math.round(b.x), Math.round(b.y) + 3, 2, 1);
        } else {
          lc.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
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

      // marine snow
      const streak = Math.min(14, Math.abs(vel) * 9);
      for (const p of snow) {
        p.y += (p.spd + vel * unit) * dt;
        p.x += Math.sin(t * 0.4 + p.drift) * 0.05;
        if (p.y > lh + 16) p.y = -16;
        if (p.y < -16) p.y = lh + 16;
        if (p.y < waterY) continue;
        lc.fillStyle = `rgba(245,225,250,${p.a * (0.5 + deep * 0.6)})`;
        lc.fillRect(Math.round(p.x), Math.round(p.y - streak), 1, 1 + Math.round(streak));
      }

      // vignette
      const vg = lc.createRadialGradient(lw / 2, lh / 2, Math.min(lw, lh) * 0.3, lw / 2, lh / 2, Math.max(lw, lh) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(10,0,12,${0.25 + deep * 0.45})`);
      lc.fillStyle = vg;
      lc.fillRect(0, 0, lw, lh);

      // upscale
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, lw * PIX, lh * PIX);

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
