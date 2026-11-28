import { useEffect, useRef, useState } from 'react';

// A small pixel-art globe that spins east from sea to sea, lighting each one up in turn.
// Every daily board lives on one of the seven seas; the selected board's sea glows gold.

/** The 7 seas, in tour order (west to east, so the globe always spins the same way). */
export const SEAS = [
  { id: 'random', sea: 'North Pacific', short: 'N. Pacific', view: [-160, 22], center: [-160, 28], radius: 30 },
  { id: 'sports', sea: 'South Pacific', short: 'S. Pacific', view: [-125, -24], center: [-125, -30], radius: 30 },
  { id: 'classic', sea: 'North Atlantic', short: 'N. Atlantic', view: [-40, 28], center: [-40, 35], radius: 22 },
  { id: 'words', sea: 'South Atlantic', short: 'S. Atlantic', view: [-15, -24], center: [-15, -28], radius: 22 },
  { id: 'music', sea: 'Southern Ocean', short: 'Southern', view: [20, -50], center: [0, -90], radius: 36 },
  { id: 'movies', sea: 'Indian Ocean', short: 'Indian', view: [75, -18], center: [75, -20], radius: 26 },
  { id: 'geography', sea: 'Arctic Ocean', short: 'Arctic', view: [120, 55], center: [0, 90], radius: 24 },
];
export const SEA_BY_BOARD = Object.fromEntries(SEAS.map((s) => [s.id, s]));

const S = 72; // canvas pixels (drawn at 2x for the chunky look)
const R = S / 2 - 3;
const DEG = Math.PI / 180;

// Rough continents as [lon, lat] outlines. Pixel art forgives a lot.
const LAND = [
  [[-168, 66], [-162, 70], [-140, 70], [-125, 70], [-110, 73], [-95, 72], [-80, 73], [-65, 62], [-60, 55], [-55, 50], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-83, 29], [-90, 30], [-97, 27], [-97, 22], [-92, 18], [-87, 21], [-88, 15], [-83, 9], [-78, 8], [-80, 7], [-86, 11], [-92, 14], [-105, 20], [-110, 24], [-115, 30], [-117, 33], [-121, 35], [-124, 40], [-124, 48], [-130, 55], [-140, 60], [-150, 60], [-158, 57], [-165, 55], [-160, 59], [-166, 62]],
  [[-120, 72], [-80, 74], [-65, 80], [-90, 82], [-120, 78]],
  [[-55, 60], [-43, 60], [-35, 65], [-22, 70], [-18, 77], [-20, 82], [-40, 83], [-60, 82], [-70, 78], [-58, 75], [-53, 68]],
  [[-24, 64], [-14, 64], [-14, 66], [-22, 66]],
  [[-85, 22], [-75, 20], [-74, 20], [-80, 23]],
  [[-78, 8], [-72, 12], [-62, 11], [-52, 5], [-35, -5], [-38, -13], [-40, -22], [-48, -26], [-53, -34], [-58, -38], [-65, -42], [-67, -47], [-69, -52], [-72, -54], [-75, -50], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0], [-78, 3]],
  [[-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [8, 57], [5, 59], [5, 62], [12, 66], [18, 70], [28, 71], [40, 67], [45, 68], [60, 70], [70, 73], [80, 73], [100, 77], [113, 74], [130, 72], [140, 72], [160, 70], [170, 70], [180, 68], [180, 65], [175, 62], [163, 60], [163, 55], [156, 51], [155, 58], [142, 59], [136, 54], [141, 48], [133, 43], [129, 40], [129, 35], [126, 35], [126, 38], [122, 40], [118, 38], [122, 32], [121, 28], [117, 23], [110, 21], [108, 17], [109, 12], [105, 9], [100, 13], [103, 5], [104, 1], [100, 3], [98, 8], [98, 16], [94, 17], [92, 22], [87, 22], [80, 15], [78, 8], [73, 17], [73, 21], [67, 25], [57, 25], [56, 27], [50, 30], [48, 29], [51, 24], [56, 26], [59, 22], [52, 16], [44, 12], [42, 16], [35, 28], [33, 31], [35, 36], [27, 37], [26, 40], [23, 38], [23, 36], [20, 40], [13, 45], [18, 40], [16, 38], [12, 42], [9, 44], [3, 43], [-1, 37], [-6, 36]],
  [[-180, 65], [-168, 66], [-172, 70], [-180, 70]],
  [[-5, 50], [1, 51], [0, 54], [-2, 57], [-4, 59], [-6, 57], [-5, 54]],
  [[-10, 52], [-6, 52], [-6, 55], [-10, 54]],
  [[-17, 21], [-13, 28], [-9, 32], [-6, 36], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [34, 28], [38, 22], [43, 12], [51, 12], [51, 10], [45, 2], [40, -3], [39, -10], [40, -15], [35, -24], [33, -28], [27, -34], [20, -35], [18, -32], [15, -27], [12, -18], [13, -12], [9, -1], [10, 4], [4, 6], [-5, 5], [-8, 4], [-13, 8], [-17, 14]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
  [[130, 31], [135, 34], [140, 35], [142, 40], [141, 45], [145, 44], [140, 41], [137, 37], [131, 34]],
  [[120, 18], [122, 18], [126, 7], [122, 7], [120, 14]],
  [[95, 5], [98, 4], [106, -6], [104, -6], [96, 1]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[105, -6], [114, -7], [114, -9], [106, -7]],
  [[131, -1], [141, -3], [150, -10], [141, -9], [137, -5]],
  [[114, -22], [114, -34], [118, -35], [124, -33], [131, -31], [135, -35], [138, -35], [141, -38], [147, -38], [150, -37], [153, -28], [153, -25], [146, -19], [142, -11], [141, -17], [136, -12], [131, -11], [126, -14], [122, -17]],
  [[172, -34], [178, -38], [174, -41], [171, -46], [167, -46], [172, -41]],
  [[-65, -63], [-57, -63], [-60, -70], [-70, -72]],
];
const WATER = [
  [[-95, 58], [-85, 55], [-78, 58], [-80, 63], [-92, 64]], // Hudson Bay
  [[47, 45], [53, 46], [54, 40], [52, 37], [49, 38]], // Caspian
];

let maskCache = null;
/** 1° land mask, 360 × 180, row 0 = 90°N, col 0 = 180°W. */
function landMask() {
  if (maskCache) return maskCache;
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 180;
  const g = c.getContext('2d');
  if (!g) return null;
  const fill = (polys, color) => {
    g.fillStyle = color;
    for (const poly of polys) {
      g.beginPath();
      poly.forEach(([lon, lat], i) => (i ? g.lineTo(lon + 180, 90 - lat) : g.moveTo(lon + 180, 90 - lat)));
      g.closePath();
      g.fill();
    }
  };
  fill(LAND, '#fff');
  g.fillRect(0, 160, 360, 20); // Antarctica
  fill(WATER, '#000');
  const d = g.getImageData(0, 0, 360, 180).data;
  maskCache = new Uint8Array(360 * 180);
  for (let i = 0; i < maskCache.length; i++) maskCache[i] = d[i * 4] > 127 ? 1 : 0;
  return maskCache;
}

const unit = (lon, lat) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const SEA_VEC = SEAS.map((s) => ({ v: unit(...s.center), cos: Math.cos(s.radius * DEG) }));

const WATER_C = [[10, 30, 64], [17, 62, 102], [31, 104, 140]];
const LAND_C = [[58, 22, 70], [120, 44, 104], [196, 82, 140]];
const AQUA = [79, 240, 200];
const GOLD = [255, 224, 138];
const BAYER = [0, 0.5, 0.75, 0.25];
const L = (() => {
  const v = [-0.55, 0.55, 0.63];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function draw(ctx, img, lon0, lat0, tourIdx, glow, selIdx, mask) {
  const d = img.data;
  const sp = Math.sin(lat0 * DEG);
  const cp = Math.cos(lat0 * DEG);
  const tour = tourIdx >= 0 ? SEA_VEC[tourIdx] : null;
  const sel = selIdx >= 0 ? SEA_VEC[selIdx] : null;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 4;
      const nx = (x + 0.5 - S / 2) / R;
      const ny = (S / 2 - (y + 0.5)) / R;
      const rr = nx * nx + ny * ny;
      if (rr > 1) {
        if (Math.sqrt(rr) < 1 + 1.6 / R) {
          d[o] = AQUA[0];
          d[o + 1] = AQUA[1];
          d[o + 2] = AQUA[2];
          d[o + 3] = 150;
        } else d[o + 3] = 0;
        continue;
      }
      const z = Math.sqrt(1 - rr);
      const lat = Math.asin(z * sp + ny * cp);
      const lon = lon0 * DEG + Math.atan2(nx, z * cp - ny * sp);
      const mx = Math.min(359, Math.floor((((lon / DEG + 180) % 360) + 360) % 360));
      const my = Math.min(179, Math.max(0, Math.floor(90 - lat / DEG)));
      const land = mask[my * 360 + mx];
      const light = nx * L[0] + ny * L[1] + z * L[2] + BAYER[(x & 1) + (y & 1) * 2] * 0.22 - 0.11;
      const band = light > 0.62 ? 2 : light > 0.18 ? 1 : 0;
      let c = (land ? LAND_C : WATER_C)[band];
      if (!land && (tour || sel)) {
        const cl = Math.cos(lat);
        const p0 = cl * Math.cos(lon);
        const p1 = cl * Math.sin(lon);
        const p2 = Math.sin(lat);
        if (sel && p0 * sel.v[0] + p1 * sel.v[1] + p2 * sel.v[2] > sel.cos) c = mix(c, GOLD, 0.3 + band * 0.06);
        if (tour && glow > 0 && p0 * tour.v[0] + p1 * tour.v[1] + p2 * tour.v[2] > tour.cos) c = mix(c, AQUA, glow * (0.32 + band * 0.08));
      }
      d[o] = c[0];
      d[o + 1] = c[1];
      d[o + 2] = c[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const HOLD_MS = 1700;
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Spinning globe of the 7 Seas. `selected` is the board id marked gold; clicking opens the sea on show. */
export default function SeasGlobe({ selected, onPick }) {
  const canvasRef = useRef(null);
  const selRef = useRef(selected);
  const jumpRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia(MOTION_QUERY).matches);
  const [paused, setPaused] = useState(false);
  const [showing, setShowing] = useState(() => Math.max(0, SEAS.findIndex((s) => s.id === selected)));
  const showingRef = useRef(showing);

  useEffect(() => {
    const media = window.matchMedia(MOTION_QUERY);
    const update = () => setReduceMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const i = SEAS.findIndex((s) => s.id === selected);
    if (selRef.current !== selected && i >= 0) jumpRef.current = i; // spin to the newly picked sea next
    selRef.current = selected;
    if (!reduceMotion && !paused) return;
    const ctx = canvasRef.current.getContext('2d');
    const mask = landMask();
    if (!ctx || !mask) return;
    const target = jumpRef.current ?? showingRef.current;
    jumpRef.current = null;
    showingRef.current = target;
    setShowing(target);
    draw(ctx, ctx.createImageData(S, S), ...SEAS[target].view, target, 1, i, mask);
  }, [selected, reduceMotion, paused]);

  useEffect(() => {
    if (reduceMotion || paused) return undefined;
    const ctx = canvasRef.current.getContext('2d');
    const mask = landMask();
    if (!ctx || !mask) return undefined;
    const img = ctx.createImageData(S, S);
    const selIdx = () => SEAS.findIndex((s) => s.id === selRef.current);

    let from = showingRef.current;
    let to = from;
    let lon = SEAS[from].view[0];
    let lat = SEAS[from].view[1];
    let fromLon = lon;
    let fromLat = lat;
    let dLon = 0;
    let legStart = 0;
    let legDur = 1;
    let holdUntil = performance.now() + HOLD_MS;
    let raf = 0;

    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      let glow = 1;
      if (to !== from) {
        const k = Math.min(1, (t - legStart) / legDur);
        const e = ease(k);
        lon = fromLon + dLon * e;
        lat = fromLat + (SEAS[to].view[1] - fromLat) * e;
        glow = Math.max(0, (k - 0.7) / 0.3);
        if (k >= 1) {
          from = to;
          showingRef.current = to;
          setShowing(to);
          holdUntil = t + HOLD_MS;
        }
      } else if (jumpRef.current !== null || t >= holdUntil) {
        const next = jumpRef.current ?? (from + 1) % SEAS.length;
        jumpRef.current = null;
        if (next !== from) {
          to = next;
          fromLon = lon;
          fromLat = lat;
          dLon = (((SEAS[to].view[0] - lon) % 360) + 360) % 360; // always spin east
          legDur = 500 + dLon * 13;
          legStart = t;
          glow = 0;
        } else holdUntil = t + HOLD_MS;
      } else {
        const left = holdUntil - t;
        glow = left < 300 ? left / 300 : 1;
      }
      draw(ctx, img, lon, lat, to, glow, selIdx(), mask);
    };
    draw(ctx, img, lon, lat, from, 1, selIdx(), mask);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, paused]);

  const sea = SEAS[showing];
  return (
    <figure className="seas-globe">
      <button type="button" className="seas-globe-btn" onClick={() => onPick(sea.id)} aria-label={`Open the ${sea.sea} board`}>
        <canvas ref={canvasRef} width={S} height={S} className="seas-globe-canvas" aria-hidden="true" />
      </button>
      <figcaption className="seas-globe-cap">
        {sea.sea}
        {!reduceMotion && (
          <button type="button" className="seas-tour-toggle" aria-label={paused ? 'Resume globe tour' : 'Pause globe tour'} onClick={() => setPaused(!paused)}>
            <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
          </button>
        )}
      </figcaption>
    </figure>
  );
}
