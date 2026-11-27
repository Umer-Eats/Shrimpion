import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import Pfp from '../components/Pfp.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../firebase/AuthContext.jsx';
import { fetchDailyBoard, fetchUnlimitedBoard } from '../firebase/api.js';
import { CATEGORIES, categoryName } from '../game/content/index.js';
import { todayKey, dayNumber } from '../game/daily.js';
import { useProgress } from '../data/progress.js';

const BOARDS = [...CATEGORIES.map((c) => ({ id: c.id, icon: c.icon, label: c.id === 'random' ? 'Daily Swim' : c.name })), { id: 'unlimited', label: '∞ Unlimited' }];

export default function SevenSeas() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const board = BOARDS.some((b) => b.id === params.get('board')) ? params.get('board') : 'random';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const history = useProgress((s) => s.history);
  const stats = useProgress((s) => s.stats);
  const today = todayKey();

  useEffect(() => {
    if (!auth.configured) return;
    setRows(null);
    setError('');
    const p = board === 'unlimited' ? fetchUnlimitedBoard() : fetchDailyBoard(today, board);
    p.then(setRows).catch((e) => {
      setRows([]);
      setError(e.message || 'Couldn’t reach the 7 Seas right now.');
    });
  }, [board, today, auth.configured]);

  const mine = board === 'unlimited' ? stats.unlimitedBest : history[`daily:${today}:${board}`]?.points;

  return (
    <PageShell
      v={4}
      kicker="Global rankings"
      title="The 7 Seas"
      intro={
        board === 'unlimited'
          ? 'The longest-swimming learners: best total points from a single unlimited run.'
          : `Today’s most accurate ascents · Shrimpion #${dayNumber(today)} · ${categoryName(board)}. First attempt only.`
      }
      wide
    >
      <div className="tabs" role="tablist">
        {BOARDS.map((b) => (
          <button key={b.id} role="tab" aria-selected={board === b.id} className={`tab ${board === b.id ? 'is-on' : ''}`} onClick={() => setParams({ board: b.id })}>
            {b.icon && <Icon name={b.icon} />} {b.label}
          </button>
        ))}
      </div>

      <section className="panel board">
        {!auth.configured ? (
          <div className="notice">
            Global rankings go live once Firebase is connected.{' '}
            {mine ? <>Your score here: <strong>{mine}</strong>.</> : 'Finish an ascent to post your first score.'}
          </div>
        ) : rows === null ? (
          <p className="muted">Sounding the depths…</p>
        ) : rows.length === 0 ? (
          <p className="muted">{error || 'No one has surfaced here yet today. Be the first.'}</p>
        ) : (
          <ol className="ranks">
            {rows.map((r, i) => (
              <li key={r.uid} className={`rank-row ${r.uid === auth.user?.uid ? 'is-me' : ''} ${i < 3 ? `top-${i + 1}` : ''}`}>
                <span className="rank-num">{i + 1}</span>
                <Pfp id={r.pfp} size="sm" />
                <span className="rank-name">{r.username}</span>
                {board !== 'unlimited' && <span className="rank-pct">{r.pct}%</span>}
                {board === 'unlimited' && <span className="rank-pct">{r.ascents} ascents</span>}
                <span className="rank-pts">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
        {auth.configured && !auth.user && (
          <p className="muted small">
            <button className="link-btn" onClick={auth.openAuth}>
              Sign in
            </button>{' '}
            to appear on the 7 Seas.
          </p>
        )}
      </section>
    </PageShell>
  );
}
