// Suelo y decorado del mapa.
//  · El suelo se pinta píxel a píxel (ImageData): cada terreno tiene su textura procedural, los bordes entre
//    terrenos blandos se deforman con ruido (orillas, caminos y prados orgánicos, no cuadrados), los duros
//    (adoquín, losas, madera, muros) mantienen el canto recto con bordillo, y la estación tiñe la vegetación.
//  · Sombras proyectadas hacia el sureste (luz del noroeste) de árboles, rocas y edificios.
//  · «Props» (árboles, rocas, vallas, faroles, fuentes…) como sprites cacheados con contorno selectivo. Lo que
//    sobresale por encima de su casilla se copia a una capa superior que se pinta sobre las entidades.
//  · Agua, hierba alta, trigo, juncos y cañas se animan cada fotograma con teselas cacheadas.
import { PAL, ramp, shift, mix, INK, rgb, outlineSel } from './pal.js';
import { hash, bayer, ellipse } from './px.js';

export const TS = 16;
export const TILE = {
  '.': { name: 'hierba' }, ',': { name: 'suelo de bosque' }, '"': { name: 'hierba alta', tall: true }, '*': { name: 'flores' },
  ':': { name: 'camino' }, '=': { name: 'empedrado' }, '+': { name: 'losas' }, 's': { name: 'arena' },
  '~': { name: 'agua somera', water: true, swim: true }, 'w': { name: 'agua', water: true, solid: true }, 'W': { name: 'mar', water: true, solid: true }, 'p': { name: 'posidonia', water: true, solid: true },
  'T': { name: 'encina', solid: true, tree: true }, 'P': { name: 'pino', solid: true, tree: true }, 'Q': { name: 'haya', solid: true, tree: true },
  'B': { name: 'matorral', solid: true }, 'R': { name: 'roca', solid: true }, 'M': { name: 'risco', solid: true }, 'n': { name: 'nieve' },
  'H': { name: 'muralla', solid: true }, 'a': { name: 'tierra labrada', farm: true }, 'A': { name: 'trigal' }, 'V': { name: 'viña', solid: true },
  'O': { name: 'olivo', solid: true, tree: true }, 'k': { name: 'muelle' }, 'q': { name: 'puente' }, 'F': { name: 'valla', solid: true },
  'L': { name: 'farol', solid: true, light: true }, 'f': { name: 'fuente', solid: true, water: true }, 'm': { name: 'juncal' },
  'x': { name: 'ruinas', solid: true }, 'Y': { name: 'menhir', solid: true }, 'c': { name: 'cueva' }, 'r': { name: 'grava' },
  'i': { name: 'tarima' }, 'I': { name: 'baldosa' }, 'j': { name: 'pared', solid: true }, 'v': { name: 'alfombra' }, 'e': { name: 'salida' },
  'l': { name: 'lodo' }, 'u': { name: 'hierba seca' }, 'C': { name: 'cañaveral', solid: true }, 'Z': { name: 'almena', solid: true },
  '#': { name: 'vacío', solid: true }, 'K': { name: 'roca nevada', solid: true },
};
// Compatibilidad con código antiguo
export const tileCtx = { biome: 'pradera', tree: null };
export function drawTile() {}

// ───────────── Colores en Uint32 (ABGR, little endian) ─────────────
const U = (c) => { const [r, g, b] = rgb(c); return (255 << 24) | (b << 16) | (g << 8) | r; };
const UR = (arr) => arr.map(U);
const darkU = (u, f = 0.72) => { const r = u & 255, g = (u >> 8) & 255, b = (u >> 16) & 255; return (255 << 24) | (Math.min(255, b * f + 14) << 16) | ((g * f + 2) << 8) | (r * f * 0.94); };

// ───────────── Terrenos ─────────────
const G = { void: 0, sea: 1, water: 2, shallow: 3, sand: 4, mud: 5, gravel: 6, dirt: 7, tilled: 8, dry: 9, grass: 10, wetgrass: 11, forest: 12, snow: 13,
  cobble: 20, slabs: 21, pier: 22, bridge: 23, cliff: 24, wall: 25, merlon: 26, wood: 27, tiles: 28, iwall: 29, carpet: 30, mat: 31 };
const INHERIT = 255;
const HARD = (g) => g >= 20 || g === 0;
const WATERY = (g) => g >= 1 && g <= 3;
const PRIO = [0, 1, 2, 3, 4, 5, 5, 6, 6, 7, 8, 8, 8, 9];
function groundOf(c, biome) {
  switch (c) {
    case '.': case '"': case '*': return biome === 'bosque' ? G.forest : G.grass;
    case 'T': case 'Q': case 'P': case 'O': case 'B': case 'R': case 'F': case 'Y': case 'x': case 'K': return INHERIT;
    case ',': return G.forest;
    case 'm': case 'C': return G.wetgrass;
    case 'u': case 'V': return G.dry;
    case ':': return G.dirt; case 'l': return G.mud; case 'r': return G.gravel; case 'a': case 'A': return G.tilled;
    case 's': return G.sand; case '~': return G.shallow; case 'w': return G.water; case 'W': case 'p': return G.sea;
    case '=': return G.cobble; case '+': case 'f': return G.slabs; case 'L': return biome === 'urbano' ? G.cobble : G.dirt;
    case 'k': return G.pier; case 'q': return G.bridge; case 'n': case 'K': return G.snow;
    case 'M': case 'c': return G.cliff; case 'H': return G.wall; case 'Z': return G.merlon;
    case 'i': return G.wood; case 'I': return G.tiles; case 'j': return G.iwall; case 'v': return G.carpet; case 'e': return G.mat;
    default: return G.void;
  }
}

// Rampas por estación (0 primavera, 1 verano, 2 otoño, 3 invierno)
function seasonal(base, s) {
  if (s === 1) return base.map((c, i) => mix(c, PAL.dry[Math.min(PAL.dry.length - 1, i)], 0.22));
  if (s === 2) return base.map((c, i) => mix(c, ['#3a2a24', '#5a3e2a', '#7a5a34', '#9a7a40', '#b8984e', '#d0b468', '#e2cc88', '#ecdca0', '#f4e8b8'][Math.min(8, i)], 0.3));
  if (s === 3) return base.map((c) => mix(c, '#7a8a8e', 0.28));
  return base;
}
const PALS = new Map();
function pals(season) {
  let p = PALS.get(season); if (p) return p;
  const gr = seasonal(PAL.grass, season), fo = seasonal(PAL.forest, season), dr = seasonal(PAL.dry, season);
  p = {
    grass: UR(gr), forest: UR(fo), dry: UR(dr), wet: UR(seasonal(['#0f2a2c', '#163c34', '#1f5038', '#2c663e', '#3c8044', '#56984c', '#78b25a'], season)),
    dirt: UR(PAL.dirt), sand: UR(PAL.sand), mud: UR(PAL.mud), gravel: UR(['#3a3034', '#54484a', '#6e605c', '#8a7a70', '#a89686', '#c4b2a0', '#ddd0bc']),
    water: UR(PAL.water), sea: UR(PAL.sea), snow: UR(PAL.snow), cobble: UR(PAL.cobble), slabs: UR(PAL.wstone), wood: UR(PAL.wood), stone: UR(PAL.stone),
    wstone: UR(PAL.wstone), plaster: UR(PAL.plaster), red: UR(PAL.red), gold: UR(PAL.gold), void: U('#0e0a12'),
    flowers: [U('#f4f0e6'), U('#fcd456'), U('#e8607a'), U('#9a7ae0'), U('#f08a3a')], leafLitter: [U('#8a5a2a'), U('#b8782e'), U('#6a4a2a'), U('#a8682a')],
    raw: { gr, fo, dr },
  };
  PALS.set(season, p); return p;
}

// Ruido rápido (retícula con suavizado) para la deformación de bordes y las variaciones de tono
function noise(x, y, sc, s) {
  const fx = x / sc, fy = y / sc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
const pickU = (R, i, X, Y) => { const k = Math.floor(i + (bayer(X, Y) - 0.5) * 0.5); return R[Math.max(0, Math.min(R.length - 1, k))]; };

// Texturas: color de un píxel (X,Y en coordenadas de mapa) para el terreno g
function tex(g, X, Y, P, ctx) {
  switch (g) {
    case G.grass: case G.wetgrass: case G.dry: case G.forest: {
      const R = g === G.grass ? P.grass : g === G.forest ? P.forest : g === G.dry ? P.dry : P.wet;
      const base = g === G.forest ? 3.1 : 3.7;
      const v = noise(X, Y, 26, 11) * 0.7 + noise(X, Y, 9, 12) * 0.3;
      let i = base + (v - 0.5) * 2.0;
      // matas en V con punta clara
      const cx = X >> 3, cy = Y >> 3, h = hash(cx, cy, g + 7);
      if (h < (g === G.forest ? 0.4 : 0.6)) {
        const ax = (cx << 3) + 1 + Math.floor(h * 97) % 6, ay = (cy << 3) + 3 + Math.floor(h * 991) % 4; const dx = X - ax, dy = Y - ay;
        if ((dy === 0 && dx === 0) || (dy === -1 && (dx === -1 || dx === 1))) return R[Math.max(0, Math.floor(base) - 2)];
        if (dy === -2 && (dx === -1 || dx === 1)) return R[Math.min(R.length - 1, Math.floor(base) + 2)];
      }
      if (g === G.forest) { // hojarasca
        const lh = hash(X >> 2, Y >> 2, 31); if (lh < 0.07 && ((X + Y) & 1)) return P.leafLitter[Math.floor(lh * 1000) % 4];
        if (ctx.season === 2 && lh > 0.9 && (X & 1)) return P.leafLitter[1];
      }
      if (g === G.grass && ctx.season < 2) { const fh = hash(X >> 2, Y >> 2, 17); if (fh < 0.012 && (X & 3) === 1 && (Y & 3) === 1) return P.flowers[Math.floor(fh * 4000) % 5]; }
      return pickU(R, i, X, Y);
    }
    case G.dirt: case G.gravel: case G.mud: {
      const R = g === G.dirt ? P.dirt : g === G.gravel ? P.gravel : P.mud;
      const v = noise(X, Y, 30, 21); let i = (g === G.mud ? 2.6 : 4.2) + (v - 0.5) * 1.1;
      const cell = g === G.gravel ? 4 : 7; const h = hash(Math.floor(X / cell), Math.floor(Y / cell), g * 3);
      if (h < (g === G.gravel ? 0.45 : 0.2)) { const ax = Math.floor(X / cell) * cell + Math.floor(h * 31) % (cell - 1), ay = Math.floor(Y / cell) * cell + Math.floor(h * 313) % (cell - 1);
        if (X === ax && Y === ay) return R[Math.min(R.length - 1, Math.floor(i) + 2)]; if ((X === ax + 1 && Y === ay) || (X === ax && Y === ay + 1)) return R[Math.max(0, Math.floor(i) - 1)];
        if (X === ax + 1 && Y === ay + 1) return R[Math.max(0, Math.floor(i) - 2)]; }
      if (g === G.mud && hash(X >> 1, Y, 77) < 0.04) return R[5];
      return pickU(R, i, X, Y);
    }
    case G.tilled: {
      const R = P.dirt; const w = Math.round(noise(X, Y, 14, 41) * 2); const r = (Y + w) & 3;
      return R[[5, 4, 3, 1][r]] ?? R[3];
    }
    case G.sand: {
      const R = P.sand; const v = noise(X, Y, 30, 51); let i = 3.9 + (v - 0.5) * 1.1;
      const rip = (Y + Math.sin(X / 6 + Y / 40) * 2.2 + v * 4) % 7; if (rip < 0.9) i -= 1.1;
      const h = hash(X, Y, 53); if (h < 0.012) return R[2]; if (h > 0.992) return R[6];
      return pickU(R, i, X, Y);
    }
    case G.snow: { const R = P.snow; const v = noise(X, Y, 22, 61); const h = hash(X, Y, 63); if (h < 0.008) return R[5]; return pickU(R, 3.4 + (v - 0.5) * 1.8, X, Y); }
    case G.shallow: { const R = P.water; const v = noise(X, Y, 16, 71); return pickU(R, 5.2 + (v - 0.5) * 1.2, X, Y); }
    case G.water: { const R = P.water; const v = noise(X, Y, 24, 73); return pickU(R, 3.9 + (v - 0.5) * 1.4, X, Y); }
    case G.sea: { const R = P.sea; const v = noise(X, Y, 30, 75); const sg = ctx.code === 'p' && noise(X, Y, 5, 76) > 0.55 ? -1.4 : 0; return pickU(R, 3.6 + (v - 0.5) * 1.6 + sg, X, Y); }
    case G.cobble: {
      const R = P.cobble; const row = Math.floor(Y / 5), yi = Y % 5; const off = (row * 3) % 7; const col = Math.floor((X + off) / 7), xi = (X + off) % 7;
      if (yi === 4 || xi === 6) return R[1];
      if ((yi === 0 || yi === 3) && (xi === 0 || xi === 5)) return R[2];
      const h = hash(col, row, 81); const b = 4 + Math.floor(h * 2.6) - (h > 0.92 ? 2 : 0);
      if (yi === 0 || xi === 0) return R[Math.min(7, b + 1)]; if (yi === 3 || xi === 5) return R[b - 1];
      return R[b];
    }
    case G.slabs: {
      const R = P.slabs; const row = Math.floor(Y / 8), yi = Y & 7; const off = row & 1 ? 4 : 0; const col = Math.floor((X + off) / 8), xi = (X + off) & 7;
      if (yi === 7 || xi === 7) return R[2];
      const h = hash(col, row, 91); const b = 5 + (h > 0.55 ? 1 : 0) - (h < 0.12 ? 1 : 0);
      if (yi === 0) return R[Math.min(7, b + 1)]; if (yi === 6 || xi === 6) return R[b - 1];
      if (h > 0.8 && xi === Math.floor(h * 50) % 6 && yi > 1 && yi < 5) return R[b - 1]; // grieta
      return R[b];
    }
    case G.pier: case G.bridge: case G.wood: {
      const R = P.wood; const yi = Y % 6; const row = Math.floor(Y / 6);
      if (yi === 5) return g === G.pier ? P.sea[1] : R[2];
      const xs = (X + row * 13) % 40; if (xs === 0) return R[2];
      const plank = Math.floor((X + row * 13) / 40); const h = hash(plank, row, 101); const b = (g === G.wood ? 4 : 3) + (h > 0.66 ? 1 : h < 0.2 ? -1 : 0);
      if (yi === 0) return R[Math.min(6, b + 1)];
      if (yi === 2 && hash(X >> 2, row, 103) < 0.25) return R[b - 1]; // veta
      if ((xs === 3 || xs === 36) && (yi === 1 || yi === 3)) return R[1]; // clavos
      return R[b];
    }
    case G.tiles: { const R = P.stone; const xi = X & 7, yi = Y & 7; if (xi === 7 || yi === 7) return R[2]; const ch = ((X >> 3) + (Y >> 3)) & 1; return yi === 0 || xi === 0 ? R[ch ? 6 : 5] : R[ch ? 5 : 4]; }
    case G.carpet: { const R = P.red; const d = (Math.abs(((X + 4) & 7) - 4) + Math.abs(((Y + 4) & 7) - 4)); return d === 3 ? P.gold[4] : d < 2 ? R[3] : R[4]; }
    case G.mat: { const R = P.wood; return ((Y >> 1) & 1) ? R[3] : R[4]; }
    case G.cliff: {
      const R = P.wstone; const st = Math.floor((Y + noise(X, 0, 12, 111) * 6) / 5); const v = noise(X, Y, 10, 113);
      const crack = hash(X >> 2, st, 115) < 0.08 && (X & 3) === 1; if (crack) return R[1];
      return pickU(R, 3.1 + (v - 0.5) * 1.8 + ((Y + Math.round(v * 6)) % 5 === 0 ? -1.2 : 0), X, Y);
    }
    case G.wall: case G.merlon: {
      const R = P.wstone; const row = Math.floor(Y / 6), yi = Y % 6; const off = row & 1 ? 6 : 0; const xi = (X + off) % 12; const col = Math.floor((X + off) / 12);
      if (yi === 5 || xi === 11) return R[2];
      const h = hash(col, row, 121); const b = 4 + (h > 0.6 ? 1 : 0) - (h < 0.15 ? 1 : 0);
      if (yi === 0) return R[b + 1]; if (yi === 4) return R[b - 1]; return R[b];
    }
    case G.iwall: return P.plaster[4];
    default: return P.void;
  }
}

// ───────────── Suelo de un mapa ─────────────
export function renderGround(m, season = 0) {
  const W = m.w * TS, H = m.h * TS; const P = pals(season);
  const tg = new Uint8Array(m.w * m.h);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) tg[y * m.w + x] = groundOf(m.get(x, y), m.biome);
  // las casillas de decorado (árboles, rocas, vallas…) toman el suelo que las rodea
  const def = m.biome === 'bosque' ? G.forest : m.biome === 'montana' ? G.grass : m.biome === 'costa' ? G.grass : G.grass;
  for (let pass = 0; pass < 3; pass++) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (tg[y * m.w + x] !== INHERIT) continue; const cnt = {}; let best = -1, bn = 0;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; const g = tg[yy * m.w + xx]; if (g === INHERIT || HARD(g) || g <= 3) continue; cnt[g] = (cnt[g] || 0) + 1; if (cnt[g] > bn) { bn = cnt[g]; best = g; } }
    if (best >= 0) tg[y * m.w + x] = best; else if (pass === 2) tg[y * m.w + x] = def;
  }
  const at = (tx, ty) => (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h ? tg[Math.max(0, Math.min(m.h - 1, ty)) * m.w + Math.max(0, Math.min(m.w - 1, tx))] : tg[ty * m.w + tx]);
  const gnd = new Uint8Array(W * H);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const tx = X >> 4, ty = Y >> 4, own = tg[ty * m.w + tx];
    if (HARD(own)) { gnd[Y * W + X] = own; continue; }
    // ¿todo el vecindario es igual? atajo
    const lx = X & 15, ly = Y & 15;
    if (lx > 4 && lx < 11 && ly > 4 && ly < 11) { gnd[Y * W + X] = own; continue; }
    const wx = X + (noise(X, Y, 7, 3) - 0.5) * 8.5, wy = Y + (noise(X, Y, 7, 5) - 0.5) * 8.5;
    const g2 = at(Math.floor(wx / TS), Math.floor(wy / TS));
    gnd[Y * W + X] = HARD(g2) ? own : g2;
  }
  const img = new ImageData(W, H); const px = new Uint32Array(img.data.buffer);
  const ctx = { season, code: '.' };
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X; const g = gnd[i]; ctx.code = m.t[(Y >> 4) * m.w + (X >> 4)];
    let c = tex(g, X, Y, P, ctx);
    // Sombreado de bordes: el terreno más alto proyecta un píxel de sombra sobre el de abajo
    const up = Y > 0 ? gnd[i - W] : g;
    if (up !== g) {
      const hi = !HARD(up) && !HARD(g) ? PRIO[up] > PRIO[g] : HARD(up) && !HARD(g);
      if (hi || (WATERY(g) && !WATERY(up))) c = darkU(c, WATERY(g) ? 0.62 : 0.74);
    }
    const dn = Y < H - 1 ? gnd[i + W] : g;
    if (dn !== g && !HARD(g) && !HARD(dn) && PRIO[g] > PRIO[dn] && !WATERY(g)) c = darkU(c, 0.84);
    if (g === G.sand && (WATERY(dn) || (X < W - 1 && WATERY(gnd[i + 1])) || (X > 0 && WATERY(gnd[i - 1])))) c = P.sand[2];
    // bordillos de las superficies duras
    if (HARD(g) && g !== G.void) {
      if ((X > 0 && !HARD(gnd[i - 1])) || (X < W - 1 && !HARD(gnd[i + 1])) || (Y < H - 1 && !HARD(gnd[i + W]))) c = darkU(c, 0.78);
    } else if (!HARD(g) && Y > 0 && HARD(up) && up !== G.void) c = darkU(c, 0.6);
    px[i] = c;
  }
  // Muros, almenas, riscos e interiores: volumen por filas
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    const g = tg[ty * m.w + tx]; if (g !== G.wall && g !== G.merlon && g !== G.cliff && g !== G.iwall) continue;
    const above = at(tx, ty - 1), below = at(tx, ty + 1);
    const X0 = tx * TS, Y0 = ty * TS;
    if (g === G.iwall) { paintIWall(px, W, X0, Y0, above === G.iwall, below, P); continue; }
    if (g === G.merlon) { for (let y = 0; y < 6; y++) for (let x = 0; x < 16; x++) { const gap = ((X0 + x) % 8) >= 5; px[(Y0 + y) * W + X0 + x] = gap ? (y < 5 ? P.wstone[1] : P.wstone[2]) : y === 0 ? P.wstone[6] : px[(Y0 + y) * W + X0 + x]; } }
    if (above !== g && above !== G.merlon && g !== G.merlon) for (let x = 0; x < 16; x++) { px[Y0 * W + X0 + x] = (g === G.cliff ? P.wstone : P.wstone)[6]; px[(Y0 + 1) * W + X0 + x] = P.wstone[5]; if (g === G.cliff && hash(X0 + x, Y0, 9) < 0.5) px[Y0 * W + X0 + x] = P.grass[5]; }
    if (below !== g && below !== G.wall && below !== G.cliff) for (let x = 0; x < 16; x++) { px[(Y0 + 15) * W + X0 + x] = P.wstone[0]; px[(Y0 + 14) * W + X0 + x] = darkU(px[(Y0 + 14) * W + X0 + x], 0.7); }
  }
  m._gnd = gnd; m._W = W;
  return { img, px, gnd, W, H, tg };
}
function paintIWall(px, W, X0, Y0, lower, below, P) {
  const pl = P.plaster, wd = P.wood;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const X = X0 + x, Y = Y0 + y; let c;
    if (!lower) { // fila superior: viga y yeso
      c = y < 3 ? (y === 0 ? wd[1] : y === 1 ? wd[3] : wd[2]) : ((hash(X, Y, 131) < 0.04) ? pl[3] : pl[4]);
      if (y >= 3 && ((X >> 4) % 3 === 1) && x > 3 && x < 12 && y > 5 && y < 15) c = y === 6 || x === 4 || x === 11 ? wd[2] : y === 14 ? wd[1] : mix2(P, X, Y); // cuadro / ventana alta
    } else { // fila inferior: yeso, friso de madera y rodapié
      c = y < 6 ? pl[4] : y === 6 ? wd[5] : y < 14 ? ((x & 7) === 0 ? wd[2] : wd[3 + ((y & 3) === 0 ? 1 : 0)]) : y === 14 ? wd[1] : wd[0];
    }
    px[Y * W + X] = c;
  }
}
function mix2(P, X, Y) { return ((X + Y) & 3) === 0 ? P.gold[3] : P.red[3]; }

// ───────────── Sombras proyectadas (sobre el búfer del suelo) ─────────────
function shadePx(px, W, H, X, Y, f) { if (X < 0 || Y < 0 || X >= W || Y >= H) return; px[Y * W + X] = darkU(px[Y * W + X], f); }
function shadowEllipse(px, W, H, cx, cy, rx, ry, dens = 0.75, f = 0.7) {
  for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); for (let x = -w; x <= w; x++) { const edge = Math.abs(x) > w - 2 || Math.abs(y) > ry - 1; if (!edge || bayer(cx + x, cy + y) < dens) shadePx(px, W, H, cx + x, cy + y, f); } }
}
export function castShadows(m, px, W, H) {
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    const c = m.get(tx, ty); const X = tx * TS, Y = ty * TS;
    if (c === 'T' || c === 'Q' || c === 'O') shadowEllipse(px, W, H, X + 11, Y + 14, 11, 5, 0.6, 0.72);
    else if (c === 'P') shadowEllipse(px, W, H, X + 11, Y + 14, 9, 4, 0.6, 0.72);
    else if (c === 'R' || c === 'K' || c === 'B' || c === 'Y' || c === 'x') shadowEllipse(px, W, H, X + 10, Y + 14, 8, 3, 0.55, 0.75);
    else if (c === 'L') shadowEllipse(px, W, H, X + 10, Y + 15, 5, 2, 0.5, 0.75);
  }
  for (const b of m.buildings) {
    if (b.kind === 'barca' || b.kind === 'altar') continue;
    const X0 = b.x * TS, Y0 = b.y * TS, X1 = X0 + b.w * TS, Y1 = Y0 + b.h * TS;
    for (let y = Y0 + 10; y < Y1 + 4; y++) for (let x = X1; x < X1 + 6; x++) { const k = (x - X1) / 6; if (bayer(x, y) > k * 0.9) shadePx(px, W, H, x, y, 0.7); }
    for (let x = X0 + 4; x < X1 + 4; x++) for (let y = Y1; y < Y1 + 3; y++) { const k = (y - Y1) / 3; if (bayer(x, y) > k * 0.85) shadePx(px, W, H, x, y, 0.78); }
  }
}

// ───────────── Sprites de decorado (props) ─────────────
const propCache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const pp = (x) => (c, px_, py_, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(px_, py_, w, h); };

// Copa con volumen: capas de elipses desplazadas hacia la luz y racimos de hojas
function crown(x, cx, cy, rx, ry, R, v, lumps = 4) {
  const P = pp(x);
  const blobs = []; for (let i = 0; i < lumps; i++) { const a = (i / lumps) * Math.PI * 2 + v * 3; blobs.push([cx + Math.cos(a) * rx * 0.45, cy + Math.sin(a) * ry * 0.4, rx * (0.55 + hash(i, 3, v * 99) * 0.2), ry * (0.55 + hash(i, 5, v * 99) * 0.2)]); }
  blobs.push([cx, cy, rx * 0.8, ry * 0.8]);
  for (const [bx, by, brx, bry] of blobs) ellipse(x, bx, by, Math.round(brx), Math.round(bry), R[2]);
  for (const [bx, by, brx, bry] of blobs) ellipse(x, bx - 1, by - 1, Math.round(brx - 1), Math.round(bry - 1), R[3]);
  for (const [bx, by, brx, bry] of blobs) ellipse(x, bx - 2, by - 2, Math.max(1, Math.round(brx * 0.62)), Math.max(1, Math.round(bry * 0.6)), R[4]);
  ellipse(x, cx - rx * 0.35, cy - ry * 0.4, Math.max(1, Math.round(rx * 0.3)), Math.max(1, Math.round(ry * 0.25)), R[5]);
  // racimos de hojas: textura
  const d = x.getImageData(0, 0, x.canvas.width, x.canvas.height); const a = d.data;
  const isIn = (i, j) => i >= 0 && j >= 0 && i < x.canvas.width && j < x.canvas.height && a[(j * x.canvas.width + i) * 4 + 3] > 0;
  for (let n = 0; n < rx * ry * 0.5; n++) {
    const i = Math.floor(cx - rx + hash(n, 1, v * 77) * rx * 2), j = Math.floor(cy - ry + hash(n, 2, v * 77) * ry * 2);
    if (!isIn(i, j) || !isIn(i + 2, j + 1)) continue;
    const lit = (i - cx) / rx + (j - cy) / ry < -0.2;
    P(lit ? R[5] : R[2], i, j, 2, 1); P(lit ? R[4] : R[1], i, j + 1, 1, 1);
  }
}
function trunk(P, x0, y0, h, W) { P(W[3], x0, y0, 3, h); P(W[4], x0, y0, 1, h - 1); P(W[1], x0 + 2, y0 + 1, 1, h - 1); P(W[2], x0 - 1, y0 + h - 1, 5, 1); }

export function propSprite(code, v, season, biome, mask = 0, fr = 0) {
  const key = code + '|' + v + '|' + season + '|' + biome + '|' + mask + '|' + fr;
  let s = propCache.get(key); if (s) return s;
  s = paintProp(code, v, season, biome, mask, fr); if (s) propCache.set(key, s);
  return s;
}
function paintProp(code, v, season, biome, mask, fr) {
  const Wd = PAL.wood;
  switch (code) {
    case 'T': case 'Q': case 'O': {
      const [c, x] = mk(32, 34); const P = pp(x);
      if (code === 'Q' && season === 3) { // haya desnuda en invierno
        trunk(P, 14, 18, 14, Wd); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.45; let px_ = 15, py_ = 19; for (let k = 0; k < 9; k++) { px_ += Math.cos(a) * 1.2; py_ += Math.sin(a) * 1.2; P(Wd[k < 4 ? 2 : 3], Math.round(px_), Math.round(py_)); } }
        outlineSel(c); return { cv: c, ax: -8, ay: -18 };
      }
      let R = code === 'O' ? PAL.olive : code === 'Q' ? ['#122a26', '#1a3e2e', '#245636', '#33703c', '#468c44', '#62a84e', '#88c460', '#acdc7a'] : PAL.leaf;
      if (code === 'Q' && season === 2) R = ['#3a1a14', '#5e2a18', '#8a4020', '#b45a24', '#d47a2c', '#e8a03c', '#f4c460'];
      if (code === 'T' && season === 3) R = R.map((cc) => mix(cc, '#5a6a6a', 0.18));
      const tH = code === 'O' ? 10 : 9;
      if (code === 'O') { P(Wd[2], 14, 22, 4, 10); P(Wd[3], 13, 24, 2, 7); P(Wd[4], 15, 23, 1, 6); P(Wd[1], 17, 25, 1, 7); P(Wd[2], 12, 31, 8, 1); }
      else trunk(P, 14, 32 - tH - 1, tH, Wd);
      const rx = code === 'O' ? 10 : code === 'Q' ? 11 : 12, ry = code === 'O' ? 8 : code === 'Q' ? 11 : 10;
      crown(x, 16, code === 'Q' ? 13 : 14, rx + Math.round(v * 2) - 1, ry, R, v, code === 'O' ? 6 : 4);
      if (code === 'O') for (let i = 0; i < 5; i++) P('#3a4a2a', 10 + Math.floor(hash(i, 1, v * 50) * 12), 9 + Math.floor(hash(i, 2, v * 50) * 9)); // aceitunas
      if (code === 'T' && hash(7, 7, v * 31) > 0.7 && season === 2) for (let i = 0; i < 4; i++) P('#8a5a2a', 9 + Math.floor(hash(i, 3, v) * 14), 12 + Math.floor(hash(i, 4, v) * 8)); // bellotas
      outlineSel(c);
      return { cv: c, ax: -8, ay: -18 };
    }
    case 'P': {
      const umbrella = biome === 'costa' || biome === 'montjuic' || biome === 'pradera' || biome === 'urbano';
      const R = PAL.pine;
      if (umbrella) { // pino piñonero: tronco alto y copa en sombrilla
        const [c, x] = mk(34, 36); const P = pp(x);
        P(Wd[3], 16, 14, 3, 20); P(Wd[4], 16, 15, 1, 18); P(Wd[1], 18, 16, 1, 18); P(Wd[3], 13, 16, 3, 2); P(Wd[3], 19, 15, 3, 2); P(Wd[2], 15, 33, 5, 1);
        for (const [cx, cy, rx, ry] of [[17, 10, 15, 6], [10, 11, 7, 4], [24, 11, 8, 4], [17, 7, 10, 4]]) ellipse(x, cx, cy, rx, ry, R[2]);
        for (const [cx, cy, rx, ry] of [[16, 9, 13, 4], [10, 10, 5, 3], [23, 9, 6, 3]]) ellipse(x, cx, cy, rx, ry, R[3]);
        ellipse(x, 13, 7, 7, 2, R[4]); ellipse(x, 11, 6, 3, 1, R[5]);
        for (let i = 0; i < 26; i++) { const px_ = 4 + Math.floor(hash(i, 1, v * 9) * 26), py_ = 5 + Math.floor(hash(i, 2, v * 9) * 9); P(hash(i, 3, v) > 0.5 ? R[4] : R[1], px_, py_, 2, 1); }
        outlineSel(c); return { cv: c, ax: -9, ay: -20 };
      }
      const [c, x] = mk(24, 38); const P = pp(x); // pino de montaña: cono por pisos
      P(Wd[3], 11, 30, 2, 7); P(Wd[1], 12, 31, 1, 6);
      for (let k = 0; k < 5; k++) { const yy = 4 + k * 6, w = 3 + k * 2; for (let j = 0; j < 7; j++) { const ww = Math.round(w * (j / 6)) + 1; P(R[2], 12 - ww, yy + j, ww * 2, 1); P(R[3], 12 - ww, yy + j, ww, 1); if (j < 3) P(R[4], 12 - ww, yy + j, Math.max(1, ww - 2), 1); } P(R[1], 12 - w - 1, yy + 6, w * 2 + 2, 1); }
      P(R[5], 11, 3, 1, 3); if (season === 3) for (let k = 0; k < 5; k++) P('#eef4fa', 12 - (2 + k * 2), 4 + k * 6, 3 + k, 1);
      outlineSel(c); return { cv: c, ax: -4, ay: -22 };
    }
    case 'B': { const [c, x] = mk(18, 16); const R = PAL.leaf; crown(x, 9, 9, 7, 6, R.map((cc) => mix(cc, '#2a5a3a', 0.1)), v, 3); if (v > 0.5) { const P = pp(x); for (let i = 0; i < 4; i++) P(season === 2 ? '#2a1a3a' : '#c83a4a', 4 + Math.floor(hash(i, 1, v * 7) * 10), 5 + Math.floor(hash(i, 2, v * 7) * 7)); } outlineSel(c); return { cv: c, ax: -1, ay: 0 }; }
    case 'R': case 'K': {
      const [c, x] = mk(18, 16); const P = pp(x); const R = PAL.stone.map((cc) => mix(cc, '#8a7a68', 0.3));
      ellipse(x, 9, 9, 7, 5, R[2]); ellipse(x, 8, 8, 6, 4, R[3]); ellipse(x, 7, 7, 4, 3, R[4]); P(R[5], 5, 5, 3, 1); P(R[2], 11, 9, 2, 1);
      if (code === 'R' && v > 0.4) { P(PAL.grass[5], 3, 10, 3, 1); P(PAL.grass[4], 4, 11, 4, 1); }
      if (code === 'K') { ellipse(x, 8, 5, 5, 2, '#f6faff'); P('#dee8f4', 5, 6, 7, 1); }
      outlineSel(c); return { cv: c, ax: -1, ay: 1 };
    }
    case 'F': { // valla con conexiones (mask: 1 izq, 2 der, 4 arriba, 8 abajo)
      const [c, x] = mk(16, 18); const P = pp(x);
      const rail = (y) => { const x0 = mask & 1 ? 0 : 6, x1 = mask & 2 ? 16 : 10; P(Wd[3], x0, y, x1 - x0, 2); P(Wd[5], x0, y, x1 - x0, 1); };
      if ((mask & 3) || !(mask & 12)) { rail(7); rail(12); }
      if (mask & 12) { P(Wd[3], 7, mask & 4 ? 0 : 6, 2, mask & 8 ? 18 : 10); }
      P(Wd[2], 6, 4, 4, 13); P(Wd[4], 6, 4, 2, 12); P(Wd[5], 6, 3, 4, 1);
      outlineSel(c); return { cv: c, ax: 0, ay: -1 };
    }
    case 'L': { // farola de hierro con farolillo
      const [c, x] = mk(12, 32); const P = pp(x); const I = PAL.iron;
      P(I[2], 4, 22, 4, 9); P(I[1], 3, 29, 6, 2); P(I[3], 5, 8, 2, 22); P(I[4], 5, 8, 1, 20);
      P(I[2], 2, 3, 8, 6); P(I[1], 3, 1, 6, 2); P(I[3], 5, 0, 2, 1);
      P(fr % 2 ? '#ffe89a' : '#ffd870', 3, 4, 6, 4); P('#fff8d8', 4, 4, 2, 2); P(I[1], 6, 4, 1, 4);
      P(I[2], 1, 8, 10, 1);
      outlineSel(c); return { cv: c, ax: 2, ay: -16 };
    }
    case 'f': { // fuente: en la ciudad, de hierro como la de Canaletas; fuera, pila de piedra
      const [c, x] = mk(18, 26); const P = pp(x); const S = PAL.wstone, I = PAL.iron, Wt = PAL.water;
      ellipse(x, 9, 21, 8, 4, S[3]); ellipse(x, 9, 20, 7, 3, Wt[4 + (fr % 2)]); P(Wt[6], 5 + (fr % 3), 19, 2, 1);
      if (biome === 'urbano') { P(I[3], 8, 4, 3, 16); P(I[4], 8, 4, 1, 15); P(I[2], 6, 2, 7, 3); P('#ffe08a', 7, 0, 5, 2); P(I[2], 5, 10, 9, 2); P(Wt[5], 4, 12 + (fr % 2), 1, 6); P(Wt[5], 14, 12 + ((fr + 1) % 2), 1, 6); P(I[1], 7, 18, 5, 2); }
      else { P(S[4], 7, 8, 5, 12); P(S[5], 7, 8, 2, 11); P(Wt[5], 9, 12 + (fr % 2), 1, 6); }
      outlineSel(c); return { cv: c, ax: -1, ay: -10 };
    }
    case 'Y': { const [c, x] = mk(14, 30); const P = pp(x); const R = PAL.stone.map((cc) => mix(cc, '#7a7064', 0.35)); P(R[3], 3, 2, 8, 26); P(R[3], 4, 0, 6, 2); P(R[4], 4, 2, 2, 24); P(R[2], 9, 3, 2, 25); P('#4a8a8a', 6, 8, 1, 1); P('#4a8a8a', 6, 12, 2, 1); P('#4a8a8a', 5, 16, 1, 2); P(PAL.grass[5], 2, 26, 3, 2); outlineSel(c); return { cv: c, ax: 1, ay: -12 }; }
    case 'x': { const [c, x] = mk(16, 20); const P = pp(x); const R = PAL.wstone; P(R[4], 1, 8, 5, 11); P(R[5], 1, 8, 2, 10); P(R[2], 5, 9, 1, 10); P(R[4], 9, 3, 6, 16); P(R[5], 9, 3, 2, 15); P(R[2], 14, 4, 1, 15); P(R[3], 9, 9, 6, 1); P(PAL.grass[5], 10, 12, 2, 3); P(PAL.grass[4], 2, 16, 3, 2); outlineSel(c); return { cv: c, ax: 0, ay: -4 }; }
    case 'c': { const [c, x] = mk(16, 16); const P = pp(x); ellipse(x, 8, 12, 6, 9, '#0c0810'); ellipse(x, 8, 13, 5, 8, '#1a1418'); P(PAL.wstone[5], 2, 4, 2, 12); P(PAL.wstone[1], 12, 4, 2, 12); return { cv: c, ax: 0, ay: 0 }; }
    case 'V': {
      const [c, x] = mk(16, 20); const P = pp(x); const R = season === 2 ? ['#3a2a1a', '#6a4a22', '#8a6a2a', '#a8862e', '#c8a040', '#e0c060'] : PAL.leaf.slice(1);
      P(Wd[2], 3, 6, 2, 14); P(Wd[2], 11, 6, 2, 14); P(Wd[4], 3, 6, 1, 13); P(Wd[3], 0, 8, 16, 1);
      if (season !== 3) { ellipse(x, 8, 10, 7, 5, R[1]); ellipse(x, 7, 9, 6, 4, R[2]); ellipse(x, 6, 8, 4, 2, R[3]); for (let i = 0; i < 6; i++) P(R[4], 2 + Math.floor(hash(i, 1, v) * 12), 6 + Math.floor(hash(i, 2, v) * 7)); }
      if (season === 1 || season === 2) { for (const [gx, gy] of [[4, 12], [10, 11]]) { P('#4a1a4a', gx, gy, 3, 3); P('#6a2a6a', gx, gy, 2, 2); P('#a86aa8', gx, gy, 1, 1); } }
      outlineSel(c); return { cv: c, ax: 0, ay: -4 };
    }
    case '*': { // flores
      const [c, x] = mk(16, 16); const P = pp(x); if (season === 3) return null;
      const cols = [['#f05868', '#ffe060'], ['#f8f4ec', '#f0c040'], ['#9a7ae0', '#f8e880'], ['#f8a0c8', '#ffffff'], ['#f08a3a', '#fff0a0']];
      for (let i = 0; i < 5; i++) { const cc = cols[Math.floor(hash(i, 9, v * 17) * 5)]; const a = 2 + Math.floor(hash(i, 1, v * 13) * 11), b = 3 + Math.floor(hash(i, 2, v * 13) * 10); P(PAL.grass[3], a, b + 1, 1, 2); P(cc[0], a - 1, b, 3, 1); P(cc[0], a, b - 1, 1, 3); P(cc[1], a, b, 1, 1); }
      return { cv: c, ax: 0, ay: 0 };
    }
    // ── Animados (fr = fase de vaivén 0..3)
    case '"': {
      const [c, x] = mk(16, 20); const P = pp(x); const R = pals(season).raw.gr; const sw = [0, 1, 0, -1][fr & 3];
      // cuatro matas en rejilla, cada una con hojas en «ʌ» que se mecen
      for (let k = 0; k < 4; k++) {
        const ox = (k & 1) * 8, oy = (k >> 1) * 8 + 4; const s2 = (k + fr) & 1 ? sw : 0;
        P(R[3], ox + 1, oy + 4, 7, 4); P(R[4], ox + 2, oy + 3, 5, 3);
        for (const [bx, h] of [[1, 5], [3, 7], [5, 6], [7, 4]]) { const tx = ox + bx + (h > 5 ? s2 : 0); P(R[5], tx, oy + 8 - h, 1, h - 1); P(R[7], tx, oy + 8 - h, 1, 1); }
        P(R[6], ox + 3 + s2, oy + 1, 1, 2); P(R[2], ox + 1, oy + 7, 7, 1);
      }
      outlineSel(c, { bottom: 0.0, top: 0.55, side: 0.6, right: 0.7 }); return { cv: c, ax: 0, ay: -4 };
    }
    case 'A': {
      const [c, x] = mk(16, 22); const P = pp(x); const sw = [0, 1, 0, -1][fr & 3];
      const ripe = season === 1, stub = season >= 2; const R = ripe ? PAL.gold : stub ? PAL.dry : PAL.grass.slice(2);
      for (let i = 0; i < 5; i++) { const x0 = 1 + i * 3; const h = stub ? 4 : 14; const s2 = (i + fr) & 1 ? sw : 0;
        P(R[2], x0, 21 - h, 1, h); if (!stub) { P(R[4], x0 + s2, 6 + (i & 1), 2, 5); P(R[5], x0 + s2, 6 + (i & 1), 1, 3); P(R[3], x0 + 1 + s2, 10 + (i & 1), 1, 2); } }
      return { cv: c, ax: 0, ay: -6 };
    }
    case 'm': case 'C': {
      const tall = code === 'C'; const [c, x] = mk(16, tall ? 30 : 22); const P = pp(x); const sw = [0, 1, 0, -1][fr & 3];
      const R = code === 'C' ? ['#3a4a1a', '#55682a', '#6e8434', '#8aa040', '#a8b858', '#c4cc78'] : PAL.green;
      const H0 = tall ? 30 : 22; const n = tall ? 7 : 5;
      for (let i = 0; i < n; i++) { const x0 = 1 + Math.floor(i * (14 / n)); const h = (tall ? 22 : 13) + Math.floor(hash(i, 3, v) * 6); const s2 = (i + fr) & 1 ? sw : 0;
        for (let j = 0; j < h; j++) P(j < h / 3 ? R[2] : R[3], x0 + (j < h * 0.6 ? 0 : s2), H0 - 1 - j, 1, 1);
        if (!tall && i % 2 === 0) { P('#6a4022', x0 + s2, H0 - h - 1, 2, 4); P('#8a5a32', x0 + s2, H0 - h - 1, 1, 2); }
        if (tall) P(R[5], x0 + s2, H0 - h, 1, 2); }
      return { cv: c, ax: 0, ay: tall ? -14 : -6 };
    }
  }
  return null;
}
export const ANIM_PROPS = new Set(['"', 'A', 'm', 'C']);
const STATIC_PROPS = new Set(['T', 'Q', 'O', 'P', 'B', 'R', 'K', 'F', 'L', 'f', 'Y', 'x', 'c', 'V', '*']);

// ───────────── Render completo de un mapa: base, capa superior y listas de animados ─────────────
// drawExtra(ctxBase, ctxOver, row): lo usa game.js para intercalar edificios y muebles por filas.
export function renderMap(m, season = 0, drawExtra = null) {
  const g = renderGround(m, season);
  castShadows(m, g.px, g.W, g.H);
  const [base, bx] = mk(g.W, g.H); bx.putImageData(g.img, 0, 0);
  const [over, ox] = mk(g.W, g.H);
  const anim = [], water = [], lamps = [], fountains = [];
  for (let ty = 0; ty < m.h; ty++) {
    for (let tx = 0; tx < m.w; tx++) {
      const c = m.get(tx, ty); const X = tx * TS, Y = ty * TS; const v = hash(tx, ty, 1);
      if (TILE[c]?.water && c !== 'f') water.push(ty * m.w + tx);
      if (m.block[ty * m.w + tx] && c !== 'L' && c !== 'f') continue; // nada de árboles dentro de un edificio
      if (ANIM_PROPS.has(c)) { anim.push([tx, ty, c, Math.floor(v * 4)]); continue; }
      if (!STATIC_PROPS.has(c)) continue;
      let mask = 0; if (c === 'F') { if (m.get(tx - 1, ty) === 'F') mask |= 1; if (m.get(tx + 1, ty) === 'F') mask |= 2; if (m.get(tx, ty - 1) === 'F') mask |= 4; if (m.get(tx, ty + 1) === 'F') mask |= 8; }
      if (c === 'L') lamps.push([tx, ty]); if (c === 'f') fountains.push([tx, ty]);
      const s = propSprite(c, Math.floor(v * 4) / 4, season, m.biome, mask, 0); if (!s) continue;
      bx.drawImage(s.cv, X + s.ax, Y + s.ay);
      // parte que sobresale por encima: a la capa superior
      const topCut = Y + 8 - (Y + s.ay); if (topCut > 0) ox.drawImage(s.cv, 0, 0, s.cv.width, Math.min(topCut, s.cv.height), X + s.ax, Y + s.ay, s.cv.width, Math.min(topCut, s.cv.height));
    }
    drawExtra?.(bx, ox, ty);
  }
  // Orillas: píxeles de agua junto a tierra (para la espuma animada)
  const foam = new Map();
  for (const ti of water) {
    const tx = ti % m.w, ty = Math.floor(ti / m.w); const list = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = tx * 16 + x, Y = ty * 16 + y; const i = Y * g.W + X; const gg = g.gnd[i]; if (!WATERY(gg)) continue;
      const land = (j) => j >= 0 && j < g.gnd.length && !WATERY(g.gnd[j]) && g.gnd[j] !== G.void;
      if (land(i - g.W) || land(i + g.W) || (x > 0 || tx > 0) && land(i - 1) || land(i + 1)) list.push(X, Y);
    }
    if (list.length) foam.set(ti, list);
  }
  return { base, over, anim, water, foam, lamps, fountains, gnd: g.gnd, W: g.W, H: g.H };
}

// Teselas animadas de agua (reflejos que viajan) y destellos
const waterCache = new Map();
function waterTile(kind, vx, vy, fr) {
  const key = kind + vx + vy + fr; let c = waterCache.get(key); if (c) return c;
  const [cv, x] = mk(16, 16); const P = pp(x); const R = kind === 'sea' ? PAL.sea : PAL.water; const hi = kind === 'shallow' ? PAL.water[7] : kind === 'sea' ? PAL.water[5] : PAL.water[6];
  for (let k = 0; k < 3; k++) {
    const y = ((k * 6 + vy * 16 + Math.floor(fr / 2)) % 32) - vy * 16; if (y < 0 || y > 15) continue;
    const x0 = ((k * 11 + vx * 16 + fr * 2) % 32) - vx * 16; const len = 3 + ((k + fr) % 3);
    for (let i = 0; i < len; i++) { const xx = x0 + i; if (xx >= 0 && xx < 16) P(i === 0 || i === len - 1 ? R[Math.min(R.length - 1, 4)] : hi, xx, y); }
  }
  cv._key = key; waterCache.set(key, cv); return cv;
}
// Dibuja los animados visibles: agua (reflejos, destellos, espuma), hierbas y juncos, fuentes y faroles.
export function drawAnimated(ctx, m, L, cx, cy, frame, season, entsOnGrass = null) {
  const x0 = Math.max(0, Math.floor(cx / 16) - 1), y0 = Math.max(0, Math.floor(cy / 16) - 1), x1 = Math.min(m.w - 1, Math.floor((cx + 240) / 16) + 1), y1 = Math.min(m.h - 1, Math.floor((cy + 160) / 16) + 2);
  const wf = Math.floor(frame / 8) % 16;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = m.t[ty * m.w + tx]; const X = tx * 16 - cx, Y = ty * 16 - cy;
    if (c === 'w' || c === 'W' || c === '~' || c === 'p') {
      ctx.drawImage(waterTile(c === '~' ? 'shallow' : c === 'w' ? 'water' : 'sea', tx & 1, ty & 1, wf), X, Y);
      const h = hash(tx, ty, Math.floor(frame / 24)); if (h < 0.08) { const sx = X + Math.floor(h * 160) % 14, sy = Y + Math.floor(h * 1600) % 14; ctx.fillStyle = '#e8faff'; ctx.fillRect(sx, sy, 1, 1); if ((frame >> 3) & 1) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); } }
      const f = L.foam.get(ty * m.w + tx);
      if (f) { const ph = frame / 18; ctx.fillStyle = '#f2fbff'; for (let i = 0; i < f.length; i += 2) { const fx = f[i], fy = f[i + 1]; const k = hash(fx, fy, 3); if (Math.sin(ph + k * 6.28 + fx * 0.15) > -0.2) ctx.fillRect(fx - cx, fy - cy, 1, 1); } }
    }
  }
  // espuma de segunda línea (respira hacia el agua)
  // hierbas y juncos con viento: la fase viaja por el mapa en diagonal
  for (const [tx, ty, c, v] of L.anim) {
    if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
    const ph = Math.floor((frame + (tx * 7 + ty * 3) * 6) / 14) & 3;
    const s = propSprite(c, v / 4, season, m.biome, 0, ph); if (s) ctx.drawImage(s.cv, tx * 16 - cx + s.ax, ty * 16 - cy + s.ay);
  }
  for (const [tx, ty] of L.fountains) if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) { const s = propSprite('f', 0, season, m.biome, 0, Math.floor(frame / 10) % 3); ctx.drawImage(s.cv, tx * 16 - cx + s.ax, ty * 16 - cy + s.ay); }
}
// Delante de las entidades: hierbas que tapan los pies y cañas altas que tapan lo que hay detrás
export function drawAnimatedFront(ctx, m, L, cx, cy, frame, season, feet) {
  for (const [ex, ey] of feet) {
    const c = m.get(ex, ey); if (!ANIM_PROPS.has(c) || c === 'C') continue;
    const ph = Math.floor((frame + (ex * 7 + ey * 3) * 6) / 14) & 3; const s = propSprite(c, hash(ex, ey, 1) >= 0 ? Math.floor(hash(ex, ey, 1) * 4) / 4 : 0, season, m.biome, 0, ph); if (!s) continue;
    const X = ex * 16 - cx + s.ax, Y = ey * 16 - cy + s.ay; const cut = 16 + (-s.ay) - 7; // filas inferiores de la mata
    ctx.drawImage(s.cv, 0, cut, s.cv.width, s.cv.height - cut, X, Y + cut, s.cv.width, s.cv.height - cut);
  }
  const x0 = Math.max(0, Math.floor(cx / 16) - 1), y0 = Math.max(0, Math.floor(cy / 16) - 1), x1 = Math.min(m.w - 1, Math.floor((cx + 240) / 16) + 1), y1 = Math.min(m.h - 1, Math.floor((cy + 160) / 16) + 2);
  for (const [tx, ty, c, v] of L.anim) {
    if (c !== 'C' || tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
    const ph = Math.floor((frame + (tx * 7 + ty * 3) * 6) / 14) & 3; const s = propSprite(c, v / 4, season, m.biome, 0, ph);
    const X = tx * 16 - cx + s.ax, Y = ty * 16 - cy + s.ay; const cut = 8 - s.ay; ctx.drawImage(s.cv, 0, 0, s.cv.width, cut, X, Y, s.cv.width, cut);
  }
}
