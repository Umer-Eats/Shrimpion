import { useEffect, useRef } from 'react';
import { scene } from '../scene/sceneStore.js';
import { depthAtV, zoneFor } from '../scene/depth.js';
import { TIER_BY_ID } from '../game/tiers.js';

/** Depth gauge, ascent pips and points, Krillion-style, but counting upward. */
export default function DiveHUD({ results, current, points, total = 7, label }) {
  const depthRef = useRef(null);
  const zoneRef = useRef(null);

  useEffect(() => {
    let raf;
    const loop = () => {
      const d = Math.round(depthAtV(scene.camV));
      if (depthRef.current) depthRef.current.textContent = `${d.toLocaleString()}m`;
      if (zoneRef.current) zoneRef.current.textContent = zoneFor(d);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hud">
      <div className="hud-box">
        <span className="hud-label">Depth</span>
        <span className="hud-value" ref={depthRef}>
          10,935m
        </span>
        <span className="hud-sub" ref={zoneRef}>
          HADAL ZONE
        </span>
      </div>
      <div className="hud-pips" aria-label={`Ascent ${Math.min(current + 1, total)} of ${total}`}>
        <div className="pips">
          {Array.from({ length: total }, (_, i) => {
            const r = results[i];
            const tier = r && TIER_BY_ID[r.tier];
            return (
              <span
                key={i}
                className={`pip ${i === current ? 'is-current' : ''} ${r ? 'is-done' : ''}`}
                style={tier ? { background: tier.color, borderColor: tier.color } : undefined}
                title={r ? `${tier.name} · ${r.points} pts` : undefined}
              />
            );
          })}
        </div>
        <span className="hud-label">{label}</span>
      </div>
      <div className="hud-box hud-right">
        <span className="hud-label">Points</span>
        <span className="hud-value hud-points">{points}</span>
      </div>
    </div>
  );
}
