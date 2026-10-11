// Canvas digit grid for the hero, ported from the "Glitch to digits" branches in
// public/interface-studies.html. Same 50×16 layout, 30px cells, and mask as the cross grid.
const ROWS = 16;
const COLS = 50;
const CELL = 30;
const COUNT = ROWS * COLS;
const RADIUS = 110;
// Keep animating this long after the last cell left the brush, so every burst can finish.
const SETTLE_SECONDS = 1.6;
const FONT = '15px ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';
const SYMBOLS = ['░', '▒', '▓', '<', '>', '/', '\\', '{', '}', '+', '×', '÷', '∑', '∂', '∞', '≠', 'λ', '?'];
// 3×5 bitmaps, row-major.
const PIXEL_DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];

const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const pick = (n, age, step) => SYMBOLS[Math.floor(hash(n * 13 + Math.floor(age / step)) * SYMBOLS.length)];

// A finite burst after the cell entered the brush, with a hashed per-cell delay and duration.
function burst(n, start, clock, delay, duration, spread) {
  const age = clock - start - hash(n + 73) * delay;
  return { age, p: age / (duration + hash(n + 19) * spread) };
}

function drawDigit(ctx, colors, cell, x, y, t, alpha = 1) {
  ctx.globalAlpha = (0.55 + t * 0.45) * alpha;
  ctx.fillStyle = cell.hot ? colors.hot : colors.digit;
  ctx.fillText(cell.label, x, y);
}

// Red and blue copies separate from each glyph and converge as it settles.
function drawChroma(ctx, colors, cell, n, x, y, t, clock, dark) {
  const { age, p } = burst(n, cell.start, clock, 0.12, 0.5, 0.4);
  if (p < 0 || p >= 1) return drawDigit(ctx, colors, cell, x, y, t);
  const step = Math.floor(age / 0.05);
  const k = (1 - p) * 5;
  const dx = (hash(n + step * 3) - 0.5) * 2 * k + k * 0.5;
  const dy = (hash(n * 3 + step) - 0.5) * k * 0.6;
  const str = p < 0.7 ? pick(n, age, 0.06) : cell.label;
  ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#ff2d55';
  ctx.fillText(str, x - dx, y - dy);
  ctx.fillStyle = '#00a3ff';
  ctx.fillText(str, x + dx, y + dy);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.35 + 0.6 * p;
  ctx.fillStyle = colors.ink;
  ctx.fillText(str, x, y);
}

// The digit drops to a 3×5 bitmap; pixels lock into shape one by one, then the type fades back.
function drawPixel(ctx, colors, cell, n, x, y, t, clock) {
  const { age, p } = burst(n, cell.start, clock, 0.1, 0.55, 0.45);
  if (p < 0 || p >= 1.35) return drawDigit(ctx, colors, cell, x, y, t);
  const map = PIXEL_DIGITS[cell.base];
  const settle = clamp((p - 1) / 0.35);
  const step = Math.floor(age / 0.05);
  for (let k = 0; k < 15; k++) {
    const locked = p > hash(n * 5 + k) * 0.85;
    if (!(locked ? map[k] === '1' : hash(n * 31 + k * 7 + step) > 0.55)) continue;
    ctx.globalAlpha = (locked ? 0.85 : 0.5) * (1 - settle);
    ctx.fillStyle = locked ? colors.lock : colors.hot;
    ctx.fillRect(x - 4.8 + (k % 3) * 3.4, y - 8.2 + Math.floor(k / 3) * 3.4, 2.8, 2.8);
  }
  if (settle > 0) drawDigit(ctx, colors, cell, x, y, t, settle);
}

const renderers = { chroma: drawChroma, pixel: drawPixel };

export function createGlitchGrid(canvas, section, effect) {
  const ctx = canvas.getContext('2d');
  const render = renderers[effect];
  if (!ctx || !render) return () => {};
  const cells = Array.from({ length: COUNT }, (_, n) => {
    const base = Math.floor(hash(n) * 10);
    return { base, label: String(base), hot: false, start: -100 };
  });
  const width = COLS * CELL;
  const height = ROWS * CELL;
  let colors = null, dark = false, ratio = 0;
  let pointer = null, q = { x: 0, y: 0 }, amount = 0;
  let clock = 0, last = 0, lastHot = -100, frameId = 0;

  const readColors = () => {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    colors = { digit: v('--glitch-digit'), hot: v('--glitch-hot'), ink: v('--glitch-ink'), lock: v('--glitch-lock') };
    dark = document.documentElement.dataset.theme === 'dark';
  };
  const fitCanvas = () => {
    const next = Math.min(window.devicePixelRatio || 1, 2);
    if (next === ratio) return;
    ratio = next;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  };

  function draw() {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 0; n < COUNT; n++) {
      const cell = cells[n];
      const x = (n % COLS) * CELL + CELL / 2;
      const y = ((n / COLS) | 0) * CELL + CELL / 2;
      const t = amount > 0.001 ? amount * smooth(1 - Math.hypot(x - q.x, y - q.y) / RADIUS) : 0;
      const hot = t > 0.06;
      if (hot && !cell.hot) cell.start = clock;
      if (hot) lastHot = clock;
      cell.hot = hot;
      render(ctx, colors, cell, n, x, y, t, clock, dark);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    clock += dt;
    if (pointer) {
      // Pointer is stored in client coordinates so scrolling under a still cursor stays correct.
      const rect = canvas.getBoundingClientRect();
      const p = { x: pointer.x - rect.left, y: pointer.y - rect.top };
      if (amount < 0.01) q = p;
      const k = 1 - Math.exp(-12 * dt);
      q.x += (p.x - q.x) * k;
      q.y += (p.y - q.y) * k;
    }
    amount += ((pointer ? 1 : 0) - amount) * (1 - Math.exp(-12 * dt));
    draw();
    if (pointer || amount > 0.002 || clock - lastHot < SETTLE_SECONDS) frameId = requestAnimationFrame(frame);
    else { frameId = 0; last = 0; amount = 0; }
  }
  const wake = () => { if (!frameId) frameId = requestAnimationFrame(frame); };

  const onMove = (e) => {
    // The grid is hidden below md; skip the work entirely there.
    if (!canvas.offsetWidth) return;
    pointer = { x: e.clientX, y: e.clientY };
    wake();
  };
  const onLeave = () => { pointer = null; wake(); };
  const onResize = () => { fitCanvas(); if (!frameId) draw(); };
  const theme = new MutationObserver(() => { readColors(); if (!frameId) draw(); });

  readColors();
  fitCanvas();
  draw();
  section.addEventListener('mousemove', onMove);
  section.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', onResize);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return () => {
    cancelAnimationFrame(frameId);
    section.removeEventListener('mousemove', onMove);
    section.removeEventListener('mouseleave', onLeave);
    window.removeEventListener('resize', onResize);
    theme.disconnect();
  };
}
