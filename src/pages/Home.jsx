import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { scene } from '../scene/sceneStore.js';
import { useProgress, actions, liveStreak } from '../data/progress.js';
import { todayKey, dayNumber, prettyDate } from '../game/daily.js';
import { CATEGORY_BY_ID } from '../game/content/index.js';
import CategoryPicker from '../components/CategoryPicker.jsx';
import { MAX_DIVE_POINTS } from '../game/tiers.js';
import PixelSprite from '../components/PixelSprite.jsx';
import Icon from '../components/Icon.jsx';

export default function Home() {
  const cat = useProgress((s) => s.category);
  const history = useProgress((s) => s.history);
  const runs = useProgress((s) => s.runs);
  const stats = useProgress((s) => s.stats);
  const [picking, setPicking] = useState(false);
  const today = todayKey();
  const id = `daily:${today}:${cat}`;
  const done = history[id];
  const inProgress = runs[id];
  const category = CATEGORY_BY_ID[cat] || CATEGORY_BY_ID.random;
  const streak = liveStreak(stats, today);

  useEffect(() => {
    scene.setPose(0, { dim: 0 });
  }, []);

  return (
    <main className="home">
      <div className="home-title">
        <h1 className="logo" aria-label="Shrimpion">
          <span className="logo-text" data-text="SHRIMPION">
            SHRIMPION
          </span>
        </h1>
        <p className="tagline">THE DAILY ASCENT</p>
        <p className="sub">7 ascents · learn, then prove it · no timers · swim for the surface</p>
      </div>

      <div className="home-actions">
        <Link to={`/dive?cat=${cat}`} className="btn btn-ascend btn-huge">
          ▲ {done ? 'View today’s ascent' : inProgress ? 'Continue ascent' : 'Ascend'} ▲
        </Link>
        <button className="btn btn-cat" onClick={() => setPicking(true)} aria-haspopup="dialog">
          <span className="btn-cat-label">Category</span>
          <span>
            <Icon name={category.icon} /> {category.name}
          </span>
          <span aria-hidden="true">▾</span>
        </button>
        <div className="home-meta">
          <span>ASCENT #{dayNumber(today)}</span>
          <span>{prettyDate(today)}</span>
          {streak > 0 && <span className="streak"><Icon name="icon-flame" /> {streak}-day streak</span>}
          {done && <span className="done-badge">✓ {done.points}/{MAX_DIVE_POINTS}</span>}
        </div>
        <div className="home-links">
          <Link className="btn btn-small" to="/unlimited">
            Unlimited ∞
          </Link>
          <Link className="btn btn-small" to="/archive">
            Archive ⟲
          </Link>
          <Link className="btn btn-small" to="/seas">
            7 Seas ≋
          </Link>
        </div>
      </div>

      <Link to="/urchin-party" className="party-card">
        <span className="party-badge">COMING SOON</span>
        <PixelSprite name="urchin" scale={2} className="party-urchin" />
        <span className="party-copy">
          <strong>URCHIN PARTY</strong>
          <small>learn together with friends</small>
        </span>
      </Link>

      {picking && <CategoryPicker value={cat} onChange={actions.setCategory} onClose={() => setPicking(false)} />}
    </main>
  );
}
