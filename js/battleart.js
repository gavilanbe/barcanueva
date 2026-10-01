// Arte del combate: fondos por bioma y franja (capas con paralaje y suelo en perspectiva que se desplaza
// por líneas), plataformas, monstruos del folklore y efectos. Todo se pinta en código y se cachea; por
// fotograma sólo se animan detalles pequeños (nubes, agua, llamas, estrellas, hojas…).
import { INK, ramp, mix, PAL, outlineSel, rgb, hex } from './pal.js';
import { bayer, hash, vnoise, fbm } from './px.js';
import { canvas } from './util.js';

const W = 240, H = 160;
const fl = Math.floor, rnd = Math.round;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = (t) => 1 - (1 - cl(t)) ** 3;
const eIn = (t) => cl(t) ** 2;
const seg = (t, a, b) => cl((t - a) / (b - a));
const sm = (t) => (t = cl(t), t * t * (3 - 2 * t));

// ───────────── Lienzo por píxeles (ImageData) con primitivas propias ─────────────
const RGBC = new Map();
const rgbc = (c) => { let v = RGBC.get(c); if (!v) { v = rgb(c); RGBC.set(c, v); } return v; };
class Buf {
  constructor(w, h, ox = 0, oy = 0) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.img = new ImageData(w, h); this.a = this.img.data; }
  set(x, y, c) {
    x = fl(x) + this.ox; y = fl(y) + this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const v = rgbc(c), k = (y * this.w + x) * 4, a = this.a; a[k] = v[0]; a[k + 1] = v[1]; a[k + 2] = v[2]; a[k + 3] = 255;
  }
  on(x, y) { x = fl(x) + this.ox; y = fl(y) + this.oy; return x >= 0 && y >= 0 && x < this.w && y < this.h && this.a[(y * this.w + x) * 4 + 3] > 0; }
  get(x, y) { x = fl(x) + this.ox; y = fl(y) + this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; const k = (y * this.w + x) * 4, a = this.a; return a[k + 3] ? hex(a[k], a[k + 1], a[k + 2]) : null; }
  off(x, y) { x = fl(x) + this.ox; y = fl(y) + this.oy; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[(y * this.w + x) * 4 + 3] = 0; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  dith(x, y, w, h, c, d) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bayer(x + i, y + j) < d) this.set(x + i, y + j, c); }
  ell(cx, cy, rx, ry, c, d = 1) {
    cx = rnd(cx); cy = rnd(cy);
    for (let j = -ry; j <= ry; j++) {
      const w = rnd(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry + 0.0001))));
      for (let i = -w; i < w; i++) if (d >= 1 || bayer(cx + i, cy + j) < d) this.set(cx + i, cy + j, c);
    }
  }
  line(x0, y0, x1, y1, c) {
    x0 = rnd(x0); y0 = rnd(y0); x1 = rnd(x1); y1 = rnd(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
    while (n++ < 4000) { this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  poly(pts, c, d = 1) {
    let y0 = 1e9, y1 = -1e9; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = fl(y0); y <= Math.ceil(y1); y++) {
      const xs = [], yc = y + 0.5;
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = rnd(xs[i]); x < rnd(xs[i + 1]); x++) if (d >= 1 || bayer(x, y) < d) this.set(x, y, c);
    }
  }
  canvas() { const [cv, x] = canvas(this.w, this.h); x.putImageData(this.img, 0, 0); return cv; }
}

// ───────────── Gradación por franja horaria ─────────────
// Multiplica por un tono de luz y mezcla hacia el ambiente: mañana melocotón, tarde dorada,
// crepúsculo rosa-violeta y noche azul. Las luces (ventanas, velas, fuego) se pintan SIN gradar.
const GRADE = {
  manana: ['#fff2e8', '#ffc890', 0.06], tarde: ['#ffe8c4', '#ff9440', 0.1],
  crepusculo: ['#e8a8c4', '#48205e', 0.15], noche: ['#6c7cc4', '#0a1232', 0.2],
};
const GC = new Map();
export function gradeColor(c, ph) {
  const g = GRADE[ph]; if (!g) return c; const k = c + ph; let v = GC.get(k); if (v) return v;
  const [r, gg, b] = rgbc(c), [mr, mg, mb] = rgbc(g[0]), [ar, ag, ab] = rgbc(g[1]);
  let R = (r * mr) / 255, G = (gg * mg) / 255, B = (b * mb) / 255;
  R += (ar - R) * g[2]; G += (ag - G) * g[2]; B += (ab - B) * g[2];
  v = hex(R, G, B); GC.set(k, v); return v;
}
const gr = (a, ph) => a.map((c) => gradeColor(c, ph));

// Luz desde arriba-izquierda-delante.
const LV = (() => { const v = [-0.52, -0.64, 0.56], n = Math.hypot(...v); return v.map((a) => a / n); })();

// Sombreado por «racimo de esferas»: cada blob {x,y,r,ry?,z?,zo?} aporta una semiesfera; gana la más alta.
// Sirve para copas de árbol, nubes, rocas y cuerpos de criaturas.
function blobs(buf, bl, R, o = {}) {
  const amb = o.amb ?? 0.16, n = R.length - 1, flat = o.flat ?? 1, tex = o.tex || 0, bias = o.bias || 0;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const b of bl) { const ry = b.ry ?? b.r; x0 = Math.min(x0, b.x - b.r); x1 = Math.max(x1, b.x + b.r); y0 = Math.min(y0, b.y - ry); y1 = Math.max(y1, b.y + ry); }
  for (let y = fl(y0); y <= Math.ceil(y1); y++) for (let x = fl(x0); x <= Math.ceil(x1); x++) {
    let best = -1e9, nx = 0, ny = 0, nz = 0;
    for (const b of bl) {
      const ry = b.ry ?? b.r, dx = (x + 0.5 - b.x) / b.r, dy = (y + 0.5 - b.y) / ry, d2 = dx * dx + dy * dy;
      if (d2 >= 1) continue;
      const z = Math.sqrt(1 - d2), hh = z * (b.z ?? 1) + (b.zo ?? 0);
      if (hh > best) { best = hh; nx = dx; ny = dy; nz = z * flat; }
    }
    if (best === -1e9 || (o.clip && !o.clip(x, y))) continue;
    const nl = Math.hypot(nx, ny, nz) || 1;
    let v = amb + (1 - amb) * Math.max(0, (nx * LV[0] + ny * LV[1] + nz * LV[2]) / nl) + bias;
    if (tex) v += (o.tf ? o.tf(x, y) : vnoise(x, y, o.ts ?? 3, o.seed ?? 1) - 0.5) * tex;
    const f = cl(v) * n; let i = fl(f); if (f - i > (o.nod ? 0.5 : bayer(x, y))) i++;
    buf.set(x, y, R[i > n ? n : i]);
  }
}
// Textura «hojosa»: grumos de hojas que rompen las bandas de luz.
const leafy = (seed, k = 2.3) => (x, y) => (vnoise(x, y, k, seed) > 0.56 ? 0.55 : vnoise(x + 7, y + 3, k * 0.8, seed + 1) < 0.3 ? -0.45 : 0);

// ───────────── Cielo ─────────────
const SKY = {
  manana: ['#4c84cc', '#6498d4', '#80aedf', '#9ec4e8', '#c0d6e8', '#e2dcd0', '#f4d6b6'],
  dia: ['#2f70cc', '#3b80d6', '#4a90dc', '#5ea2e4', '#76b6ec', '#94caf2', '#b8def8'],
  tarde: ['#3c5cae', '#5670b6', '#7c86b2', '#a898a8', '#d4a892', '#eebc84', '#f8d48a'],
  crepusculo: ['#1c1c56', '#302668', '#4e3078', '#783a80', '#a84a7e', '#d66872', '#f29a66'],
  noche: ['#060820', '#0a0e2a', '#0e1436', '#131b44', '#182450', '#1e2c5c', '#263666'],
};
const CLOUD = {
  dia: ['#86a2cc', '#a6bede', '#c6d8ee', '#e4eef8', '#ffffff'],
  manana: ['#948cb0', '#b8aac4', '#dac8d2', '#f2e4e0', '#fff8f0'],
  tarde: ['#7e7098', '#ae8c8e', '#d8aa8a', '#f2cea0', '#fff0c8'],
  crepusculo: ['#38285e', '#622f72', '#9c4478', '#d8707a', '#ffb088'],
  noche: ['#10163a', '#1a234c', '#283462', '#3c4b80', '#5a6ca0'],
};
const MS = 6, MF = 10, MM = 18, MG = 34, MFR = 32; // márgenes de cada capa (paralaje máx. 32 px)

function skyLayer(ph, hz) {
  const w = W + 2 * MS, h = hz + 4; const [c, x] = canvas(w, h);
  const cols = SKY[ph], n = cols.length, band = (hz - 2) / n, D = 3;
  for (let j = 0; j < h; j++) {
    const f = j / band, k = Math.min(n - 1, fl(f)), into = (f - k) * band; // filas dentro de la banda
    for (let i = 0; i < w; i++) {
      let kk = k; if (k + 1 < n && into > band - D) { const t = (into - (band - D)) / D; if (bayer(i, j) < t) kk = k + 1; }
      x.fillStyle = cols[kk]; x.fillRect(i, j, 1, 1);
    }
  }
  const P = (col, px, py, pw = 1, phh = 1) => { x.fillStyle = col; x.fillRect(px + MS, py, pw, phh); };
  if (ph === 'noche' || ph === 'crepusculo') {
    for (let i = 0; i < 110; i++) {
      const sx = fl(hash(i, 1, 7) * w) - MS, sy = fl(hash(i, 2, 7) * (ph === 'noche' ? hz - 8 : 26)), b = hash(i, 3, 7);
      if (ph === 'crepusculo' && b < 0.75) continue;
      P(b > 0.9 ? '#fff6dc' : b > 0.6 ? '#c4ccf0' : '#6a76b4', sx, sy);
      if (b > 0.97) { P('#8a96d0', sx - 1, sy); P('#8a96d0', sx + 1, sy); P('#8a96d0', sx, sy - 1); P('#8a96d0', sx, sy + 1); }
    }
  }
  const skyAt = (py) => cols[cl(fl(py / band), 0, n - 1)];
  const disc = (cx, cy, r, core, halo) => {
    for (let j = -r - 7; j <= r + 7; j++) for (let i = -r - 7; i <= r + 7; i++) {
      const d = Math.hypot(i + 0.5, j + 0.5), bgc = skyAt(cy + j);
      if (d > r && d <= r + 2.5) P(mix(bgc, halo, 0.55), cx + i, cy + j);
      else if (d > r + 2.5 && d <= r + 5) P(mix(bgc, halo, 0.28), cx + i, cy + j);
      else if (d > r + 5 && d <= r + 7 && bayer(cx + i, cy + j) < 0.5) P(mix(bgc, halo, 0.14), cx + i, cy + j);
    }
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i + 0.5, j + 0.5); if (d <= r) P(d > r - 1.2 && i + j > 0 ? mix(core, halo, 0.5) : core, cx + i, cy + j); }
  };
  if (ph === 'manana') disc(46, 40, 7, '#fff8dc', '#ffe2ae');
  if (ph === 'dia') disc(206, 13, 6, '#ffffff', '#fff2b8');
  if (ph === 'tarde') disc(192, 33, 8, '#fff0b2', '#ffc06a');
  if (ph === 'crepusculo') disc(64, hz - 8, 13, '#ffc272', '#ff7a58');
  if (ph === 'noche') {
    const mx = 192, my = 18, r = 7;
    for (let j = -r - 6; j <= r + 6; j++) for (let i = -r - 6; i <= r + 6; i++) { const d = Math.hypot(i, j); if (d > r && d < r + 6 && bayer(mx + i, my + j) < 0.3 - (d - r) * 0.04) P('#3a4a86', mx + i, my + j); }
    const bg = cols[cl(fl(my / band), 0, n - 1)];
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i + 0.5, j + 0.5), d2 = Math.hypot(i + 0.5 - 4, j + 0.5 + 2);
      if (d <= r) P(d2 < r - 0.5 ? bg : d > r - 1.3 ? '#d8d0b0' : '#f6f0d6', mx + i, my + j);
    }
    P('#d8d0b0', mx - 4, my + 1, 2, 1); P('#d8d0b0', mx - 2, my + 4, 1, 1);
  }
  return c;
}
// Nubes: cúmulos de base plana sombreados por esferas.
const cloudCache = new Map();
function cloudSprite(ph, v) {
  const k = ph + v; let c = cloudCache.get(k); if (c) return c;
  const w = 34 + fl(hash(v, 1, 3) * 30), h = 18; const b = new Buf(w + 4, h + 2);
  const bl = []; const n = 4 + fl(hash(v, 2, 3) * 4);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const r = 3 + Math.sin(t * Math.PI) * (5 + hash(v, i, 9) * 4); bl.push({ x: 2 + t * w, y: h - 2 - r * 0.7, r: r * 1.15, ry: r }); }
  blobs(b, bl, CLOUD[ph] || CLOUD.dia, { amb: 0.28, clip: (x, y) => y < h - 1 });
  for (let i = 0; i < b.w; i++) if (b.on(i, h - 2)) b.set(i, h - 2, (CLOUD[ph] || CLOUD.dia)[1]);
  c = b.canvas(); cloudCache.set(k, c); return c;
}
function drawClouds(ctx, D, ph, t, cam) {
  const n = D.clouds; if (!n) return;
  for (let i = 0; i < n; i++) {
    const sp = 0.012 + hash(i, 4, D.seed) * 0.02, span = W + 140;
    const x = (((hash(i, 5, D.seed) * span + t * sp) % span) + span) % span - 70 - cam * 0.12;
    const y = 4 + fl(hash(i, 6, D.seed) * (D.cloudY || 30));
    ctx.drawImage(cloudSprite(ph, (i * 7 + D.seed) % 11), rnd(x), y);
  }
}

// ───────────── Pintores de escenario ─────────────
// Pico de montaña: cara izquierda iluminada, derecha en sombra, arista irregular y nieve opcional.
function peak(b, cx, top, base, half, R, o = {}) {
  const s = o.seed || 1, sn = o.snow;
  for (let y = fl(top); y < base; y++) {
    const t = (y - top) / (base - top);
    const wl = half * t * (0.85 + vnoise(0, y, 5, s) * 0.35) + 1, wr = half * t * (0.85 + vnoise(9, y, 5, s + 3) * 0.35) + 1;
    const xd = cx + (vnoise(5, y, 7, s + 5) - 0.5) * 4 * t + t * half * 0.12;
    for (let x = fl(cx - wl); x <= Math.ceil(cx + wr); x++) {
      const lit = x < xd; let c = lit ? R[2] : R[1];
      // barrancos: estrías diagonales
      const gl = (x - xd) * (lit ? -1 : 1) + y * 0.9; if (vnoise(gl, 0, 2.5, s + 9) > 0.72 && t > 0.15) c = lit ? R[1] : R[0];
      if (lit && x > xd - 2) c = R[3];
      if (sn) { const sl = top + (base - top) * sn.d + (vnoise(x, 1, 3, s + 7) - 0.5) * 7 + (lit ? 0 : 2); if (y < sl) c = lit ? (x > xd - 2 ? sn.c[2] : sn.c[1]) : sn.c[0]; }
      b.set(x, y, c);
    }
  }
}
// Colinas: perfil y = yf(x); cara a contraluz más oscura; borde superior iluminado.
function hills(b, x0, x1, yf, R, o = {}) {
  const bot = o.bottom ?? 200, s = o.seed || 3;
  for (let x = x0; x < x1; x++) {
    const top = fl(yf(x)), sl = yf(x + 2) - yf(x - 2);
    for (let y = top; y < bot; y++) {
      const dpt = y - top; let v = 0.55 - (sl > 0 ? 0.18 : -0.08) * cl(Math.abs(sl) / 2) + (dpt < 2 ? 0.25 : dpt < 4 ? 0.1 : 0) - dpt * (o.fall ?? 0.012);
      v += (fbm(x, y, o.ts ?? 9, s, 2) - 0.5) * (o.tex ?? 0.35);
      const n = R.length - 1, f = cl(v) * n; let i = fl(f); if (f - i > bayer(x, y)) i++;
      b.set(x, y, R[Math.min(n, i)]);
    }
  }
}
// Árboles. y = suelo; s = escala. R = rampa de hojas, T = rampa de tronco.
function tree(b, kind, x, y, s, R, T, seed = 1) {
  const r = (k) => hash(seed, k, 31);
  if (kind === 'oak' || kind === 'olive' || kind === 'bush') {
    const bush = kind === 'bush', th = bush ? 0 : (kind === 'olive' ? 5 : 7) * s;
    if (!bush) {
      b.rect(rnd(x - s), rnd(y - th), Math.max(2, rnd(2 * s)), rnd(th), T[2]); b.rect(rnd(x - s), rnd(y - th), 1, rnd(th), T[4]);
      if (kind === 'olive') { b.line(x, y - th * 0.6, x - 3 * s, y - th - 2 * s, T[3]); b.line(x, y - th * 0.7, x + 3 * s, y - th - 1 * s, T[2]); }
    }
    const cy = y - th - (bush ? 2 : 5) * s, w = (bush ? 6 : kind === 'olive' ? 9 : 8) * s, bl = [];
    const n = bush ? 4 : 7;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r(i); bl.push({ x: x + Math.cos(a) * w * 0.55, y: cy + Math.sin(a) * w * 0.32, r: w * (0.42 + r(i + 9) * 0.18) }); }
    bl.push({ x, y: cy - w * 0.15, r: w * 0.62, z: 1.15 });
    blobs(b, bl, R, { amb: 0.12, tex: 0.9, tf: leafy(seed, kind === 'olive' ? 1.6 : 2.2), flat: 0.8 });
    if (kind === 'olive') for (let i = 0; i < 6; i++) { const px = x + (r(i + 30) - 0.5) * w * 1.4, py = cy + (r(i + 40) - 0.5) * w * 0.7; if (b.on(px, py)) b.set(px, py, R[1]); }
  } else if (kind === 'pine') { // pino piñonero: tronco alto y copa plana
    const th = 13 * s, lean = (r(1) - 0.5) * 4 * s;
    b.line(x, y, x + lean, y - th, T[2]); b.line(x + 1, y, x + lean + 1, y - th, T[3]); b.line(x - 1, y - 2, x + lean - 1, y - th + 2, T[1]);
    const cy = y - th - 2 * s, bl = [];
    for (let i = 0; i < 6; i++) { const t = i / 5 - 0.5; bl.push({ x: x + lean + t * 15 * s, y: cy - (1 - Math.abs(t) * 1.6) * 2 * s, r: (4 + r(i + 2) * 2) * s, ry: 3 * s }); }
    blobs(b, bl, R, { amb: 0.1, tex: 0.8, tf: leafy(seed, 2), clip: (px, py) => py < cy + 2 * s });
  } else if (kind === 'fir') { // abeto / pino negro: pisos triangulares
    b.rect(rnd(x - 1), rnd(y - 3 * s), 2, rnd(3 * s), T[2]);
    const hh = 18 * s;
    for (let k = 0; k < 4; k++) {
      const ty = y - hh + k * hh * 0.2, by = ty + hh * 0.38, ww = (2.5 + k * 1.6) * s;
      for (let yy = fl(ty); yy < by; yy++) {
        const t = (yy - ty) / (by - ty), wv = ww * t + 0.5;
        for (let xx = fl(x - wv); xx <= Math.ceil(x + wv); xx++) {
          const lit = xx < x + (yy % 3 === 0 ? 1 : 0); let c = lit ? R[3] : R[1];
          if (yy > by - 2) c = R[0]; else if (lit && xx < x - wv * 0.5 && t > 0.4) c = R[4];
          if ((xx === fl(x - wv) || xx === Math.ceil(x + wv)) && hash(xx, yy, seed) < 0.5) continue;
          b.set(xx, yy, c);
        }
      }
    }
  } else if (kind === 'cypress' || kind === 'poplar') {
    const hh = (kind === 'cypress' ? 22 : 24) * s, ww = (kind === 'cypress' ? 3.2 : 4.4) * s;
    b.rect(rnd(x - 1), rnd(y - 2 * s), 2, rnd(2 * s), T[2]);
    const bl = []; for (let i = 0; i < 5; i++) { const t = i / 4; bl.push({ x: x + (r(i) - 0.5) * s, y: y - 2 * s - hh * (0.15 + t * 0.7), r: ww * (1 - t * (kind === 'cypress' ? 0.62 : 0.4)), ry: hh * 0.2 }); }
    blobs(b, bl, R, { amb: 0.12, tex: 0.7, tf: leafy(seed, 1.6) });
  }
}
// Masía catalana en 3/4: fachada de piñón, pared lateral en sombra, tejado de teja árabe.
function masia(b, x, y, s, ph) {
  const P = gr(PAL.plaster, ph), T = gr(PAL.terra, ph), Wd = gr(PAL.wood, ph), St = gr(PAL.wstone, ph);
  const fw = 20 * s, sw = 12 * s, wh = 13 * s, rh = 7 * s;
  b.rect(x, y - wh, fw, wh, P[4]); b.rect(x + fw, y - wh, sw, wh, P[2]);                // fachada y lateral
  b.rect(x + fw, y - wh, 1, wh, P[1]); b.rect(x, y - 2, fw, 2, P[3]); b.rect(x + fw, y - 2, sw, 2, P[1]);
  for (let i = 0; i < fw; i += 3) if (hash(i, 3, x) < 0.4) b.set(x + i, y - wh + 3 + fl(hash(i, 4, x) * (wh - 6)), P[3]);
  b.poly([[x - 1, y - wh], [x + fw / 2, y - wh - rh], [x + fw + 1, y - wh]], P[4]);              // piñón
  b.poly([[x + fw / 2, y - wh - rh], [x + fw / 2 + sw + 2, y - wh - rh + 2], [x + fw + sw + 2, y - wh + 1], [x + fw + 1, y - wh + 1]], T[3]);
  for (let i = 0; i < sw + 2; i += 2) b.line(x + fw / 2 + i, y - wh - rh + 1 + i * 0.12, x + fw + 1 + i, y - wh + 1, T[2]);
  b.line(x - 1, y - wh, x + fw / 2, y - wh - rh, T[4]); b.line(x + fw / 2, y - wh - rh, x + fw + 1, y - wh, T[2]);
  b.line(x - 1, y - wh + 1, x + fw / 2, y - wh - rh + 1, T[3]);
  const dx = x + fw / 2 - 3 * s; b.ell(dx + 3 * s, y - 6 * s, 3 * s, 3 * s, St[3]); b.rect(dx, y - 6 * s, 6 * s, 6 * s, St[3]);
  b.ell(dx + 3 * s, y - 6 * s, 2 * s, 2 * s, Wd[1]); b.rect(dx + s, y - 6 * s, 4 * s, 6 * s, Wd[1]); b.rect(dx + s, y - 6 * s, 1, 6 * s, Wd[2]);
  for (const wx of [x + 3 * s, x + fw - 6 * s]) { b.rect(wx, y - wh + 3 * s, 3 * s, 3 * s, INK); b.rect(wx - 1, y - wh + 3 * s, 1, 3 * s, gr(PAL.green, ph)[2]); }
  b.rect(x + fw / 2 - 1, y - wh - 4 * s, 2 * s, 2 * s, INK);
  b.rect(x + fw + 4 * s, y - wh + 4 * s, 2 * s, 3 * s, INK);
  b.rect(x + fw + sw - 4 * s, y - wh - 6 * s, 3 * s, 5 * s, P[3]); b.rect(x + fw + sw - 4 * s, y - wh - 7 * s, 3 * s, 1, T[2]); // chimenea
  return { chimney: [x + fw + sw - 3 * s, y - wh - 8 * s] };
}
// Agua en banda horizontal con reflejos.
function waterBand(b, x0, x1, y0, y1, R, seed = 5) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    for (let x = x0; x < x1; x++) {
      let v = lerp(0.35, 0.75, t) + (vnoise(x * 0.25, y * 2, 3, seed) - 0.5) * 0.35;
      const n = R.length - 1, f = cl(v) * n; let i = fl(f); if (f - i > bayer(x, y)) i++;
      b.set(x, y, R[Math.min(n, i)]);
    }
  }
  for (let k = 0; k < (x1 - x0) * (y1 - y0) / 40; k++) {
    const x = x0 + fl(hash(k, 1, seed) * (x1 - x0)), y = y0 + fl(hash(k, 2, seed) * (y1 - y0)), w = 2 + fl(hash(k, 3, seed) * 5 * (0.4 + (y - y0) / (y1 - y0)));
    b.rect(x, y, w, 1, R[hash(k, 4, seed) < 0.6 ? R.length - 1 : R.length - 2]);
  }
}

// Cuantiza v∈[0,1] en la rampa R con tramado ordenado en (x,y).
const dq = (R, v, x, y, nod) => { const n = R.length - 1, f = cl(v) * n; let i = fl(f); if (f - i > (nod ? 0.5 : bayer(x, y))) i++; return R[i > n ? n : i]; };
// Neblina de distancia hacia el color del horizonte del cielo.
const hazeOf = (ph) => SKY[ph][SKY[ph].length - 2];
const hazeR = (R, ph, t) => R.map((c) => mix(gradeColor(c, ph), hazeOf(ph), t));

// Matas de hierba y florecillas para el suelo (tamaño según la profundidad de la fila).
function tuft(b, x, y, sz, R, seed) {
  const n = 2 + fl(sz * 1.5), h = 1 + sz * 1.6;
  for (let k = 0; k < n; k++) {
    const bx = x + rnd((k - n / 2) * (sz > 2 ? 1.5 : 1)), bh = rnd(h * (0.6 + hash(k, seed, 5) * 0.6)), lean = hash(k, seed, 6) < 0.5 ? -1 : 1;
    for (let i = 0; i < bh; i++) b.set(bx + (i > bh * 0.6 ? lean : 0), y - i, i === bh - 1 ? R[R.length - 1] : i > bh / 2 ? R[R.length - 2] : R[R.length - 3]);
  }
}
function flower(b, x, y, sz, col) {
  if (sz < 1.6) { b.set(x, y, col); return; }
  b.set(x, y, '#2c6a3a'); b.set(x, y - 1, col); b.set(x - 1, y - 2, col); b.set(x + 1, y - 2, col); b.set(x, y - 3, col); b.set(x, y - 2, '#fff2a0');
}
function pebble(b, x, y, sz, R) {
  const w = Math.max(1, rnd(sz * 1.2)), h = Math.max(1, rnd(sz * 0.7));
  b.rect(x, y - h, w, h, R[3]); b.rect(x, y - h, Math.max(1, w - 1), 1, R[5]); b.rect(x + 1, y, w, 1, R[1]);
}
// Esparce decoración por el suelo: más abundante y grande cerca de la cámara.
function scatter(b, gh, n, seed, fn) {
  for (let k = 0; k < n; k++) {
    const j = fl(gh * Math.sqrt(hash(k, 1, seed))), x = fl(hash(k, 2, seed) * (W + 2 * MG)) - MG, d = j + 6;
    fn(x, j, d / 26, k);
  }
}

// ───────────── Biomas ─────────────
// hz: fila del horizonte (empieza el suelo). far/mid/front: pintores (Buf, ph). gt: textura del suelo
// en coordenadas de mundo (u lateral, v profundidad). deco: adornos del suelo. anim: animación por fotograma.
const BIOMES = {};

// Llano de Barcanueva: sierra lejana, masía con cipreses, trigal y olivar.
BIOMES.pradera = {
  hz: 64, clouds: 5, seed: 3, plat: 'grass',
  far(b, ph) {
    const R = hazeR(['#3e4c7e', '#4c5c8e', '#5e6e9e', '#7282ae', '#8a98bc'], ph, 0.35);
    hills(b, -MF, W + MF, (x) => 40 + fbm(x, 0, 46, 11, 3) * 14 - Math.sin(x / 70) * 4, R, { tex: 0.12, fall: 0.004 });
    const R2 = hazeR(PAL.grass.slice(1, 7), ph, 0.5);
    hills(b, -MF, W + MF, (x) => 52 + fbm(x, 3, 30, 12, 3) * 7, R2, { tex: 0.2, fall: 0.01 });
  },
  mid(b, ph) {
    const G = hazeR(PAL.grass.slice(2, 9), ph, 0.12), T = gr(PAL.wood, ph), O = hazeR(PAL.olive, ph, 0.08), Cy = hazeR(PAL.leaf.slice(0, 7), ph, 0.1);
    const yf = (x) => 56 + Math.sin(x / 38) * 2.5 + fbm(x, 9, 24, 13, 2) * 3;
    hills(b, -MM, W + MM, yf, G, { tex: 0.28 });
    // trigal dorado junto al horizonte
    const Wh = hazeR(['#8a6a2a', '#a8842e', '#c8a03a', '#dcbc4e', '#ecd472', '#f6e8a0'], ph, 0.08);
    for (let x = 84; x < 172; x++) { const top = fl(yf(x)) + 3 + (x < 92 ? 92 - x : 0) * 0.5; for (let y = fl(top); y < 64; y++) b.set(x, y, dq(Wh, 0.55 + (vnoise(x * 0.7, y * 3, 2, 17) - 0.5) * 0.8 - (y - top) * 0.02, x, y)); if (hash(x, 1, 3) < 0.5) b.set(x, top - 1, Wh[4]); }
    // camino de la masía
    const D = hazeR(PAL.dirt, ph, 0.1);
    for (let y = 56; y < 64; y++) { const cx = 46 + (y - 56) * 2.2, w = 1 + (y - 56) * 0.4; for (let x = fl(cx - w); x <= cx + w; x++) b.set(x, y, dq(D.slice(3), 0.5 + (hash(x, y, 4) - 0.5) * 0.4, x, y)); }
    const m = masia(b, 28, 56, 1, ph); this._chim = m.chimney;
    tree(b, 'cypress', 64, 57, 0.85, Cy, T, 4); tree(b, 'cypress', 71, 58, 0.7, Cy, T, 5); tree(b, 'cypress', 16, 57, 0.6, Cy, T, 6);
    for (let i = 0; i < 9; i++) { const x = 188 + i * 9 + (i % 2) * 3, y = 59 + (i % 2) * 2; tree(b, 'olive', x, y, 0.45, O, T, 20 + i); }
    tree(b, 'oak', 112, 58, 0.55, hazeR(PAL.leaf, ph, 0.08), T, 8);
  },
  gt(u, v, j, fd, x) {
    const G = this._G; const n = fbm(u * 0.5, v * 0.9, 7, 21, 3), blade = vnoise(u * 2.6, v * 0.35, 1, 22);
    return dq(G, 0.52 + (n - 0.5) * 0.7 * fd + (blade - 0.5) * 0.35 * fd + (j / 96) * 0.1, x, j);
  },
  deco(b, ph, gh) {
    const G = gr(PAL.grass, ph);
    scatter(b, gh, 260, 31, (x, j, sz, k) => { if (sz < 0.5) return; const r = hash(k, 9, 31); if (r < 0.62) tuft(b, x, j, sz, G, k); else if (sz > 0.7) flower(b, x, j, sz, gradeColor(['#e8423a', '#f4f0e0', '#f6c83a', '#9c6ad8'][fl(hash(k, 8, 31) * 4)], ph)); });
  },
  anim(ctx, L, ph, t, cam) {
    if (this._chim && ph !== 'noche') smoke(ctx, this._chim[0] - cam * 0.5, this._chim[1], t, ph);
    if (ph === 'noche') fireflies(ctx, t, 70, 150, 14, cam);
    else butterflies(ctx, t, cam, ph);
  },
};

// Sierra de Collsaverola: troncos que enmarcan, haces de luz, sotobosque.
BIOMES.bosque = {
  hz: 66, clouds: 2, cloudY: 12, seed: 5, plat: 'moss',
  far(b, ph) {
    const R = hazeR(['#16303a', '#1c3a40', '#244848', '#2e5650', '#3a6658'], ph, 0.45);
    hills(b, -MF, W + MF, (x) => 34 + fbm(x, 0, 30, 41, 3) * 10, R, { tex: 0.15 });
    for (let x = -MF; x < W + MF; x += 5) { const y = 34 + fbm(x, 0, 30, 41, 3) * 10; tree(b, 'fir', x + hash(x, 1, 2) * 3, y + 6, 0.55 + hash(x, 2, 2) * 0.3, hazeR(PAL.pine, ph, 0.45), hazeR(PAL.wood, ph, 0.45), x); }
  },
  mid(b, ph) {
    const Lf = hazeR(PAL.leaf, ph, 0.18), Pn = hazeR(PAL.pine, ph, 0.15), T = hazeR(PAL.wood, ph, 0.2), F = hazeR(PAL.forest, ph, 0.15);
    hills(b, -MM, W + MM, (x) => 56 + fbm(x, 2, 20, 43, 2) * 5, F, { tex: 0.4 });
    for (let i = 0; i < 9; i++) { const x = -10 + i * 31 + hash(i, 1, 44) * 12, y = 60 + hash(i, 2, 44) * 4; if (x > 140 && x < 205) continue; tree(b, i % 3 ? 'fir' : 'oak', x, y, 0.9 + hash(i, 3, 44) * 0.4, i % 3 ? Pn : Lf, T, 50 + i); }
    // árboles lejanos tras el enemigo, difuminados por la bruma del bosque
    for (const [x, y, sc] of [[150, 58, 0.8], [174, 56, 0.7], [196, 59, 0.85]]) tree(b, 'oak', x, y, sc, hazeR(PAL.leaf, ph, 0.42), hazeR(PAL.wood, ph, 0.42), x);
    tree(b, 'bush', 120, 64, 1.1, Lf, T, 61); tree(b, 'bush', 214, 64, 1.0, Lf, T, 62);
  },
  front(b, ph) { // tronco cercano a la izquierda y copas que enmarcan las esquinas
    const T = gr(PAL.wood, ph), Lf = gr(PAL.leaf, ph);
    for (let y = 0; y < H; y++) {
      const w = 15 + (y > 116 ? (y - 116) ** 1.25 * 0.35 : 0) + Math.sin(y / 9) * 0.6;
      for (let x = -MFR; x < w; x++) { const rx = w - x; let v = 0.34 + (rx < 3 ? -0.2 : rx < 8 ? 0.04 : 0.16) + (vnoise(x * 2.4, y * 0.22, 2, 77) - 0.5) * 0.5; if (vnoise(x * 3, y * 0.15, 1.5, 78) > 0.72) v -= 0.18; b.set(x, y, dq(T, v, x, y)); }
    }
    for (let k = 0; k < 2; k++) { const y0 = 30 + k * 34; b.ell(12 + k, y0, 3, 5, T[0]); b.ell(11 + k, y0, 2, 4, T[1]); } // nudos
    blobs(b, [{ x: -16, y: -4, r: 40, ry: 24 }, { x: 30, y: -10, r: 28, ry: 18 }, { x: 62, y: -14, r: 18, ry: 13 }, { x: 6, y: 14, r: 18, ry: 10 }], Lf, { amb: 0.08, tex: 1.1, tf: leafy(80, 2.4), bias: -0.05 });
    blobs(b, [{ x: 250, y: -6, r: 38, ry: 22 }, { x: 214, y: -12, r: 22, ry: 15 }, { x: 266, y: 16, r: 22, ry: 14 }], Lf, { amb: 0.08, tex: 1.1, tf: leafy(81, 2.4), bias: -0.05 });
  },
  gt(u, v, j, fd, x) {
    const F = this._G; const n = fbm(u * 0.45, v * 0.8, 6, 51, 3), lit = vnoise(u * 0.2, v * 0.3, 4, 52);
    if (fbm(u * 0.3, v * 0.5, 5, 53, 2) > 0.68 && fd > 0.2) return dq(this._D, 0.45 + (n - 0.5) * 0.7, x, j);
    return dq(F, 0.42 + (n - 0.5) * 0.7 * fd + (lit > 0.62 && this._ph !== 'noche' ? 0.22 : 0) + j / 96 * 0.1, x, j);
  },
  deco(b, ph, gh) {
    const G = gr(PAL.leaf, ph), Mr = gr(PAL.red, ph);
    scatter(b, gh, 200, 57, (x, j, sz, k) => {
      if (sz < 0.5) return; const r = hash(k, 9, 57);
      if (r < 0.55) tuft(b, x, j, sz * 1.1, G, k);
      else if (r < 0.62 && sz > 1.4) { b.rect(x, j - 2, 1, 2, '#e8dcc0'); b.rect(x - 1, j - 3, 3, 1, Mr[4]); b.set(x, j - 3, '#fff0e0'); } // seta
      else if (r < 0.75 && sz > 1) b.line(x, j, x + rnd(sz * 3), j - 1, gr(PAL.wood, ph)[2]);
    });
  },
  anim(ctx, L, ph, t, cam) {
    if (ph !== 'noche' && ph !== 'crepusculo') godRays(ctx, t, cam, ph);
    leaves(ctx, t, cam, ph === 'noche' ? 3 : 6);
    if (ph === 'noche') fireflies(ctx, t, 60, 130, 12, cam);
  },
};

// Montseñal: cumbres nevadas, ermita en un cerro, pinos negros y roca.
BIOMES.montana = {
  hz: 66, clouds: 4, cloudY: 40, seed: 7, plat: 'rock',
  far(b, ph) {
    const R = hazeR(['#3a4670', '#4c5a86', '#6a789e', '#8c98b8'], ph, 0.3), S = hazeR(['#9aa8cc', '#d6e0f0', '#ffffff'], ph, 0.15);
    peak(b, 22, 22, 66, 48, R, { seed: 3, snow: { d: 0.3, c: S } });
    peak(b, 206, 16, 66, 56, R, { seed: 4, snow: { d: 0.32, c: S } });
    peak(b, 116, 6, 66, 62, R, { seed: 5, snow: { d: 0.38, c: S } });
    peak(b, 160, 30, 66, 34, hazeR(['#33405e', '#45527a', '#5c6a92', '#7a88aa'], ph, 0.25), { seed: 6, snow: { d: 0.2, c: S } });
  },
  mid(b, ph) {
    const R = hazeR(PAL.dry.concat(['#ece6b0']), ph, 0.12), Rk = hazeR(PAL.stone.slice(1), ph, 0.15), Pn = hazeR(PAL.pine, ph, 0.12), T = gr(PAL.wood, ph);
    hills(b, -MM, W + MM, (x) => 50 + fbm(x, 4, 26, 61, 3) * 10 + Math.sin(x / 50) * 3, R, { tex: 0.35 });
    blobs(b, [{ x: 96, y: 58, r: 12, ry: 7 }, { x: 108, y: 56, r: 8, ry: 6 }], Rk, { amb: 0.15, tex: 0.5, ts: 2 });
    blobs(b, [{ x: 222, y: 58, r: 14, ry: 8 }], Rk, { amb: 0.15, tex: 0.5, ts: 2 });
    for (let i = 0; i < 14; i++) { const x = -14 + i * 21 + hash(i, 1, 62) * 10; if (x > 148 && x < 206) continue; tree(b, 'fir', x, 58 + hash(i, 2, 62) * 6, 0.65 + hash(i, 3, 62) * 0.35, Pn, T, 70 + i); }
    // ermita de Sant Medir con su espadaña
    const P = gr(PAL.plaster, ph), Tr = gr(PAL.terra, ph); const ex = 30, ey = 47;
    b.rect(ex, ey - 9, 14, 9, P[4]); b.rect(ex + 14, ey - 9, 6, 9, P[2]); b.poly([[ex - 1, ey - 9], [ex + 7, ey - 13], [ex + 15, ey - 9]], Tr[3]); b.poly([[ex + 7, ey - 13], [ex + 21, ey - 11], [ex + 21, ey - 9], [ex + 15, ey - 9]], Tr[2]);
    b.rect(ex + 3, ey - 18, 5, 6, P[4]); b.rect(ex + 4, ey - 16, 3, 3, INK); b.set(ex + 5, ey - 15, '#d8a040'); b.rect(ex + 5, ey - 20, 1, 2, P[3]);
    b.rect(ex + 6, ey - 5, 3, 5, gr(PAL.wood, ph)[1]); b.rect(ex + 2, ey - 7, 2, 2, INK); b.rect(ex + 11, ey - 7, 2, 2, INK);
  },
  gt(u, v, j, fd, x) {
    const n = fbm(u * 0.4, v * 0.8, 6, 71, 3), rock = fbm(u * 0.25, v * 0.5, 5, 72, 2), snow = fbm(u * 0.2, v * 0.35, 6, 73, 2);
    return dq(this._G, 0.52 + (n - 0.5) * 0.55 * fd + (vnoise(u * 2.2, v * 0.4, 1, 74) - 0.5) * 0.25 * fd + j / 96 * 0.08, x, j);
  },
  deco(b, ph, gh) {
    const R = gr(PAL.stone, ph), G = gr(PAL.dry, ph);
    scatter(b, gh, 120, 77, (x, j, sz, k) => { if (sz < 0.6) return; if (hash(k, 9, 77) < 0.3) pebble(b, x, j, sz, R); else tuft(b, x, j, sz * 0.8, G, k); });
    const Rk = gr(['#2a2430', '#3e3640', '#564c52', '#706466', '#8c807c', '#aa9e96', '#c8beb4'], ph);
    for (const [x, j, r] of [[-8, 40, 9], [122, 22, 5], [226, 52, 11], [14, 86, 7]]) { blobs(b, [{ x, y: j - r * 0.5, r, ry: r * 0.65 }, { x: x + r * 0.6, y: j - r * 0.3, r: r * 0.6, ry: r * 0.45 }], Rk, { amb: 0.15, tex: 0.5, ts: 2, seed: x }); for (let i = -r; i < r * 1.4; i++) if (b.on(x + i, j - 1)) b.set(x + i, j, gr(PAL.dry, ph)[0]); }
  },
  anim(ctx, L, ph, t, cam) {
    if (ph === 'dia' || ph === 'tarde' || ph === 'manana') eagle(ctx, t, cam);
    if (ph === 'noche') snowfall(ctx, t, 40, cam);
  },
};

// Riberas del Lobregat: álamos en la orilla de enfrente, el río brillando, cañas.
BIOMES.rio = {
  hz: 62, clouds: 5, seed: 9, plat: 'grass',
  far(b, ph) {
    const R = hazeR(['#2e4a5e', '#3c5c6c', '#4e6e78', '#628286', '#7a9894'], ph, 0.4);
    hills(b, -MF, W + MF, (x) => 38 + fbm(x, 6, 40, 81, 3) * 9, R, { tex: 0.15 });
  },
  mid(b, ph) {
    const G = hazeR(PAL.grass.slice(1, 8), ph, 0.15), Po = hazeR(['#2a4a2a', '#3a6430', '#527e34', '#6c983a', '#8ab046', '#aac85a', '#cede80'], ph, 0.12), T = gr(PAL.wood, ph);
    hills(b, -MM, W + MM, (x) => 46 + fbm(x, 1, 20, 82, 2) * 3, G, { tex: 0.3 });
    for (let i = 0; i < 15; i++) { const x = -16 + i * 18.5 + (hash(i, 1, 83) - 0.5) * 12; if (hash(i, 4, 83) < 0.15) continue; const k = hash(i, 5, 83); tree(b, k < 0.62 ? 'poplar' : k < 0.85 ? 'oak' : 'bush', x, 49 + hash(i, 6, 83) * 2, 0.55 + hash(i, 2, 83) * 0.55, k < 0.62 ? Po : hazeR(PAL.leaf, ph, 0.12), T, 90 + i); }
    waterBand(b, -MM, W + MM, 50, 62, hazeR(PAL.water.slice(1, 8), ph, 0.05), 84);
    for (let x = -MM; x < W + MM; x++) { const r = hash(x, 7, 84); if (r < 0.06) b.rect(x, 51 + fl(hash(x, 8, 84) * 9), 2 + fl(r * 30), 1, gradeColor('#3a6a8a', ph)); }
    reeds(b, -MM, W + MM, 50, 0.55, 0.6, 85, ph); reeds(b, -MM, W + MM, 62, 1, 0.42, 86, ph);
  },
  gt(u, v, j, fd, x) {
    const n = fbm(u * 0.5, v * 0.9, 6, 87, 3);
    if (j < 4 + vnoise(u * 0.3, 0, 3, 88) * 4) return dq(this._D, 0.35 + (n - 0.5) * 0.5, x, j); // barro de la orilla
    return dq(this._G, 0.5 + (n - 0.5) * 0.7 * fd + (vnoise(u * 2.6, v * 0.35, 1, 89) - 0.5) * 0.35 * fd, x, j);
  },
  deco(b, ph, gh) {
    const G = gr(PAL.grass, ph), S = gr(PAL.stone, ph);
    scatter(b, gh, 220, 91, (x, j, sz, k) => { if (sz < 0.5 || j < 5) return; const r = hash(k, 9, 91); if (r < 0.6) tuft(b, x, j, sz, G, k); else if (r < 0.75) pebble(b, x, j, sz, S); else if (sz > 1) flower(b, x, j, sz, gradeColor(r < 0.85 ? '#f4f0e0' : '#f6d23a', ph)); });
  },
  anim(ctx, L, ph, t, cam) {
    shimmer(ctx, t, cam * 0.5, 50, 62, ph, 14);
    if (ph === 'noche') fireflies(ctx, t, 40, 120, 16, cam);
  },
};

// Costa del Besòs: mar abierto con barcas de vela latina, cabo con el templo de la Señora del Mar.
BIOMES.costa = {
  hz: 60, clouds: 5, cloudY: 24, seed: 11, plat: 'sand',
  far(b, ph) {
    const S = hazeR(PAL.sea.concat(['#3a8cc8']), ph, 0.08);
    for (let y = 46; y < 60; y++) for (let x = -MF; x < W + MF; x++) b.set(x, y, dq(S, 0.7 - (y - 46) * 0.035 + (vnoise(x * 0.3, y * 2, 3, 101) - 0.5) * 0.2, x, y));
    for (let x = -MF; x < W + MF; x++) b.set(x, 46, mix(gradeColor('#6aa0d8', ph), hazeOf(ph), 0.3));
    // cabo rocoso con el templo
    const R = hazeR(PAL.wstone, ph, 0.12), G = hazeR(PAL.grass.slice(2), ph, 0.15), C = gr(['#b8b0a0', '#dcd4c4', '#fffaf0'], ph);
    blobs(b, [{ x: -4, y: 44, r: 30, ry: 18 }, { x: 22, y: 40, r: 22, ry: 14 }, { x: 46, y: 50, r: 22, ry: 9 }, { x: 64, y: 54, r: 14, ry: 6 }, { x: 4, y: 30, r: 18, ry: 8 }], R, { amb: 0.2, tex: 0.5, tf: (x, y) => (y % 4 === 0 ? -0.35 : 0) + (vnoise(x, y, 3, 104) - 0.5), clip: (x, y) => y < 59 });
    for (let x = -MF; x < 64; x++) for (let y = 0; y < 60; y++) if (b.on(x, y)) { if (!b.on(x, y - 1) || !b.on(x, y - 2)) { b.set(x, y, G[3 + (b.on(x, y - 1) ? 0 : 1)]); if (b.on(x, y + 1) && hash(x, y, 4) < 0.5) b.set(x, y + 1, G[2]); } break; }
    for (let x = -MF; x < 64; x++) if (b.on(x, 58) && hash(x, 9, 105) < 0.4) b.set(x, 59, gradeColor('#e8f4ff', ph));
    for (let i = 0; i < 4; i++) { const cx = 5 + i * 6; b.rect(cx, 15, 3, 9, C[1]); b.rect(cx, 15, 1, 9, C[2]); b.rect(cx - 1, 23, 5, 1, C[0]); }
    b.rect(2, 13, 24, 2, C[1]); b.rect(2, 13, 24, 1, C[2]); b.poly([[1, 13], [14, 8], [27, 13]], C[1]); b.line(1, 13, 14, 8, C[2]); b.rect(1, 24, 26, 2, C[0]);
    // barcas de vela latina en el horizonte
    for (const [x, s] of [[150, 1], [204, 0.7]]) { b.rect(x - 4 * s, 45, 9 * s, 2, gr(PAL.wood, ph)[2]); b.poly([[x, 45 - 11 * s], [x + 6 * s, 44], [x - 1, 44]], gradeColor('#f4ece0', ph)); b.line(x, 45 - 11 * s, x, 45, gr(PAL.wood, ph)[1]); }
  },
  mid(b, ph) {
    const S = hazeR(PAL.water.slice(2), ph, 0.05);
    for (let y = 54; y < 60; y++) for (let x = -MM; x < W + MM; x++) b.set(x, y, dq(S, 0.35 + (y - 54) * 0.07 + (vnoise(x * 0.3, y * 2, 3, 103) - 0.5) * 0.25, x, y));
  },
  gt(u, v, j, fd, x) {
    const n = fbm(u * 0.5, v * 0.9, 6, 105, 3);
    if (j < 5 + vnoise(u * 0.2, 0, 4, 106) * 3) return dq(this._W, 0.4 + (n - 0.5) * 0.4, x, j); // arena mojada
    const rip = Math.sin(v * 0.9 + vnoise(u * 0.2, v * 0.1, 3, 107) * 6) > 0.82 ? -0.2 : 0;
    return dq(this._G, 0.55 + (n - 0.5) * 0.5 * fd + rip * fd + j / 96 * 0.1, x, j);
  },
  deco(b, ph, gh) {
    const Sh = gr(['#c88a7a', '#f0c8b8', '#fff0e8'], ph), Sw = gr(PAL.green, ph);
    scatter(b, gh, 90, 109, (x, j, sz, k) => { if (sz < 0.8 || j < 8) return; const r = hash(k, 9, 109); if (r < 0.35) { b.set(x, j, Sh[1]); b.set(x + 1, j, Sh[2]); if (sz > 2) b.set(x, j - 1, Sh[0]); } else if (r < 0.5) { b.line(x, j, x + rnd(sz * 3), j - 1, Sw[2]); b.set(x + 1, j - 1, Sw[3]); } else if (r < 0.54 && sz > 2) { const c = gradeColor('#e8803a', ph); b.set(x, j, c); b.set(x - 1, j - 1, c); b.set(x + 1, j - 1, c); b.set(x, j - 2, c); b.set(x - 2, j, c); b.set(x + 2, j, c); } });
  },
  anim(ctx, L, ph, t, cam) {
    shimmer(ctx, t, cam * 0.25, 47, 59, ph, 18);
    waves(ctx, t, cam, ph);
    if (ph !== 'noche') gulls(ctx, t, cam);
    sunPath(ctx, t, cam, ph, 47, 60);
  },
};

// Calles de Barcanueva: fachadas góticas, balcones de hierro, la Seu al fondo y adoquines.
BIOMES.urbano = {
  hz: 68, clouds: 3, cloudY: 14, seed: 13, plat: 'cobble',
  far(b, ph) {
    const R = hazeR(['#4a4660', '#5c5872', '#706a86', '#86809a', '#a09ab0'], ph, 0.35), Tr = hazeR(PAL.terra, ph, 0.35);
    for (let x = -MF; x < W + MF; x += 12) { const h = 40 + fl(hash(x, 1, 121) * 10); b.rect(x, h, 12, 30, R[1 + (fl((x + 120) / 12) & 1)]); b.rect(x, h, 12, 2, Tr[2]); }
    // la Seu: dos torres con pináculos y el cimborrio
    for (const tx of [96, 128]) { b.rect(tx, 14, 12, 40, R[2]); b.rect(tx + 9, 14, 3, 40, R[1]); b.rect(tx, 14, 1, 40, R[4]); b.poly([[tx - 1, 14], [tx + 6, -2], [tx + 13, 14]], R[3]); b.line(tx + 6, -2, tx + 13, 14, R[1]); b.rect(tx + 4, 20, 4, 8, R[0]); b.rect(tx + 4, 34, 4, 6, R[0]); for (let i = 0; i < 3; i++) b.rect(tx - 2 + i * 6, 10, 2, 5, R[3]); }
    b.rect(108, 26, 20, 30, R[3]); b.ell(118, 34, 6, 6, R[0]); b.ell(118, 34, 4, 4, gradeColor('#6a4a8a', ph)); b.poly([[106, 26], [118, 16], [130, 26]], R[2]);
  },
  mid(b, ph) {
    const St = hazeR(PAL.wstone, ph, 0.05), Pl = hazeR(PAL.plaster, ph, 0.05), Tr = gr(PAL.terra, ph), Wd = gr(PAL.wood, ph), Ir = gr(PAL.iron, ph), Gn = gr(PAL.green, ph);
    this._win = [];
    const facade = (x0, w, top, M, o = {}) => {
      for (let y = top; y < 68; y++) for (let x = x0; x < x0 + w; x++) { const lx = x - x0; let v = 0.62 + (lx < 2 ? 0.15 : lx > w - 4 ? -0.18 : 0) + (vnoise(x, y, 3, x0) - 0.5) * 0.18; if (o.stone && (y % 6 === 0 || (x + (fl(y / 6) % 2) * 5) % 10 === 0)) v -= 0.18; b.set(x, y, dq(M, v, x, y)); }
      b.rect(x0 - 1, top - 3, w + 2, 3, Tr[3]); b.rect(x0 - 1, top - 3, w + 2, 1, Tr[5]); b.rect(x0 - 1, top, w + 2, 1, Tr[1]); b.rect(x0, top + 1, w, 1, M[1]);
      for (let fy = top + 6; fy < 50; fy += 15) for (let fx = x0 + 5; fx + 7 < x0 + w; fx += 15) {
        if (o.skip?.(fx)) continue;
        b.rect(fx - 1, fy - 1, 8, 11, M[5]); b.rect(fx, fy, 6, 10, INK); b.ell(fx + 3, fy, 3, 2, M[5]); b.rect(fx + 1, fy, 4, 1, INK);
        this._win.push([fx + 1, fy + 1, 4, 8]);
        b.rect(fx - 3, fy, 2, 10, Gn[2]); b.rect(fx + 7, fy, 2, 10, Gn[2]); b.rect(fx - 3, fy, 1, 10, Gn[4]);
        if (o.balcony) { b.rect(fx - 3, fy + 10, 12, 1, Ir[1]); b.rect(fx - 3, fy + 6, 12, 1, Ir[2]); for (let k = 0; k < 12; k += 2) b.rect(fx - 3 + k, fy + 7, 1, 3, Ir[1]); if (hash(fx, fy, 3) < 0.6) { b.rect(fx - 2, fy + 4, 3, 2, gradeColor('#c8503a', ph)); b.set(fx - 2, fy + 3, gradeColor('#e83a4a', ph)); b.set(fx, fy + 3, gradeColor('#3a8a3a', ph)); } }
      }
    };
    const Pk = hazeR(['#6a4848', '#8a5e5a', '#a87a70', '#c4968a', '#dcb2a2', '#ecccbc', '#f8e6d8'], ph, 0.05), Oc = hazeR(['#5e4628', '#7e5e32', '#a07c40', '#bc9850', '#d4b468', '#e6cc88', '#f4e2aa'], ph, 0.05);
    facade(-MM, 62, 30, St, { stone: true, balcony: true });
    facade(44, 50, 36, Oc, { balcony: true });
    facade(94, 52, 40, St, { stone: true });
    facade(146, 62, 34, Pl, { skip: (fx) => fx > 160 && fx < 196 });
    facade(208, 52, 28, Pk, { balcony: true });
    // arco del pasaje y tienda con toldo
    b.rect(106, 52, 22, 16, '#1e1620'); b.ell(117, 52, 11, 8, '#1e1620'); for (let a = 0; a < 40; a++) { const an = Math.PI + (a / 39) * Math.PI; b.set(117 + Math.cos(an) * 12, 52 + Math.sin(an) * 9, St[6]); b.set(117 + Math.cos(an) * 13, 52 + Math.sin(an) * 10, St[3]); } b.rect(108, 60, 18, 8, '#2a2028');
    for (let x = 52; x < 88; x += 6) { b.poly([[x, 52], [x + 6, 52], [x + 6, 57], [x + 3, 59], [x, 57]], gradeColor(x % 12 ? '#c83a3a' : '#f4ece0', ph)); }
    b.rect(54, 59, 32, 9, '#2a1e24'); b.rect(56, 60, 6, 8, Wd[2]); b.rect(64, 61, 18, 4, Wd[3]); for (let k = 0; k < 5; k++) b.rect(65 + k * 3, 60, 2, 2, gradeColor(['#e84a3a', '#f4c430', '#7ab84a', '#e8a040', '#c84a6a'][k], ph));
    // farol (la senyera colgada se anima aparte)
    b.rect(220, 32, 13, 2, Ir[1]); b.rect(171, 42, 7, 1, Ir[1]); b.rect(171, 43, 1, 3, Ir[1]); b.rect(175, 44, 5, 7, Ir[1]); b.rect(176, 45, 3, 5, gradeColor('#3a3020', ph)); this._lamp = [177, 47];
  },
  gt(u, v, j, fd, x) {
    // adoquines en perspectiva: hileras escalonadas con juntas oscuras y canto iluminado
    const row = fl(v * 0.55), cu = u * 0.42 + (row % 2) * 0.5, fu = cu - fl(cu), fv = v * 0.55 - row;
    const id = hash(fl(cu), row, 131), C = this._G;
    if (fd > 0.16 && (fu < 0.08 || fv < 0.1)) return C[2];
    let val = 0.56 + (id - 0.5) * 0.22 + (fv < 0.32 ? 0.14 : fv > 0.82 ? -0.12 : 0) + (fu < 0.22 ? 0.06 : fu > 0.86 ? -0.08 : 0);
    if (Math.abs(u) < 3 && fd > 0.1) val -= 0.16; // canalillo central
    return dq(C, lerp(0.52, val, cl(fd * 1.3)), x, j, fd > 0.3);
  },
  deco(b, ph, gh) { const S = gr(PAL.dry, ph); scatter(b, gh, 30, 133, (x, j, sz, k) => { if (sz > 1.2 && hash(k, 9, 133) < 0.5) b.line(x, j, x + rnd(sz * 2), j - 1, S[4]); }); },
  anim(ctx, L, ph, t, cam) {
    if (ph === 'noche' || ph === 'crepusculo') {
      for (const [x, y, w, h] of this._win) if (hash(x, y, 5) < (ph === 'noche' ? 0.7 : 0.4)) { const fx = rnd(x - cam * 0.5); ctx.fillStyle = (fl(t / 30 + x) % 9) ? '#f8c860' : '#f0b050'; ctx.fillRect(fx, y, w, h); ctx.fillStyle = '#fff0b0'; ctx.fillRect(fx, y, 1, h); ctx.fillStyle = '#c87830'; ctx.fillRect(fx, y + h / 2, w, 1); }
      const [lx, ly] = this._lamp; glow(ctx, lx - cam * 0.5, ly, 9 + Math.sin(t / 9), '#ffd070', 0.35); ctx.fillStyle = '#ffe890'; ctx.fillRect(rnd(lx - cam * 0.5) - 1, ly - 2, 3, 4);
    }
    banner(ctx, t, cam, ph);
  },
};

// Matas de carrizo y eneas: tallos verdes de alturas distintas, hojas que se doblan y mazorcas pardas.
function reeds(b, x0, x1, y, s, dens, seed, ph) {
  const G = gr(['#2a4424', '#3e5e2c', '#567a34', '#729840', '#94b252', '#b8c870'], ph), Br = gr(['#4a2c1e', '#6a4026', '#8a5a32'], ph);
  for (let x = x0; x < x1; x += 2) {
    if (vnoise(x, 0, 9, seed) < 1 - dens) continue;
    const n = 2 + fl(hash(x, 1, seed) * 3);
    for (let k = 0; k < n; k++) {
      const bx = x + k - 1, hh = rnd((4 + hash(bx, k, seed + 1) * 9) * s), lean = hash(bx, k, seed + 2) < 0.5 ? -1 : 1;
      for (let i = 0; i < hh; i++) b.set(bx + (i > hh * 0.7 ? lean : 0), y - i, G[i === hh - 1 ? 5 : 1 + ((bx + i) & 1) + (i > hh / 2 ? 1 : 0)]);
      if (hash(bx, k, seed + 3) < 0.35 && hh > 6) { b.rect(bx + (lean > 0 ? 1 : -1), y - hh - 2, 1, 3, Br[1]); b.set(bx + (lean > 0 ? 1 : -1), y - hh - 2, Br[2]); }
      if (hash(bx, k, seed + 4) < 0.4) b.line(bx, y - hh * 0.4, bx + lean * 3 * s, y - hh * 0.7, G[3]);
    }
  }
}

// Interior cálido: vigas, chimenea, tapiz con las barras, ventana, estantes y velas.
BIOMES.interior = {
  hz: 72, clouds: 0, seed: 15, plat: 'rug', noSky: true,
  far(b, ph) {
    const night = ph === 'noche' || ph === 'crepusculo', k = night ? 0.12 : 0;
    const P = PAL.plaster.map((c) => mix(c, '#2a1830', k + 0.08)), Wd = PAL.wood.map((c) => mix(c, '#1a1020', k)), dark = mix('#2a1c24', '#120c18', k);
    for (let y = 0; y < 72; y++) for (let x = -MF; x < W + MF; x++) {
      let c;
      if (y < 52) c = dq(P, 0.55 - (y < 10 ? 0.25 : 0) + (vnoise(x, y, 4, 141) - 0.5) * 0.18 - (y > 46 ? 0.1 : 0), x, y);
      else { const pn = ((x + 400) % 24); c = dq(Wd, (pn < 2 ? 0.75 : pn > 21 ? 0.2 : 0.45) + (y === 52 ? 0.3 : y < 55 ? 0.12 : 0) + (vnoise(x * 0.3, y * 2, 2, 142) - 0.5) * 0.25, x, y); }
      b.set(x, y, c);
    }
    for (let x = -MF; x < W + MF; x++) { b.set(x, 51, Wd[1]); b.set(x, 71, dark); }
    for (let x = -MF; x < W + MF; x += 48) { b.rect(x, 0, 8, 52, Wd[2]); b.rect(x, 0, 2, 52, Wd[4]); b.rect(x + 7, 0, 1, 52, Wd[0]); }
    b.rect(-MF, 0, W + 2 * MF, 6, Wd[1]); b.rect(-MF, 5, W + 2 * MF, 1, Wd[0]); b.rect(-MF, 0, W + 2 * MF, 1, Wd[3]);
  },
  mid(b, ph) {
    const night = ph === 'noche' || ph === 'crepusculo', dk = (R) => (night ? R.map((c) => mix(c, '#140c1c', 0.22)) : R);
    const St = dk(PAL.wstone), Wd = dk(PAL.wood), Rd = dk(PAL.red), Gd = dk(PAL.gold);
    // chimenea de piedra
    b.rect(6, 24, 52, 48, St[3]); for (let y = 24; y < 72; y += 5) for (let x = 6 + ((y / 5) % 2) * 5; x < 58; x += 10) { b.rect(x, y, 9, 1, St[1]); b.set(x, y + 1, St[5]); }
    b.rect(2, 18, 60, 7, St[4]); b.rect(2, 18, 60, 1, St[6]); b.rect(2, 24, 60, 1, St[1]); b.rect(16, 40, 32, 32, '#1a0e12'); b.ell(32, 40, 16, 8, '#1a0e12'); b.rect(16, 66, 32, 6, '#2a1614');
    for (let i = 0; i < 5; i++) b.rect(20 + i * 5, 64, 6, 3, Wd[1 + (i % 2)]);
    // tapiz con las cuatro barras
    b.rect(72, 10, 30, 40, Gd[3]); b.rect(74, 12, 26, 36, Gd[4]); for (let i = 0; i < 4; i++) b.rect(76 + i * 6, 12, 3, 34, Rd[3]); b.rect(72, 10, 30, 1, Gd[5]); b.rect(70, 8, 34, 2, Wd[2]);
    for (let x = 72; x < 102; x += 2) b.set(x, 50, Gd[2]);
    // ventana
    const sky = night ? ['#0c1232', '#18224a', '#2a3a6a'] : ph === 'tarde' ? ['#f0b070', '#f8d090', '#fff0c0'] : ['#7ab8e8', '#a8d4f4', '#e0f2ff'];
    b.rect(112, 14, 22, 30, Wd[1]); b.rect(114, 16, 18, 26, sky[0]); b.rect(114, 16, 18, 10, sky[1]); b.rect(114, 16, 6, 6, sky[2]); b.rect(122, 16, 2, 26, Wd[2]); b.rect(114, 28, 18, 2, Wd[2]); b.rect(110, 44, 26, 3, Wd[3]); b.rect(110, 44, 26, 1, Wd[5]);
    if (night) { b.ell(128, 20, 2, 2, '#f4f0d0'); }
    // estantes con tarros y libros
    for (const y of [22, 36, 50]) { b.rect(196, y, 50, 2, Wd[3]); b.rect(196, y + 2, 50, 1, Wd[0]); for (let x = 198; x < 244; x += 4) { const h = 4 + fl(hash(x, y, 3) * 7), c = [Rd[3], PAL.blue[3], PAL.green[3], Gd[4], PAL.purple[4]][fl(hash(x, y, 4) * 5)]; if (hash(x, y, 5) < 0.5) { b.rect(x, y - h, 3, h, c); b.rect(x, y - h, 1, h, mix(c, '#ffffff', 0.3)); } else { b.rect(x, y - 5, 3, 5, c); b.rect(x + 1, y - 7, 1, 2, '#e8dcc0'); b.set(x, y - 5, mix(c, '#ffffff', 0.4)); } } }
    // apliques de velas
    for (const x of [160, 186]) { b.rect(x - 2, 34, 5, 2, Gd[2]); b.rect(x, 30, 1, 4, Gd[3]); b.rect(x - 1, 26, 3, 5, '#efe6d2'); b.set(x - 1, 26, '#ffffff'); }
    this._fire = [32, 62]; this._cand = [[160, 23], [186, 23]]; this._win = [114, 16, 18, 26];
  },
  gt(u, v, j, fd, x) {
    const Wd = this._G;
    const bu = u / 22, bi = fl(bu), fu = bu - bi, bv = v / 90 + hash(bi, 0, 144) * 3, fv = bv - fl(bv);
    if (fd > 0.15 && (fu < 0.06 || fv < 0.03)) return Wd[1];
    return dq(Wd, 0.45 + (hash(bi, fl(bv), 145) - 0.5) * 0.25 + (vnoise(u * 0.8, v * 0.08, 2, 146) - 0.5) * 0.3 * fd, x, j);
  },
  anim(ctx, L, ph, t, cam) {
    const [fx, fy] = this._fire, sx = fx - cam * 0.5;
    flame(ctx, sx, fy, t, 1.6); glow(ctx, sx, fy - 6, 22 + Math.sin(t / 7) * 2, '#ff9a40', 0.22);
    for (const [cx, cy] of this._cand) { const x = cx - cam * 0.5; flame(ctx, x, cy + 3, t + cx, 0.45); glow(ctx, x, cy, 10 + Math.sin(t / 5 + cx) * 1.2, '#ffc860', 0.25); }
    if (ph !== 'noche' && ph !== 'crepusculo') lightShaft(ctx, t, cam, this._win, ph);
    motes(ctx, t, cam);
  },
};

// Cueva: pared de roca, estalactitas, cristales y musgo que brillan.
BIOMES.cueva = {
  hz: 70, clouds: 0, seed: 17, plat: 'cave', noSky: true,
  far(b, ph) {
    const R = ['#100c18', '#181424', '#221d30', '#2e2840', '#3c3552', '#4c4466', '#5e567a'];
    for (let y = 0; y < 70; y++) for (let x = -MF; x < W + MF; x++) b.set(x, y, dq(R, 0.32 + (fbm(x, y, 16, 151, 3) - 0.5) * 0.45 + (y > 50 ? 0.06 : 0), x, y));
    blobs(b, [{ x: 10, y: 44, r: 30, ry: 30 }, { x: -6, y: 8, r: 34 }, { x: 226, y: 34, r: 36, ry: 38 }, { x: 252, y: 62, r: 24 }, { x: 150, y: -2, r: 46, ry: 18 }, { x: 96, y: 66, r: 30, ry: 10 }], R, { amb: 0.12, tex: 0.6, ts: 4, seed: 152, nod: true });
    const tun = ['#05040a', '#0a0812', '#110e1a', '#1a1626'];
    for (let y = 30; y < 70; y++) for (let x = 54; x < 104; x++) { const d = Math.hypot((x - 78) / 20, (y - 54) / 22) + (vnoise(x, y, 4, 153) - 0.5) * 0.35; if (d < 1) b.set(x, y, tun[cl(fl(d * 4.2), 0, 3)]); }
    this._cry = [];
    for (const [x, y, c] of [[24, 60, 0], [206, 50, 1], [230, 62, 0], [132, 28, 1], [46, 30, 0]]) { crystal(b, x, y, c); this._cry.push([x, y, c]); }
  },
  mid(b, ph) {
    const R = ['#16121e', '#201b2c', '#2c263c', '#3a334e', '#4a4362', '#5c5478', '#70688e'];
    for (const [x, h, w] of [[-10, 34, 10], [30, 20, 6], [112, 13, 5], [214, 28, 8], [246, 38, 10], [146, 9, 4]]) {
      for (let y = 0; y < h; y++) { const ww = w * Math.pow(y / h, 0.8) + 1; for (let xx = fl(x - ww); xx <= x + ww; xx++) b.set(xx, 70 - h + y, dq(R, (xx < x - ww * 0.3 ? 0.68 : xx < x + ww * 0.4 ? 0.45 : 0.22) + (y % 5 === 0 ? -0.08 : 0), xx, y)); }
    }
  },
  front(b) {
    const R = ['#0a0810', '#120e1a', '#1c1828', '#2a2638', '#3a3650', '#4a4664'];
    for (let x = -MFR; x < W + MFR; x++) { const h = 5 + fbm(x, 0, 10, 161, 2) * 9; for (let y = 0; y < h; y++) b.set(x, y, dq(R, 0.28 + (y > h - 2 ? 0.2 : 0), x, y)); }
    this._drip = [];
    for (let i = 0; i < 9; i++) { const x = -20 + i * 32 + hash(i, 1, 162) * 14, len = 9 + hash(i, 2, 162) * 16, w = 2.5 + hash(i, 3, 162) * 3; for (let y = 0; y < len; y++) { const ww = w * (1 - y / len); for (let xx = fl(x - ww); xx <= x + ww; xx++) b.set(xx, 6 + y, dq(R, xx < x - ww * 0.3 ? 0.75 : xx < x + ww * 0.3 ? 0.5 : 0.25, xx, y)); } this._drip.push([x, 6 + len]); }
  },
  gt(u, v, j, fd, x) {
    const n = fbm(u * 0.3, v * 0.6, 6, 171, 3);
    for (const [pu, pv, ru, rv] of this._pud) { const du = (u - pu) / ru, dv = (v - pv) / rv, d = du * du + dv * dv; if (d < 1) return d > 0.82 ? this._G[4] : dq(['#0a1028', '#101a3a', '#18284e', '#223a68', '#3a5a90'], 0.3 + (vnoise(u * 0.4, v * 1.2, 2, 173) - 0.5) * 0.5 + (Math.abs(du) < 0.25 && dv < 0 ? 0.25 : 0), x, j); }
    return dq(this._G, 0.48 + (n - 0.5) * 0.55 * fd + (j / 90) * 0.14 + (Math.abs(u) < 40 ? 0.06 : 0), x, j);
  },
  _pud: [[-38, 150, 13, 40], [58, 112, 9, 26]],
  deco(b, ph, gh) { const R = PAL.stone; scatter(b, gh, 60, 175, (x, j, sz, k) => { if (sz < 0.8) return; if (hash(k, 9, 175) < 0.55) pebble(b, x, j, sz, R); else if (sz > 1.2) { b.set(x, j, '#3ac8a0'); b.set(x + 1, j, '#2a8a78'); b.set(x, j - 1, '#7af0d0'); } }); },
  anim(ctx, L, ph, t, cam) {
    beam(ctx, 150 - cam * 0.55, 0, 150, 10, 30, -0.3, '#a8c8ff', 0.07 + Math.sin(t / 80) * 0.015);
    for (const [x, y, c] of BIOMES.cueva._cry) glow(ctx, x - cam * 0.25, y - 4, 9 + Math.sin(t / 25 + x) * 2.5, c ? '#b070ff' : '#40e0d0', 0.16);
    drips(ctx, t, cam, BIOMES.cueva._drip || []);
    spores(ctx, t, cam);
  },
};

// Monte del Juïc: murallas del castillo con la senyera, pinos piñoneros y el mar con el puerto al fondo.
BIOMES.montjuic = {
  hz: 64, clouds: 4, seed: 19, plat: 'dry',
  far(b, ph) {
    const S = hazeR(PAL.sea.concat(['#3a8cc8']), ph, 0.1);
    for (let y = 46; y < 64; y++) for (let x = -MF; x < W + MF; x++) b.set(x, y, dq(S, 0.65 - (y - 46) * 0.02 + (vnoise(x * 0.3, y * 2, 3, 181) - 0.5) * 0.2, x, y));
    for (let x = -MF; x < W + MF; x++) b.set(x, 46, mix(gradeColor('#6aa0d8', ph), hazeOf(ph), 0.3));
    // el puerto y la ciudad a lo lejos
    const C = hazeR(['#6a5a6a', '#8a7480', '#a89098', '#c4acb0'], ph, 0.35), T = hazeR(PAL.terra, ph, 0.35);
    for (let x = 196; x < W + MF; x += 4) { const h = 4 + fl(hash(x, 1, 182) * 5); b.rect(x, 46 - h, 4, h, C[fl(hash(x, 2, 182) * 3)]); b.rect(x, 46 - h, 4, 1, T[3]); }
    b.rect(214, 30, 3, 16, C[2]); b.poly([[213, 30], [215, 24], [218, 30]], C[3]);
    for (const x of [178, 186, 191]) { b.line(x, 46, x, 38, C[1]); b.rect(x - 2, 46, 5, 1, C[0]); }
  },
  mid(b, ph) {
    const D = hazeR(PAL.dry, ph, 0.1), St = hazeR(PAL.wstone, ph, 0.08), Pn = hazeR(PAL.pine, ph, 0.08), T = gr(PAL.wood, ph);
    hills(b, -MM, 150, (x) => 44 + (x > 90 ? (x - 90) * (x - 90) * 0.004 : 0) + fbm(x, 3, 18, 183, 2) * 4, D, { tex: 0.35 });
    hills(b, 150, W + MM, (x) => 58 + fbm(x, 3, 18, 184, 2) * 3, D, { tex: 0.35 });
    // murallas y torres
    const wall = (x0, x1, top) => { for (let y = top; y < 50; y++) for (let x = x0; x < x1; x++) { let v = 0.55 + (vnoise(x, y, 3, 185) - 0.5) * 0.25; if (y % 4 === 0 || (x + (fl(y / 4) % 2) * 3) % 7 === 0) v -= 0.2; b.set(x, y, dq(St, v, x, y)); } for (let x = x0; x < x1; x += 6) b.rect(x, top - 4, 4, 4, St[4]); b.rect(x0, top, x1 - x0, 1, St[6]); };
    wall(-MM, 96, 30);
    for (const [x, w, top] of [[8, 22, 12], [64, 18, 20]]) { for (let y = top; y < 50; y++) for (let xx = x; xx < x + w; xx++) { const lx = xx - x; b.set(xx, y, dq(St, 0.6 + (lx < 3 ? 0.2 : lx > w - 5 ? -0.25 : 0) + (vnoise(xx, y, 3, 186) - 0.5) * 0.2 - (y % 5 === 0 ? 0.15 : 0), xx, y)); } for (let xx = x; xx < x + w; xx += 5) b.rect(xx, top - 4, 3, 4, St[5]); b.rect(x + w / 2 - 2, top + 8, 4, 6, INK); }
    b.rect(36, 38, 12, 12, INK); b.ell(42, 38, 6, 4, INK);
    b.rect(18, -8, 1, 20, T[1]); this._flag = [19, -7];
    tree(b, 'pine', 112, 56, 1.25, Pn, T, 187); tree(b, 'pine', 136, 60, 1.0, Pn, T, 188); tree(b, 'pine', 226, 60, 1.1, Pn, T, 189);
    for (const [x, y] of [[100, 58], [160, 62]]) for (let k = 0; k < 7; k++) b.line(x, y, x + Math.cos(-Math.PI * (0.1 + k * 0.13)) * 7, y + Math.sin(-Math.PI * (0.1 + k * 0.13)) * 6, gradeColor(k % 2 ? '#5a8a6a' : '#7aa88a', ph));
  },
  gt(u, v, j, fd, x) {
    const n = fbm(u * 0.45, v * 0.8, 6, 191, 3), earth = fbm(u * 0.25, v * 0.45, 5, 192, 2);
    if (earth > 0.66 && fd > 0.1) return dq(this._E, 0.55 + (n - 0.5) * 0.4, x, j);
    return dq(this._G, 0.5 + (n - 0.5) * 0.8 * fd + (vnoise(u * 2.4, v * 0.35, 1, 193) - 0.5) * 0.3 * fd, x, j);
  },
  deco(b, ph, gh) { const S = gr(PAL.wstone, ph), G = gr(PAL.dry, ph); scatter(b, gh, 160, 195, (x, j, sz, k) => { if (sz < 0.5) return; const r = hash(k, 9, 195); if (r < 0.35) pebble(b, x, j, sz, S); else if (r < 0.85) tuft(b, x, j, sz * 0.85, G, k); else if (sz > 1) flower(b, x, j, sz, gradeColor('#f6d23a', ph)); }); },
  anim(ctx, L, ph, t, cam) {
    const [fx, fy] = this._flag; senyera(ctx, fx - cam * 0.5, fy, t, 12, 8, ph);
    shimmer(ctx, t, cam * 0.25, 47, 63, ph, 12, 150);
    if (ph !== 'noche') gulls(ctx, t, cam);
    sunPath(ctx, t, cam, ph, 47, 64);
  },
};

// Rampas del suelo de cada bioma (se calculan al pintar cada franja).
const GROUND = {
  pradera: (D, ph) => { D._G = gr(PAL.grass.slice(2, 9), ph); },
  bosque: (D, ph) => { D._G = gr(PAL.forest.concat(['#4c8a48']), ph); D._D = gr(['#1c1a18', '#2a2420', '#3a3026', '#4c3e2c', '#5e4c34', '#70603e'], ph); },
  montana: (D, ph) => { D._G = gr(PAL.dry, ph); D._R = gr(PAL.stone.slice(1), ph); D._S = gr(PAL.snow, ph); },
  rio: (D, ph) => { D._G = gr(PAL.grass.slice(2, 9), ph); D._D = gr(PAL.mud, ph); },
  costa: (D, ph) => { D._G = gr(PAL.sand, ph); D._W = gr(['#6e5a44', '#806a50', '#94805e', '#a8946e', '#bca880'], ph); },
  urbano: (D, ph) => { D._G = gr(['#2e2630', '#463a42', '#62545a', '#7e6e70', '#9a8a86', '#b6a89e', '#d2c6b8', '#e8ded0'], ph); },
  interior: (D, ph) => { D._G = PAL.wood.map((c) => (ph === 'noche' || ph === 'crepusculo' ? mix(c, '#140c1c', 0.25) : c)); },
  cueva: (D) => { D._G = ['#120e1a', '#1a1624', '#241f30', '#302a40', '#3e3752', '#4e4666', '#605878']; },
  montjuic: (D, ph) => { D._G = gr(PAL.dry, ph); D._E = gr(['#4a2420', '#6a3226', '#8a462e', '#a85e3a', '#c27a4c', '#d89a66'], ph); },
};

// ───────────── Detalles animados (por fotograma) ─────────────
const px1 = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(rnd(x), rnd(y), w, h); };
// Halo de luz por bandas (círculos enteros semitransparentes sumados): suave pero con escalones de píxel.
function glow(ctx, x, y, r, c, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = c; ctx.globalAlpha = a * 0.42; x = rnd(x); y = rnd(y);
  for (let k = 3; k >= 1; k--) { const rr = rnd((r * k) / 3); for (let j = -rr; j <= rr; j++) { const w = fl(Math.sqrt(Math.max(0, rr * rr - j * j))); ctx.fillRect(x - w, y + j, w * 2, 1); } }
  ctx.restore();
}
function flame(ctx, x, y, t, s = 1) {
  const F = PAL.fire; x = rnd(x); y = rnd(y);
  for (let k = 0; k < 7; k++) {
    const a = ((t * 0.9 + k * 13) % 40) / 40, px = x + (hash(k, fl((t * 0.9 + k * 13) / 40), 3) - 0.5) * 10 * s, py = y - a * 14 * s, r = Math.max(0.5, (1 - a) * 3.4 * s);
    const c = a < 0.25 ? F[5] : a < 0.5 ? F[4] : a < 0.75 ? F[3] : F[2];
    ctx.fillStyle = c; for (let j = -r; j <= r; j++) { const w = fl(Math.sqrt(Math.max(0, r * r - j * j))); ctx.fillRect(rnd(px - w), rnd(py + j), Math.max(1, w * 2), 1); }
  }
  ctx.fillStyle = F[6]; ctx.fillRect(x - 1, y - 2, 2, 2);
}
function smoke(ctx, x, y, t, ph) {
  const c = gradeColor('#c8c4cc', ph), c2 = gradeColor('#a09ca8', ph);
  for (let k = 0; k < 6; k++) { const a = ((t * 0.35 + k * 20) % 120) / 120, px = x + Math.sin(a * 4 + k) * 2 + a * 10, py = y - a * 30, r = 1 + a * 3.5; const d = 0.7 - a * 0.65; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r && bayer(rnd(px + i), rnd(py + j)) < d) px1(ctx, j < 0 ? c : c2, px + i, py + j); }
}
function fireflies(ctx, t, y0, y1, n, cam) {
  for (let k = 0; k < n; k++) {
    const x = (hash(k, 1, 201) * (W + 40) - 20 + Math.sin(t / 90 + k) * 14) - cam * 0.6, y = y0 + hash(k, 2, 201) * (y1 - y0) + Math.sin(t / 70 + k * 2) * 6;
    const on = Math.sin(t / 25 + k * 1.7); if (on < 0) continue;
    px1(ctx, on > 0.6 ? '#f4ff9a' : '#a8d050', x, y); if (on > 0.8) { ctx.globalAlpha = 0.5; px1(ctx, '#88b040', x - 1, y); px1(ctx, '#88b040', x + 1, y); px1(ctx, '#88b040', x, y - 1); px1(ctx, '#88b040', x, y + 1); ctx.globalAlpha = 1; }
  }
}
function butterflies(ctx, t, cam, ph) {
  const cols = [['#fff8f0', '#d8d0c8'], ['#f8d838', '#c89a20'], ['#f08838', '#b85a20']];
  for (let k = 0; k < 3; k++) {
    const x = ((hash(k, 1, 203) * 300 + t * (0.15 + k * 0.05)) % 300) - 30 - cam * 0.75, y = 84 + k * 14 + Math.sin(t / 30 + k * 3) * 8, up = fl(t / 5 + k) % 2, [a, b2] = cols[k].map((c) => gradeColor(c, ph));
    px1(ctx, '#2a2030', x, y, 1, 2); px1(ctx, a, x - 2, y - (up ? 2 : 0), 2, up ? 2 : 1); px1(ctx, a, x + 1, y - (up ? 2 : 0), 2, up ? 2 : 1); if (!up) { px1(ctx, b2, x - 2, y + 1); px1(ctx, b2, x + 2, y + 1); }
  }
}
// Haz de luz semitransparente (la GBA mezclaba capas con alfa): filas enteras, bordes escalonados.
function beam(ctx, x0, y0, y1, w0, w1, slope, c, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = c;
  for (let y = y0; y < y1; y++) { const k = (y - y0) / (y1 - y0), w = rnd(w0 + (w1 - w0) * k); ctx.fillRect(rnd(x0 + (y - y0) * slope), y, w, 1); }
  ctx.restore();
}
function godRays(ctx, t, cam, ph) {
  const c = ph === 'tarde' ? '#ffcc80' : '#fff0c0';
  for (const [x0, w, a0] of [[46, 9, 0.1], [92, 5, 0.07], [186, 12, 0.08]]) beam(ctx, x0 - cam * 0.6, 0, 128, w, w * 2.2, 0.55, c, a0 + Math.sin(t / 90 + x0) * 0.025);
}
function leaves(ctx, t, cam, n) {
  const C = ['#4c8a3a', '#7aa83e', '#c8a03a', '#b8682a'];
  for (let k = 0; k < n; k++) {
    const per = 520 + hash(k, 1, 205) * 300, a = ((t + hash(k, 2, 205) * per) % per) / per, x = hash(k, 3, 205) * (W + 60) - 30 + Math.sin(a * 12 + k) * 10 - cam * 0.8, y = -6 + a * 140;
    const f = fl(t / 9 + k) % 3; ctx.fillStyle = C[k % 4];
    if (f === 0) ctx.fillRect(rnd(x), rnd(y), 3, 1); else if (f === 1) { ctx.fillRect(rnd(x), rnd(y), 2, 1); ctx.fillRect(rnd(x) + 1, rnd(y) + 1, 2, 1); } else ctx.fillRect(rnd(x) + 1, rnd(y) - 1, 1, 3);
  }
}
function eagle(ctx, t, cam) {
  const a = t / 260, x = 150 + Math.cos(a) * 46 - cam * 0.2, y = 26 + Math.sin(a) * 7, up = Math.sin(t / 7) > 0.6 ? 1 : 0;
  ctx.fillStyle = '#3a2a30'; ctx.fillRect(rnd(x) - 1, rnd(y), 3, 1);
  for (let i = 1; i <= 4; i++) { ctx.fillRect(rnd(x) - 1 - i, rnd(y) - (up ? (i > 2 ? 2 : 1) : i > 3 ? 1 : 0), 1, 1); ctx.fillRect(rnd(x) + 1 + i, rnd(y) - (up ? (i > 2 ? 2 : 1) : i > 3 ? 1 : 0), 1, 1); }
}
function snowfall(ctx, t, n, cam) {
  for (let k = 0; k < n; k++) { const per = 400 + hash(k, 1, 207) * 200, a = ((t + hash(k, 2, 207) * per) % per) / per, x = hash(k, 3, 207) * (W + 40) - 20 + Math.sin(a * 9 + k) * 6 - cam * 0.7, y = a * 165 - 5; px1(ctx, k % 3 ? '#e8f0ff' : '#ffffff', x, y, k % 5 ? 1 : 2, 1); }
}
function shimmer(ctx, t, off, y0, y1, ph, n, xMin = -20) {
  const c = ph === 'noche' ? '#a8b8e8' : ph === 'crepusculo' ? '#ffc8a0' : ph === 'tarde' ? '#fff0b8' : '#ffffff';
  for (let k = 0; k < n; k++) {
    const life = 90 + hash(k, 1, 209) * 60, ph2 = (t + hash(k, 2, 209) * life) % life, g = fl((t + hash(k, 2, 209) * life) / life);
    const x = xMin + hash(k, g, 210) * (W + 20 - xMin) - off, y = y0 + fl(hash(k, g, 211) * (y1 - y0)), w = ph2 < life * 0.3 ? 1 : ph2 < life * 0.7 ? 3 : 2;
    if (ph2 > life * 0.85) continue; px1(ctx, c, x, y, w, 1);
  }
}
function waves(ctx, t, cam, ph) {
  const foam = gradeColor('#f4fbff', ph), foam2 = gradeColor('#b8e0f0', ph);
  for (let k = 0; k < 2; k++) {
    const p = ((t / 150 + k * 0.5) % 1), y = 57 + p * 5, fade = Math.sin(p * Math.PI);
    for (let x = -4; x < W + 4; x++) { const xx = x + cam * 0.55; if (vnoise(xx * 0.5, k * 9 + fl(t / 150 + k * 0.5) * 3, 4, 213) < 0.35 + (1 - fade) * 0.4) continue; px1(ctx, fade > 0.5 ? foam : foam2, x, y + rnd(Math.sin(xx / 9) * 0.8)); }
  }
}
function gulls(ctx, t, cam) {
  for (let k = 0; k < 2; k++) {
    const x = ((t * (0.18 + k * 0.07) + k * 150) % 320) - 40 - cam * 0.2, y = 20 + k * 9 + Math.sin(t / 60 + k) * 3, up = Math.sin(t / 8 + k * 2) > 0;
    ctx.fillStyle = '#f4f0ea'; ctx.fillRect(rnd(x), rnd(y), 1, 1); ctx.fillStyle = '#3a3440';
    ctx.fillRect(rnd(x) - 1, rnd(y) - (up ? 1 : 0), 1, 1); ctx.fillRect(rnd(x) - 2, rnd(y) - (up ? 2 : 0), 1, 1); ctx.fillRect(rnd(x) + 1, rnd(y) - (up ? 1 : 0), 1, 1); ctx.fillRect(rnd(x) + 2, rnd(y) - (up ? 2 : 0), 1, 1);
  }
}
function sunPath(ctx, t, cam, ph, y0, y1) {
  const sx = { manana: 46, tarde: 192, crepusculo: 64, noche: 192 }[ph]; if (sx === undefined) return;
  const c = ph === 'noche' ? '#d8dcf0' : ph === 'crepusculo' ? '#ffb070' : '#fff0b0';
  for (let y = y0; y < y1; y++) { const w = 2 + (y - y0) * 0.5; for (let k = 0; k < 2; k++) { const r = hash(y, fl(t / 10) + k, 215); if (r < 0.45) continue; px1(ctx, c, sx - cam * 0.1 + (r - 0.7) * w * 3, y, 1 + fl(r * 3), 1); } }
}
function senyera(ctx, x, y, t, w, h, ph) {
  for (let i = 0; i < w; i++) { const dy = rnd(Math.sin(t / 10 - i * 0.6) * (i / w) * 1.6); for (let j = 0; j < h; j++) { const bar = fl((j / h) * 9) % 2; ctx.fillStyle = gradeColor(bar ? '#c8282a' : '#f4c430', ph); ctx.fillRect(rnd(x + i), rnd(y + j + dy), 1, 1); } }
}
function lightShaft(ctx, t, cam, win, ph) {
  const [wx, wy, ww] = win; beam(ctx, wx - cam * 0.5, wy, 150, ww, ww + 34, 0.32, ph === 'tarde' ? '#ffc880' : '#fff0c8', 0.1 + Math.sin(t / 70) * 0.015);
}
function motes(ctx, t, cam) {
  for (let k = 0; k < 14; k++) { const x = 110 + hash(k, 1, 217) * 90 + Math.sin(t / 80 + k) * 6 - cam * 0.6, y = 30 + ((hash(k, 2, 217) * 90 + t * 0.05) % 90); if (Math.sin(t / 30 + k) > 0.2) px1(ctx, '#fff0c0', x, y); }
}
function crystal(b, x, y, c) {
  const C = c ? ['#2a1450', '#4a2a8a', '#7a4ac8', '#b48af0', '#e8d4ff'] : ['#0a3a3a', '#146a64', '#22a094', '#5ad8c4', '#c8fff0'];
  for (const [dx, h, w] of [[0, 12, 3], [-4, 8, 2], [4, 9, 2], [-2, 6, 2]]) b.poly([[x + dx - w, y], [x + dx, y - h], [x + dx + w, y]], C[2]), b.line(x + dx, y - h, x + dx - w + 1, y - 1, C[4]), b.line(x + dx, y - h + 2, x + dx + w - 1, y - 1, C[1]);
}
function drips(ctx, t, cam, list) {
  list.forEach(([x, y], k) => {
    const per = 110 + k * 17, a = (t + k * 31) % per, sx = x - cam * 0.9;
    if (a < 60) { px1(ctx, '#6ab0d8', sx, y + (a > 45 ? 1 : 0)); return; }
    const fy = y + (a - 60) ** 2 * 0.09, gy = 120 + (k % 3) * 8;
    if (fy < gy) px1(ctx, '#9ad0f0', sx, fy, 1, 2);
    else { const r = (fy - gy) * 0.08; if (r < 6) { ctx.fillStyle = '#4a7aa8'; ctx.fillRect(rnd(sx - r), gy, 1, 1); ctx.fillRect(rnd(sx + r), gy, 1, 1); } }
  });
}
function spores(ctx, t, cam) {
  for (let k = 0; k < 16; k++) { const x = hash(k, 1, 219) * W + Math.sin(t / 60 + k) * 8 - cam * 0.6, y = 140 - ((t * 0.12 + hash(k, 2, 219) * 140) % 140); if (Math.sin(t / 20 + k * 2) > -0.2) px1(ctx, k % 2 ? '#5ae8c8' : '#a080f0', x, y); }
}
function banner(ctx, t, cam, ph) {
  for (let i = 0; i < 9; i++) { ctx.fillStyle = gradeColor(i % 2 ? '#c8282a' : '#f4c430', ph); for (let j = 0; j < 18; j++) ctx.fillRect(rnd(222 + i - cam * 0.5 + Math.sin(t / 16 + j * 0.22) * (j / 18) * 1.3), 34 + j, 1, 1); }
}

// ───────────── Montaje y dibujo del fondo ─────────────
const BG = new Map();
function buildBg(key, ph) {
  const D = BIOMES[key], hzn = D.hz, gh = H - hzn;
  D._ph = ph; GROUND[key](D, ph);
  const sky = D.noSky ? null : skyLayer(ph, hzn);
  const far = new Buf(W + 2 * MF, hzn, MF); D.far?.(far, ph);
  const mid = new Buf(W + 2 * MM, hzn, MM); D.mid?.(mid, ph);
  const g = new Buf(W + 2 * MG, gh, MG);
  for (let j = 0; j < gh; j++) {
    const d = j + 6, fd = cl((j - 1) / 26);
    for (let x = -MG; x < W + MG; x++) g.set(x, j, D.gt((x - W / 2) * 48 / d, 7680 / d, j, fd, x));
  }
  D.deco?.(g, ph, gh);
  let front = null; if (D.front) { const f = new Buf(W + 2 * MFR, H, MFR); D.front(f, ph); front = f.canvas(); }
  return { sky, far: far.canvas(), mid: mid.canvas(), ground: g.canvas(), front, hz: hzn, gh };
}
const bgOf = (b, ph) => { const k = b + ':' + ph; let v = BG.get(k); if (!v) { v = buildBg(b, ph); BG.set(k, v); } return v; };
const PHS = ['manana', 'dia', 'tarde', 'crepusculo', 'noche'];
const normB = (b) => (BIOMES[b] ? b : 'pradera'), normP = (p) => (SKY[p] ? p : 'dia');

// Factor de paralaje del suelo en la fila y (para colocar actores y plataformas coherentes con el fondo):
// x_pantalla = x - cam * parallaxAt(y, bioma). En el horizonte vale 0,5 y abajo del todo 1.
export function parallaxAt(y, biome) { const hzn = BIOMES[normB(biome)].hz; return y <= hzn ? 0.5 : 0.5 + (0.5 * (y - hzn)) / (H - 1 - hzn); }
export function horizonOf(biome) { return BIOMES[normB(biome)].hz; }
// Precalienta la caché (para evitar el tirón del primer fotograma al entrar en combate).
export function warmBattleBg(biome, ph) { bgOf(normB(biome), normP(ph)); }

export function drawBattleBg(ctx, biome, ph, t = 0, cam = 0) {
  const B = normB(biome); ph = normP(ph); const D = BIOMES[B], L = bgOf(B, ph);
  if (L.sky) ctx.drawImage(L.sky, rnd(-MS - cam * 0.1), 0);
  if (L.sky && (ph === 'noche' || ph === 'crepusculo')) twinkle(ctx, t, cam, ph, L.hz);
  drawClouds(ctx, D, ph, t, cam);
  ctx.drawImage(L.far, rnd(-MF - cam * 0.25), 0);
  ctx.drawImage(L.mid, rnd(-MM - cam * 0.5), 0);
  const g = L.ground, gw = g.width;
  for (let j = 0; j < L.gh; j++) ctx.drawImage(g, 0, j, gw, 1, rnd(-MG - cam * (0.5 + (0.5 * j) / (L.gh - 1))), L.hz + j, gw, 1);
  D.anim?.call(D, ctx, L, ph, t, cam);
  if (L.front) ctx.drawImage(L.front, rnd(-MFR - cam * 0.9), 0);
}
function twinkle(ctx, t, cam, ph, hzn) {
  for (let k = 0; k < 8; k++) {
    const a = (t + k * 47) % 160; if (a > 30) continue; const s = a < 15 ? a / 15 : (30 - a) / 15;
    const x = rnd(hash(k, fl((t + k * 47) / 160), 221) * W - cam * 0.1), y = rnd(hash(k, fl((t + k * 47) / 160), 222) * (ph === 'noche' ? hzn - 14 : 20));
    ctx.fillStyle = '#fff8e0'; ctx.fillRect(x, y, 1, 1); if (s > 0.5) { ctx.fillStyle = '#a8b4e8'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  }
}

// ───────────── Plataformas ─────────────
// Parche de terreno bajo cada actor: canto oscuro que da grosor, superficie iluminada desde arriba-izquierda
// y bordes con el detalle del bioma (matas, piedras, adoquines, alfombra con flecos…).
const PLAT = {
  grass: { top: PAL.grass.slice(2, 9), side: PAL.dirt.slice(0, 5), edge: 'tuft' },
  moss: { top: PAL.forest.concat(['#4c8a48']), side: ['#1a1018', '#2a1a20', '#3e2626', '#583428'], edge: 'tuft' },
  rock: { top: PAL.dry, side: PAL.stone.slice(0, 5), edge: 'rock' },
  sand: { top: PAL.sand, side: ['#4e3a30', '#6e5038', '#93704a', '#b28e5c'], edge: 'shell' },
  cobble: { top: ['#463a42', '#62545a', '#7e6e70', '#9a8a86', '#b6a89e', '#d2c6b8', '#e8ded0'], side: ['#140f1a', '#241c2a', '#372c3c', '#4c404e'], edge: 'cobble' },
  rug: { top: PAL.red, side: PAL.wood.slice(0, 5), edge: 'rug' },
  cave: { top: ['#1e1a28', '#2a2538', '#38324a', '#48405e', '#5a5274', '#6e668a'], side: ['#06040a', '#0c0a14', '#14101e', '#1c1828'], edge: 'rock' },
  dry: { top: PAL.dry, side: ['#3a1c1c', '#4a2420', '#6a3226', '#8a462e'], edge: 'tuft' },
};
const PC = new Map();
export function drawPlatform(ctx, cx, cy, rx, ry, biome, ph) {
  const B = normB(biome); ph = normP(ph); rx = rnd(rx); ry = rnd(ry); const k = [B, ph, rx, ry].join(':');
  let c = PC.get(k);
  if (!c) { c = platform(B, ph, rx, ry); PC.set(k, c); }
  ctx.drawImage(c, rnd(cx - c.width / 2), rnd(cy - ry - 6));
}
function platform(B, ph, rx, ry) {
  const S = PLAT[BIOMES[B].plat], T = gr(S.top, ph), Sd = gr(S.side, ph), th = Math.max(3, rnd(ry * 0.35));
  const w = rx * 2 + 8, h = ry * 2 + th + 12, cx = w / 2, cy = ry + 6; const b = new Buf(w, h);
  const inE = (x, y, oy = 0, k = 1) => { const dx = (x + 0.5 - cx) / (rx * k), dy = (y + 0.5 - cy - oy) / (ry * k); return dx * dx + dy * dy <= 1; };
  // canto (grosor) y sombra inferior
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (inE(x, y)) continue; let inside = false; for (let o = 1; o <= th; o++) if (inE(x, y, o)) { inside = true; break; }
    if (!inside) continue; const below = inE(x, y - th + 1) ? 0 : 1; const dx = (x - cx) / rx;
    b.set(x, y, Sd[cl(fl(1.6 - dx * 1.2 + (hash(x, y, 3) - 0.5) * 0.8 - below), 0, Sd.length - 1)]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inE(x, y)) continue; const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, r = Math.hypot(dx, dy);
    let v = 0.55 - dx * 0.16 - dy * 0.22 + (vnoise(x, y * 2, 3, 231) - 0.5) * 0.35;
    if (r > 0.86) v += dy < 0 ? 0.18 : -0.22; // filo: iluminado arriba, oscuro abajo
    if (S.edge === 'cobble') { const row = fl((y - cy + ry * 2) / 3), cu = (x + (row % 2) * 2) / 4, fu = cu - fl(cu), fv = (y - cy + ry * 2) / 3 - row; if (fu < 0.25 || fv < 0.34) v -= 0.3; else if (fv < 0.67 && fu < 0.5) v += 0.12; }
    if (S.edge === 'rug') { if (r > 0.78) v = 0.75 + (fl(x / 2) % 2) * 0.1; else if (r > 0.68) v = 0.3; else if (Math.abs(dx) + Math.abs(dy) < 0.35) v = 0.62; else if (Math.abs(Math.abs(dx) + Math.abs(dy) - 0.5) < 0.07) v = 0.8; }
    b.set(x, y, dq(S.edge === 'rug' && r > 0.78 ? gr(PAL.gold, ph) : T, v, x, y));
  }
  // detalles del borde
  const n = rnd(rx * 1.4);
  for (let i = 0; i < n; i++) {
    const a = hash(i, 1, 233) * Math.PI * 2, ex = cx + Math.cos(a) * rx * 0.98, ey = cy + Math.sin(a) * ry * 0.98, front = Math.sin(a) > 0;
    if (S.edge === 'tuft') { const G = T, hh = 2 + fl(hash(i, 2, 233) * 3); for (let k = 0; k < hh; k++) b.set(ex + (k > 1 ? (hash(i, 3, 233) < 0.5 ? -1 : 1) : 0), ey - k + (front ? 1 : 0), G[Math.min(G.length - 1, 3 + k)]); if (front && hash(i, 4, 233) < 0.5) b.set(ex + 1, ey + 2, G[2]); }
    if (S.edge === 'rock' && hash(i, 2, 233) < 0.5) { const R = gr(PAL.stone, ph); b.rect(ex - 1, ey - 1, 3, 2, R[3]); b.set(ex - 1, ey - 1, R[5]); b.rect(ex, ey + 1, 3, 1, R[1]); }
    if (S.edge === 'shell' && hash(i, 2, 233) < 0.25) { b.set(ex, ey, gradeColor('#f0c8b8', ph)); b.set(ex + 1, ey, gradeColor('#c88a7a', ph)); }
    if (S.edge === 'rug' && front && i % 2 === 0) { b.set(ex, ey + 2, gr(PAL.gold, ph)[4]); b.set(ex, ey + 3, gr(PAL.gold, ph)[3]); }
  }
  const c = b.canvas(); return c;
}
// Sombra elíptica tramada (para los actores).
export function drawShadow(ctx, cx, cy, rx, ry, dens = 0.55) {
  ctx.fillStyle = INK; cx = rnd(cx); cy = rnd(cy);
  for (let j = -ry; j <= ry; j++) { const w = rnd(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry + 0.0001)))); for (let i = -w; i < w; i++) { const e = 1 - (i * i) / (w * w + 1); if (bayer(cx + i, cy + j) < dens * (0.55 + e * 0.45)) ctx.fillRect(cx + i, cy + j, 1, 1); } }
}

// ───────────── Monstruos del folklore ─────────────
// Todos miran a la IZQUIERDA (hacia el jugador), con los pies en las últimas filas y centrados.
// El follet flota: deja 5 px libres bajo los pies.
export const MONSTER_SIZE = { quarantamaula: [64, 64], simiot: [56, 64], follet: [40, 40], drac: [96, 80] };
const MONC = new Map(), MON = {};
export function monsterSprite(id, frame = 0, pose = 'idle') {
  const p = pose === 'attack' || pose === 'hurt' ? pose : 'idle', f = p === 'idle' ? frame & 1 : 0, k = id + ':' + p + ':' + f;
  let c = MONC.get(k); if (c) return c;
  c = (MON[id] || MON.follet)(p, f); MONC.set(k, c); return c;
}
// Cápsula: blobs a lo largo de un segmento (miembros, cuello, cola).
const cap = (x0, y0, x1, y1, r0, r1, n = 6, ex = {}) => Array.from({ length: n + 1 }, (_, i) => ({ x: lerp(x0, x1, i / n), y: lerp(y0, y1, i / n), r: lerp(r0, r1, i / n), ...ex }));
// Pelaje desgreñado: púas de 1-L px en el borde superior y los lados de la silueta.
function shag(b, R, seed, dens, len, cx) {
  const pts = [];
  for (let y = 1; y < b.h - 1; y++) for (let x = 1; x < b.w - 1; x++) {
    if (!b.on(x, y)) continue; const up = !b.on(x, y - 1), lf = !b.on(x - 1, y), rt = !b.on(x + 1, y);
    if ((up || lf || rt) && !(!b.on(x, y + 1) && !up) && hash(x, y, seed) < dens) pts.push([x, y, up ? 0 : lf ? -1 : 1]);
  }
  for (const [x, y, d] of pts) {
    const L = 1 + fl(hash(x, y, seed + 1) * len), lean = hash(x, y, seed + 2) < 0.5 ? -1 : 1, c = d === 0 ? R[x < cx ? 5 : 3] : R[d < 0 ? 4 : 2];
    for (let i = 1; i <= L; i++) { const px = d === 0 ? x + (i === L ? lean : 0) : x + d * i, py = d === 0 ? y - i : y - (i === L ? 1 : 0); if (!b.on(px, py)) b.set(px, py, c); }
  }
}
// Píxeles semitransparentes sobre el lienzo ya contorneado (brillos, jirones).
function overlay(c, fn) { const x = c.getContext('2d'); fn((col, px, py, a = 1, w = 1, h = 1) => { x.globalAlpha = a; x.fillStyle = col; x.fillRect(rnd(px), rnd(py), w, h); }); x.globalAlpha = 1; return c; }
const SCALES = (x, y) => (((x + (fl(y / 3) & 1) * 2) & 3) === 0 && y % 3 === 0 ? -0.22 : ((x + 1 + (fl(y / 3) & 1) * 2) & 3) === 0 && y % 3 === 1 ? 0.12 : 0);

// La Quarantamaula: masa informe de pelo negro que ronda de noche, ojos de brasa y unas fauces enormes.
MON.quarantamaula = (pose, f) => {
  const b = new Buf(64, 64), atk = pose === 'attack', hurt = pose === 'hurt';
  const F = ['#08060e', '#0e0a16', '#151020', '#1e172c', '#29203a', '#362a4a', '#46385c', '#5c4a76'];
  const ox = atk ? -2 : hurt ? 1 : 0, by = (atk ? -2 : 0) + f, sq = hurt ? 2 : 0;
  blobs(b, [{ x: 49 + ox, y: 58, r: 7, ry: 5 }], F, { amb: 0.08, nod: true });
  const hx = 24 + ox - (atk ? 2 : 0), hy = 31 + by + (atk ? 3 : 0) + sq;
  blobs(b, [
    { x: 38 + ox, y: 38 + by + sq, r: 19, ry: 18 - sq }, { x: 42 + ox, y: 24 + by + sq, r: 13, ry: 12 },
    { x: 33 + ox, y: 50, r: 18, ry: 9 }, { x: hx, y: hy, r: 15, ry: 13, z: 1.12 },
  ], F, { amb: 0.1, tex: 0.6, tf: (x, y) => vnoise(x * 1.7, y * 0.28, 1, 301) - 0.5, nod: true });
  shag(b, F, 301 + f * 7, 0.42, hurt ? 4 : 3, 38 + ox);
  const paw = (x, y, r) => { blobs(b, [{ x, y, r, ry: r * 0.72 }], F, { amb: 0.14, tex: 0.3, nod: true }); for (let k = 0; k < 3; k++) { const cy = y - 2 + k * 2; b.set(x - r - 1, cy, '#f2e8d0'); b.set(x - r, cy, '#c4b498'); b.set(x - r - 2, cy + 1, '#9a8a76'); } };
  paw(atk ? 12 + ox : 16 + ox, atk ? 42 : 57, 6); paw(31 + ox, 58, 6);
  // fauces
  const mx = hx - 4, my = hy + 5, mr = atk ? 10 : 9, mh = atk ? 6 : hurt ? 1 : 3;
  for (let y = -mh; y <= mh; y++) for (let x = -mr; x <= mr; x++) { const e = (x * x) / (mr * mr) + (y * y) / (mh * mh + 0.01); if (e <= 1) b.set(mx + x, my + y + (x * 0.15), e > 0.55 ? '#4a0c18' : y > mh * 0.4 ? '#a02838' : '#22040c'); }
  for (let x = -mr + 1; x < mr; x += 2) { const ty = my - mh + (x * 0.15), th = atk ? 3 : 2; for (let k = 0; k < th; k++) b.set(mx + x, ty + k, k ? '#d8ccb0' : '#f6eed8'); if (!hurt) b.set(mx + x + 1, my + mh + x * 0.15 - 1, '#e8dcc0'); }
  if (hurt) for (let x = -mr + 1; x < mr; x++) b.set(mx + x, my + x * 0.15, x % 2 ? '#e8dcc0' : '#8a1a2a');
  // ojos de brasa con ceño
  const eye = (ex, ey, big) => {
    if (hurt) { for (let k = 0; k < 3; k++) { b.set(ex + k, ey - 1 + Math.abs(1 - k), '#ff8a2a'); } return; }
    const w = big ? 4 : 3, hh = atk ? 3 : 2;
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) b.set(ex + x, ey + y, y === 0 && x > 0 ? '#ffd040' : '#ff6a1a');
    b.set(ex + 1, ey, '#fff8c8'); b.set(ex + (big ? 2 : 1), ey + 1, '#2a0610');
    b.set(ex - 1, ey - 2, F[0]); b.set(ex, ey - 1, F[0]); b.set(ex + w, ey - 1, F[1]); b.set(ex + w - 1, ey - 1, F[0]);
  };
  eye(hx - 11, hy - 4, false); eye(hx - 3, hy - 5, true);
  const c = b.canvas(); outlineSel(c, { ink: '#04030a' });
  return overlay(c, (P) => {
    if (!hurt) for (const [ex, ey, w] of [[hx - 11, hy - 4, 3], [hx - 3, hy - 5, 4]]) { for (let x = -1; x <= w; x++) { P('#ff7a2a', ex + x, ey - 1, 0.35); P('#ff7a2a', ex + x, ey + (atk ? 3 : 2), 0.35); } P('#ff9a40', ex - 1, ey, 0.5); P('#ff9a40', ex + w, ey, 0.5); }
    // jirones de sombra que suben
    [[32, 6, 10], [42, 4, 14], [50, 9, 9]].forEach(([x0, top, L], k) => { const x1 = x0 + ox; let y0 = 0; while (y0 < 64 && !b.on(x1, y0)) y0++; for (let i = 0; i < L + f * 2; i++) { const px = x1 + Math.sin(i * 0.55 + f * 1.6 + k * 2) * 1.6, py = y0 - i + 1; if ((i + k) % 2 === 0 || i < 4) P(i < 5 ? F[4] : F[6], px, py, 0.85 - i / (L + 4) * 0.6, i < 3 ? 2 : 1, 1); } });
  });
};

// El Simiot: diablo simiesco del Vallespir. Encorvado, peludo, cuernos de cabra, ojos verdosos y cola de demonio.
MON.simiot = (pose, f) => {
  const b = new Buf(56, 64), atk = pose === 'attack', hurt = pose === 'hurt';
  const Fu = ['#1c1216', '#2a1c1e', '#3c2a26', '#523a30', '#6a4e3c', '#86664c', '#a2805e', '#bc9c76'];
  const Fd = Fu.map((c) => mix(c, '#140a14', 0.3)), Fc = ['#3e2628', '#5e3c3a', '#80564e', '#a07266', '#bc9080', '#d6ae9a', '#ecccb6'], Hn = ['#2a2018', '#5a4834', '#8a7454', '#b8a07a', '#e2d2ac', '#fff4d8'];
  const ox = hurt ? 2 : 0, by = (atk ? -2 : 0) + f, lb = hurt ? 2 : 0;
  const fur = (seed) => ({ amb: 0.14, tex: 0.5, tf: (x, y) => vnoise(x * 1.9, y * 0.32, 1, seed) - 0.5, nod: true });
  // cola: sale de la grupa, hace una S y acaba en borla
  const tail = []; for (let i = 0; i <= 16; i++) { const t = i / 16; tail.push({ x: 43 + ox + Math.sin(t * 2.6) * 9 + (f ? Math.sin(t * 4) : 0), y: 48 - t * 30 - Math.sin(t * 3.2) * 2, r: 2.4 - t * 0.9 }); }
  blobs(b, tail, Fu, { amb: 0.15, nod: true }); const te = tail[16]; blobs(b, [{ x: te.x, y: te.y - 2, r: 2.6, ry: 3.4 }], Fu, { amb: 0.25, nod: true });
  b.poly([[te.x - 2, te.y - 4], [te.x, te.y - 9], [te.x + 2, te.y - 4]], Fu[6]);
  // brazo lejano (más oscuro)
  const sh2 = [39 + ox + lb, 29 + by];
  const farArm = atk ? [...cap(sh2[0], sh2[1], 42 + ox, 15, 4, 3.6, 4), ...cap(42 + ox, 15, 36 + ox, 4, 3.6, 3.6, 3)] : hurt ? [...cap(sh2[0], sh2[1], 30 + ox, 26, 4, 3.6, 4)] : [...cap(sh2[0], sh2[1], 45 + ox, 42, 4.2, 3.8, 4), ...cap(45 + ox, 42, 47 + ox, 56, 3.8, 3.4, 4)];
  blobs(b, farArm, Fd, fur(311)); const fh = farArm[farArm.length - 1]; blobs(b, [{ x: fh.x, y: fh.y + 1, r: 3.6, ry: 3 }], Fc.map((c) => mix(c, '#140a14', 0.3)), { amb: 0.2, nod: true });
  // piernas arqueadas
  blobs(b, [{ x: 39 + ox, y: 52, r: 6, ry: 6 }, { x: 41 + ox, y: 60, r: 3.5, ry: 3 }, { x: 44 + ox, y: 62, r: 5, ry: 2 }], Fd, fur(312));
  blobs(b, [{ x: 27 + ox, y: 52, r: 6, ry: 6 }, { x: 25 + ox, y: 60, r: 3.5, ry: 3 }, { x: 22 + ox, y: 62, r: 5, ry: 2 }], Fu, fur(313));
  // tronco, joroba y pecho
  blobs(b, [{ x: 34 + ox + lb, y: 42 + by, r: 11, ry: 11 }, { x: 33 + ox + lb, y: 29 + by, r: 13, ry: 10, z: 1.06 }, { x: 34 + ox, y: 50, r: 9, ry: 6 }], Fu, fur(314));
  blobs(b, [{ x: 27 + ox + lb, y: 39 + by, r: 6, ry: 8 }], Fu.slice(2), { amb: 0.32, tex: 0.35, tf: (x, y) => vnoise(x * 2, y * 0.5, 1, 315) - 0.5, nod: true });
  shag(b, Fu, 316 + f, 0.32, 3, 30 + ox);
  // cabeza
  const hx = 19 + ox + lb * 2, hy = 24 + by - (atk ? 2 : 0);
  blobs(b, [{ x: hx + 1, y: hy - 1, r: 9.5, ry: 8.5 }], Fu, fur(317));
  for (const [x0, y0, k] of [[hx + 3, hy - 7, 0], [hx - 2, hy - 8, 1]]) for (let i = 0; i < 8; i++) { const px = x0 + i * 0.9 - (k ? 1 : 0), py = y0 - Math.sin((i / 7) * 2.2) * 5 + (i > 5 ? i - 5 : 0); b.set(px, py, Hn[i < 2 ? 2 : i < 5 ? 3 : 4]); b.set(px, py + 1, Hn[i < 4 ? 1 : 2]); } // cuernos de cabra
  b.poly([[hx + 7, hy - 3], [hx + 12, hy - 7], [hx + 9, hy + 1]], Fu[5]); b.set(hx + 10, hy - 5, Fc[3]); // oreja
  blobs(b, [{ x: hx - 3, y: hy + 1, r: 6.5, ry: 6 }, { x: hx - 8, y: hy + 4, r: 5, ry: 4, z: 1.1 }], Fc, { amb: 0.22, nod: true }); // cara y hocico
  for (const [ex, d] of [[hx - 7, 1], [hx - 2, -1]]) for (let i = -1; i < 4; i++) { const yy = hy - 4 + (d > 0 ? (i > 0 ? 1 : 0) : (i < 2 ? 1 : 0)) - (i === (d > 0 ? -1 : 3) ? 1 : 0); b.set(ex + i, yy, Fu[1]); b.set(ex + i, yy - 1, Fu[3]); } // cejas fruncidas
  if (hurt) { b.rect(hx - 7, hy - 1, 3, 1, Fu[0]); b.rect(hx - 2, hy - 1, 3, 1, Fu[0]); }
  else for (const ex of [hx - 7, hx - 2]) { b.rect(ex, hy - 2, 3, 2, '#c8f04a'); b.set(ex, hy - 2, '#f6ffd0'); b.set(ex + 1, hy - 1, '#2a4008'); }
  b.set(hx - 12, hy + 2, Fc[0]); b.set(hx - 11, hy + 3, Fc[1]); b.set(hx - 10, hy + 2, Fc[0]); // nariz
  const mo = atk ? 4 : hurt ? 1 : 2, mx = hx - 12, my = hy + 6;
  b.rect(mx, my, 9, mo, '#2a0a10'); if (atk) b.rect(mx + 1, my + 2, 7, 2, '#8a2a34');
  b.set(mx + 1, my, '#f6eed8'); b.set(mx + 1, my + 1, '#d8ccb4'); b.set(mx + 6, my, '#f6eed8'); b.set(mx + 6, my + 1, '#d8ccb4'); if (mo > 2) { b.set(mx + 3, my + mo - 1, '#e8dcc0'); b.set(mx + 5, my + mo - 1, '#e8dcc0'); }
  // brazo cercano con codo: hasta el suelo, en alto o cubriéndose
  const sh = [25 + ox + lb, 30 + by];
  const arm = atk ? [...cap(sh[0], sh[1], 18 + ox, 14, 4.6, 4, 4), ...cap(18 + ox, 14, 15 + ox, 3, 4, 3.8, 3)] : hurt ? [...cap(sh[0], sh[1], 17 + ox, 36, 4.6, 4.2, 3), ...cap(17 + ox, 36, hx - 6, hy + 2, 4.2, 3.8, 3)] : [...cap(sh[0], sh[1], 17 + ox, 43, 4.8, 4.2, 4), ...cap(17 + ox, 43, 12 + ox, 56, 4.2, 3.8, 4)];
  blobs(b, arm, Fu, fur(318));
  const hd = arm[arm.length - 1]; blobs(b, [{ x: hd.x - 1, y: hd.y + (atk ? -1 : 1), r: 4.4, ry: 3.6 }], Fc, { amb: 0.24, nod: true });
  for (let k = 0; k < 3; k++) { b.set(hd.x - 4 + k * 2, hd.y + (atk ? -4 : 5), Hn[4]); b.set(hd.x - 4 + k * 2, hd.y + (atk ? -5 : 4), Hn[3]); } // garras
  const c = b.canvas(); outlineSel(c);
  return overlay(c, (P) => { if (!hurt) for (const ex of [hx - 7, hx - 2]) { P('#b8ff50', ex - 1, hy - 2, 0.35); P('#b8ff50', ex + 3, hy - 2, 0.35); P('#b8ff50', ex, hy - 3, 0.25, 3, 1); } });
};

// El Follet: duende travieso de la casa, con barretina roja, orejas de soplillo y sonrisa de pillo.
MON.follet = (pose, f) => {
  const b = new Buf(40, 40), atk = pose === 'attack', hurt = pose === 'hurt';
  const Sk = ['#4a2226', '#7a3e38', '#a8604e', '#cc8468', '#e6a888', '#f6cca8', '#fff0dc'], Gn = PAL.green, Rd = PAL.red, Wd = PAL.wood, Gd = PAL.gold;
  const oy = -f, tilt = hurt ? 2 : 0;
  // piernas y zapatos de punta enroscada
  for (const [lx, d] of [[17, 0], [22, 1]]) { b.rect(lx, 30 + oy, 2, 4, Wd[2]); b.rect(lx - 2 + d, 34 + oy, 4, 2, Wd[1]); b.set(lx - 3 + d, 33 + oy, Wd[2]); b.set(lx - 3 + d, 34 + oy, Wd[1]); b.set(lx - 1 + d, 34 + oy, Wd[3]); }
  // túnica verde con cinturón
  blobs(b, [{ x: 20, y: 27 + oy, r: 6.5, ry: 5.5 }, { x: 20, y: 30 + oy, r: 7, ry: 3 }], Gn, { amb: 0.2, nod: true });
  b.rect(14, 28 + oy, 13, 1, Wd[1]); b.rect(19, 28 + oy, 2, 1, Gd[4]);
  for (let x = 14; x < 27; x += 2) b.set(x, 33 + oy, Gn[2]);
  // brazos
  const arm = (x0, y0, x1, y1) => { b.line(x0, y0, x1, y1, Gn[3]); b.line(x0, y0 + 1, x1, y1 + 1, Gn[2]); b.rect(x1 - 1, y1 - 1, 2, 2, Sk[4]); b.set(x1 - 1, y1 - 1, Sk[5]); };
  if (atk) { arm(15, 24 + oy, 9, 15 + oy); arm(25, 24 + oy, 31, 15 + oy); }
  else if (hurt) { arm(15, 24 + oy, 8, 21 + oy); arm(25, 24 + oy, 32, 21 + oy); }
  else { arm(15, 24 + oy, 10, 21 + oy); arm(25, 25 + oy, 28, 29 + oy); }
  // cabeza grande
  const hx = 19 + tilt, hy = 15 + oy;
  for (const [ex, dir] of [[hx - 6, -1], [hx + 6, 1]]) { const ty = hy - 9 + (hurt ? 5 : 0); b.poly([[ex, hy - 3], [ex + dir * 9, ty], [ex + dir * 2, hy + 3]], Sk[dir < 0 ? 4 : 3]); b.line(ex + dir * 2, hy - 1, ex + dir * 7, ty + 2, Sk[2]); b.set(ex + dir * 9, ty, Sk[5]); } // orejas de soplillo
  blobs(b, [{ x: hx, y: hy, r: 8, ry: 7 }, { x: hx - 1, y: hy + 3, r: 6.5, ry: 4.5 }], Sk, { amb: 0.25, nod: true });
  blobs(b, [{ x: hx - 6, y: hy + 2, r: 2.6, ry: 2.2 }], ['#6a2a2a', '#9a4440', '#c8645a', '#e08a78', '#f4b0a0'], { amb: 0.3, nod: true }); // narizota
  b.set(hx - 4, hy + 4, '#e87a7a'); b.set(hx + 3, hy + 4, '#e87a7a'); // mofletes
  if (hurt) { for (const ex of [hx - 5, hx + 1]) { b.set(ex, hy - 1, INK); b.set(ex + 1, hy, INK); b.set(ex, hy + 1, INK); } b.rect(hx - 3, hy + 5, 2, 2, '#3a0c14'); }
  else {
    for (const ex of [hx - 5, hx + 1]) { b.rect(ex, hy - 2 + (atk ? 1 : 0), 2, atk ? 2 : 3, INK); b.set(ex, hy - 2 + (atk ? 1 : 0), '#ffffff'); }
    b.set(hx - 6, hy - 4 + (atk ? 1 : 0), Sk[1]); b.set(hx - 5, hy - 4, Sk[1]); b.set(hx + 1, hy - 4, Sk[1]); b.set(hx + 2, hy - 3 + (atk ? 0 : 0), Sk[1]);
    for (let x = -4; x <= 3; x++) b.set(hx + x, hy + 5 + (x === -4 || x === 3 ? -1 : 0), '#4a1418'); if (atk) b.rect(hx - 3, hy + 6, 6, 1, '#8a2a30');
    b.set(hx, hy + 5, '#fff6e8'); // diente
  }
  // barretina caída hacia atrás
  const ct = hurt ? 3 : 0, sw = f ? 1 : 0;
  b.poly([[hx - 8, hy - 5 + ct], [hx - 6, hy - 11], [hx + 2, hy - 13], [hx + 9 + sw, hy - 10 + ct], [hx + 12 + sw, hy - 4 + ct], [hx + 9, hy - 6 + ct], [hx + 7, hy - 5]], Rd[3]);
  b.line(hx - 6, hy - 11, hx + 2, hy - 13, Rd[5]); b.line(hx - 7, hy - 9, hx - 2, hy - 11, Rd[4]); b.line(hx + 6, hy - 9, hx + 11 + sw, hy - 4 + ct, Rd[2]);
  b.rect(hx - 8, hy - 6 + (hurt ? 1 : 0), 16, 2, Rd[1]); b.rect(hx - 8, hy - 6 + (hurt ? 1 : 0), 16, 1, Rd[2]);
  b.rect(hx + 11 + sw, hy - 4 + ct, 2, 2, Gd[4]); b.set(hx + 11 + sw, hy - 4 + ct, Gd[6]);
  // al atacar: cinta roja enredada que gira entre las manos
  if (atk) for (let i = 0; i < 40; i++) { const a = i * 0.32, r = 3 + i * 0.22; b.set(20 + Math.cos(a) * r * 1.3, 11 + Math.sin(a) * r * 0.6, i % 6 < 3 ? Rd[4] : Rd[3]); }
  const c = b.canvas(); outlineSel(c);
  return overlay(c, (P) => { for (let k = 0; k < 4; k++) P(k % 2 ? '#fff4a0' : '#f8d870', 14 + k * 4 + (f ? 1 : 0), 37 + oy + (k % 2), 0.6); });
};

// Ala de murciélago: hombro → muñeca → puntas de los dedos. Membrana festoneada entre dedos,
// más clara junto al hueso y con nervaduras; huesos con brillo y garra en la muñeca.
function wing(b, sh, wr, tips, Wg, Sc, far) {
  const m = new Buf(b.w, b.h), pts = [wr, ...tips];
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], mx = (ax + bx) / 2 + (wr[0] - (ax + bx) / 2) * 0.28, my = (ay + by) / 2 + (wr[1] - (ay + by) / 2) * 0.28;
    m.poly([[wr[0], wr[1]], [ax, ay], [mx, my], [bx, by]], '#ffffff');
  }
  m.poly([[sh[0], sh[1]], [wr[0], wr[1]], tips[tips.length - 1], [sh[0] + 4, sh[1] + 8]], '#ffffff');
  const R = Math.hypot(tips[0][0] - wr[0], tips[0][1] - wr[1]);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (m.on(x, y)) { const d = Math.hypot(x - wr[0], y - wr[1]) / R; b.set(x, y, dq(Wg, 0.75 - d * 0.5 + (vnoise(x, y, 2, 331) - 0.5) * 0.15, x, y, true)); }
  for (const [tx, ty] of tips) for (let i = 1; i < 6; i++) { const t = i / 6; const px = lerp(wr[0], tx, t) + (i % 2), py = lerp(wr[1], ty, t) + 1; if (m.on(px, py)) b.set(px, py, Wg[2]); }
  for (const [tx, ty] of tips) { b.line(wr[0], wr[1], tx, ty, Sc[far ? 2 : 3]); if (!far) b.line(wr[0], wr[1] - 1, tx, ty - 1, Sc[5]); b.set(tx, ty, far ? '#a8987c' : '#e8dab8'); }
  b.line(sh[0], sh[1], wr[0], wr[1], Sc[far ? 3 : 4]); b.line(sh[0] + 1, sh[1] + 1, wr[0] + 1, wr[1] + 1, Sc[far ? 1 : 2]); if (!far) b.line(sh[0] - 1, sh[1], wr[0] - 1, wr[1], Sc[6]);
  b.ell(wr[0], wr[1], 2, 2, Sc[far ? 3 : 5]); b.set(wr[0] - 1, wr[1] - 3, '#e8dab8'); b.set(wr[0] - 2, wr[1] - 4, '#c4ae88');
}

// El Drac d'Olorda: dragón de escamas verdes, vientre de placas doradas, alas de murciélago y fuego en la boca.
MON.drac = (pose, f) => {
  const b = new Buf(96, 80), atk = pose === 'attack', hurt = pose === 'hurt';
  const Sc = ['#0c1e16', '#13301e', '#1b4426', '#255a2e', '#317436', '#418f40', '#5aaa4c', '#7ec462', '#a8da80'];
  const Bl = PAL.gold, Wg = ['#2e0a12', '#4c121a', '#701e20', '#962e26', '#ba4630', '#d86640', '#ee905a'], Hn = ['#3a2c22', '#6a5640', '#9a8262', '#c4ae88', '#e8dab8', '#fff6e0'];
  const by = f, wy = atk ? -1 : hurt ? 8 : 3 + f * 2;
  // ala lejana (detrás del cuerpo)
  wing(b, [50, 36 + by], [40, 7 + wy], [[30, 13 + wy], [32, 25 + wy * 0.6], [40, 34 + by]], Wg.map((c) => mix(c, '#14060a', 0.35)), Sc.map((c) => mix(c, '#06100a', 0.35)), true);
  // cola
  const tail = []; for (let i = 0; i <= 14; i++) { const t = i / 14; tail.push({ x: 70 + t * 22 - Math.sin(t * 3) * 2, y: 60 + Math.sin(t * 2.6) * 8 + t * 6, r: 7 - t * 5.2 }); }
  blobs(b, tail, Sc, { amb: 0.15, tex: 0.5, tf: SCALES, nod: true });
  const tp = tail[14]; b.poly([[tp.x - 1, tp.y - 4], [tp.x + 6, tp.y + 1], [tp.x - 1, tp.y + 5], [tp.x + 1, tp.y + 1]], Bl[4]); b.line(tp.x - 1, tp.y - 4, tp.x + 6, tp.y + 1, Bl[5]);
  // pata trasera
  blobs(b, [{ x: 68, y: 63, r: 10, ry: 9 }, { x: 70, y: 73, r: 4, ry: 5 }, { x: 68, y: 77, r: 6, ry: 2.5 }], Sc, { amb: 0.15, tex: 0.5, tf: SCALES, nod: true });
  // cuerpo
  blobs(b, [{ x: 55, y: 52 + by, r: 18, ry: 14 }, { x: 50, y: 44 + by, r: 12, ry: 10 }], Sc, { amb: 0.14, tex: 0.5, tf: SCALES, nod: true });
  // cuello hasta la cabeza
  const hx = atk ? 16 : hurt ? 27 : 21, hy = atk ? 32 : hurt ? 18 : 24 + by;
  const neck = []; for (let i = 0; i <= 8; i++) { const t = i / 8; neck.push({ x: lerp(46, hx + 4, t) + Math.sin(t * Math.PI) * -3, y: lerp(42 + by, hy + 3, t) - Math.sin(t * Math.PI) * 4, r: lerp(9, 6, t) }); }
  blobs(b, neck, Sc, { amb: 0.14, tex: 0.5, tf: SCALES, nod: true });
  // placas del vientre y del cuello
  for (let y = 36; y < 70; y++) for (let x = 30; x < 72; x++) { if (!b.on(x, y)) continue; const inBelly = (x - 50) ** 2 / 300 + (y - 64 - by) ** 2 / 90 < 1 && x < 64; const inNeck = neck.some((n) => Math.hypot(x - n.x + n.r * 0.5, y - n.y - n.r * 0.55) < n.r * 0.55); if (inBelly || (inNeck && y > hy + 4)) b.set(x, y, (y + (inNeck ? x * 0.4 : 0)) % 3 < 1 ? Bl[2] : (x < 48 ? Bl[5] : Bl[4])); }
  // pata delantera
  blobs(b, [{ x: 41, y: 64, r: 6, ry: 7 }, { x: 38, y: 73, r: 4, ry: 4 }, { x: 36, y: 77, r: 6, ry: 2.5 }], Sc, { amb: 0.16, tex: 0.5, tf: SCALES, nod: true });
  for (const [x, y] of [[30, 77], [34, 78], [38, 78], [62, 78], [66, 78]]) { b.set(x, y, Hn[4]); b.set(x - 1, y, Hn[3]); }
  // crestas doradas sobre cuello y lomo
  for (let i = 0; i < 9; i++) { const n = neck[Math.min(8, i)], px = i < 6 ? n.x + 1 : 50 + (i - 6) * 8, py = i < 6 ? n.y - n.r : 37 + by - (i - 6) * -1; b.poly([[px - 2, py + 1], [px + 1, py - 4], [px + 2, py + 1]], Bl[4]); b.set(px + 1, py - 3, Bl[6]); }
  // ala cercana
  wing(b, [58, 36 + by], [78, 4 + wy], [[94, 12 + wy], [94, 30 + wy * 0.6], [84, 45 + wy * 0.3], [66, 46 + by]], Wg, Sc, false);
  // cabeza: cráneo, hocico, mandíbula, cuernos
  const jaw = atk ? 6 : hurt ? 0 : 2;
  blobs(b, [{ x: hx + 1, y: hy - 1, r: 8, ry: 6.5 }, { x: hx - 7, y: hy + 2, r: 7, ry: 4 }], Sc, { amb: 0.18, tex: 0.4, tf: SCALES, nod: true });
  blobs(b, [{ x: hx - 1, y: hy + 6 + jaw * 0.35, r: 5, ry: 2.6 }, { x: hx - 8, y: hy + 6 + jaw * 1.1, r: 5.5, ry: 2.4 }], Sc, { amb: 0.12, nod: true });
  if (jaw) {
    const m = [[hx + 2, hy + 5], [hx - 13, hy + 4], [hx - 12, hy + 5 + jaw * 1.25]]; b.poly(m, '#3a0810');
    for (let y = hy + 4; y < hy + 6 + jaw * 1.3; y++) for (let x = hx - 12; x < hx + 2; x++) if (b.get(x, y) === '#3a0810' && Math.hypot(x - hx, y - hy - 5 - jaw * 0.3) < 4 + jaw * 0.4) b.set(x, y, atk ? '#ffd040' : '#f07a28');
    for (let x = hx - 12; x < hx; x += 2) { b.set(x, hy + 5, '#f8f0dc'); const ly = hy + 5 + jaw * 1.25 * ((hx + 2 - x) / 15); b.set(x + 1, ly - 1, '#e8dcc0'); }
  }
  for (const [x0, y0, len, dy] of [[hx + 4, hy - 6, 12, -0.6], [hx, hy - 6, 9, -0.9]]) for (let i = 0; i < len; i++) { const px = x0 + i, py = y0 + i * dy + (i > len * 0.6 ? (i - len * 0.6) * 0.9 : 0); b.set(px, py, Hn[i < 3 ? 2 : i < 7 ? 3 : 4]); if (i < len - 3) b.set(px, py + 1, Hn[1]); }
  b.set(hx - 13, hy + 1, Sc[0]); b.set(hx - 12, hy + 1, Sc[1]); // narina
  if (hurt) { b.rect(hx - 3, hy - 2, 4, 1, Sc[0]); b.set(hx - 4, hy - 3, Sc[0]); }
  else { b.rect(hx - 3, hy - 3, 4, 3, '#ffe060'); b.set(hx - 3, hy - 3, '#fffbd0'); b.rect(hx - 1, hy - 3, 1, 3, '#3a1a08'); b.line(hx - 5, hy - 5, hx, hy - 4, Sc[0]); }
  const c = b.canvas(); outlineSel(c, { ink: '#08100c' });
  return overlay(c, (P) => {
    if (!hurt) { const fl2 = f ? 1 : 0; P('#ffd040', hx - 13, hy + 4 + jaw * 0.5, 0.7, 2, 2); P('#ff8a20', hx - 15 - fl2, hy + 4, 0.5, 2, 2); }
    if (atk) for (let i = 0; i < 14; i++) { const t = i / 13, x = hx - 14 - t * 13, y = hy + 6 + Math.sin(i * 1.7) * 2.5 * t; P(t < 0.3 ? '#fff4c0' : t < 0.6 ? '#ffc040' : '#f06a26', x, y, 0.95 - t * 0.4, 2 + fl(t * 3), 2 + fl(t * 2)); }
    if (!atk && !hurt && f) { P('#a8a4b0', hx - 15, hy - 1, 0.5); P('#c8c4d0', hx - 16, hy - 3, 0.4); }
  });
};

// ───────────── Efectos de combate ─────────────
// drawFx(ctx, tipo, x, y, t∈[0,1], {dir:±1, scale:1|2, color}). Deterministas: el mismo t da el mismo fotograma.
// Curva común: anticipación → estallido → disipación. Duraciones recomendadas en FX_FRAMES.
export const FX_FRAMES = { slash: 18, slash2: 26, claw: 20, bite: 24, impact: 16, fire: 36, frost: 36, bolt: 34, heal: 44, holy: 50, calm: 50, smoke: 44, poison: 40, dust: 22, charge: 36, shield: 22, counter: 16, dark: 40, roar: 30, coins: 34 };
const NOTE = ['..##', '..#.', '..#.', '###.', '##..'], HEART = ['.#.#.', '#####', '#####', '.###.', '..#..'], ZZ = ['###', '..#', '.#.', '###'];
export function drawFx(ctx, kind, x, y, t, o = {}) {
  t = cl(t); const s = o.scale || 1, d = o.dir || 1, fs = ctx.fillStyle;
  const P = (c, px, py, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(rnd(d > 0 ? x + px * s : x - (px + w) * s), rnd(y + py * s), w * s, h * s); };
  const D = (c, px, py, a) => { if (bayer(rnd(px), rnd(py)) < a) P(c, rnd(px), rnd(py)); }; // píxel tramado (desvanecer)
  const glyph = (rows, px, py, c, a = 1) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') (a >= 1 ? P(c, px + i, py + j) : D(c, px + i, py + j, a)); });
  const R = (k, n, sd) => hash(k, n, sd);
  // Arco de tajo: borde de ataque y cola con easing, grosor afilado en los extremos.
  const arc = (Rr, a0, a1, tt, thick, cols, flip = 1) => {
    const lead = a0 + (a1 - a0) * eOut(seg(tt, 0, 0.32)), trail = a0 + (a1 - a0) * eIn(seg(tt, 0.1, 0.62)); if (lead <= trail) return;
    const thin = 1 - seg(tt, 0.35, 0.75) * 0.6;
    for (let py = -Rr - 1; py <= Rr + 1; py++) for (let px = -Rr - 1; px <= Rr + 1; px++) {
      const r = Math.hypot(px, py), a = Math.atan2(py, px * flip); if (a < trail || a > lead) continue;
      const u = (a - trail) / (lead - trail), th = Math.sin(u * Math.PI) * thick * thin, din = Rr - r;
      if (din < 0 || din > th) continue; P(din < th * 0.4 ? cols[0] : din < th * 0.75 ? cols[1] : cols[2], px, py);
    }
  };
  const sparks = (n, sd, r0, r1, tt, c1, c2, a0 = -Math.PI, a1 = Math.PI) => { for (let k = 0; k < n; k++) { const a = a0 + (a1 - a0) * R(k, 1, sd), r = r0 + (r1 - r0) * eOut(tt) * (0.5 + R(k, 2, sd) * 0.5); if (R(k, 3, sd) < 1 - tt * 0.9) P(tt < 0.5 ? c1 : c2, Math.cos(a) * r, Math.sin(a) * r, R(k, 4, sd) < 0.3 && tt < 0.4 ? 2 : 1, 1); } };
  const star = (r, ri, n, c, rot = 0) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? ri : r; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } fillPoly(pts, c); };
  const fillPoly = (pts, c) => { let y0 = 1e9, y1 = -1e9; for (const [, py] of pts) { y0 = Math.min(y0, py); y1 = Math.max(y1, py); } for (let py = fl(y0); py <= Math.ceil(y1); py++) { const xs = [], yc = py + 0.5; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) { const a = rnd(xs[i]), b = rnd(xs[i + 1]); if (b > a) P(c, a, py, b - a, 1); } } };
  const ring = (rx, ry, c, a = 1, th = 1) => { for (let k = 0; k < Math.max(24, rx * 7); k++) { const an = (k / Math.max(24, rx * 7)) * Math.PI * 2; for (let q = 0; q < th; q++) { const px = Math.cos(an) * (rx - q), py = Math.sin(an) * (ry - q * ry / rx); a >= 1 ? P(c, rnd(px), rnd(py)) : D(c, px, py, a); } } };
  const disc = (cx, cy, r, c, a = 1) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) (a >= 1 ? P(c, cx + i, cy + j) : D(c, cx + i, cy + j, a)); };
  switch (kind) {
    case 'slash': {
      arc(20, -2.4, 0.95, seg(t, 0.06, 1), 7, ['#5a8ad0', '#5a8ad0', '#3a5aa0']);
      arc(18, -2.4, 0.95, t, 6, [o.color || '#ffffff', '#cdeeff', '#5aa8f0']);
      if (t > 0.3) sparks(9, 401, 17, 28, seg(t, 0.3, 1), '#ffffff', '#8ac8ff', -2.4, 0.95);
      break;
    }
    case 'slash2': {
      arc(21, -2.5, 1.0, t, 5.5, [o.color || '#ffffff', '#fff2a0', '#f0a030']);
      arc(21, -2.5, 1.0, seg(t, 0.12, 1), 5.5, ['#ffffff', '#fff2a0', '#f0a030'], -1);
      const fq = seg(t, 0.28, 0.6); if (fq > 0 && fq < 1) { const r = 4 + 12 * Math.sin(fq * Math.PI); star(r, r * 0.25, 4, '#fff6c0', Math.PI / 4); star(r * 0.6, r * 0.15, 4, '#ffffff', Math.PI / 4); }
      if (t > 0.35) sparks(14, 403, 8, 30, seg(t, 0.35, 1), '#ffffff', '#ffc040');
      break;
    }
    case 'claw': {
      const q = seg(t, 0.55, 1);
      for (let i = 0; i < 3; i++) {
        const p = eOut(seg(t, i * 0.07, i * 0.07 + 0.2)); if (!p) continue;
        const x0 = 11 + (i - 1) * 6, y0 = -13, x1 = -9 + (i - 1) * 6, y1 = 13, n = 26;
        for (let k = 0; k <= n * p; k++) { const u = k / n, w = Math.sin(u * Math.PI) * 2.6 * (1 - q * 0.8), px = lerp(x0, x1, u), py = lerp(y0, y1, u); for (let e = -Math.ceil(w); e <= Math.ceil(w); e++) { const c = Math.abs(e) < w * 0.45 ? '#ffffff' : Math.abs(e) < w ? '#ff6a5a' : null; if (c) (q > 0 ? D(c, px + e, py, 1 - q) : P(c, rnd(px + e), rnd(py))); } }
      }
      if (t > 0.3) sparks(8, 405, 4, 20, seg(t, 0.3, 1), '#ffffff', '#ff5a4a');
      break;
    }
    case 'bite': {
      const open = t < 0.3 ? 9 + eOut(t / 0.3) * 5 : t < 0.42 ? 14 * (1 - eIn(seg(t, 0.3, 0.42))) : 0, fade = seg(t, 0.55, 1);
      if (fade < 1) for (const sgn of [-1, 1]) {
        const gy = sgn * (open + 3);
        for (let px = -14; px <= 14; px++) { const cy = gy + sgn * (px * px) * 0.02; (fade ? D('#8a2a3a', px, cy, 1 - fade) : P('#8a2a3a', px, rnd(cy), 1, 2)); }
        for (let k = 0; k < (sgn < 0 ? 5 : 4); k++) { const fx = -12 + k * (sgn < 0 ? 6 : 6) + (sgn < 0 ? 0 : 3), fy = gy + sgn * (fx * fx) * 0.02, L = 6 - Math.abs(fx) * 0.12; for (let j = 0; j < L; j++) { const w = Math.max(1, rnd((1 - j / L) * 3)); for (let i = -w + 1; i < w; i++) { const c = i < 0 ? '#ffffff' : '#c8c0d8'; fade ? D(c, fx + i, fy - sgn * (j + 1), 1 - fade) : P(c, fx + i, rnd(fy - sgn * (j + 1))); } } }
      }
      const fq = seg(t, 0.4, 0.62); if (fq > 0 && fq < 1) { const r = 3 + 10 * Math.sin(fq * Math.PI); star(r, r * 0.35, 6, '#fff6c0'); star(r * 0.55, r * 0.2, 6, '#ffffff'); }
      if (t > 0.42) sparks(10, 407, 4, 22, seg(t, 0.42, 1), '#ffffff', '#ff7a5a');
      break;
    }
    case 'impact': {
      const g = eOut(seg(t, 0, 0.35)), sh = seg(t, 0.35, 0.85), r = (3 + 13 * g) * (1 - sh);
      if (r > 0.5) { star(r, r * 0.42, 8, o.color || '#ffd040', t * 0.6); star(r * 0.62, r * 0.25, 8, '#ffffff', t * 0.6); }
      ring(4 + 20 * eOut(seg(t, 0.1, 0.8)), 4 + 20 * eOut(seg(t, 0.1, 0.8)), '#fff6d0', 1 - seg(t, 0.1, 0.8));
      sparks(12, 409, 6, 26, seg(t, 0.08, 1), '#ffffff', '#ffb040');
      break;
    }
    case 'fire': {
      const F = PAL.fire, g = eOut(seg(t, 0, 0.3)), out = seg(t, 0.62, 1);
      const rb = (3 + 9 * g) * (1 - out * 0.8);
      for (let k = 0; k < 11; k++) {
        const a = -Math.PI / 2 + (R(k, 1, 411) - 0.5) * 2.4, h = (6 + R(k, 2, 411) * 12) * eOut(seg(t, 0.08 + R(k, 3, 411) * 0.1, 0.45)) * (1 - out), w = 2 + R(k, 4, 411) * 3;
        for (let j = 0; j < h; j++) { const u = j / h, ww = w * (1 - u) * (1 + Math.sin(t * 40 + k + j) * 0.15), cx = Math.cos(a) * (rb * 0.6 + j) + Math.sin(u * 5 + t * 30 + k) * 1.2, cy = Math.sin(a) * (rb * 0.6 + j); for (let i = -ww; i <= ww; i++) P(u < 0.25 ? F[5] : u < 0.55 ? F[4] : u < 0.8 ? F[3] : F[2], rnd(cx + i), rnd(cy)); }
      }
      if (rb > 0.5) { disc(0, 0, rnd(rb), F[3], out ? 1 - out : 1); disc(0, 0, rnd(rb * 0.7), F[4], out ? 1 - out : 1); disc(-1, -1, rnd(rb * 0.4), F[6], out ? 1 - out : 1); }
      for (let k = 0; k < 12; k++) { const q = seg(t, 0.15 + R(k, 5, 411) * 0.2, 1); if (!q || q >= 1) continue; const px = (R(k, 6, 411) - 0.5) * 30 * q, py = -q * (14 + R(k, 7, 411) * 16) + q * q * 4; P(q < 0.5 ? F[5] : F[3], rnd(px), rnd(py)); }
      if (out) for (let k = 0; k < 5; k++) { const q = seg(t, 0.6 + k * 0.05, 1); disc(rnd((k - 2) * 4), rnd(-6 - q * 14), rnd(2 + q * 3), '#7a7080', (1 - q) * 0.7); }
      break;
    }
    case 'frost': {
      const g = eOut(seg(t, 0, 0.3)), out = seg(t, 0.55, 1);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.26, L = 12 * g * (1 - out * 0.5); for (let j = 0; j <= L; j++) { const px = Math.cos(a) * j, py = Math.sin(a) * j; out ? D(j > L - 2 ? '#ffffff' : '#9ae4ff', px, py, 1 - out) : P(j > L - 2 ? '#ffffff' : '#9ae4ff', rnd(px), rnd(py)); if (j === rnd(L * 0.55) && L > 4) for (const sgn of [-1, 1]) for (let q = 1; q < 4; q++) { const b2 = a + sgn * 0.9; (out ? D('#e8f8ff', px + Math.cos(b2) * q, py + Math.sin(b2) * q, 1 - out) : P('#e8f8ff', rnd(px + Math.cos(b2) * q), rnd(py + Math.sin(b2) * q))); } } }
      if (g > 0.3 && !out) { P('#ffffff', -1, -1, 3, 3); P('#c8f4ff', 0, 0); }
      for (let k = 0; k < 9; k++) { const q = eOut(seg(t, 0.25, 0.75)); if (!q || seg(t, 0.25, 0.9) >= 1) continue; const a = (k / 9) * Math.PI * 2 + R(k, 1, 413), r = 6 + q * (14 + R(k, 2, 413) * 10), px = Math.cos(a) * r, py = Math.sin(a) * r, dx = Math.cos(a), dy = Math.sin(a); for (let j = -2; j <= 2; j++) P(Math.abs(j) < 1 ? '#ffffff' : '#5ac0f0', rnd(px + dx * j), rnd(py + dy * j)); }
      if (t > 0.4) for (let k = 0; k < 4; k++) { const q = seg(t, 0.4, 1); disc(rnd((R(k, 3, 413) - 0.5) * 20), rnd((R(k, 4, 413) - 0.5) * 14 - q * 4), rnd(3 + q * 6), '#e0f6ff', (1 - q) * 0.45); }
      if (t > 0.5) for (let k = 0; k < 6; k++) { const tw = Math.sin(t * 40 + k * 2); if (tw < 0.3) continue; const px = (R(k, 5, 413) - 0.5) * 30, py = (R(k, 6, 413) - 0.5) * 24; P('#ffffff', px, py); if (tw > 0.8) { P('#bfefff', px - 1, py); P('#bfefff', px + 1, py); P('#bfefff', px, py - 1); P('#bfefff', px, py + 1); } }
      break;
    }
    case 'bolt': {
      const on = fl(t * 40) % 3 !== 2, str = seg(t, 0.1, 0.48), seed = 415 + fl(t * 30 / 3);
      if (t < 0.1) { for (let k = 0; k < 3; k++) if (fl(t * 60 + k) % 2) P('#8a9aff', (R(k, 1, seed) - 0.5) * 30, -60 + R(k, 2, seed) * 50, 1, 4); }
      else if (str < 1 && on) {
        const pts = [[(R(0, 1, seed) - 0.5) * 18, -78]]; for (let i = 1; i < 9; i++) pts.push([(R(i, 1, seed) - 0.5) * 14 * (1 - i / 9), -78 + (78 * i) / 8.6]); pts.push([0, 0]);
        const seg2 = (a, b, w) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])); for (let k = 0; k <= n; k++) { const px = lerp(a[0], b[0], k / n), py = lerp(a[1], b[1], k / n); if (w) { P('#6a50e0', rnd(px) - 2, rnd(py), 5, 1); P('#a8b8ff', rnd(px) - 1, rnd(py), 3, 1); } P('#ffffff', rnd(px), rnd(py)); } };
        for (let i = 0; i < pts.length - 1; i++) seg2(pts[i], pts[i + 1], 1);
        for (const bi of [3, 5]) { let p0 = pts[bi]; for (let j = 0; j < 3; j++) { const p1 = [p0[0] + (R(bi, j, seed) - 0.3) * 12, p0[1] + 6 + R(bi, j + 5, seed) * 6]; seg2(p0, p1, 0); p0 = p1; } }
      }
      const oq = seg(t, 0.3, 0.75); if (oq > 0 && oq < 1) { const r = rnd(4 + 6 * Math.sin(oq * Math.PI)); disc(0, 0, r, '#6a50e0', 0.6); disc(0, 0, rnd(r * 0.7), '#a8b8ff'); disc(0, 0, rnd(r * 0.35), '#ffffff'); for (let k = 0; k < 4; k++) { const a = R(k, fl(t * 30), 417) * Math.PI * 2; let px = 0, py = 0; for (let j = 0; j < r + 5; j++) { px += Math.cos(a) + (R(k, j, 418 + fl(t * 30)) - 0.5); py += Math.sin(a) + (R(j, k, 419) - 0.5); P(j < 3 ? '#ffffff' : '#a8b8ff', rnd(px), rnd(py)); } } }
      if (t > 0.45) sparks(12, 421, 4, 22, seg(t, 0.45, 1), '#ffffff', '#8a7aff');
      break;
    }
    case 'heal': {
      const rq = seg(t, 0, 0.55); if (rq < 1) ring(4 + rq * 16, (4 + rq * 16) * 0.35, '#a8f890', 1 - rq);
      const C = ['#a8f890', '#fff4a0', '#ffffff', '#58d878'];
      for (let k = 0; k < 6; k++) { const q = seg(t, 0.05 + k * 0.05, 0.75); if (!q || q >= 1) continue; const px = (k - 2.5) * 4; for (let j = 0; j < 10; j++) D('#7ae070', px, 6 - q * 22 - j, (1 - q) * 0.5 * (1 - j / 10)); }
      for (let k = 0; k < 18; k++) { const st = R(k, 1, 423) * 0.45, q = seg(t, st, st + 0.5); if (!q || q >= 1) continue; const px = (R(k, 2, 423) - 0.5) * 24 + Math.sin(q * 6 + k) * 3, py = 8 - q * 30, c = C[k % 4], big = R(k, 3, 423) < 0.4 && q < 0.7; if (big) { P(c, px - 1, py, 3, 1); P(c, px, py - 1, 1, 3); P('#ffffff', px, py); } else D(c, px, py, 1.2 - q); }
      break;
    }
    case 'holy': {
      const wq = eOut(seg(t, 0, 0.25)) * (1 - seg(t, 0.75, 1)), w = rnd(10 * wq);
      if (w > 0) { ctx.save(); ctx.globalAlpha = 0.85; for (let py = -90; py <= 8; py++) { const ww = w + (py > 0 ? -py : 0); if (ww <= 0) continue; P('#fcd456', -ww - 1, py, 1, 1); P('#fff2b0', -ww, py, ww * 2, 1); P('#fffdf0', -fl(ww * 0.45), py, Math.max(1, fl(ww * 0.9)), 1); P('#fcd456', ww, py, 1, 1); } ctx.restore(); }
      const gq = seg(t, 0.1, 0.9); if (gq > 0 && gq < 1) ring(6 + gq * 14, (6 + gq * 14) * 0.3, '#fff2b0', 1 - gq, 2);
      for (let k = 0; k < 14; k++) { const st = R(k, 1, 425) * 0.6, q = seg(t, st, st + 0.35); if (!q || q >= 1) continue; P(k % 3 ? '#fff6c0' : '#ffffff', (R(k, 2, 425) - 0.5) * w * 2.2, 6 - q * 60); }
      const cq = seg(t, 0.3, 0.65); if (cq > 0 && cq < 1) { const L = rnd(2 + 6 * Math.sin(cq * Math.PI)); P('#ffffff', 0, -24 - L, 1, L * 2 + 1); P('#ffffff', -L, -24, L * 2 + 1, 1); P('#fff2b0', -1, -25, 3, 3); }
      break;
    }
    case 'calm': {
      for (let k = 0; k < 7; k++) {
        const st = k * 0.07, q = seg(t, st, st + 0.6); if (!q || q >= 1) continue;
        const px = (k % 2 ? -1 : 1) * (3 + q * 9) + Math.sin(q * 7 + k) * 3, py = 4 - q * 32, a = q > 0.7 ? (1 - q) / 0.3 : 1;
        if (k % 3 === 2) glyph(HEART, px - 2, py - 2, '#f890b0', a); else glyph(NOTE, px - 2, py - 3, k % 2 ? '#a0d8f8' : '#f8e080', a);
      }
      break;
    }
    case 'smoke': {
      const C = ['#5a4a8a', '#8a6ab8', '#b8a0e0'];
      for (let k = 0; k < 7; k++) { const st = k * 0.04, q = seg(t, st, 0.85 + k * 0.02); if (!q) continue; const a = (k / 7) * Math.PI * 2, r = 2 + q * 6, px = Math.cos(a) * (3 + q * 8), py = Math.sin(a) * (2 + q * 4) - q * 10; const fa = q > 0.6 ? (1 - q) / 0.4 : 1; disc(rnd(px), rnd(py), rnd(r), C[0], fa * 0.9); disc(rnd(px - 1), rnd(py - 1), rnd(r * 0.7), C[1], fa * 0.9); disc(rnd(px - 1), rnd(py - 2), rnd(r * 0.35), C[2], fa); }
      for (let k = 0; k < 3; k++) { const q = seg(t, 0.45 + k * 0.12, 1); if (!q || q >= 1) continue; glyph(ZZ, 4 + k * 5 + Math.sin(q * 6) * 2, -10 - q * 18 - k * 3, '#e8e0ff', q > 0.6 ? (1 - q) / 0.4 : 1); }
      break;
    }
    case 'poison': {
      for (let k = 0; k < 11; k++) {
        const st = R(k, 1, 427) * 0.4, q = seg(t, st, st + 0.55); if (!q) continue;
        const px = (R(k, 2, 427) - 0.5) * 24 + Math.sin(q * 6 + k) * 2, py = 8 - q * 26, r = 1.5 + R(k, 3, 427) * 2.2;
        if (q < 1) {
          for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const dd = Math.hypot(i, j); if (dd <= r + 0.5) P(dd > r - 0.6 ? '#4a9a2a' : bayer(i + 9, j + 9) < 0.5 ? '#9ae060' : '#7ac840', rnd(px + i), rnd(py + j)); }
          P('#e8ffc0', rnd(px - r * 0.45), rnd(py - r * 0.45));
        } else { const pq = seg(t, st + 0.55, st + 0.68); if (pq < 1) for (let i = 0; i < 4; i++) P('#c8f890', rnd(px + Math.cos(i * 1.57 + 0.78) * (r + 1 + pq * 3)), rnd(py + Math.sin(i * 1.57 + 0.78) * (r + 1 + pq * 3))); }
      }
      break;
    }
    case 'dust': {
      const C = ['#8a7a68', '#b8a888', '#e0d4bc'];
      for (let k = 0; k < 8; k++) { const q = seg(t, k * 0.03, 0.8 + k * 0.025); if (!q) continue; const sg = k % 2 ? -1 : 1, px = sg * (2 + eOut(q) * (10 + R(k, 1, 429) * 10)), py = 3 - eOut(q) * (2 + R(k, 2, 429) * 5), r = 2 + q * 4, a = q > 0.5 ? (1 - q) / 0.5 : 1; disc(rnd(px), rnd(py), rnd(r), C[0], a); disc(rnd(px - 1), rnd(py - 1), rnd(r * 0.75), C[1], a); disc(rnd(px - 1), rnd(py - 2), rnd(r * 0.4), C[2], a); }
      break;
    }
    case 'charge': {
      const c = o.color || '#9ae8ff';
      for (let k = 0; k < 14; k++) { const st = (k % 7) * 0.05, q = seg(t, st, st + 0.5); if (!q || q >= 1) continue; const a = R(k, 1, 431) * Math.PI * 2, r = 28 * (1 - eIn(q)) + 3, L = 5 - q * 3; for (let j = 0; j < L; j++) P(j === 0 ? '#ffffff' : c, rnd(Math.cos(a) * (r + j)), rnd(Math.sin(a) * (r + j))); }
      const g = eOut(seg(t, 0.25, 0.9)), pul = 1 + Math.sin(t * 50) * 0.15, r = rnd((2 + 5 * g) * pul); if (r > 0) { disc(0, 0, r + 1, c, 0.5); disc(0, 0, r, c); disc(0, 0, rnd(r * 0.55), '#ffffff'); }
      break;
    }
    case 'shield': {
      const hexp = (r) => Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3 + Math.PI / 6) * r, Math.sin(i * Math.PI / 3 + Math.PI / 6) * r]);
      const fade = seg(t, 0.6, 1);
      if (t < 0.12) fillPoly(hexp(11), '#ffffff');
      else if (fade < 1) {
        const pts = hexp(11); for (let i = 0; i < 6; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 6], n = 12; for (let k = 0; k <= n; k++) { const px = lerp(ax, bx, k / n), py = lerp(ay, by, k / n); (fade ? D('#ffe080', px, py, 1 - fade) : P('#ffe080', rnd(px), rnd(py))); (fade ? D('#ffffff', px * 0.86, py * 0.86, 1 - fade) : P('#ffffff', rnd(px * 0.86), rnd(py * 0.86))); } }
        const sq = seg(t, 0.12, 0.5); if (sq > 0 && sq < 1) { const off = -14 + sq * 28; for (let k = -12; k <= 12; k++) { const px = off + k * 0.5, py = k; if (Math.abs(px) * 0.9 + Math.abs(py) * 0.5 < 10) P('#ffffff', rnd(px), rnd(py), 2, 1); } }
      }
      const rq = seg(t, 0.12, 0.55); if (rq > 0 && rq < 1) ring(11 + rq * 12, 11 + rq * 12, '#fff2b0', 1 - rq);
      break;
    }
    case 'counter': {
      const g = eOut(seg(t, 0, 0.22)), sh = seg(t, 0.22, 0.7), L = 18 * g * (1 - sh), rot = t * Math.PI * 0.5;
      if (L > 0.5) for (let k = 0; k < 4; k++) { const a = rot + (k * Math.PI) / 2; for (let j = 0; j < L; j++) { const px = Math.cos(a) * j, py = Math.sin(a) * j; P(j < L * 0.4 ? '#ffffff' : '#fff2a0', rnd(px), rnd(py)); if (j < L * 0.25) { P('#ffffff', rnd(px + Math.sin(a)), rnd(py - Math.cos(a))); } } }
      if (L > 2) disc(0, 0, 2, '#ffffff');
      for (let k = 0; k < 4; k++) { const q = seg(t, 0.15, 0.9); if (!q || q >= 1) continue; const a = Math.PI / 4 + (k * Math.PI) / 2, r = 6 + q * 16; const px = Math.cos(a) * r, py = Math.sin(a) * r; P('#ffffff', px, py); if (q < 0.5) { P('#fff2a0', px - 1, py); P('#fff2a0', px + 1, py); P('#fff2a0', px, py - 1); P('#fff2a0', px, py + 1); } }
      break;
    }
    case 'dark': {
      const g = eOut(seg(t, 0, 0.4)), sh = seg(t, 0.6, 1), Lm = 22 * g * (1 - sh * 0.6);
      for (let k = 0; k < 7; k++) {
        const a0 = (k / 7) * Math.PI * 2 + R(k, 1, 433), L = Lm * (0.6 + R(k, 2, 433) * 0.5);
        for (let j = 0; j < L; j++) { const u = j / L, a = a0 + Math.sin(u * 4 + t * 8 + k) * 0.5, px = Math.cos(a) * j, py = Math.sin(a) * j * 0.8, w = Math.max(0, (1 - u) * 2.2); for (let e = -w; e <= w; e++) { const c = u > 0.8 ? '#8a5ab8' : Math.abs(e) < w * 0.5 ? '#1a0e24' : '#4a2a6a'; sh ? D(c, px - Math.sin(a) * e, py + Math.cos(a) * e, 1 - sh) : P(c, rnd(px - Math.sin(a) * e), rnd(py + Math.cos(a) * e)); } }
      }
      if (g > 0.2) disc(0, 0, rnd(4 * (1 - sh)), '#120818', 1 - sh);
      for (let k = 0; k < 6; k++) { const q = seg(t, 0.2 + k * 0.05, 1); if (!q || q >= 1) continue; const a = R(k, 3, 433) * Math.PI * 2; disc(rnd(Math.cos(a) * q * 26), rnd(Math.sin(a) * q * 18 - q * 6), 2, '#4a2a6a', (1 - q) * 0.7); }
      break;
    }
    case 'roar': {
      for (let k = 0; k < 3; k++) { const q = seg(t, k * 0.15, k * 0.15 + 0.6); if (!q || q >= 1) continue; const rx = 4 + q * 32; ring(rx, rx * 0.62, '#ffffff', (1 - q) * 0.95, q < 0.4 ? 2 : 1); }
      for (let k = 0; k < 10; k++) { const q = seg(t, 0.05 + R(k, 1, 435) * 0.2, 0.8); if (!q || q >= 1) continue; const a = (k / 10) * Math.PI * 2, r0 = 10 + q * 22; for (let j = 0; j < 4; j++) D('#ffffff', Math.cos(a) * (r0 + j), Math.sin(a) * (r0 + j) * 0.62, 1 - q); }
      break;
    }
    case 'coins': {
      const G = PAL.gold;
      for (let k = 0; k < 7; k++) {
        const st = k * 0.05, q = seg(t, st, st + 0.65); if (!q || q >= 1) continue;
        const dx = 22 + R(k, 1, 437) * 34, hgt = 14 + R(k, 2, 437) * 20, px = dx * q, py = -hgt * 4 * q * (1 - q) + 8 * q, w = 1 + rnd(Math.abs(Math.cos(q * 12 + k)) * 2);
        const cx2 = rnd(px), cy2 = rnd(py); P(G[2], cx2 - w, cy2 - 2, w * 2 + 1, 5); P(G[2], cx2 - w - (w > 1 ? 1 : 0), cy2 - 1, w * 2 + 1 + (w > 1 ? 2 : 0), 3); P(G[4], cx2 - w + 1, cy2 - 1, Math.max(1, w * 2 - 1), 3); P(G[5], cx2 - w + 1, cy2 - 1, 1, 2); if (w > 1) P(G[6], cx2 - w + 1, cy2 - 2);
      }
      break;
    }
  }
  ctx.fillStyle = fs;
}

// ───────────── Clima de combate ─────────────
export function drawWeather(ctx, kind, t, cam = 0) {
  if (kind === 'rain') {
    ctx.fillStyle = '#9ab8e0';
    for (let k = 0; k < 70; k++) { const per = 40 + hash(k, 1, 441) * 20, a = ((t + hash(k, 2, 441) * per) % per) / per, x = ((hash(k, 3, 441) * (W + 60) + a * 30 - cam * 0.9) % (W + 60) + W + 60) % (W + 60) - 30, y = a * 190 - 20; ctx.fillRect(rnd(x), rnd(y), 1, 4); ctx.fillRect(rnd(x) + 1, rnd(y) + 4, 1, 2); if (a > 0.9) { ctx.fillStyle = '#c8dcf4'; ctx.fillRect(rnd(x) - 1, 150 + (k % 8), 3, 1); ctx.fillStyle = '#9ab8e0'; } }
  } else if (kind === 'snow') snowfall(ctx, t, 60, cam);
  else if (kind === 'leaves') leaves(ctx, t, cam, 10);
  else if (kind === 'fireflies') fireflies(ctx, t, 60, 140, 18, cam);
}
