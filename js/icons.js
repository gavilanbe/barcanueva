// Iconos de Barcanueva: objetos (16×16), interfaz (12×12), conjuros (16×16) y bocadillos de emoción (13×13).
// Todo se pinta en código con las rampas de pal.js (luz arriba a la izquierda, sombras frías, contorno
// selectivo) y queda en caché: el primer pintado es barato y después sólo es un drawImage.
import { INK, INK2, WHITE, ramp, mix, outlineSel, rgb } from './pal.js';
import { hash } from './px.js';
import { canvas } from './util.js';

// ───────────── Motor de dibujo ─────────────
const LV = (() => { const v = [-0.5, -0.7, 0.52], n = Math.hypot(...v); return v.map((a) => a / n); })();
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// Tono de rampa para una intensidad de luz (-1..1) entre los índices lo..hi
const tone = (R, it, lo = 1, hi = 5) => R[Math.round(cl(lo + (hi - lo) * cl((it + 0.62) / 1.62), 0, R.length - 1))];
const OL = { top: 0.66, side: 0.74, right: 0.84, bottom: 0.95 }; // algo más marcado que en sprites: son pequeños

function api(x) {
  const fill = (c, a, b, w = 1, h = 1) => { if (!c) return; x.fillStyle = c; x.fillRect(a, b, w, h); };
  const inE = (X, y, cx, cy, rx, ry) => { const a = (X + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry; return a * a + b * b <= 1; };
  const g = {
    x,
    p: (c, a, b) => fill(c, Math.floor(a), Math.floor(b)),
    r: fill,
    pts(c, L) { for (const [a, b] of L) fill(c, Math.floor(a), Math.floor(b)); },
    clr(a, b, w = 1, h = 1) { x.clearRect(a, b, w, h); },
    l(c, x0, y0, x1, y1) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
      while (n++ < 200) { fill(c, x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    },
    e(c, cx, cy, rx, ry, keep) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) if (inE(X, y, cx, cy, rx, ry) && (!keep || keep(X, y))) fill(c, X, y); },
    hole(cx, cy, rx, ry) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) if (inE(X, y, cx, cy, rx, ry)) x.clearRect(X, y, 1, 1); },
    // Anillo elíptico de grosor t (en píxeles)
    ring(c, cx, cy, rx, ry, t = 1, keep) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) if (inE(X, y, cx, cy, rx, ry) && !inE(X, y, cx, cy, rx - t, ry - t) && (!keep || keep(X, y))) fill(c, X, y); },
    // Elipsoide con sombreado de volumen. o: lo, hi, gl (brillo; false sin brillo), glt (umbral),
    // egg (estrecha arriba), eggB (estrecha abajo), R2+split (otra rampa por encima de la fila split), surf (color de la fila split), keep
    ball(R, cx, cy, rx, ry, o = {}) {
      const lo = o.lo ?? 1, hi = o.hi ?? 5;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let X = Math.floor(cx - rx - 1); X <= Math.ceil(cx + rx + 1); X++) {
        const ny = (y + 0.5 - cy) / ry; const k = 1 - (o.egg || 0) * Math.max(0, -ny) - (o.eggB || 0) * Math.max(0, ny);
        const nx = (X + 0.5 - cx) / (rx * k); const d = nx * nx + ny * ny; if (d > 1) continue;
        if (o.keep && !o.keep(X, y)) continue;
        const it = nx * LV[0] + ny * LV[1] + Math.sqrt(1 - d) * LV[2];
        const RR = o.split !== undefined && y < o.split ? o.R2 : R;
        let c = tone(RR, it, lo, hi);
        if (o.surf && y === o.split) c = o.surf;
        if (o.gl !== false && it > (o.glt ?? 0.93)) c = typeof o.gl === 'string' ? o.gl : WHITE;
        fill(c, X, y);
      }
    },
    // Tubo con volumen a lo largo de una polilínea; rad puede ser función del avance u (0..1).
    // o.fn(x, y, u, it) devuelve un color, null (normal) o false (no pintar).
    tube(R, P, rad, o = {}) {
      const lo = o.lo ?? 1, hi = o.hi ?? 5, rf = typeof rad === 'function' ? rad : () => rad;
      const S = []; let tot = 0;
      for (let i = 0; i + 1 < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1]; const len = Math.hypot(bx - ax, by - ay) || 0.0001; S.push([ax, ay, bx - ax, by - ay, len, tot]); tot += len; }
      let x0 = 99, y0 = 99, x1 = -99, y1 = -99; for (const [a, b] of P) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, a); y1 = Math.max(y1, b); }
      const m = o.rmax ?? (typeof rad === 'number' ? rad : 4);
      for (let y = Math.floor(y0 - m - 1); y <= Math.ceil(y1 + m + 1); y++) for (let X = Math.floor(x0 - m - 1); X <= Math.ceil(x1 + m + 1); X++) {
        const px = X + 0.5, py = y + 0.5; let bd = 1e9, bu = 0, vx = 0, vy = 0;
        for (const [ax, ay, dx, dy, len, off] of S) {
          const t = cl(((px - ax) * dx + (py - ay) * dy) / (len * len)); const qx = ax + dx * t, qy = ay + dy * t; const d = Math.hypot(px - qx, py - qy);
          if (d < bd) { bd = d; bu = (off + t * len) / tot; vx = px - qx; vy = py - qy; }
        }
        const r = rf(bu); if (r <= 0 || bd > r) continue;
        if (o.keep && !o.keep(X, y, bu)) continue;
        const nx = vx / r, ny = vy / r; const it = nx * LV[0] + ny * LV[1] + Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * LV[2];
        const c = o.fn ? o.fn(X, y, bu, it) : null; if (c === false) continue;
        fill(c || (o.gl && it > 0.93 ? (o.gl === true ? WHITE : o.gl) : tone(R, it, lo, hi)), X, y);
      }
    },
    // Cilindro vertical (botellas, troncos de pie)
    cyl(R, x0, y0, w, h, o = {}) {
      const lo = o.lo ?? 1, hi = o.hi ?? 5, n = Math.hypot(LV[0], LV[2]);
      for (let i = 0; i < w; i++) { const nx = ((i + 0.5) / w) * 2 - 1; const it = (nx * LV[0] + Math.sqrt(Math.max(0, 1 - nx * nx)) * LV[2]) / n; fill(tone(R, it, lo, hi), x0 + i, y0, 1, h); }
    },
    poly(c, P) {
      let y0 = Infinity, y1 = -Infinity; for (const [, y] of P) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const xs = []; const yc = y + 0.5;
        for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) fill(c, a, y, b - a, 1); }
      }
    },
    // Corazón (curva clásica) con volumen
    heart(R, cx, cy, s, o = {}) {
      for (let y = Math.floor(cy - s * 1.5); y <= Math.ceil(cy + s * 1.5); y++) for (let X = Math.floor(cx - s * 1.4); X <= Math.ceil(cx + s * 1.4); X++) {
        const nx = (X + 0.5 - cx) / s, ny = -(y + 0.5 - cy) / s + 0.15; const a = nx * nx + ny * ny - 1; if (a * a * a - nx * nx * ny * ny * ny > 0) continue;
        const sx = nx / 1.25, sy = -(ny - 0.25) / 1.25; const it = sx * LV[0] + sy * LV[1] + Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy)) * LV[2];
        fill(o.gl !== false && it > 0.9 ? WHITE : tone(R, it, o.lo ?? 1, o.hi ?? 5), X, y);
      }
    },
    star(c, cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) { const P = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / n; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } g.poly(c, P); },
    // Plantilla de caracteres: '.' vacío, '0'-'6' rampa R, 'a'-'g' rampa S, 'A'-'G' rampa T, k INK, K INK2, w blanco
    t(ox, oy, rows, m = {}) {
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i]; if (ch === '.' || ch === ' ') continue; let c = m[ch];
          if (c === undefined) c = ch >= '0' && ch <= '6' ? m.R?.[+ch] : ch >= 'a' && ch <= 'g' ? m.S?.[ch.charCodeAt(0) - 97] : ch >= 'A' && ch <= 'G' ? m.T?.[ch.charCodeAt(0) - 65] : ch === 'k' ? INK : ch === 'K' ? INK2 : ch === 'w' ? WHITE : '#ff00ff';
          fill(c, ox + i, oy + j);
        }
      });
    },
    // Retoca los píxeles ya pintados: fn(x, y, [r,g,b]) → color nuevo o null
    retouch(fn, x0 = 0, y0 = 0, w = x.canvas.width, h = x.canvas.height) {
      const d = x.getImageData(x0, y0, w, h).data;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 4; if (d[k + 3] < 128) continue; const c = fn(x0 + i, y0 + j, [d[k], d[k + 1], d[k + 2]]); if (c) fill(c, x0 + i, y0 + j); }
    },
    isOn(X, y) { return x.getImageData(X, y, 1, 1).data[3] > 128; },
  };
  return g;
}
const rgbHex = ([r, gg, b]) => '#' + [r, gg, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const darker = (c, t = 0.28) => mix(c, INK, t);

function make(w, h, draw, ol = OL) { const [cv, x] = canvas(w, h); draw(api(x)); if (ol) outlineSel(cv, ol); return cv; }

// ───────────── Rampas de los iconos ─────────────
const R = ramp;
const C = {
  // cocina
  crust: R('#c07634'), crumb: R('#e2be7c'), toma: R('#d23a2c'), saus: R('#a85a4a'), chest: R('#7a3c22'), paper: R('#e0c898'),
  almond: R('#d6ac6c'), bottle: R('#2e5a3c'), wax: R('#b42c30'), wood: R('#8a5634'), dwood: R('#5c3826'), lwood: R('#b68c5a'),
  foam: R('#e8e2d2'), terra: R('#b85e36'), caramel: R('#c47c2a'), custard: R('#ecd28e'), egg: R('#d2a274'), meat: R('#c84c4e'),
  fat: R('#ecd0c0'), roast: R('#9c5426'), bone: R('#e2d6ba'), plate: R('#e2ded6'), cheese: R('#ecdcae'), rind: R('#9c8c6a'),
  honey: R('#e09a24'), cloth: R('#d8ccb0'), check: R('#c83c3c'), cork: R('#a8744a'),
  // plantas
  leaf: R('#4a9a3c'), dleaf: R('#2f6e3e'), stem: R('#6a7a38'), wstem: R('#7a6440'), sage: R('#8ea886'), rue: R('#5a9a8a'),
  silver: R('#a8b8a2'), yellow: R('#eec42e'), pink: R('#e27aa8'), purple: R('#7c3c8c'), berry: R('#3a2240'), lav: R('#9ca8e8'),
  lilac: R('#c08ad0'), mist: R('#a4b448'), mberry: R('#e8ead8'), root: R('#b88a5c'), rose: R('#cc2c3a'), acorn: R('#a86a2c'),
  cup: R('#7a5836'), cone: R('#8a5a2e'), pnut: R('#e6d2a2'), rovel: R('#e2762a'), rstem: R('#e8a868'), cep: R('#8c5632'), stalk: R('#e6dcc2'),
  caes: R('#e6522a'), cgold: R('#f0c43a'), dcap: R('#aab47c'), truf: R('#3c2a30'), grape: R('#5c2c6c'), olive: R('#7a8a36'),
  oleaf: R('#8c9c6a'), wheat: R('#d8a83a'), arti: R('#6c8c4c'), artp: R('#9a5c96'), cab: R('#7cb24c'), sack: R('#c4a068'),
  pot: R('#b8683a'), soil: R('#5c3c2a'), henb: R('#e2d48c'), thyme: R('#7c9a6a'),
  // animales
  hide: R('#9a6a42'), fur: R('#d8c49c'), spot: R('#3c2c2c'), feath: R('#a87a4a'), ivory: R('#ece2c2'), antler: R('#c2a274'),
  venom: R('#6cd04a'), glass: R('#a8d0e2'), inkpot: R('#3c2c3c'),
  eel: R('#5c6a3c'), trout: R('#8c8c5a'), barbel: R('#a8884a'), sard: R('#4a78a8'), bream: R('#9ca8b4'), bass: R('#8a9cac'),
  octo: R('#c24c5c'), cray: R('#b04c2c'), sturg: R('#7a8a8e'), urch: R('#4c2c50'), fish: R('#6c8ca8'), gfish: R('#bc8a4a'),
  // materiales
  bark: R('#784a2a'), logw: R('#d8b07a'), iron: R('#7a8496'), silv: R('#b8c4d4'), leath: R('#8c5c36'), wool: R('#e6dec8'),
  hemp: R('#c8a868'), bwax: R('#e8bc3a'), shell: R('#ecb4a2'), salt: R('#e6eaf0'), holy: R('#78b8ea'), cane: R('#bcb25c'),
  gold: R('#e8aa2c'), brass: R('#c89a3e'), steel: R('#98a4b6'),
  // pociones
  red: R('#d0343c'), blue: R('#3a6ad8'), green: R('#4cb848'), mag: R('#e05aa0'), smoke: R('#a882d0'), poison: R('#5a2c6c'),
  glow: R('#d8ec6a'), amber: R('#b8742a'), murk: R('#7c7a3a'), linen: R('#ece6d6'), azahar: R('#eeb070'), jade: R('#4ad0b0'),
  // ropa
  flax: R('#d6c49c'), jub: R('#7c2e3c'), mail: R('#8e96a0'), habit: R('#5c4636'), dress: R('#3e6aa2'), apron: R('#9a6a3e'),
  barr: R('#c42c2c'), hat: R('#6c4a30'), hood: R('#4c5c3c'), coif: R('#ece4d0'),
  capa: R('#6c2a3c'), capav: R('#2f5c3c'), capaz: R('#2f3e7c'), capar: R('#8c1a2c'), ermine: R('#f0ece4'),
  // libros
  bblue: R('#2c4c8c'), bred: R('#8c2430'), bgreen: R('#2c6c3c'), bbrown: R('#7c4c2c'), bpurp: R('#5c3478'), bteal: R('#2c6c74'),
  borange: R('#a85c24'), bblack: R('#2c2430'), brose: R('#a83c5c'), page: R('#ece2c4'),
  // interfaz
  skin: R('#e8b48c'), hair: R('#6a3e24'), sky: R('#5ea8e0'), cloud: R('#e8eef4'), teal: R('#3aa8a0'), coin: R('#f0b030'),
};

// ───────────── Piezas compartidas ─────────────
// Pez de perfil mirando a la izquierda: x0,y0 esquina; len, h. o: belly (índice del vientre), stripe, spots, tail, shine
function fish(g, Rr, x0, y0, len, h, o = {}) {
  const cy = y0 + h / 2, tl = o.tail ?? 0.8;
  const hb = (u) => (u < 0.35 ? Math.max(0.6, Math.sqrt(u / 0.35) * (h / 2)) : u < 0.8 ? (h / 2) * (1 - ((u - 0.35) / 0.45) * 0.66) : (h / 2) * (0.34 + ((u - 0.8) / 0.2) * tl));
  for (let X = Math.floor(x0); X < x0 + len; X++) {
    const u = (X + 0.5 - x0) / len, b = hb(u);
    for (let y = Math.floor(cy - b - 1); y <= Math.ceil(cy + b + 1); y++) {
      const dy = (y + 0.5 - cy) / b; if (Math.abs(dy) > 1) continue;
      if (u > 0.8) { if (u > 0.9 && Math.abs(dy) < (u - 0.9) * 5.5) continue; g.p(Math.abs(dy) > 0.65 ? Rr[1] : Rr[2], X, y); continue; }
      let c = dy < -0.45 ? Rr[2] : dy < 0 ? Rr[3] : dy < 0.45 ? Rr[4] : Rr[o.belly ?? 5];
      if (o.stripe && Math.abs(dy - 0.08) < 0.22 && u > 0.22 && u < 0.78) c = o.stripe;
      g.p(c, X, y);
    }
  }
  const at = (u) => Math.floor(x0 + u * len);
  // lomo brillante
  if (o.shine !== false) for (let u = 0.16; u < 0.6; u += 1 / len) g.p(Rr[6], at(u), Math.floor(cy - hb(u) * 0.3));
  // aleta dorsal y pectoral
  for (let u = 0.38; u < 0.62; u += 1 / len) g.p(Rr[2], at(u), Math.floor(cy - hb(u) - 0.6));
  g.p(Rr[2], at(0.62), Math.floor(cy - hb(0.62) - 0.6) - (h > 6 ? 1 : 0));
  g.p(Rr[2], at(0.42), Math.floor(cy + hb(0.42) * 0.55)); g.p(Rr[2], at(0.62), Math.floor(cy + hb(0.62) * 0.9));
  // branquia, ojo, boca
  for (let dy = -0.45; dy <= 0.45; dy += 0.3) g.p(Rr[2], at(0.27), Math.floor(cy + dy * hb(0.27)));
  g.p(INK2, at(0.12), Math.floor(cy - h * 0.14)); if (h >= 7) g.p(WHITE, at(0.12) - 1, Math.floor(cy - h * 0.14) - 1);
  if (o.spots) for (const [u, dy] of [[0.4, -0.5], [0.52, -0.2], [0.62, -0.6], [0.34, 0.1], [0.7, -0.15]]) g.p(o.spots, at(u), Math.floor(cy + dy * hb(u)));
}

// Libro cerrado en 3/4: lomo a la izquierda, cantos de las hojas abajo y a la derecha, emblema en la tapa
function book(g, Rb, em, ec = C.gold) {
  g.r(C.page[4], 4, 12, 10, 2); g.r(C.page[2], 4, 13, 10, 1); for (let x = 5; x < 14; x += 2) g.p(C.page[5], x, 12);
  g.r(C.page[5], 12, 2, 2, 11); for (let y = 3; y < 12; y += 2) g.p(C.page[3], 13, y);
  g.r(Rb[3], 3, 1, 10, 12); g.r(Rb[4], 3, 1, 10, 1); g.r(Rb[4], 3, 1, 1, 12); g.r(Rb[2], 12, 2, 1, 11); g.r(Rb[2], 4, 12, 9, 1);
  g.r(Rb[2], 1, 2, 2, 12); g.r(Rb[4], 1, 2, 1, 12); g.r(Rb[1], 2, 13, 2, 1);
  g.pts(ec[5], [[1, 4], [2, 4], [1, 11], [2, 11]]); g.pts(ec[3], [[4, 2], [11, 2], [4, 11], [11, 11]]);
  g.t(5, 4, em, { G: ec[5], g: ec[3], d: ec[1], R: C.red[4], r: C.red[2], w: WHITE });
}
const EMB = {
  ship: ['...G..', '..GG..', '.GGGg.', '...G..', 'GGGGGG', '.gggg.'],
  crown: ['G.GG.G', 'G.GG.G', 'GGGGGG', 'GRGGRG', 'GGGGGG', '.gggg.'],
  leaf: ['....GG', '..GGGG', '.GGGgG', '.GGgG.', 'GgG...', 'G.....'],
  paw: ['G.GG.G', 'g.gg.g', '......', '.GGGG.', 'GGGGGG', '.gggg.'],
  moon: ['..GGG.', '.GG...', 'GG..G.', 'GG.GGG', '.GG.G.', '..GGG.'],
  flask: ['..GG..', '..gg..', '.G..G.', 'G....G', 'GGGGGG', '.gggg.'],
  hammer: ['GGGGG.', 'GGGGg.', '..G...', '..G...', '..g...', '..g...'],
  devil: ['R....R', 'RR..RR', '.RRRR.', 'RwwwwR', '.RRRR.', '..rr..'],
  note: ['...GG.', '...G.G', '...G..', '...G..', '.GGG..', '.ggg..'],
};

// Prenda vista de frente: mangas, cuerpo con luz a la izquierda y sombra a la derecha
function garment(g, Rg, o = {}) {
  const sl = o.sleeve ?? 1, bot = o.bot ?? 13.6, fl = o.flare ?? 0.6, ext = sl > 1 ? 2.5 : 0;
  if (sl) { g.poly(Rg[4], [[4.4, 1.8], [0.6, 6.6 + ext], [2.6, 8.2 + ext], [4.8, 6]]); g.poly(Rg[2], [[10.6, 1.8], [14.4, 6.6 + ext], [12.4, 8.2 + ext], [10.2, 6]]); }
  g.poly(Rg[3], [[4, 1.8], [6, 1], [9, 1], [11, 1.8], [11 + fl, bot], [4 - fl, bot]]);
  g.poly(Rg[4], [[4, 1.8], [5.6, 1.4], [5.6, bot], [4 - fl, bot]]);
  g.poly(Rg[2], [[9.6, 1.4], [11, 1.8], [11 + fl, bot], [9.6, bot]]);
  if (sl) { g.r(Rg[1], 0, Math.round(7 + ext), 2, 1); g.r(Rg[1], 13, Math.round(7 + ext), 2, 1); }
  if (o.neck === 'V') g.poly(Rg[1], [[6, 0.9], [9, 0.9], [7.5, 4.2]]); else g.e(Rg[1], 7.5, 1.4, 1.7, 1.1);
  if (o.folds !== false) { g.l(Rg[2], 6, 9, 6, bot - 0.6); g.l(Rg[2], 9, 10, 9, bot - 0.6); }
  if (o.belt) { g.r(o.belt, 4, 8, 7, 1); g.p(o.belt2 || o.belt, 7, 9); }
}

function cape(g, Rc, o = {}) {
  g.poly(Rc[3], [[5.6, 1.4], [10.4, 1.4], [12.8, 4.2], [14.2, 13.6], [1.8, 13.6], [3.2, 4.2]]);
  g.poly(Rc[4], [[5.6, 1.4], [7, 1.4], [3.8, 13.6], [1.8, 13.6], [3.2, 4.2]]);
  g.poly(Rc[2], [[10.6, 3], [12.8, 4.2], [14.2, 13.6], [11.4, 13.6]]);
  for (const x of [5, 7.6, 10.2]) g.l(Rc[1], x, 5, x + (x - 8) * 0.18, 13);
  for (const x of [5.8, 8.4]) g.l(Rc[5], x, 6, x + (x - 8) * 0.18, 12);
  for (let x = 2; x < 15; x += 3) g.clr(x, 13);
  g.r(Rc[1], 6, 2, 4, 1);
  if (o.trim) { g.l(o.trim[4], 3.2, 4.2, 1.8, 13.4); g.l(o.trim[3], 12.8, 4.2, 14.2, 13.4); for (let x = 2; x < 15; x++) if (g.isOn(x, 13)) g.p(o.trim[(x & 1) ? 3 : 5], x, 13); }
  if (o.ermine) { g.ball(C.ermine, 8, 2.6, 4.4, 1.8, { lo: 2, hi: 6, gl: false }); g.pts(INK2, [[5, 2], [8, 3], [11, 2]]); }
  g.ball(C.gold, 8, 2.8, 1.3, 1.2, { lo: 2, hi: 6 });
}

// Botellas: matraz redondo con líquido (split = nivel), cuello y tapón
function flask(g, Rl, o = {}) {
  const cy = o.cy ?? 9.8, rx = o.rx ?? 4.8, ry = o.ry ?? 4.4, lvl = o.lvl ?? 8;
  g.ball(Rl, 8, cy, rx, ry, { R2: C.glass, split: lvl, surf: Rl[5], lo: 1, hi: 5, glt: 0.86, egg: o.egg || 0 });
  g.cyl(C.glass, 7, o.neckY ?? 3, 2, o.neckH ?? 3, { lo: 2, hi: 6 });
  if (o.cork !== false) { g.r(C.cork[3], 6, 1, 4, 2); g.r(C.cork[5], 6, 1, 2, 1); g.p(C.cork[1], 9, 2); }
  g.pts(WHITE, [[5, Math.round(cy)], [5, Math.round(cy) + 1]]);
}

// ───────────── Objetos (16×16) ─────────────
const IT = {};
// Comida
IT.pan = (g) => {
  g.ball(C.crust, 8, 9.6, 6.6, 4.4, { lo: 0, hi: 5, gl: false });
  const cut = (L, c) => { for (const [a, b] of L) { g.p(c, a, b); g.p(C.crust[1], a, b + 1); } };
  cut([[4, 9], [5, 8], [6, 8], [7, 7]], C.crumb[5]); cut([[8, 10], [9, 9], [10, 9], [11, 8]], C.crumb[4]);
  g.pts(C.crumb[6], [[4, 7], [6, 6], [9, 6], [11, 7], [8, 5], [12, 9]]);
};
IT.pa_tomaquet = (g) => {
  g.ball(C.crust, 7.8, 8.6, 6.6, 4.9, { lo: 1, hi: 4, gl: false });
  g.e(C.crumb[4], 7.8, 8.4, 5.3, 3.7); g.e(C.crumb[5], 6.6, 7.4, 3.2, 1.8);
  for (let y = 4; y < 13; y++) for (let x = 2; x < 14; x++) { const a = (x + 0.5 - 7.6) / 4.6, b = (y + 0.5 - 8.4) / 3; if (a * a + b * b < 1 && hash(x, y, 7) < 0.8) g.p(hash(x, y, 9) < 0.35 ? C.toma[4] : C.toma[3], x, y); }
  g.pts(C.toma[5], [[5, 7], [6, 7], [9, 6]]); g.pts(C.toma[1], [[9, 10], [10, 9], [6, 10]]);
  g.pts('#f0dc5a', [[7, 8], [8, 8], [11, 9]]); g.pts(WHITE, [[11, 7], [5, 9], [8, 6]]); g.pts(C.crumb[2], [[3, 9], [12, 10], [4, 11]]);
};
IT.butifarra = (g) => {
  const P = []; for (let i = 0; i <= 20; i++) { const a = Math.PI * (0.9 + (1.2 * i) / 20); P.push([8 + Math.cos(a) * 5.1, 9.6 + Math.sin(a) * 5.4]); }
  g.tube(C.saus, P, 1.9, { lo: 1, hi: 5, gl: true, rmax: 2, fn: (x, y, u, it) => (hash(x, y, 11) < 0.12 && it > -0.2 ? C.fat[4] : null) });
  for (const [x, y] of [P[0], P[20]]) { g.r(C.hemp[5], Math.round(x) - 1, Math.round(y) + 1, 2, 1); g.p(C.hemp[3], Math.round(x), Math.round(y) + 2); }
};
IT.castanas = (g) => {
  for (const [cx, cy, r] of [[4.6, 6, 2.1], [11.4, 6, 2.1], [8, 4.4, 2.3], [6.2, 2.6, 1.9], [10, 2.8, 1.9]]) {
    g.ball(C.chest, cx, cy, r, r * 0.92, { lo: 0, hi: 4, glt: 0.86 }); g.r(C.custard[4], Math.floor(cx) - 1, Math.floor(cy - r * 0.3), 2, 1); g.p(C.custard[6], Math.floor(cx), Math.floor(cy - r * 0.3)); g.r(C.chest[5], Math.floor(cx) - 1, Math.floor(cy + r * 0.6), 2, 1);
  }
  g.poly(C.linen[4], [[1.6, 7], [14.4, 7], [8.6, 15]]); g.poly(C.linen[5], [[1.6, 7], [7.6, 7], [8.2, 14.6]]);
  for (const [y, a, b] of [[9, 5, 11], [11, 6, 10]]) { g.l(C.iron[4], a, y, a + 2, y); g.l(C.iron[4], a + 3, y, b, y); }
  g.l(C.linen[2], 9, 8, 8.6, 13); g.r(C.linen[6], 1, 7, 14, 1);
};
IT.panellets = (g) => {
  const bl = (cx, cy) => { g.ball(C.almond, cx, cy, 3.2, 3, { gl: false, lo: 1, hi: 5 }); for (let i = 0; i < 7; i++) { const a = i * 0.9 + cx; g.p(i % 2 ? C.pnut[6] : C.pnut[4], Math.floor(cx + Math.cos(a) * 1.7), Math.floor(cy + Math.sin(a) * 1.5 - 0.6)); } };
  bl(4.6, 10.4); bl(11.2, 10.4); bl(7.9, 6.6);
  g.ball(C.red, 7.9, 3.4, 1.6, 1.5, { glt: 0.8 });
};
IT.vino = (g) => {
  g.cyl(C.bottle, 4, 7, 8, 7, { lo: 0, hi: 5 }); g.ball(C.bottle, 8, 7, 4, 2.4, { lo: 0, hi: 5, gl: false });
  g.cyl(C.bottle, 7, 2, 2, 5, { lo: 1, hi: 5 }); g.r(C.wax[3], 6, 1, 4, 2); g.r(C.wax[5], 6, 1, 2, 1); g.p(C.wax[2], 9, 3);
  g.r(C.paper[5], 5, 9, 6, 3); g.r(C.paper[3], 5, 11, 6, 1); g.r(C.wax[3], 6, 10, 4, 1);
  g.l(C.bottle[6], 5, 7, 5, 8); g.p(C.bottle[5], 5, 12);
};
IT.cerveza = (g) => {
  g.cyl(C.wood, 3, 5, 8, 9, { lo: 1, hi: 5 });
  for (const y of [7, 11]) { g.r(C.iron[2], 3, y, 8, 1); g.r(C.iron[4], 3, y, 3, 1); }
  g.r(C.wood[2], 11, 7, 2, 1); g.r(C.wood[2], 12, 7, 1, 5); g.r(C.wood[2], 11, 11, 2, 1); g.p(C.wood[4], 12, 8);
  g.ball(C.foam, 7, 4.8, 4.8, 2.2, { lo: 2, hi: 6, gl: false }); g.ball(C.foam, 4.6, 4.2, 2.1, 1.8, { lo: 3, hi: 6, gl: false }); g.ball(C.foam, 9.4, 3.8, 2.2, 1.7, { lo: 3, hi: 6, gl: false });
  g.r(C.foam[4], 3, 6, 1, 2); g.p(C.honey[3], 7, 6);
};
IT.crema = (g) => {
  g.ball(C.terra, 8, 9.8, 6.8, 3.8, { lo: 1, hi: 5, gl: false });
  g.e(C.terra[1], 8, 9, 5.6, 2.8); g.e(C.caramel[3], 8, 9.1, 5.1, 2.4);
  for (let y = 6; y < 12; y++) for (let x = 3; x < 13; x++) { const a = (x + 0.5 - 8) / 5.1, b = (y + 0.5 - 9.1) / 2.4; if (a * a + b * b < 1) { const n = hash(x, y, 3); if (n < 0.22) g.p(C.caramel[1], x, y); else if (n > 0.78) g.p(C.caramel[5], x, y); } }
  g.pts(WHITE, [[5, 8], [6, 8], [10, 8]]); g.pts(C.terra[5], [[3, 9], [2, 10]]);
};
IT.coca = (g) => {
  g.tube(C.crust, [[2.6, 10.2], [13, 6]], 3, { lo: 1, hi: 5 });
  g.pts(C.red[4], [[5, 8], [9, 7], [12, 6]]); g.pts('#58b04a', [[7, 9], [11, 7]]); g.pts('#f0922c', [[4, 10], [10, 9], [8, 7]]);
  g.pts(C.pnut[5], [[6, 8], [8, 8], [12, 7], [3, 10], [10, 6]]); g.pts(WHITE, [[7, 7], [10, 8], [5, 10], [11, 5]]);
};
IT.sardinas_asadas = (g) => {
  fish(g, C.gfish, 1, 2.5, 12, 5, { belly: 5 }); fish(g, C.gfish, 3, 8, 12, 5, { belly: 5 });
  for (const [a, b] of [[4, 2], [7, 2], [10, 3], [6, 8], [9, 8], [12, 9]]) { g.p(C.dwood[1], a, b + 1); g.p(C.dwood[1], a + 1, b + 2); }
  g.pts(C.leaf[4], [[13, 2], [14, 3]]);
};
IT.queso = (g) => {
  g.poly(C.cheese[4], [[1, 13.6], [12, 4], [12, 13.6]]);
  g.poly(C.cheese[5], [[1, 13.6], [12, 4], [12, 6.2], [3.6, 13.6]]);
  g.poly(C.rind[3], [[12, 4], [14.4, 5.2], [14.4, 13.6], [12, 13.6]]); g.l(C.rind[4], 12, 4, 12, 13); g.l(C.rind[2], 14, 6, 14, 13);
  g.l(C.rind[4], 2, 12, 11, 4);
  for (const [x, y, r] of [[8.4, 10.4, 1.1], [10, 7.4, 0.9], [5.4, 12.2, 0.8], [10.2, 12, 0.9]]) { g.e(C.cheese[2], x, y, r, r); g.p(C.cheese[1], Math.floor(x), Math.floor(y)); }
  g.r(C.cheese[2], 1, 13, 11, 1);
};
IT.miel = (g) => {
  g.ball(C.honey, 8, 9.6, 5.3, 4.6, { lo: 1, hi: 5, glt: 0.9 });
  g.ball(C.cloth, 8, 5, 5.5, 1.9, { lo: 2, hi: 6, gl: false });
  g.pts(C.check[3], [[4, 5], [6, 4], [8, 5], [10, 4], [12, 5], [5, 6], [9, 6], [7, 4]]);
  g.r(C.wstem[2], 4, 6, 8, 1); g.pts(C.honey[5], [[4, 7], [4, 8], [4, 9]]); g.p(C.honey[6], 4, 10);
  g.pts(C.honey[1], [[10, 12], [11, 11]]);
};
IT.huevo = (g) => {
  for (let i = 0; i < 7; i++) g.l(C.wheat[i % 2 ? 2 : 4], 1 + i * 2, 13, 3 + i * 2, 11);
  g.ball(C.egg, 8, 7.6, 4.4, 5.6, { egg: 0.08, lo: 1, hi: 5, glt: 0.9 }); g.pts(C.egg[2], [[9, 10], [6, 9], [10, 7]]);
  for (let i = 0; i < 5; i++) g.l(C.wheat[i % 2 ? 4 : 2], 2 + i * 3, 14, 4 + i * 3, 12);
  g.r(C.wheat[1], 2, 14, 12, 1); g.pts(C.wheat[5], [[1, 12], [14, 11]]);
};
const drum = (g, Rm, roast) => {
  const end = [[11.6, 1.6], [13.4, 3.4]];
  g.tube(C.bone, [[9, 6.5], [12.5, 2.5]], 1.2, { lo: 2, hi: 6 }); for (const [x, y] of end) g.ball(C.bone, x, y, 1.4, 1.4, { lo: 2, hi: 6, gl: false });
  g.ball(Rm, 6.6, 9.4, 5.4, 4.6, { lo: 1, hi: 5, glt: 0.9 });
  if (!roast) { g.ring(C.fat[4], 6.6, 9.4, 5.4, 4.6, 1, (x, y) => x < 7 && y < 8); g.l(C.fat[5], 4, 10, 6, 8); g.l(C.fat[4], 7, 12, 9, 10); }
  else { for (const [x, y] of [[4, 8], [7, 7], [5, 11], [8, 10]]) { g.p(C.dwood[1], x, y); g.p(C.dwood[1], x + 1, y + 1); } g.pts(C.foam[5], [[3, 4], [4, 3], [3, 2], [6, 3], [7, 2], [6, 1]]); }
};
IT.carne = (g) => drum(g, C.meat, false);
IT.carne_asada = (g) => drum(g, C.roast, true);
IT.pescado = (g) => fish(g, C.fish, 1, 4, 14, 7, { belly: 5 });
IT.pescado_asado = (g) => {
  g.ball(C.plate, 8, 10.6, 7, 3.2, { lo: 2, hi: 6, gl: false }); g.e(C.plate[4], 8, 10.2, 5.6, 2.2);
  fish(g, C.gfish, 2, 5.6, 12, 5, { belly: 5 });
  for (const [a, b] of [[5, 6], [8, 6], [10, 7]]) { g.p(C.dwood[1], a, b + 1); g.p(C.dwood[1], a + 1, b + 2); }
  g.pts(C.leaf[4], [[7, 5], [8, 4], [9, 5]]); g.ball(C.yellow, 12.4, 11.6, 1.6, 1.2, { gl: false, lo: 2, hi: 6 });
};
// Hierbas
IT.romero = (g) => {
  g.l(C.wstem[2], 4, 14, 11, 2);
  for (let i = 1; i < 12; i++) { const t = i / 12, x = 4 + 7 * t, y = 14 - 12 * t, s = i % 2 ? 1 : -1; g.l(C.dleaf[i % 3 ? 3 : 4], x + 0.6 * s, y, x + 2.6 * s, y - 1.6); g.p(C.dleaf[5], Math.round(x + 2.4 * s), Math.round(y - 1.6)); }
  g.pts(C.lav[4], [[12, 2], [10, 1], [13, 4], [9, 3]]); g.pts(C.lav[6], [[12, 1], [9, 2]]);
};
IT.tomillo = (g) => {
  const tips = [[3, 4], [5.6, 2], [9, 1.6], [12, 3.6], [7.6, 5]];
  for (const [x1, y1] of tips) { g.l(C.wstem[3], 7.6, 14, x1, y1 + 1); for (let k = 1; k < 5; k++) { const t = k / 5; const x = 7.6 + (x1 - 7.6) * t, y = 14 + (y1 + 1 - 14) * t; g.p(C.thyme[k % 2 ? 3 : 5], Math.round(x + (k % 2 ? 1 : -1)), Math.round(y)); } }
  for (const [x, y] of tips) { g.r(C.lilac[3], Math.floor(x) - 1, Math.floor(y), 2, 2); g.p(C.lilac[5], Math.floor(x) - 1, Math.floor(y)); }
};
IT.salvia = (g) => {
  g.l(C.stem[3], 8, 14, 8, 10);
  const leaf = (P) => g.tube(C.sage, P, (u) => 2.7 * Math.pow(Math.sin(Math.PI * u), 0.7), { lo: 1, hi: 5, rmax: 3 });
  leaf([[8, 11], [4.6, 7], [2.6, 3]]); leaf([[8, 11], [11.4, 7], [13.4, 3]]); leaf([[8, 11], [8, 5.6], [8, 1]]);
  g.l(C.sage[5], 7, 9, 4, 4); g.l(C.sage[5], 9, 9, 12, 4); g.l(C.sage[5], 8, 9, 8, 3);
  for (const [x, y] of [[5, 7], [11, 7], [7, 5], [9, 6]]) g.p(C.sage[2], x, y);
};
IT.ruda = (g) => {
  g.l(C.stem[3], 7, 14, 7, 5); g.l(C.stem[3], 7, 9, 11, 6);
  for (const [x, y] of [[4, 11], [5, 9], [10, 11], [9.6, 8], [4, 7], [12, 8.4], [6, 12.4]]) g.ball(C.rue, x, y, 1.7, 1.4, { lo: 1, hi: 5, gl: false });
  for (const [x, y] of [[6, 3], [9, 2], [11.6, 4.6]]) { g.pts(C.yellow[4], [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]); g.p(C.yellow[2], x, y); }
};
IT.hiperico = (g) => {
  g.l(C.stem[3], 5, 14, 5, 7); g.l(C.stem[3], 10, 14, 10, 5);
  for (const [x, y, s] of [[5, 10, -1], [10, 9, 1], [10, 12, -1], [5, 12, 1]]) g.tube(C.leaf, [[x, y], [x + 2.4 * s, y - 1]], (u) => 1.1 * Math.sin(Math.PI * u), { rmax: 1.2 });
  const fl = (cx, cy) => { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.ball(C.yellow, cx + Math.cos(a) * 1.9, cy + Math.sin(a) * 1.9, 1.5, 1.5, { gl: false, lo: 2, hi: 6 }); } g.p(C.rovel[3], cx, cy); g.pts(C.yellow[6], [[cx - 1, cy - 1], [cx + 1, cy - 1]]); };
  fl(5, 5.4); fl(10.4, 3.4);
};
IT.ajenjo = (g) => {
  g.l(C.silver[2], 7, 14, 7, 1);
  for (let i = 0; i < 5; i++) { const y = 2.6 + i * 2.3, s = i % 2 ? 1 : -1, len = 3 + (i > 0 && i < 4 ? 1.4 : 0);
    g.l(C.silver[4], 7, y + 1, 7 + s * len, y - 1); g.p(C.silver[6], Math.round(7 + s * len), Math.round(y - 1)); g.p(C.silver[3], Math.round(7 + s * 2), Math.round(y + 1)); g.p(C.silver[5], Math.round(7 + s * (len - 1)), Math.round(y - 2)); }
};
IT.belladona = (g) => {
  g.l(C.stem[2], 6, 14, 7, 6);
  g.tube(C.dleaf, [[6, 11.6], [2, 8.4]], (u) => 2 * Math.sin(Math.PI * u), { rmax: 2.2 }); g.l(C.dleaf[5], 5, 11, 3, 9);
  g.l(C.stem[3], 7, 6, 10, 3); g.ball(C.purple, 11.6, 4.6, 1.9, 2.3, { lo: 1, hi: 5 }); g.pts(C.purple[1], [[11, 6], [12, 6]]);
  g.pts(C.leaf[3], [[5, 6], [10, 6], [7, 4], [8, 4], [5, 9], [10, 9]]);
  g.ball(C.berry, 7.6, 7.6, 2.7, 2.7, { lo: 0, hi: 4, glt: 0.84 });
};
IT.beleno = (g) => {
  for (const P of [[[8, 14], [2.6, 11]], [[8, 14], [13.4, 11.4]], [[8, 13], [5, 9]]]) g.tube(C.thyme, P, (u) => 1.7 * Math.sin(Math.PI * u), { rmax: 1.8 });
  g.l(C.stem[3], 8, 13, 8, 8);
  g.ball(C.henb, 8, 5.4, 4.8, 3.6, { lo: 2, hi: 6, gl: false });
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3 + 0.3; g.l(C.purple[2], 8 + Math.cos(a) * 1.4, 5.4 + Math.sin(a) * 1.1, 8 + Math.cos(a) * 3.8, 5.4 + Math.sin(a) * 2.8); }
  g.ball(C.berry, 8, 5.4, 1.6, 1.3, { lo: 0, hi: 3, gl: false });
};
IT.adelfa = (g) => {
  for (const P of [[[8, 14], [2, 7]], [[8, 14], [14, 7.6]], [[8, 13], [4.6, 3.6]], [[8, 13], [12, 4.4]]]) g.tube(C.dleaf, P, (u) => 1.3 * Math.sin(Math.PI * u), { rmax: 1.4 });
  for (const [cx, cy] of [[5, 5], [9, 3.4], [11, 7]]) { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.ball(C.pink, cx + Math.cos(a) * 1.6, cy + Math.sin(a) * 1.6, 1.3, 1.3, { gl: false, lo: 2, hi: 6 }); } g.p(C.pink[1], cx, cy); }
};
IT.muerdago = (g) => {
  for (const [a, b, c2, d] of [[8, 14, 8, 9], [8, 9, 4, 5], [8, 9, 12, 5], [4, 5, 2, 2], [4, 5, 6, 1], [12, 5, 10, 1], [12, 5, 14, 2]]) g.l(C.mist[2], a, b, c2, d);
  for (const P of [[[2, 2], [1, 5.4]], [[6, 1], [8, 3]], [[10, 1], [8.4, 4.4]], [[14, 2], [14.4, 5.6]], [[8, 11], [5, 12.6]], [[8, 11], [11, 12.6]]]) g.tube(C.mist, P, (u) => 1.2 * Math.sin(Math.PI * Math.min(1, u * 1.2 + 0.1)), { rmax: 1.3 });
  for (const [x, y] of [[8, 8.4], [4, 5], [12, 5], [6.6, 9.2]]) g.ball(C.mberry, x, y, 1.4, 1.4, { lo: 2, hi: 6, glt: 0.8 });
};
IT.mandragora = (g) => {
  for (const P of [[[8, 4.6], [4.6, 1]], [[8, 4.6], [8, 0.6]], [[8, 4.6], [11.4, 1]]]) g.tube(C.leaf, P, (u) => 1.3 * Math.sin(Math.PI * u), { rmax: 1.4 });
  g.tube(C.root, [[7.2, 9], [5.6, 14]], (u) => 1.4 - u * 0.9, { rmax: 1.5 }); g.tube(C.root, [[8.8, 9], [10.4, 14]], (u) => 1.4 - u * 0.9, { rmax: 1.5 });
  g.tube(C.root, [[6.2, 7], [3, 9.6]], (u) => 1.1 - u * 0.6, { rmax: 1.2 }); g.tube(C.root, [[9.8, 7], [13, 5.8]], (u) => 1.1 - u * 0.6, { rmax: 1.2 });
  g.ball(C.root, 8, 7.4, 2.9, 3.2, { lo: 1, hi: 5, gl: false });
  g.pts(INK2, [[7, 6], [9, 6]]); g.p(C.root[1], 8, 8); g.pts(C.root[2], [[2, 10], [13, 5], [5, 14], [11, 14]]);
};
IT.rosa = (g) => {
  g.l(C.leaf[2], 8, 7, 7, 14); g.pts(C.leaf[1], [[6, 10], [8, 12]]);
  g.tube(C.leaf, [[7.4, 11], [11.4, 9]], (u) => 1.6 * Math.sin(Math.PI * u), { rmax: 1.8 }); g.l(C.leaf[5], 8, 10, 10, 9);
  g.pts(C.leaf[3], [[6, 7], [10, 7]]);
  g.ball(C.rose, 8, 4.8, 3.7, 3.4, { lo: 1, hi: 5, gl: false });
  g.pts(C.rose[1], [[7, 4], [8, 3], [9, 4], [9, 5], [8, 6], [6, 5], [10, 6]]); g.pts(C.rose[5], [[6, 3], [7, 2], [8, 2]]);
};
IT.bellota = (g) => {
  const ac = (cx, cy) => { g.ball(C.acorn, cx, cy + 1.4, 2.7, 3.4, { eggB: 0.32, glt: 0.86 }); g.ball(C.cup, cx, cy - 1, 3.1, 1.9, { gl: false, lo: 1, hi: 5 }); g.pts(C.cup[1], [[cx - 2, cy - 1], [cx, cy - 1], [cx + 1, cy - 2], [cx - 1, cy - 2]]); g.pts(C.cup[5], [[cx - 1, cy - 1], [cx + 1, cy - 1]]); g.r(C.cup[2], cx, cy - 4, 1, 2); };
  ac(4.6, 7); ac(10.6, 6.2);
};
IT.pinones = (g) => {
  g.ball(C.cone, 6, 7.6, 3.9, 5.6, { gl: false, lo: 1, hi: 5 });
  for (let y = 3; y < 13; y += 2) for (let x = 3 + ((y >> 1) % 2); x < 10; x += 2) { if (!g.isOn(x, y)) continue; g.p(C.cone[5], x, y); if (g.isOn(x, y + 1)) g.p(C.cone[1], x, y + 1); }
  for (const [x, y] of [[11.4, 8], [12.8, 11.4], [10, 12.6]]) g.ball(C.pnut, x, y, 1.3, 1.9, { lo: 2, hi: 6, gl: false });
};
// Setas
IT.rovellon = (g) => {
  g.cyl(C.rstem, 6, 9, 4, 5, { lo: 1, hi: 5 }); g.pts(C.leaf[2], [[7, 11], [8, 12]]);
  g.ball(C.rovel, 8, 7, 6.3, 3.3, { gl: false, lo: 1, hi: 5 });
  g.ring(C.rovel[2], 8, 6.6, 4.2, 2, 1); g.e(C.rovel[1], 8, 6.3, 1.8, 0.9); g.r(C.rovel[1], 3, 9, 10, 1);
};
IT.cep = (g) => {
  g.ball(C.stalk, 8, 11, 3.6, 3.4, { lo: 2, hi: 6, gl: false }); g.pts(C.stalk[2], [[7, 11], [9, 12], [8, 13], [10, 10]]);
  g.r(C.cgold[2], 3, 8, 10, 1);
  g.ball(C.cep, 8, 5.6, 6.3, 3.8, { lo: 1, hi: 5, glt: 0.9 });
};
IT.oronja = (g) => {
  g.cyl(C.cgold, 6, 7, 4, 5, { lo: 2, hi: 6 });
  g.ball(C.stalk, 8, 12.4, 3.8, 2.1, { lo: 2, hi: 6, gl: false }); g.e(C.stalk[1], 8, 11.2, 2, 0.7);
  g.r(C.cgold[4], 3, 8, 10, 1);
  g.ball(C.caes, 8, 5.4, 5.9, 3.7, { glt: 0.88 });
  for (const x of [3, 5, 7, 9, 11, 13]) g.p(C.caes[1], x, 8);
};
IT.oronja_verde = (g) => {
  g.cyl(C.stalk, 6.5, 7, 3, 5, { lo: 2, hi: 6 }); g.r(C.stalk[5], 5, 9, 6, 1); g.r(C.stalk[2], 5, 10, 6, 1);
  g.ball(C.stalk, 8, 12.6, 3.4, 1.9, { lo: 2, hi: 6, gl: false });
  g.r(C.stalk[5], 3, 8, 10, 1);
  g.ball(C.dcap, 8, 5.6, 5.8, 3.4, { glt: 0.9 }); g.pts(C.dcap[1], [[6, 4], [10, 5], [8, 6]]);
};
IT.trufa = (g) => {
  g.ball(C.truf, 6.6, 8.4, 5, 4.6, { lo: 0, hi: 4, gl: false });
  for (let y = 4; y < 14; y++) for (let x = 2; x < 12; x++) { if (!g.isOn(x, y)) continue; const n = hash(x, y, 4); if (n < 0.2) g.p(C.truf[(x + y) % 3 ? 5 : 6], x, y); else if (n > 0.9) g.p(C.truf[0], x, y); }
  g.e(C.truf[2], 12.2, 11.4, 2.4, 2.1); g.pts(C.page[3], [[11, 11], [12, 10], [13, 11], [12, 12], [11, 12]]);
};
// Frutos y cultivos
IT.uva = (g) => {
  g.ball(C.leaf, 4.4, 3.2, 3.2, 2.4, { gl: false }); g.l(C.leaf[5], 3, 3, 6, 3);
  g.l(C.wstem[2], 8, 1, 8, 4); g.p(C.wstem[2], 9, 1);
  for (const [x, y] of [[5, 5.6], [8, 5.2], [11, 5.6], [6.5, 8.2], [9.5, 8.2], [3.8, 8.4], [12.2, 8.4], [8, 10.8], [5.6, 10.6], [10.4, 10.6], [8, 13.2]]) g.ball(C.grape, x, y, 1.9, 1.9, { lo: 1, hi: 5, glt: 0.8 });
};
IT.aceitunas = (g) => {
  g.l(C.wstem[2], 2, 3, 13, 12);
  for (const P of [[[4, 4.6], [1.6, 8]], [[7, 7], [5, 11]], [[9, 8.6], [12.6, 6]], [[11, 10.4], [14, 8.6]]]) g.tube(C.oleaf, P, (u) => 1.1 * Math.sin(Math.PI * u), { rmax: 1.2 });
  for (const [x, y] of [[6, 9.4], [9.6, 11.6], [10.4, 7]]) g.ball(C.olive, x, y, 1.9, 2.3, { glt: 0.82 });
};
IT.trigo = (g) => {
  const tips = [[3, 4.4], [5.2, 2.4], [8, 1.6], [10.8, 2.4], [13, 4.4]];
  for (const [tx, ty] of tips) { g.l(C.wheat[2], 8, 10, tx, ty + 3.4); g.l(C.wheat[3], 8, 10, 8 + (tx - 8) * 0.4, 14); }
  for (const [tx, ty] of tips) { g.tube(C.wheat, [[tx, ty + 3.4], [tx, ty + 0.4]], 0.95, { lo: 2, hi: 6, rmax: 1, fn: (x, y) => ((y & 1) ? null : C.wheat[2]) }); g.l(C.wheat[5], tx, ty, tx + (tx < 8 ? -1 : tx > 8 ? 1 : 0), ty - 1.4); }
  g.r(C.wstem[1], 6, 10, 5, 1); g.r(C.wstem[3], 6, 10, 2, 1);
};
IT.alcachofa = (g) => {
  g.r(C.arti[2], 7, 11, 2, 3); g.p(C.arti[4], 7, 11);
  g.ball(C.arti, 8, 7, 5, 5.2, { gl: false });
  for (let r = 0; r < 4; r++) { const y = 3 + r * 2.4, n = 2 + (r % 2); for (let i = 0; i < n; i++) { const x = 8 + (i - (n - 1) / 2) * 3; g.p(C.artp[4], Math.round(x), Math.round(y)); g.p(C.arti[1], Math.round(x), Math.round(y) + 1); g.p(C.arti[5], Math.round(x) - 1, Math.round(y) + 1); } }
};
IT.col = (g) => {
  g.ball(C.cab, 8, 8.5, 6.3, 5.6, { lo: 1, hi: 5, gl: false });
  for (const [x, y] of [[3, 6], [5.6, 3.6], [10.4, 3.6], [13, 6], [2.6, 10]]) g.l(C.cab[5], 8, 13, x, y);
  g.ball(C.cab, 8, 6.2, 3, 2.4, { lo: 3, hi: 6, gl: false });
  g.pts(C.cab[1], [[3, 11], [12, 11], [13, 8], [4, 13]]);
};
// Semillas
IT.sem_trigo = (g) => {
  g.l(C.wheat[2], 9, 6, 9, 4); g.tube(C.wheat, [[9.6, 4], [11.4, 0.8]], 1.1, { lo: 2, hi: 6 });
  g.ball(C.sack, 7.6, 10, 5.3, 4.1, { gl: false }); g.ball(C.sack, 7.6, 5.6, 2.7, 1.7, { gl: false, lo: 2, hi: 6 });
  for (let y = 7; y < 14; y++) for (let x = 3; x < 13; x++) if (g.isOn(x, y) && (x + 2 * y) % 5 === 0) g.p(C.sack[2], x, y);
  g.r(C.wstem[1], 5, 6, 6, 1); g.pts(C.wheat[4], [[12, 13], [13, 12], [11, 14], [14, 14]]);
};
IT.sem_col = (g) => {
  g.poly(C.pot[3], [[3, 9], [13, 9], [11.6, 14.6], [4.4, 14.6]]); g.poly(C.pot[4], [[3, 9], [6, 9], [6, 14.6], [4.4, 14.6]]); g.poly(C.pot[2], [[11, 9], [13, 9], [11.6, 14.6], [10.4, 14.6]]);
  g.r(C.pot[5], 2, 8, 12, 2); g.r(C.pot[3], 2, 9, 12, 1); g.r(C.soil[3], 4, 8, 8, 1);
  g.l(C.leaf[2], 8, 8, 8, 5);
  g.ball(C.cab, 5.4, 5, 2.5, 1.7, { gl: false, lo: 2, hi: 6 }); g.ball(C.cab, 10.6, 4.4, 2.5, 1.7, { gl: false, lo: 2, hi: 6 }); g.ball(C.cab, 8, 3, 1.4, 1.6, { gl: false, lo: 2, hi: 6 });
};
IT.sem_alcachofa = (g) => {
  for (const [x, y] of [[5, 14], [8, 14], [11, 14], [3, 13]]) g.l(C.root[2], 8, 11, x, y);
  g.ball(C.soil, 8, 10.6, 3.8, 1.9, { gl: false });
  for (const P of [[[8, 9.6], [3.6, 2]], [[8, 9.6], [12.4, 2.4]], [[8, 9.6], [8, 0.8]]]) g.tube(C.oleaf, P, (u) => 1.6 * Math.sin(Math.PI * u), { rmax: 1.7, fn: (x, y, u, it) => ((x + y) % 3 === 0 && it < 0.4 ? C.oleaf[1] : null) });
};
IT.sem_romero = (g) => {
  g.l(C.wstem[2], 7, 9, 10, 1);
  for (let i = 1; i < 7; i++) { const t = i / 7, x = 7 + 3 * t, y = 9 - 8 * t, s = i % 2 ? 1 : -1; g.l(C.dleaf[i % 3 ? 3 : 4], x + 0.5 * s, y, x + 2.2 * s, y - 1.4); }
  g.ball(C.sack, 7.6, 11.6, 3.4, 3, { gl: false }); g.r(C.wstem[1], 5, 9, 6, 1); g.pts(C.holy[4], [[6, 12], [9, 13]]);
};
// Materiales de animal
IT.piel = (g) => {
  for (const [x, y] of [[2.6, 3.2], [13.4, 3.2], [2.6, 12.6], [13.4, 12.6]]) g.ball(C.hide, x, y, 1.8, 1.6, { gl: false });
  g.ball(C.hide, 8, 1.8, 1.8, 1.4, { gl: false }); g.tube(C.hide, [[8, 13], [9.4, 14.6]], 0.8);
  g.poly(C.hide[3], [[3, 3], [13, 3], [12.4, 13], [3.6, 13]]);
  g.e(C.hide[4], 8, 8, 3.6, 4.6); g.e(C.hide[5], 7.6, 7.6, 2.2, 3.2); g.r(C.hide[2], 12, 4, 1, 9); g.r(C.hide[2], 4, 12, 8, 1);
  for (const y of [5, 8, 11]) g.pts(C.hide[1], [[4, y], [11, y]]);
};
IT.piel_fina = (g) => {
  g.tube(C.fur, [[2.6, 7.6], [11.6, 7.6]], 3.5, { lo: 1, hi: 5, fn: (x, y, u, it) => (hash(x >> 1, (y + 1) >> 1, 5) < 0.34 ? C.spot[it > 0.3 ? 3 : 1] : null) });
  g.e(C.fur[5], 12.4, 7.6, 1.6, 3.2); g.ring(C.fur[2], 12.4, 7.6, 1.2, 2.2, 1); g.p(C.fur[1], 12, 7);
  g.r(C.red[3], 7, 4, 1, 8); g.p(C.red[5], 7, 4);
  g.tube(C.fur, [[3.6, 10.6], [2.6, 13.2], [4.6, 14.4]], 1.1, { lo: 2, hi: 6, rmax: 1.2, fn: (x, y, u) => (Math.floor(u * 6) % 2 ? C.spot[2] : null) });
};
IT.pluma = (g) => {
  const fea = (Rr, x0, y0, x1, y1, w) => { g.tube(Rr, [[x0, y0], [x1, y1]], (u) => (u < 0.16 ? 0 : w * Math.pow(Math.sin(Math.PI * Math.min(1, (u - 0.16) / 0.84)), 0.6)), { lo: 1, hi: 5, rmax: w + 0.5 }); g.l(Rr[6], x0, y0, x1, y1); };
  fea(C.feath, 3, 14, 8.4, 1.4, 2.5); fea(C.wool, 6, 14.4, 13.6, 3.4, 2.3);
  g.pts(C.feath[1], [[5, 6], [6, 4]]); g.clr(7, 4); g.clr(12, 8);
};
IT.hueso = (g) => {
  g.tube(C.bone, [[4.5, 11.5], [11.5, 4.5]], 1.4, { lo: 2, hi: 6 });
  for (const [x, y] of [[3.2, 11.2], [4.8, 12.8], [11.2, 3.2], [12.8, 4.8]]) g.ball(C.bone, x, y, 1.6, 1.6, { lo: 2, hi: 6, gl: false });
};
IT.colmillo = (g) => {
  const P = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * (1 + (0.45 * i) / 14); P.push([13 + Math.cos(a) * 10, 12.6 + Math.sin(a) * 10]); }
  g.tube(C.ivory, P, (u) => 2.3 - 1.9 * u, { lo: 1, hi: 6, rmax: 2.4, fn: (x, y, u, it) => (u < 0.16 ? tone(C.root, it) : null) });
  g.r(C.leath[2], 3, 11, 1, 3);
};
IT.cornamenta = (g) => {
  const tip = (x, y, u, it) => (u > 0.72 ? tone(C.ivory, it, 2, 6) : null);
  g.tube(C.antler, [[5, 9.4], [2, 6.6], [1.6, 4.4]], (u) => 1 - u * 0.5, { rmax: 1.1, fn: tip });
  g.tube(C.antler, [[7.6, 6], [11, 5.4], [13.4, 3]], (u) => 1 - u * 0.5, { rmax: 1.1, fn: tip });
  g.tube(C.antler, [[9.2, 3.6], [12, 1.6]], (u) => 0.9 - u * 0.4, { rmax: 1, fn: tip });
  g.tube(C.antler, [[3, 13.6], [5, 9], [7.6, 6], [9, 3.6], [10, 1.4]], (u) => 1.6 - u * 0.9, { rmax: 1.7, fn: tip });
  g.ball(C.antler, 3.4, 13, 2, 1.3, { gl: false, lo: 1, hi: 4 });
};
IT.veneno = (g) => {
  g.cyl(C.glass, 6, 4, 4, 9, { lo: 2, hi: 6 }); g.cyl(C.venom, 6, 8, 4, 5, { lo: 1, hi: 5 }); g.r(C.venom[5], 6, 8, 4, 1);
  g.ball(C.venom, 8, 12.8, 2, 1.2, { gl: false }); g.r(C.cork[3], 6, 2, 4, 2); g.r(C.cork[5], 6, 2, 2, 1);
  g.ball(C.venom, 12, 11, 1.4, 1.8, { egg: 0.6, glt: 0.75 }); g.p(C.venom[4], 12, 8);
  g.pts(WHITE, [[6, 5], [6, 6]]); g.pts(C.bone[5], [[8, 10], [7, 10]]);
};
IT.tinta_sepia = (g) => {
  g.tube(C.wool, [[7, 8], [13.4, 1.4]], (u) => (u < 0.22 ? 0 : 2.1 * Math.sin((Math.PI * (u - 0.22)) / 0.78)), { lo: 2, hi: 6, rmax: 2.2 }); g.l(C.bone[2], 6, 9, 13, 2);
  g.ball(C.inkpot, 6.4, 10.6, 4.6, 3.6, { lo: 1, hi: 5, glt: 0.84 }); g.r(C.paper[4], 4, 10, 5, 2); g.r(C.paper[2], 4, 11, 5, 1);
  g.e(C.inkpot[0], 6.4, 7.6, 2, 0.9); g.ring(C.inkpot[4], 6.4, 7.6, 2.5, 1.3, 1); g.pts(C.amber[3], [[4, 11], [5, 12]]);
};
// Pesca
IT.anguila = (g) => {
  const P = []; for (let i = 0; i <= 22; i++) { const t = i / 22; P.push([2 + t * 11.6, 7.6 + Math.sin(t * Math.PI * 1.6 + 0.4) * 3.6]); }
  g.tube(C.eel, P, (u) => 1.9 - Math.max(0, u - 0.55) * 3.4, { lo: 1, hi: 5, rmax: 2 });
  g.p(INK2, Math.round(P[1][0]), Math.round(P[1][1] - 1)); g.p(C.eel[6], Math.round(P[1][0]) - 1, Math.round(P[1][1] - 2));
  for (let i = 4; i < 16; i += 2) g.p(C.eel[1], Math.round(P[i][0]), Math.round(P[i][1] - 1.6));
};
IT.trucha = (g) => fish(g, C.trout, 1, 4, 14, 7, { stripe: C.pink[4], spots: C.spot[3], belly: 5 });
IT.barbo = (g) => { fish(g, C.barbel, 1.6, 4, 13.4, 7, { belly: 5 }); g.pts(C.barbel[2], [[1, 9], [2, 10], [1, 10]]); };
IT.sardina = (g) => { fish(g, C.sard, 1, 1, 11, 4, { belly: 6 }); fish(g, C.sard, 4, 5.6, 11, 4, { belly: 6 }); fish(g, C.sard, 2, 10.2, 11, 4, { belly: 6 }); };
IT.dorada = (g) => { fish(g, C.bream, 1, 3, 13.6, 9.4, { belly: 6, tail: 0.66 }); g.pts(C.gold[4], [[2, 5], [3, 5], [4, 5], [3, 4]]); g.pts(C.bream[1], [[5, 6], [5, 7]]); };
IT.lubina = (g) => { fish(g, C.bass, 1, 4.6, 14, 6, { belly: 6 }); g.l(C.bass[1], 1, 8, 3, 8); };
IT.pulpo = (g) => {
  for (let k = 0; k < 5; k++) { const sx = 4.2 + k * 1.9, dir = k < 2 ? -1 : k > 2 ? 1 : 0; g.tube(C.octo, [[sx, 8.6], [sx + dir * 1.6, 11.4], [sx + dir * 3, 13.4], [sx + dir * 3.8 + (dir ? 0 : 1.2), 12.4]], (u) => 1.2 - u * 0.7, { lo: 1, hi: 5, rmax: 1.3, fn: (x, y, u) => (u > 0.2 && u < 0.8 && (x + y) % 3 === 0 ? C.octo[5] : null) }); }
  g.ball(C.octo, 8, 5.2, 4.4, 4.1, { glt: 0.9 });
  g.pts(WHITE, [[6, 6], [10, 6]]); g.pts(INK2, [[6, 7], [10, 7]]); g.pts(C.octo[2], [[7, 3], [9, 2]]);
};
IT.cangrejo = (g) => {
  g.poly(C.cray[3], [[5.6, 14.6], [10.4, 14.6], [9.2, 12.4], [6.8, 12.4]]);
  g.ball(C.cray, 8, 11, 2.3, 2.6, { gl: false }); g.r(C.cray[1], 6, 10, 4, 1); g.r(C.cray[1], 6, 12, 4, 1);
  for (const [x, y] of [[5, 8], [4, 9.6], [11, 8], [12, 9.6]]) g.p(C.cray[2], x, y);
  g.ball(C.cray, 8, 7.2, 2.9, 3.2, { glt: 0.88 });
  g.tube(C.cray, [[6.6, 5.4], [4.4, 3.6], [3.6, 2.4]], 0.9); g.tube(C.cray, [[9.4, 5.4], [11.6, 3.6], [12.4, 2.4]], 0.9);
  g.ball(C.cray, 2.8, 2.6, 1.9, 2.2, { glt: 0.8 }); g.ball(C.cray, 13.2, 2.6, 1.9, 2.2, { glt: 0.8 }); g.clr(2, 0); g.clr(13, 0); g.p(C.cray[1], 3, 1); g.p(C.cray[1], 12, 1);
  g.pts(INK2, [[7, 4], [9, 4]]); g.l(C.cray[4], 7, 4, 5, 0); g.l(C.cray[4], 9, 4, 11, 0);
};
IT.esturion = (g) => {
  fish(g, C.sturg, 1, 4.4, 14, 6.4, { belly: 5, tail: 1 });
  g.pts(C.sturg[5], [[4, 5], [6, 5], [8, 5], [10, 6], [5, 8], [8, 8], [11, 8]]);
  g.pts(C.sturg[2], [[1, 9], [2, 10], [3, 10]]); g.clr(14, 9); g.clr(14, 8);
};
IT.erizo_mar = (g) => {
  const urchin = (cx, cy, r, n) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.2; g.l(C.urch[i % 2 ? 3 : 4], cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, cx + Math.cos(a) * (r + 2.3), cy + Math.sin(a) * (r + 2.3)); g.p(C.urch[6], cx + Math.cos(a) * (r + 2.3), cy + Math.sin(a) * (r + 2.3)); } g.ball(C.urch, cx, cy, r, r * 0.9, { lo: 1, hi: 5, glt: 0.88 }); };
  urchin(10.6, 4.6, 2.1, 10); urchin(6.2, 9.8, 3.1, 14);
};
// Materiales
IT.madera = (g) => {
  const log = (cx, cy) => { g.ball(C.bark, cx, cy, 3.4, 3.2, { lo: 1, hi: 4, gl: false }); g.e(C.logw[4], cx - 0.3, cy - 0.3, 2.4, 2.2); g.ring(C.logw[2], cx - 0.3, cy - 0.3, 1.7, 1.5, 1); g.p(C.logw[1], Math.floor(cx - 0.3), Math.floor(cy - 0.3)); g.p(C.logw[6], Math.floor(cx) - 2, Math.floor(cy) - 1); };
  log(4.6, 10.8); log(11.4, 10.8); log(8, 5);
};
IT.hierro = (g) => {
  g.poly(C.iron[3], [[3, 8], [12.6, 8], [14.4, 12.4], [1.4, 12.4]]); g.poly(C.iron[4], [[3, 8], [5, 8], [3.6, 12.4], [1.4, 12.4]]); g.poly(C.iron[2], [[11, 8], [12.6, 8], [14.4, 12.4], [12.6, 12.4]]);
  g.poly(C.iron[5], [[4.6, 5], [11, 5], [12.6, 8], [3, 8]]); g.pts(WHITE, [[5, 6], [6, 6]]); g.r(C.iron[6], 4, 7, 8, 1);
  g.r(C.iron[2], 6, 9, 4, 2); g.r(C.iron[4], 6, 9, 4, 1); g.r(C.iron[1], 1, 12, 14, 1);
};
IT.plata = (g) => {
  const bar = (ox, oy) => { g.poly(C.silv[5], [[ox + 2, oy], [ox + 9, oy], [ox + 10, oy + 2], [ox + 1, oy + 2]]); g.poly(C.silv[3], [[ox + 1, oy + 2], [ox + 10, oy + 2], [ox + 11, oy + 5], [ox, oy + 5]]); g.poly(C.silv[4], [[ox + 1, oy + 2], [ox + 3, oy + 2], [ox + 2, oy + 5], [ox, oy + 5]]); g.r(C.silv[1], ox, oy + 5, 11, 1); g.r(C.silv[6], ox + 3, oy + 1, 3, 1); g.r(C.silv[2], ox + 4, oy + 3, 3, 1); };
  bar(3.4, 3.4); bar(0.6, 8.4);
  g.pts(WHITE, [[13, 9], [12, 10], [14, 10], [13, 11]]); g.p(C.silv[6], 13, 10);
};
IT.cuero = (g) => {
  g.poly(C.leath[3], [[2, 2.6], [5, 1.6], [8, 2.4], [11.4, 1.4], [14, 3], [13.4, 7], [14.4, 11], [12.4, 14], [8, 13.2], [4.6, 14.4], [1.6, 12.6], [2.6, 8.6], [1.4, 5]]);
  g.poly(C.leath[4], [[2, 2.6], [5, 1.6], [8, 2.4], [8, 3.6], [3.6, 4], [3.4, 12.4], [1.6, 12.6], [2.6, 8.6], [1.4, 5]]);
  g.poly(C.leath[2], [[13.4, 7], [14.4, 11], [12.4, 14], [11, 12.4], [12.2, 8]]);
  for (const [x, y] of [[4, 4], [6, 4], [8, 4], [10, 4], [12, 4], [4, 7], [4, 10], [12, 7], [11, 10], [6, 12], [8, 12]]) g.p(C.leath[5], x, y);
  g.poly(C.leath[5], [[9.6, 13.4], [12.4, 14], [12.6, 11]]); g.l(C.leath[1], 9, 13, 12, 10);
};
IT.lana = (g) => {
  g.ball(C.wool, 7.4, 8.2, 5.4, 5.2, { lo: 1, hi: 5, gl: false });
  const inB = (x, y) => { const a = (x + 0.5 - 7.4) / 5, b = (y + 0.5 - 8.2) / 4.8; return a * a + b * b < 1; };
  g.ring(C.wool[2], 10, 5, 6, 4.6, 1, inB); g.ring(C.wool[2], 4, 11, 5.6, 4.4, 1, inB); g.ring(C.wool[5], 9.6, 4.6, 5.4, 4, 1, inB);
  g.l(C.wool[3], 12, 11, 14, 14); g.p(C.wool[5], 14, 14);
};
IT.cuerda = (g) => {
  const ringP = (r) => { const P = []; for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; P.push([8 + Math.cos(a) * r, 8.4 + Math.sin(a) * r * 0.72]); } return P; };
  const tw = (x, y, u, it) => ((x + y) % 3 === 0 ? tone(C.hemp, it - 0.6) : null);
  for (const r of [5.8, 3.8, 1.8]) g.tube(C.hemp, ringP(r), 1.05, { lo: 1, hi: 5, rmax: 1.1, fn: tw });
  g.tube(C.hemp, [[12.6, 10.4], [14, 14]], 1.05, { lo: 1, hi: 5, rmax: 1.1, fn: tw });
};
IT.cera = (g) => {
  g.r(C.bwax[3], 2, 6, 12, 7); g.r(C.bwax[5], 3, 4, 11, 2); g.r(C.bwax[6], 3, 4, 4, 1); g.r(C.bwax[4], 2, 6, 2, 7); g.r(C.bwax[2], 12, 6, 2, 7); g.r(C.bwax[1], 2, 12, 12, 1);
  g.poly(C.bwax[4], [[2, 6], [3, 4], [14, 4], [14, 6]]);
  const hex = (x, y) => g.t(x, y, ['.dd.', 'd..d', '.dd.'], { d: C.bwax[1] });
  hex(4, 7); hex(8, 7); hex(6, 9);
};
IT.aceite = (g) => {
  g.ring(C.pot[2], 4.6, 5.6, 2, 2.4, 1, (x) => x < 5); g.ring(C.pot[2], 11.4, 5.6, 2, 2.4, 1, (x) => x > 10);
  g.ball(C.pot, 8, 8.8, 4.7, 4.5, { glt: 0.9, eggB: 0.2 }); g.poly(C.pot[2], [[6.6, 12.4], [9.4, 12.4], [8, 14.8]]);
  g.cyl(C.pot, 6.5, 2.6, 3, 3, { lo: 1, hi: 5 }); g.r(C.pot[5], 6, 2, 4, 1);
  g.r(C.olive[4], 7, 2, 2, 1); g.pts(C.olive[5], [[6, 3], [6, 4], [6, 5]]); g.r(C.pot[1], 4, 8, 8, 1); g.r(C.pot[5], 4, 8, 3, 1);
};
IT.sal = (g) => {
  g.ball(C.salt, 8, 8.4, 4.8, 3.7, { lo: 2, hi: 6, gl: false });
  g.pts(WHITE, [[6, 6], [8, 5], [10, 7], [5, 8]]); g.pts(C.salt[1], [[9, 9], [11, 8], [7, 9]]);
  g.ball(C.wood, 8, 10.6, 6.4, 3.4, { gl: false, keep: (x, y) => y >= 10 }); g.r(C.wood[5], 2, 10, 12, 1); g.r(C.wood[4], 2, 10, 4, 1);
  g.pts(WHITE, [[12, 3], [13, 2]]);
};
IT.agua_bendita = (g) => {
  flask(g, C.holy, { lvl: 7.6, cork: false });
  g.r(C.silv[4], 6, 2, 4, 1); g.r(C.silv[3], 7, 1, 2, 1);
  g.pts(C.gold[5], [[8, 8], [8, 9], [8, 10], [8, 11], [7, 9], [9, 9]]);
  g.pts(WHITE, [[12, 4], [13, 3], [11, 3], [12, 2]]);
};
IT.vidrio = (g) => {
  g.ball(C.glass, 8, 9.6, 4.8, 4.5, { lo: 3, hi: 6, glt: 0.84 }); g.e(C.glass[5], 8.6, 10.4, 2.8, 2.4);
  g.cyl(C.glass, 7, 2.4, 2, 4, { lo: 3, hi: 6 }); g.r(C.glass[2], 6, 2, 4, 1);
  g.pts(WHITE, [[5, 8], [5, 9], [5, 10], [6, 7]]); g.pts(C.glass[2], [[11, 12], [10, 13]]);
};
IT.cana = (g) => {
  for (const [x0, y0, x1, y1] of [[2, 13.4, 9.6, 1.4], [5.4, 14.4, 13, 2.4]]) g.tube(C.cane, [[x0, y0], [x1, y1]], 1.2, { lo: 1, hi: 5, fn: (x, y, u, it) => ((Math.floor(u * 5 + 0.5) !== Math.floor(u * 5 + 0.62)) ? C.cane[1] : null) });
  g.tube(C.leaf, [[9.4, 1.6], [13, 0.8]], (u) => 0.9 * Math.sin(Math.PI * u), { rmax: 1 });
};
IT.concha = (g) => {
  for (let y = 0; y <= 13; y++) for (let x = 1; x <= 14; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 12.6, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (dy > 0 || a > -0.3 || a < -Math.PI + 0.3) continue;
    const f = ((a + Math.PI) / (Math.PI / 9)) % 1, rib = Math.floor((a + Math.PI) / (Math.PI / 9)) % 2;
    if (r > 7.3 - (f < 0.25 || f > 0.75 ? 0.6 : 0)) continue;
    const base = -(dx / 7) * 0.45 + 0.4 - r / 18; const groove = f < 0.18 || f > 0.82;
    g.p(groove ? C.shell[1] : tone(C.shell, base + (rib ? 0.25 : 0), 2, 6), x, y);
  }
  g.r(C.shell[2], 5, 12, 6, 2); g.r(C.shell[4], 6, 12, 4, 1); g.pts(WHITE, [[6, 4], [7, 3]]);
};
// Pociones
IT.pocion = (g) => flask(g, C.red);
IT.tonico = (g) => {
  g.cyl(C.blue, 5, 8, 6, 6, { lo: 1, hi: 5 }); g.r(C.blue[5], 5, 8, 6, 1); g.cyl(C.glass, 5, 6, 6, 2, { lo: 2, hi: 6 });
  g.ball(C.glass, 8, 6, 3, 1.4, { lo: 2, hi: 6, gl: false, keep: (x, y) => y < 6 }); g.cyl(C.glass, 7, 2, 2, 3, { lo: 2, hi: 6 });
  g.r(C.cork[3], 7, 1, 2, 1); g.r(C.cork[5], 6, 1, 1, 1); g.r(C.paper[5], 6, 10, 4, 3); g.pts(C.blue[3], [[7, 11], [8, 11], [8, 10]]);
  g.pts(WHITE, [[5, 9], [5, 10]]);
};
IT.unguento = (g) => {
  g.cyl(C.plate, 3, 7, 10, 7, { lo: 2, hi: 6 }); g.r(C.blue[3], 3, 8, 10, 1); g.r(C.blue[3], 3, 12, 10, 1);
  g.ball(C.plate, 8, 6.5, 5.4, 1.8, { lo: 2, hi: 6, gl: false }); g.ball(C.plate, 8, 4.8, 1.5, 1.1, { lo: 3, hi: 6 });
  g.pts(C.yellow[4], [[8, 9], [7, 10], [9, 10], [8, 11]]); g.p(C.rovel[3], 8, 10); g.pts(C.leaf[3], [[6, 11], [10, 11]]);
};
IT.antidoto = (g) => {
  g.r(C.green[3], 4, 7, 6, 7); g.r(C.green[4], 4, 7, 2, 7); g.r(C.green[1], 10, 7, 2, 7); g.r(C.green[5], 4, 7, 8, 1);
  g.r(C.glass[3], 4, 5, 8, 2); g.r(C.glass[5], 4, 5, 2, 2); g.r(C.glass[2], 10, 5, 2, 2);
  g.r(C.glass[4], 6, 3, 3, 2); g.r(C.cork[3], 6, 1, 3, 2); g.r(C.cork[5], 6, 1, 1, 1);
  g.r(C.paper[5], 5, 9, 4, 3); g.pts(C.green[2], [[7, 9], [6, 10], [7, 10], [8, 10], [7, 11]]); g.pts(WHITE, [[4, 8], [4, 9]]);
};
IT.filtro = (g) => {
  g.heart(C.mag, 8, 9.6, 3.7);
  g.cyl(C.glass, 7, 3, 2, 3, { lo: 2, hi: 6 }); g.pts(C.gold[4], [[7, 1], [9, 1], [7, 2], [8, 2], [9, 2]]); g.p(C.gold[2], 8, 3);
  g.pts(C.red[4], [[6, 6], [10, 6], [5, 7], [11, 7]]); g.pts(C.mag[6], [[6, 9], [9, 12]]);
};
IT.sueno = (g) => {
  g.ball(C.smoke, 5.6, 11.4, 3.6, 3, { R2: C.glass, split: 10, lo: 0, hi: 4, glt: 0.85 }); g.cyl(C.glass, 4.6, 6.6, 2, 3, { lo: 2, hi: 6 });
  g.ball(C.smoke, 7.4, 5, 2.4, 1.9, { lo: 3, hi: 6, gl: false }); g.ball(C.smoke, 10.6, 3.2, 2.3, 1.8, { lo: 3, hi: 6, gl: false }); g.ball(C.smoke, 12.6, 6.2, 1.6, 1.4, { lo: 3, hi: 6, gl: false });
  g.pts(C.smoke[1], [[10, 3], [11, 4], [12, 3]]); g.pts(WHITE, [[13, 1], [14, 1], [14, 2]]);
};
IT.aceite_veneno = (g) => {
  flask(g, C.poison, { lvl: 7.4, rx: 5, ry: 4.5 });
  g.r(C.bone[5], 7, 9, 3, 2); g.r(C.bone[5], 6, 10, 5, 1); g.pts(INK2, [[7, 10], [9, 10]]); g.pts(C.bone[4], [[7, 12], [9, 12]]); g.p(C.bone[2], 8, 11);
};
IT.agua_sant_joan = (g) => {
  g.ball(C.glow, 8, 10.2, 4.3, 4.3, { R2: C.glass, split: 8, surf: C.glow[6], egg: 0.35, lo: 2, hi: 6, glt: 0.85 });
  g.cyl(C.glass, 7, 3, 2, 3, { lo: 2, hi: 6 }); g.r(C.gold[4], 6, 2, 4, 1); g.r(C.gold[5], 7, 1, 2, 1);
  for (const [x, y] of [[2, 4], [13, 6], [3, 11], [12, 13]]) g.pts(C.glow[6], [[x, y - 1], [x - 1, y], [x, y], [x + 1, y], [x, y + 1]]);
};
IT.elixir_fuerza = (g) => {
  g.cyl(C.amber, 4, 7, 8, 7, { lo: 1, hi: 5 }); g.ball(C.amber, 8, 7, 4, 2.2, { lo: 1, hi: 5, gl: false });
  g.cyl(C.glass, 7, 3, 2, 3, { lo: 2, hi: 6 }); g.r(C.wax[3], 6, 1, 4, 3); g.r(C.wax[5], 6, 1, 2, 1); g.p(C.wax[3], 9, 4); g.p(C.wax[2], 9, 5);
  g.r(C.paper[5], 5, 9, 6, 4); g.ball(C.truf, 8, 11, 1.8, 1.4, { lo: 0, hi: 3, gl: false }); g.pts(WHITE, [[4, 8], [4, 9]]);
};
IT.brebaje = (g) => {
  flask(g, C.murk, { lvl: 7.8, cork: false });
  g.l(C.glass[1], 10, 7, 11, 9); g.p(C.glass[1], 12, 10);
  g.pts(C.murk[5], [[9, 1], [10, 2], [8, 2], [11, 0]]); g.ring(C.murk[4], 10.6, 1.2, 1.2, 1.2, 1); g.pts(C.murk[1], [[6, 11], [9, 12], [7, 13]]);
};
IT.venda = (g) => {
  g.poly(C.linen[4], [[4, 10.6], [8, 11.4], [5, 14.6], [0.6, 13.6]]); g.poly(C.linen[5], [[4, 10.6], [5.4, 10.8], [1.8, 14], [0.6, 13.6]]); g.l(C.linen[2], 7, 12, 4, 14);
  g.tube(C.linen, [[4.4, 7.6], [9.6, 7.6]], 4, { lo: 2, hi: 5 });
  g.ball(C.linen, 10.4, 7.6, 3.4, 4, { lo: 3, hi: 6, gl: false }); g.ring(C.linen[2], 10.4, 7.6, 2.3, 2.8, 1); g.ring(C.linen[3], 10.4, 7.6, 1.2, 1.6, 1); g.p(C.linen[1], 10, 7);
};
// Regalos
IT.cinta = (g) => {
  g.tube(C.red, [[7.4, 8], [5, 12], [3.4, 14.2]], 1, { lo: 1, hi: 5, rmax: 1.1 }); g.tube(C.red, [[8.6, 8], [11, 12], [12.6, 14.2]], 1, { lo: 1, hi: 5, rmax: 1.1 });
  g.ball(C.red, 4.6, 6.4, 3.5, 2.7, { glt: 0.86 }); g.ball(C.red, 11.4, 6.4, 3.5, 2.7, { glt: 0.86 });
  g.e(C.red[1], 4.8, 6.4, 1.4, 0.9); g.e(C.red[1], 11.2, 6.4, 1.4, 0.9);
  g.ball(C.red, 8, 7, 1.6, 1.9, { lo: 2, hi: 6 });
};
IT.anillo = (g) => {
  for (let y = 3; y < 15; y++) for (let x = 1; x < 15; x++) {
    const a = (x + 0.5 - 8) / 5.8, b = (y + 0.5 - 9.4) / 4.4, d = a * a + b * b, ai = (x + 0.5 - 8) / 3.6, bi = (y + 0.5 - 8.9) / 2.3;
    if (d > 1 || ai * ai + bi * bi < 1) continue; g.p(tone(C.silv, -a * 0.6 - b * 0.75 + 0.15, 1, 6), x, y);
  }
  g.pts(WHITE, [[12, 1], [11, 2], [13, 2], [12, 3], [4, 7]]); g.p(C.silv[6], 12, 2);
};
IT.libro_versos = (g) => book(g, C.brose, EMB.note);
IT.perfume = (g) => {
  g.poly(C.azahar[3], [[8, 5], [12.6, 9.6], [8, 14.4], [3.4, 9.6]]); g.poly(C.azahar[5], [[8, 5], [8, 14.4], [3.4, 9.6]]); g.poly(C.azahar[4], [[8, 5], [10, 7], [8, 9.6], [6, 7]]);
  g.l(C.azahar[2], 8, 10, 11, 10); g.pts(WHITE, [[6, 8], [5, 9]]);
  g.r(C.glass[4], 7, 3, 2, 2); g.ball(C.glass, 8, 1.8, 1.6, 1.4, { lo: 3, hi: 6 });
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.p(WHITE, Math.round(12 + Math.cos(a) * 1.4), Math.round(4 + Math.sin(a) * 1.4)); } g.p(C.yellow[4], 12, 4);
};
IT.tabaco = (g) => {
  g.tube(C.dwood, [[6.4, 11.4], [10, 11.8], [13.8, 10]], 0.9, { lo: 1, hi: 5, rmax: 1 }); g.r(INK2, 13, 9, 2, 1);
  g.cyl(C.wood, 3, 6, 5, 6, { lo: 1, hi: 5 }); g.ball(C.wood, 5.5, 11.6, 2.5, 1.4, { gl: false });
  g.e(C.dwood[1], 5.5, 6.2, 2.2, 0.8); g.pts(C.rovel[4], [[5, 6], [6, 6]]); g.p(C.yellow[5], 5, 6);
  g.pts(C.wool[4], [[5, 4], [6, 3], [5, 2], [6, 1], [7, 0]]); g.pts(C.wool[2], [[8, 2], [9, 1]]);
};
// Llaves y herramientas
IT.peine_oro = (g) => {
  for (let x = 3; x <= 13; x += 2) g.r(C.gold[x < 8 ? 4 : 3], x, 7, 1, 5);
  g.tube(C.gold, [[2, 7.4], [8, 4.8], [14, 7.4]], 1.5, { lo: 1, hi: 5, gl: true });
  g.ball(C.mberry, 8, 4.8, 1.3, 1.3, { lo: 2, hi: 6 }); g.pts(WHITE, [[13, 1], [12, 2], [14, 2], [13, 3]]);
};
IT.pluma_oca = (g) => {
  g.tube(C.plate, [[3, 13], [12.6, 2]], (u) => (u < 0.18 ? 0 : 3 * Math.pow(Math.sin(Math.PI * Math.min(1, (u - 0.18) / 0.82)), 0.7)), { lo: 2, hi: 6, rmax: 3.2 });
  g.l(C.bone[2], 2, 14, 12, 2); g.clr(6, 6); g.clr(10, 9); g.clr(13, 6);
};
IT.carta_fiveller = (g) => {
  g.r(C.paper[4], 1, 4, 14, 9); g.r(C.paper[2], 1, 12, 14, 1);
  g.poly(C.paper[5], [[1, 4], [15, 4], [8, 9.6]]); g.l(C.paper[2], 1, 4, 8, 9); g.l(C.paper[2], 14, 4, 8, 9);
  g.l(C.paper[3], 1, 12, 6, 8); g.l(C.paper[3], 14, 12, 10, 8);
  g.pts(C.wax[3], [[7, 11], [9, 11], [6, 12], [10, 12]]); g.ball(C.wax, 8, 9, 2.2, 2.1, { glt: 0.86 }); g.p(C.wax[1], 8, 9); g.p(C.wax[1], 7, 9);
};
IT.llave_casa = (g) => {
  g.tube(C.brass, [[6.2, 6.2], [12.6, 12.6]], 1, { lo: 1, hi: 5 });
  g.r(C.brass[2], 9, 12, 2, 1); g.r(C.brass[2], 11, 13, 1, 2); g.r(C.brass[3], 10, 13, 1, 1);
  g.ball(C.brass, 4.4, 4.4, 3.4, 3.4, { glt: 0.86 }); g.hole(4.4, 4.4, 1.4, 1.4);
};
IT.cana_pescar = (g) => {
  g.tube(C.lwood, [[2, 14.4], [12.6, 1.4]], (u) => 0.95 - u * 0.4, { lo: 1, hi: 5, rmax: 1, fn: (x, y, u, it) => (u < 0.22 ? tone(C.cork, it) : null) });
  g.ball(C.iron, 4.6, 11, 1.5, 1.5, { glt: 0.8 });
  g.l('#d8dce8', 13, 2, 13, 8);
  g.ball(C.red, 13, 10, 1.5, 1.7, { R2: C.plate, split: 10, glt: 0.8 });
};
IT.azada = (g) => {
  g.tube(C.lwood, [[2.4, 14.4], [10.4, 3.4]], 0.85, { lo: 1, hi: 5 });
  g.poly(C.iron[3], [[10.24, 3.48], [8.92, 5.24], [12.92, 8.44], [14.24, 6.68]]); g.poly(C.iron[5], [[10.24, 3.48], [8.92, 5.24], [9.8, 5.9], [11.1, 4.1]]);
  g.l(C.iron[6], 13, 8, 14, 7); g.l(C.iron[1], 10, 6, 12, 8); g.r(C.iron[2], 9, 4, 2, 2);
};
IT.canuto = (g) => {
  g.tube(C.cane, [[3, 12.6], [10.4, 5.2]], 2.3, { lo: 1, hi: 5, fn: (x, y, u) => (Math.abs(u - 0.5) < 0.06 ? C.cane[1] : null) });
  g.ball(C.cork, 11.2, 4.4, 1.7, 1.7, { lo: 1, hi: 5 });
  for (const [x, y] of [[13, 2], [11, 0], [14, 5]]) { g.p(C.glow[6], x, y); g.p(C.glow[4], x, y + 1); }
  g.pts(C.glow[5], [[12, 1], [13, 4]]);
};
// Armas
IT.garrote = (g) => {
  g.tube(C.wood, [[3, 13.2], [11.4, 4]], (u) => 1 + u * 1.9, { lo: 1, hi: 5, rmax: 3 });
  g.pts(C.wood[1], [[9, 6], [10, 8], [7, 8], [11, 5]]); g.pts(C.wood[5], [[8, 5], [10, 3]]); g.r(C.leath[2], 3, 11, 2, 1); g.p(C.leath[2], 4, 12);
};
IT.cuchillo = (g) => {
  g.poly(C.steel[3], [[7, 9.6], [13.8, 1.6], [14.2, 3], [8.6, 10.6]]); g.l(C.steel[6], 7, 9, 13, 2); g.l(C.steel[1], 9, 10, 14, 4);
  g.tube(C.brass, [[5, 8.2], [8.6, 11.4]], 0.7, { lo: 2, hi: 6 });
  g.tube(C.wood, [[3, 13.2], [6, 10.2]], 1.15, { lo: 1, hi: 5 }); g.p(C.brass[4], 2, 14);
};
IT.espada = (g) => {
  g.tube(C.steel, [[6, 10], [13.4, 2.6]], (u) => (u > 0.86 ? (1 - u) * 9 : 1.3), { lo: 1, hi: 6, rmax: 1.4 });
  g.l(C.steel[2], 7, 9, 12, 4);
  g.tube(C.gold, [[3.6, 7.6], [8.4, 12.4]], 0.8, { lo: 2, hi: 6 });
  g.tube(C.leath, [[5.4, 10.6], [3, 13]], 0.8); g.ball(C.gold, 2.6, 13.4, 1.3, 1.3, { lo: 2, hi: 6 });
};
IT.lanza = (g) => {
  g.tube(C.lwood, [[1.6, 14.4], [10, 6]], 0.7, { lo: 1, hi: 5 });
  g.tube(C.steel, [[9.6, 6.4], [14.2, 1.8]], (u) => 1.8 * Math.sin(Math.PI * Math.min(1, u * 1.08 + 0.05)), { lo: 1, hi: 6, rmax: 1.9 });
  g.l(C.iron[2], 7.6, 6.4, 9.6, 8.4); g.pts(C.leath[3], [[8, 8], [7, 9]]);
};
IT.hacha = (g) => {
  g.cyl(C.dwood, 7, 4, 2, 11, { lo: 1, hi: 5 }); g.r(C.brass[4], 7, 11, 2, 1); g.r(C.brass[4], 7, 13, 2, 1);
  g.poly(C.steel[4], [[7, 3.4], [4.6, 2.2], [2.4, 0.4], [0.8, 2.4], [0.4, 5], [0.8, 7.6], [2.4, 9.6], [4.6, 7.8], [7, 6.6]]);
  g.poly(C.steel[2], [[9, 3.4], [11.4, 2.2], [13.6, 0.4], [15.2, 2.4], [15.6, 5], [15.2, 7.6], [13.6, 9.6], [11.4, 7.8], [9, 6.6]]);
  g.l(C.steel[6], 1, 2, 1, 7); g.l(C.steel[5], 2, 1, 3, 1); g.l(C.steel[4], 15, 3, 15, 7);
  g.r(C.iron[2], 6, 2, 4, 6); g.r(C.iron[4], 6, 2, 1, 6); g.pts(C.gold[5], [[7, 3], [8, 4], [7, 5], [8, 6]]);
};
IT.baculo = (g) => {
  g.tube(C.lwood, [[3, 14.2], [10, 4.6]], 0.9, { lo: 1, hi: 5 });
  g.tube(C.lwood, [[10, 4.6], [10.6, 2.4], [12.6, 1.4], [13.8, 2.6], [13, 4.4]], 0.85, { lo: 1, hi: 5 });
  g.ball(C.jade, 11.8, 3, 1.4, 1.4, { lo: 2, hi: 6, glt: 0.7 });
  g.tube(C.leaf, [[8.6, 6.4], [6.6, 4.6]], (u) => 1 * Math.sin(Math.PI * u), { rmax: 1.1 });
  g.pts(C.jade[6], [[14, 0], [10, 0], [15, 4]]);
};
IT.arco = (g) => {
  const P = []; for (let i = 0; i <= 16; i++) { const a = -0.98 + (1.96 * i) / 16; P.push([4 + Math.cos(a) * 7.4, 7.6 + Math.sin(a) * 7]); }
  g.l('#e8e4d8', Math.round(P[0][0]), Math.round(P[0][1]), Math.round(P[16][0]), Math.round(P[16][1]));
  g.tube(C.wood, P, 1.05, { lo: 1, hi: 5, rmax: 1.1, fn: (x, y, u) => (Math.abs(u - 0.5) < 0.1 ? C.leath[3] : null) });
  g.l(C.lwood[4], 2, 7, 12, 7); g.poly(C.steel[4], [[11.6, 5.2], [14.6, 7.5], [11.6, 9.8]]); g.pts(C.red[4], [[1, 6], [2, 6], [1, 8], [2, 8]]);
};
// Ropa
IT.tunica = (g) => garment(g, C.flax, { neck: 'V', belt: C.hemp[2], belt2: C.hemp[4] });
IT.jubon = (g) => {
  garment(g, C.jub, { sleeve: 2, bot: 11.6, flare: 0.1, folds: false });
  g.ball(C.jub, 3.6, 3, 2, 1.8, { gl: false, lo: 2, hi: 5 }); g.ball(C.jub, 11.4, 3, 2, 1.8, { gl: false, lo: 1, hi: 4 });
  for (let y = 3; y < 11; y += 2) g.p(C.gold[5], 7, y); g.r(WHITE, 6, 0, 3, 1); g.pts(C.plate[4], [[5, 1], [9, 1]]);
  g.r(C.jub[1], 4, 11, 7, 1);
};
IT.cota = (g) => {
  garment(g, C.mail, { sleeve: 1, bot: 13, flare: 0.4, folds: false });
  g.retouch((x, y, c) => ((x + y) % 2 === 0 ? darker(rgbHex(c), 0.3) : null));
  for (let x = 3; x < 12; x += 2) g.clr(x, 13);
};
IT.coraza = (g) => {
  g.poly(C.steel[3], [[3, 2], [6, 1.4], [10, 1.4], [13, 2], [12.4, 11], [8, 13.6], [3.6, 11]]);
  g.poly(C.steel[5], [[3, 2], [6, 1.4], [7.4, 1.4], [7.4, 13], [3.6, 11]]); g.poly(C.steel[2], [[9.6, 1.4], [13, 2], [12.4, 11], [9.6, 12.6]]);
  g.l(C.steel[6], 8, 2, 8, 12); g.l(C.steel[1], 9, 3, 9, 12); g.e(C.steel[1], 8, 1.4, 1.6, 0.9);
  g.pts(C.brass[5], [[4, 3], [12, 3], [4, 10], [12, 10]]); g.r(C.leath[3], 3, 7, 1, 2); g.r(C.leath[2], 12, 7, 1, 2); g.pts(WHITE, [[5, 4], [5, 5]]);
};
IT.habito = (g) => {
  g.ball(C.habit, 7.5, 2.8, 4.4, 2.6, { gl: false, lo: 0, hi: 3 });
  garment(g, C.habit, { sleeve: 2, bot: 14.4, flare: 1.4 });
  g.r(C.hemp[4], 4, 8, 7, 1); g.l(C.hemp[3], 9, 9, 9, 13); g.p(C.hemp[5], 9, 13);
};
IT.vestido = (g) => {
  g.ball(C.dress, 3.8, 3, 1.8, 1.6, { gl: false, lo: 2, hi: 5 }); g.ball(C.dress, 11.2, 3, 1.8, 1.6, { gl: false, lo: 1, hi: 4 });
  g.poly(C.dress[3], [[5, 1.4], [10, 1.4], [9.6, 7], [14.4, 14], [0.6, 14], [5.4, 7]]);
  g.poly(C.dress[4], [[5, 1.4], [6.6, 1.4], [6.6, 7], [3, 14], [0.6, 14], [5.4, 7]]); g.poly(C.dress[2], [[8.6, 1.4], [10, 1.4], [9.6, 7], [14.4, 14], [11.4, 14], [8.6, 7]]);
  g.l(C.dress[1], 6, 9, 4, 13); g.l(C.dress[1], 9, 9, 11, 13); g.r(C.dress[1], 5, 7, 5, 1);
  g.e(C.plate[5], 7.5, 1.4, 2.3, 1.1); for (let x = 1; x < 15; x += 2) g.p(C.plate[5], x, 13); g.pts(C.plate[3], [[2, 13], [4, 13], [8, 13], [12, 13]]);
};
IT.delantal = (g) => {
  g.l(C.hemp[3], 4, 1, 6, 4); g.l(C.hemp[3], 11, 1, 9, 4); g.r(C.hemp[3], 0, 7, 3, 1); g.r(C.hemp[3], 13, 7, 3, 1);
  g.poly(C.apron[3], [[5, 3.4], [10, 3.4], [10, 6.6], [12.6, 7], [12, 13.4], [8, 14.4], [3.4, 13.4], [2.8, 7], [5, 6.6]]);
  g.poly(C.apron[4], [[5, 3.4], [6.4, 3.4], [6.4, 14], [3.4, 13.4], [2.8, 7], [5, 6.6]]); g.l(C.apron[2], 11, 8, 11, 13);
  g.r(C.apron[2], 5, 9, 5, 3); g.r(C.apron[1], 5, 9, 5, 1); g.p(C.hemp[4], 7, 10);
};
// Tocados
IT.barretina = (g) => {
  g.tube(C.barr, [[7, 11.6], [7.4, 6], [9, 2.6], [11.6, 2.4], [13, 4.6], [13, 8]], (u) => 4.2 - u * 2.6, { lo: 1, hi: 5, rmax: 4.3 });
  g.l(C.barr[1], 10, 4, 10, 7); g.l(C.barr[1], 10, 7, 11, 9); g.pts(C.barr[5], [[5, 6], [6, 4], [8, 3]]);
  g.r('#3a1a2c', 2, 11, 11, 3); g.r('#5a2a40', 2, 11, 11, 1); g.r('#2a1220', 2, 13, 11, 1);
};
IT.sombrero = (g) => {
  g.ball(C.hat, 8, 10.4, 7, 2.8, { lo: 1, hi: 5, gl: false });
  g.cyl(C.hat, 4.5, 4.6, 7, 5.6, { lo: 1, hi: 5 }); g.ball(C.hat, 8, 4.6, 3.5, 1.7, { lo: 2, hi: 6, gl: false });
  g.r(C.red[2], 4, 8, 8, 1); g.r(C.red[4], 4, 8, 3, 1); g.e(C.hat[1], 8, 4.2, 1.6, 0.6);
};
IT.capucha = (g) => {
  g.poly(C.hood[3], [[1.4, 14.4], [3, 9], [13, 9], [14.6, 14.4]]); g.poly(C.hood[4], [[1.4, 14.4], [3, 9], [6, 9], [4.6, 14.4]]); g.poly(C.hood[2], [[10, 9], [13, 9], [14.6, 14.4], [11.4, 14.4]]);
  g.ball(C.hood, 8, 7.4, 5.4, 5.9, { gl: false });
  g.poly(C.hood[4], [[6.6, 2], [8.4, 0.6], [9.4, 2.4]]);
  g.e(C.hood[0], 8, 8.2, 3.1, 3.7); g.e(INK2, 8, 8.8, 2.4, 3);
};
IT.casco = (g) => {
  g.ball(C.steel, 8, 9.4, 5.6, 6.2, { keep: (x, y) => y < 10, glt: 0.86 });
  g.ball(C.steel, 8, 10.6, 7, 1.9, { lo: 1, hi: 4, gl: false });
  g.r(C.steel[2], 3, 8, 10, 1); g.pts(C.steel[6], [[4, 8], [8, 8], [12, 8]]); g.l(C.steel[5], 8, 3, 8, 7);
};
IT.yelmo_cuernos = (g) => {
  g.tube(C.ivory, [[4.4, 7.4], [2.4, 5], [1.6, 1.6]], (u) => 1.6 - u * 1.2, { lo: 1, hi: 6, rmax: 1.7 });
  g.tube(C.ivory, [[11.6, 7.4], [13.6, 5], [14.4, 1.6]], (u) => 1.6 - u * 1.2, { lo: 1, hi: 6, rmax: 1.7 });
  g.ball(C.steel, 8, 9.8, 4.9, 5.4, { keep: (x, y) => y < 12, glt: 0.86 });
  g.r(INK2, 4, 11, 3, 2); g.r(INK2, 9, 11, 3, 2); g.r(C.brass[3], 3, 10, 10, 1); g.r(C.brass[5], 3, 10, 3, 1); g.r(C.steel[2], 7, 10, 2, 4); g.p(C.steel[5], 7, 10);
};
IT.diadema = (g) => {
  const R2 = C.gold;
  g.ring(R2[2], 8, 9, 6.2, 3.2, 1.2, (x, y) => y < 9);
  for (const [x, h] of [[4.6, 2.2], [8, 3.6], [11.4, 2.2]]) g.poly(R2[4], [[x - 1.4, 10.6], [x, 10.6 - h - 1.4], [x + 1.4, 10.6]]);
  g.ring(R2[4], 8, 9, 6.4, 3.4, 1.6, (x, y) => y >= 9); g.ring(R2[6], 8, 8.8, 6.2, 3.2, 1, (x, y) => y >= 10 && x < 8);
  g.ball(C.red, 8, 8.4, 1.6, 1.6, { glt: 0.78 }); g.pts(WHITE, [[13, 3], [12, 4], [14, 4], [13, 5]]);
};
IT.cofia = (g) => {
  g.l(C.coif[3], 4, 11, 2, 14); g.l(C.coif[3], 12, 11, 14, 14); g.pts(C.coif[5], [[2, 14], [14, 14]]);
  g.ball(C.coif, 8, 6.8, 5.4, 5, { lo: 1, hi: 6, gl: false });
  g.ball(C.coif, 8, 10.4, 6.6, 2.2, { lo: 2, hi: 6, gl: false });
  for (let x = 2; x < 15; x++) if (g.isOn(x, 12)) g.p(x & 1 ? C.coif[2] : C.coif[5], x, 12);
  for (let x = 3; x < 14; x += 2) g.p(C.coif[2], x, 10); g.l(C.coif[2], 4, 3, 7, 2); g.pts(C.pink[4], [[12, 4], [13, 3], [13, 5]]);
};
// Capas
IT.capa = (g) => cape(g, C.capa);
IT.capa_verde = (g) => cape(g, C.capav);
IT.capa_azul = (g) => cape(g, C.capaz);
IT.capa_real = (g) => cape(g, C.capar, { trim: C.gold, ermine: true });
// Amuletos
IT.amuleto = (g) => {
  g.tube(C.leath, [[2, 1.6], [4.6, 6.4], [8, 8.4], [11.4, 6.4], [14, 1.6]], 0.55, { lo: 1, hi: 5, rmax: 0.6 });
  g.ball(C.terra, 4.8, 6.8, 1.1, 1.1, { lo: 2, hi: 6 }); g.ball(C.terra, 11.2, 6.8, 1.1, 1.1, { lo: 2, hi: 6 });
  g.tube(C.ivory, [[8, 9], [7.6, 11.6], [9, 13.6], [10.6, 14.4]], (u) => 1.6 - u * 1.2, { lo: 1, hi: 6, rmax: 1.7 });
};
IT.amuleto_plata = (g) => {
  for (let i = 0; i <= 12; i++) { const t = i / 12; const x = 2 + t * 12, y = 1.6 + Math.sin(Math.PI * t) * 5.6; g.p(i % 2 ? C.silv[5] : C.silv[2], x, y); }
  g.ball(C.silv, 8, 10, 3.7, 3.7, { glt: 0.84 }); g.ring(C.silv[2], 8, 10, 2.7, 2.7, 1); g.ball(C.blue, 8, 10, 1.4, 1.4, { glt: 0.7 });
};
// Libros
IT.lib_consolat = (g) => book(g, C.bblue, EMB.ship);
IT.lib_cronica = (g) => book(g, C.bred, EMB.crown);
IT.lib_herbario = (g) => book(g, C.bgreen, EMB.leaf);
IT.lib_bestiario = (g) => book(g, C.bbrown, EMB.paw);
IT.lib_rondalles = (g) => book(g, C.bpurp, EMB.moon);
IT.lib_alambique = (g) => book(g, C.bteal, EMB.flask);
IT.lib_oficios = (g) => book(g, C.borange, EMB.hammer);
IT.lib_tibidabo = (g) => { book(g, C.bblack, EMB.devil, C.red); g.r(C.bblack[5], 3, 1, 10, 1); g.r(C.bblack[4], 3, 1, 1, 12); };
// Bolsa genérica (objetos desconocidos)
const BAG = (g) => {
  g.ball(C.sack, 8, 9.4, 5.6, 4.8, { gl: false }); g.ball(C.sack, 8, 4.4, 2.6, 1.8, { gl: false, lo: 2, hi: 6 });
  g.r(C.wstem[1], 5, 5, 6, 1); g.p(C.wstem[3], 10, 6); g.pts(C.sack[2], [[5, 10], [9, 12], [11, 8]]);
};

// ───────────── Interfaz (12×12) ─────────────
const UI = {};
// Menú
UI.estado = (g) => { g.ball(C.blue, 6, 10.8, 4.6, 3.4, { gl: false, keep: (x, y) => y <= 10 }); g.ball(C.skin, 6, 4.8, 2.6, 2.8, { gl: false }); g.ball(C.hair, 6, 3.2, 2.9, 1.8, { gl: false, keep: (x, y) => y < 4 }); g.p(INK2, 5, 5); g.p(INK2, 7, 5); };
UI.mochila = (g) => { g.ring(C.leath[2], 6, 2.6, 2.4, 1.8, 1, (x, y) => y < 3); g.ball(C.leath, 6, 7.2, 4.4, 3.8, { gl: false, lo: 1, hi: 5 }); g.r(C.leath[2], 2, 9, 8, 1); g.r(C.leath[3], 3, 9, 6, 2); g.ball(C.leath, 6, 4.6, 4.2, 2.4, { lo: 2, hi: 6, gl: false, keep: (x, y) => y < 6.6 }); g.r(C.leath[1], 2, 6, 8, 1); g.r(C.gold[5], 5, 6, 2, 2); g.p(C.gold[2], 6, 7); g.pts(C.leath[5], [[3, 4], [4, 3]]); };
UI.relaciones = (g) => { g.heart(C.pink, 8.4, 3.8, 1.9); g.heart(C.red, 5, 6.8, 3); };
UI.saber = (g) => { g.poly(C.blue[2], [[0.6, 2.6], [6, 3.6], [11.4, 2.6], [11.4, 9.8], [6, 10.8], [0.6, 9.8]]); g.poly(C.page[5], [[1, 2], [5.6, 3], [5.6, 9.6], [1, 8.6]]); g.poly(C.page[4], [[6.4, 3], [11, 2], [11, 8.6], [6.4, 9.6]]); for (const y of [4, 6]) { g.l(C.page[2], 2, y, 4, y + 0.4); g.l(C.page[2], 7, y + 0.4, 9, y); } g.l(C.page[1], 6, 3, 6, 9); };
UI.diario = (g) => { g.r(C.paper[4], 2, 3, 6, 7); g.r(C.paper[5], 2, 3, 2, 7); g.tube(C.paper, [[1.6, 2.6], [8.4, 2.6]], 1.1, { lo: 2, hi: 6 }); g.tube(C.paper, [[1.6, 10], [8.4, 10]], 1.1, { lo: 2, hi: 6 }); for (const y of [5, 7]) g.l(C.paper[2], 3, y, 6, y); g.tube(C.wool, [[6, 9], [10.6, 1]], (u) => (u < 0.25 ? 0 : 1.6 * Math.sin((Math.PI * (u - 0.25)) / 0.75)), { lo: 2, hi: 6, rmax: 1.7 }); g.l(C.bone[2], 6, 9, 10, 2); };
UI.ecosistema = (g) => { g.tube(C.leaf, [[7.4, 10.4], [10.6, 6.4]], (u) => 1.6 * Math.sin(Math.PI * u), { rmax: 1.7 }); g.ball(C.bbrown, 5, 7.4, 2.4, 2, { gl: false }); for (const [x, y] of [[2.2, 4.6], [4, 3], [6.2, 3], [8, 4.6]]) g.ball(C.bbrown, x, y, 1.1, 1.2, { gl: false, lo: 2, hi: 6 }); };
UI.guardar = (g) => { g.ball(C.inkpot, 4.4, 8.6, 3.2, 2.6, { lo: 0, hi: 4, glt: 0.85 }); g.e(C.inkpot[0], 4.4, 6.4, 1.4, 0.7); g.tube(C.wool, [[5, 6], [10.6, 0.8]], (u) => (u < 0.2 ? 0 : 1.7 * Math.sin((Math.PI * (u - 0.2)) / 0.8)), { lo: 2, hi: 6, rmax: 1.8 }); g.l(C.bone[2], 4, 7, 10, 1); };
UI.opciones = (g) => { for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; g.r(C.iron[k < 4 && k > 0 ? 2 : 4], Math.round(6 + Math.cos(a) * 4.2 - 1), Math.round(6 + Math.sin(a) * 4.2 - 1), 2, 2); } g.ball(C.iron, 6, 6, 3.7, 3.7, { glt: 0.86 }); g.hole(6, 6, 1.5, 1.5); g.ring(C.iron[1], 6, 6, 2.5, 2.5, 1, (x, y) => x + y > 12); };
UI.volver = (g) => { const P = [[9.4, 10.4], [9.4, 5.6]]; for (let i = 1; i <= 12; i++) { const a = -(Math.PI * i) / 12; P.push([6 + Math.cos(a) * 3.4, 5.6 + Math.sin(a) * 3.6]); } g.tube(C.gold, P, 1.1, { lo: 2, hi: 6, rmax: 1.2 }); g.poly(C.gold[4], [[0.2, 5.4], [5, 5.4], [2.6, 9.4]]); g.poly(C.gold[5], [[0.2, 5.4], [2.6, 5.4], [2.6, 9.4]]); };
// Combate
UI.atacar = (g) => { g.tube(C.steel, [[3.6, 8.4], [10.6, 1.4]], (u) => (u > 0.85 ? (1 - u) * 7 : 1.1), { lo: 1, hi: 6, rmax: 1.2 }); g.tube(C.gold, [[1.6, 6.4], [5.6, 10.4]], 0.75, { lo: 2, hi: 6 }); g.tube(C.leath, [[3, 9], [1.4, 10.6]], 0.75); };
UI.conjuro = (g) => { g.star(C.lav[5], 6, 6, 5.4, 1.6, 4, 0); g.star(C.lav[6], 6, 6, 3, 1, 4, 0); g.p(WHITE, 6, 6); g.pts(C.lilac[5], [[10, 1], [9, 2], [10, 2], [11, 2], [10, 3]]); };
UI.objeto = (g) => { g.ball(C.red, 6, 7.6, 3.8, 3.4, { R2: C.glass, split: 6, surf: C.red[5], glt: 0.84 }); g.r(C.glass[4], 5, 2, 2, 2); g.r(C.cork[3], 4, 1, 4, 1); g.p(WHITE, 4, 7); };
UI.accion = (g) => { g.ball(C.plate, 6, 5, 5, 3.8, { lo: 3, hi: 6, gl: false }); g.poly(C.plate[4], [[2.6, 7], [5, 8], [1.6, 10.4]]); for (const x of [3.6, 6, 8.4]) g.r(C.blue[3], Math.round(x) - 1, 5, 1, 1); };
UI.guardia = (g) => { g.poly(C.blue[3], [[1.6, 1.4], [10.4, 1.4], [10.4, 5.4], [6, 10.6], [1.6, 5.4]]); g.poly(C.blue[4], [[1.6, 1.4], [6, 1.4], [6, 10.6], [1.6, 5.4]]); g.l(C.plate[5], 6, 2, 6, 9); g.l(C.plate[5], 2, 4, 10, 4); g.r(C.gold[5], 1, 1, 10, 1); };
UI.huir = (g) => { g.poly(C.leath[3], [[4, 1.4], [7.4, 1.4], [7.4, 7], [10.6, 8], [10.6, 10.4], [3.4, 10.4]]); g.poly(C.leath[4], [[4, 1.4], [5.4, 1.4], [5, 10.4], [3.4, 10.4]]); g.r(C.leath[1], 3, 10, 8, 1); g.r(C.leath[5], 4, 4, 3, 1); g.pts(C.plate[5], [[0, 4], [1, 4], [0, 7], [1, 7], [2, 7]]); };
// Estadísticas
UI.fue = (g) => { g.ball(C.skin, 5.6, 6.4, 4.2, 3.8, { gl: false, lo: 1, hi: 5 }); for (const x of [3, 5, 7]) g.l(C.skin[1], x + 0.6, 3, x + 0.6, 5); g.r(C.skin[5], 2, 3, 7, 1); g.ball(C.skin, 3.6, 8.2, 2.6, 1.4, { gl: false, lo: 2, hi: 6 }); g.l(C.skin[1], 2, 9, 6, 9); g.r(C.blue[3], 3, 10, 6, 2); g.r(C.blue[5], 3, 10, 2, 1); g.pts(C.yellow[5], [[10, 1], [11, 3], [10, 5]]); };
UI.int = (g) => { g.ball(C.lav, 6, 5, 3.8, 3.8, { glt: 0.82, lo: 1, hi: 6 }); g.pts(C.lav[6], [[5, 3], [7, 6]]); g.poly(C.gold[4], [[3, 9], [9, 9], [8, 11], [4, 11]]); g.r(C.gold[2], 4, 10, 4, 1); };
UI.def = (g) => { g.poly(C.steel[3], [[1.6, 1.4], [10.4, 1.4], [10.4, 5.4], [6, 10.6], [1.6, 5.4]]); g.poly(C.steel[5], [[1.6, 1.4], [6, 1.4], [6, 10.6], [1.6, 5.4]]); g.ball(C.steel, 6, 5, 1.6, 1.6, { glt: 0.7 }); g.pts(C.steel[1], [[3, 2], [9, 2]]); };
UI.esp = (g) => { g.ball(C.holy, 6, 7.6, 3.2, 3, { lo: 2, hi: 6, gl: false }); g.tube(C.holy, [[6, 5], [5, 3], [6.6, 1]], (u) => 1.6 - u * 1.4, { lo: 2, hi: 6, rmax: 1.7 }); g.ball(C.plate, 6, 8, 1.6, 1.6, { lo: 4, hi: 6, gl: false }); };
UI.car = (g) => { g.ball(C.plate, 6, 6, 4.6, 4.6, { lo: 2, hi: 6, gl: false }); g.pts(INK2, [[3, 4], [4, 4], [7, 4], [8, 4]]); g.l(INK2, 3, 7, 5, 9); g.l(INK2, 5, 9, 7, 9); g.l(INK2, 7, 9, 9, 7); g.pts(C.pink[4], [[2, 6], [10, 6]]); g.r(C.gold[4], 1, 1, 2, 1); };
UI.nat = (g) => { g.tube(C.leaf, [[2, 10.4], [5, 6], [9.4, 1.6]], (u) => 3.2 * Math.pow(Math.sin(Math.PI * u), 0.8), { lo: 1, hi: 5, rmax: 3.3 }); g.l(C.leaf[5], 2, 10, 8, 3); g.l(C.stem[2], 1, 11, 2, 10); };
UI.his = (g) => { g.r(C.page[5], 1, 1, 10, 2); g.r(C.page[3], 2, 3, 8, 1); g.cyl(C.page, 3, 4, 6, 5, { lo: 1, hi: 5 }); g.l(C.page[2], 5, 4, 5, 8); g.l(C.page[2], 7, 4, 7, 8); g.r(C.page[4], 2, 9, 8, 1); g.r(C.page[2], 1, 10, 10, 1); };
UI.arc = (g) => { g.ball(C.purple, 5.4, 6, 4.4, 4.4, { lo: 2, hi: 6, gl: false }); g.hole(7.6, 4.8, 3.6, 3.8); g.star(C.yellow[5], 9, 7.6, 2.3, 0.9); };
UI.alq = (g) => { g.ball(C.green, 6, 7.6, 3.8, 3.4, { R2: C.glass, split: 6.6, surf: C.green[5], glt: 0.84 }); g.cyl(C.glass, 5, 1, 2, 4, { lo: 2, hi: 6 }); g.r(C.glass[2], 4, 1, 4, 1); g.pts(C.green[6], [[5, 8], [7, 9]]); };
UI.art = (g) => { g.tube(C.lwood, [[2, 10.6], [7.4, 5.2]], 0.9, { lo: 1, hi: 5 }); g.poly(C.iron[3], [[3.4, 3.2], [7, -0.4], [11.2, 3.8], [7.6, 7.4]]); g.poly(C.iron[5], [[3.4, 3.2], [7, -0.4], [8, 0.6], [4.4, 4.2]]); g.l(C.iron[1], 8, 7, 11, 4); };
UI.caz = (g) => { const P = []; for (let i = 0; i <= 10; i++) { const a = -1 + (2 * i) / 10; P.push([2 + Math.cos(a) * 6.4, 6 + Math.sin(a) * 5]); } g.l('#e8e4d8', Math.round(P[0][0]), Math.round(P[0][1]), Math.round(P[10][0]), Math.round(P[10][1])); g.tube(C.wood, P, 0.9, { lo: 1, hi: 5, rmax: 1 }); g.l(C.lwood[4], 1, 6, 10, 6); g.poly(C.steel[4], [[9, 4.6], [11.4, 6], [9, 7.4]]); g.p(C.red[4], 1, 5); g.p(C.red[4], 1, 7); };
UI.com = (g) => { g.r(C.gold[3], 5, 2, 2, 8); g.r(C.gold[5], 1, 2, 10, 1); g.r(C.gold[2], 3, 10, 6, 1); g.l(C.gold[2], 2, 3, 1, 6); g.l(C.gold[2], 2, 3, 3, 6); g.l(C.gold[2], 9, 3, 8, 6); g.l(C.gold[2], 9, 3, 10, 6); g.ball(C.gold, 2, 7, 2, 1.1, { keep: (x, y) => y >= 7, gl: false }); g.ball(C.gold, 9.4, 7, 2, 1.1, { keep: (x, y) => y >= 7, gl: false }); };
// Varios
UI.moneda = (g) => { g.ball(C.coin, 6, 6, 4.5, 4.5, { glt: 0.84 }); g.ring(C.coin[2], 6, 6, 3.4, 3.4, 1); g.r(C.coin[2], 5, 4, 2, 4); g.r(C.coin[5], 5, 4, 1, 4); };
UI.corazon = (g) => g.heart(C.red, 6, 5.6, 3.3);
UI.gota = (g) => { g.ball(C.blue, 6, 7.4, 3.6, 3.2, { glt: 0.84, lo: 1, hi: 6 }); g.poly(C.blue[4], [[3, 6.4], [6, 0.6], [9, 6.4]]); g.poly(C.blue[5], [[4, 6], [6, 1.6], [5.4, 6]]); };
UI.estrella = (g) => { g.star(C.gold[4], 6, 6.4, 5.4, 2.3); g.star(C.gold[6], 5.6, 5.6, 2.2, 1); };
UI.sol = (g) => { for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; g.l(C.coin[k % 2 ? 4 : 5], 6 + Math.cos(a) * 3.4, 6 + Math.sin(a) * 3.4, 6 + Math.cos(a) * 5.2, 6 + Math.sin(a) * 5.2); } g.ball(C.yellow, 6, 6, 3, 3, { lo: 2, hi: 6, glt: 0.8 }); };
UI.luna = (g) => { g.ball(C.henb, 5.2, 6, 4.6, 4.6, { lo: 2, hi: 6, gl: false }); g.hole(7.8, 4.6, 3.9, 4.1); };
UI.reloj = (g) => { g.r(C.wood[4], 1, 1, 10, 1); g.r(C.wood[2], 1, 10, 10, 1); g.poly(C.glass[5], [[2.4, 2], [9.6, 2], [6.6, 6], [9.6, 10], [2.4, 10], [5.4, 6]]); g.poly(C.wheat[4], [[3.6, 10], [8.4, 10], [6, 7.6]]); g.p(C.wheat[4], 6, 6); g.r(C.wheat[5], 4, 3, 4, 1); };
UI.primavera = (g) => { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.ball(C.pink, 6 + Math.cos(a) * 2.6, 6 + Math.sin(a) * 2.6, 2, 2, { gl: false, lo: 2, hi: 6 }); } g.ball(C.yellow, 6, 6, 1.4, 1.4, { lo: 3, hi: 6 }); };
UI.verano = (g) => { g.ball(C.coin, 6, 6.4, 4, 4, { lo: 2, hi: 6, keep: (x, y) => y < 7, glt: 0.8 }); for (const a of [-2.4, -1.57, -0.74]) g.l(C.coin[5], 6 + Math.cos(a) * 4.6, 6.4 + Math.sin(a) * 4.6, 6 + Math.cos(a) * 5.6, 6.4 + Math.sin(a) * 5.6); g.r(C.sky[3], 0, 7, 12, 2); g.pts(C.sky[5], [[1, 7], [2, 7], [6, 7], [7, 7]]); g.r(C.sky[2], 1, 9, 10, 1); };
UI.otono = (g) => { g.tube(C.rovel, [[2, 10], [6, 6], [10, 2]], (u) => 3.6 * Math.pow(Math.sin(Math.PI * u), 0.6), { lo: 1, hi: 5, rmax: 3.7 }); for (const [x, y] of [[3, 4], [8, 9], [2, 7], [9, 6]]) g.clr(x, y); g.l(C.rovel[1], 2, 10, 9, 3); };
UI.invierno = (g) => { for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3 + Math.PI / 2; g.l(C.holy[5], 6 - Math.cos(a) * 5, 6 - Math.sin(a) * 5, 6 + Math.cos(a) * 5, 6 + Math.sin(a) * 5); } for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3 + Math.PI / 2; const x = 6 + Math.cos(a) * 3.4, y = 6 + Math.sin(a) * 3.4; g.p(C.holy[6], x + Math.cos(a + 1.2) * 1.2, y + Math.sin(a + 1.2) * 1.2); g.p(C.holy[6], x + Math.cos(a - 1.2) * 1.2, y + Math.sin(a - 1.2) * 1.2); } g.p(WHITE, 6, 6); };
const cloud = (g, cy = 5) => { g.ball(C.cloud, 4, cy + 1, 2.8, 2.2, { lo: 2, hi: 6, gl: false }); g.ball(C.cloud, 7.4, cy, 3.2, 2.8, { lo: 2, hi: 6, gl: false }); g.ball(C.cloud, 9.6, cy + 1.4, 2, 1.8, { lo: 2, hi: 6, gl: false }); g.r(C.cloud[2], 2, cy + 3, 9, 1); };
UI.nube = (g) => cloud(g, 5);
UI.lluvia = (g) => { cloud(g, 3); for (const [x, y] of [[3, 8], [6, 9], [9, 8], [4, 10], [8, 10]]) { g.p(C.blue[4], x, y); g.p(C.blue[5], x, y - 1); } };
UI.nieve = (g) => { cloud(g, 3); for (const [x, y] of [[3, 8], [6, 9], [9, 8], [4, 10], [8, 10]]) g.p(WHITE, x, y); };
UI.niebla = (g) => { for (const [y, a, b, k] of [[1, 1, 8, 5], [4, 3, 10, 4], [7, 0, 7, 5], [9, 4, 10, 3]]) { g.r(C.cloud[k], a + 1, y, b - a - 1, 2); g.p(C.cloud[k], a, y + 1); g.p(C.cloud[k], b, y + 1); g.r(C.cloud[k - 2], a + 1, y + 1, b - a - 1, 1); } };
UI.viento = (g) => { g.l(C.cloud[4], 1, 4, 7, 4); g.pts(C.cloud[4], [[8, 3], [9, 2], [8, 1], [7, 2]]); g.l(C.cloud[3], 1, 7, 9, 7); g.pts(C.cloud[3], [[10, 8], [10, 9], [9, 10]]); g.l(C.cloud[5], 3, 9, 6, 9); };
UI.check = (g) => { g.tube(C.green, [[1.6, 6], [4.6, 9], [10.4, 2]], 1.25, { lo: 2, hi: 6, rmax: 1.3 }); };
UI.cruz = (g) => { g.tube(C.red, [[2, 2], [10, 10]], 1.25, { lo: 2, hi: 6, rmax: 1.3 }); g.tube(C.red, [[10, 2], [2, 10]], 1.25, { lo: 2, hi: 6, rmax: 1.3 }); };
UI.candado = (g) => { g.ring(C.iron[4], 6, 4.4, 3, 3.4, 1.2, (x, y) => y < 5); g.r(C.brass[3], 2, 5, 8, 6); g.r(C.brass[5], 2, 5, 8, 1); g.r(C.brass[4], 2, 5, 2, 6); g.r(C.brass[1], 2, 10, 8, 1); g.r(INK2, 5, 7, 2, 1); g.p(INK2, 6, 8); };
UI.llave = (g) => { g.tube(C.gold, [[4.4, 6], [10.6, 6]], 0.8, { lo: 2, hi: 6 }); g.r(C.gold[3], 8, 7, 1, 2); g.r(C.gold[3], 10, 7, 1, 3); g.ball(C.gold, 3, 6, 2.4, 2.4, { lo: 2, hi: 6 }); g.hole(3, 6, 0.9, 0.9); };
UI.mapa = (g) => { g.poly(C.paper[5], [[0.6, 2], [4, 1], [4, 10], [0.6, 11]]); g.poly(C.paper[3], [[4, 1], [8, 2], [8, 11], [4, 10]]); g.poly(C.paper[4], [[8, 2], [11.4, 1], [11.4, 10], [8, 11]]); g.pts(C.red[3], [[2, 8], [3, 7], [5, 6], [6, 5]]); g.pts(C.red[4], [[8, 3], [10, 3], [9, 4], [8, 5], [10, 5]]); };
UI.dado = (g) => { const P = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; P.push([6 + Math.cos(a) * 5.6, 6 + Math.sin(a) * 5.6]); } g.poly(C.plate[2], P); g.poly(C.plate[3], [[6, 0.6], [11, 3.4], [6, 3]]); g.poly(C.plate[4], [[6, 0.6], [6, 3], [1, 3.4]]); g.poly(C.plate[5], [[6, 2.6], [9.8, 8.6], [2.2, 8.6]]); g.poly(C.plate[3], [[2.2, 8.6], [9.8, 8.6], [6, 11.4]]); g.l(C.plate[1], 6, 3, 10, 9); g.l(C.plate[1], 2, 9, 10, 9); g.l(C.red[3], 5, 6, 7, 6); g.p(C.red[3], 6, 5); };
UI.seny = (g) => { g.ball(C.teal, 6, 7.4, 3.8, 3.4, { lo: 1, hi: 6, glt: 0.86 }); g.poly(C.teal[4], [[2.6, 6.4], [6, 0.6], [9.4, 6.4]]); g.poly(C.teal[5], [[3.6, 6], [6, 1.6], [5.4, 6]]); g.l(C.teal[6], 4, 8, 5, 8); g.l(C.teal[6], 6, 9, 8, 9); g.p(WHITE, 4, 5); };
UI.rauxa = (g) => { g.poly(C.red[3], [[6, 0.6], [9.6, 5], [9.4, 9.4], [6, 11.2], [2.6, 9.4], [2.4, 5.6], [4, 6.6]]); g.poly(C.rovel[4], [[6, 3], [8.4, 6.4], [8, 9.4], [6, 10.4], [4, 9.4], [4.4, 7.4]]); g.poly(C.yellow[5], [[6, 6], [7.4, 8.4], [6, 10], [4.6, 8.4]]); g.pts(C.red[4], [[10, 2], [11, 1], [1, 3], [0, 2]]); };
// Intenciones del enemigo
UI.i_ataque = (g) => { g.tube(C.steel, [[3.4, 8.6], [10.6, 1.4]], (u) => (u > 0.85 ? (1 - u) * 7 : 1.1), { lo: 1, hi: 6, rmax: 1.2 }); g.tube(C.red, [[1.4, 6.6], [5.4, 10.6]], 0.75, { lo: 2, hi: 6 }); g.ball(C.red, 1.6, 10.4, 1, 1, { lo: 2, hi: 6 }); };
UI.i_fuerte = (g) => { const sw = (a, b, c2, d) => g.tube(C.steel, [[a, b], [c2, d]], 0.9, { lo: 1, hi: 6, rmax: 1 }); sw(2, 10, 10.4, 1.6); sw(10, 10, 1.6, 1.6); g.tube(C.red, [[0.6, 7.6], [4.4, 11.4]], 0.7, { lo: 2, hi: 6 }); g.tube(C.red, [[11.4, 7.6], [7.6, 11.4]], 0.7, { lo: 2, hi: 6 }); };
UI.i_defensa = (g) => { g.poly(C.blue[3], [[1.6, 1.4], [10.4, 1.4], [10.4, 5.4], [6, 10.6], [1.6, 5.4]]); g.poly(C.blue[5], [[1.6, 1.4], [6, 1.4], [6, 10.6], [1.6, 5.4]]); g.l(C.gold[5], 6, 2, 6, 9); g.r(C.gold[5], 1, 1, 10, 1); };
UI.i_huida = (g) => { for (let k = 0; k < 4; k++) g.tube(C.cloud, [[2.4, 9.4 - k * 0.6], [4 + k * 2, 2.2 + k * 1.2]], (u) => 1.4 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05)), { lo: 2, hi: 6, rmax: 1.5 }); g.pts(C.cloud[2], [[3, 8], [4, 7]]); };
UI.i_especial = (g) => { const P = []; for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 3.4; const r = 0.6 + (i / 18) * 4.6; P.push([6 + Math.cos(a) * r, 6 + Math.sin(a) * r]); } g.tube(C.purple, P, 0.8, { lo: 2, hi: 6, rmax: 0.9 }); g.star(C.yellow[5], 6, 6, 2.2, 0.9); };
UI.i_duda = (g) => { g.t(3, 1, ['.yyyy.', 'yy..yy', '....yy', '...yy.', '..yy..', '..yy..', '......', '..yy..', '..yy..'], { y: C.yellow[4] }); g.pts(C.yellow[6], [[4, 1], [3, 2]]); };
UI.i_carga = (g) => { for (const [y, c] of [[5.4, C.rovel[3]], [9.4, C.rovel[5]]]) g.tube(C.rovel, [[1.6, y + 1.6], [6, y - 2.6], [10.4, y + 1.6]], 1.05, { lo: 2, hi: 6, rmax: 1.1, fn: () => c }); };
UI.i_robo = (g) => { g.ball(C.coin, 8.2, 3.6, 2.6, 2.6, { glt: 0.8 }); g.r(C.coin[2], 8, 3, 1, 2); g.ball(C.skin, 4.6, 8, 3.2, 2.6, { gl: false }); for (const x of [2, 4, 6]) g.r(C.skin[4], x, 4.6, 1.4, 3); g.pts(C.skin[1], [[3, 7], [5, 7]]); };
UI.i_sombra = (g) => { g.ball(C.purple, 6, 6, 5.4, 3.4, { lo: 0, hi: 3, gl: false }); g.ball(C.red, 6, 6, 2.1, 2.1, { lo: 2, hi: 6, glt: 0.7 }); g.r(INK, 6, 5, 1, 3); g.pts(C.purple[0], [[1, 3], [11, 3], [2, 9], [10, 9]]); };
UI.i_cura = (g) => { g.heart(C.green, 6, 5.8, 3.3, { gl: false }); g.r(WHITE, 5, 3, 2, 6); g.r(WHITE, 3, 5, 6, 2); };
export const UI_ICONS = Object.keys(UI);

// ───────────── Conjuros (16×16) ─────────────
const SPL = {};
const flame = (g, cx, base, w, h, c) => g.poly(c, [[cx, base - h], [cx + w * 0.55, base - h * 0.55], [cx + w * 0.62, base - h * 0.18], [cx + w * 0.38, base], [cx - w * 0.38, base], [cx - w * 0.62, base - h * 0.18], [cx - w * 0.5, base - h * 0.5], [cx - w * 0.18, base - h * 0.38]]);
SPL.chispa = (g) => {
  const F = C.rovel; flame(g, 8, 14.6, 10, 13.6, C.red[3]); flame(g, 8.2, 14.4, 7.4, 10.4, F[3]); flame(g, 8.2, 14, 5, 7.4, F[5]); flame(g, 8.4, 13.6, 2.8, 4.4, C.yellow[6]);
  g.pts(C.yellow[5], [[3, 3], [13, 4], [12, 1], [2, 6]]); g.pts(C.red[4], [[4, 4], [13, 5]]);
};
SPL.escarcha = (g) => {
  const I = R('#8ad8f4');
  for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3 + Math.PI / 2; g.tube(I, [[8 - Math.cos(a) * 6.4, 8 - Math.sin(a) * 6.4], [8 + Math.cos(a) * 6.4, 8 + Math.sin(a) * 6.4]], 0.75, { lo: 3, hi: 6, rmax: 0.8 }); }
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3 + Math.PI / 2; const x = 8 + Math.cos(a) * 4.2, y = 8 + Math.sin(a) * 4.2; for (const s of [1, -1]) g.l(I[5], x, y, x + Math.cos(a + s * 0.9) * 2, y + Math.sin(a + s * 0.9) * 2); }
  g.ball(I, 8, 8, 1.8, 1.8, { lo: 3, hi: 6 }); g.p(WHITE, 8, 8);
};
SPL.sanar = (g) => {
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; g.l(C.glow[5], 8 + Math.cos(a) * 3.6, 5 + Math.sin(a) * 3.4, 8 + Math.cos(a) * 5.4, 5 + Math.sin(a) * 4.8); }
  g.ball(C.glow, 8, 5, 3.2, 3, { lo: 3, hi: 6, glt: 0.6 });
  g.poly(C.skin[3], [[1, 10], [4, 9], [7.6, 11], [7.6, 14.4], [3, 14.4]]); g.poly(C.skin[4], [[1, 10], [4, 9], [5.6, 10], [2.4, 11.4]]);
  g.poly(C.skin[2], [[15, 10], [12, 9], [8.4, 11], [8.4, 14.4], [13, 14.4]]); g.l(C.skin[1], 8, 11, 8, 14);
};
SPL.calmar = (g) => {
  const P = C.bbrown; g.ball(P, 6, 10.6, 3.4, 2.8, { gl: false });
  for (const [x, y] of [[2, 7], [4.2, 5], [7.4, 5], [9.6, 7]]) g.ball(P, x, y, 1.4, 1.5, { gl: false, lo: 2, hi: 6 });
  g.r(C.blue[3], 12, 1, 1, 7); g.pts(C.blue[3], [[13, 2], [14, 3], [14, 4]]); g.ball(C.blue, 11, 7.6, 1.8, 1.4, { glt: 0.7 });
};
SPL.fuego_sant_elm = (g) => {
  g.cyl(C.wood, 7, 6, 2, 9, { lo: 1, hi: 5 }); g.r(C.wood[3], 2, 9, 12, 1); g.r(C.wood[5], 2, 9, 5, 1); g.l(C.hemp[2], 3, 10, 7, 14); g.l(C.hemp[2], 13, 10, 9, 14);
  const B = R('#6a8cf8'); flame(g, 8, 7, 7, 7, B[2]); flame(g, 8, 6.6, 5, 5.6, B[4]); flame(g, 8, 6.4, 2.6, 3.4, B[6]);
  g.pts(B[5], [[3, 3], [13, 2], [12, 5], [4, 6]]); g.pts(WHITE, [[3, 2], [13, 1]]);
};
SPL.bendicion = (g) => {
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; g.l(C.yellow[k % 2 ? 4 : 6], 8 + Math.cos(a) * 4.4, 8.6 + Math.sin(a) * 4.4, 8 + Math.cos(a) * 6.8, 8.6 + Math.sin(a) * 6.8); }
  g.ring(C.gold[5], 8, 2.6, 3.6, 1.4, 1);
  g.r(C.gold[4], 7, 4, 2, 10); g.r(C.gold[4], 4, 7, 8, 2); g.r(C.gold[6], 7, 4, 1, 10); g.r(C.gold[6], 4, 7, 8, 1); g.r(C.gold[2], 8, 9, 1, 5);
};
const BOOK_ICON = (g) => book(g, C.bpurp, EMB.moon);

// ───────────── Bocadillos de emoción (13×13) ─────────────
const BUB = ['..kkkkkkkkk..', '.kwwwwwwwwwk.', 'kwwwwwwwwwwwk', 'kwwwwwwwwwwwk', 'kwwwwwwwwwwwk', 'kwwwwwwwwwwwk', 'kwwwwwwwwwwwk', 'kwwwwwwwwwwwk', 'kwwwwwwwwwssk', '.kssssssssk..', '..kwwkkkkkk..', '..kwk........', '..kk.........'];
const EM = {
  '!': (g, f) => { const y = f ? 1 : 2; g.r(C.red[4], 5, y, 2, 4); g.r(C.red[2], 6, y, 1, 4); g.r(C.red[4], 5, y + 5, 2, 1); g.p(C.red[6], 5, y); },
  '?': (g, f) => g.t(4, f ? 1 : 2, ['.bbb.', 'b...b', '...bb', '..bb.', '.....', '..b..'], { b: C.blue[3] }),
  heart: (g, f) => g.heart(C.red, 6.5, 4.8, f ? 3 : 2.5, { lo: 2 }),
  note: (g, f) => g.t(3, f ? 1 : 2, ['....kk.', '....k.k', '....k..', '....k..', '.kkkk..', '.kkk...'], { k: INK2 }),
  anger: (g, f) => g.t(f ? 2 : 3, f ? 1 : 2, f ? ['.rr...rr.', 'rr.....rr', '.........', '.........', 'rr.....rr', '.rr...rr.'] : ['.r...r.', 'rr...rr', '.......', 'rr...rr', '.r...r.'], { r: C.red[3] }),
  sweat: (g, f) => { const y = f ? 3 : 2; g.ball(C.sky, 7, y + 3, 2, 2, { lo: 2, hi: 6, glt: 0.7 }); g.poly(C.sky[4], [[5.4, y + 2.6], [7, y - 0.4], [8.6, y + 2.6]]); g.pts(C.sky[3], [[3, 3], [3, 4], [10, 7]]); },
  zzz: (g, f) => g.t(2, f ? 1 : 2, f ? ['.....bbb.', '.......b.', 'bbbb..b..', '...b.bbb.', '..b......', 'bbbb.....'] : ['bbbb.....', '...b.bbb.', '..b....b.', 'bbbb..b..', '.....bbb.', '.........'], { b: C.blue[3] }),
  dots: (g, f) => { for (const [i, x] of [[0, 3], [1, 6], [2, 9]]) if (f || i < 2) g.r(INK2, x - 1, 5, 2, 2); },
  idea: (g, f) => { g.star(C.yellow[4], 6.5, 5, f ? 3.6 : 3, f ? 1.4 : 1.2, 4, f ? Math.PI / 4 : 0); g.p(WHITE, 6, 4); g.pts(C.yellow[5], f ? [[2, 2], [10, 2]] : [[3, 1], [9, 7]]); },
  star: (g, f) => { g.star(C.gold[4], 6.5, 5.2, 3.6, 1.6); g.p(C.gold[6], 5, 4); if (f) g.pts(WHITE, [[10, 1], [10, 2], [9, 2]]); },
  music2: (g, f) => g.t(2, f ? 1 : 2, ['..pppppp.', '..p....p.', '..p....p.', '.pp...pp.', 'ppp..ppp.', '.p....p..'], { p: C.purple[3] }),
  cold: (g, f) => { for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3 + Math.PI / 2 + (f ? 0.26 : 0); g.l(C.sky[3], 6.5 - Math.cos(a) * 3.2, 5 - Math.sin(a) * 3.2, 6.5 + Math.cos(a) * 3.2, 5 + Math.sin(a) * 3.2); } g.p(WHITE, 6, 5); g.pts(C.sky[4], f ? [[1, 3], [11, 7]] : [[2, 3], [10, 7]]); },
};
export const EMOTES = Object.keys(EM);

// ───────────── API pública ─────────────
const cache = new Map();
const get = (key, w, h, f, ol) => { let c = cache.get(key); if (!c) { c = make(w, h, f, ol); cache.set(key, c); } return c; };
export const itemIcon = (id) => get('i:' + id, 16, 16, IT[id] || BAG);
export const uiIcon = (name) => get('u:' + name, 12, 12, UI[name] || UI.i_duda);
export const spellIcon = (id) => get('s:' + id, 16, 16, SPL[id] || BOOK_ICON);
export const emote = (name, frame = 0) => get('e:' + name + (frame & 1), 13, 13, (g) => { g.t(0, 0, BUB, { s: C.paper[5] }); (EM[name] || EM['?'])(g, frame & 1); }, null);
export const hasItemIcon = (id) => !!IT[id];
