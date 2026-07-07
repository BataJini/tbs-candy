// world.js — the whole city, built from boxes, merged into a handful of draw calls.
//
// LAYOUT (top view, x east ->, z south v):
//   x -110..-78 : Mtkvari river (water y=-2.6)
//   x  -78..-30 : riverside promenade + UNDERPASS (roof slab, pillars)   z -30..60
//   x   10..90  : OLD BLOCKS towers                                       z -100..-20
//   z    0..30  : RUSTAVELI GLITCH avenue                                 x -30..90
//   z   45..105 : BRIDGE CLUB DISTRICT (bridge x<-56 over river)          x -78..40
//   interiors: BASSMENT 909 @ y=-60 under (10,80); KHD-404 @ y=-40 under (-70,68)
//   ROOFTOP ANTENNA ZONE: tower tops + radio shack on T5 (60,-80)

import * as THREE from 'three';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

export const colliders = [];   // axis-aligned boxes {minX..maxZ, surface}
export const ladders = [];     // {x, z, y0, y1, r}
export const doors = [];       // teleport doors {pos:[x,y,z], to:[x,y,z], name, requires, exitYaw}
export const elevators = [];   // {x,z,w,d, y0,y1, mesh, t, dir}
export const zoneRects = [];   // {name, banner, minX,maxX,minZ,maxZ, minY,maxY, music, bed}
export const dynamic = { screens: [], water: null, blinkers: [], lasers: [], smoke: [], dancers: [], flags: [] };
export const landmarks = {};   // named positions for systems/npcs

const outlineGeos = [];
const geoByMat = new Map();

function addCollider(x, y, z, w, h, d, surface = 'concrete') {
  colliders.push({
    minX: x - w / 2, maxX: x + w / 2,
    minY: y - h / 2, maxY: y + h / 2,
    minZ: z - d / 2, maxZ: z + d / 2,
    surface
  });
}

// core box builder: geometry merged per-material; optional outline hull + collider
export function B(mat, x, y, z, w, h, d, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (opts.rotY) g.rotateY(opts.rotY);
  g.translate(x, y, z);
  if (!geoByMat.has(mat)) geoByMat.set(mat, []);
  geoByMat.get(mat).push(g);
  if (opts.outline !== false) {
    const o = new THREE.BoxGeometry(w + 0.12, h + 0.12, d + 0.12);
    if (opts.rotY) o.rotateY(opts.rotY);
    o.translate(x, y, z);
    outlineGeos.push(o);
  }
  if (opts.collide !== false && !opts.rotY) addCollider(x, y, z, w, h, d, opts.surface || 'concrete');
  if (opts.collide !== false && opts.rotY) { // rotated boxes get a fat AABB
    const r = Math.max(w, d);
    addCollider(x, y, z, r, h, r, opts.surface || 'concrete');
  }
  return { x, y, z, w, h, d };
}

export function stairs(mat, x, y, z, dir, steps, stepW, stepH, stepD, opts = {}) {
  // dir: 0 +z, 1 -z, 2 +x, 3 -x  (walking up along dir)
  for (let i = 0; i < steps; i++) {
    const sy = y + stepH / 2 + i * stepH;
    let sx = x, sz = z;
    if (dir === 0) sz = z + i * stepD;
    if (dir === 1) sz = z - i * stepD;
    if (dir === 2) sx = x + i * stepD;
    if (dir === 3) sx = x - i * stepD;
    const w = (dir < 2) ? stepW : stepD * 1.4;
    const d = (dir < 2) ? stepD * 1.4 : stepW;
    B(mat, sx, sy, sz, w, stepH, d, { outline: i % 3 === 0, ...opts });
  }
}

export function ladder(mat, x, y0, y1, z, facing = 0) {
  // facing: 0 = climb approaching from -z side, 1 = +z, 2 = -x, 3 = +x
  const h = y1 - y0;
  const cy = y0 + h / 2;
  const off = 0.18;
  let rx = x, rz = z, w = 0.7, d = 0.12;
  if (facing >= 2) { w = 0.12; d = 0.7; }
  B(mat, rx, cy, rz, w, h, d, { collide: false, outline: false });
  for (let i = 1; i < h / 0.5; i++) {
    if (facing < 2) B(mat, x, y0 + i * 0.5, z + (facing === 0 ? -off : off) * 0.3, 0.6, 0.06, 0.2, { collide: false, outline: false });
    else B(mat, x + (facing === 2 ? -off : off) * 0.3, y0 + i * 0.5, z, 0.2, 0.06, 0.6, { collide: false, outline: false });
  }
  ladders.push({ x, z, y0, y1, r: 1.1 });
}

// single textured plane (posters, signs, screens…) — kept individual
export function plane(scene, canvas, x, y, z, w, h, face = '+z', opts = {}) {
  const t = TX.tex(canvas);
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: !!opts.alpha, side: THREE.DoubleSide });
  if (opts.unlit === false) { /* keep basic anyway for style pop */ }
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(x, y, z);
  if (face === '+z') p.rotation.y = 0;
  if (face === '-z') p.rotation.y = Math.PI;
  if (face === '+x') p.rotation.y = Math.PI / 2;
  if (face === '-x') p.rotation.y = -Math.PI / 2;
  if (face === '+y') p.rotation.x = -Math.PI / 2;
  if (opts.rotZ) p.rotation.z = opts.rotZ;
  scene.add(p);
  return p;
}

let MATS = null;
export function materials() {
  if (MATS) return MATS;
  const toon = (canvas, rx = 1, ry = 1) => new THREE.MeshLambertMaterial({ map: TX.tex(canvas, rx, ry) });
  const flat = (col) => new THREE.MeshLambertMaterial({ color: col });
  MATS = {
    concrete: toon(TX.concreteTex('#a99c86'), 2, 2),
    concreteDark: toon(TX.concreteTex('#7d7264'), 2, 2),
    concreteGreen: toon(TX.concreteTex('#8a9a7a'), 2, 2),
    asphalt: toon(TX.asphaltTex(), 3, 3),
    sidewalk: toon(TX.concreteTex('#b8ac92'), 2, 2),
    gov: toon(TX.govFacadeTex()),
    clubwall: toon(TX.clubWallTex(), 2, 2),
    metal: toon(TX.metalTex(), 1, 1),
    metalRed: toon(TX.metalTex('#8a4a4a')),
    tile: toon(TX.bathroomTileTex(), 2, 2),
    dancefloor: toon(TX.dancefloorTex(), 4, 4),
    outline: new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide }),
    beige: flat(0xcbb9a0), pink: flat(0xff4fa3), acid: flat(0x3dfc7a),
    blue: flat(0x3aa0ff), red: flat(0xd44), yellow: flat(0xffe93c),
    purple: flat(0x5a4a7a), darkPurple: flat(0x241a38), brown: flat(0x6a5040),
    grey: flat(0x8a8a92), dark: flat(0x1d1a28), wood: flat(0x9a7a50),
    facades: [
      toon(TX.blockFacadeTex('#b99a8a', 7, 5)),
      toon(TX.blockFacadeTex('#8a9aa5', 8, 5)),
      toon(TX.blockFacadeTex('#a5988a', 9, 6)),
      toon(TX.blockFacadeTex('#9a8aa0', 7, 4)),
      toon(TX.blockFacadeTex('#8a9a8a', 10, 6)),
    ],
  };
  return MATS;
}

/* ================= ZONE 1: MTKVARI UNDERPASS + RIVER ================= */
function buildRiverAndUnderpass(scene, M) {
  // master ground slab (streets everywhere east of river)
  B(M.asphalt, 11, -0.5, 0, 178, 1, 220, { outline: false });
  // riverbed + water
  B(M.concreteDark, -94, -4.2, 0, 32, 1.6, 220, { outline: false, surface: 'grass' });
  const waterGeo = new THREE.PlaneGeometry(32, 220, 8, 40);
  const waterMat = new THREE.MeshLambertMaterial({ map: TX.tex(TX.riverTex(), 4, 24), transparent: true, opacity: 0.9 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-94, -2.5, 0);
  scene.add(water);
  dynamic.water = water;
  // embankment wall (river side of promenade) + ladders out of the drink
  B(M.concrete, -78.6, -1.9, 0, 1.2, 3.4, 220, { outline: false });
  ladder(M.metal, -77.9, -3.2, 0.3, -20, 3);
  ladder(M.metal, -77.9, -3.2, 0.3, 40, 3);
  // promenade railing (no collision — you may fall in, it's tradition)
  for (let z = -100; z <= 100; z += 4) B(M.metal, -77.8, 0.5, z, 0.1, 1, 0.1, { collide: false, outline: false });
  B(M.metal, -77.8, 1.0, 0, 0.08, 0.08, 200, { collide: false, outline: false });

  // UNDERPASS: roof slab + pillars, the dirty concrete heart
  B(M.concrete, -43, 4.75, 10, 26, 0.9, 60);                       // roof slab (walkable top)
  landmarks.underpassRoof = [-43, 5.2, 10];
  for (const px of [-52, -44, -36])
    for (let pz = -14; pz <= 34; pz += 10)
      B(M.concreteDark, px, 2.15, pz, 1.3, 4.3, 1.3);
  // east wall with gaps (big graffiti wall)
  B(M.concrete, -30.6, 2.15, -6, 1.2, 4.3, 22);
  B(M.concrete, -30.6, 2.15, 26, 1.2, 4.3, 20);
  landmarks.underpassWall = [-31.3, 2.2, -6];
  // stairs up to the roof plaza, both ends
  stairs(M.concrete, -52, 0, -21.5, 2, 9, 3.4, 0.5, 1.1);   // west end, up going +x
  stairs(M.concrete, -34, 0, 41.5, 3, 9, 3.4, 0.5, 1.1);    // east end, up going -x
  // broken stair chunk (parkour bait)
  B(M.concreteDark, -33, 1.2, -24, 3, 2.4, 2.6);
  B(M.concreteDark, -37, 0.5, -26, 2.4, 1, 2.2);
  // roof plaza rail
  for (let x = -55; x <= -31; x += 3) B(M.metal, x, 5.8, -19.6, 0.1, 1.2, 0.1, { collide: false, outline: false });

  // kiosk (Gio's empire)
  B(M.purple, -64, 1.3, -2, 3.4, 2.6, 2.4);
  B(M.red, -64, 2.85, -2, 3.9, 0.5, 2.9, { collide: false });
  plane(scene, TX.kioskTex(), -64, 1.4, -0.75, 3.2, 2.1, '+z');
  landmarks.kiosk = [-64, 0, -1];
  // vending machine under the roof
  B(M.blue, -40, 1.1, 33, 1.4, 2.2, 1);
  plane(scene, TX.neonSignTex('CANDY-O-MAT', '#3aa0ff', 256, 40), -40, 2.0, 33.55, 1.3, 0.35, '+z');
  landmarks.vending1 = [-40, 0, 34];
  // dumpsters, pipes, junk
  B(M.concreteGreen, -58, 0.8, 22, 2.6, 1.6, 1.4);
  B(M.metalRed, -49, 0.7, -12, 2.2, 1.4, 1.2);
  B(M.metal, -30.2, 2.2, 12, 0.5, 4.4, 0.5, { collide: false }); // wall pipe
  for (let i = 0; i < 5; i++) B(M.dark, -70 + i * 6, 0.3, 48 + (i % 2) * 3, 1.0, 0.6, 1.0, { outline: false }); // trash bags
  // old chess tables
  for (const tz of [-8, -12]) { B(M.concrete, -70, 0.5, tz, 1.4, 1, 1.4); B(M.concrete, -70, 0.3, tz + 1.6, 1.2, 0.6, 0.8, { outline: false }); }
  landmarks.chess = [-70, 0, -10];
  // posters everywhere on pillars and walls
  let ps = 1;
  for (const px of [-52, -44, -36]) plane(scene, TX.posterTex(ps++), px, 1.8, -13.3, 1, 1.5, '+z');
  plane(scene, TX.posterTex(ps++), -31.3, 2.0, 0 - 6, 1.2, 1.8, '-x');
  plane(scene, TX.posterTex(ps++), -31.3, 1.6, 22, 1.2, 1.8, '-x');
  plane(scene, TX.candyCorpAdTex(1), -31.3, 3.4, -2, 2.6, 1.3, '-x');
}

/* ================= BRIDGE + CLUB DISTRICT EXTERIOR ================= */
function buildClubDistrict(scene, M) {
  // bridge deck across river, z 62..74, deck top y=6
  B(M.concreteDark, -83, 5.7, 68, 56, 0.6, 12);
  // bridge ramps from promenade (stairs) and from east (slope of steps)
  stairs(M.concrete, -60, 0, 79.5, 1, 11, 4, 0.55, 1.0);  // up going -z onto deck
  stairs(M.concrete, -60, 0, 56.5, 0, 11, 4, 0.55, 1.0);  // up going +z onto deck (north side)
  // deck railings
  for (let x = -108; x <= -58; x += 3.2) {
    B(M.metal, x, 6.9, 62.3, 0.1, 1.4, 0.1, { collide: false, outline: false });
    B(M.metal, x, 6.9, 73.7, 0.1, 1.4, 0.1, { collide: false, outline: false });
  }
  B(M.metal, -83, 7.5, 62.3, 52, 0.1, 0.1, { collide: false, outline: false });
  B(M.metal, -83, 7.5, 73.7, 52, 0.1, 0.1, { collide: false, outline: false });
  // bridge pylons
  B(M.concreteDark, -90, 1, 62, 2, 8, 2); B(M.concreteDark, -90, 1, 74, 2, 8, 2);
  landmarks.bridgeDeck = [-83, 6.3, 68];

  // KHD-404 bunker under the east end of the bridge
  B(M.clubwall, -68, 2.7, 68, 12, 5.4, 13);
  plane(scene, TX.neonSignTex('KHD-404', '#ff3b3b', 256, 56), -61.8, 3.6, 68, 4.5, 1.0, '+x');
  dynamic.blinkers.push(plane(scene, TX.neonSignTex('▶ TECHNO BUNKER', '#3aa0ff', 256, 40), -61.8, 2.6, 68, 3.4, 0.5, '+x'));
  landmarks.khdDoor = [-61.5, 0, 71.5];
  doors.push({ pos: [-61.5, 1, 71.5], to: [-70, -39.0, 80], name: 'KHD-404', requires: 'khd', exitYaw: Math.PI });

  // BASSMENT 909 — stadium basement monster
  B(M.clubwall, 10, 5, 80, 30, 10, 20);
  B(M.darkPurple, 10, 10.7, 80, 32, 1.6, 22, { collide: false });     // fat roof lip
  // entrance recess south
  B(M.dark, 10, 2.2, 90.5, 6, 4.4, 1.4, { collide: false, outline: false });
  plane(scene, TX.neonSignTex('BASSMENT 909', '#3dfc7a', 512, 80), 10, 7.6, 90.3, 12, 2.0, '+z');
  dynamic.blinkers.push(plane(scene, TX.neonSignTex('TONIGHT: 909 HOURS OF BASS', '#ff4fa3', 512, 48), 10, 5.9, 90.3, 9, 0.8, '+z'));
  landmarks.b909Door = [10, 0, 91.5];
  doors.push({ pos: [10, 1, 91.5], to: [10, -59.0, 94], name: 'BASSMENT 909', requires: 'b909', exitYaw: Math.PI });
  // queue barriers + rope
  for (let i = 0; i < 4; i++) B(M.metalRed, 15 + i * 2.2, 0.6, 92.5, 0.15, 1.2, 0.15, { collide: false });
  // smoking corner, benches, klubi kids hangout
  B(M.wood, 26, 0.5, 88, 3, 1, 1); B(M.wood, -6, 0.5, 92, 3, 1, 1);
  // taxi parked (blocky)
  B(M.yellow, -14, 0.8, 84, 2.2, 1.2, 4.6); B(M.dark, -14, 1.7, 84.6, 2.0, 0.7, 2.2, { collide: false });
  landmarks.taxi = [-14, 0, 81];
  // power station hum box + cables
  B(M.metal, 34, 1.5, 70, 4, 3, 3);
  // street lamps with club-blue light cones
  for (const [lx, lz] of [[-2, 76], [22, 76], [-40, 66], [-20, 90]]) {
    B(M.dark, lx, 3, lz, 0.3, 6, 0.3);
    B(M.blue, lx, 6.2, lz, 1.2, 0.4, 0.5, { collide: false });
  }
}

/* ================= ZONE 2: OLD BLOCKS (vertical hood) ================= */
// towers: [x, z, w, d, h, facadeIdx]
const TOWERS = [
  [20, -40, 14, 14, 20, 0],
  [45, -40, 14, 12, 24, 1],
  [70, -45, 15, 14, 28, 2],
  [30, -75, 14, 14, 22, 3],
  [60, -80, 16, 14, 30, 4],
];
function buildOldBlocks(scene, M) {
  TOWERS.forEach(([x, z, w, d, h, f], i) => {
    B(M.facades[f], x, h / 2, z, w, h, d);
    B(M.concreteDark, x, h + 0.3, z, w + 0.8, 0.6, d + 0.8); // roof lip (walkable)
    // rooftop clutter: vents, water tank, dishes
    B(M.metal, x - w / 4, h + 1.1, z - d / 4, 1.6, 1.6, 1.6, { surface: 'metal' });
    B(M.grey, x + w / 4, h + 1.5, z + d / 4, 2.2, 2.4, 2.2, { surface: 'metal' });
    B(M.metal, x + w / 3, h + 0.9, z - d / 3, 0.8, 0.6, 0.8, { surface: 'metal' });
    // entrance stoop
    B(M.concrete, x, 0.4, z + d / 2 + 0.8, 3, 0.8, 1.6);
    // ladder up the side
    ladder(M.metal, x - w / 2 - 0.4, 0.4, h + 0.6, z, 2);
    landmarks['tower' + (i + 1)] = [x, h + 0.6, z];
  });
  // wooden planks connecting rooftops (parkour highway)
  const plank = (x1, y1, z1, x2, y2, z2) => {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    B(M.wood, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, 1.2, 0.25, len, { rotY: ang, surface: 'metal', collide: false });
    // walkable collider strip (AABB approx: thin boxes along the way)
    const stepsN = Math.ceil(len / 1.5);
    for (let s = 0; s <= stepsN; s++) {
      const t = s / stepsN;
      addCollider(x1 + dx * t, (y1 + (y2 - y1) * t) - 0.12, z1 + dz * t, 1.3, 0.25, 1.3, 'metal');
    }
  };
  plank(27, 20.3, -40, 38, 24.3, -40);       // T1 -> T2
  plank(52, 24.3, -40, 62.5, 28.3, -45);     // T2 -> T3
  plank(30, 22.3, -68, 30, 22.3, -47);       // T4 -> T1 area (drop to T1 roof)
  plank(52, 28.6, -80, 45.5, 24.3, -46.5);   // T5 -> T2
  plank(67, 28.3, -52.3, 62, 30.6, -73);     // T3 -> T5

  // courtyard: playground bones, benches, rug-beating rack
  B(M.metalRed, 42, 1.1, -62, 3.2, 2.2, 0.3);
  B(M.metal, 42, 2.3, -62, 3.6, 0.2, 0.2, { collide: false });
  B(M.wood, 36, 0.4, -58, 2.6, 0.8, 0.9);
  B(M.wood, 50, 0.4, -66, 2.6, 0.8, 0.9);
  landmarks.courtyard = [43, 0, -62];
  // garages with roofs you can hop
  for (let i = 0; i < 4; i++) B(M.metalRed, 12 + i * 4.2, 1.4, -58 - (i % 2), 4, 2.8, 5, { surface: 'metal' });
  // ELEVATOR on T5 — rickety exterior lift to the radio roof
  const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2.4), M.metalRed);
  elevMesh.position.set(68.9, 0.6, -80);
  scene.add(elevMesh);
  elevators.push({ x: 68.9, z: -80, w: 2.4, d: 2.4, y0: 0.6, y1: 30.6, mesh: elevMesh, t: 0, dir: 0, riding: false });
  B(M.metal, 70.3, 15, -80, 0.4, 30, 2.8); // elevator rail wall
  landmarks.elevator = [68.9, 0, -78];

  // RADIO SHACK on T5 roof (walls + open door, interior real)
  const rx = 60, rz = -84, ry = 30.6;
  B(M.metalRed, rx, ry + 1.5, rz - 2.2, 5.4, 3, 0.3, { surface: 'metal' });          // north wall
  B(M.metalRed, rx - 2.6, ry + 1.5, rz, 0.3, 3, 4.6, { surface: 'metal' });          // west
  B(M.metalRed, rx + 2.6, ry + 1.5, rz, 0.3, 3, 4.6, { surface: 'metal' });          // east
  B(M.metalRed, rx - 1.6, ry + 1.5, rz + 2.2, 2.2, 3, 0.3, { surface: 'metal' });    // south (door gap)
  B(M.metalRed, rx + 1.9, ry + 1.5, rz + 2.2, 1.6, 3, 0.3, { surface: 'metal' });
  B(M.metal, rx, ry + 3.1, rz, 6, 0.3, 5.4, { surface: 'metal' });                    // roof
  B(M.wood, rx - 1.4, ry + 0.5, rz - 1.2, 2.2, 1, 1);                                 // desk
  B(M.dark, rx - 1.4, ry + 1.2, rz - 1.6, 1.8, 0.5, 0.3, { collide: false });         // radio gear
  landmarks.radioShack = [rx, ry, rz];
  // antenna mast + dishes (the ANTENNA ZONE crown) — thin decorative verticals, no collision so they never snag a climber
  B(M.metal, rx + 4, ry + 4, rz + 3, 0.4, 8, 0.4, { collide: false });
  B(M.metal, rx + 4, ry + 8.6, rz + 3, 2.6, 0.15, 0.15, { collide: false });
  B(M.grey, rx + 3, ry + 1.2, rz + 4.4, 1.4, 1.4, 0.4, { collide: false });
  landmarks.antenna = [rx + 4, ry, rz + 3];

  // TV tower silhouette (far scenery, no collide)
  B(M.dark, 96, 24, -104, 3, 48, 3, { collide: false });
  B(M.dark, 96, 52, -104, 1.2, 10, 1.2, { collide: false });
  const blinkMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
  const blink = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), blinkMat);
  blink.position.set(96, 58, -104);
  scene.add(blink);
  dynamic.blinkers.push(blink);
}

/* ================= ZONE 3: RUSTAVELI GLITCH ================= */
function buildRustaveli(scene, M) {
  // avenue road strip with painted lines
  B(M.concreteDark, 30, 0.02, 16, 120, 0.08, 14, { collide: false, outline: false });
  // government blocks (north side of avenue)
  const govs = [[-10, -2], [18, -4], [50, -3], [78, -2]];
  govs.forEach(([x, z], i) => {
    B(M.gov, x, 6, z, 20, 12, 12);
    B(M.concreteDark, x, 12.6, z, 21, 1.2, 13);
    // grand steps
    stairs(M.concrete, x, 0, 5.2, 0, 4, 10, 0.35, 0.8);
  });
  landmarks.govWall = [18, 2, 2.2];
  // propaganda screens on gov roofs + one street-level jumbotron
  const screenSpots = [[-10, 14.4, -2], [50, 14.4, -3], [30, 4.5, 23]];
  for (const [sx, sy, sz] of screenSpots) {
    const scr = plane(scene, TX.propagandaTex(0), sx, sy, sz + 0.2, 8, 5.4, '+z');
    dynamic.screens.push(scr);
    B(M.dark, sx, sy, sz - 0.3, 8.6, 6, 0.6, { collide: sy < 6 });
  }
  // giant CANDYCORP billboard (ending 3 target)
  B(M.dark, 66, 7, 28, 0.8, 8, 14);
  const bb = plane(scene, TX.candyCorpAdTex(7), 65.4, 8, 28, 13, 6.5, '-x');
  landmarks.billboard = [64, 0, 28];
  dynamic.billboard = bb;
  B(M.metal, 66, 2, 33, 0.5, 4, 0.5); B(M.metal, 66, 2, 23, 0.5, 4, 0.5);
  ladder(M.metal, 65.2, 0.3, 11.5, 33.5, 2);
  // weird monument: giant concrete khinkali on a plinth
  B(M.concrete, 34, 1.2, 16, 5, 2.4, 5);
  const dumpling = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), M.beige);
  dumpling.position.set(34, 4.6, 16); dumpling.scale.y = 1.25;
  scene.add(dumpling);
  const dumplingO = new THREE.Mesh(new THREE.SphereGeometry(2.32, 10, 8), M.outline);
  dumplingO.position.copy(dumpling.position); dumplingO.scale.y = 1.25; scene.add(dumplingO);
  addCollider(34, 4.6, 16, 4.4, 5.5, 4.4);
  landmarks.monument = [34, 2.6, 19];
  // bus stop, benches, planters with dead bushes
  B(M.blue, -18, 1.6, 22.6, 5, 3.2, 0.3, { collide: false });
  B(M.blue, -18, 3.2, 24, 5.6, 0.3, 3, { collide: false });
  B(M.metal, -20.4, 1.5, 23.8, 0.3, 3, 0.3); B(M.metal, -15.6, 1.5, 23.8, 0.3, 3, 0.3);
  B(M.wood, -18, 0.5, 24.2, 4, 1, 0.8);
  for (const px of [4, 42, 74]) { B(M.concrete, px, 0.5, 25.5, 3, 1, 1.6); B(M.concreteGreen, px, 1.2, 25.5, 2.4, 0.5, 1.1, { collide: false }); }
  // second vending machine
  B(M.blue, 55, 1.1, 26, 1.4, 2.2, 1);
  plane(scene, TX.neonSignTex('CANDY-O-MAT', '#3aa0ff', 256, 40), 55, 2.0, 26.55, 1.3, 0.35, '+z');
  landmarks.vending2 = [55, 0, 27];
  // metro entrance (sealed, mysterious, tag bait)
  B(M.concreteDark, -2, 1.8, 27, 6, 3.6, 4);
  plane(scene, TX.neonSignTex('M', '#ff3b3b', 64, 64), -2, 3.9, 27, 1.4, 1.4, '+z');
  stairs(M.concrete, -2, -0.02, 30.4, 0, 3, 4.4, 0.3, 0.7);
  landmarks.metro = [-2, 0, 31];
  // posters + streetlights along the avenue
  let pp = 20;
  for (const px of [-14, 6, 30, 58, 82]) {
    B(M.dark, px, 3, 9.4, 0.3, 6, 0.3);
    B(M.yellow, px, 6.2, 10, 1.2, 0.4, 0.5, { collide: false });
    plane(scene, TX.posterTex(pp++), px + 0.35, 1.8, 9.4, 0.9, 1.4, '+x');
  }
}

/* ================= INTERIORS ================= */
function buildB909(scene, M) {
  const cx = 10, cy = -60, cz = 80; // floor at y=-60
  const H = 12, W = 44, D = 32;
  // shell
  B(M.dancefloor, cx, cy - 0.5, cz, W, 1, D, { outline: false, surface: 'interior' });          // floor
  B(M.clubwall, cx, cy + H, cz, W, 1, D, { outline: false });                                    // ceiling
  B(M.clubwall, cx - W / 2, cy + H / 2, cz, 1, H, D, { outline: false });
  B(M.clubwall, cx + W / 2, cy + H / 2, cz, 1, H, D, { outline: false });
  B(M.clubwall, cx, cy + H / 2, cz - D / 2, W, H, 1, { outline: false });
  B(M.clubwall, cx, cy + H / 2, cz + D / 2, W, H, 1, { outline: false });
  // exit door back to street
  doors.push({ pos: [cx, cy + 1, cz + D / 2 - 1.6], to: [10, 1.0, 93.5], name: 'EXIT', requires: null, exitYaw: Math.PI });
  // DJ booth (north wall, raised)
  B(M.dark, cx, cy + 0.8, cz - D / 2 + 3, 10, 1.6, 4, { surface: 'metal' });
  stairs(M.metal, cx - 6.5, cy, cz - D / 2 + 3, 2, 3, 3, 0.55, 0.8, { surface: 'metal' });
  B(M.dark, cx, cy + 2.2, cz - D / 2 + 2.2, 6, 1.2, 1.4);
  landmarks.b909Booth = [cx - 2, cy + 1.6, cz - D / 2 + 4];
  plane(scene, TX.neonSignTex('909', '#3dfc7a', 128, 64), cx, cy + 7, cz - D / 2 + 0.6, 6, 3, '+z');
  // bar along east wall
  B(M.wood, cx + W / 2 - 3, cy + 0.65, cz + 2, 1.6, 1.3, 14);
  B(M.dark, cx + W / 2 - 0.9, cy + 2.5, cz + 2, 0.6, 5, 14, { collide: false, outline: false });
  landmarks.b909Bar = [cx + W / 2 - 5, cy, cz + 2];
  // bathroom block (SW corner): wall + stalls + sinks, graffiti heaven
  B(M.tile, cx - W / 2 + 6, cy + H / 2 - 2, cz + D / 2 - 4.5, 12, H - 4, 0.5, { });
  B(M.tile, cx - W / 2 + 12, cy + H / 2 - 2, cz + D / 2 - 7.5, 0.5, H - 4, 6.5, { });
  for (let i = 0; i < 3; i++) B(M.metalRed, cx - W / 2 + 2.5 + i * 3, cy + 1.1, cz + D / 2 - 2.4, 0.2, 2.2, 3.6);
  B(M.tile, cx - W / 2 + 3, cy + 0.5, cz + D / 2 - 8.4, 4, 1, 0.8);
  landmarks.b909Bath = [cx - W / 2 + 6, cy, cz + D / 2 - 6];
  // chill room (west): sofas + low table + lamp
  B(M.clubwall, cx - W / 2 + 9, cy + H / 2, cz - D / 2 + 8.5, 0.5, H, 15, { });
  B(M.pink, cx - W / 2 + 3, cy + 0.55, cz - D / 2 + 4, 4.4, 1.1, 1.6);
  B(M.pink, cx - W / 2 + 2.2, cy + 0.55, cz - D / 2 + 9, 1.6, 1.1, 4);
  B(M.wood, cx - W / 2 + 5, cy + 0.35, cz - D / 2 + 7, 1.6, 0.7, 1.6);
  landmarks.b909Chill = [cx - W / 2 + 4.5, cy, cz - D / 2 + 6.5];
  // staff corridor (behind DJ, locked): door -> secret room
  B(M.metalRed, cx + 8.5, cy + 1.4, cz - D / 2 + 1.2, 2.4, 2.8, 0.4, { collide: false });
  doors.push({ pos: [cx + 8.5, cy + 1, cz - D / 2 + 1.4], to: [cx + 30, cy + 1, cz - 4], name: 'STAFF ONLY', requires: 'staff', exitYaw: 0 });
  // secret staff room (tiny, off to the side)
  const sx = cx + 30, sz2 = cz - 6;
  B(M.dark, sx, cy - 0.5, sz2, 10, 1, 10, { outline: false, surface: 'interior' });
  B(M.dark, sx, cy + 5, sz2, 10, 1, 10, { outline: false });
  B(M.clubwall, sx - 5, cy + 2.5, sz2, 0.6, 6, 10, { outline: false });
  B(M.clubwall, sx + 5, cy + 2.5, sz2, 0.6, 6, 10, { outline: false });
  B(M.clubwall, sx, cy + 2.5, sz2 - 5, 10, 6, 0.6, { outline: false });
  B(M.clubwall, sx, cy + 2.5, sz2 + 5, 10, 6, 0.6, { outline: false });
  doors.push({ pos: [sx, cy + 1, sz2 + 3.8], to: [cx + 8.5, cy + 1, cz - D / 2 + 3], name: 'BACK TO CLUB', requires: null, exitYaw: Math.PI });
  B(M.wood, sx, cy + 0.5, sz2 - 2, 3, 1, 1.4);
  landmarks.b909Secret = [sx, cy, sz2];
  landmarks.b909Floor = [cx, cy, cz];
}

function buildKHD(scene, M) {
  const cx = -70, cy = -40, cz = 68; // floor y=-40
  const H = 9, W = 26, D = 38;
  B(M.dancefloor, cx, cy - 0.5, cz, W, 1, D, { outline: false, surface: 'interior' });
  B(M.clubwall, cx, cy + H, cz, W, 1, D, { outline: false });
  B(M.clubwall, cx - W / 2, cy + H / 2, cz, 1, H, D, { outline: false });
  B(M.clubwall, cx + W / 2, cy + H / 2, cz, 1, H, D, { outline: false });
  B(M.clubwall, cx, cy + H / 2, cz - D / 2, W, H, 1, { outline: false });
  B(M.clubwall, cx, cy + H / 2, cz + D / 2, W, H, 1, { outline: false });
  doors.push({ pos: [cx, cy + 1, cz + D / 2 - 1.6], to: [-61.5, 1.0, 73.5], name: 'EXIT', requires: null, exitYaw: 0 });
  // industrial pillars
  for (let pz = -12; pz <= 12; pz += 8) {
    B(M.metal, cx - 6, cy + H / 2, cz + pz, 1.2, H, 1.2, { surface: 'metal' });
    B(M.metal, cx + 6, cy + H / 2, cz + pz, 1.2, H, 1.2, { surface: 'metal' });
  }
  // DJ end (north)
  B(M.metal, cx, cy + 0.7, cz - D / 2 + 2.5, 8, 1.4, 3.4, { surface: 'metal' });
  stairs(M.metal, cx + 5.4, cy, cz - D / 2 + 2.5, 3, 3, 3, 0.5, 0.8, { surface: 'metal' });
  landmarks.khdBooth = [cx, cy + 1.4, cz - D / 2 + 3];
  plane(scene, TX.neonSignTex('404', '#ff3b3b', 128, 64), cx, cy + 6, cz - D / 2 + 0.6, 5, 2.5, '+z');
  // bar cage (west)
  B(M.wood, cx - W / 2 + 2.6, cy + 0.65, cz + 6, 1.4, 1.3, 10);
  landmarks.khdBar = [cx - W / 2 + 4.5, cy, cz + 6];
  // chill cage (east): mesh box with mattresses
  B(M.metal, cx + W / 2 - 4, cy + 1.6, cz + 10, 6, 3.2, 0.3, { collide: false });
  B(M.purple, cx + W / 2 - 4, cy + 0.35, cz + 12, 5, 0.7, 3);
  landmarks.khdChill = [cx + W / 2 - 4, cy, cz + 12];
  // toilet nook (SE) — one lonely cursed stall
  B(M.tile, cx + W / 2 - 3.5, cy + H / 2 - 1.5, cz + D / 2 - 3.5, 6, H - 3, 0.4);
  B(M.tile, cx + W / 2 - 6.4, cy + H / 2 - 1.5, cz + D / 2 - 1.8, 0.4, H - 3, 3.4);
  landmarks.khdToilet = [cx + W / 2 - 3, cy, cz + D / 2 - 1.8];
  // vent crawl (behind pillar, leads to tiny stash room)
  B(M.dark, cx - W / 2 + 1.2, cy + 0.8, cz - 10, 1.6, 1.6, 1.6, { collide: false });
  doors.push({ pos: [cx - W / 2 + 1.4, cy + 0.8, cz - 10], to: [cx - 20, cy + 1, cz - 10], name: 'VENT', requires: null, exitYaw: Math.PI / 2 });
  // stash room
  const vx = cx - 20, vz = cz - 10;
  B(M.dark, vx, cy - 0.5, vz, 7, 1, 7, { outline: false, surface: 'interior' });
  B(M.dark, vx, cy + 3.5, vz, 7, 1, 7, { outline: false });
  B(M.clubwall, vx - 3.5, cy + 1.5, vz, 0.5, 4, 7, { outline: false });
  B(M.clubwall, vx + 3.5, cy + 1.5, vz, 0.5, 4, 7, { outline: false });
  B(M.clubwall, vx, cy + 1.5, vz - 3.5, 7, 4, 0.5, { outline: false });
  B(M.clubwall, vx, cy + 1.5, vz + 3.5, 7, 4, 0.5, { outline: false });
  doors.push({ pos: [vx + 2.5, cy + 1, vz], to: [cx - W / 2 + 2.6, cy + 1, cz - 10], name: 'VENT', requires: null, exitYaw: Math.PI / 2 });
  landmarks.khdStash = [vx, cy, vz];
  landmarks.khdFloor = [cx, cy, cz];
}

/* ================= FINAL ASSEMBLY ================= */
export function buildWorld(scene) {
  const M = materials();
  buildRiverAndUnderpass(scene, M);
  buildClubDistrict(scene, M);
  buildOldBlocks(scene, M);
  buildRustaveli(scene, M);
  buildB909(scene, M);
  buildKHD(scene, M);

  // map borders (invisible)
  for (const [bx, bz, bw, bd] of [[11, -112, 200, 2], [11, 112, 200, 2], [102, 0, 2, 226], [-112, 0, 2, 226]]) {
    addCollider(bx, 10, bz, bw, 40, bd);
  }

  // merge static geometry: one mesh per material + one big outline mesh
  for (const [mat, geos] of geoByMat) {
    const merged = BGU.mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
  }
  if (outlineGeos.length) {
    const om = new THREE.Mesh(BGU.mergeGeometries(outlineGeos, false), materials().outline);
    om.matrixAutoUpdate = false;
    scene.add(om);
  }
  geoByMat.clear(); outlineGeos.length = 0;

  // zone rectangles (checked top-down; interiors override by y)
  zoneRects.push(
    { name: 'underpass', banner: 'MTKVARI UNDERPASS', minX: -78, maxX: -28, minZ: -30, maxZ: 60, minY: -10, maxY: 30, music: 'underpass', bed: 'city' },
    { name: 'oldblocks', banner: 'OLD BLOCKS', minX: 5, maxX: 95, minZ: -105, maxZ: -15, minY: -10, maxY: 18, music: 'street', bed: 'city' },
    { name: 'rooftops', banner: 'ROOFTOP ANTENNA ZONE', minX: 5, maxX: 95, minZ: -105, maxZ: -15, minY: 18, maxY: 60, music: 'rooftop', bed: 'wind' },
    { name: 'rustaveli', banner: 'RUSTAVELI GLITCH', minX: -28, maxX: 95, minZ: -15, maxZ: 38, minY: -10, maxY: 60, music: 'street', bed: 'city' },
    { name: 'clubdistrict', banner: 'BRIDGE CLUB DISTRICT', minX: -110, maxX: 45, minZ: 38, maxZ: 108, minY: -10, maxY: 60, music: 'street', bed: 'city' },
    { name: 'b909', banner: 'BASSMENT 909', minX: -20, maxX: 50, minZ: 60, maxZ: 100, minY: -70, maxY: -40, music: 'club1', bed: 'crowd' },
    { name: 'khd', banner: 'KHD-404', minX: -100, maxX: -40, minZ: 40, maxZ: 95, minY: -50, maxY: -25, music: 'club2', bed: 'crowd' },
    { name: 'river', banner: 'THE MTKVARI ITSELF', minX: -112, maxX: -78, minZ: -110, maxZ: 110, minY: -6, maxY: 5, music: 'underpass', bed: 'riverhum' },
  );
  return { M };
}

export function zoneAt(x, y, z) {
  // interiors first (y-gated), then streets
  for (const zr of zoneRects) {
    if (y >= zr.minY && y <= zr.maxY && x >= zr.minX && x <= zr.maxX && z >= zr.minZ && z <= zr.maxZ) return zr;
  }
  return zoneRects[3]; // default: rustaveli-ish streets
}
