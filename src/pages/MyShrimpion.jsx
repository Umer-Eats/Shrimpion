import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import Pfp from '../components/Pfp.jsx';
import { useAuth } from '../firebase/AuthContext.jsx';
import { USERNAME_RE } from '../firebase/api.js';
import { useProgress, liveStreak } from '../data/progress.js';
import { PFPS, pfpProgress } from '../data/pfps.js';
import { TIER_BY_ID, MAX_DIVE_POINTS } from '../game/tiers.js';
import { categoryName } from '../game/content/index.js';
import { dayNumber } from '../game/daily.js';
import Icon, { TierIcon } from '../components/Icon.jsx';

export default function MyShrimpion() {
  const auth = useAuth();
  const local = useProgress((s) => s.profile);
  const stats = useProgress((s) => s.stats);
  const history = useProgress((s) => s.history);
  const pfp = auth.profile?.pfp || local.pfp;
  const username = auth.profile?.username || local.username;
  const [name, setName] = useState(username || '');
  const [nameMsg, setNameMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const accuracy = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
  const logbook = Object.values(history).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 12);

  const saveName = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!USERNAME_RE.test(n)) {
      setNameMsg('Use 3–16 letters, numbers or underscores.');
      return;
    }
    setBusy(true);
    setNameMsg('');
    try {
      await auth.changeUsername(n);
      setNameMsg('Saved!');
    } catch (err) {
      setNameMsg(err.message || 'Could not save that name.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell v={5} kicker="Your diver’s logbook" title="My Shrimpion" wide>
      <section className="panel profile-card">
        <Pfp id={pfp} size="xl" />
        <div className="profile-main">
          <h2>{username || 'Unnamed shrimp'}</h2>
          <p className="muted">
            {auth.user
              ? `Signed in${auth.user.email ? ` as ${auth.user.email}` : ''}. Your progress syncs to every device.`
              : auth.configured
                ? 'Playing as a guest. Progress is saved on this device only.'
                : 'Playing in local mode. Progress is saved on this device until accounts are switched on.'}
          </p>
          <div className="profile-actions">
            {auth.user ? (
              <button className="btn btn-ghost" onClick={auth.logOut}>
                Log out
              </button>
            ) : (
              <button className="btn btn-save" onClick={auth.openAuth}>
                Save your progress
              </button>
            )}
            <Link className="btn" to="/friends">
              Friends <Icon name="icon-heart" />
            </Link>
          </div>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <h3>Change username</h3>
          <form className="form inline-form" onSubmit={saveName}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} aria-label="Username" placeholder="shrimpfan_42" />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </form>
          {nameMsg && <p className={nameMsg === 'Saved!' ? 'form-ok' : 'form-error'}>{nameMsg}</p>}
          <p className="muted small">Friends find you by this name. 3–16 letters, numbers or underscores.</p>
        </section>

        <section className="panel">
          <h3>Your stats</h3>
          <dl className="stat-grid">
            <div>
              <dt>Current streak</dt>
              <dd>
                <Icon name="icon-flame" /> {liveStreak(stats)}
              </dd>
            </div>
            <div>
              <dt>Best streak</dt>
              <dd>{stats.bestStreak}</dd>
            </div>
            <div>
              <dt>Facts learned</dt>
              <dd>{stats.factsLearned}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{accuracy}%</dd>
            </div>
            <div>
              <dt>Daily ascents</dt>
              <dd>{stats.dives}</dd>
            </div>
            <div>
              <dt>Best daily</dt>
              <dd>{stats.bestDaily}/{MAX_DIVE_POINTS}</dd>
            </div>
            <div>
              <dt>Shrimpions</dt>
              <dd>
                <TierIcon tier={TIER_BY_ID.shrimpion} /> {stats.shrimpions}
              </dd>
            </div>
            <div>
              <dt>Best unlimited</dt>
              <dd>{stats.unlimitedBest}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="panel">
        <h3>Change profile shrimp</h3>
        <p className="muted small">Click any shrimp to equip it. Learn more every day to unlock the rest for good.</p>
        <div className="pfp-grid">
          {PFPS.map((p) => {
            const prog = pfpProgress(p, stats);
            const on = pfp === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`pfp-option ${on ? 'is-on' : ''}`}
                onClick={() => !on && auth.changePfp(p.id)}
                aria-pressed={on}
                title={on ? `${p.name} (equipped)` : `Equip ${p.name}`}
              >
                <Pfp id={p.id} size="md" locked={!prog.unlocked && !on} />
                <span className="pfp-name">{p.name}</span>
                <span className="pfp-req">{on ? 'Equipped' : prog.unlocked ? 'Unlocked' : p.label}</span>
                {!prog.unlocked && (
                  <span className="meter" aria-label={`${prog.cur} of ${prog.goal}`}>
                    <span style={{ width: `${(prog.cur / prog.goal) * 100}%` }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h3>Logbook</h3>
        {logbook.length === 0 ? (
          <p className="muted">
            Your logbook starts with your first ascent. <Link to="/">Ascend today ▲</Link>
          </p>
        ) : (
          <ul className="logbook">
            {logbook.map((r) => (
              <li key={r.id}>
                <span>#{dayNumber(r.date)}</span>
                <span>{categoryName(r.cat)}</span>
                <span className="tier-row">{r.tiers.map((t, i) => <TierIcon key={i} tier={TIER_BY_ID[t]} />)}</span>
                <strong>{r.points}/{MAX_DIVE_POINTS}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
