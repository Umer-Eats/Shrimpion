import { Component } from 'react';

/** Keeps a crash in one page from blanking the whole ocean. Progress is in localStorage, so a reload resumes. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[shrimpion] page crashed', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="page-inner">
          <section className="panel center">
            <p className="kicker">Strong current</p>
            <h2 className="page-title" style={{ fontSize: 30 }}>
              Something knocked us off course
            </h2>
            <p className="muted">Your progress is saved. Reload to pick up where you left off.</p>
            <div className="stage-actions">
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload
              </button>
              <a className="btn" href="/">
                Home
              </a>
            </div>
          </section>
        </div>
      </div>
    );
  }
}
