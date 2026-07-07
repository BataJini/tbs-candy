// player.js — first-person body: capsule-as-box vs the city's AABBs.
// Step-up stairs, ladders, ledge mantling, river swimming. Gravity is forgiving.
import * as THREE from 'three';
import { colliders, ladders } from './world.js';
import { audio } from './audio.js';
import { state } from './state.js';

export const input = {
  keys: {},
  mouseDX: 0, mouseDY: 0,
  locked: false,
  down(k) { return !!this.keys[k]; }
};

window.addEventListener('keydown', e => {
  input.keys[e.code] = true;
  if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { input.keys[e.code] = false; });
document.addEventListener('mousemove', e => {
  if (!input.locked) return;
  input.mouseDX += e.movementX;
  input.mouseDY += e.movementY;
});

const STAND_H = 1.7, CROUCH_H = 1.05, RADIUS = 0.36;
const GRAV = 21, JUMP_V = 7.6;

export class Player {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3(-66, 0.5, 10);   // underpass promenade spawn
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI / 2; this.pitch = 0;
    this.height = STAND_H;
    this.crouch = false;
    this.grounded = false;
    this.groundSurface = 'concrete';
    this.onLadder = null;
    this.mantle = null;        // {t, from:V3, to:V3}
    this.swimming = false;
    this.stepAcc = 0;
    this.landShake = 0;
    this.frozen = false;       // dialogs / menus
    this.bob = 0;
  }

  eyeY() { return this.pos.y + this.height - 0.18; }
  lookDir(v = new THREE.Vector3()) {
    v.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    return v;
  }

  aabb(px = this.pos.x, py = this.pos.y, pz = this.pos.z, h = this.height) {
    return { minX: px - RADIUS, maxX: px + RADIUS, minY: py, maxY: py + h, minZ: pz - RADIUS, maxZ: pz + RADIUS };
  }
  hit(a, c) {
    return a.minX < c.maxX && a.maxX > c.minX && a.minY < c.maxY && a.maxY > c.minY && a.minZ < c.maxZ && a.maxZ > c.minZ;
  }
  overlaps(px, py, pz, h = this.height) {
    const a = this.aabb(px, py, pz, h);
    for (let i = 0; i < colliders.length; i++) if (this.hit(a, colliders[i])) return colliders[i];
    return null;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    // mouse look
    const sens = 0.0021 * (state.s.settings.sens || 1);
    this.yaw -= input.mouseDX * sens;
    this.pitch -= input.mouseDY * sens * (state.s.settings.invertY ? -1 : 1);
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    input.mouseDX = 0; input.mouseDY = 0;

    if (this.mantle) { this._updateMantle(dt); this._applyCam(dt); return; }
    if (this.frozen) { this.vel.set(0, this.vel.y, 0); }

    // crouch toggle-by-hold
    const wantCrouch = input.down('KeyC') || input.down('ControlLeft');
    if (wantCrouch !== this.crouch) {
      if (wantCrouch) { this.crouch = true; this.height = CROUCH_H; }
      else if (!this.overlaps(this.pos.x, this.pos.y, this.pos.z, STAND_H)) { this.crouch = false; this.height = STAND_H; }
    }

    // ladder check
    this.onLadder = null;
    if (!this.frozen) {
      for (const L of ladders) {
        const dx = this.pos.x - L.x, dz = this.pos.z - L.z;
        if (dx * dx + dz * dz < L.r * L.r && this.pos.y > L.y0 - 1 && this.pos.y < L.y1 + 0.5) { this.onLadder = L; break; }
      }
    }

    const fw = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    const st = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);

    if (this.onLadder && (fw !== 0 || st !== 0) && !this.frozen) {
      this._updateLadder(dt, fw);
    } else if (this.swimming) {
      this._updateSwim(dt, fw, st);
    } else {
      this._updateWalk(dt, fw, st);
    }
    this._applyCam(dt);
  }

  _updateLadder(dt, fw) {
    const L = this.onLadder;
    this.vel.set(0, fw * 3.1, 0);
    this.pos.y += this.vel.y * dt;
    // stick to ladder column
    this.pos.x += (L.x - this.pos.x) * Math.min(1, dt * 6) * 0.5;
    this.pos.z += (L.z - this.pos.z) * Math.min(1, dt * 6) * 0.5;
    if (this.pos.y >= L.y1 - 0.1 && fw > 0) {
      // hop off the top toward look direction
      const d = this.lookDir(); this.pos.y = L.y1 + 0.05;
      this.pos.x += d.x * 0.7; this.pos.z += d.z * 0.7;
      this.vel.set(0, 2.4, 0);
      this.onLadder = null;
    }
    if (this.pos.y <= L.y0) { this.pos.y = L.y0; }
    if (input.down('Space')) { this.onLadder = null; this.vel.y = 3; }
    this.grounded = false;
    this.stepAcc += Math.abs(this.vel.y * dt);
    if (this.stepAcc > 0.55) { this.stepAcc = 0; audio.footstep('metal'); }
  }

  _updateSwim(dt, fw, st) {
    const speed = 2.6;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wx = (-sin * fw + cos * st) * speed;
    const wz = (-cos * fw - sin * st) * speed;
    this.vel.x += (wx - this.vel.x) * Math.min(1, dt * 4);
    this.vel.z += (wz - this.vel.z) * Math.min(1, dt * 4);
    // buoyancy: float head at water level ~-2.5
    const target = -3.6;
    this.vel.y += ((target - this.pos.y) * 3 - this.vel.y) * Math.min(1, dt * 3);
    this.vel.y = Math.max(-3, Math.min(3, this.vel.y));
    if (input.down('Space')) this.vel.y = 2.4;
    this._moveAxes(dt);
    if (this.pos.y > -2.9 || this.pos.x > -77.5 || this.pos.y < -6.5) this.swimming = false;
  }

  _updateWalk(dt, fw, st) {
    if (this.frozen) { fw = 0; st = 0; }
    const sprint = input.down('ShiftLeft') && fw > 0 && !this.crouch;
    const max = this.crouch ? 2.7 : (sprint ? 7.8 : 5.3);
    this.speedRatio = sprint ? 1 : 0;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let wx = (-sin * fw + cos * st), wz = (-cos * fw - sin * st);
    const wl = Math.hypot(wx, wz) || 1;
    wx = wx / wl * max; wz = wz / wl * max;
    const accel = this.grounded ? 14 : 3.5;
    this.vel.x += (wx - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (wz - this.vel.z) * Math.min(1, dt * accel);
    // gravity + jump
    this.vel.y -= GRAV * dt;
    if (input.down('Space') && this.grounded && !this.frozen) {
      this.vel.y = JUMP_V * (this.crouch ? 0.8 : 1) * (state.s.upgrades.moves ? 1.18 : 1);
      this.grounded = false;
      audio.sfx('jump');
    }
    const fellFast = this.vel.y < -13;
    this._moveAxes(dt);
    // landing feedback (no damage — gravity is a coward)
    if (this.grounded && fellFast) { this.landShake = 0.5; audio.sfx('landHard'); }
    // mantle attempt: airborne, pushing forward into something
    if (!this.grounded && fw > 0 && (this.blockedX || this.blockedZ)) this._tryMantle();
    // river entry
    if (this.pos.x < -78 && this.pos.x > -110 && this.pos.y < -2.9 && this.pos.y > -6.5 && !this.swimming) {
      this.swimming = true;
      audio.sfx('door');
      if (state.unlock('swim')) { }
      state.emit('splash', {});
    }
    // footsteps
    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hv > 1) {
      this.stepAcc += hv * dt;
      const stride = sprint ? 2.6 : 2.0;
      if (this.stepAcc > stride) { this.stepAcc = 0; audio.footstep(this.groundSurface); }
    }
    this.bob = this.grounded && hv > 0.5 ? this.bob + dt * (sprint ? 11 : 8) : this.bob;
  }

  _moveAxes(dt) {
    this.blockedX = false; this.blockedZ = false;
    // X axis
    let nx = this.pos.x + this.vel.x * dt;
    let c = this.overlaps(nx, this.pos.y + 0.02, this.pos.z);
    if (c) {
      if (!this._tryStep(nx, this.pos.z, c)) {
        nx = this.vel.x > 0 ? c.minX - RADIUS - 0.001 : c.maxX + RADIUS + 0.001;
        this.vel.x = 0; this.blockedX = true;
      }
    }
    this.pos.x = nx;
    // Z axis
    let nz = this.pos.z + this.vel.z * dt;
    c = this.overlaps(this.pos.x, this.pos.y + 0.02, nz);
    if (c) {
      if (!this._tryStep(this.pos.x, nz, c)) {
        nz = this.vel.z > 0 ? c.minZ - RADIUS - 0.001 : c.maxZ + RADIUS + 0.001;
        this.vel.z = 0; this.blockedZ = true;
      }
    }
    this.pos.z = nz;
    // Y axis
    let ny = this.pos.y + this.vel.y * dt;
    c = this.overlaps(this.pos.x, ny, this.pos.z);
    this.grounded = false;
    if (c) {
      if (this.vel.y <= 0) {
        ny = c.maxY + 0.001;
        this.grounded = true;
        this.groundSurface = c.surface || 'concrete';
        if (this.vel.y < -3) audio.sfx('land');
      } else {
        ny = c.minY - this.height - 0.001;
      }
      this.vel.y = 0;
    }
    this.pos.y = ny;
    // safety net: fell through the world
    if (this.pos.y < -80) { this.pos.set(-66, 1, 10); this.vel.set(0, 0, 0); }
  }

  // step-up: quietly hop small obstacles (stairs, curbs)
  _tryStep(nx, nz, c) {
    const lift = c.maxY - this.pos.y;
    if (lift <= 0 || lift > 0.62 || !this.grounded && this.vel.y > 1) return false;
    if (this.overlaps(nx, c.maxY + 0.002, nz)) return false;
    this.pos.y = c.maxY + 0.002;
    return true;
  }

  // mantle: grab a ledge up to ~1.7m above feet and haul up
  _tryMantle() {
    const d = this.lookDir(); d.y = 0; d.normalize();
    const aheadX = this.pos.x + d.x * (RADIUS + 0.45);
    const aheadZ = this.pos.z + d.z * (RADIUS + 0.45);
    // find the blocking collider top
    let top = null;
    const probe = this.aabb(aheadX, this.pos.y + 0.3, aheadZ, this.height);
    for (const c of colliders) {
      if (this.hit(probe, c)) {
        const t = c.maxY - this.pos.y;
        if (t > 0.5 && t < 1.9 && (top === null || c.maxY > top)) top = c.maxY;
      }
    }
    if (top === null) return;
    // clearance above the ledge?
    if (this.overlaps(aheadX, top + 0.02, aheadZ, CROUCH_H)) return;
    this.mantle = {
      t: 0,
      from: this.pos.clone(),
      to: new THREE.Vector3(aheadX, top + 0.02, aheadZ)
    };
    this.vel.set(0, 0, 0);
    audio.sfx('pickup');
  }

  _updateMantle(dt) {
    const m = this.mantle;
    m.t += dt / 0.34;
    if (m.t >= 1) { this.pos.copy(m.to); this.mantle = null; return; }
    // up first, then forward — feels like a real haul
    const up = Math.min(1, m.t * 1.8);
    const fwd = Math.max(0, (m.t - 0.45) / 0.55);
    this.pos.y = m.from.y + (m.to.y - m.from.y) * up;
    this.pos.x = m.from.x + (m.to.x - m.from.x) * fwd;
    this.pos.z = m.from.z + (m.to.z - m.from.z) * fwd;
  }

  _applyCam(dt) {
    this.landShake = Math.max(0, this.landShake - dt * 2);
    const shake = this.landShake > 0 ? Math.sin(this.landShake * 40) * this.landShake * 0.06 : 0;
    const bobY = Math.abs(Math.sin(this.bob)) * 0.05 * (this.crouch ? 0.5 : 1);
    this.cam.position.set(this.pos.x, this.eyeY() + bobY + shake, this.pos.z);
    this.cam.rotation.order = 'YXZ';
    this.cam.rotation.y = this.yaw;
    this.cam.rotation.x = this.pitch;
    this.cam.rotation.z = shake * 0.5;
  }
}
