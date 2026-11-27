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
import { useProgress } from '../data/progress.js';

const BOARDS = [...CATEGORIES.map((c) => ({ id: c.id, icon: c.icon, label: c.id === 'random' ? 'Daily Swim' : c.name })), { id: 'unlimited', label: '∞ Unlimited' }];

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Ranking types for the daily seas. `main` is the big number, `meta` the small one beside it. */
const DAILY_TYPES = [
  { id: 'today', label: 'Top Score', blurb: 'Today’s highest points. Ties go to whoever surfaced first.', main: (r) => r.points, meta: (r) => `${r.pct}%` },
  { id: 'accuracy', label: 'Accuracy', blurb: 'Today’s sharpest answers: ranked by % correct, then points.', main: (r) => `${r.pct}%`, meta: (r) => `${r.points} pts` },
  { id: 'week', label: 'This Week', blurb: 'Points added up over the last 7 daily ascents on this sea.', main: (r) => r.points, meta: (r) => `${plural(r.days, 'day')} · avg ${r.pct}%` },
  { id: 'alltime', label: 'All-Time', blurb: 'Every daily ascent ever posted on this sea, added up.', main: (r) => r.points, meta: (r) => `${plural(r.days, 'day')} · avg ${r.pct}%` },
  { id: 'friends', label: 'Friends', blurb: 'Today’s board with just you and your friends.', auth: true, main: (r) => r.points, meta: (r) => `${r.pct}%` },
];
const UNLIMITED_TYPES = [
  { id: 'best', label: 'Best Run', blurb: 'Most points from a single unlimited run.', main: (r) => r.points, meta: (r) => plural(r.ascents, 'ascent') },
  { id: 'ascents', label: 'Longest Run', blurb: 'Most ascents climbed in a player’s best unlimited run.', main: (r) => r.ascents, meta: (r) => `${r.points} pts` },
  { id: 'friends', label: 'Friends', blurb: 'Best unlimited runs among you and your friends.', auth: true, main: (r) => r.points, meta: (r) => plural(r.ascents, 'ascent') },
];

/** Your own score for a board/ranking from local history (used when the global boards are offline). */
function localScore(history, stats, board, type, today) {
  if (board === 'unlimited') return type === 'ascents' ? null : stats.unlimitedBest;
  const rec = (d) => history[`daily:${d}:${board}`];
  if (type === 'accuracy') {
    const r = rec(today);
    return r?.total ? `${Math.round((r.correct / r.total) * 100)}%` : null;
  }
  if (type === 'week' || type === 'alltime') {
    const keys = Object.keys(history).filter((k) => k.startsWith('daily:') && k.endsWith(`:${board}`));
    const week = new Set(Array.from({ length: 7 }, (_, i) => `daily:${addDays(today, -i)}:${board}`));
    const sum = keys.filter((k) => type === 'alltime' || week.has(k)).reduce((s, k) => s + (history[k]?.points || 0), 0);
    return sum || null;
  }
  return rec(today)?.points;
}

export default function SevenSeas() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const board = BOARDS.some((b) => b.id === params.get('board')) ? params.get('board') : 'random';
  const types = board === 'unlimited' ? UNLIMITED_TYPES : DAILY_TYPES;
  const type = types.find((t) => t.id === params.get('rank')) || types[0];
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const history = useProgress((s) => s.history);
  const stats = useProgress((s) => s.stats);
  const today = todayKey();
  const needsSignIn = type.auth && !auth.user;
  const friendBoardUid = type.auth ? auth.user?.uid : null;

  const pick = (nextBoard, nextRank) => {
    const p = { board: nextBoard };
    const list = nextBoard === 'unlimited' ? UNLIMITED_TYPES : DAILY_TYPES;
    if (nextRank && list.some((t) => t.id === nextRank) && nextRank !== list[0].id) p.rank = nextRank;
    setParams(p);
  };

  useEffect(() => {
    if (!auth.configured || needsSignIn) return undefined;
    let loaded = false;
    setRows(null);
    setError('');
    return watchSeasBoard(
      { board, type: type.id, date: today },
      (r) => {
        loaded = true;
        setRows(r);
        setError('');
      },
      (e) => {
        if (loaded) return;
        setRows([]);
        setError(e.message || 'Couldn’t reach the 7 Seas right now.');
      },
    );
  }, [board, type.id, today, auth.configured, needsSignIn, friendBoardUid]);

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
          ? 'The longest-swimming learners. Unlimited has no daily reset: your best run stands until you beat it.'
          : `Seven seas, one for each daily ascent. Shrimpion #${dayNumber(today)} · first attempt only · resets at midnight Eastern.`
      }
      wide
    >
      <SeasGlobe selected={board} onPick={(id) => pick(id, type.id)} />

      <div className="tabs" role="tablist" aria-label="Seas">
        {BOARDS.map((b) => (
          <button key={b.id} role="tab" aria-selected={board === b.id} className={`tab sea-tab ${board === b.id ? 'is-on' : ''}`} onClick={() => pick(b.id, type.id)}>
            <span>
              {b.icon && <Icon name={b.icon} />} {b.label}
            </span>
            <span className="tab-sea">{b.id === 'unlimited' ? 'Open ocean' : SEA_BY_BOARD[b.id]?.short}</span>
          </button>
        ))}
      </div>

      <div className="rank-types" role="tablist" aria-label="Ranking type">
        {types.map((t) => (
          <button key={t.id} role="tab" aria-selected={type.id === t.id} className={`rank-type ${type.id === t.id ? 'is-on' : ''}`} onClick={() => pick(board, t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="panel board">
        <div className="board-head">
          <h3>
            {where} · {type.label}
          </h3>
          <p className="muted small">{type.blurb}</p>
        </div>
        {!auth.configured ? (
          <div className="notice">
            Global rankings go live once the database is connected.{' '}
            {mine ? <>Your score here: <strong>{mine}</strong>.</> : 'Finish an ascent to post your first score.'}
          </div>
        ) : needsSignIn ? (
          <div className="notice">
            <button className="link-btn" onClick={auth.openAuth}>
              Sign in
            </button>{' '}
            to see how you stack up against your friends.
          </div>
        ) : rows === null ? (
          <p className="muted">Sounding the depths…</p>
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
        <h3>How the 7 Seas work</h3>
        <div className="seas-how-grid">
          <div>
            <h4>Seven seas, one a day</h4>
            <p className="muted">
              Every daily ascent has its own sea: the Daily Swim plus one for each category. Everyone gets the same topics, and every sea resets at midnight Eastern
              Time. Tap the globe to jump to the sea it’s showing.
            </p>
          </div>
          <div>
            <h4>Scoring</h4>
            <p className="muted">
              A dive is seven ascents worth 100, 125, 150 and up to 250 points for the surface exam, 1,225 in all. Each ascent pays its share by how many you got right,
              so the deeper questions count most.
            </p>
          </div>
          <div>
            <h4>First attempt only</h4>
            <p className="muted">Only your first try at today’s ascent posts. Retries and Archive replays are practice. Boards show the top 50.</p>
          </div>
          <div>
            <h4>The open ocean</h4>
            <p className="muted">Unlimited has its own board. Dive block after block and bank whenever you like: your best single run is the one that counts.</p>
          </div>
        </div>
        <h4>Ranking types</h4>
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
