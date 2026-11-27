import { useState } from 'react';
import { useAuth, friendlyAuthError } from '../firebase/AuthContext.jsx';
import Modal from './Modal.jsx';
import PixelSprite from './PixelSprite.jsx';

export default function AuthModal() {
  const auth = useAuth();
  const [mode, setMode] = useState('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!auth.authOpen || auth.user) return null;

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      auth.closeAuth();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Save your progress" onClose={auth.closeAuth}>
      <div className="auth-hero">
        <PixelSprite name="shrimp" scale={3} />
        <p>Keep your streak, facts learned and shrimp collection on every device, and climb the 7 Seas.</p>
      </div>

      {!auth.configured ? (
        <div className="notice">
          <strong>Accounts are almost ready.</strong> Firebase hasn’t been connected yet, so sign-in is switched off. Your
          progress is still saved on this device in the meantime.
        </div>
      ) : (
        <>
          <button className="btn btn-google" disabled={busy} onClick={() => run(auth.signInGoogle)}>
            <span className="g-mark" aria-hidden="true">G</span> Continue with Google
          </button>
          <div className="divider">
            <span>or</span>
          </div>
          <div className="seg" role="tablist">
            <button role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'is-on' : ''} onClick={() => setMode('create')}>
              Create account
            </button>
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-on' : ''} onClick={() => setMode('login')}>
              Log in
            </button>
          </div>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => (mode === 'create' ? auth.signUpEmail(email, password, username.trim()) : auth.signInEmail(email, password)));
            }}
          >
            {mode === 'create' && (
              <label>
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="shrimpfan_42" maxLength={16} pattern="[A-Za-z0-9_]{3,16}" title="3–16 letters, numbers or underscores" />
              </label>
            )}
            <label>
              Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input type="password" required minLength={6} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? 'One moment…' : mode === 'create' ? 'Create account' : 'Log in'}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
