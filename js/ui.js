// Interfaz modal por promesas: await ui.say(), ui.choose(), ui.roll()... El mundo se congela mientras ui.busy.
// Todas las ventanas se abren y se cierran con animación; los diálogos escriben con voz, retrato que habla,
// pausas en la puntuación y códigos de color (^r … ^0, ver font.js).
import { drawText, wrap, textWidth, glyphs, drawGlyphs, drawOutlined, drawBig, bigWidth, RICH, RICH_DARK } from './font.js';
import { input } from './input.js';
import { bust } from './portraits.js';
import { sfx, voice } from './audio.js';
import { ease, prog, fx, shake, burst, sparkle, ringPx, spawn, drawParts, trans } from './fx.js';
import { INK, alpha } from './pal.js';
import { bayer, ellipse } from './px.js';

export const W = 240, H = 160;
// Preferencias (fuera de la partida guardada): velocidad del texto
export const prefs = { text: 1 };
try { Object.assign(prefs, JSON.parse(localStorage.getItem('barcanueva_prefs') || '{}')); } catch (e) { }
export function savePrefs() { try { localStorage.setItem('barcanueva_prefs', JSON.stringify(prefs)); } catch (e) { } }
// Tema: pergamino con marco de tinta y filete dorado
export const T = {
  ink: '#3a2430', inkS: '#e2cfa4', title: '#9c3a24', dim: '#a8947c',
  paper: '#f6eccc', paperL: '#fffaea', paperD: '#e6d4ac', edge: '#3a2228', gold: '#cc8a26', goldD: '#8a5a1c', goldL: '#fcd456',
  dark: '#21182c', darkL: '#33264a', darkEdge: '#0e0a14', cream: '#f8ecd0', sel: '#f8dc90', selD: '#d8a850',
};
let ICONS = null; import('./icons.js').then((m) => { ICONS = m; }).catch(() => {});
export const icon = (name) => { try { return ICONS?.uiIcon?.(name) || null; } catch (e) { return null; } };
export const itemIco = (id) => { try { return ICONS?.itemIcon?.(id) || null; } catch (e) { return null; } };

// ───────────── Paneles ─────────────
export function panel(ctx, x, y, w, h, style = 'paper') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w < 6 || h < 6) return;
  const dark = style === 'dark' || (style && style[0] === '#' && style !== T.paper && isDark(style));
  const fill = dark ? (style[0] === '#' ? style : T.dark) : style && style[0] === '#' ? style : T.paper;
  ctx.fillStyle = 'rgba(26,16,34,.4)'; ctx.fillRect(x + 2, y + h, w - 2, 1); ctx.fillRect(x + w, y + 2, 1, h - 2);
  ctx.fillStyle = dark ? T.darkEdge : T.edge; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = fill; ctx.fillRect(x + 2, y + 1, w - 4, h - 2); ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  const g = dark ? '#b07a26' : T.gold, gd = dark ? '#6a4418' : T.goldD;
  ctx.fillStyle = g; ctx.fillRect(x + 3, y + 2, w - 6, 1); ctx.fillRect(x + 2, y + 3, 1, h - 6);
  ctx.fillStyle = gd; ctx.fillRect(x + 3, y + h - 3, w - 6, 1); ctx.fillRect(x + w - 3, y + 3, 1, h - 6);
  ctx.fillStyle = dark ? T.darkL : T.paperL; ctx.fillRect(x + 3, y + 3, w - 6, 1);
  if (!dark && w > 20 && h > 14) { // motas del pergamino (deterministas, no parpadean)
    ctx.fillStyle = T.paperD; const n = Math.min(40, (w * h) >> 7);
    for (let i = 0; i < n; i++) { const a = hash3(x, y, i), b = hash3(y, w, i + 9); ctx.fillRect(x + 4 + Math.floor(a * (w - 8)), y + 5 + Math.floor(b * (h - 9)), 1, 1); }
  }
  ctx.fillStyle = dark ? '#f0b030' : T.goldL; for (const [cx, cy] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) ctx.fillRect(cx, cy, 1, 1);
}
function isDark(c) { const n = parseInt(c.slice(1, 7), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 < 110; }
function hash3(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export const text = (ctx, s, x, y, c = T.ink, sh = T.inkS) => drawText(ctx, s, x, y, c, sh);
// Barra de valor con «fantasma» (lo perdido se vacía con retraso) y brillo
export function bar(ctx, x, y, w, h, v, ghost, cols, back = '#2a1c2c') {
  ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  const gw = Math.round(w * Math.max(0, Math.min(1, ghost))), vw = Math.round(w * Math.max(0, Math.min(1, v)));
  if (gw > vw) { ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + vw, y, gw - vw, h); }
  if (vw > 0) { ctx.fillStyle = cols[1]; ctx.fillRect(x, y, vw, h); ctx.fillStyle = cols[2]; ctx.fillRect(x, y, vw, 1); if (h > 2) { ctx.fillStyle = cols[0]; ctx.fillRect(x, y + h - 1, vw, 1); } }
}
// Puntero de mano (8×7) para los menús
const HAND = ['..##....', '.#..#...', '.#..####', '##.....#', '#......#', '#......#', '.######.'];
export function hand(ctx, x, y) {
  for (let r = 0; r < HAND.length; r++) for (let c = 0; c < 8; c++) {
    const ch = HAND[r][c]; if (ch === '#') { ctx.fillStyle = INK; ctx.fillRect(x + c, y + r, 1, 1); }
    else if (ch === '.' && c > 0 && c < 7 && r > 0 && r < 6 && HAND[r].indexOf('#') < c && HAND[r].lastIndexOf('#') > c) { ctx.fillStyle = r < 3 ? '#fff6e0' : '#f2d0a8'; ctx.fillRect(x + c, y + r, 1, 1); }
  }
  ctx.fillStyle = '#fff6e0'; ctx.fillRect(x + 2, y + 1, 2, 2); ctx.fillRect(x + 2, y + 3, 5, 3);
  ctx.fillStyle = '#e8b890'; ctx.fillRect(x + 3, y + 5, 4, 1);
}

// ───────────── Diálogo ─────────────
const EXPR = [
  ['furia', /(¿cómo te atreves|lárgate|vergüenza|demonio|¡no me vengas|cornudo|ni lo sueñes|lamentarlo|¡¿)/i],
  ['miedo', /(santa olaia|esos cuernos|santigua|no te acerques|retrocede|socorro|aparta, aparta)/i],
  ['alegre', /(ja, ja|¡ja!|me encanta|gracias|me alegr|qué bien|¡sí|precios|♥|enhorabuena|bienvenid|honor|sonre)/i],
  ['triste', /(lo siento|lamento|triste|murió|llor|pena|ojalá|desgracia|solo\b|sola\b|perdí)/i],
  ['sorpresa', /(^¡oh|^¿qué|^¡¿|¿de verdad|^¡vaya|^¡anda|increíble|¡no puede)/i],
];
function guessExpr(s) { for (const [e, re] of EXPR) if (re.test(s)) return e; return 'neutral'; }
function autoMarkup(s) {
  return s.replace(/(^|[\s(])([+−-]\d+) (PV|PM|XP)/g, (m, a, n, u) => `${a}${n[0] === '+' ? '^g' : '^r'}${n} ${u}^0`)
    .replace(/(\d+) dineros/g, '^y$1 dineros^0').replace(/¡CRÍTICO!/g, '^y^s¡CRÍTICO!^s^0').replace(/¡PIFIA!/g, '^r^s¡PIFIA!^s^0');
}
function voiceFor(speaker, ap) {
  if (!speaker || !ap) return null;
  let h = 0; for (const c of speaker) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let f = ap.sex === 'f' ? 560 + (h % 140) : 250 + (h % 130);
  if (ap.race === 'enano') f *= 0.82; if (ap.race === 'elfo') f *= 1.16; if (ap.age === 'anciano') f *= 0.88; if (ap.age === 'nino') f *= 1.35;
  return { f, wave: ap.race === 'tiefling' ? 'sawtooth' : ap.race === 'elfo' ? 'triangle' : 'square', jit: 0.06 + (h % 5) * 0.02 };
}
const PUNCT_LONG = '.!?…', PUNCT_SHORT = ',;:';

class Say {
  constructor(msg, opt) {
    this.kind = 'say'; this.t = 0; this.speaker = opt.speaker; this.ap = opt.ap; this.auto = opt.auto; this.keep = false;
    this.msg = autoMarkup(msg); this.expr = opt.expr || guessExpr(msg); this.voice = voiceFor(opt.speaker, opt.ap);
    const tw = this.ap ? 172 : 214;
    this.lines = wrap(this.msg, tw).map((l) => glyphs(l, RICH));
    this.page = 0; this.chars = 0; this.acc = 0; this.pause = 0; this.talk = 0; this.blinkSeed = Math.floor(Math.random() * 120);
  }
  pageLines() { return this.lines.slice(this.page * 3, this.page * 3 + 3); }
  pageLen() { return this.pageLines().reduce((s, l) => s + l.length, 0); }
  glyphAt(n) { for (const l of this.pageLines()) { if (n < l.length) return l[n]; n -= l.length; } return null; }
  type(fast) {
    if (this.pause > 0) { this.pause--; this.talk = 0; return; }
    const total = this.pageLen(); if (this.chars >= total) { this.talk = 0; return; }
    this.acc += fast ? 4 : prefs.text >= 3 ? 999 : 0.8 * prefs.text;
    while (this.acc >= 1 && this.chars < total) {
      this.acc--; const g = this.glyphAt(this.chars); this.chars++;
      if (!g) break;
      if (/[a-záéíóúñüç]/i.test(g.ch)) { this.talk = 6; if (!fast && this.chars % 3 === 1) { if (this.voice) voice(this.voice, g.ch); else sfx('type'); } }
      if (!fast && PUNCT_LONG.includes(g.ch)) { const nx = this.glyphAt(this.chars); if (!nx || nx.ch === ' ') { this.pause = 9; this.acc = 0; break; } }
      if (!fast && PUNCT_SHORT.includes(g.ch)) { this.pause = 4; this.acc = 0; break; }
    }
    if (this.talk > 0) this.talk--;
  }
  tick() { this.type(false); }
  update() {
    const total = this.pageLen();
    if (this.chars < total) { this.type(input.held('A') || input.held('B')); if (input.pressed('A') && this.t > 2) { this.chars = total; this.pause = 0; } return; }
    this.talk = 0;
    if (input.pressed('A') || input.pressed('B') || (this.auto && (this.at = (this.at || 0) + 1) > this.auto)) {
      if ((this.page + 1) * 3 < this.lines.length) { this.page++; this.chars = 0; this.pause = 0; sfx('page'); } else { this.done = true; sfx('next'); }
    }
  }
  // El marco lo pinta ui (para que dos diálogos seguidos compartan caja); esto pinta el contenido.
  drawContent(ctx, bx, by, a, fr) {
    let tx = bx + 8;
    if (this.ap) {
      const px = bx + 4, py = by + 3; ctx.fillStyle = T.edge; ctx.fillRect(px, py, 42, 42);
      ctx.fillStyle = '#d8c39a'; ctx.fillRect(px + 1, py + 1, 40, 40);
      const blink = ((this.t + this.blinkSeed) % 170) < 7;
      const mouth = this.talk > 0 ? (Math.floor(this.t / 4) % 2 ? 2 : 1) : 0;
      ctx.drawImage(bust(this.ap, this.expr, mouth, blink), px + 1, py + 1);
      ctx.fillStyle = T.goldL; ctx.fillRect(px + 1, py + 1, 1, 1); tx = bx + 52;
    }
    if (a < 0.75) return;
    let left = Math.floor(this.chars);
    this.pageLines().forEach((l, i) => { drawGlyphs(ctx, l, tx, by + 8 + i * 12, T.ink, T.inkS, Math.max(0, left), fr); left -= l.length; });
    if (left >= 0 && !this.keep) {
      const last = (this.page + 1) * 3 >= this.lines.length; const b = Math.round(Math.abs(Math.sin(fr / 8)) * 2);
      ctx.fillStyle = '#b8322c';
      if (last) { ctx.fillRect(bx + 222, by + 37 - b, 4, 4); ctx.fillStyle = '#f07050'; ctx.fillRect(bx + 222, by + 37 - b, 2, 1); }
      else { for (let r = 0; r < 4; r++) ctx.fillRect(bx + 220 + r, by + 36 + r + b, 7 - r * 2, 1); }
    }
  }
}

// ───────────── Elección ─────────────
class Choose {
  constructor(opts, o) {
    this.kind = 'choose'; this.t = 0; this.opts = opts; this.i = Math.max(0, Math.min(opts.length - 1, o.start || 0)); this.title = o.title; this.cancel = o.cancel === undefined ? -1 : o.cancel; this.top = 0; this.cols = o.cols || 1; this.prompt = o.prompt;
    const lw = (s) => textWidth(typeof s === 'string' ? s : s.label) + 26 + (typeof s === 'object' && s.icon ? 14 : 0) + (typeof s === 'object' && s.right ? textWidth(String(s.right)) + 10 : 0);
    this.w = Math.min(228, Math.max(70, ...opts.map(lw), this.title ? textWidth(this.title) + 20 : 0));
    this.max = Math.min(opts.length, o.max || 7);
    this.x = o.x ?? W - this.w - 4; this.y = o.y ?? Math.max(4, 108 - this.max * 12 - 10 - (this.title ? 12 : 0));
    this.hy = null; this.dark = o.style === 'dark';
  }
  label(k) { const o = this.opts[k]; return typeof o === 'string' ? o : o.label; }
  dis(k) { const o = this.opts[k]; return typeof o === 'object' && o.disabled; }
  update() {
    const n = this.opts.length; const old = this.i;
    if (this.cols > 1) {
      const c = this.cols;
      if (input.pressed('up') && this.i - c >= 0) this.i -= c; if (input.pressed('down') && this.i + c < n) this.i += c;
      if (input.pressed('left') && this.i % c > 0) this.i--; if (input.pressed('right') && this.i % c < c - 1 && this.i + 1 < n) this.i++;
    } else {
      if (input.pressed('up')) this.i = (this.i + n - 1) % n; if (input.pressed('down')) this.i = (this.i + 1) % n;
    }
    if (this.i !== old) { sfx('move'); this.nudge = 4; }
    if (this.i < this.top) this.top = this.i; if (this.i >= this.top + this.max) this.top = this.i - this.max + 1;
    if (input.pressed('A') && this.t > 3) { if (this.dis(this.i)) { sfx('no'); this.deny = 10; return; } this.done = true; this.result = this.i; this.picked = this.i; sfx('ok'); }
    if (input.pressed('B') && this.cancel !== null && this.t > 3) { this.done = true; this.result = this.cancel; sfx('back'); }
  }
  draw(ctx, fr) {
    const op = this.closing ? 1 - ease.inCubic(Math.min(1, this.ct / 7)) : prog(this.t, 8, 0, ease.outBack);
    if (op <= 0.02) return;
    if (this.cols > 1) return this.drawGrid(ctx, fr, op);
    const hh = this.max * 12 + 10 + (this.title ? 12 : 0);
    const h2 = Math.max(6, Math.round(hh * Math.min(1.08, op))); const y0 = this.y + Math.round((hh - h2) / 2);
    const sx = this.deny > 0 ? (this.deny-- % 4 < 2 ? 2 : -2) : 0;
    panel(ctx, this.x + sx, y0, this.w, h2, this.dark ? 'dark' : 'paper');
    if (op < 0.7) return;
    let y = this.y + 6;
    const tc = this.dark ? T.cream : T.ink, ts = this.dark ? INK : T.inkS;
    if (this.title) { text(ctx, this.title, this.x + 8 + sx, y, this.dark ? '#f0b030' : T.title, ts); ctx.fillStyle = this.dark ? '#5a4060' : T.paperD; ctx.fillRect(this.x + 6, y + 9, this.w - 12, 1); y += 12; }
    // barra de selección que se desliza
    const ty = y + (this.i - this.top) * 12; if (this.hy === null) this.hy = ty; this.hy += (ty - this.hy) * 0.45; if (Math.abs(ty - this.hy) < 0.5) this.hy = ty;
    const flashSel = this.closing && this.picked !== undefined && Math.floor(this.ct / 2) % 2 === 0;
    ctx.fillStyle = flashSel ? '#ffffff' : this.dark ? '#4a3462' : T.sel; ctx.fillRect(this.x + 4, Math.round(this.hy) - 2, this.w - 8, 11);
    ctx.fillStyle = this.dark ? '#2a1c3a' : T.selD; ctx.fillRect(this.x + 4, Math.round(this.hy) + 8, this.w - 8, 1);
    for (let k = this.top; k < this.top + this.max; k++) {
      const rowT = this.closing ? 1 : prog(this.t, 6, 2 + (k - this.top) * 1.2, ease.outCubic); const off = Math.round((1 - rowT) * 10);
      const o = this.opts[k]; let lx = this.x + 16 + off + sx;
      if (typeof o === 'object' && o.icon) { const ic = o.icon; ctx.drawImage(ic, lx, y + 3 - Math.floor(ic.height / 2) + (k === this.i ? -1 : 0)); lx += ic.width + 3; }
      const dis = this.dis(k); const c = dis ? (this.dark ? '#6a5a70' : T.dim) : k === this.i ? (this.dark ? '#fff4d8' : '#2a1420') : tc;
      text(ctx, this.label(k), lx + (k === this.i ? 1 : 0), y, c, dis ? null : ts);
      if (typeof o === 'object' && o.right) { const r = String(o.right); text(ctx, r, this.x + this.w - 9 - textWidth(r), y, dis ? T.dim : this.dark ? '#f0b030' : '#8a5a1c', dis ? null : ts); }
      y += 12;
    }
    const bob = Math.round(Math.sin(fr / 5) * 1.5) - (this.nudge > 0 ? this.nudge-- : 0);
    hand(ctx, this.x + 5 + bob + sx - 3, Math.round(this.hy));
    const ab = Math.round(Math.abs(Math.sin(fr / 9)) * 2);
    if (this.top > 0) drawText(ctx, '▲', this.x + this.w - 11, this.y + 3 - ab, '#b8322c');
    if (this.top + this.max < this.opts.length) drawText(ctx, '▼', this.x + this.w - 11, this.y + hh - 9 + ab, '#b8322c');
    const o = this.opts[this.i];
    if (typeof o === 'object' && o.hint && !this.closing) {
      const ls = wrap(o.hint, 218); const n = Math.min(2, ls.length); const hT = prog(this.t, 8, 4);
      const hy = 158 - (n * 12 + 6) + Math.round((1 - hT) * 20);
      panel(ctx, 2, hy, 236, n * 12 + 8, 'dark'); ls.slice(0, n).forEach((l, i) => drawText(ctx, l, 9, hy + 5 + i * 12, T.cream, INK));
    }
  }
  drawGrid(ctx, fr, op) {
    const y0 = 110 + Math.round((1 - op) * 50);
    panel(ctx, 2, y0, 236, 48);
    if (this.prompt) wrap(this.prompt, 96).slice(0, 3).forEach((l, i) => text(ctx, l, 10, y0 + 8 + i * 12));
    panel(ctx, 110, y0, 128, 48);
    this.opts.forEach((o, k) => {
      const x = 126 + (k % this.cols) * 56, y = y0 + 8 + Math.floor(k / this.cols) * 12;
      if (k === this.i) { ctx.fillStyle = T.sel; ctx.fillRect(x - 3, y - 2, 54, 11); }
      text(ctx, this.label(k), x, y, this.dis(k) ? T.dim : T.ink);
      if (k === this.i) hand(ctx, x - 12 + Math.round(Math.sin(fr / 5) * 1.5), y);
    });
  }
}

// ───────────── Tirada de d20 ─────────────
// El dado rueda mientras un anillo se cierra sobre él: pulsar A con el anillo encima da «pulso» (+bonus).
// Resuelve {roll, total, ok, crit, fumble, pulse}
const D20 = (() => { const v = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 3; v.push([Math.cos(a), Math.sin(a)]); } return v; })();
export function drawD20(ctx, cx, cy, r, rot, sq, face, col, edge = INK, glow = 0) {
  const pts = D20.map(([x, y]) => { const a = Math.atan2(y, x) + rot; return [cx + Math.cos(a) * r * sq, cy + Math.sin(a) * r]; });
  // relleno por facetas: superior clara, laterales base, inferior oscura
  const fill = (poly, c) => { ctx.fillStyle = c; const ys = poly.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) { const xs = []; for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; const yc = y + 0.5; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) ctx.fillRect(Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]), 1); } };
  const c = [cx, cy];
  const inner = [0, 2, 4].map((k) => { const a = Math.atan2(D20[k][1], D20[k][0]) + rot + Math.PI / 3; return [cx + Math.cos(a) * r * 0.55 * sq, cy + Math.sin(a) * r * 0.55]; });
  fill(pts, edge);
  const shrink = pts.map(([x, y]) => [cx + (x - cx) * 0.93, cy + (y - cy) * 0.93]);
  for (let i = 0; i < 6; i++) { const a = shrink[i], b = shrink[(i + 1) % 6]; const lit = Math.cos(Math.atan2((a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cx) + 2.3); fill([c, a, b], lit > 0.4 ? col[2] : lit > -0.3 ? col[1] : col[0]); }
  fill(inner, col[1]); fill(inner.map(([x, y]) => [cx + (x - cx) * 0.8, cy + (y - cy) * 0.8]), col[2]);
  ctx.fillStyle = edge; for (let i = 0; i < 3; i++) { const p = inner[i], q = shrink[[0, 2, 4][i]]; lineQ(ctx, p, q); lineQ(ctx, p, inner[(i + 1) % 3]); }
  if (glow) { ctx.fillStyle = alpha('#fff4c0', glow); for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(pts[i][0]) - 1, Math.round(pts[i][1]) - 1, 2, 2); }
  if (face !== null) { const s = String(face); drawOutlined(ctx, s, Math.round(cx - textWidth(s) / 2), Math.round(cy - 3), '#ffffff', INK); }
}
function lineQ(ctx, a, b) { const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n), 1, 1); }
const DCOL = { idle: ['#3a2a68', '#5a46a0', '#8a76d0'], ok: ['#1e5a34', '#2f8a46', '#62c070'], ko: ['#6a1a24', '#a8303a', '#e0605a'], crit: ['#8a5a10', '#e0a020', '#fff070'], fum: ['#2a1418', '#5a2028', '#8a3a3a'] };

class Roll {
  constructor(label, mod, dc, opt) {
    this.kind = 'roll'; this.label = label; this.mod = mod; this.dc = dc; this.t = 0; this.face = 1; this.face2 = 1; this.adv = opt.adv || 0;
    this.final = null; this.pulseBonus = opt.pulse ?? 1; this.ringT = 46; this.rot = 0; this.sq = 1; this.pulse = 0;
  }
  ringR() { return 34 - (this.t / this.ringT) * 24; }
  update() {
    if (!this.final) {
      this.rot += 0.35 * (1 - this.t / 60); this.sq = Math.abs(Math.cos(this.t * 0.45)) * 0.6 + 0.4;
      if (this.t % 3 === 0) { this.face = 1 + Math.floor(Math.random() * 20); this.face2 = 1 + Math.floor(Math.random() * 20); sfx('tick'); }
      const r = this.ringR(); const pressed = input.pressed('A') && this.t > 6;
      if (pressed || this.t >= this.ringT) {
        const d = Math.abs(r - 13); this.pulse = pressed ? (d <= 2.5 ? 2 : d <= 6 ? 1 : 0) : 0;
        const pb = this.pulse === 2 ? this.pulseBonus : this.pulse === 1 && this.pulseBonus > 1 ? 1 : 0;
        let r1 = 1 + Math.floor(Math.random() * 20); let r2 = 1 + Math.floor(Math.random() * 20); let roll = r1;
        if (this.adv) roll = this.adv > 0 ? Math.max(r1, r2) : Math.min(r1, r2);
        this.face = r1; this.face2 = r2; this.kept = roll === r1 ? 0 : 1;
        const total = roll + this.mod + pb;
        this.final = { roll, total, crit: roll === 20, fumble: roll === 1, ok: roll === 20 || (roll !== 1 && total >= this.dc), pulse: pb };
        this.t2 = 0; this.rot = 0; this.sq = 1;
        if (this.pulse === 2) { sfx('pulse'); burst(86, 70, 10, { layer: 'screen', colors: ['#fff4c0', '#fcd456'], speed: 2.2, life: 18, kind: 'spark' }); }
        sfx('land');
      }
    } else {
      this.t2++;
      if (this.t2 === 16) { const f = this.final; sfx(f.crit ? 'crit_roll' : f.fumble ? 'fumble' : f.ok ? 'good' : 'bad'); if (f.crit) { shake(0.5); burst(86, 70, 22, { layer: 'screen', colors: ['#fff070', '#fcd456', '#ffffff'], speed: 2.8, life: 30, kind: 'spark' }); } if (f.fumble) shake(0.35); }
      if (this.t2 > 24 && (input.pressed('A') || input.pressed('B') || this.t2 > 120)) { this.done = true; this.result = this.final; }
    }
  }
  draw(ctx, fr) {
    const op = this.closing ? 1 - ease.inCubic(Math.min(1, this.ct / 8)) : prog(this.t + (this.final ? 99 : 0), 10, 0, ease.outBack);
    // velo tramado sobre la escena
    const veil = this.closing ? 1 - Math.min(1, this.ct / 8) : Math.min(1, this.t / 8);
    ctx.fillStyle = 'rgba(14,8,22,0.55)'; for (let y = 0; y < H; y += 2) for (let x = (y >> 1) & 1 ? 2 : 0; x < W; x += 4) if (bayer(x >> 1, y >> 1) < veil * 0.9) ctx.fillRect(x, y, 2, 2);
    if (op < 0.05) return;
    const pw = 156, ph = 84, px = 42, py = 26 + Math.round((1 - op) * 30);
    panel(ctx, px, py, pw, ph);
    // cinta con el nombre de la tirada
    const lw = textWidth(this.label) + 14; const lx = Math.round(120 - lw / 2);
    ctx.fillStyle = '#7c1a2a'; ctx.fillRect(lx - 3, py - 5, lw + 6, 13); ctx.fillStyle = '#a42632'; ctx.fillRect(lx, py - 6, lw, 13);
    ctx.fillStyle = '#cc3a3c'; ctx.fillRect(lx, py - 6, lw, 1); ctx.fillStyle = '#520f22'; ctx.fillRect(lx - 3, py + 7, 3, 1); ctx.fillRect(lx + lw, py + 7, 3, 1);
    drawText(ctx, this.label, lx + 7, py - 3, '#fff0d8', '#520f22');
    const cx = 86, cy = py + 46; const f = this.final;
    const st = !f ? 'idle' : this.t2 < 16 ? 'idle' : f.crit ? 'crit' : f.fumble ? 'fum' : f.ok ? 'ok' : 'ko';
    // sombra
    ellipse(ctx, cx, cy + 19, 13, 3, '#d8bc8c');
    const hop = !f ? Math.round(-Math.abs(Math.sin(this.t * 0.32)) * 7) : this.t2 < 10 ? Math.round(-Math.abs(Math.sin(this.t2 * 0.62)) * 5 * (1 - this.t2 / 10)) : 0;
    const land = f && this.t2 < 6 ? 1 + (6 - this.t2) * 0.03 : 1;
    if (this.adv) {
      const k2 = f ? (this.kept === 1 ? 1 : 0.45) : 1, k1 = f ? (this.kept === 0 ? 1 : 0.45) : 1;
      drawD20(ctx, cx - 10, cy + hop, 11 * land, this.rot, this.sq, f ? this.face : this.face, k1 < 1 ? DCOL.fum : DCOL[st]);
      drawD20(ctx, cx + 12, cy + 6 + hop, 9, -this.rot, this.sq, f ? this.face2 : this.face2, k2 < 1 ? DCOL.fum : DCOL[st]);
    } else drawD20(ctx, cx, cy + hop, 14 * land, this.rot, this.sq, this.face, DCOL[st], INK, st === 'crit' ? 0.6 + Math.sin(fr / 4) * 0.3 : 0);
    // anillo de pulso
    if (!f) { const r = Math.round(this.ringR()); const near = Math.abs(r - 13) <= 2.5; ringPx(ctx, cx, cy, r, near ? '#fcd456' : alpha('#ffffff', 0.85)); if (near) ringPx(ctx, cx, cy, r + 1, '#f0b030'); }
    // números
    const ms = (this.mod >= 0 ? '+' : '') + this.mod;
    text(ctx, 'd20 ' + ms, 114, py + 18); text(ctx, 'CD ' + this.dc, 114, py + 30, T.title);
    if (this.adv) text(ctx, this.adv > 0 ? 'Ventaja' : 'Desventaja', 114, py + 6 + 0, this.adv > 0 ? '#2f7a3a' : '#9a2a2a');
    if (!f && this.t < 40) { const s = 'A: ¡pulso!'; drawText(ctx, s, 114, py + 66, fr % 30 < 20 ? '#8a5a1c' : '#b8901c', T.inkS); }
    if (f) {
      if (f.pulse) { const pt = Math.min(1, this.t2 / 8); drawOutlined(ctx, `+${f.pulse} pulso`, 114, py + 42 - Math.round(pt * 2), '#fcd456', '#6a3e1a'); }
      if (this.t2 > 8) { const tot = '= ' + f.total; const tt = prog(this.t2, 8, 8, ease.outBack); text(ctx, tot, 114 + Math.round((1 - tt) * 8), py + 54, f.ok ? '#1e6a34' : '#9a2a2a'); }
      if (this.t2 >= 16) {
        const word = f.crit ? '¡CRÍTICO!' : f.fumble ? '¡PIFIA!' : f.ok ? 'ÉXITO' : 'FALLO';
        const col = f.crit ? '#fcd456' : f.fumble ? '#e84a4a' : f.ok ? '#6ad070' : '#e86050';
        const s = prog(this.t2, 10, 16, ease.outBackBig); const sc = 2;
        const bw = bigWidth(word, sc); const bx = Math.round(120 - bw / 2); const by = py + ph - 14 - Math.round((1 - s) * 18);
        if (s > 0.05) drawBig(ctx, word, bx, by, col, INK, sc);
        if (f.crit) for (let i = 0; i < 3; i++) sparkle(ctx, bx + ((fr * 3 + i * 37) % bw), by + ((i * 11 + fr) % 18), 1 + ((fr + i) % 3 === 0 ? 1 : 0), '#fff8c0');
      }
    }
  }
}

class Custom { constructor(o) { this.kind = 'custom'; this.t = 0; Object.assign(this, o); } }

// ───────────── Gestor ─────────────
export const ui = {
  stack: [], toasts: [], closing: [], dlg: { open: 0, say: null, closingSay: null }, banners: [], announces: [],
  get busy() { return this.stack.length > 0; },
  push(w) { return new Promise((res) => { w.resolve = res; w.t = w.t || 0; this.stack.push(w); }); },
  say(msg, opt = {}) { return this.push(new Say(msg, opt)); },
  async sayAll(msgs, opt = {}) { for (const m of msgs) await this.say(m, opt); },
  choose(opts, o = {}) { return this.push(new Choose(opts, o)); },
  async ask(msg, opts, o = {}) { const s = new Say(msg, o); s.keep = true; s.resolve = () => {}; this.stack.push(s); const r = await this.choose(opts, { ...o, cancel: o.cancel === undefined ? opts.length - 1 : o.cancel }); const k = this.stack.indexOf(s); if (k >= 0) this.stack.splice(k, 1); this.dlg.closingSay = s; return r; },
  roll(label, mod, dc, opt = {}) { return this.push(new Roll(label, mod, dc, opt)); },
  custom(o) { return this.push(new Custom(o)); },
  toast(msg, color = '#f8f0d8', ic = null) {
    if (!ic) ic = /XP/.test(msg) ? 'estrella' : /♥/.test(msg) ? 'corazon' : /\bd\.|dineros/.test(msg) ? 'moneda' : /NIVEL/.test(msg) ? 'estrella' : /Conjuro|Receta/.test(msg) ? 'saber' : /[+]\s?[⅓⅔1-9]|sube/.test(msg) ? 'saber' : null;
    const same = this.toasts.find((t) => t.msg === msg && t.life - t.t > 30); if (same) { same.t = Math.min(same.t, 20); same.pulse = 8; return; }
    this.toasts.push({ msg, color, ic, t: 0, life: 170, y: null }); if (this.toasts.length > 5) this.toasts[0].life = Math.min(this.toasts[0].life, this.toasts[0].t + 10);
  },
  banner(title, o = {}) { this.banners = [{ title, sub: o.sub || '', ic: o.icon || null, t: 0, life: o.life || 150, style: o.style || 'scroll' }]; sfx(o.sfx || 'banner'); },
  announce(textS, o = {}) { this.announces.push({ text: textS, sub: o.sub || '', color: o.color || '#fcd456', t: 0, life: o.life || 120 }); },
  update() {
    const w = this.stack[this.stack.length - 1];
    for (const x of this.stack) { x.t++; if (x !== w && x.kind === 'say' && x.keep) x.tick(); }
    if (w) {
      if (w.kind === 'say') { this.dlg.say = w; this.dlg.closingSay = null; }
      w.update?.();
      if (w.done) {
        this.stack.splice(this.stack.indexOf(w), 1);
        if (w.kind === 'say') this.dlg.closingSay = w; else if (w.kind !== 'custom') { w.closing = true; w.ct = 0; this.closing.push(w); }
        w.resolve(w.result);
      }
    }
    const anySay = this.stack.some((x) => x.kind === 'say');
    // La caja de diálogo se abre si hay un diálogo y se cierra con suavidad si no (dos seguidos la comparten)
    if (anySay) this.dlg.open = Math.min(1, this.dlg.open + 0.14);
    else if (this.dlg.open > 0) { this.dlg.hold = (this.dlg.hold || 0) + 1; if (this.dlg.hold > 2) this.dlg.open = Math.max(0, this.dlg.open - 0.16); }
    if (anySay) this.dlg.hold = 0;
    for (const c of this.closing) c.ct++; this.closing = this.closing.filter((c) => c.ct < 9);
    const covered = trans.on && trans.phase !== 'in'; // a oscuras, carteles y avisos esperan
    const menuOpen = this.stack.length && this.stack[this.stack.length - 1].kind === 'choose'; // con un menú abierto, los avisos esperan
    if (!covered && !menuOpen) { for (const t of this.toasts) t.t++; this.toasts = this.toasts.filter((t) => t.t < t.life); }
    if (!covered) { for (const b of this.banners) b.t++; this.banners = this.banners.filter((b) => b.t < b.life); }
    for (const a of this.announces) a.t++; this.announces = this.announces.filter((a) => a.t < a.life);
  },
  draw(ctx, fr) {
    let drewBox = false; let topSay = null; for (const w of this.stack) if (w.kind === 'say') topSay = w;
    for (const w of this.stack) {
      if (w.kind === 'say') { if (w === topSay) { this.drawBox(ctx, fr, w); drewBox = true; } continue; }
      w.draw(ctx, fr);
    }
    if (!drewBox && this.dlg.open > 0 && this.dlg.closingSay) this.drawBox(ctx, fr, this.dlg.closingSay);
    for (const c of this.closing) c.draw(ctx, fr);
    if (!(trans.on && trans.phase !== 'in')) { if (!(this.stack.length && this.stack[this.stack.length - 1].kind === 'choose')) this.drawToasts(ctx, fr); this.drawBanners(ctx, fr); }
    this.drawAnnounces(ctx, fr);
  },
  drawBox(ctx, fr, s) {
    const o = this.dlg.open; const e = this.stack.includes(s) ? ease.outBack(o) : ease.inQuad(o);
    const bx = 2, by = 110 + Math.round((1 - e) * 52);
    if (s.speaker) {
      const nt = Math.min(1, s.t / 8); const w = textWidth(s.speaker) + 16; const tx = s.ap ? 50 : 8;
      const ty = by - 11 + Math.round((1 - ease.outBack(nt)) * 10);
      ctx.fillStyle = T.edge; ctx.fillRect(tx, ty, w, 13); ctx.fillStyle = '#7c1a2a'; ctx.fillRect(tx + 1, ty + 1, w - 2, 12);
      ctx.fillStyle = '#a42632'; ctx.fillRect(tx + 1, ty + 1, w - 2, 1); ctx.fillStyle = T.gold; ctx.fillRect(tx + 2, ty + 2, 1, 1); ctx.fillRect(tx + w - 3, ty + 2, 1, 1);
      drawText(ctx, s.speaker, tx + 8, ty + 3, '#fff0d0', '#3a0e1a');
    }
    panel(ctx, bx, by, 236, 48);
    s.drawContent(ctx, bx, by, o, fr);
  },
  drawToasts(ctx, fr) {
    let slot = 0;
    // si hay un menú abierto a la derecha, los avisos salen por la izquierda para no taparlo
    const left = false;
    for (const t of this.toasts) {
      const ty = 32 + slot * 15; if (t.y === null) t.y = ty; t.y += (ty - t.y) * 0.3; slot++;
      const ic = t.ic ? icon(t.ic) : null; const w = textWidth(t.msg) + 12 + (ic ? 14 : 0);
      const inT = ease.outBack(Math.min(1, t.t / 12)), outT = t.t > t.life - 14 ? ease.inBack(Math.min(1, (t.t - (t.life - 14)) / 14)) : 0;
      const x = left ? Math.round(3 - (1 - inT) * (w + 8) - outT * (w + 8)) : Math.round(W - w - 3 + (1 - inT) * (w + 8) + outT * (w + 8)); const y = Math.round(t.y);
      ctx.fillStyle = INK; ctx.fillRect(x, y, w, 13); ctx.fillStyle = 'rgba(33,24,44,.94)'; ctx.fillRect(x + 1, y + 1, w - 2, 11);
      ctx.fillStyle = t.color; ctx.fillRect(x + 1, y + 1, 2, 11);
      if (t.pulse > 0) { t.pulse--; ctx.fillStyle = alpha('#ffffff', 0.25); ctx.fillRect(x + 1, y + 1, w - 2, 11); }
      let tx = x + 6; if (ic) { ctx.drawImage(ic, tx - 1, y + 1); tx += 14; }
      drawText(ctx, t.msg, tx, y + 3, t.color, INK);
    }
  },
  drawBanners(ctx, fr) {
    for (const b of this.banners) {
      const open = ease.outBack(Math.min(1, b.t / 16)); const close = b.t > b.life - 16 ? ease.inCubic((b.t - (b.life - 16)) / 16) : 0;
      const k = Math.max(0, open - close); const tw = Math.max(textWidth(b.title), textWidth(b.sub)) + 28; const w = Math.round(tw * k); if (w < 8) continue;
      const x = Math.round(120 - w / 2), y = 18, h = b.sub ? 28 : 19;
      // pergamino con rodillos
      panel(ctx, x, y, w, h);
      ctx.fillStyle = '#7c4c38'; ctx.fillRect(x - 4, y - 2, 5, h + 4); ctx.fillRect(x + w - 1, y - 2, 5, h + 4);
      ctx.fillStyle = '#b88252'; ctx.fillRect(x - 3, y - 2, 2, h + 4); ctx.fillRect(x + w, y - 2, 2, h + 4);
      ctx.fillStyle = T.gold; ctx.fillRect(x - 4, y - 3, 5, 1); ctx.fillRect(x - 4, y + h + 2, 5, 1); ctx.fillRect(x + w - 1, y - 3, 5, 1); ctx.fillRect(x + w - 1, y + h + 2, 5, 1);
      if (k > 0.6) {
        const tx = Math.round(120 - textWidth(b.title) / 2); text(ctx, b.title, tx, y + 6, T.title);
        if (b.sub) { const sx = Math.round(120 - textWidth(b.sub) / 2); text(ctx, b.sub, sx, y + 17, '#6a4a3a'); }
      }
    }
  },
  drawAnnounces(ctx, fr) {
    for (const a of this.announces) {
      const s = ease.outBackBig(Math.min(1, a.t / 14)); const out = a.t > a.life - 12 ? (a.t - (a.life - 12)) / 12 : 0;
      const sc = bigWidth(a.text, 2) <= 232 ? 2 : 1; const bw = bigWidth(a.text, sc); const x = Math.round(120 - bw / 2), y = Math.round(44 - (1 - s) * 30 - out * 20);
      if (out < 1) { drawBig(ctx, a.text, x, y, a.color, INK, sc); if (a.sub) drawOutlined(ctx, a.sub, Math.round(120 - textWidth(a.sub) / 2), y + 28, '#fff4d8', INK); }
      if (a.t % 5 === 0 && a.t < a.life - 20) spawn({ x: x + Math.random() * bw, y: y + 4 + Math.random() * 18, vy: -0.4, life: 22, kind: 'star', color: '#fff4c0', layer: 'screen' });
    }
  },
};
