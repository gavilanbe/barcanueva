// Retratos de busto (40×40) para los diálogos y figuras grandes de combate (de espaldas y de frente),
// pintados a partir del mismo «aspecto» que los sprites del mapa: raza, sexo, edad, piel, pelo, peinado y equipo.
// Expresiones: neutral, alegre, triste, furia, sorpresa, miedo. Boca: 0 cerrada, 1 entreabierta, 2 abierta. Parpadeo.
import { ramp, shift, mix, INK, outlineSel } from './pal.js';
import { LOOKS } from './chars.js';

const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const keyOf = (ap) => [ap.race, ap.sex, ap.age, ap.skin, ap.hair, ap.hairStyle, ap.top, ap.bottom, ap.beard ? 1 : 0, ap.eyes, ap.equip?.head, ap.equip?.body, ap.equip?.cape].join('|');

// ───────────── Busto ─────────────
export function bust(ap, expr = 'neutral', mouth = 0, blink = false) {
  const key = 'B' + keyOf(ap) + expr + mouth + (blink ? 1 : 0);
  let c = cache.get(key); if (c) return c;
  c = paintBust(ap, expr, mouth, blink); cache.set(key, c);
  if (cache.size > 1500) cache.delete(cache.keys().next().value);
  return c;
}

function paintBust(ap, expr, mouth, blink) {
  const [cv, x] = mk(40, 40);
  const P = (c, px, py, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(px, py, w, h); };
  const race = ap.race || 'humano', fem = ap.sex === 'f', age = ap.age || 'adulto';
  const S = ramp(ap.skin || '#e8b48c'), Hh = ramp(ap.hair || '#5a3620');
  const eq = ap.equip || {}; const bodyL = eq.body ? LOOKS[eq.body] : null; const capeL = eq.cape ? LOOKS[eq.cape] : null; const headL = eq.head ? LOOKS[eq.head] : null;
  const Top = ramp(bodyL?.color || ap.top || '#b85a3a');
  const old = age === 'anciano', kid = age === 'nino';
  const hairC = old && !['#d8d4cc', '#7fa0c8', '#3d3a6e', '#2e5a40'].includes(ap.hair) ? ramp(mix(ap.hair || '#5a3620', '#d8d4cc', 0.62)) : Hh;
  // Fondo: degradado suave del color de la ropa (ya lo enmarca ui); aquí sólo un halo
  // Geometría de la cabeza
  const dwarf = race === 'enano', elf = race === 'elfo', tief = race === 'tiefling';
  const hw = dwarf ? 18 : elf ? 15 : kid ? 16 : 16; // ancho de cara
  const hx = 20 - (hw >> 1), hy = dwarf ? 9 : kid ? 10 : elf ? 6 : 7, hh = dwarf ? 18 : elf ? 20 : kid ? 17 : 19;
  // Hombros y torso
  const shY = hy + hh + 2; const shW = dwarf ? 34 : fem ? 26 : 30;
  const shX = 20 - (shW >> 1);
  if (capeL) { const Cp = ramp(capeL.color); P(Cp[2], shX - 2, shY + 1, shW + 4, 40 - shY); P(Cp[3], shX - 1, shY, shW + 2, 3); if (capeL.trim) { P(capeL.trim, shX - 2, shY + 3, 2, 40); P(capeL.trim, shX + shW, shY + 3, 2, 40); } }
  P(Top[3], shX, shY + 2, shW, 40); P(Top[3], shX + 2, shY, shW - 4, 3);
  P(Top[4], shX + 2, shY + 1, 6, 1); P(Top[4], shX + 1, shY + 3, 3, 10); // luz del hombro izquierdo
  P(Top[2], shX + shW - 5, shY + 3, 5, 40); P(Top[1], shX + shW - 2, shY + 5, 2, 40);
  // Cuello y escote
  const nk = Top[1]; P(S[2], 17, shY - 3, 6, 4); P(S[1], 20, shY - 2, 3, 3);
  const body = eq.body;
  if (body === 'cota') { for (let j = shY + 2; j < 40; j += 2) for (let i = shX + 1 + (j & 2 ? 1 : 0); i < shX + shW - 1; i += 2) P(Top[2], i, j); P(Top[5], shX + 3, shY + 3, 4, 1); }
  else if (body === 'coraza') { P(Top[4], 13, shY + 4, 14, 12); P(Top[5], 14, shY + 5, 4, 8); P(Top[2], 20, shY + 4, 1, 12); P(Top[6], 15, shY + 5, 2, 2); }
  else if (body === 'habito') { P(Top[2], 15, shY, 10, 4); P(Top[1], 16, shY + 1, 8, 2); P(ramp('#e8e0cc')[4], 18, shY + 3, 4, 1); }
  else if (body === 'delantal') { P('#f2ecde', 14, shY + 6, 12, 20); P('#d8cfbc', 14, shY + 6, 12, 1); P('#c8bea8', 24, shY + 7, 2, 20); }
  else if (body === 'jubon') { for (let j = shY + 4; j < 40; j += 4) { P('#e8c050', 19, j, 2, 1); } P(Top[5], 16, shY + 1, 8, 2); P(Top[2], 19, shY + 3, 2, 30); }
  else if (body === 'vestido') { P(Top[5], 14, shY + 2, 12, 2); P('#f8f0e0', 16, shY + 1, 8, 1); P(Top[2], 15, shY + 4, 10, 1); }
  else { // túnica / camisa: cuello en pico
    P(S[2], 18, shY, 4, 3); P(S[1], 19, shY + 2, 2, 2); P(Top[1], 17, shY, 1, 3); P(Top[1], 22, shY, 1, 3); P(Top[2], 18, shY + 3, 1, 1); P(Top[2], 21, shY + 3, 1, 1);
  }
  if (dwarf && ap.beard === false) {} // nada
  // Orejas
  if (elf) {
    P(S[3], hx - 5, hy + 7, 5, 2); P(S[3], hx - 3, hy + 9, 3, 2); P(S[4], hx - 4, hy + 7, 2, 1); P(S[2], hx - 2, hy + 10, 2, 1);
    P(S[3], hx + hw, hy + 7, 5, 2); P(S[3], hx + hw, hy + 9, 3, 2); P(S[2], hx + hw + 2, hy + 8, 3, 1); P(S[1], hx + hw, hy + 10, 2, 1);
  } else { P(S[3], hx - 2, hy + 8, 2, 4); P(S[2], hx - 1, hy + 9, 1, 2); P(S[2], hx + hw, hy + 8, 2, 4); P(S[1], hx + hw, hy + 9, 1, 2); }
  // Cara: óvalo con mandíbula
  P(S[3], hx + 1, hy, hw - 2, hh); P(S[3], hx, hy + 2, hw, hh - 6);
  P(S[3], hx + 2, hy + hh, hw - 4, 1); // barbilla
  P(S[4], hx + 2, hy + 2, 5, 7); P(S[5], hx + 3, hy + 3, 2, 3); // luz de la mejilla y la frente
  P(S[2], hx + hw - 3, hy + 3, 3, hh - 7); P(S[2], hx + hw - 4, hy + hh - 4, 2, 3); P(S[1], hx + hw - 1, hy + 5, 1, hh - 10); // sombra derecha
  P(S[2], hx + 3, hy + hh - 1, hw - 6, 1); // sombra bajo la barbilla
  // Rasgos
  const eyeY = hy + Math.round(hh * 0.45), lx = hx + 3, rx = hx + hw - 7;
  const iris = ap.eyes || (tief ? '#e8b020' : elf ? '#3a7a6a' : '#3a2a28');
  const brow = hairC[1];
  // Cejas según expresión
  const bro = { neutral: [0, 0], alegre: [-1, -1], triste: [1, -1], furia: [-1, 1], sorpresa: [-2, -2], miedo: [1, -2] }[expr] || [0, 0];
  // ceja izquierda (inner = lado nariz)
  const bl = (x0, inner, outer, flip) => { for (let i = 0; i < 4; i++) { const t = i / 3; const off = Math.round((flip ? 1 - t : t) * inner + (flip ? t : 1 - t) * outer); P(brow, x0 + i, eyeY - 3 + off - (old ? 0 : 0)); } };
  bl(lx, bro[0], bro[1] - 1, false); bl(rx, bro[0], bro[1] - 1, true);
  if (blink || expr === 'alegre') {
    // ojos cerrados (arco) — al reír, arcos hacia arriba
    if (expr === 'alegre' && !blink) { P(INK, lx, eyeY + 1, 1, 1); P(INK, lx + 1, eyeY, 2, 1); P(INK, lx + 3, eyeY + 1, 1, 1); P(INK, rx, eyeY + 1, 1, 1); P(INK, rx + 1, eyeY, 2, 1); P(INK, rx + 3, eyeY + 1, 1, 1); }
    else { P(S[1], lx, eyeY + 1, 4, 1); P(S[1], rx, eyeY + 1, 4, 1); P(INK, lx, eyeY + 1, 4, 1); P(INK, rx, eyeY + 1, 4, 1); }
  } else {
    const big = expr === 'sorpresa' || expr === 'miedo';
    for (const ex of [lx, rx]) {
      P('#fbf6ee', ex, eyeY - (big ? 1 : 0), 4, big ? 4 : 3); // esclerótica
      P(iris, ex + 1, eyeY - (big ? 1 : 0), 2, big ? 4 : 3); P(shift(iris, -2), ex + 1, eyeY + (big ? 2 : 1), 2, 1);
      P(INK, ex + 1 + (ex === lx ? 1 : 0), eyeY + (big ? 0 : 0), 1, 2); // pupila
      P('#ffffff', ex + 1, eyeY - (big ? 1 : 0), 1, 1); // brillo
      P(INK, ex, eyeY - 1 - (big ? 1 : 0), 4, 1); // párpado / pestaña superior
      if (fem) { P(INK, ex + (ex === lx ? -1 : 4), eyeY - 1 - (big ? 1 : 0), 1, 1); }
      if (expr === 'furia') { P(S[2], ex, eyeY, 4, 1); }
      if (expr === 'triste') { P(S[2], ex + (ex === lx ? 2 : 0), eyeY - 1, 2, 1); }
    }
    if (tief) { P('#fff0a0', lx + 1, eyeY, 1, 1); P('#fff0a0', rx + 1, eyeY, 1, 1); }
  }
  // Nariz
  const nY = eyeY + 4; P(S[2], 20, nY, 1, 2); P(S[1], 20, nY + 2, 2, 1); if (dwarf) { P(S[4], 19, nY - 1, 2, 3); P(S[2], 19, nY + 2, 3, 1); }
  // Mejillas
  if (fem || kid || expr === 'alegre') { P(mix(S[3], '#e86a6a', 0.35), lx - 1, nY + 1, 3, 1); P(mix(S[3], '#e86a6a', 0.3), rx + 2, nY + 1, 3, 1); }
  if (expr === 'miedo') { P('#a8d0f0', hx + hw - 2, hy + 3, 1, 2); P('#e8f4ff', hx + hw - 2, hy + 3, 1, 1); }
  // Boca
  const mY = nY + 5; const lip = mix(S[1], '#9a3a3a', 0.4);
  if (mouth === 2 || expr === 'sorpresa') { P(INK, 18, mY - 1, 4, 3); P('#8a2a3a', 19, mY, 2, 2); P('#f8f0e8', 18, mY - 1, 4, 1); }
  else if (mouth === 1) { P(INK, 18, mY, 4, 2); P('#a8404a', 19, mY + 1, 2, 1); }
  else if (expr === 'alegre') { P(lip, 17, mY - 1, 1, 1); P(INK, 18, mY, 4, 1); P(lip, 22, mY - 1, 1, 1); P('#f8f0e8', 19, mY, 2, 1); }
  else if (expr === 'triste' || expr === 'miedo') { P(INK, 18, mY, 4, 1); P(lip, 17, mY + 1, 1, 1); P(lip, 22, mY + 1, 1, 1); }
  else if (expr === 'furia') { P(INK, 17, mY, 6, 1); P('#f8f0e8', 18, mY, 4, 1); P(INK, 17, mY + 1, 6, 1); }
  else { P(lip, 18, mY, 4, 1); P(S[1], 19, mY + 1, 2, 1); }
  if (fem && !mouth && expr !== 'furia') P(mix(lip, '#c84a5a', 0.4), 19, mY, 2, 1);
  // Arrugas de los ancianos
  if (old) { P(S[2], lx - 1, eyeY + 2, 1, 1); P(S[2], rx + 4, eyeY + 2, 1, 1); P(S[2], 16, mY - 1, 1, 2); P(S[2], 24, mY - 1, 1, 2); P(S[2], hx + 4, hy + 2, 6, 1); }
  // Barba
  if (ap.beard) {
    const B = old ? hairC : Hh;
    P(B[3], hx, eyeY + 5, 2, 8); P(B[3], hx + hw - 2, eyeY + 5, 2, 8);
    P(B[3], hx + 1, mY - 2, hw - 2, 2); P(B[3], hx, mY + 1, hw, dwarf ? 10 : 5); P(B[3], hx + 2, mY + (dwarf ? 11 : 6), hw - 4, dwarf ? 6 : 2);
    P(B[2], hx + hw - 4, mY + 1, 4, dwarf ? 14 : 6); P(B[4], hx + 2, mY + 2, 2, dwarf ? 6 : 3); P(B[4], 16, mY + 5, 1, 4);
    for (let i = 0; i < (dwarf ? 6 : 3); i++) P(B[2], hx + 3 + i * 3, mY + 4 + (i & 1), 1, 3);
    // la boca asoma entre el bigote
    if (mouth) { P(INK, 18, mY, 4, mouth); } else P(B[1], 18, mY, 4, 1);
    P(B[4], 17, mY - 2, 2, 1); P(B[2], 21, mY - 1, 2, 1);
    if (dwarf) { P('#e8c050', 19, mY + 12, 2, 2); P('#fff0a0', 19, mY + 12, 1, 1); } // anilla en la barba
  }
  // Pelo
  paintBustHair(P, ap.hairStyle ?? 0, hx, hy, hw, hh, hairC, !!headL, fem, kid);
  // Cuernos de tiefling
  if (tief && eq.head !== 'capucha') {
    const Hn = ramp('#4a3440');
    for (const s of [-1, 1]) {
      const bx = s < 0 ? hx + 2 : hx + hw - 4;
      P(Hn[3], bx, hy - 2, 3, 3); P(Hn[3], bx + s * 1, hy - 5, 3, 3); P(Hn[4], bx + s * 2, hy - 7, 2, 3); P(Hn[5], bx + s * 3, hy - 8, 1, 2);
      P(Hn[5], bx + (s < 0 ? 0 : 2), hy - 2, 1, 2); P(Hn[1], bx + (s < 0 ? 2 : 0), hy - 4, 1, 3);
    }
  }
  // Tocado
  if (headL) paintBustHead(P, eq.head, headL, hx, hy, hw, hh);
  outlineSel(cv, { bottom: 0.85 });
  // el borde inferior (corte del busto) sin contorno
  x.clearRect(0, 39, 40, 1);
  return cv;
}

function paintBustHair(P, st, hx, hy, hw, hh, H, hat, fem, kid) {
  const top = hy - 2;
  if (st === 4) { P(H[2], hx + 1, hy - 1, hw - 2, 3); P(H[3], hx + 2, hy - 1, hw - 5, 1); return; } // rapado
  // Volumen superior común
  P(H[3], hx - 1, top + 1, hw + 2, 6); P(H[3], hx + 1, top, hw - 2, 2);
  P(H[4], hx + 2, top + 1, hw - 8, 1); P(H[5], hx + 3, top + 1, 3, 1); P(H[2], hx + hw - 3, top + 2, 3, 5);
  // Laterales hasta la oreja
  P(H[3], hx - 1, top + 6, 2, 6); P(H[2], hx + hw - 1, top + 6, 2, 6);
  // Flequillo según estilo
  if (st === 0) { P(H[3], hx + 1, top + 6, 5, 2); P(H[3], hx + 6, top + 6, 3, 1); P(H[2], hx + hw - 6, top + 6, 4, 2); P(H[4], hx + 2, top + 6, 2, 1); }
  if (st === 1 || st === 6) { // melena / trenzas: cae por los lados
    P(H[3], hx + 1, top + 6, hw - 2, 2); P(H[2], hx + hw - 5, top + 7, 4, 1); P(H[4], hx + 3, top + 6, 3, 1);
    P(H[3], hx - 3, top + 4, 4, 22); P(H[2], hx + hw - 1, top + 4, 4, 22); P(H[4], hx - 2, top + 6, 1, 14); P(H[1], hx + hw + 1, top + 8, 2, 16);
    if (st === 6) { for (let j = 0; j < 4; j++) { P(H[4], hx - 3, top + 14 + j * 4, 3, 2); P(H[2], hx + hw, top + 14 + j * 4, 3, 2); } P('#b8322c', hx - 3, top + 29, 3, 2); P('#b8322c', hx + hw, top + 29, 3, 2); }
  }
  if (st === 2) { P(H[3], hx + 1, top + 6, hw - 4, 2); P(H[4], hx + 2, top + 6, 3, 1); P(H[3], hx + hw, top + 3, 4, 4); P(H[2], hx + hw + 1, top + 7, 3, 8); P('#b8322c', hx + hw, top + 6, 3, 1); } // coleta
  if (st === 3) { for (let i = -1; i < hw + 1; i += 3) { P(H[3], hx + i, top - 1, 3, 3); P(H[4], hx + i, top - 1, 1, 1); } P(H[3], hx - 2, top + 3, 3, 10); P(H[2], hx + hw - 1, top + 3, 3, 10); P(H[3], hx + 1, top + 6, hw - 2, 2); } // rizos
  if (st === 5) { const cx = hx + (hw >> 1); [4, 6, 8, 8, 6].forEach((w, r) => P(H[3], cx - (w >> 1), top - 6 + r, w, 1)); P(H[4], cx - 2, top - 5, 3, 1); P(H[5], cx - 2, top - 5, 1, 1); P(H[2], cx + 1, top - 3, 3, 2); P(H[1], cx - 4, top - 1, 8, 1); P(H[3], hx + 1, top + 6, hw - 2, 1); } // moño redondo
  if (st === 7) { P(H[3], hx + 5, top - 7, 6, 8); P(H[4], hx + 6, top - 6, 2, 5); P(H[2], hx + 9, top - 5, 2, 6); P(H[2], hx - 1, top + 3, 3, 4); P(H[2], hx + hw - 2, top + 3, 3, 4); } // cresta
  if (kid) P(H[4], hx + 6, top - 1, 2, 2);
}

function paintBustHead(P, id, L, hx, hy, hw, hh) {
  const C = ramp(L.color);
  switch (id) {
    case 'barretina': P(C[3], hx - 1, hy - 4, hw + 2, 5); P(C[2], hx - 1, hy, hw + 2, 1); P(C[4], hx + 1, hy - 4, 6, 1); P(C[3], hx + hw - 2, hy - 8, 5, 5); P(C[2], hx + hw + 1, hy - 6, 3, 6); P(C[1], hx + hw + 2, hy - 1, 2, 5); P(C[4], hx + hw - 1, hy - 8, 2, 1); break;
    case 'sombrero': P(C[3], hx - 6, hy, hw + 12, 3); P(C[2], hx - 6, hy + 2, hw + 12, 1); P(C[4], hx - 5, hy, 8, 1); P(C[3], hx + 1, hy - 7, hw - 2, 8); P(C[1], hx + 1, hy - 1, hw - 2, 1); P(C[4], hx + 2, hy - 7, 4, 1); P(C[2], hx + hw - 4, hy - 6, 3, 6); break;
    case 'capucha': P(C[3], hx - 4, hy - 4, hw + 8, 9); P(C[3], hx - 5, hy + 4, 5, 22); P(C[2], hx + hw, hy + 4, 5, 22); P(C[4], hx - 2, hy - 3, 6, 1); P(C[1], hx - 1, hy + 3, hw + 2, 2); P(C[1], hx + hw + 2, hy + 6, 2, 18); break;
    case 'casco': case 'cuernos_yelmo': P(C[3], hx - 2, hy - 4, hw + 4, 8); P(C[2], hx - 2, hy + 3, hw + 4, 2); P(C[5], hx, hy - 3, 5, 2); P(C[6], hx + 1, hy - 3, 2, 1); P(C[1], hx + hw - 2, hy - 2, 3, 6); P(C[2], 19, hy + 3, 2, 6);
      if (id === 'cuernos_yelmo') { const Hn = ramp('#e8e0cc'); P(Hn[3], hx - 6, hy - 6, 4, 4); P(Hn[4], hx - 8, hy - 10, 3, 5); P(Hn[5], hx - 8, hy - 12, 2, 3); P(Hn[3], hx + hw + 2, hy - 6, 4, 4); P(Hn[2], hx + hw + 5, hy - 10, 3, 5); P(Hn[4], hx + hw + 6, hy - 12, 2, 3); } break;
    case 'diadema': P(C[3], hx, hy - 1, hw, 2); P(C[5], hx + 1, hy - 1, 4, 1); P('#e84a5a', 19, hy - 2, 2, 2); P('#ffb0b8', 19, hy - 2, 1, 1); P(C[4], 18, hy - 3, 4, 1); break;
    case 'cofia': P(C[3], hx - 2, hy - 3, hw + 4, 7); P(C[4], hx - 1, hy - 3, hw - 2, 1); P(C[2], hx - 2, hy + 3, hw + 4, 1); P(C[3], hx - 3, hy + 4, 3, 7); P(C[2], hx + hw, hy + 4, 3, 7); break;
  }
}

// ───────────── Figuras de combate (≈40×60) ─────────────
// view 'back' (el jugador, de espaldas y algo girado hacia la derecha) o 'front' (rivales humanos).
// pose: idle0, idle1 (respiración), attack (brazo arriba), hurt (encogido), cast (manos al frente), win
export function figure(ap, view = 'back', pose = 'idle0') {
  const key = 'F' + keyOf(ap) + view + pose; let c = cache.get(key); if (c) return c;
  c = paintFigure(ap, view, pose); cache.set(key, c); return c;
}

function paintFigure(ap, view, pose) {
  const [cv, x] = mk(44, 64);
  const P = (c, px, py, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(px, py, w, h); };
  const race = ap.race || 'humano', fem = ap.sex === 'f', back = view === 'back';
  const dwarf = race === 'enano', elf = race === 'elfo', tief = race === 'tiefling', kid = ap.age === 'nino';
  const eq = ap.equip || {}; const bodyL = eq.body ? LOOKS[eq.body] : null; const capeL = eq.cape ? LOOKS[eq.cape] : null; const headL = eq.head ? LOOKS[eq.head] : null;
  const S = ramp(ap.skin || '#e8b48c'), Hh = ramp(ap.hair || '#5a3620'), Top = ramp(bodyL?.color || ap.top || '#b85a3a'), Bot = ramp(ap.bottom || '#4a4a6a'), Bt = ramp('#5a3a2a');
  const long = bodyL?.long || false;
  const breathe = pose === 'idle1' ? 1 : 0, hurt = pose === 'hurt', atk = pose === 'attack', cast = pose === 'cast', win = pose === 'win';
  // Proporciones
  const scale = dwarf ? 0.86 : kid ? 0.8 : 1;
  const feetY = 62, legH = Math.round((dwarf ? 11 : elf ? 18 : 16) * scale), torsoH = Math.round((dwarf ? 16 : 17) * scale), headH = dwarf ? 14 : 14;
  const cx = 22 + (hurt ? (back ? -2 : 2) : 0);
  const hipY = feetY - legH, shY = hipY - torsoH + breathe, headY = shY - headH + 2;
  const tw = dwarf ? 20 : fem ? 15 : 17;
  // Capa por detrás (de frente) o por encima (de espaldas)
  const Cp = capeL ? ramp(capeL.color) : null;
  if (Cp && !back) { P(Cp[2], cx - tw / 2 - 2, shY + 2, tw + 4, torsoH + legH - 6); P(Cp[1], cx + tw / 2, shY + 4, 2, torsoH + legH - 8); }
  // Cola de tiefling
  if (tief) { const Tl = ramp(shift(ap.skin, -1)); const dir = back ? 1 : -1; for (let i = 0; i < 12; i++) { const yy = hipY + 2 + Math.round(Math.sin(i / 3.2) * 3) + Math.round(i * 0.6); P(i > 9 ? Tl[4] : Tl[3], cx + dir * (4 + i), yy, 2, 2); } P(Tl[2], cx + dir * 16 - 1, hipY + 8, 3, 3); }
  // Piernas
  const step = atk ? 3 : hurt ? -1 : 0;
  if (long) {
    const L = Top; P(L[3], cx - tw / 2, hipY - 1, tw, legH - 1); P(L[2], cx + tw / 2 - 4, hipY - 1, 4, legH - 1); P(L[4], cx - tw / 2 + 1, hipY, 2, legH - 3);
    P(L[1], cx - tw / 2, feetY - 3, tw, 1); P(Bt[2], cx - 5, feetY - 2, 4, 2); P(Bt[2], cx + 2, feetY - 2, 4, 2);
  } else {
    const lg = (lx, off) => { P(Bot[3], lx, hipY, 6, legH - 3 + off); P(Bot[2], lx + 4, hipY, 2, legH - 3 + off); P(Bot[4], lx + 1, hipY + 1, 1, legH - 6); P(Bt[3], lx - 1, feetY - 4 + off, 7, 4); P(Bt[4], lx, feetY - 4 + off, 3, 1); P(Bt[1], lx + 4, feetY - 3 + off, 2, 3); };
    lg(cx - 7 - (step > 0 ? 1 : 0), step > 0 ? -2 : 0); lg(cx + 1 + (step > 0 ? 1 : 0), 0);
  }
  // Torso
  const tx = Math.round(cx - tw / 2);
  P(Top[3], tx, shY, tw, torsoH); P(Top[3], tx + 1, shY - 1, tw - 2, 1);
  P(Top[2], tx + tw - 4, shY + 1, 4, torsoH - 1); P(Top[1], tx + tw - 1, shY + 3, 1, torsoH - 3);
  P(Top[4], tx + 1, shY + 1, 3, torsoH - 3);
  if (eq.body === 'cota') for (let j = shY + 1; j < hipY; j += 2) for (let i = tx + 1 + (j & 2 ? 1 : 0); i < tx + tw - 1; i += 2) P(Top[2], i, j);
  if (eq.body === 'coraza') { P(Top[5], tx + 2, shY + 2, tw - 6, torsoH - 6); P(Top[6], tx + 3, shY + 3, 3, 3); }
  if (eq.body === 'delantal' && !back) { P('#f2ecde', tx + 3, shY + 4, tw - 6, torsoH + 4); P('#d8cfbc', tx + tw - 5, shY + 5, 2, torsoH + 2); }
  if (eq.body === 'jubon' && !back) { for (let j = shY + 2; j < hipY - 2; j += 3) P('#e8c050', cx - 1, j, 2, 1); }
  // Cinturón
  if (!long || eq.body === 'habito') { P(shift(Top[3], -3), tx, hipY - 2, tw, 2); if (!back) { P('#e8c050', cx - 1, hipY - 2, 3, 2); P('#fff0a0', cx - 1, hipY - 2, 1, 1); } }
  // Brazos
  const arm = (side, raised, fwd) => {
    const ax = side < 0 ? tx - 4 : tx + tw; const A = side < 0 ? Top : Top;
    if (raised) { P(A[3], ax, shY - 12, 4, 13); P(A[2], ax + 2, shY - 12, 2, 13); P(S[3], ax, shY - 15, 4, 4); P(S[4], ax, shY - 15, 2, 2); return; }
    if (fwd) { P(A[3], ax, shY + 1, 4, 8); P(A[3], ax + (side < 0 ? 2 : -2), shY + 8, 4, 4); P(S[3], ax + (side < 0 ? 3 : -3), shY + 11, 4, 3); return; }
    P(A[3], ax, shY + 1, 4, torsoH - 4); P(A[2], ax + (side < 0 ? 0 : 2), shY + 2, 2, torsoH - 5); P(A[4], ax + (side < 0 ? 1 : 0), shY + 2, 1, torsoH - 7);
    P(S[3], ax, shY + torsoH - 3, 4, 4); P(S[2], ax + 2, shY + torsoH, 2, 1);
  };
  if (back) { arm(-1, false, cast); arm(1, atk || win, cast); }
  else { arm(-1, atk || win, cast); arm(1, false, cast); }
  // Cabeza
  const hw = dwarf ? 14 : elf ? 12 : 13, hx = Math.round(cx - hw / 2);
  P(S[3], hx + 1, headY, hw - 2, headH); P(S[3], hx, headY + 2, hw, headH - 5);
  // cuello
  P(S[2], cx - 2, shY - 3, 5, 3);
  if (elf) { for (const s of [-1, 1]) { const ex = s < 0 ? hx - 4 : hx + hw; P(S[3], ex, headY + 5, 4, 2); P(S[3], ex + (s < 0 ? 2 : 0), headY + 7, 2, 1); P(S[2], ex + (s < 0 ? 1 : 1), headY + 6, 2, 1); } }
  else { P(S[2], hx - 1, headY + 6, 1, 3); P(S[2], hx + hw, headY + 6, 1, 3); }
  const Hc = ap.age === 'anciano' ? ramp(mix(ap.hair || '#5a3620', '#d8d4cc', 0.6)) : Hh;
  if (back) {
    // nuca: pelo casi completo, perfil de la mejilla a la derecha (gira hacia el rival)
    P(S[2], hx + hw - 3, headY + 6, 3, 5);
    paintFigHairBack(P, ap.hairStyle ?? 0, hx, headY, hw, headH, Hc, fem);
  } else {
    // cara de frente con rasgos sencillos
    P(S[4], hx + 2, headY + 2, 3, 4); P(S[2], hx + hw - 3, headY + 3, 2, headH - 5);
    const ey = headY + 6, iris = ap.eyes || (tief ? '#e8b020' : '#2a2030');
    if (hurt) { P(INK, hx + 3, ey + 1, 2, 1); P(INK, hx + hw - 5, ey + 1, 2, 1); }
    else { P('#fbf6ee', hx + 3, ey, 2, 2); P('#fbf6ee', hx + hw - 5, ey, 2, 2); P(iris, hx + 4, ey, 1, 2); P(iris, hx + hw - 4, ey, 1, 2); P(INK, hx + 3, ey - 1, 2, 1); P(INK, hx + hw - 5, ey - 1, 2, 1); }
    P(S[2], cx, ey + 3, 1, 1); P(atk || hurt ? INK : mix(S[1], '#9a3a3a', 0.4), cx - 1, ey + 5, 3, atk || hurt ? 2 : 1);
    if (ap.beard) { P(Hh[3], hx, ey + 2, hw, dwarf ? 12 : 6); P(Hh[2], hx + hw - 3, ey + 3, 3, dwarf ? 11 : 5); P(Hh[4], hx + 2, ey + 4, 2, 3); P(atk || hurt ? INK : Hh[1], cx - 1, ey + 5, 3, 1); }
    paintFigHairFront(P, ap.hairStyle ?? 0, hx, headY, hw, headH, Hc);
  }
  if (tief && eq.head !== 'capucha') { const Hn = ramp('#4a3440'); for (const s of [-1, 1]) { const bx = s < 0 ? hx + 1 : hx + hw - 3; P(Hn[3], bx, headY - 2, 2, 3); P(Hn[4], bx + s, headY - 5, 2, 3); P(Hn[5], bx + s * 2, headY - 6, 1, 2); } }
  if (headL) { const C = ramp(headL.color); const id = eq.head;
    if (id === 'barretina') { P(C[3], hx - 1, headY - 2, hw + 2, 4); P(C[2], hx + hw - 3, headY - 6, 5, 5); P(C[4], hx, headY - 2, 4, 1); }
    else if (id === 'sombrero') { P(C[3], hx - 4, headY + 1, hw + 8, 2); P(C[3], hx + 1, headY - 4, hw - 2, 5); P(C[4], hx + 2, headY - 4, 3, 1); P(C[1], hx - 4, headY + 2, hw + 8, 1); }
    else if (id === 'capucha') { P(C[3], hx - 2, headY - 2, hw + 4, headH + 2); P(C[4], hx, headY - 1, 4, 1); if (!back) { P(S[3], hx + 2, headY + 4, hw - 4, headH - 6); P(INK, hx + 3, headY + 6, 2, 1); P(INK, hx + hw - 5, headY + 6, 2, 1); } P(C[2], hx + hw - 1, headY, 3, headH); }
    else if (id === 'casco' || id === 'cuernos_yelmo') { P(C[3], hx - 1, headY - 2, hw + 2, 7); P(C[5], hx, headY - 1, 4, 2); P(C[2], hx - 1, headY + 4, hw + 2, 1); if (id === 'cuernos_yelmo') { P('#e8e0cc', hx - 4, headY - 5, 3, 4); P('#e8e0cc', hx + hw + 1, headY - 5, 3, 4); } }
    else if (id === 'diadema') { P(C[4], hx, headY, hw, 1); P('#e84a5a', cx - 1, headY - 1, 2, 2); }
    else if (id === 'cofia') { P(C[3], hx - 1, headY - 2, hw + 2, 6); P(C[4], hx, headY - 2, 4, 1); }
  }
  // Capa por encima, de espaldas
  if (Cp && back) { P(Cp[3], tx - 2, shY - 1, tw + 4, torsoH + legH - 4); P(Cp[2], tx + tw - 3, shY, 5, torsoH + legH - 5); P(Cp[4], tx - 1, shY, 3, torsoH + legH - 8); P(Cp[1], tx - 2, shY + torsoH + legH - 6, tw + 4, 1); if (capeL.trim) P(capeL.trim, tx - 2, shY + torsoH + legH - 7, tw + 4, 1); }
  // Arma en la mano alzada (de espaldas: mano derecha)
  if (atk) { const hxw = back ? tx + tw + 1 : tx - 3; P('#d4dae4', hxw, shY - 26, 2, 12); P('#a6aebe', hxw + 1, shY - 26, 1, 12); P('#9c6644', hxw - 1, shY - 15, 4, 2); }
  outlineSel(cv);
  return cv;
}

function paintFigHairBack(P, st, hx, hy, hw, hh, H, fem) {
  if (st === 4) { P(H[2], hx + 1, hy, hw - 2, 8); P(H[3], hx + 2, hy, 4, 2); return; }
  P(H[3], hx - 1, hy - 1, hw + 2, 10); P(H[3], hx, hy + 9, hw, 2); P(H[4], hx + 1, hy, 5, 2); P(H[5], hx + 2, hy, 2, 1); P(H[2], hx + hw - 3, hy + 1, 3, 9);
  for (let i = 0; i < hw; i += 3) P(H[2], hx + i, hy + 4 + (i % 2), 1, 5);
  if (st === 1 || st === 6) { P(H[3], hx - 1, hy + 10, hw + 2, 9); P(H[2], hx + hw - 3, hy + 10, 4, 9); P(H[4], hx + 1, hy + 11, 2, 6); if (st === 6) { P(H[3], hx + 2, hy + 19, 3, 6); P(H[3], hx + hw - 5, hy + 19, 3, 6); P('#b8322c', hx + 2, hy + 24, 3, 1); P('#b8322c', hx + hw - 5, hy + 24, 3, 1); } }
  if (st === 2) { P(H[3], hx + hw / 2 - 2, hy + 10, 4, 10); P(H[2], hx + hw / 2, hy + 10, 2, 10); P('#b8322c', hx + hw / 2 - 2, hy + 10, 4, 1); }
  if (st === 3) for (let i = -1; i < hw + 1; i += 3) { P(H[3], hx + i, hy - 2, 3, 3); P(H[4], hx + i, hy - 2, 1, 1); }
  if (st === 5) { P(H[3], hx + 3, hy - 4, hw - 6, 5); P(H[4], hx + 4, hy - 4, 2, 1); }
  if (st === 7) { P(H[3], hx + hw / 2 - 2, hy - 5, 4, 14); P(H[4], hx + hw / 2 - 1, hy - 5, 1, 10); }
}
function paintFigHairFront(P, st, hx, hy, hw, hh, H) {
  if (st === 4) { P(H[2], hx + 1, hy, hw - 2, 2); return; }
  P(H[3], hx - 1, hy - 1, hw + 2, 5); P(H[4], hx + 1, hy - 1, 4, 1); P(H[2], hx + hw - 3, hy, 3, 6); P(H[3], hx - 1, hy + 3, 2, 5);
  if (st === 1 || st === 6) { P(H[3], hx - 2, hy + 3, 3, 14); P(H[2], hx + hw - 1, hy + 3, 3, 14); }
  if (st === 2) { P(H[3], hx + hw, hy + 1, 3, 3); P(H[2], hx + hw + 1, hy + 4, 2, 6); }
  if (st === 3) for (let i = -1; i < hw + 1; i += 3) P(H[3], hx + i, hy - 2, 3, 3);
  if (st === 5) { P(H[3], hx + 3, hy - 4, hw - 6, 4); }
  if (st === 7) { P(H[3], hx + hw / 2 - 2, hy - 5, 4, 6); }
}

// ───────────── Busto de espaldas para el combate (64×64) ─────────────
// El jugador visto desde atrás y algo girado hacia el rival (arriba a la derecha), de cintura para arriba:
// así se ve grande, como los entrenadores de las batallas de GBA. pose: idle0, idle1, attack, cast, hurt, win
export function backBust(ap, pose = 'idle0') {
  const key = 'K' + keyOf(ap) + pose; let c = cache.get(key); if (c) return c;
  c = paintBackBust(ap, pose); cache.set(key, c); return c;
}
function paintBackBust(ap, pose) {
  const [cv, x] = mk(64, 64);
  const P = (c, px, py, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(px, py, w, h); };
  const E = (cx, cy, rx, ry, c) => { for (let r = -ry; r <= ry; r++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r * r) / (ry * ry)))); if (w > 0) P(c, Math.round(cx - w), Math.round(cy + r), w * 2, 1); } };
  const race = ap.race || 'humano', fem = ap.sex === 'f', dwarf = race === 'enano', elf = race === 'elfo', tief = race === 'tiefling';
  const eq = ap.equip || {}; const bodyL = eq.body ? LOOKS[eq.body] : null; const capeL = eq.cape ? LOOKS[eq.cape] : null; const headL = eq.head ? LOOKS[eq.head] : null;
  const S = ramp(ap.skin || '#e8b48c'), Hh = ramp(ap.hair || '#5a3620'), Tp = ramp(bodyL?.color || ap.top || '#b85a3a');
  const hurt = pose === 'hurt', atk = pose === 'attack', cast = pose === 'cast', win = pose === 'win', br = pose === 'idle1' ? 1 : 0;
  const dy = br + (hurt ? 3 : 0), dx = hurt ? -3 : 0;
  const hx = 31 + dx, hy = 21 + dy; // centro de la cabeza
  const shW = dwarf ? 26 : fem ? 19 : 22; // media anchura de hombros
  const shY = 39 + dy;
  // Cola de tiefling asomando por debajo, a la derecha
  if (tief) { const T = ramp(shift(ap.skin, -1)); for (let i = 0; i < 14; i++) { const ty = 62 - i * 1.4, tx = 50 + Math.round(Math.sin(i / 3) * 3) + i * 0.6; P(i > 11 ? T[4] : T[3], Math.round(tx), Math.round(ty), 3, 2); } P(T[2], 58, 42, 4, 3); P(T[4], 59, 41, 2, 1); }
  // Brazos (detrás del torso salvo el alzado)
  const arm = (side, mode) => {
    const ax = side < 0 ? 31 - shW - 1 + dx : 31 + shW - 6 + dx;
    if (mode === 'up') { P(Tp[2], ax + 1, shY - 30, 7, 30); P(Tp[3], ax + 1, shY - 30, 4, 28); P(Tp[4], ax + 2, shY - 29, 1, 24); P(S[3], ax + 1, shY - 36, 7, 7); P(S[4], ax + 2, shY - 35, 3, 3); return; }
    if (mode === 'fwd') { P(Tp[2], ax + (side < 0 ? 2 : -1), shY + 2, 7, 12); P(S[2], ax + (side < 0 ? 5 : -2), shY + 4, 5, 5); return; }
    P(side < 0 ? Tp[3] : Tp[1], ax, shY + 3, 7, 30); P(side < 0 ? Tp[4] : Tp[2], ax + (side < 0 ? 1 : 4), shY + 4, 2, 26);
    P(S[side < 0 ? 3 : 2], ax + 1, 60, 6, 4);
  };
  arm(-1, cast ? 'fwd' : win ? 'up' : 'down'); arm(1, atk ? 'up' : cast ? 'fwd' : 'down');
  // Torso y hombros (trapecio con volumen: luz arriba a la izquierda)
  for (let y = shY; y < 64; y++) {
    const k = Math.min(1, (y - shY) / 6); const half = Math.round(shW - 3 + k * 3 - Math.max(0, (y - shY - 14) * 0.12));
    const x0 = 31 + dx - half, w = half * 2;
    P(Tp[3], x0, y, w, 1); P(Tp[2], x0 + Math.round(w * 0.62), y, Math.round(w * 0.38), 1); P(Tp[1], x0 + w - 3, y, 3, 1);
    if (y < shY + 3) P(Tp[4], x0 + 2, y, Math.round(w * 0.4), 1);
  }
  // omóplatos y costura de la espalda
  P(Tp[2], 30 + dx, shY + 5, 1, 24); P(Tp[4], 18 + dx, shY + 8, 8, 1); P(Tp[2], 37 + dx, shY + 9, 9, 1);
  if (eq.body === 'cota') for (let y = shY + 1; y < 64; y += 2) for (let i = 31 + dx - shW + 2 + ((y >> 1) & 1); i < 31 + dx + shW - 2; i += 2) P(Tp[2], i, y);
  if (eq.body === 'coraza') { P(Tp[5], 14 + dx, shY + 3, 30, 3); P(Tp[6], 16 + dx, shY + 3, 8, 1); P(Tp[1], 30 + dx, shY + 3, 1, 24); }
  if (eq.body === 'delantal') { const D = ramp('#ece4d2'); P(D[3], 27 + dx, shY + 18, 8, 3); P(D[3], 24 + dx, shY + 20, 4, 6); P(D[2], 34 + dx, shY + 20, 4, 6); P(D[4], 28 + dx, shY + 18, 3, 1); P(D[3], 31 + dx - shW + 2, shY + 18, shW * 2 - 4, 1); }
  if (eq.body === 'habito') { const Hd = ramp(Tp[3]); E(31 + dx, shY + 6, 11, 7, Hd[2]); E(31 + dx, shY + 5, 9, 5, Hd[3]); P(ramp('#d8c8a0')[3], 31 + dx - shW + 3, 58, shW * 2 - 6, 2); }
  if (eq.body === 'vestido') { for (let i = 0; i < 4; i++) { P('#f8f0e0', 29 + dx, shY + 6 + i * 4, 5, 1); P('#f8f0e0', 31 + dx, shY + 5 + i * 4, 1, 3); } }
  if (eq.body === 'jubon') { for (let i = 0; i < 3; i++) P('#e8c050', 22 + dx + i * 9, shY + 2, 2, 1); }
  // Capa
  if (capeL) {
    const C = ramp(capeL.color);
    for (let y = shY - 1; y < 64; y++) { const k = (y - shY) / 24; const half = Math.round(shW - 1 + k * 4); const x0 = 31 + dx - half; P(C[3], x0, y, half * 2, 1); P(C[2], x0 + half + 4, y, half - 4, 1); P(C[1], x0 + half * 2 - 2, y, 2, 1); if (y < shY + 3) P(C[4], x0 + 3, y, half - 2, 1); }
    for (let i = 0; i < 4; i++) P(C[2], 31 + dx - shW + 6 + i * 9, shY + 8, 1, 30 - i * 2);
    P(C[4], 25 + dx, shY - 2, 12, 2); if (capeL.trim) { P(capeL.trim, 31 + dx - shW, shY, shW * 2, 1); P(capeL.trim, 30 + dx, shY - 2, 3, 3); }
  }
  // Cuello y nuca
  P(S[2], hx - 4, hy + 9, 9, 8); P(S[3], hx - 4, hy + 9, 4, 6); P(S[1], hx + 2, hy + 10, 3, 6);
  // Cabeza (de espaldas, con la mejilla derecha asomando)
  E(hx, hy, dwarf ? 13 : 11, 12, S[3]); E(hx + 6, hy + 2, 5, 7, S[3]); P(S[4], hx + 8, hy - 2, 2, 5);
  // Orejas
  if (elf) { for (const s of [-1, 1]) { const ex = hx + s * 11; P(S[3], ex + (s < 0 ? -5 : 0), hy - 1, 6, 3); P(S[3], ex + (s < 0 ? -8 : 3), hy - 4, 5, 3); P(S[4], ex + (s < 0 ? -8 : 5), hy - 5, 3, 2); P(S[1], ex + (s < 0 ? -2 : 0), hy + 2, 3, 2); } }
  else { P(S[3], hx - 13, hy - 1, 3, 6); P(S[2], hx - 12, hy, 1, 4); P(S[3], hx + 11, hy - 1, 3, 6); P(S[2], hx + 11, hy, 1, 4); }
  // Pelo desde atrás
  const st = ap.hairStyle ?? 0; const H = Hh;
  if (st === 4) { E(hx, hy - 1, dwarf ? 12 : 10, 11, mix(S[3], H[2], 0.45)); P(mix(S[4], H[3], 0.4), hx - 6, hy - 9, 7, 2); }
  else {
    E(hx, hy - 1, dwarf ? 13 : 12, 12, H[3]); E(hx - 3, hy - 4, 8, 7, H[4]); P(H[5], hx - 7, hy - 9, 6, 2); P(H[5], hx - 4, hy - 11, 4, 1);
    E(hx + 5, hy + 2, 6, 8, H[2]);
    for (let i = 0; i < 6; i++) P(H[2], hx - 9 + i * 3, hy + 2 + (i % 2), 1, 7); // mechones
    P(H[3], hx - 10, hy + 8, 20, 3); P(H[2], hx - 2, hy + 9, 12, 2);
    if (st === 1 || st === 6) { for (let y = hy + 10; y < shY + 14 + (st === 1 ? 6 : 0); y++) { const w = st === 1 ? 10 - Math.floor((y - hy - 10) / 6) : 0; if (st === 1) { P(H[3], hx - w, y, w * 2, 1); P(H[2], hx + 2, y, Math.max(0, w - 2), 1); P(H[4], hx - w + 2, y, 2, 1); } } }
    if (st === 6) { for (const s of [-1, 1]) { for (let i = 0; i < 6; i++) { P(i % 2 ? H[2] : H[4], hx + s * 6 - 2, hy + 10 + i * 4, 4, 4); } P('#b8322c', hx + s * 6 - 2, hy + 34, 4, 2); } }
    if (st === 2) { P('#b8322c', hx - 2, hy + 6, 5, 2); for (let i = 0; i < 9; i++) { P(i % 2 ? H[3] : H[4], hx - 2 + (i > 5 ? 1 : 0), hy + 8 + i * 3, 5, 3); } P(H[2], hx + 1, hy + 9, 2, 24); }
    if (st === 3) { for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; E(hx + Math.cos(a) * 9, hy - 1 + Math.sin(a) * 9, 3, 3, i % 2 ? H[4] : H[3]); } }
    if (st === 5) { E(hx, hy + 2, 6, 5, H[3]); E(hx - 1, hy + 1, 4, 3, H[4]); P(H[5], hx - 2, hy, 2, 1); P(H[1], hx - 5, hy + 6, 10, 1); }
    if (st === 7) { P(H[3], hx - 3, hy - 16, 6, 26); P(H[4], hx - 2, hy - 16, 2, 22); P(H[2], hx + 2, hy - 14, 1, 22); E(hx, hy - 1, 11, 11, mix(S[3], H[2], 0.5)); P(H[3], hx - 3, hy - 14, 6, 22); }
  }
  // Cuernos de tiefling
  if (tief && eq.head !== 'capucha') { const Hn = ramp('#4a3440'); for (const s of [-1, 1]) { const bx = hx + s * 8; P(Hn[3], bx - 2, hy - 12, 4, 5); P(Hn[3], bx + s * 2 - 2, hy - 16, 4, 5); P(Hn[4], bx + s * 4 - 1, hy - 19, 3, 4); P(Hn[5], bx + s * 5, hy - 20, 2, 2); P(Hn[1], bx + (s > 0 ? 1 : -2), hy - 13, 2, 4); } }
  // Tocado
  if (headL) { const C = ramp(headL.color); const id = eq.head;
    if (id === 'barretina') { E(hx, hy - 6, 13, 7, C[3]); E(hx - 3, hy - 8, 7, 4, C[4]); P(C[2], hx - 13, hy - 2, 26, 3); E(hx + 12, hy - 4, 5, 8, C[2]); P(C[1], hx + 14, hy + 2, 3, 4); }
    else if (id === 'sombrero') { E(hx, hy - 4, 22, 6, C[2]); E(hx - 1, hy - 5, 21, 5, C[3]); E(hx, hy - 10, 11, 7, C[3]); E(hx - 3, hy - 12, 6, 3, C[4]); P(C[1], hx - 11, hy - 5, 22, 1); }
    else if (id === 'capucha') { E(hx, hy, 15, 15, C[3]); E(hx - 4, hy - 5, 8, 7, C[4]); E(hx + 7, hy + 4, 6, 10, C[2]); for (let y = hy + 12; y < shY + 6; y++) P(C[3], hx - 13, y, 26, 1); P(C[1], hx + 6, hy + 10, 5, 12); }
    else if (id === 'casco' || id === 'cuernos_yelmo') { E(hx, hy - 3, 14, 11, C[3]); E(hx - 4, hy - 7, 7, 5, C[5]); P(C[6], hx - 6, hy - 10, 3, 2); P(C[2], hx - 14, hy + 5, 28, 3); P(C[1], hx + 6, hy - 6, 5, 11);
      if (id === 'cuernos_yelmo') { const Hn = ramp('#e8e0cc'); for (const s of [-1, 1]) { P(Hn[3], hx + s * 14 - 2, hy - 8, 5, 5); P(Hn[4], hx + s * 17 - 2, hy - 14, 4, 7); P(Hn[5], hx + s * 18 - 1, hy - 17, 2, 4); } } }
    else if (id === 'diadema') { P(C[3], hx - 12, hy - 3, 24, 2); P(C[5], hx - 9, hy - 3, 6, 1); }
    else if (id === 'cofia') { E(hx, hy - 3, 14, 11, C[3]); E(hx - 4, hy - 7, 7, 5, C[4]); P(C[2], hx - 14, hy + 5, 28, 2); }
  }
  // Arma en la mano alzada
  if (atk) { const wx = 31 + shW - 4 + dx; P('#d4dae4', wx + 2, shY - 58 < 0 ? 0 : shY - 58, 3, 22); P('#ffffff', wx + 2, Math.max(0, shY - 58), 1, 20); P('#a6aebe', wx + 4, Math.max(0, shY - 57), 1, 20); P('#c8a040', wx - 1, shY - 37, 9, 2); P('#9c6644', wx + 2, shY - 35, 3, 4); }
  if (cast) { for (const sx of [12, 50]) { P('#fff4c0', sx + dx, shY + 4, 3, 3); P('#ffffff', sx + 1 + dx, shY + 5, 1, 1); } }
  outlineSel(cv);
  x.clearRect(0, 63, 64, 1);
  return cv;
}

// ───────────── El bandolero (rival de combate, 56×64, mirando a la izquierda) ─────────────
// Barretina, barba cerrada, capa parda, camisa blanca, faja roja, calzones, alpargatas de cintas y un
// pedreñal (la pistola corta de los bandoleros catalanes). pose: idle (0/1), attack, hurt
export function bandolero(pose = 'idle', frame = 0) {
  const key = 'BAND' + pose + frame; let c = cache.get(key); if (c) return c;
  const [cv, x] = mk(56, 64);
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const E = (cx, cy, rx, ry, col) => { for (let r = -ry; r <= ry; r++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r * r) / (ry * ry)))); if (w > 0) P(col, Math.round(cx - w), Math.round(cy + r), w * 2, 1); } };
  const S = ramp('#c98e62'), Hb = ramp('#2a1d18'), Cp = ramp('#6a4a34'), Sh = ramp('#ece4d2'), Fx = ramp('#b8322c'), Br = ramp('#3a3448'), Ro = ramp('#d8c8a0'), Iro = ramp('#5e6476'), Wd = ramp('#7c4c38');
  const atk = pose === 'attack', hurt = pose === 'hurt', br = pose === 'idle' && frame ? 1 : 0;
  const lean = hurt ? 3 : atk ? -2 : 0; const dy = br + (hurt ? 2 : 0);
  const cx = 28 + lean; // eje del cuerpo
  // Piernas: calzones oscuros y alpargatas con cintas cruzadas
  const leg = (lx, back) => { P(back ? Br[2] : Br[3], lx, 44, 6, 13); P(Br[4], lx + 1, 45, 1, 10); P(Br[1], lx + 4, 45, 2, 12); P(Ro[3], lx, 57, 7, 3); P(Ro[2], lx + 4, 58, 3, 2); P(Ro[4], lx, 57, 3, 1); for (let i = 0; i < 3; i++) { P(Fx[2], lx + (i & 1 ? 4 : 1), 51 + i * 2, 2, 1); } P(Hb[1], lx - 1, 60, 8, 2); };
  leg(cx + 3, true); leg(cx - 8 + (atk ? -2 : 0), false);
  // Capa por detrás (asoma a la derecha)
  for (let y = 22 + dy; y < 52; y++) { const w = Math.round(6 + (y - 22) * 0.35); P(Cp[2], cx + 6, y, w, 1); P(Cp[1], cx + 6 + w - 2, y, 2, 1); }
  // Torso: camisa blanca, chaleco pardo y faja roja con la culata de otro pedreñal
  P(Sh[3], cx - 9, 24 + dy, 16, 14); P(Sh[4], cx - 8, 25 + dy, 5, 11); P(Sh[2], cx + 3, 25 + dy, 4, 12);
  P(Cp[3], cx - 9, 24 + dy, 4, 15); P(Cp[3], cx + 4, 24 + dy, 4, 15); P(Cp[4], cx - 8, 25 + dy, 1, 12); P(Cp[1], cx + 7, 25 + dy, 1, 13);
  P(Fx[3], cx - 10, 38 + dy, 19, 6); P(Fx[4], cx - 9, 38 + dy, 10, 1); P(Fx[2], cx - 10, 42 + dy, 19, 2); P(Fx[1], cx + 6, 39 + dy, 3, 5);
  P(Wd[3], cx + 1, 36 + dy, 3, 4); P(Iro[4], cx + 2, 35 + dy, 1, 2); // culata en la faja
  P(Iro[3], cx - 6, 39 + dy, 6, 1); P(Iro[5], cx - 6, 39 + dy, 2, 1); // cuchillo
  // Brazo trasero (derecho del personaje) y brazo delantero según la pose
  P(Sh[2], cx + 5, 26 + dy, 4, 11); P(S[2], cx + 5, 37 + dy, 4, 3);
  if (atk) { // apunta el pedreñal hacia el jugador
    P(Sh[3], cx - 18, 27 + dy, 12, 4); P(Sh[4], cx - 18, 27 + dy, 12, 1); P(S[3], cx - 21, 27 + dy, 4, 4);
    P(Wd[3], cx - 22, 29 + dy, 4, 4); P(Iro[3], cx - 33, 27 + dy, 13, 2); P(Iro[5], cx - 33, 27 + dy, 11, 1); P(Iro[2], cx - 34, 26 + dy, 2, 4); P('#fcd456', cx - 25, 25 + dy, 2, 2);
  } else if (hurt) { P(Sh[3], cx - 12, 22 + dy, 4, 10); P(S[3], cx - 13, 19 + dy, 4, 4); }
  else { P(Sh[3], cx - 13, 26 + dy, 5, 11); P(Sh[4], cx - 13, 26 + dy, 1, 10); P(S[3], cx - 13, 37 + dy, 5, 3); P(Wd[3], cx - 14, 39 + dy, 4, 5); P(Iro[3], cx - 13, 44 + dy, 2, 6); P(Iro[5], cx - 13, 44 + dy, 1, 5); }
  // Cabeza (de tres cuartos, mira a la izquierda)
  const hy = 12 + dy + (hurt ? 1 : 0), hx = cx - 1;
  E(hx, hy, 7, 8, S[3]); P(S[4], hx - 6, hy - 4, 3, 5); P(S[2], hx + 4, hy - 3, 3, 8);
  P(S[3], hx - 8, hy + 1, 2, 2); // nariz
  // barba y bigote
  E(hx + 1, hy + 5, 7, 4, Hb[3]); P(Hb[3], hx - 6, hy + 1, 4, 5); P(Hb[4], hx - 5, hy + 3, 2, 2); P(Hb[2], hx + 3, hy + 4, 4, 4); P(Hb[1], hx - 7, hy + 2, 3, 1);
  if (atk) { P('#3a1018', hx - 6, hy + 4, 3, 2); } // boca abierta
  // ojo y ceja
  if (hurt) P(INK, hx - 5, hy - 1, 3, 1); else { P('#fbf6ee', hx - 5, hy - 2, 3, 2); P(INK, hx - 5, hy - 2, 1, 2); }
  P(Hb[2], hx - 6, hy - 4 + (atk ? 1 : 0), 4, 1);
  P(S[2], hx + 2, hy - 2, 2, 3); // oreja
  // Barretina roja caída hacia atrás
  E(hx + 1, hy - 7, 8, 3, Fx[3]); P(Fx[4], hx - 5, hy - 9, 6, 1); P(Fx[2], hx - 7, hy - 5, 16, 2);
  for (let i = 0; i < 7; i++) P(i > 4 ? Fx[2] : Fx[3], hx + 6 + i, hy - 9 + Math.round(i * 0.9) + (frame && pose === 'idle' && i > 3 ? 1 : 0), 3, 3);
  P(Fx[1], hx + 12, hy - 1, 2, 2);
  outlineSel(cv);
  cache.set(key, cv); return cv;
}

// ───────────── Luchador de tres cuartos (PNJ en peleas, 56×64, mirando a la izquierda) ─────────────
// Mismo estilo que el bandolero pero a partir del aspecto de cada PNJ. pose: idle (0/1), attack, hurt
export function fighter(ap, pose = 'idle', frame = 0) {
  const key = 'FT' + keyOf(ap) + pose + frame; let c = cache.get(key); if (c) return c;
  const [cv, x] = mk(56, 64);
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const E = (cx, cy, rx, ry, col) => { for (let r = -ry; r <= ry; r++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r * r) / (ry * ry)))); if (w > 0) P(col, Math.round(cx - w), Math.round(cy + r), w * 2, 1); } };
  const race = ap.race || 'humano', dwarf = race === 'enano', elf = race === 'elfo', tief = race === 'tiefling', fem = ap.sex === 'f', old = ap.age === 'anciano';
  const eq = ap.equip || {}; const bodyL = eq.body ? LOOKS[eq.body] : null, capeL = eq.cape ? LOOKS[eq.cape] : null, headL = eq.head ? LOOKS[eq.head] : null;
  const S = ramp(ap.skin || '#e8b48c'), Hh = ramp(old ? mix(ap.hair || '#5a3620', '#d8d4cc', 0.6) : ap.hair || '#5a3620'), Tp = ramp(bodyL?.color || ap.top || '#b85a3a'), Bt = ramp(ap.bottom || '#4a4a6a'), Sh = ramp('#5a3a2a');
  const atk = pose === 'attack', hurt = pose === 'hurt', br = pose === 'idle' && frame ? 1 : 0;
  const lean = hurt ? 3 : atk ? -2 : 0; const dy = br + (hurt ? 2 : 0) + (dwarf ? 6 : 0); const cx = 28 + lean;
  const long = !!bodyL?.long; const tw = dwarf ? 20 : fem ? 14 : 16; const top = 24 + dy, waist = 38 + dy - (dwarf ? 1 : 0);
  // Capa por detrás
  if (capeL) { const C = ramp(capeL.color); for (let y = top - 2; y < 54; y++) { const w = Math.round(6 + (y - top) * 0.35); P(C[2], cx + 6, y, w, 1); P(C[1], cx + 6 + w - 2, y, 2, 1); } if (capeL.trim) P(capeL.trim, cx + 6, 53, 14, 1); }
  // Cola de tiefling
  if (tief) { const T = ramp(shift(ap.skin, -1)); for (let i = 0; i < 12; i++) P(i > 9 ? T[4] : T[3], cx + 9 + i, waist + 4 + Math.round(Math.sin(i / 2.5 + frame) * 2), 2, 2); }
  // Piernas o falda
  if (long) { for (let y = waist; y < 58; y++) { const w = Math.round(tw / 2 + 1 + (y - waist) * 0.25); P(Tp[3], cx - w, y, w * 2, 1); P(Tp[2], cx + 1, y, w - 1, 1); P(Tp[4], cx - w + 1, y, 2, 1); } P(Sh[3], cx - 7, 58, 6, 3); P(Sh[3], cx + 1, 58, 6, 3); }
  else { const leg = (lx, back) => { P(back ? Bt[2] : Bt[3], lx, waist + 4, 6, 15 - (dwarf ? 4 : 0)); P(Bt[4], lx + 1, waist + 5, 1, 10 - (dwarf ? 4 : 0)); P(Bt[1], lx + 4, waist + 5, 2, 13 - (dwarf ? 4 : 0)); P(Sh[3], lx, 57, 7, 4); P(Sh[4], lx, 57, 3, 1); P(Sh[1], lx + 4, 59, 3, 2); }; leg(cx + 2, true); leg(cx - 8 + (atk ? -2 : 0), false); }
  // Torso
  P(Tp[3], cx - tw / 2, top, tw, waist - top + 4); P(Tp[4], cx - tw / 2 + 1, top + 1, 4, waist - top); P(Tp[2], cx + tw / 2 - 5, top + 1, 4, waist - top + 2); P(Tp[1], cx + tw / 2 - 1, top + 2, 1, waist - top);
  if (eq.body === 'cota') for (let y = top + 1; y < waist + 3; y += 2) for (let i = cx - tw / 2 + 1 + ((y >> 1) & 1); i < cx + tw / 2 - 1; i += 2) P(Tp[2], i, y);
  if (eq.body === 'coraza') { P(Tp[5], cx - tw / 2 + 2, top + 2, tw - 6, 9); P(Tp[6], cx - tw / 2 + 3, top + 3, 3, 3); }
  if (eq.body === 'delantal') { const D = ramp('#ece4d2'); P(D[3], cx - 5, top + 4, 10, waist - top + 8); P(D[2], cx + 3, top + 5, 2, waist - top + 6); }
  if (eq.body === 'jubon') for (let y = top + 2; y < waist; y += 3) P('#e8c050', cx - 3, y, 2, 1);
  if (!long || eq.body === 'habito') { P(shift(Tp[3], -3), cx - tw / 2, waist, tw, 3); P('#d8a840', cx - 2, waist, 3, 3); }
  // Brazos
  P(Tp[2], cx + tw / 2 - 2, top + 2, 4, 11); P(S[2], cx + tw / 2 - 2, top + 13, 4, 3);
  if (atk) { P(Tp[3], cx - tw / 2 - 10, top + 3, 12, 4); P(Tp[4], cx - tw / 2 - 10, top + 3, 12, 1); P(S[3], cx - tw / 2 - 15, top + 2, 6, 6); P(S[4], cx - tw / 2 - 15, top + 2, 3, 2); P(S[1], cx - tw / 2 - 11, top + 6, 2, 2); }
  else if (hurt) { P(Tp[3], cx - tw / 2 - 3, top - 2, 4, 10); P(S[3], cx - tw / 2 - 4, top - 5, 5, 4); }
  else { P(Tp[3], cx - tw / 2 - 4, top + 2, 5, 12); P(Tp[4], cx - tw / 2 - 4, top + 2, 1, 11); P(S[3], cx - tw / 2 - 4, top + 14, 5, 3); }
  // Cabeza de tres cuartos mirando a la izquierda
  const hy = top - 12 + (hurt ? 1 : 0), hx = cx - 1; const hr = dwarf ? 8 : 7;
  E(hx, hy, hr, 8, S[3]); P(S[4], hx - 6, hy - 4, 3, 5); P(S[2], hx + 4, hy - 3, 3, 8); P(S[3], hx - hr - 1, hy + 1, 2, 2);
  if (elf) { P(S[3], hx + 4, hy - 3, 3, 2); P(S[3], hx + 6, hy - 6, 2, 4); P(S[4], hx + 7, hy - 8, 1, 3); } else P(S[2], hx + 3, hy - 1, 2, 3);
  if (ap.beard) { E(hx + 1, hy + 5, hr, dwarf ? 6 : 4, Hh[3]); P(Hh[3], hx - 6, hy + 1, 4, 5); P(Hh[4], hx - 5, hy + 3, 2, 2); P(Hh[2], hx + 3, hy + 4, 4, 5); if (dwarf) P('#e8c050', hx - 1, hy + 10, 2, 2); }
  else { P(atk ? '#3a1018' : mix(S[1], '#9a3a3a', 0.4), hx - 5, hy + 4, 3, atk ? 2 : 1); if (fem) P(mix(S[3], '#e86a6a', 0.4), hx - 3, hy + 2, 2, 1); }
  if (hurt) P(INK, hx - 5, hy - 1, 3, 1); else { P('#fbf6ee', hx - 5, hy - 2, 3, 2); P(tief ? '#e8b020' : ap.eyes || INK, hx - 5, hy - 2, 1, 2); if (fem) P(INK, hx - 6, hy - 3, 1, 1); }
  P(Hh[2], hx - 6, hy - 4 + (atk ? 1 : 0), 4, 1);
  // Pelo según peinado
  const st = ap.hairStyle ?? 0;
  if (st !== 4 || old) { E(hx + 2, hy - 4, hr, 5, Hh[3]); P(Hh[4], hx - 2, hy - 8, 5, 1); P(Hh[2], hx + 4, hy - 4, 4, 6); P(Hh[3], hx - 6, hy - 6, 4, 3); }
  if (st === 1 || st === 6) { for (let y = hy; y < hy + 14; y++) P(Hh[3], hx + 3, y, 5, 1); P(Hh[2], hx + 6, hy, 2, 14); if (st === 6) P('#b8322c', hx + 4, hy + 13, 3, 2); }
  if (st === 2) { P(Hh[3], hx + 7, hy - 3, 3, 3); P(Hh[3], hx + 9, hy, 3, 8); P('#b8322c', hx + 7, hy - 2, 2, 2); }
  if (st === 3) for (let i = 0; i < 6; i++) E(hx - 4 + i * 3, hy - 7 + (i & 1), 2, 2, i & 1 ? Hh[4] : Hh[3]);
  if (st === 5) { E(hx + 5, hy - 8, 3, 3, Hh[3]); P(Hh[4], hx + 4, hy - 10, 2, 1); }
  if (st === 7) { P(Hh[3], hx, hy - 13, 3, 8); P(Hh[4], hx, hy - 13, 1, 6); }
  if (tief && eq.head !== 'capucha') { const Hn = ramp('#4a3440'); P(Hn[3], hx - 2, hy - 9, 3, 3); P(Hn[3], hx - 1, hy - 12, 3, 3); P(Hn[4], hx, hy - 14, 2, 2); P(Hn[3], hx + 4, hy - 9, 3, 3); P(Hn[3], hx + 6, hy - 12, 3, 3); P(Hn[4], hx + 7, hy - 14, 2, 2); }
  if (headL) { const C = ramp(headL.color); const id = eq.head;
    if (id === 'barretina') { E(hx + 1, hy - 7, 8, 3, C[3]); P(C[4], hx - 5, hy - 9, 6, 1); P(C[2], hx - 7, hy - 5, 16, 2); for (let i = 0; i < 6; i++) P(i > 3 ? C[2] : C[3], hx + 6 + i, hy - 9 + Math.round(i * 0.9), 3, 3); }
    else if (id === 'sombrero') { E(hx + 1, hy - 5, 13, 3, C[2]); E(hx + 1, hy - 6, 12, 2, C[3]); E(hx + 1, hy - 10, 7, 4, C[3]); P(C[4], hx - 3, hy - 12, 4, 1); P(C[1], hx - 6, hy - 6, 14, 1); }
    else if (id === 'capucha') { E(hx + 1, hy - 1, 10, 11, C[3]); E(hx - 1, hy + 1, 6, 7, S[3]); P(C[4], hx - 4, hy - 9, 5, 1); P(C[2], hx + 6, hy - 4, 4, 14); P('#fbf6ee', hx - 5, hy - 1, 3, 2); P(INK, hx - 5, hy - 1, 1, 2); }
    else if (id === 'casco' || id === 'cuernos_yelmo') { E(hx + 1, hy - 4, 9, 6, C[3]); P(C[5], hx - 5, hy - 8, 5, 2); P(C[2], hx - 8, hy, 18, 2); P(C[2], hx - 2, hy - 3, 2, 6); if (id === 'cuernos_yelmo') { const Hn = ramp('#e8e0cc'); P(Hn[3], hx - 10, hy - 7, 3, 4); P(Hn[4], hx - 11, hy - 11, 2, 4); P(Hn[3], hx + 9, hy - 7, 3, 4); P(Hn[2], hx + 10, hy - 11, 2, 4); } }
    else if (id === 'diadema') { P(C[3], hx - 6, hy - 6, 14, 2); P('#e84a5a', hx - 2, hy - 7, 2, 2); }
    else if (id === 'cofia') { E(hx + 2, hy - 5, 9, 5, C[3]); P(C[4], hx - 3, hy - 9, 5, 1); P(C[2], hx - 6, hy - 1, 16, 2); }
  }
  outlineSel(cv);
  cache.set(key, cv); return cv;
}
