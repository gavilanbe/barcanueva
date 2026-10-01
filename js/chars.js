// Pintor de personajes por capas (16x24). Todo se compone en código y se contornea al final,
// así cada combinación de raza, sexo, piel, pelo, peinado y equipo sale con el mismo acabado GBA.
import { canvas, outline, shade } from './util.js';

export const SKINS = ['#f6d3b3', '#e8b48c', '#c98e62', '#9a6440', '#6e452b', '#4a2e1e'];
export const TIEFLING_SKINS = ['#c9504a', '#9c3d6e', '#6d4a9c', '#4f6aa8', '#b07a8c', '#d98060'];
export const HAIRS = ['#2a1d18', '#5a3620', '#8f5a2c', '#c9913e', '#e6cf7a', '#b8452c', '#d8d4cc', '#3d3a6e', '#7fa0c8', '#2e5a40'];
export const HAIRSTYLES = ['Corto', 'Melena', 'Coleta', 'Rizos', 'Rapado', 'Moño', 'Trenzas', 'Cresta'];
export const RACES = ['humano', 'elfo', 'tiefling', 'enano'];
export const RACE_NAME = { humano: 'Humano', elfo: 'Elfo', tiefling: 'Tiefling', enano: 'Enano' };

// Aspecto visual de equipo (lo usa items.js vía clave `look`).
export const LOOKS = {
  barretina: { slot: 'head', color: '#b8322c' },
  sombrero: { slot: 'head', color: '#5a4030' },
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

const cache = new Map();

export function charSprite(ap, dir, frame) {
  const key = JSON.stringify(ap) + dir + frame;
  let c = cache.get(key); if (c) return c;
  c = paint(ap, dir, frame); cache.set(key, c);
  if (cache.size > 3000) cache.delete(cache.keys().next().value);
  return c;
}

function paint(ap, dir, frame) {
  const [cv, x] = canvas(16, 24);
  const side = dir === 'left' || dir === 'right';
  const r = ap.race || 'humano';
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  // Proporciones por raza
  let headY = 3, torsoY = 12, torsoH = 6, legY = 18, legH = 5, tw = 8, tx = 4;
  if (r === 'elfo') { headY = 1; torsoY = 10; torsoH = 7; legY = 17; legH = 6; }
  if (r === 'enano') { headY = 6; torsoY = 15; torsoH = 5; legY = 20; legH = 3; tw = 10; tx = 3; }
  const skin = ap.skin, skinS = shade(skin, 0.78), hair = ap.hair, hairS = shade(hair, 0.7), hairL = shade(hair, 1.25);
  const eq = ap.equip || {};
  const bodyLook = eq.body ? LOOKS[eq.body] : null;
  const top = bodyLook?.color || ap.top || '#b85a3a', topS = shade(top, 0.72), topL = shade(top, 1.2);
  const bottom = ap.bottom || '#4a4a6a', bottomS = shade(bottom, 0.72);
  const boots = ap.boots || '#4a3024';
  const long = bodyLook?.long || (ap.sex === 'f' && ap.skirt);
  const capeLook = eq.cape ? LOOKS[eq.cape] : null;
  const walk = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  // Capa por detrás (vista de frente asoma por los lados; de espaldas se ve entera)
  if (capeLook && dir !== 'up') {
    const cc = shade(capeLook.color, 0.8);
    if (side) P(cc, dir === 'right' ? tx - 1 : tx + tw - 1, torsoY, 2, torsoH + legH - 1);
    else { P(cc, tx - 1, torsoY + 1, 1, torsoH + legH - 2); P(cc, tx + tw, torsoY + 1, 1, torsoH + legH - 2); }
  }
  // Cola de tiefling
  if (r === 'tiefling') {
    const tc = shade(skin, 0.7);
    if (dir === 'up') { P(tc, 8, legY - 1, 1, 3); P(tc, 9, legY + 2, 1, 2); P(tc, 10, legY + 3, 2, 1); P(tc, 11, legY + 2, 1, 1); }
    else if (side) { const s = dir === 'right' ? -1 : 1; const bx = dir === 'right' ? tx : tx + tw - 1; P(tc, bx + s, legY - 1, 1, 1); P(tc, bx + 2 * s, legY, 1, 1); P(tc, bx + 3 * s, legY - 1, 1, 1); P(tc, bx + 3 * s, legY - 2, 1, 1); }
    else { P(tc, 12, legY, 1, 2); P(tc, 13, legY - 1, 1, 1); }
  }
  // Pelo largo por detrás del cuerpo
  const st = ap.hairStyle ?? 0;
  if ((st === 1 || st === 6) && dir !== 'up') {
    if (!side) { P(hairS, 3, headY + 3, 1, 8); P(hairS, 12, headY + 3, 1, 8); if (st === 6) { P(hair, 3, headY + 11, 1, 2); P(hair, 12, headY + 11, 1, 2); } }
    else P(hairS, dir === 'right' ? 4 : 10, headY + 3, 2, 8);
  }
  // Piernas
  if (long) {
    const lc = bodyLook?.long ? top : bottom, lcS = shade(lc, 0.72);
    P(lc, tx, legY, tw, legH - 1); P(lcS, tx + tw - 2, legY, 2, legH - 1);
    if (!side) P(lcS, tx + 3, legY + 1, 1, legH - 2);
    P(boots, tx + 1 + (walk > 0 ? 1 : 0), legY + legH - 1, 2, 1); P(boots, tx + tw - 3 - (walk < 0 ? 1 : 0), legY + legH - 1, 2, 1);
  } else if (side) {
    const f = dir === 'right' ? 1 : -1;
    const a = walk * f, b = -walk * f; // pierna delantera y trasera
    P(bottomS, 6 - b, legY, 3, legH - 1); P(boots, 6 - b, legY + legH - 1, 3, 1);
    P(bottom, 7 + a, legY, 3, legH - 1); P(boots, 7 + a + (f > 0 ? 0 : 0), legY + legH - 1, 3, 1);
  } else {
    const lL = walk > 0 ? -1 : 0, lR = walk < 0 ? -1 : 0;
    const lx1 = tx + 1, lx2 = tx + tw - 4;
    P(bottom, lx1, legY, 3, legH - 1 + lL); P(boots, lx1, legY + legH - 1 + lL, 3, 1);
    P(bottom, lx2, legY, 3, legH - 1 + lR); P(bottomS, lx2 + 2, legY, 1, legH - 1 + lR); P(boots, lx2, legY + legH - 1 + lR, 3, 1);
  }
  // Torso
  if (side) {
    P(top, 5, torsoY, 6, torsoH); P(topS, dir === 'right' ? 5 : 10, torsoY, 1, torsoH);
    if (r === 'enano') P(top, 4, torsoY, 8, torsoH);
  } else {
    P(top, tx, torsoY, tw, torsoH); P(topS, tx + tw - 2, torsoY, 2, torsoH); P(topL, tx + 1, torsoY, 1, torsoH - 1);
    if (ap.sex === 'f' && r !== 'enano') { P(topS, tx, torsoY + torsoH - 2, 1, 1); P(topS, tx + tw - 1, torsoY + torsoH - 2, 1, 1); }
  }
  // Cinturón
  const belt = bodyLook?.metal ? '#5a4a3a' : shade(top, 0.5);
  if (!long || bodyLook?.long) P(belt, side ? 5 : tx, torsoY + torsoH - 1, side ? 6 : tw, 1);
  if (bodyLook?.metal) { P(shade(top, 1.35), side ? 7 : tx + 2, torsoY + 1, 2, 2); }
  if (eq.body === 'delantal') P('#f2ecde', side ? 6 : tx + 2, torsoY + 2, side ? 4 : tw - 4, torsoH + 1);
  // Brazos con balanceo
  const armSwing = walk;
  if (side) {
    const ax = dir === 'right' ? 7 - armSwing : 7 + armSwing;
    P(topS, ax, torsoY + 1, 2, 4); P(skin, ax, torsoY + 5, 2, 1);
  } else {
    P(topS, tx - 2, torsoY + 1 + (armSwing > 0 ? 1 : 0), 2, 4); P(skin, tx - 2, torsoY + 5 + (armSwing > 0 ? 1 : 0), 2, 1);
    P(topS, tx + tw, torsoY + 1 + (armSwing < 0 ? 1 : 0), 2, 4); P(skin, tx + tw, torsoY + 5 + (armSwing < 0 ? 1 : 0), 2, 1);
  }
  // Cabeza
  const hx = 4, hw = 8, hh = 9;
  P(skin, hx, headY + 1, hw, hh - 2); P(skin, hx + 1, headY, hw - 2, hh);
  P(skinS, side ? (dir === 'right' ? hx : hx + hw - 1) : hx + hw - 1, headY + 2, 1, hh - 4);
  P(skinS, hx + 1, headY + hh - 1, hw - 2, 1);
  // Orejas
  if (r === 'elfo') {
    if (!side) { P(skin, hx - 2, headY + 3, 2, 1); P(skin, hx - 1, headY + 4, 1, 1); P(skin, hx + hw, headY + 3, 2, 1); P(skinS, hx + hw, headY + 4, 1, 1); }
    else { const ex = dir === 'right' ? hx + 1 : hx + hw - 3; P(skin, ex, headY + 2, 2, 1); P(skin, dir === 'right' ? ex - 1 : ex + 2, headY + 1, 1, 1); P(skinS, ex, headY + 3, 2, 1); }
  } else if (side) { P(skinS, dir === 'right' ? hx + 2 : hx + hw - 3, headY + 4, 1, 2); }
  // Cara
  const eye = ap.eyes || '#2a2030';
  if (dir === 'down') {
    P(eye, hx + 2, headY + 4, 1, 2); P(eye, hx + hw - 3, headY + 4, 1, 2);
    P('#ffffff', hx + 2, headY + 4, 1, 1); P('#ffffff', hx + hw - 3, headY + 4, 1, 1);
    P(eye, hx + 2, headY + 5, 1, 1); P(eye, hx + hw - 3, headY + 5, 1, 1);
    P(shade(skin, 0.86), hx + 3, headY + 7, 2, 1);
    if (r === 'tiefling') { P('#f2d060', hx + 2, headY + 4, 1, 1); P('#f2d060', hx + hw - 3, headY + 4, 1, 1); }
    if (ap.sex === 'f') { P(shade(skin, 0.9), hx + 1, headY + 6, 1, 1); P(shade(skin, 0.9), hx + hw - 2, headY + 6, 1, 1); }
  } else if (side) {
    const ex = dir === 'right' ? hx + hw - 3 : hx + 2;
    P(eye, ex, headY + 4, 1, 2); P(r === 'tiefling' ? '#f2d060' : '#ffffff', ex, headY + 4, 1, 1);
    P(skin, dir === 'right' ? hx + hw : hx - 1, headY + 5, 1, 1); // nariz
  }
  // Barba (enanos y quien la lleve)
  if (ap.beard) {
    const bc = hair, bs = hairS;
    if (dir === 'down') { P(bc, hx, headY + 6, hw, 3); P(bc, hx + 1, headY + 9, hw - 2, 2); P(bc, hx + 2, headY + 11, hw - 4, 1); P(bs, hx + 3, headY + 7, 2, 1); P(skin, hx + 3, headY + 6, 2, 1); }
    else if (side) { const bx = dir === 'right' ? hx + 3 : hx; P(bc, bx, headY + 6, 5, 3); P(bc, dir === 'right' ? bx + 2 : bx, headY + 9, 3, 2); }
  }
  // Pelo
  paintHair(P, st, dir, side, hx, hw, headY, hair, hairS, hairL, !!eq.head);
  // Cuernos de tiefling
  if (r === 'tiefling') {
    const hc = '#3a2a30', hl = '#6a5058';
    if (!side) { P(hc, hx, headY - 1, 1, 2); P(hc, hx - 1, headY - 3, 1, 3); P(hl, hx - 1, headY - 3, 1, 1); P(hc, hx + hw - 1, headY - 1, 1, 2); P(hc, hx + hw, headY - 3, 1, 3); P(hl, hx + hw, headY - 3, 1, 1); }
    else { const cx = dir === 'right' ? hx + 3 : hx + 4; const s = dir === 'right' ? -1 : 1; P(hc, cx, headY - 1, 1, 2); P(hc, cx + s, headY - 2, 1, 1); P(hc, cx + 2 * s, headY - 3, 1, 2); P(hl, cx + 2 * s, headY - 3, 1, 1); }
  }
  // Tocado
  if (eq.head && LOOKS[eq.head]) paintHead(P, LOOKS[eq.head], eq.head, dir, side, hx, hw, headY);
  // Capa de espaldas
  if (capeLook && dir === 'up') {
    P(capeLook.color, tx - 1, torsoY, tw + 2, torsoH + legH - 1); P(shade(capeLook.color, 0.8), tx + tw - 1, torsoY, 2, torsoH + legH - 1);
    if (capeLook.trim) P(capeLook.trim, tx - 1, torsoY + torsoH + legH - 2, tw + 2, 1);
  }
  outline(cv, '#1c1424');
  return cv;
}

function paintHair(P, st, dir, side, hx, hw, hy, h, hs, hl, hat) {
  if (st === 4) { // rapado: sombra fina
    if (dir === 'up') P(hs, hx + 1, hy, hw - 2, 7); else P(hs, hx + 1, hy, hw - 2, 1);
    return;
  }
  if (dir === 'up') {
    P(h, hx, hy, hw, 8); P(hs, hx, hy + 5, hw, 3); P(hl, hx + 2, hy + 1, 3, 1);
    if (st === 1 || st === 6) { P(h, hx, hy + 8, hw, 3); P(hs, hx + 1, hy + 11, hw - 2, 1); }
    if (st === 2) { P(hs, hx + 3, hy + 8, 2, 4); P(h, hx + 3, hy + 8, 1, 3); }
    if (st === 5) { P(h, hx + 2, hy - 2, 4, 3); P(hl, hx + 3, hy - 2, 1, 1); }
    if (st === 6) { P(hs, hx + 1, hy + 11, 2, 3); P(hs, hx + hw - 3, hy + 11, 2, 3); }
    if (st === 3) { P(h, hx - 1, hy + 1, 1, 6); P(h, hx + hw, hy + 1, 1, 6); }
    if (st === 7) { P(h, hx + 3, hy - 3, 2, 10); }
    return;
  }
  if (side) {
    const back = dir === 'right' ? hx : hx + hw - 4, front = dir === 'right' ? hx + hw - 4 : hx;
    P(h, hx, hy, hw, 3); P(h, back, hy + 3, 4, 3); P(hs, back, hy + 5, 4, 1); P(h, front, hy + 2, 3, 1);
    P(hl, hx + 2, hy, 3, 1);
    if (st === 1 || st === 6) P(h, back, hy + 6, 3, 5);
    if (st === 2) { const t = dir === 'right' ? hx - 2 : hx + hw; P(hs, t, hy + 3, 2, 2); P(h, t + (dir === 'right' ? -1 : 1), hy + 5, 2, 4); }
    if (st === 5) P(h, back - (dir === 'right' ? 1 : -1), hy - 2, 4, 3);
    if (st === 3) { P(h, hx - 1, hy - 1, hw + 2, 2); P(h, back, hy + 6, 4, 2); }
    if (st === 7) { P(h, hx + 2, hy - 3, 4, 3); P(hs, hx + 2, hy - 1, 4, 1); }
    return;
  }
  // de frente
  P(h, hx, hy, hw, 3); P(hl, hx + 2, hy, 3, 1);
  P(h, hx, hy + 3, 1, 3); P(h, hx + hw - 1, hy + 3, 1, 3);
  if (st === 0 || st === 3) { P(h, hx + 1, hy + 3, 3, 1); P(hs, hx + hw - 4, hy + 3, 3, 1); }
  if (st === 1 || st === 6) { P(h, hx + 1, hy + 3, 2, 1); P(h, hx + hw - 3, hy + 3, 2, 1); P(h, hx - 1, hy + 3, 1, 7); P(h, hx + hw, hy + 3, 1, 7); P(hs, hx - 1, hy + 8, 1, 2); P(hs, hx + hw, hy + 8, 1, 2); }
  if (st === 2) { P(h, hx + 1, hy + 3, 6, 1); P(h, hx + hw, hy + 1, 2, 2); P(hs, hx + hw + 1, hy + 3, 1, 3); }
  if (st === 3) { P(h, hx - 1, hy - 1, hw + 2, 2); P(h, hx - 1, hy + 1, 1, 5); P(h, hx + hw, hy + 1, 1, 5); P(hl, hx + 1, hy - 1, 1, 1); P(hl, hx + 5, hy - 1, 1, 1); }
  if (st === 5) { P(h, hx + 2, hy - 3, 4, 3); P(hl, hx + 3, hy - 3, 1, 1); }
  if (st === 7) { P(h, hx + 3, hy - 3, 2, 3); P(hl, hx + 3, hy - 3, 1, 1); P(hs, hx, hy + 1, 2, 2); P(hs, hx + hw - 2, hy + 1, 2, 2); }
}

function paintHead(P, L, id, dir, side, hx, hw, hy) {
  const c = L.color, s = shade(c, 0.72), l = shade(c, 1.3);
  switch (id) {
    case 'barretina':
      P(c, hx, hy - 1, hw, 3); P(s, hx, hy + 1, hw, 1);
      if (dir === 'up') P(c, hx + 2, hy + 2, 4, 5);
      else if (side) { const t = dir === 'right' ? hx - 2 : hx + hw - 1; P(c, t, hy - 1, 3, 3); P(s, t + (dir === 'right' ? -1 : 2), hy + 1, 1, 3); }
      else P(c, hx + hw - 1, hy - 2, 2, 3);
      P(l, hx + 1, hy - 1, 2, 1); break;
    case 'sombrero':
      P(c, hx - 2, hy + 1, hw + 4, 2); P(s, hx - 2, hy + 2, hw + 4, 1); P(c, hx + 1, hy - 3, hw - 2, 4); P(shade(c, 0.5), hx + 1, hy, hw - 2, 1); P(l, hx + 2, hy - 3, 2, 1); break;
    case 'capucha':
      P(c, hx - 1, hy - 1, hw + 2, 4); P(s, hx - 1, hy + 3, 1, 7); P(s, hx + hw, hy + 3, 1, 7);
      if (dir === 'up') P(c, hx - 1, hy, hw + 2, 10); P(l, hx + 1, hy - 1, 3, 1); break;
    case 'casco': case 'cuernos_yelmo':
      P(c, hx - 1, hy - 1, hw + 2, 5); P(s, hx - 1, hy + 3, hw + 2, 1); P(l, hx + 1, hy - 1, 3, 1);
      if (dir === 'down') P(s, hx + 3, hy + 3, 2, 3);
      if (id === 'cuernos_yelmo') { P('#e8e0cc', hx - 3, hy - 3, 2, 3); P('#e8e0cc', hx + hw + 1, hy - 3, 2, 3); }
      break;
    case 'diadema':
      P(c, hx, hy + 1, hw, 1); P('#e84a4a', hx + 3, hy + 1, 2, 1); P(l, hx + 1, hy + 1, 1, 1); break;
    case 'cofia':
      P(c, hx - 1, hy - 1, hw + 2, 4); P(s, hx - 1, hy + 2, hw + 2, 1); P(l, hx + 1, hy - 1, 3, 1); break;
  }
}

// Retrato grande (48x48) para los cuadros de diálogo: el sprite de frente ampliado x2 con fondo.
export function portrait(ap) {
  const key = 'P' + JSON.stringify(ap);
  let c = cache.get(key); if (c) return c;
  const s = charSprite(ap, 'down', 0);
  const [cv, x] = canvas(34, 34);
  x.drawImage(s, 0, 0, 16, 16, 1, 1, 32, 32);
  cache.set(key, cv); return cv;
}
