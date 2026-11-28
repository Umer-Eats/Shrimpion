import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import ArchiveReview, { ArchiveDate } from './ArchiveReview.jsx';
import { pastDays, dayNumber, prettyDate, todayKey } from '../game/daily.js';
import { hasDailyPlan } from '../game/plan.js';
import { CATEGORIES, categoryName } from '../game/content/index.js';
import { useProgress, actions } from '../data/progress.js';
import { TIER_BY_ID, MAX_DIVE_POINTS } from '../game/tiers.js';
import Icon, { TierIcon } from '../components/Icon.jsx';

export default function Archive() {
  const [params] = useSearchParams();
  const cat = useProgress((s) => s.category);
  const history = useProgress((s) => s.history);
  const runs = useProgress((s) => s.runs);
  const reviewId = params.get('review');
  // braces matter: newer browsers return a Promise from scrollTo, and React would call it as the cleanup
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [reviewId]);
  if (reviewId) return <ArchiveReview key={reviewId} record={Object.hasOwn(history, reviewId) ? history[reviewId] : null} />;

  const ascents = Object.values(history).filter((record) => record.mode === 'daily')
    .sort((a, b) => (b.at || Date.parse(b.date)) - (a.at || Date.parse(a.date)) || b.date.localeCompare(a.date));
  const today = todayKey();
  const days = [today, ...pastDays(today)].filter((date) => hasDailyPlan(date) || runs[`daily:${date}:${cat}`]);

  return (
    <PageShell v={3} kicker="⟲ The logbook" title="Archive" intro="Review your finished ascents or play a past daily ascent for practice.">
      <section className="archive-section" aria-labelledby="your-ascents">
        <h2 id="your-ascents">Your ascents</h2>
        {ascents.length ? (
          <ul className="archive-list">
            {ascents.map((record) => (
              <li key={record.id}>
                <Link className="archive-row archive-record" to={`/archive?review=${encodeURIComponent(record.id)}`}>
                  <strong>{categoryName(record.cat)}</strong>
                  <span className="archive-record-date"><ArchiveDate record={record} /></span>
                  <span className="mini-tiers">
                    {record.tiers?.map((tier, i) => <TierIcon key={i} tier={TIER_BY_ID[tier]} />)}
                  </span>
                  <span className="archive-status">{record.points}/{MAX_DIVE_POINTS} pts <span aria-hidden="true">→</span></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Finish a daily ascent to review it here.</p>}
      </section>
      <section className="archive-section" aria-labelledby="daily-ascents">
        <h2 id="daily-ascents">Daily ascents</h2>
        <p className="muted">Past daily ascents are practice. They don’t extend your streak or count on the 7 Seas.</p>
        <div className="chip-row" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c.id} role="radio" aria-checked={cat === c.id} className={`chip ${cat === c.id ? 'is-on' : ''}`} onClick={() => actions.setCategory(c.id)}>
              <Icon name={c.icon} /> {c.name}
            </button>
          ))}
        </div>
        <ul className="archive-list">
          {days.map((d) => {
            const id = `daily:${d}:${cat}`;
            const rec = history[id];
            const going = runs[id];
            return (
              <li key={d}>
                <Link to={`/dive?cat=${cat}&date=${d}`} className="archive-row">
                  <span className="archive-num">#{dayNumber(d)}</span>
                  <span className="archive-date">
                    {prettyDate(d)}
                    {d === today && <em> · today</em>}
                  </span>
                  <span className="archive-cat">{categoryName(cat)}</span>
                  <span className="archive-status">
                    {rec ? (
                      <>
                        <span className="mini-tiers" aria-hidden="true">
                          {rec.tiers.map((t, i) => <TierIcon key={i} tier={TIER_BY_ID[t]} />)}
                        </span>
                        {rec.points}/{MAX_DIVE_POINTS}
                      </>
                    ) : going ? (
                      'in progress ▲'
                    ) : (
                      'ascend ▲'
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </PageShell>
  );
}
