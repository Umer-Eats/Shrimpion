// Builds public/favicon.svg (and public/icon.svg) from the right-facing hero shrimp sprite.
// Run: npm run make:icon
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPRITES } from '../src/art/spriteData.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { rows, pal } = SPRITES.shrimp;
const w = Math.max(...rows.map((r) => r.length));
const h = rows.length;
const size = Math.max(w, h); // tight square: the shrimp fills the browser tab
const ox = Math.floor((size - w) / 2);
const oy = Math.floor((size - h) / 2);

let rects = '';
rows.forEach((row, y) => {
  [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    rects += `<rect x="${x + ox}" y="${y + oy}" width="1" height="1" fill="${pal[ch]}"/>`;
  });
});

const svg = (bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
  (bg ? `<rect width="${size}" height="${size}" rx="3" fill="#06142b"/>` : '') +
  rects +
  `</svg>\n`;

mkdirSync(join(root, 'public'), { recursive: true });
// Transparent: just the shrimp, no background tile.
writeFileSync(join(root, 'public', 'favicon.svg'), svg(false));
writeFileSync(join(root, 'public', 'icon.svg'), svg(false));
console.log(`Wrote public/favicon.svg and public/icon.svg (${size}x${size}).`);
