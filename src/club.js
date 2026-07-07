// club.js — dancers, lasers, smoke, sweat. The reason the city exists.
import * as THREE from 'three';
import { audio } from './audio.js';
import * as TX from './textures.js';
import * as UI from './ui.js';
import { interactables } from './systems.js';

const dancers = [];   // {mesh, hull, phase, base, speed}
const lasers = [];    // {mesh, speed, axis}
const smokes = [];
const lights = [];

const CLUBS = [
  { center: [10, -60, 80], count: 26, area: [16, 11], laserY: -50, pad: [16, -60, 76], light: 0x3dfc7a },
  { center: [-70, -40, 66], count: 14, area: [9, 12], laserY: -32.5, pad: [-73, -40, 62], light: 0xff3b3b },
];

export function buildClubs(scene) {
  const outline = new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide });
  for (const club of CLUBS) {
    const [cx, cy, cz] = club.center;
    for (let i = 0; i < club.count; i++) {
      const col = new THREE.Color().setHSL(Math.random(), 0.4, 0.24);
      const geo = new THREE.SphereGeometry(0.42, 7, 6);
      geo.scale(1, 1.6, 0.85);
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }));
      const px = cx + (Math.random() - 0.5) * club.area[0] * 2;
      const pz = cz + (Math.random() - 0.5) * club.area[1] * 2;
      m.position.set(px, cy + 0.7, pz);
      const hull = new THREE.Mesh(geo, outline);
      hull.position.copy(m.position);
      hull.scale.setScalar(1.08);
      scene.add(m, hull);
      dancers.push({ mesh: m, hull, phase: Math.random() * 9, base: cy + 0.7, speed: 0.8 + Math.random() * 0.5 });
    }
    // lasers: thin long glowing boxes swinging from the ceiling
    for (let i = 0; i < 4; i++) {
      const lm = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 18, 0.06),
        new THREE.MeshBasicMaterial({ color: [0x3dfc7a, 0xff4fa3, 0x3aa0ff, 0xff3b3b][i], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      lm.position.set(cx + (i - 1.5) * 4, club.laserY, cz);
      scene.add(lm);
      lasers.push({ mesh: lm, speed: 0.7 + i * 0.33, axis: i % 2 });
    }
    // smoke: soft billboards drifting
    for (let i = 0; i < 5; i++) {
      const [c] = TX.mkCanvas(64, 64);
      const x2 = c.getContext('2d');
      const grad = x2.createRadialGradient(32, 32, 4, 32, 32, 30);
      grad.addColorStop(0, 'rgba(200,190,220,0.24)');
      grad.addColorStop(1, 'rgba(200,190,220,0)');
      x2.fillStyle = grad; x2.fillRect(0, 0, 64, 64);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.tex(c), transparent: true, depthWrite: false }));
      sp.scale.setScalar(7 + Math.random() * 5);
      sp.position.set(cx + (Math.random() - 0.5) * 14, cy + 2 + Math.random() * 3, cz + (Math.random() - 0.5) * 12);
      scene.add(sp);
      smokes.push({ sp, t: Math.random() * 9, base: sp.position.clone() });
    }
    // moving colored lights
    const pl = new THREE.PointLight(club.light, 30, 40, 1.6);
    pl.position.set(cx, cy + 7, cz);
    scene.add(pl);
    lights.push({ pl, base: club.light, t: Math.random() });
    buildClubFixtures(scene, club);
    // dance pad
    interactables.push({
      pos: new THREE.Vector3(club.pad[0], club.pad[1] + 1, club.pad[2]), r: 2.2,
      label: '[E] DANCE',
      action() { UI.startDance(false); }
    });
  }
  buildClubExteriors(scene);
}

// glowing magenta/red windows + red door lamps on the club buildings (Khidi vibe)
export const clubGlows = [];
function buildClubExteriors(scene) {
  const glowPlane = (x, y, z, w, h, face, hex) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9 }));
    m.position.set(x, y, z);
    if (face === '+z') { } else if (face === '-z') m.rotation.y = Math.PI;
    else if (face === '+x') m.rotation.y = Math.PI / 2; else if (face === '-x') m.rotation.y = -Math.PI / 2;
    scene.add(m); clubGlows.push(m); return m;
  };
  const lamp = (x, y, z) => {
    const l = new THREE.PointLight(0xff2b2b, 8, 12, 1.8); l.position.set(x, y, z); scene.add(l);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff5a3a }));
    bulb.position.set(x, y, z); scene.add(bulb);
    clubGlows.push({ material: bulb.material, _light: l, isLamp: true });
  };
  // BASSMENT 909 south face (z≈90.1), flank the entrance with magenta windows
  for (const wx of [-1, 4, 21, 25]) glowPlane(10 + wx * 0.9 + (wx < 3 ? -6 : 6), 5.5, 90.15, 2.2, 3, '+z', 0xff2ea0);
  for (const wx of [-8, 0, 8]) glowPlane(10 + wx, 8.4, 90.15, 1.6, 1.8, '+z', 0xd12ea0);
  lamp(6.5, 3.4, 91.6); lamp(13.5, 3.4, 91.6);
  // KHD-404 east face (x≈-61.9), red/magenta windows
  for (const wz of [-3, 3]) glowPlane(-61.85, 3.4, 68 + wz, 1.4, 2.4, '+x', 0xff2b2b);
  glowPlane(-61.85, 4.4, 68, 2, 1.4, '+x', 0xff2ea0);
  lamp(-61, 2.6, 71.5); lamp(-61, 2.6, 64.5);
}

const HUES = [0x3dfc7a, 0xff4fa3, 0x3aa0ff, 0xff3b3b, 0xffe93c];
export function updateClubs(dt, t) {
  const pulse = audio.beatPulse();
  for (const d of dancers) {
    d.phase += dt * d.speed;
    const hop = Math.abs(Math.sin(d.phase * 4)) * 0.12 + pulse * 0.16;
    d.mesh.position.y = d.base + hop;
    d.hull.position.y = d.mesh.position.y;
    d.mesh.rotation.y += dt * (d.speed - 0.8) * 3;
    d.hull.rotation.y = d.mesh.rotation.y;
    const squash = 1 + pulse * 0.12;
    d.mesh.scale.set(1 / squash, squash, 1 / squash);
    d.hull.scale.set(1.08 / squash, 1.08 * squash, 1.08 / squash);
  }
  for (const l of lasers) {
    const sw = Math.sin(t * l.speed) * 0.8;
    if (l.axis) l.mesh.rotation.x = sw; else l.mesh.rotation.z = sw;
    l.mesh.material.opacity = 0.35 + pulse * 0.4;
  }
  for (const s of smokes) {
    s.t += dt;
    s.sp.position.x = s.base.x + Math.sin(s.t * 0.3) * 2;
    s.sp.position.y = s.base.y + Math.sin(s.t * 0.2) * 0.8;
  }
  for (const li of lights) {
    li.t += dt * 0.4;
    if (Math.random() < dt * 2) li.pl.color.setHex(HUES[(Math.random() * HUES.length) | 0]);
    li.pl.intensity = 20 + pulse * 26;
  }
  for (const tl of tubeLights) {
    const b = tl.kind === "sym" ? (0.55 + pulse * 0.6) : (0.45 + (0.55 + pulse) * (0.6 + 0.4 * Math.sin(t * 6 + (tl.off || 0))));
    tl.mesh.material.opacity = Math.min(1, b);
    tl.mesh.material.transparent = true;
  }
  for (const mb of mirrorBalls) mb.rotation.y += dt * 1.4;
  for (let i = 0; i < clubGlows.length; i++) {
    const gl = clubGlows[i];
    const fl = 0.72 + 0.28 * Math.sin(t * (3 + (i % 4)) + i);
    if (gl.isLamp) { gl._light.intensity = 6 + fl * 4; }
    else if (gl.material) { gl.material.opacity = 0.55 + fl * 0.4; }
  }
}

/* ---- club fixtures: speaker stacks, tube lights, mirror balls, cables, symbol ---- */
export const tubeLights = [];
export const mirrorBalls = [];
function buildClubFixtures(scene, club) {
  const [cx, cy, cz] = club.center;
  const outline = new THREE.MeshBasicMaterial({ color: 0x0d0a14, side: THREE.BackSide });
  const D = club.area[1] * 2 + 10;           // rough interior depth
  const djZ = cz - club.area[1] - 2;         // DJ end (north wall)
  const ceilY = cy + (club.laserY - cy) + 6; // near ceiling

  // FUNCTION-ONE STYLE SPEAKER STACKS flanking the DJ
  const speakerMat = new THREE.MeshLambertMaterial({ color: 0x15131c });
  const coneMat = new THREE.MeshLambertMaterial({ color: 0x2a2732 });
  for (const side of [-1, 1]) {
    const sx = cx + side * (club.area[0] * 0.55);
    for (let tier = 0; tier < 4; tier++) {
      const sy = cy + 0.6 + tier * 1.7;
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 1.6), speakerMat);
      box.position.set(sx, sy, djZ + 2.4);
      const hull = new THREE.Mesh(box.geometry, outline);
      hull.position.copy(box.position); hull.scale.setScalar(1.05);
      scene.add(box, hull);
      // driver cones on the face
      for (const dx of [-0.55, 0.55]) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8), coneMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(sx + dx, sy, djZ + 3.25);
        scene.add(cone);
      }
    }
  }

  // GLOWING DJ SYMBOL behind the booth (Bassiani/Khidi altar energy)
  const symC = TX.mkCanvas(64, 64);
  const g = symC[1];
  g.fillStyle = '#0d0a14'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = club.light === 0xff3b3b ? '#ff2b2b' : '#3dff88';
  g.lineWidth = 8; g.lineJoin = 'round';
  // a cross / geometric altar mark
  g.beginPath(); g.moveTo(32, 10); g.lineTo(32, 54); g.moveTo(14, 32); g.lineTo(50, 32); g.stroke();
  g.strokeRect(10, 10, 44, 44);
  const symTex = TX.tex(symC[0]);
  const sym = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ map: symTex, transparent: true }));
  sym.position.set(cx, cy + 4, djZ - 0.2);
  scene.add(sym);
  tubeLights.push({ mesh: sym, base: 1, kind: 'sym' });

  // RED/BLUE HORIZONTAL TUBE LIGHTS on the ceiling
  const tubeCols = club.light === 0xff3b3b ? [0xff2b2b, 0xff5a20] : [0xff2b2b, 0x3aa0ff, 0xff2b2b];
  for (let i = 0; i < tubeCols.length; i++) {
    const tz = cz + (i - (tubeCols.length - 1) / 2) * 4;
    const tube = new THREE.Mesh(new THREE.BoxGeometry(club.area[0] * 1.4, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: tubeCols[i] }));
    tube.position.set(cx, cy + 8.4, tz);
    scene.add(tube);
    tubeLights.push({ mesh: tube, base: 1, kind: 'tube', off: i * 1.3 });
    // the fixture housing
    const hous = new THREE.Mesh(new THREE.BoxGeometry(club.area[0] * 1.4 + 0.4, 0.4, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x1a1822 }));
    hous.position.set(cx, cy + 8.7, tz);
    scene.add(hous);
  }

  // MIRROR BALLS hanging over the floor
  for (let i = 0; i < 3; i++) {
    const bx = cx + (i - 1) * 5;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xb0b4c0, metalness: 1, roughness: 0.25, flatShading: true }));
    ball.position.set(bx, cy + 7.4, cz + 1);
    scene.add(ball);
    // hang wire
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4),
      new THREE.MeshBasicMaterial({ color: 0x0d0a14 }));
    wire.position.set(bx, cy + 8.6, cz + 1);
    scene.add(wire);
    mirrorBalls.push(ball);
  }

  // HANGING CABLES / pipes from the ceiling (dead industrial vibe)
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x0d0a14 });
  for (let i = 0; i < 10; i++) {
    const len = 0.8 + Math.random() * 2.4;
    const cabx = cx + (Math.random() - 0.5) * club.area[0] * 1.8;
    const cabz = cz + (Math.random() - 0.5) * club.area[1] * 1.6;
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 4), cableMat);
    cab.position.set(cabx, cy + 8.6 - len / 2, cabz);
    cab.rotation.z = (Math.random() - 0.5) * 0.3;
    scene.add(cab);
  }
}
