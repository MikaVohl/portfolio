import { useRef, useEffect } from 'react';
import { createGlitchGrid } from './heroGlitch';

// Fixed hero background; alternatives remain available here for future changes.
//   chroma — digits scramble with a red/blue split that converges as they settle
//   cross  — the original + grid that rotates and scales under the cursor
//   pixel  — digits drop to a 3×5 bitmap and lock back into shape
const HERO_EFFECT = 'chroma';

const ROWS = 16;
const COLS = 50;
const COUNT = ROWS * COLS;
const CELL = 30;
const RADIUS = 110; // brushstroke radius in px

function CrossGrid({ sectionRef }) {
  const crossRefs = useRef([]);
  const rafRef = useRef(null);
  const rectRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const intensities = Array(COUNT).fill(0);

    const updateRect = () => { rectRef.current = section.getBoundingClientRect(); };
    updateRect();
    window.addEventListener('resize', updateRect);

    const handleMouseMove = (e) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = rectRef.current;
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const gridOffsetX = rect.width - COLS * CELL;
        const els = crossRefs.current;

        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          if (!el) continue;
          const cx = gridOffsetX + (i % COLS) * CELL + CELL / 2;
          const cy = ((i / COLS) | 0) * CELL + CELL / 2;
          const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
          const t = Math.max(0, 1 - dist / RADIUS);

          // Activate immediately, then fade briefly as the cursor moves past.
          el.style.transition = t > intensities[i]
            ? 'none'
            : 'transform 160ms ease-out, color 160ms ease-out';
          intensities[i] = t;
          if (t > 0.01) {
            el.style.transform = `rotate(${t * 60}deg) scale(${1 + t * 0.35})`;
            el.style.setProperty('--cross-intensity', `${t * 100}%`);
          } else {
            el.style.transform = '';
            el.style.removeProperty('--cross-intensity');
          }
        }
      });
    };

    const handleMouseLeave = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      intensities.fill(0);
      const els = crossRefs.current;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        // restore CSS transition — spring eases everything back to neutral
        el.style.transition = '';
        el.style.transform = '';
        el.style.removeProperty('--cross-intensity');
      }
    };

    section.addEventListener('mousemove', handleMouseMove);
    section.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      section.removeEventListener('mousemove', handleMouseMove);
      section.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', updateRect);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sectionRef]);

  return (
    <div className="cross-grid" style={{ animation: 'fade-in 1s ease-out 0.3s both' }}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <span key={i} ref={(el) => { crossRefs.current[i] = el; }} className="cross-sym">
          +
        </span>
      ))}
    </div>
  );
}

function GlitchGrid({ sectionRef, effect }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    return createGlitchGrid(canvas, section, effect);
  }, [sectionRef, effect]);

  return (
    <canvas
      ref={canvasRef}
      className="glitch-grid"
      aria-hidden="true"
      style={{ animation: 'fade-in 1s ease-out 0.3s both' }}
    />
  );
}

export default function Intro() {
  const sectionRef = useRef(null);
  const effect = HERO_EFFECT;

  return (
    <section
      ref={sectionRef}
      id="intro"
      className="scroll-mt-32 py-4 text-center md:py-12 relative overflow-hidden"
    >
      {effect === 'cross' && <CrossGrid sectionRef={sectionRef} />}
      {(effect === 'chroma' || effect === 'pixel') && <GlitchGrid sectionRef={sectionRef} effect={effect} />}
      <div className="relative z-10 pointer-events-none flex w-full max-w-5xl flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:gap-16 md:text-left">
        <div className="order-2 max-w-xl text-center md:order-1 md:text-left">
          <h2
            className="text-5xl font-semibold md:text-6xl"
            style={{ animation: 'fade-up 0.5s ease-out 0.15s both' }}
          >
            Mika Vohl
          </h2>
          <h3
            className="text-muted mt-5 text-lg md:text-2xl"
            style={{ animation: 'fade-up 0.5s ease-out 0.35s both' }}
          >
            Computer Science and Physics @ McGill
            <br />
            Machine Learning & Software Engineer
          </h3>
        </div>
        <picture
          className="order-1 flex-shrink-0 md:order-2"
          style={{ animation: 'fade-up 0.5s ease-out 0s both' }}
        >
          <source type="image/webp" srcSet="/images/MikaVohl_1x.webp 1x, /images/MikaVohl_2x.webp 2x" />
          <source type="image/jpeg" srcSet="/images/MikaVohl_1x.jpg 1x, /images/MikaVohl_2x.jpg 2x" />
          <img
            src="/images/MikaVohl_2x.jpg"
            width="352"
            height="352"
            alt="Mika Vohl portrait"
            className="w-48 md:w-60 flex-shrink-0 rounded-[10%]"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
    </section>
  );
}
