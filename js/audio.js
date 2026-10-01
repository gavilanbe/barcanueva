// Sonido chiptune mínimo con WebAudio: efectos y un secuenciador de melodías por zona.
let ac = null, master = null, musicGain = null, cur = null, timer = null;
export const audio = { muted: false };

function ensure() {
  if (ac) return ac;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.18; master.connect(ac.destination); musicGain = ac.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master); } catch (e) { ac = null; }
  return ac;
}
addEventListener('keydown', () => { ensure(); ac?.resume(); }, { once: false });
addEventListener('touchstart', () => { ensure(); ac?.resume(); }, { once: false });

function tone(freq, dur, type = 'square', vol = 0.3, when = 0, dest = null, slide = 0) {
  if (!ac || audio.muted) return;
  const t = ac.currentTime + when; const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, when = 0) {
  if (!ac || audio.muted) return;
  const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = b; const g = ac.createGain(); g.gain.setValueAtTime(vol, ac.currentTime + when); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
  s.connect(g); g.connect(master); s.start(ac.currentTime + when);
}

export function sfx(n) {
  if (!ensure()) return;
  switch (n) {
    case 'blip': tone(880, 0.04, 'square', 0.12); break;
    case 'move': tone(660, 0.03, 'square', 0.1); break;
    case 'ok': tone(990, 0.05, 'square', 0.15); tone(1320, 0.07, 'square', 0.12, 0.05); break;
    case 'back': tone(440, 0.06, 'square', 0.12); break;
    case 'no': tone(160, 0.12, 'square', 0.15); break;
    case 'tick': tone(1200 + Math.random() * 400, 0.02, 'triangle', 0.12); break;
    case 'good': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.1, 'square', 0.14, i * 0.07)); break;
    case 'bad': [392, 330, 262].forEach((f, i) => tone(f, 0.14, 'square', 0.14, i * 0.09)); break;
    case 'hit': noise(0.12, 0.35); tone(140, 0.1, 'square', 0.2, 0, null, 0.5); break;
    case 'crit': noise(0.2, 0.4); tone(880, 0.2, 'sawtooth', 0.18, 0, null, 0.3); break;
    case 'magic': [660, 880, 1100, 1320, 1760].forEach((f, i) => tone(f, 0.12, 'triangle', 0.15, i * 0.04)); break;
    case 'door': tone(220, 0.08, 'square', 0.12); tone(330, 0.08, 'square', 0.12, 0.08); break;
    case 'bump': tone(90, 0.06, 'square', 0.12); break;
    case 'coin': tone(1320, 0.05, 'square', 0.12); tone(1760, 0.12, 'square', 0.12, 0.05); break;
    case 'level': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, 'square', 0.14, i * 0.09)); break;
    case 'heart': tone(784, 0.1, 'triangle', 0.18); tone(1046, 0.18, 'triangle', 0.18, 0.1); break;
    case 'splash': noise(0.25, 0.25); break;
    case 'bell': [0, 0.5, 1].forEach((w) => { tone(392, 1.2, 'triangle', 0.18, w); tone(784, 0.8, 'sine', 0.08, w); }); break;
  }
}

// Canciones: notas en semitonos desde A4 (null = silencio); [melodía, bajo, tempo]
const S = (s) => s.split(' ').map((x) => (x === '.' ? null : +x));
const SONGS = {
  ciudad: { tempo: 150, mel: S('3 . 7 . 10 . 8 7 5 . 3 . 5 7 8 . 10 . 12 10 8 . 7 . 5 . 3 . 2 . 3 .'), bass: S('-21 . -14 . -18 . -14 . -16 . -9 . -14 . -9 .') },
  noche: { tempo: 96, mel: S('0 . . 3 . 5 7 . . 5 3 . 2 . . . -2 . 0 . 3 . 2 . 0 . . . . . . .'), bass: S('-24 . . . -19 . . . -22 . . . -17 . . .') },
  campo: { tempo: 132, mel: S('7 . 9 11 12 . 11 9 7 . 4 . 5 7 9 . 7 . 5 4 2 . 4 5 7 . . . 5 . 4 .'), bass: S('-17 . -10 . -15 . -8 . -19 . -12 . -17 . -12 .') },
  bosque: { tempo: 110, mel: S('2 . 5 . 9 . 7 5 4 . 2 . 0 . 2 . 5 . 4 2 0 . -3 . 2 . . . . . . .'), bass: S('-22 . . -15 . . -19 . . -17 . . -22 . . .') },
  castillo: { tempo: 100, mel: S('0 . 0 3 7 . 5 3 2 . 3 . 5 . . . 7 . 8 7 5 . 3 2 0 . . . . . . .'), bass: S('-24 . -17 . -21 . -14 . -19 . -12 . -24 . -17 .') },
  iglesia: { tempo: 70, mel: S('0 . . . 4 . . . 7 . . . 5 . 4 . 2 . . . 4 . . . 0 . . . . . . .'), bass: S('-24 . . . . . . . -19 . . . . . . .') },
  batalla: { tempo: 180, mel: S('0 0 3 0 5 0 6 5 3 . 0 . -2 . 0 . 0 0 3 0 5 0 7 5 6 . 5 . 3 . 2 .'), bass: S('-24 -12 -24 -12 -21 -9 -21 -9 -26 -14 -26 -14 -19 -7 -19 -7') },
  taberna: { tempo: 170, mel: S('7 5 4 5 7 . 7 . 9 7 5 7 9 . 9 . 12 11 9 7 5 . 4 . 2 4 5 7 5 . . .'), bass: S('-17 -10 -12 -10 -15 -8 -12 -8 -17 -10 -12 -10 -19 -12 -17 .') },
};
const hz = (n) => 440 * Math.pow(2, n / 12);

export function music(name) {
  if (cur === name) return; cur = name; clearInterval(timer); timer = null;
  if (!name || !SONGS[name]) return;
  const s = SONGS[name]; let step = 0; const dt = 60 / s.tempo / 2;
  timer = setInterval(() => {
    if (!ensure() || audio.muted || ac.state !== 'running') { step++; return; }
    const m = s.mel[step % s.mel.length]; if (m !== null) tone(hz(m), dt * 1.8, 'square', 0.07, 0, musicGain);
    if (step % 2 === 0) { const b = s.bass[(step / 2) % s.bass.length]; if (b !== null) tone(hz(b), dt * 3.5, 'triangle', 0.16, 0, musicGain); }
    step++;
  }, dt * 1000);
}
