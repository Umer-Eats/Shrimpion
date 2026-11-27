import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import Pfp from '../components/Pfp.jsx';
import { useAuth } from '../firebase/AuthContext.jsx';
import {
  sendFriendRequest,
  watchFriendRequests,
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

function RemoveFriendDialog({ friend, onConfirm, onClose }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    cancelRef.current.focus();
    return () => dialog.close();
  }, []);

  function closeDialog() {
    dialogRef.current.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal panel friend-remove-dialog"
      aria-labelledby="remove-friend-title"
      aria-describedby="remove-friend-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!removing) closeDialog();
      }}
    >
      <div className="modal-head">
        <h2 id="remove-friend-title">Remove friend?</h2>
      </div>
      <p id="remove-friend-description">Remove {friend.username} from your friends?</p>
      {error && <p className="notice" role="alert">{error}</p>}
      <div className="friend-actions friend-remove-actions">
        <button ref={cancelRef} type="button" className="btn btn-ghost" disabled={removing} onClick={closeDialog}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={removing}
          onClick={async () => {
            setRemoving(true);
            setError('');
            try {
              await onConfirm();
              if (dialogRef.current) closeDialog();
            } catch (err) {
              setError(err.message);
              setRemoving(false);
            }
          }}
        >
          {removing ? 'Removing…' : 'Remove friend'}
        </button>
      </div>
    </dialog>
  );
}

export default function Friends() {
  const auth = useAuth();
  const uid = auth.user?.uid;
  const me = auth.profile;
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState(null);
  const [requestLoadError, setRequestLoadError] = useState('');
  const [requestFeedback, setRequestFeedback] = useState(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [view, setView] = useState('friends');
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [, tick] = useState(0);

  useEffect(() => {
    if (!uid) return undefined;
    const stopFriends = watchFriends(uid, setFriends);
    const stopRequests = watchFriendRequests((data) => {
      setRequests(data);
      setRequestLoadError('');
    }, (err) => setRequestLoadError(err.message));
    const t = setInterval(() => tick((x) => x + 1), 30000); // refresh online dots
    return () => {
      stopFriends();
      stopRequests();
      clearInterval(t);
    };
  }, [uid]);

  if (!uid || !me) {
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
  const incomingView = view === 'incoming';
  const requestRows = requests?.[view] ?? [];

  async function respondToRequest(request, accept = false) {
    setRequestBusy(true);
    setRequestFeedback(null);
    try {
      if (accept) await acceptRequest(uid, request);
      else await declineRequest(request);
      const message = accept ? `You and ${request.fromName} are now friends.` : incomingView ? 'Request declined.' : 'Request canceled.';
      setRequestFeedback({ view, message });
    } catch (err) {
      setRequestFeedback({ view, message: err.message, error: true });
    } finally {
      setRequestBusy(false);
    }
  }

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

      <div className="tabs" role="group" aria-label="Friends views">
        {[
          ['friends', 'Your friends', friends.length],
          ['incoming', 'Incoming requests', requests?.incoming.length],
          ['outgoing', 'Outgoing requests', requests?.outgoing.length],
        ].map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`tab ${view === id ? 'is-on' : ''}`}
            aria-pressed={view === id}
            aria-controls="friends-view"
            onClick={() => setView(id)}
          >
            {label}{count != null && ` (${count})`}
          </button>
        ))}
      </div>

      {view === 'friends' ? (
        <section className="panel" id="friends-view">
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
                          aria-label={`Remove ${f.username}`}
                          onClick={() => setFriendToRemove(f)}
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
      ) : (
        <section className="panel" id="friends-view">
          <h3>{incomingView ? 'Incoming requests' : 'Outgoing requests'}</h3>
          {requestFeedback?.view === view && (
            <p className={requestFeedback.error ? 'notice' : 'muted'} role={requestFeedback.error ? 'alert' : 'status'}>
              {requestFeedback.message}
            </p>
          )}
          {requestLoadError && <p className="notice" role="alert">Couldn’t load requests. {requestLoadError}</p>}
          {!requests && !requestLoadError && <p className="muted" role="status">Loading requests…</p>}
          {requests && !requestLoadError && requestRows.length === 0 && (
            <p className="muted">{incomingView ? 'No incoming requests.' : 'No outgoing requests.'}</p>
          )}
          {requestRows.length > 0 && (
            <ul className="friend-list">
              {requestRows.map((r) => (
                <li key={r.id} className="friend-row">
                  <Pfp id={incomingView ? r.fromPfp : r.toPfp} size="sm" />
                  <span className="friend-name">{incomingView ? r.fromName : r.toName}</span>
                  <span className="friend-actions">
                    {incomingView ? (
                      <button className="btn btn-primary btn-small" disabled={requestBusy} onClick={() => respondToRequest(r, true)}>
                        Accept
                      </button>
                    ) : <span className="muted small friend-request-status">Pending</span>}
                    <button className="btn btn-ghost btn-small" disabled={requestBusy} onClick={() => respondToRequest(r)}>
                      {incomingView ? 'Decline' : 'Cancel request'}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {friendToRemove && (
        <RemoveFriendDialog
          friend={friendToRemove}
          onConfirm={() => removeFriend(uid, friendToRemove.id)}
          onClose={() => setFriendToRemove(null)}
        />
      )}
    </PageShell>
  );
}
