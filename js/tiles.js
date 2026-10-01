// Tiles de 16x16 pintados en código con variantes por coordenada (hash) y dos fotogramas de agua.
import { hash2, shade } from './util.js';

export const TS = 16;

// Propiedades de cada código de tile
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

const C = {
  g1: '#5cb04c', g2: '#48983e', g3: '#7cc85a', g4: '#3a7a36',
  f1: '#3e7a3a', f2: '#346a32', f3: '#4e8c42',
  d1: '#d8b878', d2: '#c09a5c', d3: '#e8d098',
  c1: '#a8a098', c2: '#8a8278', c3: '#c4bcb0', c4: '#6e665e',
  p1: '#d8c8a8', p2: '#c0ac88', p3: '#ece0c4',
  s1: '#ecd8a0', s2: '#d8c080', s3: '#f8ecc4',
  w1: '#4890d8', w2: '#3878c0', w3: '#80c0f0', W1: '#2e62a8', W2: '#244e90',
  t1: '#2e7a3a', t2: '#246030', t3: '#48a050', tk: '#6a4a2a',
  r1: '#9a9490', r2: '#7a746e', r3: '#c0bab2', m1: '#8a7a68', m2: '#6e6050', m3: '#a8987e',
  H1: '#c8b488', H2: '#a89468', H3: '#e0d0a8', H4: '#7e6c4c',
  o: '#1c1424',
};

function N(x, y, s) { return hash2(x, y, s); }

export const tileCtx = { biome: 'pradera', tree: null };
export function drawTile(ctx, code, px, py, tx, ty, fr = 0, nb = null) {
  const forest = tileCtx.biome === 'bosque';
  const P = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(px + x, py + y, w, h); };
  const v = N(tx, ty, 1);
  const specks = (cols, n, seed) => { for (let i = 0; i < n; i++) { const a = N(tx * 7 + i, ty * 3 + seed, i); const b = N(tx + i * 5, ty * 11 + seed, i + 9); P(cols[i % cols.length], Math.floor(a * 16), Math.floor(b * 16)); } };
  const grass = (base = forest ? C.f1 : C.g1, dark = forest ? C.f2 : C.g2, lite = forest ? C.f3 : C.g3) => {
    P(base, 0, 0, 16, 16);
    for (let i = 0; i < 6; i++) { const a = Math.floor(N(tx, ty, i) * 14), b = Math.floor(N(ty, tx, i + 3) * 14) + 1; P(dark, a, b, 1, 1); P(dark, a + 1, b - 1, 1, 1); P(lite, a + 1, b + 1); }
  };
  switch (code) {
    case '.': grass(); if (v > 0.85) { P(C.g3, 4, 9, 1, 2); P(C.g3, 5, 8); P(C.g3, 3, 8); } break;
    case 'u': grass('#a8b060', '#8e9448', '#c4c878'); break;
    case ',': grass(C.f1, C.f2, C.f3); if (v > 0.7) { P('#7a5a3a', 5, 10, 3, 1); P('#5a3e2a', 6, 11, 2, 1); } if (v < 0.12) { P('#c84a3a', 9, 6, 2, 2); P('#f0e0d0', 10, 6); } break;
    case '"': {
      grass(); const tall = C.g4;
      for (let k = 0; k < 4; k++) { const ox = (k % 2) * 8, oy = Math.floor(k / 2) * 8; const sw = fr ? 1 : 0;
        P(tall, ox + 1 + sw, oy + 2, 1, 5); P(C.g2, ox + 3, oy + 1, 1, 6); P(tall, ox + 5 - sw, oy + 2, 1, 5); P(C.g3, ox + 3, oy + 1); P(C.g2, ox, oy + 7, 7, 1); }
      break;
    }
    case '*': {
      grass(); const cols = [['#f05858', '#ffe060'], ['#f8f8f0', '#f0d040'], ['#8870e0', '#f8e880'], ['#f8a0c8', '#ffffff']][Math.floor(v * 4)];
      for (let i = 0; i < 4; i++) { const a = 2 + Math.floor(N(tx, ty, i + 20) * 11), b = 2 + Math.floor(N(tx, ty, i + 30) * 11); P(cols[0], a - 1, b); P(cols[0], a + 1, b); P(cols[0], a, b - 1); P(cols[0], a, b + 1); P(cols[1], a, b); }
      break;
    }
    case ':': case 'r': {
      const b1 = code === 'r' ? '#b8ac98' : C.d1, b2 = code === 'r' ? '#9a8e7a' : C.d2, b3 = code === 'r' ? '#d4cab8' : C.d3;
      P(b1, 0, 0, 16, 16); specks([b2, b2, b3], code === 'r' ? 14 : 8, 5);
      if (nb) edgeGrass(P, nb, code, v); break;
    }
    case 'l': P('#7a6048', 0, 0, 16, 16); specks(['#6a5038', '#8e7458', '#5a4430'], 10, 2); break;
    case '=': {
      P(C.c2, 0, 0, 16, 16);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        const ox = c * 6 - (r % 2) * 3, oy = r * 4; const col = [C.c1, C.c3, C.c1][Math.floor(N(tx * 3 + c, ty * 4 + r, 2) * 3)];
        P(col, ox + 1, oy + 1, 4, 2); P(shade(col, 1.15), ox + 1, oy + 1, 3, 1);
      }
      break;
    }
    case '+': {
      P(C.p2, 0, 0, 16, 16); P(C.p1, 1, 1, 6, 6); P(C.p1, 9, 1, 6, 6); P(C.p1, 1, 9, 6, 6); P(C.p1, 9, 9, 6, 6);
      P(C.p3, 1, 1, 5, 1); P(C.p3, 9, 9, 5, 1); if (v > 0.8) P(C.p2, 3, 3, 2, 1); break;
    }
    case 's': P(C.s1, 0, 0, 16, 16); specks([C.s2, C.s3, C.s2], 9, 7); if (v > 0.9) { P('#f0b0a0', 6, 7, 2, 1); P('#fff0e0', 6, 7); } if (nb) edgeWater(P, nb, fr); break;
    case '~': case 'w': case 'W': case 'p': {
      const deep = code === 'W', b = deep ? C.W1 : C.w1, d = deep ? C.W2 : C.w2;
      P(b, 0, 0, 16, 16);
      const o = fr ? 4 : 0;
      for (let r = 0; r < 3; r++) { const yy = (r * 6 + 2 + (N(tx, ty, r) > 0.5 ? 1 : 0)) % 16; P(d, (o + r * 5) % 16, yy, 4, 1); P(C.w3, (o + r * 5 + 8) % 13, (yy + 3) % 16, 3, 1); }
      if (code === '~') { P(shade(b, 1.12), 0, 0, 16, 1); }
      if (code === 'p' || (deep && v > 0.9)) { P('#2e6a4a', 3, 9, 1, 5); P('#2e6a4a', 6, 8, 1, 6); P('#3e7e52', 10, 10, 1, 4); }
      if (nb) shore(P, nb);
      break;
    }
    case 'm': grass('#6a9a50', '#4e7e40', '#8ab868'); for (let i = 0; i < 5; i++) { const a = 1 + i * 3; P('#5a7a3a', a, 3 + (i % 2) * 2, 1, 10); P('#8a6a3a', a, 2 + (i % 2) * 2, 1, 2); } break;
    case 'C': grass('#6a9a50', '#4e7e40', '#8ab868'); for (let i = 0; i < 8; i++) { const a = i * 2; P('#8aa048', a, 0, 1, 16); P('#6a8030', a + 1, 2 + (i % 3), 1, 14); } break;
    case 'T': case 'O': case 'Q': {
      grass(code === 'O' ? '#a8b060' : C.f1, C.f2, C.f3);
      const crown = code === 'O' ? '#7a9a6a' : code === 'Q' ? '#5a9a3a' : C.t1, cs = code === 'O' ? '#5a7a52' : code === 'Q' ? '#437a2c' : C.t2, cl = code === 'O' ? '#a0bc8a' : code === 'Q' ? '#7cbc56' : C.t3;
      P(code === 'O' ? '#7a6a5a' : C.tk, 7, 11, 2, 5); P(shade(C.tk, 0.7), 8, 12, 1, 4);
      P(crown, 2, 2, 12, 9); P(crown, 1, 4, 14, 5); P(crown, 4, 1, 8, 11);
      const tn = tileCtx.tree; // copas que se tocan con las vecinas: bosque continuo
      if (tn?.left) P(crown, 0, 3, 3, 7); if (tn?.right) P(crown, 13, 3, 3, 7); if (tn?.up) P(crown, 3, 0, 10, 3);
      P(cs, 2, 8, 12, 3); P(cs, 4, 11, 8, 1); if (tn?.left) P(cs, 0, 8, 3, 2); if (tn?.right) P(cs, 13, 8, 3, 2);
      P(cl, 4, 2, 4, 2); P(cl, 3, 4, 2, 2); if (v > 0.5) P(cl, 9, 3, 2, 1);
      if (code === 'O' && v > 0.4) { P('#3a4a2a', 5, 6); P('#3a4a2a', 10, 5); }
      if (!tn?.left && !tn?.right) outlineRect(P, 1, 1, 14, 11); else P('rgba(28,20,36,0.45)', tn?.left ? 0 : 1, 12, tn?.left && tn?.right ? 16 : 14, 1);
      break;
    }
    case 'P': {
      grass(C.f1, C.f2, C.f3);
      P(C.tk, 7, 13, 2, 3);
      const pc = '#2a6a4a', ps = '#1e5238', pl = '#3e8a5e';
      for (let r = 0; r < 12; r++) { const w = 2 + Math.floor(r * 0.9) + (r % 4 === 3 ? -2 : 0); P(r % 4 >= 2 ? ps : pc, 8 - w, 1 + r, w * 2, 1); }
      P(pl, 7, 2, 1, 3); P(pl, 5, 7, 2, 1); P(o(), 7, 0, 2, 1);
      break;
    }
    case 'B': grass(); P('#3a8a3a', 2, 4, 12, 10); P('#3a8a3a', 4, 3, 8, 12); P('#2a6a2e', 3, 10, 10, 3); P('#5aaa4a', 5, 4, 3, 2); if (v > 0.6) { P('#c83a4a', 6, 8); P('#c83a4a', 10, 6); P('#c83a4a', 9, 10); } outlineRect(P, 2, 3, 12, 12); break;
    case 'R': grass(); P(C.r2, 2, 5, 12, 9); P(C.r1, 3, 4, 10, 8); P(C.r3, 4, 5, 5, 2); P(shade(C.r2, 0.8), 3, 11, 10, 2); outlineRect(P, 2, 4, 12, 10); break;
    case 'M': {
      P(C.m1, 0, 0, 16, 16);
      for (let r = 0; r < 4; r++) { const oy = r * 4; P(C.m2, 0, oy + 3, 16, 1); const cut = Math.floor(N(tx, ty + r, 4) * 12); P(C.m2, cut, oy, 1, 3); P(C.m3, (cut + 5) % 15, oy, 3, 1); }
      break;
    }
    case 'n': P('#eef4f8', 0, 0, 16, 16); specks(['#cfdce8', '#ffffff', '#dfe8f0'], 7, 9); break;
    case 'K': P('#eef4f8', 0, 0, 16, 16); P(C.r2, 2, 6, 12, 8); P(C.r1, 3, 5, 10, 7); P('#ffffff', 4, 4, 7, 2); P(C.r3, 4, 6, 4, 1); P(shade(C.r2, 0.8), 3, 11, 10, 2); outlineRect(P, 2, 4, 12, 10); break;
    case 'H': {
      P(C.H2, 0, 0, 16, 16);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const ox = c * 8 - (r % 2) * 4; P(C.H1, ox + 1, r * 4 + 1, 6, 2); P(C.H3, ox + 1, r * 4 + 1, 5, 1); }
      P(C.H4, 0, 15, 16, 1); break;
    }
    case 'Z': P(C.H2, 0, 4, 16, 12); P(C.H1, 0, 0, 5, 6); P(C.H1, 11, 0, 5, 6); P(C.H3, 0, 0, 4, 1); P(C.H3, 11, 0, 4, 1); P(C.H1, 1, 8, 14, 2); P(C.H4, 0, 15, 16, 1); break;
    case 'a': P('#8a5a36', 0, 0, 16, 16); for (let r = 0; r < 4; r++) { P('#6e4428', 0, r * 4 + 2, 16, 1); P('#a0703e', 0, r * 4, 16, 1); } break;
    case 'A': P('#8a5a36', 0, 0, 16, 16); for (let i = 0; i < 5; i++) { const x = 1 + i * 3; P('#d8b040', x, 2 + (fr && i % 2 ? 1 : 0), 2, 12); P('#f0d060', x, 2, 1, 4); P('#a88428', x + 1, 9, 1, 5); } break;
    case 'V': grass('#9ab060', '#7e944a', '#b4c878'); P('#6a4a2a', 7, 3, 2, 13); P('#3e7a36', 3, 3, 10, 7); P('#5a9a42', 4, 3, 5, 2); P('#6a2a5a', 5, 7, 2, 2); P('#6a2a5a', 10, 6, 2, 2); P('#8a4a7a', 5, 7); outlineRect(P, 3, 3, 10, 7); break;
    case 'k': case 'q': {
      if (code === 'k') P(C.W1, 0, 0, 16, 16);
      P('#9a6a3e', 0, 0, 16, 16);
      for (let i = 0; i < 4; i++) { P('#b88450', 0, i * 4, 16, 3); P('#7a522e', 0, i * 4 + 3, 16, 1); P('#5a3a22', (i * 7 + 3) % 16, i * 4 + 1); }
      if (code === 'q') { P('#6a4424', 0, 0, 16, 1); P('#6a4424', 0, 15, 16, 1); }
      break;
    }
    case 'F': grass(); P('#9a6a3e', 0, 6, 16, 2); P('#9a6a3e', 0, 11, 16, 2); P('#b88450', 2, 4, 2, 11); P('#b88450', 12, 4, 2, 11); P('#6a4424', 0, 8, 16, 1); break;
    case 'L': P(C.c2, 0, 0, 16, 16); P('#3a3a44', 7, 5, 2, 11); P('#2a2a34', 5, 14, 6, 2); P('#3a3a44', 5, 1, 6, 5); P(fr ? '#ffe89a' : '#ffd870', 6, 2, 4, 3); P('#fff8d8', 7, 2, 1, 1); break;
    case 'f': {
      P(C.p2, 0, 0, 16, 16); P('#8a8a90', 1, 3, 14, 12); P(C.w1, 2, 4, 12, 9); P(C.w3, 3 + (fr ? 2 : 0), 6, 3, 1); P(C.w3, 8 - (fr ? 2 : 0), 10, 3, 1);
      P('#a0a0a8', 6, 0, 4, 8); P('#c8c8d0', 6, 0, 2, 1); P(C.w3, 7, 7 + (fr ? 1 : 0), 2, 3); outlineRect(P, 1, 3, 14, 12); break;
    }
    case 'x': grass('#8a9a60', '#6e7e48', '#a8b878'); P('#a8a08e', 1, 6, 6, 9); P('#a8a08e', 9, 3, 6, 12); P('#c8c0ae', 2, 6, 4, 1); P('#c8c0ae', 10, 3, 4, 1); P('#7a7262', 9, 8, 6, 1); P('#5a8a3a', 11, 10, 2, 3); outlineRect(P, 1, 3, 14, 12); break;
    case 'Y': grass(); P('#8a8680', 5, 1, 6, 14); P('#a8a49c', 6, 1, 3, 13); P('#6e6a62', 9, 3, 2, 12); P('#4a8a8a', 7, 5, 1, 1); P('#4a8a8a', 7, 8, 2, 1); P('#4a8a8a', 6, 11, 1, 1); outlineRect(P, 5, 1, 6, 14); break;
    case 'c': P(C.m1, 0, 0, 16, 16); P('#1a1418', 3, 4, 10, 12); P('#1a1418', 5, 2, 6, 2); P(C.m3, 2, 3, 1, 13); P(C.m2, 13, 3, 1, 13); break;
    case 'i': P('#b07a48', 0, 0, 16, 16); for (let i = 0; i < 4; i++) { P('#9a6638', 0, i * 4 + 3, 16, 1); P('#7e5230', ((i * 5 + tx * 3) % 12) + 2, i * 4, 1, 3); P('#c48a54', 0, i * 4, 16, 1); } break;
    case 'I': P('#9a948c', 0, 0, 16, 16); P('#b4aea4', 1, 1, 14, 14); P('#c8c2b8', 1, 1, 13, 1); P('#8a847c', 1, 14, 14, 1); if (v > 0.7) P('#a09a90', 5, 6, 3, 2); break;
    case 'v': P('#9a2a34', 0, 0, 16, 16); P('#b83a44', 1, 1, 14, 14); P('#e0b050', 2, 2, 12, 1); P('#e0b050', 2, 13, 12, 1); P('#7a1a24', 7, 6, 2, 4); break;
    case 'j': P('#6a5a4a', 0, 0, 16, 16); P('#8a7862', 0, 0, 16, 11); P('#9a8870', 0, 0, 16, 1); P('#5a4a3a', 0, 11, 16, 2); P('#4a3a2e', 0, 13, 16, 3); for (let i = 0; i < 2; i++) P('#7a6852', i * 8 + 3, 2, 1, 8); break;
    case 'e': P('#b07a48', 0, 0, 16, 16); P('#8a3a2a', 2, 4, 12, 9); P('#a84a36', 3, 5, 10, 7); P('#f0d8a0', 7, 12, 2, 2); break;
    case '#': P('#0e0a12', 0, 0, 16, 16); break;
    default: P('#ff00ff', 0, 0, 16, 16);
  }
}

function o() { return C.o; }
function outlineRect(P, x, y, w, h) {
  // Contorno suave aproximado para objetos de tile (sin pasar por getImageData por rendimiento).
  P('rgba(28,20,36,0.55)', x, y + h, w, 1); P('rgba(28,20,36,0.35)', x + w, y + 1, 1, h - 1);
}
function edgeGrass(P, nb, code, v) {
  const g = C.g1, g2 = C.g2;
  if (nb.up === 'g') { P(g, 0, 0, 16, 2); P(g2, 0, 2, 16, 1); for (let i = 0; i < 16; i += 3) P(g, i, 2); }
  if (nb.down === 'g') { P(g, 0, 14, 16, 2); P(g2, 0, 13, 16, 1); for (let i = 1; i < 16; i += 3) P(g, i, 13); }
  if (nb.left === 'g') { P(g, 0, 0, 2, 16); P(g2, 2, 0, 1, 16); }
  if (nb.right === 'g') { P(g, 14, 0, 2, 16); P(g2, 13, 0, 1, 16); }
}
function edgeWater(P, nb, fr) {
  const foam = '#f4fbff', wet = '#c8b27a';
  if (nb.down === 'w') { P(wet, 0, 13, 16, 3); P(foam, fr ? 1 : 0, 14, 16, 1); }
  if (nb.up === 'w') { P(wet, 0, 0, 16, 3); P(foam, 0, 1, 16, 1); }
  if (nb.left === 'w') { P(wet, 0, 0, 3, 16); P(foam, 1, 0, 1, 16); }
  if (nb.right === 'w') { P(wet, 13, 0, 3, 16); P(foam, 14, 0, 1, 16); }
}
function shore(P, nb) {
  const e = '#e8f4ff';
  if (nb.up === 'l') P(e, 0, 0, 16, 1); if (nb.down === 'l') P(e, 0, 15, 16, 1);
  if (nb.left === 'l') P(e, 0, 0, 1, 16); if (nb.right === 'l') P(e, 15, 0, 1, 16);
}
