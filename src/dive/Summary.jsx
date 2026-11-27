import { useState } from 'react';
import { Link } from 'react-router-dom';
import TierReveal from './TierReveal.jsx';
import { TIER_BY_ID, tierFor, MAX_DIVE_POINTS } from '../game/tiers.js';
import { categoryName } from '../game/content/index.js';
import { dayNumber, todayKey } from '../game/daily.js';

/** Shown when you break the surface on a daily or archive ascent. */
export default function Summary({ record, submitted, signedIn, onSignIn }) {
  const [copied, setCopied] = useState(false);
  const pct = record.total ? Math.round((record.correct / record.total) * 100) : 0;
  const overall = tierFor(pct);
  const isToday = record.date === todayKey();

  const shareText = [
    `Shrimpion #${dayNumber(record.date)} · ${categoryName(record.cat)}`,
    `${record.tiers.map((t) => TIER_BY_ID[t]?.emoji || '⬛').join('')} ${record.points}/${MAX_DIVE_POINTS}`,
    `${pct}% accuracy · learned ${record.learned} facts`,
    window.location.origin,
  ].join('\n');

  return (
    <section className="panel stage-panel summary">
      <p className="kicker">
        Shrimpion #{dayNumber(record.date)} · {categoryName(record.cat)} {isToday ? '' : '· archive'}
      </p>
      <h2 className="surfaced">SURFACED!</h2>
      <TierReveal tier={overall} />
      <div className="result-stats">
        <div>
          <span className="stat-num">
            {record.points}
            <small>/{MAX_DIVE_POINTS}</small>
          </span>
          <span className="stat-label">points</span>
        </div>
        <div>
          <span className="stat-num">{pct}%</span>
          <span className="stat-label">accuracy</span>
        </div>
        <div>
          <span className="stat-num">{record.learned}</span>
          <span className="stat-label">facts learned</span>
        </div>
      </div>
      <div className="ascent-row">
        {record.tiers.map((t, i) => (
          <span key={i} className="ascent-cell" style={{ '--tier': TIER_BY_ID[t]?.color }} title={TIER_BY_ID[t]?.name}>
            <span aria-hidden="true">{TIER_BY_ID[t]?.emoji}</span>
            <small>{record.perAscent?.[i] ?? ''}</small>
          </span>
        ))}
      </div>
      {isToday && record.mode === 'daily' && (
        <p className="muted center">
          {submitted
            ? 'Your score is on today’s 7 Seas leaderboard.'
            : signedIn
              ? 'Saving to the 7 Seas…'
              : 'Sign in to put this score on the 7 Seas.'}
        </p>
      )}
      <div className="stage-actions">
        <button
          className="btn btn-primary"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ text: shareText });
              else {
                await navigator.clipboard.writeText(shareText);
                setCopied(true);
              }
            } catch {
              /* share sheet dismissed */
            }
          }}
        >
          {copied ? 'Copied!' : 'Share'}
        </button>
        {!signedIn && (
          <button className="btn btn-save" onClick={onSignIn}>
            Save your progress
          </button>
        )}
        <Link className="btn" to="/seas">
          7 Seas ≋
        </Link>
        <Link className="btn" to="/unlimited">
          Unlimited ∞
        </Link>
        <Link className="btn btn-ghost" to="/archive">
          Archive ⟲
        </Link>
      </div>
      <p className="muted small center">A new ascent surfaces at midnight ET.</p>
    </section>
  );
}
