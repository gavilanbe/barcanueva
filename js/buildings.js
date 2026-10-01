// Edificios en vista 3/4 estilo GBA: tejado arriba, fachada abajo con puerta y ventanas.
import { shade, hash2 } from './util.js';
import { TS } from './tiles.js';

const WALLS = ['#e8d0a0', '#e0b890', '#f0e0c0', '#d8a888', '#e8c8b8', '#c8b898'];
const ROOFS = ['#c0583a', '#b04a34', '#a8603e', '#c86a44'];

// b = {x,y,w,h,kind,name,door:{x,y},roof?,wall?}
export function drawBuilding(ctx, b, ox = 0, oy = 0) {
  const X = b.x * TS - ox, Y = b.y * TS - oy, W = b.w * TS, H = b.h * TS;
  const P = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(X + x, Y + y, w, h); };
  const v = hash2(b.x, b.y, 3);
  const k = b.kind;
  if (k === 'catedral') return cathedral(P, b, W, H, v);
  if (k === 'castillo') return castle(P, b, W, H);
  if (k === 'puesto') return stall(P, b, W, H, v);
  if (k === 'barca') return boat(P, b, W, H);
  if (k === 'templo') return temple(P, b, W, H);
  if (k === 'altar') return altar(P, b, W, H);
  if (k === 'tienda_campana') return tent(P, b, W, H, v);
  const wall = b.wall || (k === 'hospital' ? '#ece8dc' : k === 'masia' ? '#e0cca0' : k === 'cabana' ? '#8a6a48' : WALLS[Math.floor(v * WALLS.length)]);
  const roof = b.roof || (k === 'cabana' ? '#8a8a4a' : k === 'hospital' ? '#9a4a3a' : ROOFS[Math.floor(hash2(b.y, b.x, 5) * ROOFS.length)]);
  const facadeH = Math.max(TS + 6, Math.min(H * 0.45, TS * 2));
  const roofH = H - facadeH;
  // Tejado de teja árabe
  const rs = shade(roof, 0.78), rl = shade(roof, 1.18);
  P(roof, 0, 2, W, roofH);
  for (let y = 4; y < roofH; y += 4) { P(rs, 0, y, W, 1); for (let x = ((y / 4) % 2) * 3; x < W; x += 6) P(rl, x, y - 2, 2, 1); }
  P(shade(roof, 0.6), 0, roofH, W, 2); P(rl, 0, 2, W, 1);
  if (k === 'cabana') { for (let x = 0; x < W; x += 3) P('#6e6e38', x, 2, 1, roofH); }
  // Chimenea
  if (k === 'casa' || k === 'masia' || k === 'taberna') { const cx = Math.floor(W * (0.2 + v * 0.55)); P('#8a6a5a', cx, 0, 6, 8); P('#5a4038', cx, 0, 6, 2); }
  // Fachada
  const fy = roofH + 2, ws = shade(wall, 0.85);
  P(wall, 0, fy, W, facadeH - 2); P(ws, 0, H - 3, W, 3); P(shade(wall, 1.08), 0, fy, W, 1);
  if (k === 'cabana') for (let x = 0; x < W; x += 4) P('#6e5238', x, fy, 1, facadeH - 2);
  if (k === 'masia') { P(shade(wall, 0.9), 0, fy, 2, facadeH); P(shade(wall, 0.9), W - 2, fy, 2, facadeH); }
  // Puerta
  const dx = (b.door.x - b.x) * TS, dh = Math.min(14, facadeH - 3);
  const doorCol = k === 'taberna' ? '#6a3a22' : k === 'hospital' ? '#5a4a3a' : '#7a4a2a';
  P(shade(doorCol, 0.6), dx + 3, H - dh - 1, 10, dh + 1); P(doorCol, dx + 4, H - dh, 8, dh);
  P(shade(doorCol, 1.25), dx + 4, H - dh, 1, dh); P('#e8c050', dx + 10, H - dh / 2 - 1, 1, 1);
  if (k === 'masia' || k === 'hospital') { P(shade(wall, 0.7), dx + 2, H - dh - 3, 12, 2); } // arco de dovelas
  // Ventanas
  const nwin = Math.max(0, Math.floor(W / TS) - 1);
  for (let i = 0; i < nwin + 1; i++) {
    const wx = i * TS + 4; if (Math.abs(wx - dx - 4) < 12) continue;
    if (wx + 8 > W) break;
    const wy = fy + 3;
    P('#3a2a3a', wx, wy, 8, 7); P('#6a8ab8', wx + 1, wy + 1, 6, 5); P('#a8c8e8', wx + 1, wy + 1, 2, 2);
    const sh = k === 'hospital' ? '#6a7a5a' : ['#3e7a4a', '#4a6a9a', '#7a4a3a'][Math.floor(hash2(b.x + i, b.y, 7) * 3)];
    P(sh, wx - 2, wy, 2, 7); P(sh, wx + 8, wy, 2, 7);
    if (hash2(b.x + i, b.y, 9) > 0.5 && k !== 'cabana') { P('#8a5a3a', wx - 1, wy + 7, 10, 2); P('#e84a5a', wx, wy + 6, 2, 1); P('#f8e060', wx + 4, wy + 6, 2, 1); P('#4a9a3a', wx + 2, wy + 6, 2, 1); }
  }
  // Rótulos
  if (k === 'taberna') sign(P, dx - 12, fy + 2, '#6a3a22', (P2, sx, sy) => { P2('#e8c050', sx + 3, sy + 2, 5, 5); P2('#f8f0d8', sx + 3, sy + 1, 5, 2); P2('#e8c050', sx + 8, sy + 3, 1, 3); });
  if (k === 'tienda') {
    const aw = b.awning || '#c83a3a';
    for (let x = 0; x < W; x += 8) { P(aw, x, fy - 1, 4, 6); P('#f8f0e0', x + 4, fy - 1, 4, 6); }
    P(shade(aw, 0.7), 0, fy + 5, W, 1);
    if (b.icon) sign(P, dx + 16 > W - 12 ? dx - 12 : dx + 16, fy + 7, '#5a3a22', b.icon);
  }
  if (k === 'hospital') { P('#b83a3a', W / 2 - 1, fy - 12, 3, 9); P('#b83a3a', W / 2 - 4, fy - 9, 9, 3); }
  if (k === 'cuartel') { P('#b8322c', 4, fy + 2, 6, 8); P('#e8c050', 4, fy + 2, 6, 1); P('#e8c050', 4, fy + 5, 6, 1); P('#e8c050', 4, fy + 8, 6, 1); }
  if (b.forSale) { P('#f0e0b0', W - 14, fy + 3, 10, 7); P('#b8322c', W - 12, fy + 5, 6, 1); P('#b8322c', W - 12, fy + 7, 6, 1); }
  // Contorno
  P('#1c1424', 0, H - 1, W, 1); P('rgba(28,20,36,.6)', 0, 2, 1, H - 2); P('rgba(28,20,36,.6)', W - 1, 2, 1, H - 2);
}

function sign(P, x, y, board, icon) {
  P('#3a2a22', x + 5, y - 2, 1, 2); P(board, x, y, 11, 9); P(shade(board, 1.3), x, y, 11, 1); P('#1c1424', x, y + 9, 11, 1);
  icon(P, x, y);
}

export const ICONS = {
  hierbas: (P, x, y) => { P('#4a9a3a', x + 5, y + 2, 1, 6); P('#6aba4a', x + 3, y + 3, 2, 2); P('#6aba4a', x + 6, y + 4, 2, 2); },
  forja: (P, x, y) => { P('#a8b0b8', x + 2, y + 4, 7, 2); P('#a8b0b8', x + 4, y + 6, 3, 2); P('#6a7078', x + 2, y + 5, 7, 1); },
  sastre: (P, x, y) => { P('#c84a6a', x + 3, y + 2, 5, 6); P('#f0d8e0', x + 5, y + 2, 1, 6); },
  libros: (P, x, y) => { P('#8a3a2a', x + 2, y + 2, 3, 6); P('#3a5a8a', x + 5, y + 2, 2, 6); P('#e8c050', x + 7, y + 3, 2, 5); },
  pescado: (P, x, y) => { P('#8ab0c8', x + 2, y + 4, 6, 3); P('#8ab0c8', x + 8, y + 3, 1, 5); P('#1c1424', x + 3, y + 4); },
  pan: (P, x, y) => { P('#d89848', x + 2, y + 3, 7, 4); P('#f0c070', x + 3, y + 3, 5, 1); P('#a86828', x + 4, y + 5, 1, 1); P('#a86828', x + 6, y + 5, 1, 1); },
  alquimia: (P, x, y) => { P('#8ae0a8', x + 4, y + 4, 4, 4); P('#c8e8f0', x + 5, y + 2, 2, 2); P('#4ab070', x + 4, y + 7, 4, 1); },
  joyas: (P, x, y) => { P('#e8c050', x + 3, y + 3, 5, 5); P('#e84a5a', x + 4, y + 4, 3, 3); },
  madera: (P, x, y) => { P('#8a5a3a', x + 2, y + 3, 7, 2); P('#b07a48', x + 2, y + 6, 7, 2); },
  vela: (P, x, y) => { P('#f0e8d8', x + 4, y + 3, 3, 5); P('#f8c040', x + 5, y + 1, 1, 2); },
  ceramica: (P, x, y) => { P('#c86a44', x + 3, y + 3, 5, 5); P('#e8a878', x + 4, y + 3, 3, 1); P('#1c1424', x + 4, y + 2, 3, 1); },
  cambio: (P, x, y) => { P('#e8c050', x + 2, y + 3, 3, 3); P('#e8c050', x + 6, y + 4, 3, 3); P('#b8b8c0', x + 4, y + 6, 3, 2); },
};

function cathedral(P, b, W, H, v) {
  const severe = b.variant === 'seu';
  const st = severe ? '#8a8690' : '#d8b888', ss = shade(st, 0.78), sl = shade(st, 1.15), dk = shade(st, 0.55);
  const roof = severe ? '#4a4a58' : '#8a6a4a';
  // Nave
  P(roof, 8, 20, W - 16, H * 0.45); for (let y = 24; y < 20 + H * 0.45; y += 5) P(shade(roof, 0.8), 8, y, W - 16, 1);
  // Torres
  const tw = 28;
  for (const tx of [0, W - tw]) {
    P(st, tx, 6, tw, H - 6); P(ss, tx + tw - 5, 6, 5, H - 6); P(sl, tx + 2, 6, 2, H - 6);
    P(dk, tx, 6, tw, 3);
    for (let i = 0; i < tw; i += 6) P(st, tx + i, 2, 4, 5); // almenas / pináculos
    if (severe) { P(dk, tx + tw / 2 - 1, -8, 2, 12); P(dk, tx + tw / 2 - 3, -3, 6, 2); }
    else { P('#e8c050', tx + tw / 2 - 1, -4, 2, 8); P('#e8c050', tx + tw / 2 - 3, -1, 6, 2); }
    P('#2a2430', tx + 10, 20, 8, 14); P(severe ? '#6a4a8a' : '#e8a040', tx + 11, 21, 6, 6);
    P('#2a2430', tx + 11, 42, 6, 10);
  }
  // Fachada central
  const fx = tw, fw = W - 2 * tw, fy = Math.floor(H * 0.42);
  P(st, fx, fy, fw, H - fy); P(ss, fx, H - 4, fw, 4); P(sl, fx, fy, fw, 2);
  // Rosetón
  const cx = fx + fw / 2, cy = fy + 14;
  P(dk, cx - 9, cy - 9, 18, 18); P(severe ? '#5a3a7a' : '#d86a3a', cx - 8, cy - 8, 16, 16);
  P(severe ? '#8a6aaa' : '#f8c060', cx - 6, cy - 6, 12, 12); P(severe ? '#3a2a5a' : '#c83a4a', cx - 2, cy - 2, 4, 4);
  P(dk, cx - 8, cy - 1, 16, 2); P(dk, cx - 1, cy - 8, 2, 16);
  // Portada apuntada
  const dx = (b.door.x - b.x) * TS;
  P(dk, dx - 4, H - 30, 24, 30); P(shade(st, 0.9), dx - 2, H - 28, 20, 28);
  P('#3a2418', dx + 1, H - 22, 14, 22); P('#5a3a24', dx + 2, H - 21, 12, 21); P('#3a2418', dx + 7, H - 21, 2, 21);
  P(dk, dx + 5, H - 26, 6, 3);
  // Cruz
  P(severe ? '#2a2430' : '#e8c050', cx - 1, fy - 12, 3, 12); P(severe ? '#2a2430' : '#e8c050', cx - 5, fy - 9, 11, 3);
  P('#1c1424', 0, H - 1, W, 1);
}

function castle(P, b, W, H) {
  const st = '#a89c88', ss = '#8a7e6a', sl = '#c8bca4', dk = '#5e5446';
  P(st, 0, 16, W, H - 16); P(ss, 0, H - 8, W, 8); P(sl, 0, 16, W, 2);
  for (let x = 0; x < W; x += 8) P(st, x, 10, 5, 7);
  for (let y = 24; y < H - 8; y += 8) for (let x = ((y / 8) % 2) * 6; x < W; x += 12) P(ss, x, y, 8, 1);
  const tw = 32;
  for (const tx of [0, W - tw, Math.floor(W / 2 - tw / 2)]) {
    const top = tx === Math.floor(W / 2 - tw / 2) ? -10 : 0;
    P(st, tx, top, tw, H - top); P(ss, tx + tw - 6, top, 6, H - top); P(sl, tx + 2, top, 2, H - top);
    for (let x = 0; x < tw; x += 8) P(st, tx + x, top - 6, 5, 7);
    P('#2a2430', tx + 12, top + 14, 8, 12); P('#f0c060', tx + 13, top + 15, 6, 5);
    P(dk, tx + 15, top - 22, 2, 16); P('#b8322c', tx + 17, top - 22, 12, 7); P('#e8c050', tx + 17, top - 20, 12, 1); P('#e8c050', tx + 17, top - 18, 12, 1);
  }
  const dx = (b.door.x - b.x) * TS;
  P(dk, dx - 6, H - 34, 28, 34); P('#2a1c14', dx - 3, H - 30, 22, 30); for (let x = dx - 1; x < dx + 19; x += 4) P('#6a6060', x, H - 30, 1, 30);
  P('#1c1424', 0, H - 1, W, 1);
}

function stall(P, b, W, H, v) {
  const c = b.awning || ['#c83a3a', '#3a6ac8', '#e8a030', '#3a9a5a', '#9a4ac8'][Math.floor(v * 5)];
  P('#8a5a3a', 1, 8, 2, H - 8); P('#8a5a3a', W - 3, 8, 2, H - 8);
  P('#a87448', 0, H - 12, W, 8); P('#c89060', 0, H - 12, W, 2); P('#6a4424', 0, H - 4, W, 1);
  for (let x = 0; x < W; x += 6) { P(c, x, 2, 3, 8); P('#f8f0e0', x + 3, 2, 3, 8); }
  P(shade(c, 0.7), 0, 10, W, 1);
  const goods = b.goods || ['#e84a4a', '#f8c040', '#6ab04a', '#e8e0d0'];
  for (let i = 0; i < W / 4 - 1; i++) P(goods[i % goods.length], 2 + i * 4, H - 14, 3, 3);
  P('#1c1424', 0, H - 1, W, 1);
}

function boat(P, b, W, H) {
  P('#6a4424', 2, H - 14, W - 4, 10); P('#8a5a34', 4, H - 14, W - 8, 3); P('#4a2e18', 0, H - 10, 3, 5); P('#4a2e18', W - 3, H - 10, 3, 5);
  P('#5a3a22', W / 2 - 1, 0, 2, H - 14); P('#f0e8d0', W / 2 + 1, 2, W / 3, H - 20); P('#d8d0b8', W / 2 + 1, H - 22, W / 3, 2);
  P('#b8322c', W / 2 - 1, 0, 6, 3);
}

function temple(P, b, W, H) {
  const st = '#c8c0b0', ss = '#a09888';
  P('#8a8478', 0, H - 8, W, 8); P(st, 2, 10, W - 4, 4); P(ss, 2, 14, W - 4, 2);
  for (let x = 4; x < W - 4; x += 10) { P(st, x, 16, 5, H - 24); P(ss, x + 4, 16, 1, H - 24); }
  P(st, 0, 4, W, 6); P('#e0d8c8', 4, 0, W - 8, 4);
  P('#3a6a5a', W / 2 - 3, H - 18, 6, 8); P('#8ae0c8', W / 2 - 1, H - 16, 2, 2);
  P('#1c1424', 0, H - 1, W, 1);
}

function altar(P, b, W, H) {
  P('#7a7870', 2, H - 10, W - 4, 8); P('#9a9890', 3, H - 10, W - 6, 2); P('#5a8a4a', 0, H - 3, W, 2);
  P('#f8d860', W / 2 - 1, H - 14, 2, 3); P('#ffffff', W / 2 - 1, H - 15, 1, 1);
}

function tent(P, b, W, H, v) {
  const c = ['#c86a3a', '#6a8a3a', '#8a4a7a'][Math.floor(v * 3)];
  for (let r = 0; r < H - 4; r++) { const w = Math.floor((r + 2) * (W / (H - 2))); P(r % 6 < 3 ? c : shade(c, 0.85), W / 2 - w / 2, r + 2, w, 1); }
  P('#2a1c14', W / 2 - 4, H - 12, 8, 10); P('#1c1424', 0, H - 1, W, 1);
}
