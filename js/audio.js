// Sonido chiptune con WebAudio: ondas de pulso (12,5 %, 25 %, 50 %), triángulo y ruido; efectos, voces de
// los personajes, pasos por terreno, ambiente por zona y un secuenciador de música con programación anticipada.
let ac = null, master = null, musicGain = null, sfxGain = null, echoIn = null, noiseBuf = null, waves = {};
export const audio = { muted: false, musicVol: 0.5, sfxVol: 1 };

function ensure() {
  if (ac) return ac;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0.2; master.connect(comp);
    musicGain = ac.createGain(); musicGain.gain.value = audio.musicVol; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = audio.sfxVol; sfxGain.connect(master);
    // Eco suave (reverberación de cartucho)
    echoIn = ac.createGain(); echoIn.gain.value = 0.22; const dl = ac.createDelay(1); dl.delayTime.value = 0.19; const fb = ac.createGain(); fb.gain.value = 0.32; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    echoIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const duty of [0.125, 0.25, 0.5]) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); waves[duty] = ac.createPeriodicWave(re, im); }
  } catch (e) { ac = null; }
  return ac;
}
const wake = () => { ensure(); if (ac && ac.state !== 'running') ac.resume(); };
addEventListener('keydown', wake); addEventListener('touchstart', wake); addEventListener('mousedown', wake);
export function setMuted(m) { audio.muted = m; if (master) master.gain.value = m ? 0 : 0.2; }
export function setMusicVol(v) { audio.musicVol = v; if (musicGain) musicGain.gain.value = v; }
try { const pr = JSON.parse(localStorage.getItem('barcanueva_prefs') || '{}'); if (pr.music !== undefined) audio.musicVol = pr.music; if (pr.muted) audio.muted = true; } catch (e) { }

// Oscilador con envolvente. type: 'p12' | 'p25' | 'p50' | 'triangle' | 'sine' | 'sawtooth'
function tone(freq, dur, type = 'p50', vol = 0.3, when = 0, dest = null, slide = 0, o = {}) {
  if (!ac || audio.muted) return;
  const t = (o.at ?? ac.currentTime) + when; const osc = ac.createOscillator(); const g = ac.createGain();
  if (type[0] === 'p' && waves[{ p12: 0.125, p25: 0.25, p50: 0.5 }[type]]) osc.setPeriodicWave(waves[{ p12: 0.125, p25: 0.25, p50: 0.5 }[type]]); else osc.type = type === 'p50' ? 'square' : type;
  osc.frequency.setValueAtTime(freq, t); if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  if (o.vib) { const l = ac.createOscillator(); const lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * 0.012; l.connect(lg); lg.connect(osc.frequency); l.start(t + 0.08); l.stop(t + dur + 0.05); }
  const a = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
  if (o.sustain) { g.gain.setValueAtTime(vol, t + dur * o.sustain); }
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  osc.connect(g); g.connect(dest || sfxGain); if (o.echo && echoIn) g.connect(echoIn);
  osc.start(t); osc.stop(t + dur + 0.03);
}
function noise(dur, vol = 0.2, when = 0, o = {}) {
  if (!ac || audio.muted) return;
  const t = (o.at ?? ac.currentTime) + when; const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = o.rate || 1;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  let node = s;
  if (o.hp || o.lp || o.bp) { const f = ac.createBiquadFilter(); f.type = o.hp ? 'highpass' : o.lp ? 'lowpass' : 'bandpass'; f.frequency.setValueAtTime(o.hp || o.lp || o.bp, t); if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur); if (o.q) f.Q.value = o.q; s.connect(f); node = f; }
  node.connect(g); g.connect(o.dest || sfxGain); if (o.echo && echoIn) g.connect(echoIn);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
}
const hz = (n) => 440 * Math.pow(2, n / 12);

export function sfx(n, k = 1) {
  if (!ensure() || audio.muted) return;
  switch (n) {
    // Interfaz
    case 'blip': tone(880, 0.04, 'p25', 0.1); break;
    case 'move': tone(1046, 0.03, 'p25', 0.07); tone(1318, 0.03, 'p25', 0.04, 0.02); break;
    case 'ok': tone(988, 0.05, 'p25', 0.12); tone(1480, 0.08, 'p25', 0.1, 0.045, null, 0, { echo: 1 }); break;
    case 'back': tone(660, 0.05, 'p25', 0.1); tone(440, 0.07, 'p25', 0.08, 0.04); break;
    case 'no': tone(140, 0.09, 'p50', 0.14); tone(120, 0.12, 'p50', 0.12, 0.08); break;
    case 'type': tone(1900 + Math.random() * 200, 0.012, 'triangle', 0.035); break;
    case 'page': tone(1320, 0.03, 'p12', 0.06); break;
    case 'next': tone(1568, 0.04, 'p12', 0.07); tone(2093, 0.05, 'p12', 0.05, 0.035); break;
    case 'open': [523, 784, 1046].forEach((f, i) => tone(f, 0.06, 'p25', 0.06, i * 0.025)); break;
    case 'close': [1046, 784, 523].forEach((f, i) => tone(f, 0.05, 'p25', 0.05, i * 0.02)); break;
    case 'banner': [659, 880, 1318].forEach((f, i) => tone(f, 0.18, 'triangle', 0.08, i * 0.06, null, 0, { echo: 1 })); break;
    case 'tick': tone(1200 + Math.random() * 500, 0.02, 'triangle', 0.08); break;
    case 'land': noise(0.05, 0.16, 0, { lp: 1800 }); tone(220, 0.06, 'triangle', 0.18, 0, null, 0.6); break;
    case 'pulse': [1318, 1760, 2637].forEach((f, i) => tone(f, 0.12, 'p25', 0.08, i * 0.03, null, 0, { echo: 1 })); break;
    case 'good': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.11, 'p25', 0.11, i * 0.06, null, 0, { echo: 1 })); break;
    case 'bad': [392, 349, 262].forEach((f, i) => tone(f, 0.15, 'p50', 0.1, i * 0.08)); break;
    case 'crit_roll': [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.16, 'p25', 0.11, i * 0.05, null, 0, { echo: 1 })); noise(0.3, 0.08, 0.1, { hp: 6000 }); break;
    case 'fumble': tone(330, 0.35, 'p50', 0.13, 0, null, 0.35); tone(220, 0.4, 'triangle', 0.15, 0.05, null, 0.4); break;
    case 'coin': tone(1318, 0.05, 'p25', 0.11); tone(1976, 0.14, 'p25', 0.1, 0.05, null, 0, { echo: 1 }); break;
    case 'buy': sfx('coin'); tone(2637, 0.08, 'p12', 0.05, 0.12); break;
    case 'equip': noise(0.06, 0.12, 0, { bp: 3000, q: 2 }); tone(660, 0.08, 'p25', 0.08, 0.04); tone(990, 0.1, 'p25', 0.08, 0.09); break;
    case 'level': [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.14, 'p25', 0.12, i * 0.075, null, 0, { echo: 1, vib: i === 7 })); [131, 165, 196, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, i * 0.15)); break;
    case 'heart': tone(784, 0.1, 'triangle', 0.16); tone(1046, 0.2, 'triangle', 0.16, 0.1, null, 0, { echo: 1 }); break;
    case 'learn': [880, 1175, 1480].forEach((f, i) => tone(f, 0.12, 'triangle', 0.1, i * 0.05, null, 0, { echo: 1 })); break;
    case 'item': [784, 1046, 1318].forEach((f, i) => tone(f, 0.08, 'p25', 0.09, i * 0.05)); break;
    // Mundo
    case 'door': noise(0.12, 0.1, 0, { lp: 900 }); tone(196, 0.08, 'triangle', 0.14); tone(147, 0.12, 'triangle', 0.12, 0.08); break;
    case 'bump': tone(90, 0.07, 'triangle', 0.16); noise(0.04, 0.06, 0, { lp: 600 }); break;
    case 'splash': noise(0.3, 0.18, 0, { bp: 1200, sweep: 300 }); tone(500, 0.1, 'sine', 0.06, 0, null, 0.5); break;
    case 'bell': [0, 0.6, 1.2].forEach((w) => { tone(392, 1.6, 'triangle', 0.14, w, null, 0, { echo: 1 }); tone(784, 1.0, 'sine', 0.06, w); tone(988, 0.6, 'sine', 0.03, w); }); break;
    case 'rustle': noise(0.12, 0.07, 0, { bp: 3500, q: 0.8 }); break;
    case 'flap': for (let i = 0; i < 4; i++) noise(0.04, 0.07, i * 0.06, { bp: 900 + i * 100 }); break;
    case 'pop': tone(600, 0.05, 'p25', 0.08, 0, null, 1.8); break;
    case 'emote': tone(1568, 0.04, 'p12', 0.06); tone(2093, 0.06, 'p12', 0.05, 0.04); break;
    case 'alert': tone(1760, 0.05, 'p25', 0.12); tone(2349, 0.12, 'p25', 0.12, 0.05, null, 0, { echo: 1 }); break;
    // Combate
    case 'hit': noise(0.12, 0.3, 0, { lp: 2400 }); tone(150, 0.12, 'p50', 0.18, 0, null, 0.45); break;
    case 'hit2': noise(0.18, 0.35, 0, { lp: 3000 }); tone(110, 0.2, 'p50', 0.2, 0, null, 0.4); tone(70, 0.25, 'triangle', 0.22, 0.02, null, 0.6); break;
    case 'crit': noise(0.25, 0.36, 0, { lp: 5000 }); tone(880, 0.2, 'sawtooth', 0.12, 0, null, 0.3); tone(60, 0.3, 'triangle', 0.25, 0.02, null, 0.5); break;
    case 'whoosh': noise(0.14, 0.12, 0, { bp: 800, sweep: 3200, q: 1.2 }); break;
    case 'swing': noise(0.1, 0.1, 0, { bp: 2400, sweep: 600, q: 1.5 }); break;
    case 'miss': noise(0.16, 0.08, 0, { bp: 1800, sweep: 500 }); tone(330, 0.1, 'triangle', 0.06, 0.04, null, 0.7); break;
    case 'parry': tone(2093, 0.18, 'p25', 0.12, 0, null, 0, { echo: 1 }); tone(3136, 0.12, 'p12', 0.08, 0.01); noise(0.08, 0.15, 0, { hp: 4000 }); break;
    case 'perfect': [2093, 2637, 3136, 4186].forEach((f, i) => tone(f, 0.12, 'p12', 0.08, i * 0.035, null, 0, { echo: 1 })); noise(0.06, 0.18, 0, { hp: 5000 }); break;
    case 'block': noise(0.1, 0.18, 0, { bp: 1500 }); tone(392, 0.1, 'p50', 0.1, 0, null, 0.8); break;
    case 'dodge': noise(0.12, 0.08, 0, { bp: 2600, sweep: 900 }); break;
    case 'early': tone(196, 0.12, 'p50', 0.09); break;
    case 'counter': [1175, 1568, 2349].forEach((f, i) => tone(f, 0.08, 'p25', 0.1, i * 0.03)); sfx('hit'); break;
    case 'charge': tone(220, 0.5, 'sawtooth', 0.06, 0, null, 3); noise(0.5, 0.05, 0, { bp: 500, sweep: 4000 }); break;
    case 'fire': noise(0.4, 0.2, 0, { lp: 1200, sweep: 300 }); tone(110, 0.3, 'sawtooth', 0.08, 0, null, 0.5); break;
    case 'ice': [2637, 3136, 3520, 4186].forEach((f, i) => tone(f, 0.15, 'triangle', 0.06, i * 0.04, null, 0, { echo: 1 })); noise(0.2, 0.08, 0, { hp: 6000 }); break;
    case 'thunder': noise(0.6, 0.35, 0, { lp: 800, sweep: 120 }); tone(55, 0.6, 'sawtooth', 0.12, 0, null, 0.6); noise(0.08, 0.3, 0, { hp: 3000 }); break;
    case 'heal': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, i * 0.06, null, 0, { echo: 1 })); break;
    case 'holy': [523, 784, 1046, 1568].forEach((f, i) => tone(f, 0.6, 'sine', 0.07, i * 0.04, null, 0, { echo: 1 })); break;
    case 'charm': [784, 988, 1175, 988, 1318].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.08, null, 0, { echo: 1 })); break;
    case 'magic': [660, 880, 1100, 1320, 1760].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, i * 0.04, null, 0, { echo: 1 })); break;
    case 'roar': noise(0.7, 0.3, 0, { lp: 700, sweep: 200 }); tone(80, 0.7, 'sawtooth', 0.14, 0, null, 0.7); break;
    case 'growl': noise(0.4, 0.15, 0, { lp: 400 }); tone(70, 0.4, 'sawtooth', 0.08, 0, null, 0.8); break;
    case 'screech': tone(1800, 0.25, 'sawtooth', 0.06, 0, null, 0.6); noise(0.2, 0.08, 0, { hp: 3000 }); break;
    case 'steal': [1568, 1318, 1046].forEach((f, i) => tone(f, 0.06, 'p25', 0.08, i * 0.05)); break;
    case 'down': tone(392, 0.5, 'triangle', 0.14, 0, null, 0.25); noise(0.3, 0.12, 0.1, { lp: 600 }); break;
    case 'heartbeat': tone(55, 0.12, 'sine', 0.3); tone(50, 0.14, 'sine', 0.24, 0.16); break;
    case 'rauxa': noise(0.35, 0.22, 0, { lp: 2000, sweep: 6000 }); [220, 330, 440, 660].forEach((f, i) => tone(f, 0.18, 'sawtooth', 0.07, i * 0.04)); break;
    case 'seny': [659, 988, 1318, 1976].forEach((f, i) => tone(f, 0.5, 'sine', 0.06, i * 0.07, null, 0, { echo: 1 })); break;
    case 'flee': for (let i = 0; i < 4; i++) noise(0.05, 0.08, i * 0.07, { bp: 1500 }); break;
    case 'victory': jingle('victoria'); break;
    case 'defeat': jingle('derrota'); break;
    case 'encounter': [880, 1175, 880, 1175, 1568].forEach((f, i) => tone(f, 0.06, 'p25', 0.1, i * 0.045)); break;
  }
}

// Voz de los personajes: un pulso corto cuyo tono depende del hablante y varía con la letra.
export function voice(v, ch) {
  if (!ensure() || audio.muted) return;
  const vow = 'aeiouáéíóú'.indexOf(ch.toLowerCase()); const f = v.f * (1 + (vow >= 0 ? (vow % 5) * 0.035 : 0.02) + (Math.random() - 0.5) * v.jit);
  tone(f, 0.045, v.wave === 'square' ? 'p50' : v.wave === 'triangle' ? 'triangle' : 'p25', v.wave === 'triangle' ? 0.09 : 0.05);
}
// Pasos según el terreno
export function step(kind) {
  if (!ensure() || audio.muted) return;
  if (kind === 'grass') noise(0.05, 0.035, 0, { bp: 2600, q: 0.7 });
  else if (kind === 'stone') { noise(0.03, 0.05, 0, { hp: 2500 }); tone(320 + Math.random() * 40, 0.02, 'triangle', 0.03); }
  else if (kind === 'wood') { tone(180 + Math.random() * 20, 0.04, 'triangle', 0.07); noise(0.03, 0.03, 0, { lp: 1200 }); }
  else if (kind === 'sand') noise(0.07, 0.035, 0, { lp: 1800 });
  else if (kind === 'water') noise(0.12, 0.07, 0, { bp: 900, sweep: 400 });
  else if (kind === 'snow') noise(0.08, 0.05, 0, { lp: 900 });
  else noise(0.04, 0.035, 0, { bp: 1400 });
}

// ───────────── Música ─────────────
// Pistas por pasos de semicorchea. Notas en semitonos desde La4 (null = silencio). Cada canción:
// mel (melodía, pulso 25 %), bass (triángulo), arp (acordes arpegiados), drum ('k' bombo, 's' caja, 'h' charles, '.' nada).
const N = (s) => s.split(' ').map((x) => (x === '.' ? null : x === '-' ? '-' : +x));
const SONGS = {
  ciudad: { tempo: 150, res: 2, mel: N('3 . 7 . 10 . 8 7 5 . 3 . 5 7 8 . 10 . 12 10 8 . 7 . 5 . 3 . 2 . 3 .'), bass: N('-21 . -14 . -18 . -14 . -16 . -9 . -14 . -9 .'), chords: [[0, 4, 7], [0, 3, 7], [0, 4, 7], [0, 5, 9]], drum: 'k.h.s.h.k.h.s.hh', swing: 0.08 },
  noche: { tempo: 96, res: 2, mel: N('0 . . 3 . 5 7 . . 5 3 . 2 . . . -2 . 0 . 3 . 2 . 0 . . . . . . .'), bass: N('-24 . . . -19 . . . -22 . . . -17 . . .'), chords: [[0, 3, 7], [0, 3, 7]], drum: '', arpVol: 0.5 },
  campo: { tempo: 132, res: 2, mel: N('7 . 9 11 12 . 11 9 7 . 4 . 5 7 9 . 7 . 5 4 2 . 4 5 7 . . . 5 . 4 .'), bass: N('-17 . -10 . -15 . -8 . -19 . -12 . -17 . -12 .'), chords: [[0, 4, 7], [0, 4, 7], [0, 3, 7], [0, 4, 7]], drum: 'k...h...k.k.h...', swing: 0.12 },
  bosque: { tempo: 110, res: 2, mel: N('2 . 5 . 9 . 7 5 4 . 2 . 0 . 2 . 5 . 4 2 0 . -3 . 2 . . . . . . .'), bass: N('-22 . . -15 . . -19 . . -17 . . -22 . . .'), chords: [[0, 3, 7], [0, 3, 7], [0, 4, 7]], drum: 'k.......h.......', arpVol: 0.7 },
  castillo: { tempo: 100, res: 2, mel: N('0 . 0 3 7 . 5 3 2 . 3 . 5 . . . 7 . 8 7 5 . 3 2 0 . . . . . . .'), bass: N('-24 . -17 . -21 . -14 . -19 . -12 . -24 . -17 .'), chords: [[0, 3, 7], [0, 3, 8], [0, 3, 7], [0, 4, 7]], drum: 'k...s...k.k.s...' },
  iglesia: { tempo: 70, res: 2, mel: N('0 . . . 4 . . . 7 . . . 5 . 4 . 2 . . . 4 . . . 0 . . . . . . .'), bass: N('-24 . . . . . . . -19 . . . . . . .'), chords: [[0, 4, 7], [0, 5, 9]], drum: '', lead: 'triangle', arpVol: 0.4 },
  batalla: { tempo: 176, res: 2, mel: N('0 0 3 0 5 0 6 5 3 . 0 . -2 . 0 . 0 0 3 0 5 0 7 5 6 . 5 . 3 . 2 .'), bass: N('-24 -12 -24 -12 -21 -9 -21 -9 -26 -14 -26 -14 -19 -7 -19 -7'), chords: [[0, 3, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]], drum: 'k.hsk.hsk.hsk.ss' },
  jefe: { tempo: 160, res: 2, mel: N('0 . 1 . 0 . -1 . 0 3 6 . 5 3 1 . 0 . 1 . 3 . 6 . 7 6 5 3 1 . -1 .'), bass: N('-24 -24 -12 -24 -23 -23 -11 -23 -24 -24 -12 -24 -22 -22 -10 -22'), chords: [[0, 3, 6], [0, 3, 7]], drum: 'kshskshskkshskss' },
  taberna: { tempo: 170, res: 2, mel: N('7 5 4 5 7 . 7 . 9 7 5 7 9 . 9 . 12 11 9 7 5 . 4 . 2 4 5 7 5 . . .'), bass: N('-17 -10 -12 -10 -15 -8 -12 -8 -17 -10 -12 -10 -19 -12 -17 .'), chords: [[0, 4, 7], [0, 4, 7], [0, 5, 9], [0, 4, 7]], drum: 'k.hhs.hhk.hhs.hh', swing: 0.15 },
};
const JINGLES = {
  victoria: { tempo: 160, notes: [[7, 1], [7, 1], [7, 1], [7, 3], [3, 3], [5, 3], [7, 2], [5, 1], [7, 6]], bass: [-17, -17, -17, -17, -21, -19, -17, -19, -17] },
  derrota: { tempo: 70, notes: [[3, 2], [2, 2], [0, 2], [-2, 2], [-5, 6]], bass: [-21, -22, -24, -26, -29] },
};
let cur = null, timer = null, nextT = 0, stepN = 0;
// Pistas grabadas (audio/<nombre>.mp3 con puntos de bucle en audio/musica.json). Si no existen, suena el secuenciador.
let manifest = null; fetch('audio/musica.json').then((r) => (r.ok ? r.json() : null)).then((j) => { manifest = j || {}; }).catch(() => { manifest = {}; });
const buffers = new Map(); let fileSrc = null, fileGain = null;
function loadTrack(name) {
  if (buffers.has(name)) return buffers.get(name);
  const pr = fetch(`audio/${name}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => (ab && ensure() ? new Promise((res) => ac.decodeAudioData(ab, res, () => res(null))) : null)).catch(() => null);
  const entry = { pr, buf: undefined }; pr.then((b) => { entry.buf = b || null; }); buffers.set(name, entry); return entry;
}
function stopFile(fade = 0.6) {
  if (!fileSrc || !ac) return; const g = fileGain, s = fileSrc; const t = ac.currentTime;
  try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + fade); s.stop(t + fade + 0.05); } catch (e) { }
  fileSrc = null; fileGain = null;
}
function playFile(name, buf) {
  stopFile(0.5); clearTimeout(timer); timer = null;
  const s = ac.createBufferSource(); s.buffer = buf; const m = manifest?.[name] || {};
  if (m.loop !== false && name !== 'victoria') { s.loop = true; if (m.loopEnd) { s.loopStart = m.loopStart || 0; s.loopEnd = m.loopEnd; } }
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.linearRampToValueAtTime(1, ac.currentTime + 0.5);
  s.connect(g); g.connect(musicGain); s.start(ac.currentTime + 0.02);
  fileSrc = s; fileGain = g;
}
export function music(name) {
  if (cur === name) return; cur = name; clearTimeout(timer); timer = null;
  if (!name) { stopFile(); return; }
  if (!ensure()) { cur = null; return; }
  const e = loadTrack(name);
  if (e.buf) { playFile(name, e.buf); return; }
  stopFile();
  // mientras carga (o si no hay archivo), el secuenciador
  if (SONGS[name] || SONGS[FALLBACK[name]]) { nextT = ac.currentTime + 0.12; stepN = 0; schedule(); }
  if (e.buf === undefined) e.pr.then((b) => { if (b && cur === name) playFile(name, b); });
}
export function currentMusic() { return cur; }
const FALLBACK = { titulo: 'ciudad', victoria: null };
export function preloadMusic(names) { if (!ensure()) return; for (const n of names) loadTrack(n); }
function schedule() {
  const s = SONGS[cur] || SONGS[FALLBACK[cur]]; if (!s) return;
  const dt = 60 / s.tempo / 4; // semicorchea
  if (ac.state === 'running' && !audio.muted) {
    if (nextT < ac.currentTime - 0.25) nextT = ac.currentTime + 0.05; // si el hilo estuvo bloqueado, no recuperar notas atrasadas
    while (nextT < ac.currentTime + 0.15) { playStep(s, stepN, nextT, dt); nextT += dt; stepN++; }
  } else nextT = ac.currentTime + 0.1;
  timer = setTimeout(schedule, 30);
}
function playStep(s, n, t, dt) {
  const res = s.res || 2; // la melodía antigua va en corcheas: un paso de melodía = res semicorcheas
  const sw = s.swing && n % 2 ? dt * s.swing * 2 : 0; const at = t + sw;
  if (n % res === 0) {
    const i = (n / res) % s.mel.length; const m = s.mel[i];
    if (m !== null && m !== '-') { let len = 1; while (s.mel[(i + len) % s.mel.length] === null && len < 4) len++; tone(hz(m), dt * res * Math.min(len, 3) * 0.95, s.lead || 'p25', 0.06, 0, musicGain, 0, { at, vib: len > 1, sustain: 0.5, echo: 1 }); }
  }
  const br = (s.bassRes || 4) * (res / 2);
  if (n % br === 0) {
    const i = (n / br) % s.bass.length; const b = s.bass[i];
    if (b !== null) { tone(hz(b), dt * br * 0.92, 'triangle', 0.15, 0, musicGain, 0, { at, sustain: 0.6 }); s._root = b; }
  }
  // arpegio sobre la última nota del bajo, con el acorde de la frase
  if (s.chords && s._root !== undefined && n % 2 === 0) {
    const bar = Math.floor(n / 16) % s.chords.length; const ch = s.chords[bar]; const k = (n / 2) % ch.length;
    let an = s._root + 24 + ch[k]; if (an > 14) an -= 12;
    tone(hz(an), dt * 1.6, 'p12', 0.022 * (s.arpVol ?? 1), 0, musicGain, 0, { at });
  }
  if (s.drum) {
    const d = s.drum[n % s.drum.length];
    if (d === 'k') { tone(130, 0.09, 'sine', 0.3, 0, musicGain, 0.35, { at }); noise(0.03, 0.06, 0, { at, lp: 500, dest: musicGain }); }
    else if (d === 's') noise(0.1, 0.1, 0, { at, bp: 1800, q: 0.8, dest: musicGain });
    else if (d === 'h') noise(0.025, 0.04, 0, { at, hp: 7000, dest: musicGain });
  }
}
// Fanfarria corta (no repite): pausa la música y la recupera después.
export function jingle(name) {
  if (!ensure() || audio.muted) return;
  const fe = loadTrack(name);
  if (fe.buf) { // fanfarria grabada: baja la música un momento
    const prev = cur; const s = ac.createBufferSource(); s.buffer = fe.buf; const g = ac.createGain(); g.gain.value = 1; s.connect(g); g.connect(musicGain); s.start();
    if (fileGain) { const t = ac.currentTime; fileGain.gain.setValueAtTime(fileGain.gain.value, t); fileGain.gain.linearRampToValueAtTime(0.15, t + 0.2); fileGain.gain.setValueAtTime(0.15, t + fe.buf.duration); fileGain.gain.linearRampToValueAtTime(1, t + fe.buf.duration + 0.8); }
    else { cur = null; clearTimeout(timer); setTimeout(() => { if (cur === null && prev) music(prev); }, fe.buf.duration * 1000 + 300); }
    return fe.buf.duration * 1000;
  }
  const j = JINGLES[name]; if (!j) return;
  const prev = cur; cur = null; clearTimeout(timer);
  const beat = 60 / j.tempo / 2; let t = ac.currentTime + 0.05;
  j.notes.forEach(([n, len], i) => { tone(hz(n + 12), beat * len * 0.95, 'p25', 0.1, 0, musicGain, 0, { at: t, vib: len > 2, sustain: 0.6, echo: 1 }); tone(hz(n + 5), beat * len * 0.9, 'p12', 0.05, 0, musicGain, 0, { at: t }); if (j.bass[i] !== undefined) tone(hz(j.bass[i]), beat * len * 0.9, 'triangle', 0.15, 0, musicGain, 0, { at: t }); t += beat * len; });
  const total = (t - ac.currentTime) * 1000 + 400;
  setTimeout(() => { if (cur === null && prev) music(prev); }, total);
  return total;
}

// ───────────── Ambiente ─────────────
// Sonidos sueltos y bucles suaves según la zona y la hora: pájaros, grillos, olas, río, lluvia, fuego.
let amb = null, ambTimer = null, ambLoop = null;
export function ambient(kind) {
  if (amb === kind) return; amb = kind; clearInterval(ambTimer); stopLoop();
  if (!kind || !ensure()) return;
  if (kind.includes('rio')) startLoop(0.018, { bp: 700, q: 0.4 });
  if (kind.includes('lluvia')) startLoop(0.03, { hp: 2500 });
  if (kind.includes('costa')) startLoop(0.012, { lp: 500 });
  ambTimer = setInterval(() => {
    if (!ac || ac.state !== 'running' || audio.muted) return;
    const r = Math.random();
    if (kind.includes('pajaros') && r < 0.18) { const b = 2200 + Math.random() * 1600; const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tone(b * (1 + (i % 2) * 0.12), 0.05, 'sine', 0.025, i * 0.08, null, 1.15); }
    if (kind.includes('grillos') && r < 0.5) { const f = 4200 + Math.random() * 300; for (let i = 0; i < 3; i++) tone(f, 0.018, 'triangle', 0.012, i * 0.035); }
    if (kind.includes('costa') && r < 0.07) noise(2.4, 0.06, 0, { lp: 900, sweep: 300, attack: 1.1 });
    if (kind.includes('fuego') && r < 0.4) noise(0.02, 0.04, Math.random() * 0.2, { hp: 1500 });
    if (kind.includes('viento') && r < 0.05) noise(3, 0.03, 0, { bp: 400, sweep: 900, attack: 1.4 });
    if (kind.includes('gaviotas') && r < 0.04) tone(1400, 0.25, 'sawtooth', 0.012, 0, null, 0.7);
    if (kind.includes('buho') && r < 0.02) { tone(392, 0.25, 'sine', 0.03); tone(330, 0.4, 'sine', 0.03, 0.35); }
  }, 260);
}
function startLoop(vol, f) {
  if (!ac) return; const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const g = ac.createGain(); g.gain.value = audio.muted ? 0 : vol;
  const fl = ac.createBiquadFilter(); fl.type = f.hp ? 'highpass' : f.lp ? 'lowpass' : 'bandpass'; fl.frequency.value = f.hp || f.lp || f.bp; if (f.q) fl.Q.value = f.q;
  s.connect(fl); fl.connect(g); g.connect(sfxGain); s.start(); (ambLoop ||= []).push(s);
}
function stopLoop() { if (ambLoop) for (const s of ambLoop) { try { s.stop(); } catch (e) { } } ambLoop = null; }
