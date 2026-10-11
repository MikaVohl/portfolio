const COLS = 48, ROWS = 20;
const GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
const GUN = [[24,0],[22,1],[24,1],[12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
  [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],[0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
  [0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],[10,6],[16,6],[24,6],
  [11,7],[15,7],[12,8],[13,8]];

// Toroidal boundaries: cells leaving one edge enter at the opposite edge.
export function evolve(cells, cols = COLS, rows = ROWS) {
  const next = new Uint8Array(cells.length);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let neighbors = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) neighbors += cells[((y + dy + rows) % rows) * cols + (x + dx + cols) % cols];
    }
    const i = y * cols + x;
    next[i] = neighbors === 3 || (cells[i] && neighbors === 2) ? 1 : 0;
  }
  return next;
}

// Connect sampled pointer cells so quick gestures leave a continuous stroke.
export function rasterizeStroke(from, to, cols = COLS, rows = ROWS) {
  let [x, y] = from;
  const [endX, endY] = to;
  const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let error = dx + dy;
  const indices = [];
  for (;;) {
    if (x >= 0 && x < cols && y >= 0 && y < rows) indices.push(y * cols + x);
    if (x === endX && y === endY) break;
    const doubled = error * 2;
    if (doubled >= dy) { error += dy; x += sx; }
    if (doubled <= dx) { error += dx; y += sy; }
  }
  return indices;
}

export function createLife() {
  let cells = new Uint8Array(COLS * ROWS), previous = cells.slice();
  let generation = 0, accumulator = 0, blooms = 0, history = new Set();
  let area = { left: 0, top: 0, cell: 1, width: 1, height: 1 };
  let stroke = null, lastPoint = null;
  function gridPoint(x, y) {
    return [Math.floor((x * area.width - area.left) / area.cell),
      Math.floor((y * area.height - area.top) / area.cell)];
  }
  function extendStroke(x, y) {
    if (!stroke) return;
    const next = gridPoint(x, y);
    for (const i of rasterizeStroke(lastPoint, next)) stroke.add(i);
    lastPoint = next;
  }
  function stamp(pattern, x, y) {
    for (const [dx, dy] of pattern) cells[((y + dy + ROWS) % ROWS) * COLS + (x + dx + COLS) % COLS] = 1;
    history.clear();
  }
  function seed() {
    cells.fill(0);
    stamp(GUN, 2, 1);
    stamp([[1,0],[2,0],[0,1],[1,1],[1,2]], 39, 12); // R-pentomino
    stamp(GLIDER, 22, 14);
    previous = cells.slice();
    history.clear();
  }
  seed();
  return {
    beginStroke(x, y) {
      const [col, row] = gridPoint(x, y);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
      stroke = new Set([row * COLS + col]);
      lastPoint = [col, row];
      return true;
    },
    extendStroke,
    endStroke() {
      if (!stroke) return;
      for (const i of stroke) cells[i] = 1;
      stroke = null;
      lastPoint = null;
      history.clear();
      accumulator = 0; // Give the completed drawing a full generation on screen.
    },
    click(x, y) {
      const [col, row] = gridPoint(x, y);
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) stamp(GLIDER, col, row);
    },
    draw(c, w, h, time, dt, dark) {
      if (!stroke) accumulator += dt;
      while (!stroke && accumulator >= 0.13) {
        accumulator -= 0.13;
        previous = cells;
        cells = evolve(cells);
        generation++;
        const key = cells.join('');
        if (history.has(key) || !cells.some(Boolean)) {
          // New organisms keep an eventually static world alive; the evolution
          // between injections always follows the actual B3/S23 rules.
          blooms++;
          stamp(GLIDER, 4 + (blooms * 13) % 36, 2 + (blooms * 7) % 14);
          if (blooms % 8 === 0) seed();
        }
        history.add(key);
        if (history.size > 100) history.delete(history.values().next().value);
      }
      c.fillStyle = dark ? '#131d2b' : '#f5f8ff';
      c.fillRect(0, 0, w, h);
      const cell = Math.min((w - 20) / COLS, (h - 43) / ROWS);
      const left = (w - COLS * cell) / 2, top = 28 + (h - 43 - ROWS * cell) / 2;
      area = { left, top, cell, width: w, height: h };
      c.fillStyle = dark ? '#28384d' : '#dce5f3';
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        c.globalAlpha = 1;
        c.fillStyle = stroke?.has(i) ? (dark ? '#75e4ca' : '#2ba990') : cells[i]
          ? (previous[i] ? (dark ? '#87acff' : '#416fce') : (dark ? '#b8d1ff' : '#79a4f9'))
          : previous[i] ? (dark ? '#344b76' : '#c4d6f7') : (dark ? '#243246' : '#e2e9f4');
        c.fillRect(left + x * cell, top + y * cell, Math.max(1, cell - 1), Math.max(1, cell - 1));
      }
      c.font = '9px ui-monospace, SFMono-Regular, monospace';
      c.fillStyle = dark ? '#a5bce4' : '#526c96';
      c.fillText('CONWAY’S GAME OF LIFE', 10, 17);
      c.font = '8px ui-monospace, SFMono-Regular, monospace';
      c.fillStyle = dark ? '#8fa2bd' : '#7183a0';
      c.fillText(`GEN ${String(generation).padStart(4, '0')}  ·  B3 / S23`, 10, h - 6);
      c.textAlign = 'right';
      c.fillText(stroke ? 'release to run' : 'drag to draw', w - 9, h - 6);
      c.textAlign = 'left';
    },
  };
}
