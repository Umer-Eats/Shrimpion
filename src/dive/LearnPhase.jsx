import { useEffect, useRef, useState } from 'react';
import { LEVELS } from '../game/content/index.js';
import { play } from '../audio/sfx.js';

function Highlight({ fact }) {
  const i = fact.f.indexOf(fact.a);
  if (i < 0) return fact.f;
  return (
    <>
      {fact.f.slice(0, i)}
      <mark>{fact.a}</mark>
      {fact.f.slice(i + fact.a.length)}
    </>
  );
}

/** Seven fact cards, no timer. Flip through them, then take the test. */
export default function LearnPhase({ facts, ascentIdx, testName, onReady, draft, onDraft }) {
  const start = Number.isInteger(draft?.i) && draft.i >= 0 && draft.i < facts.length ? draft.i : 0;
  const [i, setI] = useState(start);
  const [seen, setSeen] = useState(
    () => new Set([start, ...(Array.isArray(draft?.seen) ? draft.seen.filter((k) => Number.isInteger(k) && k >= 0 && k < facts.length) : [])]),
  );
  const [list, setList] = useState(false);
  const f = facts[i];
  const allSeen = seen.size >= facts.length;
  const first = useRef(true);

  useEffect(() => {
    setSeen((s) => (s.has(i) ? s : new Set(s).add(i)));
    if (first.current) first.current = false;
    else play('flip');
  }, [i]);

  useEffect(() => {
    onDraft?.({ i, seen: [...seen] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, seen]);

  useEffect(() => {
    const onKey = (e) => {
      if (list) return;
      if (e.key === 'ArrowRight') setI((x) => Math.min(facts.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [facts.length, list]);

  return (
    <section className="panel stage-panel learn">
      <header className="stage-head">
        <p className="kicker">
          Ascent {ascentIdx + 1} of 7 · Learn · {LEVELS[ascentIdx]}
        </p>
        <h2>Seven facts to carry up</h2>
        <p className="muted">No timer. Read each card, then you’ll be tested with <strong>{testName}</strong>.</p>
      </header>

      {list ? (
        <ol className="fact-list">
          {facts.map((fact) => (
            <li key={fact.id}>
              <span className="topic-chip">
                {fact.topic}
              </span>
              <p>
                <Highlight fact={fact} />
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="fact-card" key={f.id}>
          <div className="fact-top">
            <span className="topic-chip">
              {f.topic}
            </span>
            <span className="fact-count">
              {i + 1}/{facts.length}
            </span>
          </div>
          <p className="fact-text">
            <Highlight fact={f} />
          </p>
          <p className="fact-q">
            <span>Remember:</span> {f.q} → <strong>{f.a}</strong>
          </p>
        </div>
      )}

      {!list && (
        <div className="dots" role="tablist" aria-label="Fact cards">
          {facts.map((fact, k) => (
            <button
              key={fact.id}
              role="tab"
              aria-selected={k === i}
              aria-label={`Fact ${k + 1}`}
              className={`dot ${k === i ? 'is-on' : ''} ${seen.has(k) ? 'is-seen' : ''}`}
              onClick={() => setI(k)}
            />
          ))}
        </div>
      )}

      <div className="stage-actions">
        {!list && (
          <>
            <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>
              ◄ Prev
            </button>
            {i < facts.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setI(i + 1)}>
                Next ►
              </button>
            ) : null}
          </>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => {
            play('flip');
            setList((l) => !l);
          }}
        >
          {list ? 'Card view' : 'See all 7'}
        </button>
        {(allSeen || list) && (
          <button
            className="btn btn-ascend"
            onClick={() => {
              play('select');
              onReady();
            }}
          >
            I’m ready, test me ▲
          </button>
        )}
      </div>
    </section>
  );
}
