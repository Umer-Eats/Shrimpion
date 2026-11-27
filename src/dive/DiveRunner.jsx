import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DiveHUD from './DiveHUD.jsx';
import LearnPhase from './LearnPhase.jsx';
import ResultPhase from './ResultPhase.jsx';
import Summary from './Summary.jsx';
import TierReveal from './TierReveal.jsx';
import { TEST_COMPONENTS } from './Tests.jsx';
import { dailyPlan, unlimitedBlock, learnFacts, finalFacts, LEARN_ASCENTS, TOPICS_PER_DIVE } from '../game/plan.js';
import { buildTest, testTypeForAscent } from '../game/tests.js';
import { tierForPoints, tierForDive, pointsFor, ascentMax } from '../game/tiers.js';
import { FACT_BY_ID, categoryName, LEVELS } from '../game/content/index.js';
import { dayNumber, todayKey } from '../game/daily.js';
import { randomId } from '../game/rng.js';
import { actions, useProgress, getProgress } from '../data/progress.js';
import { scene } from '../scene/sceneStore.js';
import { depthAtV, zoneFor, MAX_V } from '../scene/depth.js';
import { useAuth } from '../firebase/AuthContext.jsx';
import { submitDailyScore, submitUnlimited } from '../firebase/api.js';
import { play } from '../audio/sfx.js';

const ASCENT_MS = 3800;
const DESCENT_MS = 2600;

function newRun(mode, { date, cat, id }) {
  if (mode === 'daily') {
    const plan = dailyPlan(date, cat);
    return { ...plan, block: 0, ascent: 0, phase: 'learn', results: [], started: Date.now() };
  }
  const seed = `unl|${randomId()}`;
  return {
    id,
    mode: 'unlimited',
    cat,
    seed,
    blocks: [unlimitedBlock(seed, cat, 0)],
    block: 0,
    ascent: 0,
    phase: 'learn',
    results: [],
    started: Date.now(),
  };
}

export default function DiveRunner({ mode, date, cat }) {
  const id = mode === 'daily' ? `daily:${date}:${cat}` : `unlimited:${cat}`;
  const auth = useAuth();
  const history = useProgress((s) => s.history);
  const savedRun = useProgress((s) => s.runs[id]);
  const finished = mode === 'daily' ? history[id] : null;

  const [run, setRun] = useState(() => savedRun || (finished ? null : newRun(mode, { date, cat, id })));
  const [travel, setTravel] = useState(null); // { dir, toV }
  const [submitted, setSubmitted] = useState(false);
  const finalizing = useRef(false);

  // reset when the route changes to a different ascent
  useEffect(() => {
    const saved = getProgress().runs[id];
    const done = mode === 'daily' && getProgress().history[id];
    setRun(saved || (done ? null : newRun(mode, { date, cat, id })));
    setSubmitted(false);
    finalizing.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // persist the run (including mid-phase progress) so a refresh or closed tab resumes where you were
  useEffect(() => {
    if (run && !['surface', 'over'].includes(run.phase)) actions.saveRun(id, run);
  }, [run, id]);

  // a newer copy of this run arrived from your account (e.g. started on another device)
  useEffect(() => {
    if (savedRun?.fromServer && !travel) {
      const { fromServer, ...rest } = savedRun;
      setRun(rest);
    }
  }, [savedRun, travel]);

  // park the camera at the current stop
  useEffect(() => {
    if (travel) return;
    if (!run || run.phase === 'surface' || run.phase === 'over') scene.setPose(MAX_V);
    else scene.setPose(run.ascent);
  }, [run, travel]);

  // finish a daily ascent once we reach the surface
  useEffect(() => {
    if (!run || run.mode !== 'daily' || run.phase !== 'surface' || finalizing.current) return;
    finalizing.current = true;
    const correct = run.results.reduce((s, r) => s + r.correct, 0);
    const total = run.results.reduce((s, r) => s + r.total, 0);
    actions.recordDive({
      id,
      mode: 'daily',
      date: run.date,
      cat: run.cat,
      points: run.results.reduce((s, r) => s + r.points, 0),
      correct,
      total,
      tiers: run.results.map((r) => r.tier),
      perAscent: run.results.map((r) => r.points),
      learned: LEARN_ASCENTS * TOPICS_PER_DIVE,
      started: run.started || null,
      at: Date.now(),
      // enough to rebuild every question for the Archive (tests are seeded, so they rebuild identically)
      seed: run.seed,
      topics: run.blocks[0]?.topics || [],
      results: run.results.map(({ ascent, type, correct, total, points, tier, answers }) => ({
        ascent,
        type,
        correct,
        total,
        points,
        tier,
        answers: answers || null,
      })),
    });
    actions.clearRun(id);
  }, [run, id]);

  // put today's score on the 7 Seas (first attempt only), even if you sign in afterwards
  const record = history[id];
  useEffect(() => {
    if (!record || submitted || !auth?.user || !auth.profile) return;
    if (record.mode !== 'daily' || record.date !== todayKey()) return;
    submitDailyScore({
      uid: auth.user.uid,
      username: auth.profile.username,
      pfp: auth.profile.pfp || 'basic',
      date: record.date,
      cat: record.cat,
      points: record.points,
      pct: record.total ? Math.round((record.correct / record.total) * 100) : 0,
    })
      .catch(() => {})
      .finally(() => setSubmitted(true));
  }, [record, submitted, auth?.user, auth?.profile]);

  const blockResults = useMemo(() => {
    const arr = [];
    if (run) run.results.filter((r) => r.block === run.block).forEach((r) => (arr[r.ascent] = r));
    return arr;
  }, [run]);
  const totalPoints = run ? run.results.reduce((s, r) => s + r.points, 0) : 0;

  // in-phase progress (which card, which answers) lives on run.draft, keyed to the current stop
  const draftKey = run ? `${run.block}-${run.ascent}-${run.phase}` : '';
  const draft = run?.draft?.key === draftKey ? run.draft.data : null;
  const onDraft = useCallback((data) => setRun((r) => (r ? { ...r, draft: { key: draftKey, data } } : r)), [draftKey]);

  /* ---------- finished daily ---------- */
  if (!run || (run.mode === 'daily' && run.phase === 'surface')) {
    if (!record) return null;
    return (
      <div className="stage">
        <Summary record={record} submitted={submitted} signedIn={Boolean(auth?.user)} onSignIn={auth?.openAuth} />
      </div>
    );
  }

  const block = run.blocks[run.block];
  const type = testTypeForAscent(run.ascent);
  const learning = run.ascent < LEARN_ASCENTS;
  const facts = learning ? learnFacts(block, run.ascent) : null;
  const update = (patch) => setRun((r) => ({ ...r, ...patch, draft: null }));

  const label =
    run.mode === 'daily'
      ? `Shrimpion #${dayNumber(run.date)} · ${categoryName(run.cat)}`
      : `Unlimited · Block ${run.block + 1} · ${categoryName(run.cat)}`;

  const ascend = async () => {
    const toV = run.ascent + 1;
    setTravel({ dir: 'up', toV });
    play('ascend');
    await scene.travelTo(toV, ASCENT_MS);
    if (toV >= 7) play('splash');
    setTravel(null);
    if (run.ascent + 1 < 7) update({ ascent: run.ascent + 1, phase: 'learn' });
    else update({ phase: 'surface' });
  };

  const diveAgain = async () => {
    setTravel({ dir: 'down', toV: 0 });
    play('descend');
    await scene.travelTo(0, DESCENT_MS);
    setTravel(null);
    const nextBlock = run.block + 1;
    update({
      block: nextBlock,
      blocks: [...run.blocks, unlimitedBlock(run.seed, run.cat, nextBlock)],
      ascent: 0,
      phase: 'learn',
    });
  };

  const endUnlimited = () => {
    actions.recordUnlimited({ points: totalPoints });
    if (auth?.user && auth.profile) {
      submitUnlimited({
        uid: auth.user.uid,
        username: auth.profile.username,
        pfp: auth.profile.pfp || 'basic',
        points: totalPoints,
        ascents: run.results.length,
      }).catch(() => {});
    }
    actions.clearRun(id);
    update({ phase: 'over' });
  };

  let body = null;

  if (travel) {
    const d = Math.round(depthAtV(travel.toV));
    body = (
      <div className="travel-banner" aria-live="polite">
        <p className="travel-arrow">{travel.dir === 'up' ? '▲ ▲ ▲' : '▼ ▼ ▼'}</p>
        <p className="travel-title">{travel.dir === 'up' ? 'ASCENDING' : 'DIVING BACK DOWN'}</p>
        <p className="travel-sub">
          {travel.dir === 'up' ? `toward ${zoneFor(d).toLowerCase()} · ${d.toLocaleString()}m` : 'to the trench floor for a fresh block'}
        </p>
      </div>
    );
  } else if (run.phase === 'learn' && learning) {
    body = (
      <LearnPhase
        key={`${run.block}-${run.ascent}-${run.updatedAt || 0}`}
        facts={facts}
        ascentIdx={run.ascent}
        testName={type.name}
        draft={draft}
        onDraft={onDraft}
        onReady={() => update({ phase: 'test' })}
      />
    );
  } else if (run.phase === 'learn' && !learning) {
    const n = finalFacts(run.blocks, run.block, run.seed).length;
    body = (
      <section className="panel stage-panel exam-intro">
        <p className="kicker">Ascent 7 of 7 · the last stretch</p>
        <h2>{type.name}</h2>
        <p className="exam-count">{n} questions</p>
        <p>
          Multiple choice on everything you learned this ascent
          {run.block > 0 ? `, plus ${n - 14} questions reaching back into your earlier blocks` : ''}. No timer, so take your time.
        </p>
        <div className="stage-actions">
          <button className="btn btn-ascend btn-big" onClick={() => update({ phase: 'test' })} autoFocus>
            Begin the exam ★
          </button>
        </div>
      </section>
    );
  } else if (run.phase === 'test') {
    const testFacts = learning ? facts : finalFacts(run.blocks, run.block, run.seed);
    const test = buildTest(type.id, testFacts, `${run.seed}|${run.block}|${run.ascent}`);
    const Comp = TEST_COMPONENTS[type.id];
    body = (
      <section className="panel stage-panel test">
        <header className="stage-head">
          <p className="kicker">
            Ascent {run.ascent + 1} of 7 · Test {learning ? `· ${LEVELS[run.ascent]}` : ''} · worth {ascentMax(run.ascent)} pts
          </p>
          <h2>
            <span className="test-icon" aria-hidden="true">
              {type.icon}
            </span>{' '}
            {type.name}
          </h2>
          <p className="muted">{type.how}</p>
        </header>
        <Comp
          key={`${run.block}-${run.ascent}-${run.updatedAt || 0}`}
          test={test}
          draft={draft}
          onDraft={onDraft}
          onComplete={({ correct, total, misses, answers }) => {
            const points = pointsFor(correct, total, run.ascent);
            const result = {
              block: run.block,
              ascent: run.ascent,
              type: type.id,
              correct,
              total,
              points,
              maxPoints: ascentMax(run.ascent),
              tier: tierForPoints(points).id,
              missIds: misses.map((f) => f.id),
              answers,
            };
            actions.recordAscent({ correct, total, learned: learning ? TOPICS_PER_DIVE : 0 });
            update({ results: [...run.results, result], phase: 'result' });
          }}
        />
      </section>
    );
  } else if (run.phase === 'result') {
    const r = blockResults[run.ascent];
    if (r) {
      body = (
        <ResultPhase
          key={`${run.block}-${run.ascent}`}
          result={{ ...r, misses: r.missIds.map((m) => FACT_BY_ID[m]).filter(Boolean) }}
          ascentIdx={run.ascent}
          isLast={run.ascent === 6}
          testName={type.name}
          onAscend={ascend}
        />
      );
    }
  } else if (run.phase === 'surface' && run.mode === 'unlimited') {
    const blockPts = blockResults.reduce((s, r) => s + (r?.points || 0), 0);
    const correct = blockResults.reduce((s, r) => s + (r?.correct || 0), 0);
    const total = blockResults.reduce((s, r) => s + (r?.total || 0), 0);
    body = (
      <>
      <TierReveal tier={tierForDive(blockPts)} />
      <section className="panel stage-panel summary">
        <p className="kicker">Unlimited · Block {run.block + 1} complete</p>
        <h2 className="surfaced">SURFACED!</h2>
        <div className="result-stats">
          <div>
            <span className="stat-num">+{blockPts}</span>
            <span className="stat-label">this block</span>
          </div>
          <div>
            <span className="stat-num">{totalPoints}</span>
            <span className="stat-label">run total</span>
          </div>
          <div>
            <span className="stat-num">{run.results.length}</span>
            <span className="stat-label">ascents</span>
          </div>
        </div>
        <p className="muted center">
          The next block teaches seven new topics, and its surface exam grows to {14 + TOPICS_PER_DIVE * (run.block + 1)} questions,
          reaching back into everything you’ve learned this run.
        </p>
        <div className="stage-actions">
          <button className="btn btn-ascend btn-big" onClick={diveAgain}>
            ▼ Dive back down: Block {run.block + 2}
          </button>
          <button className="btn btn-ghost" onClick={endUnlimited}>
            End run &amp; bank {totalPoints} pts
          </button>
        </div>
      </section>
      </>
    );
  } else if (run.phase === 'over') {
    body = (
      <section className="panel stage-panel summary">
        <p className="kicker">Unlimited · run banked</p>
        <h2 className="surfaced">{totalPoints} POINTS</h2>
        <p className="center">
          {run.results.length} ascents across {run.block + 1} block{run.block ? 's' : ''}.{' '}
          {auth?.user ? 'Your best run counts on the 7 Seas.' : 'Sign in to put runs like this on the 7 Seas.'}
        </p>
        <div className="stage-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              const fresh = newRun('unlimited', { cat, id });
              setRun(fresh);
            }}
          >
            New run ∞
          </button>
          <Link className="btn" to="/seas?board=unlimited">
            7 Seas ≋
          </Link>
          {!auth?.user && (
            <button className="btn btn-save" onClick={auth?.openAuth}>
              Save your progress
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="stage">
      <DiveHUD results={blockResults} current={run.ascent} points={totalPoints} label={label} />
      {run.mode === 'unlimited' && !travel && ['learn', 'result'].includes(run.phase) && run.results.length > 0 && (
        <button className="end-run" onClick={endUnlimited}>
          End run · bank {totalPoints} pts
        </button>
      )}
      {body}
    </div>
  );
}
