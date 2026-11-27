import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import Pfp from '../components/Pfp.jsx';
import Icon from '../components/Icon.jsx';
import SeasGlobe, { SEA_BY_BOARD } from '../components/SeasGlobe.jsx';
import { useAuth } from '../firebase/AuthContext.jsx';
import { watchSeasBoard } from '../firebase/api.js';
import { CATEGORIES, categoryName } from '../game/content/index.js';
import { todayKey, dayNumber, addDays } from '../game/daily.js';
import { ASCENT_MAX, MAX_DIVE_POINTS } from '../game/tiers.js';
import { useProgress } from '../data/progress.js';

const BOARDS = [...CATEGORIES.map((c) => ({ id: c.id, icon: c.icon, label: c.id === 'random' ? 'Daily Swim' : c.name })), { id: 'unlimited', label: '∞ Unlimited' }];

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Ranking types for the daily seas. `main` is the big number, `meta` the small one beside it. */
const DAILY_TYPES = [
  { id: 'today', label: 'Top Score', blurb: 'Today’s highest points. Ties go to whoever surfaced first.', main: (r) => r.points, meta: (r) => `${r.pct}%` },
  { id: 'accuracy', label: 'Accuracy', blurb: 'Today’s sharpest answers: ranked by % correct, then points.', main: (r) => `${r.pct}%`, meta: (r) => `${r.points} pts` },
  { id: 'week', label: 'This Week', blurb: 'Total points on this sea over the past seven days, including today.', main: (r) => r.points, meta: (r) => `${plural(r.days, 'day')} · avg ${r.pct}%` },
  { id: 'alltime', label: 'All-Time', blurb: 'Total points from every daily dive posted on this sea.', main: (r) => r.points, meta: (r) => `${plural(r.days, 'day')} · avg ${r.pct}%` },
  { id: 'friends', label: 'Friends', blurb: 'Today’s board with just you and your friends.', auth: true, main: (r) => r.points, meta: (r) => `${r.pct}%` },
];
const UNLIMITED_TYPES = [
  { id: 'best', label: 'Best Run', blurb: 'Most points from a single unlimited run.', main: (r) => r.points, meta: (r) => plural(r.ascents, 'ascent') },
  { id: 'ascents', label: 'Longest Run', blurb: 'Most ascents climbed in a player’s best unlimited run.', main: (r) => r.ascents, meta: (r) => `${r.points} pts` },
  { id: 'friends', label: 'Friends', blurb: 'Best unlimited runs among you and your friends.', auth: true, main: (r) => r.points, meta: (r) => plural(r.ascents, 'ascent') },
];

/** Your own score for a board/ranking from local history (used when the global boards are offline). */
function localScore(history, stats, board, type, today) {
  if (board === 'unlimited') return type !== 'ascents' && stats.unlimitedRuns ? stats.unlimitedBest : null;
  const rec = (d) => history[`daily:${d}:${board}`];
  if (type === 'accuracy') {
    const r = rec(today);
    return r?.total ? `${Math.round((r.correct / r.total) * 100)}%` : null;
  }
  if (type === 'week' || type === 'alltime') {
    const keys = Object.keys(history).filter((k) => k.startsWith('daily:') && k.endsWith(`:${board}`));
    const week = new Set(Array.from({ length: 7 }, (_, i) => `daily:${addDays(today, -i)}:${board}`));
    const records = keys.filter((k) => type === 'alltime' || week.has(k));
    return records.length ? records.reduce((s, k) => s + (history[k]?.points || 0), 0) : null;
  }
  return rec(today)?.points;
}

export default function SevenSeas() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const board = BOARDS.some((b) => b.id === params.get('board')) ? params.get('board') : 'random';
  const types = board === 'unlimited' ? UNLIMITED_TYPES : DAILY_TYPES;
  const type = types.find((t) => t.id === params.get('rank')) || types[0];
  const [result, setResult] = useState(null);
  const [today, setToday] = useState(todayKey);
  const history = useProgress((s) => s.history);
  const stats = useProgress((s) => s.stats);
  const needsSignIn = type.auth && !auth.user;
  const date = board === 'unlimited' ? undefined : today;
  const query = JSON.stringify([board, type.id, date, type.auth ? auth.user?.uid : null]);
  const rows = result?.query === query ? result.rows : null;
  const error = result?.query === query ? result.error : '';

  const pick = (nextBoard, nextRank) => {
    if (nextBoard === board && nextRank === type.id) return;
    const p = { board: nextBoard };
    const list = nextBoard === 'unlimited' ? UNLIMITED_TYPES : DAILY_TYPES;
    if (nextRank && list.some((t) => t.id === nextRank) && nextRank !== list[0].id) p.rank = nextRank;
    setParams(p);
  };

  useEffect(() => {
    const updateDay = () => setToday(todayKey());
    const timer = setInterval(updateDay, 1000);
    document.addEventListener('visibilitychange', updateDay);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', updateDay);
    };
  }, []);

  useEffect(() => {
    if (!auth.configured || needsSignIn) return undefined;
    return watchSeasBoard(
      { board, type: type.id, date },
      (rows) => setResult({ query, rows, error: '' }),
      (e) => setResult((current) => (
        current?.query === query && !current.error ? current : { query, rows: [], error: e.message || 'Could not load rankings.' }
      )),
    );
  }, [board, type.id, date, auth.configured, needsSignIn, query]);

  const mine = localScore(history, stats, board, type.id, today);
  const sea = SEA_BY_BOARD[board];
  const where = board === 'unlimited' ? 'The open ocean' : `${sea?.sea} · ${board === 'random' ? 'Daily Swim' : categoryName(board)}`;

  return (
    <PageShell
      v={4}
      kicker="Global rankings"
      title="The 7 Seas"
      intro={
        board === 'unlimited'
          ? 'Unlimited keeps your highest-scoring banked run across every day.'
          : `Daily Swim and six category boards. Shrimpion #${dayNumber(today)} resets at midnight Eastern.`
      }
      headerAside={<SeasGlobe selected={board} onPick={(id) => pick(id, type.id)} />}
      wide
    >
      <div className="tabs seas-tabs" role="group" aria-label="Leaderboard category">
        {BOARDS.map((b) => (
          <button type="button" key={b.id} aria-pressed={board === b.id} className={`tab sea-tab ${board === b.id ? 'is-on' : ''}`} onClick={() => pick(b.id, type.id)}>
            <span className="sea-tab-label">
              {b.icon && <Icon name={b.icon} scale={1} />} {b.label}
            </span>
            <span className="tab-sea">{b.id === 'unlimited' ? 'Open ocean' : SEA_BY_BOARD[b.id]?.short}</span>
          </button>
        ))}
      </div>

      <div className="rank-types" role="group" aria-label="Ranking type">
        {types.map((t) => (
          <button type="button" key={t.id} aria-pressed={type.id === t.id} className={`tab rank-type ${type.id === t.id ? 'is-on' : ''}`} onClick={() => pick(board, t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="panel seas-board" aria-labelledby="seas-board-title">
        <div className="board-head">
          <h2 id="seas-board-title">
            {where} · {type.label}
          </h2>
          <p className="muted small">{type.blurb}</p>
        </div>
        {!auth.configured ? (
          <div className="notice">
            Global rankings go live once the database is connected.{' '}
            {mine != null ? <>Your score here is <strong>{mine}</strong>.</> : 'Finish a dive to see your score.'}
          </div>
        ) : needsSignIn ? (
          <div className="notice">
            <button className="link-btn" onClick={auth.openAuth}>
              Sign in
            </button>{' '}
            to see how you stack up against your friends.
          </div>
        ) : rows === null ? (
          <p className="muted" role="status">Loading rankings…</p>
        ) : rows.length === 0 ? (
          <p className="muted">{error || (type.id === 'friends' ? 'No one in your pod has surfaced here yet. Add friends from the Friends page.' : 'No one has surfaced here yet. Be the first.')}</p>
        ) : (
          <ol className="ranks">
            {rows.map((r, i) => (
              <li key={r.uid} className={`rank-row ${r.uid === auth.user?.uid ? 'is-me' : ''} ${i < 3 ? `top-${i + 1}` : ''}`}>
                <span className="rank-num">{i + 1}</span>
                <Pfp id={r.uid === auth.user?.uid ? auth.pfp || r.pfp : r.pfp} size="sm" />
                <span className="rank-name">{r.username}</span>
                <span className="rank-pct">{type.meta(r)}</span>
                <span className="rank-pts">{type.main(r)}</span>
              </li>
            ))}
          </ol>
        )}
        {auth.configured && !auth.user && !needsSignIn && (
          <p className="muted small">
            <button className="link-btn" onClick={auth.openAuth}>
              Sign in
            </button>{' '}
            to appear on the 7 Seas.
          </p>
        )}
      </section>

      <section className="panel seas-how">
        <h2>How the 7 Seas work</h2>
        <div className="seas-how-grid">
          <div>
            <h3>Seven daily boards</h3>
            <p className="muted">
              Daily Swim mixes topics from all six categories. Each category also has its own daily dive. Everyone on a board gets the same topics, and a new dive opens at midnight Eastern. Tap the globe to open the board it shows.
            </p>
          </div>
          <div>
            <h3>Scoring</h3>
            <p className="muted">
              Each daily dive has {ASCENT_MAX.length} ascents. Their point values rise from {ASCENT_MAX[0]} to {ASCENT_MAX.at(-1)} for the surface exam, for a total of {MAX_DIVE_POINTS.toLocaleString('en-US')}. Your accuracy on each ascent determines how many of its points you earn.
            </p>
          </div>
          <div>
            <h3>First attempt only</h3>
            <p className="muted">Your first completed attempt at each daily dive is eligible for the leaderboard. Retries and Archive replays are practice. Each leaderboard shows up to 50 players.</p>
          </div>
          <div>
            <h3>The open ocean</h3>
            <p className="muted">Unlimited has its own board. Play as many blocks as you like, then bank your run. The board keeps your highest-scoring run.</p>
          </div>
        </div>
        <h3>Ranking types</h3>
        <dl className="seas-types">
          {DAILY_TYPES.map((t) => (
            <div key={`d-${t.id}`}>
              <dt>{t.label}</dt>
              <dd className="muted">{t.blurb}</dd>
            </div>
          ))}
          {UNLIMITED_TYPES.filter((t) => t.id !== 'friends').map((t) => (
            <div key={`u-${t.id}`}>
              <dt>{t.label} · Unlimited</dt>
              <dd className="muted">{t.blurb}</dd>
            </div>
          ))}
        </dl>
        <p className="muted small">Sign in to post. Finished a dive signed out? Sign in on the results screen and today’s score still posts.</p>
      </section>
    </PageShell>
  );
}
