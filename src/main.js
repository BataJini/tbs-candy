// main.js — boot, render loop, zone logic. Where the city wakes up.
import * as THREE from 'three';
import { buildWorld, zoneAt, dynamic, landmarks } from './world.js';
import { Player, input } from './player.js';
import { audio } from './audio.js';
import { state } from './state.js';
import { buildNPCs, updateNPCs } from './npcs.js';
import { initSystems, updateSystems, takePhoto } from './systems.js';
import { buildClubs, updateClubs } from './club.js';
import * as UI from './ui.js';
import * as TX from './textures.js';
import { INTRO_LINES } from './data.js';
import { buildSkyline } from './skyline.js';
import { buildCity } from './cityfill.js';
import * as Vehicles from './vehicles.js';

let renderer, scene, camera, player;
const TEST = new URLSearchParams(location.search).has('test');
let playing = false;
let photoMode = false;
let lastT = 0, saveT = 0, screenT = 0, screenFrame = 0;
let currentZone = null;
let skyResult = null;

/* ---------- renderer / scene ---------- */
function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.domElement.className = 'game-canvas';
  document.getElementById('canvas-holder').appendChild(renderer.domElement);
  sizeRenderer();
  window.addEventListener('resize', sizeRenderer);
  window.addEventListener('mk-quality', sizeRenderer);
}
function sizeRenderer() {
  const q = state.s.settings.quality || 1.6;
  renderer.setSize(Math.ceil(innerWidth / q), Math.ceil(innerHeight / q), false);
  if (camera) { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd99a7c); // dusty smog sunset
  scene.fog = new THREE.FogExp2(0xd99a7c, 0.0038); // thick polluted haze over the valley
  camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.1, 400);
  camera.rotation.order = 'YXZ';
  // dusty sun + soft sky bounce
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.6);
  sun.position.set(-40, 60, -30);
  scene.add(sun);
  sunRef = sun;
  const hemi = new THREE.HemisphereLight(0xc8a8d8, 0x4a4038, 0.9);
  scene.add(hemi);
  hemiRef = hemi;
  // interiors get their own glow
  const clubGlow1 = new THREE.AmbientLight(0x332244, 1);
  scene.add(clubGlow1);
  // sky gradient dome (drawn, cheap)
  const [skyC, sx] = TX.mkCanvas(64, 256);
  const grad = sx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5a3a6a');
  grad.addColorStop(0.5, '#c07a6a');
  grad.addColorStop(0.8, '#d99a7c');
  grad.addColorStop(1, '#e8b088');
  sx.fillStyle = grad; sx.fillRect(0, 0, 64, 256);
  TX.dither(sx, 64, 256, 10);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(320, 16, 12),
    new THREE.MeshBasicMaterial({ map: TX.tex(skyC), side: THREE.BackSide, fog: false })
  );
  scene.add(sky);
  skyRef = sky;
  buildClouds();
}

/* ---------- drifting clouds ---------- */
let clouds = [];
function cloudTex() {
  const [c, x] = TX.mkCanvas(128, 64);
  x.clearRect(0, 0, 128, 64);
  // a few overlapping soft puffs -> one fluffy cloud
  for (const [cx, cy, r] of [[44, 40, 22], [64, 34, 26], [86, 40, 20], [64, 44, 30]]) {
    const g = x.createRadialGradient(cx, cy, 2, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.6, 'rgba(245,240,250,0.5)');
    g.addColorStop(1, 'rgba(245,240,250,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  }
  return TX.tex(c);
}
function buildClouds() {
  const tex = cloudTex();
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.7 }));
    const s = 60 + Math.random() * 90;
    m.scale.set(s, s * 0.5, 1);
    m.position.set((Math.random() - 0.5) * 460, 90 + Math.random() * 70, (Math.random() - 0.5) * 460);
    m.renderOrder = -2;
    scene.add(m);
    clouds.push({ m, speed: 2 + Math.random() * 4 });
  }
}
function updateClouds(dt, dayEase) {
  for (const c of clouds) {
    c.m.position.x += c.speed * dt;
    if (c.m.position.x > 260) c.m.position.x = -260;
    // darker + moodier at night
    c.m.material.opacity = 0.28 + dayEase * 0.5;
    const g = 0.5 + dayEase * 0.5;
    c.m.material.color.setRGB(g, g * 0.98, g);
  }
}

/* ---------- boot ---------- */
async function boot() {
  state.load();
  UI.setLoad(0.1, 'MIXING CONCRETE…');
  setupRenderer();
  setupScene();
  await tick();
  UI.setLoad(0.3, 'POURING THE MTKVARI…');
  buildWorld(scene);
  skyResult = buildSkyline(scene);
  buildCity(scene);
  await tick();
  UI.setLoad(0.55, 'WAKING UP THE WEIRDOS…');
  buildNPCs(scene);
  await tick();
  UI.setLoad(0.75, 'CHARGING THE SUBWOOFERS…');
  player = new Player(camera);
  window.__mk = { get player() { return player; }, state, audio, input, get info() { return renderer.info.render; }, vehicles: Vehicles, world: { colliders: null }, setTime(h) { gameMin = h * 60; } };
  import('./world.js').then(w => { window.__mk.world = w; });
  UI.setMapPlayer(player);
  UI.initMinimap(player);
  initSystems(scene, player, camera, renderer);
  buildClubs(scene);
  Vehicles.buildVehicles(scene, player, camera);
  Vehicles.registerVehicleInteractables((await import('./systems.js')).interactables);
  await tick();
  UI.setLoad(0.95, 'STEALING A MAP FROM A TOURIST…');
  UI.initUIListeners();
  UI.buildOS(() => { resumeToGame(); });
  await tick();
  UI.setLoad(1, 'READY. STAY HYDRATED.');
  const hasSave = state.hasSave();
  UI.showTitleMenu(hasSave, () => startGame(true), () => startGame(false));
  requestAnimationFrame(loop);
}
const tick = () => new Promise(r => setTimeout(r, 30));

function startGame(fresh) {
  audio.init();
  audio.resume();
  audio.setMusicVol(state.s.settings.music);
  audio.setSfxVol(state.s.settings.sfx);
  if (fresh) {
    state.wipe();
    state.s.started = true;
    // spawn on the tallest tower roof (T5) with a sweeping view of the whole city
    player.pos.set(58, 31.4, -73);
    player.yaw = Math.PI; player.pitch = -0.12;
    player.vel.set(0, 0, 0);
    state.save();
  } else {
    state.load();
    if (state.s.pos) player.pos.set(state.s.pos.x, state.s.pos.y + 0.2, state.s.pos.z);
  }
  UI.hideTitle();
  UI.showHUD();
  UI.updateCounts();
  playing = true;
  if (TEST) { input.locked = true; } else { lockPointer(); }
  if (fresh) {
    setTimeout(() => UI.showDialogue('THE CITY', INTRO_LINES, () => {
      UI.notify('MTKVARI OS', 'TAB OPENS YOUR BRAIN. E TALKS. HOLD E SPRAYS.');
      UI.notify('???', 'A PROMOTER NAMED ZURA LURKS IN THE UNDERPASS. HE HAS JOBS.');
    }), 700);
  }
}

function resumeToGame() { if (playing) lockPointer(); }
function lockPointer() {
  renderer.domElement.requestPointerLock({ unadjustedMovement: true }) ||
    renderer.domElement.requestPointerLock();
}
document.addEventListener('pointerlockchange', () => {
  if (TEST) { input.locked = true; return; }
  input.locked = document.pointerLockElement === renderer.domElement;
  if (!input.locked && playing && !UI.osOpen() && !UI.danceActive() &&
    !UI.dialogueOpen() &&
    !document.getElementById('ending').classList.contains('on')) {
    // ESC released the mouse -> open the fake OS as pause menu
    // (but NOT when a dialogue/choice released it on purpose)
    UI.openOS();
  }
});
// dialogue choices release the mouse to be clickable; re-grab it when they close
window.addEventListener('mk-relock', () => { if (playing) lockPointer(); });
document.addEventListener('click', (e) => {
  if (!playing) return;
  if (UI.osOpen() || UI.danceActive() || UI.dialogueOpen()) return;
  if (!input.locked) { lockPointer(); return; }
  if (photoMode) takePhoto();
});

/* ---------- hotkeys ---------- */
window.addEventListener('keydown', (e) => {
  if (!playing) return;
  if (e.code === 'Tab') {
    e.preventDefault();
    if (UI.osOpen()) UI.closeOS();
    else if (!UI.danceActive()) UI.openOS();
  }
  if (e.code === 'KeyF' && !UI.osOpen() && !UI.danceActive()) {
    photoMode = !photoMode;
    UI.setPhotoMode(photoMode);
    audio.sfx('click');
  }
});

/* ---------- zone / audio logic ---------- */
function updateZone() {
  const z = zoneAt(player.pos.x, player.pos.y, player.pos.z);
  if (z !== currentZone) {
    currentZone = z;
    UI.zoneBanner(z.banner);
    UI.setZoneLabel(z.name.toUpperCase());
    UI.setMinimapZone(z.name.toUpperCase());
  }
  if (!audio.ready) return;
  // beds
  audio.setBed('city', z.bed === 'city' ? 0.05 : 0);
  audio.setBed('wind', z.bed === 'wind' ? 0.12 : 0);
  audio.setBed('crowd', z.bed === 'crowd' ? 0.1 : 0);
  audio.setBed('riverhum', z.bed === 'riverhum' ? 0.1 : 0);
  // music: mixtape override wins outside clubs
  const inClub = z.name === 'b909' || z.name === 'khd';
  if (inClub) audio.lockTrack = false;
  if (audio.lockTrack) { audio.setMuffle(0); return; }
  // chill room inside B909 west wing
  let track = z.music, muffle = 0;
  if (z.name === 'b909' && player.pos.x < -3 && player.pos.z < 80) track = 'chill';
  if (!inClub && player.pos.y > -5) {
    // bass leaking through club doors outside
    const db = Math.hypot(player.pos.x - 10, player.pos.z - 91.5);
    const dk = Math.hypot(player.pos.x + 61.5, player.pos.z - 71.5);
    if (db < 14) { track = 'club1'; muffle = 0.55 + (db / 14) * 0.42; }
    else if (dk < 12) { track = 'club2'; muffle = 0.55 + (dk / 12) * 0.42; }
  }
  audio.setTrack(track);
  audio.setMuffle(muffle);
}

/* ---------- dynamic world bits ---------- */
function updateWorldFX(dt, t) {
  if (dynamic.water) dynamic.water.material.map.offset.x = t * 0.02;
  for (const b of dynamic.blinkers) {
    const on = Math.sin(t * 3 + (b.position ? b.position.x : 0)) > -0.2;
    if (b.material) b.material.opacity = on ? 1 : 0.25;
    if (b.material) b.material.transparent = true;
  }
  if (skyResult) { const b = skyResult.blinkers[0]; if (b) b.visible = Math.sin(t * 2.4) > -0.3; }
  screenT += dt;
  if (screenT > 2.4) {
    screenT = 0; screenFrame++;
    for (const scr of dynamic.screens) {
      scr.material.map = TX.tex(TX.propagandaTex(screenFrame));
      scr.material.needsUpdate = true;
    }
  }
  // beat pulse on FOV inside clubs — subtle, cartoonish
  const inClub = currentZone && (currentZone.name === 'b909' || currentZone.name === 'khd');
  const pulse = inClub ? audio.beatPulse() * 1.2 : 0;
  const sprintKick = (player.speedRatio ? 4 : 0);
  const targetFov = 74 + sprintKick + pulse;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
  camera.updateProjectionMatrix();
}


/* ---------- day/night cycle (GTA-style clock: 1 game min per real sec) ---------- */
let gameMin = 10 * 60, gameDay = 1;   // start 10:00 — bright morning; cycles to club-night
const DAY_COL = new THREE.Color(0xd99a7c), NIGHT_COL = new THREE.Color(0x141026);
const tmpCol = new THREE.Color();
let sunRef = null, hemiRef = null, skyRef = null;
function daylightFactor(h) {
  if (h >= 8 && h < 19) return 1;
  if (h >= 19 && h < 22) return 1 - (h - 19) / 3;
  if (h >= 5 && h < 8) return (h - 5) / 3;
  return 0;
}
function updateDayNight(dt) {
  gameMin += dt;                       // 1 real second = 1 game minute
  if (gameMin >= 1440) { gameMin -= 1440; gameDay++; }
  const h = gameMin / 60;
  const dl = daylightFactor(h);
  const ease = dl * dl * (3 - 2 * dl); // smoothstep
  tmpCol.copy(NIGHT_COL).lerp(DAY_COL, ease);
  scene.background = tmpCol;
  if (scene.fog) scene.fog.color.copy(tmpCol);
  if (sunRef) sunRef.intensity = 0.25 + ease * 1.35;
  if (hemiRef) hemiRef.intensity = 0.4 + ease * 0.55;
  if (skyRef) skyRef.material.color.setScalar(0.3 + ease * 0.7);
  updateClouds(dt, ease);
  // clock HUD
  const hh = String(Math.floor(gameMin / 60)).padStart(2, '0');
  const mm = String(Math.floor(gameMin % 60)).padStart(2, '0');
  const ct = document.getElementById('clock-time');
  if (ct) ct.textContent = hh + ':' + mm;
  const cd = document.getElementById('clock-day');
  if (cd) {
    const spd = Vehicles.drivingSpeed();
    cd.innerHTML = 'DAY ' + gameDay + (Vehicles.isDriving() ? ' · <span style="color:var(--yellow)">' + Math.round(spd * 3.6) + ' KM/H</span>' : '');
  }
  state.s.flags.clockMin = Math.round(gameMin); state.s.flags.clockDay = gameDay;
}

/* ---------- main loop ---------- */
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (playing) {
    const drive = Vehicles.isDriving();
    player.frozen = UI.osOpen() || UI.dialogueOpen() || UI.danceActive() || !input.locked || drive;
    if (!UI.osOpen()) {
      Vehicles.updateVehicles(dt);       // ambient traffic + (if driving) the car
      if (!drive) { player.update(dt); updateSystems(dt); }
      updateNPCs(dt, player.pos, camera);
      updateClubs(dt, t / 1000);
      updateZone();
      UI.drawMinimap(dt);
      updateWorldFX(dt, t / 1000);
      updateDayNight(dt);
      saveT += dt;
      if (saveT > 10) { saveT = 0; state.save({ x: player.pos.x, y: player.pos.y, z: player.pos.z }); }
    }
  } else {
    // title screen: slow camera drift over the city
    const tt = t / 1000;
    camera.position.set(Math.sin(tt * 0.1) * 60, 26 + Math.sin(tt * 0.07) * 6, Math.cos(tt * 0.1) * 60);
    camera.lookAt(0, 4, 0);
    updateClubs(dt, tt);
    updateWorldFX(dt, tt);
  }
  renderer.render(scene, camera);
}

boot();
