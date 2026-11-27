import PixelSprite from './PixelSprite.jsx';

/** Inline pixel-art icon. Shrimpion uses these everywhere instead of emoji. */
export default function Icon({ name, scale = 2, className = '', title }) {
  return <PixelSprite name={name} scale={scale} className={`px-icon ${className}`} title={title} />;
}

const TIER_SPRITE = {
  cucumber: { name: 'cucumber' },
  crab: { name: 'crab' },
  octopus: { name: 'octopus' },
  turtle: { name: 'turtle' },
  dolphin: { name: 'dolphin' },
  shrimpion: { name: 'shrimp', variant: 'golden' },
};

/** The tier's own creature as a small inline sprite. */
export function TierIcon({ tier, scale = 1, className = '' }) {
  if (!tier) return null;
  const s = TIER_SPRITE[tier.id] || TIER_SPRITE.cucumber;
  return <PixelSprite name={s.name} variant={s.variant} scale={scale} className={`px-icon tier-icon ${className}`} title={tier.name} />;
}
