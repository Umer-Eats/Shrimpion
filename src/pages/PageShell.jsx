import { useEffect } from 'react';
import { scene } from '../scene/sceneStore.js';

/** Standard content page: parks the ocean at a depth and dims it for reading. */
export default function PageShell({ v = 3, kicker, title, intro, children, wide = false, centered = false, header = true, headerAside }) {
  useEffect(() => {
    scene.setPose(v, { dim: 1 });
  }, [v]);
  const heading = (
    <>
      <p className="brand-mini">SHRIMPION</p>
      {kicker && <p className="kicker">{kicker}</p>}
      <h1 className="page-title">{title}</h1>
      {intro && <p className="page-intro">{intro}</p>}
    </>
  );
  return (
    <main className={`page ${wide ? 'is-wide' : ''} ${centered ? 'is-centered' : ''}`}>
      <div className="page-inner">
        {header && (headerAside ? (
          <header className="page-header-with-aside">
            <div className="page-heading">{heading}</div>
            {headerAside}
          </header>
        ) : heading)}
        {children}
      </div>
    </main>
  );
}
