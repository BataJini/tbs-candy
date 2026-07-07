// textures.js — every texture in the game is cooked on a <canvas> at boot.
// Dirty pixels, dithering, hand-drawn posters. No external assets.
import * as THREE from 'three';

export function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

let SEED = 1337;
export function srand(s) { SEED = s; }
export function rnd() { // deterministic-ish, fine for art
  SEED = (SEED * 16807) % 2147483647;
  return (SEED - 1) / 2147483646;
}
const pick = (arr) => arr[(rnd() * arr.length) | 0];

export function dither(ctx, w, h, amount = 14, chance = 0.45) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (rnd() < chance) {
      const n = (rnd() * 2 - 1) * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function grunge(ctx, w, h, n = 30, col = 'rgba(0,0,0,0.08)') {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, rnd() * w * 0.09 + 2, 0, 7);
    ctx.fill();
  }
}

function drips(ctx, x, y, w, color, n = 4) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const dx = x + rnd() * w;
    const len = 6 + rnd() * 26;
    ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx + (rnd() - .5) * 3, y + len); ctx.stroke();
  }
}

export function tex(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeatX !== 1 || repeatY !== 1) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
  }
  return t;
}

/* ---------- WORLD SURFACES ---------- */
export function concreteTex(base = '#a99c86', size = 128) {
  const [c, x] = mkCanvas(size, size);
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  grunge(x, size, size, 24);
  grunge(x, size, size, 10, 'rgba(255,255,255,0.05)');
  x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    x.beginPath();
    let px = rnd() * size, py = rnd() * size;
    x.moveTo(px, py);
    for (let j = 0; j < 5; j++) { px += (rnd() - .5) * 40; py += rnd() * 20; x.lineTo(px, py); }
    x.stroke();
  }
  dither(x, size, size, 12);
  return c;
}

export function asphaltTex() {
  const [c, x] = mkCanvas(128, 128);
  x.fillStyle = '#4a4550'; x.fillRect(0, 0, 128, 128);
  grunge(x, 128, 128, 40, 'rgba(0,0,0,0.12)');
  grunge(x, 128, 128, 14, 'rgba(255,255,255,0.04)');
  x.fillStyle = 'rgba(30,20,50,0.35)';
  for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(rnd() * 128, rnd() * 128, 18 * rnd() + 6, 10 * rnd() + 4, rnd() * 3, 0, 7); x.fill(); }
  dither(x, 128, 128, 10);
  return c;
}

// Soviet block facade: windows, balconies, stains, laundry drawn flat
export function blockFacadeTex(baseCol, floors = 6, cols = 5, litChance = 0.25) {
  const W = 192, H = 256;
  const [c, x] = mkCanvas(W, H);
  x.fillStyle = baseCol; x.fillRect(0, 0, W, H);
  grunge(x, W, H, 26);
  const fh = H / floors, cw = W / cols;
  for (let f = 0; f < floors; f++) {
    for (let k = 0; k < cols; k++) {
      const wx = k * cw + cw * 0.22, wy = f * fh + fh * 0.2, ww = cw * 0.56, wh = fh * 0.5;
      x.fillStyle = rnd() < litChance ? pick(['#ffd76b', '#ffb85c', '#c8f7ff']) : pick(['#232030', '#2c2838', '#1d1a28']);
      const style = rnd();
      const rTop = ww / 2;
      x.strokeStyle = "#0d0a14"; x.lineWidth = 3;
      if (style < 0.4) {
        x.beginPath(); x.ellipse(wx + ww / 2, wy + wh / 2, ww / 2, wh / 2, 0, 0, 7); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.stroke();
        x.beginPath(); x.moveTo(wx, wy + wh / 2); x.lineTo(wx + ww, wy + wh / 2); x.stroke();
      } else {
        x.beginPath();
        x.moveTo(wx, wy + wh);
        x.lineTo(wx, wy + rTop);
        x.arc(wx + ww / 2, wy + rTop, rTop, Math.PI, 0);
        x.lineTo(wx + ww, wy + wh);
        x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(wx + ww / 2, wy + rTop); x.lineTo(wx + ww / 2, wy + wh); x.stroke();
      }
      if (rnd() < 0.4) {
        x.fillStyle = 'rgba(0,0,0,0.25)';
        x.fillRect(wx - 3, wy + wh, ww + 6, 5);
        x.strokeStyle = '#0d0a14'; x.lineWidth = 2;
        x.strokeRect(wx - 3, wy + wh, ww + 6, 8);
        if (rnd() < 0.5) {
          const colors = ['#ff4fa3', '#3aa0ff', '#ffe93c', '#3dfc7a', '#fff'];
          for (let l = 0; l < 3; l++) {
            x.fillStyle = pick(colors);
            x.fillRect(wx + l * (ww / 3) + 2, wy + wh + 8, ww / 4, 7);
          }
        }
      }
      if (rnd() < 0.2) { x.fillStyle = '#8b8578'; x.fillRect(wx + ww + 1, wy + 4, 7, 9); x.strokeStyle = '#0d0a14'; x.strokeRect(wx + ww + 1, wy + 4, 7, 9); }
    }
  }
  x.fillStyle = 'rgba(40,30,30,0.18)';
  for (let i = 0; i < 6; i++) { const sx = rnd() * W; x.fillRect(sx, 0, 4 + rnd() * 6, 30 + rnd() * 120); }
  dither(x, W, H, 10);
  return c;
}

export function govFacadeTex() {
  const W = 256, H = 256;
  const [c, x] = mkCanvas(W, H);
  x.fillStyle = '#b7ab93'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const cx = 12 + i * 42;
    x.fillStyle = '#cec2a8'; x.fillRect(cx, 30, 22, H - 30);
    x.strokeStyle = '#0d0a14'; x.lineWidth = 3; x.strokeRect(cx, 30, 22, H - 30);
  }
  x.fillStyle = '#9a8f7a'; x.fillRect(0, 0, W, 30);
  x.strokeStyle = '#0d0a14'; x.lineWidth = 4; x.strokeRect(2, 2, W - 4, 28);
  for (let i = 0; i < 5; i++) {
    x.fillStyle = '#1d1a28'; x.fillRect(40 + i * 42, 60, 12, 140);
    x.strokeStyle = '#0d0a14'; x.strokeRect(40 + i * 42, 60, 12, 140);
  }
  grunge(x, W, H, 20);
  dither(x, W, H, 8);
  return c;
}

export function clubWallTex() {
  const [c, x] = mkCanvas(128, 128);
  x.fillStyle = '#241f2e'; x.fillRect(0, 0, 128, 128);
  grunge(x, 128, 128, 30, 'rgba(0,0,0,0.25)');
  grunge(x, 128, 128, 12, 'rgba(120,80,200,0.10)');
  dither(x, 128, 128, 16);
  return c;
}

export function metalTex(base = '#5c6470') {
  const [c, x] = mkCanvas(64, 64);
  x.fillStyle = base; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2;
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(0, i * 18); x.lineTo(64, i * 18); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 8; i++) x.fillRect((rnd() * 60) | 0, (rnd() * 60) | 0, 3, 3);
  dither(x, 64, 64, 10);
  return c;
}

export function riverTex() {
  const [c, x] = mkCanvas(128, 128);
  x.fillStyle = '#39555c'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(180,220,200,0.25)'; x.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    x.beginPath();
    const y = rnd() * 128;
    x.moveTo(rnd() * 60, y); x.lineTo(rnd() * 60 + 60, y + (rnd() - .5) * 6);
    x.stroke();
  }
  x.fillStyle = 'rgba(61,252,122,0.10)'; // toxic sheen
  for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(rnd() * 128, rnd() * 128, 22, 8, 0, 0, 7); x.fill(); }
  dither(x, 128, 128, 8);
  return c;
}

/* ---------- SIGNS, POSTERS, SCREENS ---------- */
const PUNK_WORDS = ['NO SLEEP', 'BASS = LIFE', 'EAT CANDY', 'RAVE SAFE', 'GVERDI 13', '404 SOUND', 'DIY OR DIE', 'TAXI???', 'SUGAR RIOT', 'LOUD KIDS', 'ANTI HERO', 'MTKVARI'];
const POSTER_COLS = [['#ffe93c', '#0d0a14'], ['#ff4fa3', '#0d0a14'], ['#3dfc7a', '#241a38'], ['#efe6d4', '#ff3b3b'], ['#3aa0ff', '#0d0a14']];

export function posterTex(seed = 1) {
  srand(seed * 77 + 3);
  const [c, x] = mkCanvas(64, 96);
  const [bg, fg] = pick(POSTER_COLS);
  x.fillStyle = bg; x.fillRect(0, 0, 64, 96);
  x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(2, 2, 60, 92);
  x.fillStyle = fg;
  x.font = '900 13px Consolas, monospace'; x.textAlign = 'center';
  const word = pick(PUNK_WORDS);
  const parts = word.split(' ');
  parts.forEach((p, i) => x.fillText(p, 32, 26 + i * 16));
  x.beginPath();
  if (rnd() < 0.5) { x.arc(32, 68, 12, 0, 7); } else { x.moveTo(20, 78); x.lineTo(32, 56); x.lineTo(44, 78); x.closePath(); }
  x.fill();
  x.font = '900 7px Consolas'; x.fillText(pick(['FRI 03:00', 'TONIGHT', 'NEVER', 'SAT SAT SAT', '?????']), 32, 90);
  grunge(x, 64, 96, 8);
  dither(x, 64, 96, 10);
  return c;
}

export function candyCorpAdTex(seed = 1) {
  srand(seed * 31 + 7);
  const [c, x] = mkCanvas(128, 64);
  x.fillStyle = '#efe6d4'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#ff3b3b'; x.fillRect(0, 0, 128, 18);
  x.fillStyle = '#fff'; x.font = '900 12px Consolas'; x.textAlign = 'center';
  x.fillText('CANDYCORP', 64, 13);
  x.fillStyle = '#0d0a14'; x.font = '900 9px Consolas';
  x.fillText(pick(['OBEY YOUR SWEET TOOTH', 'ONE FLAVOR. FOREVER.', 'SMILE. CHEW. REPEAT.', '100% SAFE* *PROBABLY', 'GRAY CANDY IS GOOD']), 64, 34);
  x.fillStyle = '#9c9c9c'; x.beginPath(); x.arc(64, 48, 9, 0, 7); x.fill();
  x.strokeStyle = '#0d0a14'; x.lineWidth = 2; x.stroke();
  x.strokeRect(1, 1, 126, 62);
  dither(x, 128, 64, 8);
  return c;
}

export function neonSignTex(text, col = '#3dfc7a', w = 256, h = 64) {
  const [c, x] = mkCanvas(w, h);
  x.fillStyle = '#0d0a14'; x.fillRect(0, 0, w, h);
  x.font = '900 ' + ((h * 0.55) | 0) + 'px Consolas, monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = col; x.shadowBlur = 14;
  x.fillStyle = col;
  x.fillText(text, w / 2, h / 2 + 2);
  x.shadowBlur = 0;
  x.strokeStyle = col; x.lineWidth = 2; x.strokeRect(3, 3, w - 6, h - 6);
  return c;
}

export function propagandaTex(frame = 0) {
  const [c, x] = mkCanvas(128, 96);
  x.fillStyle = frame % 2 ? '#1a2f4a' : '#4a1a2f'; x.fillRect(0, 0, 128, 96);
  x.fillStyle = '#fff'; x.font = '900 11px Consolas'; x.textAlign = 'center';
  const msgs = [['BE CALM', 'BUY GRAY'], ['CANDY IS', 'CONTROL'], ['SMILE FOR', 'THE SCAN'], ['LOUD MUSIC', 'IS SADNESS']];
  const m = msgs[frame % msgs.length];
  x.fillText(m[0], 64, 40); x.fillText(m[1], 64, 58);
  x.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 12; i++) x.fillRect(0, ((rnd() * 96) | 0), 128, 2);
  x.strokeStyle = '#0d0a14'; x.lineWidth = 6; x.strokeRect(0, 0, 128, 96);
  return c;
}

/* ---------- GRAFFITI ---------- */
export function tagSpotTex() {
  const [c, x] = mkCanvas(64, 64);
  x.clearRect(0, 0, 64, 64);
  x.setLineDash([6, 5]);
  x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 3;
  x.strokeRect(6, 6, 52, 52);
  x.setLineDash([]);
  x.fillStyle = 'rgba(255,255,255,0.5)';
  x.font = '900 30px Consolas'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('?', 32, 34);
  return c;
}

// the player's tag — candy-skull blob, seeded color combo
export function playerTagTex(seed = 1) {
  srand(seed * 913 + 5);
  const [c, x] = mkCanvas(128, 128);
  x.clearRect(0, 0, 128, 128);
  const main = pick(['#3dfc7a', '#ff4fa3', '#ffe93c', '#3aa0ff']);
  const dark = '#0d0a14';
  x.fillStyle = main;
  x.strokeStyle = dark; x.lineWidth = 6; x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(20, 70);
  x.bezierCurveTo(8, 30, 50, 12, 66, 22);
  x.bezierCurveTo(94, 8, 120, 36, 108, 62);
  x.bezierCurveTo(122, 90, 92, 112, 64, 104);
  x.bezierCurveTo(40, 118, 14, 100, 20, 70);
  x.closePath(); x.fill(); x.stroke();
  x.fillStyle = dark;
  x.beginPath(); x.ellipse(48, 56, 10, 13, -0.2, 0, 7); x.fill();
  x.beginPath(); x.ellipse(78, 56, 10, 13, 0.2, 0, 7); x.fill();
  x.fillRect(58, 76, 4, 8); x.fillRect(66, 76, 4, 8);
  x.fillStyle = dark; x.font = '900 19px Consolas'; x.textAlign = 'center';
  x.fillText('BTJ', 64, 36);
  drips(x, 24, 100, 80, main, 5);
  return c;
}

export function muralTex(seed = 1) {
  srand(seed * 517 + 11);
  const [c, x] = mkCanvas(256, 128);
  const cols = ['#3dfc7a', '#ff4fa3', '#ffe93c', '#3aa0ff', '#ff3b3b'];
  x.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 7; i++) {
    x.fillStyle = pick(cols);
    x.strokeStyle = '#0d0a14'; x.lineWidth = 5; x.lineJoin = 'round';
    x.beginPath();
    const bx = 10 + i * 34, by = 20 + rnd() * 30;
    x.moveTo(bx, by + 60); x.lineTo(bx + 8, by); x.lineTo(bx + 30, by + 8); x.lineTo(bx + 22, by + 70);
    x.closePath(); x.fill(); x.stroke();
  }
  for (const ex of [86, 170]) {
    x.fillStyle = '#fff'; x.strokeStyle = '#0d0a14'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(ex, 56, 22, 27, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#0d0a14'; x.beginPath(); x.arc(ex + 5, 62, 9, 0, 7); x.fill();
  }
  x.fillStyle = '#0d0a14'; x.font = '900 17px Consolas'; x.textAlign = 'center';
  x.fillText('MTKVARI 4EVER', 128, 116);
  drips(x, 30, 100, 190, pick(cols), 7);
  return c;
}

/* ---------- CHARACTER FACES ---------- */
export function faceTex(seed) {
  srand(seed * 271 + 9);
  const [c, x] = mkCanvas(64, 64);
  x.clearRect(0, 0, 64, 64);
  const eyeType = (rnd() * 4) | 0;
  const mouthType = (rnd() * 5) | 0;
  x.fillStyle = '#fff'; x.strokeStyle = '#0d0a14'; x.lineWidth = 3;
  const ey = 26, gap = 13, er = 8 + rnd() * 4;
  if (eyeType === 0) { // giant round googly
    for (const s of [-1, 1]) {
      x.beginPath(); x.ellipse(32 + s * gap, ey, er, er * 1.25, 0, 0, 7); x.fill(); x.stroke();
      x.fillStyle = '#0d0a14'; x.beginPath(); x.arc(32 + s * gap + 2, ey + 3, 3.5, 0, 7); x.fill(); x.fillStyle = '#fff';
    }
  } else if (eyeType === 1) { // sleepy half
    for (const s of [-1, 1]) {
      x.beginPath(); x.ellipse(32 + s * gap, ey, er, er, 0, 0, Math.PI); x.fill(); x.stroke();
      x.fillStyle = '#0d0a14'; x.fillRect(32 + s * gap - 3, ey - 2, 6, 4); x.fillStyle = '#fff';
    }
  } else if (eyeType === 2) { // spiral rave eyes
    x.strokeStyle = '#0d0a14'; x.lineWidth = 2.5;
    for (const s of [-1, 1]) {
      x.fillStyle = '#fff'; x.beginPath(); x.arc(32 + s * gap, ey, er, 0, 7); x.fill(); x.stroke();
      x.beginPath();
      for (let a = 0; a < 12; a++) { const r = a * 0.6; x.lineTo(32 + s * gap + Math.cos(a) * r, ey + Math.sin(a) * r); }
      x.stroke();
    }
  } else { // uneven punk
    x.beginPath(); x.ellipse(32 - gap, ey, er * 1.3, er * 1.3, 0, 0, 7); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(32 + gap, ey - 3, er * 0.7, er * 0.7, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#0d0a14';
    x.beginPath(); x.arc(32 - gap + 2, ey + 2, 4, 0, 7); x.fill();
    x.beginPath(); x.arc(32 + gap, ey - 3, 2.5, 0, 7); x.fill();
  }
  x.strokeStyle = '#0d0a14'; x.lineWidth = 3; x.fillStyle = '#0d0a14';
  const my = 46;
  if (mouthType === 0) { x.beginPath(); x.moveTo(24, my); x.quadraticCurveTo(32, my + 8, 40, my); x.stroke(); }
  else if (mouthType === 1) { x.fillRect(26, my, 12, 5); }
  else if (mouthType === 2) { x.beginPath(); x.ellipse(32, my + 2, 6, 8, 0, 0, 7); x.fill(); }
  else if (mouthType === 3) {
    x.beginPath(); x.moveTo(22, my);
    for (let i = 0; i < 5; i++) x.lineTo(24 + i * 5, my + (i % 2 ? 0 : 6));
    x.stroke();
  } else { x.beginPath(); x.moveTo(24, my + 4); x.quadraticCurveTo(32, my - 4, 40, my + 4); x.stroke(); }
  if (rnd() < 0.4) { x.fillStyle = 'rgba(255,79,163,0.5)'; x.fillRect(16, 36, 6, 4); x.fillRect(42, 36, 6, 4); }
  return c;
}

/* ---------- LOGO ---------- blobby, slimy SLUDGE LIFE-style wordmark ---------- */
export function drawBlobLogo(canvas, lines, col = '#3dfc7a') {
  const x = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  x.clearRect(0, 0, W, H);
  const longest = Math.max(...lines.map(l => l.length));
  const fs = Math.min(H / lines.length * 0.82, W / (longest * 0.62));
  x.font = '900 ' + fs + "px Impact, 'Arial Black', sans-serif";
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineCap = 'round'; x.miterLimit = 2;
  lines.forEach((line, li) => {
    const cy = H * (li + 0.6) / (lines.length + 0.28);
    // per-letter positions so we can wobble + drip each glyph like melting slime
    const widths = [], total = line.length ? x.measureText(line).width : 0;
    let acc = -total / 2;
    for (const ch of line) { const w = x.measureText(ch).width; widths.push([ch, acc + w / 2]); acc += w; }
    x.save();
    x.translate(W / 2, cy);
    x.rotate((li % 2 ? 1 : -1) * 0.02);
    // 1) fat black slime outline — the whole word, drawn thick then blobbier per letter
    x.strokeStyle = '#0d0a14'; x.lineWidth = fs * 0.30;
    widths.forEach(([ch, lx], i) => {
      const wob = Math.sin(i * 1.7) * fs * 0.05;
      x.strokeText(ch, lx, wob);
    });
    // 2) colour fill layers (slight offsets = puffy blob look)
    for (const [ox, oy, cc] of [[fs * 0.02, fs * 0.03, col], [0, 0, col]]) {
      x.fillStyle = cc;
      widths.forEach(([ch, lx], i) => { const wob = Math.sin(i * 1.7) * fs * 0.05; x.fillText(ch, lx + ox, wob + oy); });
    }
    // 3) slime drips hanging off the bottom of random letters (rounded ends = sludge)
    x.fillStyle = col; x.strokeStyle = '#0d0a14'; x.lineWidth = fs * 0.06;
    widths.forEach(([ch, lx], i) => {
      if (ch === ' ') return;
      const n = (i % 3 === 0) ? 2 : (i % 2 ? 1 : 0);
      for (let d = 0; d < n; d++) {
        const dx = lx + (d - 0.3) * fs * 0.22 + Math.sin(i * 2 + d) * fs * 0.06;
        const len = fs * (0.18 + ((i * 7 + d * 5) % 5) * 0.06);
        const dyTop = fs * 0.34 + Math.sin(i * 1.7) * fs * 0.05;
        x.beginPath();
        x.moveTo(dx - fs * 0.05, dyTop); x.lineTo(dx - fs * 0.04, dyTop + len);
        x.arc(dx, dyTop + len, fs * 0.05, Math.PI, 0, true);
        x.lineTo(dx + fs * 0.05, dyTop); x.closePath();
        x.fill();
        x.beginPath(); x.arc(dx, dyTop + len, fs * 0.055, 0, 7); x.fill();
      }
    });
    // 4) glossy white highlight blobs (the classic sludge sheen)
    x.fillStyle = 'rgba(255,255,255,0.72)';
    widths.forEach(([ch, lx], i) => {
      if (ch === ' ') return;
      const wob = Math.sin(i * 1.7) * fs * 0.05;
      x.beginPath(); x.ellipse(lx - fs * 0.12, wob - fs * 0.22, fs * 0.07, fs * 0.05, -0.4, 0, 7); x.fill();
      if (i % 2 === 0) { x.beginPath(); x.ellipse(lx + fs * 0.1, wob - fs * 0.12, fs * 0.04, fs * 0.03, 0.3, 0, 7); x.fill(); }
    });
    x.restore();
  });
}

/* ---------- MISC PROPS ---------- */
export function kioskTex() {
  const [c, x] = mkCanvas(96, 64);
  x.fillStyle = '#7a4a6a'; x.fillRect(0, 0, 96, 64);
  x.fillStyle = '#1d1a28'; x.fillRect(10, 18, 76, 30);
  x.strokeStyle = '#0d0a14'; x.lineWidth = 3; x.strokeRect(10, 18, 76, 30);
  x.fillStyle = '#ffe93c'; x.font = '900 11px Consolas'; x.textAlign = 'center';
  x.fillText('KIOSK 24/7', 48, 12);
  for (let i = 0; i < 6; i++) { x.fillStyle = ['#ff4fa3', '#3dfc7a', '#3aa0ff'][i % 3]; x.fillRect(16 + i * 12, 34, 8, 10); }
  grunge(x, 96, 64, 6);
  dither(x, 96, 64, 8);
  return c;
}

export function stickerTex(seed) {
  srand(seed * 991 + 3);
  const [c, x] = mkCanvas(48, 48);
  x.clearRect(0, 0, 48, 48);
  const col = pick(['#3dfc7a', '#ff4fa3', '#ffe93c', '#3aa0ff', '#ff3b3b']);
  x.fillStyle = col; x.strokeStyle = '#0d0a14'; x.lineWidth = 4; x.lineJoin = 'round';
  x.beginPath();
  if (rnd() < 0.5) { x.arc(24, 24, 18, 0, 7); }
  else { x.rect(6, 6, 36, 36); }
  x.fill(); x.stroke();
  x.fillStyle = '#0d0a14'; x.font = '900 9px Consolas'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(pick(['CAT', '404', 'MEOW', 'RAVE', 'SUGA', '!!!', 'BTJ']), 24, 24);
  return c;
}

export function catTex(seed) {
  srand(seed * 137 + 1);
  const [c, x] = mkCanvas(64, 64);
  const col = pick(['#3b3b3b', '#c96', '#888', '#222', '#a75']);
  x.clearRect(0, 0, 64, 64);
  x.fillStyle = col; x.strokeStyle = '#0d0a14'; x.lineWidth = 3; x.lineJoin = 'round';
  x.beginPath(); x.ellipse(32, 44, 20, 14, 0, 0, 7); x.fill(); x.stroke();
  x.beginPath(); x.arc(32, 24, 12, 0, 7); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(22, 18); x.lineTo(24, 6); x.lineTo(30, 14); x.closePath(); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(42, 18); x.lineTo(40, 6); x.lineTo(34, 14); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#ffe93c'; x.beginPath(); x.arc(27, 24, 3, 0, 7); x.fill(); x.beginPath(); x.arc(37, 24, 3, 0, 7); x.fill();
  x.fillStyle = '#0d0a14'; x.fillRect(26.4, 22, 1.4, 4); x.fillRect(36.4, 22, 1.4, 4);
  return c;
}

export function bathroomTileTex() {
  const [c, x] = mkCanvas(64, 64);
  x.fillStyle = '#7a9a8a'; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16, 64); x.stroke();
    x.beginPath(); x.moveTo(0, i * 16); x.lineTo(64, i * 16); x.stroke();
  }
  grunge(x, 64, 64, 14);
  dither(x, 64, 64, 10);
  return c;
}

export function dancefloorTex() {
  const [c, x] = mkCanvas(64, 64);
  x.fillStyle = '#141019'; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    x.beginPath(); x.moveTo(i * 8, 0); x.lineTo(i * 8, 64); x.stroke();
    x.beginPath(); x.moveTo(0, i * 8); x.lineTo(64, i * 8); x.stroke();
  }
  grunge(x, 64, 64, 20, 'rgba(0,0,0,0.3)');
  return c;
}

/* ---------- "MADE BY BATAJINI" signature tag ---------- */
export function madeByTex(seed = 1) {
  srand(seed * 613 + 7);
  const [c, x] = mkCanvas(256, 96);
  x.clearRect(0, 0, 256, 96);
  const col = pick(['#3dfc7a', '#ff4fa3', '#ffe93c', '#3aa0ff']);
  x.textAlign = 'center'; x.lineJoin = 'round';
  // "MADE BY" small tag on top
  x.font = "900 22px Impact, 'Arial Black', sans-serif";
  x.strokeStyle = '#0d0a14'; x.lineWidth = 6; x.strokeText('MADE BY', 128, 26);
  x.fillStyle = '#efe6d4'; x.fillText('MADE BY', 128, 26);
  // big "BATAJINI" spray tag
  x.font = "900 46px Impact, 'Arial Black', sans-serif";
  x.save(); x.translate(128, 62); x.rotate(-0.03);
  x.strokeStyle = '#0d0a14'; x.lineWidth = 9; x.strokeText('BATAJINI', 0, 0);
  x.fillStyle = col; x.fillText('BATAJINI', 0, 0);
  // gloss
  x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillText('BATAJINI', -1, -3);
  x.fillStyle = col; x.fillText('BATAJINI', 0, 1);
  x.restore();
  drips(x, 40, 78, 170, col, 7);
  return c;
}
