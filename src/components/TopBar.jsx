import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext.jsx';
import { useProgress } from '../data/progress.js';
import Pfp from './Pfp.jsx';
import Icon from './Icon.jsx';
import { useMuted, setMuted } from '../audio/sfx.js';

function SoundToggle() {
  const muted = useMuted();
  return (
    <button
      className="icon-btn sound-btn"
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      aria-pressed={!muted}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={() => setMuted(!muted)}
    >
      <Icon name={muted ? 'icon-mute' : 'icon-sound'} />
    </button>
  );
}

export const NAV = [
  { to: '/', label: 'Daily Swim', icon: '▲' },
  { to: '/unlimited', label: 'Unlimited', icon: '∞' },
  { to: '/urchin-party', label: 'Urchin Party', icon: '✺' },
  { to: '/archive', label: 'Archive', icon: '⟲' },
  { to: '/seas', label: '7 Seas', icon: '≋' },
  { to: '/me', label: 'My Shrimpion', icon: '◉' },
  { to: '/friends', label: 'Friends', icon: 'icon-heart' },
  { to: '/faq', label: 'FAQ', icon: '?' },
];

export default function TopBar({ compact = false }) {
  const [open, setOpen] = useState(false);
  const { user, profile, pfp, openAuth } = useAuth();
  const local = useProgress((s) => s.profile);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className={`topbar ${compact ? 'is-compact' : ''}`}>
        <button className="icon-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <span className="burger" aria-hidden="true" />
        </button>
        {!compact && (
          <nav className="topnav" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className="topnav-link">
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="topbar-right">
          <SoundToggle />
          {user ? (
            <Link to="/me" className="me-chip">
              <Pfp id={pfp || local.pfp} size="xs" />
              <span>{profile?.username || local.username || 'my shrimpion'}</span>
            </Link>
          ) : (
            <button className="btn btn-save" onClick={openAuth}>
              <span aria-hidden="true">⛁</span> Save your progress
            </button>
          )}
        </div>
      </header>

      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="drawer" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="logo-small">SHRIMPION</span>
              <button className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <p className="drawer-kicker">Swim up</p>
            <nav className="drawer-nav">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'} className="drawer-link">
                  <span className="drawer-icon" aria-hidden="true">
                    {n.icon.startsWith('icon-') ? <Icon name={n.icon} /> : n.icon}
                  </span>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            {!user && (
              <button className="btn btn-primary drawer-save" onClick={openAuth}>
                Save your progress
              </button>
            )}
            <p className="drawer-foot">one in a shrimpion.</p>
          </aside>
        </div>
      )}
    </>
  );
}
