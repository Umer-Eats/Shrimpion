import { SPRITES, SHRIMP_VARIANTS, CREATURE_VARIANTS } from './spriteData.js';

const cache = new Map();

function paletteFor(name, variant) {
  const base = SPRITES[name].pal;
  if (!variant) return base;
  if (name === 'shrimp') return { ...base, ...(SHRIMP_VARIANTS[variant] || {}) };
  return { ...base, ...(CREATURE_VARIANTS[`${name}:${variant}`] || {}) };
}

export function spriteSize(name) {
  const rows = SPRITES[name].rows;
  return { w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

/** Returns a 1px-per-cell canvas for a sprite (cached). */
export function spriteCanvas(name, { variant = null, flip = false } = {}) {
  const key = `${name}|${variant}|${flip}`;
  if (cache.has(key)) return cache.get(key);
  const sprite = SPRITES[name];
  if (!sprite) throw new Error(`Unknown sprite ${name}`);
  const { w, h } = spriteSize(name);
  const pal = paletteFor(name, variant);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  sprite.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || !pal[ch]) return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    });
  });
  cache.set(key, cv);
  return cv;
}

/** Draw a sprite onto a (low-res) context at integer scale. */
export function drawSprite(ctx, name, x, y, { scale = 1, variant = null, flip = false, alpha = 1, rotate = 0 } = {}) {
  const cv = spriteCanvas(name, { variant, flip });
  ctx.save();
  ctx.globalAlpha = alpha;
  if (rotate) {
    ctx.translate(Math.round(x + (cv.width * scale) / 2), Math.round(y + (cv.height * scale) / 2));
    ctx.rotate(rotate);
    ctx.drawImage(cv, Math.round((-cv.width * scale) / 2), Math.round((-cv.height * scale) / 2), cv.width * scale, cv.height * scale);
  } else {
    ctx.drawImage(cv, Math.round(x), Math.round(y), cv.width * scale, cv.height * scale);
  }
  ctx.restore();
}
