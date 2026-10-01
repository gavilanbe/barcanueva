// Sprites de animales pintados en código: 16×16 para el mundo (andar, reposo, vuelo y sueño) y
// 48×48 / 64×64 para el combate. Los volúmenes son elipsoides y cápsulas iluminados desde arriba a la
// izquierda y posterizados sobre rampas de tono desplazado; el contorno selectivo se aplica al final.
import { canvas } from './util.js';
import { SP } from './eco.js';
import { INK, ramp, mix, outlineSel, rgb } from './pal.js';
import { hash } from './px.js';

export const ANIMAL_POSES = { walk: 4, idle: 2, fly: 2, sleep: 1 };
const FLY_PLANS = new Set(['pajaro', 'rapaz', 'zancuda', 'pato', 'ave_suelo', 'enjambre']);
const cache = new Map();
const EYE = '#1e1420', GLINT = '#fff8ec', HOOF = '#2a1c22';

// ───────────── Colores por especie (amplían SP.col) ─────────────
const COL = {
  conejo: { c: '#a8865e', b: '#ece2cc', ear: '#d89c94' },
  liebre: { c: '#b08a58', b: '#e4d4b4', tip: '#2a2024', ear: '#c89a80' },
  perdiz: { c: '#9c8a74', b: '#c4b4a0', red: '#cc3a2a', face: '#eadcc4', bar: '#a85a3a', mask: '#2a2024' },
  jabali: { c: '#5e4c3e', b: '#43362c', snout: '#9a7a6a', tusk: '#f2ead6', stripe: '#d8b888' },
  corzo: { c: '#b8744a', b: '#ecdcc4', rump: '#f8f2e6', nose: '#2a2024', ant: '#dccca4' },
  ciervo: { c: '#8e5a36', b: '#dcc09c', ant: '#e4d4ae', mane: '#5e3a26', rump: '#ecdcc0' },
  cabra_montes: { c: '#9e7c5a', b: '#dccaa8', dark: '#4a3a2e', horn: '#8a7a64' },
  ardilla: { c: '#c8582a', b: '#f4dcbc', dark: '#8a3a1e' },
  raton_campo: { c: '#8a7656', b: '#dccaa8', ear: '#e0a0a0', tail: '#c8a09a' },
  rata: { c: '#4e464c', b: '#7e747c', ear: '#c09090', tail: '#a88c8c' },
  gorrion: { c: '#8e6640', b: '#dccab0', cap: '#80808a', bib: '#2a2024', streak: '#4a3020', beak: '#4a3a30', cheek: '#e8e0d4' },
  paloma: { c: '#8c8ca6', b: '#b8b8cc', neck: '#4aa088', neck2: '#9a6aaa', bar: '#3a3a4a', beak: '#3a3438', feet: '#d86a6a', cere: '#ece8f0' },
  gaviota: { c: '#f2f2f0', b: '#9aaab8', tip: '#24242c', beak: '#f2c830', spot: '#d83a2a', feet: '#e8c050' },
  pota_blava: { c: '#42424e', b: '#666676', comb: '#d83a3a', legs: '#4a7ad0', sheen: '#3e7070' },
  gato: { c: '#7e6c58', b: '#ece0d0', stripe: '#4a3a30', eye: '#c8d040', nose: '#d89a94' },
  zorro: { c: '#d8742e', b: '#f4ece0', sock: '#2a1c1e', tip: '#fbf6ee' },
  lobo: { c: '#807874', b: '#d4ccc4', dark: '#4a4440', eye: '#e8c040' },
  lince: { c: '#bc9a68', b: '#ecdcbc', spot: '#6a4630', tuft: '#24181a', eye: '#d0c040' },
  oso: { c: '#62442c', b: '#432f20', muzzle: '#a07c58' },
  garduna: { c: '#6a4a3a', b: '#f2eadc' },
  gineta: { c: '#c2b294', b: '#3a3030' },
  tejon: { c: '#8e8c8c', b: '#f0f0ec', face: '#1e1a20' },
  erizo: { c: '#7a6a5a', b: '#d8c8b0', spine: '#5a4636', tips: '#e6d6be', face: '#b0947a' },
  nutria: { c: '#5c4030', b: '#c4ac8c' },
  castor: { c: '#76502e', b: '#a88058', tail: '#3c3436', teeth: '#e8a040' },
  garza: { c: '#a4acb6', b: '#eceef2', crest: '#24242c', beak: '#e4c450', legs: '#9a8a6a' },
  anade: { c: '#a88a68', b: '#6a4a30', head: '#2a7044', breast: '#7e4636', body: '#b8b8b4', ring: '#f4f4f0', spec: '#3a5ad0', beak: '#e8c840', beakf: '#c88a40', feet: '#e89840', rear: '#2a2a30' },
  rana: { c: '#5a9a3a', b: '#d4de8c', spot: '#2e5a2a' },
  galapago: { c: '#5a6a3c', b: '#6e6c4a', stripe: '#e8c840', skin: '#5a5a3c' },
  tortuga: { c: '#8a7a3a', b: '#e0c050', skin: '#a8986a' },
  lagarto: { c: '#5aa03c', b: '#d4d474', ocelli: '#3a7ad6', net: '#24301e' },
  vibora: { c: '#a07c56', b: '#3a281a', belly: '#c8b08a' },
  culebra: { c: '#6e7e4a', b: '#aab46a', belly: '#d4cc94' },
  lechuza: { c: '#dcb878', b: '#faf2e2', face: '#fdf8ee', spot: '#8a7a6a', rim: '#b8885a' },
  cernicalo: { c: '#bc743e', b: '#ecd4b2', head: '#8a9aac', spot: '#3a2a20', beak: '#e8c040' },
  aguila: { c: '#5e3e28', b: '#3c2a1e', nape: '#d4ac62', beak: '#e8c040', hook: '#3a3438' },
  halcon: { c: '#4e5c70', b: '#eee6dc', bar: '#3a3a48', mous: '#1e1e2a', beak: '#e8c040' },
  abeja: { c: '#f0c830', b: '#2a2024', wing: '#e6f4ff' },
  oca: { c: '#f6f6ee', b: '#d6d6ce', beak: '#f0a030', feet: '#f0a030' },
};
function look(sp, cria) {
  const base = COL[sp] || { c: SP[sp]?.col?.[0] || '#8a6a4a', b: SP[sp]?.col?.[1] || '#d8c8a8' };
  const C = {}, R = {};
  for (const k in base) { C[k] = cria ? mix(base[k], '#fff2dc', 0.14) : base[k]; R[k] = ramp(C[k]); }
  return { C, R };
}

// ───────────── Lienzo de trabajo ─────────────
// Coordenadas lógicas con el animal mirando a la derecha; `flip` lo refleja al escribir el píxel pero la luz
// sigue viniendo de arriba a la izquierda de la pantalla. `k` escala alrededor del ancla (crías).
const LX = -0.46, LY = -0.69, LZ = 0.55;
const RGB = new Map(); const rgbOf = (c) => { let v = RGB.get(c); if (!v) { v = rgb(c); RGB.set(c, v); } return v; };
class Art {
  constructor(w, h, flip = false, k = 1, ax = w / 2, ay = h - 1.5) { Object.assign(this, { w, h, flip, k, ax, ay }); this.p = new Array(w * h).fill(null); this.big = w > 16; }
  tx(x) { return this.ax + (x - this.ax) * this.k; }
  ty(y) { return this.ay + (y - this.ay) * this.k; }
  put(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (this.flip) x = this.w - 1 - x; if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; }
  at(x, y) { x = Math.floor(this.tx(x)); y = Math.floor(this.ty(y)); if (this.flip) x = this.w - 1 - x; return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.p[y * this.w + x] : null; }
  px(x, y, c) { this.put(this.tx(x), this.ty(y), c); }
  rect(x, y, w, h, c) { const X = Math.round(this.tx(x)), Y = Math.round(this.ty(y)), W = Math.max(1, Math.round(w * this.k)), H = Math.max(1, Math.round(h * this.k)); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) this.put(X + i, Y + j, c); }
  tone(R, I, o) {
    let k = this.big ? (I > 0.88 ? 5 : I > 0.68 ? 4 : I > 0.14 ? 3 : I > -0.36 ? 2 : 1) : (I > 0.8 ? 5 : I > 0.56 ? 4 : I > 0.08 ? 3 : I > -0.42 ? 2 : 1);
    k += o.d || 0; return R[Math.max(o.lo ?? 1, Math.min(o.hi ?? 5, k))];
  }
  shade(x, y, nx, ny, R, o) {
    const d2 = nx * nx + ny * ny; const nz = Math.sqrt(Math.max(0, 1 - d2)); const I = (this.flip ? -nx : nx) * LX + ny * LY + nz * LZ;
    let r = R; if (o.pat) { const p = o.pat(x, y, nx, ny, I); if (p === false) return; if (typeof p === 'string') { this.put(x, y, p); return; } if (p) r = p; }
    this.put(x, y, this.tone(r, I, o));
  }
  // Rellena una forma dada por inside(x,y) → [nx, ny] | null. Con o.edge, los píxeles del borde que caen
  // sobre algo ya pintado se oscurecen (contorno interior entre piezas: cabeza sobre cuerpo, ala, pata).
  fill(x0, y0, x1, y1, inside, R, o) {
    const edge = o.edge === true ? R[1] : o.edge;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const n = inside(x, y); if (!n) continue;
      if (edge && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) && this.raw(x, y)) { this.put(x, y, edge); continue; }
      this.shade(x, y, n[0], n[1], R, o);
    }
  }
  raw(x, y) { if (this.flip) x = this.w - 1 - x; return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.p[y * this.w + x] : null; }
  // Elipsoide sombreado
  blob(cx, cy, rx, ry, R, o = {}) {
    cx = this.tx(cx); cy = this.ty(cy); rx = Math.max(0.55, rx * this.k); ry = Math.max(0.55, ry * this.k);
    const clip = o.clip;
    this.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy > 1) return null;
      if (clip && !clip(x, y, dx, dy)) return null; return [dx, dy];
    }, R, o);
  }
  // Cápsula sombreada (segmento con radio variable): patas, cuellos, colas
  capsule(x0, y0, x1, y1, r0, r1, R, o = {}) {
    x0 = this.tx(x0); y0 = this.ty(y0); x1 = this.tx(x1); y1 = this.ty(y1); r0 = Math.max(0.5, r0 * this.k); r1 = Math.max(0.5, r1 * this.k);
    const vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy || 1e-6, rm = Math.max(r0, r1);
    this.fill(Math.min(x0, x1) - rm - 1, Math.min(y0, y1) - rm - 1, Math.max(x0, x1) + rm + 1, Math.max(y0, y1) + rm + 1, (x, y) => {
      const px = x + 0.5, py = y + 0.5; let t = ((px - x0) * vx + (py - y0) * vy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const r = r0 + (r1 - r0) * t, nx = (px - x0 - vx * t) / r, ny = (py - y0 - vy * t) / r; return nx * nx + ny * ny > 1 ? null : [nx, ny];
    }, R, o);
  }
  // Cuerpo unido: varias piezas (['e', cx, cy, rx, ry] elipses, ['c', x0, y0, x1, y1, r0, r1] cápsulas) fundidas en un solo
  // volumen con un máximo suave de alturas; la normal sale del gradiente, así no se ven costuras entre piezas.
  body(parts, R, o = {}) {
    const T = parts.map((p) => p[0] === 'e' ? ['e', this.tx(p[1]), this.ty(p[2]), Math.max(0.6, p[3] * this.k), Math.max(0.6, p[4] * this.k)]
      : ['c', this.tx(p[1]), this.ty(p[2]), this.tx(p[3]), this.ty(p[4]), Math.max(0.5, p[5] * this.k), Math.max(0.5, p[6] * this.k)]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of T) { if (p[0] === 'e') { x0 = Math.min(x0, p[1] - p[3]); x1 = Math.max(x1, p[1] + p[3]); y0 = Math.min(y0, p[2] - p[4]); y1 = Math.max(y1, p[2] + p[4]); } else { const r = Math.max(p[5], p[6]); x0 = Math.min(x0, p[1] - r, p[3] - r); x1 = Math.max(x1, p[1] + r, p[3] + r); y0 = Math.min(y0, p[2] - r, p[4] - r); y1 = Math.max(y1, p[2] + r, p[4] + r); } }
    const ks = o.soft ?? 0.45;
    const H = (px, py) => {
      let sum = 0, any = false;
      for (const p of T) {
        let z = -1;
        if (p[0] === 'e') { const dx = (px - p[1]) / p[3], dy = (py - p[2]) / p[4], d = dx * dx + dy * dy; if (d <= 1) z = Math.sqrt(1 - d) * Math.min(p[3], p[4]); }
        else { const vx = p[3] - p[1], vy = p[4] - p[2], L2 = vx * vx + vy * vy || 1e-6; let t = ((px - p[1]) * vx + (py - p[2]) * vy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t; const r = p[5] + (p[6] - p[5]) * t, d = Math.hypot(px - p[1] - vx * t, py - p[2] - vy * t) / r; if (d <= 1) z = Math.sqrt(1 - d * d) * r; }
        if (z >= 0) { any = true; sum += Math.exp(ks * z) - 1; }
      }
      return any ? Math.log(1 + sum) / ks : -1;
    };
    const edge = o.edge === true ? R[1] : o.edge;
    for (let y = Math.floor(y0 - 1); y <= Math.ceil(y1 + 1); y++) for (let x = Math.floor(x0 - 1); x <= Math.ceil(x1 + 1); x++) {
      const z = H(x + 0.5, y + 0.5); if (z < 0) continue;
      const zl = Math.max(0, H(x - 0.5, y + 0.5)), zr = Math.max(0, H(x + 1.5, y + 0.5)), zu = Math.max(0, H(x + 0.5, y - 0.5)), zd = Math.max(0, H(x + 0.5, y + 1.5));
      if (edge && (H(x - 0.5, y + 0.5) < 0 || H(x + 1.5, y + 0.5) < 0 || H(x + 0.5, y - 0.5) < 0 || H(x + 0.5, y + 1.5) < 0) && this.raw(x, y)) { this.put(x, y, edge); continue; }
      let gx = (zr - zl) / 2, gy = (zd - zu) / 2; const g = o.g ?? 0.9; gx *= g; gy *= g;
      const n = Math.hypot(gx, gy, 1); const nx = -gx / n, ny = -gy / n;
      this.shade(x, y, nx, ny, R, o);
    }
  }
  // Masa: unión de piezas sombreada por su distancia al borde (borde redondeado de ancho D y centro plano). Sin
  // costuras entre piezas y con la luz direccional sólo en los cantos, como se sombrea a mano.
  mass(parts, R, o = {}) {
    const T = parts.map((p) => p[0] === 'e' ? ['e', this.tx(p[1]), this.ty(p[2]), Math.max(0.6, p[3] * this.k), Math.max(0.6, p[4] * this.k)]
      : ['c', this.tx(p[1]), this.ty(p[2]), this.tx(p[3]), this.ty(p[4]), Math.max(0.5, p[5] * this.k), Math.max(0.5, p[6] * this.k)]);
    const W = this.w, Hh = this.h, inside = new Uint8Array(W * Hh);
    const hit = (px, py) => {
      for (const p of T) {
        if (p[0] === 'e') { const dx = (px - p[1]) / p[3], dy = (py - p[2]) / p[4]; if (dx * dx + dy * dy <= 1) return true; }
        else { const vx = p[3] - p[1], vy = p[4] - p[2], L2 = vx * vx + vy * vy || 1e-6; let t = ((px - p[1]) * vx + (py - p[2]) * vy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t; const r = p[5] + (p[6] - p[5]) * t; if (Math.hypot(px - p[1] - vx * t, py - p[2] - vy * t) <= r) return true; }
      }
      return false;
    };
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (hit(x + 0.5, y + 0.5) && (!o.clip || o.clip(x, y))) inside[y * W + x] = 1;
    // Distancia al borde (chaflán 1 / 1,41)
    const BIG = 1e9, d = new Float32Array(W * Hh);
    for (let i = 0; i < d.length; i++) d[i] = inside[i] ? BIG : 0;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= Hh ? 0 : d[y * W + x]);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!inside[i]) continue; d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414); }
    for (let y = Hh - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!inside[i]) continue; d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414); }
    const fx = new Int16Array(Hh).fill(-1), bx = new Int16Array(Hh).fill(W), ty = new Int16Array(W).fill(Hh), by = new Int16Array(W).fill(-1);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (inside[y * W + x]) { if (x > fx[y]) fx[y] = x; if (x < bx[y]) bx[y] = x; if (y < ty[x]) ty[x] = y; if (y > by[x]) by[x] = y; }
    const D = (o.rim ?? (this.big ? 5 : 2)) * Math.max(0.6, this.k);
    const h = (x, y) => { const v = Math.min(at(x, y), D) / D; return D * Math.sqrt(Math.max(0, 1 - (1 - v) * (1 - v))); };
    const edge = o.edge === true ? R[1] : o.edge;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      if (!inside[y * W + x]) continue;
      if (edge && (at(x - 1, y) === 0 || at(x + 1, y) === 0 || at(x, y - 1) === 0 || at(x, y + 1) === 0) && this.raw(x, y)) { this.put(x, y, edge); continue; }
      const gx = (h(x + 1, y) - h(x - 1, y)) / 2 * (o.g ?? 1), gy = (h(x, y + 1) - h(x, y - 1)) / 2 * (o.g ?? 1);
      const n = Math.hypot(gx, gy, 1); this.shade(x, y, -gx / n, -gy / n, R, o.pat ? { ...o, pat: (X, Y, nx, ny, I) => o.pat(X, Y, nx, ny, I, { d: at(x, y), fd: fx[y] - x, kd: x - bx[y], td: y - ty[x], bd: by[x] - y }) } : o);
    }
  }
  // Cadena de cápsulas por puntos [[x,y,r],...]
  chain(pts, R, o = {}) { for (let i = 0; i + 1 < pts.length; i++) this.capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2], pts[i + 1][2], R, o); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.floor(this.tx(x0)); y0 = Math.floor(this.ty(y0)); x1 = Math.floor(this.tx(x1)); y1 = Math.floor(this.ty(y1));
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (let n = 0; n < 400; n++) { this.put(x0, y0, typeof c === 'function' ? c(n) : c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // Polígono relleno (color plano o función (x,y)→color)
  poly(pts, c) {
    pts = pts.map(([x, y]) => [this.tx(x), this.ty(y)]);
    let y0 = Infinity, y1 = -Infinity; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.put(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }
  // Recolorea los píxeles ya pintados que cumplan una condición (patrones sobre el volumen)
  each(f) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const X = this.flip ? this.w - 1 - x : x; const c = this.p[y * this.w + X]; if (c) { const n = f(x, y, c); if (n !== undefined) this.p[y * this.w + X] = n; } } }
  canvas() {
    const [cv, x] = canvas(this.w, this.h); const d = x.createImageData(this.w, this.h);
    for (let i = 0; i < this.p.length; i++) { const c = this.p[i]; if (!c) continue; const [r, g, b] = rgbOf(c); d.data[i * 4] = r; d.data[i * 4 + 1] = g; d.data[i * 4 + 2] = b; d.data[i * 4 + 3] = 255; }
    x.putImageData(d, 0, 0); return outlineSel(cv);
  }
}

// ───────────── Poses del mundo ─────────────
// Paso a cuatro tiempos: a/b = desplazamiento del pie de cada par diagonal; la/lb = pie levantado; bob = cuerpo arriba.
const WALK = [{ a: 1, b: -1, la: 0, lb: 0, bob: 0 }, { a: 0, b: 0, la: 0, lb: 1, bob: -1 }, { a: -1, b: 1, la: 0, lb: 0, bob: 0 }, { a: 0, b: 0, la: 1, lb: 0, bob: -1 }];
function stance(o) {
  if (o.pose === 'walk') return { ...WALK[o.f & 3], walk: true, idle: 0, fly: -1 };
  return { a: 0, b: 0, la: 0, lb: 0, bob: 0, walk: false, idle: o.pose === 'idle' ? (o.f & 1) : 0, sleep: o.pose === 'sleep', fly: o.pose === 'fly' ? (o.f & 1) : -1 };
}
// Pata de 1 px desde (x, y0) hasta el suelo (fila 14) con el pie abajo.
function leg(A, x, y0, dx, lift, top, bot, foot) {
  const y1 = 14 - lift, n = Math.max(1, Math.round(y1 - y0));
  for (let i = 0; i <= n; i++) A.px(x + Math.round((dx * i) / n), y0 + i, i === n ? foot : i < n / 2 ? top : bot);
}
const eye = (A, x, y, closed, R) => A.px(x, y, closed ? R[1] : EYE);

// ───────────── Pintores 16×16 por plan corporal ─────────────
const S = {};

// Pezuñas: jabalí, corzo, ciervo, cabra montés
const HOOFED = {
  jabali: { bx: 6.8, by: 9.4, rx: 5.4, ry: 3.2, lt: 11.5, legs: [3, 4, 9, 10], hx: 12.2, hy: 9.6, hrx: 2.4, hry: 2.3 },
  corzo: { bx: 6.6, by: 8, rx: 4.6, ry: 2.2, lt: 9.5, legs: [4, 3, 9, 10], neck: [10, 7.6, 11.2, 4.8, 1.1], hx: 12, hy: 4.2, hrx: 1.9, hry: 1.4 },
  ciervo: { bx: 6.4, by: 7.8, rx: 5.2, ry: 2.6, lt: 9.5, legs: [3, 2, 9, 10], neck: [9.8, 7.4, 11.3, 4.4, 1.5], hx: 12.2, hy: 3.9, hrx: 2, hry: 1.5 },
  cabra_montes: { bx: 6.6, by: 9, rx: 4.8, ry: 2.7, lt: 10.5, legs: [4, 3, 9, 10], neck: [10, 8.4, 11, 6.4, 1.6], hx: 11.9, hy: 6, hrx: 1.9, hry: 1.6 },
};
S.cuadrupedo = (A, o) => {
  const { sp, C, R, cria } = o; const male = o.sex === 'm' && !cria; const t = stance(o);
  const Q = HOOFED[sp] || HOOFED.corzo; const b = t.bob; const boar = sp === 'jabali', goat = sp === 'cabra_montes', deer = !boar && !goat;
  const sl = t.sleep, graze = t.idle === 1;
  const body = R.c, belly = R.b; const legC = goat ? R.dark : body;
  if (sl && !boar) {
    // Tumbado con las patas recogidas y la cabeza alta, ojos cerrados
    A.blob(Q.bx, 11.8, Q.rx, 2.2, body, { pat: (x, y, nx, ny) => (ny > 0.5 ? belly : deer && nx < -0.6 ? R.rump || belly : null) });
    A.line(Q.bx + 1, 13.8, Q.bx + 3.4, 13.8, legC[1]); A.px(Q.bx - 2.6, 13.8, legC[1]);
    A.capsule(Q.bx + 3.4, 11, Q.bx + 4.6, 8.6, Q.neck[4], Q.neck[4] * 0.85, sp === 'ciervo' && !cria ? R.mane : body);
    A.blob(Q.bx + 5.4, 8, Q.hrx, Q.hry, body); A.capsule(Q.bx + 6.2, 8.4, Q.bx + 7.1, 8.8, 0.8, 0.6, body);
    A.px(Q.bx + 7.4, 8.6, C.nose || HOOF); A.px(Q.bx + 5.6, 7.8, body[1]); A.line(Q.bx + 4.4, 6.8, Q.bx + 3.6, 5.6, body[3]);
    if (goat) { const h = R.horn; A.chain([[Q.bx + 4.8, 6.6, 0.6], [Q.bx + 3.8, 5.2, 0.6], [Q.bx + 2.6, 5.4, 0.5]], h); }
    return;
  }
  const low = sl ? 2 : 0; const by = Q.by - b + low, lt = Q.lt - b;
  // Patas lejanas (más oscuras)
  if (!sl) { leg(A, Q.legs[0], lt, t.a, t.la, legC[1], legC[1], HOOF); leg(A, Q.legs[2], lt, t.b, t.lb, legC[1], legC[1], HOOF); }
  // Cola
  if (boar) { A.line(1.5, by - 0.5, 1, by + 2, body[2]); A.px(1, by + 2.5, R.b[1]); }
  else if (deer) A.px(Q.bx - Q.rx + 0.2, by - 1.4, R.rump[4]);
  else A.px(Q.bx - Q.rx + 0.3, by - 1.6, R.dark[2]);
  // Cuerpo con vientre claro (no el jabalí), grupa blanca (cérvidos) y rayas (rayones del jabato)
  A.blob(Q.bx, by, Q.rx, Q.ry, body, { pat: (x, y, nx, ny) => {
    if (cria && boar && Math.abs(ny) < 0.85 && (Math.round(ny * Q.ry * 1.6) & 1) && nx > -0.8) return R.stripe;
    if (cria && deer && ny < 0.25 && ((x * 7 + y * 5) % 9 === 0)) return C.rump;
    if (!boar && ny > 0.5) return belly;
    if (deer && nx < -0.6 && ny > -0.5) return R.rump;
    if (goat && male && ny > 0.15 && nx > 0.55) return R.dark;
  } });
  if (boar) for (let x = 3; x <= 9; x++) if ((x & 1) === 0) A.px(x, by - Q.ry - 0.2 + (x === 6 ? -0.6 : 0), body[1]); // crin erizada
  // Cuello y cabeza
  const hd = graze ? (boar ? 1.6 : 0) : sl ? 1 : 0;
  let hx = Q.hx, hy = Q.hy - b + hd;
  if (Q.neck) {
    const [x0, y0, x1, y1, r] = Q.neck;
    if (graze) { hx = Q.hx + 0.8; hy = 12.4; A.capsule(x0, y0 - b, hx - 0.8, hy - 1.2, r, r * 0.8, sp === 'ciervo' && !cria ? R.mane : body); }
    else A.capsule(x0, y0 - b, x1, y1 - b, r, r * 0.85, sp === 'ciervo' && !cria ? R.mane : body, { pat: (x, y, nx) => (nx > 0.55 ? belly : null) });
  }
  const hs = cria ? 1.2 : 1;
  if (boar) {
    A.blob(hx, hy, Q.hrx * hs, Q.hry * hs, body);
    A.capsule(hx + 1.4, hy + 0.9, hx + 2.5, hy + 1.4, 1.1, 1, R.snout, { lo: 2, hi: 4 });
    A.px(hx + 2.4, hy + 0.6, R.snout[1]); if (!cria) A.px(hx + 1.6, hy + 2.3, C.tusk);
    A.px(hx - 0.8, hy - 2.2, body[1]); A.px(hx - 0.1, hy - 2.2, body[2]);
    eye(A, hx + 0.3, hy - 0.6, sl, body);
  } else {
    // Orejas detrás de la cabeza
    const er = graze ? 1 : 0;
    A.line(hx - 1.2, hy - 0.8, hx - 2.2 + er, hy - (deer ? 2.6 : 2) + er, body[2]); if (deer) A.px(hx - 1.6, hy - 1.8 + er, belly[3]);
    A.blob(hx, hy, Q.hrx * hs, Q.hry * hs, body, { pat: (x, y, nx, ny) => (ny > 0.55 && nx > -0.2 ? belly : null) });
    A.capsule(hx + 1.2, hy + 0.3, hx + 2.2, hy + 0.6, 0.9, 0.7, body, { lo: 2 });
    A.px(hx + 2.5, hy + 0.3, C.nose || HOOF);
    A.line(hx - 0.4, hy - 1.3, hx - 0.8 - (deer ? 0.6 : 0), hy - (deer ? 3 : 2.2), body[4]);
    if (goat) { A.line(hx + 1.2, hy + 1.6, hx + 1.2, hy + (male ? 3.2 : 2.3), male ? R.dark[1] : body[2]); }
    eye(A, hx + 0.3, hy - 0.2, false, body);
    // Cuernas (machos) y cuernos
    if (male && SP[sp].antlers) {
      const a = R.ant, big = SP[sp].antlers > 1;
      if (big) { A.line(hx - 0.6, hy - 1.6, hx - 1.4, hy - 3.6, a[3]); A.line(hx - 1.4, hy - 3.6, hx - 2.6, hy - 4.2, a[3]); A.px(hx - 0.4, hy - 3.2, a[4]); A.px(hx - 1.8, hy - 4.8, a[4]); A.px(hx + 0.2, hy - 2.4, a[2]); }
      else { A.line(hx - 0.3, hy - 1.5, hx - 0.6, hy - 3.2, a[3]); A.px(hx + 0.3, hy - 2.6, a[4]); }
    }
    if (goat) { const h = R.horn; if (male) A.chain([[hx - 0.2, hy - 1.2, 0.8], [hx - 1, hy - 3.2, 0.75], [hx - 2.4, hy - 3.8, 0.65], [hx - 3.4, hy - 2.8, 0.5]], h, { pat: (x, y) => ((x + y) % 2 ? h[2] : null) }); else A.chain([[hx - 0.2, hy - 1.2, 0.6], [hx - 0.9, hy - 2.6, 0.5], [hx - 1.6, hy - 2.8, 0.5]], h); }
  }
  // Patas cercanas
  if (!sl) { leg(A, Q.legs[1], lt + 0.4, t.b, t.lb, legC[3], legC[2], HOOF); leg(A, Q.legs[3], lt + 0.4, t.a, t.la, legC[3], legC[2], HOOF); }
};

// Oreja triangular: base de (x, y) a (x + w, y) y punta desplazada lx hacia delante y h hacia arriba.
function earT(A, x, y, w, h, lx, c, inner) { A.poly([[x, y], [x + w, y], [x + w * 0.55 + lx, y - h]], c); if (inner) A.px(x + w * 0.5 + lx * 0.4, y - h * 0.35, inner); }

// Felinos y cánidos: gato, lince, zorro, lobo
const PAWED = {
  gato: { bx: 6.6, by: 10.2, rx: 3.9, ry: 1.9, lt: 11.2, legs: [5, 4, 10, 9], hx: 11.3, hy: 8, hrx: 2.2, hry: 1.9 },
  lince: { bx: 6.4, by: 9.4, rx: 4.4, ry: 2.3, lt: 10.8, legs: [4, 3, 10, 9], hx: 11.6, hy: 7.2, hrx: 2.4, hry: 2.1 },
  zorro: { bx: 6.6, by: 10, rx: 4.2, ry: 1.9, lt: 11, legs: [5, 4, 10, 9], hx: 11, hy: 8.1, hrx: 2, hry: 1.8 },
  lobo: { bx: 6.4, by: 9.2, rx: 4.8, ry: 2.4, lt: 10.6, legs: [4, 3, 10, 9], hx: 11.6, hy: 7.1, hrx: 2.2, hry: 1.9 },
};
function pawHead(A, sp, hx, hy, R, C, o) {
  const body = R.c, belly = R.b; const fox = sp === 'zorro', wolf = sp === 'lobo', lynx = sp === 'lince';
  const sleep = o.sleep, blink = o.blink;
  // Orejas: la lejana más oscura
  const eh = fox ? 2.8 : wolf ? 2.4 : lynx ? 2.6 : 2.2;
  earT(A, hx - 2, hy - 1.1, 1.9, eh * (sleep ? 0.7 : 1), -0.3, fox ? C.sock : body[2]);
  earT(A, hx - 0.3, hy - 1.3, 2, eh * (sleep ? 0.7 : 1), 0.2, fox ? R.c[3] : body[3], fox ? C.sock : wolf ? body[2] : (C.nose || body[2]));
  if (lynx && !sleep) { A.px(hx - 1.2, hy - 1.4 - eh, C.tuft); A.px(hx + 0.8, hy - 1.6 - eh, C.tuft); }
  A.blob(hx, hy, R.hrx, R.hry, body, { edge: true, pat: (x, y, nx, ny) => (ny > 0.3 && nx > -0.2 ? belly : null) });
  if (lynx) { A.px(hx + 0.4, hy + 1.8, belly[4]); A.px(hx - 0.6, hy + 1.9, belly[4]); }
  if (fox || wolf) {
    A.capsule(hx + 1.2, hy + 0.5, hx + (fox ? 2.9 : 2.8), hy + 0.9, 1, 0.55, body, { pat: (x, y, nx, ny) => (ny > 0.05 ? belly : null) });
    A.px(hx + (fox ? 3.1 : 3), hy + 0.6, EYE);
  } else A.px(hx + 1.9, hy + 0.5, C.nose || body[1]);
  if (sleep || blink) A.line(hx + 0.2, hy - 0.1, hx + 0.9, hy - 0.1, body[1]);
  else { const ec = C.eye && !o.cria ? C.eye : EYE; A.px(hx + 0.5, hy - 0.2, ec); A.px(hx + 0.9, hy - 0.2, EYE); }
}
S.gato = S.perro = (A, o) => {
  const { sp, C, R, cria } = o; const t = stance(o); const Q = PAWED[sp] || PAWED.gato; const b = t.bob;
  const fox = sp === 'zorro', wolf = sp === 'lobo';
  const body = R.c, belly = R.b; const sock = fox ? C.sock : null;
  const Rh = { ...R, hrx: Q.hrx * (cria ? 1.2 : 1), hry: Q.hry * (cria ? 1.2 : 1) };
  const coat = (x, y, nx, ny) => {
    if (ny > 0.45) return belly;
    if (sp === 'gato' && ny < -0.15 && (x % 3 === 0)) return R.stripe;
    if (sp === 'lince' && ny < 0.4 && ((x * 3 + y * 5) % 7 === 0)) return C.spot;
    if (wolf && ny < -0.35) return R.dark;
  };
  if (t.sleep) {
    A.blob(7.2, 11.9, 4.5, 2.3, body, { pat: coat });
    const tail = fox ? (x) => (x <= Math.floor(A.tx(4.4)) ? null : null) : null;
    A.chain([[3, 12.4, 1.2], [5.4, 13.7, 1.1], [9.4, 13.8, 0.9]], body, { edge: true, pat: fox ? (x, y, nx, ny) => (x > A.tx(8.4) ? C.tip : null) : sp === 'gato' ? (x) => (x % 2 ? R.stripe : null) : null });
    pawHead(A, sp, 11, 11.3, Rh, C, { sleep: true, cria });
    return;
  }
  leg(A, Q.legs[0], Q.lt - b, t.a, t.la, sock || body[1], sock || body[1], sock || body[0]);
  leg(A, Q.legs[2], Q.lt - b, t.b, t.lb, sock || body[1], sock || body[1], sock || body[0]);
  const by = Q.by - b;
  // Cola
  const sw = t.idle ? 1 : (t.walk ? (o.f & 1) * 0.5 : 0);
  if (sp === 'gato') A.chain([[3.2, by - 0.4, 0.7], [2, by - 2.4 - sw, 0.6], [2.5, by - 4.4 - sw, 0.6]], body, { pat: (x, y) => (y % 2 === 0 ? R.stripe : null) });
  else if (sp === 'lince') A.blob(2.4, by - 1.1, 1.2, 0.9, body, { pat: (x, y, nx) => (nx < -0.2 ? C.tuft : null) });
  else if (fox) A.chain([[3, by - 0.5, 1.1], [1.7, by + 0.8 - sw, 1.5], [1.3, by + 2.1 - sw, 1]], body, { pat: (x, y, nx, ny) => (ny > 0.4 || x <= A.tx(1.6) ? C.tip : null) });
  else A.chain([[2.7, by - 0.6, 1.1], [1.6, by + 1.4 - sw, 1.2], [1.5, by + 2.8 - sw, 0.8]], body, { pat: (x, y, nx, ny) => (ny < -0.3 ? R.dark : null) });
  A.blob(Q.bx, by, Q.rx, Q.ry, body, { pat: coat });
  pawHead(A, sp, Q.hx, Q.hy - b + (t.idle && wolf ? 0.6 : 0), Rh, C, { blink: t.idle && sp === 'gato', cria });
  leg(A, Q.legs[1], Q.lt + 0.4 - b, t.b, t.lb, sock || body[3], sock || body[2], sock || body[1]);
  leg(A, Q.legs[3], Q.lt + 0.4 - b, t.a, t.la, sock || body[3], sock || body[2], sock || body[1]);
};

// Osos y afines: oso, tejón, castor
S.oso = (A, o) => {
  const { sp, C, R, cria } = o; const t = stance(o); const b = t.bob; const body = R.c; const sl = t.sleep;
  if (sp === 'oso') {
    if (sl) {
      A.blob(6.6, 11.6, 5.6, 2.6, body, { pat: (x, y, nx, ny) => (ny > 0.55 ? R.b : null) });
      A.capsule(10.4, 13.6, 13.4, 13.7, 1, 1, body, { edge: true });
      A.blob(12.2, 11.6, 2.3, 1.8, body, { edge: true }); A.capsule(13.2, 12.2, 14.2, 12.4, 1, 0.8, R.muzzle, { lo: 2, hi: 4 });
      A.px(14.5, 12, EYE); A.blob(10.9, 9.8, 0.8, 0.7, body, { edge: true }); A.line(12.2, 11.4, 12.9, 11.4, body[1]); return;
    }
    const by = 8.8 - b, lt = 11.2 - b;
    A.capsule(3.4, lt - 1, 3.4 + t.a * 0.6, 13.6 - t.la, 1.1, 1, body, { d: -1 }); A.capsule(9.4, lt - 1, 9.4 + t.b * 0.6, 13.6 - t.lb, 1.1, 1, body, { d: -1 });
    A.blob(6.4, by, 5.4, 3.4, body, { pat: (x, y, nx, ny) => (ny > 0.5 ? R.b : null) });
    A.blob(8.6, by - 1.9, 2.8, 2, body); // joroba
    const hy = by + 0.9 + (t.idle ? 1.2 : 0);
    A.blob(10.9, hy - 1.9, 0.9, 0.85, body, { edge: true }); // oreja lejana
    A.blob(12.2, hy, 2.4, 2, body, { edge: true });
    A.capsule(13.3, hy + 0.7, 14.3, hy + 1, 1.1, 0.9, R.muzzle, { lo: 2, hi: 4, edge: true }); A.px(14.7, hy + 0.5, EYE);
    A.blob(12.6, hy - 2, 0.85, 0.8, body, { d: 1, edge: true });
    eye(A, 12.7, hy - 0.4, false, body);
    A.capsule(5, lt - 0.5, 5 + t.b * 0.6, 13.6 - t.lb, 1.2, 1.1, body, { edge: true }); A.capsule(11, lt - 0.5, 11 + t.a * 0.6, 13.6 - t.la, 1.2, 1.1, body, { edge: true });
    A.px(5.6 + t.b * 0.6, 14 - t.lb, R.b[1]); A.px(11.6 + t.a * 0.6, 14 - t.la, R.b[1]);
    return;
  }
  if (sp === 'tejon') {
    const by = 11 - b + (sl ? 1 : 0), lt = 12 - b;
    if (!sl) { leg(A, 4, lt, t.a, t.la, body[1], body[1], INK); leg(A, 9, lt, t.b, t.lb, body[1], body[1], INK); }
    A.blob(6.6, by, 5, 2.4, body, { pat: (x, y, nx, ny) => (ny > 0.4 ? R.c[1] : (x + y) % 3 === 0 && ny < 0 ? R.b : null) });
    A.px(1.6, by - 0.6, body[2]);
    const hy = by + (t.idle ? 0.6 : 0);
    A.blob(11.6, hy, 2.2, 1.7, R.b, { edge: body[1] }); A.capsule(12.6, hy + 0.4, 14, hy + 0.9, 1.1, 0.6, R.b); A.px(14.3, hy + 0.7, EYE);
    A.line(10, hy - 1.2, 13.6, hy + 0.2, C.face); A.line(10, hy - 0.5, 13, hy + 0.6, C.face); // franja negra
    A.px(10.5, hy - 1.9, R.b[3]);
    if (!sl) { leg(A, 5, lt + 0.4, t.b, t.lb, body[1], INK, INK); leg(A, 10, lt + 0.4, t.a, t.la, body[1], INK, INK); }
    return;
  }
  // Castor
  const by = 11 - b + (sl ? 0.6 : 0), lt = 12.5 - b;
  A.blob(2.4, 13 - b * 0.5, 2.3, 1, R.tail, { pat: (x, y) => ((x + y) % 2 ? R.tail[1] : null) });
  if (!sl) leg(A, 5, lt, t.a, t.la, body[1], body[1], body[0]);
  A.blob(7, by, 4.1, 2.8, body, { pat: (x, y, nx, ny) => (ny > 0.5 ? R.b : null) });
  const hy = by - 0.3 + (t.idle ? 0.7 : 0);
  A.blob(11.2, hy, 2.1, 1.8, body, { edge: true }); A.capsule(12.4, hy + 0.3, 13.3, hy + 0.6, 1, 0.8, body);
  A.px(13.6, hy + 0.2, EYE); A.px(12.9, hy + 1.6, C.teeth); A.px(10.4, hy - 1.7, body[2]);
  eye(A, 11.6, hy - 0.6, sl, body);
  if (!sl) leg(A, 9, lt + 0.3, t.b, t.lb, body[2], body[1], body[0]);
};

// Mustélidos: garduña, gineta, nutria
S.mustelido = (A, o) => {
  const { sp, C, R } = o; const t = stance(o); const b = t.bob; const body = R.c; const sl = t.sleep;
  const gin = sp === 'gineta', nut = sp === 'nutria';
  if (sl) {
    A.chain([[4, 12.6, 1.4], [3, 11, 1.1], [5, 9.8, 0.9]], body, { pat: (x, y) => (gin && (x + y) % 2 ? R.b : null) });
    A.blob(8, 11.8, 4.4, 2.3, body, { pat: (x, y, nx, ny) => (gin && ny < 0.3 && (x * 3 + y) % 5 === 0 ? C.b : ny > 0.6 ? R.b : null) });
    A.blob(11.6, 11.6, 1.9, 1.5, body); A.px(12.2, 11.4, body[1]); return;
  }
  const by = 11.2 - b, lt = 12 - b, wave = t.walk ? (o.f & 1) * 0.6 : 0;
  // Cola
  if (gin) A.chain([[3, by, 0.9], [1.6, by + 1.2, 0.8], [1.2, by + 2.6, 0.6]], body, { pat: (x, y) => ((x + y) % 2 ? R.b : null) });
  else if (nut) A.chain([[3, by, 1.3], [1.4, by + 1.4, 0.8], [0.9, by + 2.4, 0.5]], body);
  else A.chain([[3, by - 0.3, 1], [1.7, by - 1.6 - wave, 1.1], [1.3, by - 3 - wave, 0.8]], body, { d: -1 });
  leg(A, 4, lt, t.a, t.la, body[1], body[1], body[0]); leg(A, 9, lt, t.b, t.lb, body[1], body[1], body[0]);
  A.blob(6.8, by, 5, 1.7, body, { pat: (x, y, nx, ny) => {
    if (gin && ny < 0.4 && (x * 3 + y * 7) % 5 === 0) return C.b;
    if (ny > 0.5) return nut ? R.b : null;
  } });
  const hy = by - 1 + (t.idle ? 0.5 : 0);
  A.blob(11.8, hy, 1.9, 1.5, body, { pat: (x, y, nx, ny) => (ny > 0.3 ? (sp === 'garduna' ? R.b : nut ? R.b : null) : null) });
  if (sp === 'garduna') A.blob(10.6, by - 0.2, 1.2, 1, R.b); // babero
  A.capsule(12.8, hy + 0.3, 13.8, hy + 0.5, 0.8, 0.6, body); A.px(14.1, hy + 0.3, EYE);
  if (gin) A.px(11.8, hy + 0.6, GLINT);
  A.px(10.8, hy - 1.4, body[3]); eye(A, 12.2, hy - 0.4, false, body);
  if (nut) A.px(13.6, hy + 1, R.b[5]);
  leg(A, 5, lt + 0.4, t.b, t.lb, body[2], body[1], body[0]); leg(A, 10, lt + 0.4, t.a, t.la, body[2], body[1], body[0]);
};

// Conejo y liebre: salto en cuatro tiempos
S.conejo = (A, o) => {
  const { sp, C, R, cria } = o; const t = stance(o); const body = R.c; const hare = sp === 'liebre';
  const f = o.f & 3, hop = t.walk ? [0, -1, -2.4, -0.6][f] : 0, stretch = t.walk ? [0, 1, 1.4, 0.4][f] : 0;
  const earIn = R.ear ? R.ear[4] : body[5];
  if (t.sleep) {
    A.blob(7.4, 12, 4.4, 2.5, body, { pat: (x, y, nx, ny) => (ny > 0.55 ? R.b : null) });
    A.blob(3.1, 11.4, 1, 1, R.b, { lo: 3 });
    A.blob(11, 11.4, 2.1, 1.8, body, { edge: true }); A.px(12.9, 11.8, R.ear ? R.ear[3] : body[1]);
    // Orejas plegadas sobre el lomo
    A.capsule(9.8, 9.9, 6.2, 9.6, 0.7, 0.55, body, { edge: true }); A.line(9.2, 10, 6.8, 9.8, hare ? C.tip : earIn);
    A.line(11.2, 11.3, 11.8, 11.3, body[1]); return;
  }
  const by = 11.2 + hop, hx = 10.8 + stretch, hy = 8.4 + hop + (t.walk && f === 3 ? 0.8 : 0);
  A.blob(3.4 - stretch * 0.5, by - 1, 1.2, 1.1, R.b, { lo: 3 });
  A.blob(7.2, by, 3.8 + stretch * 0.4, 2.6, body, { pat: (x, y, nx, ny) => (ny > 0.5 ? R.b : null) });
  A.blob(5.4 - stretch, by + 1.3, 2.2 + stretch * 0.6, 1.4, body, { edge: true });
  A.line(hx - 1.4, by + 1, hx - 1.2 + (t.walk && f === 2 ? 1 : 0), 14 + (t.walk && f >= 1 && f <= 2 ? hop : 0), body[2]);
  // Orejas largas: la lejana detrás de la cabeza
  const tw = t.idle ? 1 : 0, eh = hare ? 4.4 : 3.6, back = t.walk && f === 2 ? 1.2 : 0;
  A.capsule(hx - 0.9, hy - 1.4, hx - 1.4 - back, hy - 1.2 - eh, 0.6, 0.5, body, { d: -1 });
  A.blob(hx, hy, 2.1 * (cria ? 1.15 : 1), 1.8 * (cria ? 1.15 : 1), body, { edge: true, pat: (x, y, nx, ny) => (ny > 0.5 && nx > 0 ? R.b : null) });
  A.capsule(hx + 0.2, hy - 1.5, hx + 0.4 - back + tw, hy - 1.4 - eh + tw, 0.75, 0.55, body, { edge: true });
  A.line(hx + 0.4, hy - 2.2, hx + 0.5 - back + tw, hy - 0.8 - eh + tw, earIn);
  if (hare) { A.px(hx - 1.4 - back, hy - 1.2 - eh, C.tip); A.px(hx + 0.4 - back + tw, hy - 1.4 - eh + tw, C.tip); }
  A.px(hx + 0.5, hy - 0.4, EYE); A.px(hx + 2, hy + 0.3, R.ear ? R.ear[3] : body[1]);
};

// Ratón y rata
S.raton = (A, o) => {
  const { sp, C, R } = o; const t = stance(o); const body = R.c; const rat = sp === 'rata'; const k = rat ? 1 : 0.85;
  const sc = t.walk ? [0, -0.6, 0, -0.6][o.f & 3] : 0;
  if (t.sleep) { A.blob(8, 12.6, 3.2 * k, 1.8, body, { pat: (x, y, nx, ny) => (ny > 0.5 ? R.b : null) }); A.line(5, 13.6, 2, 13.4, R.tail[3]); A.px(10.4, 11, R.ear[3]); return; }
  const by = 12.4 + sc;
  const tw = t.walk ? (o.f & 1) : t.idle;
  A.line(8 - 3 * k, by + 0.6, 4.4 - 3 * k, by - 0.6 + tw, R.tail[3]); A.line(4.4 - 3 * k, by - 0.6 + tw, 2 - 2 * k, by + 0.6 + tw, R.tail[3]);
  A.blob(8, by, 3.2 * k, 1.8, body, { pat: (x, y, nx, ny) => (ny > 0.5 ? R.b : null) });
  const hx = 8 + 3.1 * k, hy = by - 0.3 + (t.idle ? 0.4 : 0);
  A.blob(hx, hy, 1.7 * k + 0.2, 1.4, body); A.capsule(hx + 0.9, hy + 0.2, hx + 1.9, hy + 0.5, 0.8, 0.5, body);
  A.px(hx + 2.2, hy + 0.3, R.ear[3]);
  A.blob(hx - 0.7, hy - 1.4, 0.9, 0.9, R.ear, { lo: 2, hi: 4 });
  A.px(hx + 0.4, hy - 0.3, EYE);
  A.px(8 - 2 * k + (t.walk ? t.a * 0.6 : 0), 14, body[1]); A.px(8 + 2 * k + (t.walk ? t.b * 0.6 : 0), 14, body[1]);
};

// Ardilla: sentada con la cola en penacho
S.ardilla = (A, o) => {
  const { C, R } = o; const t = stance(o); const body = R.c; const f = o.f & 3;
  if (t.sleep) { A.blob(4.6, 9.8, 2.8, 4, body, { pat: (x, y, nx) => (nx < -0.5 ? R.c[5] : null) }); A.blob(8.6, 11.8, 3.4, 2.4, body); A.blob(10.6, 11.6, 1.8, 1.6, body); A.px(11.2, 11.4, body[1]); return; }
  const hop = t.walk ? [0, -1.4, -2, -0.6][f] : 0;
  const tail = t.walk ? [0, 1, 1.6, 0.6][f] : t.idle ? 0.6 : 0;
  // Cola en penacho detrás
  A.chain([[6, 12 + hop, 1.6], [3.4, 10.6 + hop + tail * 0.5, 2.4], [3.6, 6.4 + hop + tail, 2.4], [5.6, 4.6 + hop + tail, 1.3]], body, { pat: (x, y, nx) => (nx < -0.55 ? R.c[5] : nx > 0.6 ? R.dark : null) });
  // Cuerpo erguido
  A.blob(8.4, 11.2 + hop, 2.6, 2.9, body, { pat: (x, y, nx, ny) => (nx > 0.25 && ny > -0.4 ? R.b : null) });
  A.blob(7.4, 13 + hop, 2.2, 1.3, body, { d: -1 });
  const hy = 7.4 + hop + (t.idle ? 0.6 : 0);
  A.blob(10, hy, 2.1, 1.8, body, { pat: (x, y, nx, ny) => (ny > 0.4 && nx > 0 ? R.b : null) });
  A.px(12, hy + 0.4, EYE); A.px(10.6, hy - 0.4, EYE); A.px(10.4, hy - 0.7, GLINT);
  A.line(9.4, hy - 1.6, 9.2, hy - 3, body[3]); A.px(9.2, hy - 3.6, R.dark[2]);
  // Patitas delanteras (en reposo, mordisquea)
  A.px(10.8, hy + 2.4 + (t.idle ? -0.6 : 0), body[2]); if (t.idle) A.px(11.6, hy + 1.8, '#8a5a2a');
  A.px(9.6 + (t.walk ? t.a : 0), 14 + Math.min(0, hop), R.dark[2]);
};

// Erizo
S.erizo = (A, o) => {
  const { C, R } = o; const t = stance(o); const sl = t.sleep; const by = 11.8 + (t.walk ? [0, -0.5, 0, -0.5][o.f & 3] : 0);
  const spine = R.spine;
  // Púas: franjas radiales oscuras y claras, puntas claras en el borde
  const spikes = (x, y, nx, ny) => { const a = Math.atan2(ny, nx); const band = Math.floor((a + Math.PI) * 4.2) & 1; if (nx * nx + ny * ny > 0.62 && ny < 0.2) return band ? C.tips : spine[2]; return band ? spine[3] : spine[1]; };
  const rim = (cx, cy, rx, ry, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); A.px(cx + Math.cos(a) * (rx + 0.8), cy + Math.sin(a) * (ry + 0.8), (i & 1) ? spine[1] : C.tips); } };
  if (sl) { A.blob(8, 11.6, 4.2, 3, spine, { pat: spikes }); rim(8, 11.6, 4.2, 3, Math.PI * 1.05, Math.PI * 1.95, 9); return; }
  A.px(4.6 + t.a * 0.5, 14, R.face[1]); A.px(9.6 + t.b * 0.5, 14, R.face[1]);
  const hx = 11.3 + (t.idle ? 0.5 : 0), hy = by + 0.7 + (t.idle ? 0.5 : 0);
  A.blob(7.2, by, 4.6, 3, spine, { pat: spikes });
  rim(7.2, by, 4.6, 3, Math.PI * 1.02, Math.PI * 1.85, 10);
  A.blob(hx, hy, 2, 1.5, R.face, { edge: true }); A.capsule(hx + 1, hy + 0.3, hx + 2.4, hy + 0.7, 0.9, 0.5, R.face); A.px(hx + 2.7, hy + 0.5, EYE);
  A.px(hx + 0.4, hy - 0.4, EYE); A.px(hx - 0.9, hy - 1.2, R.face[2]);
  A.px(6.4 + t.b * 0.5, 14, R.face[2]); A.px(10.4 + t.a * 0.5, 14, R.face[2]);
};

// Pájaros pequeños: gorrión, paloma, gaviota
S.pajaro = (A, o) => {
  const { sp, C, R, sex, cria } = o; const t = stance(o); const body = R.c; const gull = sp === 'gaviota', dove = sp === 'paloma';
  const k = gull ? 1.2 : dove ? 1.05 : 0.9;
  const wing = gull ? R.b : body;
  if (t.fly >= 0) {
    const up = t.fly === 0; const cy = 8;
    A.blob(8, cy, 3.6 * k, 1.7 * k, gull ? R.c : body, { pat: (x, y, nx, ny) => (ny > 0.3 ? (gull ? R.c : R.b) : null) });
    A.poly(up ? [[5, cy - 0.5], [10.5, cy - 0.5], [7, cy - 6], [5.5, cy - 5]] : [[5, cy + 0.5], [10.5, cy + 0.5], [7.4, cy + 5.6], [6, cy + 5.2]], (x, y) => (gull && (up ? y < Math.round(A.ty(cy - 4.6)) : y > Math.round(A.ty(cy + 4.2))) ? C.tip : wing[up ? 4 : 2]));
    A.poly([[4.8, cy - 0.6], [2, cy - 1.6], [2.2, cy + 0.8]], body[2]);
    A.blob(11.6, cy - 1, 1.6, 1.4, gull ? R.c : dove ? body : body); A.px(12.2, cy - 1.4, EYE);
    A.px(13.4, cy - 0.8, gull ? C.beak : C.beak || '#c8a040'); return;
  }
  if (t.sleep) { A.blob(8, 11.6, 3.6 * k, 2.6 * k, body, { pat: (x, y, nx, ny) => (ny > 0.35 ? R.b : null) }); A.blob(9.4, 9.4, 1.6, 1.4, gull ? R.c : body); A.px(10.4, 9.4, body[1]); A.line(4.6, 11, 3, 10.2, gull ? C.tip : body[1]); return; }
  const hop = t.walk ? [0, -1, 0, -1][o.f & 3] : 0; const peck = t.idle === 1;
  const by = 11 + hop, hx = peck ? 11.2 : dove && t.walk && (o.f & 2) ? 11.4 : 10.6, hy = peck ? 11.4 : 8.6 + hop;
  // Patas
  A.line(7.8, by + 1.6, 7.8 + (t.walk ? t.a * 0.5 : 0), 14, C.feet || '#c88a50'); A.line(8.8, by + 1.6, 8.8 + (t.walk ? t.b * 0.5 : 0), 14, shadeF(C.feet || '#c88a50'));
  // Cola
  A.poly([[5.2, by - 0.8], [2.2, by - 2 - (gull ? 0 : 1)], [2.4, by - 0.2], [5.4, by + 0.8]], gull ? C.tip : body[2]);
  // Cuerpo
  A.blob(8, by, 3.4 * k, 2.3 * k, gull ? R.c : body, { pat: (x, y, nx, ny) => {
    if (ny > 0.25 && nx > -0.4) return gull ? R.c : R.b;
    if (sp === 'gorrion' && ny < 0.2 && (x + y) % 3 === 0) return C.streak;
    if (dove && ny < -0.1 && nx < 0.3 && (x % 3 === 0)) return C.bar;
  } });
  // Ala plegada
  A.blob(7.2, by - 0.2, 2.6 * k, 1.4 * k, wing, { d: -1, pat: (x, y, nx) => (gull && nx < -0.5 ? C.tip : null) });
  // Cabeza
  A.blob(hx, hy, 1.7 * k * (cria ? 1.15 : 1), 1.6 * k * (cria ? 1.15 : 1), gull ? R.c : body, { pat: (x, y, nx, ny) => {
    if (sp === 'gorrion' && ny < -0.3) return R.cap;
    if (sp === 'gorrion' && nx > -0.2 && ny > -0.3 && ny < 0.5) return R.cheek;
    if (dove && ny > 0.4) return R.neck;
  } });
  if (dove) { A.px(hx - 0.8, hy + 1.6, C.neck2); A.px(hx - 0.2, hy + 1.8, C.neck); }
  if (sp === 'gorrion' && sex === 'm' && !cria) A.px(hx + 0.6, hy + 1.4, C.bib);
  A.px(hx + 0.5, hy - 0.4, EYE);
  const bx = hx + 1.7 * k;
  A.px(bx, hy, C.beak); if (gull) { A.px(bx + 1, hy + 0.2, C.beak); A.px(bx + 0.5, hy + 0.9, C.spot); }
  if (dove) A.px(bx - 0.6, hy - 0.4, C.cere);
};
const shadeF = (c) => ramp(c)[2];

// Aves de suelo: perdiz, gallina pota blava, oca
S.ave_suelo = (A, o) => {
  const { sp, C, R, cria } = o; const t = stance(o); const body = R.c; const goose = sp === 'oca', hen = sp === 'pota_blava', part = sp === 'perdiz';
  const chick = cria && (goose || hen);
  const cb = chick ? ramp(goose ? '#e8d880' : '#e0c870') : body;
  if (t.sleep) { A.blob(8, 11.8, 4.2, 2.6, cb, { pat: (x, y, nx, ny) => (part && ny > 0.3 && x % 2 ? R.bar : null) }); A.blob(10.4, 10, 1.7, 1.5, cb); A.px(11.2, 10, body[1]); return; }
  const hop = t.walk ? [0, -0.6, 0, -0.6][o.f & 3] : 0; const flap = t.fly >= 0;
  const by = 11 + hop - (flap ? 1 : 0), peck = t.idle === 1;
  const legC = hen ? C.legs : goose ? C.feet : C.red;
  A.line(7.6, by + 2, 7.6 + t.a * 0.5, 14 - (flap ? 1 : 0), legC); A.line(8.8, by + 2, 8.8 + t.b * 0.5, 14 - (flap ? 1 : 0), shadeF(legC));
  if (hen && !chick) A.chain([[5, by - 0.8, 1.1], [3.4, by - 3, 1], [4.4, by - 4.6, 0.6]], ramp(C.sheen), {});
  if (goose && !chick) A.poly([[4.4, by - 0.6], [2.2, by - 1.6], [2.8, by + 0.8]], body[3]);
  A.blob(8, by, (goose ? 4.2 : 3.7) * (chick ? 0.8 : 1), 2.6 * (chick ? 0.85 : 1), cb, { pat: (x, y, nx, ny) => {
    if (part && ny > 0 && ny < 0.75 && nx < 0.3 && x % 2 === 0) return R.bar;
    if (part && ny > 0.3 && nx > 0.2) return R.b;
    if (hen && !chick && ny < -0.3 && nx < 0) return R.sheen;
  } });
  if (flap) { A.poly([[6, by - 1], [10, by - 1], [7, by - (t.fly === 0 ? 5.4 : 1.8)], [5, by - (t.fly === 0 ? 4.6 : 0.6)]], cb[t.fly === 0 ? 4 : 2]); }
  else A.blob(7.4, by - 0.1, 2.5, 1.4, cb, { d: -1 });
  // Cuello y cabeza
  let hx = 11, hy = 8 + hop;
  if (goose && !chick) { hx = 11.8; hy = peck ? 10.4 : 4.6 + hop; A.capsule(10.2, by - 1, hx - 0.2, hy + 1, 1.2, 0.9, body); }
  else if (peck) { hx = 11.8; hy = 11.6; }
  A.blob(hx, hy, 1.8 * (chick ? 1.2 : 1), 1.6 * (chick ? 1.2 : 1), cb, { edge: true, pat: (x, y, nx, ny) => (part && !cria ? (ny < -0.35 ? ramp('#8a8a8c') : nx > -0.3 ? R.face : null) : null) });
  if (part && !cria) { A.line(hx - 0.8, hy + 1.2, hx + 0.8, hy + 1.2, C.mask); A.px(hx + 0.2, hy - 0.4, C.red); }
  if (hen && !chick) { A.line(hx - 0.6, hy - 1.7, hx + 0.6, hy - 1.7, C.comb); A.px(hx - 0.1, hy - 2.3, C.comb); A.px(hx + 1.2, hy + 1.2, C.comb); }
  A.px(hx + 0.5, hy - 0.4, EYE);
  A.px(hx + 1.8, hy + 0.1, goose ? C.beak : part ? C.red : '#e8c040'); if (goose) A.px(hx + 2.6, hy + 0.3, C.beak);
};

// Rapaces posadas: lechuza, cernícalo, águila, halcón
S.rapaz = (A, o) => {
  const { sp, C, R, cria } = o; const t = stance(o); const body = R.c; const owl = sp === 'lechuza', eag = sp === 'aguila';
  const k = eag ? 1.1 : 1;
  if (t.fly >= 0) {
    const up = t.fly === 0; const cy = 8;
    const span = (x0, x1, yt) => A.poly([[x0, cy], [x1, cy], [x1 + (x1 > 8 ? 2.6 : -2.6), yt]], (x, y) => body[up ? 3 : 2]);
    A.poly([[1.4, cy + (up ? -4.6 : 3.6)], [6.2, cy - 0.8], [9.8, cy - 0.8], [14.6, cy + (up ? -4.6 : 3.6)], [10.4, cy + 1], [5.6, cy + 1]], (x, y) => (Math.abs(x - 7.5 - (A.flip ? 0 : 0)) > 5 && !owl ? body[1] : body[up ? 4 : 2]));
    A.blob(8, cy + 0.6, 2.2, 3 * k, body, { pat: (x, y, nx, ny) => (ny > -0.1 ? R.b : null) });
    A.blob(8.8, cy - 2.4, 1.8, 1.6, owl ? R.face : sp === 'cernicalo' ? R.head : body); A.px(9.6, cy - 2.4, EYE); A.px(10.6, cy - 2, C.beak || '#e8c040');
    return;
  }
  if (t.sleep) { A.blob(8, 10.4, 3.2, 3.8, body, { pat: (x, y, nx, ny) => (ny > 0.2 ? R.b : null) }); A.blob(8.4, 6.6, 2.4, 2, owl ? R.face : body); A.line(8.4, 6.6, 9.6, 6.6, body[1]); return; }
  const hop = t.walk ? [0, -1, 0, -1][o.f & 3] : 0; const turn = owl && t.idle === 1;
  const by = 10 + hop;
  A.px(7.4 + t.a * 0.4, 14, C.beak || '#e8c040'); A.px(9.2 + t.b * 0.4, 14, C.beak || '#e8c040');
  A.poly([[6.4, 12 + hop], [8.6, 12 + hop], [8, 14.2], [6.8, 14.2]], body[1]); // cola
  A.blob(8, by, 3.1 * k, 3.6 * k, body, { pat: (x, y, nx, ny) => {
    if (owl && nx > -0.3) return (x + y) % 4 === 0 ? C.spot : R.b;
    if (nx > 0.15 && ny > -0.4) return (x + y * 2) % 3 === 0 && !owl ? (sp === 'halcon' ? C.bar : C.spot) : R.b;
    if (sp === 'cernicalo' && ny < 0.4 && (x * 2 + y) % 4 === 0) return C.spot;
  } });
  A.blob(6.8, by - 0.2, 2.2, 3 * k, body, { d: -1 }); // ala plegada
  const hy = 5.6 + hop - (eag ? 0.4 : 0);
  if (owl) {
    A.blob(8.4, hy, 2.6, 2.3, R.c);
    if (turn) { A.blob(8.4, hy + 0.2, 2, 1.8, R.face, { lo: 3, hi: 5 }); A.px(7.6, hy, EYE); A.px(9.2, hy, EYE); A.px(8.4, hy + 0.9, C.rim); }
    else { A.blob(9.4, hy + 0.2, 1.6, 1.8, R.face, { lo: 3, hi: 5 }); A.px(9.8, hy - 0.1, EYE); A.px(10.6, hy + 0.6, C.rim); }
    return;
  }
  A.blob(8.8, hy, 2.1 * k, 1.9 * k, sp === 'cernicalo' ? R.head : body, { pat: (x, y, nx, ny) => (eag && nx < 0 && ny < 0.2 ? R.nape : sp === 'halcon' && nx > 0 && ny > 0 ? R.b : null) });
  if (sp === 'halcon') A.line(9.6, hy + 0.4, 9.6, hy + 1.8, C.mous);
  A.px(9.6, hy - 0.4, EYE); A.px(11, hy + 0.1, C.beak); A.px(11, hy + 0.9, C.hook || '#3a3438');
};

// Garza real
S.zancuda = (A, o) => {
  const { C, R } = o; const t = stance(o); const body = R.c;
  if (t.fly >= 0) {
    const up = t.fly === 0;
    A.poly([[2, 8 + (up ? -5 : 4)], [6, 7], [10, 7], [14, 8 + (up ? -5 : 4)], [10, 9], [6, 9]], body[up ? 4 : 2]);
    A.blob(8, 8, 3.4, 1.5, body); A.blob(11.6, 7.2, 1.4, 1.2, R.b); A.line(12.6, 7.4, 14.4, 7.8, C.beak); A.line(4.6, 8.4, 1.6, 9, C.legs); return;
  }
  const sl = t.sleep, strike = t.idle === 1; const f = o.f & 3;
  const by = 7 + (sl ? 1 : 0);
  // Patas largas
  if (!sl) A.line(8, by + 2, 8 + (t.walk ? t.b * 1.4 : 0), 14 - (t.walk ? t.lb : 0), shadeF(C.legs)); A.line(8, by + 2, 8 + (t.walk ? t.a * 1.4 : 0), 14, C.legs);
  A.blob(7.6, by, 3.4, 2.2, body, { pat: (x, y, nx, ny) => (ny > 0.3 ? R.b : nx < -0.5 ? body[1] : null) });
  A.poly([[4.6, by - 0.4], [2.2, by + 1.4], [4.8, by + 1.2]], body[2]);
  if (sl) { A.blob(10, by - 1.6, 1.4, 1.3, R.b); A.px(10.4, by - 1.8, EYE); A.line(11.2, by - 1.4, 12.6, by - 0.8, C.beak); return; }
  const nx = strike ? 12.6 : 11.2, ny = strike ? 6 : 2.6;
  A.chain([[9.6, by - 1, 0.9], [10.6, by - 2.6, 0.7], [nx - 0.6, ny + 1.4, 0.7]], R.b);
  A.blob(nx, ny, 1.4, 1.2, R.b); A.line(nx - 1, ny - 0.8, nx - 2.6, ny - 0.4, C.crest);
  A.px(nx + 0.3, ny - 0.3, EYE); A.line(nx + 1.2, ny + 0.2, nx + 2.6, ny + (strike ? 1.4 : 0.6), C.beak);
};

// Ánade real
S.pato = (A, o) => {
  const { C, R, sex, cria } = o; const t = stance(o); const drake = sex === 'm' && !cria;
  const body = drake ? ramp(C.body) : cria ? ramp('#c8b070') : R.c;
  const wad = t.walk ? [0, -0.5, 0, -0.5][o.f & 3] : 0; const tilt = t.walk ? [0.4, 0, -0.4, 0][o.f & 3] : 0;
  if (t.fly >= 0) {
    const up = t.fly === 0;
    A.blob(8, 8, 3.8, 1.7, body); A.poly([[5.5, 7.6], [10.4, 7.6], [7.6, up ? 2.2 : 13.6], [6.2, up ? 2.8 : 13]], body[up ? 4 : 2]);
    A.px(7, up ? 6 : 10, C.spec); A.blob(12, 7, 1.5, 1.3, drake ? R.head : body); A.px(12.4, 6.6, EYE); A.px(13.6, 7.2, drake ? C.beak : C.beakf); return;
  }
  if (t.sleep) { A.blob(8, 12, 4.2, 2.3, body); A.blob(10, 10.4, 1.5, 1.3, drake ? R.head : body); A.px(9.2, 10.6, drake ? C.beak : C.beakf); return; }
  const by = 11.4 + wad;
  A.px(7.4 + t.a * 0.4, 14, C.feet); A.px(9 + t.b * 0.4, 14, C.feet);
  A.blob(7.6, by, 4.3, 2.3, body, { pat: (x, y, nx, ny) => {
    if (drake && nx > 0.55) return R.breast;
    if (drake && nx < -0.62) return R.rear;
    if (!drake && (x + y * 3) % 4 === 0) return R.b;
  } });
  A.blob(7, by - 0.4, 2.8, 1.3, body, { d: -1 }); A.px(5.6, by - 0.2, C.spec);
  if (drake) A.px(3.6, by - 1.6, R.rear[3]); // rizo de la cola
  const peck = t.idle === 1; const hx = 11.4 + (peck ? 0.8 : 0), hy = 8.4 + wad + tilt + (peck ? 3 : 0);
  A.blob(hx, hy, 1.8 * (cria ? 1.15 : 1), 1.6 * (cria ? 1.15 : 1), drake ? R.head : body);
  if (drake) A.line(hx - 1, hy + 1.6, hx + 0.8, hy + 1.6, C.ring);
  A.px(hx + 0.4, hy - 0.4, EYE); A.rect(hx + 1.5, hy + 0.1, 1.4, 1, drake ? C.beak : C.beakf);
};

// Rana común: salto en cuatro tiempos
S.rana = (A, o) => {
  const { C, R } = o; const t = stance(o); const body = R.c; const f = o.f & 3;
  const jump = t.walk ? [0, -0.6, -2.8, -0.8][f] : 0, ext = t.walk && f === 2;
  const by = 12.2 + jump; const pulse = t.idle === 1;
  const spot = (x, y, nx, ny) => (ny > 0.45 ? R.b : (x * 3 + y) % 5 === 0 && ny < 0.2 ? C.spot : null);
  if (ext) A.chain([[5.4, by + 0.4, 1], [3, by + 2, 0.7], [1.6, by + 2.4, 0.5]], body, { d: -1 });
  else A.blob(5.2, by + 0.6, 2, 1.6, body, { d: -1, pat: spot });
  A.blob(8.4, by, 3.6, 2.2, body, { pat: spot });
  if (pulse || t.sleep) A.blob(10.6, by + 1.4, 1.6, 0.9, R.b, { lo: 4 });
  A.blob(10.2, by - 1.8, 1.1, 1, body, { d: 1 }); A.px(10.4, by - 2, t.sleep ? body[1] : EYE); if (!t.sleep) A.px(10.1, by - 2.4, GLINT);
  A.line(11.6, by - 0.2, 12.2, by - 0.2, body[1]); // boca
  A.px(10.8 + (ext ? 1 : 0), by + 1.8, body[2]); A.px(11.2 + (ext ? 1 : 0), by + 2.2, body[3]);
};

// Galápago y tortuga
S.tortuga = (A, o) => {
  const { sp, C, R } = o; const t = stance(o); const gal = sp === 'galapago'; const skin = gal ? R.skin : R.skin;
  const step = t.walk ? (o.f & 1) * 0.5 : 0; const sl = t.sleep;
  const by = gal ? 11.8 : 11.2;
  if (!sl) { A.blob(4.4 + t.a * 0.4, 13.4, 1.1, 0.9, skin, { d: -1 }); A.blob(9.6 + t.b * 0.4, 13.4, 1.1, 0.9, skin, { d: -1 }); }
  const hx = 12.4 + (t.idle ? 0.6 : 0) - (sl ? 1.4 : 0);
  if (!sl) { A.capsule(10.6, by + 1, hx, by + 0.6 - step, 1, 1, skin, { pat: (x, y) => (gal && y % 2 === 0 ? C.stripe : null) }); A.blob(hx + 0.6, by + 0.4 - step, 1.3, 1.1, skin); A.px(hx + 1, by - 0.1 - step, EYE); }
  A.blob(7.6, by, 4.6, gal ? 2.4 : 3, R.c, { clip: (x, y, nx, ny) => ny < 0.62, pat: (x, y, nx, ny) => {
    if (gal) return (x + y) % 4 === 0 ? R.c[1] : null;
    const cx = Math.round(nx * 4.6), cy = Math.round(ny * 3); return (Math.abs(cx % 3) === 0 && cy % 2 === 0) || (Math.abs(cx % 3) === 1 && cy % 2 !== 0) ? R.b : null;
  } });
  A.line(3.4, by + 1.8, 11.8, by + 1.8, R.c[1]);
  if (!sl) { A.blob(6 + t.b * 0.4, 13.8, 1, 0.7, skin); A.blob(10.8 + t.a * 0.4, 13.8, 1, 0.7, skin); }
};

// Lagarto ocelado
S.lagarto = (A, o) => {
  const { C, R } = o; const t = stance(o); const body = R.c; const f = o.f & 3;
  const sw = t.walk ? [1, 0, -1, 0][f] : 0;
  const net = (x, y, nx, ny) => (ny > 0.5 ? R.b : (x + y) % 3 === 0 ? C.net : (x * 5 + y * 3) % 11 === 0 ? C.ocelli : null);
  A.chain([[4.6, 12.6, 1.3], [2.6, 13 + sw * 0.5, 0.9], [1, 12.2 + sw, 0.5]], body, { pat: net });
  A.px(4 + (t.walk ? t.b : 0), 14, body[1]); A.px(9.4 + (t.walk ? t.a : 0), 14, body[1]);
  A.capsule(4.4, 12.4, 10.4, 12.2, 1.6, 1.5, body, { pat: net });
  const hy = 11.8 - (t.idle ? 0.8 : 0);
  A.blob(12, hy, 2, 1.4, body, { pat: (x, y, nx, ny) => (ny > 0.4 ? R.b : null) }); A.px(13.6, hy + 0.2, body[1]);
  A.px(12.4, hy - 0.4, t.sleep ? body[1] : EYE);
  A.px(5.6 + (t.walk ? t.a : 0), 14, body[2]); A.px(10.8 + (t.walk ? t.b : 0), 14, body[2]);
};

// Serpientes: víbora y culebra
S.serpiente = (A, o) => {
  const { sp, C, R } = o; const t = stance(o); const body = R.c; const vip = sp === 'vibora';
  if (t.sleep) {
    const pts = []; for (let i = 0; i < 26; i++) { const a = i * 0.5, r = 4.2 - i * 0.13; pts.push([8 + Math.cos(a) * r, 11.4 + Math.sin(a) * r * 0.55, 1]); }
    A.chain(pts, body, { pat: (x, y) => (vip && (x + y) % 3 === 0 ? C.b : null) }); A.blob(8.4, 11.2, 1.4, 1, body); return;
  }
  const ph = t.walk ? (o.f & 3) * Math.PI / 2 : 0;
  const pts = []; for (let i = 0; i <= 10; i++) { const x = 1.6 + i * 1.02, y = 12.6 + Math.sin(i * 0.9 + ph) * 1.1 * (i / 10 + 0.3); pts.push([x, y, 0.55 + Math.min(i, 7) * 0.08]); }
  A.chain(pts, body, { pat: (x, y, nx, ny) => (ny > 0.35 ? R.belly : vip && ny < 0.2 && ((x + Math.round(y * 0.5)) % 3 === 0) ? C.b : !vip && ny < -0.3 ? body[4] : null) });
  const [hx, hy] = pts[10];
  const raised = t.idle === 1 ? 1.2 : 0;
  A.blob(hx + 1.2, hy - 0.5 - raised, vip ? 1.8 : 1.5, vip ? 1.2 : 1, body); A.px(hx + 1.4, hy - 0.9 - raised, EYE);
  if (t.idle === 1) { A.px(hx + 3, hy - 0.4 - raised, '#d83a3a'); A.px(hx + 3.6, hy - 0.8 - raised, '#d83a3a'); }
};

// Enjambre de abejas
S.enjambre = (A, o) => {
  const { C } = o; const t = stance(o); const f = t.fly >= 0 ? o.f & 1 : o.f & 3;
  const n = t.sleep ? 4 : 7;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39 + f * 0.9 + (t.fly >= 0 ? f * 0.4 : 0), r = t.sleep ? 1.6 : 2.4 + (i % 3) * 1.1;
    const x = 8 + Math.cos(a) * r, y = (t.sleep ? 12.6 : 8.4) + Math.sin(a) * r * 0.7 + ((i + f) % 2 ? 0.4 : 0);
    A.px(x, y, C.c); A.px(x + 1, y, C.b); A.px(x + 1.7, y, C.c);
    if (!t.sleep) A.px(x + 0.6, y - 1, (i + f) % 2 ? C.wing : '#b8d8f0');
  }
};

// ───────────── API del mundo ─────────────
export function animalSprite(sp, dir = 'right', frame = 0, cria = false, sex = 'f', pose = 'walk') {
  const s = SP[sp] || SP.conejo; let p = pose;
  if (p === 'fly' && !FLY_PLANS.has(s.plan)) p = 'walk';
  const n = ANIMAL_POSES[p] || 4; const f = ((frame % n) + n) % n;
  const key = 's' + sp + (dir === 'left' ? 'L' : 'R') + f + (cria ? 'c' : '') + sex + p;
  let cv = cache.get(key); if (cv) return cv;
  const A = new Art(16, 16, dir === 'left', cria ? 0.7 : 1, 8, 14.5);
  const { C, R } = look(sp, cria);
  (S[s.plan] || S.cuadrupedo)(A, { sp, s, C, R, f, cria, sex, pose: p });
  cv = A.canvas(); cache.set(key, cv); return cv;
}

// ───────────── API del combate ─────────────
export function animalBattle(sp, frame = 0, cria = false, sex = 'f', pose = 'idle') {
  const s = SP[sp] || SP.conejo; const key = 'b' + sp + (frame & 1) + (cria ? 'c' : '') + sex + pose;
  let cv = cache.get(key); if (cv) return cv;
  const W = s.size >= 3 ? 64 : 48;
  const A = new Art(W, W, true, cria ? 0.72 : 1, W / 2, W - 2);
  const { C, R } = look(sp, cria);
  const fn = B[s.plan] || B.cuadrupedo;
  fn(A, { sp, s, C, R, f: frame & 1, cria, sex, pose, W });
  cv = A.canvas(); cache.set(key, cv); return cv;
}
const B = {};

// ───────────── Pintores de combate ─────────────
// El mismo sistema de volúmenes a más escala. En coordenadas lógicas el animal mira a la derecha; el lienzo se
// refleja para que mire al jugador (a la izquierda). Poses: idle (respira, f 0/1), attack (embiste o muerde), hurt.
const MOUTH = '#5a1a2c', TONGUE = '#d8606a', FANG = '#f6f0e4';
// Ojo grande: 2×2 con brillo arriba a la izquierda de la pantalla; con iris, 3×2; cerrado, línea quebrada (>).
function eyeB(A, x, y, o = {}) {
  if (o.closed) { A.line(x - 0.6, y, x + 1.4, y + 0.8, o.lid || EYE); A.line(x + 1.4, y + 0.8, x - 0.6, y + 1.6, o.lid || EYE); return; }
  if (o.iris) { A.rect(x - 0.6, y - 0.4, 3, 2.4, o.iris); A.rect(x + 0.4, y - 0.4, o.slit ? 1 : 2, 2.4, EYE); A.px(A.flip ? x + 1.4 : x - 0.6, y - 0.4, GLINT); return; }
  A.rect(x, y, 2, 2, EYE); A.px(A.flip ? x + 1 : x, y, GLINT);
}
// Deformador de poses por regiones del cuerpo
function poser(o, over = {}) {
  const at = o.pose === 'attack', hu = o.pose === 'hurt', br = o.pose === 'idle' && o.f ? 1 : 0;
  const D = at ? { head: [4, 3], front: [2.6, 1.6], mid: [1.3, 0.8], rear: [0.4, 0.2], footF: [3.2, 0], footR: [-1.6, 0], tail: [-1, -2.5] }
    : hu ? { head: [-3, -3.4], front: [-2, -1.2], mid: [-1.3, -0.5], rear: [-0.8, 0], footF: [-1.6, 0], footR: [0, 0], tail: [1.4, 2] }
    : { head: [0, br * 0.9], front: [0, br * 0.6], mid: [0, br * 0.4], rear: [0, br * 0.2], footF: [0, 0], footR: [0, 0], tail: [0, br * 0.6] };
  const k = o.W / 48; if (over[o.pose]) Object.assign(D, over[o.pose]);
  const P = (x, y, reg) => [x + D[reg][0] * k, y + D[reg][1] * k];
  P.at = at; P.hu = hu; P.br = br; P.k = k; return P;
}
// Cadena de puntos [[x,y,r],...] deformada por región (la última región se aplica al último punto)
const chainP = (P, pts, regs) => pts.map(([x, y, r], i) => [...P(x, y, regs[Math.min(i, regs.length - 1)]), r]);
// Pata: cadera → rodilla → pie, con pezuña o zarpa
function legB(A, pts, R, o = {}) {
  A.chain(pts, R, o);
  const [x, y, r] = pts[pts.length - 1];
  if (o.hoof) { A.blob(x + 0.2, y + 0.4, r + 0.3, r * 0.8, ramp(o.hoof), { edge: true }); }
  else A.blob(x + 0.9, y + 0.5, r + 0.8, r * 0.72, o.paw ? ramp(o.paw) : R, { edge: true, d: o.d });
}
function triB(A, pts, R, o = {}) { // triángulo sombreado plano (orejas, picos)
  A.poly(pts, (x, y) => (o.f ? o.f(x, y) : R[o.tone ?? 3]));
}

// Felinos y cánidos de combate
const PAWB = {
  lobo: { torso: [22, 26, 11, 6.5], haunch: [13.5, 26.5, 7.5, 7.5], chest: [31, 26.5, 7.5, 8], neck: [31.5, 23, 36, 17, 6, 4.6],
    head: [38.5, 15, 5.4, 4.6], muzzle: [41.5, 17.4, 45.2, 19, 2.8, 1.8], ears: [[34.4, 12, 37.6, 11.2, 35, 5], [37.4, 11, 40.8, 11.6, 39.8, 4.4]],
    rf: [[12, 30, 3.2], [9.8, 38, 2.2], [11, 44.2, 1.7]], rn: [[16, 31, 3.4], [13.8, 39, 2.3], [15, 44.4, 1.8]],
    ff: [[29.4, 31, 3], [29.6, 38.5, 2.1], [30, 44.2, 1.7]], fn: [[33, 32, 3.2], [33.6, 39.5, 2.2], [34, 44.4, 1.8]],
    tail: [[8, 22, 2.8], [4.8, 27, 3.4], [3.2, 33, 2.8], [3.8, 37.5, 1.6]], eye: [39.6, 13.4], eye2: [43.2, 13.6] },
  zorro: { torso: [22, 29, 10, 5.5], haunch: [14, 29.5, 6.5, 6.5], chest: [30, 29.5, 6.5, 6.8], neck: [30.5, 27, 34.5, 21.5, 5, 3.8],
    head: [37, 19.5, 4.8, 4.2], muzzle: [40, 21.6, 44.6, 23, 2.4, 1.3], ears: [[33, 17, 36.2, 16, 33.4, 8.2], [36, 15.8, 39.6, 16.4, 38.8, 7.6]],
    rf: [[13, 33, 2.6], [11.2, 39.5, 1.7], [12.2, 44.4, 1.4]], rn: [[16.5, 34, 2.8], [14.8, 40, 1.8], [15.8, 44.6, 1.5]],
    ff: [[28.5, 33.5, 2.4], [28.8, 39.5, 1.6], [29.2, 44.4, 1.4]], fn: [[31.5, 34.5, 2.6], [32, 40.5, 1.7], [32.4, 44.6, 1.5]],
    tail: [[9, 27, 3], [5, 31, 4.4], [3.6, 36.4, 3.8], [5, 41, 2]], eye: [38, 18], eye2: [41.4, 18.2] },
  lince: { torso: [22, 26.5, 10.5, 6.5], haunch: [14, 26.5, 7, 7.2], chest: [30.5, 27, 7, 7.5], neck: [31, 24, 34, 19, 5.6, 4.8],
    head: [36.6, 17, 5.8, 5.2], muzzle: [39.6, 19.4, 42.6, 20.4, 3, 2.4], ears: [[31.8, 14, 34.8, 12.6, 32.6, 6.4], [35.4, 12.2, 39, 12.6, 37.8, 5.6]],
    rf: [[12.6, 30, 3.4], [10.6, 38, 2.4], [11.8, 44.2, 2]], rn: [[16.4, 31, 3.6], [14.6, 39, 2.5], [15.8, 44.4, 2.1]],
    ff: [[28.6, 31.5, 3.2], [28.8, 38.6, 2.3], [29.4, 44.2, 2]], fn: [[32.2, 32.5, 3.4], [32.6, 39.6, 2.4], [33.2, 44.4, 2.1]],
    tail: [[8.4, 22.5, 2.4], [6.2, 25, 2.2], [5.4, 27.4, 1.8]], eye: [37.6, 15.4], eye2: [41.2, 15.6] },
  gato: { torso: [23, 33.5, 8, 4.8], haunch: [16.6, 33.4, 5.6, 5.6], chest: [29.4, 33.6, 5.4, 5.6], neck: null,
    head: [34.4, 27, 5.4, 4.8], muzzle: [37.2, 29.2, 39.4, 29.8, 2.1, 1.7], ears: [[29.6, 24.6, 32.8, 23.4, 30.6, 18.4], [33.4, 23, 37, 23.6, 36.2, 18]],
    rf: [[16, 36.5, 2.4], [14.6, 41.2, 1.6], [15.4, 44.6, 1.4]], rn: [[19, 37, 2.6], [17.8, 41.6, 1.7], [18.6, 44.8, 1.5]],
    ff: [[27.6, 37, 2.2], [27.8, 41.4, 1.5], [28.2, 44.6, 1.4]], fn: [[30.4, 37.4, 2.4], [30.8, 41.8, 1.6], [31.2, 44.8, 1.5]],
    tail: [[11.6, 31.6, 1.7], [8.8, 27, 1.6], [8.4, 21.4, 1.5], [10.2, 17.6, 1.4]], eye: [34.8, 25.4], eye2: [38.2, 25.6] },
};
B.gato = B.perro = (A, o) => { if (o.sp === 'gato') scaled(A, 1.2, () => pawBattle(A, o)); else pawBattle(A, o); };
function pawBattle(A, o) {
  const { sp, C, R, cria } = o; const G = PAWB[sp] || PAWB.gato; const P = poser(o);
  const fox = sp === 'zorro', wolf = sp === 'lobo', cat = sp === 'gato', lynx = sp === 'lince';
  const body = R.c, belly = R.b; const sockR = fox ? ramp(C.sock) : null;
  const coat = (x, y, nx, ny) => {
    if (ny > 0.45) return belly;
    if (cat && ny < 0.5 && Math.floor(x / 2.4) % 2 === 0 && (x + y) % 5 !== 0) return R.stripe;
    if (lynx && ny < 0.5 && ((x * 7 + y * 13) % 17 < 2)) return C.spot;
    if (wolf && ny < -0.5) return R.dark;
  };
  const legR = (lower) => (fox && lower ? sockR : body);
  const L = (pts, near) => legB(A, chainP(P, pts, near ? ['front', 'mid', 'footF'] : ['front', 'mid', 'footF']), body, { d: near ? 0 : -1, edge: true, paw: fox ? C.sock : null });
  const LR = (pts, near) => legB(A, chainP(P, pts, ['rear', 'rear', 'footR']), body, { d: near ? 0 : -1, edge: true, paw: fox ? C.sock : null });
  // Patas lejanas
  LR(G.rf, false); L(G.ff, false);
  if (fox) { for (const g of [G.rf, G.ff]) { const p = chainP(P, g, ['front', 'mid', g === G.rf ? 'footR' : 'footF']); A.chain(p.slice(1), sockR, { d: -1 }); } }
  // Cola
  const tail = chainP(P, G.tail, ['rear', 'tail']);
  if (lynx) A.chain(tail, body, { edge: true, pat: (x, y, nx, ny) => (x < A.tx(tail[2][0] + 0.5) ? C.tuft : null) });
  else A.chain(tail, body, { edge: true, pat: (x, y, nx, ny) => {
    const lx = x; const end = tail[tail.length - 1];
    if (fox && Math.hypot(lx + 0.5 - A.tx(end[0]), y + 0.5 - A.ty(end[1])) < 3.2 * A.k) return R.tip;
    if (wolf && ny < -0.3) return R.dark; if (cat && y % 3 === 0) return R.stripe;
  } });
  // Cuerpo: anca, tronco, pecho y cuello fundidos en un volumen
  const [hx0, hy0] = P(G.haunch[0], G.haunch[1], 'rear'), [tx0, ty0] = P(G.torso[0], G.torso[1], 'mid'), [cx0, cy0] = P(G.chest[0], G.chest[1], 'front');
  const parts = [['e', hx0, hy0, G.haunch[2], G.haunch[3] + P.br * 0.3], ['e', tx0, ty0, G.torso[2], G.torso[3] + P.br * 0.4], ['e', cx0, cy0, G.chest[2], G.chest[3]]];
  if (G.neck) { const [a, b2, c2, d2, r0, r1] = G.neck; const [x0, y0] = P(a, b2, 'front'), [x1, y1] = P(c2, d2, 'head'); parts.push(['c', x0, y0, x1, y1, r0, r1]); }
  const front = (x) => x > A.tx(cx0 - 2);
  A.mass(parts, body, { pat: (x, y, nx, ny, I, m) => {
    if ((fox || wolf || lynx) && front(x) && m.fd < (fox ? 4 : 3) && m.td > 2) return belly; // pecho y garganta
    if (m.bd < (cat ? 2 : 3) && m.td > 3) return belly; // vientre
    if (wolf && m.td < 3) return R.dark; // lomo
    if (fox && m.td < 2) return ramp(R.c[2]);
    if (cat && Math.floor(x / 2.4) % 2 === 0 && m.bd > 2 && (x + y) % 5 !== 0) return R.stripe;
    if (lynx && m.bd > 2 && ((x * 7 + y * 13) % 17 < 2)) return C.spot;
    // pelo: trazos sueltos algo más oscuros
    if (m.d > 2 && (x * 5 + y * 3) % 11 === 0 && y % 2 === 0) return ramp(body[2]);
  } });
  const [hx, hy] = P(G.head[0], G.head[1], 'head'); const dx = hx - G.head[0], dy = hy - G.head[1];
  const ears = G.ears.map(([a, b2, c2, d2, e, f2]) => {
    const back = P.hu ? [-3, 3] : [0, 0]; return [[a + dx, b2 + dy], [c2 + dx, d2 + dy], [e + dx + back[0], f2 + dy + back[1]]];
  });
  triB(A, ears[0], body, { tone: 2 });
  if (fox) triB(A, ears[0], body, { f: () => C.sock });
  const hs = cria ? 1.15 : 1;
  A.blob(hx, hy, G.head[2] * hs, G.head[3] * hs, body, { edge: true, pat: (x, y, nx, ny) => (ny > 0.25 && nx > -0.1 ? belly : wolf && ny < -0.4 ? R.dark : cat && ny < -0.5 && x % 3 === 0 ? R.stripe : null) });
  triB(A, ears[1], body, { f: (x, y) => (fox ? (y < A.ty(ears[1][2][1] + 2.4) ? C.sock : body[4]) : body[4]) });
  A.poly([[ears[1][0][0] + 1, ears[1][0][1] - 0.6], [ears[1][1][0] - 1, ears[1][1][1] - 0.6], [ears[1][2][0], ears[1][2][1] + 2.4]], fox ? C.b : (C.nose && cat ? C.nose : belly[2]));
  if (lynx) { A.line(ears[0][2][0], ears[0][2][1], ears[0][2][0] - 0.4, ears[0][2][1] - 3, C.tuft); A.line(ears[1][2][0], ears[1][2][1], ears[1][2][0] + 0.2, ears[1][2][1] - 3.4, C.tuft); }
  // Hocico (abierto al atacar)
  const [m0, m1, m2, m3, mr0, mr1] = G.muzzle; const mx0 = m0 + dx, my0 = m1 + dy, mx1 = m2 + dx, my1 = m3 + dy;
  if (P.at) {
    A.capsule(mx0 - 0.4, my0 + 1.6, mx1 - 0.8, my1 + 3.6, mr0 * 0.8, mr1 * 0.8, body, { edge: true, pat: (x, y, nx, ny) => (ny > -0.2 ? belly : null) });
    A.blob((mx0 + mx1) / 2 + 0.6, (my0 + my1) / 2 + 1.8, (mx1 - mx0) / 2, 1.4, ramp(MOUTH), { lo: 2, hi: 3 });
    A.px(mx1 - 1.2, my1 + 2.2, TONGUE);
    A.capsule(mx0, my0 - 0.6, mx1, my1 - 1.6, mr0, mr1, body, { edge: true, pat: (x, y, nx, ny) => (ny > 0.35 ? belly : null) });
    A.px(mx1 - 0.6, my1 - 0.2, FANG); A.px(mx1 - 2.2, my1 + 0.2, FANG); A.px(mx1 - 1.2, my1 + 2.8, FANG);
    A.rect(mx1 + 0.2, my1 - 2.6, 1.6, 1.4, EYE);
  } else {
    A.capsule(mx0, my0, mx1, my1, mr0, mr1, body, { edge: true, pat: (x, y, nx, ny) => (ny > 0.15 ? belly : null) });
    A.rect(mx1 - (cat ? 0.6 : 0.2), my1 - (cat ? 1.2 : 1.6), cat ? 1.4 : 2, cat ? 1.2 : 1.6, cat ? C.nose || EYE : EYE);
    A.line(mx1 - 3.4, my1 + 1, mx1 - 0.6, my1 + 1, body[1]);
  }
  if (lynx) { A.blob(hx - 1.6, hy + 4.2, 3, 1.8, belly, { edge: true, pat: (x, y) => (x % 2 ? belly[4] : null) }); }
  // Ojos (el lejano asoma: vista de tres cuartos)
  const ex = G.eye[0] + dx, ey = G.eye[1] + dy;
  const iris = cat ? '#b8d040' : lynx ? '#d0c040' : wolf ? '#e8b030' : fox ? '#e8a030' : null;
  eyeB(A, ex, ey, { closed: P.hu, iris, slit: cat || lynx });
  if (!P.hu) A.px(G.eye2[0] + dx, G.eye2[1] + dy, EYE); else A.px(G.eye2[0] + dx, G.eye2[1] + dy + 0.6, body[1]);
  // Patas cercanas
  LR(G.rn, true); L(G.fn, true);
  if (fox) { for (const g of [G.rn, G.fn]) { const p = chainP(P, g, ['front', 'mid', g === G.rn ? 'footR' : 'footF']); A.chain(p.slice(1), sockR, {}); const [x, y, r] = p[p.length - 1]; A.blob(x + 0.9, y + 0.5, r + 0.8, r * 0.72, sockR, { edge: true }); } }
}

// Utilidades de piezas deformadas por la pose
const Ep = (P, x, y, rx, ry, reg) => ['e', ...P(x, y, reg), rx, ry];
const Cp = (P, x0, y0, x1, y1, r0, r1, reg0, reg1 = reg0) => ['c', ...P(x0, y0, reg0), ...P(x1, y1, reg1), r0, r1];
const furStroke = (x, y, m, R, n = 11) => (m.d > 2 && hash(x, y >> 1, 7) < 1.6 / n && y % 2 === 0 ? ramp(R[2]) : null);
// Boca abierta genérica (mandíbula inferior bajada, interior oscuro, colmillos)
function openMouth(A, mx0, my0, mx1, my1, r0, r1, R, belly, fangs = 2) {
  A.capsule(mx0 - 0.4, my0 + 1.6, mx1 - 0.8, my1 + 3.4, r0 * 0.8, r1 * 0.8, R, { edge: true, pat: (x, y, nx, ny) => (belly && ny > -0.2 ? belly : null) });
  A.blob((mx0 + mx1) / 2 + 0.6, (my0 + my1) / 2 + 1.8, Math.max(1.2, (mx1 - mx0) / 2), 1.4, ramp(MOUTH), { lo: 2, hi: 3 });
  A.capsule(mx0, my0 - 0.6, mx1, my1 - 1.4, r0, r1, R, { edge: true, pat: (x, y, nx, ny) => (belly && ny > 0.35 ? belly : null) });
  for (let i = 0; i < fangs; i++) A.px(mx1 - 0.8 - i * 1.6, my1 - 0.2, FANG);
}

// Pezuñas de combate: jabalí, corzo, ciervo (64), cabra montés
B.cuadrupedo = (A, o) => {
  const { sp, C, R, cria } = o; const P = poser(o); const male = o.sex === 'm' && !cria; const body = R.c, belly = R.b;
  const hoofC = '#2a2024';
  if (sp === 'jabali') {
    const L = (pts, near, rear) => legB(A, chainP(P, pts, rear ? ['rear', 'rear', 'footR'] : ['front', 'mid', 'footF']), body, { d: near ? 0 : -1, edge: true, hoof: hoofC });
    L([[13, 34, 3], [12, 40, 2.2], [12.6, 44.6, 1.8]], false, true); L([[29, 35, 3], [29.2, 40.5, 2.2], [29.8, 44.6, 1.8]], false, false);
    A.chain(chainP(P, [[7, 24.5, 0.8], [5.6, 27.5, 0.7], [5, 31, 0.6]], ['rear', 'tail']), body, {}); const [tx, ty] = P(5, 31.5, 'tail'); A.blob(tx, ty + 1, 1, 1.6, R.b, {});
    A.mass([Ep(P, 14, 29, 8, 8, 'rear'), Ep(P, 22, 27, 12, 8.6, 'mid'), Ep(P, 30.5, 27.6, 8.4, 9.6, 'front')], body, { pat: (x, y, nx, ny, I, m) => {
      if (cria && m.td > 1 && m.bd > 1 && Math.floor((y - 20) / 2.2) % 2 === 0) return R.stripe;
      if (m.td < 2) return ramp(body[1]);
      if (m.d > 1 && hash(x, y >> 1, 3) < 0.22 && (y & 1)) return ramp(body[2]);
    } });
    // Crin erizada
    for (let x = 16; x <= 34; x += 2) { const [bx, by] = P(x, 18.6 + Math.abs(x - 27) * 0.18, x > 26 ? 'front' : 'mid'); A.line(bx, by + 1.4, bx - 1, by - 1.6 - (x % 4 === 0 ? 1 : 0), body[1]); }
    // Cabeza en cuña con jeta y colmillos
    const [hx, hy] = P(37, 30, 'head');
    A.poly([[hx - 3.6, hy - 5.6], [hx - 1.4, hy - 11], [hx + 0.4, hy - 5.2]], body[2]);
    A.mass([['e', hx, hy, 6.2, 5.6], ['c', hx + 2.4, hy + 1.6, hx + 8, hy + 3.4, 3.6, 2.6]], body, { edge: true, pat: (x, y, nx, ny, I, m) => (m.d > 1 && hash(x, y >> 1, 5) < 0.2 && (y & 1) ? ramp(body[2]) : null) });
    A.blob(hx + 8.4, hy + 2.6, 1.3, 2.6, R.snout, { edge: true }); A.px(hx + 8.6, hy + 2, EYE); A.px(hx + 8.6, hy + 3.6, EYE);
    if (!cria) A.chain([[hx + 5, hy + 5.2, 0.9], [hx + 6.8, hy + 4.4, 0.8], [hx + 7.4, hy + 2, 0.55]], ramp(C.tusk), {});
    if (P.at) { A.line(hx + 2, hy + 5.4, hx + 6.6, hy + 5.6, MOUTH); }
    eyeB(A, hx + 1, hy - 2.2, { closed: P.hu });
    L([[16.5, 35, 3.2], [15.6, 41, 2.3], [16.2, 44.8, 1.9]], true, true); L([[32.5, 36, 3.2], [32.8, 41.2, 2.3], [33.4, 44.8, 1.9]], true, false);
    return;
  }
  const deer = sp === 'corzo' || sp === 'ciervo', goat = sp === 'cabra_montes', big = sp === 'ciervo';
  const Pc = poser(o, { hurt: { head: [-3, big ? -0.6 : -1.4], front: [-2, -0.6] } });
  // Geometría (48 px; el ciervo se diseña en 64)
  const G = big ? {
    haunch: [20, 34, 9, 9], torso: [30, 33, 13.5, 8], chest: [40, 34, 8.5, 9.6], neck: [40.5, 30, 46.4, 21.4, 6.6, 4.8], head: [49, 19.4, 5.4, 4.4], muzzle: [51.4, 21.4, 57.4, 23.4, 3, 2],
    ears: [[44.4, 17.2, 47.4, 16.4, 42.6, 11.6], [47.2, 15.8, 50.6, 16.8, 50.8, 10.8]], eye: [50.4, 17.4], eye2: [54.8, 17.4],
    rf: [[18.4, 38, 3.6], [16, 48, 2.2], [17.4, 60.6, 1.7]], rn: [[22.6, 39, 3.8], [20.4, 49, 2.3], [21.8, 60.8, 1.8]], ff: [[38.4, 39.6, 3.2], [38.6, 49.6, 2.1], [39.2, 60.6, 1.7]], fn: [[42.4, 40.6, 3.4], [42.8, 50.6, 2.2], [43.4, 60.8, 1.8]], tail: [10.8, 27.6] }
    : goat ? {
    haunch: [15, 27.5, 7, 7.5], torso: [22.5, 27, 10.5, 7], chest: [30, 28, 7, 8], neck: [30.5, 25, 34.4, 18.4, 5, 4], head: [36.4, 16.8, 4.2, 3.8], muzzle: [38.2, 18.4, 42.4, 20.2, 2.6, 1.8],
    ears: [[33.2, 15.6, 35.4, 14.8, 31, 15.4], [34.8, 14.8, 37, 15.6, 32.6, 16.6]], eye: [37.4, 15.4], eye2: [40.6, 15.6],
    rf: [[13.6, 32, 3.2], [12, 38.6, 2.2], [12.8, 44.6, 1.8]], rn: [[17, 33, 3.4], [15.6, 39.4, 2.3], [16.4, 44.8, 1.9]], ff: [[28.6, 33.4, 3], [28.8, 39.6, 2.1], [29.4, 44.6, 1.8]], fn: [[31.8, 34.4, 3.2], [32.2, 40.4, 2.2], [32.8, 44.8, 1.9]], tail: [8.4, 23.4] }
    : {
    haunch: [15, 24, 6.5, 6.5], torso: [22, 23.6, 10, 5.4], chest: [29.6, 24, 6, 6.6], neck: [30, 21, 34.6, 12, 4.2, 3], head: [36.8, 10.4, 4.2, 3.4], muzzle: [38.8, 12, 43.4, 13.6, 2.4, 1.6],
    ears: [[33, 8.6, 35.6, 7.8, 31.8, 2.8], [35.2, 7.6, 37.8, 8.4, 37.4, 2.2]], eye: [37.6, 9], eye2: [41, 9.2],
    rf: [[14, 27.5, 2.6], [12.2, 35.6, 1.5], [13.4, 44.6, 1.2]], rn: [[17, 28.4, 2.8], [15.2, 36.6, 1.6], [16.4, 44.8, 1.3]], ff: [[28, 28.6, 2.2], [28.2, 36.6, 1.4], [28.6, 44.6, 1.2]], fn: [[31, 29.6, 2.4], [31.2, 37.6, 1.5], [31.6, 44.8, 1.3]], tail: [8.8, 20.4] };
  const legR = goat && male ? R.dark : body;
  const L = (pts, near, rear) => legB(A, chainP(Pc, pts, rear ? ['rear', 'rear', 'footR'] : ['front', 'mid', 'footF']), legR, { d: near ? 0 : -1, edge: true, hoof: hoofC });
  L(G.rf, false, true); L(G.ff, false, false);
  // Cola
  const [tx, ty] = Pc(G.tail[0], G.tail[1], 'rear'); A.blob(tx, ty + (Pc.at ? -1 : 0), big ? 2.4 : 1.8, big ? 3 : 2.4, deer ? R.rump || belly : R.dark, { edge: true });
  // Cuerpo
  const [cx0] = Pc(G.chest[0], G.chest[1], 'front'); const [hx0] = Pc(G.haunch[0], G.haunch[1], 'rear');
  const parts = [Ep(Pc, ...G.haunch, 'rear'), Ep(Pc, ...G.torso, 'mid'), Ep(Pc, ...G.chest, 'front')];
  { const [a, b2, c2, d2, r0, r1] = G.neck; parts.push(Cp(Pc, a, b2, c2, d2, r0, r1, 'front', 'head')); }
  const neckX = A.tx(Pc(G.neck[0], G.neck[1], 'front')[0]);
  A.mass(parts, body, { pat: (x, y, nx, ny, I, m) => {
    if (big && !cria && x > neckX - 3 && y < A.ty(Pc(0, G.chest[1] - 3, 'front')[1])) return hash(x, y >> 1, 9) < 0.25 && (y & 1) ? ramp(R.mane[2]) : R.mane; // crin del cuello
    if (deer && x < A.tx(hx0 - 1) && m.kd < (big ? 5 : 4) && m.td > 2) return R.rump; // grupa blanca
    if (cria && deer && m.td < 6 && (x * 7 + y * 5) % 11 === 0) return C.rump; // motas del cervatillo
    if (m.bd < 3 && m.td > 3) return belly;
    if (goat && male && x > A.tx(cx0 - 6) && m.fd < 5 && m.td > 3) return R.dark;
    if (goat && male && m.bd < 6 && m.bd >= 3 && x > A.tx(hx0) && x < A.tx(cx0)) return R.dark; // franja del flanco
    if (m.td < 2) return ramp(body[4]);
    return furStroke(x, y, m, body, 13);
  } });
  // Cabeza
  const [hx, hy] = Pc(G.head[0], G.head[1], 'head'); const dx = hx - G.head[0], dy = hy - G.head[1];
  const ear = (e, near) => { const back = Pc.hu ? [-2, 2] : [0, 0]; const pts = [[e[0] + dx, e[1] + dy], [e[2] + dx, e[3] + dy], [e[4] + dx + back[0], e[5] + dy + back[1]]]; triB(A, pts, body, { tone: near ? 4 : 2 }); if (near && deer) A.poly([[pts[0][0] + 0.8, pts[0][1] - 0.4], [pts[1][0] - 0.8, pts[1][1] - 0.4], [pts[2][0] + 0.2, pts[2][1] + 1.6]], belly[3]); };
  ear(G.ears[0], false);
  const hs = cria ? 1.15 : 1; const [m0, m1, m2, m3, mr0, mr1] = G.muzzle;
  A.mass([['e', hx, hy, G.head[2] * hs, G.head[3] * hs], ['c', m0 + dx, m1 + dy, m2 + dx, m3 + dy, mr0, mr1]], body, { edge: true, pat: (x, y, nx, ny, I, m) => (m.bd < 2 && x > A.tx(hx) ? belly : m.td < 1 ? ramp(body[4]) : null) });
  A.rect(m2 + dx + 0.2, m3 + dy - 1.6, 1.8, 1.6, C.nose || EYE);
  if (Pc.at && !deer) A.line(m2 + dx - 3, m3 + dy + 1.2, m2 + dx, m3 + dy + 1, MOUTH);
  ear(G.ears[1], true);
  if (goat && male) A.poly([[m0 + dx + 1.6, m1 + dy + 2.4], [m0 + dx + 3.6, m1 + dy + 2.2], [m0 + dx + 2, m1 + dy + 6.6]], R.dark[2]);
  eyeB(A, G.eye[0] + dx, G.eye[1] + dy, { closed: Pc.hu });
  if (!Pc.hu) A.px(G.eye2[0] + dx, G.eye2[1] + dy, EYE);
  // Cuernas y cuernos
  if (male && SP[sp].antlers) {
    const a = R.ant;
    if (big) {
      // Cuernas en candelabro: dos varas (la lejana más oscura) con candiles
      const beam = (s, d) => { const pts = [[hx - 1.4 + s, hy - 3.6, 1.5], [hx - 2.2 + s, hy - 8, 1.3], [hx - 4.8 + s, hy - 11.8, 1.1], [hx - 8.6 + s, hy - 14.2, 0.9], [hx - 12.4 + s, hy - 14.8, 0.7]];
        A.chain(pts, a, { d, edge: true }); for (const [x0, y0, x1, y1] of [[hx - 1.8 + s, hy - 6, hx + 2.4 + s, hy - 8.2], [hx - 3.4 + s, hy - 10, hx - 1.2 + s, hy - 14], [hx - 6.6 + s, hy - 13.2, hx - 5.8 + s, hy - 16.2], [hx - 10.4 + s, hy - 14.6, hx - 11.6 + s, hy - 16.6]]) A.capsule(x0, y0, x1, y1, 0.9, 0.6, a, { d, edge: true }); };
      beam(2.4, -1); beam(0, 0);
    } else {
      A.chain([[hx - 1, hy - 3.4, 0.9], [hx - 1.6, hy - 6.4, 0.7], [hx - 2.6, hy - 8, 0.5]], a, { edge: true });
      A.capsule(hx - 1.4, hy - 5.6, hx + 0.6, hy - 7, 0.6, 0.45, a, {});
    }
  }
  if (goat) {
    const h = R.horn; const ridge = (x, y) => ((x + y) % 2 ? h[2] : null);
    if (male) A.chain([[hx - 0.8, hy - 3.4, 1.9], [hx - 2.4, hy - 8.2, 1.7], [hx - 5.4, hy - 11.2, 1.4], [hx - 9, hy - 11.2, 1.1], [hx - 10.8, hy - 8.8, 0.7]], h, { edge: true, pat: ridge });
    else A.chain([[hx - 0.8, hy - 3.4, 1.1], [hx - 2, hy - 6.6, 0.9], [hx - 3.6, hy - 7.6, 0.6]], h, { edge: true, pat: ridge });
  }
  L(G.rn, true, true); L(G.fn, true, false);
};

// Oso (64), tejón y castor
B.oso = (A, o) => {
  const { sp, C, R, cria } = o; const P = poser(o); const body = R.c;
  if (sp === 'oso') {
    const L = (pts, near, rear) => legB(A, chainP(P, pts, rear ? ['rear', 'rear', 'footR'] : ['front', 'mid', 'footF']), body, { d: near ? 0 : -1, edge: true });
    L([[18, 41, 5], [17, 50, 4], [18, 58.6, 3.4]], false, true); L([[39, 42, 5], [39.4, 51, 4], [40, 58.6, 3.4]], false, false);
    A.mass([Ep(P, 20, 34, 11, 11, 'rear'), Ep(P, 30, 32, 14, 11, 'mid'), Ep(P, 36, 25.6, 8, 6.6, 'front'), Ep(P, 41, 35, 9, 11, 'front')], body, { pat: (x, y, nx, ny, I, m) => {
      if (m.bd < 4 && m.td > 4) return R.b;
      if (m.td < 2) return ramp(body[4]);
      return furStroke(x, y, m, body, 7);
    } });
    const [hx, hy] = P(50, 32, 'head');
    A.blob(hx - 4.4, hy - 6.4, 2.4, 2.3, body, { edge: true, d: -1 }); A.blob(hx - 4.4, hy - 6.2, 1.2, 1.1, ramp(body[1]), {});
    A.mass([['e', hx, hy, 7, 6.2]], body, { edge: true, pat: (x, y, nx, ny, I, m) => furStroke(x, y, m, body, 9) });
    if (P.at) openMouth(A, hx + 3.6, hy + 3, hx + 9.6, hy + 4.6, 3.6, 2.6, R.muzzle, null, 3);
    else { A.capsule(hx + 3.6, hy + 3, hx + 9.6, hy + 4.6, 3.6, 2.6, R.muzzle, { edge: true }); A.line(hx + 4, hy + 6.4, hx + 8.4, hy + 6.6, R.muzzle[1]); }
    A.rect(hx + 9.6, hy + (P.at ? 1.4 : 2.6), 2.2, 2, EYE);
    A.blob(hx + 0.8, hy - 6, 2.3, 2.2, body, { edge: true }); A.blob(hx + 0.8, hy - 5.8, 1.1, 1, ramp(body[1]), {});
    eyeB(A, hx + 2, hy - 1.6, { closed: P.hu });
    L([[23, 42, 5.4], [22.4, 51, 4.2], [23.4, 59, 3.6]], true, true);
    if (P.at) { const pts = chainP(P, [[44, 43, 5.4], [48, 46, 4.2], [52, 44, 3.6]], ['front', 'mid', 'footF']); legB(A, pts, body, { edge: true }); const [x, y] = pts[2]; for (let i = 0; i < 3; i++) A.line(x + 3, y - 1 + i * 1.6, x + 5, y - 0.4 + i * 1.6, FANG); }
    else { L([[44, 43, 5.4], [44.6, 52, 4.2], [45.4, 59, 3.6]], true, false); const [x, y] = P(45.4, 59, 'footF'); for (let i = 0; i < 3; i++) A.px(x + 3.4, y - 0.6 + i, FANG); }
    return;
  }
  if (sp === 'tejon') {
    const L = (pts, near, rear) => legB(A, chainP(P, pts, rear ? ['rear', 'rear', 'footR'] : ['front', 'mid', 'footF']), ramp(C.face), { d: near ? 0 : -1, edge: true });
    L([[14, 37, 3.2], [13.4, 41.6, 2.4], [14, 44.8, 2]], false, true); L([[29, 38, 3.2], [29.4, 42, 2.4], [30, 44.8, 2]], false, false);
    const [tx, ty] = P(7, 31, 'tail'); A.blob(tx, ty, 2.4, 1.8, body, { edge: true });
    A.mass([Ep(P, 15, 34, 8, 7, 'rear'), Ep(P, 23, 33, 11, 7.6, 'mid'), Ep(P, 30.5, 34, 7, 7, 'front')], body, { pat: (x, y, nx, ny, I, m) => {
      if (m.bd < 4) return ramp(C.face);
      if (m.td < 8 && hash(x, y, 4) < 0.38) return R.b;
      if (hash(x, y, 6) < 0.18) return ramp(body[2]);
    } });
    const [hx, hy] = P(36, 34.6, 'head');
    A.mass([['e', hx, hy, 5, 4.4], ['c', hx + 2.4, hy + 1.4, hx + 8.4, hy + 3, 2.8, 1.6]], R.b, { edge: R.b[1] });
    A.px(hx + 8.8, hy + 2, EYE); A.px(hx + 8.4, hy + 2.6, EYE);
    // Franjas negras del hocico a las orejas
    A.capsule(hx - 4.2, hy - 1.6, hx + 7.6, hy + 1.6, 1.2, 0.8, ramp(C.face), {}); A.capsule(hx - 3, hy + 1.4, hx + 5.6, hy + 3.6, 0.9, 0.6, ramp(C.face), {});
    A.blob(hx - 3.6, hy - 4, 1.4, 1.2, R.b, { edge: true });
    eyeB(A, hx + 1, hy - 0.6, { closed: P.hu, lid: R.b[2] }); if (!P.hu) A.px(hx + 1, hy - 0.6, '#3a3040');
    if (P.at) A.line(hx + 4, hy + 4.4, hx + 8, hy + 3.8, MOUTH);
    L([[17, 38, 3.4], [16.6, 42, 2.5], [17.2, 45, 2.1]], true, true); L([[32, 38.6, 3.4], [32.4, 42.4, 2.5], [33, 45, 2.1]], true, false);
    const [cx, cy] = P(33, 45, 'footF'); for (let i = 0; i < 3; i++) A.line(cx + 2, cy - 0.6 + i * 0.8, cx + 3.6, cy + i * 0.8, FANG);
    return;
  }
  // Castor
  const [tx, ty] = P(7, 40, 'tail');
  A.blob(tx, ty, 5.6, 2.4, R.tail, { edge: true, pat: (x, y) => ((x + y) % 3 === 0 || (x - y) % 3 === 0 ? R.tail[1] : null) });
  legB(A, chainP(P, [[15, 39, 3], [14, 43, 2.4], [15, 45, 2]], ['rear', 'rear', 'footR']), ramp(C.tail), { d: -1, edge: true });
  A.mass([Ep(P, 15, 36, 7, 7, 'rear'), Ep(P, 22, 34, 11, 8.6, 'mid')], body, { pat: (x, y, nx, ny, I, m) => (m.bd < 3 && m.td > 3 ? R.b : m.td < 2 ? ramp(body[4]) : furStroke(x, y, m, body, 9)) });
  const [hx, hy] = P(33.4, 32, 'head');
  A.blob(hx - 2.6, hy - 4.4, 1.4, 1.3, body, { edge: true });
  A.mass([['e', hx, hy, 5.6, 5], ['c', hx + 2.4, hy + 2, hx + 6.6, hy + 3, 3, 2.4]], body, { edge: true });
  A.rect(hx + 6.4, hy + 0.8, 2, 1.6, EYE);
  A.rect(hx + 5.2, hy + 5.2, 1, P.at ? 4 : 3, C.teeth); A.rect(hx + 6.2, hy + 5.2, 1, P.at ? 4 : 3, ramp(C.teeth)[2]);
  eyeB(A, hx + 1.4, hy - 1.6, { closed: P.hu });
  legB(A, chainP(P, [[28, 39, 2.4], [29, 42.6, 1.8], [30, 45, 1.6]], ['front', 'mid', 'footF']), body, { edge: true });
  legB(A, chainP(P, [[18, 40, 3.2], [17.4, 43.4, 2.6], [18.6, 45.2, 2.2]], ['rear', 'rear', 'footR']), ramp(C.tail), { edge: true });
};

// Mustélidos de combate: garduña, gineta, nutria
B.mustelido = (A, o) => {
  const { sp, C, R } = o; const P = poser(o); const body = R.c; const gin = sp === 'gineta', nut = sp === 'nutria';
  const L = (pts, near, rear) => legB(A, chainP(P, pts, rear ? ['rear', 'rear', 'footR'] : ['front', 'mid', 'footF']), gin ? R.b : body, { d: near ? 0 : -1, edge: true });
  L([[12, 37, 3], [10.8, 41.6, 2], [11.6, 44.8, 1.6]], false, true); L([[29, 37.6, 2.6], [29.2, 42, 1.8], [29.8, 44.8, 1.6]], false, false);
  // Cola
  const tail = gin ? [[7.4, 33, 2.6], [4, 36, 2.4], [2.6, 40.6, 2], [3.8, 44, 1.2]] : nut ? [[7.6, 34.6, 4], [3.6, 38.6, 2.6], [2.2, 43, 1.4]] : [[7.6, 31, 3.2], [3.8, 28, 3.4], [2.6, 22, 2.8], [3.8, 17, 1.6]];
  A.chain(chainP(P, tail, ['rear', 'tail']), body, { edge: true, pat: (x, y) => (gin && Math.floor((x + y) / 2.2) % 2 ? R.b : null) });
  A.mass([Ep(P, 12.5, 33, 6, 6.4, 'rear'), Cp(P, 13, 33, 29, 32.4, 6, 6.2, 'rear', 'mid'), Ep(P, 31, 32.8, 6, 6.2, 'front'), Cp(P, 33, 31, 37, 27, 4.6, 4, 'front', 'head')], body, { pat: (x, y, nx, ny, I, m) => {
    if (sp === 'garduna' && x > A.tx(29) && m.fd < 5 && m.td > 2) return R.b; // babero
    if (nut && m.bd < 3) return R.b;
    if (gin && m.bd > 2 && m.td > 1 && Math.floor(y / 2.6) % 2 === 0 && ((x + Math.floor(y / 2.6) * 2) % 5) < 2) return R.b;
    if (m.td < 2) return ramp(body[4]);
    return furStroke(x, y, m, body, 9);
  } });
  const [hx, hy] = P(39, 26, 'head');
  A.blob(hx - 2.4, hy - 3.8, 1.5, 1.4, body, { edge: true });
  A.mass([['e', hx, hy, 4.4, 3.8], ['c', hx + 2, hy + 1.4, hx + (gin ? 7 : 6), hy + 2.6, 2.2, gin ? 1 : 1.4]], body, { edge: true, pat: (x, y, nx, ny, I, m) => (m.bd < 2 && (nut || sp === 'garduna') ? R.b : null) });
  if (gin) { A.px(hx + 1, hy + 1.6, GLINT); A.px(hx - 0.4, hy - 1.8, GLINT); }
  A.rect(hx + (gin ? 7 : 6) + 0.2, hy + 1.2, 1.4, 1.4, EYE);
  if (nut) for (let i = 0; i < 2; i++) A.line(hx + 4.6, hy + 2.6 + i, hx + 8.4, hy + 3.4 + i * 1.6, R.b[5]);
  if (P.at) A.line(hx + 2.6, hy + 3.8, hx + 6, hy + 3.4, MOUTH);
  eyeB(A, hx + 1, hy - 1, { closed: P.hu });
  L([[15, 38, 3.2], [14, 42.2, 2.1], [14.8, 45, 1.7]], true, true); L([[32, 38, 2.8], [32.4, 42.4, 1.9], [33, 45, 1.7]], true, false);
};

// Conejo y liebre de combate
B.conejo = (A, o) => {
  const { sp, C, R, cria } = o; const P = poser(o); const body = R.c; const hare = sp === 'liebre';
  const [px, py] = P(8.6, 33, 'tail'); A.blob(px, py, 3, 3, R.b, { edge: true, lo: 3 });
  A.capsule(...P(14, 44.6, 'footR'), ...P(24, 44.8, 'footR'), 2.2, 2, body, { d: -1, edge: true });
  A.mass([Ep(P, 17, 36.5, 9, 8, 'rear'), Ep(P, 23, 33, 9, 7.5, 'mid'), Ep(P, 28.5, 33, 6, 7, 'front')], body, { pat: (x, y, nx, ny, I, m) => (m.bd < 3 && x > A.tx(20) ? R.b : m.td < 2 ? ramp(body[4]) : furStroke(x, y, m, body, 9)) });
  const [hx, hy] = P(33, 25.5, 'head'); const back = P.hu ? 4 : P.at ? 3 : 0; const eh = hare ? 4 : 0;
  A.chain([[hx - 2.4, hy - 3.4, 1.8], [hx - 4 - back, hy - 11.4 - eh + back * 0.6, 2], [hx - 4.6 - back * 1.6, hy - 17.4 - eh + back * 1.2, 1.4]], body, { d: -1, edge: true, pat: (x, y) => (hare && y < A.ty(hy - 15 - eh + back * 1.2) ? ramp(C.tip) : null) });
  A.mass([['e', hx, hy, 5.6, 5], ['c', hx + 2, hy + 1.6, hx + 5.6, hy + 2.6, 2.8, 2.2]], body, { edge: true, pat: (x, y, nx, ny, I, m) => (m.bd < 2 && x > A.tx(hx) ? R.b : null) });
  A.px(hx + 6.2, hy + 1.6, R.ear ? R.ear[3] : C.b);
  if (P.at) { A.rect(hx + 4.4, hy + 4, 1.2, 2, FANG); A.line(hx + 3, hy + 4, hx + 6, hy + 3.6, MOUTH); }
  for (let i = 0; i < 2; i++) A.line(hx + 4.4, hy + 2.2 + i * 1.2, hx + 9, hy + 1.4 + i * 2.2, R.b[5]);
  eyeB(A, hx + 1.2, hy - 1.8, { closed: P.hu });
  const ne = [[hx - 0.4, hy - 4, 1.9], [hx - 0.6 - back, hy - 12 - eh + back * 0.6, 2.2], [hx - 1 - back * 1.6, hy - 18.6 - eh + back * 1.2, 1.5]];
  A.chain(ne, body, { edge: true, pat: (x, y, nx, ny) => (hare && y < A.ty(hy - 16.2 - eh + back * 1.2) ? ramp(C.tip) : nx > 0.1 && Math.abs(ny) < 0.9 ? (R.ear || R.b) : null) });
  legB(A, chainP(P, [[29, 37, 1.8], [30, 41, 1.5], [30.4, 44.6, 1.3]], ['front', 'mid', 'footF']), body, { edge: true });
};

// Ratón y rata de combate
B.raton = (A, o) => {
  const { sp, C, R } = o; const P = poser(o); const body = R.c; const rat = sp === 'rata'; const s = rat ? 1 : 0.82;
  const X = (x) => 24 + (x - 24) * s, Y = (y) => 46 + (y - 46) * s;
  A.chain(chainP(P, [[X(14), Y(39), 1.3], [X(7), Y(41.6), 1.1], [X(3.4), Y(38), 0.9], [X(4.6), Y(33), 0.7]], ['rear', 'tail']), R.tail, { edge: true, pat: (x, y) => (x % 2 ? R.tail[2] : null) });
  A.mass([Ep(P, X(17), Y(38), 7 * s, 6.4 * s, 'rear'), Ep(P, X(24), Y(36.4), 9 * s, 7 * s, 'mid')], body, { pat: (x, y, nx, ny, I, m) => (m.bd < 3 ? R.b : m.td < 2 ? ramp(body[4]) : furStroke(x, y, m, body, 7)) });
  const [hx, hy] = P(X(32), Y(33.6), 'head');
  A.blob(hx - 2.2 * s, hy - 5 * s, 3 * s, 3 * s, R.ear, { edge: true, lo: 2, hi: 4 }); A.blob(hx - 2.2 * s, hy - 4.8 * s, 1.6 * s, 1.6 * s, ramp(R.ear[4]), {});
  A.mass([['e', hx, hy, 4.6 * s, 4 * s], ['c', hx + 2 * s, hy + 1.2 * s, hx + 7 * s, hy + 2.4 * s, 2.6 * s, 1.2]], body, { edge: true });
  A.rect(hx + 7 * s, hy + 1.6 * s, 1.4, 1.4, R.ear[3]);
  for (let i = 0; i < 2; i++) A.line(hx + 4 * s, hy + 2.2 * s + i, hx + 9.6 * s, hy + 1 * s + i * 2.4, R.b[5]);
  if (P.at) { A.rect(hx + 5 * s, hy + 3.6 * s, 1, 2, FANG); A.line(hx + 3, hy + 3.8 * s, hx + 6 * s, hy + 3.4 * s, MOUTH); }
  eyeB(A, hx + 1 * s, hy - 1.2 * s, { closed: P.hu });
  const [fx, fy] = P(X(30), Y(45), 'footF'); A.blob(fx, fy, 1.6, 1, R.ear, { edge: true });
  const [rx, ry] = P(X(20), Y(45), 'footR'); A.blob(rx, ry, 2.2, 1, R.ear, { edge: true });
};

// Ardilla de combate: sentada, cola en penacho
B.ardilla = (A, o) => {
  const { C, R } = o; const P = poser(o); const body = R.c;
  const tail = chainP(P, [[18, 40, 4], [11.6, 34, 6.4], [10.4, 23, 7], [14, 13, 5.6], [20.6, 9.6, 3.4]], ['rear', 'tail']);
  A.mass(tail.map(([x, y, r], i) => i ? ['c', tail[i - 1][0], tail[i - 1][1], x, y, tail[i - 1][2], r] : ['e', x, y, r, r]), body, { pat: (x, y, nx, ny, I, m) => (m.d < 1.5 ? ramp(body[5]) : (x * 3 + y * 2) % 7 === 0 ? R.dark : null) });
  A.mass([Ep(P, 22, 39, 7, 6, 'rear'), Ep(P, 25.6, 31.6, 5.4, 8, 'mid')], body, { edge: true, pat: (x, y, nx, ny, I, m) => (m.fd < 3 && m.td > 1 ? R.b : furStroke(x, y, m, body, 9)) });
  const [hx, hy] = P(28.4, 21.4, 'head');
  for (const [ex, ey, d] of [[-2.6, -4.6, -1], [0.6, -5, 0]]) { A.poly([[hx + ex - 1.4, hy + ey + 1.6], [hx + ex + 1.6, hy + ey + 1.6], [hx + ex - 0.2, hy + ey - 3.6]], body[d < 0 ? 2 : 4]); A.line(hx + ex - 0.2, hy + ey - 3.6, hx + ex - 0.6, hy + ey - 6, R.dark[2]); }
  A.mass([['e', hx, hy, 5.4, 4.8], ['c', hx + 2.2, hy + 1.4, hx + 5.4, hy + 2.6, 2.4, 2]], body, { edge: true, pat: (x, y, nx, ny, I, m) => (m.bd < 2 && x > A.tx(hx) ? R.b : null) });
  A.rect(hx + 5.6, hy + 1.2, 1.4, 1.2, EYE);
  if (P.at) { A.rect(hx + 4, hy + 4.4, 1, 2, FANG); }
  eyeB(A, hx + 1.4, hy - 1.6, { closed: P.hu });
  // Patitas (sostiene una bellota en reposo)
  const [ax, ay] = P(31, 30, 'front'); A.capsule(ax - 2, ay - 1, ax + (P.at ? 3 : 1), ay + (P.at ? -3 : 1), 1.4, 1.2, body, { edge: true });
  if (!P.at && !P.hu) { A.blob(ax + 2, ay + 1.2, 1.6, 1.8, ramp('#9a6a3a'), { edge: true }); A.blob(ax + 2, ay - 0.4, 1.7, 0.9, ramp('#5a3a22'), {}); }
  const [fx, fy] = P(26, 45, 'footF'); A.capsule(fx - 4, fy, fx + 2, fy, 1.6, 1.4, body, { edge: true, d: -1 });
};

// Erizo de combate
B.erizo = (A, o) => {
  const { C, R } = o; const P = poser(o); const spine = R.spine;
  const curl = P.hu;
  const [cx, cy] = P(22, curl ? 37 : 35, 'mid'); const rx = curl ? 11 : 13, ry = curl ? 9 : 9.5;
  if (!curl) {
    const [hx, hy] = P(34.5, 38.6, 'head');
    A.mass([['e', hx, hy, 5, 4], ['c', hx + 2.4, hy + 0.8, hx + 8, hy + 2, 2.6, 1.2]], R.face, { pat: (x, y, nx, ny, I, m) => (m.td < 1.2 ? R.face[4] ? ramp(R.face[4]) : null : null) });
    A.rect(hx + 8.2, hy + 1, 1.6, 1.6, EYE); eyeB(A, hx + 1.4, hy - 1.2, {});
    if (P.at) A.line(hx + 3.6, hy + 3, hx + 7, hy + 2.6, MOUTH);
    legB(A, chainP(P, [[30, 41, 1.6], [31, 44.8, 1.3]], ['front', 'footF']), R.face, { edge: true });
  }
  A.mass([['e', cx, cy, rx, ry]], spine, { clip: (x, y) => curl || y < A.ty(cy + ry * 0.7) || x < A.tx(cx + rx * 0.3), pat: (x, y, nx, ny, I, m) => {
    const a = Math.atan2(y + 0.5 - A.ty(cy), (x + 0.5 - A.tx(cx)) * 0.8); const band = Math.floor((a + Math.PI) * 6.4) & 1;
    if (m.d < 1.5) return band ? ramp(C.tips) : spine;
    return band ? ramp(spine[4]) : ramp(spine[1]);
  } });
  // Púas sueltas en la silueta
  const n = P.at ? 16 : 12;
  for (let i = 0; i <= n; i++) { const a = Math.PI * (0.95 + (1.1 * i) / n); const x0 = cx + Math.cos(a) * rx * 0.85, y0 = cy + Math.sin(a) * ry * 0.85, l = P.at ? 4.6 : 3.2; A.line(x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, i & 1 ? C.tips : spine[2]); }
  if (curl) { A.px(cx + 3, cy + 1, EYE); }
  legB(A, chainP(P, [[16, 42, 1.6], [16.4, 45, 1.3]], ['rear', 'footR']), R.face, { edge: true });
};

// ───────────── Aves de combate ─────────────
// Escala de ave pequeña dentro del lienzo de 48 (alrededor del suelo, centrada)
function scaled(A, s, f) { const k0 = A.k, ax0 = A.ax, ay0 = A.ay; A.k = k0 * s; f(); A.k = k0; A.ax = ax0; A.ay = ay0; }
// Ala plegada con filas de plumas (festón) y primarias hacia atrás
function foldedWing(A, P, x0, y0, x1, y1, r0, r1, R, o = {}) {
  A.mass([Cp(P, x0, y0, x1, y1, r0, r1, 'mid')], R, { edge: true, pat: (x, y, nx, ny, I, m) => {
    if (o.tips && x < A.tx(P(x0 + 4, y0, 'mid')[0])) return o.tips;
    if (o.bars && m.d > 1 && (y % 4 === 0)) return o.bars;
    if (m.d > 1 && ((x + (y >> 1) * 3) % 5 === 0)) return ramp(R[2]);
    if (m.td < 1) return ramp(R[4]);
  } });
}
// Ala abierta en abanico: hombro (sx, sy), punta (tx, ty) y anchura; plumas primarias separadas
function openWing(A, sx, sy, tx, ty, w, R, o = {}) {
  const ang = Math.atan2(ty - sy, tx - sx), nx = -Math.sin(ang), ny = Math.cos(ang), L = Math.hypot(tx - sx, ty - sy);
  const pts = [[sx, sy], [sx + nx * w * 0.5, sy + ny * w * 0.5]];
  for (let i = 0; i <= 5; i++) { const t = 0.55 + i * 0.09, ww = w * (0.9 - i * 0.12); pts.push([sx + Math.cos(ang) * L * t + nx * ww, sy + Math.sin(ang) * L * t + ny * ww]); }
  pts.push([tx, ty]);
  A.poly(pts, (x, y) => { const lx = x - A.tx(sx), ly = y - A.ty(sy); const along = (lx * Math.cos(ang) + ly * Math.sin(ang)) / (L * A.k); return along > 0.72 ? (o.tip || R[1]) : along > 0.45 ? R[o.d ? 2 : 3] : R[o.d ? 3 : 4]; });
  for (let i = 0; i < 4; i++) { const t = 0.6 + i * 0.1; A.line(sx + Math.cos(ang) * L * t, sy + Math.sin(ang) * L * t, sx + Math.cos(ang) * L * t + nx * w * (0.8 - i * 0.12), sy + Math.sin(ang) * L * t + ny * w * (0.8 - i * 0.12), R[1]); }
}
function birdLegs(A, P, x, y, len, c, toes = true) {
  for (const [dx, near] of [[0, false], [3, true]]) {
    const [x0, y0] = P(x + dx, y, 'mid'); const [x1, y1] = P(x + dx - 0.6, y + len, near ? 'footF' : 'footR');
    A.line(x0, y0, x1, y1, near ? c : ramp(c)[2]); A.line(x0 + 1, y0, x1 + 1, y1, near ? ramp(c)[4] : c);
    if (toes) { A.line(x1, y1, x1 + 3, y1, c); A.line(x1, y1, x1 - 2, y1, ramp(c)[2]); }
  }
}
B.pajaro = (A, o) => {
  const { sp, C, R, sex, cria } = o; const P = poser(o); const gull = sp === 'gaviota', dove = sp === 'paloma', spar = sp === 'gorrion';
  const s = gull ? 1.04 : dove ? 0.92 : 0.8; const body = R.c;
  scaled(A, s, () => {
    birdLegs(A, P, 23, 37.6, 7.4, C.feet || '#a8784a');
    // Cola
    const [t0x, t0y] = P(15, 30, 'rear'), [t1x, t1y] = P(5, 26.6, 'tail'), [t2x, t2y] = P(6.4, 33.4, 'tail');
    A.poly([[t0x, t0y - 2.4], [t1x, t1y], [t2x, t2y], [t0x + 1, t0y + 3]], (x, y) => (gull ? (x < A.tx(t1x + 3) ? C.tip : ramp(C.c)[4]) : dove && x < A.tx(t1x + 3) ? C.bar : body[2]));
    // Ala lejana al atacar
    if (P.at || P.hu) openWing(A, ...P(24, 26, 'mid'), ...P(P.at ? 10 : 12, P.at ? (gull ? 9 : 6) : 10, 'tail'), 9, gull ? R.b : body, { d: 1, tip: gull ? C.tip : null });
    A.mass([Cp(P, 16, 30, 29, 33.6, 7, 7.6, 'rear', 'front'), Cp(P, 29, 31, 32.4, 24.6, 5, 4.4, 'front', 'head')], gull ? R.c : body, { pat: (x, y, nx, ny, I, m) => {
      if (m.bd < 5 && x > A.tx(P(18, 0, 'mid')[0])) return gull ? R.c : R.b;
      if (spar && hash(x, y >> 1, 2) < 0.25 && (y & 1)) return ramp(C.streak);
      if (dove && x > A.tx(P(27, 0, 'front')[0]) && m.td > 1 && m.td < 8) return (x + y) % 3 ? R.neck : ramp(C.neck2);
    } });
    if (!P.at) foldedWing(A, P, 13, 29, 27, 31, 4.2, 5.4, gull ? R.b : body, { tips: gull ? C.tip : null, bars: dove ? C.bar : null });
    // Cabeza
    const [hx, hy] = P(33, 22, 'head');
    A.mass([['e', hx, hy, 5.6, 5]], gull ? R.c : body, { edge: true, pat: (x, y, nx, ny, I, m) => {
      if (spar && m.td < 3) return R.cap;
      if (spar && m.bd < 4 && x > A.tx(hx - 2)) return R.cheek;
      if (dove && m.bd < 2) return R.neck;
    } });
    if (spar && sex === 'm' && !cria) A.blob(hx + 2.4, hy + 5.2, 2.4, 2.2, ramp(C.bib), {});
    // Pico
    const open = P.at ? 2 : 0;
    A.poly([[hx + 4.2, hy - 1.6], [hx + (gull ? 11 : dove ? 8 : 8.4), hy + 0.2], [hx + 4.4, hy + 1.2]], gull ? C.beak : C.beak);
    A.poly([[hx + 4.2, hy + 1 + open * 0.3], [hx + (gull ? 10 : 7.4), hy + 1.2 + open], [hx + 4.6, hy + 2.6 + open * 0.4]], gull ? ramp(C.beak)[2] : ramp(C.beak)[2]);
    if (gull) A.px(hx + 8.6, hy + 1.8 + open, C.spot);
    if (dove) A.blob(hx + 4.6, hy - 1.4, 1, 0.8, ramp(C.cere), {});
    eyeB(A, hx + 1.4, hy - 1.6, { closed: P.hu, iris: dove ? '#e88030' : gull ? '#f0e8a0' : null });
    if (P.at) openWing(A, ...P(23, 27, 'mid'), ...P(15, gull ? 9 : 6, 'tail'), 9, gull ? R.b : body, { tip: gull ? C.tip : null });
    if (P.hu) for (const [x, y] of [[8, 12], [40, 30], [14, 6]]) A.line(x, y, x + 2, y + 1, body[4]);
  });
};
B.ave_suelo = (A, o) => {
  const { sp, C, R, cria } = o; const P = poser(o); const body = R.c; const goose = sp === 'oca', hen = sp === 'pota_blava', part = sp === 'perdiz';
  const chick = cria && (goose || hen); const cb = chick ? ramp(goose ? '#e8d880' : '#e4cc74') : body;
  const s = 1;
  scaled(A, s, () => {
    const legC = hen ? C.legs : goose ? C.feet : C.red;
    birdLegs(A, P, 21.6, goose ? 39 : 38.6, goose ? 6.4 : 6.8, legC);
    if (hen && !chick) { // hoces de la cola
      for (const [i, d] of [[0, -1], [1, 0], [2, 0]]) A.chain(chainP(P, [[13.4, 27 - i, 1.8], [9 - i * 1.4, 19 - i * 1.6, 1.5], [5.6 - i, 16.4 - i * 1.2, 1.1], [4 - i * 0.6, 21 - i * 1.4, 0.6]], ['rear', 'tail']), i === 2 ? ramp(C.c) : ramp(C.sheen), { d, edge: true });
    }
    if (goose && !chick) { const [tx, ty] = P(8, 30, 'tail'); A.poly([[tx + 4, ty - 2], [tx - 1.6, ty - 4.4], [tx, ty + 2], [tx + 4, ty + 2.4]], body[3]); }
    A.mass([Ep(P, goose ? 20 : 22, goose ? 34 : part ? 35 : 31.6, goose ? 12.4 : part ? 11 : 10.6, goose ? 8 : part ? 8.4 : 9.4, 'mid')], cb, { pat: (x, y, nx, ny, I, m) => {
      if (part && m.bd > 3 && m.bd < 8 && m.td > 6 && x < A.tx(27) && x > A.tx(15)) { const k = Math.floor((x + (y >> 2)) / 2) % 3; return k === 0 ? ramp(C.bar) : k === 1 ? ramp('#e8dcc8') : null; }
      if (part && m.bd < 3) return R.b;
      if (hen && !chick && m.td < 4) return R.sheen;
      if (m.td < 1.5) return ramp(cb[4]);
    } });
    if (!P.at) foldedWing(A, P, goose ? 9 : 13, goose ? 31 : 29, goose ? 27 : 28, goose ? 32 : 30.6, 4.6, 5.6, cb, {});
    else openWing(A, ...P(22, 27, 'mid'), ...P(part ? 8 : 10, part ? 14 : 6, 'tail'), part ? 8 : 10, cb, {});
    // Cuello y cabeza
    let hx, hy;
    if (goose && !chick) { [hx, hy] = P(36, 14.4, 'head'); A.mass([Cp(P, 28, 31, 33.6, 17.6, 4, 3.2, 'front', 'head')], body, { pat: (x, y, nx, ny, I, m) => (m.td < 1 ? ramp(body[4]) : null) }); }
    else [hx, hy] = P(part ? 33.6 : 32.4, part ? 27 : 21.6, 'head');
    const hr = chick ? 1.25 : 1;
    if (hen && !chick) for (let i = 0; i < 3; i++) A.blob(hx - 2 + i * 1.8, hy - 4.6 - (i === 1 ? 1 : 0), 1.3, 1.6, ramp(C.comb), { edge: true });
    A.mass([['e', hx, hy, 4.4 * hr, 4 * hr]], cb, { edge: true, pat: (x, y, nx, ny, I, m) => {
      if (part && !cria && x > A.tx(hx - 1.6) && m.bd < 4) return R.face;
      if (part && !cria && m.td < 2) return ramp('#8a8a8a');
    } });
    if (part && !cria) { A.line(hx - 2, hy + 3.6, hx + 3.4, hy + 2.6, C.mask); A.line(hx - 2.4, hy + 2.4, hx - 1.6, hy - 1.4, C.mask); }
    if (hen && !chick) { A.blob(hx + 3.2, hy + 4.4, 1.2, 1.8, ramp(C.comb), { edge: true }); A.blob(hx - 1.2, hy + 1, 1, 1.2, ramp('#f4f0ea'), {}); }
    const bc = goose ? C.beak : part ? C.red : chick ? '#e8a040' : '#e8c470';
    const bl = goose ? 8.6 : 6.4;
    A.poly([[hx + 3.6, hy - 1.6], [hx + bl, hy + 0.4], [hx + 3.8, hy + 1.6 + (P.at ? 1 : 0)]], bc);
    if (P.at) A.poly([[hx + 3.8, hy + 1.6], [hx + bl - 1, hy + 2.6], [hx + 4, hy + 3.2]], ramp(bc)[2]);
    eyeB(A, hx + 1, hy - 1.4, { closed: P.hu, iris: part || hen ? '#e87030' : null });
  });
};
B.rapaz = (A, o) => {
  const { sp, C, R, sex, cria } = o; const P = poser(o); const body = R.c; const owl = sp === 'lechuza', eag = sp === 'aguila', fal = sp === 'halcon', kes = sp === 'cernicalo';
  const s = eag ? 1.06 : 0.94; const wingR = body;
  scaled(A, s, () => {
    // Ala lejana (detrás, más oscura) y cola
    const up = P.at ? (eag ? -0.5 : -6) : P.hu ? 4 : 0;
    openWing(A, ...P(22, 22, 'mid'), ...P(5, 10 + up, 'tail'), 11, wingR, { d: 1, tip: eag || fal ? R.c[1] : null });
    const [tx, ty] = P(21, 39, 'rear'); A.poly([[tx, ty - 3], [tx + 6, ty - 3], [tx + 5, ty + 6], [tx - 1, ty + 6]], (x, y) => (y % 3 === 0 ? body[1] : body[2]));
    // Garras
    const fc = C.beak || '#e8c040';
    for (const [dx, near] of [[0, false], [3.4, true]]) { const [x0, y0] = P(23 + dx, 38, 'mid'); const [x1, y1] = P(24 + dx + (P.at ? 4 : 0), 44.6 + (P.at ? -3 : 0), 'footF'); A.capsule(x0, y0, x1, y1 - 1, 1.6, 1.1, eag ? body : ramp(fc), { d: near ? 0 : -1, edge: true }); A.line(x1 - 1, y1, x1 + 2.6, y1, fc); A.px(x1 + 2.6, y1 + 0.6, EYE); A.px(x1 - 1.6, y1 + 0.4, EYE); }
    // Cuerpo erguido
    A.mass([Ep(P, 24, 30, 8.4, 11, 'mid'), Ep(P, 25.4, 21, 6.4, 5, 'front')], body, { pat: (x, y, nx, ny, I, m) => {
      const frontB = x > A.tx(P(23.4, 0, 'mid')[0]);
      if (owl && frontB) return hash(x, y, 1) < 0.08 ? ramp(C.spot) : R.b;
      if (owl && hash(x, y, 2) < 0.12) return ramp('#f8f4ec');
      if (frontB && m.td > 4) return fal ? ((y % 3 === 0 && m.td > 7) ? ramp(R.b[1]) : R.b) : kes ? (hash(x, y, 3) < 0.14 ? ramp(C.spot) : R.b) : eag ? null : R.b;
      if (kes && hash(x, y, 4) < 0.12) return ramp(C.spot);
      if (eag && m.td < 4) return R.nape;
    } });
    // Ala cercana: plegada sobre el flanco, abierta al atacar
    if (P.at) openWing(A, ...P(25, 23, 'front'), ...P(14, eag ? 12.5 : 7, 'tail'), 12, wingR, { tip: eag || fal || kes ? R.c[1] : null });
    else A.mass([Cp(P, 25.6, 22.6, 19.6, 37.6, 4.4, 2.4, 'front', 'rear')], wingR, { edge: true, pat: (x, y, nx, ny, I, m) => (m.bd < 4 && (eag || fal || kes) ? ramp(R.c[1]) : m.d > 1 && (y % 3 === 0) ? ramp(wingR[2]) : m.td < 1 ? ramp(wingR[4]) : null) });
    // Cabeza
    const [hx, hy] = P(26.6, 16.4, 'head');
    if (owl) {
      A.mass([['e', hx, hy, 6.6, 6]], body, { edge: true, pat: (x, y) => (hash(x, y, 5) < 0.1 ? ramp(C.spot) : null) });
      // Disco facial en corazón vuelto hacia el jugador
      A.mass([['e', hx + 1.6, hy + 0.6, 5, 5], ['e', hx + 0.4, hy - 2.2, 2.6, 2.4], ['e', hx + 2.8, hy - 2.2, 2.6, 2.4]], R.face, { edge: R.rim ? R.rim[3] : true, lo: 3, hi: 5 });
      eyeB(A, hx - 0.6, hy - 0.6, { closed: P.hu }); eyeB(A, hx + 3.2, hy - 0.6, { closed: P.hu });
      A.poly([[hx + 1, hy + 2], [hx + 2.6, hy + 2], [hx + 1.8, hy + (P.at ? 5 : 4.2)]], ramp('#e8c8a0')[2]);
      return;
    }
    A.mass([['e', hx, hy, 6, 5.4]], kes && sex === 'm' ? R.head : body, { edge: true, pat: (x, y, nx, ny, I, m) => {
      if (eag && m.td < 4) return R.nape;
      if (fal && x > A.tx(hx - 1) && m.bd < 3) return R.b;
      if (kes && x > A.tx(hx) && m.bd < 2.6) return R.b;
    } });
    if (fal || kes) A.capsule(hx + 1.8, hy + 0.6, hx + 1.2, hy + 4.4, 1.1, 0.9, ramp(fal ? C.mous : '#3a3040'), {});
    // Pico ganchudo con cera amarilla
    A.blob(hx + 4.6, hy - 0.4, 1.4, 1.2, ramp(C.beak || '#e8c040'), {});
    A.chain([[hx + 5.4, hy - 0.6, 1.4], [hx + 8, hy + 0.6, 1.1], [hx + 8.2, hy + 2.8, 0.6]], ramp(C.hook || '#3a3438'), { edge: true });
    if (P.at) A.line(hx + 5, hy + 2.4, hx + 7.4, hy + 3.4, MOUTH);
    eyeB(A, hx + 1.6, hy - 2, { closed: P.hu, iris: eag ? '#c88a30' : null });
    if (fal || kes) A.px(hx + 1.2, hy - 2.8, ramp(C.beak)[4]);
  });
};
B.zancuda = (A, o) => {
  const { C, R } = o; const P = poser(o, { attack: { head: [7, 8] } }); const body = R.c;
  birdLegs(A, P, 20.6, 33, 12, C.legs);
  const [tx, ty] = P(11, 27, 'rear'); A.poly([[tx + 3, ty - 2], [tx - 3, ty + 1], [tx + 3, ty + 3]], body[2]);
  A.mass([Ep(P, 22, 28, 9.4, 6.4, 'mid')], body, { pat: (x, y, nx, ny, I, m) => (m.bd < 3 ? R.b : m.td < 2 ? ramp(body[4]) : null) });
  if (!P.at) foldedWing(A, P, 13, 26.6, 28, 28.4, 4, 5, body, { tips: ramp(C.crest)[3] });
  else openWing(A, ...P(22, 24, 'mid'), ...P(6, 6, 'tail'), 11, body, { tip: C.crest });
  // Cuello en S
  const neck = P.at ? [[28, 25, 2.6], [32, 26, 2.2], [36, 28, 2], [39, 30, 2]] : P.hu ? [[28, 25, 2.6], [30, 19, 2.3], [27.4, 14.6, 2.1], [29.6, 11.4, 2]] : [[28, 25, 2.6], [32, 18.4, 2.2], [29.4, 12.4, 2], [32, 8.4, 2]];
  const nk = neck.map(([x, y, r], i) => [...P(x, y, i < 2 ? 'front' : 'head'), r].map((v, j) => (j < 2 && P.at ? v : v)));
  A.chain(nk, R.b, { edge: true, pat: (x, y) => ((x + y) % 4 === 0 ? ramp(C.crest)[4] : null) });
  const [hx, hy] = nk[nk.length - 1]; const ang = P.at ? 0.5 : 0;
  A.blob(hx + 1.6, hy - 1, 3.6, 3, R.b, { edge: true });
  A.chain([[hx - 0.6, hy - 2.6, 0.8], [hx - 5, hy - 2.2, 0.6], [hx - 8, hy - 0.4, 0.4]], ramp(C.crest), {});
  A.poly([[hx + 4.4, hy - 2], [hx + 14, hy + (P.at ? 5 : 0.4)], [hx + 4.6, hy + 0.6]], C.beak);
  A.line(hx + 4.6, hy + 0.2, hx + 12, hy + (P.at ? 4.6 : 0.6), ramp(C.beak)[2]);
  eyeB(A, hx + 1.8, hy - 2, { closed: P.hu, iris: '#e8d060' });
};
B.pato = (A, o) => {
  const { C, R, sex, cria } = o; const P = poser(o); const drake = sex === 'm' && !cria;
  const body = drake ? ramp(C.body) : cria ? ramp('#c8b070') : R.c;
  for (const [dx, near] of [[0, false], [3.4, true]]) { const [x0, y0] = P(21 + dx, 39, 'mid'); const [x1, y1] = P(21.4 + dx, 44.6, near ? 'footF' : 'footR'); A.capsule(x0, y0, x1, y1, 1, 0.9, ramp(C.feet), { d: near ? 0 : -1 }); A.blob(x1 + 1.6, y1 + 0.4, 2.4, 0.9, ramp(C.feet), { edge: true, d: near ? 0 : -1 }); }
  A.mass([Ep(P, 22, 35, 12.4, 7.6, 'mid'), Ep(P, 12, 33, 4.6, 4, 'rear')], body, { pat: (x, y, nx, ny, I, m) => {
    if (drake && x > A.tx(P(29, 0, 'front')[0]) && m.td > 1) return R.breast;
    if (drake && x < A.tx(P(12, 0, 'rear')[0])) return R.rear;
    if (!drake && hash(x, y, 8) < 0.3) return ramp(C.b);
    if (m.td < 1.4) return ramp(body[4]);
  } });
  if (drake) { const [cx, cy] = P(8.4, 28.6, 'tail'); A.chain([[cx, cy, 0.8], [cx - 1.6, cy - 2, 0.7], [cx, cy - 3.6, 0.6]], R.rear, {}); }
  if (!P.at) { foldedWing(A, P, 11, 31, 27, 32, 4.4, 5.2, body, {}); const [sx, sy] = P(17, 33, 'mid'); A.rect(sx, sy, 5, 2, C.spec); A.rect(sx, sy - 1, 5, 1, '#f4f4f0'); }
  else openWing(A, ...P(22, 29, 'mid'), ...P(8, 10, 'tail'), 10, body, {});
  A.mass([Cp(P, 30, 31, 33, 27, 3.4, 3, 'front', 'head')], drake ? R.head : body, {});
  const [hx, hy] = P(34, 24.6, 'head');
  A.mass([['e', hx, hy, 4.8, 4.2]], drake ? R.head : body, { edge: true, pat: (x, y, nx, ny, I, m) => (!drake && m.td > 2 && m.td < 3.4 && x < A.tx(hx + 2) ? ramp('#4a3420') : null) });
  if (drake) A.line(hx - 4, hy + 4.6, hx + 2.4, hy + 5.6, C.ring);
  const bc = drake ? C.beak : C.beakf; const op = P.at ? 1.6 : 0;
  A.capsule(hx + 3.6, hy + 0.6 - op * 0.4, hx + 9, hy + 1.2 - op * 0.6, 1.5, 1.3, ramp(bc), { edge: true });
  if (P.at) A.capsule(hx + 3.6, hy + 2.6, hx + 8, hy + 3.6, 1.1, 0.9, ramp(bc), { d: -1 });
  eyeB(A, hx + 0.8, hy - 1.4, { closed: P.hu });
};

// ───────────── Anfibios, reptiles y enjambre ─────────────
B.rana = (A, o) => {
  const { C, R } = o; const P = poser(o); const body = R.c;
  const spot = (x, y, nx, ny, I, m) => (m.bd < 3 && x > A.tx(20) ? R.b : hash(x >> 1, y >> 1, 3) < 0.16 && m.d > 1 ? ramp(C.spot) : m.td < 1.2 ? ramp(body[4]) : null);
  A.capsule(...P(12, 44.6, 'footR'), ...P(24, 44.8, 'footR'), 1.6, 1.4, body, { d: -1, edge: true });
  A.mass([Ep(P, 16, 39, 6.4, 5, 'rear')], body, { d: -1, pat: spot });
  A.mass([Ep(P, 24, 37, 10.4, 7, 'mid'), Ep(P, 31, 34, 7, 5.6, 'front')], body, { pat: spot });
  const [hx, hy] = P(31, 34, 'head');
  A.mass([['e', hx - 1, hy - 5.4, 2.8, 2.6]], body, { edge: true }); A.mass([['e', hx + 3.4, hy - 5.2, 2.2, 2.1]], body, { edge: true, d: -1 });
  eyeB(A, hx - 1.6, hy - 6.4, { closed: P.hu, iris: '#d8b030' }); if (!P.hu) A.px(hx + 3.6, hy - 5.8, EYE);
  A.line(hx + 1, hy + 1.6, hx + 7.6, hy + 1, body[1]); A.px(hx + 6.6, hy - 1.6, EYE);
  if (P.at) { A.blob(hx + 4, hy + 2.6, 3.6, 1.6, ramp(MOUTH), { lo: 2, hi: 3 }); A.chain([[hx + 6, hy + 2.6, 0.9], [hx + 12, hy + 1.6, 0.8], [hx + 16, hy + 0.6, 1.2]], ramp(TONGUE), { edge: true }); }
  if (o.pose === 'idle' && o.f) A.blob(hx + 2.4, hy + 3.2, 3.4, 2.2, R.b, { edge: true, lo: 4 }); // buche
  legB(A, chainP(P, [[30, 38, 1.8], [32, 42, 1.4], [32.6, 44.8, 1.2]], ['front', 'mid', 'footF']), body, { edge: true });
};
B.tortuga = (A, o) => {
  const { sp, C, R } = o; const P = poser(o, { hurt: { head: [-5, 2] } }); const gal = sp === 'galapago'; const skin = R.skin;
  const legs = (near) => { for (const [x, rear] of near ? [[14, true], [32, false]] : [[18, true], [34.6, false]]) legB(A, chainP(P, [[x, 38, 3], [x + 0.6, 42, 2.6], [x + 1, 44.8, 2.2]], [rear ? 'rear' : 'front', 'mid', rear ? 'footR' : 'footF']), skin, { d: near ? 0 : -1, edge: true, pat: (X, Y) => ((X + Y) % 3 === 0 ? ramp(skin[2]) : null) }); };
  legs(false);
  // Cabeza (se esconde al recibir daño)
  if (!P.hu) {
    const [hx, hy] = P(41, 35.6, 'head');
    A.mass([['c', hx - 6, hy + 2, hx - 1, hy + 0.6, 2.8, 2.6], ['e', hx, hy, 3.8, 3.2]], skin, { edge: true, pat: (x, y) => (gal && (y % 3 === 0) && x < A.tx(hx) ? ramp(C.stripe) : (x * 3 + y) % 7 === 0 ? ramp(skin[2]) : null) });
    eyeB(A, hx + 0.6, hy - 1.4, {}); A.line(hx + 1, hy + 1.4, hx + 3.6, hy + 1, skin[1]);
    if (P.at) A.blob(hx + 3, hy + 1.6, 1.4, 1, ramp(MOUTH), { lo: 2, hi: 3 });
  }
  // Caparazón con placas
  const [cx, cy] = P(23, gal ? 36 : 34.6, 'mid'); const rx = 13.6, ry = gal ? 7.4 : 10;
  A.mass([['e', cx, cy, rx, ry]], R.c, { clip: (x, y) => y < A.ty(cy + ry * 0.55), pat: (x, y, nx, ny, I, m) => {
    const u = (x - A.tx(cx)) / (rx * A.k), v = (y - A.ty(cy)) / (ry * A.k);
    const col = Math.round(u * 2.6 + (Math.round(v * 2.2) & 1) * 0.5), row = Math.round(v * 2.2);
    const cu = (col - (Math.round(v * 2.2) & 1) * 0.5) / 2.6, cv = row / 2.2; const dd = Math.hypot(u - cu, (v - cv) * 1.2);
    if (dd > 0.17 && dd < 0.24) return R.c[1] ? ramp(R.c[1]) : null; // juntas entre placas
    if (!gal && dd < 0.1) return R.b;
    if (gal && hash(x, y, 2) < 0.12) return ramp(R.c[2]);
  } });
  const [bx, by] = P(23, cy + ry * 0.55, 'mid'); A.capsule(bx - rx + 1.6, by, bx + rx - 1.6, by, 1.4, 1.4, ramp(gal ? '#4a4a2a' : '#c8a848'), { edge: true });
  if (P.hu) { const [hx, hy] = P(35.4, 37, 'head'); eyeB(A, hx, hy, { closed: true }); }
  legs(true);
};
B.lagarto = (A, o) => {
  const { C, R } = o; const P = poser(o); const body = R.c;
  const skin = (x, y, nx, ny, I, m) => (m.bd < 2.4 ? R.b : hash(x >> 1, y >> 1, 11) < 0.07 && m.d > 1.4 ? ramp(C.ocelli) : (x + y * 2) % 4 === 0 && (x - y) % 3 === 0 ? ramp(C.net) : m.td < 1 ? ramp(body[4]) : null);
  for (const [pts, near, rear] of [[[[14, 39, 1.8], [10, 42, 1.4], [8.6, 44.8, 1.1]], false, true], [[[30, 39, 1.8], [33, 42, 1.4], [34, 44.8, 1.1]], false, false]]) legB(A, chainP(P, pts, [rear ? 'rear' : 'front', 'mid', rear ? 'footR' : 'footF']), body, { d: -1, edge: true });
  A.mass([...chainP(P, [[14, 38, 3.6], [8, 40.6, 2.6], [3, 43.6, 1.6], [1.6, 45.6, 0.8]], ['rear', 'tail']).map((p, i, a) => (i ? ['c', a[i - 1][0], a[i - 1][1], p[0], p[1], a[i - 1][2], p[2]] : ['e', p[0], p[1], p[2], p[2]])),
    Cp(P, 14, 38, 30, 36.6, 4.2, 4.8, 'rear', 'front')], body, { pat: skin });
  const [hx, hy] = P(36, 33.4, 'head');
  A.mass([['e', hx, hy, 5, 3.6], ['c', hx + 2, hy + 0.6, hx + 7.4, hy + 1.6, 2.6, 1.6]], body, { edge: true, pat: (x, y, nx, ny, I, m) => (m.bd < 1.6 ? ramp('#e8d860') : skin(x, y, nx, ny, I, m)) });
  if (P.at) { A.blob(hx + 4.4, hy + 2.6, 3, 1.2, ramp(MOUTH), { lo: 2, hi: 3 }); A.line(hx + 7, hy + 2.2, hx + 10, hy + 2.8, TONGUE); }
  eyeB(A, hx + 0.8, hy - 1.4, { closed: P.hu, iris: '#d8a030' });
  for (const [pts, rear] of [[[[17, 40, 1.9], [14, 43, 1.5], [12.6, 44.8, 1.2]], true], [[[32, 39.6, 1.9], [35.4, 42.6, 1.5], [36.6, 44.8, 1.2]], false]]) legB(A, chainP(P, pts, [rear ? 'rear' : 'front', 'mid', rear ? 'footR' : 'footF']), body, { edge: true });
};
B.serpiente = (A, o) => {
  const { sp, C, R } = o; const vip = sp === 'vibora'; const P = poser(o, { attack: { head: [8, 3], front: [4, 0] } }); const body = R.c;
  const zig = (x, y, nx, ny, I, m) => {
    if (m.bd < 2.2 || (m.d < 2 && ny > 0.3)) return R.belly;
    if (vip && m.d > 1.2 && (((x + Math.floor(y * 0.9)) % 6 + 6) % 6 < 2)) return ramp(C.b);
    if (!vip && m.td < 1.4) return ramp(body[4]);
  };
  // Rosca en el suelo
  const coil = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * 0.2 + i * 0.42, r = 11 - i * 0.28; coil.push([22 + Math.cos(a) * r, 40.4 + Math.sin(a) * r * 0.36, 3.2 - i * 0.04]); }
  A.chain(coil.map(([x, y, r]) => [x, y, r]), body, { edge: true, pat: (x, y, nx, ny) => (ny > 0.4 ? R.belly : vip && ((x + y) % 6 < 2) ? ramp(C.b) : null) });
  // Cuerpo alzado en S
  const neck = chainP(P, [[30, 40, 3.2], [33, 34, 3], [29.4, 27.6, 2.8], [31, 21.6, 2.6], [35.4, 18.6, 2.4]], ['mid', 'front', 'front', 'head', 'head']);
  A.mass(neck.map((p, i, a) => (i ? ['c', a[i - 1][0], a[i - 1][1], p[0], p[1], a[i - 1][2], p[2]] : ['e', p[0], p[1], p[2], p[2]])), body, { pat: zig });
  const [hx, hy] = neck[neck.length - 1];
  A.mass([['e', hx + 2.6, hy - 0.4, vip ? 5 : 4.2, vip ? 3.6 : 3], ['c', hx + 3, hy, hx + (vip ? 8.6 : 8), hy + 0.4, vip ? 2.6 : 2.2, 1.4]], body, { edge: true, pat: (x, y, nx, ny, I, m) => (vip && m.td < 1.6 ? ramp(C.b) : m.bd < 1.4 ? R.belly : null) });
  if (vip) A.px(hx + 8.8, hy - 1.4, body[4]); // hocico respingón
  if (P.at) { A.blob(hx + 6, hy + 2.4, 3, 1.6, ramp(MOUTH), { lo: 2, hi: 3 }); A.line(hx + 7.6, hy + 1.4, hx + 7.6, hy + 3.4, FANG); A.line(hx + 9, hy + 1.6, hx + 12.6, hy + 2.4, TONGUE); A.px(hx + 13.2, hy + 1.8, TONGUE); A.px(hx + 13.2, hy + 3, TONGUE); }
  else if (o.pose === 'idle' && o.f) { A.line(hx + 9, hy + 1, hx + 11.6, hy + 1.4, TONGUE); A.px(hx + 12.2, hy + 0.8, TONGUE); A.px(hx + 12.2, hy + 2, TONGUE); }
  if (P.hu) eyeB(A, hx + 3.4, hy - 1.6, { closed: true }); else { A.rect(hx + 3, hy - 2, 2.4, 2, vip ? '#d89030' : '#c8b030'); A.rect(hx + 3.8, hy - 2, 1, 2, EYE); A.px(A.flip ? hx + 4.4 : hx + 3, hy - 2, GLINT); }
};
B.enjambre = (A, o) => {
  const { C } = o; const at = o.pose === 'attack', hu = o.pose === 'hurt';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39 + o.f * 0.5, r = 4 + (i % 4) * 4.2;
    let x = 24 + Math.cos(a) * r * 1.2, y = 26 + Math.sin(a) * r * 0.8;
    if (at) x += 6 + (i % 3) * 3; if (hu) { x += Math.cos(i * 1.7) * 5; y += Math.sin(i * 2.1) * 5; }
    const bee = (bx, by, sc) => {
      A.blob(bx, by, 2.6 * sc, 1.8 * sc, ramp(C.c), { pat: (X) => ((Math.floor(X / 1.4)) % 2 ? ramp(C.b) : null) });
      A.blob(bx + 2.4 * sc, by - 0.2, 1.3 * sc, 1.2 * sc, ramp(C.b), {});
      const wf = (o.f + i) % 2; A.blob(bx - 0.4, by - 2.4 * sc - wf, 1.8 * sc, 1.2 * sc, ramp(C.wing), { lo: 4, hi: 6 });
      if (at) A.px(bx - 3 * sc, by + 0.4, C.b);
    };
    bee(x, y, i % 3 === 0 ? 1.15 : 0.9);
  }
};
