// Motor de «juice»: curvas, tweens y esperas por fotogramas, partículas, temblor, congelación de impacto,
// destellos, textos flotantes y transiciones de pantalla. Todo avanza en fx.update() (60 veces por segundo).
import { INK, alpha } from './pal.js';
import { bayer, ellipse, poly } from './px.js';

export const W = 240, H = 160;

// ───────────── Curvas ─────────────
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t, outQuad: (t) => t * (2 - t), inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t) => t * t * t, outCubic: (t) => 1 - (1 - t) ** 3, inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outQuart: (t) => 1 - (1 - t) ** 4, inExpo: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)), outExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inBack: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  outBackBig: (t) => 1 + 3.6 * (t - 1) ** 3 + 2.6 * (t - 1) ** 2,
  outElastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
// Progreso suavizado de un contador t sobre una duración (con retraso opcional).
export const prog = (t, dur, delay = 0, e = ease.outCubic) => e(clamp01((t - delay) / dur));

// ───────────── Tweens y esperas ─────────────
const tweens = []; const waits = [];
export function tween(obj, to, dur = 12, e = ease.outCubic, delay = 0) {
  return new Promise((res) => {
    const from = {}; for (const k in to) from[k] = obj[k];
    tweens.push({ obj, from, to, dur: Math.max(1, dur), e, t: -delay, res });
  });
}
export function wait(frames) { return new Promise((res) => waits.push({ n: Math.max(1, Math.round(frames)), res })); }
export function killTweens(obj) { for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].obj === obj) tweens.splice(i, 1); }

// ───────────── Estado global ─────────────
export const fx = {
  frame: 0, freezeN: 0, trauma: 0, shakeMax: 6, sx: 0, sy: 0,
  flashC: null, flashA: 0, flashD: 0.1,
  parts: [], texts: [],
  get frozen() { return this.freezeN > 0; },
  update() {
    this.frame++;
    // El temblor y el destello siguen aunque haya congelación: es lo que vende el impacto
    if (this.trauma > 0) {
      const a = this.trauma * this.trauma * this.shakeMax;
      this.sx = Math.round((Math.random() * 2 - 1) * a); this.sy = Math.round((Math.random() * 2 - 1) * a);
      this.trauma = Math.max(0, this.trauma - 0.045);
    } else { this.sx = this.sy = 0; }
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - this.flashD);
    if (this.freezeN > 0) { this.freezeN--; return; }
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t++; if (tw.t < 0) continue;
      const p = tw.e(Math.min(1, tw.t / tw.dur));
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * p;
      if (tw.t >= tw.dur) { tweens.splice(i, 1); tw.res(); }
    }
    for (let i = waits.length - 1; i >= 0; i--) if (--waits[i].n <= 0) { const w = waits[i]; waits.splice(i, 1); w.res(); }
    for (const p of this.parts) stepPart(p);
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.t++; t.y += t.vy; t.vy *= 0.9; }
    this.texts = this.texts.filter((t) => t.t < t.life);
    if (trans.on) stepTrans();
  },
};
export function shake(amount = 0.4, max = null) { fx.trauma = Math.min(1, fx.trauma + amount); if (max) fx.shakeMax = max; else fx.shakeMax = 6; }
export function freeze(frames = 4) { fx.freezeN = Math.max(fx.freezeN, frames); }
export function flash(color = '#ffffff', a = 0.8, frames = 10) { fx.flashC = color; fx.flashA = a; fx.flashD = a / Math.max(1, frames); }
export function drawFlash(ctx) { if (fx.flashA > 0.01) { ctx.fillStyle = alpha(fx.flashC, fx.flashA); ctx.fillRect(0, 0, W, H); } }

// ───────────── Partículas ─────────────
// layer: 'ground' (bajo las entidades), 'world' (sobre ellas), 'sky' (sobre todo el mundo), 'screen' (coordenadas de pantalla)
// kind: 'px' (cuadrado de size), 'puff' (círculo que crece), 'leaf', 'spark' (con estela), 'ring', 'drop', 'star', 'sprite'
export function spawn(o) {
  const p = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 1, life: 30, max: 0, size: 1, color: '#ffffff', kind: 'px', layer: 'world', t: 0, fade: true, ...o };
  p.max = p.max || p.life; fx.parts.push(p); if (fx.parts.length > 900) fx.parts.splice(0, fx.parts.length - 900); return p;
}
function stepPart(p) {
  p.t++; p.life--; p.vx = (p.vx + p.ax) * p.drag; p.vy = (p.vy + p.ay) * p.drag; p.x += p.vx; p.y += p.vy;
  if (p.kind === 'leaf') p.x += Math.sin((p.t + p.seed * 50) / 9) * 0.35;
  if (p.floor !== undefined && p.y > p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.6; if (Math.abs(p.vy) < 0.3) { p.vy = 0; p.ay = 0; } }
}
// Ráfaga radial
export function burst(x, y, n, o = {}) {
  const sp = o.speed || 1.5, cols = o.colors || ['#ffffff'];
  for (let i = 0; i < n; i++) {
    const a = (o.angle ?? 0) + (o.spread ?? Math.PI * 2) * (n > 1 ? i / n - 0.5 : 0) + (Math.random() - 0.5) * (o.jitter ?? 0.6);
    const v = sp * (0.4 + Math.random() * 0.8);
    spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: cols[i % cols.length], life: (o.life || 24) * (0.7 + Math.random() * 0.5), ...o, seed: Math.random() });
  }
}
export function drawParts(ctx, layer, cx = 0, cy = 0) {
  for (const p of fx.parts) {
    if (p.layer !== layer) continue;
    const x = Math.round(p.x - cx), y = Math.round(p.y - cy); if (x < -24 || y < -24 || x > W + 24 || y > H + 24) continue;
    const k = p.life / p.max; // 1 → 0
    if (p.fade && k < 0.35 && bayer(x, y) > k / 0.35) continue; // desvanecido tramado
    ctx.fillStyle = p.color;
    switch (p.kind) {
      case 'px': ctx.fillRect(x, y, p.size, p.size); break;
      case 'spark': ctx.fillRect(x, y, p.size, p.size); ctx.fillStyle = alpha(p.color, 0.5); ctx.fillRect(Math.round(x - p.vx), Math.round(y - p.vy), 1, 1); break;
      case 'puff': { const r = Math.max(1, Math.round(p.size * (1 + (1 - k) * 1.2))); ellipse(ctx, x, y, r, Math.max(1, Math.round(r * 0.8)), p.color); break; }
      case 'ring': { const r = Math.round(p.size * (1 + (1 - k) * 3)); ringPx(ctx, x, y, r, p.color); break; }
      case 'leaf': { const f = Math.floor((p.t + p.seed * 20) / 8) % 2; ctx.fillRect(x, y, f ? 2 : 1, f ? 1 : 2); if (p.color2) { ctx.fillStyle = p.color2; ctx.fillRect(x + (f ? 1 : 0), y, 1, 1); } break; }
      case 'drop': ctx.fillRect(x, y, 1, 2); break;
      case 'star': { const s = (Math.floor(p.t / 4) % 2) ? 1 : 2; ctx.fillRect(x - s + 1, y, s * 2 - 1, 1); ctx.fillRect(x, y - s + 1, 1, s * 2 - 1); break; }
      case 'sprite': if (p.img) ctx.drawImage(p.img, Math.round(x - p.img.width / 2), Math.round(y - p.img.height / 2)); break;
      case 'streak': ctx.fillRect(x, y, 1, p.size); break;
    }
  }
}
function ringPx(ctx, cx, cy, r, c) {
  ctx.fillStyle = c; let x = r, y = 0, e = 1 - r;
  while (x >= y) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) ctx.fillRect(cx + a, cy + b, 1, 1);
    y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
  }
}
export { ringPx };

// ───────────── Textos flotantes (daño, +XP, ¡CRÍTICO!) ─────────────
// draw: función (ctx, text, x, y, color, scale) que pinta el texto (la pone ui/font para no crear dependencias).
export function popText(x, y, text, o = {}) {
  const t = { x, y, text, color: o.color || '#ffffff', vy: o.vy ?? -1.6, t: 0, life: o.life || 50, big: !!o.big, layer: o.layer || 'screen', outline: o.outline || INK };
  fx.texts.push(t); return t;
}

// ───────────── Transiciones ─────────────
// kinds: fade, iris (círculo hacia cx,cy), diamond, wipe (dir), battle (persianas + destello), sleep (fundido lento), curtain
export const trans = { on: false, kind: 'fade', t: 0, dur: 20, phase: 'out', mid: null, res: null, cx: 120, cy: 80, dir: 'right', snap: null, hold: 0 };
export function transition(kind = 'fade', mid = null, o = {}) {
  // si ya había una en curso, se da por terminada (que nadie se quede esperando)
  if (trans.on && trans.res) { const r = trans.res; trans.res = null; if (trans.mid) { const f = trans.mid; trans.mid = null; try { f(); } catch (e) { } } r(); }
  return new Promise((res) => {
    Object.assign(trans, { on: true, waiting: false, kind, t: 0, phase: 'out', mid, res, dur: o.dur || ({ fade: 16, iris: 22, diamond: 22, wipe: 18, battle: 40, sleep: 50, curtain: 24 }[kind] || 20), cx: o.cx ?? 120, cy: o.cy ?? 80, dir: o.dir || 'right', hold: o.hold ?? 4, inKind: o.inKind || kind, snap: o.snap || null, durIn: o.durIn || null });
  });
}
function stepTrans() {
  trans.t++;
  if (trans.phase === 'out' && trans.t >= trans.dur) {
    trans.phase = 'hold'; trans.t = 0;
    const f = trans.mid; trans.mid = null; if (f) { try { const r = f(); if (r && r.then) { trans.waiting = true; r.then(() => { trans.waiting = false; }, (e) => { console.error(e); trans.waiting = false; }); } } catch (e) { console.error(e); } }
  } else if (trans.phase === 'hold' && trans.t >= trans.hold && !trans.waiting) {
    trans.phase = 'in'; trans.t = 0; trans.kind = trans.inKind; if (trans.durIn) trans.dur = trans.durIn;
  } else if (trans.phase === 'in' && trans.t >= trans.dur) {
    trans.on = false; const r = trans.res; trans.res = null; r && r();
  }
}
// Cobertura 0..1 (1 = pantalla cubierta)
function cover() { if (trans.phase === 'hold') return 1; const p = Math.min(1, trans.t / trans.dur); return trans.phase === 'out' ? p : 1 - p; }
export function drawTrans(ctx) {
  if (!trans.on) return;
  const c = cover(); const k = trans.kind; ctx.fillStyle = '#0c0812';
  if (k === 'fade' || k === 'sleep') {
    const e = k === 'sleep' ? ease.inOutQuad(c) : c;
    // fundido tramado a negro: más «pixel» que un alpha liso
    if (e >= 0.999) { ctx.fillRect(0, 0, W, H); return; }
    const step = 2;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (bayer(x >> 1, y >> 1) < e) ctx.fillRect(x, y, step, step);
    return;
  }
  if (k === 'iris') {
    const e = ease.inOutQuad(c); const R = Math.hypot(Math.max(trans.cx, W - trans.cx), Math.max(trans.cy, H - trans.cy)) + 4;
    const r = Math.round(R * (1 - e)); const cx = Math.round(trans.cx), cy = Math.round(trans.cy);
    for (let y = 0; y < H; y++) {
      const d = y - cy; if (Math.abs(d) >= r) { ctx.fillRect(0, y, W, 1); continue; }
      const w = Math.round(Math.sqrt(r * r - d * d)); ctx.fillRect(0, y, Math.max(0, cx - w), 1); ctx.fillRect(cx + w, y, Math.max(0, W - cx - w), 1);
    }
    // anillo dorado fino en el borde del iris
    if (r > 2 && r < R) { ctx.fillStyle = '#f0b030'; ringPx(ctx, cx, cy, r, '#f0b030'); }
    return;
  }
  if (k === 'diamond') {
    const S = 16;
    for (let gy = 0; gy <= H / S; gy++) for (let gx = 0; gx <= W / S; gx++) {
      const order = (gx + gy) / (W / S + H / S); const local = Math.max(0, Math.min(1, c * 1.8 - order * 0.8));
      const r = Math.round(local * S * 0.75); if (r <= 0) continue;
      const cx = gx * S + S / 2, cy = gy * S + S / 2;
      for (let j = -r; j <= r; j++) { const w = r - Math.abs(j); ctx.fillRect(cx - w, cy + j, w * 2 + 1, 1); }
    }
    return;
  }
  if (k === 'wipe') {
    const e = ease.inOutCubic(c); const d = trans.dir; const horiz = d === 'left' || d === 'right';
    const span = horiz ? W : H; const edge = Math.round(e * (span + 24)) - 12;
    for (let i = 0; i < (horiz ? H : W); i += 4) {
      const j = edge + Math.round(Math.sin(i * 0.7 + trans.t * 0.3) * 4) + ((i / 4) % 2 ? 3 : 0);
      const into = trans.phase === 'out' ? d : { left: 'right', right: 'left', up: 'down', down: 'up' }[d];
      if (horiz) { if (into === 'right') ctx.fillRect(0, i, j, 4); else ctx.fillRect(W - j, i, j, 4); }
      else { if (into === 'down') ctx.fillRect(i, 0, 4, j); else ctx.fillRect(i, H - j, 4, j); }
    }
    return;
  }
  if (k === 'battle') {
    // Fase de salida: la imagen congelada se rompe en persianas que huyen en direcciones alternas
    if (trans.phase === 'out' && trans.snap) {
      const p = trans.t / trans.dur; ctx.fillStyle = '#0c0812'; ctx.fillRect(0, 0, W, H);
      const B = 8;
      for (let y = 0; y < H; y += B) {
        const i = y / B; const dl = (i % 2 ? 1 : -1); const local = Math.max(0, p * 1.4 - (Math.abs(i - 10) / 10) * 0.35);
        const off = Math.round(ease.inCubic(Math.min(1, local)) * (W + 40)) * dl;
        ctx.drawImage(trans.snap, 0, y, W, B, off, y, W, B);
        if (local > 0.02 && local < 1) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(dl > 0 ? off - 3 : off + W, y, 3, B); }
      }
      // rombo de luz central
      const r = Math.round(ease.outCubic(p) * 26); ctx.fillStyle = alpha('#fff4c0', 0.9 * (1 - p));
      for (let j = -r; j <= r; j++) { const w = r - Math.abs(j); ctx.fillRect(W / 2 - w, H / 2 + j, w * 2 + 1, 1); }
      return;
    }
    if (trans.phase === 'hold') { ctx.fillRect(0, 0, W, H); return; }
    // Entrada: telón que se abre desde el centro en vertical, con el borde dorado
    const e = ease.outCubic(trans.t / trans.dur); const half = Math.round((H / 2) * (1 - e));
    ctx.fillRect(0, 0, W, half); ctx.fillRect(0, H - half, W, half);
    if (half > 0) { ctx.fillStyle = '#f0b030'; ctx.fillRect(0, half, W, 1); ctx.fillRect(0, H - half - 1, W, 1); }
    return;
  }
  if (k === 'curtain') {
    const e = ease.inOutCubic(c); const half = Math.round((W / 2) * e);
    ctx.fillRect(0, 0, half, H); ctx.fillRect(W - half, 0, half, H);
    ctx.fillStyle = '#7c1a2a'; for (let x = 0; x < half; x += 6) { ctx.fillRect(x, 0, 2, H); ctx.fillRect(W - x - 2, 0, 2, H); }
    return;
  }
}

// ───────────── Ayudas de dibujo de «juice» ─────────────
// Rombo de luz (destellos de selección y de impacto)
export function sparkle(ctx, x, y, r, color = '#ffffff') {
  ctx.fillStyle = color; x = Math.round(x); y = Math.round(y);
  ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1);
  if (r > 2) { ctx.fillRect(x - 1, y - 1, 3, 3); }
}
// Polígono estrella de impacto
export function starBurst(ctx, x, y, r1, r2, n, color, rot = 0) {
  const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n; const r = i % 2 ? r2 : r1; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  poly(ctx, pts, color);
}
