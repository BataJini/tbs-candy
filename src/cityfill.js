// cityfill.js — makes the city FULL: a valley ringed by mountains, hillsides packed
// with colourful red-roof houses, Georgian churches, Soviet blocks, trees, cars,
// props, and the big landmarks. Almost all merged per-colour → cheap draw calls.
import * as THREE from 'three';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { colliders } from './world.js';

const geoByColor = new Map();
const outlineGeos = [];
export const cityBlink = [];

function col(hex) { if (!geoByColor.has(hex)) geoByColor.set(hex, []); return geoByColor.get(hex); }
function addCollider(x, y, z, w, h, d, surface = 'concrete') {
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2, surface });
}
function bx(hex, x, y, z, w, h, d, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (o.rotY) g.rotateY(o.rotY);
  g.translate(x, y, z);
  col(hex).push(g);
  if (o.outline) {
    const og = new THREE.BoxGeometry(w + (o.ow || 0.4), h + (o.ow || 0.4), d + (o.ow || 0.4));
    if (o.rotY) og.rotateY(o.rotY);
    og.translate(x, y, z);
    outlineGeos.push(og);
  }
  if (o.collide) addCollider(x, y, z, w, h, d, o.surface);
}
function cone(hex, x, y, z, r, h, seg = 6, o = {}) {
  const g = new THREE.ConeGeometry(r, h, seg);
  if (o.rotY) g.rotateY(o.rotY);
  g.translate(x, y + h / 2, z); col(hex).push(g);
}
function pyr(hex, x, y, z, r, h) { cone(hex, x, y, z, r, h, 4); }
function cyl(hex, x, y, z, r1, r2, h, seg = 8, o = {}) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg);
  if (o.rotX) g.rotateX(o.rotX);
  g.translate(x, y, z); col(hex).push(g);
}
let SEED = 90210;
function rnd() { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; }
const pick = (a) => a[(rnd() * a.length) | 0];

const HOUSE = ['#c98a5a', '#d0a860', '#b0685a', '#8aa0b0', '#c0b070', '#a88a70', '#9ab0c0', '#caa090', '#7a9aa8'];
const ROOF = ['#a83828', '#8a3020', '#b04030', '#9a4838', '#7a3428'];

// road corridors — keep trees/props/houses off the driving network
function onRoad(x, z) {
  if (z > 6 && z < 17 && x > -114 && x < 94) return true;      // main avenue + causeway
  if (z > 16 && z < 24 && x > 20 && x < 48) return true;       // monument jog
  if (x > -1 && x < 6 && z > -68 && z < 14) return true;       // ring west leg
  if (z > -68 && z < -60 && x > -1 && x < 74) return true;     // ring south leg
  if (x > 66 && x < 96 && z > -68 && z < 14) return true;      // ring east legs (diagonals incl.)
  if (z > 55 && z < 67 && x > -48 && x < 36) return true;      // club street
  if (x > -79 && x < -70 && z > -90 && z < 48) return true;    // riverside road
  return false;
}

/* ---- one colourful old-town house with a red pitched roof + balcony ---- */
function house(x, y, z, w, h, d, o = {}) {
  const hc = o.col || pick(HOUSE);
  bx(hc, x, y + h / 2, z, w, h, d, { outline: true, collide: o.collide !== false, surface: o.surface });
  // pitched red roof (pyramid)
  pyr(pick(ROOF), x, y + h, z, Math.max(w, d) * 0.72, 1.2 + rnd() * 1.4);
  // wooden balcony on the front (+z)
  if (rnd() < 0.7) bx('#8a6a44', x, y + h * (0.45 + rnd() * 0.3), z + d / 2 + 0.25, w * 0.86, 1, 0.5);
  // a couple of lit/dark windows
  for (let i = 0; i < 2; i++) {
    const wx = x + (i - 0.5) * w * 0.5;
    bx(rnd() < 0.35 ? '#ffcf6b' : '#2a2735', wx, y + h * 0.55, z + d / 2 + 0.06, w * 0.22, h * 0.3, 0.08);
  }
}

/* ---- a packed ground-level neighbourhood (all houses sit at y=0, no floating) ---- */
function hillTown(cx, cz, dirX, dirZ, count) {
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const jitter = (rnd() - 0.5);
    const hx = cx + dirX * (t * 60) + (-dirZ) * jitter * 40;
    const hz = cz + dirZ * (t * 60) + (dirX) * jitter * 40;
    // keep neighbourhoods on the flat floor: off the green hills and out of the mountain cones
    if (typeof onHill === 'function' && onHill(hx, hz, 8)) continue;
    if (hx * hx + hz * hz > 158 * 158) continue;
    house(hx, 0, hz, 4 + rnd() * 4, 4 + rnd() * 5, 4 + rnd() * 4);
  }
}

/* ---- VALLEY: solid ground floors everywhere + mountain ring (city in a bowl) ---- */
// exported hill footprints so nothing else spawns on them. [x, z, radius, height]
export const HILLS = [
  [30, -170, 50, 54],   // Mtatsminda — the TV-tower hill: a distinct green hill south of the city
  [150, -78, 46, 34],   // east foothills
  [158, 74, 44, 28],
  [-158, -80, 44, 32],
  [130, 150, 42, 24],
  [-150, 132, 42, 28],
];
function valley() {
  const base = -8;
  // solid valley floors so NOTHING floats. Two slabs, leaving the river open.
  bx('#4a5a38', 60, -3.05, 0, 360, 6, 460, { outline: false });
  bx('#4a5a38', -175, -3.05, 0, 130, 6, 460, { outline: false });
  // green hills rising from the floor (solid — can't walk into them)
  for (const [x, z, r, h] of HILLS) {
    cone('#54653c', x, 0, z, r, h, 7);
    cone('#455528', x - r * 0.28, 0, z + r * 0.2, r * 0.5, h * 0.55, 6);
    addCollider(x, h / 2, z, r * 1.15, h, r * 1.15);
  }
  // the mountain RING — pointier (smaller base) so cones don't reach inward into the city
  const R = 250;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 28) {
    const r = R + (rnd() - 0.5) * 24;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.92;
    const h = 120 + rnd() * 80;
    cone('#47582f', x, base, z, 56 + rnd() * 22, h, 6);
    cone('#38481f', x + (rnd() - 0.5) * 22, base, z + (rnd() - 0.5) * 22, 34, h * 0.5, 6);
    if (rnd() < 0.5) cone('#93805c', x, base + h * 0.45, z, 26, h * 0.42, 6);
  }
  // invisible CONTAINMENT RING so the player/car can't leave the valley into the mountains
  const RC = 208;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
    addCollider(Math.cos(a) * RC, 24, Math.sin(a) * RC * 0.92, 48, 48, 48);
  }
}
// is (x,z) sitting on/near one of the green hills? (used to keep flat-ground props off them)
function onHill(x, z, pad = 6) {
  for (const [hx, hz, r] of HILLS) if ((x - hx) ** 2 + (z - hz) ** 2 < (r + pad) ** 2) return true;
  return false;
}

// churches placed in the city — nothing (esp. trees) may spawn on their footprint
export const CHURCHES = [
  [-30, 33, 1.0], [86, 33, 1.0], [-46, 52, 1.0],   // in-city, y=0
  [95, -10, 1.5], [-125, -20, 1.1],                // grand cathedral (east), west bank
];
// keep-out circles around entrances / key spots so nothing blocks them
const KEEPOUT = [
  [10, 91, 14], [-61, 72, 12],       // B909 + KHD club entrances
  [-64, -1, 6], [-2, 30, 7],          // kiosk, metro
  [34, 16, 8], [55, 27, 5], [-40, 34, 5], // monument, vending, vending
  [-14, 84, 8], [7, 91, 12],          // taxi + club queue
  [16, 44, 9],                        // fountain park
];
function keepClear(x, z) {
  for (const [kx, kz, kr] of KEEPOUT) if ((x - kx) ** 2 + (z - kz) ** 2 < kr * kr) return false;
  for (const [cx, cz] of CHURCHES) if ((x - cx) ** 2 + (z - cz) ** 2 < 13 ** 2) return false;
  if (onHill(x, z, 4)) return false;
  return !onRoad(x, z);
}
function oneTree(x, z, tall) {
  const h = tall ? 6 + rnd() * 5 : 2.6 + rnd() * 3.4;
  bx('#5a4030', x, 0.2 + h * 0.3, z, 0.4, h * 0.6, 0.4);
  const gc = tall ? '#2f4d24' : pick(['#3c6a2a', '#4a7a30', '#2f5a22', '#5a8a38']);
  cone(gc, x, 0.2 + h * 0.5, z, tall ? 1.1 : 1.4 + rnd(), h, 6);
  if (!tall) cone(gc, x, 0.2 + h * 0.9, z, 1.0 + rnd() * 0.6, h * 0.6, 6);
}
/* ---- trees, in tidy park clusters (Tbilisi is green, but not on doorways) ---- */
function trees() {
  // small parks: [centreX, centreZ, count, spread, tallChance] — all in verified-clear spots
  const parks = [
    [-66, -14, 3, 4, 0.5], [-66, 30, 3, 4, 0.5],                          // riverside promenade line
    [-20, 30, 3, 4, 0.6], [78, 30, 3, 4, 0.6],                            // Rustaveli south verge (offset from churches)
    [50, -72, 4, 7, 0.3], [22, -74, 3, 6, 0.3],                           // old-blocks courtyards
    [-24, 58, 4, 7, 0.4], [24, 60, 3, 6, 0.4],                            // club district green
    [-58, 44, 4, 5, 0.7],                                                 // cypress row NEAR the church, not on it
  ];
  for (const [cx, cz, n, sp, tallC] of parks) {
    for (let i = 0; i < n; i++) {
      const x = cx + (rnd() - 0.5) * sp * 2, z = cz + (rnd() - 0.5) * sp * 2;
      if (!keepClear(x, z)) continue;
      oneTree(x, z, rnd() < tallC);
    }
  }
  // a light scattering on the flat floor OUTSIDE the play area but INSIDE the mountains
  // (radius band 115..150 — clear of the play core, the hills, and the mountain cones)
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, rr = 116 + rnd() * 32;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (onHill(x, z, 8) || onRoad(x, z)) continue;
    oneTree(x, z, rnd() < 0.4);
  }
}

/* ---- GEORGIAN CHURCH: cruciform nave, drum + conical dome, bell tower ---- */
function georgianChurch(x, z, y, s = 1, o = {}) {
  const stone = o.col || '#d8c49a';
  const roof = '#3a4048';
  // cruciform nave
  bx(stone, x, y + 3.5 * s, z, 8 * s, 7 * s, 6 * s, { outline: true, collide: o.collide, surface: 'concrete' });
  bx(stone, x, y + 3.5 * s, z, 6 * s, 7 * s, 8 * s, { outline: true, collide: o.collide, surface: 'concrete' });
  // gabled arch roofs on the arms (dark)
  pyr(roof, x, y + 7 * s, z, 5.5 * s, 2.4 * s);
  // tall central drum + conical dome (the signature)
  cyl(stone, x, y + 9 * s, z, 2.2 * s, 2.4 * s, 4 * s, 8);
  // arched windows on the drum (dark slots)
  for (let a = 0; a < 8; a++) {
    const ax = x + Math.cos(a / 8 * 7) * 2.3 * s, az = z + Math.sin(a / 8 * 7) * 2.3 * s;
    bx('#2a2735', ax, y + 9 * s, az, 0.5 * s, 2 * s, 0.5 * s);
  }
  cone(roof, x, y + 11 * s, z, 2.9 * s, 4.5 * s, 8);
  // gold cross
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xf0d060 });
  const cv = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 2.4 * s, 0.16 * s), crossMat);
  cv.position.set(x, y + 16.4 * s, z);
  const cvh = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s, 0.16 * s, 0.16 * s), crossMat);
  cvh.position.set(x, y + 16.6 * s, z);
  cityBlink._extra = cityBlink._extra || []; cityBlink._extra.push(cv, cvh);
  // separate bell tower (arched, conical cap)
  const bx0 = x + 6 * s, bz0 = z + 4 * s;
  bx(stone, bx0, y + 6 * s, bz0, 3 * s, 12 * s, 3 * s, { outline: true, collide: o.collide });
  for (const yy of [3, 7, 10]) for (const face of [[0, 1.55], [1.55, 0], [0, -1.55], [-1.55, 0]]) {
    bx('#2a2735', bx0 + face[0] * s, y + yy * s, bz0 + face[1] * s, 0.9 * s, 2.2 * s, 0.9 * s);
  }
  cone(roof, bx0, y + 12 * s, bz0, 2.2 * s, 3.2 * s, 8);
  const cv2 = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 1.6 * s, 0.14 * s), crossMat);
  cv2.position.set(bx0, y + 15.6 * s, bz0);
  cityBlink._extra.push(cv2);
}

/* ---- more Soviet panel blocks in the backdrop (flat ground, grounded at y=0) ---- */
function sovietBlock(bx0, bz0) {
  if (onHill(bx0, bz0, 10) || onRoad(bx0, bz0)) return;
  const blockCol = ['#b9aa9a', '#9aa5a8', '#a89a8a', '#a5a0a8', '#8a9a8a', '#b0a495'];
  const h = 22 + rnd() * 24, w = 12 + rnd() * 4, d = 10 + rnd() * 4;
  const c = pick(blockCol);
  bx(c, bx0, h / 2, bz0, w, h, d, { outline: true, collide: true });   // bottom on the floor
  bx('#5a5548', bx0, h + 0.4, bz0, w + 1, 0.8, d + 1);                  // roof lip
  const floors = (h / 3) | 0, colsN = 4;
  for (let f = 1; f < floors; f++) for (let k = 0; k < colsN; k++) {
    bx('#2c2a34', bx0 + (k - 1.5) * (w / colsN), f * 3, bz0 + d / 2 + 0.05, w / colsN * 0.6, 1.6, 0.1);
  }
}
function sovietBackdrop() {
  // explicit safe clusters on the flat floor, in the ring just outside the play area
  // (radius ~90-135: clear of both the play core and the mountains)
  const spots = [
    [-40, -140], [-24, -140], [-8, -140], [8, -142], [24, -140], [40, -142], [56, -140],  // north strip
    [-30, 140], [-14, 142], [2, 140], [18, 142], [34, 140], [50, 142],                     // south strip
    [118, -40], [120, -20], [122, 0], [120, 20], [118, 40],                                // east strip
    [118, -70], [120, 70],
    [-118, -46], [-120, -24], [-122, 44], [-120, 66],                                      // west-of-oldtown strip
  ];
  for (const [x, z] of spots) sovietBlock(x + (rnd() - 0.5) * 4, z + (rnd() - 0.5) * 4);
}

/* ---- DENSE OLD TOWN on the far (west) river bank + outer neighbourhoods ---- */
function oldTownBank() {
  // packed old town across the river (west floor), all grounded at y=0
  for (let i = 0; i < 60; i++) {
    const x = -116 - rnd() * 66;
    const z = -110 + (i / 60) * 220 + (rnd() - 0.5) * 10;
    house(x, 0, z, 4 + rnd() * 4, 4 + rnd() * 6, 4 + rnd() * 4);
  }
  // neighbourhoods filling the outer valley beyond the play area (grounded)
  hillTown(140, -70, 0.6, -0.6, 20);
  hillTown(155, 60, -0.4, 0.9, 20);
  hillTown(-20, -150, 0.6, -0.5, 18);
  hillTown(70, 150, -0.6, -0.4, 18);
  hillTown(-165, 95, 0.8, -0.4, 16);
}

/* ---- static parked cars (Ladas / Mercedes), merged, collidable ---- */
const CARCOL = ['#c8c0b0', '#8a3028', '#3a5a8a', '#d8d0c0', '#5a6a4a', '#2a2a30', '#b08040'];
function parkedCar(x, z, yaw, c) {
  bx(c, x, 0.6, z, 4.4, 0.9, 1.9, { rotY: yaw, outline: true, collide: true, surface: 'concrete' });
  bx(c, x, 1.25, z, 2.6, 0.9, 1.75, { rotY: yaw, outline: true });
  bx('#20242c', x, 1.28, z, 2.4, 0.7, 1.85, { rotY: yaw });
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.95, 0.95]) {
    const wx = x + Math.cos(yaw) * sx - Math.sin(yaw) * sz;
    const wz = z + Math.sin(yaw) * sx + Math.cos(yaw) * sz;
    cyl('#141018', wx, 0.35, wz, 0.35, 0.35, 0.3, 6, { rotX: Math.PI / 2 });
  }
}
function props() {
  const lots = [
    [-70, -20, 0, 3], [30, 8, 1, 3], [-10, 84, 1, 3], [44, -58, 0, 2],
  ];
  for (const [lx, lz, horiz, n] of lots) {
    for (let i = 0; i < n; i++) {
      const x = horiz ? lx + i * 5.2 : lx;
      const z = horiz ? lz : lz + i * 5.2;
      parkedCar(x, z, horiz ? 0 : Math.PI / 2, pick(CARCOL));
    }
  }
  const stallCols = ['#c0402f', '#2f7ac0', '#c0a02f', '#2fa060', '#a02fc0'];
  for (const [sx, sz] of [[-66, 6], [-68, 14], [-58, 26], [8, 30], [48, 32], [-10, 88], [30, -60]]) {
    if (onRoad(sx, sz)) continue;
    bx('#7a5a3a', sx, 0.9, sz, 2.4, 1.4, 1.6, { outline: true, collide: true });
    bx(pick(stallCols), sx, 1.9, sz, 3, 0.25, 2.2, { outline: true });
    for (const cc of [-1.2, 1.2]) bx('#5a4a3a', sx + cc, 1.4, sz - 0.9, 0.15, 1, 0.15);
    bx(pick(stallCols), sx, 1.75, sz + 0.4, 0.6, 0.4, 0.5);
  }
  for (const [px, pz] of [[-72, -8], [-72, 4], [8, 32], [46, 32], [-6, 90], [22, 90]]) {
    if (onRoad(px, pz)) continue;
    bx('#6a4a30', px, 0.5, pz, 1.8, 0.4, 0.6, { outline: true });
    bx('#3a3a42', px + 2.2, 0.6, pz, 0.7, 1.1, 0.7, { outline: true });
  }
  // tram/power poles along the pavement edges (just off the roads)
  const poles = [[-74, -30], [-74, 10], [-74, 50], [-32, 10], [-32, 26], [92, 10], [92, 26], [-46, 60], [36, 60]];
  for (const [px, pz] of poles) { if (onRoad(px, pz)) continue; bx('#2a2a30', px, 4, pz, 0.3, 8, 0.3, { outline: true, collide: true }); }
}

/* ---- LANDMARKS: bridges ---- */
function bridges(scene) {
  // Arched pedestrian FOOTBRIDGE across the river (walkable), east->west at z=-38
  const bz = -38, deckY = 1.2;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = -78 - t * 38;
    addCollider(x, deckY - 0.15, bz, 3, 0.4, 4, 'metal');
    bx('#7a8894', x, deckY - 0.2, bz, 2.2, 0.3, 4);
    const arch = Math.sin(t * Math.PI) * 7;
    bx('#8fa0ac', x, deckY + 1 + arch, bz - 1.9, 0.3, 0.3, 0.3);
    bx('#8fa0ac', x, deckY + 1 + arch, bz + 1.9, 0.3, 0.3, 0.3);
    if (i % 2 === 0) { bx('#6a7884', x, deckY + arch / 2, bz - 1.9, 0.12, arch, 0.12); bx('#6a7884', x, deckY + arch / 2, bz + 1.9, 0.12, arch, 0.12); }
    bx('#cfe8f0', x, deckY + 0.6, bz - 2, 0.9, 0.1, 0.06);
    bx('#cfe8f0', x, deckY + 0.6, bz + 2, 0.9, 0.1, 0.06);
  }
  for (let i = 0; i < 4; i++) { addCollider(-77 + i, 0.3 + i * 0.25, bz, 2.4, 0.5, 4, 'metal'); bx('#7a8894', -77 + i, 0.2 + i * 0.25, bz, 2.4, 0.4, 4); }

  // PEACE BRIDGE (wavy glass canopy) near club district, decorative
  const px0 = -95, pz0 = 30;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = px0 - 8 + t * 40;
    const wave = Math.sin(t * Math.PI) * 3.5;
    for (const zz of [-3, 0, 3]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 2.6),
        new THREE.MeshBasicMaterial({ color: 0x8fd8e0, transparent: true, opacity: 0.42 }));
      g.position.set(x, 5.5 + wave, pz0 + zz);
      cityBlink._glass = cityBlink._glass || []; cityBlink._glass.push(g);
    }
    bx('#eef4f6', x, 5.4 + wave, pz0 - 4, 0.2, 0.2, 0.2);
    bx('#eef4f6', x, 5.4 + wave, pz0 + 4, 0.2, 0.2, 0.2);
    bx('#b0b6bc', x, 2.4, pz0, 2, 0.3, 9);
  }
  bx('#8a9098', px0 - 9, 1.2, pz0, 2, 2.4, 10, { outline: true });
  bx('#8a9098', px0 + 33, 1.2, pz0, 2, 2.4, 10, { outline: true });
}

/* ---- LANDMARKS: Rike hall, Narikala, palace ---- */
function bigLandmarks(scene) {
  const rMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.4, flatShading: true });
  for (const [tx, tz, tl, rot] of [[-104, 44, 16, 0.3], [-100, 52, 12, -0.4]]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, tl, 12), rMat);
    tube.rotation.z = Math.PI / 2; tube.rotation.y = rot;
    tube.position.set(tx, 4, tz); scene.add(tube);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 3.4, 1.4, 12),
      new THREE.MeshBasicMaterial({ color: 0x14161c }));
    cap.rotation.z = Math.PI / 2; cap.rotation.y = rot;
    cap.position.set(tx + Math.cos(rot) * tl / 2, 4, tz + Math.sin(rot) * tl / 2); scene.add(cap);
  }
  // Narikala fortress hill + walls + church
  const nx = 150, nz = 120, ny = 30;
  cone('#6a5a44', nx, -6, nz, 80, 46, 6);
  for (let i = 0; i < 8; i++) {
    const wx = nx - 24 + i * 6, wz = nz - 10 + Math.sin(i) * 3;
    bx('#9a7a56', wx, ny + 3, wz, 6, 8, 3, { outline: true });
    bx('#9a7a56', wx, ny + 7.4, wz, 1.4, 1.4, 3);
    bx('#9a7a56', wx + 3, ny + 7.4, wz, 1.4, 1.4, 3);
  }
  cyl('#8a6a48', nx - 26, ny + 6, nz - 8, 3, 3.4, 12, 8);
  cone('#3a4048', nx - 26, ny + 12, nz - 8, 3.6, 3, 8);
  georgianChurch(nx + 6, nz + 6, ny, 1.1);
  // Presidential palace glass dome on far skyline
  bx('#e8e2d6', 120, 20, -110, 26, 14, 16, { outline: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8, 0, 7, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x9ec8d8, metalness: 0.5, roughness: 0.3, transparent: true, opacity: 0.7, flatShading: true }));
  dome.position.set(120, 27, -110); scene.add(dome);
}

/* ---- PARK: fountain, benches, lawn, trees (Vera-park vibes) ---- */
function park(scene) {
  const px = 16, pz = 44;
  // lawn + light paths
  bx("#4c6a38", px, 0.04, pz, 26, 0.08, 18);
  bx("#b8ac92", px, 0.09, pz, 26, 0.04, 2.4);
  bx("#b8ac92", px, 0.09, pz, 2.4, 0.04, 18);
  // fountain: basin + water + spout
  cyl("#9a9284", px, 0.5, pz, 3.2, 3.6, 1, 10);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.2, 10),
    new THREE.MeshLambertMaterial({ color: 0x5fb0c8, transparent: true, opacity: 0.85 }));
  water.position.set(px, 0.95, pz); scene.add(water);
  cyl("#9a9284", px, 1.4, pz, 0.4, 0.5, 1.4, 8);
  addCollider(px, 0.6, pz, 6.8, 1.2, 6.8);
  // benches facing the fountain + bins
  for (const [bxx, bzz] of [[px - 8, pz - 5], [px + 8, pz - 5], [px - 8, pz + 5], [px + 8, pz + 5]]) {
    bx("#6a4a30", bxx, 0.5, bzz, 1.8, 0.4, 0.6, { outline: true, collide: true });
  }
  // ring of trees
  for (let a = 0; a < 8; a++) {
    const tx = px + Math.cos(a / 8 * Math.PI * 2) * 10.5;
    const tz = pz + Math.sin(a / 8 * Math.PI * 2) * 7.5;
    if (!onRoad(tx, tz)) oneTree(tx, tz, a % 3 === 0);
  }
}

/* ---- assemble ---- */
export function buildCity(scene) {
  valley();
  trees();
  sovietBackdrop();
  oldTownBank();
  props();
  // in-city churches in clear open plazas (not glued to buildings), all grounded at y=0
  georgianChurch(-30, 33, 0.2, 1.0, { collide: true });   // SW Rustaveli plaza
  georgianChurch(86, 33, 0.2, 1.0, { collide: true });    // SE Rustaveli plaza
  georgianChurch(-46, 52, 0.2, 1.0, { collide: true });   // club district green
  georgianChurch(95, -10, 0.2, 1.5, { collide: true });   // grand Sameba-style cathedral (east)
  georgianChurch(-125, -20, 0.2, 1.1, { collide: true }); // across the river
  park(scene);
  bridges(scene);
  bigLandmarks(scene);
  for (const [hex, geos] of geoByColor) {
    if (!geos.length) continue;
    const cc = new THREE.Color(hex);
    const merged = BGU.mergeGeometries(geos, false);
    const mat = new THREE.MeshLambertMaterial({ color: cc, emissive: cc.clone().multiplyScalar(0.14) });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false; scene.add(mesh);
  }
  if (outlineGeos.length) {
    const om = new THREE.Mesh(BGU.mergeGeometries(outlineGeos, false),
      new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide }));
    om.matrixAutoUpdate = false; scene.add(om);
  }
  for (const m of (cityBlink._extra || [])) scene.add(m);
  for (const m of (cityBlink._glass || [])) scene.add(m);
  geoByColor.clear(); outlineGeos.length = 0;
}
