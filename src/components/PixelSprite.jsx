import { useEffect, useRef } from 'react';
import { spriteCanvas } from '../art/render.js';

/** Renders one of the pixel sprites at a crisp integer scale. */
export default function PixelSprite({ name, variant = null, scale = 4, flip = false, className = '', title, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const src = spriteCanvas(name, { variant, flip });
    const c = ref.current;
    c.width = src.width * scale;
    c.height = src.height * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0, c.width, c.height);
  }, [name, variant, scale, flip]);
  return (
    <canvas
      ref={ref}
      className={`pixel-sprite ${className}`}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
