import PixelSprite from '../components/PixelSprite.jsx';

const SPRITE_FOR = {
  cucumber: { name: 'cucumber', variant: null, scale: 7 },
  crab: { name: 'crab', variant: null, scale: 6 },
  octopus: { name: 'octopus', variant: null, scale: 6 },
  turtle: { name: 'turtle', variant: null, scale: 5 },
  dolphin: { name: 'dolphin', variant: null, scale: 5 },
  shrimpion: { name: 'shrimp', variant: 'golden', scale: 6 },
};

/** The creature you became this ascent, swimming in with its name. */
export default function TierReveal({ tier, big = true }) {
  const s = SPRITE_FOR[tier.id];
  const isTop = tier.id === 'shrimpion';
  return (
    <div className={`tier-reveal tier-${tier.id} ${isTop ? 'is-shrimpion' : ''}`} style={{ '--tier': tier.color }}>
      {isTop && (
        <>
          <div className="sunburst" aria-hidden="true" />
          <div className="sparkles" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ '--i': i }}>
                ✦
              </span>
            ))}
          </div>
        </>
      )}
      <div className={`tier-creature anim-${tier.id}`}>
        {isTop && <PixelSprite name="crown" scale={Math.max(3, s.scale - 2)} className="tier-crown" />}
        <PixelSprite name={s.name} variant={s.variant} scale={big ? s.scale : Math.ceil(s.scale / 2)} title={tier.name} />
      </div>
      <div className="tier-name">
        {isTop ? (
          <span className="shimmer">
            ONE IN A<br />
            SHRIMPION
          </span>
        ) : (
          tier.name
        )}
      </div>
      <p className="tier-blurb">{tier.blurb}</p>
    </div>
  );
}
