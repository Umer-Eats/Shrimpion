import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import OceanScene from './scene/OceanScene.jsx';
import { scene } from './scene/sceneStore.js';
import TopBar from './components/TopBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useProgress } from './data/progress.js';
import { useAuth } from './firebase/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Dive from './pages/Dive.jsx';
import Unlimited from './pages/Unlimited.jsx';
import Archive from './pages/Archive.jsx';
import MyShrimpion from './pages/MyShrimpion.jsx';
import Friends from './pages/Friends.jsx';
import SevenSeas from './pages/SevenSeas.jsx';
import FAQ from './pages/FAQ.jsx';
import UrchinParty from './pages/UrchinParty.jsx';

const TITLES = {
  '/': 'Shrimpion · the daily ascent',
  '/dive': 'Ascending · Shrimpion',
  '/unlimited': 'Unlimited · Shrimpion',
  '/archive': 'Archive · Shrimpion',
  '/me': 'My Shrimpion',
  '/friends': 'Friends · Shrimpion',
  '/seas': 'The 7 Seas · Shrimpion',
  '/faq': 'FAQ · Shrimpion',
  '/urchin-party': 'Urchin Party · Shrimpion',
};

export default function App() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const pfp = useProgress((s) => s.profile.pfp);
  const inGame = pathname === '/dive' || pathname === '/unlimited';

  useEffect(() => {
    scene.shrimpVariant = auth.profile?.pfp || pfp || 'basic';
  }, [pfp, auth.profile?.pfp]);

  useEffect(() => {
    document.title = TITLES[pathname] || 'Shrimpion';
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
        <Route path="/dive" element={<Dive />} />
        <Route path="/unlimited" element={<Unlimited />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/me" element={<MyShrimpion />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/seas" element={<SevenSeas />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/urchin-party" element={<UrchinParty />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
      <AuthModal />
    </>
  );
}
