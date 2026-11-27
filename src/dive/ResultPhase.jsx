import { useEffect } from 'react';
import TierReveal from './TierReveal.jsx';
import { TIER_BY_ID, TIERS, ascentMax, topTierFor } from '../game/tiers.js';
import { scene } from '../scene/sceneStore.js';

export default function ResultPhase({ result, ascentIdx, isLast, onAscend, testName }) {
  const tier = TIER_BY_ID[result.tier];
  const pct = Math.round((result.correct / Math.max(1, result.total)) * 100);
  const max = result.maxPoints ?? ascentMax(ascentIdx);
  const top = topTierFor(ascentIdx);

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

      <div className="tier-ladder" aria-label="Tiers by points">
        {TIERS.map((t) => {
          const locked = t.min > max;
          return (
            <span
              key={t.id}
              className={`ladder-step ${t.id === tier.id ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
              style={{ '--tier': t.color }}
              title={locked ? `Needs ${t.min} pts: unlocks on a higher ascent` : t.name}
            >
              <span aria-hidden="true">{locked ? '🔒' : t.emoji}</span> {t.min}+
            </span>
          );
        })}
      </div>
      {top.id !== 'shrimpion' && (
        <p className="muted small center">
          This ascent is worth up to {max} pts. One in a Shrimpion needs {TIER_BY_ID.shrimpion.min}, so keep climbing: the
          higher ascents are worth more.
        </p>
      )}

      {result.misses?.length > 0 && (
        <details className="review" open={result.misses.length <= 3}>
          <summary>Review what slipped away ({result.misses.length})</summary>
          <ul>
            {result.misses.map((f) => (
              <li key={f.id}>
                <span className="topic-chip small">
                  {f.topicEmoji} {f.topic}
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
