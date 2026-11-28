import { useEffect } from 'react';
import TierReveal from './TierReveal.jsx';
import { TIER_BY_ID, TIERS, ascentMax } from '../game/tiers.js';
import { scene } from '../scene/sceneStore.js';
import Icon, { TierIcon } from '../components/Icon.jsx';

export default function ResultPhase({ result, ascentIdx, isLast, onAscend, testName }) {
  const tier = TIER_BY_ID[result.tier];
  const pct = Math.round((result.correct / Math.max(1, result.total)) * 100);
  const max = result.maxPoints ?? ascentMax(ascentIdx);

  useEffect(() => {
    scene.celebrate(tier.id === 'shrimpion' ? 'shrimpion' : 'bubbles');
  }, [tier.id]);

  return (
    <>
    <TierReveal tier={tier} />
    <section className="panel stage-panel result">
      <p className="kicker">
        Ascent {ascentIdx + 1} of 7 · {testName}
      </p>
      <div className="result-stats">
        <div>
          <span className="stat-num">
            {result.correct}/{result.total}
          </span>
          <span className="stat-label">correct</span>
        </div>
        <div>
          <span className="stat-num">{pct}%</span>
          <span className="stat-label">accuracy</span>
        </div>
        <div>
          <span className="stat-num" style={{ color: tier.color }}>
            +{result.points}
            <small>/{max}</small>
          </span>
          <span className="stat-label">points</span>
        </div>
      </div>

      <div className="tier-ladder" aria-label="Tier requirements">
        {TIERS.map((t) => {
          const isShrimpion = t.id === 'shrimpion';
          const locked = isShrimpion ? !isLast : t.min > max;
          const label = isShrimpion
            ? 'One in a Shrimpion requires 95% or higher on every section of the dive'
            : locked ? `Requires ${t.min} points on a later ascent` : t.name;
          return (
            <span
              key={t.id}
              className={`ladder-step ${t.id === tier.id ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
              style={{ '--tier': t.color }}
              title={label}
            >
              {locked ? <Icon name="icon-lock" /> : <TierIcon tier={t} />} {isShrimpion ? '95% all' : `${t.min}+`}
            </span>
          );
        })}
      </div>
      {tier.id !== 'shrimpion' && (
        <p className="muted small center">
          Score 95% or higher on every section, Surface Exam included, to earn One in a Shrimpion.
        </p>
      )}

      {result.misses?.length > 0 && (
        <details className="review" open={result.misses.length <= 3}>
          <summary>Review what slipped away ({result.misses.length})</summary>
          <ul>
            {result.misses.map((f) => (
              <li key={f.id}>
                <span className="topic-chip small">
                  {f.topic}
                </span>{' '}
                {f.f}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="stage-actions">
        <button className="btn btn-ascend btn-big" onClick={onAscend} autoFocus>
          {isLast ? '▲ Break the surface ▲' : '▲ Ascend ▲'}
        </button>
      </div>
    </section>
    </>
  );
}
