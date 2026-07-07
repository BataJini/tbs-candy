// vehicles.js — drivable cars/taxis/bikes, road NETWORK, braking traffic, Glovo mopeds.
// GTA-flavoured arcade driving: momentum, grip, handbrake drift, lagging chase cam.
import * as THREE from 'three';
import { colliders } from './world.js';
import { audio } from './audio.js';
import * as UI from './ui.js';
import { input } from './player.js';

let scene3, player3, camera3;
export const drivable = [];
export const traffic = [];
let driving = null;
export function isDriving() { return !!driving; }
export function drivingSpeed() { return driving ? Math.hypot(driving.vx || 0, driving.vz || 0) : 0; }

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide });

/* ================= ROAD NETWORK =================
   Polylines verified to thread BETWEEN structures.
   - AVENUE: west old town -> causeway bridge -> underpass colonnade gap -> Rustaveli -> east
   - RING: crooked street around the Old Blocks towers
   - CLUB: club district street
   - RIVERSIDE: promenade service road
*/
const AVENUE = [[-108, 12], [88, 12]];
const AVENUE_RETURN = [[84, 11], [-70, 11], [-70, 13.4], [24, 13.4], [27, 21], [42, 21], [44, 13.4], [84, 13.4]];
const RING = [[2, -8], [2, -64], [70, -64], [90, -56], [92, -16], [84, 6], [64, 11], [6, 11]];
const CLUB = [[-44, 62], [32, 62], [32, 59], [-44, 59]];
const RIVERSIDE = [[-74, -86], [-74, 44], [-75.5, 44], [-75.5, -86]];

function roadStrip(scene, pts, w) {
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2833 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c840 });
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.5) continue;
    const ang = Math.atan2(x2 - x1, z2 - z1);
    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, len + w * 0.5), roadMat);
    road.position.set((x1 + x2) / 2, 0.05, (z1 + z2) / 2); road.rotation.y = ang;
    scene3.add(road);
    const dashes = Math.max(1, Math.floor(len / 7));
    for (let d = 0; d < dashes; d++) {
      const t = (d + 0.5) / dashes;
      const dl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 1.6), lineMat);
      dl.position.set(x1 + (x2 - x1) * t, 0.11, z1 + (z2 - z1) * t); dl.rotation.y = ang;
      scene3.add(dl);
    }
  }
}

// flat causeway BRIDGE continuing the avenue across the Mtkvari into old town
function buildCauseway(scene) {
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x6a7480 });
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8fa0ac });
  for (let x = -78; x >= -112; x -= 4) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 10), deckMat);
    plate.position.set(x, -0.26, 12);
    scene.add(plate);
    colliders.push({ minX: x - 2.1, maxX: x + 2.1, minY: -1, maxY: 0.01, minZ: 7, maxZ: 17, surface: 'metal' });
    // side railings
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), railMat);
      post.position.set(x, 0.55, 12 + s * 4.8); scene.add(post);
    }
  }
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(36, 0.1, 0.1), railMat);
    bar.position.set(-95, 1.1, 12 + s * 4.8); scene.add(bar);
  }
  // two big steel arches over the causeway (Tbilisi bridge silhouette)
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = -78 - t * 34;
    const arch = Math.sin(t * Math.PI) * 6;
    for (const s of [-1, 1]) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 2.6), railMat);
      seg.position.set(x, 1 + arch, 12 + s * 5.2);
      scene.add(seg);
      if (i % 3 === 0 && arch > 0.5) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, arch, 0.1), railMat);
        tie.position.set(x, 1 + arch / 2, 12 + s * 5.2); scene.add(tie);
      }
    }
  }
  // pylons in the water
  for (const px of [-88, -102]) {
    const py = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4, 2.4), new THREE.MeshLambertMaterial({ color: 0x5a6470 }));
    py.position.set(px, -2, 12); scene.add(py);
  }
}

/* ================= VEHICLE MESHES ================= */
function wheel(r = 0.36) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.28, 10),
    new THREE.MeshLambertMaterial({ color: 0x141018 }));
  w.rotation.x = Math.PI / 2;
  return w;
}
function carMesh(bodyCol, taxi = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyCol });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 4.4), bodyMat);
  body.position.y = 0.65;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.85, 2.4), bodyMat);
  cabin.position.set(0, 1.28, -0.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 2.5),
    new THREE.MeshLambertMaterial({ color: 0x1a2430, transparent: true, opacity: 0.85 }));
  glass.position.set(0, 1.3, -0.2);
  for (const m of [body, cabin]) { const h = new THREE.Mesh(m.geometry, outlineMat); h.position.copy(m.position); h.scale.setScalar(1.05); g.add(h); }
  g.add(body, cabin, glass);
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  hl.position.set(-0.6, 0.7, 2.25); g.add(hl);
  const hl2 = hl.clone(); hl2.position.x = 0.6; g.add(hl2);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
  tl.position.set(-0.6, 0.7, -2.25); g.add(tl);
  const tl2 = tl.clone(); tl2.position.x = 0.6; g.add(tl2);
  for (const [x, z] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) { const w = wheel(); w.position.set(x, 0.36, z); g.add(w); }
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe93c }));
    sign.position.set(0, 1.85, -0.2); g.add(sign);
    const sh = new THREE.Mesh(sign.geometry, outlineMat); sh.position.copy(sign.position); sh.scale.setScalar(1.1); g.add(sh);
  }
  return g;
}
function bikeMesh() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.8), new THREE.MeshLambertMaterial({ color: 0x2a2a32 }));
  frame.position.y = 0.7;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: 0x8a1a1a }));
  seat.position.set(0, 0.95, -0.2);
  for (const m of [frame, seat]) { const h = new THREE.Mesh(m.geometry, outlineMat); h.position.copy(m.position); h.scale.setScalar(1.08); g.add(h); }
  g.add(frame, seat);
  for (const z of [0.8, -0.8]) { const w = wheel(0.42); w.position.set(0, 0.42, z); g.add(w); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.1), new THREE.MeshLambertMaterial({ color: 0x111118 }));
  bar.position.set(0, 1.1, 0.8); g.add(bar);
  return g;
}
function glovoMopedMesh() {
  const g = bikeMesh();
  const rider = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 7), new THREE.MeshLambertMaterial({ color: 0x2b2b33 }));
  rider.scale.set(1, 1.5, 0.9); rider.position.set(0, 1.5, -0.2); g.add(rider);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 7), new THREE.MeshLambertMaterial({ color: 0xffe0b0 }));
  head.position.set(0, 2.1, -0.2); g.add(head);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), new THREE.MeshLambertMaterial({ color: 0xffd400 }));
  bag.position.set(0, 1.7, -0.9);
  const bagO = new THREE.Mesh(bag.geometry, outlineMat); bagO.position.copy(bag.position); bagO.scale.setScalar(1.06);
  g.add(bagO, bag);
  return g;
}

/* ================= PARKED (drivable) + TRAFFIC ================= */
// parking bays just OFF the roads: [x, z, yaw, type, color, taxi]
const PARKED = [
  [-68, -24, 0, 'car', 0xffe93c, true],          // riverside bay
  [-68, 34, 0, 'car', 0x8a3028, false],
  [30, 32, Math.PI / 2, 'car', 0x3a5a8a, false], // south of the avenue
  [50, 30, -Math.PI / 2, 'car', 0xffe93c, true],
  [-12, 80, 0, 'car', 0xd8d0c0, false],
  [46, -58, 0, 'bike', 0x8a1a1a, false],
  [-52, 24, Math.PI / 2, 'bike', 0x2a7a2a, false],
  [22, 92, 0, 'car', 0x2a2a30, false],
];
const LOOPS = [
  { pts: [...AVENUE_RETURN], speed: 3.4, kind: 'car', n: 2 },
  { pts: [...CLUB], speed: 2.6, kind: 'car', n: 1 },
  { pts: [...RING], speed: 3.6, kind: 'moped', n: 2 },
  { pts: [...RIVERSIDE], speed: 2.4, kind: 'car', n: 1 },
];

export function buildVehicles(scene, player, camera) {
  scene3 = scene; player3 = player; camera3 = camera;
  roadStrip(scene, AVENUE, 8);
  roadStrip(scene, RING, 6);
  roadStrip(scene, CLUB.slice(0, 2), 7);
  roadStrip(scene, RIVERSIDE.slice(0, 2), 5);
  buildCauseway(scene);
  for (const [x, z, yaw, type, c, taxi] of PARKED) {
    const mesh = type === 'bike' ? bikeMesh() : carMesh(c, taxi);
    mesh.position.set(x, 0, z); mesh.rotation.y = yaw;
    scene.add(mesh);
    drivable.push({ mesh, x, z, yaw, type, taxi, vx: 0, vz: 0, half: type === 'bike' ? [0.5, 1.0] : [1.1, 2.2] });
  }
  for (const loop of LOOPS) {
    for (let i = 0; i < loop.n; i++) {
      const mesh = loop.kind === 'moped' ? glovoMopedMesh() : carMesh([0xc8c0b0, 0x8a3028, 0x3a5a8a, 0x5a6a4a][(Math.random() * 4) | 0]);
      scene.add(mesh);
      traffic.push({ mesh, loop, t: i / loop.n * loop.pts.length, speed: loop.speed * (0.85 + Math.random() * 0.3), kind: loop.kind, brake: 0 });
    }
  }
}

/* ================= TRAFFIC (with braking for pedestrians/cars) ================= */
function updateTraffic(dt) {
  for (const v of traffic) {
    const pts = v.loop.pts;
    // brake if the player or another vehicle is just ahead
    const yaw = v.mesh.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const ax = v.mesh.position.x + fx * 4.5, az = v.mesh.position.z + fz * 4.5;
    let blocked = Math.hypot(ax - player3.pos.x, az - player3.pos.z) < 3.4;
    if (!blocked) for (const o of traffic) {
      if (o === v) continue;
      if (Math.hypot(ax - o.mesh.position.x, az - o.mesh.position.z) < 3.4) { blocked = true; break; }
    }
    if (!blocked && driving) blocked = Math.hypot(ax - driving.x, az - driving.z) < 4;
    v.brake += ((blocked ? 1 : 0) - v.brake) * Math.min(1, dt * 5);
    const eff = v.speed * (1 - v.brake);
    v.t += dt * eff / 24;
    if (v.t >= pts.length) v.t -= pts.length;
    const i0 = Math.floor(v.t) % pts.length;
    const i1 = (i0 + 1) % pts.length;
    const f = v.t - Math.floor(v.t);
    const a = pts[i0], b = pts[i1];
    const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
    v.mesh.position.set(x, 0, z);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.5) v.mesh.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    if (v.kind === 'moped') v.mesh.rotation.z = Math.sin(performance.now() * 0.004 + v.t) * 0.1;
  }
}

/* ================= ENTER / EXIT ================= */
export function registerVehicleInteractables(interactables) {
  for (const v of drivable) {
    interactables.push({
      pos: new THREE.Vector3(v.x, 1, v.z), r: 3.2,
      get label() { return v.taxi ? '[E] RIDE THIS TAXI (DRIVE IT)' : v.type === 'bike' ? '[E] TAKE THIS BIKE' : '[E] TAKE THIS CAR'; },
      action() { /* entry handled by the vehicles keydown for reliability */ }
    });
  }
}
function enter(v) {
  driving = v;
  v.vx = 0; v.vz = 0; v.camX = undefined;
  audio.sfx('door');
  UI.popup(v.taxi ? 'TAXI TIME. METER IS VIBES.' : v.type === 'bike' ? 'TWO WHEELS, ZERO RULES.' : 'VROOM. ALLEGEDLY.', 'yellow');
  UI.setPrompt('[W/S] DRIVE · [A/D] STEER · [SPACE] HANDBRAKE · [E] OUT');
}
export function exitVehicle() {
  if (!driving) return;
  const v = driving;
  const ox = Math.cos(v.yaw) * 2.4, oz = -Math.sin(v.yaw) * 2.4;
  player3.pos.set(v.x + ox, 0.4, v.z + oz);
  player3.vel.set(0, 0, 0);
  player3.yaw = v.yaw;
  // update the parking interactable position so you can re-enter where you left it
  audio.sfx('door');
  driving = null;
  UI.setPrompt(null);
}
export function nearestParked() {
  if (!player3) return null;
  let best = null, bd = 3.6;
  for (const v of drivable) {
    const d = Math.hypot(v.x - player3.pos.x, v.z - player3.pos.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
function busy() {
  return UI.dialogueOpen() || UI.osOpen() || (UI.danceActive && UI.danceActive()) || (UI.choicesOpen && UI.choicesOpen());
}
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyE' || e.repeat || !player3) return;
  if (driving) { e.preventDefault(); exitVehicle(); return; }
  if (busy()) return;
  const v = nearestParked();
  if (v) { e.preventDefault(); e.stopImmediatePropagation(); enter(v); }
}, true);

/* ================= GTA-STYLE DRIVING ================= */
function carBlocked(nx, nz, hw, hl) {
  const r = Math.max(hw, hl) * 0.85;
  const a = { minX: nx - r, maxX: nx + r, minY: 0.25, maxY: 1.5, minZ: nz - r, maxZ: nz + r };
  for (const c of colliders) {
    if (a.minX < c.maxX && a.maxX > c.minX && a.minY < c.maxY && a.maxY > c.minY && a.minZ < c.maxZ && a.maxZ > c.minZ) return true;
  }
  return false;
}
function updateDrive(dt) {
  const v = driving;
  dt = Math.min(dt, 0.04);
  const throttle = input.down('KeyW') ? 1 : 0;
  const brake = input.down('KeyS') ? 1 : 0;
  const steerIn = (input.down('KeyA') ? 1 : 0) - (input.down('KeyD') ? 1 : 0);
  const hand = input.down('Space');
  const isBike = v.type === 'bike';
  const maxS = isBike ? 17 : 15;
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
  let speed = v.vx * fx + v.vz * fz;
  if (throttle) speed += (1 - Math.max(0, speed) / maxS) * (isBike ? 20 : 17) * dt;
  if (brake) speed -= (speed > 0.2 ? 24 : 12) * dt;
  if (!throttle && !brake) speed *= (1 - dt * 0.9);
  speed = Math.max(-6, Math.min(maxS, speed));
  const authority = Math.min(1, Math.abs(speed) / 4.5) * (1 - Math.min(0.4, Math.abs(speed) / maxS * 0.4));
  const turn = steerIn * (isBike ? 2.5 : 1.95) * authority * dt * (speed < 0 ? -1 : 1);
  v.yaw += turn;
  const nfx = -Math.sin(v.yaw), nfz = -Math.cos(v.yaw);
  const dot = v.vx * nfx + v.vz * nfz;
  const latX = v.vx - dot * nfx, latZ = v.vz - dot * nfz;
  const latKeep = hand ? 0.96 : (isBike ? 0.6 : 0.78);
  v.vx = nfx * speed + latX * latKeep;
  v.vz = nfz * speed + latZ * latKeep;
  const hw = v.half[0], hl = v.half[1];
  const ndx = v.vx * dt, ndz = v.vz * dt;
  const bx1 = carBlocked(v.x + ndx, v.z, hw, hl), bz1 = carBlocked(v.x, v.z + ndz, hw, hl);
  if (!bx1) v.x += ndx; else { v.vx = Math.abs(v.vx) > 3 ? v.vx * -0.25 : 0; }
  if (!bz1) v.z += ndz; else { v.vz = Math.abs(v.vz) > 3 ? v.vz * -0.25 : 0; }
  const spd = Math.hypot(v.vx, v.vz);
  v.mesh.position.set(v.x, 0, v.z);
  v.mesh.rotation.order = 'YXZ';
  v.mesh.rotation.y = v.yaw;
  v.roll = (v.roll || 0) + (-turn * 26 - (v.roll || 0)) * Math.min(1, dt * 8);
  v.mesh.rotation.z = v.roll * 0.02 * (isBike ? 2.4 : 1);
  v.pitch = (v.pitch || 0) + (((brake ? 0.05 : 0) + (throttle ? -0.035 : 0)) - (v.pitch || 0)) * Math.min(1, dt * 6);
  v.mesh.rotation.x = v.pitch;
  if (spd > 1 && Math.random() < dt * (3 + spd * 0.3)) audio.footstep('metal');
  // lagging chase camera + speed FOV
  const back = isBike ? 5.6 : 6.8, camH = isBike ? 3.0 : 3.5;
  const tx = v.x + Math.sin(v.yaw) * back, tz = v.z + Math.cos(v.yaw) * back;
  if (v.camX === undefined) { v.camX = tx; v.camZ = tz; }
  const lag = Math.min(1, dt * 3.4);
  v.camX += (tx - v.camX) * lag; v.camZ += (tz - v.camZ) * lag;
  camera3.position.set(v.camX, camH, v.camZ);
  camera3.rotation.order = 'YXZ';
  camera3.lookAt(v.x - Math.sin(v.yaw) * 7, 1.4, v.z - Math.cos(v.yaw) * 7);
  camera3.fov += ((68 + spd * 0.7) - camera3.fov) * Math.min(1, dt * 4);
  camera3.updateProjectionMatrix();
  input.mouseDX = 0; input.mouseDY = 0;
  player3.pos.set(v.x, 0.4, v.z);
}

export function updateVehicles(dt) {
  updateTraffic(dt);
  if (driving) updateDrive(dt);
}
