// Builds public/favicon.svg (and public/icon.svg) from the right-facing hero shrimp sprite.
// Run: npm run make:icon
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
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

// Raster copies of the tab favicon (transparent shrimp, no background tile) for search engines.
// Google shows a site's favicon in results; it wants a square that's a multiple of 48px, and it
// also reads apple-touch-icon and falls back to /favicon.ico, so every icon is the same shrimp.
function pngBuffer(px) {
  const scale = Math.floor(px / size);
  const pad = Math.floor((px - size * scale) / 2);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const grid = rows.map((row) => [...row].map((ch) => (ch === '.' || !pal[ch] ? null : hex(pal[ch]))));
  const raw = Buffer.alloc((px * 4 + 1) * px);
  for (let y = 0; y < px; y++) {
    raw[y * (px * 4 + 1)] = 0;
    for (let x = 0; x < px; x++) {
      const sx = Math.floor((x - pad) / scale) - ox;
      const sy = Math.floor((y - pad) / scale) - oy;
      const c = x >= pad && y >= pad ? grid[sy]?.[sx] : null;
      const o = y * (px * 4 + 1) + 1 + x * 4;
      [raw[o], raw[o + 1], raw[o + 2], raw[o + 3]] = c ? [...c, 255] : [0, 0, 0, 0];
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(px, 0);
  ihdr.writeUInt32BE(px, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// An .ico file that wraps PNG images (supported by every current browser and by Google).
function icoBuffer(sizes) {
  const images = sizes.map((px) => ({ px, data: pngBuffer(px) }));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ px, data }, i) => {
    const e = 6 + 16 * i;
    header[e] = px >= 256 ? 0 : px;
    header[e + 1] = px >= 256 ? 0 : px;
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const out = (name) => join(root, 'public', name);
writeFileSync(out('favicon-48.png'), pngBuffer(48));
writeFileSync(out('favicon-192.png'), pngBuffer(192));
writeFileSync(out('apple-touch-icon.png'), pngBuffer(180));
writeFileSync(out('logo-512.png'), pngBuffer(512));
writeFileSync(out('favicon.ico'), icoBuffer([16, 32, 48]));
console.log('Wrote favicon.ico, favicon-48.png, favicon-192.png, apple-touch-icon.png and logo-512.png.');
