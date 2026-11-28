// Hand-placed pixel art. '.' is transparent; every other character maps to a palette color.
// Creatures face LEFT unless noted; the renderer can flip them. The shrimp faces RIGHT.

export const SPRITES = {
  shrimp: {
    rows: [
      '............aaaaaaaaa...',
      '..........aa.........aa.',
      '......ooooooo..........a',
      '....oobbbbbbbooo........',
      '...obllbbbbbbbbbkkkkkk..',
      '..obllbbdbbdbkkkknsnnk..',
      '.obbdbbdbbdbbbbbknwenkrr',
      '.obdbbdbbdbbbbbbkneenk..',
      'obbbo.ooooooooookkkkkk..',
      'obbo..g.g.g.g.g.g.......',
      'obbo.g.g.g.g.g.g........',
      '.obbo...................',
      '..offo..................',
      '.offffo.................',
      '..oooo..................',
    ],
    pal: {
      // pinker body; k/n/s are the big square nerd glasses (frame, lens, glint)
      a: '#ffc4de', o: '#7a0f3d', b: '#ff5fa8', l: '#ffd3e8', d: '#e0367f',
      w: '#ffffff', e: '#1a0612', r: '#ff9cc8', f: '#ff86bd', g: '#ffa6cf',
      k: '#1b1030', n: '#c9f1ff', s: '#ffffff',
    },
  },

  crown: {
    rows: [
      'y..y..y',
      'yy.yy.yy',
      'yyyyyyyy',
      'yryyybyy',
      'yyyyyyyy',
    ],
    pal: { y: '#ffd166', r: '#ff5d8f', b: '#4de3ff' },
  },

  fish: {
    rows: [
      '...ooo...',
      '.oobbbo.o',
      'oebbbbboo',
      '.oobbbo.o',
      '...ooo...',
    ],
    pal: { o: '#0b1b33', b: '#16304f', e: '#9fc6ff' },
  },

  lantern: {
    rows: [
      '...oooo...',
      '.oobbbbo.o',
      'oebgbgbboo',
      '.oobbbbo.o',
      '...oooo...',
    ],
    pal: { o: '#0a1426', b: '#1a2a44', e: '#cfe8ff', g: '#7cf6ff' },
    glow: '#7cf6ff',
  },

  jelly: {
    rows: [
      '..ooooo..',
      '.obbbbbo.',
      'obbllbbbo',
      'obbbbbbbo',
      'ooooooooo',
      '.t.t.t.t.',
      '.t.t..t.t',
      't..t.t..t',
      '.t..t.t..',
      '.t.t...t.',
      '..t..t...',
    ],
    pal: { o: '#c77dff', b: '#9b5de5', l: '#e8c8ff', t: '#b98cff' },
    glow: '#c77dff',
  },

  angler: {
    rows: [
      'g...............',
      '.s..............',
      '..s..oooooo.....',
      '..s.obbbbbboo...',
      '...obbbbbbbbbo.o',
      '..obebbbbbbbbbob',
      '.owwbbbbbbbbbbbo',
      '.owbwbbbbbbbbbob',
      '.oowwbbbbbbbbo.o',
      '...oobbbbbboo...',
      '.....oooooo.....',
    ],
    pal: { g: '#fff36b', s: '#3a4a66', o: '#05080f', b: '#1c2333', e: '#ff4d6d', w: '#e6ecff' },
    glow: '#fff36b',
  },

  squid: {
    rows: [
      '..oo............',
      '.obbo...........',
      'obbbbooooo......',
      'obbbbbbbbbeott.t',
      'obbbbbbbbbbottt.',
      '.obbo.ooooo.t.tt',
      '..oo........t..t',
    ],
    pal: { o: '#5a0f22', b: '#b0243f', e: '#ffd166', t: '#8a1a33' },
  },

  dumbo: {
    rows: [
      'ee..oooo..ee',
      'eeoobbbbooee',
      '.obbbbbbbbo.',
      '.obwkbbwkbo.',
      '.obbbbbbbbo.',
      '..obbbbbbo..',
      '.oobbbbbboo.',
      'obb.bbbb.bbo',
      'ob..b..b..bo',
      '.o..o..o..o.',
    ],
    pal: { e: '#ff9fb4', o: '#7a2440', b: '#f0738f', w: '#ffffff', k: '#140612' },
  },

  snailfish: {
    rows: [
      '...ooooo....',
      '.oobbbbbooo.',
      'obebbbbbbbbo',
      '.oobbbbbooo.',
      '...ooooo....',
    ],
    pal: { o: '#a98ea0', b: '#e9d6e0', e: '#2a1a24' },
  },

  amphipod: {
    rows: [
      'a......',
      '.oooooo',
      'obbbbbo',
      '.g.g.g.',
    ],
    pal: { a: '#d9c7b8', o: '#8f7a68', b: '#efe2d3', g: '#cbb7a5' },
  },

  tripod: {
    rows: [
      '.....oooo...',
      '...oobbbbooo',
      '..obebbbbbbo',
      '...oobbbbooo',
      '.....oooo...',
      '....s....s..',
      '...s......s.',
      '..s........s',
    ],
    pal: { o: '#1a2230', b: '#3b4658', e: '#cfe8ff', s: '#5a6a80' },
  },

  cucumber: {
    rows: [
      '...p...p..p...',
      '..oooooooooo..',
      '.obbdbbdbbdbo.',
      'obkbbbbbbbbbbo',
      'obbbbbbbbbbbbo',
      '.oooooooooooo.',
    ],
    pal: { p: '#c96a7a', o: '#5b2330', b: '#a8455a', d: '#8a3447', k: '#14070b' },
  },

  crab: {
    faces: 'right', // drawn facing right; swimming creatures flip from this
    rows: [
      '.....ssss.......',
      '...sstttss......',
      '..ststssts..e.e.',
      '..stsstts...o.o.',
      '..sstttss..oo.oo',
      '...sssssoobbbbo.',
      '....oobbbbbbbccc',
      '...obbbbbbbbcwcc',
      '...obbbbbbbb.cc.',
      '...o.g.g.g.g....',
    ],
    pal: { s: '#f2c48d', t: '#c98a4b', o: '#6b2e12', b: '#ff7b3a', c: '#ff5a1f', w: '#ffd2b0', e: '#140612', g: '#d95a1f' },
  },

  octopus: {
    rows: [
      '...oooooo...',
      '..obbbbbbo..',
      '.obblbbbbbo.',
      '.obbbbbbbbo.',
      '.obwkbbwkbo.',
      '.obbbbbbbbo.',
      '..obbmmbbo..',
      '.oobbbbbboo.',
      '.obobbbbobo.',
      'ob.ob..bo.bo',
      'o..ob..bo..o',
      '...o....o...',
    ],
    pal: { o: '#3c1466', b: '#9d5cf0', l: '#d6b8ff', w: '#ffffff', k: '#140612', m: '#e07ab8' },
  },

  turtle: {
    faces: 'right', // drawn facing right; swimming creatures flip from this
    rows: [
      '......oooooo........',
      '....oossssssoo......',
      '...osstsssstsso.....',
      '..ossssssssssssoooo.',
      '..osssstsssstssobbbo',
      '...oossssssssoobbkbo',
      '..oobbooooooobboooo.',
      '.obbo........obbo...',
      '.oo...........oo....',
    ],
    pal: { o: '#123d22', s: '#4c9a52', t: '#2f6b38', b: '#9bd58a', k: '#0c1a10' },
  },

  dolphin: {
    faces: 'right', // drawn facing right; swimming creatures flip from this
    rows: [
      '..........o...........',
      '.........obo..........',
      '...oooooobbbooooo.....',
      '..obbbbbbbbbbbbbbooo..',
      'oobbbbbbbbbbbbbbbbkboo',
      'obo.obbllllllllbbbbbbbo',
      'o....oollllllloooooooo.',
      '.......oo..............',
    ],
    pal: { o: '#1d3d5c', b: '#6fa8d6', l: '#d8ecff', k: '#0b1520' },
  },

  manta: {
    rows: [
      'oo..................oo',
      'obo................obo',
      '.obboo..........oobbo.',
      '..obbbbooooooooobbbbo.',
      '...obbbbbbbbbbbbbbbo..',
      '....oobbbewwebbbboo...',
      '......oobbbbbbboo.....',
      '.........obbo.........',
      '.........obo..........',
      '..........o...........',
    ],
    pal: { o: '#0e1f33', b: '#2c4a6b', e: '#d8ecff', w: '#9fc0de' },
  },

  whale: {
    rows: [
      '.oooooooooooooo...............',
      'obbbbbbbbbbbbbboooooo.......oo',
      'obbbbbbbbbbbbbbbbbbbbooo...obo',
      'obebbbbbbbbbbbbbbbbbbbbbooobo.',
      'obbbbbbbbbbbbbbbbbbbbbbbbbbo..',
      'owwbbbbbbbbbbbbbbbbbbbbbooobo.',
      '.owbbbbbbbbbbbbbbbbbooo....obo',
      '..ooooooooooooooooooo.......oo',
    ],
    pal: { o: '#060b14', b: '#1b2638', e: '#9fb6d6', w: '#3a4a62' },
  },

  seahorse: {
    faces: 'right', // drawn facing right; swimming creatures flip from this
    rows: [
      '...ooo....',
      '..obbbo...',
      '..obebbooo',
      '..obbbbbbb',
      '...obbooo.',
      '..obbbo...',
      '.obbbbod..',
      '.obbbbbod.',
      '.obbbbbo..',
      '..obbbo...',
      '...obbo...',
      '....obo...',
      '..oo.bo...',
      '.ob.obo...',
      '..obbo....',
    ],
    pal: { o: '#7a3d00', b: '#ffb347', e: '#140612', d: '#ffe0a8' },
  },

  shark: {
    rows: [
      '..........oo..........',
      '.........obo..........',
      '........obbo.........o',
      '..ooooooobbboooooo..ob',
      '.obbbbbbbbbbbbbbbbooob',
      'obebbbbbbbbbbbbbbbbbbo',
      'owwwbbbbbbbbbbbbbbooob',
      '.oowwwwwwwbbbboooo..ob',
      '...ooooooooobo.......o',
      '...........oo.........',
    ],
    pal: { o: '#1c2a3a', b: '#6b88a3', w: '#e3ecf4', e: '#0b1520' },
  },

  eel: {
    rows: [
      '..oooooooooooooooooo....',
      '.obbbbbbbbbbbbbbbbbbboo.',
      'obebbbbbbbbbbbbbbbbbbbbo',
      '.oddddbbbbbbbbbbbbbbboo.',
      '..oooooooooooooooooo....',
    ],
    pal: { o: '#1e3312', b: '#6b8f2a', d: '#a8c35a', e: '#ffd166' },
  },

  puffer: {
    rows: [
      '..s.s.s....',
      '.ooooooo...',
      'obbsbbbbo.o',
      'oebbbsbbboo',
      'owwwwwwwo.o',
      '.ooooooo...',
      '..s.s.s....',
    ],
    pal: { o: '#7a5a00', b: '#ffd84a', s: '#c9a227', e: '#140612', w: '#fff3c4' },
  },

  clown: {
    rows: [
      '...ooo...',
      '.oawabo.o',
      'oeawabaoo',
      '.oawabo.o',
      '...ooo...',
    ],
    pal: { o: '#2a0e00', a: '#ff7a1a', b: '#ff7a1a', w: '#ffffff', e: '#140612' },
  },

  starfish: {
    rows: ['..o..', '.ooo.', 'ooooo', '.o.o.', 'o...o'],
    pal: { o: '#ff6b5a' },
  },

  anchor: {
    rows: [
      '..ooo..',
      '..o.o..',
      '..ooo..',
      'ooooooo',
      '...o...',
      '...o...',
      '...o...',
      'o..o..o',
      'oo.o.oo',
      '.ooooo.',
    ],
    pal: { o: '#4a3a3a' },
  },

  wreck: {
    rows: [
      '..............m.....................',
      '..............m.......m.............',
      '.............mmm......m.............',
      '..............m......mm.............',
      '..............m.......m.............',
      '..............m.......m.............',
      '.....rrrrrrrrrmrrrrrrrmrrrrrr.......',
      '....rddddddddddddddddddddddddrr.....',
      '...rdhhhhhhhhhhhhhhhhhhhhhhhhhdr....',
      '..rdhhpkhhhhpkhhhhpkhhhhpkhhhhdr....',
      '.rddhhhhhhhhhhhhhhhhhhhhhhhhhhhdr...',
      'rdhhhhhhhhhhh..hhhhhhhhhhhhhhhhdr...',
      '.rdhhhhhhhhh....hhhhhhhhhhhhhhdr....',
      '..rddhhhhhhhh..hhhhhhhhhhhhhddr.....',
      '....rrdddddddddddddddddddddrr.......',
      '......rrrrrrrrrrrrrrrrrrrrr.........',
    ],
    pal: { m: '#3a2a1e', r: '#120a0e', d: '#4a3226', h: '#2e2019', p: '#8a7448', k: '#0a0608' },
  },

  sub: {
    rows: [
      '...........oo...........',
      '..........obbo..........',
      '..........obbo..........',
      '....oooooooobboooooo....',
      '..oobbbbbbbbbbbbbbbboo.o',
      '.obbpbbbpbbbbpbbbbbbbbob',
      'obbbbbbbbbbbbbbbbbbbbbbo',
      '.oobbbbbbbbbbbbbbbbbboob',
      '...oooooooooooooooooo..o',
    ],
    pal: { o: '#0c0f14', b: '#3a3f2a', p: '#8fa36a' },
  },

  // ---- UI icons (used everywhere instead of emoji) ----
  'icon-dice': {
    rows: [
      '.ooooooo.',
      'owwwwwwwo',
      'owpwwwwwo',
      'owwwwwwwo',
      'owwwpwwwo',
      'owwwwwwwo',
      'owwwwwpwo',
      'owwwwwwwo',
      '.ooooooo.',
    ],
    pal: { o: '#5a1840', w: '#fff0f7', p: '#ff4fa0' },
  },
  'icon-shell': {
    rows: [
      '...ooo...',
      '..oyoyo..',
      '.oyoyoyo.',
      'oyoyoyoyo',
      'oyoyoyoyo',
      '.oyoyoyo.',
      '..ooooo..',
      '...oyo...',
    ],
    pal: { o: '#e0607e', y: '#ffd6c2' },
  },
  'icon-book': {
    rows: [
      '.ooo.ooo.',
      'owwwowwwo',
      'owllowllo',
      'owwwowwwo',
      'owllowllo',
      'owwwowwwo',
      'oooo.oooo',
      '....o....',
    ],
    pal: { o: '#2a8f7a', w: '#fff0f7', l: '#c9a3c4' },
  },
  'icon-film': {
    rows: [
      'kwkwkwkwk',
      'kkkkkkkkk',
      'kgggggggk',
      'kgwwwwwgk',
      'kgggggggk',
      'kgwwwgggk',
      'kgggggggk',
      'kkkkkkkkk',
    ],
    pal: { k: '#1b1030', w: '#fff0f7', g: '#4a2a63' },
  },
  'icon-ball': {
    rows: [
      '..kkkkk..',
      '.kwwkwwk.',
      'kwwkkkwwk',
      'kwwwkwwwk',
      'kkwwwwwkk',
      'kwwwkwwwk',
      'kwwkkkwwk',
      '.kwwkwwk.',
      '..kkkkk..',
    ],
    pal: { k: '#1b1030', w: '#fff0f7' },
  },
  'icon-globe': {
    rows: [
      '..bbbbb..',
      '.bgggbbb.',
      'bggggbbgb',
      'bbggbbggb',
      'bbbgbbbgb',
      'bbbbbbggb',
      'bgbbbbbbb',
      '.bggbbbb.',
      '..bbbbb..',
    ],
    pal: { b: '#3d8bff', g: '#4ff0c8' },
  },
  'icon-note': {
    rows: [
      '...kkkkk',
      '...kkkkk',
      '...k...k',
      '...k...k',
      '...k...k',
      '.kkk.kkk',
      'kkkkkkkk',
      '.kk..kk.',
    ],
    pal: { k: '#ff4fa0' },
  },
  'icon-flame': {
    rows: [
      '...r...',
      '..rr...',
      '..rrr.r',
      '.rryrrr',
      '.ryyyrr',
      'rryyyyr',
      'ryywyyr',
      'ryywwyr',
      '.ryyyr.',
    ],
    pal: { r: '#ff4f3a', y: '#ffcf4a', w: '#fff6c2' },
  },
  'icon-lock': {
    rows: [
      '..ooo..',
      '.o...o.',
      '.o...o.',
      'ooooooo',
      'oyyyyyo',
      'oyyoyyo',
      'oyyoyyo',
      'ooooooo',
    ],
    pal: { o: '#7a4a00', y: '#ffcf4a' },
  },
  'icon-heart': {
    rows: [
      '.rr.rr.',
      'rrrrrrr',
      'rwrrrrr',
      '.rrrrr.',
      '..rrr..',
      '...r...',
    ],
    pal: { r: '#ff4fa0', w: '#ffd6ea' },
  },
  'icon-sound': {
    rows: [
      '...m.....',
      '..mm..w..',
      'mmmm...w.',
      'mmmm.w.w.',
      'mmmm.w.w.',
      'mmmm...w.',
      '..mm..w..',
      '...m.....',
    ],
    pal: { m: '#4ff0c8', w: '#c9fff0' },
  },
  'icon-mute': {
    rows: [
      '...m.....',
      '..mm.....',
      'mmmm.x.x.',
      'mmmm..x..',
      'mmmm.x.x.',
      'mmmm.....',
      '..mm.....',
      '...m.....',
    ],
    pal: { m: '#c9a3c4', x: '#ff4fa0' },
  },
};

/** Shrimp profile pictures: palette swaps of the hero shrimp. */
export const SHRIMP_VARIANTS = {
  basic: {},
  cleaner: { b: '#ff3b4f', l: '#ffffff', d: '#ffffff', f: '#ff3b4f', g: '#ffffff', a: '#ffffff', r: '#ffffff' },
  blue: { b: '#3d8bff', l: '#a8ccff', d: '#2563d9', f: '#6aa6ff', g: '#8ab8ff', a: '#bcd7ff', r: '#8ab8ff', o: '#0d2752' },
  ghost: { b: '#dfe9f3', l: '#ffffff', d: '#b9c9da', f: '#eef4fa', g: '#cfdbe7', a: '#ffffff', r: '#e7eff7', o: '#6e8296' },
  pistol: { b: '#7fae3f', l: '#c4e38f', d: '#5b8a26', f: '#9cc25e', g: '#a8cf6a', a: '#d8f0b2', r: '#a8cf6a', o: '#22370c' },
  peppermint: { b: '#ffe9ec', l: '#ffffff', d: '#e8263f', f: '#ff4d63', g: '#ff8090', a: '#ff4d63', r: '#e8263f', o: '#7a0f1f' },
  glow: { b: '#29e6ff', l: '#c8fbff', d: '#00a6c7', f: '#7cf6ff', g: '#7cf6ff', a: '#d6fdff', r: '#7cf6ff', o: '#00384a', w: '#ffffff' },
  mantis: { b: '#2fbf71', l: '#ffd166', d: '#ff6b35', f: '#3d8bff', g: '#ff5d8f', a: '#ffd166', r: '#c77dff', o: '#1b2a3a' },
  golden: { b: '#ffc93c', l: '#fff1b8', d: '#e09b12', f: '#ffd966', g: '#ffe08a', a: '#fff1b8', r: '#ffe08a', o: '#6b4300' },
  crowned: { b: '#ffc93c', l: '#fff1b8', d: '#e09b12', f: '#ffd966', g: '#ffe08a', a: '#fff1b8', r: '#ffe08a', o: '#6b4300' },
};

/** Palette swaps for background creatures. */
export const CREATURE_VARIANTS = {
  'fish:reef': { o: '#7a4a00', b: '#ffcf4a', e: '#140612' },
  'fish:blue': { o: '#0d3a63', b: '#3fa9f5', e: '#ffffff' },
  'fish:silver': { o: '#3a4f66', b: '#b8cce0', e: '#0b1520' },
  'fish:deep': { o: '#06101f', b: '#0f1d33', e: '#5c7fa8' },
  'jelly:moon': { o: '#bcd7ff', b: '#9fc0e8', l: '#ffffff', t: '#cfe2ff' },
  'jelly:deep': { o: '#ff4d6d', b: '#b0243f', l: '#ff9fb4', t: '#ff6b85' },
  'squid:pale': { o: '#7a5a6a', b: '#e7c9d6', e: '#140612', t: '#c9a9b8' },
  'manta:bright': { o: '#1d3a5c', b: '#5d8fc2', e: '#ffffff', w: '#cfe2f5' },
  'whale:humpback': { o: '#0f2240', b: '#3f6fa8', e: '#ffffff', w: '#a8c6e8' },
  'shark:deep': { o: '#06101f', b: '#1c2a3d', w: '#3a4a62', e: '#5c7fa8' },
  'puffer:deep': { o: '#3a2a10', b: '#6b5a2a', s: '#4a3a1a', w: '#8a7a4a' },
};

/** The urchin: generated so its spikes radiate evenly. */
export function urchinRows(size = 21) {
  const c = (size - 1) / 2;
  const grid = Array.from({ length: size }, () => Array(size).fill('.'));
  const set = (x, y, ch) => {
    if (x >= 0 && y >= 0 && x < size && y < size) grid[y][x] = ch;
  };
  const spikes = 16;
  for (let i = 0; i < spikes; i++) {
    const ang = (i / spikes) * Math.PI * 2 + 0.2;
    for (let r = 4; r <= c; r += 0.5) {
      const x = Math.round(c + Math.cos(ang) * r);
      const y = Math.round(c + Math.sin(ang) * r);
      set(x, y, r > c - 1.5 ? 't' : 's');
    }
  }
  const R = 5.6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= R) set(x, y, d > R - 1 ? 'o' : 'b');
    }
  }
  set(c - 2, c - 3, 'l');
  set(c - 3, c - 2, 'l');
  set(c - 2, c - 1, 'w'); set(c - 2, c, 'k');
  set(c + 2, c - 1, 'w'); set(c + 2, c, 'k');
  set(c - 1, c + 2, 'm'); set(c, c + 3, 'm'); set(c + 1, c + 2, 'm');
  set(c - 3, c + 1, 'p'); set(c + 3, c + 1, 'p');
  return grid.map((r) => r.join(''));
}

SPRITES.urchin = {
  rows: urchinRows(21),
  pal: { s: '#7b3fe4', t: '#c9a8ff', o: '#2a0f5c', b: '#5b2bbf', l: '#a98bff', w: '#ffffff', k: '#140612', m: '#ff9fd0', p: '#ff7ab8' },
};
