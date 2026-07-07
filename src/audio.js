// audio.js — 100% procedural WebAudio. Techno loops, ambient beds, SFX.
// No samples, no copyrighted audio. The city hums because we tell it to.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.track = null;       // current music track name
    this.step = 0;           // 16th-note counter (0..63, 4 bars)
    this.nextStepTime = 0;
    this.lastBeatTime = 0;
    this.bpm = 120;
    this.musicVol = 0.8;
    this.sfxVol = 0.9;
    this.beds = {};          // continuous ambient loops
    this._muffle = 0;
    this._timer = null;
  }

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 1;
    this.master.connect(c.destination);
    // music chain: bus -> lowpass (muffle) -> gain -> master
    this.musicFilter = c.createBiquadFilter();
    this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 18000;
    this.musicGain = c.createGain(); this.musicGain.gain.value = this.musicVol;
    this.musicBus = c.createGain();
    this.musicBus.connect(this.musicFilter); this.musicFilter.connect(this.musicGain);
    this.musicGain.connect(this.master);
    // sfx chain
    this.sfxGain = c.createGain(); this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.master);
    // bed chain (ambients)
    this.bedGain = c.createGain(); this.bedGain.gain.value = 0.8;
    this.bedGain.connect(this.master);
    // shared noise buffer (2s white)
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // scheduler
    this.nextStepTime = c.currentTime + 0.1;
    this._timer = setInterval(() => this._tick(), 25);
    this.ready = true;
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setMusicVol(v) { this.musicVol = v; if (this.ready) this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setSfxVol(v) { this.sfxVol = v; if (this.ready) this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  setMuffle(m) {
    if (!this.ready) return;
    if (Math.abs(m - this._muffle) < 0.01) return;
    this._muffle = m;
    const f = 18000 * Math.pow(1 - m, 2.2) + 260 * m;
    this.musicFilter.frequency.setTargetAtTime(Math.max(260, f), this.ctx.currentTime, 0.15);
  }

  setTrack(name) {
    if (name === this.track) return;
    this.track = name;
    if (name && TRACKS[name]) {
      this.bpm = TRACKS[name].bpm;
      this.step = 0;
      if (this.ready) this.nextStepTime = Math.max(this.nextStepTime, this.ctx.currentTime + 0.05);
    }
  }

  beatPhase() { // 0..1 within current quarter note, for pulsing visuals
    if (!this.ready || !this.track) return 0;
    const beatDur = 60 / this.bpm;
    return ((this.ctx.currentTime - this.lastBeatTime) / beatDur) % 1;
  }
  beatPulse() { // 1 at kick, decays — cheap visual driver
    const p = this.beatPhase();
    return Math.max(0, 1 - p * 3);
  }

  _tick() {
    if (!this.ctx || !this.track) return;
    const LOOKAHEAD = 0.12;
    const t16 = 60 / this.bpm / 4;
    const trk = TRACKS[this.track];
    if (!trk) return;
    while (this.nextStepTime < this.ctx.currentTime + LOOKAHEAD) {
      trk.pattern(this, this.step, this.nextStepTime);
      if (this.step % 4 === 0) this.lastBeatTime = this.nextStepTime;
      this.step = (this.step + 1) % 64;
      this.nextStepTime += t16;
    }
  }

  /* ------- synth atoms (all schedule at absolute time t on music bus) ------- */
  kick(t, punch = 1, out) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150 * punch, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.9 * punch, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g); g.connect(out || this.musicBus);
    o.start(t); o.stop(t + 0.36);
  }

  noiseHit(t, { dur = 0.06, hp = 8000, bp = 0, q = 1, vol = 0.25, out = null } = {}) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noiseBuf; s.playbackRate.value = 0.9 + Math.random() * 0.2;
    if (bp) { f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = q; }
    else { f.type = 'highpass'; f.frequency.value = hp; }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || this.musicBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  hat(t, open = false) { this.noiseHit(t, { dur: open ? 0.16 : 0.045, hp: 8500, vol: open ? 0.16 : 0.13 }); }
  clap(t) {
    for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, { dur: 0.05, bp: 1700, q: 1.6, vol: 0.16 });
    this.noiseHit(t + 0.033, { dur: 0.2, bp: 1500, q: 1.2, vol: 0.12 });
  }
  perc(t, freq = 3000) { this.noiseHit(t, { dur: 0.05, bp: freq, q: 6, vol: 0.2 }); }

  acid(t, freq, { dur = 0.11, cutoff = 900, res = 14, vol = 0.3, slide = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    f.type = 'lowpass'; f.Q.value = res;
    f.frequency.setValueAtTime(cutoff * 2.2, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.4), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.03);
    o.connect(f); f.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.06);
  }

  sub(t, freq, dur = 0.4, vol = 0.34) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  stab(t, freqs, dur = 0.16, vol = 0.1, type = 'square') {
    const c = this.ctx;
    for (const fr of freqs) {
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = type; o.frequency.value = fr; o.detune.value = (Math.random() - 0.5) * 14;
      f.type = 'lowpass'; f.frequency.value = 2600;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(f); f.connect(g); g.connect(this.musicBus);
      o.start(t); o.stop(t + dur + 0.03);
    }
  }

  pluck(t, freq, dur = 0.3, vol = 0.14, type = 'triangle', out) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out || this.musicBus);
    o.start(t); o.stop(t + dur + 0.04);
  }
}

/* ------------- MUSIC TRACKS (step patterns, 64 x 16th = 4 bars) ------------- */
// D minor-ish frequencies
const N = (semi, oct = 0) => 73.42 * Math.pow(2, (semi + oct * 12) / 12); // D2 base
const SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor
const deg = (i, oct = 0) => N(SCALE[((i % 7) + 7) % 7], oct + Math.floor(i / 7));

const TRACKS = {
  // BASSMENT 909 — big dark stadium techno
  club1: {
    bpm: 132,
    pattern(a, s, t) {
      if (s % 4 === 0) a.kick(t, 1);
      if (s % 4 === 2) a.hat(t, true);
      if (s % 2 === 1) a.hat(t, false);
      if (s % 16 === 4 || s % 16 === 12) a.clap(t);
      const bl = [0, 0, 7, 0, 10, 0, 7, 12, 0, 0, 7, 0, 10, 12, 7, 3];
      const b = bl[s % 16];
      if (s % 2 === 0) a.acid(t, N(b, b > 6 ? 0 : 0), { cutoff: 500 + 400 * Math.sin(s * 0.4) + (s % 8 === 0 ? 600 : 0), vol: 0.26 });
      if (s % 32 === 14) a.stab(t, [N(0, 2), N(3, 2), N(7, 2)], 0.22, 0.07);
      if (s % 16 === 0) a.sub(t, N(0, -1), 0.5);
    }
  },
  // KHD-404 — industrial bunker
  club2: {
    bpm: 140,
    pattern(a, s, t) {
      if (s % 4 === 0) a.kick(t, 1.05);
      if (s % 8 === 7) a.kick(t, 0.5); // ghost
      if (s % 4 === 2) a.perc(t, 2600 + (s % 16) * 80);
      if (s % 2 === 1) a.hat(t, false);
      if (s % 32 === 20) a.clap(t);
      const bl = [0, -1, 0, 0, 3, 0, -1, 0];
      if (s % 2 === 0) a.acid(t, N(bl[(s / 2) % 8], -1) * 2, { cutoff: 300 + (s % 32) * 18, res: 18, vol: 0.3, dur: 0.13 });
      if (s % 64 === 48) a.stab(t, [N(0, 2), N(1, 2)], 0.5, 0.06, 'sawtooth'); // dissonant scream
      if (s % 16 === 8) a.sub(t, N(0, -1), 0.4, 0.4);
    }
  },
  // street — dusty downtempo outdoor
  street: {
    bpm: 96,
    pattern(a, s, t) {
      if (s % 8 === 0) a.kick(t, 0.55);
      if (s % 8 === 4) a.noiseHit(t, { dur: 0.09, bp: 900, q: 2, vol: 0.07 });
      if (s % 4 === 2 && Math.random() < 0.6) a.hat(t, false);
      if (s % 32 === 0) a.stab(t, [N(0, 1), N(3, 1), N(7, 1)], 0.9, 0.045, 'triangle');
      if (s % 32 === 16) a.stab(t, [N(-2, 1), N(2, 1), N(5, 1)], 0.9, 0.04, 'triangle');
      if (s % 16 === 10 && Math.random() < 0.4) a.pluck(t, deg((Math.random() * 7) | 0, 2), 0.4, 0.05);
      if (s % 16 === 0) a.sub(t, N(0, -1), 0.8, 0.16);
    }
  },
  // underpass — echo cave, drips, sparse dub
  underpass: {
    bpm: 80,
    pattern(a, s, t) {
      if (s % 16 === 0) a.sub(t, N(0, -1), 1.2, 0.2);
      if (s % 16 === 8) a.sub(t, N(5, -1), 1.0, 0.14);
      // dripping pings with fake echo
      if (s % 8 === 3 && Math.random() < 0.5) {
        const f = deg((Math.random() * 7) | 0, 3);
        for (let e = 0; e < 4; e++) a.pluck(t + e * 0.23, f, 0.2, 0.06 * Math.pow(0.5, e), 'sine');
      }
      if (s % 4 === 2 && Math.random() < 0.3) a.noiseHit(t, { dur: 0.3, bp: 500, q: 3, vol: 0.03 });
    }
  },
  // rooftop — wind + pirate radio arps
  rooftop: {
    bpm: 108,
    pattern(a, s, t) {
      const arp = [0, 4, 7, 11, 7, 4];
      if (s % 2 === 0 && (s % 32) < 12) a.pluck(t, deg(arp[(s / 2) % 6], 2), 0.16, 0.05, 'square');
      if (s % 16 === 0) a.sub(t, N(0, 0), 0.7, 0.1);
      if (s % 32 === 24) a.noiseHit(t, { dur: 0.5, bp: 3000, q: 0.7, vol: 0.03 }); // static burst
      if (s % 8 === 6 && Math.random() < 0.3) a.hat(t, false);
    }
  },
  // menu — weird slow wobble
  menu: {
    bpm: 70,
    pattern(a, s, t) {
      if (s % 16 === 0) a.acid(t, N(0, -1), { dur: 1.6, cutoff: 300, res: 8, vol: 0.15, slide: N(0, -1) * 1.02 });
      if (s % 32 === 8) a.stab(t, [N(0, 1), N(3, 1), N(8, 1)], 1.4, 0.03, 'triangle');
      if (s % 32 === 24) a.stab(t, [N(-2, 1), N(3, 1), N(7, 1)], 1.4, 0.03, 'triangle');
      if (s % 8 === 5 && Math.random() < 0.4) a.pluck(t, deg((Math.random() * 12) | 0, 2), 0.5, 0.03, 'sine');
    }
  },
  // chill room in clubs
  chill: {
    bpm: 88,
    pattern(a, s, t) {
      if (s % 8 === 0) a.kick(t, 0.4);
      if (s % 8 === 4) a.noiseHit(t, { dur: 0.12, bp: 1200, q: 2, vol: 0.05 });
      if (s % 32 === 2) a.stab(t, [N(0, 1), N(5, 1), N(10, 1)], 1.8, 0.035, 'sine');
      if (s % 32 === 18) a.stab(t, [N(3, 1), N(7, 1), N(12, 1)], 1.8, 0.03, 'sine');
      if (s % 16 === 0) a.sub(t, N(0, -1), 1.4, 0.18);
    }
  },
  // final DJ set — celebration hard mix
  finale: {
    bpm: 145,
    pattern(a, s, t) {
      if (s % 4 === 0) a.kick(t, 1.1);
      if (s % 2 === 1) a.hat(t, s % 8 === 3);
      if (s % 16 === 4 || s % 16 === 12) a.clap(t);
      const bl = [0, 12, 7, 10, 0, 12, 3, 7];
      a.acid(t, N(bl[s % 8]), { cutoff: 700 + 500 * Math.sin(s * 0.8), res: 16, vol: 0.24, dur: 0.1 });
      if (s % 8 === 0) a.sub(t, N(0, -1), 0.3, 0.42);
      if (s % 32 === 16) a.stab(t, [N(0, 2), N(3, 2), N(7, 2), N(10, 2)], 0.3, 0.08);
    }
  }
};

// mixtape variants — same engine, twisted knobs
TRACKS.mix1 = { bpm: 124, pattern: (a, s, t) => TRACKS.club1.pattern(a, (s + 8) % 64, t) };
TRACKS.mix2 = { bpm: 150, pattern: (a, s, t) => TRACKS.club2.pattern(a, (s * 2) % 64, t) };
TRACKS.mix3 = { bpm: 100, pattern: (a, s, t) => { TRACKS.street.pattern(a, s, t); if (s % 8 === 6) a.perc(t, 4000); } };
TRACKS.mix4 = { bpm: 84, pattern: (a, s, t) => { TRACKS.underpass.pattern(a, s, t); TRACKS.rooftop.pattern(a, (s + 16) % 64, t); } };
TRACKS.mix5 = { bpm: 136, pattern: (a, s, t) => { TRACKS.finale.pattern(a, s % 32, t); } };

/* ------------- AMBIENT BEDS (continuous loops) ------------- */
AudioEngine.prototype.setBed = function (name, vol, fade = 0.8) {
  if (!this.ready) return;
  const c = this.ctx;
  if (!this.beds[name]) {
    if (vol <= 0.001) return;
    // build the bed
    const g = c.createGain(); g.gain.value = 0; g.connect(this.bedGain);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter();
    let lfo = null, lg = null;
    if (name === 'city') { f.type = 'lowpass'; f.frequency.value = 240; }
    else if (name === 'wind') {
      f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
      lfo = c.createOscillator(); lfo.frequency.value = 0.13;
      lg = c.createGain(); lg.gain.value = 250;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    }
    else if (name === 'crowd') { f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
      lfo = c.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 2.3;
      lg = c.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    }
    else if (name === 'riverhum') { f.type = 'lowpass'; f.frequency.value = 400; }
    else { f.type = 'lowpass'; f.frequency.value = 800; }
    src.connect(f); f.connect(g); src.start();
    this.beds[name] = { g, src, lfo };
  }
  this.beds[name].g.gain.setTargetAtTime(vol, c.currentTime, fade);
};

/* ------------- SFX ------------- */
AudioEngine.prototype.sfx = function (name, opt = {}) {
  if (!this.ready) return;
  const c = this.ctx, t = c.currentTime, out = this.sfxGain;
  const S = this;
  const P = (f, dur, vol, type) => S.pluck(t, f, dur, vol, type || 'square', out);
  switch (name) {
    case 'click': P(880, 0.05, 0.12); break;
    case 'hover': P(1320, 0.03, 0.05); break;
    case 'error': P(220, 0.15, 0.1, 'sawtooth'); P(160, 0.2, 0.1, 'sawtooth'); break;
    case 'candy': P(660, 0.08, 0.12, 'sine'); S.pluck(t + 0.07, 990, 0.1, 0.12, 'sine', out); S.pluck(t + 0.15, 1320, 0.14, 0.1, 'sine', out); break;
    case 'pickup': P(520, 0.07, 0.1, 'triangle'); S.pluck(t + 0.06, 780, 0.1, 0.1, 'triangle', out); break;
    case 'achievement':
      [523, 659, 784, 1046].forEach((f, i) => S.pluck(t + i * 0.09, f, 0.22, 0.11, 'square', out));
      S.noiseHit(t + 0.35, { dur: 0.3, hp: 9000, vol: 0.06, out }); break;
    case 'rankup':
      [392, 523, 659, 784, 1046, 1318].forEach((f, i) => S.pluck(t + i * 0.08, f, 0.3, 0.12, 'square', out)); break;
    case 'jump': P(300, 0.09, 0.06, 'sine'); break;
    case 'land': S.noiseHit(t, { dur: 0.08, bp: 300, q: 1, vol: 0.2, out }); break;
    case 'landHard': S.noiseHit(t, { dur: 0.15, bp: 180, q: 1, vol: 0.4, out }); S.sub && S.pluck(t, 70, 0.2, 0.3, 'sine', out); break;
    case 'shutter': S.noiseHit(t, { dur: 0.03, hp: 4000, vol: 0.3, out }); S.noiseHit(t + 0.07, { dur: 0.05, hp: 3000, vol: 0.2, out }); break;
    case 'buzz': { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 90;
      g.gain.setValueAtTime(0.09, t); g.gain.setValueAtTime(0.09, t + (opt.dur || 0.4)); g.gain.exponentialRampToValueAtTime(0.001, t + (opt.dur || 0.4) + 0.03);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + (opt.dur || 0.4) + 0.1); break; }
    case 'door': S.noiseHit(t, { dur: 0.35, bp: 500, q: 0.8, vol: 0.16, out }); break;
    case 'talk': { const base = 160 + ((opt.seed || 1) * 57) % 220;
      for (let i = 0; i < 3; i++) S.pluck(t + i * 0.05, base * (1 + (Math.random() - 0.5) * 0.3), 0.05, 0.07, 'square', out); break; }
    case 'meow': { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.25);
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.32); break; }
    case 'spraycan': S.noiseHit(t, { dur: 0.12, bp: 2000, q: 0.4, vol: 0.12, out }); break;
    case 'rattle': for (let i = 0; i < 4; i++) S.noiseHit(t + i * 0.06, { dur: 0.03, bp: 3400, q: 3, vol: 0.14, out }); break;
    case 'tagdone': [660, 880, 1100].forEach((f, i) => S.pluck(t + i * 0.06, f, 0.14, 0.1, 'triangle', out)); break;
    case 'rhythmhit': P(980 + (opt.combo || 0) * 60, 0.08, 0.1, 'square'); break;
    case 'rhythmmiss': P(180, 0.2, 0.1, 'sawtooth'); break;
    case 'dronehum': { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 140;
      g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.55); break; }
    case 'alarm': [880, 660, 880, 660].forEach((f, i) => S.pluck(t + i * 0.12, f, 0.1, 0.08, 'square', out)); break;
    case 'phone': [1200, 0, 1200].forEach((f, i) => f && S.pluck(t + i * 0.1, f, 0.07, 0.08, 'sine', out)); break;
    case 'ending': [261, 329, 392, 523, 659, 784, 1046].forEach((f, i) => S.pluck(t + i * 0.14, f, 0.5, 0.1, 'triangle', out)); break;
  }
};

// footsteps: surface-aware
AudioEngine.prototype.footstep = function (surface = 'concrete') {
  if (!this.ready) return;
  const t = this.ctx.currentTime;
  const cfg = {
    concrete: { bp: 400, vol: 0.09, dur: 0.05 },
    metal: { bp: 1200, vol: 0.11, dur: 0.09 },
    interior: { bp: 250, vol: 0.07, dur: 0.04 },
    grass: { bp: 700, vol: 0.05, dur: 0.07 }
  }[surface] || { bp: 400, vol: 0.09, dur: 0.05 };
  this.noiseHit(t, { dur: cfg.dur, bp: cfg.bp, q: 1.4, vol: cfg.vol, out: this.sfxGain });
  if (surface === 'metal') this.pluck(t, 180 + Math.random() * 60, 0.08, 0.03, 'sine', this.sfxGain);
};

// continuous spray loop while holding E
AudioEngine.prototype.sprayLoop = function (on) {
  if (!this.ready) return;
  const c = this.ctx;
  if (on && !this._spray) {
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0.14;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start();
    this._spray = { src, g };
  } else if (!on && this._spray) {
    this._spray.g.gain.setTargetAtTime(0, c.currentTime, 0.04);
    const s = this._spray.src; setTimeout(() => { try { s.stop(); } catch (e) { } }, 200);
    this._spray = null;
  }
};

export const audio = new AudioEngine();
export { TRACKS };
