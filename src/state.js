// state.js — one save blob, one event bus, all progression rules.

const SAVE_KEY = 'mtkvari-candy-save-v1';

export const RANKS = [
  { rep: 0, name: 'NOBODY' },
  { rep: 40, name: 'BATHROOM TAGGER' },
  { rep: 100, name: 'UNDERPASS GOBLIN' },
  { rep: 190, name: 'BASS COURIER' },
  { rep: 300, name: 'ROOFTOP SAINT' },
  { rep: 440, name: 'MTKVARI LEGEND' },
];

export const ACHIEVEMENTS = {
  firstTag: { name: 'WET PAINT', desc: 'Tag your first wall' },
  tag10: { name: 'CAN CONTROL', desc: 'Tag 10 spots' },
  tag25: { name: 'CITY CANVAS', desc: 'Tag 25 spots' },
  allTags: { name: 'KING OF TAGS', desc: 'Tag every spot in the city' },
  firstDeliver: { name: 'SUGAR RUNNER', desc: 'Deliver your first candy' },
  deliver6: { name: 'CANDY POSTMAN', desc: 'Complete 6 deliveries' },
  allMissions: { name: 'FULL SERVICE', desc: 'Complete every delivery' },
  firstDance: { name: 'FLOOR MEAT', desc: 'Survive your first dance-off' },
  combo16: { name: 'LOCKED IN', desc: 'Hit a x16 combo dancing' },
  clubBoth: { name: 'TWO ROOMS', desc: 'Enter both clubs' },
  allStickers: { name: 'STICKY FINGERS', desc: 'Find all 10 stickers' },
  allTapes: { name: 'ARCHIVIST', desc: 'Collect all 5 mixtapes' },
  photo5: { name: 'STREET LENS', desc: 'Complete 5 photo challenges' },
  catFriend: { name: 'CAT COUNCIL', desc: 'Pet 5 stray cats' },
  roofTop: { name: 'ABOVE IT ALL', desc: 'Reach the antenna platform' },
  swim: { name: 'MTKVARI FLAVOR', desc: 'Fall into the river' },
  heatMax: { name: 'CORPORATE ENEMY', desc: 'Max out your HEAT' },
  end1: { name: 'ENDING: KING OF TAGS', desc: 'Become the wall legend' },
  end2: { name: 'ENDING: BASS ASCENSION', desc: 'Play the final set' },
  end3: { name: 'ENDING: SYSTEM CRASH', desc: 'Crash CandyCorp' },
};

function freshState() {
  return {
    started: false,
    rep: 0, vibe: 0, heat: 0,
    candies: {},           // candyId -> count
    caps: 0,               // rare spray caps
    capsSpent: 0,
    stickers: [],          // sticker ids found
    mixtapes: [],          // mixtape ids found
    passes: { b909: false, khd: false, staff: false },
    tags: [],              // tag spot ids done
    murals: [],            // mural ids done
    photos: [],            // {id, data} snapshots (data kept out of save if too big)
    photoChallenges: [],   // challenge ids done
    metNPCs: [],           // npc ids talked to
    catsPetted: [],
    missions: {},          // missionId -> 'offered' | 'active' | 'done'
    talked: {},            // npcId -> times
    flags: {},             // misc story flags
    achievements: [],
    endings: [],
    upgrades: { moves: false, dance: false },
    pos: null,             // saved player position
    settings: { music: 0.8, sfx: 0.9, quality: 1.6, sens: 1.0, invertY: false },
  };
}

class GameState {
  constructor() {
    this.s = freshState();
    this.listeners = {};
  }
  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  emit(ev, data) {
    (this.listeners[ev] || []).forEach(fn => fn(data));
    (this.listeners['*'] || []).forEach(fn => fn(ev, data));
  }

  save(pos) {
    if (pos) this.s.pos = pos;
    try {
      const slim = { ...this.s, photos: this.s.photos.map(p => ({ id: p.id, challenge: p.challenge })) };
      localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
    } catch (e) { console.warn('save failed', e); }
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.s = Object.assign(freshState(), data);
      this.s.settings = Object.assign(freshState().settings, data.settings || {});
      this.s.passes = Object.assign(freshState().passes, data.passes || {});
      return this.s.started;
    } catch (e) { return false; }
  }
  hasSave() { return !!localStorage.getItem(SAVE_KEY); }
  wipe() { localStorage.removeItem(SAVE_KEY); this.s = freshState(); }

  rank() {
    let r = 0;
    for (let i = 0; i < RANKS.length; i++) if (this.s.rep >= RANKS[i].rep) r = i;
    return r;
  }
  rankName() { return RANKS[this.rank()].name; }
  repProgress() { // 0..1 within current rank band
    const r = this.rank();
    if (r >= RANKS.length - 1) return 1;
    const lo = RANKS[r].rep, hi = RANKS[r + 1].rep;
    return (this.s.rep - lo) / (hi - lo);
  }

  addRep(n, why = '') {
    const before = this.rank();
    this.s.rep += n;
    this.emit('rep', { n, why });
    if (this.rank() > before) this.emit('rankup', { rank: this.rankName() });
    this.save();
  }
  addVibe(n) {
    this.s.vibe = Math.max(0, Math.min(100, this.s.vibe + n));
    this.emit('vibe', { n });
  }
  addHeat(n) {
    this.s.heat = Math.max(0, Math.min(100, this.s.heat + n));
    this.emit('heat', {});
    if (this.s.heat >= 100) this.unlock('heatMax');
  }

  giveCandy(id, n = 1) {
    this.s.candies[id] = (this.s.candies[id] || 0) + n;
    this.emit('candy', { id, n });
    this.save();
  }
  takeCandy(id, n = 1) {
    if ((this.s.candies[id] || 0) < n) return false;
    this.s.candies[id] -= n;
    if (this.s.candies[id] <= 0) delete this.s.candies[id];
    this.emit('candy', { id, n: -n });
    this.save();
    return true;
  }
  candyCount() { return Object.values(this.s.candies).reduce((a, b) => a + b, 0); }

  unlock(achId) {
    if (this.s.achievements.includes(achId)) return false;
    this.s.achievements.push(achId);
    this.emit('achievement', { id: achId, ...ACHIEVEMENTS[achId] });
    this.save();
    return true;
  }

  doTag(id, isMural = false) {
    const list = isMural ? this.s.murals : this.s.tags;
    if (list.includes(id)) return false;
    list.push(id);
    this.emit('tag', { id, isMural });
    const total = this.s.tags.length + this.s.murals.length;
    if (total === 1) this.unlock('firstTag');
    if (total >= 10) this.unlock('tag10');
    if (total >= 25) this.unlock('tag25');
    this.save();
    return true;
  }

  missionState(id) { return this.s.missions[id] || 'hidden'; }
  setMission(id, st) {
    this.s.missions[id] = st;
    this.emit('mission', { id, state: st });
    if (st === 'done') {
      const done = Object.values(this.s.missions).filter(m => m === 'done').length;
      if (done === 1) this.unlock('firstDeliver');
      if (done >= 6) this.unlock('deliver6');
    }
    this.save();
  }
  missionsDone() { return Object.values(this.s.missions).filter(m => m === 'done').length; }
  activeMissions() { return Object.entries(this.s.missions).filter(([, v]) => v === 'active').map(([k]) => k); }

  flag(k, v) {
    if (v === undefined) return this.s.flags[k];
    this.s.flags[k] = v;
    this.emit('flag', { k, v });
    this.save();
  }
}

export const state = new GameState();
