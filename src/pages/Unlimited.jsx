import { useEffect, useState } from 'react';
import DiveRunner from '../dive/DiveRunner.jsx';
import { useProgress, actions } from '../data/progress.js';
import { CATEGORIES } from '../game/content/index.js';
import { scene } from '../scene/sceneStore.js';

export default function Unlimited() {
  const savedCat = useProgress((s) => s.category);
  const runs = useProgress((s) => s.runs);
  const best = useProgress((s) => s.stats.unlimitedBest);
  const [cat, setCat] = useState(savedCat);
  const [started, setStarted] = useState(false);
  const active = runs[`unlimited:${cat}`];

  useEffect(() => {
    if (!started && !active) scene.setPose(0, { dim: 0.4 });
  }, [started, active]);

  if (started || active) return <DiveRunner mode="unlimited" cat={cat} />;

  return (
    <main className="stage">
      <section className="panel stage-panel unlimited-intro">
        <p className="kicker">Unlimited ∞</p>
        <h2>The Endless Ascent</h2>
        <p>
          Seven ascents make a block. Break the surface, then dive straight back down for seven new topics. Every block’s surface
          exam pulls in seven more questions from the blocks before it: 14, then 21, then 28, and so on for as long as you keep
          swimming.
        </p>
        <p className="muted">Your total points are your score. Bank a run whenever you like; your best run counts on the 7 Seas.</p>
        <div className="chip-row" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c.id} role="radio" aria-checked={cat === c.id} className={`chip ${cat === c.id ? 'is-on' : ''}`} onClick={() => setCat(c.id)}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
        <div className="stage-actions">
          <button
            className="btn btn-ascend btn-big"
            onClick={() => {
              actions.setCategory(cat);
              setStarted(true);
            }}
          >
            ▲ Start ascending ▲
          </button>
        </div>
        {best > 0 && <p className="muted center">Your best run: {best} points</p>}
      </section>
    </main>
  );
}
