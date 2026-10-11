const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const nodes = [
  { name: 'Input', detail: '28 × 28', color: '#ee6370', x: 14, y: 61, startX: 14, startY: 61 },
  { name: 'Flatten', detail: '784', color: '#d6a837', x: 86, y: 48, startX: 110, startY: 100 },
  { name: 'Dense', detail: '128 · ReLU', color: '#5488e8', x: 158, y: 76, startX: 167, startY: 44 },
  { name: 'Output', detail: '10 classes', color: '#4aaa80', x: 230, y: 53, startX: 230, startY: 53 },
];
const NODE_W = 56, NODE_H = 40, LOOP = 15;
function position(node, i, t) {
  const drag = i === 1 ? ease((t - 1) / 1.5) : i === 2 ? ease((t - 3) / 1.5) : 1;
  return { ...node, x: mix(node.startX, node.x, drag), y: mix(node.startY, node.y, drag) };
}
function curve(c, a, b, progress = 1) {
  const x0 = a.x + NODE_W, y0 = a.y + NODE_H / 2;
  const x1 = b.x, y1 = b.y + NODE_H / 2;
  c.beginPath();
  for (let i = 0; i <= 30 * progress; i++) {
    const t = i / 30, v = 1 - t, bend = Math.max(14, (x1 - x0) / 2);
    const x = v*v*v*x0 + 3*v*v*t*(x0+bend) + 3*v*t*t*(x1-bend) + t*t*t*x1;
    const y = v*v*v*y0 + 3*v*v*t*y0 + 3*v*t*t*y1 + t*t*t*y1;
    if (i === 0) c.moveTo(x,y); else c.lineTo(x,y);
  }
  c.stroke();
}
function cursor(c, x, y, pressed, dark) {
  if (pressed) {
    c.strokeStyle = '#7da3ec'; c.lineWidth = 1; c.globalAlpha = 0.3;
    c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
  }
  c.fillStyle = dark ? '#e1eafb' : '#36435c'; c.strokeStyle = dark ? '#172133' : '#fff'; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(x,y); c.lineTo(x+1,y+13); c.lineTo(x+5,y+9);
  c.lineTo(x+8,y+14); c.lineTo(x+11,y+12); c.lineTo(x+7,y+7); c.lineTo(x+13,y+6); c.closePath(); c.fill(); c.stroke();
}

export function createStitch() {
  return {
    draw(c, w, h, time, dt, dark) {
      const t = time % LOOP;
      c.fillStyle = dark ? '#171e2a' : '#f8f9fc'; c.fillRect(0, 0, w, h);
      c.fillStyle = dark ? '#303c50' : '#d8deea';
      for (let x = 8; x < w; x += 12) for (let y = 31; y < h - 18; y += 12) c.fillRect(x, y, 1, 1);
      c.font = '9px ui-monospace, SFMono-Regular, monospace';
      c.fillStyle = dark ? '#afbed6' : '#66758c'; c.fillText('STITCH / NETWORK BUILDER', 10, 17);
      const scale = (w - 14) / 300;
      c.save(); c.translate(7, 0); c.scale(scale, (h - 34) / 126);
      const placed = nodes.map((node, i) => position(node, i, t));
      // The complete build is displayed before the cursor resets for a new pass.
      for (let i = 0; i < 3; i++) {
        const progress = ease((t - (5 + i * 1.3)) / 0.9);
        c.strokeStyle = dark ? '#788eaf' : '#9aaac4'; c.lineWidth = 1.5;
        if (progress > 0) curve(c, placed[i], placed[i+1], progress);
        if (t > 9.3 && t < 13.9) {
          const p = ((t - 9.3) * 1.2 - i * 0.24) % 1;
          if (p >= 0) {
            c.strokeStyle = '#739df5'; c.lineWidth = 3; c.globalAlpha = Math.sin(p * Math.PI) * 0.8;
            curve(c, placed[i], placed[i+1]); c.globalAlpha = 1;
          }
        }
      }
      placed.forEach((node, i) => {
        c.shadowColor = dark ? '#00000040' : '#273a5b14'; c.shadowBlur = 6; c.shadowOffsetY = 2;
        c.fillStyle = dark ? '#202c3e' : '#fff'; c.strokeStyle = node.color; c.lineWidth = 1;
        c.beginPath(); c.roundRect(node.x, node.y, NODE_W, NODE_H, 4); c.fill(); c.stroke();
        c.shadowBlur = 0; c.shadowOffsetY = 0;
        c.fillStyle = node.color; c.globalAlpha = dark ? 0.2 : 0.12;
        c.fillRect(node.x+1, node.y+1, NODE_W-2, 17); c.globalAlpha = 1;
        c.font = 'bold 8px system-ui, sans-serif'; c.fillStyle = dark ? '#e0e9f8' : '#36465f';
        c.fillText(node.name, node.x+6, node.y+12);
        c.font = '7px ui-monospace, SFMono-Regular, monospace'; c.fillStyle = dark ? '#9bacc6' : '#78859a';
        c.fillText(node.detail, node.x+5, node.y+30);
        c.fillStyle = node.color;
        for (const x of [node.x, node.x+NODE_W]) {
          if ((i === 0 && x === node.x) || (i === 3 && x !== node.x)) continue;
          c.beginPath(); c.arc(x, node.y+NODE_H/2, 3, 0, Math.PI*2); c.fill();
        }
      });
      let x = 76, y = 121, pressed = false;
      if (t < 1) { const p = ease(t); x = mix(76, placed[1].x+20, p); y = mix(121, placed[1].y+9, p); }
      else if (t < 2.5) { x = placed[1].x+20; y = placed[1].y+9; pressed = true; }
      else if (t < 3) { const p = ease((t-2.5)*2); x=mix(106, placed[2].x+20,p); y=mix(57,placed[2].y+9,p); }
      else if (t < 4.5) { x=placed[2].x+20; y=placed[2].y+9; pressed = true; }
      else if (t < 9.3) {
        const i = Math.min(2, Math.max(0, Math.floor((t-5)/1.3)));
        const p = ease((t-(5+i*1.3))/.9);
        x=mix(placed[i].x+NODE_W,placed[i+1].x,p);
        y=mix(placed[i].y+NODE_H/2,placed[i+1].y+NODE_H/2,p); pressed=t>=5;
      } else { x = 267; y = 115; }
      if (t < 9.3) cursor(c,x,y,pressed,dark);
      c.restore();
      c.font = '8px ui-monospace, SFMono-Regular, monospace'; c.fillStyle = dark ? '#91a4c1' : '#7a889d';
      c.fillText(t < 4.5 ? '01  arrange layers' : t < 9.3 ? '02  connect tensors' : '03  forward pass',10,h-7);
      if (t >= 9.3) {
        c.textAlign='right'; c.fillStyle=dark ? '#72c69c' : '#428d69';
        c.fillText('784 → 128 → 10',w-10,h-7); c.textAlign='left';
      }
    },
  };
}
