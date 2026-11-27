import { useEffect } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import OceanScene from './scene/OceanScene.jsx';
import { scene } from './scene/sceneStore.js';
import TopBar from './components/TopBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useProgress } from './data/progress.js';
import { useAuth } from './firebase/AuthContext.jsx';
import { play } from './audio/sfx.js';
import Home from './pages/Home.jsx';
import Dive from './pages/Dive.jsx';
import Unlimited from './pages/Unlimited.jsx';
import Archive from './pages/Archive.jsx';
import MyShrimpion from './pages/MyShrimpion.jsx';
import Friends from './pages/Friends.jsx';
import SevenSeas from './pages/SevenSeas.jsx';
import FAQ from './pages/FAQ.jsx';
import UrchinParty from './pages/UrchinParty.jsx';
import PageShell from './pages/PageShell.jsx';
import { getPageHead, NOT_FOUND } from './seo.js';

function updatePageHead(pathname) {
  const current = [...document.head.querySelectorAll('[data-route-seo]')];
  const next = getPageHead(pathname).map(({ tag, attrs = {}, text }) => {
    const element = document.createElement(tag);
    element.setAttribute('data-route-seo', '');
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
  });
  if (current.length === next.length && current.every((element, i) => element.isEqualNode(next[i]))) return;

  current.forEach((element) => element.remove());
  document.head.append(...next);
}

function NotFound() {
  return (
    <PageShell title={NOT_FOUND.heading} intro={NOT_FOUND.description}>
      <Link to="/" className="btn btn-primary">Play Shrimpion</Link>
    </PageShell>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const pfp = useProgress((s) => s.profile.pfp);
  const inGame = pathname === '/dive';

  useEffect(() => {
    scene.shrimpVariant = auth.profile?.pfp || pfp || 'basic';
  }, [pfp, auth.profile?.pfp]);

  // soft click for menus and buttons outside the ascent (the ascent has its own sounds)
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest?.('a[href], button');
      if (!el || el.disabled || el.closest('.stage') || el.classList.contains('sound-btn')) return;
      play('tap');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    updatePageHead(pathname);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <OceanScene />
      <div className="crt" aria-hidden="true" />
      <TopBar compact={inGame} />
      <ErrorBoundary key={pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dive" element={<Dive key={auth.user?.uid ?? 'guest'} />} />
        <Route path="/unlimited" element={<Unlimited key={auth.user?.uid ?? 'guest'} />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/me" element={<MyShrimpion />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/seas" element={<SevenSeas />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/urchin-party" element={<UrchinParty />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
      <AuthModal />
    </>
  );
}
