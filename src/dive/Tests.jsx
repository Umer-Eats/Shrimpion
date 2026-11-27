import { useEffect, useMemo, useRef, useState } from 'react';
import { isCloseEnough } from '../game/fuzzy.js';

/* ------------------------------------------------------------------ */
/* Shared: one question at a time, immediate feedback, no timer.       */
/* ------------------------------------------------------------------ */

function useSequence(items, onComplete) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // { ok, given }
  const current = items[idx];
  const answered = answers.length > idx;
  const record = (ok, given) => {
    if (answered) return;
    setAnswers((a) => [...a, { ok, given }]);
  };
  const next = () => {
    if (idx + 1 < items.length) setIdx(idx + 1);
    else {
      const correct = answers.filter((a) => a.ok).length;
      onComplete({
        correct,
        total: items.length,
        misses: items.filter((_, i) => !answers[i]?.ok).map((it) => it.fact),
      });
    }
  };
  return { idx, current, answered, last: answers[idx], record, next, answers, isLast: idx === items.length - 1 };
}

function Progress({ idx, total, answers }) {
  return (
    <div className="q-progress" aria-label={`Question ${idx + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`q-dot ${i === idx ? 'is-on' : ''} ${answers[i] ? (answers[i].ok ? 'is-ok' : 'is-bad') : ''}`} />
      ))}
      <span className="q-count">
        {idx + 1}/{total}
      </span>
    </div>
  );
}

function Feedback({ ok, fact, extra }) {
  return (
    <div className={`feedback ${ok ? 'is-ok' : 'is-bad'}`} role="status">
      <strong>{ok ? '✓ Nice — that’s right.' : '✗ Not quite.'}</strong>
      {extra}
      <p className="feedback-fact">
        <span className="topic-chip small">
          {fact.topicEmoji} {fact.topic}
        </span>{' '}
        {fact.f}
      </p>
    </div>
  );
}

function NextButton({ seq }) {
  const ref = useRef(null);
  useEffect(() => {
    if (seq.answered) ref.current?.focus();
  }, [seq.answered]);
  if (!seq.answered) return null;
  return (
    <button ref={ref} className="btn btn-primary" onClick={seq.next}>
      {seq.isLast ? 'See how you did ▲' : 'Next ▶'}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · Tide Match                                                       */
/* ------------------------------------------------------------------ */

const PAIR_COLORS = ['#4ff0c8', '#ff4fa0', '#ffe08a', '#4ade80', '#c77dff', '#ff9f43', '#8affdf'];

export function MatchTest({ test, onComplete }) {
  const [sel, setSel] = useState(null);
  const [pairs, setPairs] = useState({}); // leftId -> rightId
  const [checked, setChecked] = useState(false);
  const order = Object.keys(pairs);
  const colorOf = (leftId) => PAIR_COLORS[order.indexOf(leftId) % PAIR_COLORS.length];
  const rightOwner = (rightId) => Object.keys(pairs).find((l) => pairs[l] === rightId);
  const done = order.length === test.left.length;
  const correct = test.left.filter((l) => pairs[l.id] === l.id).length;

  const pickRight = (rid) => {
    if (checked) return;
    if (!sel) {
      const owner = rightOwner(rid);
      if (owner) {
        const p = { ...pairs };
        delete p[owner];
        setPairs(p);
      }
      return;
    }
    const p = { ...pairs };
    const owner = rightOwner(rid);
    if (owner) delete p[owner];
    p[sel] = rid;
    setPairs(p);
    const nextLeft = test.left.find((l) => !p[l.id]);
    setSel(nextLeft ? nextLeft.id : null);
  };

  return (
    <div className="match">
      <div className="match-cols">
        <div className="match-col">
          <h3 className="col-title">Questions</h3>
          {test.left.map((l) => {
            const paired = pairs[l.id];
            const ok = checked && paired === l.id;
            return (
              <button
                key={l.id}
                className={`match-item ${sel === l.id ? 'is-sel' : ''} ${checked ? (ok ? 'is-ok' : 'is-bad') : ''}`}
                style={paired && !checked ? { borderColor: colorOf(l.id), boxShadow: `inset 4px 0 0 ${colorOf(l.id)}` } : undefined}
                onClick={() => !checked && setSel(l.id)}
                aria-pressed={sel === l.id}
              >
                {l.text}
                {checked && !ok && (
                  <span className="match-fix">
                    → {test.right.find((r) => r.id === l.id).text}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="match-col">
          <h3 className="col-title">Answers</h3>
          {test.right.map((r) => {
            const owner = rightOwner(r.id);
            return (
              <button
                key={r.id}
                className={`match-item answer ${owner ? 'is-paired' : ''}`}
                style={owner && !checked ? { borderColor: colorOf(owner), boxShadow: `inset -4px 0 0 ${colorOf(owner)}` } : undefined}
                onClick={() => pickRight(r.id)}
                disabled={checked}
              >
                {r.text}
              </button>
            );
          })}
        </div>
      </div>
      <p className="muted small center">{sel ? 'Now tap the matching answer.' : done ? 'All paired. Check when ready.' : 'Tap a question to start pairing.'}</p>
      <div className="stage-actions">
        {!checked ? (
          <button className="btn btn-primary" disabled={!done} onClick={() => setChecked(true)}>
            Check my pairs
          </button>
        ) : (
          <>
            <span className="score-chip">
              {correct}/{test.left.length} matched
            </span>
            <button
              className="btn btn-ascend"
              onClick={() =>
                onComplete({
                  correct,
                  total: test.left.length,
                  misses: test.facts.filter((f) => pairs[f.id] !== f.id),
                })
              }
            >
              See how you did ▲
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Truth or Tall Tale                                               */
/* ------------------------------------------------------------------ */

export function TrueFalseTest({ test, onComplete }) {
  const seq = useSequence(test.items, onComplete);
  const it = seq.current;
  const answer = (saysTrue) => seq.record(saysTrue === it.isTrue, saysTrue);
  return (
    <div className="seq">
      <Progress idx={seq.idx} total={test.items.length} answers={seq.answers} />
      <blockquote className="statement">“{it.statement}”</blockquote>
      {!seq.answered ? (
        <div className="choice-row">
          <button className="btn btn-choice tf-true" onClick={() => answer(true)}>
            ✓ True
          </button>
          <button className="btn btn-choice tf-false" onClick={() => answer(false)}>
            ✗ Tall tale
          </button>
        </div>
      ) : (
        <Feedback
          ok={seq.last.ok}
          fact={it.fact}
          extra={<p>{it.isTrue ? 'That one was true.' : 'That one was a tall tale. Here’s the real fact:'}</p>}
        />
      )}
      <div className="stage-actions">
        <NextButton seq={seq} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · Spot the Fake                                                    */
/* ------------------------------------------------------------------ */

export function SpotFakeTest({ test, onComplete }) {
  const seq = useSequence(test.items, onComplete);
  const it = seq.current;
  const [picked, setPicked] = useState(null);
  useEffect(() => setPicked(null), [seq.idx]);
  return (
    <div className="seq">
      <Progress idx={seq.idx} total={test.items.length} answers={seq.answers} />
      <p className="prompt">Which of these three facts has been tampered with?</p>
      <div className="option-stack">
        {it.options.map((o, k) => {
          const state = seq.answered ? (o.fake ? 'is-bad-fake' : k === picked ? 'is-wrong' : 'is-real') : '';
          return (
            <button
              key={k}
              className={`option option-long ${state} ${k === picked ? 'is-picked' : ''}`}
              disabled={seq.answered}
              onClick={() => {
                setPicked(k);
                seq.record(o.fake, k);
              }}
            >
              <span className="opt-letter">{'ABC'[k]}</span>
              {o.text}
              {seq.answered && o.fake && <span className="tag tag-fake">FAKE</span>}
            </button>
          );
        })}
      </div>
      {seq.answered && <Feedback ok={seq.last.ok} fact={it.fact} extra={<p>The real version:</p>} />}
      <div className="stage-actions">
        <NextButton seq={seq} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · Fill the Gap                                                     */
/* ------------------------------------------------------------------ */

export function FillTest({ test, onComplete }) {
  const seq = useSequence(test.items, onComplete);
  const it = seq.current;
  const [val, setVal] = useState('');
  const [hint, setHint] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    setVal('');
    setHint(false);
    inputRef.current?.focus();
  }, [seq.idx]);
  const [before, after] = it.text.split('_____');
  return (
    <div className="seq">
      <Progress idx={seq.idx} total={test.items.length} answers={seq.answers} />
      <p className="statement fill-statement">
        {before}
        <span className="blank">{seq.answered ? it.fact.a : '_____'}</span>
        {after}
      </p>
      {!seq.answered ? (
        <form
          className="fill-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!val.trim()) return;
            seq.record(isCloseEnough(val, it.fact.a), val);
          }}
        >
          <input
            ref={inputRef}
            className="fill-input"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="type the missing piece…"
            aria-label="Your answer"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btn-primary" type="submit">
            Check
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setHint(true)} disabled={hint}>
            Hint
          </button>
          {hint && <p className="hint">Starts like: <code>{it.hint}</code></p>}
        </form>
      ) : (
        <Feedback
          ok={seq.last.ok}
          fact={it.fact}
          extra={!seq.last.ok && <p>You wrote “{seq.last.given}”. The answer is <strong>{it.fact.a}</strong>.</p>}
        />
      )}
      <div className="stage-actions">
        <NextButton seq={seq} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5 · Letter Tiles                                                     */
/* ------------------------------------------------------------------ */

export function TilesTest({ test, onComplete }) {
  const seq = useSequence(test.items, onComplete);
  const it = seq.current;
  // Placed tile ids, tagged with the question they belong to so a stale list from the
  // previous question is never read against the new question's tiles.
  const [placement, setPlacement] = useState({ idx: seq.idx, ids: [] });
  const placed = placement.idx === seq.idx ? placement.ids : [];
  const setPlaced = (fn) => setPlacement((p) => ({ idx: seq.idx, ids: fn(p.idx === seq.idx ? p.ids : []) }));
  const slotsNeeded = it.tiles.length;
  const built = placed.map((id) => it.tiles.find((t) => t.id === id)?.ch ?? '');
  const preview = useMemo(() => {
    let k = 0;
    return it.layout.map((c) => (c === ' ' ? ' ' : built[k++] ?? ''));
  }, [it, built]);

  useEffect(() => {
    if (!seq.answered && placed.length === slotsNeeded && slotsNeeded > 0) {
      const guess = preview.join('');
      seq.record(guess.toLowerCase() === it.fact.a.toLowerCase(), guess);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  return (
    <div className="seq">
      <Progress idx={seq.idx} total={test.items.length} answers={seq.answers} />
      <p className="prompt">{it.fact.q}</p>
      <div className={`slots ${seq.answered ? (seq.last.ok ? 'is-ok' : 'is-bad') : ''}`} aria-live="polite">
        {preview.map((c, k) =>
          it.layout[k] === ' ' ? (
            <span key={k} className="slot-gap" />
          ) : (
            <span key={k} className={`slot ${c ? 'is-filled' : ''}`}>
              {c}
            </span>
          ),
        )}
      </div>
      {!seq.answered ? (
        <>
          <div className="tiles">
            {it.tiles.map((t) => (
              <button key={t.id} className="tile" disabled={placed.includes(t.id)} onClick={() => setPlaced((p) => [...p, t.id])}>
                {t.ch}
              </button>
            ))}
          </div>
          <div className="stage-actions">
            <button className="btn btn-ghost" disabled={!placed.length} onClick={() => setPlaced((p) => p.slice(0, -1))}>
              ⌫ Undo
            </button>
            <button className="btn btn-ghost" disabled={!placed.length} onClick={() => setPlaced(() => [])}>
              Clear
            </button>
          </div>
        </>
      ) : (
        <Feedback ok={seq.last.ok} fact={it.fact} extra={!seq.last.ok && <p>It spells <strong>{it.fact.a}</strong>.</p>} />
      )}
      <div className="stage-actions">
        <NextButton seq={seq} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6 · Reverse Reef  &  7 · Surface Exam (multiple choice)             */
/* ------------------------------------------------------------------ */

function ChoiceTest({ test, onComplete, mode }) {
  const seq = useSequence(test.items, onComplete);
  const it = seq.current;
  const [picked, setPicked] = useState(null);
  useEffect(() => setPicked(null), [seq.idx]);

  useEffect(() => {
    const onKey = (e) => {
      if (seq.answered) return;
      const n = Number(e.key);
      if (n >= 1 && n <= it.options.length) choose(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const isRight = (opt) => (mode === 'reverse' ? opt.id === it.fact.id : opt === it.fact.a);
  const label = (opt) => (mode === 'reverse' ? opt.text : opt);
  const choose = (k) => {
    if (seq.answered) return;
    setPicked(k);
    seq.record(isRight(it.options[k]), k);
  };

  return (
    <div className="seq">
      <Progress idx={seq.idx} total={test.items.length} answers={seq.answers} />
      {mode === 'reverse' ? (
        <>
          <p className="prompt">This is the answer…</p>
          <p className="big-answer">{it.fact.a}</p>
          <p className="prompt">…which question does it belong to?</p>
        </>
      ) : (
        <>
          <span className="topic-chip">
            {it.fact.topicEmoji} {it.fact.topic}
          </span>
          <p className="prompt prompt-big">{it.fact.q}</p>
        </>
      )}
      <div className={mode === 'reverse' ? 'option-stack' : 'option-grid'}>
        {it.options.map((opt, k) => {
          const right = isRight(opt);
          const state = seq.answered ? (right ? 'is-real' : k === picked ? 'is-wrong' : 'is-dim') : '';
          return (
            <button key={k} className={`option ${mode === 'reverse' ? 'option-long' : ''} ${state}`} disabled={seq.answered} onClick={() => choose(k)}>
              <span className="opt-letter">{k + 1}</span>
              {label(opt)}
            </button>
          );
        })}
      </div>
      {seq.answered && <Feedback ok={seq.last.ok} fact={it.fact} />}
      <div className="stage-actions">
        <NextButton seq={seq} />
      </div>
    </div>
  );
}

export const ReverseTest = (p) => <ChoiceTest {...p} mode="reverse" />;
export const FinalTest = (p) => <ChoiceTest {...p} mode="mc" />;

export const TEST_COMPONENTS = {
  match: MatchTest,
  truefalse: TrueFalseTest,
  spotfake: SpotFakeTest,
  fill: FillTest,
  tiles: TilesTest,
  reverse: ReverseTest,
  final: FinalTest,
};
