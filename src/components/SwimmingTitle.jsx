import { useEffect, useRef } from 'react';

const WORD = 'SHRIMPION';
const HOLD_MS = 2000; // sit in the center first
const KICK_S = 0.6; // how long each paddle pushes
const MAX_TILT = 10; // degrees
const EDGE = 10; // px kept clear of the screen edges
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * The home title. It holds still in the center for two seconds, then drifts around the page
 * the way a shrimp swims: a soft paddle that eases in and out, a long glide, another paddle,
 * and once in a while a gentle backward scoot. The letters ripple like swimmerets and the
 * word leans slightly toward where it's heading. You can grab it, drag it anywhere on screen,
 * and fling it. It always stays fully on screen and never adds a scrollbar.
 */
export default function SwimmingTitle() {
  const wrapRef = useRef(null);
  const letterRefs = useRef([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let base = null;
    const measure = () => {
      const prev = wrap.style.transform;
      wrap.style.transform = 'none';
      const r = wrap.getBoundingClientRect();
      base = { left: r.left + window.scrollX, top: r.top + window.scrollY, w: r.width, h: r.height };
      wrap.style.transform = prev;
    };
    measure();

    // Keep the whole word on screen, including the extra room its tilt, curl and letter
    // ripple take up. On narrow screens the tilt is reduced so the word still fits.
    let maxTilt = MAX_TILT;
    const bounds = () => {
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const sx = window.scrollX;
      const sy = window.scrollY;
      const { w, h } = base;
      const fitTilt = (deg) => {
        const r = (deg * Math.PI) / 180;
        const padX = (w * (Math.cos(r) - 1) + h * Math.sin(r)) / 2 + h * Math.tan((4 * Math.PI) / 180) / 2;
        const padY = (w * Math.sin(r) + h * (Math.cos(r) - 1)) / 2 + h * 0.03 + 6;
        return { padX: Math.max(0, padX) + EDGE, padY: padY + EDGE };
      };
      maxTilt = MAX_TILT;
      let pad = fitTilt(maxTilt);
      while (maxTilt > 0 && w + pad.padX * 2 > vw) pad = fitTilt((maxTilt = Math.max(0, maxTilt - 2)));
      const topBar = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 56;
      const xMin = sx - base.left + pad.padX;
      const xMax = sx + vw - base.left - w - pad.padX;
      const yMin = sy - base.top + topBar + pad.padY; // stay below the top bar
      const yMax = sy + vh - base.top - h - pad.padY;
      // a screen too small for the word: hold it centered on that axis
      const midX = (sx + vw / 2) - base.left - w / 2;
      return {
        xMin: xMax < xMin ? midX : xMin,
        xMax: xMax < xMin ? midX : xMax,
        yMin,
        yMax: Math.max(yMin, yMax),
      };
    };

    const s = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      face: 1,
      kickAt: -10,
      nextKick: 0,
      target: null,
      flip: false,
      thrust: null,
      dragging: false, // the user is holding it
      touched: false, // the user grabbed it before the 2s hold ended
      grab: null,
      samples: [],
    };
    const start = performance.now();
    let last = start;
    let raf = 0;

    const pickTarget = (b) => ({ x: rand(b.xMin, b.xMax), y: rand(b.yMin, b.yMax) });

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      const swimming = now - start > HOLD_MS || s.touched;
      const b = bounds();

      if (swimming && !s.dragging) {
        // kick: a gentle paddle toward the target; once in a while a mild backward scoot
        if (t >= s.nextKick) {
          if (!s.target || Math.hypot(s.target.x - s.x, s.target.y - s.y) < 80 || Math.random() < 0.2) s.target = pickTarget(b);
          const dx = s.target.x - s.x;
          const dy = s.target.y - s.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = Math.hypot(s.vx, s.vy);
          s.flip = sp > 40 && Math.random() < 0.06;
          if (s.flip) {
            s.thrust = { ax: (-s.vx / sp) * 220, ay: (-s.vy / sp) * 220 };
            s.nextKick = t + rand(1.8, 2.6);
          } else {
            const power = rand(110, 170);
            s.thrust = { ax: (dx / d) * power, ay: (dy / d) * power * 0.8 };
            s.nextKick = t + rand(1.3, 2.4);
          }
          s.kickAt = t;
        }
        // the push ramps up and fades over ~0.6s instead of snapping
        const kt = t - s.kickAt;
        if (s.thrust && kt < KICK_S) {
          const env = Math.sin((kt / KICK_S) * Math.PI) * (Math.PI / 2 / KICK_S);
          s.vx += s.thrust.ax * env * dt;
          s.vy += s.thrust.ay * env * dt;
        }
        // glide: water drag slows it down between kicks
        const drag = Math.exp(-dt * 1.1);
        s.vx *= drag;
        s.vy *= drag;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        // soft walls (the word never leaves the screen)
        if (s.x < b.xMin) (s.x = b.xMin), (s.vx = Math.abs(s.vx) * 0.3);
        if (s.x > b.xMax) (s.x = b.xMax), (s.vx = -Math.abs(s.vx) * 0.3);
        if (s.y < b.yMin) (s.y = b.yMin), (s.vy = Math.abs(s.vy) * 0.3);
        if (s.y > b.yMax) (s.y = b.yMax), (s.vy = -Math.abs(s.vy) * 0.3);
      }

      const speed = Math.hypot(s.vx, s.vy);
      if (Math.abs(s.vx) > 15) s.face = s.vx > 0 ? 1 : -1;
      // a slight tilt so the leading end of the word points where it's going (text stays readable)
      const want = speed > 10 ? clamp((Math.atan2(s.vy * s.face, Math.abs(s.vx) + 60) * 180) / Math.PI, -maxTilt, maxTilt) : 0;
      s.angle += (want - s.angle) * Math.min(1, dt * 2.5);
      // a soft body curl that swells and settles with each paddle
      const kt2 = t - s.kickAt;
      const k = swimming && !s.dragging && kt2 < KICK_S * 1.6 ? Math.sin((kt2 / (KICK_S * 1.6)) * Math.PI) : 0;
      const curl = s.flip ? 0.06 : 0.035;
      const scx = 1 - curl * k;
      const scy = 1 + curl * 0.7 * k;
      const skew = -s.face * (s.flip ? 4 : 2) * k;
      const apply = () => {
        wrap.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) rotate(${s.angle.toFixed(2)}deg) skewX(${skew.toFixed(2)}deg) scale(${scx.toFixed(3)}, ${scy.toFixed(3)})`;
      };
      apply();
      // safety net: measure the real on-screen box and nudge it back inside before this frame paints
      const r = wrap.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const topLimit = (document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 56) + 4;
      let nx = 0;
      let ny = 0;
      if (r.width < vw - EDGE * 2) {
        if (r.left < EDGE) nx = EDGE - r.left;
        else if (r.right > vw - EDGE) nx = vw - EDGE - r.right;
      }
      if (r.top < topLimit) ny = topLimit - r.top;
      else if (r.bottom > window.innerHeight - EDGE) ny = window.innerHeight - EDGE - r.bottom;
      if (nx || ny) {
        s.x += nx;
        s.y += ny;
        if (!s.dragging) {
          if (nx) s.vx = Math.sign(nx) * Math.abs(s.vx) * 0.3;
          if (ny) s.vy = Math.sign(ny) * Math.abs(s.vy) * 0.3;
        }
        apply();
      }

      // swimmerets: a wave runs from head to tail, stronger at speed (and a wriggle when held)
      const amp = s.dragging ? 2.5 : swimming ? 1 + Math.min(speed / 70, 3) : 1;
      const freq = s.dragging ? 6 : swimming ? 3.5 + Math.min(speed / 60, 3) : 2.5;
      const n = WORD.length;
      letterRefs.current.forEach((el, i) => {
        if (!el) return;
        const fromHead = s.face > 0 ? n - 1 - i : i;
        const ph = t * freq - fromHead * 0.7;
        el.style.transform = `translateY(${(Math.sin(ph) * amp).toFixed(2)}px) rotate(${(Math.cos(ph) * amp * 0.9).toFixed(2)}deg)`;
      });
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      measure();
      const b = bounds();
      s.x = clamp(s.x, b.xMin, b.xMax);
      s.y = clamp(s.y, b.yMin, b.yMax);
      s.target = null;
    };
    window.addEventListener('resize', onResize);

    // drag it anywhere on screen; let go and it glides off with the speed of your throw
    const track = (e) => {
      const nowMs = performance.now();
      s.samples.push({ x: e.clientX, y: e.clientY, t: nowMs });
      while (s.samples.length > 2 && nowMs - s.samples[0].t > 100) s.samples.shift();
      const a = s.samples[0];
      const z = s.samples[s.samples.length - 1];
      const span = (z.t - a.t) / 1000;
      if (span > 0.008) {
        s.vx = (z.x - a.x) / span;
        s.vy = (z.y - a.y) / span;
      }
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      wrap.setPointerCapture?.(e.pointerId);
      s.dragging = true;
      s.touched = true;
      s.thrust = null;
      s.grab = { dx: e.clientX - s.x, dy: e.clientY - s.y };
      s.samples = [];
      s.vx = 0;
      s.vy = 0;
      track(e);
      wrap.classList.add('is-dragging');
    };
    const onMove = (e) => {
      if (!s.dragging) return;
      const b = bounds();
      s.x = clamp(e.clientX - s.grab.dx, b.xMin, b.xMax);
      s.y = clamp(e.clientY - s.grab.dy, b.yMin, b.yMax);
      track(e);
    };
    const onUp = (e) => {
      if (!s.dragging) return;
      s.dragging = false;
      wrap.releasePointerCapture?.(e.pointerId);
      wrap.classList.remove('is-dragging');
      const sp = Math.hypot(s.vx, s.vy);
      const cap = 520;
      if (sp > cap) {
        s.vx *= cap / sp;
        s.vy *= cap / sp;
      }
      const t = (performance.now() - start) / 1000;
      s.kickAt = t - KICK_S * 2; // no curl right after letting go
      s.nextKick = t + rand(1.4, 2.2); // glide first, then carry on swimming
      s.target = null;
    };
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <h1 className="logo" aria-label="Shrimpion">
      <span className="logo-swimmer" ref={wrapRef} aria-hidden="true">
        <span className="logo-text">
          {WORD.split('').map((ch, i) => (
            <span key={i} className="swim-letter" ref={(el) => (letterRefs.current[i] = el)}>
              {ch}
            </span>
          ))}
        </span>
      </span>
    </h1>
  );
}
