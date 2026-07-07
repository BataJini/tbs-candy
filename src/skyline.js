// skyline.js — the Tbilisi backdrop: Mtatsminda mountain, the TV Tower, Georgian
// churches, the Bank of Georgia cantilever block, Old Town, and a ring of hills.
// All far scenery: no collision, merged per-colour into a few draw calls.
import * as THREE from 'three';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

const geoByColor = new Map();
const outlineGeos = [];
export const skyBlinkers = [];

function col(hex) {
  if (!geoByColor.has(hex)) geoByColor.set(hex, []);
  return geoByColor.get(hex);
}
// box helper (decorative, never collides)
function bx(hex, x, y, z, w, h, d, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (opts.rotY) g.rotateY(opts.rotY);
  if (opts.rotX) g.rotateX(opts.rotX);
  if (opts.rotZ) g.rotateZ(opts.rotZ);
  g.translate(x, y, z);
  col(hex).push(g);
  if (opts.outline) {
    const o = new THREE.BoxGeometry(w + 0.5, h + 0.5, d + 0.5);
    if (opts.rotY) o.rotateY(opts.rotY);
    if (opts.rotX) o.rotateX(opts.rotX);
    if (opts.rotZ) o.rotateZ(opts.rotZ);
    o.translate(x, y, z);
    outlineGeos.push(o);
  }
}
function cone(hex, x, y, z, r, h, seg = 6, opts = {}) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y + h / 2, z);
  col(hex).push(g);
}
function cyl(hex, x, y, z, r1, r2, h, seg = 8, opts = {}) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg);
  if (opts.rotZ) g.rotateZ(opts.rotZ);
  g.translate(x, y, z);
  col(hex).push(g);
}

/* ---------- MOUNTAINS: a green/rock ring around the map ---------- */
function mountains() {
  // big ranges: [x, z, radius, height]
  const ring = [
    [-40, -230, 150, 90], [120, -200, 120, 80], [230, -60, 130, 95],
    [230, 120, 120, 70], [60, 240, 160, 85], [-160, 200, 130, 78],
    [-240, 20, 140, 100], [-150, -180, 110, 72],
  ];
  for (const [x, z, r, h] of ring) {
    cone('#4a5a3a', x, -6, z, r, h, 7);
    cone('#5a6a44', x + r * 0.25, -6, z + r * 0.2, r * 0.6, h * 0.7, 6);
    // rocky bald patch near top
    cone('#8a7a5a', x, h * 0.55 - 6, z, r * 0.4, h * 0.4, 6);
  }
}

/* ---------- MTATSMINDA HILL + TV TOWER + funicular + church ---------- */
function mtatsminda() {
  // sits on the dedicated Mtatsminda hill built in cityfill.js at (30,-170), apex ~y=54
  const hx = 30, hz = -170, base = 0;
  const topY = 48; // tower base — buried ~6 into the hill top so it plants firmly
  // a little rocky cap for detail (the hill mass itself comes from cityfill)
  cone('#9a8560', hx + 12, topY - 6, hz - 8, 16, 12, 6);

  // ---- Tbilisi TV Tower: splayed legs + ONE continuous tapering banded mast ----
  const tx = hx, tz = hz, ty = topY;
  // four splayed lattice legs converging into the mast base
  const legSpread = 8;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const lx = tx + sx * legSpread, lz = tz + sz * legSpread;
    const g = new THREE.BoxGeometry(1.4, 30, 1.4);
    g.translate(0, 15, 0);
    g.rotateX(sz * 0.26);
    g.rotateZ(-sx * 0.26);
    g.translate(lx, ty, lz);
    col('#c23a32').push(g);
    // a diagonal cross-brace for lattice detail
    const b = new THREE.BoxGeometry(0.5, 16, 0.5);
    b.rotateX(sz * 0.5); b.translate(lx * 0.6 + tx * 0.4, ty + 20, lz * 0.6 + tz * 0.4);
    col('#a83028').push(b);
  }
  // ONE continuous tapering mast, red/white bands, segments overlap so there is NO gap
  const mastBase = ty + 18, mastH = 104, segs = 22, seg = mastH / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const y = mastBase + i * seg + seg / 2;
    const r = 2.7 - t * 2.05;                 // 2.7 -> ~0.65, always thick enough to read
    cyl(i % 2 ? '#e8e2d4' : '#c23a32', tx, y, tz, Math.max(0.5, r - 0.05), Math.max(0.55, r + 0.05), seg + 0.8, 8);
  }
  // observation deck ~1/4 up, wrapping the mast
  cyl('#e8e2d4', tx, ty + 44, tz, 5.0, 5.0, 4.6, 12);
  cyl('#b0aa9a', tx, ty + 47.3, tz, 5.4, 4.0, 2.4, 12);
  bx('#2a2735', tx, ty + 44, tz + 5.2, 9, 3.4, 0.3);   // dark window band
  // red beacon on the tip (animated)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  beacon.position.set(tx, mastBase + mastH + 1.5, tz);
  skyBlinkers.push(beacon);
  // deck glow ring
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 1.2, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd070 }));
  glow.position.set(tx, ty + 48.4, tz);
  skyBlinkers._extra = [beacon, glow];

  // ---- Funicular / Mtatsminda restaurant: columned white building, planted on the hilltop ----
  const fx = hx - 11, fz = hz + 3, fy = topY - 10;   // base planted into the hilltop, no floating
  bx('#d8d0c0', fx, fy + 5, fz, 20, 10, 8, { outline: true });
  bx('#c8c0b0', fx, fy + 10.4, fz, 22, 1, 9);
  for (let i = -4; i <= 4; i++) cyl('#e0d8c8', fx + i * 2.2, fy + 2.5, fz + 4.2, 0.5, 0.5, 7, 6); // column arcade
}

/* ---------- Georgian Orthodox churches (conical dome + cross) ---------- */
function church(x, z, y, s = 1, stone = '#c9b48c') {
  // cross-plan nave
  bx(stone, x, y + 3 * s, z, 7 * s, 6 * s, 5 * s, { outline: true });
  bx(stone, x, y + 3 * s, z, 5 * s, 6 * s, 7 * s, { outline: true });
  bx(stone, x, y + 6.2 * s, z, 5 * s, 0.6 * s, 5 * s);
  // drum + conical dome (the Georgian silhouette)
  cyl(stone, x, y + 7.6 * s, z, 1.8 * s, 1.9 * s, 3 * s, 8);
  cone('#7a8a9a', x, y + 9 * s, z, 2.3 * s, 3.4 * s, 8); // grey-blue cone roof
  // gold cross
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xf0d060 });
  const cv = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 2.2 * s, 0.18 * s), crossMat);
  cv.position.set(x, y + 13.2 * s, z);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 0.18 * s, 0.18 * s), crossMat);
  ch.position.set(x, y + 13.4 * s, z);
  skyBlinkers._crosses = skyBlinkers._crosses || [];
  skyBlinkers._crosses.push(cv, ch);
}

/* ---------- Bank of Georgia / "Space City" cantilever brutalism ---------- */
function bankOfGeorgia(x, z, y) {
  const c = '#b8b0a2', cd = '#9a9284';
  // a central spine of stacked cores
  bx(cd, x, y + 16, z, 6, 32, 6, { outline: true });
  // interlocking cantilevered horizontal blocks at staggered heights/directions
  const arms = [
    [0, 6, 0, 22, 5, 7], [3, 11, 4, 7, 5, 20], [-4, 16, -2, 20, 5, 7],
    [2, 21, 5, 7, 5, 18], [-3, 26, 3, 18, 5, 7], [4, 31, -3, 7, 5, 16],
    [-2, 12, -6, 8, 5, 10],
  ];
  for (const [dx, dy, dz, w, h, d] of arms) {
    bx(c, x + dx, y + dy, z + dz, w, h, d, { outline: true });
    // dark window strip on the long face
    if (w > d) bx('#2c2a34', x + dx, y + dy, z + dz + d / 2 + 0.05, w * 0.9, h * 0.5, 0.15);
    else bx('#2c2a34', x + dx + w / 2 + 0.05, y + dy, z + dz, 0.15, h * 0.5, d * 0.9);
  }
}

/* ---------- Old Town: colourful balcony houses + sulfur-bath domes ---------- */
function oldTown(cx, cz, y) {
  const houseCols = ['#c88a5a', '#d0a860', '#b06a5a', '#8aa0b0', '#c0b070', '#a88a70'];
  const roofCols = ['#a03828', '#8a3020', '#b04030'];
  for (let i = 0; i < 22; i++) {
    const hx = cx + (Math.sin(i * 2.3) * 26) + (i % 4) * 3;
    const hz = cz + (Math.cos(i * 1.7) * 20) + (i % 3) * 3;
    const h = 3 + (i % 3) * 2;
    const w = 3 + (i % 3);
    const hc = houseCols[i % houseCols.length];
    bx(hc, hx, y + h / 2, hz, w, h, w, { outline: true });
    // wooden balcony
    bx('#8a6a44', hx, y + h * 0.6, hz + w / 2 + 0.2, w * 0.9, 1, 0.5);
    // red pitched roof (prism-ish: thin box tilted)
    bx(roofCols[i % roofCols.length], hx, y + h + 0.4, hz, w + 0.6, 0.8, w + 0.6, { outline: true });
    // lit window
    bx('#ffcf6b', hx, y + h * 0.55, hz + w / 2 + 0.06, 0.8, 1, 0.1);
  }
  // blue-tiled sulfur bath dome + brick minaret tower (Abanotubani)
  cyl('#7ac0d0', cx + 4, y + 1.6, cz - 2, 3, 3.2, 1.6, 10);
  const domeMat = col('#5fb0c8');
  const dg = new THREE.SphereGeometry(3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dg.translate(cx + 4, y + 2.4, cz - 2);
  domeMat.push(dg);
  bx('#a85a3a', cx - 8, y + 5, cz + 4, 2.4, 12, 2.4, { outline: true }); // brick tower
  cone('#c0b0a0', cx - 8, y + 11, cz + 4, 1.8, 3, 8); // tower cap
}

/* ---------- assemble ---------- */
export function buildSkyline(scene) {
  // mountains + old town now handled richer in cityfill.js (valley + oldTownBank);
  // skyline keeps only the tall hero landmarks so they read above everything.
  mtatsminda();
  bankOfGeorgia(120, 60, -4);      // landmark at the SE edge, visible across town

  // merge all opaque scenery per colour
  for (const [hex, geos] of geoByColor) {
    if (!geos.length) continue;
    const merged = BGU.mergeGeometries(geos, false);
    const cc = new THREE.Color(hex);
    const mat = new THREE.MeshLambertMaterial({ color: cc, emissive: cc.clone().multiplyScalar(0.22) });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = -1;
    scene.add(mesh);
  }
  if (outlineGeos.length) {
    const om = new THREE.Mesh(BGU.mergeGeometries(outlineGeos, false),
      new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide }));
    om.matrixAutoUpdate = false;
    scene.add(om);
  }
  // bright accent meshes (beacon, deck glow, crosses)
  for (const m of (skyBlinkers._extra || [])) scene.add(m);
  for (const m of (skyBlinkers._crosses || [])) scene.add(m);
  geoByColor.clear(); outlineGeos.length = 0;
  return { blinkers: skyBlinkers };
}
