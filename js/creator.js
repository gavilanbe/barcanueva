// Creación del personaje: nombre (teclado en pantalla estilo GBA o teclado físico), sexo, raza, piel, pelo, peinado y puntos.
import { W, H, panel, text, ui, hand } from './ui.js';
import { drawText, textWidth, wrap } from './font.js';
import { input } from './input.js';
import { charSprite, SKINS, TIEFLING_SKINS, HAIRS, HAIRSTYLES, RACES, RACE_NAME } from './chars.js';
import { bust } from './portraits.js';
import { ellipse } from './px.js';
import { INK } from './pal.js';
import { sfx } from './audio.js';
import { S } from './state.js';
import { statusWidget } from './menu.js';

const RACE_DESC = {
  humano: 'La gente te tratará con normalidad. Nadie se gira a mirarte... ni para bien ni para mal.',
  elfo: 'Te tratarán con bastante respeto y privilegio. Puertas que se abren, precios que bajan. +4 PM.',
  tiefling: 'Algunos reaccionarán mal: miedo o trato hostil. Otros, los marginados, te verán como uno de los suyos. +2 PM.',
  enano: 'Te tratarán bien, pero no te tomarán en serio: tono burlón o festivo. Duro como la roca: +6 PV.',
};
const KB = ['ABCDEFGHIJKLM', 'NÑOPQRSTUVWXYZ', 'abcdefghijklm', 'nñopqrstuvwxyz', 'áéíóúàèòïüç·-'];

export function creator() {
  const ap = { sex: 'm', race: 'humano', skin: SKINS[1], hair: HAIRS[1], hairStyle: 0, top: '#b85a3a', bottom: '#4a4a6a', beard: false };
  const st = { step: 0, row: 0, sel: 0, name: '', kx: 0, ky: 0 };
  const steps = ['Sexo', 'Raza', 'Piel', 'Pelo', 'Peinado', 'Barba', 'Ropa', 'Nombre'];
  const TOPS = ['#b85a3a', '#3a6a9a', '#4a8a4a', '#8a3a6a', '#c8a040', '#5a5a5a', '#e8e0d0'];
  const skins = () => (ap.race === 'tiefling' ? [...TIEFLING_SKINS, ...SKINS.slice(0, 3)] : SKINS);
  const opts = (k) => ({
    Sexo: ['Masculino', 'Femenino'], Raza: RACES.map((r) => RACE_NAME[r]), Piel: skins().map((_, i) => `Tono ${i + 1}`), Pelo: HAIRS.map((_, i) => `Color ${i + 1}`),
    Peinado: HAIRSTYLES, Barba: ['Sin barba', 'Con barba'], Ropa: TOPS.map((_, i) => `Túnica ${i + 1}`),
  }[k]);
  const apply = () => {
    const k = steps[st.step]; const i = st.sel;
    if (k === 'Sexo') ap.sex = i ? 'f' : 'm';
    if (k === 'Raza') { ap.race = RACES[i]; if (ap.race === 'tiefling' && !TIEFLING_SKINS.includes(ap.skin)) ap.skin = TIEFLING_SKINS[0]; if (ap.race !== 'tiefling' && TIEFLING_SKINS.includes(ap.skin)) ap.skin = SKINS[1]; }
    if (k === 'Piel') ap.skin = skins()[i]; if (k === 'Pelo') ap.hair = HAIRS[i]; if (k === 'Peinado') ap.hairStyle = i; if (k === 'Barba') ap.beard = !!i; if (k === 'Ropa') ap.top = TOPS[i];
  };
  const typing = (key) => {
    if (steps[st.step] !== 'Nombre') return false;
    if (key === 'Backspace') st.name = st.name.slice(0, -1); else if (key === 'Enter') finishName(); else if (st.name.length < 12 && key.length === 1) st.name += key;
    return true;
  };
  const finishName = () => { if (st.name.trim().length) { st.done = true; sfx('ok'); } else sfx('no'); };
  input.typing = typing;
  return {
    t: 0, st,
    update() {
      this.t++; const k = steps[st.step];
      if (k === 'Nombre') {
        if (input.pressed('up')) st.ky = (st.ky + KB.length) % (KB.length + 1);
        if (input.pressed('down')) st.ky = (st.ky + 1) % (KB.length + 1);
        if (st.ky === KB.length) { // fila de acciones
          if (input.pressed('left') || input.pressed('right')) st.kx = st.kx ? 0 : 1;
          if (input.pressed('A')) { if (st.kx === 0) st.name = st.name.slice(0, -1); else finishName(); }
        } else {
          if (input.pressed('left')) st.kx = (st.kx + KB[st.ky].length - 1) % KB[st.ky].length;
          if (input.pressed('right')) st.kx = (st.kx + 1) % KB[st.ky].length;
          st.kx = Math.min(st.kx, KB[st.ky].length - 1);
          if (input.pressed('A') && st.name.length < 12) { st.name += KB[st.ky][st.kx]; sfx('blip'); }
        }
        if (input.pressed('B')) { if (st.name.length) st.name = st.name.slice(0, -1); else { st.step--; st.sel = 0; } }
        if (input.pressed('S')) finishName();
        if (st.done) { input.typing = null; this.done = true; this.result = { ap, name: st.name.trim() }; }
        return;
      }
      const o = opts(k);
      if (input.pressed('up')) { st.sel = (st.sel + o.length - 1) % o.length; apply(); sfx('move'); }
      if (input.pressed('down')) { st.sel = (st.sel + 1) % o.length; apply(); sfx('move'); }
      if (input.pressed('A') || input.pressed('right')) { apply(); st.step++; st.sel = 0; sfx('ok'); if (steps[st.step] === 'Barba' && ap.race !== 'enano' && ap.sex === 'f') st.step++; }
      if ((input.pressed('B') || input.pressed('left')) && st.step > 0) { st.step--; st.sel = 0; sfx('back'); }
    },
    draw(ctx, fr) {
      // Fondo: baldosa hidráulica (rajola) que se desliza en diagonal
      drawTiles(ctx, fr);
      const k = steps[st.step];
      // Vista previa: el sprite del mapa girando sobre un pedestal y el retrato con expresiones
      panel(ctx, 4, 4, 100, 110);
      ctx.fillStyle = '#e8d8b4'; ctx.fillRect(9, 9, 90, 62); ctx.fillStyle = '#d8c39a'; ctx.fillRect(9, 57, 90, 14);
      ellipse(ctx, 54, 66, 18, 4, '#b8a078'); ellipse(ctx, 54, 65, 16, 3, '#c8b088');
      const d = ['down', 'right', 'up', 'left'][Math.floor(this.t / 45) % 4];
      ctx.drawImage(charSprite({ ...ap, equip: {} }, d, [0, 1, 0, 3][Math.floor(this.t / 9) % 4]), 38, 18, 32, 48);
      const ex = ['neutral', 'alegre', 'sorpresa', 'neutral', 'triste', 'alegre'][Math.floor(this.t / 70) % 6];
      ctx.fillStyle = '#3a2228'; ctx.fillRect(9, 73, 42, 42); ctx.fillStyle = '#d8c39a'; ctx.fillRect(10, 74, 40, 40);
      ctx.drawImage(bust({ ...ap, equip: {} }, ex, Math.floor(this.t / 6) % 7 === 0 ? 1 : 0, (this.t % 150) < 6), 10, 74);
      text(ctx, RACE_NAME[ap.race], 55, 78, '#8a3a2a'); text(ctx, ap.sex === 'f' ? 'Mujer ♀' : 'Hombre ♂', 55, 89, '#6a4a3a');
      if (st.name) text(ctx, st.name.slice(0, 8), 55, 100);
      // Descripción de raza
      panel(ctx, 4, 116, 232, 42, 'dark');
      wrap(RACE_DESC[ap.race], 218).slice(0, 3).forEach((l, i) => drawText(ctx, l, 11, 122 + i * 11, '#e8d8f0', INK));
      // Pasos
      panel(ctx, 108, 4, 128, 110);
      for (let i = 0; i < steps.length; i++) { const x = 116 + i * 14; ctx.fillStyle = i < st.step ? '#cc8a26' : i === st.step ? '#a42632' : '#d8c39a'; ctx.fillRect(x, 10, 10, 3); }
      const tw = textWidth(k) + 14; ctx.fillStyle = '#7c1a2a'; ctx.fillRect(114, 16, tw, 12); ctx.fillStyle = '#a42632'; ctx.fillRect(114, 15, tw, 12); ctx.fillStyle = '#cc3a3c'; ctx.fillRect(114, 15, tw, 1);
      drawText(ctx, k, 121, 18, '#fff0d8', '#520f22');
      if (k === 'Nombre') {
        ctx.fillStyle = '#3a2228'; ctx.fillRect(113, 31, 118, 14); ctx.fillStyle = '#fffaea'; ctx.fillRect(114, 32, 116, 12); text(ctx, st.name + (fr % 40 < 20 ? '_' : ''), 117, 35);
        KB.forEach((row, ry) => { for (let i = 0; i < row.length; i++) { const x = 114 + i * 8, y = 50 + ry * 10; if (ry === st.ky && i === st.kx) { ctx.fillStyle = '#a42632'; ctx.fillRect(x - 1, y - 2, 8, 10); drawText(ctx, row[i], x + 1, y, '#fff'); } else text(ctx, row[i], x + 1, y); } });
        const ay = 50 + KB.length * 10 + 2;
        ['Borrar', 'Aceptar'].forEach((s, i) => { const x = 120 + i * 54; if (st.ky === KB.length && st.kx === i) { ctx.fillStyle = '#a42632'; ctx.fillRect(x - 3, ay - 2, textWidth(s) + 6, 10); drawText(ctx, s, x, ay, '#fff'); } else text(ctx, s, x, ay); });
        drawText(ctx, 'Teclado: escribe y Enter', 116, 104, '#8a7a6a');
      } else {
        const o = opts(k); const top = Math.max(0, Math.min(st.sel - 3, o.length - 6));
        const ty = 34 + (st.sel - top) * 12; if (this.hy === undefined) this.hy = ty; this.hy += (ty - this.hy) * 0.45;
        ctx.fillStyle = '#f8dc90'; ctx.fillRect(112, Math.round(this.hy) - 2, 120, 11);
        o.slice(top, top + 6).forEach((s, i) => {
          const j = top + i; const y = 34 + i * 12;
          if (k === 'Piel' || k === 'Pelo' || k === 'Ropa') { ctx.fillStyle = '#1c1424'; ctx.fillRect(124, y - 1, 9, 9); ctx.fillStyle = (k === 'Piel' ? skins() : k === 'Pelo' ? HAIRS : TOPS)[j]; ctx.fillRect(125, y, 7, 7); ctx.fillStyle = '#ffffff'; ctx.fillRect(125, y, 2, 1); text(ctx, s, 136, y); }
          else text(ctx, s, 124, y);
        });
        hand(ctx, 113 + Math.round(Math.sin(fr / 5) * 1.5), Math.round(this.hy));
        if (top > 0) drawText(ctx, '▲', 224, 30, '#b8322c'); if (top + 6 < o.length) drawText(ctx, '▼', 224, 98, '#b8322c');
        drawText(ctx, 'A/▶ sigue · B/◀ vuelve', 114, 104, '#8a7a6a');
      }
    },
  };
}

// Baldosa hidráulica de fondo (patrón de cuatro pétalos) desplazándose en diagonal
const tileCv = (() => { const c = document.createElement('canvas'); c.width = 24; c.height = 24; const x = c.getContext('2d'); const P = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  P('#2a1e36', 0, 0, 24, 24); P('#33264a', 1, 1, 22, 22);
  for (const [cx, cy] of [[12, 5], [12, 19], [5, 12], [19, 12]]) ellipse(x, cx, cy, 3, 3, '#4a2e48');
  ellipse(x, 12, 12, 3, 3, '#7c3a3a'); P('#a8682a', 11, 11, 2, 2); for (const [a, b] of [[0, 0], [23, 0], [0, 23], [23, 23]]) P('#5a3a5a', a, b, 1, 1);
  P('#241a30', 0, 0, 24, 1); P('#241a30', 0, 0, 1, 24); return c; })();
function drawTiles(ctx, fr) { const o = Math.floor(fr / 3) % 24; for (let y = -24; y < H + 24; y += 24) for (let x = -24; x < W + 24; x += 24) ctx.drawImage(tileCv, x + o, y + o); }

// Reparto de 10 + 10 puntos
export async function allocate() {
  const p = S.player; p.ptsB = 10; p.ptsK = 10;
  await ui.say('Reparte 10 puntos en estadísticas básicas y 10 en sabiduría. ▶ o A pone un punto, ◀ lo quita. Pulsa MENÚ para terminar.');
  while (true) {
    await ui.custom(statusWidget('create'));
    if (p.ptsB + p.ptsK === 0) break;
    const i = await ui.ask(`Te quedan ${p.ptsB + p.ptsK} puntos sin repartir.`, ['Seguir repartiendo', 'Guardarlos para luego']);
    if (i === 1) break;
  }
}
