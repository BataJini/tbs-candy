// systems.js — graffiti, candy missions, pickups, drones, photos, doors, endings.
// The glue that turns a diorama into a game.
import * as THREE from 'three';
import * as TX from './textures.js';
import * as UI from './ui.js';
import { audio } from './audio.js';
import { state } from './state.js';
import { input } from './player.js';
import { doors, elevators, landmarks } from './world.js';
import { npcs, cats, npcById } from './npcs.js';
import {
  CANDIES, CANDY_PICKUPS, VENDING, TAG_SPOTS, MURALS, STICKERS, CAPS,
  MIXTAPES, MIXTAPE_NAMES, MISSIONS, PHOTO_CHALLENGES, ENDINGS
} from './data.js';

export const interactables = []; // {pos, r, label, action, visible?, holdSpray?}
let scene3, player3, camera3, renderer3;
let sprayTarget = null, sprayProgress = 0;
let sprayParticles = null;
export const drones = [];

const V3 = THREE.Vector3;
const tmp = new V3(), tmp2 = new V3();

/* ============ helpers ============ */
function faceRot(face) {
  switch (face) {
    case '+z': return [0, 0]; case '-z': return [0, Math.PI];
    case '+x': return [0, Math.PI / 2]; case '-x': return [0, -Math.PI / 2];
    case '+y': return [-Math.PI / 2, 0];
  }
}
function planeAt(canvas, pos, face, w, h, alpha = true) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: TX.tex(canvas), transparent: alpha, side: THREE.DoubleSide })
  );
  m.position.set(pos[0], pos[1], pos[2]);
  const [rx, ry] = faceRot(face);
  m.rotation.x = rx; m.rotation.y = ry;
  return m;
}

/* ============ GRAFFITI ============ */
const tagMeshes = new Map(); // id -> {mesh, def, isMural, done}
const TAG_NORMALS = { '+z': [0, 0, 1], '-z': [0, 0, -1], '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0] };
const tagBoardMat = new THREE.MeshLambertMaterial({ color: 0x484350 });
const tagBoardOutline = new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide });
// a solid backing board so every tag is painted on a surface, never floating in the air
function addTagBoard(def) {
  const n = TAG_NORMALS[def.face] || [0, 0, 1];
  const pad = 0.55, th = 0.18, back = 0.1;
  let w, h, d;
  if (def.face === '+z' || def.face === '-z') { w = def.w + pad; h = def.h + pad; d = th; }
  else if (def.face === '+x' || def.face === '-x') { w = th; h = def.h + pad; d = def.w + pad; }
  else { w = def.w + pad; h = th; d = def.h + pad; }
  const geo = new THREE.BoxGeometry(w, h, d);
  const b = new THREE.Mesh(geo, tagBoardMat);
  b.position.set(def.pos[0] - n[0] * back, def.pos[1] - n[1] * back, def.pos[2] - n[2] * back);
  const o = new THREE.Mesh(geo, tagBoardOutline);
  o.position.copy(b.position); o.scale.setScalar(1.05);
  scene3.add(o, b);
}
function buildGraffiti() {
  const spotCanvas = TX.tagSpotTex();
  TAG_SPOTS.forEach((def, i) => {
    addTagBoard(def);
    const done = state.s.tags.includes(def.id);
    const mesh = planeAt(done ? TX.playerTagTex(i + 1) : spotCanvas, def.pos, def.face, def.w, def.h);
    scene3.add(mesh);
    tagMeshes.set(def.id, { mesh, def, isMural: false, done, seed: i + 1 });
  });
  MURALS.forEach((def, i) => {
    addTagBoard(def);
    const done = state.s.murals.includes(def.id);
    const mesh = planeAt(done ? TX.muralTex(i + 1) : spotCanvas, def.pos, def.face, def.w, def.h);
    scene3.add(mesh);
    tagMeshes.set(def.id, { mesh, def, isMural: true, done, seed: i + 1 });
  });
  // "MADE BY BATAJINI" signature tags pre-painted on walls around the city
  const sigs = [
    { pos: [-31.25, 0.9, -10], face: '-x', w: 2.8, h: 1.05 },  // underpass wall, below tag u1
    { pos: [20, 1.3, -32.9], face: '+z', w: 2.6, h: 1.0 },     // Old Blocks tower, below tag o1
    { pos: [18, 1.3, 2.15], face: '+z', w: 2.6, h: 1.0 },      // gov building, below tag r2
    { pos: [-5.1, 1.4, 80], face: '-x', w: 2.6, h: 1.0 },      // BASSMENT 909 interior, below tag c1
    { pos: [60, 30.7, -81.6], face: '+z', w: 2.4, h: 0.95 },   // radio-shack roof, below tag t1 (spawn view)
    { pos: [-68, 0.9, 61.4], face: '-z', w: 2.6, h: 1.0 },     // KHD bunker, below tag c3
  ];
  sigs.forEach((def, i) => {
    addTagBoard(def);
    scene3.add(planeAt(TX.madeByTex(i + 1), def.pos, def.face, def.w, def.h));
  });
  // spray particle cloud (recycled)
  const pGeo = new THREE.BufferGeometry();
  const pCount = 40;
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pCount * 3), 3));
  sprayParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x3dfc7a, size: 0.09, transparent: true, opacity: 0.9 }));
  sprayParticles.visible = false;
  scene3.add(sprayParticles);
}

function updateSpray(dt) {
  // find a spot we're near + facing
  let best = null, bestD = 9;
  const eye = tmp.set(player3.pos.x, player3.eyeY(), player3.pos.z);
  const look = player3.lookDir(tmp2);
  for (const rec of tagMeshes.values()) {
    if (rec.done) continue;
    const dp = rec.def.pos;
    const dx = dp[0] - eye.x, dy = dp[1] - eye.y, dz = dp[2] - eye.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > 3.4 || d > bestD) continue;
    const dot = (dx * look.x + dy * look.y + dz * look.z) / (d || 1);
    if (dot < 0.45) continue;
    best = rec; bestD = d;
  }
  if (sprayTarget !== best) { sprayProgress = 0; sprayTarget = best; audio.sprayLoop(false); }
  UI.setSprayBar(null);
  if (!best) { sprayParticles.visible = false; return; }

  const needCap = best.isMural;
  const capsLeft = state.s.caps - state.s.capsSpent;
  if (needCap && capsLeft <= 0) {
    UI.setPrompt('NEED A RARE CAP FOR THIS MURAL — ' + best.def.name);
    return;
  }
  UI.setPrompt(best.isMural ? '[HOLD E] PAINT MURAL: ' + best.def.name : '[HOLD E] TAG THIS SPOT');
  if (input.down('KeyE') && !UI.dialogueOpen() && !UI.osOpen()) {
    sprayProgress += dt / (best.isMural ? 2.2 : 1.1);
    audio.sprayLoop(true);
    UI.setSprayBar(sprayProgress);
    // particles burst toward the wall
    sprayParticles.visible = true;
    const pos = sprayParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = best.def.pos[0] + (Math.random() - 0.5) * best.def.w * 0.8;
      pos[i + 1] = best.def.pos[1] + (Math.random() - 0.5) * best.def.h * 0.8;
      pos[i + 2] = best.def.pos[2] + (Math.random() - 0.5) * 0.3;
    }
    sprayParticles.geometry.attributes.position.needsUpdate = true;
    if (sprayProgress >= 1) {
      finishTag(best);
      sprayProgress = 0;
      audio.sprayLoop(false);
      sprayParticles.visible = false;
    }
  } else {
    audio.sprayLoop(false);
    sprayParticles.visible = false;
    if (sprayProgress > 0) sprayProgress = Math.max(0, sprayProgress - dt);
  }
}

function finishTag(rec) {
  rec.done = true;
  rec.mesh.material.map = TX.tex(rec.isMural ? TX.muralTex(rec.seed) : TX.playerTagTex(rec.seed));
  rec.mesh.material.needsUpdate = true;
  audio.sfx('tagdone'); audio.sfx('rattle');
  if (rec.isMural) {
    state.s.capsSpent++;
    state.doTag(rec.def.id, true);
    state.addRep(15, 'mural');
    UI.popup('MURAL UP! +15 REP', 'pink');
  } else {
    state.doTag(rec.def.id, false);
    state.addRep(5, 'tag');
    UI.popup('+5 REP — CITY REMEMBERS', 'acid');
  }
  UI.updateCounts();
  // drones hate art
  bumpHeatIfWatched(rec.def.pos);
  checkEnd1();
}

/* ============ PICKUPS ============ */
const pickups = []; // {mesh, kind, id, candy?, r, taken}
function addPickup(mesh, kind, id, candy) {
  scene3.add(mesh);
  pickups.push({ mesh, kind, id, candy, taken: false });
}
function buildPickups() {
  CANDY_PICKUPS.forEach(([cid, x, y, z], i) => {
    const id = 'cp' + i;
    if (state.s.flags['got_' + id]) return;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      new THREE.MeshLambertMaterial({ color: CANDIES[cid].col })
    );
    m.position.set(x, y + 0.3, z);
    addPickup(m, 'candy', id, cid);
  });
  STICKERS.forEach((s) => {
    if (state.s.stickers.includes(s.id)) return;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ map: TX.tex(TX.stickerTex(+s.id.slice(1))), transparent: true, side: THREE.DoubleSide })
    );
    m.position.set(s.pos[0], s.pos[1] + 0.3, s.pos[2]);
    addPickup(m, 'sticker', s.id);
  });
  CAPS.forEach((c) => {
    if (state.s.flags['got_' + c.id]) return;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.28, 8),
      new THREE.MeshLambertMaterial({ color: 0xffe93c })
    );
    m.position.set(c.pos[0], c.pos[1] + 0.3, c.pos[2]);
    addPickup(m, 'cap', c.id);
  });
  MIXTAPES.forEach((t) => {
    if (state.s.mixtapes.includes(t.track)) return;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.3, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xff4fa3 })
    );
    m.position.set(t.pos[0], t.pos[1] + 0.3, t.pos[2]);
    addPickup(m, 'mixtape', t.id, t.track);
  });
}

function updatePickups(dt, t) {
  for (const p of pickups) {
    if (p.taken) continue;
    p.mesh.rotation.y += dt * 2;
    p.mesh.position.y += Math.sin(t * 3 + p.mesh.position.x) * dt * 0.06;
    const dx = player3.pos.x - p.mesh.position.x;
    const dy = (player3.pos.y + 0.8) - p.mesh.position.y;
    const dz = player3.pos.z - p.mesh.position.z;
    if (dx * dx + dy * dy + dz * dz < 1.6) collectPickup(p);
  }
}

function collectPickup(p) {
  p.taken = true;
  scene3.remove(p.mesh);
  if (p.kind === 'candy') {
    state.giveCandy(p.candy);
    state.flag('got_' + p.id, true);
    audio.sfx('candy');
    UI.popup(CANDIES[p.candy].name + ' GET!', 'yellow');
  } else if (p.kind === 'sticker') {
    state.s.stickers.push(p.id);
    audio.sfx('pickup');
    UI.popup('STICKER FOUND! (' + state.s.stickers.length + '/10)', 'blue');
    if (state.s.stickers.length >= 10) state.unlock('allStickers');
    state.save();
  } else if (p.kind === 'cap') {
    state.s.caps++;
    state.flag('got_' + p.id, true);
    audio.sfx('pickup');
    UI.popup('RARE SPRAY CAP! MURAL FUEL.', 'pink');
  } else if (p.kind === 'mixtape') {
    state.s.mixtapes.push(p.candy);
    audio.sfx('achievement');
    UI.popup(MIXTAPE_NAMES[p.candy] + ' — MIXTAPE GET!', 'blue');
    UI.notify('MTKVARI OS', 'NEW MIXTAPE IN YOUR PLAYER. PRESS TAB.');
    if (state.s.mixtapes.length >= 5) state.unlock('allTapes');
    state.save();
  }
  UI.updateCounts();
}

/* ============ VENDING + DOORS + ELEVATOR interactables ============ */
function buildInteractables() {
  VENDING.forEach((v, vi) => {
    interactables.push({
      pos: new V3(v.pos[0], v.pos[1] + 1, v.pos[2]), r: 2.2,
      label: '[E] CANDY-O-MAT',
      action() {
        audio.sfx('buzz', { dur: 0.2 });
        const opts = v.items.map(cid => ({
          text: CANDIES[cid].name,
          fn() {
            state.giveCandy(cid);
            audio.sfx('candy');
            UI.popup(CANDIES[cid].name + ' — CLUNK!', 'yellow');
            UI.updateCounts();
          }
        }));
        UI.showChoices('CANDY-O-MAT', 'THE MACHINE HUMS. PICK YOUR FIGHTER.', opts);
      }
    });
  });
  doors.forEach((d) => {
    interactables.push({
      pos: new V3(d.pos[0], d.pos[1], d.pos[2]), r: 2.4,
      get label() { return d.requires && !state.s.passes[d.requires] ? '[E] ' + d.name + ' — NEED PASS' : '[E] ' + d.name; },
      action() {
        if (d.requires && !state.s.passes[d.requires]) {
          audio.sfx('error');
          UI.popup('NO PASS. THE DOOR JUDGES YOU.', 'pink');
          return;
        }
        audio.sfx('door');
        UI.fadeTeleport(() => {
          player3.pos.set(d.to[0], d.to[1], d.to[2]);
          player3.vel.set(0, 0, 0);
          if (d.exitYaw !== undefined) player3.yaw = d.exitYaw;
          if (d.name === 'BASSMENT 909' || d.name === 'KHD-404') {
            state.flag('visited_' + d.name, true);
            if (state.flag('visited_BASSMENT 909') && state.flag('visited_KHD-404')) state.unlock('clubBoth');
          }
        });
      }
    });
  });
  elevators.forEach((el) => {
    interactables.push({
      pos: new V3(el.x + 1.6, 0.5, el.z + 1.6), r: 2.4,
      label: '[E] SUMMON ELEVATOR',
      action() { audio.sfx('buzz', { dur: 0.5 }); el.dir = el.dir === 0 ? (el.mesh.position.y > 15 ? -1 : 1) : -el.dir; }
    });
  });
  // crown wall spot for ending 1 (appears when everything is tagged)
  interactables.push({
    pos: new V3(56, 31.2, -78), r: 2.6,
    label: '[E] CROWN THE CITY',
    visible: () => state.s.tags.length >= TAG_SPOTS.length && state.s.murals.length >= MURALS.length && !state.s.endings.includes('end1'),
    action() { triggerEnding('end1'); }
  });
}

function updateElevators(dt) {
  for (const el of elevators) {
    if (!el.col) continue;
    if (!el.dir) continue;
    const y = el.mesh.position.y + el.dir * dt * 3.2;
    el.mesh.position.y = Math.max(el.y0, Math.min(el.y1, y));
    if (el.mesh.position.y === el.y0 || el.mesh.position.y === el.y1) el.dir = 0;
    // move its collider + carry the player
    el.col.minY = el.mesh.position.y - 0.2; el.col.maxY = el.mesh.position.y + 0.2;
    const p = player3.pos;
    if (Math.abs(p.x - el.x) < 1.4 && Math.abs(p.z - el.z) < 1.4 && Math.abs(p.y - el.col.maxY) < 0.5) {
      p.y = el.col.maxY + 0.001;
      if (el.dir) audio.sfx('buzz', { dur: 0.05 });
    }
  }
}

/* ============ NPC DIALOGUE + MISSIONS ============ */
function missionFor(role, npcId) {
  return MISSIONS.find(m => m[role] === npcId);
}
function activeMissionsBySource(npcId) {
  return MISSIONS.filter(m => m.source === npcId && state.missionState(m.id) === 'active' && !state.flag('sourced_' + m.id));
}

export function talkTo(npcId) {
  const n = npcById(npcId);
  if (!n) return;
  const def = n.def;
  audio.sfx('talk', { seed: def.seed });
  if (!state.s.metNPCs.includes(npcId)) {
    state.s.metNPCs.push(npcId);
    state.addRep(1, 'met');
    UI.popup('MET ' + def.name.split(' — ')[0].split(' (')[0], 'blue');
  }
  state.s.talked[npcId] = (state.s.talked[npcId] || 0) + 1;

  // 1) deliver? player near target of an active mission holding the goods
  const deliverable = MISSIONS.find(m =>
    m.target === npcId && state.missionState(m.id) === 'active' &&
    (state.s.candies[m.candy] || 0) >= m.qty
  );
  if (deliverable) {
    UI.showDialogue(def.name, deliverable.deliver, () => {
      state.takeCandy(deliverable.candy, deliverable.qty);
      completeMission(deliverable);
    });
    return;
  }

  // 2) candy source for an active mission
  const sourcing = activeMissionsBySource(def.special === 'kiosk' ? 'kiosk' : npcId);
  if (sourcing.length) {
    const m = sourcing[0];
    UI.showDialogue(def.name, ['YOU NEED ' + CANDIES[m.candy].name + '? SAY LESS. HERE.', 'GO. DELIVER. BE LEGEND.'], () => {
      state.giveCandy(m.candy, m.qty);
      state.flag('sourced_' + m.id, true);
      audio.sfx('candy');
      UI.popup(CANDIES[m.candy].name + ' x' + m.qty + ' GET!', 'yellow');
      UI.updateCounts();
    });
    return;
  }

  // 3) offer a new mission?
  const offer = MISSIONS.find(m =>
    m.giver === npcId && state.missionState(m.id) === 'hidden' &&
    (!m.requires || state.flag(m.requires))
  );
  if (offer) {
    UI.showDialogue(def.name, offer.offer, () => {
      UI.showChoices(def.name, 'TAKE THE JOB?', [
        {
          text: 'ON IT', fn() {
            state.setMission(offer.id, 'active');
            if (offer.source === offer.giver || offer.source === 'zura') {
              // giver hands over the candy directly (e.g. Zura's lollipop)
              if (offer.source === offer.giver || offer.giver === 'zura') {
                state.giveCandy(offer.candy, offer.qty);
                state.flag('sourced_' + offer.id, true);
                audio.sfx('candy');
              }
            }
            UI.setTask(offer.hint);
            UI.notify('NEW MISSION', offer.name);
            audio.sfx('phone');
            UI.updateCounts();
          }
        },
        { text: 'LATER', fn() { audio.sfx('click'); } }
      ]);
    });
    return;
  }

  // 4) special characters
  if (npcId === 'dato' && state.s.vibe >= 50 && !state.s.passes.staff) {
    UI.showDialogue(def.name, ['YOUR VIBE... IT IS CLEAN. THE STAFF DOOR TRUSTS YOU NOW.', 'TAKE THE KEY. WATER THE PLANTS IF YOU SEE ANY.'], () => {
      state.s.passes.staff = true;
      state.save();
      UI.popup('STAFF KEY GET!', 'pink');
      audio.sfx('achievement');
    });
    return;
  }
  if (npcId === 'khinkali' && canFinale() && !state.s.endings.includes('end2')) {
    UI.showDialogue(def.name, ['YOU. YOUR VIBE IS LOUD ENOUGH.', 'TAKE THE DECKS. PLAY THE FINAL SET. DO NOT BLINK.'], () => {
      UI.startFinale();
    });
    return;
  }
  if (npcId === 'data' && canBroadcast() && !state.s.endings.includes('end3')) {
    UI.showDialogue(def.name, ['THE MEMO. THE PHOTOS. THE SIGNAL. THE BILLBOARD IS PAINTED.', 'ONE BUTTON. ONE TRUTH. YOU WANT TO PRESS IT?'], () => {
      UI.showChoices(def.name, 'BROADCAST THE TRUTH?', [
        { text: 'PRESS IT', fn() { triggerEnding('end3'); } },
        { text: 'NOT YET', fn() { } }
      ]);
    });
    return;
  }
  // 5) kiosk shop
  if (def.special === 'kiosk') {
    const opts = ['acid-pear', 'cola-candy', 'neon-churchkhela'].map(cid => ({
      text: CANDIES[cid].name,
      fn() {
        state.giveCandy(cid);
        audio.sfx('candy');
        UI.popup(CANDIES[cid].name + ' GET!', 'yellow');
        UI.updateCounts();
      }
    }));
    opts.push({ text: 'JUST VIBES', fn() { } });
    const line = def.lines[(state.s.talked[npcId] - 1) % def.lines.length];
    UI.showDialogue(def.name, [line], () => {
      UI.showChoices(def.name, 'FIRST ONE IS FREE. ALL OF THEM ARE FIRST ONES.', opts);
    });
    return;
  }
  // 6) idle chatter
  const line = def.lines[(state.s.talked[npcId] - 1) % def.lines.length];
  UI.showDialogue(def.name, [line]);
}

function completeMission(m) {
  state.setMission(m.id, 'done');
  const r = m.reward || {};
  if (r.rep) { state.addRep(r.rep, m.id); UI.popup('+' + r.rep + ' REP', 'acid'); }
  if (r.vibe) { state.addVibe(r.vibe); UI.popup('+' + r.vibe + ' VIBE', 'pink'); }
  if (r.cap) { state.s.caps += r.cap; UI.popup('RARE CAP GET!', 'pink'); }
  if (r.mixtape && !state.s.mixtapes.includes(r.mixtape)) {
    state.s.mixtapes.push(r.mixtape);
    UI.popup(MIXTAPE_NAMES[r.mixtape] + ' — MIXTAPE!', 'blue');
    if (state.s.mixtapes.length >= 5) state.unlock('allTapes');
  }
  if (r.pass) { state.s.passes[r.pass] = true; UI.popup(r.pass.toUpperCase() + ' PASS GET!', 'yellow'); }
  if (r.flag) state.flag(r.flag, true);
  if (r.upgrade === 'moves') {
    state.s.upgrades.moves = true;
    UI.notify('GOAT STEP', 'JUMP HIGHER. MANTLE LIKE A LEGEND.');
  }
  audio.sfx('achievement');
  UI.notify('MISSION DONE', m.name);
  UI.setTask(nextTaskHint());
  if (state.missionsDone() >= MISSIONS.length) state.unlock('allMissions');
  state.save();
  UI.updateCounts();
}

export function nextTaskHint() {
  const act = state.activeMissions();
  if (!act.length) return null;
  const m = MISSIONS.find(x => x.id === act[0]);
  return m ? m.hint : null;
}

function canFinale() {
  return ['m-goga', 'm-khinkali', 'm-keti', 'm-vinyl'].every(id => state.missionState(id) === 'done') && state.s.vibe >= 80;
}
function canBroadcast() {
  return state.flag('evidence1') && state.flag('evidence2') && state.flag('radioOnline') && state.s.tags.includes('r6');
}

/* ============ DRONES + HEAT ============ */
function buildDrones() {
  const paths = [
    [[-10, 8, 12], [30, 9, 20], [70, 8, 12], [30, 10, 4]],
    [[80, 7, 24], [40, 8, 28], [0, 7, 22], [-20, 8, 14]],
    [[20, 12, 8], [50, 11, 18], [10, 10, 26]],
  ];
  for (const wp of paths) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshLambertMaterial({ color: 0x8a8a92 }));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    eye.position.set(0, -0.1, 0.42);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.14), new THREE.MeshLambertMaterial({ color: 0x1d1a28 }));
    rotor.position.y = 0.42;
    g.add(body, eye, rotor);
    g.position.set(wp[0][0], wp[0][1], wp[0][2]);
    scene3.add(g);
    drones.push({ g, rotor, eye, wp, i: 0, t: Math.random() * 5, mode: 'patrol', humT: 0 });
  }
}

function bumpHeatIfWatched(pos) {
  for (const d of drones) {
    const dx = d.g.position.x - pos[0], dz = d.g.position.z - pos[2];
    if (dx * dx + dz * dz < 900) {
      state.addHeat(35);
      d.mode = 'chase';
      audio.sfx('alarm');
      UI.notify('CANDYCORP SECURITY', 'UNAUTHORIZED ART DETECTED. SMILE FOR THE SCAN.');
      return;
    }
  }
}

function updateDrones(dt) {
  const p = player3.pos;
  for (const d of drones) {
    d.t += dt;
    d.rotor.rotation.y += dt * 20;
    d.humT -= dt;
    const dp = d.g.position;
    const distP = Math.hypot(dp.x - p.x, dp.z - p.z);
    if (d.humT <= 0 && distP < 18) { audio.sfx('dronehum'); d.humT = 1.4; }
    if (d.mode === 'chase' && state.s.heat > 0) {
      // hover menacingly above the player
      tmp.set(p.x, p.y + 4.5, p.z);
      dp.lerp(tmp, Math.min(1, dt * 0.9));
      if (distP < 2.4 && state.s.heat >= 100) {
        // cartoon bonk
        UI.damageFlash();
        audio.sfx('error');
        player3.vel.x += (p.x - dp.x) * 4;
        player3.vel.z += (p.z - dp.z) * 4;
        player3.vel.y = 5;
        state.s.heat = 40;
        UI.popup('BONK! CORPORATE JUSTICE.', 'pink');
      }
      if (state.s.heat <= 5) d.mode = 'patrol';
    } else {
      const target = d.wp[d.i];
      tmp.set(target[0], target[1], target[2]);
      dp.lerp(tmp, Math.min(1, dt * 0.35));
      if (dp.distanceTo(tmp) < 1.2) d.i = (d.i + 1) % d.wp.length;
    }
    d.g.lookAt(p.x, dp.y, p.z);
  }
  // heat cools off on its own
  if (state.s.heat > 0) {
    state.s.heat = Math.max(0, state.s.heat - dt * 3.5);
    UI.updateMeters();
  }
}

/* ============ PHOTO SYSTEM ============ */
export function takePhoto() {
  audio.sfx('shutter');
  UI.flash();
  // capture a small thumbnail from the live canvas
  let data = null;
  try {
    const src = renderer3.domElement;
    const c = document.createElement('canvas');
    c.width = 160; c.height = 90;
    c.getContext('2d').drawImage(src, 0, 0, 160, 90);
    data = c.toDataURL('image/jpeg', 0.6);
  } catch (e) { }
  const eye = tmp.set(player3.pos.x, player3.eyeY(), player3.pos.z);
  const look = player3.lookDir(tmp2);
  let tagged = null;
  for (const ch of PHOTO_CHALLENGES) {
    if (state.s.photoChallenges.includes(ch.id)) continue;
    let targets = [];
    if (ch.dynamic === 'drone') targets = drones.map(d => d.g.position);
    else if (ch.dynamic === 'cat') targets = cats.map(c => c.sprite.position);
    else targets = [new V3(ch.pos[0], ch.pos[1], ch.pos[2])];
    for (const tp of targets) {
      const d = eye.distanceTo(tp);
      if (d > ch.r) continue;
      tmp2.copy(tp).sub(eye).normalize();
      const look2 = player3.lookDir(new V3());
      if (look2.dot(tmp2) < 0.82) continue;
      tagged = ch; break;
    }
    if (tagged) break;
  }
  state.s.photos.push({ id: 'ph' + Date.now(), data, challenge: tagged ? tagged.id : null });
  if (tagged) {
    state.s.photoChallenges.push(tagged.id);
    state.addRep(8, 'photo');
    UI.popup('PHOTO: ' + tagged.name + ' — +8 REP', 'blue');
    audio.sfx('achievement');
    if (tagged.id === 'p4') { state.flag('evidence1', true); UI.notify('EVIDENCE', 'DRONE PHOTO SECURED. DATA WILL WANT THIS.'); }
    if (state.s.photoChallenges.length >= 5) state.unlock('photo5');
  } else {
    UI.popup('SAVED TO PICS', 'blue');
  }
  state.save();
}

/* ============ CATS ============ */
function updateCats() {
  // handled via interactables registered at build time
}
function buildCatInteractables() {
  cats.forEach((c, i) => {
    interactables.push({
      pos: c.sprite.position, r: 1.8,
      label: '[E] PET THE COUNCIL MEMBER',
      action() {
        audio.sfx('meow');
        UI.popup(['MRRP.', 'PURRRR.', 'THE CAT ALLOWS IT.', 'BLESSED.'][i % 4], 'yellow');
        if (!state.s.catsPetted.includes(c.def.id)) {
          state.s.catsPetted.push(c.def.id);
          state.addVibe(4);
          if (state.s.catsPetted.length >= 5) state.unlock('catFriend');
          state.save();
        }
      }
    });
  });
}

/* ============ ENDINGS ============ */
function checkEnd1() {
  if (state.s.tags.length >= TAG_SPOTS.length && state.s.murals.length >= MURALS.length && !state.s.endings.includes('end1')) {
    UI.notify('THE CITY WHISPERS', 'EVERY WALL KNOWS YOU. GO TO THE ANTENNA ROOF. CROWN IT.');
    audio.sfx('phone');
  }
}
export function triggerEnding(id) {
  if (!state.s.endings.includes(id)) state.s.endings.push(id);
  state.unlock(id === 'end1' ? 'end1' : id === 'end2' ? 'end2' : 'end3');
  state.save();
  audio.sfx('ending');
  UI.showEnding(ENDINGS[id]);
  if (id === 'end3') dynamicScreensGlitch();
}
function dynamicScreensGlitch() {
  // propaganda screens now scream the truth
  import('./world.js').then(w => {
    for (const scr of w.dynamic.screens) {
      scr.material.map = TX.tex(TX.neonSignTex('CANDYCORP = GUM', '#3dfc7a', 256, 128));
      scr.material.needsUpdate = true;
    }
  });
}

/* ============ INTERACT LOOP ============ */
let currentInteract = null;
let ePending = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && !e.repeat && !UI.dialogueOpen() && !UI.osOpen()) ePending = true;
});

function updateInteract() {
  const p = player3.pos;
  let best = null, bestD = 99;
  // NPCs are interactables too
  for (const n of npcs) {
    const g = n.group.position;
    const d = Math.hypot(g.x - p.x, g.y - p.y, g.z - p.z);
    if (d < 2.6 && d < bestD) { best = { npc: n }; bestD = d; }
  }
  for (const it of interactables) {
    if (it.visible && !it.visible()) continue;
    const d = it.pos.distanceTo(p) - (it.r - 2);
    if (it.pos.distanceTo(p) < it.r && d < bestD) { best = it; bestD = d; }
  }
  currentInteract = best;
  if (best && !sprayTarget) {
    UI.setPrompt(best.npc ? '[E] TALK — ' + best.npc.def.name.split(' — ')[0].split(' (')[0] : best.label);
  } else if (!sprayTarget) {
    UI.setPrompt(null);
  }
  // consume queued E taps (event-driven so quick taps never miss)
  if (ePending) {
    ePending = false;
    if (best && !UI.dialogueOpen() && !UI.osOpen() && !sprayTarget) {
      if (best.npc) talkTo(best.npc.def.id);
      else best.action();
    }
  }
  // mission markers above NPCs with something new
  for (const n of npcs) {
    const id = n.def.id;
    n.showMarker =
      MISSIONS.some(m => m.giver === id && state.missionState(m.id) === 'hidden' && (!m.requires || state.flag(m.requires))) ||
      MISSIONS.some(m => m.target === id && state.missionState(m.id) === 'active' && (state.s.candies[m.candy] || 0) >= m.qty);
  }
}

/* ============ INIT + FRAME UPDATE ============ */
export function initSystems(scene, player, camera, renderer) {
  scene3 = scene; player3 = player; camera3 = camera; renderer3 = renderer;
  buildGraffiti();
  buildPickups();
  buildInteractables();
  buildCatInteractables();
  buildDrones();
  // give elevators their moving colliders
  import('./world.js').then(w => {
    for (const el of w.elevators) {
      const col = {
        minX: el.x - el.w / 2, maxX: el.x + el.w / 2,
        minY: el.mesh.position.y - 0.2, maxY: el.mesh.position.y + 0.2,
        minZ: el.z - el.d / 2, maxZ: el.z + el.d / 2,
        surface: 'metal'
      };
      el.col = col;
      import('./world.js').then(w2 => w2.colliders.push(col));
    }
  });
  UI.setTask(nextTaskHint());
}

let tAcc = 0;
export function updateSystems(dt) {
  tAcc += dt;
  updateSpray(dt);
  updateInteract();
  updatePickups(dt, tAcc);
  updateDrones(dt);
  updateElevators(dt);
  // rooftop achievement
  if (player3.pos.y > 29 && !state.s.achievements.includes('roofTop')) state.unlock('roofTop');
}
