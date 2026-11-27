import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import PixelSprite from '../components/PixelSprite.jsx';

export default function UrchinParty() {
  return (
    <PageShell v={6.4} kicker="Coming soon" title="Urchin Party">
      <section className="panel urchin-stage">
        <div className="urchin-scene" aria-hidden="true">
          <div className="urchin-glow" />
          <PixelSprite name="urchin" scale={9} className="urchin-hero" />
          <PixelSprite name="shrimp" scale={3} className="urchin-buddy b1" />
          <PixelSprite name="shrimp" variant="blue" scale={3} className="urchin-buddy b2" flip />
          <PixelSprite name="shrimp" variant="glow" scale={3} className="urchin-buddy b3" />
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="party-bubble" style={{ '--i': i }} />
          ))}
        </div>
        <h2 className="center">Learn together, not against each other.</h2>
        <p>
          Urchin Party is Shrimpion’s multiplayer mode, now in the works. Instead of racing to out-niche your friends, the whole
          party swims up together: everyone learns the same facts, helps each other through the tests, and the urchin cheers the
          group on. The more of you who get it right, the higher the whole party rises.
        </p>
        <ul className="party-points">
          <li>✺ Invite friends from your Friends list</li>
          <li>✺ Shared fact cards and team tests</li>
          <li>✺ One ascent, one party, no timers</li>
        </ul>
        <div className="stage-actions">
          <Link to="/friends" className="btn btn-primary">
            Line up your friends ♥
          </Link>
          <Link to="/" className="btn">
            ▲ Ascend solo for now
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
