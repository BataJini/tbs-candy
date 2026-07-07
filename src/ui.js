// ui.js — HUD, chunky yellow subtitles, MTKVARI OS, rhythm game, menus.
import { state, RANKS, ACHIEVEMENTS } from './state.js';
import { audio } from './audio.js';
import { CANDIES, TAG_SPOTS, MURALS, MISSIONS, MIXTAPE_NAMES, NPCS, NPCS_INSIDE, PHOTO_CHALLENGES } from './data.js';
import { drawBlobLogo } from './textures.js';

const $ = (id) => document.getElementById(id);

/* ============ HUD ============ */
export function updateMeters() {
  $('rep-fill').style.width = (state.repProgress() * 100) + '%';
  $('rank-name').textContent = state.rankName() + ' · ' + state.s.rep + ' REP';
  $('vibe-fill').style.width = state.s.vibe + '%';
  const hw = $('heat-wrap');
  if (state.s.heat > 1) { hw.classList.add('on'); $('heat-fill').style.width = state.s.heat + '%'; }
  else hw.classList.remove('on');
}
export function updateCounts() {
  $('c-candy').textContent = state.candyCount();
  $('c-tags').textContent = (state.s.tags.length + state.s.murals.length) + '/' + (TAG_SPOTS.length + MURALS.length);
  $('c-caps').textContent = (state.s.caps - state.s.capsSpent);
  updateMeters();
}
export function setZoneLabel(txt) { $('c-zone-wrap').textContent = txt; }
export function setTask(txt) {
  const el = $('task-hud');
  if (!txt) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  $('task-text').textContent = txt;
}
export function setPrompt(txt) {
  const el = $('prompt');
  if (!txt) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.textContent = txt;
}
export function setSprayBar(p) {
  const w = $('spray-wrap');
  if (p === null || p <= 0) { w.classList.remove('on'); return; }
  w.classList.add('on');
  $('spray-fill').style.width = Math.min(100, p * 100) + '%';
}
export function popup(txt, col = 'acid') {
  const d = document.createElement('div');
  d.className = 'popup ' + col;
  d.textContent = txt;
  $('popups').appendChild(d);
  setTimeout(() => d.remove(), 1700);
}
export function toast(title, sub) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.innerHTML = '★ ' + title + (sub ? '<small>' + sub + '</small>' : '');
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 4200);
}
export function notify(from, txt) {
  const d = document.createElement('div');
  d.className = 'notify';
  d.innerHTML = '<div class="from">📟 ' + from + '</div>' + txt;
  $('notify-stack').appendChild(d);
  setTimeout(() => d.remove(), 6500);
}
let bannerT = null;
export function zoneBanner(txt) {
  const b = $('zone-banner');
  b.textContent = txt;
  b.style.opacity = 1;
  clearTimeout(bannerT);
  bannerT = setTimeout(() => { b.style.opacity = 0; }, 2200);
}
export function flash() {
  const f = $('flash');
  f.style.transition = 'none'; f.style.opacity = 0.9;
  requestAnimationFrame(() => { f.style.transition = 'opacity .4s'; f.style.opacity = 0; });
}
export function damageFlash() {
  const f = $('damage-flash');
  f.style.transition = 'none'; f.style.opacity = 0.5;
  requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; });
}
export function fadeTeleport(mid) {
  const f = $('fade');
  f.classList.add('on');
  setTimeout(() => { mid(); setTimeout(() => f.classList.remove('on'), 120); }, 360);
}
export function setPhotoMode(on) {
  $('photo-ui').classList.toggle('on', on);
  $('crosshair').style.opacity = on ? 0 : 0.85;
}

/* ============ DIALOGUE ============ */
let dlgLines = [], dlgIdx = 0, dlgDone = null, dlgOpenFlag = false;
export function dialogueOpen() { return dlgOpenFlag; }
export function showDialogue(name, lines, onDone) {
  dlgLines = lines.slice(); dlgIdx = 0; dlgDone = onDone || null;
  dlgOpenFlag = true;
  $('dialogue').classList.add('on');
  $('dlg-name').textContent = name;
  $('dlg-choices').innerHTML = '';
  $('dlg-hint').style.display = '';
  renderDlgLine();
}
function renderDlgLine() {
  $('dlg-text').textContent = dlgLines[dlgIdx];
  $('dlg-hint').textContent = dlgIdx < dlgLines.length - 1 ? '[E] NEXT' : '[E] DONE';
}
export function advanceDialogue() {
  if (!dlgOpenFlag) return;
  if ($('dlg-choices').children.length) return; // waiting on a choice
  audio.sfx('click');
  dlgIdx++;
  if (dlgIdx >= dlgLines.length) {
    closeDialogue();
    if (dlgDone) { const f = dlgDone; dlgDone = null; f(); }
  } else renderDlgLine();
}
export function closeDialogue() {
  dlgOpenFlag = false;
  choiceMode = false;
  $('dialogue').classList.remove('on');
  $('dlg-choices').innerHTML = '';
}
export function choicesOpen() { return choiceMode; }
let choiceMode = false;
let choiceOptions = [];
export function showChoices(name, prompt, options) {
  dlgOpenFlag = true;
  choiceMode = true;
  choiceOptions = options;
  // release the mouse so the buttons are actually clickable, and show a cursor
  document.exitPointerLock && document.exitPointerLock();
  $('dialogue').classList.add('on');
  $('dlg-name').textContent = name;
  $('dlg-text').textContent = prompt;
  $('dlg-hint').style.display = '';
  $('dlg-hint').textContent = 'CLICK, OR PRESS [1] / [2] / [3]';
  const box = $('dlg-choices');
  box.innerHTML = '';
  options.forEach((o, i) => {
    const b = document.createElement('div');
    b.className = 'dlg-choice';
    b.textContent = '[' + (i + 1) + '] ' + o.text;
    b.onmouseenter = () => audio.sfx('hover');
    b.onclick = (e) => { e.stopPropagation(); pickChoice(i); };
    box.appendChild(b);
  });
}
function pickChoice(i) {
  if (!choiceMode) return;
  const o = choiceOptions[i];
  if (!o) return;
  audio.sfx('click');
  choiceMode = false;
  choiceOptions = [];
  closeDialogue();
  if (o.fn) o.fn();
  // hand the mouse back to the game unless a menu/another dialogue took over
  if (!dlgOpenFlag && !osOpen() && !danceActive()) {
    window.dispatchEvent(new CustomEvent('mk-relock'));
  }
}
// keyboard: E advances plain dialogue; digit keys pick choices
window.addEventListener('keydown', (e) => {
  if (!dlgOpenFlag) return;
  if (choiceMode) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') { e.preventDefault(); pickChoice(0); }
    else if (e.code === 'Digit2' || e.code === 'Numpad2') { e.preventDefault(); pickChoice(1); }
    else if (e.code === 'Digit3' || e.code === 'Numpad3') { e.preventDefault(); pickChoice(2); }
    else if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); pickChoice(0); } // E = first option
    return;
  }
  if (e.code === 'KeyE' && !e.repeat) advanceDialogue();
});
document.addEventListener('click', () => { if (dlgOpenFlag && !choiceMode) advanceDialogue(); });

/* ============ RHYTHM MINIGAME ============ */
let rhythm = null; // {notes:[{time,el,hit}], start, count, hits, combo, maxCombo, finale, raf}
export function startDance(finale = false) {
  if (rhythm) return;
  document.exitPointerLock && document.exitPointerLock();
  const lane = $('rhythm-lane');
  lane.querySelectorAll('.rnote').forEach(n => n.remove());
  $('rhythm').classList.add('on');
  $('rhythm-fb').textContent = finale ? 'THE FINAL SET. DO NOT BLINK.' : 'FEEL THE KICK.';
  if (finale) audio.setTrack('finale');
  const count = finale ? 24 : 12;
  const beat = 60 / audio.bpm;
  const t0 = audio.ctx.currentTime + 2;
  const notes = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'rnote';
    el.style.bottom = '110%';
    lane.appendChild(el);
    notes.push({ time: t0 + i * beat * (i % 4 === 3 ? 1.5 : 1), el, hit: false, missed: false });
  }
  rhythm = { notes, count, hits: 0, combo: 0, maxCombo: 0, finale };
  const laneH = lane.clientHeight;
  const fall = 1.6; // seconds from top to line
  function frame() {
    if (!rhythm) return;
    const now = audio.ctx.currentTime;
    let allDone = true;
    for (const n of rhythm.notes) {
      const dt = n.time - now;
      if (!n.hit && !n.missed) allDone = false;
      const y = 60 + (dt / fall) * (laneH - 60);
      n.el.style.bottom = Math.max(-30, y) + 'px';
      if (dt < -0.16 && !n.hit && !n.missed) {
        n.missed = true;
        n.el.style.background = '#555';
        rhythm.combo = 0;
        $('rhythm-combo').textContent = 'x0';
        audio.sfx('rhythmmiss');
      }
      if (dt < -0.5) n.el.style.opacity = 0;
    }
    if (allDone && now > rhythm.notes[rhythm.notes.length - 1].time + 1) { endDance(); return; }
    rhythm.raf = requestAnimationFrame(frame);
  }
  rhythm.raf = requestAnimationFrame(frame);
}
export function danceInput() {
  if (!rhythm) return;
  const now = audio.ctx.currentTime;
  let best = null, bestD = 0.2;
  for (const n of rhythm.notes) {
    if (n.hit || n.missed) continue;
    const d = Math.abs(n.time - now);
    if (d < bestD) { best = n; bestD = d; }
  }
  if (best) {
    best.hit = true;
    best.el.style.background = '#ffe93c';
    best.el.style.opacity = 0;
    rhythm.hits++;
    rhythm.combo++;
    rhythm.maxCombo = Math.max(rhythm.maxCombo, rhythm.combo);
    $('rhythm-combo').textContent = 'x' + rhythm.combo;
    $('rhythm-fb').textContent = bestD < 0.07 ? 'PERFECT' : 'GOOD';
    audio.sfx('rhythmhit', { combo: rhythm.combo });
    if (rhythm.combo >= 16) { state.unlock('combo16'); state.s.upgrades.dance = true; }
  } else {
    rhythm.combo = 0;
    $('rhythm-combo').textContent = 'x0';
    $('rhythm-fb').textContent = 'OFF BEAT';
    audio.sfx('rhythmmiss');
  }
}
export function bailDance() { if (rhythm) endDance(true); }
function endDance(bailed = false) {
  const r = rhythm;
  cancelAnimationFrame(r.raf);
  rhythm = null;
  $('rhythm').classList.remove('on');
  const ratio = r.hits / r.count;
  if (bailed) { popup('DANCE ABANDONED. THE FLOOR FORGIVES.', 'blue'); return; }
  state.unlock('firstDance');
  const vibe = Math.round(ratio * (r.finale ? 30 : 18));
  state.addVibe(vibe);
  popup('+' + vibe + ' VIBE — ' + (ratio > 0.9 ? 'FLOOR ROYALTY' : ratio > 0.6 ? 'SOLID MOVES' : 'BRAVE ATTEMPT'), 'pink');
  updateMeters();
  if (r.finale) {
    if (ratio >= 0.7) {
      import('./systems.js').then(s => s.triggerEnding('end2'));
    } else {
      popup('THE FINAL SET NEEDS 70%. TRAIN. HYDRATE. RETURN.', 'yellow');
      audio.setTrack('club1');
    }
  }
  state.save();
}
export function startFinale() { startDance(true); }
export function danceActive() { return !!rhythm; }
window.addEventListener('keydown', (e) => {
  if (!rhythm) return;
  if (e.code === 'Space') { e.preventDefault(); danceInput(); }
  if (e.code === 'KeyQ') bailDance();
});


/* ============ MTKVARI OS ============ */
let osOpenFlag = false;
export function osOpen() { return osOpenFlag; }
let onResume = null;
const APPS = [
  { id: 'play', glyph: '▶️', name: 'PLAY' },
  { id: 'tags', glyph: '🖍️', name: 'TAGS' },
  { id: 'pics', glyph: '📷', name: 'PICS' },
  { id: 'candy', glyph: '🍬', name: 'CANDY' },
  { id: 'map', glyph: '🗺️', name: 'MAP?' },
  { id: 'tapes', glyph: '📼', name: 'MIXTAPES' },
  { id: 'people', glyph: '👥', name: 'PEOPLE' },
  { id: 'settings', glyph: '⚙️', name: 'SETTINGS' },
  { id: 'shutdown', glyph: '⏻', name: 'SHUTDOWN' },
];
export function buildOS(resumeFn) {
  onResume = resumeFn;
  const desk = $('os-desktop');
  desk.innerHTML = '';
  for (const app of APPS) {
    const d = document.createElement('div');
    d.className = 'os-icon';
    d.innerHTML = '<div class="glyph">' + app.glyph + '</div><div class="name">' + app.name + '</div>';
    d.onclick = () => { audio.sfx('click'); openApp(app.id); };
    d.onmouseenter = () => audio.sfx('hover');
    desk.appendChild(d);
  }
  drawBlobLogo($('os-title-canvas'), ['TBS', 'CANDY'], '#3dfc7a');
  setInterval(() => {
    const t = new Date();
    $('os-clock').textContent = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ' · REP ' + state.s.rep;
  }, 3000);
}
export function openOS() {
  if (osOpenFlag) return;
  osOpenFlag = true;
  document.exitPointerLock && document.exitPointerLock();
  $('os').classList.add('on');
  audio.setTrack('menu');
  audio.sfx('click');
}
export function closeOS() {
  if (!osOpenFlag) return;
  osOpenFlag = false;
  $('os').classList.remove('on');
  $('os-windows').innerHTML = '';
  if (onResume) onResume();
}
function mkWindow(title, buildBody) {
  const wins = $('os-windows');
  const w = document.createElement('div');
  w.className = 'os-window';
  const n = wins.children.length;
  w.style.left = (90 + n * 40 + Math.random() * 60) + 'px';
  w.style.top = (70 + n * 30 + Math.random() * 40) + 'px';
  const tb = document.createElement('div');
  tb.className = 'os-titlebar';
  tb.innerHTML = '<span>' + title + '</span>';
  const close = document.createElement('div');
  close.className = 'os-close'; close.textContent = 'X';
  close.onclick = () => { audio.sfx('click'); w.remove(); };
  tb.appendChild(close);
  const body = document.createElement('div');
  body.className = 'os-body';
  w.appendChild(tb); w.appendChild(body);
  wins.appendChild(w);
  buildBody(body);
  let drag = null;
  tb.addEventListener('mousedown', (e) => {
    if (e.target === close) return;
    drag = { x: e.clientX - w.offsetLeft, y: e.clientY - w.offsetTop };
    const mv = (e2) => { if (drag) { w.style.left = (e2.clientX - drag.x) + 'px'; w.style.top = (e2.clientY - drag.y) + 'px'; } };
    const up = () => { drag = null; document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
  });
  return w;
}
function zoneNameFor(id) {
  return { u: 'UNDERPASS', o: 'OLD BLOCKS', r: 'RUSTAVELI', c: 'CLUB DISTRICT', t: 'ROOFTOPS' }[id[0]] || '???';
}
function openApp(id) {
  if (id === 'play') { closeOS(); return; }
  if (id === 'shutdown') { state.save(); location.reload(); return; }
  if (id === 'tags') return mkWindow('TAGS.EXE', (b) => {
    b.innerHTML = '<h3>' + state.s.tags.length + '/' + TAG_SPOTS.length + ' TAGS — ' + state.s.murals.length + '/' + MURALS.length + ' MURALS</h3>';
    for (const t of TAG_SPOTS) b.innerHTML += '<div class="entry ' + (state.s.tags.includes(t.id) ? 'done' : '') + '">' + (state.s.tags.includes(t.id) ? '■ ' : '□ ') + t.id.toUpperCase() + ' — ' + zoneNameFor(t.id) + '</div>';
    for (const m of MURALS) b.innerHTML += '<div class="entry ' + (state.s.murals.includes(m.id) ? 'done' : '') + '">' + (state.s.murals.includes(m.id) ? '★ ' : '☆ ') + m.name + ' (MURAL — NEEDS CAP)</div>';
  });
  if (id === 'pics') return mkWindow('PICS.EXE', (b) => {
    b.innerHTML = '<h3>' + state.s.photos.length + ' SHOTS — CHALLENGES ' + state.s.photoChallenges.length + '/' + PHOTO_CHALLENGES.length + '</h3>';
    for (const ch of PHOTO_CHALLENGES) b.innerHTML += '<div class="entry ' + (state.s.photoChallenges.includes(ch.id) ? 'done' : '') + '">' + ch.name + ' — ' + ch.desc + '</div>';
    const grid = document.createElement('div');
    for (const p of state.s.photos.slice(-24)) {
      if (!p.data) continue;
      const img = document.createElement('img');
      img.className = 'pic'; img.src = p.data;
      grid.appendChild(img);
    }
    b.appendChild(grid);
  });
  if (id === 'candy') return mkWindow('CANDY.EXE', (b) => {
    b.innerHTML = '<h3>THE POUCH (ALL 100% FICTIONAL SUGAR)</h3>';
    const entries = Object.entries(state.s.candies);
    if (!entries.length) b.innerHTML += '<div class="entry">EMPTY. THE STREETS PROVIDE. GO ASK AROUND.</div>';
    for (const [cid, n] of entries) {
      const c = CANDIES[cid];
      b.innerHTML += '<div class="entry" style="border-color:' + c.col + '">' + c.name + ' ×' + n + '<br><small>' + c.desc + '</small></div>';
    }
    b.innerHTML += '<h3>KEY ITEMS</h3>';
    b.innerHTML += '<div class="entry ' + (state.s.passes.b909 ? 'done' : 'locked') + '">B909 CLUB PASS</div>';
    b.innerHTML += '<div class="entry ' + (state.s.passes.khd ? 'done' : 'locked') + '">KHD-404 PASS</div>';
    b.innerHTML += '<div class="entry ' + (state.s.passes.staff ? 'done' : 'locked') + '">STAFF KEY</div>';
    b.innerHTML += '<div class="entry">RARE CAPS: ' + (state.s.caps - state.s.capsSpent) + '</div>';
    b.innerHTML += '<div class="entry">STICKERS: ' + state.s.stickers.length + '/10</div>';
  });
  if (id === 'map') return mkWindow('MAP.EXE (STOLEN FROM A TOURIST)', (b) => {
    const c = document.createElement('canvas');
    c.id = 'map-canvas'; c.width = 440; c.height = 440;
    b.appendChild(c);
    const note = document.createElement('div');
    note.innerHTML = '<small>GREEN = UNTAGGED · PINK = MURAL · YELLOW = MISSION · WHITE = YOU</small>';
    b.appendChild(note);
    drawMap(c);
  });
  if (id === 'tapes') return mkWindow('MIXTAPES.EXE', (b) => {
    b.innerHTML = '<h3>' + state.s.mixtapes.length + '/5 TAPES</h3>';
    for (const [tid, name] of Object.entries(MIXTAPE_NAMES)) {
      const has = state.s.mixtapes.includes(tid);
      const e = document.createElement('div');
      e.className = 'entry ' + (has ? 'done' : 'locked');
      e.textContent = (has ? '▶ ' : '🔒 ') + name;
      if (has) e.onclick = () => { audio.lockTrack = true; audio.setTrack(tid); audio.sfx('click'); popup('NOW PLAYING: ' + name, 'blue'); };
      b.appendChild(e);
    }
    const stop = document.createElement('div');
    stop.className = 'os-btn';
    stop.textContent = 'BACK TO MENU SOUND';
    stop.onclick = () => { audio.lockTrack = false; audio.setTrack('menu'); };
    b.appendChild(stop);
  });
  if (id === 'people') return mkWindow('PEOPLE.EXE', (b) => {
    const all = [...NPCS, ...NPCS_INSIDE];
    b.innerHTML = '<h3>' + state.s.metNPCs.length + '/' + all.length + ' WEIRDOS MET</h3>';
    for (const n of all) {
      const met = state.s.metNPCs.includes(n.id);
      b.innerHTML += '<div class="entry ' + (met ? 'done' : 'locked') + '">' + (met ? n.name : '???') + '</div>';
    }
  });
  if (id === 'settings') return mkWindow('SETTINGS.EXE', buildSettings);
}

function buildSettings(b) {
  const s = state.s.settings;
  const slider = (label, val, min, max, step, fn) => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = '<label>' + label + '</label>';
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    inp.oninput = () => { fn(parseFloat(inp.value)); state.save(); };
    row.appendChild(inp);
    b.appendChild(row);
  };
  slider('MUSIC', s.music, 0, 1, 0.05, v => { s.music = v; audio.setMusicVol(v); });
  slider('SFX', s.sfx, 0, 1, 0.05, v => { s.sfx = v; audio.setSfxVol(v); audio.sfx('click'); });
  slider('MOUSE SENS', s.sens, 0.3, 2.5, 0.1, v => { s.sens = v; });
  const inv = document.createElement('div');
  inv.className = 'os-btn' + (s.invertY ? ' active' : '');
  inv.textContent = 'INVERT Y: ' + (s.invertY ? 'ON' : 'OFF');
  inv.onclick = () => { s.invertY = !s.invertY; inv.textContent = 'INVERT Y: ' + (s.invertY ? 'ON' : 'OFF'); inv.classList.toggle('active'); state.save(); };
  b.appendChild(inv);
  b.appendChild(document.createElement('br'));
  const qLabel = document.createElement('h3'); qLabel.textContent = 'PIXEL GRIT (RENDER SCALE)';
  b.appendChild(qLabel);
  for (const [name, val] of [['CHUNKY', 3], ['CRISPY', 2.2], ['CLEAN-ISH', 1.6]]) {
    const btn = document.createElement('div');
    btn.className = 'os-btn' + (Math.abs(s.quality - val) < 0.01 ? ' active' : '');
    btn.textContent = name;
    btn.onclick = () => {
      s.quality = val; state.save();
      window.dispatchEvent(new CustomEvent('mk-quality'));
      b.querySelectorAll('.os-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active'); inv.classList.toggle('active', s.invertY);
    };
    b.appendChild(btn);
  }
  b.appendChild(document.createElement('br'));
  const rst = document.createElement('div');
  rst.className = 'os-btn danger';
  rst.textContent = 'RESTART LIFE (WIPE SAVE)';
  rst.onclick = () => { if (confirm('WIPE EVERYTHING? THE WALLS WILL FORGET YOU.')) { state.wipe(); location.reload(); } };
  b.appendChild(rst);
}

/* ============ MAP ============ */
import { TAG_SPOTS as _TS } from './data.js';
let mapPlayerRef = null;
export function setMapPlayer(p) { mapPlayerRef = p; }
function drawMap(c) {
  const x = c.getContext('2d');
  const W = c.width, H = c.height;
  const toX = (wx) => (wx + 112) / 224 * W;
  const toY = (wz) => (wz + 112) / 224 * H;
  x.fillStyle = '#1a1428'; x.fillRect(0, 0, W, H);
  // river
  x.fillStyle = '#39555c'; x.fillRect(toX(-110), 0, toX(-78) - toX(-110), H);
  // zones as rough blocks
  const zone = (x1, z1, x2, z2, col, name) => {
    x.fillStyle = col;
    x.fillRect(toX(x1), toY(z1), toX(x2) - toX(x1), toY(z2) - toY(z1));
    x.fillStyle = 'rgba(255,255,255,0.55)';
    x.font = '900 9px Consolas'; x.textAlign = 'center';
    x.fillText(name, (toX(x1) + toX(x2)) / 2, (toY(z1) + toY(z2)) / 2);
  };
  zone(-78, -30, -30, 60, '#3a3350', 'UNDERPASS');
  zone(5, -105, 95, -15, '#4a4038', 'OLD BLOCKS');
  zone(-28, -2, 95, 38, '#3d4a3a', 'RUSTAVELI');
  zone(-110, 40, 45, 108, '#46324a', 'CLUB DISTRICT');
  // marks
  for (const t of _TS) {
    if (state.s.tags.includes(t.id)) continue;
    x.fillStyle = '#3dfc7a';
    x.fillRect(toX(t.pos[0]) - 2, toY(t.pos[2]) - 2, 4, 4);
  }
  for (const m of MURALS) {
    if (state.s.murals.includes(m.id)) continue;
    x.fillStyle = '#ff4fa3';
    x.fillRect(toX(m.pos[0]) - 3, toY(m.pos[2]) - 3, 6, 6);
  }
  // active mission target
  for (const mid of state.activeMissions()) {
    const m = MISSIONS.find(z => z.id === mid);
    if (!m) continue;
    const npc = [...NPCS, ...NPCS_INSIDE].find(n => n.id === m.target);
    if (!npc) continue;
    x.fillStyle = '#ffe93c'; x.font = '900 14px Consolas';
    x.fillText('!', toX(npc.pos[0]), toY(npc.pos[2]));
  }
  // player
  if (mapPlayerRef) {
    x.fillStyle = '#fff';
    x.save();
    x.translate(toX(mapPlayerRef.pos.x), toY(mapPlayerRef.pos.z));
    x.rotate(-mapPlayerRef.yaw);
    x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(-5, 5); x.closePath(); x.fill();
    x.restore();
  }
}

/* ============ TITLE + LOADING + ENDING ============ */
export function setLoad(pct, txt) {
  $('load-fill').style.width = (pct * 100) + '%';
  if (txt) $('load-text').textContent = txt;
}
export function showTitleMenu(hasSave, onNew, onContinue) {
  $('load-wrap').style.display = 'none';
  const menu = $('title-menu');
  menu.classList.add('on');
  drawBlobLogo($('logo-canvas'), ['TBS', 'CANDY'], '#3dfc7a');
  $('btn-continue').disabled = !hasSave;
  $('btn-new').onclick = () => { audio.sfx('click'); onNew(); };
  $('btn-continue').onclick = () => { if (hasSave) { audio.sfx('click'); onContinue(); } };
  $('btn-howto').onclick = () => { audio.sfx('click'); $('howto').classList.toggle('on'); };
}
export function hideTitle() { $('title-screen').style.display = 'none'; }
export function showEnding(def) {
  document.exitPointerLock && document.exitPointerLock();
  $('ending').classList.add('on');
  $('ending-title').textContent = def.title;
  $('ending-sub').textContent = def.sub;
  $('ending-body').textContent = def.body;
  const s = state.s;
  $('ending-stats').innerHTML =
    'REP ' + s.rep + ' · ' + state.rankName() + '<br>' +
    (s.tags.length + s.murals.length) + ' WALLS PAINTED · ' +
    Object.values(s.missions).filter(m => m === 'done').length + ' DELIVERIES · ' +
    s.stickers.length + ' STICKERS · ' + s.photos.length + ' PHOTOS<br>' +
    'ENDINGS FOUND: ' + s.endings.length + '/3';
  $('btn-keep-roaming').onclick = () => {
    audio.sfx('click');
    $('ending').classList.remove('on');
    document.body.requestPointerLock && document.getElementById('app').querySelector('canvas') && document.getElementById('app').querySelector('canvas').requestPointerLock();
  };
}

/* ============ wire achievements/rank toasts ============ */
export function initUIListeners() {
  state.on('achievement', (a) => { toast(a.name, a.desc); audio.sfx('achievement'); });
  state.on('rankup', (r) => {
    popup('RANK UP: ' + r.rank, 'yellow');
    toast('NEW RANK', r.rank);
    audio.sfx('rankup');
    notify('THE STREETS', 'WORD TRAVELS. YOU ARE NOW: ' + r.rank);
  });
  state.on('rep', () => updateMeters());
  state.on('vibe', () => updateMeters());
}
export function showHUD() { $('hud').classList.remove('hidden'); }

/* ============ FALLOUT-STYLE RADAR MINIMAP ============ */
import { NPCS as _NPCS, NPCS_INSIDE as _NPCSI, MURALS as _MURALS, MISSIONS as _MISS } from './data.js';
let miniCtx = null, miniPlayer = null, miniT = 0, miniN = null, miniZone = null;
const ALL_NPCS = [..._NPCS, ..._NPCSI];
export function initMinimap(player) {
  const c = $('minimap');
  miniCtx = c.getContext('2d');
  miniPlayer = player;
  miniN = $('minimap-n');
  miniZone = $('minimap-zone');
}
// heading-up: world rotates so the player always faces "up"
export function drawMinimap(dt) {
  if (!miniCtx || !miniPlayer) return;
  miniT += dt;
  const x = miniCtx, W = 160, H = 160, cxp = W / 2, cyp = H / 2;
  const RANGE = 46;              // world units shown from centre to edge
  const scale = (W / 2) / RANGE;
  const p = miniPlayer;
  const yaw = p.yaw;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  // world->radar: translate by -player, rotate by yaw so forward = up
  const toR = (wx, wz) => {
    const dx = wx - p.pos.x, dz = wz - p.pos.z;
    // forward dir is (-sin yaw, -cos yaw); we want that mapped to screen up (-y)
    const rx = dx * cos - dz * sin;
    const rz = dx * sin + dz * cos;
    return [cxp + rx * scale, cyp + rz * scale];
  };
  // background phosphor
  x.fillStyle = '#0a1a0e'; x.fillRect(0, 0, W, H);
  // sweep highlight
  x.save();
  x.beginPath(); x.arc(cxp, cyp, W / 2, 0, 7); x.clip();
  const sweep = (miniT * 1.4) % (Math.PI * 2);
  const grad = x.createConicGradient ? x.createConicGradient(sweep, cxp, cyp) : null;
  if (grad) {
    grad.addColorStop(0, 'rgba(61,252,122,0.22)');
    grad.addColorStop(0.08, 'rgba(61,252,122,0.0)');
    grad.addColorStop(1, 'rgba(61,252,122,0.0)');
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
  }
  // faint grid
  x.strokeStyle = 'rgba(61,252,122,0.10)'; x.lineWidth = 1;
  for (let g = -RANGE; g <= RANGE; g += 12) {
    const a = toR(p.pos.x + g, p.pos.z - RANGE), b = toR(p.pos.x + g, p.pos.z + RANGE);
    x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
  }
  const inRange = (wx, wz) => Math.hypot(wx - p.pos.x, wz - p.pos.z) < RANGE + 4;
  const blip = (wx, wz, col, r = 2.6, pulse = false) => {
    if (!inRange(wx, wz)) return;
    const [sx, sy] = toR(wx, wz);
    if (Math.hypot(sx - cxp, sy - cyp) > W / 2 - 2) return;
    const rr = pulse ? r + Math.sin(miniT * 6) * 1.1 : r;
    x.fillStyle = col; x.beginPath(); x.arc(sx, sy, rr, 0, 7); x.fill();
  };
  // untagged tag spots (dim green squares)
  for (const t of TAG_SPOTS) {
    if (state.s.tags.includes(t.id)) continue;
    if (!inRange(t.pos[0], t.pos[2])) continue;
    const [sx, sy] = toR(t.pos[0], t.pos[2]);
    if (Math.hypot(sx - cxp, sy - cyp) > W / 2 - 2) continue;
    x.fillStyle = 'rgba(61,252,122,0.85)'; x.fillRect(sx - 1.6, sy - 1.6, 3.2, 3.2);
  }
  // murals (pink diamonds)
  for (const m of _MURALS) {
    if (state.s.murals.includes(m.id) || !inRange(m.pos[0], m.pos[2])) continue;
    const [sx, sy] = toR(m.pos[0], m.pos[2]);
    x.fillStyle = '#ff4fa3'; x.save(); x.translate(sx, sy); x.rotate(Math.PI / 4); x.fillRect(-2, -2, 4, 4); x.restore();
  }
  // NPCs (soft green dots)
  for (const n of ALL_NPCS) blip(n.pos[0], n.pos[2], 'rgba(120,255,170,0.7)', 2);
  // active mission targets (yellow, pulsing)
  for (const mid of state.activeMissions()) {
    const m = _MISS.find(z => z.id === mid); if (!m) continue;
    const npc = ALL_NPCS.find(nn => nn.id === m.target); if (!npc) continue;
    blip(npc.pos[0], npc.pos[2], '#ffe93c', 3.4, true);
  }
  // player arrow at centre (always up)
  x.fillStyle = '#eafff0'; x.strokeStyle = '#0a1a0e'; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(cxp, cyp - 6); x.lineTo(cxp + 4.5, cyp + 5); x.lineTo(cxp, cyp + 2.5); x.lineTo(cxp - 4.5, cyp + 5); x.closePath();
  x.fill(); x.stroke();
  x.restore();
  // rotate the N compass tick opposite to heading
  if (miniN) miniN.style.transform = 'translateX(-50%) rotate(' + (-yaw) + 'rad)';
}
export function setMinimapZone(txt) { if (miniZone) miniZone.textContent = txt; }
