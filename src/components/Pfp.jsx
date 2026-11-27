import PixelSprite from './PixelSprite.jsx';
import { PFP_BY_ID } from '../data/pfps.js';

/** A shrimp profile picture in a little porthole frame. */
export default function Pfp({ id = 'basic', size = 'md', locked = false, online }) {
  const scale = { xs: 1, sm: 2, md: 3, lg: 5, xl: 7 }[size] ?? 3;
  const pfp = PFP_BY_ID[id] || PFP_BY_ID.basic;
  return (
    <span className={`pfp pfp-${size} pfp-${pfp.id} ${locked ? 'is-locked' : ''}`} title={pfp.name}>
      {pfp.id === 'crowned' && <PixelSprite name="crown" scale={scale} className="pfp-crown" />}
      <PixelSprite name="shrimp" variant={pfp.id} scale={scale} title={pfp.name} />
      {locked && <span className="pfp-lock" aria-hidden="true">🔒</span>}
      {online !== undefined && <span className={`online-dot ${online ? 'is-on' : ''}`} aria-label={online ? 'online' : 'offline'} />}
    </span>
  );
}
