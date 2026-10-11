import { useEffect, useRef, useState } from 'react';
import { createTerraria } from './terraria';
import { createLife } from './life';
import { createStitch } from './stitch';
import './previews.css';

const factories = { terraria: createTerraria, life: createLife, stitch: createStitch };
const descriptions = {
  terraria: 'A recorded rollout of a trained PPO policy in Terraria, using original game textures.',
  life: 'A live Conway’s Game of Life simulation. Draw to pause and paint live cells; release to resume. Press Enter to plant a glider in the center.',
  stitch: 'A looping demonstration that drags neural network layers into place, connects them, and passes a signal through the network.',
};

export default function ProjectPreview({ kind, title, fallback }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const needsDrawRef = useRef(true);
  const strokeRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { pausedRef.current = paused; needsDrawRef.current = true; }, [paused]);

  useEffect(() => {
    if (failed) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setFailed(true); return; }
    const engine = factories[kind]();
    engineRef.current = engine;
    let disposed = false;
    let width = 1, height = 1, visible = false, frameId, last = 0, time = 0;
    needsDrawRef.current = true;
    let dark = document.documentElement.dataset.theme === 'dark';
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      needsDrawRef.current = true;
    });
    resize.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
    });
    intersection.observe(canvas);
    const theme = new MutationObserver(() => {
      dark = document.documentElement.dataset.theme === 'dark';
      needsDrawRef.current = true;
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (engine.ready) engine.ready.then(() => {
      if (!disposed) needsDrawRef.current = true;
    }).catch(() => { if (!disposed) setFailed(true); });
    function frame(now) {
      frameId = requestAnimationFrame(frame);
      if (!visible || document.hidden || width < 1 || height < 1) { last = 0; return; }
      if (pausedRef.current && !needsDrawRef.current) { last = 0; return; }
      if (last && now - last < 1000 / 30 && !needsDrawRef.current) return;
      const dt = last ? Math.min((now - last) / 1000, 0.08) : 0;
      last = now;
      if (!pausedRef.current) time += dt;
      // Render once after pausing/resizing; preserve the exact simulation state.
      engine.draw(ctx, width, height, time, pausedRef.current ? 0 : dt, dark);
      needsDrawRef.current = false;
    }
    frameId = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resize.disconnect();
      intersection.disconnect();
      theme.disconnect();
      engine.destroy?.();
      engineRef.current = null;
      strokeRef.current = null;
    };
  }, [kind, failed]);

  function point(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  }

  function beginStroke(event) {
    if (!event.isPrimary || event.button !== 0 || strokeRef.current !== null) return;
    if (!engineRef.current?.beginStroke?.(...point(event))) return;
    event.preventDefault();
    strokeRef.current = event.pointerId;
    // Freeze immediately, including the frame before React updates the button.
    pausedRef.current = true;
    setPaused(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    needsDrawRef.current = true;
  }

  function extendStroke(event) {
    if (strokeRef.current !== event.pointerId) return;
    const samples = event.nativeEvent.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) {
      engineRef.current?.extendStroke?.(...point(sample));
    }
    needsDrawRef.current = true;
  }

  function finishStroke(event) {
    if (strokeRef.current !== event.pointerId) return;
    if (event.type === 'pointerup') extendStroke(event);
    engineRef.current?.endStroke?.();
    strokeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pausedRef.current = false;
    setPaused(false);
    needsDrawRef.current = true;
  }

  return (
    <div className={`project-preview preview-${kind}`}>
      {failed ? <img src={fallback} alt={title} className="h-full w-full object-contain" /> : <>
        <canvas ref={canvasRef} role={kind === 'life' ? 'button' : 'img'} aria-label={descriptions[kind]}
          tabIndex={kind === 'life' ? 0 : undefined}
          onPointerDown={kind === 'life' ? beginStroke : undefined}
          onPointerMove={kind === 'life' ? extendStroke : undefined}
          onPointerUp={kind === 'life' ? finishStroke : undefined}
          onPointerCancel={kind === 'life' ? finishStroke : undefined}
          onLostPointerCapture={kind === 'life' ? finishStroke : undefined}
          onKeyDown={kind === 'life' ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (strokeRef.current !== null) return;
              engineRef.current?.click?.(0.5, 0.5);
              needsDrawRef.current = true;
            }
          } : undefined} />
        <button type="button" className="preview-motion" aria-label={`${paused ? 'Play' : 'Pause'} ${title} animation`}
          aria-pressed={paused} onClick={() => {
            if (strokeRef.current === null) setPaused(value => !value);
          }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            {paused ? <path d="M2 1L9 5L2 9Z" /> : <path d="M2 1H4V9H2ZM6 1H8V9H6Z" />}
          </svg>
        </button>
      </>}
    </div>
  );
}
