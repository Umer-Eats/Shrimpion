// A tiny imperative controller for the persistent ocean canvas.
// Pages tell the scene where the camera should sit; the dive tells it when to swim.

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const scene = {
  camV: 0,
  velocity: 0, // stops per second (positive = rising)
  dim: 0,
  targetDim: 0,
  shrimpVisible: true,
  shrimpVariant: 'basic',
  travel: null, // { from, to, start, dur, resolve }
  bursts: [],

  /** Snap (or glide gently) to a resting depth. */
  setPose(v, { dim = 0, shrimp = true, glide = true } = {}) {
    this.targetDim = dim;
    this.shrimpVisible = shrimp;
    if (this.travel) return;
    if (!glide || Math.abs(v - this.camV) > 2.5) {
      this.camV = v;
    } else if (Math.abs(v - this.camV) > 0.001) {
      this.travelTo(v, 900);
    }
  },

  /** Animate the camera to a new stop. Resolves when the swim is done. */
  travelTo(v, dur = 3600) {
    return new Promise((resolve) => {
      if (this.travel) this.travel.resolve();
      this.travel = { from: this.camV, to: v, start: performance.now(), dur, resolve };
    });
  },

  celebrate(kind = 'bubbles') {
    this.bursts.push({ kind, t: performance.now() });
  },

  tick(now) {
    const prev = this.camV;
    if (this.travel) {
      const { from, to, start, dur, resolve } = this.travel;
      const t = Math.min(1, (now - start) / dur);
      this.camV = from + (to - from) * ease(t);
      if (t >= 1) {
        this.camV = to;
        this.travel = null;
        resolve();
      }
    }
    this.dim += (this.targetDim - this.dim) * 0.08;
    return prev;
  },

  get swimming() {
    return Boolean(this.travel);
  },
};
