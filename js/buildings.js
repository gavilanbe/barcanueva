// Edificios de Barcanueva en vista 3/4 estilo GBA: tejado arriba, fachada abajo, puerta en la columna b.door.x.
// Cada edificio se pinta UNA vez en un lienzo de caché (con contorno selectivo) y luego sólo se copia.
// Al dibujarse deja registrado, en píxeles absolutos del mapa:
//   b.lit      huecos que se encienden de noche  → drawBuildingLights()
//   b.smoke    bocas de chimenea (para el humo)
//   b.doorRect hueco de la puerta                → drawDoorOpen()
// Puede pintar hasta 24 px por encima de su planta (torres, chimeneas, banderas) y 2 px a los lados (aleros).
import { INK, INK2, ramp, mix, outlineSel } from './pal.js';
import { painter, ellipse, line, poly, hash, bayer } from './px.js';
import { hash2 } from './util.js';

const TS = 16, PX = 3, PT = 26; // márgenes del lienzo de caché: lados y altura extra por arriba
const cache = new Map();

// ───────────── Materiales ─────────────
const PLASTER = ['#e2b97c', '#ecdcbc', '#e0a88e', '#eed2a0', '#d6a064', '#f0e4d0', '#d8bc94', '#e8b49c', '#e6c890', '#dcc4a8'];
const TERRA = ['#b4502e', '#c4683c', '#a2483a', '#ae5e44', '#bc5a34', '#b85048'];
const SHUT = ['#3f7a4c', '#2f6a5e', '#3d5f8c', '#7a3e2c', '#4f7a3a', '#2c5c6e', '#8a6a2e', '#3e7a6a'];
const DOORC = ['#6e4228', '#7c4a2c', '#5e3a2a', '#3e5a4a', '#7a3424', '#4a4a6a', '#6a4a2a'];
const GL = ['#2c4068', '#46699c', '#8ab4e0', '#e4f2ff']; // cristal: fondo, reflejo, brillo, destello
const IRON = ['#1a1824', '#2c2a38', '#46445a', '#6a687e'];
const FLOWERS = ['#e0405a', '#f06a7a', '#f0c040', '#e86a30', '#c04ab0', '#f4f0e8'];
const pv = (arr, R, k) => arr[Math.floor(hash2(R.b.x + k * 7, R.b.y - k * 3, 11 + k) * arr.length)];

// ───────────── API ─────────────
export function drawBuilding(ctx, b, ox = 0, oy = 0) {
  const key = [b.id, b.kind, b.x, b.y, b.w, b.h, b.variant, b.wall, b.roof, b.awning, b.forSale ? 1 : 0].join('|');
  let r = cache.get(key); if (!r) { r = render(b); cache.set(key, r); }
  const X = b.x * TS, Y = b.y * TS;
  b.lit = r.lit.map((l) => ({ ...l, x: l.x + X, y: l.y + Y }));
  b.smoke = r.smoke.map((s) => ({ x: s.x + X, y: s.y + Y }));
  b.doorRect = r.door ? { ...r.door, x: r.door.x + X, y: r.door.y + Y } : null;
  ctx.drawImage(r.cv, X - ox - PX, Y - oy - PT);
}

function render(b) {
  const W = b.w * TS, H = b.h * TS;
  const cv = document.createElement('canvas'); cv.width = W + PX * 2; cv.height = H + PT;
  const ctx = cv.getContext('2d');
  const R = { b, W, H, ctx, P: painter(ctx, PX, PT), lit: [], smoke: [], door: null, v: hash2(b.x, b.y, 3), s: (b.x * 73 + b.y * 151) >>> 0, post: [] };
  (BY_ID[b.id] || BY_KIND[b.kind] || casa)(R);
  outlineSel(cv);
  for (const f of R.post) f();
  return { cv, lit: R.lit, smoke: R.smoke, door: R.door };
}

// ───────────── Formas con arco ─────────────
// inset de la fila k (desde arriba) de un hueco de ancho w con arco de ar filas
function inset(arch, w, ar, k) {
  if (!ar || k >= ar || arch === 'flat') return 0;
  const half = w / 2, t = (ar - k - 0.5) / ar;
  const v = arch === 'pointed' ? (half - 0.5) * Math.pow(t, 1.7) : half * (1 - Math.sqrt(Math.max(0, 1 - t * t)));
  return Math.min(Math.floor(half - 0.5), Math.round(v));
}
function rows(x, y, w, h, arch, ar, fn) { for (let k = 0; k < h; k++) { const i = inset(arch, w, ar, k); fn(y + k, x + i, x + w - i, k); } }
const arOf = (arch, w) => (arch === 'pointed' ? Math.round(w * 0.75) : arch === 'round' ? Math.ceil(w / 2) - 1 : 0);

// ───────────── Paramentos ─────────────
function plaster(R, x, y, w, h, c, damp = 5) {
  const { P } = R, r = ramp(c);
  P(r[3], x, y, w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = hash(x + i + R.s, y + j, 41), yy = y + j;
    if (v < 0.026) P(r[2], x + i, yy); else if (v > 0.985) P(r[4], x + i, yy);
    else if (j >= h - damp - 4 && bayer(x + i, yy) < (j - (h - damp - 4)) / (damp * 3)) P(mix(r[3], r[2], 0.55), x + i, yy);
  }
  return r;
}
function ashlar(R, x, y, w, h, c, bh = 5, seed = 0) {
  const { P } = R, r = ramp(c);
  P(mix(r[2], r[1], 0.4), x, y, w, h);
  for (let row = 0; row * bh < h; row++) {
    const yy = y + row * bh, hh = Math.min(bh - 1, y + h - yy); if (hh <= 0) break;
    let xx = x - (row % 2 ? 5 : 0) - Math.floor(hash(row, seed + R.s, 3) * 3);
    while (xx < x + w) {
      const bw = 7 + Math.floor(hash(xx, row + seed, 7) * 6);
      const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw - 1);
      if (x1 > x0) {
        const t = hash(xx * 3 + seed, row * 7 + R.s, 11);
        const face = t < 0.2 ? mix(r[3], r[2], 0.4) : t > 0.82 ? mix(r[3], r[4], 0.45) : r[3];
        P(face, x0, yy, x1 - x0, hh);
        P(mix(face, r[5], 0.6), x0, yy, x1 - x0, 1);
        if (hh > 2) P(mix(face, r[2], 0.6), x0 + 1, yy + hh - 1, x1 - x0 - 1, 1);
      }
      xx += bw;
    }
  }
  return r;
}
// Mampostería irregular de masía: piedras redondeadas sobre mortero de cal
function rubble(R, x, y, w, h, c, mortar = '#d8ccb0') {
  const { P } = R, r = ramp(c), m = ramp(mortar);
  P(m[3], x, y, w, h);
  for (let j = 0; j < h; j += 4) {
    let i = x - Math.floor(hash(j, R.s, 5) * 4);
    while (i < x + w) {
      const sw = 3 + Math.floor(hash(i, j, R.s + 9) * 4), sh = Math.min(3 + (hash(i, j, 77) < 0.3 ? 1 : 0), y + h - (y + j));
      const t = hash(i, j, 21); const f = t < 0.28 ? r[2] : t > 0.78 ? r[4] : r[3];
      const x0 = Math.max(x, i), x1 = Math.min(x + w, i + sw);
      if (x1 - x0 >= 2 && sh >= 2) {
        P(f, x0 + 1, y + j, x1 - x0 - 2, 1); P(f, x0, y + j + 1, x1 - x0, sh - 2); P(f, x0 + 1, y + j + sh - 1, x1 - x0 - 2, 1);
        P(mix(f, r[6], 0.5), x0 + 1, y + j, Math.max(1, x1 - x0 - 3), 1);
        P(mix(f, r[1], 0.5), x0 + 2, y + j + sh - 1, Math.max(1, x1 - x0 - 3), 1);
      }
      i += sw + 1;
    }
  }
  return r;
}
// Esquinas de sillería (cadenas de esquina)
function quoins(R, x, y, h, c, right = false) {
  const { P } = R, r = ramp(c);
  for (let j = y, k = 0; j < y + h; j += 4, k++) {
    const w = k % 2 ? 4 : 6, xx = right ? x - w + 1 : x;
    P(r[3], xx, j, w, 3); P(r[5], xx, j, w, 1); P(r[1], xx, j + 3, w, 1);
  }
}
function plinth(R, W, H, c = '#9c8a78') {
  const { P } = R, r = ramp(c);
  P(r[3], 0, H - 4, W, 3); P(r[5], 0, H - 4, W, 1);
  for (let i = 3 + (R.s % 5); i < W; i += 7 + (i % 3)) P(r[2], i, H - 3, 1, 2);
  P(mix(r[1], INK, 0.45), 0, H - 1, W, 1);
}
function eaveShadow(R, y, W, wr) { const { P } = R; P(wr[1], 0, y, W, 1); for (let i = 0; i < W; i++) if ((i + y) % 2) P(wr[2], i, y + 1); }

// ───────────── Tejados ─────────────
// Tejado a cuatro aguas de teja árabe: faldón frontal con columnas de cobijas, limatesas laterales.
function hipRoof(R, x0, y0, w, h, base, hip = null) {
  const { P } = R, r = ramp(base), c = (i) => r[Math.max(0, Math.min(6, i))];
  hip = hip ?? Math.min(12, Math.round(w * 0.14) + 3);
  for (let j = 0; j < h; j++) {
    const k = Math.round(hip * (1 - j / Math.max(1, h - 1))), xl = x0 + k, xr = x0 + w - k;
    const lift = j < h * 0.3 ? 1 : j > h * 0.75 ? -1 : 0;
    for (let i = x0; i < x0 + w; i++) {
      let col;
      if (i < xl) col = j % 5 === 4 ? c(3) : j % 5 === 3 ? c(6) : c(5);
      else if (i >= xr) col = j % 5 === 4 ? c(0) : j % 5 === 3 ? c(3) : c(2);
      else {
        const q = i - x0 - 1, cx = ((q % 4) + 4) % 4, rr = (j + (Math.floor(q / 4) % 2 ? 2 : 0)) % 5;
        if (cx === 3) col = c(1 + (lift > 0 ? 1 : 0));
        else if (rr === 4) col = c(2 + lift);
        else if (rr === 3) col = c((cx === 2 ? 4 : 6) + Math.min(0, lift));
        else col = c([5, 4, 3][cx] + lift);
      }
      P(col, i, y0 + j);
    }
    if (k > 0) { P(c(6), xl, y0 + j); P(c(0), xr - 1, y0 + j); }
  }
  // cumbrera
  const rl = x0 + hip, rw = w - hip * 2;
  if (rw > 0) { P(c(6), rl, y0, rw, 1); P(c(4), rl, y0 + 1, rw, 1); P(c(1), rl, y0 + 2, rw, 1); for (let i = rl + 3; i < rl + rw - 1; i += 5) P(c(2), i, y0, 1, 2); }
  // alero: cabezas de teja
  for (let i = x0; i < x0 + w; i++) { const q = (i - x0 - 1) & 3; P(q === 3 ? c(0) : q === 0 ? c(5) : c(3), i, y0 + h - 1); }
  return r;
}
// Azotea (terrat) con pretil, suelo de rasilla y cosas de vecinos: colada, torratxa, depósito, macetas
function terrat(R, x0, y0, w, h, wr) {
  const { P } = R, t = ramp('#c88c64');
  P(t[4], x0 + 1, y0 + 2, w - 2, h - 5);
  for (let j = y0 + 2; j < y0 + h - 3; j++) for (let i = x0 + 1; i < x0 + w - 1; i++) {
    const rj = j - y0 - 2; if (rj % 4 === 3 || (i + (Math.floor(rj / 4) % 2) * 3) % 6 === 0) P(t[3], i, j);
    else if (hash(i, j, R.s) < 0.05) P(t[5], i, j);
  }
  P(t[2], x0 + 2, y0 + 2, w - 4, 1); P(t[3], x0 + 2, y0 + 3, w - 4, 1); // sombra del pretil trasero
  P(wr[3], x0, y0, w, 2); P(wr[5], x0, y0, w, 1);
  P(wr[4], x0, y0, 2, h); P(wr[2], x0 + w - 2, y0, 2, h); P(wr[5], x0, y0, 1, h);
  const mode = Math.floor(hash(R.s, 1, 9) * 4);
  if (mode === 2) { // torratxa: casetilla de la escalera con su tejadillo y su puerta
    const tx = hash(R.s, 3, 5) < 0.5 ? x0 + 3 : x0 + w - 17, tr = ramp('#b4583a');
    P(wr[3], tx, y0 + 3, 14, 10); P(wr[5], tx, y0 + 3, 1, 10); P(wr[1], tx + 13, y0 + 3, 1, 10);
    for (let j = 0; j < 4; j++) { P(j === 0 ? tr[6] : tr[4], tx - 1, y0 - 1 + j, 16, 1); for (let i = tx; i < tx + 15; i += 4) P(tr[2], i + (j & 1) * 2, y0 - 1 + j, 1, 1); }
    P(tr[1], tx - 1, y0 + 3, 16, 1);
    P('#5a3a2a', tx + 4, y0 + 6, 5, 7); P('#7a5234', tx + 4, y0 + 6, 5, 1); P('#e8c050', tx + 8, y0 + 9, 1, 1);
    for (let i = tx === x0 + 3 ? x0 + w - 12 : x0 + 4; i < (tx === x0 + 3 ? x0 + w - 3 : x0 + 14); i += 4) pot(R, i, y0 + h - 4);
  } else if (mode < 2) { // tendedero con la colada
    const a = x0 + 4, bb = x0 + w - 6, ly = y0 + 3, wd = ramp('#7a5a3a');
    P(wd[2], a, ly, 1, h - 7); P(wd[2], bb, ly, 1, h - 7); P('#e8e0d4', a, ly, bb - a + 1, 1);
    const cols = ['#f2ece0', '#6a8ac8', '#d8504a', '#f0d070', '#8ab06a', '#f2ece0', '#e8a0b0'];
    for (let i = a + 2, k = 0; i < bb - 2; i += 5, k++) {
      if (hash(i, k, R.s) < 0.2) continue;
      const cc = ramp(cols[(k + R.s) % cols.length]), gw = 3 + (k % 2), gh = 4 + ((k + R.s) % 2);
      P(cc[3], i, ly + 1, gw, gh); P(cc[5], i, ly + 1, 1, gh); P(cc[1], i, ly + 1 + gh, gw, 1); P('#9a8a7a', i + 1, ly, 1, 1);
    }
  } else { // depósito de agua y macetas
    const dx = x0 + w - 12, dy = y0 + 2, d = ramp('#a8a49c');
    P(d[3], dx, dy + 2, 8, 6); P(d[5], dx, dy + 1, 8, 2); P(d[2], dx + 6, dy + 2, 2, 6); P(d[1], dx, dy + 8, 8, 1);
    for (let i = x0 + 4; i < x0 + 16; i += 4) pot(R, i, y0 + h - 4);
  }
  P(wr[3], x0, y0 + h - 4, w, 4); P(wr[6], x0, y0 + h - 4, w, 1); P(wr[2], x0, y0 + h - 1, w, 1);
  for (let i = x0 + 2; i < x0 + w - 2; i += 3) P(wr[4], i, y0 + h - 3, 2, 1); // remate calado
  for (let i = x0 + 5; i < x0 + w - 3; i += 9) P(IRON[2], i, y0 + h - 1, 2, 1); // gárgolas de desagüe
}
// Ràfec: alero catalán de varias hiladas (ladrillo dentado + cal) con sombra
function rafec(R, y, W, wr) {
  const { P } = R, br = ramp('#b8704c');
  P(br[2], -1, y, W + 2, 1); for (let i = -1; i < W + 1; i += 2) P(br[5], i, y, 1, 1);
  P(wr[6], 0, y + 1, W, 1);
  P(wr[1], 0, y + 2, W, 1); for (let i = 0; i < W; i++) if ((i + y) % 2) P(wr[2], i, y + 3);
}
// Buhardilla con tejadillo a dos aguas (cx centro, y = base sobre el alero)
function dormer(R, cx, y, roofC, wr) {
  const { P } = R, r = ramp(roofC);
  P(wr[3], cx - 4, y - 8, 9, 8); P(wr[5], cx - 4, y - 8, 1, 8); P(wr[1], cx + 4, y - 8, 1, 8);
  P(GL[0], cx - 2, y - 6, 5, 5); P(GL[1], cx - 2, y - 6, 5, 2); P(GL[3], cx - 2, y - 6, 1, 1); P('#5a3a2c', cx, y - 6, 1, 5);
  for (let j = 0; j < 6; j++) { P(r[j === 0 ? 6 : 5], cx - j - 1, y - 14 + j, j + 1, 1); P(r[2], cx, y - 14 + j, j + 2, 1); }
  P(r[3], cx - 7, y - 8, 15, 1); P(r[1], cx - 7, y - 7, 15, 1);
  R.lit.push({ x: cx - 2, y: y - 6, w: 5, h: 5, k: 'win', m: cx, s: hash(cx, y, R.s + 9) });
}
// Tribuna: mirador de madera saledizo
function tribuna(R, x, y, w, h, wr) {
  const { P } = R, wd = ramp('#7a4a2e');
  P(wd[1], x - 1, y - 2, w + 2, 2); P(wd[4], x - 1, y - 3, w + 2, 1); // tejadillo
  P(wd[3], x, y, w, h); P(wd[5], x, y, 1, h); P(wd[1], x + w - 1, y, 1, h);
  for (let i = x + 2; i < x + w - 2; i += 4) { P(GL[1], i, y + 1, 3, h - 5); P(GL[0], i, y + 1 + Math.floor((h - 5) / 2), 3, Math.ceil((h - 5) / 2)); P(GL[3], i, y + 1, 1, 1); R.lit.push({ x: i, y: y + 1, w: 3, h: h - 5, k: 'win', m: -1, s: hash(i, y, R.s + 4) }); }
  P(wd[2], x, y + h - 4, w, 4); P(wd[4], x, y + h - 4, w, 1); for (let i = x + 1; i < x + w - 1; i += 3) P(wd[1], i, y + h - 3, 1, 2);
  P(wr[1], x, y + h, w, 1);
}
// Fábrica de ladrillo visto
function brick(R, x, y, w, h, c = '#b4664a') {
  const { P } = R, r = ramp(c), m = ramp('#d8c8b0');
  P(m[2], x, y, w, h);
  for (let j = 0; j < h; j += 3) for (let i = -((j / 3) % 2) * 3; i < w; i += 6) {
    const x0 = Math.max(0, i), x1 = Math.min(w, i + 5); if (x1 <= x0) continue;
    const t = hash(i + x, j + y, R.s + 2); P(t < 0.2 ? r[2] : t > 0.85 ? r[4] : r[3], x + x0, y + j, x1 - x0, 2); P(r[5], x + x0, y + j, x1 - x0, 1);
  }
  return ramp(mix(c, '#d8c8b0', 0.25));
}
// Tejado a dos aguas con el hastial de cara (masías, ermitas): faldón izquierdo iluminado, derecho en sombra
function gableRoof(R, x0, y0, w, eaveY, apexY, base) {
  const { P } = R, r = ramp(base), cx = x0 + Math.floor(w / 2);
  for (let j = y0; j < eaveY + 1; j++) for (let i = x0; i < x0 + w; i++) {
    const left = i < cx, dx = left ? cx - i : i - cx + 1;
    const edge = apexY + ((eaveY - apexY) * dx) / (w / 2); // línea del hastial
    if (j > edge + 1) continue;
    const q = j - y0, row = q % 4, lip = ((i + (Math.floor(q / 4) % 2) * 3) % 7) === 0;
    let col = left ? [r[6], r[5], r[4], r[2]][row] : [r[3], r[2], r[2], r[0]][row];
    if (lip && row === 2) col = left ? r[3] : r[1]; // muesca del solape de cada teja
    if (j >= edge - 1) col = left ? r[6] : r[1]; // vierteaguas del hastial
    P(col, i, j);
  }
  P(r[6], cx - 1, y0, 1, apexY - y0 + 1); P(r[1], cx, y0, 1, apexY - y0 + 1); // cumbrera hacia el fondo
  return r;
}
// Paja / carrizo: hebras, cumbrera enrollada y flecos irregulares
function thatch(R, x0, y0, w, h, c, o = {}) {
  const { P } = R, r = ramp(c), hip = o.hip ?? Math.round(w * 0.2);
  for (let j = 0; j < h; j++) {
    const k = Math.round(hip * (1 - j / Math.max(1, h - 1)));
    for (let i = x0 + k; i < x0 + w - k; i++) {
      const n = hash(i * 3, Math.floor((j + hash(i, 0, 5) * 6) / 3), R.s);
      let col = n < 0.2 ? r[2] : n > 0.8 ? r[5] : r[4];
      if (i - (x0 + k) < 2) col = n < 0.5 ? r[5] : r[6];
      if (x0 + w - k - i <= 2) col = n < 0.5 ? r[1] : r[2];
      if (o.moss && fbmLite(i, j, R.s) > 0.62) col = bayer(i, j) < 0.5 ? '#4a6a3a' : '#5a7a3e';
      P(col, i, y0 + j);
    }
  }
  const rl = x0 + hip, rw = w - hip * 2;
  if (rw > 0) { P(r[5], rl - 1, y0 - 1, rw + 2, 2); P(r[2], rl - 1, y0 + 1, rw + 2, 1); for (let i = rl; i < rl + rw; i += 4) P(r[3], i, y0 - 1, 1, 2); }
  for (let i = x0; i < x0 + w; i++) { const d = 1 + Math.floor(hash(i, 3, R.s) * 3); P(r[3], i, y0 + h, 1, d); P(r[1], i, y0 + h + d, 1, 1); }
  return r;
}
const fbmLite = (i, j, s) => (hash(i >> 2, j >> 2, s) * 0.6 + hash(i >> 1, j >> 1, s + 1) * 0.4);

// ───────────── Piezas de fachada ─────────────
function chimney(R, x, y, h = 10, c = '#a8826a') {
  const { P } = R, r = ramp(c);
  P(r[3], x, y + 2, 6, h - 2); P(r[5], x, y + 2, 1, h - 2); P(r[1], x + 5, y + 2, 1, h - 2);
  for (let j = y + 4; j < y + h; j += 3) P(r[2], x + 1, j, 4, 1);
  P(r[5], x - 1, y, 8, 2); P(r[2], x - 1, y + 2, 8, 1); P(INK2, x + 1, y, 4, 1);
  R.smoke.push({ x: x + 3, y: y - 1 });
}
// Ventana: hueco (x,y,w,h), marco, cristal, alféizar y persianas mallorquinas abiertas
function win(R, x, y, w, h, o = {}) {
  const { P } = R, wr = o.wr || R.wr, fr = o.frame || '#5a3a2c', arch = o.arch || 'flat', ar = o.ar ?? arOf(arch, w);
  rows(x - 1, y - 1, w + 2, h + 1, arch, ar ? ar + 1 : 0, (yy, a, b) => P(wr[1], a, yy, b - a, 1));
  rows(x, y, w, h, arch, ar, (yy, a, b, k) => P(k < h * 0.4 ? GL[1] : GL[0], a, yy, b - a, 1));
  P(GL[2], x + 1, y + (ar ? 2 : 1), 1, Math.min(2, h - 2)); P(GL[3], x + 1, y + (ar ? 2 : 1));
  if (w >= 4 && h >= 5) { P(GL[2], x + w - 2, y + Math.max(1, ar), 1, 1); P(GL[2], x + w - 3, y + Math.max(1, ar) + 1, 1, 1); } // reflejo en diagonal
  const m = w >= 5 ? x + (w >> 1) : -1; if (m >= 0) P(fr, m, y + (ar ? 2 : 0), 1, h - (ar ? 2 : 0));
  if (!o.noSill) { P(wr[5], x - 1, y + h, w + 2, 1); P(wr[1], x - 1, y + h + 1, w + 2, 1); }
  if (o.shutter) {
    const s = ramp(o.shutter);
    for (const sx of [x - 3, x + w + 1]) { P(s[3], sx, y - 1, 2, h + 1); for (let j = y; j < y + h; j += 2) P(s[2], sx, j, 2, 1); P(s[5], sx, y - 1, 2, 1); P(s[1], sx + 1, y, 1, h); }
  }
  if (o.bars) for (let i = x + 1; i < x + w; i += 2) P(IRON[1], i, y, 1, h);
  R.lit.push({ x, y, w, h, k: o.k || 'win', arch, ar, m, s: hash(x, y, R.s + 5) });
}
function balcony(R, x, y, w) { // y = losa del balcón
  const { P } = R;
  P('#d4c8b4', x, y, w, 1); P('#7a6c62', x, y + 1, w, 1);
  P(IRON[2], x, y - 5, w, 1); P(IRON[1], x, y - 4, w, 1);
  for (let i = x; i < x + w; i += 2) P(IRON[1], i, y - 3, 1, 3);
  P(IRON[1], x + w - 1, y - 3, 1, 3);
  if (hash(x, y, R.s) < 0.6) pot(R, x + 2 + Math.floor(hash(y, x, R.s) * (w - 6)), y - 5);
}
function pot(R, x, y) { // maceta de geranios (3x5), y = base
  const { P } = R, f = ramp(FLOWERS[Math.floor(hash(x, y, R.s + 3) * FLOWERS.length)]);
  P('#a8583a', x, y - 2, 3, 2); P('#c87048', x, y - 2, 1, 1); P('#7a3a2a', x + 2, y - 1, 1, 1);
  P('#2e6a3a', x, y - 4, 3, 2); P('#4a8a40', x, y - 4, 1, 1);
  P(f[4], x, y - 5); P(f[3], x + 2, y - 5); P(f[5], x + 1, y - 4);
}
// Puerta con arco: cx centro, base = fila del umbral
function door(R, cx, base, o = {}) {
  const { P } = R, w = o.w || 10, h = o.h || 13, x = Math.round(cx - w / 2), y = base - h;
  const arch = o.arch || 'round', ar = o.ar ?? arOf(arch, w);
  const wd = ramp(o.color || '#6e4228'), st = ramp(o.stone || '#c4b096');
  // dovelas / marco de piedra
  rows(x - 2, y - 2, w + 4, h + 2, arch, ar ? ar + 2 : 0, (yy, a, b) => P(st[3], a, yy, b - a, 1));
  if (ar && o.voussoirs !== false) rows(x - 2, y - 2, w + 4, ar + 2, arch, ar + 2, (yy, a, b, k) => { for (let i = a; i < b; i++) if ((i * 3 + k * 5) % 7 === 0) P(st[1], i, yy); });
  rows(x - 2, y - 2, w + 4, h + 2, arch, ar ? ar + 2 : 0, (yy, a, b, k) => { P(st[5], a, yy, 1, 1); if (k === 0) P(st[5], a, yy, b - a, 1); P(st[1], b - 1, yy, 1, 1); });
  // hojas
  rows(x, y, w, h, arch, ar, (yy, a, b) => P(wd[3], a, yy, b - a, 1));
  rows(x, y, w, h, arch, ar, (yy, a, b, k) => { P(wd[1], a, yy, 1, 1); if (k < 2 || yy === y + ar) P(wd[1], a, yy, b - a, 1); });
  for (let i = x + 2; i < x + w - 1; i += 3) P(wd[2], i, y + Math.max(2, ar - 1), 1, h - Math.max(2, ar - 1));
  P(wd[5], x + 1, y + ar + 1, 1, h - ar - 2);
  if (o.dbl) { P(wd[0], x + (w >> 1), y + 1, 1, h - 1); P('#e8c050', x + (w >> 1) - 2, y + Math.round(h * 0.55), 1, 1); P('#e8c050', x + (w >> 1) + 1, y + Math.round(h * 0.55), 1, 1); }
  else { P('#e8c050', x + w - 3, y + Math.round(h * 0.55), 1, 1); P('#7a5a1a', x + w - 3, y + Math.round(h * 0.55) + 1, 1, 1); }
  if (o.studs) for (let j = y + ar + 2; j < y + h - 1; j += 3) for (let i = x + 1; i < x + w - 1; i += 3) P(IRON[2], i, j);
  if (o.knocker) { P(IRON[3], x + (w >> 1) - 1, y + ar + 2, 2, 2); P(IRON[1], x + (w >> 1) - 1, y + ar + 4, 2, 1); }
  P(st[5], x - 1, base, w + 2, 1); // umbral
  R.door = { x, y, w, h, arch, ar, dbl: !!o.dbl, col: o.color || '#6e4228' };
}
function hangingSign(R, x, y, icon, o = {}) { // tablero colgado de un brazo de hierro (x,y = esquina del tablero)
  const { P } = R, bw = ramp(o.board || '#6a4428'), w = o.w || 11, h = o.h || 9;
  P(IRON[1], x - 3, y - 3, w + 2, 1); P(IRON[1], x - 3, y - 4, 1, 3); P(IRON[2], x - 1, y - 4, 1, 1);
  P(IRON[2], x + 2, y - 2, 1, 2); P(IRON[2], x + w - 3, y - 2, 1, 2);
  P(bw[3], x, y, w, h); P(bw[5], x, y, w, 1); P(bw[4], x, y, 1, h - 1); P(bw[1], x, y + h - 1, w, 1); P(bw[2], x + w - 1, y, 1, h);
  icon(P, x, y);
}
function lantern(R, x, y) { // farol de pared 5x7 (x,y = esquina sup.)
  const { P } = R;
  P(IRON[1], x + 2, y - 3, 1, 2); P(IRON[1], x + 1, y - 1, 3, 1);
  P(IRON[1], x, y, 5, 1); P(IRON[1], x, y + 5, 5, 1); P(IRON[1], x, y, 1, 6); P(IRON[1], x + 4, y, 1, 6);
  P('#a87a3a', x + 1, y + 1, 3, 4); P('#d8a85a', x + 1, y + 1, 1, 2); P(IRON[2], x + 2, y + 6, 1, 1);
  R.lit.push({ x: x + 1, y: y + 1, w: 3, h: 4, k: 'lamp' });
}
function torch(R, x, y) { // antorcha de pared (castillo, cuartel)
  const { P } = R;
  P(IRON[1], x, y + 3, 3, 1); P('#6a4428', x + 1, y + 2, 1, 4); P('#e8a040', x, y, 3, 2); P('#ffe08a', x + 1, y, 1, 1);
  R.lit.push({ x, y: y - 1, w: 3, h: 3, k: 'fire' });
}
function barrel(R, x, y) { // barril de pie 5x6 (y = base)
  const { P } = R, w = ramp('#8a5634');
  P(w[3], x, y - 5, 5, 5); P(w[4], x + 1, y - 6, 3, 1); P(w[5], x + 1, y - 5, 1, 4); P(w[1], x + 4, y - 5, 1, 5);
  P(IRON[2], x, y - 4, 5, 1); P(IRON[2], x, y - 2, 5, 1); P(w[2], x + 1, y - 6, 1, 1);
}
function plaque(R, x, y) { // placa de azulejo con el nombre de la calle
  const { P } = R; P('#f2eee4', x, y, 7, 4); P('#3a5aa8', x, y, 7, 1); P('#3a5aa8', x, y + 3, 7, 1); P('#3a5aa8', x + 1, y + 2, 4, 1);
}
function niche(R, x, y) { // capelleta: hornacina con un santo y una lamparilla
  const { P } = R; const st = ramp('#c8b8a0');
  rows(x - 1, y - 1, 7, 10, 'round', 3, (yy, a, b) => P(st[5], a, yy, b - a, 1));
  rows(x, y, 5, 8, 'round', 2, (yy, a, b) => P('#3a3048', a, yy, b - a, 1));
  P('#e8d8b8', x + 2, y + 2, 1, 1); P('#5a6ab0', x + 1, y + 3, 3, 3); P('#e8c050', x + 2, y + 1, 1, 1);
  P(st[2], x - 1, y + 8, 7, 1); P('#f0d080', x + 2, y + 6, 1, 1);
  R.lit.push({ x: x + 2, y: y + 6, w: 1, h: 1, k: 'lamp' });
}
function downpipe(R, x, y0, y1) { const { P } = R; P(IRON[2], x, y0, 1, y1 - y0); P(IRON[3], x, y0, 1, 1); for (let j = y0 + 6; j < y1; j += 8) P(IRON[1], x - 1, j, 3, 1); }
function forSale(R, x, y) { // cartel de «se vende»
  const { P } = R; P(IRON[2], x + 4, y - 2, 1, 2); P('#f4ecd8', x, y, 9, 6); P('#c8b898', x, y + 5, 9, 1); P('#b8322c', x + 1, y + 1, 7, 1); P('#b8322c', x + 2, y + 3, 5, 1); P('#7a6a5a', x + 8, y, 1, 6);
}
// Toldo a rayas con festón; sombra debajo
function awning(R, x, y, w, c) {
  const { P } = R, a = ramp(c), cr = ramp('#efe4cc');
  for (let i = 0; i < w; i++) {
    const on = Math.floor(i / 4) % 2 === 0, r = on ? a : cr, k = i & 3;
    P(r[1], x + i, y, 1, 1); P(r[4], x + i, y + 1, 1, 1); P(r[3], x + i, y + 2, 1, 3);
    const drop = k === 0 || k === 3 ? 1 : 2; P(r[2], x + i, y + 5, 1, drop);
  }
  P(a[0], x, y, w, 1);
  for (let i = 0; i < w; i++) if (((i & 3) === 0 || (i & 3) === 3)) P(R.wr[1], x + i, y + 6); else P(R.wr[1], x + i, y + 7);
}
// Escaparate con género
function showcase(R, x, y, w, h, goods) {
  const { P } = R, fr = ramp('#6a4428');
  P(fr[2], x - 1, y - 1, w + 2, h + 2); P(fr[4], x - 1, y - 1, w + 2, 1);
  P('#2a2638', x, y, w, h); P('#3a3a58', x, y, w, 2);
  P(fr[3], x, y + h - 2, w, 2); P(fr[5], x, y + h - 2, w, 1); // repisa
  (GOODS[goods] || GOODS.def)(P, x, y, w, h);
  P(GL[3], x + 1, y + 1, 1, 1); P(GL[2], x + 2, y + 1, 1, 1);
  R.lit.push({ x, y, w, h: h - 2, k: 'shop' });
}
const GOODS = {
  t_libros: (P, x, y, w, h) => { for (let i = 0; i < w - 1; i += 2) { const c = ['#8a3a2a', '#3a5a8a', '#c8a040', '#4a7a4a', '#7a4a7a'][(i >> 1) % 5]; P(c, x + 1 + i, y + h - 7, 1, 5); P(ramp(c)[5], x + 1 + i, y + h - 7, 1, 1); } },
  t_pan: (P, x, y, w, h) => { for (let i = 1; i < w - 3; i += 4) { P('#c88a44', x + i, y + h - 5, 4, 3); P('#e8b868', x + i + 1, y + h - 5, 2, 1); P('#8a5a2a', x + i, y + h - 3, 4, 1); } },
  t_hierbas: (P, x, y, w, h) => { for (let i = 1; i < w - 1; i += 3) { P('#3a7a3a', x + i, y + h - 7, 2, 4); P('#6aaa4a', x + i, y + h - 7, 1, 2); P('#a87a4a', x + i, y + h - 3, 2, 1); } P('#a86ac8', x + 2, y + 2, 1, 1); },
  t_alquimia: (P, x, y, w, h) => { const c = ['#4ac86a', '#c84a8a', '#4a8ac8', '#e8c040']; for (let i = 1, k = 0; i < w - 2; i += 3, k++) { P('#c8d8e8', x + i, y + h - 7, 2, 1); P(c[k % 4], x + i, y + h - 6, 2, 3); P(ramp(c[k % 4])[5], x + i, y + h - 6, 1, 1); } },
  t_velas: (P, x, y, w, h) => { for (let i = 1; i < w - 1; i += 2) { const t = 3 + ((i * 7) % 3); P('#f0e8d0', x + i, y + h - 2 - t, 1, t); P('#f0c040', x + i, y + h - 3 - t, 1, 1); } },
  t_pesca: (P, x, y, w, h) => { for (let i = 1; i < w - 4; i += 5) { P('#9ab8c8', x + i, y + h - 5, 4, 2); P('#d0e4ec', x + i, y + h - 5, 3, 1); P('#6a8a9a', x + i + 4, y + h - 6, 1, 3); P(INK, x + i + 1, y + h - 5, 1, 1); } },
  t_ceramica: (P, x, y, w, h) => { for (let i = 1; i < w - 3; i += 4) { P('#b8603a', x + i, y + h - 6, 3, 4); P('#d88a5a', x + i, y + h - 6, 1, 3); P('#8a3a2a', x + i, y + h - 7, 3, 1); P('#e8d8b8', x + i + 1, y + h - 4, 1, 1); } },
  t_forja: (P, x, y, w, h) => { for (let i = 1; i < w - 2; i += 3) { P('#8a92a2', x + i, y + h - 8, 1, 6); P('#c4ccd8', x + i, y + h - 8, 1, 1); P('#6a4428', x + i, y + h - 3, 1, 1); } },
  t_sastre: (P, x, y, w, h) => { const c = ['#c84a6a', '#4a6ac8', '#e8c040', '#4a9a6a']; for (let i = 1, k = 0; i < w - 2; i += 3, k++) { P(c[k % 4], x + i, y + h - 6, 3, 4); P(ramp(c[k % 4])[5], x + i, y + h - 6, 3, 1); } },
  def: (P, x, y, w, h) => { for (let i = 1; i < w - 2; i += 3) P(['#c8a040', '#8a5a3a', '#4a7a4a'][i % 3], x + i, y + h - 5, 2, 3); },
};

// ───────────── Casa tipo (casas, tabernas, tiendas) ─────────────
// Variantes deterministas por posición: tejado (cuatro aguas, buhardilla o azotea), color del revoco,
// cadenas de esquina, balcones (ninguno, sobre la puerta, todos o corrido), tribuna y planta baja.
function townhouse(R, o = {}) {
  const { b, W, H, P } = R, tall = b.h >= 4;
  const fy = o.fy ?? (tall ? 20 : 18), gy = H - (tall ? 24 : 16);
  const wallC = o.wall || b.wall || pv(PLASTER, R, 1);
  const wr = R.wr = o.brick ? brick(R, 0, fy, W, H - fy) : o.stone ? ashlar(R, 0, fy, W, H - fy, wallC) : plaster(R, 0, fy, W, H - fy, wallC);
  if (!o.brick && (o.quoins ?? hash(R.s, 3, 7) < 0.3)) { const q = mix(wallC, '#efe4cc', 0.55); quoins(R, 0, fy + 4, gy - fy - 3, q); quoins(R, W - 1, fy + 4, gy - fy - 3, q, true); }
  P(wr[5], 0, gy, W, 1); P(wr[1], 0, gy + 1, W, 1); // imposta entre plantas
  plinth(R, W, H);
  const roofC = o.roof || b.roof || pv(TERRA, R, 2);
  if (o.terrat) { terrat(R, -1, -6, W + 2, fy + 6, wr); P(wr[1], 0, fy, W, 1); P(wr[2], 0, fy + 1, W, 1); }
  else {
    hipRoof(R, -1, -6, W + 2, fy + 6, roofC);
    if (o.dormer ?? (hash(R.s, 5, 3) < 0.35 && !o.chimneyOnly)) dormer(R, Math.round(W / 2) + (hash(R.s, 6, 1) < 0.5 ? -8 : 8), fy - 1, roofC, wr);
    rafec(R, fy, W, wr);
  }
  if (o.chimney !== false && (b.kind === 'casa' || b.kind === 'taberna' || o.chimney)) chimney(R, 6 + Math.floor(R.v * (W - 18)), -14, 12);
  // planta alta
  const dc = b.door.x - b.x, shut = o.shutter || pv(SHUT, R, 3);
  const balc = o.balcony ?? Math.floor(hash(R.s, 7, 3) * 4); // 0 ninguno · 1 sobre la puerta · 2 todos · 3 corrido
  if (tall) for (let c = 0; c < b.w; c++) { const ax = c * 16 + 6; P(wr[1], ax - 1, fy + 4, 6, 4); P(GL[0], ax, fy + 5, 4, 3); P(GL[2], ax, fy + 5, 1, 1); P(wr[5], ax - 1, fy + 8, 6, 1); R.lit.push({ x: ax, y: fy + 5, w: 4, h: 3, k: 'win', m: -1, s: hash(ax, fy, R.s) }); }
  const uy = tall ? fy + 10 : fy + 5, uh = tall ? 9 : 8;
  const trib = o.tribuna ?? (b.kind === 'casa' && hash(R.s, 8, 4) < 0.18);
  for (let c = 0; c < b.w; c++) {
    const wx = c * 16 + 5;
    if (trib && c === dc) { tribuna(R, c * 16 + 1, uy - 1, 14, uh + 3, wr); continue; }
    win(R, wx, uy, 6, uh, { wr, shutter: shut });
    if (balc === 2 || (balc === 1 && c === dc)) balcony(R, wx - 3, uy + uh, 12);
    else if (balc !== 3 && hash(c, R.s, 31) < 0.4) pot(R, wx + 1 + Math.floor(hash(c, 2, R.s) * 3), uy + uh);
  }
  if (balc === 3 && !trib) balcony(R, 2, uy + uh, W - 4);
  if (o.pipe !== false && W >= 64) downpipe(R, R.v < 0.5 ? 1 : W - 2, fy + 3, H - 4);
  return { fy, gy, dc, wr, shut };
}

function casa(R) {
  const { b, W, H, P } = R;
  const roofKind = hash(R.s, 2, 13);
  const L = townhouse(R, { terrat: roofKind < 0.3 });
  const { gy, dc, wr } = L;
  door(R, dc * 16 + 8, H - 2, { h: 12, color: pv(DOORC, R, 4), knocker: R.v > 0.5, arch: hash(R.s, 1, 1) < 0.25 ? 'flat' : 'round' });
  for (let c = 0; c < b.w; c++) {
    if (c === dc) continue;
    const t = hash(c, R.s, 12), x = c * 16;
    if (t < 0.5) win(R, x + 5, gy + 4, 6, 6, { wr, bars: true });
    else if (t < 0.66) niche(R, x + 6, gy + 3);
    else if (t < 0.84) { // puerta de obrador
      const wd = ramp('#7a5434'); P(wr[1], x + 3, gy + 3, 10, H - gy - 5); P(wd[3], x + 4, gy + 4, 8, H - gy - 6); for (let i = x + 5; i < x + 12; i += 2) P(wd[2], i, gy + 4, 1, H - gy - 6); P(wd[5], x + 4, gy + 4, 8, 1); P(IRON[2], x + 10, gy + 8, 1, 2);
    } else { // banco de piedra y macetas a pie de calle
      win(R, x + 5, gy + 3, 6, 5, { wr, bars: true });
      const st = ramp('#b0a090'); P(st[3], x + 2, H - 6, 12, 3); P(st[5], x + 2, H - 6, 12, 1); P(st[1], x + 2, H - 3, 12, 1);
    }
  }
  if (hash(R.s, 4, 8) < 0.5) plaque(R, dc === 0 ? W - 9 : 2, gy + 3);
  if (hash(R.s, 11, 2) < 0.4) { pot(R, dc * 16 + 1, H - 2); pot(R, dc * 16 + 12, H - 2); }
  if (b.forSale) forSale(R, dc * 16 + 13 > W - 10 ? dc * 16 - 10 : dc * 16 + 13, gy + 5);
}

// ───────────── Tabernas ─────────────
const TAVERN = {
  tab_oca: { board: '#2e5a5a', wall: '#f0e8d8', shutter: '#3d5f8c', icon: (P, x, y) => { P('#f4f0e6', x + 5, y + 5, 6, 3); P('#d8d0c4', x + 6, y + 7, 5, 1); P('#ffffff', x + 5, y + 5, 4, 1); P('#f4f0e6', x + 4, y + 2, 2, 4); P('#f4f0e6', x + 3, y + 2, 2, 1); P('#f0a030', x + 2, y + 2, 1, 1); P(INK, x + 4, y + 2, 1, 1); P('#f0a030', x + 7, y + 8, 1, 1); P('#f0a030', x + 9, y + 8, 1, 1); } },
  tab_drac: { board: '#5a2a2a', wall: '#d8a070', shutter: '#7a3e2c', icon: (P, x, y) => { P('#3a8a4a', x + 3, y + 4, 6, 3); P('#5aaa5a', x + 3, y + 4, 5, 1); P('#3a8a4a', x + 8, y + 2, 3, 3); P('#e8c040', x + 9, y + 3, 1, 1); P('#3a8a4a', x + 1, y + 6, 3, 1); P('#2a6a3a', x + 4, y + 2, 3, 2); P('#e84a2a', x + 11, y + 4, 1, 1); P('#c8a040', x + 5, y + 7, 2, 2); P('#f0e070', x + 5, y + 7, 1, 1); } },
  tab_gats: { board: '#2a2a3a', brick: true, shutter: '#2f6a5e', icon: (P, x, y) => { for (let k = 0; k < 4; k++) { const cx = x + 1 + k * 3; P('#d8d0c0', cx, y + 4, 2, 3); P('#d8d0c0', cx, y + 3, 1, 1); P('#d8d0c0', cx + 1, y + 3, 1, 1); P('#e8c040', cx, y + 5, 1, 1); } } },
  tab_ramb: { board: '#4a2a3a', wall: '#e2b97c', shutter: '#4f7a3a', parra: true, icon: (P, x, y) => { const g = ['#6a2a6a', '#8a3a8a', '#a85aa8']; for (const [i, j] of [[4, 3], [6, 3], [8, 3], [5, 5], [7, 5], [6, 7]]) { P(g[1], x + i, y + j, 2, 2); P(g[2], x + i, y + j, 1, 1); } P('#4a8a3a', x + 6, y + 1, 3, 2); P('#6a4428', x + 6, y + 2, 1, 1); } },
};
function taberna(R) {
  const { b, W, H, P } = R, t = TAVERN[b.id] || TAVERN.tab_oca;
  const L = townhouse(R, { balcony: 2, shutter: t.shutter, wall: t.wall, brick: t.brick, dormer: false, tribuna: false });
  const { gy, dc, wr } = L, cx = dc * 16 + 8;
  // planta baja de taberna: zócalo de madera oscura
  const wd = ramp('#4a2c22'); P(wd[3], 0, gy + 2, W, H - gy - 5); P(wd[5], 0, gy + 2, W, 1); for (let i = 3; i < W; i += 5) P(wd[2], i, gy + 3, 1, H - gy - 7);
  P(wd[1], 0, H - 4, W, 1);
  const right = dc * 16 + 30 <= W; // ¿el rótulo cabe a la derecha?
  const sx = right ? dc * 16 + 17 : dc * 16 - 14;
  for (let c = 0; c < b.w; c++) { if (c === dc) continue; const x = c * 16; if (sx < x + 16 && sx + 13 > x) { /* columna del rótulo */ win(R, x + 4, gy + 9, 8, 7, { wr, frame: '#4a3020', noSill: true }); continue; } win(R, x + 3, gy + 5, 10, 9, { wr, frame: '#4a3020', noSill: true }); P(wr[5], x + 2, gy + 14, 12, 1); }
  door(R, cx, H - 2, { w: 12, h: 14, dbl: true, color: '#5a3424', studs: true });
  hangingSign(R, sx, gy - 2, t.icon, { board: t.board, w: 13, h: 10 });
  lantern(R, right ? dc * 16 - 1 : dc * 16 + 12, gy + 4);
  const bx = right ? Math.min(W - 7, dc * 16 + 17) : Math.max(1, dc * 16 - 7);
  barrel(R, bx, H - 2); if (right ? bx + 7 < W - 5 : bx - 6 > 0) barrel(R, right ? bx + 6 : bx - 6, H - 2);
  if (t.parra) { // emparrado sobre la puerta
    const vx = cx - 14; P('#6a4428', vx, gy - 1, 28, 1); for (let i = vx; i < vx + 28; i += 7) P('#6a4428', i, gy - 1, 1, 3);
    for (let i = vx - 1; i < vx + 29; i++) { const d = 1 + Math.floor(hash(i, 7, R.s) * 3); P(i % 3 ? '#3a7a3a' : '#5a9a44', i, gy - 2, 1, d); }
    for (const gx of [vx + 4, vx + 15, vx + 23]) { P('#6a2a6a', gx, gy + 1, 2, 2); P('#8a3a8a', gx, gy + 1, 1, 1); P('#6a2a6a', gx, gy + 3, 1, 1); }
  }
}

// ───────────── Tiendas ─────────────
function tienda(R) {
  const { b, W, H, P } = R;
  const L = townhouse(R, { balcony: 1, chimney: false });
  const { gy, dc, wr } = L, cx = dc * 16 + 8;
  awning(R, 1, gy + 2, W - 2, b.awning || '#c83a3a');
  door(R, cx, H - 2, { w: 10, h: 13, arch: 'flat', color: '#5a3a28' });
  P(GL[1], cx - 3, H - 13, 6, 3); P(GL[2], cx - 3, H - 13, 1, 1); // montante de cristal
  R.lit.push({ x: cx - 3, y: H - 13, w: 6, h: 3, k: 'shop' });
  for (let c = 0; c < b.w; c++) { if (c === dc) continue; showcase(R, c * 16 + 2, gy + 10, 12, H - gy - 14, b.id); }
  if (b.icon) hangingSign(R, dc * 16 + 17 + 11 > W ? dc * 16 - 13 : dc * 16 + 17, gy - 12, b.icon);
}

// ───────────── Veguería (cuartel) ─────────────
function cuartel(R) {
  const { b, W, H, P } = R, fy = 14, gy = H - 22;
  const wr = R.wr = ashlar(R, 0, fy, W, H - fy, b.wall || '#c8b898');
  battlements(R, -1, -4, W + 2, fy + 4, wr);
  for (let i = 1; i < W - 1; i += 4) { P(wr[2], i, fy, 2, 2); P(wr[0], i, fy + 2, 2, 1); } // matacanes
  // garita en la esquina con chapitel
  const gx = 1, gtop = -14, rr = ramp('#4a5068');
  P(wr[3], gx, gtop + 6, 10, 14); P(wr[5], gx, gtop + 6, 2, 14); P(wr[1], gx + 9, gtop + 6, 1, 14); P(wr[0], gx + 4, gtop + 10, 2, 5);
  for (let j = 0; j < 8; j++) { const k = Math.round((j / 7) * 6); P(rr[4], gx + 5 - k, gtop - 1 + j, k, 1); P(rr[2], gx + 5, gtop - 1 + j, k, 1); }
  P(wr[5], gx - 1, gtop + 6, 12, 1); P(IRON[2], gx + 5, gtop - 4, 1, 3);
  P(wr[5], 0, gy, W, 1); P(wr[1], 0, gy + 1, W, 1);
  plinth(R, W, H, '#8a7c6c');
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  // escudo de la ciudad sobre la puerta (cruz de san Jorge y barras)
  P(wr[1], cx - 6, gy - 13, 12, 12); P('#f2ead8', cx - 5, gy - 12, 5, 10); P('#c8302c', cx - 3, gy - 12, 1, 10); P('#c8302c', cx - 5, gy - 8, 5, 1);
  P('#f0c040', cx, gy - 12, 5, 10); for (let i = 0; i < 2; i++) P('#c8302c', cx + 1 + i * 2, gy - 12, 1, 10); P(wr[1], cx - 4, gy - 2, 8, 1);
  door(R, cx, H - 2, { w: 12, h: 15, color: '#4a3424', studs: true, stone: '#b0a08a' });
  // senyera colgada de la fachada (barras verticales)
  const bx = dc * 16 - 12 < 2 ? dc * 16 + 19 : dc * 16 - 12;
  P(IRON[1], bx - 1, fy + 3, 11, 1);
  for (let i = 0; i < 9; i++) { const red = i % 2 === 1; P(red ? '#c8302c' : '#f0c040', bx + i, fy + 4, 1, 18); P(red ? '#8a1a22' : '#c8902a', bx + i, fy + 21, 1, 1); }
  P('#f8dc70', bx, fy + 4, 9, 1); P(INK2, bx + 4, fy + 20, 1, 2);
  for (let c = 0; c < b.w; c++) { if (c === dc) continue; const x = c * 16; if (Math.abs(x + 8 - (bx + 4)) < 10) continue; win(R, x + 5, fy + 6, 6, 8, { wr, bars: true, arch: 'round' }); }
  for (let c = 0; c < b.w; c++) { if (c === dc) continue; const x = c * 16 + 7; P(wr[0], x, gy + 5, 2, 8); P(GL[0], x, gy + 6, 2, 6); R.lit.push({ x, y: gy + 6, w: 2, h: 6, k: 'slit', s: 0.5 }); }
  torch(R, cx - 11, gy + 6); torch(R, cx + 9, gy + 6);
}
// Almenas con camino de ronda (vista 3/4): pretil del fondo, suelo, merlones con volumen y parapeto
function battlements(R, x0, y0, w, h, wr) {
  const { P } = R, my = y0 + h - 9;
  P(wr[2], x0, y0, w, h);
  P(wr[5], x0, y0, w, 1); P(wr[3], x0, y0 + 1, w, 2); P(wr[1], x0, y0 + 3, w, 1);
  for (let i = x0 + 2; i < x0 + w; i += 7) P(wr[1], i, y0 + 4, 1, Math.max(0, my - y0 - 4));
  for (let i = x0; i < x0 + w; i += 7) { const mw = Math.min(4, x0 + w - i); P(wr[4], i, my, mw, 5); P(wr[6], i, my, mw, 1); P(wr[5], i, my, 1, 5); P(wr[1], i + mw - 1, my + 1, 1, 4); if (i + mw < x0 + w) P(wr[0], i + mw, my + 1, 1, 4); }
  P(wr[3], x0, my + 5, w, 4); P(wr[5], x0, my + 5, w, 1); P(wr[1], x0, my + 8, w, 1);
}

// ───────────── Hospitales ─────────────
function hospital(R) {
  const { b, W, H, P } = R, pau = b.id === 'hosp_pau', fy = 24, gy = H - 30;
  const wallC = pau ? '#ece4d4' : '#c8b494';
  const wr = R.wr = pau ? plaster(R, 0, fy, W, H - fy, wallC) : ashlar(R, 0, fy, W, H - fy, wallC);
  hipRoof(R, -1, -6, W + 2, fy + 6, pau ? '#b4583a' : '#a44a36');
  eaveShadow(R, fy, W, wr);
  if (pau) { for (let i = 0; i < W; i += 4) { P('#3a5aa8', i, fy + 2, 2, 2); P('#f2eee4', i + 2, fy + 2, 2, 2); } P('#3a5aa8', 0, fy + 4, W, 1); } // friso de azulejos
  P(wr[5], 0, gy, W, 1); P(wr[1], 0, gy + 1, W, 1);
  plinth(R, W, H);
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  // planta alta: ventanas góticas geminadas
  for (let c = 0; c < b.w; c++) {
    if (Math.abs(c * 16 + 8 - W / 2) < 9) continue;
    const x = c * 16 + 4;
    win(R, x, fy + 8, 8, 12, { wr, arch: pau ? 'round' : 'pointed', frame: pau ? '#3a5aa8' : '#8a7a6a' });
  }
  // emblema: cruz roja (Santa Cruz) o san Pablo con la espada (Convalecencia)
  const ex = Math.round(W / 2) - 6, ey = fy + 7;
  if (!pau) { P(wr[1], ex - 1, ey - 1, 14, 14); P('#f2ead8', ex, ey, 12, 12); P('#b8302c', ex + 5, ey + 1, 2, 10); P('#b8302c', ex + 1, ey + 5, 10, 2); P('#e0d4bc', ex, ey + 11, 12, 1); }
  else { P(wr[1], ex, ey - 1, 12, 14); P('#3a3a5a', ex + 1, ey, 10, 12); P('#e8d8c0', ex + 5, ey + 2, 2, 2); P('#6a3a5a', ex + 4, ey + 4, 4, 6); P('#c8ccd8', ex + 8, ey + 3, 1, 6); P('#e8c050', ex + 4, ey + 1, 4, 1); }
  // planta baja: arcada
  const n = b.w; const aw = 12;
  for (let c = 0; c < n; c++) {
    const x = c * 16 + 2;
    if (c === dc) continue;
    rows(x - 1, gy + 4, aw + 2, H - gy - 6, pau ? 'round' : 'pointed', pau ? 6 : 10, (yy, a, bb) => P(wr[5], a, yy, bb - a, 1));
    rows(x, gy + 5, aw, H - gy - 7, pau ? 'round' : 'pointed', pau ? 5 : 9, (yy, a, bb, k) => P(k < 5 ? '#2a2234' : '#3a2e3e', a, yy, bb - a, 1));
    P('#4a3c44', x, H - 4, aw, 2); P(wr[2], x + aw, gy + 5, 1, H - gy - 7);
  }
  door(R, cx, H - 2, { w: 12, h: 17, arch: pau ? 'round' : 'pointed', dbl: true, color: '#5a3a2a', studs: !pau });
  if (pau) { // espadaña con campana
    const bx = W - 26; const st = ramp('#e8e0d0');
    P(st[3], bx, -14, 12, 14); P(st[5], bx, -14, 12, 1); P(st[4], bx, -14, 1, 14); P(st[2], bx + 11, -14, 1, 14);
    rows(bx + 3, -11, 6, 8, 'round', 3, (yy, a, bb) => P('#2a2234', a, yy, bb - a, 1));
    P('#c8902a', bx + 4, -8, 4, 4); P('#f0c040', bx + 4, -8, 1, 2); P(IRON[1], bx + 5, -4, 2, 1);
    P(IRON[1], bx + 5, -18, 1, 4); P(IRON[1], bx + 4, -17, 3, 1);
  } else chimney(R, 18, -14, 12, '#9a8676');
}

// ───────────── Masía ─────────────
function masia(R) {
  const { b, W, H, P } = R;
  const eaveY = 30, apexY = 2, cx = Math.floor(W / 2);
  const wr = R.wr = rubble(R, 0, apexY, W, H - apexY, '#b4a086', '#ddd2b6');
  // recorta el hastial: lo que queda por encima de la línea del tejado lo tapa el tejado
  gableRoof(R, -1, -8, W + 2, eaveY, apexY, '#b4583a');
  quoins(R, 0, eaveY + 2, H - eaveY - 6, '#cdbb9c'); quoins(R, W - 1, eaveY + 2, H - eaveY - 6, '#cdbb9c', true);
  plinth(R, W, H, '#8a7a68');
  chimney(R, W - 20, -16, 12, '#a08a74');
  const dc = b.door.x - b.x, dcx = dc * 16 + 8;
  // portal adovelado (dovelas largas en abanico)
  const st = ramp('#d8c8a8'), dw = 12, dh = 16, dx = dcx - dw / 2, dy = H - 2 - dh;
  const fcy = dy + 6;
  for (let j = fcy - 13; j <= fcy; j++) for (let i = dcx - 13; i <= dcx + 13; i++) {
    const d = Math.hypot(i + 0.5 - dcx, j + 0.5 - fcy); if (d < 6.5 || d > 12.5) continue;
    const sec = Math.floor(Math.atan2(fcy - j - 0.5, i + 0.5 - dcx) / (Math.PI / 11));
    P(d > 11.6 ? st[1] : sec % 2 ? st[5] : st[3], i, j);
  }
  door(R, dcx, H - 2, { w: dw, h: dh, arch: 'round', color: '#6a4428', voussoirs: false, stone: '#d8c8a8', studs: true });
  // ventanas con marco de piedra y postigos
  const sh = R.v < 0.5 ? '#5a6a3a' : '#7a4a2e';
  for (const [x, y] of [[8, eaveY + 6], [W - 16, eaveY + 6], [8, H - 18], [W - 16, H - 18]]) {
    if (Math.abs(x + 4 - dcx) < 14) continue;
    P(st[3], x - 2, y - 2, 12, 2); P(st[5], x - 2, y - 2, 12, 1); P(st[3], x - 2, y + 8, 12, 2); P(st[1], x - 2, y + 9, 12, 1);
    win(R, x, y, 8, 8, { wr, shutter: sh, noSill: true });
  }
  // ventana geminada en el hastial y reloj de sol
  const gwY = eaveY - 12;
  if (b.id !== 'masia_prat') {
    P(st[4], cx - 6, gwY - 1, 12, 10);
    win(R, cx - 5, gwY, 4, 7, { wr: ramp('#d8c8a8'), arch: 'round', ar: 2, noSill: true }); win(R, cx + 1, gwY, 4, 7, { wr: ramp('#d8c8a8'), arch: 'round', ar: 2, noSill: true });
    P(st[2], cx - 1, gwY + 1, 2, 7);
  }
  if (b.id === 'masia_ferrer' || R.v < 0.5) { // rellotge de sol
    const sx = R.v < 0.5 ? 6 : W - 18, sy = eaveY + 18; P('#f2ead8', sx, sy, 12, 9); P('#b8a888', sx, sy + 8, 12, 1);
    for (let k = 0; k < 5; k++) line(R.ctx, PX + sx + 6, PT + sy + 1, PX + sx + 1 + k * 2.5, PT + sy + 7, '#8a6a4a');
    P('#3a3a4a', sx + 6, sy + 1, 1, 3); P('#b8322c', sx + 1, sy + 1, 2, 1);
  }
  if (b.id === 'masia_prat') { // galería de arquillos en la planta noble
    const gx0 = cx - 22, gy0 = 22;
    P(st[4], gx0 - 2, gy0 - 2, 48, 13); P(st[6], gx0 - 2, gy0 - 2, 48, 1); P(st[2], gx0 - 2, gy0 + 10, 48, 1);
    for (let k = 0; k < 4; k++) { const ax = gx0 + 1 + k * 11; rows(ax, gy0, 8, 9, 'round', 3, (yy, a, bb, kk) => P(kk < 4 ? '#221c2a' : '#3a2e34', a, yy, bb - a, 1)); P(st[2], ax + 8, gy0 + 1, 1, 8); R.lit.push({ x: ax, y: gy0, w: 8, h: 9, k: 'win', arch: 'round', ar: 3, m: -1, s: hash(ax, gy0, 5) }); }
    for (let i = gx0; i < gx0 + 44; i += 2) P(st[5], i, gy0 + 6, 1, 3); P(st[5], gx0 - 1, gy0 + 6, 46, 1); // barandilla
  }
  // poyo de piedra junto a la puerta
  P(st[3], dcx + 10, H - 6, 10, 3); P(st[5], dcx + 10, H - 6, 10, 1);
}

// ───────────── Cabañas y barracas ─────────────
function cabana(R) {
  const { b, W, H, P } = R, id = b.id;
  const coast = id.startsWith('barraca'), witch = id === 'cabana_bruja', guard = id === 'cabana_guarda';
  const dc = b.door.x - b.x, dcx = dc * 16 + 8;
  if (coast) { // barraca encalada con tejado de carrizo muy empinado
    const fy = 22; const wr = R.wr = plaster(R, 0, fy, W, H - fy, '#f0ece2', 3);
    thatch(R, -1, -16, W + 2, fy + 14, '#b89a5a', { hip: 22 });
    P(IRON[1], 30, -20, 1, 5); P(IRON[1], 28, -18, 5, 1); // crucecita en la cumbrera
    P(wr[1], 0, fy + 1, W, 1);
    plinth(R, W, H, '#b8b0a0');
    door(R, dcx, H - 2, { w: 10, h: 13, arch: 'flat', color: '#3a6ab0', voussoirs: false, stone: '#f0ece2' });
    for (const x of [6, W - 14]) if (Math.abs(x + 4 - dcx) > 10) { const f = ramp('#3a6ab0'); P(f[3], x - 1, fy + 8, 10, 9); win(R, x, fy + 9, 8, 7, { wr, noSill: true, frame: f[2] }); }
    // red de pesca y ancla
    const nx = dcx > W / 2 ? 2 : W - 14; for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) if ((i + j) % 3 === 0 || (i - j + 12) % 3 === 0) P('#6a6a5a', nx + i, H - 13 + j);
    P('#8a7a5a', nx, H - 14, 12, 1);
    return;
  }
  const fy = 20, wood = witch ? '#5e4a3a' : guard ? '#7a5434' : '#8a6a48';
  const w = ramp(wood); R.wr = w;
  // paredes de troncos
  for (let j = fy; j < H - 1; j += 4) { P(w[3], 0, j, W, 3); P(w[5], 0, j, W, 1); P(w[1], 0, j + 3, W, 1); P(w[4], 0, j + 1, 2, 2); P(w[2], W - 2, j + 1, 2, 2); for (let i = 6 + (j % 7); i < W - 4; i += 11) P(w[2], i, j + 1, 2, 1); }
  // tejado
  const roofC = witch ? '#7a7444' : id === 'cabana_pescador' ? '#a89058' : '#9a8450';
  thatch(R, -1, -10, W + 2, fy + 8, roofC, { moss: witch, hip: 12 });
  if (!witch) chimney(R, W - 18, -16, 10, '#8a7a68');
  else { const st = ramp('#6a6a5a'); P(st[3], 12, -17, 5, 12); P(st[5], 12, -17, 1, 12); P(st[1], 16, -17, 1, 12); P(st[4], 11, -18, 7, 2); P(INK2, 13, -18, 3, 1); R.smoke.push({ x: 14, y: -19 }); }
  door(R, dcx, H - 2, { w: 9, h: 12, arch: 'flat', color: witch ? '#3e3a2a' : '#5a3a24', voussoirs: false, stone: w[2] });
  const wx = dcx > W / 2 ? 8 : W - 16;
  if (witch) { // ventana redonda con brillo verdoso, ajos y hierbas colgando
    ellipse(R.ctx, PX + wx + 4, PT + fy + 9, 4, 4, w[1]); ellipse(R.ctx, PX + wx + 4, PT + fy + 9, 3, 3, '#1e2a24');
    P('#3a5a3a', wx + 2, fy + 8, 2, 1); R.lit.push({ x: wx + 2, y: fy + 7, w: 5, h: 5, k: 'glow' });
    for (let i = 0; i < 3; i++) { const hx = dcx - 9 + i * 3; P('#6a4428', hx, fy + 2, 1, 2); P(i === 1 ? '#e8e0c8' : '#4a7a3a', hx - 1, fy + 4, 3, 3); }
    P('#e8e0cc', W - 9, fy - 2, 4, 3); P(INK, W - 8, fy - 1, 1, 1); P(INK, W - 6, fy - 1, 1, 1); // calavera de cabra en el alero
  } else {
    win(R, wx, fy + 6, 8, 7, { wr: w, shutter: guard ? '#4a6a3a' : '#6a5a3a', frame: w[1] });
    if (guard) { const a = '#e8dcc0'; P(a, dcx - 1, fy - 3, 2, 2); P(a, dcx - 4, fy - 5, 3, 1); P(a, dcx + 1, fy - 5, 3, 1); P(a, dcx - 5, fy - 7, 1, 2); P(a, dcx + 4, fy - 7, 1, 2); P(a, dcx - 3, fy - 7, 1, 2); P(a, dcx + 2, fy - 7, 1, 2); }
    // leña apilada
    const lx = dcx > W / 2 ? 2 : W - 14; for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - (j > 1 ? 1 : 0); i++) { P('#8a5a34', lx + i * 3 + j, H - 4 - j * 3, 3, 3); P('#c89a64', lx + i * 3 + j + 1, H - 3 - j * 3, 1, 1); }
    if (id === 'cabana_pescador') { const nx = W - 14 === lx ? 2 : W - 14; for (let j = 0; j < 7; j++) for (let i = 0; i < 11; i++) if ((i + j) % 3 === 0) P('#7a7a68', nx + i, fy + 6 + j); P('#a87a4a', nx - 1, fy + 5, 13, 1); }
  }
  P(mix(w[0], INK, 0.4), 0, H - 1, W, 1);
}

// ───────────── Catedrales ─────────────
// La Seu: gótica severa en piedra gris, hastial con crochets, aguja del cimborrio y torres octogonales con agujas.
// Santa María de la Mar: piedra dorada, sobria y horizontal, torres octogonales rematadas en terraza.
function catedral(R) {
  const { b, W, H, P } = R, seu = b.variant === 'seu';
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  const stC = seu ? '#8e8a9a' : '#c89c62', st = ramp(stC), roofC = seu ? '#4a5068' : '#a8603e';
  const tw = 30, tl = cx - 42 - tw, tr = cx + 42, bodyL = tl + tw, bodyR = tr, fyB = 34;
  // tejado de la nave al fondo
  const rr = ramp(roofC);
  for (let j = 0; j < fyB + 2; j++) for (let i = bodyL - 2; i < bodyR + 2; i++) {
    let c;
    if (seu) { const q = (i + (Math.floor(j / 3) % 2) * 2) % 4; c = j % 3 === 2 ? rr[1] : q === 0 ? rr[2] : j < 12 ? rr[4] : rr[3]; } // pizarra en escama
    else c = j % 4 === 3 ? rr[2] : (i + (j >> 2)) % 4 === 0 ? rr[2] : j < 12 ? rr[5] : rr[4];
    P(c, i, j);
  }
  P(rr[6], bodyL - 2, 0, bodyR - bodyL + 4, 1);
  for (const i of [bodyL + 2, bodyR - 3]) { P(st[2], i - 1, 2, 3, fyB - 2); P(st[4], i - 1, 2, 1, fyB - 2); pinnacle(R, i, -6, st, 9); } // contrafuertes de la nave
  if (seu) { // aguja del cimborrio detrás del hastial
    const sx = cx, top = -22, base = 14;
    for (let j = top; j < base; j++) { const k = Math.round(((j - top) / (base - top)) * 7); P(st[3], sx - k, j, k * 2 + 1, 1); P(st[5], sx - k, j, 1, 1); P(st[1], sx + k, j, 1, 1); if (j % 3 === 0 && k > 1) { P(st[5], sx - k - 1, j, 1, 1); P(st[1], sx + k + 1, j, 1, 1); } }
    P(st[2], sx, top, 1, base - top); P(st[5], sx, top - 2, 1, 2); P(st[5], sx - 1, top - 1, 3, 1);
  }
  // ala lateral (capilla) adosada a la torre derecha
  if (tr + tw < W) {
    const x0 = tr + tw, ww = W - x0;
    ashlar(R, x0, 40, ww, H - 40, seu ? '#868294' : '#c09258', 5, 4);
    for (let j = 30; j < 41; j++) for (let i = x0; i < W; i++) P(seu ? (j % 3 === 2 ? rr[1] : rr[3]) : (j % 4 === 3 ? rr[2] : rr[4]), i, j);
    P(rr[5], x0, 30, ww, 1);
    win(R, x0 + 5, 54, 6, 18, { wr: st, arch: 'pointed', frame: st[1], noSill: true });
    P(st[2], W - 4, 36, 3, H - 36); P(st[4], W - 4, 36, 1, H - 36); pinnacle(R, W - 3, 26, st, 10);
  }
  // fachada central
  ashlar(R, bodyL, fyB, bodyR - bodyL, H - fyB, stC, 6, 3);
  if (seu) {
    const apex = 6; // hastial con arquerías ciegas y crochets
    poly(R.ctx, [[PX + bodyL, PT + fyB + 1], [PX + cx, PT + apex], [PX + bodyR, PT + fyB + 1]], st[3]);
    for (let k = -2; k <= 2; k++) { const ax = cx + k * 9 - 3, top = apex + 8 + Math.abs(k) * 7; rows(ax, top, 6, fyB - top, 'pointed', 5, (yy, a, bb) => P(st[2], a, yy, bb - a, 1)); P(st[4], ax, top + 4, 1, fyB - top - 4); }
    for (let j = apex; j <= fyB; j++) { const k = ((j - apex) / (fyB - apex)) * (bodyR - bodyL) / 2; P(st[5], Math.round(cx - k), j, 2, 1); P(st[1], Math.round(cx + k) - 1, j, 2, 1); if (j % 4 === 1 && j > apex + 2) { P(st[5], Math.round(cx - k) - 1, j - 1, 2, 1); P(st[2], Math.round(cx + k), j - 1, 2, 1); } }
    pinnacle(R, cx, apex - 10, st, 11);
  } else { // cornisa horizontal con canecillos
    P(st[5], bodyL - 1, fyB - 3, bodyR - bodyL + 2, 2); P(st[1], bodyL - 1, fyB - 1, bodyR - bodyL + 2, 1);
    for (let i = bodyL + 1; i < bodyR; i += 4) P(st[2], i, fyB, 2, 2);
    for (let i = bodyL; i < bodyR; i += 5) { P(st[4], i, fyB - 6, 3, 3); P(st[5], i, fyB - 6, 3, 1); } // pretil
  }
  // galería de estatuas bajo el rosetón
  const gy = seu ? 36 : 37;
  for (let i = bodyL + 6; i < bodyR - 8; i += 9) { rows(i, gy, 6, 8, 'pointed', 4, (yy, a, bb) => P(st[1], a, yy, bb - a, 1)); P(st[5], i + 2, gy + 2, 2, 2); P(seu ? '#7a7690' : '#b88a50', i + 2, gy + 4, 2, 4); P(st[5], i - 1, gy + 8, 8, 1); }
  // rosetón
  rose(R, cx, seu ? 56 : 58, seu ? 10 : 12, seu ? ['#2a4aa0', '#6a3a9a', '#c03040', '#e8c050'] : ['#d88a2a', '#b8302c', '#3a5ab0', '#f0d070']);
  // impostas
  const iy = seu ? 68 : 72; P(st[5], bodyL, iy, bodyR - bodyL, 1); P(st[1], bodyL, iy + 1, bodyR - bodyL, 1);
  // contrafuertes de la fachada con pináculos
  for (const x of [bodyL, bodyR - 4]) { P(st[2], x, fyB, 4, H - fyB - 4); P(st[4], x, fyB, 1, H - fyB - 4); P(st[1], x + 3, fyB, 1, H - fyB - 4); if (seu) pinnacle(R, x + 2, fyB - 12, st, 12); }
  // portal con arquivoltas, tímpano y jambas con estatuas
  const pw = 30, ph = H - 4 - (iy + 3), px0 = cx - pw / 2;
  for (let a = 0; a < 4; a++) rows(px0 + a * 2, iy + 3 + a * 2, pw - a * 4, ph - a * 2, 'pointed', Math.round((pw - a * 4) * 0.72), (yy, x0, x1) => P(a % 2 ? st[2] : st[4], x0, yy, x1 - x0, 1));
  rows(px0 + 8, iy + 11, pw - 16, 14, 'pointed', 10, (yy, x0, x1) => P(st[1], x0, yy, x1 - x0, 1));
  const gold = seu ? '#e8c050' : '#f0d070'; P(gold, cx - 1, iy + 15, 2, 6); P(gold, cx - 2, iy + 16, 4, 2); P(st[5], cx - 3, iy + 14, 1, 7); P(st[5], cx + 2, iy + 14, 1, 7); // Pantocrátor en la mandorla
  for (const sx of [px0 + 2, px0 + pw - 4]) { P(st[5], sx, H - 30, 2, 2); P(seu ? '#6e6a84' : '#a87a44', sx, H - 28, 2, 7); P(st[1], sx - 1, H - 21, 4, 1); }
  door(R, cx, H - 5, { w: 14, h: 22, arch: 'pointed', dbl: true, color: seu ? '#4a2e22' : '#5a3424', studs: true, stone: seu ? '#a8a4b0' : '#d8b880', voussoirs: false });
  for (let s = 0; s < 3; s++) P(st[5 - s], bodyL + 4 + s * 2, H - 4 + s, bodyR - bodyL - 8 - s * 4, 1); // escalinata
  P(st[4], bodyL + 2, H - 1, bodyR - bodyL - 4, 1);
  // torres octogonales
  for (const tx of [tl, tr]) if (tx >= -1 && tx + tw <= W + 1) octTower(R, tx, seu ? -4 : -2, tw, H, stC, seu);
}
// Torre octogonal en 3/4: tres caras (izquierda iluminada, frente, derecha en sombra)
function octTower(R, x, top, w, bottom, c, spire) {
  const { P } = R, st = ramp(c), sd = 8, fw = w - sd * 2;
  ashlar(R, x + sd, top, fw, bottom - top, c, 6, x + 3);
  for (let j = top; j < bottom; j++) {
    const joint = (j - top) % 6 === 5;
    P(joint ? st[3] : st[4], x, j, sd, 1); P(joint ? st[0] : st[2], x + w - sd, j, sd, 1);
    if (!joint && (j - top) % 12 < 6) { P(st[3], x + 4, j, 1, 1); P(st[1], x + w - 4, j, 1, 1); } else if (!joint) { P(st[3], x + 2, j, 1, 1); P(st[1], x + w - 6, j, 1, 1); }
  }
  P(st[6], x, top, 1, bottom - top); P(st[5], x + sd, top, 1, bottom - top); P(st[1], x + w - sd - 1, top, 1, bottom - top); P(st[0], x + w - 1, top, 1, bottom - top);
  for (const by of [top + 16, top + 44, 70]) { P(st[6], x, by, sd, 1); P(st[5], x + sd, by, fw, 1); P(st[2], x + w - sd, by, sd, 1); P(st[1], x, by + 1, w, 1); }
  // campanario: vanos con lamas y ventanales
  const cxx = x + w / 2;
  rows(cxx - 3, top + 3, 6, 12, 'pointed', 4, (yy, a, bb) => P('#1e1a2a', a, yy, bb - a, 1)); for (let j = top + 6; j < top + 15; j += 2) P(st[2], cxx - 3, j, 6, 1);
  R.lit.push({ x: cxx - 3, y: top + 7, w: 6, h: 8, k: 'slit', s: 0.5 });
  win(R, cxx - 2, top + 22, 4, 16, { wr: st, arch: 'pointed', frame: st[1], noSill: true });
  win(R, cxx - 2, 76, 4, 18, { wr: st, arch: 'pointed', frame: st[1], noSill: true });
  if (spire) { // aguja octogonal con crochets y pináculos en las esquinas
    const base = top + 1, tip = -22;
    for (let j = tip; j < base; j++) { const k = Math.round(((j - tip) / (base - tip)) * (w / 2 - 4)); P(st[4], cxx - k, j, k, 1); P(st[2], cxx, j, k, 1); P(st[5], cxx - k, j, 1, 1); P(st[1], cxx + k - 1, j, 1, 1); if ((j - tip) % 3 === 2 && k > 1) { P(st[5], cxx - k - 1, j, 1, 1); P(st[1], cxx + k, j, 1, 1); } }
    P(st[5], cxx, tip - 2, 1, 2); P('#e8c050', cxx - 1, tip - 1, 3, 1);
    for (const px of [x + 2, x + w - 3]) pinnacle(R, px, top - 9, st, 10);
    P(st[5], x, top, w, 1);
  } else { // terraza con corona de arquillos y pretil
    P(st[4], x - 1, top - 2, w + 2, 2); P(st[6], x - 1, top - 2, w + 2, 1);
    for (let i = x; i < x + w; i += 4) { P(st[3], i, top - 6, 3, 4); P(st[5], i, top - 6, 3, 1); P(i < x + sd ? st[5] : i >= x + w - sd ? st[1] : st[4], i, top - 5, 1, 3); }
    for (let i = x + 1; i < x + w - 2; i += 3) P(st[1], i, top + 1, 2, 2);
  }
}
function pinnacle(R, x, y, st, h) { // pináculo gótico con crochets (x = centro)
  const { P } = R;
  for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round((j / h) * 3)); P(st[3], x - w + 1, y + j, w * 2 - 1, 1); P(st[5], x - w + 1, y + j, 1, 1); if (j % 3 === 2 && j < h - 2) { P(st[4], x - w, y + j, 1, 1); P(st[2], x + w, y + j, 1, 1); } }
  P(st[5], x, y - 1, 1, 1);
}
// Tracería del rosetón: anillo de óculos, lancetas radiales y rosa central
function rosePix(i, j, r) {
  const d = Math.hypot(i, j); if (d > r + 0.6) return null;
  const a = (Math.atan2(j, i) + Math.PI) / (Math.PI * 2);
  if (d > r - 0.6) return 'ring';
  if (d > r - 3.2) { const f = (a * 16) % 1; return f > 0.25 && f < 0.75 && Math.abs(d - (r - 1.8)) < 1.1 ? 'g2' : 'stone'; }
  if (d < 2.2) return d < 1.3 ? 'c' : 'stone';
  const f8 = (a * 8) % 1, sec = Math.floor(a * 8);
  if (f8 < 0.14 || f8 > 0.9) return 'stone';
  if (Math.abs(d - (r - 3.2) * 0.6) < 0.55) return 'stone';
  return d < (r - 3.2) * 0.6 ? (sec % 2 ? 'g1' : 'g0') : (sec % 2 ? 'g0' : 'g1');
}
function rose(R, cx, cy, r, cols) {
  const { P } = R, st = ramp(R.b.variant === 'seu' ? '#a8a4b4' : '#dcbc8a');
  for (let j = -r - 2; j <= r + 2; j++) for (let i = -r - 2; i <= r + 2; i++) {
    const d = Math.hypot(i, j);
    if (d > r + 0.6 && d < r + 2) { P(Math.atan2(j, i) < -0.4 && Math.atan2(j, i) > -2.8 ? st[5] : st[2], cx + i, cy + j); continue; } // moldura
    const k = rosePix(i, j, r); if (!k) continue;
    P(k === 'ring' ? st[3] : k === 'stone' ? st[4] : k === 'g0' ? cols[0] : k === 'g1' ? cols[1] : k === 'g2' ? cols[2] : cols[3], cx + i, cy + j);
  }
  P(ramp(cols[0])[5], cx - r + 4, cy - r + 4, 1, 1); P(ramp(cols[1])[5], cx - 3, cy - r + 3, 1, 1);
  R.lit.push({ x: cx - r, y: cy - r, w: r * 2 + 1, h: r * 2 + 1, k: 'rose', r, cols });
}

// ───────────── Castillo del Conde ─────────────
// Muralla almenada con talud, torres cilíndricas con chapitel de pizarra, torre del homenaje sobre la puerta
// con el escudo condal y dos senyeras colgadas; dentro asoman el palacio, la capilla y el granero.
function castillo(R) {
  const { b, W, H, P } = R;
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  const stC = '#aca08a', st = ramp(stC);
  // patio de armas al fondo: edificios interiores
  const pal = ramp('#d8c8a8');
  P(pal[3], 30, 14, 66, 26); P(pal[5], 30, 14, 66, 1); for (let i = 36; i < 92; i += 10) { P('#2c3048', i, 20, 4, 6); P(GL[1], i, 20, 4, 2); P(pal[5], i - 1, 26, 6, 1); R.lit.push({ x: i, y: 20, w: 4, h: 6, k: 'win', m: -1, s: hash(i, 20, 3) }); }
  hipRoof(R, 28, 0, 70, 15, '#b4563a', 8);
  const gr = ramp('#c8b898'); P(gr[3], W - 92, 18, 58, 22); P(gr[5], W - 92, 18, 58, 1); for (let i = W - 86; i < W - 38; i += 12) { P('#3a2e3a', i, 24, 3, 4); }
  hipRoof(R, W - 94, 6, 62, 13, '#a84e36', 7);
  // capilla con espadaña
  P(st[3], 100, -2, 12, 24); P(st[5], 100, -2, 1, 24); P(st[1], 111, -2, 1, 24); rows(103, 1, 6, 8, 'round', 3, (yy, a, bb) => P('#2a2234', a, yy, bb - a, 1)); P('#c8902a', 104, 5, 4, 3); P('#f0c040', 104, 5, 1, 1);
  poly(R.ctx, [[PX + 99, PT - 1], [PX + 106, PT - 7], [PX + 113, PT - 1]], st[4]); P(IRON[1], 106, -12, 1, 5); P(IRON[1], 105, -11, 3, 1);
  // muralla con almenas
  const wy = 46;
  ashlar(R, 0, wy, W, H - wy, stC, 6);
  battlements(R, 0, wy - 12, W, 13, st);
  for (let j = H - 10; j < H - 1; j++) { P(st[4], 0, j, W, 1); if ((j & 1) === 0) for (let i = (j * 3) % 7; i < W; i += 7) P(st[3], i, j, 1, 1); } // talud
  P(st[6], 0, H - 10, W, 1); P(st[2], 0, H - 11, W, 1);
  for (let i = 44; i < W - 44; i += 20) if (Math.abs(i - cx) > 36) { P(st[0], i, wy + 12, 2, 9); P(GL[0], i, wy + 13, 2, 7); R.lit.push({ x: i, y: wy + 13, w: 2, h: 7, k: 'slit', s: 0.5 }); }
  for (let k = 0; k < 10; k++) { const mx = Math.floor(hash(k, 3, R.s) * W), my = wy + 20 + Math.floor(hash(k, 4, R.s) * 40); P('#6a7a4a', mx, my, 2, 1); P('#7a8a52', mx, my - 1, 1, 1); } // musgo
  // torres cilíndricas en los extremos
  for (const tx of [0, W - 38]) roundTower(R, tx, 6, 38, H, stC);
  // torre del homenaje
  const kw = 52, kx = cx - kw / 2, ky = -4;
  ashlar(R, kx, ky, kw, H - ky, '#b0a48e', 6, 7);
  P(st[6], kx, ky, 1, H - ky); P(st[5], kx + 1, ky, 1, H - ky); P(st[1], kx + kw - 1, ky, 1, H - ky); P(st[2], kx + kw - 2, ky, 1, H - ky);
  battlements(R, kx - 2, ky - 12, kw + 4, 13, st);
  for (let i = kx; i < kx + kw; i += 4) { P(st[1], i, ky + 1, 2, 3); P(st[4], i + 2, ky + 1, 2, 1); } // matacanes
  for (const wx of [kx + 8, kx + kw - 16]) win(R, wx, ky + 10, 8, 12, { wr: st, arch: 'round', frame: st[1] });
  for (const bx of [kx + 4, kx + kw - 11]) { // senyeras colgadas
    P(IRON[1], bx - 1, ky + 26, 9, 1);
    for (let i = 0; i < 7; i++) { const red = i % 2 === 1; P(red ? '#c8302c' : '#f0c040', bx + i, ky + 27, 1, 16); P(red ? '#8a1a22' : '#c8902a', bx + i, ky + 42, 1, 1); }
    P(st[3], bx + 3, ky + 41, 1, 2); P(st[3], bx + 2, ky + 42, 3, 1);
  }
  // escudo condal y corona
  P(st[1], cx - 6, ky + 27, 12, 14); P('#f0c040', cx - 5, ky + 28, 10, 11); for (let i = 0; i < 4; i++) P('#c8302c', cx - 4 + i * 2 + (i > 1 ? 1 : 0), ky + 28, 1, 11); P('#f0c040', cx - 3, ky + 39, 6, 1); P('#f0c040', cx - 1, ky + 40, 2, 1);
  P('#e8c050', cx - 5, ky + 25, 10, 2); P('#e8c050', cx - 4, ky + 24, 1, 1); P('#e8c050', cx, ky + 23, 1, 2); P('#e8c050', cx + 3, ky + 24, 1, 1); P('#fff0a0', cx - 5, ky + 25, 10, 1);
  // puerta con dovelas radiales y rastrillo
  const gw = 22, gh = 30, gx = cx - gw / 2, gy = H - 2 - gh, ccy = gy + 11;
  for (let j = gy - 6; j < gy + 12; j++) for (let i = gx - 6; i < gx + gw + 6; i++) {
    const d = Math.hypot(i + 0.5 - cx, j + 0.5 - ccy); if (d < 11 || d > 16.5 || j > ccy) continue;
    const ang = Math.atan2(ccy - j, i + 0.5 - cx), sec = Math.floor(ang / (Math.PI / 9));
    P(d > 15.5 ? st[1] : sec % 2 ? st[5] : st[4], i, j);
  }
  P(st[4], gx - 5, ccy, 5, gh - 11); P(st[4], gx + gw, ccy, 5, gh - 11); P(st[5], gx - 5, ccy, 1, gh - 11);
  rows(gx, gy, gw, gh, 'round', 10, (yy, a, bb, k) => P(k < 9 ? '#1a1420' : '#2a1e24', a, yy, bb - a, 1));
  for (let i = gx + 2; i < gx + gw - 1; i += 3) P(IRON[2], i, gy + 1, 1, 9); for (let j = gy + 3; j < gy + 10; j += 3) P(IRON[2], gx + 1, j, gw - 2, 1);
  for (let i = gx + 2; i < gx + gw - 1; i += 3) P(IRON[3], i, gy + 10, 1, 1); // puntas del rastrillo
  door(R, cx, H - 2, { w: 16, h: 18, arch: 'flat', dbl: true, color: '#4a3020', studs: true, stone: '#2a1e24', voussoirs: false });
  torch(R, gx - 9, gy + 12); torch(R, gx + gw + 6, gy + 12);
  // rampa empedrada ante la puerta
  for (let j = H - 9; j < H - 1; j++) { const w = gw + 4 + (j - (H - 9)) * 2; P(st[5], cx - w / 2, j, w, 1); for (let i = cx - w / 2 + ((j * 3) & 3); i < cx + w / 2; i += 4) P(st[3], i, j, 1, 1); }
  flag(R, kx + kw - 6, -24, 12, 14, 9);
}
// Torre cilíndrica con chapitel cónico de pizarra y bandera
function roundTower(R, x, top, w, bottom, c) {
  const { P } = R, st = ramp(c), rr = ramp('#4a5068'), cxx = x + w / 2;
  for (let i = 0; i < w; i++) {
    const n = (i + 0.5) / w * 2 - 1;
    const base = n < -0.6 ? st[5] : n < -0.15 ? st[4] : n < 0.35 ? st[3] : n < 0.75 ? st[2] : st[1];
    for (let j = top + 8; j < bottom; j++) { const joint = (j - top) % 6 === 5 || ((j - top) % 12 < 6 ? (i % 8 === 0) : (i % 8 === 4)); P(joint ? (n < 0 ? st[3] : st[0]) : base, x + i, j); }
  }
  // matacanes y almenas en corona
  for (let i = 0; i < w; i += 4) { P(st[1], x + i, top + 8, 2, 3); P(st[4], x + i + 2, top + 8, 2, 1); }
  P(st[4], x - 1, top + 4, w + 2, 4); P(st[6], x - 1, top + 4, w + 2, 1); P(st[1], x - 1, top + 7, w + 2, 1);
  // chapitel cónico en escama de pizarra
  const tip = top - 22, base = top + 5;
  for (let j = tip; j < base; j++) {
    const k = Math.round(((j - tip) / (base - tip)) * (w / 2 + 1));
    for (let i = -k; i <= k; i++) { const n = i / Math.max(1, k); const sc = ((i + k + (j % 4 < 2 ? 0 : 2)) % 4 === 0) || (j % 4 === 3); P(n < -0.4 ? (sc ? rr[4] : rr[5]) : n < 0.3 ? (sc ? rr[2] : rr[3]) : (sc ? rr[0] : rr[1]), cxx + i, j); }
  }
  P(rr[6], cxx - 1, tip, 1, 6);
  win(R, cxx - 4, top + 16, 8, 10, { wr: st, arch: 'round', bars: true, noSill: true });
  P(st[0], cxx - 1, top + 44, 2, 9); R.lit.push({ x: cxx - 1, y: top + 45, w: 2, h: 7, k: 'slit', s: 0.5 });
  flag(R, Math.round(cxx), tip - 2, 2, 10, 7);
}
// Senyera al viento (barras horizontales) en un mástil; x = mástil, y = punta, pole = largo del mástil
function flag(R, x, y, pole, len, h) {
  const { P } = R;
  P(IRON[2], x, y, 1, pole + h); P('#e8c050', x, y - 1, 1, 1);
  const n = h >= 9 ? 9 : 7;
  for (let i = 1; i <= len; i++) { const off = Math.round(Math.sin(i * 0.6) * 1.2); for (let j = 0; j < h; j++) { const red = Math.floor((j * n) / h) % 2 === 1; P(red ? (i % 5 === 0 ? '#a82424' : '#c8302c') : (i % 5 === 0 ? '#d8a830' : '#f0c040'), x + i, y + 1 + j + off, 1, 1); } }
}

// ───────────── Edificios singulares ─────────────
function consell(R) { // Casa de la Ciutat: palacio gótico civil
  const { b, W, H, P } = R, fy = 8;
  const wr = R.wr = ashlar(R, 0, fy, W, H - fy, '#d4c098', 5, 9);
  // pretil calado con pináculos
  const st = wr; P(st[2], -1, -2, W + 2, 10); P(st[1], -1, -2, W + 2, 2); P(st[4], -1, 4, W + 2, 1);
  for (let i = 1; i < W; i += 4) { P(st[3], i, 0, 2, 4); P(st[5], i, 0, 1, 1); }
  for (const px of [1, W - 2, Math.round(W / 2)]) pinnacle(R, px, -10, st, 11);
  flag(R, Math.round(W / 2) + 4, -22, 14, 12, 7);
  P(st[5], 0, fy, W, 1); P(st[1], 0, fy + 1, W, 1);
  // gárgolas
  for (const gx of [2, W - 7]) { P(st[2], gx, 6, 5, 2); P(st[1], gx + (gx < 10 ? -1 : 5), 7, 1, 1); }
  plinth(R, W, H, '#9a8a70');
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  // ventanas coronella
  for (const wx of [8, W - 20]) { win(R, wx, fy + 10, 12, 18, { wr: st, arch: 'pointed', frame: st[2] }); P(st[4], wx + 5, fy + 14, 2, 14); }
  // hornacina de san Rafael
  P(st[1], cx - 4, fy + 6, 8, 16); P('#3a3048', cx - 3, fy + 8, 6, 12); P('#e8d8b8', cx - 1, fy + 10, 2, 2); P('#c84a4a', cx - 2, fy + 12, 4, 6); P('#f0ead8', cx - 3, fy + 11, 1, 4); P('#f0ead8', cx + 2, fy + 11, 1, 4);
  pinnacle(R, cx, fy, st, 6);
  P(st[5], 0, 40, W, 1); P(st[1], 0, 41, W, 1);
  // escudos con la cruz de san Jorge
  for (const sx of [cx - 18, cx + 12]) { if (sx < 1 || sx + 7 > W) continue; P(st[1], sx - 1, 45, 8, 10); P('#f2ead8', sx, 46, 6, 7); P('#c8302c', sx + 2, 46, 2, 7); P('#c8302c', sx, 48, 6, 2); P('#f2ead8', sx + 1, 53, 4, 1); }
  door(R, cx, H - 2, { w: 14, h: 22, arch: 'pointed', dbl: true, color: '#4a2e22', studs: true, stone: '#e0cca4' });
}
function llotja(R) { // Lonja de Mar
  const { b, W, H, P } = R, fy = 22;
  const wr = R.wr = ashlar(R, 0, fy, W, H - fy, '#e4d4b0', 6, 5);
  hipRoof(R, -1, -4, W + 2, fy + 4, '#8a6e5e', 10);
  // balaustrada y frontón con galera
  P(wr[4], 0, fy, W, 4); P(wr[6], 0, fy, W, 1); for (let i = 2; i < W - 1; i += 3) P(wr[2], i, fy + 1, 1, 3);
  const cx0 = Math.round(W / 2);
  poly(R.ctx, [[PX + cx0 - 22, PT + fy + 1], [PX + cx0, PT + fy - 12], [PX + cx0 + 22, PT + fy + 1]], wr[4]);
  line(R.ctx, PX + cx0 - 22, PT + fy, PX + cx0, PT + fy - 12, wr[6]); line(R.ctx, PX + cx0, PT + fy - 12, PX + cx0 + 22, PT + fy, wr[1]);
  P('#6a4428', cx0 - 6, fy - 4, 12, 2); P('#6a4428', cx0 - 4, fy - 2, 8, 1); P(IRON[2], cx0, fy - 10, 1, 6); P('#f0e8d8', cx0 + 1, fy - 9, 4, 4); P('#c8302c', cx0 - 6, fy - 4, 2, 1); // galera
  P(wr[5], 0, fy + 4, W, 1); P(wr[1], 0, fy + 5, W, 1);
  // pilastras y ventanas con frontón
  for (let c = 0; c < b.w; c++) { const x = c * 16; P(wr[4], x, fy + 6, 2, H - fy - 10); P(wr[2], x + 2, fy + 6, 1, H - fy - 10); }
  for (let c = 0; c < b.w; c++) { const x = c * 16 + 5; poly(R.ctx, [[PX + x - 2, PT + fy + 11], [PX + x + 3, PT + fy + 7], [PX + x + 8, PT + fy + 11]], wr[5]); win(R, x, fy + 11, 6, 10, { wr, frame: '#7a5a3a' }); }
  P(wr[5], 0, 44, W, 1); P(wr[1], 0, 45, W, 1);
  plinth(R, W, H);
  // tres grandes arcos de medio punto (logia)
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  for (const ax of [cx - 36, cx + 20]) { if (ax < 0 || ax + 16 > W) continue; rows(ax - 2, 48, 20, H - 51, 'round', 9, (yy, a, bb) => P(wr[5], a, yy, bb - a, 1)); rows(ax, 50, 16, H - 53, 'round', 7, (yy, a, bb, k) => P(k < 6 ? '#2a2234' : '#3a2e3a', a, yy, bb - a, 1)); P('#5a4a4a', ax, H - 5, 16, 2); P(wr[2], ax + 16, 50, 1, H - 53); }
  rows(cx - 11, 47, 22, H - 49, 'round', 10, (yy, a, bb) => P(wr[5], a, yy, bb - a, 1));
  door(R, cx, H - 2, { w: 16, h: 22, arch: 'round', dbl: true, color: '#5a3a28', stone: '#e8dcc0', voussoirs: false });
}
function drassanes(R) { // Atarazanas: naves paralelas con hastiales y grandes arcos apuntados
  const { b, W, H, P } = R;
  const n = Math.max(3, Math.round(W / 29)), nw = W / n;
  const stC = '#c4a474', st = ramp(stC);
  ashlar(R, 0, 14, W, H - 14, stC, 6, 2);
  const rr = ramp('#9a5a3a');
  for (let k = 0; k < n; k++) {
    const x0 = Math.round(k * nw), x1 = Math.round((k + 1) * nw), cx = (x0 + x1) / 2;
    // faldones (detrás del hastial)
    for (let j = -10; j < 22; j++) for (let i = x0; i < x1; i++) { const d = Math.abs(i - cx) / ((x1 - x0) / 2); if (j < -10 + d * 22) continue; P(i < cx ? (j % 4 === 3 ? rr[3] : rr[5]) : (j % 4 === 3 ? rr[0] : rr[2]), i, j); }
    // hastial
    poly(R.ctx, [[PX + x0 + 1, PT + 24], [PX + cx, PT + 2], [PX + x1 - 1, PT + 24]], st[3]);
    line(R.ctx, PX + x0 + 1, PT + 23, PX + cx, PT + 1, st[5]); line(R.ctx, PX + cx, PT + 1, PX + x1 - 1, PT + 23, st[1]);
    P(st[1], cx - 1, 12, 3, 3); P(GL[0], cx, 13, 1, 2); // óculo
    // contrafuerte entre naves
    if (k > 0) { P(st[2], x0 - 2, 22, 4, H - 24); P(st[4], x0 - 2, 22, 1, H - 24); P(st[4], x0 - 3, 20, 6, 2); }
    // arco
    const aw = Math.round(x1 - x0) - 10, ax = Math.round(cx - aw / 2);
    if (k !== Math.floor((b.door.x - b.x) * 16 / nw)) {
      rows(ax - 2, 30, aw + 4, H - 33, 'pointed', Math.round((aw + 4) * 0.75), (yy, a, bb) => P(st[5], a, yy, bb - a, 1));
      rows(ax, 32, aw, H - 35, 'pointed', Math.round(aw * 0.75), (yy, a, bb, kk) => P(kk < 10 ? '#221c2c' : '#30283a', a, yy, bb - a, 1));
      if (k === 0) { const pr = ramp('#7a4a2c'); P(pr[3], ax + 3, H - 16, aw - 4, 8); P(pr[5], ax + 3, H - 16, aw - 4, 1); P(pr[2], ax + 3, H - 10, aw - 4, 2); P('#c8302c', ax + 3, H - 13, aw - 4, 1); P(pr[3], ax + aw - 4, H - 22, 2, 6); } // proa de una galera
    }
  }
  plinth(R, W, H, '#8a7a62');
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  door(R, cx, H - 2, { w: 16, h: 24, arch: 'pointed', dbl: true, color: '#5a3424', studs: true, stone: '#d8bc8c' });
  lantern(R, cx - 14, 40); lantern(R, cx + 9, 40);
}
function molino(R) { // molino harinero con rueda hidráulica
  const { b, W, H, P } = R, fy = 18;
  const wr = R.wr = rubble(R, 0, fy, W, H - fy, '#b0a088', '#d8ccb4');
  hipRoof(R, -1, -6, W + 2, fy + 6, '#b05a3a');
  eaveShadow(R, fy, W, wr);
  plinth(R, W, H, '#8a7a68');
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  door(R, cx, H - 2, { w: 10, h: 13, arch: 'round', color: '#6a4428', stone: '#d8c8a8' });
  win(R, W - 14, fy + 6, 6, 7, { wr, shutter: '#6a5a3a' });
  // canal y rueda
  const wx = 12, wy = H - 13, wrad = 11, wd = ramp('#8a5a34');
  P('#2a5a8a', 0, H - 5, 26, 4); P('#5a9ad0', 0, H - 5, 26, 1); P('#c8e8f8', 3, H - 4, 3, 1); P('#c8e8f8', 15, H - 3, 4, 1);
  ellipse(R.ctx, PX + wx, PT + wy, wrad, wrad, wd[1]); ellipse(R.ctx, PX + wx, PT + wy, wrad - 2, wrad - 2, wd[2]);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; line(R.ctx, PX + wx, PT + wy, PX + wx + Math.cos(a) * (wrad - 2), PT + wy + Math.sin(a) * (wrad - 2), wd[4]); const px = Math.round(wx + Math.cos(a) * wrad), py = Math.round(wy + Math.sin(a) * wrad); P(wd[3], px - 1, py - 1, 3, 3); P(wd[5], px - 1, py - 1, 1, 1); }
  P(wd[5], wx - 1, wy - 1, 3, 3); P(IRON[1], wx, wy, 1, 1);
  P('#e8f4ff', wx - 4, H - 6, 2, 1); P('#e8f4ff', wx + 5, H - 6, 2, 1);
}
function ermita(R) { // Sant Medir: capilla encalada con espadaña
  const { b, W, H, P } = R, fy = 18;
  const wr = R.wr = plaster(R, 0, fy, W, H - fy, b.wall || '#e4dccb', 4);
  hipRoof(R, -1, -6, W + 2, fy + 6, '#a8603e');
  eaveShadow(R, fy, W, wr);
  plinth(R, W, H, '#a09484');
  const dc = b.door.x - b.x, cx = dc * 16 + 8;
  // espadaña
  const st = ramp('#ece4d4'), ex = cx - 7;
  P(st[3], ex, -16, 14, 20); P(st[5], ex, -16, 14, 1); P(st[4], ex, -16, 1, 20); P(st[2], ex + 13, -16, 1, 20);
  poly(R.ctx, [[PX + ex - 1, PT - 15], [PX + cx, PT - 22], [PX + ex + 15, PT - 15]], st[4]);
  rows(ex + 4, -12, 6, 9, 'round', 3, (yy, a, bb) => P('#2a2234', a, yy, bb - a, 1));
  P('#b8802a', ex + 5, -8, 4, 4); P('#e8b040', ex + 5, -8, 1, 2); P('#7a5218', ex + 8, -6, 1, 2); P(IRON[1], ex + 6, -4, 2, 1);
  P(IRON[1], cx, -26, 1, 5); P(IRON[1], cx - 1, -25, 3, 1);
  // óculo y puerta adovelada
  ellipse(R.ctx, PX + cx, PT + fy + 6, 3, 3, st[1]); ellipse(R.ctx, PX + cx, PT + fy + 6, 2, 2, GL[0]); R.lit.push({ x: cx - 1, y: fy + 5, w: 3, h: 3, k: 'win', m: -1, s: 0.9 });
  door(R, cx, H - 2, { w: 10, h: 14, arch: 'round', color: '#6a4428', stone: '#d8ccb4', studs: true });
  P(st[2], cx + 9, H - 6, 9, 3); P(st[5], cx + 9, H - 6, 9, 1); // poyo
}

// ───────────── Pequeñas construcciones ─────────────
function puesto(R) { // puesto del mercado con toldo y género
  const { b, W, H, P } = R, wd = ramp('#8a5a34');
  const c = b.awning || ['#c83a3a', '#3a6ac8', '#e8a030', '#3a9a5a', '#9a4ac8'][Math.floor(R.v * 5)];
  P(wd[2], 2, 6, 2, H - 8); P(wd[2], W - 4, 6, 2, H - 8); P(wd[4], 2, 6, 1, H - 8);
  // mostrador con faldón de tela
  const cl = ramp(R.v < 0.5 ? '#e8dcc0' : '#d8b880');
  P(wd[3], 0, H - 15, W, 3); P(wd[5], 0, H - 15, W, 1);
  P(cl[3], 1, H - 12, W - 2, 10); for (let i = 2; i < W - 2; i += 4) P(cl[2], i, H - 12, 1, 10); P(cl[5], 1, H - 12, W - 2, 1); P(cl[1], 1, H - 3, W - 2, 1);
  // género
  const goods = b.goods || ['#e84a4a', '#f8c040', '#6ab04a', '#e8a040', '#a85ab8'];
  for (let i = 0; i < 4; i++) { const g = ramp(goods[(i + R.s) % goods.length]); const gx = 2 + i * 7; P('#a87a4a', gx, H - 18, 6, 3); P('#c89a64', gx, H - 18, 6, 1); for (let k = 0; k < 3; k++) { P(g[3], gx + k * 2, H - 20, 2, 2); P(g[5], gx + k * 2, H - 20, 1, 1); } }
  // toldo
  const a = ramp(c), cr = ramp('#f2e8d0');
  for (let j = 0; j < 9; j++) for (let i = -1; i < W + 1; i++) { const r = Math.floor((i + 1) / 4) % 2 ? cr : a; P(j === 0 ? r[5] : j < 3 ? r[4] : r[3], i, j - 2); }
  for (let i = -1; i < W + 1; i++) { const r = Math.floor((i + 1) / 4) % 2 ? cr : a; const k = (i + 1) & 3; P(r[2], i, 7, 1, k === 0 || k === 3 ? 1 : 2); }
  P(a[1], -1, -2, W + 2, 1);
}
function barca(R) { // llaüt amarrado: casco con regala pintada y ojo en la proa, palo con la entena y la vela aferrada, farol
  const { W, H, P } = R;
  const hull = ramp('#f2eee2'), band = ramp(R.v < 0.5 ? '#2a6ab0' : '#2a8a6a'), wd = ramp('#8a5a34'), keel = ramp('#b83a2c');
  const top = (i) => { const t = i / (W - 1); return Math.round(H - 20 - 4 * Math.pow(Math.max(0, t - 0.55) / 0.45, 1.8) - 1.5 * Math.pow(Math.max(0, 0.25 - t) / 0.25, 2)); };
  const bot = (i) => { const t = i / (W - 1); return Math.round(H - 5 - 6 * Math.pow(Math.abs(t - 0.45) / 0.55, 2.4)); };
  // reflejo oscuro bajo el casco
  for (let i = 4; i < W - 4; i++) P('#1c3a6a', i, bot(i) + 1, 1, 1);
  for (let i = 1; i < W - 1; i++) {
    const t0 = top(i), b0 = bot(i); if (b0 - t0 < 3) continue;
    P(wd[3], i, t0 - 3, 1, 3); P(wd[5], i, t0 - 3, 1, 1); if (i % 7 === 3) P(wd[1], i, t0 - 3, 1, 3); // interior y bancadas
    P(band[3], i, t0, 1, 2); P(band[5], i, t0, 1, 1);
    P(i < W * 0.3 ? hull[5] : hull[4], i, t0 + 2, 1, b0 - t0 - 3); P(hull[2], i, b0 - 2, 1, 1);
    P(keel[3], i, b0 - 1, 1, 1);
  }
  for (let i = 3; i < W - 6; i += 5) P(hull[2], i, top(i) + 4, 3, 1); // tracas
  // roda alta de proa y codaste
  P(wd[2], W - 3, top(W - 3) - 6, 2, 8); P(wd[4], W - 3, top(W - 3) - 6, 1, 8); P(wd[2], 1, top(1) - 3, 2, 5);
  P('#ffffff', W - 9, top(W - 9) + 3, 2, 2); P(INK, W - 8, top(W - 9) + 3, 1, 1); P('#c8302c', W - 10, top(W - 9) + 3, 1, 2); // ull de proa
  // palo, entena y vela aferrada
  const mx = Math.round(W * 0.45), my = top(mx) - 3;
  P(wd[2], mx, 1, 2, my - 1); P(wd[4], mx, 1, 1, my - 1);
  line(R.ctx, PX + 3, PT + 13, PX + W - 4, PT + 1, wd[2]);
  for (let i = 5; i < W - 8; i++) { const yy = Math.round(13 - ((i - 3) / (W - 7)) * 12); P('#ece4d0', i, yy + 1, 1, 2); P('#c8bea8', i, yy + 3, 1, 1); if (i % 6 === 0) P('#a89878', i, yy + 1, 1, 2); }
  // farol de pesca (llum) y remos
  P(IRON[1], 4, top(4) - 9, 1, 6); P(IRON[1], 3, top(4) - 10, 4, 1); P('#c89a4a', 3, top(4) - 9, 3, 3); R.lit.push({ x: 3, y: top(4) - 9, w: 3, h: 3, k: 'lamp' });
  line(R.ctx, PX + 10, PT + top(10) - 2, PX + 20, PT + top(20) - 4, wd[3]);
}
function templo(R) { // ruinas de un templo antiguo con ofrendas: montaña (nevado, roto) o mar (salitre, pátina)
  const { b, W, H, P } = R, mar = b.id === 'templo_mar';
  const stC = mar ? '#dcd8cc' : '#b4ac9c', st = ramp(stC);
  const floorY = H - 14, capY = mar ? 6 : 8;
  // cella al fondo, en sombra
  P(st[1], 2, capY, W - 4, floorY - capY); for (let j = capY + 2; j < floorY; j += 5) for (let i = 2 + ((j / 5) & 1) * 4; i < W - 2; i += 8) P(st[0], i, j, 1, 4);
  for (let j = capY + 1; j < floorY; j += 5) P(st[0], 2, j, W - 4, 1);
  P(st[2], 2, floorY - 6, W - 4, 6); P(st[3], 2, floorY - 6, W - 4, 1); // suelo del pórtico
  // altar con ofrendas
  const ax = Math.round(W / 2) - 8;
  P(st[3], ax, floorY - 12, 16, 9); P(st[5], ax, floorY - 12, 16, 1); P(st[1], ax, floorY - 4, 16, 1); P(st[4], ax, floorY - 11, 1, 7);
  if (mar) { P('#f0c8b8', ax + 2, floorY - 14, 3, 2); P('#f8e0d4', ax + 2, floorY - 14, 1, 1); P('#e8a890', ax + 10, floorY - 14, 3, 2); P('#c8a060', ax + 6, floorY - 14, 4, 2); P('#e8d8a0', ax + 7, floorY - 15, 2, 1); R.lit.push({ x: ax + 7, y: floorY - 17, w: 2, h: 2, k: 'lamp' }); }
  else { P('#e8b040', ax + 2, floorY - 15, 3, 3); P('#f8d870', ax + 2, floorY - 15, 1, 1); P('#c8302c', ax + 7, floorY - 16, 1, 4); P('#3a6ab0', ax + 9, floorY - 16, 1, 4); P('#e8e0cc', ax + 12, floorY - 14, 2, 2); P('#f0e8d0', ax + 5, floorY - 18, 1, 3); R.lit.push({ x: ax + 5, y: floorY - 20, w: 1, h: 2, k: 'lamp' }); }
  // escalinata (estilóbato)
  for (let s2 = 0; s2 < 4; s2++) { const y = floorY + s2 * 3; P(st[5], s2, y, W - s2 * 2, 1); P(st[4], s2, y + 1, W - s2 * 2, 1); P(st[2], s2, y + 2, W - s2 * 2, 1); }
  P(st[1], 3, H - 1, W - 6, 1);
  // columnas estriadas (una rota)
  const n = 5;
  for (let k = 0; k < n; k++) {
    const x = Math.round(5 + k * ((W - 17) / (n - 1))), broken = !mar ? k === 3 : k === 1, top = broken ? capY + 16 : capY;
    P(st[4], x, top, 7, floorY - top); P(st[6], x, top, 1, floorY - top); P(st[5], x + 1, top, 1, floorY - top); P(st[2], x + 5, top, 1, floorY - top); P(st[1], x + 6, top, 1, floorY - top);
    for (let j = top + 2; j < floorY - 1; j += 4) { P(st[3], x + 3, j, 1, 2); P(st[3], x + 2, j + 2, 1, 1); }
    P(st[5], x - 1, floorY - 2, 9, 2); P(st[2], x - 1, floorY - 1, 9, 1);
    if (!broken) { P(st[5], x - 1, top - 2, 9, 2); P(st[6], x - 1, top - 2, 9, 1); P(st[2], x, top, 7, 1); }
    else { P(st[2], x + 1, top - 1, 5, 1); P(st[4], x, top - 1, 2, 1); P(st[5], x + 4, top - 2, 2, 1); P(st[3], x + 9, floorY - 4, 6, 3); P(st[5], x + 9, floorY - 4, 6, 1); } // tambor caído
    if (mar) { P('#5a9a8a', x, floorY - 6, 7, 4); P('#7ab8a8', x + 1, floorY - 6, 3, 1); P('#4a8a7a', x + 5, floorY - 5, 2, 2); }
    else if (k !== 3) { for (let j = 0; j < 4; j++) P(j % 2 ? '#4a7a3a' : '#5e8e44', x + (j % 3), floorY - 8 - j * 3, 2, 2); } // hiedra
  }
  // entablamento
  const aw = mar ? W : Math.round(W * 0.6);
  P(st[4], 0, capY - 8, aw, 6); P(st[6], 0, capY - 8, aw, 1); P(st[2], 0, capY - 3, aw, 1);
  for (let i = 3; i < aw - 2; i += 6) { P(st[2], i, capY - 7, 1, 4); P(st[2], i + 2, capY - 7, 1, 4); } // triglifos
  if (!mar) { // nieve sobre las piedras
    for (let i = 0; i < aw; i++) if (hash(i, 1, R.s) < 0.8) P('#f6faff', i, capY - 9, 1, 1 + (hash(i, 2, R.s) < 0.4 ? 1 : 0));
    P('#f6faff', aw - 1, capY - 7, 1, 2); P('#dfe8f4', 0, capY - 9, aw, 1);
    for (let k2 = 0; k2 < 4; k2++) P('#f6faff', 6 + k2 * 23, floorY - 1, 5, 1);
  } else { // frontón con acroterios y concha
    poly(R.ctx, [[PX + W / 2 - 22, PT + capY - 8], [PX + W / 2, PT + capY - 20], [PX + W / 2 + 22, PT + capY - 8]], st[4]);
    line(R.ctx, PX + W / 2 - 22, PT + capY - 8, PX + W / 2, PT + capY - 20, st[6]); line(R.ctx, PX + W / 2, PT + capY - 20, PX + W / 2 + 22, PT + capY - 8, st[2]);
    P('#f0c8b8', W / 2 - 3, capY - 14, 6, 4); for (let i = 0; i < 3; i++) P('#d8a090', W / 2 - 2 + i * 2, capY - 14, 1, 4); P('#f8e0d4', W / 2 - 3, capY - 14, 6, 1);
    P(st[5], W / 2 - 1, capY - 23, 2, 3);
  }
  // algas y conchas o matas secas al pie
  for (let k2 = 0; k2 < 12; k2++) { const x = Math.floor(hash(k2, 4, R.s) * W), y = H - 2 - Math.floor(hash(k2, 5, R.s) * 8); P(mar ? '#3a7a5a' : '#8a8a4a', x, y, 1, 2); P(mar ? '#5aa07a' : '#aaa45a', x, y, 1, 1); }
}
function altar(R) { // altares paganos (1x1)
  const { b, P } = R, st = ramp('#8a8680');
  if (b.id === 'altar_rio') { // fuente de las dones d'aigua
    P(st[3], 1, 6, 14, 8); P(st[5], 1, 6, 14, 1); P(st[1], 1, 13, 14, 1);
    P('#2a6aa8', 3, 8, 10, 4); P('#6ab0e0', 3, 8, 10, 1); P('#c8ecfc', 5, 9, 2, 1);
    P(st[2], 6, 0, 4, 7); P(st[4], 6, 0, 1, 7); P('#6ab0e0', 7, 6, 2, 2);
    P('#f0c040', 11, 4, 3, 1); P('#f0c040', 11, 5, 1, 1); P('#f0c040', 13, 5, 1, 1); // peine de oro
    P('#c8302c', 2, 2, 1, 4); P('#3a8ac8', 3, 3, 1, 4); P('#4a8a3a', 0, 9, 1, 4); P('#4a8a3a', 15, 8, 1, 5);
    R.lit.push({ x: 3, y: 8, w: 10, h: 4, k: 'glow' });
    return;
  }
  if (b.id === 'altar_bosque') { // ara del dolmen con bellotas, hierbas y una figurilla
    P(st[2], 1, 9, 14, 6); P(st[3], 0, 6, 16, 5); P(st[5], 0, 6, 16, 1); P(st[1], 0, 10, 16, 1);
    P('#4a6a3a', 0, 7, 3, 2); P('#5a7a3e', 12, 6, 4, 1);
    P('#8a5a2a', 3, 4, 2, 2); P('#a8783a', 3, 4, 1, 1); P('#8a5a2a', 6, 4, 2, 2); P('#6a8a3a', 9, 2, 1, 4); P('#8aaa4a', 10, 3, 1, 3);
    P('#c8a070', 12, 3, 2, 3); P('#e8c8a0', 12, 2, 2, 1);
    P('#f0e8d0', 7, 2, 1, 2); P('#f8d860', 7, 1, 1, 1); R.lit.push({ x: 7, y: 0, w: 1, h: 2, k: 'lamp' });
    return;
  }
  // Piedra Larga: losa de ofrendas con un cuenco de leche, flores y una vela
  P(st[2], 1, 10, 14, 5); P(st[3], 1, 8, 14, 3); P(st[5], 1, 8, 14, 1); P(st[1], 1, 14, 14, 1);
  P('#c8b8a0', 4, 5, 6, 3); P('#f8f4ec', 5, 5, 4, 1); P('#a8987e', 4, 7, 6, 1);
  P('#e84a6a', 11, 6, 1, 1); P('#f0c040', 13, 5, 1, 1); P('#a86ac8', 12, 4, 1, 1); P('#3a7a3a', 11, 7, 3, 1);
  P('#f0e8d0', 2, 4, 1, 4); P('#f8d860', 2, 3, 1, 1); R.lit.push({ x: 2, y: 2, w: 1, h: 2, k: 'lamp' });
}
function tienda_campana(R) { // tienda de feria a rayas
  const { W, H, P } = R, c = ['#c86a3a', '#6a8a3a', '#8a4a7a'][Math.floor(R.v * 3)], a = ramp(c), cr = ramp('#f2e8d0');
  for (let j = 0; j < H - 3; j++) { const w = Math.floor(((j + 3) / (H - 1)) * W); for (let i = 0; i < w; i++) { const x = Math.round(W / 2 - w / 2 + i); const r = Math.floor((i / Math.max(1, w)) * 6) % 2 ? cr : a; P(i < w * 0.3 ? r[4] : i > w * 0.75 ? r[2] : r[3], x, j); } }
  P(IRON[2], Math.round(W / 2), -8, 1, 8); P(a[4], Math.round(W / 2) + 1, -8, 5, 3);
  door(R, Math.round(W / 2), H - 2, { w: 8, h: 10, arch: 'pointed', color: '#2a1e24', voussoirs: false, stone: a[2] });
}

const BY_KIND = { casa, taberna, tienda, cuartel, hospital, masia, cabana, catedral, castillo, puesto, barca, templo, altar, tienda_campana };
const BY_ID = { consell, llotja, drassanes, molino, molino_rio: molino, ermita };

// ───────────── Luces de noche ─────────────
const roseLit = new Map();
export function drawBuildingLights(ctx, b, ox = 0, oy = 0, fr = 0) {
  if (!b.lit) return;
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  for (const l of b.lit) {
    const x = l.x - ox, y = l.y - oy;
    if (x > cw + 4 || y > ch + 4 || x + l.w < -4 || y + l.h < -4) continue;
    const P = (c, xx, yy, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(xx, yy, w, h); };
    const s = l.s ?? 0.5, tick = Math.floor(fr / 9 + s * 50);
    switch (l.k) {
      case 'win': case 'slit': {
        if (s < 0.2) break; // ventana a oscuras
        const warm = l.k === 'slit' ? ['#ffd890', '#f0a040', '#c86a2a'] : ['#fff2bc', '#ffd27a', '#f2a446'];
        rows(x, y, l.w, l.h, l.arch || 'flat', l.ar || 0, (yy, a, bb, k) => P(k < l.h * 0.35 ? warm[0] : k < l.h * 0.7 ? warm[1] : warm[2], a, yy, bb - a, 1));
        if (tick % 37 === 0) P(warm[2], x, y + (l.ar || 0), l.w, l.h - (l.ar || 0));
        if (l.m >= 0 && l.w >= 5) P('#5a3a2c', l.m - ox, y + (l.ar ? 2 : 0), 1, l.h - (l.ar ? 2 : 0));
        if (s > 0.86 && l.h >= 6) { const hx = x + Math.round(l.w * (s > 0.93 ? 0.25 : 0.6)); P('#5a3424', hx, y + l.h - 4, 2, 2); P('#5a3424', hx - 1, y + l.h - 2, 4, 2); } // silueta
        else if (s > 0.6 && l.w >= 6) { P('#e86a5a', x, y, 1, l.h); P('#e86a5a', x + l.w - 1, y, 1, l.h); } // cortinas
        break;
      }
      case 'shop': P('#ffd88a', x, y, l.w, l.h); P('#ffefc0', x, y, l.w, 1); P('#f0a648', x, y + l.h - 1, l.w, 1); break;
      case 'lamp': P(tick % 5 === 0 ? '#ffe8a0' : '#fff6d0', x, y, l.w, l.h); if (l.w >= 3) P('#ffc860', x, y + l.h - 1, l.w, 1); break;
      case 'fire': { const f = tick % 3; P('#f08a2a', x, y + 1, l.w, l.h - 1); P('#ffe070', x + (f === 1 ? 0 : 1), y + (f === 2 ? 1 : 0), 1, 2); P('#ffffff', x + 1, y + 1, 1, 1); break; }
      case 'glow': P(tick % 7 === 0 ? '#6ad88a' : '#8af0a0', x, y, l.w, l.h); P('#d8ffe0', x + 1, y + 1, 1, 1); break;
      case 'rose': { // vidriera encendida: se cachea por fase del destello
        const key = l.r + '|' + l.cols.join() + '|' + (tick % 11);
        let c = roseLit.get(key);
        if (!c) {
          const r = l.r; c = document.createElement('canvas'); c.width = c.height = r * 2 + 1; const x2 = c.getContext('2d');
          for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
            const kk = rosePix(i, j, r); if (!kk || kk === 'ring' || kk === 'stone') continue;
            const base = kk === 'g0' ? l.cols[0] : kk === 'g1' ? l.cols[1] : kk === 'g2' ? l.cols[2] : l.cols[3];
            x2.fillStyle = mix(base, '#fff0b0', 0.35 + (((i * 7 + j * 3 + tick) % 11) === 0 ? 0.25 : 0)); x2.fillRect(i + r, j + r, 1, 1);
          }
          roseLit.set(key, c);
        }
        ctx.drawImage(c, x, y);
        break;
      }
    }
  }
}

// ───────────── Puerta abierta (transiciones) ─────────────
export function drawDoorOpen(ctx, b, ox = 0, oy = 0, t = 1) {
  const d = b.doorRect; if (!d) return;
  const x = d.x - ox, y = d.y - oy, wd = ramp(d.col || '#6e4228');
  const P = (c, xx, yy, w = 1, h = 1) => { if (w > 0 && h > 0) { ctx.fillStyle = c; ctx.fillRect(xx, yy, w, h); } };
  rows(x, y, d.w, d.h, d.arch, d.ar, (yy, a, bb, k) => P(k > d.h - 3 ? '#4a3424' : k > d.h - 6 ? '#2a1c22' : '#160e1c', a, yy, bb - a, 1));
  // resplandor cálido del interior
  P('#5a3a24', x + 2, y + d.h - 2, d.w - 4, 1);
  const half = d.dbl ? d.w / 2 : d.w, lw = Math.max(1, Math.round(half * (1 - t)));
  const leaf = (lx, w, flip) => rows(x, y, d.w, d.h, d.arch, d.ar, (yy, a, bb) => { const x0 = flip ? Math.max(a, lx) : Math.max(a, lx), x1 = Math.min(bb, lx + w); if (x1 > x0) { P(wd[3], x0, yy, x1 - x0, 1); P(t > 0.5 ? wd[2] : wd[4], flip ? x1 - 1 : x0, yy, 1, 1); } });
  leaf(x, lw, false);
  if (d.dbl) leaf(x + d.w - lw, lw, true);
}

// ───────────── Iconos de los rótulos de tienda (tablero 11x9) ─────────────
export const ICONS = {
  hierbas: (P, x, y) => { P('#3a7a3a', x + 5, y + 2, 1, 6); P('#5aa04a', x + 3, y + 3, 2, 2); P('#5aa04a', x + 6, y + 4, 2, 2); P('#8ac86a', x + 3, y + 3, 1, 1); P('#7ab85a', x + 4, y + 6, 2, 1); P('#b07ad8', x + 5, y + 1, 1, 1); P('#b07ad8', x + 7, y + 3, 1, 1); },
  forja: (P, x, y) => { P('#7a8292', x + 2, y + 5, 7, 2); P('#b4bcc8', x + 2, y + 5, 7, 1); P('#5a6070', x + 4, y + 7, 3, 1); P('#7a8292', x + 1, y + 5, 1, 1); P('#8a5a34', x + 6, y + 1, 1, 4); P('#9aa2b2', x + 4, y + 1, 5, 2); P('#d4dae4', x + 4, y + 1, 4, 1); },
  sastre: (P, x, y) => { P('#c84a6a', x + 3, y + 2, 5, 6); P('#e87a8a', x + 3, y + 2, 1, 5); P('#c84a6a', x + 2, y + 2, 1, 3); P('#c84a6a', x + 8, y + 2, 1, 3); P('#f0d8e0', x + 5, y + 2, 1, 6); P('#f0c040', x + 5, y + 4, 1, 1); },
  libros: (P, x, y) => { P('#f2e8d0', x + 2, y + 3, 7, 4); P('#c8b898', x + 5, y + 3, 1, 4); P('#8a3a2a', x + 1, y + 6, 9, 2); P('#b84a3a', x + 1, y + 6, 9, 1); for (let i = 0; i < 2; i++) { P('#8a7a6a', x + 3, y + 4 + i, 1, 1); P('#8a7a6a', x + 7, y + 4 + i, 1, 1); } },
  pescado: (P, x, y) => { P('#8ab0c8', x + 2, y + 3, 6, 3); P('#d8ecf4', x + 3, y + 3, 4, 1); P('#5a7a92', x + 2, y + 5, 6, 1); P('#8ab0c8', x + 8, y + 2, 1, 2); P('#8ab0c8', x + 8, y + 5, 1, 2); P('#8ab0c8', x + 9, y + 1, 1, 1); P('#8ab0c8', x + 9, y + 7, 1, 1); P(INK, x + 3, y + 4, 1, 1); },
  pan: (P, x, y) => { P('#c8843a', x + 2, y + 3, 7, 4); P('#e8b060', x + 3, y + 3, 5, 1); P('#8a5424', x + 2, y + 6, 7, 1); P('#f0d090', x + 4, y + 4, 2, 1); P('#8a5424', x + 4, y + 5, 1, 1); P('#8a5424', x + 6, y + 4, 1, 1); },
  alquimia: (P, x, y) => { P('#d8e4ec', x + 5, y + 1, 2, 3); P('#4ac06a', x + 3, y + 4, 6, 4); P('#8ae0a0', x + 4, y + 4, 2, 1); P('#2a8a4a', x + 3, y + 7, 6, 1); P('#ffffff', x + 7, y + 5, 1, 1); P('#b8c8d4', x + 4, y + 1, 4, 1); },
  joyas: (P, x, y) => { P('#e8c050', x + 3, y + 4, 5, 4); P('#2a1e24', x + 4, y + 5, 3, 2); P('#fff0a0', x + 3, y + 4, 2, 1); P('#e84a5a', x + 4, y + 2, 3, 2); P('#ff9aa8', x + 4, y + 2, 1, 1); },
  madera: (P, x, y) => { P('#8a5a3a', x + 1, y + 2, 9, 2); P('#c08a5a', x + 1, y + 2, 9, 1); P('#9a6a44', x + 1, y + 5, 9, 2); P('#d0a070', x + 1, y + 5, 9, 1); P('#5a3a22', x + 9, y + 2, 1, 2); P('#5a3a22', x + 9, y + 5, 1, 2); },
  vela: (P, x, y) => { P('#f0e8d8', x + 4, y + 3, 3, 5); P('#ffffff', x + 4, y + 3, 1, 4); P('#c8b898', x + 6, y + 3, 1, 5); P('#f8c040', x + 5, y + 1, 1, 2); P('#fff4b0', x + 5, y + 1, 1, 1); P('#3a3030', x + 5, y + 3, 1, 1); },
  ceramica: (P, x, y) => { P('#c86a44', x + 3, y + 3, 5, 5); P('#e89a6a', x + 3, y + 3, 1, 4); P('#8a3a2a', x + 7, y + 4, 1, 4); P('#c86a44', x + 4, y + 2, 3, 1); P('#2a1e24', x + 4, y + 1, 3, 1); P('#3a6ab0', x + 3, y + 5, 5, 1); },
  cambio: (P, x, y) => { P('#e8c050', x + 1, y + 4, 4, 4); P('#fff0a0', x + 1, y + 4, 2, 1); P('#a87a1a', x + 4, y + 7, 1, 1); P('#c8ccd8', x + 6, y + 3, 4, 4); P('#ffffff', x + 6, y + 3, 2, 1); P('#7a7a8a', x + 9, y + 6, 1, 1); },
};
