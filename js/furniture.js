// Muebles de interior en vista 3/4. Cada pieza se pinta en un lienzo de caché (con contorno selectivo)
// y puede sobresalir hasta 12 px por encima de su huella (cabeceros, campanas de chimenea, respaldos).
// fr = contador de fotogramas continuo (60 por segundo). Las piezas animadas conservan la MISMA silueta en
// todos sus fotogramas (sólo cambian colores e interiores): se pueden redibujar cada fotograma encima del
// suelo prerenderizado sin dejar restos.
import { INK, INK2, ramp, mix, outlineSel } from './pal.js';
import { painter, ellipse, line, hash } from './px.js';

export const ANIMATED_FURNITURE = new Set(['chimenea', 'caldero', 'altar', 'vela', 'fragua', 'pila', 'claustro']);
const UP = 12, cache = new Map();

const WOOD = ramp('#8e5c38'), DARK = ramp('#64402a'), STONE = ramp('#a49c90'), WSTONE = ramp('#c4ae8c');
const IRONR = ['#1a1824', '#2c2a38', '#46445a', '#6a687e', '#9a98ac'], GOLD = ramp('#e0a42c');
const BLANKETS = ['#b8383a', '#3a5a9a', '#4a7a46', '#b88a3a'];
const FLAME = [['#f08a2a', '#ffd060', '#fff6d0'], ['#f8a83a', '#ffe48a', '#ffffff'], ['#e8782a', '#ffc850', '#fff0b0'], ['#f8b048', '#fff0a8', '#ffffff'], ['#f09030', '#ffd870', '#fff8e0'], ['#f0a038', '#ffe080', '#ffffff']];

export function drawFurniture(ctx, o, X, Y, fr = 0) {
  const w = o.w || 1, h = o.h || 1, anim = ANIMATED_FURNITURE.has(o.type);
  const f = anim ? Math.floor(fr / 7) % 6 : 0, v = ((o.x || 0) * 7 + (o.y || 0) * 13) & 3;
  const key = `${o.type}|${w}x${h}|${o.goods || ''}|${o.severe ? 1 : 0}|${v}|${f}`;
  let c = cache.get(key); if (!c) { c = paint(o, w, h, v, f); cache.set(key, c); }
  ctx.drawImage(c, X, Y - UP);
}
function paint(o, w, h, v, f) {
  const W = w * 16, H = h * 16, cv = document.createElement('canvas'); cv.width = W; cv.height = H + UP;
  const ctx = cv.getContext('2d'), P = painter(ctx, 0, UP), post = [];
  const k = { o, v, f, post, E: (cx, cy, rx, ry, c) => ellipse(ctx, cx, cy + UP, rx, ry, c), L: (a, b, c, d, col) => line(ctx, a, b + UP, c, d + UP, col) };
  (F[o.type] || F.def)(P, W, H, k);
  outlineSel(cv);
  for (const fn of post) fn(P); // llamas y destellos: sin contorno
  return cv;
}
// Llama de vela 1x3 (silueta fija)
function flame(k, x, y, ph = 0) { k.post.push((P) => { const c = FLAME[(k.f + ph) % 6]; P(c[0], x, y, 1, 1); P(c[1], x, y + 1, 1, 1); P(c[2], x, y + 2, 1, 1); }); }
// Fuego dentro de un hueco opaco (x, base, ancho, alto)
function fire(P, x, base, w, h, f) {
  for (let i = 0; i < w; i++) {
    const m = 1 - Math.abs(i - (w - 1) / 2) / ((w + 1) / 2);
    const fh = Math.max(1, Math.round(h * (0.35 + 0.65 * m) * (0.75 + 0.25 * Math.sin(i * 1.9 + f * 1.3))));
    for (let j = 0; j < fh; j++) { const t = j / fh; P(t > 0.8 ? '#a8241e' : t > 0.55 ? '#e8502a' : t > 0.25 ? '#f8a030' : '#ffe27a', x + i, base - j, 1, 1); }
  }
}

const F = {
  cama(P, W, H, k) {
    const wd = DARK, bl = ramp(BLANKETS[k.v]);
    P(wd[3], 1, -6, W - 2, 10); P(wd[5], 1, -6, W - 2, 1); P(wd[2], 3, -4, W - 6, 6); P(wd[4], 3, -4, W - 6, 1); P(wd[1], 3, 1, W - 6, 1);
    P(wd[4], 1, -8, 3, 3); P(wd[4], W - 4, -8, 3, 3); P(wd[6], 1, -8, 1, 1); P(wd[6], W - 4, -8, 1, 1);
    P(wd[1], 1, 4, W - 2, H - 6);
    P('#ece6da', 3, 2, W - 6, 6); P('#ffffff', 4, 2, W - 9, 2); P('#c0b8aa', 3, 7, W - 6, 1); P('#d8d2c6', W - 4, 3, 1, 4);
    P('#f2eee4', 2, 8, W - 4, 3); P('#ffffff', 2, 8, W - 4, 1); P('#bcb4a6', 2, 10, W - 4, 1);
    P(bl[3], 2, 11, W - 4, H - 15); P(bl[5], 2, 11, W - 4, 1); P(bl[2], W - 4, 12, 2, H - 16); P(bl[4], 3, 12, 1, H - 17);
    for (let j = 15; j < H - 6; j += 6) { P(bl[5], 3, j, W - 7, 1); P(bl[1], 3, j + 1, W - 7, 1); }
    P(bl[1], 2, H - 5, W - 4, 1);
    P(wd[3], 1, H - 4, W - 2, 3); P(wd[5], 1, H - 4, W - 2, 1); P(wd[4], 1, H - 6, 2, 5); P(wd[2], W - 3, H - 6, 2, 5);
  },
  mesa(P, W, H, k) {
    const wd = WOOD, big = H > 16, top = big ? 1 : 2, th = H - (big ? 9 : 8);
    P(wd[4], 1, top, W - 2, th); P(wd[5], 1, top, W - 2, 1);
    for (let j = top + 3; j < top + th; j += 3) P(wd[3], 1, j, W - 2, 1);
    for (let i = 7; i < W - 3; i += 13) P(wd[3], i, top + 1, 1, 1);
    P(wd[2], 1, top + th, W - 2, 2); P(wd[1], 1, top + th + 2, W - 2, 1);
    const ly = top + th + 3, lh = H - ly - 1;
    for (const lx of W > 40 ? [2, Math.round(W / 2) - 1, W - 4] : [2, W - 4]) { P(wd[2], lx, ly, 2, lh); P(wd[3], lx, ly, 1, lh); }
    onTable(P, W, H, top, th, k);
  },
  silla(P, W, H, k) {
    const wd = WOOD;
    P(wd[3], 4, -5, 8, 2); P(wd[5], 4, -5, 8, 1);
    P(wd[2], 4, -3, 1, 9); P(wd[2], 11, -3, 1, 9); P(wd[4], 6, -3, 1, 8); P(wd[4], 9, -3, 1, 8); P(wd[3], 5, 0, 6, 1);
    P('#c49c5a', 3, 5, 10, 4); P('#e0c080', 3, 5, 10, 1); for (let i = 4; i < 13; i += 2) P('#a07c3c', i, 6, 1, 3);
    P(wd[2], 3, 9, 10, 1);
    P(wd[2], 3, 10, 1, 5); P(wd[2], 12, 10, 1, 5); P(wd[3], 5, 10, 1, 4); P(wd[3], 10, 10, 1, 4); P(wd[3], 4, 12, 8, 1);
  },
  chimenea(P, W, H, k) {
    const st = STONE;
    // campana que sube por la pared
    P(st[3], 5, -12, W - 10, 12); P(st[5], 5, -12, 1, 12); P(st[1], W - 6, -12, 1, 12);
    for (let j = -10; j < 0; j += 4) for (let i = 6 + ((j / 4) & 1) * 3; i < W - 6; i += 6) P(st[2], i, j, 1, 3);
    P(st[2], 6, -9, W - 12, 1); P(st[2], 6, -5, W - 12, 1);
    // repisa con cacharros
    P(st[5], 1, 0, W - 2, 2); P(st[1], 1, 2, W - 2, 1);
    P('#b8603a', 5, -4, 4, 4); P('#d88858', 5, -4, 1, 3); P('#e8dcc0', 11, -3, 4, 3); P('#3a5aa8', 11, -2, 4, 1); P('#f0e8d0', W - 8, -5, 2, 5); flame(k, W - 7, -8);
    // jambas de piedra
    for (const x of [1, W - 6]) { P(st[3], x, 3, 5, H - 5); P(st[5], x, 3, 1, H - 5); P(st[1], x + 4, 3, 1, H - 5); for (let j = 7; j < H - 3; j += 5) P(st[2], x + 1, j, 3, 1); }
    // hogar
    P('#140c18', 6, 3, W - 12, H - 6); P('#2a1a22', 6, 3, W - 12, 2);
    fire(P, 8, H - 6, W - 16, 13, k.f);
    P('#5a3424', 8, H - 5, W - 16, 2); P('#8a5a34', 9, H - 5, 5, 1); P('#8a5a34', W - 14, H - 4, 5, 1);
    P(k.f % 2 ? '#f86a2a' : '#e84a24', 7, H - 3, W - 14, 1);
    // olla colgada
    P(IRONR[2], Math.round(W / 2), 3, 1, 6); P(IRONR[1], Math.round(W / 2) - 3, 9, 7, 5); P(IRONR[3], Math.round(W / 2) - 3, 9, 7, 1); P(IRONR[2], Math.round(W / 2) - 2, 10, 1, 3);
    P(st[4], 1, H - 3, W - 2, 2); P(st[5], 1, H - 3, W - 2, 1);
  },
  caldero(P, W, H, k) {
    const big = W >= 32, cx = W / 2, f = k.f;
    if (big) { // trébede, fuego grande y caldero de la Vella
      P(STONE[2], 3, H - 7, W - 6, 5); for (let i = 4; i < W - 4; i += 4) { P(STONE[3], i, H - 7, 3, 3); P(STONE[5], i, H - 7, 2, 1); }
      P('#140c18', 8, H - 9, W - 16, 4); fire(P, 9, H - 6, W - 18, 7, f);
      P(IRONR[1], 4, -6, 1, H - 2); P(IRONR[1], W - 5, -6, 1, H - 2); P(IRONR[1], 4, -6, W - 8, 1); P(IRONR[2], cx - 1, -5, 1, 5);
      k.E(cx, 8, 10, 7, IRONR[1]); k.E(cx, 7, 10, 7, IRONR[2]); k.E(cx - 3, 5, 3, 3, IRONR[3]);
      k.E(cx, 2, 8, 3, '#2a7a3a'); k.E(cx, 2, 7, 2, '#3a9a4a');
      for (let b = 0; b < 4; b++) { const bx = Math.round(cx - 6 + ((b * 5 + f * 3) % 13)), by = 1 + ((b + f) % 3); P(b % 2 ? '#8ae89a' : '#c8f8d0', bx, by, 1, 1); }
      P(IRONR[3], cx - 10, 7, 1, 2); P(IRONR[3], cx + 9, 7, 1, 2);
      return;
    }
    P(STONE[2], 2, H - 5, 12, 4); P(STONE[3], 2, H - 5, 3, 2); P(STONE[3], 7, H - 5, 3, 2); P(STONE[3], 12, H - 5, 2, 2); P(STONE[5], 2, H - 5, 2, 1);
    P('#140c18', 5, H - 6, 6, 3); fire(P, 5, H - 4, 6, 3, f);
    k.E(8, 8, 6, 5, IRONR[1]); k.E(8, 7, 6, 5, IRONR[2]); P(IRONR[3], 3, 6, 2, 3);
    k.E(8, 4, 5, 2, '#2a7a3a'); P('#3a9a4a', 5, 3, 6, 2);
    const bx = 5 + ((f * 2) % 6); P(f % 2 ? '#8ae89a' : '#c8f8d0', bx, 3, 1, 1); P('#5ac86a', 5 + ((f * 5 + 3) % 6), 4, 1, 1);
    P(IRONR[0], 2, 3, 1, 3); P(IRONR[0], 13, 3, 1, 3);
  },
  estante(P, W, H, k) {
    const wd = DARK, top = -UP + 1, bot = H - 1, g = k.o.goods;
    P(wd[1], 1, top, W - 2, bot - top); P(wd[2], 3, top + 2, W - 6, bot - top - 2);
    P(wd[3], 1, top, 2, bot - top); P(wd[3], W - 3, top, 2, bot - top); P(wd[4], 1, top, 1, bot - top); P(wd[1], W - 2, top, 1, bot - top);
    P(wd[5], 1, top, W - 2, 1); P(wd[4], 1, top + 1, W - 2, 1);
    let n = 0;
    for (let y = top + 9; y < bot - 1; y += 9, n++) { shelfGoods(P, 3, y - 7, W - 6, 7, g, k.v + n, k); P(wd[4], 3, y, W - 6, 1); P(wd[1], 3, y + 1, W - 6, 1); }
    P(wd[3], 1, bot - 2, W - 2, 1);
  },
  mostrador(P, W, H, k) {
    const wd = WOOD;
    P(wd[4], 1, 0, W - 2, 5); P(wd[6], 1, 0, W - 2, 1); P(wd[3], 1, 4, W - 2, 1);
    P(wd[2], 1, 5, W - 2, H - 6);
    for (let x = 3; x < W - 6; x += 9) { P(wd[3], x, 7, 7, H - 10); P(wd[4], x, 7, 7, 1); P(wd[1], x, H - 4, 7, 1); P(wd[1], x + 6, 7, 1, H - 10); }
    P(wd[1], 1, H - 2, W - 2, 1);
    // balanza, libro de cuentas y género
    const sx = W - 12; P(GOLD[2], sx + 4, -5, 1, 6); P(GOLD[3], sx, -5, 9, 1); P(GOLD[4], sx, -4, 3, 1); P(GOLD[4], sx + 6, -4, 3, 1); P(GOLD[2], sx, -3, 3, 1); P(GOLD[2], sx + 6, -3, 3, 1); P(GOLD[3], sx + 3, 0, 3, 1);
    P('#f2ead6', 4, -1, 7, 3); P('#8a3a2a', 4, 1, 7, 1); P('#c8bca8', 7, -1, 1, 2);
    if (W > 48) { P('#c8843a', 16, -2, 5, 3); P('#e8b060', 17, -2, 3, 1); P('#6aa04a', 24, -2, 3, 3); P('#e84a4a', 28, -1, 2, 2); }
  },
  barra(P, W, H, k) {
    const wd = DARK;
    P(wd[4], 1, 0, W - 2, 5); P(wd[6], 1, 0, W - 2, 1); P(wd[2], 1, 4, W - 2, 1);
    P(wd[2], 1, 5, W - 2, H - 6); for (let x = 2; x < W - 2; x += 4) P(wd[1], x, 6, 1, H - 8); P(wd[3], 1, 5, W - 2, 1);
    P(GOLD[2], 1, H - 4, W - 2, 1); P(wd[1], 1, H - 2, W - 2, 1);
    for (let x = 6, n = 0; x < W - 8; x += 11, n++) {
      if (n % 3 === 1) { P('#c8dce8', x, -4, 3, 4); P('#8a1a2a', x, -2, 3, 2); P('#e8f4fc', x, -4, 1, 2); P('#c8dce8', x + 3, -3, 2, 1); P('#c8dce8', x + 1, -6, 1, 2); } // porrón
      else { P('#a87a4a', x, -3, 4, 4); P('#f2ecd8', x, -4, 4, 2); P('#ffffff', x, -4, 2, 1); P('#7a5230', x + 4, -2, 1, 2); } // jarras
    }
    P('#3a6a3a', W - 9, -7, 2, 7); P('#5a9a5a', W - 9, -7, 1, 3); P('#c8a060', W - 9, -8, 2, 1);
  },
  barriles(P, W, H, k) {
    const wd = WOOD;
    P(DARK[2], 1, H - 4, W - 2, 3); P(DARK[4], 1, H - 4, W - 2, 1);
    for (let bx = 0; bx < W; bx += 16) {
      const cx = bx + 8, cy = 6;
      k.E(cx, cy, 7, 7, wd[2]); k.E(cx, cy, 6, 6, wd[3]); k.E(cx - 1, cy - 1, 4, 4, wd[4]);
      for (let i = -5; i <= 5; i += 2) P(wd[2], cx + i, cy - 5 + Math.abs(i) * 0.2, 1, 11 - Math.abs(i) * 0.4);
      k.E(cx, cy, 2, 2, wd[3]); P(IRONR[2], cx - 7, cy - 1, 1, 3); P(IRONR[2], cx + 6, cy - 1, 1, 3);
      P(GOLD[3], cx, cy + 3, 2, 2); P(GOLD[5], cx, cy + 3, 1, 1); P(GOLD[2], cx + 1, cy + 5, 1, 1);
    }
  },
  altar(P, W, H, k) {
    const st = WSTONE;
    P(st[3], 1, 3, W - 2, H - 4); P(st[1], 1, H - 2, W - 2, 1);
    P('#f4f0e6', 1, 1, W - 2, 3); P('#ffffff', 1, 1, W - 2, 1); P('#cfc8b8', 1, 3, W - 2, 1);
    P('#a82a2c', 3, 4, W - 6, H - 7); P('#c8403c', 3, 4, W - 6, 1); P(GOLD[4], 3, 4, 1, H - 7); P(GOLD[4], W - 4, 4, 1, H - 7); P(GOLD[4], 3, H - 4, W - 6, 1);
    const cx = Math.round(W / 2); P(GOLD[4], cx - 1, 6, 2, 6); P(GOLD[4], cx - 3, 8, 6, 2);
    // relicario y cruz de oro
    P(GOLD[2], cx - 3, -3, 6, 4); P(GOLD[4], cx - 3, -3, 6, 1); P(GOLD[3], cx - 1, -11, 2, 8); P(GOLD[3], cx - 3, -9, 6, 2); P(GOLD[6], cx - 1, -11, 1, 3); P('#c8302c', cx - 1, -2, 2, 2);
    // misal abierto
    P('#f2ead6', cx + 6, -1, 7, 2); P('#c8bca8', cx + 9, -1, 1, 2); P('#8a2a2a', cx + 6, 1, 7, 1);
    // candeleros
    for (const x of [5, W - 6]) { P(GOLD[3], x - 1, 0, 3, 1); P(GOLD[4], x, -5, 1, 5); P('#f2ecdc', x, -8, 1, 3); flame(k, x, -11, x & 3); }
  },
  cruz(P, W, H, k) {
    if (k.o.severe) {
      P(DARK[2], 7, -6, 2, 20); P(DARK[2], 3, -2, 10, 2); P(DARK[4], 7, -6, 1, 20); P(DARK[4], 3, -2, 10, 1);
      P('#d8ccb8', 7, -1, 2, 7); P('#d8ccb8', 5, -1, 6, 1); P('#e8dcc8', 7, -3, 2, 2); P('#8a2a2a', 7, -4, 2, 1);
    } else {
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; P(GOLD[5], Math.round(8 + Math.cos(a) * 7), Math.round(-1 + Math.sin(a) * 7), 1, 1); }
      P(GOLD[3], 7, -7, 2, 20); P(GOLD[3], 3, -3, 10, 2); P(GOLD[5], 7, -7, 1, 20); P(GOLD[5], 3, -3, 10, 1); P('#c8302c', 7, -3, 2, 2);
    }
  },
  banco(P, W, H, k) {
    const wd = DARK;
    P(wd[3], 1, -4, W - 2, 3); P(wd[5], 1, -4, W - 2, 1); P(wd[1], 1, -1, W - 2, 1); P(wd[2], 3, 0, W - 6, 2);
    P(wd[4], 1, 3, W - 2, 4); P(wd[6], 1, 3, W - 2, 1); P(wd[2], 1, 7, W - 2, 2);
    for (let i = 8; i < W - 6; i += 12) P(wd[3], i, 3, 1, 4);
    for (const x of [1, W - 4]) { P(wd[3], x, -6, 3, H - 1); P(wd[5], x, -6, 1, H - 1); P(wd[1], x + 2, -6, 1, H - 1); P(wd[5], x, -7, 2, 1); }
    P(wd[1], 4, 11, W - 8, 2); P(wd[3], 4, 11, W - 8, 1); // reclinatorio
  },
  vela(P, W, H, k) {
    P(IRONR[1], 4, H - 3, 8, 2); P(IRONR[3], 4, H - 3, 8, 1); P(IRONR[2], 7, -2, 2, H - 2); P(IRONR[3], 7, -2, 1, H - 2);
    P(IRONR[2], 2, -2, 12, 1); P(IRONR[3], 2, -2, 12, 1);
    for (const [x, t] of [[3, -7], [7, -9], [12, -7]]) { P('#f2ecdc', x, t, 1, -2 - t); P('#ffffff', x, t, 1, 1); P('#d8d0bc', x + (x > 7 ? -1 : 1), t + 2, 1, 2); flame(k, x, t - 3, x); }
    P('#e8e0cc', 6, 2, 1, 2); // cera derretida
  },
  pila(P, W, H, k) {
    const st = STONE, f = k.f;
    P(st[3], 6, 8, 4, H - 10); P(st[5], 6, 8, 1, H - 10); P(st[1], 9, 8, 1, H - 10);
    P(st[3], 4, H - 3, 8, 2); P(st[5], 4, H - 3, 8, 1);
    k.E(8, 4, 7, 4, st[2]); k.E(8, 3, 7, 4, st[4]); for (let i = 0; i < 7; i++) P(st[2], 2 + i * 2, 5, 1, 2);
    k.E(8, 3, 5, 2, '#3a7ab8'); P('#5aa0d8', 4, 2, 8, 1); P(f % 3 ? '#c8ecfc' : '#ffffff', 5 + (f % 4), 2, 2, 1); P('#8ac8f0', 9 - (f % 3), 4, 1, 1);
  },
  claustro(P, W, H, k) {
    const f = k.f;
    P('#2e6a3a', 1, 1, W - 2, H - 2); P('#3e8a44', 1, 1, W - 2, 1); for (let i = 0; i < 9; i++) P('#4a9a4e', 1 + Math.floor(hash(i, 1, 7) * 13), 2 + Math.floor(hash(i, 2, 7) * 11), 1, 1);
    P('#7a5a3a', 1, 1, 1, H - 2); P('#7a5a3a', 1, 1, W - 2, 1); // bordillo
    // oca blanca (balancea la cabeza)
    const hb = f % 3 === 0 ? 1 : 0;
    P('#f4f0e6', 4, 7, 7, 4); P('#ffffff', 4, 7, 5, 1); P('#d8d0c0', 5, 10, 6, 1); P('#e8e2d4', 10, 8, 2, 2);
    P('#f4f0e6', 4, 4 + hb, 2, 4 - hb); P('#f4f0e6', 3, 3 + hb, 3, 2); P(INK, 4, 3 + hb, 1, 1); P('#f0a030', 2, 4 + hb, 1, 1);
    P('#f0a030', 6, 11, 1, 2); P('#f0a030', 8, 11, 1, 2);
    P('#3a8ac8', 12, 4, 2, 2); P('#8ac8f0', 12, 4, 1, 1); // charquito
  },
  trono(P, W, H, k) {
    const g = GOLD, vel = ramp('#9a1a2a');
    P(g[3], 2, -12, 12, 20); P(g[5], 2, -12, 1, 20); P(g[1], 13, -12, 1, 20);
    P(g[4], 6, -14, 4, 2); P(g[5], 7, -15, 2, 1); P('#c8302c', 7, -13, 2, 1);
    P(vel[3], 4, -10, 8, 15); P(vel[5], 4, -10, 1, 15); P(vel[1], 11, -10, 1, 15); for (let j = -8; j < 4; j += 4) P(vel[2], 7, j, 2, 1);
    P(g[3], 1, 4, 14, 5); P(g[5], 1, 4, 14, 1); P(vel[4], 3, 5, 10, 3); P(g[1], 1, 8, 14, 1);
    P(g[2], 2, 9, 2, H - 10); P(g[2], 12, 9, 2, H - 10); P(g[4], 2, 9, 1, H - 10);
    P(vel[1], 3, 9, 10, 1);
  },
  trono2(P, W, H, k) {
    const g = GOLD, vel = ramp('#2a3a8a');
    P(g[3], 3, -8, 10, 16); P(g[5], 3, -8, 1, 16); P(g[1], 12, -8, 1, 16); P(g[4], 6, -10, 4, 2); P(g[6], 7, -11, 2, 1);
    P(vel[3], 5, -6, 6, 11); P(vel[5], 5, -6, 1, 11); P(vel[1], 10, -6, 1, 11);
    P(g[3], 2, 4, 12, 5); P(g[5], 2, 4, 12, 1); P(vel[4], 4, 5, 8, 3); P(g[1], 2, 8, 12, 1);
    P(g[2], 3, 9, 2, H - 10); P(g[2], 11, 9, 2, H - 10);
  },
  tapiz(P, W, H, k) {
    // varal con remates, paño de oro con las cuatro barras de Guifré y flecos
    P(IRONR[1], 0, -1, W, 2); P(GOLD[5], 0, -2, 2, 3); P(GOLD[5], W - 2, -2, 2, 3); P(IRONR[3], 2, -1, W - 4, 1);
    const g = GOLD, x0 = 2, x1 = W - 2, y0 = 1, y1 = H - 4;
    P('#7a1a22', x0, y0, x1 - x0, y1 - y0);
    P(g[4], x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
    const bw = (x1 - x0 - 4) / 9;
    for (let i = 0; i < 4; i++) { const bx = Math.round(x0 + 2 + bw * (1 + i * 2)); P('#b8242c', bx, y0 + 2, Math.max(2, Math.round(bw)), y1 - y0 - 4); }
    for (let i = x0 + 2; i < x1 - 2; i += 4) { P(mix(g[4], g[1], 0.35), i + 3, y0 + 2, 1, y1 - y0 - 4); } // pliegues
    P(g[6], x0 + 2, y0 + 2, x1 - x0 - 4, 1);
    for (let i = x0; i < x1; i += 2) { P(g[3], i, y1, 1, 3); P(g[5], i, y1, 1, 1); }
  },
  columna(P, W, H, k) {
    const st = WSTONE;
    P(st[4], 2, -12, 12, 3); P(st[6], 2, -12, 12, 1); P(st[2], 3, -9, 10, 2); // capitel
    P(st[3], 4, -7, 8, H + 4); P(st[5], 4, -7, 2, H + 4); P(st[4], 6, -7, 1, H + 4); P(st[1], 11, -7, 1, H + 4);
    for (let i = 7; i < 11; i += 2) P(st[2], i, -6, 1, H + 2);
    P(st[4], 2, H - 4, 12, 3); P(st[6], 2, H - 4, 12, 1); P(st[1], 2, H - 2, 12, 1); // basa
  },
  armero(P, W, H, k) {
    const wd = DARK;
    P(wd[3], 1, 4, W - 2, 3); P(wd[5], 1, 4, W - 2, 1); P(wd[3], 1, 11, W - 2, 3); P(wd[5], 1, 11, W - 2, 1);
    P(wd[2], 2, 0, 2, H - 1); P(wd[2], W - 4, 0, 2, H - 1);
    for (let x = 6, n = 0; x < W - 6; x += 5, n++) {
      if (n % 3 === 2) { P(IRONR[3], x, -6, 1, 16); P(IRONR[4], x, -6, 1, 3); P('#6a4428', x - 1, 7, 3, 2); P(GOLD[3], x - 1, 9, 3, 1); } // espada
      else { P('#7a5434', x, -4, 1, H + 2); P(IRONR[3], x - 1, -8, 3, 4); P(IRONR[4], x, -10, 1, 2); } // lanza
    }
    const sx = W - 13; P(ramp('#2a4a8a')[3], sx, 0, 9, 11); P(ramp('#2a4a8a')[5], sx, 0, 9, 1); P('#f0c040', sx + 4, 1, 1, 9); P('#f0c040', sx + 1, 4, 7, 1); P(IRONR[4], sx + 4, 4, 1, 1); // escudo
  },
  yunque(P, W, H, k) {
    const wd = WOOD;
    P(wd[2], 4, 8, 8, H - 9); P(wd[4], 4, 8, 2, H - 9); P(wd[1], 11, 8, 1, H - 9); P(wd[5], 4, 8, 8, 1);
    P(IRONR[2], 2, 3, 12, 4); P(IRONR[4], 2, 3, 12, 1); P(IRONR[1], 2, 6, 12, 1); P(IRONR[2], 0, 3, 2, 2); P(IRONR[2], 5, 7, 6, 2);
    P(wd[3], 9, 1, 5, 1); P(IRONR[3], 13, 0, 2, 3); // martillo
  },
  fragua(P, W, H, k) {
    const st = ramp('#8a7a6a'), f = k.f;
    P(st[3], 3, -12, W - 6, 10); P(st[5], 3, -12, 1, 10); P(st[1], W - 4, -12, 1, 10); P(st[2], 1, -2, W - 2, 2); P(st[4], 1, -2, W - 2, 1);
    P(st[3], 1, 0, W - 2, H - 1); P(st[5], 1, 0, 1, H - 1);
    P('#1a1018', 4, 2, W - 8, 6);
    for (let i = 0; i < W - 8; i++) { const hot = (i + f) % 3; P(hot === 0 ? '#ffe070' : hot === 1 ? '#f8902a' : '#d8401e', 4 + i, 5 + ((i + f) % 2), 1, 3 - ((i + f) % 2)); }
    P('#ffe8a0', 4 + ((f * 3) % (W - 8)), 4, 1, 1);
    for (let j = 9; j < H - 2; j += 4) P(st[2], 2, j, W - 4, 1);
    P('#6a4428', W - 7, 9, 6, 5); P('#8a5c34', W - 7, 9, 6, 1); P(IRONR[2], W - 8, 11, 1, 1); // fuelle
  },
  arcon(P, W, H, k) {
    const wd = WOOD;
    P(wd[3], 1, 4, 14, 10); P(wd[2], 1, 9, 14, 5); P(wd[5], 1, 4, 14, 1); P(wd[4], 2, 2, 12, 2); P(wd[5], 2, 2, 12, 1); P(wd[1], 1, 8, 14, 1);
    P(IRONR[2], 3, 2, 1, 12); P(IRONR[2], 12, 2, 1, 12); P(IRONR[3], 3, 2, 1, 1); P(IRONR[3], 12, 2, 1, 1);
    P(GOLD[3], 7, 8, 2, 3); P(GOLD[5], 7, 8, 1, 1); P(INK, 8, 10, 1, 1); P(wd[1], 1, 13, 14, 1);
  },
  casco(P, W, H, k) {
    // galera a medio construir vista de costado: picaderos, quilla, cuadernas curvas, tracas bajas, roda y codaste
    const wd = WOOD, dk = DARK, x0 = 6, x1 = W - 8, base = H - 7;
    for (let i = 8; i < W - 8; i += 14) { P(dk[2], i, H - 6, 8, 5); P(dk[4], i, H - 6, 8, 1); P(dk[1], i, H - 2, 8, 1); }
    const sheer = (x) => { const t = (x - x0) / (x1 - x0); return Math.round(base - 22 - 8 * Math.pow(Math.max(0, t - 0.7) / 0.3, 2) - 3 * Math.pow(Math.max(0, 0.2 - t) / 0.2, 2)); };
    const hullBot = (x) => { const t = (x - x0) / (x1 - x0); return Math.round(base - 9 * Math.pow(Math.abs(t - 0.45) / 0.55, 3)); };
    // tracas inferiores ya clavadas
    for (let x = x0 + 2; x < x1 - 1; x++) { const b0 = hullBot(x), top = b0 - 10; P(wd[3], x, top, 1, b0 - top); for (let j = top + 2; j < b0; j += 3) P(wd[2], x, j, 1, 1); P(wd[5], x, top, 1, 1); P(dk[1], x, b0, 1, 1); }
    // cuadernas que asoman por encima
    for (let x = x0 + 4; x < x1 - 2; x += 5) { const top = sheer(x), b0 = hullBot(x) - 10; if (b0 <= top) continue; P(wd[4], x, top, 2, b0 - top); P(wd[6], x, top, 1, b0 - top); P(dk[1], x + 2, top + 1, 1, b0 - top - 1); P(wd[2], x - 1, top, 1, 1); }
    // regala provisional (vagra) uniendo las cuadernas
    for (let x = x0 + 4; x < x1 - 2; x++) P(wd[3], x, sheer(x) + 3, 1, 1);
    // quilla, roda curva y codaste
    P(dk[3], x0, base, x1 - x0, 2); P(dk[5], x0, base, x1 - x0, 1);
    for (let j = 0; j < 30; j++) { const xx = Math.round(x1 - 2 + Math.pow(j / 30, 2) * 6); P(wd[3], xx, base - j, 2, 1); P(wd[5], xx, base - j, 1, 1); }
    P(wd[3], x0 - 1, base - 26, 2, 26); P(wd[5], x0 - 1, base - 26, 1, 26);
    // escalera y puntales
    for (let j = base - 24; j < base - 2; j += 3) P('#9a7a5a', 2, j, 3, 1); P('#7a5a3a', 1, base - 26, 1, 25); P('#7a5a3a', 5, base - 26, 1, 25);
    for (const x of [30, 70]) { P(dk[2], x, base - 18, 1, 18); P(dk[2], x - 6, base - 1, 13, 1); }
    P('#c8302c', 40, hullBot(40) - 6, 18, 1); // franja de almagre
  },
  madera(P, W, H, k) {
    const wd = WOOD;
    for (let j = 0; j < 4; j++) { const y = H - 6 - j * 5; P(wd[3], 1 + j, y, W - 2 - j * 2, 4); P(wd[5], 1 + j, y, W - 2 - j * 2, 1); P(wd[1], 1 + j, y + 3, W - 2 - j * 2, 1); P(wd[6], W - 3 - j, y, 1, 4); for (let i = 5 + j * 3; i < W - 4; i += 9) P(wd[2], i, y + 1, 3, 1); }
    for (let i = 0; i < 3; i++) { const x = 3 + i * 9; k.E(x + 3, H - 30 + (i % 2) * 2, 3, 3, wd[2]); k.E(x + 3, H - 30 + (i % 2) * 2, 2, 2, wd[5]); P(wd[3], x + 3, H - 30 + (i % 2) * 2, 1, 1); }
  },
  huesos(P, W, H, k) {
    const b = ramp('#e8dfc8');
    P(b[3], 3, 9, 9, 2); P(b[5], 3, 9, 9, 1); P(b[3], 2, 8, 2, 4); P(b[3], 11, 8, 2, 4);
    P(b[3], 6, 4, 2, 6); P(b[2], 5, 3, 4, 2);
    P(b[3], 9, 11, 5, 4); P(b[5], 9, 11, 5, 1); P(INK, 10, 12, 1, 1); P(INK, 12, 12, 1, 1); P(b[1], 10, 14, 3, 1); // calavera
  },
  def(P, W, H, k) { const wd = WOOD; P(wd[3], 1, 2, W - 2, H - 3); P(wd[5], 1, 2, W - 2, 1); P(wd[1], 1, H - 2, W - 2, 1); P(wd[2], 1, Math.round(H / 2), W - 2, 1); },
};

// Cosas sobre la mesa (según tamaño y variante)
function onTable(P, W, H, top, th, k) {
  const v = k.v;
  if (W >= 80) { // mesa del Consejo: pliegos, tintero, pluma, sellos y candelabros
    for (let i = 6; i < W - 10; i += 14) { P('#f2ead6', i, top + 2, 8, 6); P('#d8ccb4', i, top + 7, 8, 1); P('#8a7a6a', i + 1, top + 3, 5, 1); P('#8a7a6a', i + 1, top + 5, 6, 1); P('#b8302c', i + 6, top + 6, 2, 2); }
    P('#2a2234', 44, top + 3, 3, 3); P('#f2ead6', 46, top - 3, 1, 6); P('#ffffff', 47, top - 4, 1, 3);
    for (const x of [3, W - 5]) { P(GOLD[3], x - 1, top + 6, 3, 1); P(GOLD[4], x, top + 1, 1, 5); P('#f2ecdc', x, top - 2, 1, 3); flame(k, x, top - 5, x); }
    return;
  }
  if (H > 16) { // banquete del castillo
    k.E(W / 2, top + 7, 7, 4, '#d8d0c4'); k.E(W / 2, top + 6, 5, 3, '#b8743a'); P('#d89a5a', W / 2 - 3, top + 5, 4, 1); P('#f2ead6', W / 2 + 4, top + 4, 1, 2);
    P(GOLD[3], 4, top + 3, 3, 4); P(GOLD[5], 4, top + 3, 1, 3); P(GOLD[3], W - 7, top + 3, 3, 4); P('#8a1a2a', W - 7, top + 3, 3, 1);
    P('#c8302c', 6, top + 12, 3, 3); P('#e8c040', 9, top + 13, 2, 2); P('#6aa04a', 8, top + 11, 2, 2);
    return;
  }
  const opts = [
    () => { P('#c8843a', 3, top + 2, 6, 4); P('#e8b060', 4, top + 2, 4, 1); P('#8a5424', 3, top + 5, 6, 1); P('#b8603a', W - 8, top + 1, 4, 5); P('#d88858', W - 8, top + 1, 1, 4); P('#f2ecd8', W - 13, top + 3, 3, 3); },
    () => { k.E(8, top + 4, 4, 2, '#e8dcc0'); P('#c86a3a', 6, top + 3, 4, 2); P('#a87a4a', W - 9, top + 2, 3, 4); P('#f2ecd8', W - 9, top + 2, 3, 1); P('#a87a4a', W - 14, top + 3, 3, 3); },
    () => { P('#f2ecdc', W - 7, top - 2, 1, 5); flame(k, W - 7, top - 5, 2); P(IRONR[2], W - 8, top + 3, 3, 1); P('#e84a4a', 4, top + 3, 2, 2); P('#f0c040', 7, top + 4, 2, 2); P('#6aa04a', 5, top + 5, 2, 2); },
    () => { P('#f2ead6', 3, top + 2, 7, 4); P('#8a7a6a', 4, top + 3, 5, 1); P('#8a3a2a', W - 10, top + 2, 6, 4); P('#b84a3a', W - 10, top + 2, 6, 1); P('#c8a040', W - 4, top + 3, 1, 3); },
  ];
  opts[v % opts.length]();
  if (W >= 48) { P('#c8dce8', W / 2, top + 1, 2, 5); P('#5a9a4a', W / 2, top + 3, 2, 3); P('#e8f4fc', W / 2, top + 1, 1, 2); P('#f2ead6', W / 2 + 6, top + 2, 6, 4); P('#3a3048', W / 2 + 7, top + 3, 1, 1); P('#3a3048', W / 2 + 9, top + 4, 2, 1); }
}

// Género de las baldas según la tienda
function shelfGoods(P, x, y, w, h, g, n, k) {
  const b = y + h; // base (balda)
  const colsBook = ['#8a3a2a', '#3a5a8a', '#c8a040', '#4a7a4a', '#7a4a7a', '#a86a3a', '#2a4a5a'];
  const mode = g === 't_libros' ? 'books' : g === 't_alquimia' ? 'jars' : g === 't_hierbas' ? (n % 2 ? 'herbs' : 'jars') : g === 't_sastre' ? 'cloth' : g === 't_pan' ? 'bread' : g === 't_velas' ? 'candles' : g === 't_ceramica' ? 'pots' : g === 't_pesca' ? 'fish' : g === 't_forja' ? 'tools' : ['home', 'pots', 'books', 'home'][n % 4];
  let i = x;
  while (i < x + w - 1) {
    const r = hash(i, n, 13);
    switch (mode) {
      case 'books': { const bh = 4 + Math.floor(r * 3), c = colsBook[Math.floor(r * 7)]; if (r > 0.9 && i < x + w - 4) { P(c, i, b - 3, 4, 2); P(ramp(c)[5], i, b - 3, 4, 1); i += 4; break; } P(c, i, b - bh, 2, bh); P(ramp(c)[5], i, b - bh, 2, 1); P(ramp(c)[1], i + 1, b - bh + 1, 1, bh - 1); i += 2; break; }
      case 'jars': { const c = ['#4ac06a', '#c84a8a', '#4a8ac8', '#e8c040', '#c86a3a'][Math.floor(r * 5)]; P('#c8d8e4', i, b - 6, 3, 1); P('#8a6a4a', i + 1, b - 7, 1, 1); P(c, i, b - 5, 3, 5); P(ramp(c)[5], i, b - 5, 1, 3); P('#e8f4fc', i, b - 5, 1, 1); i += 4; break; }
      case 'herbs': { P('#7a5a3a', i, b - 7, 3, 1); P('#3a7a3a', i, b - 6, 3, 4); P('#6aaa4a', i, b - 6, 1, 2); P(r > 0.5 ? '#a86ac8' : '#e8c040', i + 1, b - 3, 1, 1); i += 4; break; }
      case 'cloth': { const c = ['#c84a6a', '#4a6ac8', '#e8c040', '#4a9a6a', '#e8e0d0', '#7a3a5a'][Math.floor(r * 6)], cc = ramp(c); for (let j = 0; j < 3; j++) { P(cc[3 + (j & 1)], i, b - 2 - j * 2, 5, 2); P(cc[1], i, b - 1 - j * 2, 5, 1); } i += 6; break; }
      case 'bread': { P('#c8843a', i, b - 3, 4, 3); P('#e8b060', i + 1, b - 3, 2, 1); P('#8a5424', i, b - 1, 4, 1); i += 5; break; }
      case 'candles': { for (let j = 0; j < 3; j++) { P('#f0e8d4', i + j, b - 5 - (j & 1), 1, 5 + (j & 1)); P('#ffffff', i + j, b - 5 - (j & 1), 1, 1); } P('#c8a060', i, b - 3, 3, 1); i += 4; break; }
      case 'pots': { const c = r > 0.5 ? '#b8603a' : '#c88a4a'; P(c, i, b - 5, 4, 5); P(ramp(c)[5], i, b - 5, 1, 4); P(ramp(c)[1], i, b - 6, 4, 1); if (r > 0.7) P('#3a5aa8', i, b - 3, 4, 1); i += 5; break; }
      case 'fish': { P('#9ab8c8', i, b - 4, 5, 2); P('#d0e4ec', i, b - 4, 4, 1); P('#6a8a9a', i + 5, b - 5, 1, 4); P(INK, i + 1, b - 4, 1, 1); i += 7; break; }
      case 'tools': { // martillos, herraduras, tenazas y cuchillas
        const m = Math.floor(r * 4);
        if (m === 0) { P(IRONR[3], i, b - 6, 4, 2); P(IRONR[4], i, b - 6, 4, 1); P('#8a5a34', i + 1, b - 4, 1, 4); i += 5; }
        else if (m === 1) { P(IRONR[3], i, b - 4, 1, 4); P(IRONR[3], i + 3, b - 4, 1, 4); P(IRONR[3], i + 1, b - 1, 2, 1); P(IRONR[4], i, b - 4, 1, 1); i += 5; }
        else if (m === 2) { P(IRONR[2], i, b - 6, 1, 6); P(IRONR[2], i + 2, b - 6, 1, 6); P(IRONR[3], i + 1, b - 3, 1, 1); P(IRONR[4], i, b - 6, 1, 1); i += 4; }
        else { P('#c4ccd8', i, b - 6, 1, 4); P('#eef2f8', i, b - 6, 1, 1); P('#6a4428', i, b - 2, 1, 2); i += 3; }
        break;
      }
      default: { // casa: platos de pie, cántaros, cuencos, una cajita y el rosario
        if (r < 0.28) { P('#e8dcc0', i, b - 5, 5, 5); P('#f8f0dc', i + 1, b - 5, 3, 1); P('#3a5aa8', i + 1, b - 3, 3, 1); P('#c8b898', i + 4, b - 4, 1, 4); i += 6; }
        else if (r < 0.5) { P('#b8603a', i + 1, b - 6, 2, 1); P('#b8603a', i, b - 5, 4, 5); P('#d88858', i, b - 5, 1, 4); P('#8a3a2a', i + 3, b - 4, 1, 4); i += 5; }
        else if (r < 0.66) { P('#e8dcc0', i, b - 2, 5, 2); P('#f8f0dc', i, b - 2, 5, 1); P('#c8b898', i + 1, b - 3, 3, 1); i += 6; }
        else if (r < 0.78) { P('#8a5a34', i, b - 3, 5, 3); P('#b07a48', i, b - 3, 5, 1); P('#e8c050', i + 2, b - 2, 1, 1); i += 6; }
        else if (r < 0.88) { P('#c8dce8', i, b - 6, 2, 6); P('#5a8a4a', i, b - 4, 2, 4); P('#e8f4fc', i, b - 6, 1, 2); i += 4; }
        else i += 3;
      }
    }
  }
}
