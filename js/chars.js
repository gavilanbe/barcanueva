// Pintor de personajes por capas (16×24). Todo se compone en código con rampas de tono desplazado y contorno
// selectivo, así cada combinación de raza, sexo, edad, piel, pelo, peinado y equipo sale con el mismo acabado.
// Fotogramas: 0 quieto · 1 paso derecho · 2 paso medio · 3 paso izquierdo · 4 respiración (reposo).
import { canvas } from './util.js';
import { ramp, shift, mix, INK, outlineSel } from './pal.js';

export const SKINS = ['#f6d3b3', '#e8b48c', '#c98e62', '#9a6440', '#6e452b', '#4a2e1e'];
export const TIEFLING_SKINS = ['#c9504a', '#9c3d6e', '#6d4a9c', '#4f6aa8', '#b07a8c', '#d98060'];
export const HAIRS = ['#2a1d18', '#5a3620', '#8f5a2c', '#c9913e', '#e6cf7a', '#b8452c', '#d8d4cc', '#3d3a6e', '#7fa0c8', '#2e5a40'];
export const HAIRSTYLES = ['Corto', 'Melena', 'Coleta', 'Rizos', 'Rapado', 'Moño', 'Trenzas', 'Cresta'];
export const RACES = ['humano', 'elfo', 'tiefling', 'enano'];
export const RACE_NAME = { humano: 'Humano', elfo: 'Elfo', tiefling: 'Tiefling', enano: 'Enano' };

// Aspecto visual del equipo (lo usa items.js vía clave `look`).
export const LOOKS = {
  barretina: { slot: 'head', color: '#b8322c' },
  sombrero: { slot: 'head', color: '#6a4a34' },
  capucha: { slot: 'head', color: '#4a5a3a' },
  casco: { slot: 'head', color: '#a8b0b8', metal: true },
  diadema: { slot: 'head', color: '#e8c050', metal: true },
  cofia: { slot: 'head', color: '#ece4d0' },
  cuernos_yelmo: { slot: 'head', color: '#8a9098', metal: true },
  tunica: { slot: 'body', color: null },
  jubon: { slot: 'body', color: '#7a2e3a' },
  cota: { slot: 'body', color: '#8e969e', metal: true },
  coraza: { slot: 'body', color: '#b8c0c8', metal: true },
  habito: { slot: 'body', color: '#5a4636', long: true },
  vestido: { slot: 'body', color: '#3e6aa0', long: true },
  delantal: { slot: 'body', color: '#d8d0bc' },
  capa: { slot: 'cape', color: '#6a2a3a' },
  capa_verde: { slot: 'cape', color: '#2f5a3a' },
  capa_azul: { slot: 'cape', color: '#2f3e7a' },
  capa_real: { slot: 'cape', color: '#8a1a2a', trim: '#e8c050' },
};

// Proporciones por raza (la fila de los pies es siempre la 22; la 23 es el contorno)
const BODY = {
  humano: { hy: 3, hh: 9, hw: 10, ty: 12, th: 6, tw: 8, lh: 4 },
  tiefling: { hy: 3, hh: 9, hw: 10, ty: 12, th: 6, tw: 8, lh: 4 },
  elfo: { hy: 2, hh: 9, hw: 9, ty: 11, th: 6, tw: 7, lh: 5 },
  enano: { hy: 6, hh: 9, hw: 11, ty: 15, th: 5, tw: 10, lh: 2 },
  nino: { hy: 7, hh: 8, hw: 9, ty: 15, th: 4, tw: 7, lh: 3 },
};

const cache = new Map();
export function charSprite(ap, dir, frame = 0, blink = false) {
  const key = (ap._k ||= JSON.stringify(ap)) + dir + frame + (blink ? 'b' : '');
  let c = cache.get(key); if (c) return c;
  c = paint(ap, dir, frame, blink); cache.set(key, c);
  if (cache.size > 4000) cache.delete(cache.keys().next().value);
  return c;
}

function paint(ap, dir, frame, blink) {
  // La vista izquierda es el espejo de la derecha
  if (dir === 'left') { const r = paint(ap, 'right', frame, blink); const [c, m] = canvas(16, 24); m.translate(16, 0); m.scale(-1, 1); m.drawImage(r, 0, 0); return c; }
  const [cv, x] = canvas(16, 24);
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const race = ap.race || 'humano'; const kid = ap.age === 'nino';
  const B = { ...(kid ? BODY.nino : BODY[race] || BODY.humano) };
  const side = dir === 'left' || dir === 'right', up = dir === 'up', down = dir === 'down';
  const walk = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const bob = frame === 1 || frame === 3 || frame === 4 ? 1 : 0; // el cuerpo baja 1 px en los apoyos y al respirar
  const eq = ap.equip || {};
  const bodyL = eq.body ? LOOKS[eq.body] : null, capeL = eq.cape ? LOOKS[eq.cape] : null, headL = eq.head ? LOOKS[eq.head] : null;
  const old = ap.age === 'anciano';
  const S = ramp(ap.skin || '#e8b48c');
  const hairBase = old && !['#d8d4cc', '#7fa0c8', '#3d3a6e', '#2e5a40'].includes(ap.hair) ? mix(ap.hair || '#5a3620', '#d8d4cc', 0.6) : ap.hair || '#5a3620';
  const Hh = ramp(hairBase);
  const Tp = ramp(bodyL?.color || ap.top || '#b85a3a'), Bt = ramp(ap.bottom || '#4a4a6a'), Sh = ramp(ap.boots || '#5a3a2a');
  const long = !!bodyL?.long;
  const Cp = capeL ? ramp(capeL.color) : null;
  const hy = B.hy + bob, ty = B.ty + bob, ly = B.ty + B.th; // ly: inicio de piernas (no baja: las piernas se acortan)
  const hx = Math.floor(8 - B.hw / 2), tx = Math.floor(8 - B.tw / 2);
  const legH = 22 - ly; // filas de pierna hasta los pies (incluye zapato)

  // ── Capa por detrás (frente y lados)
  if (Cp && !up) {
    if (side) { const bx = dir === 'right' ? tx - 1 : tx + B.tw - 1; P(Cp[2], bx, ty, 2, B.th + legH - 2); P(Cp[1], bx, ty + B.th + legH - 3, 2, 1); }
    else { P(Cp[2], tx - 1, ty + 1, 1, B.th + legH - 3); P(Cp[2], tx + B.tw, ty + 1, 1, B.th + legH - 3); }
  }
  // ── Cola de tiefling
  if (race === 'tiefling') {
    const T = ramp(shift(ap.skin, -1));
    if (up) { P(T[3], 8, ly, 1, 2); P(T[3], 9, ly + 2, 1, 1); P(T[3], 10, ly + 3, 2, 1); P(T[4], 12, ly + 2, 1, 1); P(T[2], 12, ly + 1, 1, 1); }
    else if (side) { const s = dir === 'right' ? -1 : 1, bx = dir === 'right' ? tx : tx + B.tw - 1; const sw = frame % 2; P(T[3], bx + s, ly - 1, 1, 1); P(T[3], bx + 2 * s, ly + sw, 1, 1); P(T[3], bx + 3 * s, ly - 1 + sw, 1, 1); P(T[4], bx + 3 * s, ly - 2 + sw, 1, 1); }
    else { P(T[3], tx + B.tw, ly - 1, 1, 2); P(T[3], tx + B.tw + 1, ly - 2, 1, 1); P(T[4], tx + B.tw + 1, ly - 3, 1, 1); }
  }
  // ── Pelo largo por detrás del cuerpo
  const st = ap.hairStyle ?? 0; const hatHides = headL && (eq.head === 'capucha');
  if ((st === 1 || st === 6) && !up && !hatHides) {
    if (!side) { P(Hh[2], hx - 1, hy + 4, 1, 8); P(Hh[1], hx + B.hw, hy + 4, 1, 8); }
    else P(Hh[2], dir === 'right' ? hx : hx + B.hw - 3, hy + 4, 3, 8);
  }
  // ── Piernas y pies
  if (long) {
    const L = Tp; const hem = 21;
    P(L[3], tx, ly, B.tw, hem - ly); P(L[2], tx + B.tw - 2, ly, 2, hem - ly); P(L[4], tx + 1, ly, 1, hem - ly - 1);
    if (!side) { P(L[2], tx + 3, ly + 1, 1, hem - ly - 1); P(L[1], tx, hem - 1, B.tw, 1); }
    // pies asomando
    const fl = walk > 0 ? 1 : 0, fr = walk < 0 ? 1 : 0;
    P(Sh[2], tx + 1, 21 - fl, 3, 1); P(Sh[2], tx + B.tw - 4, 21 - fr, 3, 1);
    P(L[3], tx, 21, B.tw, 1); P(L[2], tx + 1, 21, B.tw - 2, 1);
    x.clearRect(tx + 3, 21, B.tw - 6, 1);
  } else if (side) {
    const f = dir === 'right' ? 1 : -1; const a = walk * f; // a>0: pierna delantera adelantada
    const back = (dx, c, sh) => { P(c, 6 + dx, ly, 3, legH - 1); P(sh, 6 + dx, 21, 3, 1); P(Sh[1], 6 + dx + (f > 0 ? 2 : 0), 21, 1, 1); };
    back(-a, Bt[2], Sh[2]);
    P(Bt[3], 7 + a, ly, 3, legH - 1); P(Bt[4], 7 + a, ly, 1, legH - 2); P(Sh[3], 7 + a, 21, 3, 1); P(Sh[4], 7 + a + (f > 0 ? 0 : 2), 21, 1, 1);
    if (f < 0) { /* espejo sencillo para izquierda */ }
  } else {
    const lL = walk > 0 ? -1 : 0, lR = walk < 0 ? -1 : 0;
    const l1 = tx + 1, l2 = tx + B.tw - 4;
    const leg = (lx, lift, shade) => {
      const h = legH - 1 + lift; if (h > 0) { P(shade ? Bt[2] : Bt[3], lx, ly, 3, h); if (!shade) P(Bt[4], lx, ly, 1, h - 1); else P(Bt[1], lx + 2, ly, 1, h); }
      P(Sh[3], lx, ly + h, 3, 1); P(Sh[4], lx, ly + h, 1, 1);
    };
    leg(l1, lL, false); leg(l2, lR, true);
    if (B.tw >= 8) P(Bt[1], l1 + 3, ly, l2 - l1 - 3, 1);
  }
  // ── Torso
  if (side) {
    const sx = B.tw >= 10 ? tx + 1 : 5; const sw = B.tw >= 10 ? B.tw - 2 : 6;
    P(Tp[3], sx, ty, sw, B.th); P(Tp[4], dir === 'right' ? sx : sx + sw - 1, ty, 1, B.th - 1); P(Tp[2], dir === 'right' ? sx + sw - 1 : sx, ty + 1, 1, B.th - 1);
    P(Tp[2], sx, ty + B.th - 1, sw, 1);
  } else {
    P(Tp[3], tx, ty, B.tw, B.th);
    P(Tp[2], tx + B.tw - 2, ty, 2, B.th); P(Tp[1], tx + B.tw - 1, ty + 1, 1, B.th - 1);
    P(Tp[4], tx + 1, ty, 1, B.th - 1); P(Tp[5], tx + 1, ty, 2, 1);
    if (down && !long && !bodyL?.metal && eq.body !== 'delantal') { P(S[2], 7, ty, 2, 1); P(S[3], 7, ty, 1, 1); } // cuello en pico
    if (ap.sex === 'f' && race !== 'enano' && down) { P(Tp[2], tx + 1, ty + 3, 2, 1); P(Tp[2], tx + B.tw - 3, ty + 3, 2, 1); }
  }
  // Detalles del equipo de cuerpo
  if (eq.body === 'cota') { for (let j = ty; j < ty + B.th; j++) for (let i = (side ? 5 : tx) + ((j + frame) & 1); i < (side ? 11 : tx + B.tw); i += 2) P(Tp[2], i, j); P(Tp[5], side ? 6 : tx + 1, ty + 1, 2, 1); }
  if (eq.body === 'coraza') { P(Tp[5], side ? 6 : tx + 2, ty + 1, side ? 3 : B.tw - 4, 2); P(Tp[6], side ? 6 : tx + 2, ty + 1, 1, 1); P(Tp[1], side ? 5 : tx, ty + B.th - 1, side ? 6 : B.tw, 1); }
  if (eq.body === 'jubon' && down) { P('#e8c050', 8, ty + 1, 1, 1); P('#e8c050', 8, ty + 3, 1, 1); }
  if (eq.body === 'delantal') { const D = ramp('#ece4d2'); if (!up) { P(D[3], side ? (dir === 'right' ? 8 : 5) : tx + 2, ty + 1, side ? 3 : B.tw - 4, B.th + 2); P(D[2], side ? (dir === 'right' ? 10 : 5) : tx + B.tw - 3, ty + 2, 1, B.th); } else P(D[2], tx, ty + 2, B.tw, 1); }
  if (eq.body === 'habito') { P(ramp('#d8c8a0')[3], side ? 5 : tx, ty + B.th - 1, side ? 6 : B.tw, 1); }
  // Cinturón
  if (!long) { P(shift(Tp[3], -3), side ? 5 : tx, ty + B.th - 1, side ? 6 : B.tw, 1); if (down && !bodyL?.metal) P('#d8a840', 7, ty + B.th - 1, 2, 1); }
  // ── Brazos (balanceo)
  if (side) {
    const f = dir === 'right' ? 1 : -1; const sw = walk * f; const ax = 7 + sw;
    P(Tp[2], ax, ty + 1, 2, 4); P(Tp[3], ax, ty + 1, 1, 3); P(S[3], ax + (sw > 0 ? 1 : 0), ty + 5, 2, 1); P(S[2], ax + 1, ty + 5, 1, 1);
  } else {
    const aL = walk > 0 ? 1 : 0, aR = walk < 0 ? 1 : 0; const ax1 = tx - 2, ax2 = tx + B.tw;
    P(Tp[3], ax1, ty + 1, 2, 4 - aL + (B.th > 5 ? 0 : -1)); P(Tp[4], ax1, ty + 1, 1, 2); P(S[3], ax1, ty + 5 - aL + (B.th > 5 ? 0 : -1), 2, 1);
    P(Tp[2], ax2, ty + 1, 2, 4 - aR + (B.th > 5 ? 0 : -1)); P(Tp[1], ax2 + 1, ty + 2, 1, 2); P(S[2], ax2, ty + 5 - aR + (B.th > 5 ? 0 : -1), 2, 1);
  }
  // ── Cabeza
  const hw = B.hw, hh = B.hh;
  P(S[3], hx + 1, hy, hw - 2, hh); P(S[3], hx, hy + 1, hw, hh - 3);
  if (side) {
    const back = dir === 'right' ? hx : hx + hw - 1;
    P(S[2], back, hy + 2, 1, hh - 4); P(S[4], dir === 'right' ? hx + hw - 3 : hx + 1, hy + 2, 2, 2);
    P(S[2], hx + 1, hy + hh - 1, hw - 2, 1);
  } else {
    P(S[4], hx + 1, hy + 1, 2, 3); P(S[2], hx + hw - 1, hy + 2, 1, hh - 4); P(S[2], hx + 2, hy + hh - 1, hw - 4, 1);
  }
  // Orejas
  if (race === 'elfo') {
    if (!side) { P(S[3], hx - 2, hy + 4, 2, 1); P(S[3], hx - 1, hy + 5, 1, 1); P(S[4], hx - 2, hy + 4, 1, 1); P(S[3], hx + hw, hy + 4, 2, 1); P(S[2], hx + hw, hy + 5, 1, 1); }
    else { const ex = dir === 'right' ? hx + 2 : hx + hw - 4; P(S[3], ex, hy + 4, 2, 1); P(S[3], dir === 'right' ? ex - 1 : ex + 2, hy + 3, 1, 1); P(S[4], dir === 'right' ? ex - 2 : ex + 3, hy + 2, 1, 1); P(S[2], ex, hy + 5, 2, 1); }
  } else if (side) { P(S[2], dir === 'right' ? hx + 3 : hx + hw - 4, hy + 4, 1, 2); }
  // Cara
  const eye = ap.eyes || '#2a1c30';
  const eyeY = hy + Math.round(hh * 0.5);
  if (down) {
    const e1 = hx + 2, e2 = hx + hw - 3;
    if (blink) { P(S[1], e1, eyeY + 1, 1, 1); P(S[1], e2, eyeY + 1, 1, 1); }
    else {
      P(eye, e1, eyeY, 1, 2); P(eye, e2, eyeY, 1, 2);
      if (race === 'tiefling') { P('#f2d060', e1, eyeY, 1, 1); P('#f2d060', e2, eyeY, 1, 1); } else { P(mix(eye, '#ffffff', 0.55), e1, eyeY, 1, 1); P(mix(eye, '#ffffff', 0.55), e2, eyeY, 1, 1); }
      if (ap.sex === 'f') { P(INK, e1 - 1, eyeY - 1 + 0, 1, 1); P(INK, e2 + 1, eyeY - 1, 1, 1); }
    }
    if (ap.sex === 'f' || kid) { P(mix(S[3], '#e8706a', 0.4), e1 - 1, eyeY + 2, 1, 1); P(mix(S[3], '#e8706a', 0.4), e2 + 1, eyeY + 2, 1, 1); }
    P(S[2], 7, eyeY + 3, 2, 1); // boca/barbilla sutil
  } else if (side) {
    const ex = dir === 'right' ? hx + hw - 3 : hx + 2;
    if (blink) P(S[1], ex, eyeY + 1, 1, 1); else { P(eye, ex, eyeY, 1, 2); P(race === 'tiefling' ? '#f2d060' : mix(eye, '#ffffff', 0.55), ex, eyeY, 1, 1); }
    P(S[3], dir === 'right' ? hx + hw : hx - 1, eyeY + 1, 1, 1); // nariz
    if (ap.sex === 'f' && !blink) P(INK, dir === 'right' ? ex + 1 : ex - 1, eyeY - 1, 1, 1);
  }
  // Barba
  if (ap.beard) {
    const Bd = Hh;
    if (down) { P(Bd[3], hx, eyeY + 2, hw, 3); P(Bd[3], hx + 1, eyeY + 5, hw - 2, race === 'enano' ? 3 : 1); if (race === 'enano') P(Bd[3], hx + 3, eyeY + 8, hw - 6, 1); P(Bd[2], hx + hw - 2, eyeY + 2, 2, 3); P(Bd[4], hx + 1, eyeY + 3, 1, 2); P(S[2], 7, eyeY + 3, 2, 1); P(Bd[4], 6, eyeY + 2, 1, 1); P(Bd[4], 9, eyeY + 2, 1, 1); }
    else if (side) { const bx = dir === 'right' ? hx + 4 : hx; P(Bd[3], bx, eyeY + 2, hw - 4, 3); P(Bd[3], dir === 'right' ? bx + 2 : bx, eyeY + 5, 3, race === 'enano' ? 3 : 1); P(Bd[2], bx, eyeY + 4, hw - 4, 1); }
  }
  // Pelo
  paintHair(P, st, dir, side, hx, hw, hy, Hh, !!headL, frame);
  // Cuernos
  if (race === 'tiefling' && eq.head !== 'capucha') {
    const Hn = ramp('#4a3440');
    if (!side) { P(Hn[3], hx + 1, hy - 1, 1, 2); P(Hn[3], hx, hy - 3, 1, 3); P(Hn[5], hx, hy - 3, 1, 1); P(Hn[3], hx + hw - 2, hy - 1, 1, 2); P(Hn[2], hx + hw - 1, hy - 3, 1, 3); P(Hn[5], hx + hw - 1, hy - 3, 1, 1); }
    else { const s = dir === 'right' ? -1 : 1; const cx = dir === 'right' ? hx + 4 : hx + hw - 5; P(Hn[3], cx, hy - 1, 1, 2); P(Hn[3], cx + s, hy - 2, 1, 1); P(Hn[4], cx + 2 * s, hy - 3, 1, 2); P(Hn[5], cx + 2 * s, hy - 3, 1, 1); }
  }
  // Tocado
  if (headL) paintHead(P, eq.head, headL, dir, side, hx, hw, hy);
  // Capa de espaldas (encima de todo)
  if (Cp && up) {
    const cy0 = ty, ch = B.th + legH - 2;
    P(Cp[3], tx - 1, cy0, B.tw + 2, ch); P(Cp[2], tx + B.tw - 1, cy0, 2, ch); P(Cp[4], tx, cy0, 1, ch - 2); P(Cp[1], tx - 1, cy0 + ch - 1, B.tw + 2, 1);
    if (walk) P(Cp[2], walk > 0 ? tx + 2 : tx + B.tw - 3, cy0 + 3, 1, ch - 4);
    if (capeL.trim) P(capeL.trim, tx - 1, cy0 + ch - 2, B.tw + 2, 1);
  }
  outlineSel(cv);
  return cv;
}

function paintHair(P, st, dir, side, hx, hw, hy, H, hat, frame) {
  const up = dir === 'up';
  if (st === 4) { if (up) { P(H[2], hx + 1, hy, hw - 2, 6); P(H[3], hx + 2, hy, hw - 5, 1); } else { P(H[2], hx + 1, hy, hw - 2, 1); if (side) P(H[2], dir === 'right' ? hx : hx + hw - 2, hy + 1, 2, 3); } return; }
  if (up) {
    P(H[3], hx, hy - 1, hw, 8); P(H[3], hx + 1, hy - 2, hw - 2, 1); P(H[2], hx, hy + 5, hw, 3); P(H[4], hx + 2, hy - 1, 3, 1); P(H[5], hx + 2, hy - 1, 1, 1);
    P(H[2], hx + hw - 2, hy, 2, 6);
    if (st === 1 || st === 6) { P(H[3], hx, hy + 8, hw, 4); P(H[2], hx + hw - 2, hy + 8, 2, 4); P(H[1], hx + 1, hy + 11, hw - 2, 1); }
    if (st === 6) { P(H[2], hx + 1, hy + 12, 2, 3); P(H[2], hx + hw - 3, hy + 12, 2, 3); P('#b8322c', hx + 1, hy + 14, 2, 1); P('#b8322c', hx + hw - 3, hy + 14, 2, 1); }
    if (st === 2) { const sw = frame === 1 ? 1 : frame === 3 ? -1 : 0; P(H[3], 7 + sw, hy + 7, 2, 5); P(H[2], 8 + sw, hy + 8, 1, 4); P('#b8322c', 7 + sw, hy + 7, 2, 1); }
    if (st === 5) { P(H[3], hx + 3, hy - 3, hw - 6, 3); P(H[4], hx + 4, hy - 3, 1, 1); }
    if (st === 3) { P(H[3], hx - 1, hy, 1, 7); P(H[3], hx + hw, hy, 1, 7); for (let i = 0; i < hw; i += 2) P(H[4], hx + i, hy - 2, 1, 1); }
    if (st === 7) { P(H[3], 7, hy - 4, 2, 11); P(H[4], 7, hy - 4, 1, 4); }
    return;
  }
  if (side) {
    const r = dir === 'right'; const back = r ? hx : hx + hw - 5, front = r ? hx + hw - 4 : hx + 1;
    P(H[3], hx, hy - 1, hw, 3); P(H[3], hx + 1, hy - 2, hw - 2, 1); P(H[3], back, hy + 2, 5, 4); P(H[2], back, hy + 5, 5, 1);
    P(H[3], front, hy + 2, 3, 1); P(H[4], hx + 2, hy - 1, 4, 1); P(H[5], hx + 3, hy - 1, 1, 1); P(H[2], r ? hx : hx + hw - 1, hy, 1, 6);
    if (st === 1 || st === 6) { P(H[3], back, hy + 6, 4, 6); P(H[2], back + (r ? 0 : 3), hy + 7, 1, 5); }
    if (st === 6) { P('#b8322c', back + 1, hy + 11, 2, 1); }
    if (st === 2) { const t = r ? hx - 2 : hx + hw; const sw = frame % 2; P(H[3], t, hy + 2, 2, 2); P(H[3], t + (r ? -1 : 1), hy + 4 + sw, 2, 4); P('#b8322c', t, hy + 2, 2, 1); }
    if (st === 5) { P(H[3], back + (r ? -1 : 2), hy - 3, 4, 3); P(H[4], back + (r ? 0 : 3), hy - 3, 1, 1); }
    if (st === 3) { P(H[3], hx - 1, hy - 2, hw + 2, 2); P(H[3], back, hy + 6, 5, 2); for (let i = 0; i < hw; i += 2) P(H[4], hx + i, hy - 2, 1, 1); }
    if (st === 7) { P(H[3], hx + 2, hy - 4, 4, 3); P(H[4], hx + 3, hy - 4, 2, 1); P(H[1], hx + 2, hy, hw - 3, 1); }
    return;
  }
  // de frente
  P(H[3], hx, hy - 1, hw, 3); P(H[3], hx + 1, hy - 2, hw - 2, 1); P(H[4], hx + 2, hy - 1, 3, 1); P(H[5], hx + 2, hy - 1, 1, 1); P(H[2], hx + hw - 3, hy - 1, 3, 2);
  P(H[3], hx, hy + 2, 1, 4); P(H[2], hx + hw - 1, hy + 2, 1, 4);
  if (st === 0 || st === 3) { P(H[3], hx + 1, hy + 2, 3, 1); P(H[2], hx + hw - 4, hy + 2, 2, 1); P(H[3], hx + 4, hy + 2, 1, 1); }
  if (st === 1 || st === 6) { P(H[3], hx + 1, hy + 2, 2, 1); P(H[2], hx + hw - 3, hy + 2, 2, 1); P(H[3], hx - 1, hy + 2, 1, 8); P(H[2], hx + hw, hy + 2, 1, 8); P(H[4], hx - 1, hy + 3, 1, 3); }
  if (st === 6) { P(H[3], hx - 1, hy + 10, 1, 2); P(H[2], hx + hw, hy + 10, 1, 2); P('#b8322c', hx - 1, hy + 11, 1, 1); P('#b8322c', hx + hw, hy + 11, 1, 1); }
  if (st === 2) { P(H[3], hx + 1, hy + 2, hw - 3, 1); P(H[3], hx + hw, hy, 2, 2); P(H[2], hx + hw + 1, hy + 2, 1, 4); }
  if (st === 3) { P(H[3], hx - 1, hy - 2, hw + 2, 2); P(H[3], hx - 1, hy, 1, 6); P(H[2], hx + hw, hy, 1, 6); for (let i = 0; i < hw + 2; i += 2) P(H[4], hx - 1 + i, hy - 2, 1, 1); }
  if (st === 5) { P(H[3], hx + 3, hy - 4, hw - 6, 3); P(H[4], hx + 4, hy - 4, 1, 1); P(H[3], hx + 1, hy + 2, hw - 2, 1); }
  if (st === 7) { P(H[3], 7, hy - 4, 2, 3); P(H[4], 7, hy - 4, 1, 1); P(H[2], hx, hy, 2, 2); P(H[2], hx + hw - 2, hy, 2, 2); }
}

function paintHead(P, id, L, dir, side, hx, hw, hy) {
  const C = ramp(L.color); const up = dir === 'up';
  switch (id) {
    case 'barretina':
      P(C[3], hx, hy - 2, hw, 3); P(C[2], hx, hy, hw, 1); P(C[4], hx + 1, hy - 2, 3, 1);
      if (up) { P(C[3], hx + 3, hy + 1, 4, 4); P(C[2], hx + 5, hy + 2, 2, 3); }
      else if (side) { const t = dir === 'right' ? hx - 2 : hx + hw - 1; P(C[3], t, hy - 2, 3, 3); P(C[2], t + (dir === 'right' ? -1 : 2), hy, 1, 3); }
      else { P(C[3], hx + hw - 2, hy - 4, 3, 3); P(C[2], hx + hw, hy - 2, 1, 3); }
      break;
    case 'sombrero':
      P(C[3], hx - 2, hy, hw + 4, 2); P(C[2], hx - 2, hy + 1, hw + 4, 1); P(C[3], hx + 1, hy - 4, hw - 2, 4); P(C[1], hx + 1, hy - 1, hw - 2, 1); P(C[4], hx + 2, hy - 4, 3, 1); P(C[2], hx + hw - 3, hy - 3, 2, 3);
      break;
    case 'capucha':
      P(C[3], hx - 1, hy - 2, hw + 2, 5); P(C[4], hx + 1, hy - 2, 3, 1); P(C[2], hx + hw - 1, hy - 1, 2, 4);
      if (up) P(C[3], hx - 1, hy + 2, hw + 2, 9);
      else if (side) P(C[3], dir === 'right' ? hx - 1 : hx + hw - 4, hy + 2, 5, 7);
      else { P(C[2], hx - 1, hy + 3, 1, 7); P(C[1], hx + hw, hy + 3, 1, 7); }
      break;
    case 'casco': case 'cuernos_yelmo':
      P(C[3], hx - 1, hy - 2, hw + 2, 6); P(C[2], hx - 1, hy + 3, hw + 2, 1); P(C[5], hx, hy - 1, 3, 2); P(C[6], hx + 1, hy - 1, 1, 1); P(C[2], hx + hw - 2, hy - 1, 2, 4);
      if (dir === 'down') P(C[2], 7, hy + 3, 2, 3);
      if (id === 'cuernos_yelmo') { const Hn = ramp('#e8e0cc'); P(Hn[3], hx - 3, hy - 4, 2, 3); P(Hn[4], hx - 3, hy - 4, 1, 1); P(Hn[3], hx + hw + 1, hy - 4, 2, 3); P(Hn[2], hx + hw + 2, hy - 3, 1, 2); }
      break;
    case 'diadema':
      P(C[3], hx, hy, hw, 1); P(C[5], hx + 1, hy, 2, 1); if (!up) { P('#e84a5a', 7, hy - 1, 2, 2); P('#ffb0b8', 7, hy - 1, 1, 1); } break;
    case 'cofia':
      P(C[3], hx - 1, hy - 2, hw + 2, 5); P(C[4], hx, hy - 2, 4, 1); P(C[2], hx - 1, hy + 2, hw + 2, 1); if (up) P(C[3], hx, hy + 3, hw, 3); break;
  }
}

// Compatibilidad: retrato pequeño (34×34) a partir del sprite de frente ampliado.
export function portrait(ap) {
  const key = 'P' + JSON.stringify(ap);
  let c = cache.get(key); if (c) return c;
  const s = charSprite(ap, 'down', 0);
  const [cv, x] = canvas(34, 34);
  x.drawImage(s, 0, 0, 16, 16, 1, 1, 32, 32);
  cache.set(key, cv); return cv;
}
