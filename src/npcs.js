// npcs.js — googly-eyed blob citizens + the stray cat council.
import * as THREE from 'three';
import { NPCS, NPCS_INSIDE, CATS } from './data.js';
import * as TX from './textures.js';
import { audio } from './audio.js';
import { state } from './state.js';

export const npcs = [];  // {def, group, body, marker, baseY, t}
export const cats = [];  // {def, sprite, baseY, t}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide });

function markerTex(txt, col) {
  const [c, x] = TX.mkCanvas(32, 32);
  x.fillStyle = col; x.strokeStyle = '#0d0a14'; x.lineWidth = 3;
  x.font = '900 26px Consolas'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.strokeText(txt, 16, 18); x.fillText(txt, 16, 18);
  return c;
}
let exclaimTex = null, questTex = null;

export function spawnNPC(scene, def) {
  const g = new THREE.Group();
  g.position.set(def.pos[0], def.pos[1], def.pos[2]);
  g.rotation.y = def.yaw || 0;
  const scale = def.scale || 1;

  // blob body
  const bodyGeo = new THREE.SphereGeometry(0.52, 9, 8);
  bodyGeo.scale(1, 1.55, 0.9);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: def.col }));
  body.position.y = 0.82 * scale;
  body.scale.setScalar(scale);
  g.add(body);
  const hull = new THREE.Mesh(bodyGeo, outlineMat);
  hull.position.copy(body.position);
  hull.scale.setScalar(scale * 1.07);
  g.add(hull);
  // face plane
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72 * scale, 0.72 * scale),
    new THREE.MeshBasicMaterial({ map: TX.tex(TX.faceTex(def.seed)), transparent: true })
  );
  face.position.set(0, 1.15 * scale, 0.44 * scale);
  g.add(face);
  // stubby feet
  const footGeo = new THREE.BoxGeometry(0.22, 0.18, 0.3);
  const footMat = new THREE.MeshLambertMaterial({ color: 0x1d1a28 });
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(footGeo, footMat);
    f.position.set(s * 0.2 * scale, 0.09, 0.05);
    g.add(f);
  }
  // mission marker (! when something to offer) — toggled by systems
  if (!exclaimTex) exclaimTex = TX.tex(markerTex('!', '#ffe93c'));
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: exclaimTex, transparent: true }));
  marker.scale.setScalar(0.5);
  marker.position.y = 2.1 * scale;
  marker.visible = false;
  g.add(marker);

  scene.add(g);
  const rec = { def, group: g, body, hull, face, marker, baseY: def.pos[1], t: Math.random() * 9, scale };
  npcs.push(rec);
  return rec;
}

export function spawnCat(scene, def, i) {
  const sprite = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshBasicMaterial({ map: TX.tex(TX.catTex(i + 1)), transparent: true, side: THREE.DoubleSide })
  );
  sprite.position.set(def.pos[0], def.pos[1] + 0.4, def.pos[2]);
  scene.add(sprite);
  cats.push({ def, sprite, baseY: def.pos[1] + 0.4, t: Math.random() * 9 });
}

export function buildNPCs(scene) {
  for (const def of NPCS) spawnNPC(scene, def);
  for (const def of NPCS_INSIDE) spawnNPC(scene, def);
  CATS.forEach((c, i) => spawnCat(scene, c, i));
}

// idle bob + face the player when close + club NPCs nod on beat
export function updateNPCs(dt, playerPos, camera) {
  const beat = audio.beatPulse();
  for (const n of npcs) {
    n.t += dt;
    const g = n.group;
    const dx = playerPos.x - g.position.x, dz = playerPos.z - g.position.z;
    const d2 = dx * dx + dz * dz;
    const inClub = n.def.pos[1] < -20;
    const bob = Math.sin(n.t * 2.2) * 0.03 + (inClub ? beat * 0.09 : 0);
    n.body.position.y = 0.82 * n.scale + bob;
    n.hull.position.y = n.body.position.y;
    n.face.position.y = 1.15 * n.scale + bob;
    if (d2 < 30) { // turn to player
      const target = Math.atan2(dx, dz);
      let diff = target - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 5);
    }
    n.marker.visible = !!n.showMarker && d2 < 2500;
  }
  for (const c of cats) {
    c.t += dt;
    c.sprite.position.y = c.baseY + Math.abs(Math.sin(c.t * 1.6)) * 0.04;
    c.sprite.lookAt(camera.position.x, c.sprite.position.y, camera.position.z);
  }
}

export function npcById(id) { return npcs.find(n => n.def.id === id); }
