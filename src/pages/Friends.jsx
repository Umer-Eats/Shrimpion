import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import Pfp from '../components/Pfp.jsx';
import { useAuth } from '../firebase/AuthContext.jsx';
import {
  sendFriendRequest,
  watchIncomingRequests,
  watchOutgoingRequests,
  acceptRequest,
  declineRequest,
  removeFriend,
  watchFriends,
  isOnline,
} from '../firebase/api.js';
import { todayKey, addDays } from '../game/daily.js';
import { MAX_DIVE_POINTS } from '../game/tiers.js';
import Icon from '../components/Icon.jsx';

function friendStreak(stats = {}) {
  const today = todayKey();
  return stats.lastDailyDate === today || stats.lastDailyDate === addDays(today, -1) ? stats.streak || 0 : 0;
}

export default function Friends() {
  const auth = useAuth();
  const me = auth.profile;
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [, tick] = useState(0);

  useEffect(() => {
    if (!auth.user) return undefined;
    const u1 = watchFriends(auth.user.uid, setFriends);
    const u2 = watchIncomingRequests(auth.user.uid, setIncoming);
    const u3 = watchOutgoingRequests(auth.user.uid, setOutgoing);
    const t = setInterval(() => tick((x) => x + 1), 30000); // refresh online dots
    return () => {
      u1();
      u2();
      u3();
      clearInterval(t);
    };
  }, [auth.user]);

  if (!auth.user || !me) {
    return (
      <PageShell v={6} kicker="Better with company" title="Friends">
        <section className="panel">
          <p>Sign in to add friends, see who’s online, compare stats, and get ready for Urchin Party together.</p>
          <button className="btn btn-save" onClick={auth.openAuth}>
            Save your progress
          </button>
          {!auth.configured && <p className="notice">Friends switch on once Firebase is connected.</p>}
        </section>
      </PageShell>
    );
  }

  const sorted = [...friends].sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)) || (a.username || '').localeCompare(b.username || ''));
  const today = todayKey();

  return (
    <PageShell v={6} kicker="Better with company" title="Friends" wide>
      <section className="panel">
        <h3>Add a friend</h3>
        <form
          className="form inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setMsg('');
            try {
              const r = await sendFriendRequest(me, name);
              setMsg(r === 'accepted' ? 'They’d already asked you, so you’re now friends!' : 'Request sent!');
              setName('');
            } catch (err) {
              setMsg(err.message);
            }
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="their username" aria-label="Friend's username" />
          <button className="btn btn-primary">Send request</button>
        </form>
        {msg && <p className="muted">{msg}</p>}
        <p className="muted small">
          Your username is <strong>{me.username}</strong>. Share it so friends can add you.
        </p>
      </section>

      {incoming.length > 0 && (
        <section className="panel">
          <h3>Requests</h3>
          <ul className="friend-list">
            {incoming.map((r) => (
              <li key={r.id} className="friend-row">
                <Pfp id={r.fromPfp} size="sm" />
                <span className="friend-name">{r.fromName}</span>
                <span className="friend-actions">
                  <button className="btn btn-primary btn-small" onClick={() => acceptRequest(auth.user.uid, r)}>
                    Accept
                  </button>
                  <button className="btn btn-ghost btn-small" onClick={() => declineRequest(r)}>
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h3>
          Your school <span className="muted">({friends.length})</span>
        </h3>
        {sorted.length === 0 ? (
          <p className="muted">No friends yet. Add someone above and you’ll see their stats here.</p>
        ) : (
          <ul className="friend-grid">
            {sorted.map((f) => {
              const online = isOnline(f);
              const s = f.stats || {};
              const todayPts = f.today?.date === today ? f.today.points : null;
              return (
                <li key={f.id} className="friend-card">
                  <div className="friend-head">
                    <Pfp id={f.pfp} size="md" online={online} />
                    <div>
                      <strong>{f.username}</strong>
                      <span className={`status ${online ? 'is-on' : ''}`}>{online ? '● online now' : '○ offline'}</span>
                    </div>
                  </div>
                  <dl className="mini-stats">
                    <div>
                      <dt>Today</dt>
                      <dd>{todayPts != null ? `${todayPts}/${MAX_DIVE_POINTS}` : '—'}</dd>
                    </div>
                    <div>
                      <dt>Streak</dt>
                      <dd>
                        <Icon name="icon-flame" /> {friendStreak(s)}
                      </dd>
                    </div>
                    <div>
                      <dt>Facts</dt>
                      <dd>{s.factsLearned || 0}</dd>
                    </div>
                    <div>
                      <dt>Best day</dt>
                      <dd>{s.bestDaily || 0}</dd>
                    </div>
                    <div>
                      <dt>Shrimpions</dt>
                      <dd>{s.shrimpions || 0}</dd>
                    </div>
                    <div>
                      <dt>Unlimited</dt>
                      <dd>{s.unlimitedBest || 0}</dd>
                    </div>
                  </dl>
                  <div className="friend-actions">
                    <Link className="btn btn-small" to="/urchin-party" title="Urchin Party is coming soon">
                      ✺ Urchin Party
                    </Link>
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => window.confirm(`Remove ${f.username} from your friends?`) && removeFriend(auth.user.uid, f.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="panel">
          <h3>Waiting on</h3>
          <ul className="friend-list">
            {outgoing.map((r) => (
              <li key={r.id} className="friend-row">
                <Pfp id={r.toPfp} size="sm" />
                <span className="friend-name">{r.toName || 'a shrimp'}</span>
                <span className="muted small">request sent</span>
                <button className="btn btn-ghost btn-small" onClick={() => declineRequest(r)}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
