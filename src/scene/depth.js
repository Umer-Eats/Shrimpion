// The world is measured in "stops" (v). v = 0 is the trench floor, v = 7 is just under the surface.
// Each completed ascent swims you up one stop.

export const STOPS = [10935, 8000, 6000, 4000, 2000, 1000, 200, 0];
export const MAX_V = STOPS.length - 1; // 7
export const WATERLINE_V = MAX_V + 0.42;
export const FLOOR_V = -0.36;

export function depthAtV(v) {
  if (v <= 0) return STOPS[0];
  if (v >= MAX_V) return 0;
  const i = Math.floor(v);
  const t = v - i;
  return STOPS[i] + (STOPS[i + 1] - STOPS[i]) * t;
}

export function vAtDepth(d) {
  if (d >= STOPS[0]) return 0;
  if (d <= 0) return MAX_V;
  for (let i = 0; i < MAX_V; i++) {
    if (d <= STOPS[i] && d >= STOPS[i + 1]) {
      return i + (STOPS[i] - d) / (STOPS[i] - STOPS[i + 1]);
    }
  }
  return MAX_V;
}

export function zoneFor(depth) {
  if (depth <= 0.5) return 'THE SURFACE';
  if (depth <= 200) return 'SUNLIGHT ZONE';
  if (depth <= 1000) return 'TWILIGHT ZONE';
  if (depth <= 4000) return 'MIDNIGHT ZONE';
  if (depth <= 6000) return 'ABYSSAL ZONE';
  return 'HADAL ZONE';
}

/** Depth markers drawn along the ruler. */
export const MARKERS = [
  { d: 10935, t: 'challenger deep — the bottom of the ocean' },
  { d: 9900, t: 'amphipods scavenge in total darkness' },
  { d: 8336, t: 'deepest fish ever filmed: a snailfish' },
  { d: 6000, t: '── THE HADAL ZONE · named for Hades', zone: true },
  { d: 5200, t: 'pressure here: ~500x the surface' },
  { d: 4000, t: '── THE ABYSSAL ZONE · near freezing', zone: true },
  { d: 3800, t: 'the Titanic rests near here' },
  { d: 2992, t: 'deepest mammal dive: a Cuvier’s beaked whale' },
  { d: 2200, t: 'dumbo octopuses hover over the mud' },
  { d: 1500, t: 'anglerfish dangle glowing lures' },
  { d: 1000, t: '── THE MIDNIGHT ZONE · no sunlight at all', zone: true },
  { d: 700, t: 'vampire squid drift in low-oxygen water' },
  { d: 564, t: 'emperor penguin record dive — 564m' },
  { d: 400, t: 'lanternfish rise to feed every night' },
  { d: 200, t: '── THE TWILIGHT ZONE ends · sunlight begins', zone: true },
  { d: 100, t: 'sea turtles cruise the blue' },
  { d: 40, t: 'recreational scuba limit — 40m' },
  { d: 0, t: '── THE SURFACE · breathe!', zone: true },
];
