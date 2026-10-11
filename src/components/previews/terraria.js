const BASE = '/animations/terraria/';
const GRID_SHEETS = { 1: 0, 2: 2, 3: 1, 5: 30, 7: 7, 8: 6, 9: 8, 15: 25, 16: 9 };
const FRAMES = [
  [[9,3],[10,3],[11,3]], [[6,3],[7,3],[8,3]], [[6,0],[7,0],[8,0]], [[5,0],[5,1],[5,2]],
  [[12,0],[12,1],[12,2]], [[1,4],[3,4],[5,4]], [[1,3],[3,3],[5,3]], [[4,0],[4,1],[4,2]],
  [[9,0],[9,1],[9,2]], [[0,4],[2,4],[4,4]], [[0,3],[2,3],[4,3]], [[0,0],[0,1],[0,2]],
  [[6,4],[7,4],[8,4]], [[1,2],[2,2],[3,2]], [[1,0],[2,0],[3,0]], [[1,1],[2,1],[3,1]],
];
// [sheet, sx, sy, cols, rows]: 16px Terraria frames on an 18px stride. Multi-tile furniture
// uses its native footprint (terraria-lite OBJECT_SCALE_V5), drawn with the simulator cell
// as the object's bottom-left anchor.
const OBJECTS = { 10:[4,3,2,1,1], 11:[215,0,0,3,2], 12:[18,0,0,2,1],
  13:[17,0,0,3,2], 14:[16,0,0,2,1], 17:[19,0,0,1,1], 18:[213,0,0,1,1],
  19:[21,0,0,2,2], 20:[21,0,76,2,2], 21:[12,0,0,2,2], 22:[71,0,0,1,1] };
// Widest/tallest footprint, so objects anchored just off-screen still draw their visible part.
const OBJECT_REACH = 2;
const LAYERS = [
  [10,'#ff7d5a',-1], [11,'#ffe6af',-1], [12,'#a0693c',-1],
  [3,'#ff7d5a',0], [6,'#afa58c',0], [7,'#ff7d5a',7],
  [8,'#a0b4d7',7], [4,'#afa58c',7], [5,'#ff7d5a',7],
  [0,'#ff7d5a',-1], [1,'#ffffff',-1], [2,'#695a4b',-1], ['Hair_1','#d75a37',-2],
];
let cachedAssets;
function loadAssets() {
  if (cachedAssets) return cachedAssets;
  const names = [...new Set([
    ...Object.values(GRID_SHEETS).map(n => `Tiles_${n}`), ...Object.values(OBJECTS).map(v => `Tiles_${v[0]}`),
    'Tiles_5', 'Tree_Tops_0', 'Tree_Branches_0', 'NPC_1', 'NPC_49', 'Item_1', 'Cloud_0',
    ...LAYERS.map(([n]) => typeof n === 'number' ? `Player_0_${n}` : `Player_${n}`),
  ])];
  cachedAssets = Promise.all([
    fetch(`${BASE}rollout.json`).then(r => { if (!r.ok) throw new Error('Rollout unavailable'); return r.json(); }),
    Promise.all(names.map(name => new Promise((resolve,reject) => {
      const img = new Image(); img.onload = () => resolve([name,img]); img.onerror = reject; img.src = `${BASE}${name}.png`;
    }))),
  ]).then(([data, entries]) => {
    const images = Object.fromEntries(entries);
    // Terraria's slime sheet is a neutral mask; the game applies its blue tint.
    const slime = images.NPC_1;
    const tintedSlime = document.createElement('canvas');
    tintedSlime.width = slime.width; tintedSlime.height = slime.height;
    const sc = tintedSlime.getContext('2d');
    sc.drawImage(slime,0,0);
    sc.globalCompositeOperation = 'multiply'; sc.fillStyle = '#5086e3';
    sc.fillRect(0,0,slime.width,slime.height);
    sc.globalCompositeOperation = 'destination-in'; sc.drawImage(slime,0,0);
    images.NPC_1 = tintedSlime;
    const atlas = document.createElement('canvas'); atlas.width = 800; atlas.height = 56;
    const c = atlas.getContext('2d');
    const layer = document.createElement('canvas'); layer.width = 40; layer.height = 56;
    const lc = layer.getContext('2d');
    for (let frame = 0; frame < 20; frame++) for (const [n,tint,col] of LAYERS) {
      const image = images[typeof n === 'number' ? `Player_0_${n}` : `Player_${n}`];
      const sy = (col === -2 ? Math.max(0,frame-6) : col === -1 ? frame : 0) * 56;
      lc.clearRect(0,0,40,56); lc.globalCompositeOperation = 'source-over';
      lc.drawImage(image,Math.max(col,0)*40,sy,40,56,0,0,40,56);
      lc.globalCompositeOperation = 'multiply'; lc.fillStyle = tint; lc.fillRect(0,0,40,56);
      lc.globalCompositeOperation = 'destination-in';
      lc.drawImage(image,Math.max(col,0)*40,sy,40,56,0,0,40,56);
      c.drawImage(layer,frame*40,0);
    }
    return { data, images, atlas };
  }).catch(error => { cachedAssets = null; throw error; });
  return cachedAssets;
}

export function createTerraria() {
  let assets, world, step = -1, accumulator = 0, cameraX, cameraY, frame;
  let lastPlayer;
  const ready = loadAssets().then(result => {
    assets = result; world = Uint8Array.from(assets.data.tiles); frame = assets.data.frames[0];
    cameraX = frame.p[0]+1; cameraY = frame.p[1]-2;
    lastPlayer = frame.p;
  });
  return {
    ready,
    draw(c,w,h,time,dt) {
      if (!assets) {
        c.fillStyle='#203634'; c.fillRect(0,0,w,h); c.fillStyle='#c1d2c8';
        c.font='9px ui-monospace, monospace'; c.fillText('Loading policy replay…',10,h/2); return;
      }
      const { data, images, atlas } = assets;
      accumulator += dt;
      const tick = 0.1;
      while (accumulator >= tick || step < 0) {
        if (step >= 0) accumulator -= tick;
        step++;
        if (step >= data.frames.length) {
          step = 0; world = Uint8Array.from(data.tiles);
          cameraX = data.frames[0].p[0]+1; cameraY = data.frames[0].p[1]-2;
        }
        lastPlayer = frame.p;
        frame = data.frames[step];
        for (const [i,tile] of frame.d) world[i] = tile;
        if (step === 0) lastPlayer = frame.p;
      }
      const blend = Math.min(1,accumulator/tick);
      const px=lastPlayer[0]+(frame.p[0]-lastPlayer[0])*blend;
      const py=lastPlayer[1]+(frame.p[1]-lastPlayer[1])*blend;
      const smooth = dt ? 1-Math.exp(-dt*8) : 0;
      cameraX += (px+1-cameraX)*smooth; cameraY += (py-2-cameraY)*smooth;
      const tile = 11, top = 26, bottom = h-24, sceneH = bottom-top;
      const ox=Math.round(w/2-cameraX*tile), oy=Math.round(top+sceneH*.54-cameraY*tile);
      c.imageSmoothingEnabled=false;
      const underground=py>39;
      const sky=c.createLinearGradient(0,top,0,bottom);
      sky.addColorStop(0,underground ? '#172332' : '#7faabb');
      sky.addColorStop(1,underground ? '#293747' : '#cad8c6');
      c.fillStyle=sky; c.fillRect(0,0,w,h);
      c.save(); c.beginPath(); c.rect(0,top,w,sceneH); c.clip();
      if (!underground) {
        for (let i=0;i<3;i++) {
          const cloud=images.Cloud_0; const x=((i*139-cameraX*2+time*1.4)%(w+100)+w+100)%(w+100)-50;
          c.globalAlpha=.36; c.drawImage(cloud,x,top+10+i*8,cloud.width*.6,cloud.height*.6);
        }
        c.globalAlpha=1;
        // Original tree canopies, softly receding behind the world geometry.
        for (let i=-1;i<7;i++) {
          const x=i*78-((cameraX*5)%78);
          c.globalAlpha=.18; c.drawImage(images.Tree_Tops_0,0,0,80,80,x,top+15,60,60);
        }
        c.globalAlpha=1;
      }
      const at=(x,y) => x<0||y<0||x>=data.width||y>=data.height ? 15 : world[y*data.width+x];
      const solid=t => Object.hasOwn(GRID_SHEETS,t);
      const x0=Math.max(0,Math.floor(-ox/tile)-OBJECT_REACH), x1=Math.min(data.width,Math.ceil((w-ox)/tile));
      const y0=Math.max(0,Math.floor((top-oy)/tile)), y1=Math.min(data.height,Math.ceil((bottom-oy)/tile)+OBJECT_REACH);
      for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) {
        const t=at(x,y), dx=ox+x*tile,dy=oy+y*tile;
        if (!t) continue;
        if (solid(t)) {
          const mask=(solid(at(x,y-1))?1:0)|(solid(at(x,y+1))?2:0)|(solid(at(x-1,y))?4:0)|(solid(at(x+1,y))?8:0);
          const [sx,sy]=FRAMES[mask][(x*7+y*13)%3];
          c.drawImage(images[`Tiles_${GRID_SHEETS[t]}`],sx*18,sy*18,16,16,dx,dy,tile,tile);
        } else if (t===4) c.drawImage(images.Tiles_5,0,((x+y)%3)*22,20,20,dx-1,dy,tile+2,tile);
        else if (t===6) c.drawImage(images.Tree_Tops_0,14+((x+y)%3)*16,22,16,16,dx,dy,tile,tile);
        else if (OBJECTS[t]) {
          const [sheet,sx,sy,cols,rows]=OBJECTS[t];
          for (let r=0;r<rows;r++) for (let k=0;k<cols;k++)
            c.drawImage(images[`Tiles_${sheet}`],sx+k*18,sy+r*18,16,16,dx+k*tile,dy-(rows-1-r)*tile,tile,tile);
        }
      }
      if (underground) {
        const light=c.createRadialGradient(w/2,top+sceneH*.54,12,w/2,top+sceneH*.54,95);
        light.addColorStop(0,'#08132200'); light.addColorStop(1,'#081322b0');
        c.fillStyle=light; c.fillRect(0,top,w,sceneH);
      }
      for (const [mx,my,kind,,phase] of frame.m) {
        const image=images[kind===1?'NPC_1':'NPC_49'];
        const fh=kind===1?26:24; const f=phase%2;
        c.drawImage(image,0,f*fh,image.width,fh,ox+mx*tile-3,oy+my*tile-8,tile*2,tile*1.3);
      }
      const walking=frame.a===1||frame.a===2;
      const playerFrame=frame.p[3]>0 ? 5 : walking ? 6+Math.floor(time*16)%14 : 0;
      const playerX=ox+px*tile-tile*.25,playerY=oy+(py-2)*tile-tile*.5;
      c.save();
      if (frame.p[2]<0) { c.translate(playerX+tile*1.25,0); c.scale(-1,1); }
      else c.translate(playerX+tile*1.25,0);
      c.drawImage(atlas,playerFrame*40,0,40,56,-tile*1.25,playerY,tile*2.5,tile*3.5);
      c.restore();
      const mining=frame.a>=data.mineFirst&&frame.a<data.placeFirst;
      const placing=frame.a>=data.placeFirst&&frame.a<data.placeFirst+data.reach.length;
      if (mining || placing) {
        const [rx,ry]=data.reach[frame.a-(mining?data.mineFirst:data.placeFirst)];
        const tx=ox+(frame.p[0]+rx)*tile,ty=oy+(frame.p[1]+ry)*tile;
        c.strokeStyle=mining?'#ffe6a9':'#abdcca'; c.lineWidth=1;
        c.strokeRect(tx-1,ty-1,tile+2,tile+2);
        c.save(); c.translate(playerX+tile*1.3,playerY+tile*1.8);
        c.rotate((frame.p[2]<0?-1:1)*(-.8+Math.sin(time*25)*.8));
        c.drawImage(images.Item_1,-5,-14,14,14); c.restore();
        c.fillStyle='#ffe6a9';
        for (let k=0;k<3;k++) c.fillRect(tx+tile/2+Math.sin(time*17+k*2)*8,ty+tile/2+Math.cos(time*13+k*2)*6,1.5,1.5);
      }
      c.restore();
      c.fillStyle='#142923ed'; c.fillRect(0,0,w,top); c.fillRect(0,bottom,w,h-bottom);
      c.font='9px ui-monospace, SFMono-Regular, monospace'; c.fillStyle='#c6dfd2';
      c.fillText('π  PPO POLICY REPLAY',9,16);
      const barX=Math.max(150,w-76),barW=35;
      if (w>230) {
        c.fillStyle='#4e6358'; c.fillRect(barX,10,barW,4);
        c.fillStyle='#94c99b'; c.fillRect(barX,10,barW*Math.max(0,frame.p[4]/frame.p[5]),4);
      }
      c.font='8px ui-monospace, SFMono-Regular, monospace'; c.fillStyle='#e1eadb';
      const name=data.actions[frame.a].replace('body ','').replace('above right column','up-right').replace('below right column','down-right');
      c.fillText(name,9,h-9);
      c.textAlign='right'; c.fillStyle='#91ad9e';
      const prob=frame.policy.find(([a])=>a===frame.a)?.[1];
      c.fillText(prob!==undefined ? `π(a) ${Math.round(prob*100)}%` : `STEP ${step+1}`,w-9,h-9);
      c.textAlign='left';
    },
  };
}
