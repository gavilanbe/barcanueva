// Sprites procedurales de animales (por «plan» corporal) y muebles de interior.
import { canvas, outline, shade } from './util.js';
import { SP } from './eco.js';

const cache = new Map();

// Animal: 16x16, dir 'left'|'right', frame 0/1, cria = más pequeño
export function animalSprite(sp, dir = 'right', frame = 0, cria = false, sex = 'f') {
  const key = sp + dir + frame + cria + sex;
  if (cache.has(key)) return cache.get(key);
  const s = SP[sp]; const [cv, x] = canvas(16, 16);
  const P = (c, px, py, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(px, py, w, h); };
  const [c1, c2] = s.col; const c1s = shade(c1, 0.75), c1l = shade(c1, 1.2);
  const leg = frame ? 1 : 0;
  switch (s.plan) {
    case 'cuadrupedo': {
      const big = s.size >= 3;
      const by = big ? 5 : 7, bw = big ? 11 : 9, bh = big ? 6 : 5, bx = 2;
      P(c1, bx, by, bw, bh); P(c1s, bx, by + bh - 2, bw, 2); P(c1l, bx + 1, by, bw - 3, 1);
      if (s.col[1] && sp !== 'jabali') P(c2, bx + 1, by + bh - 1, bw - 3, 1);
      P(c1s, bx + 1, by + bh, 2, 3 - leg); P(c1, bx + bw - 3, by + bh, 2, 2 + leg); P(c1s, bx + 3, by + bh, 1, 2 + leg); P(c1, bx + bw - 1, by + bh, 1, 3 - leg);
      // cabeza
      const hx = bx + bw - 1, hy = by - (sp === 'jabali' ? -1 : 3);
      P(c1, hx, hy, 4, 4); P(c1s, hx, hy + 3, 4, 1); P('#1c1424', hx + 2, hy + 1);
      if (sp === 'jabali') { P(c1s, hx + 3, hy + 2, 2, 2); P('#f0e8d0', hx + 3, hy + 1, 1, 1); for (let i = 0; i < bw; i += 2) P(c1s, bx + i, by - 1); }
      else { P(c1, hx + 3, hy + 2, 2, 2); P('#1c1424', hx + 4, hy + 2); P(c1s, hx, hy - 1, 1, 2); }
      if (s.antlers && sex === 'm' && !cria) { const a = '#d8c8a0'; P(a, hx + 1, hy - 3, 1, 3); P(a, hx, hy - 4, 1, 1); P(a, hx + 2, hy - 4, 1, 1); if (s.antlers > 1) { P(a, hx + 3, hy - 3, 1, 2); P(a, hx + 4, hy - 4); P(a, hx - 1, hy - 3); } }
      if (s.horns && !cria) { const a = sex === 'm' ? '#6a5a4a' : '#8a7a6a'; P(a, hx, hy - 2, 2, 1); P(a, hx - 1, hy - 3, 1, sex === 'm' ? 3 : 1); P(a, hx - 2, hy - 1, 1, sex === 'm' ? 2 : 0); }
      P(c1s, bx - 1, by + 1, 1, 2); // cola
      break;
    }
    case 'conejo': {
      P(c1, 4, 8, 7, 5); P(c1s, 4, 11, 7, 2); P(c2, 3, 9, 2, 2);
      P(c1, 10, 6, 4, 4); P('#1c1424', 12, 7); P(c1, 10, 2, 1, 5); P(c1, 12, 2, 1, 5); P(shade(c2, 0.95), 10, 3, 1, 3);
      P(c1s, 5, 13, 2, 1 + leg); P(c1s, 9, 13, 2, 2 - leg); break;
    }
    case 'raton': { P(c1, 5, 10, 6, 3); P(c1, 10, 9, 3, 3); P('#1c1424', 12, 10); P(c1l, 10, 8, 2, 1); P('#d89a9a', 1, 11 + leg, 4, 1); break; }
    case 'ardilla': { P(c1, 5, 8, 5, 5); P(c1, 9, 5, 4, 4); P('#1c1424', 11, 6); P(c1, 9, 3, 1, 2); P(c2, 6, 10, 3, 3); P(c1, 1, 3 + leg, 4, 8); P(c1l, 1, 3 + leg, 2, 6); P(c1s, 6, 13, 2, 1); break; }
    case 'gato': case 'perro': {
      const tall = s.size >= 2;
      P(c1, 3, 7, 8, tall ? 5 : 4); P(c1s, 3, tall ? 10 : 9, 8, 2);
      P(c1s, 4, tall ? 12 : 11, 1, 3 - leg); P(c1, 6, tall ? 12 : 11, 1, 2 + leg); P(c1s, 8, tall ? 12 : 11, 1, 2 + leg); P(c1, 10, tall ? 12 : 11, 1, 3 - leg);
      P(c1, 10, 4, 4, 4); P('#1c1424', 12, 5); P(c1, 10, 2, 1, 2); P(c1, 13, 2, 1, 2);
      if (s.plan === 'perro') { P(c1, 13, 6, 2, 2); P('#1c1424', 14, 6); P(c2, 11, 7, 3, 1); P(c1, 0, 5, 3, 2); P(c2, 0, 5, 1, 2); }
      else { P(c1, 1, 4 + leg, 1, 4); P(c1, 2, 3 + leg, 1, 2); if (sp === 'lince') { P('#1c1424', 10, 1); P('#1c1424', 13, 1); P(c2, 11, 7, 3, 1); } }
      break;
    }
    case 'mustelido': { P(c1, 2, 9, 10, 3); P(c1s, 2, 11, 10, 1); P(c1, 11, 7, 4, 3); P('#1c1424', 13, 8); P(c2, 11, 9, 3, 1); P(c1s, 3, 12, 1, 2 - leg); P(c1s, 9, 12, 1, 1 + leg); P(c1, 0, 8 + leg, 3, 2); if (s.spots) for (let i = 3; i < 11; i += 3) P(c2, i, 9); break; }
    case 'oso': { const big = s.size >= 3; P(c1, 2, big ? 4 : 7, 11, big ? 8 : 5); P(c1s, 2, big ? 10 : 10, 11, 2); P(c1, 11, big ? 3 : 6, 4, 4); P('#1c1424', 13, big ? 4 : 7); P(c1, 11, big ? 2 : 5, 1, 1); P(c1s, 3, 12, 2, 3 - leg); P(c1s, 10, 12, 2, 2 + leg);
      if (sp === 'tejon') { P('#f0f0f0', 11, 6, 4, 1); P('#1c1424', 12, 7, 2, 1); } break; }
    case 'erizo': { P('#5a4a3a', 3, 9, 9, 4); for (let i = 3; i < 12; i += 2) P('#c8b8a0', i, 8, 1, 1); P(c2, 11, 11, 3, 2); P('#1c1424', 13, 11); break; }
    case 'pajaro': {
      const fly = frame && s.beh === 'vuela';
      P(c1, 5, 8, 6, 4); P(c2, 6, 10, 4, 2); P(c1, 10, 6, 3, 3); P('#1c1424', 11, 7); P(sp === 'gaviota' ? '#f0c030' : '#e8a040', 13, 7, 1, 1);
      if (fly) { P(shade(c1, 0.85), 3, 4, 6, 2); P(shade(c1, 0.85), 5, 3, 3, 1); } else { P(shade(c1, 0.85), 4, 9, 5, 2); P('#e8a040', 7, 12, 1, 2); }
      P(c1, 3, 9, 2, 1); break;
    }
    case 'ave_suelo': { P(c1, 4, 7, 7, 5); P(shade(c1, 0.8), 4, 9, 5, 2); P(c1, 10, 4, 3, 4); P('#1c1424', 11, 5); P('#e8a040', 13, 6); P(c2, 10, 3, 2, 1); P(sp === 'pota_blava' ? '#3a6ac8' : '#e8a040', 6, 12, 1, 2 + leg); P(sp === 'pota_blava' ? '#3a6ac8' : '#e8a040', 9, 12, 1, 2 - leg); P(c1, 2, 6, 2, 3); break; }
    case 'rapaz': { P(c1, 5, 6, 5, 7); P(c2, 6, 8, 3, 4); P(c1, 6, 3, 4, 4); P('#1c1424', 8, 4); P('#1c1424', 6, 4); P('#e8c040', 7, 6); P(shade(c1, 0.75), 3 - leg, 6, 2, 6); P(shade(c1, 0.75), 10 + leg, 6, 2, 6); P('#e8c040', 6, 13, 1, 1); P('#e8c040', 8, 13, 1, 1); break; }
    case 'zancuda': { P(c1, 5, 4, 5, 5); P(c2, 6, 5, 3, 3); P(c1, 9, 1, 2, 5); P(c1, 10, 0, 3, 2); P('#1c1424', 11, 0); P('#e8c040', 13, 1, 2, 1); P('#8a7a6a', 6, 9, 1, 6); P('#8a7a6a', 8, 9, 1, 6 - leg); P(shade(c1, 0.7), 3, 4, 3, 3); break; }
    case 'pato': { P(c2, 3, 8, 9, 4); P(shade(c2, 0.8), 3, 10, 9, 2); P(c1, 10, 5, 3, 4); P('#1c1424', 11, 6); P('#e8c040', 13, 7, 2, 1); P('#f0f0f0', 10, 9, 3, 1); P('#e8a040', 6, 12, 2, 1); break; }
    case 'rana': { P(c1, 4, 8, 7, 4); P(c2, 5, 10, 5, 2); P(c1, 3, 11, 2, 2); P(c1, 10, 11, 2, 2); P(c1, 5, 7, 2, 2); P(c1, 8, 7, 2, 2); P('#1c1424', 5, 7); P('#1c1424', 9, 7); if (frame) P(c1, 1, 12, 3, 1); break; }
    case 'tortuga': { P(c1, 3, 7, 9, 5); P(c2, 4, 7, 2, 2); P(c2, 8, 8, 2, 2); P(shade(c1, 0.7), 3, 11, 9, 1); P('#8a8a5a', 12, 8 + leg, 3, 3); P('#1c1424', 14, 9); P('#8a8a5a', 4, 12, 2, 2); P('#8a8a5a', 9, 12, 2, 2); break; }
    case 'lagarto': { P(c1, 4, 9, 8, 3); P(c1, 11, 8, 4, 3); P('#1c1424', 13, 9); P(c1, 0, 10 + leg, 4, 1); for (let i = 5; i < 11; i += 2) P(c2, i, 9); P(c1, 5, 12, 1, 2 - leg); P(c1, 10, 12, 1, 1 + leg); break; }
    case 'serpiente': { const w = frame ? 1 : 0; for (let i = 0; i < 12; i++) { const y = 10 + Math.round(Math.sin((i + w * 2) / 2) * 2); P(i % 3 === 0 ? c2 : c1, 1 + i, y, 1, 2); } P(c1, 12, 8, 3, 3); P('#1c1424', 13, 9); P('#c83a3a', 15, 10); break; }
    case 'enjambre': { for (let i = 0; i < 7; i++) { const a = (i * 2.3 + frame) , r = 3 + (i % 3); const px = 7 + Math.round(Math.cos(a) * r), py = 8 + Math.round(Math.sin(a) * r * 0.7); P(c1, px, py, 2, 1); P(c2, px + 1, py); P('#ffffff', px, py - 1); } break; }
    default: P(c1, 4, 6, 8, 8);
  }
  if (cria) { const [c2v, x2] = canvas(16, 16); x2.drawImage(cv, 0, 0, 16, 16, 3, 6, 10, 10); outline(c2v); const out = dir === 'left' ? flip(c2v) : c2v; cache.set(key, out); return out; }
  outline(cv);
  const out = dir === 'left' ? flip(cv) : cv;
  cache.set(key, out); return out;
}
function flip(cv) { const [c, x] = canvas(cv.width, cv.height); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0); return c; }

// Muebles (dibujados sobre el suelo del interior en coordenadas de píxel)
export function drawFurniture(ctx, o, X, Y, fr) {
  const P = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(X + x, Y + y, w, h); };
  const W = o.w * 16, H = o.h * 16;
  switch (o.type) {
    case 'cama': P('#6a4424', 0, 0, W, H); P('#e8e0d0', 1, 2, W - 2, 8); P('#b83a3a', 1, 9, W - 2, H - 10); P('#d84a4a', 1, 9, W - 2, 2); P('#f8f8f0', 3, 3, W - 6, 4); P('#1c1424', 0, H - 1, W, 1); break;
    case 'mesa': P('#8a5a34', 0, 3, W, H - 5); P('#a87048', 0, 3, W, 3); P('#5a3a22', 1, H - 3, 2, 3); P('#5a3a22', W - 3, H - 3, 2, 3); P('#f0e8d8', 4, 4, 4, 2); P('#c84a3a', W - 8, 4, 3, 2); P('#1c1424', 0, H - 1, W, 1); break;
    case 'silla': P('#7a4a2a', 4, 2, 8, 3); P('#8a5a34', 4, 7, 8, 4); P('#5a3a22', 4, 11, 1, 4); P('#5a3a22', 11, 11, 1, 4); break;
    case 'chimenea': P('#8a7a6a', 0, 0, W, H); P('#6a5a4a', 0, 0, W, 3); P('#2a1a1a', 4, H - 14, W - 8, 12); P(fr ? '#f8a030' : '#f8c040', 7, H - 8, W - 14, 5); P('#e84a2a', 8, H - 10 + (fr ? 1 : 0), 3, 4); P('#f8e080', 10, H - 6, 3, 2); break;
    case 'caldero': P('#2a2a30', 2, 5, 12, 9); P('#4a4a54', 3, 5, 10, 2); P(fr ? '#6ae07a' : '#4ac06a', 4, 6, 8, 2); P('#c8f8d0', 6 + (fr ? 2 : 0), 6); P('#e84a2a', 5, 14, 6, 2); break;
    case 'estante': P('#6a4424', 0, 0, W, H); for (let y = 2; y < H - 2; y += 5) { P('#4a2e18', 1, y + 3, W - 2, 1); for (let x = 2; x < W - 2; x += 3) P(['#8a3a2a', '#3a5a8a', '#e8c050', '#4a8a4a', '#c8c0b0'][(x + y) % 5], x, y, 2, 3); } break;
    case 'mostrador': P('#7a4a2a', 0, 2, W, H - 2); P('#9a6a3e', 0, 2, W, 3); P('#5a3a22', 0, H - 2, W, 2); for (let x = 3; x < W - 4; x += 9) { P('#c8b060', x, 0, 4, 3); P('#8a3a2a', x + 5, 1, 2, 2); } break;
    case 'barra': P('#6a3a22', 0, 2, W, H - 2); P('#8a5a34', 0, 2, W, 3); for (let x = 4; x < W; x += 12) { P('#e8c050', x, 0, 3, 3); P('#f8f0d8', x, 0, 3, 1); } break;
    case 'barriles': for (let x = 0; x < W; x += 16) { P('#7a4a2a', x + 1, 2, 14, 13); P('#5a3a22', x + 1, 5, 14, 1); P('#5a3a22', x + 1, 11, 14, 1); P('#9a6a3e', x + 3, 2, 10, 2); } break;
    case 'altar': P('#c8c0b0', 0, 4, W, H - 4); P('#e8e0d0', 0, 4, W, 2); P('#b8322c', 4, 6, W - 8, H - 8); P('#e8c050', W / 2 - 2, 0, 4, 5); P('#f8f0d8', 6, 1, 1, 3); P('#f8f0d8', W - 7, 1, 1, 3); P(fr ? '#f8c040' : '#f8e080', 6, 0); P(fr ? '#f8e080' : '#f8c040', W - 7, 0); break;
    case 'cruz': P(o.severe ? '#3a2a30' : '#e8c050', 6, 0, 4, 16); P(o.severe ? '#3a2a30' : '#e8c050', 2, 3, 12, 3); break;
    case 'banco': P('#6a4424', 0, 4, W, 8); P('#8a5a34', 0, 4, W, 2); P('#4a2e18', 0, 12, W, 2); break;
    case 'vela': P('#8a8a90', 5, 10, 6, 6); P('#f0e8d8', 7, 3, 2, 8); P(fr ? '#f8c040' : '#f8e080', 7, 0, 2, 3); break;
    case 'pila': P('#9a9a9a', 3, 4, 10, 9); P('#6ab0e8', 4, 5, 8, 3); P('#7a7a7a', 6, 13, 4, 3); break;
    case 'claustro': P('#4a8a4a', 0, 0, 16, 16); P('#f8f8f0', 4, 6, 6, 4); P('#f0a030', 9, 7, 2, 1); break;
    case 'trono': case 'trono2': P('#8a1a2a', 2, 0, 12, 14); P('#e8c050', 2, 0, 12, 2); P('#b83a4a', 4, 4, 8, 8); P('#5a3a22', 2, 14, 12, 2); break;
    case 'tapiz': P('#6a1a2a', 0, 0, W, H); P('#e8c050', 0, 0, W, 2); P('#e8c050', W / 2 - 3, 8, 6, 8); P('#b8322c', W / 2 - 1, 9, 2, 6); break;
    case 'columna': P('#b8b0a0', 3, 0, 10, 16); P('#d8d0c0', 4, 0, 3, 16); P('#8a8478', 2, 14, 12, 2); break;
    case 'armero': P('#6a4424', 0, 6, W, 8); for (let x = 3; x < W; x += 6) { P('#a8b0b8', x, 0, 2, 10); P('#8a6a4a', x, 8, 2, 4); } break;
    case 'yunque': P('#4a4a54', 2, 6, 12, 4); P('#6a6a74', 3, 6, 9, 1); P('#3a3a44', 5, 10, 6, 6); break;
    case 'fragua': P('#6a5a4a', 0, 0, W, H); P('#2a1a1a', 4, 6, W - 8, 8); P(fr ? '#f86030' : '#f8a030', 6, 9, W - 12, 4); break;
    case 'arcon': P('#7a4a2a', 1, 5, 14, 10); P('#9a6a3e', 1, 5, 14, 3); P('#e8c050', 7, 8, 2, 2); break;
    case 'casco': P('#6a4424', 0, 4, W, H - 6); P('#8a5a34', 2, 4, W - 4, 3); for (let x = 4; x < W; x += 8) P('#5a3a22', x, 2, 2, H - 4); break;
    case 'madera': for (let y = 2; y < H; y += 5) { P('#9a6a3e', 0, y, W, 4); P('#6a4424', 0, y + 3, W, 1); } break;
    case 'huesos': P('#e8e0cc', 3, 8, 8, 2); P('#e8e0cc', 5, 5, 2, 7); P('#e8e0cc', 9, 10, 4, 3); P('#1c1424', 10, 11); break;
    default: P('#8a6a4a', 0, 0, W, H);
  }
}
