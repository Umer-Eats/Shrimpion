import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { pastDays, dayNumber, prettyDate, todayKey } from '../game/daily.js';
import { CATEGORIES, categoryName } from '../game/content/index.js';
import { useProgress, actions } from '../data/progress.js';
import { TIER_BY_ID, MAX_DIVE_POINTS } from '../game/tiers.js';
import Icon, { TierIcon } from '../components/Icon.jsx';

export default function Archive() {
  const cat = useProgress((s) => s.category);
  const history = useProgress((s) => s.history);
  const runs = useProgress((s) => s.runs);
  const today = todayKey();
  const days = [today, ...pastDays(today)];

  return (
    <PageShell v={3} kicker="⟲ The logbook" title="Archive" intro="Every past ascent, ready to replay. Archive ascents still teach you facts, but they don’t extend your streak or count on the 7 Seas.">
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
    </PageShell>
  );
}
