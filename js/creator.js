// Creación del personaje: nombre (teclado en pantalla estilo GBA o teclado físico), sexo, raza, piel, pelo, peinado y puntos.
import { W, H, panel, text, ui } from './ui.js';
import { drawText, textWidth, wrap } from './font.js';
import { input } from './input.js';
import { charSprite, SKINS, TIEFLING_SKINS, HAIRS, HAIRSTYLES, RACES, RACE_NAME } from './chars.js';
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
      ctx.fillStyle = '#2a2030'; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 4) { ctx.fillStyle = y % 8 ? '#2e2436' : '#2a2030'; ctx.fillRect(0, y, W, 4); }
      // Vista previa: 4 direcciones
      panel(ctx, 4, 4, 100, 110);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(10, 10, 88, 72);
      const d = ['down', 'left', 'up', 'right'][Math.floor(this.t / 50) % 4];
      ctx.drawImage(charSprite({ ...ap, equip: {} }, d, Math.floor(this.t / 10) % 4), 30, 12, 48, 72);
      text(ctx, RACE_NAME[ap.race] + (ap.sex === 'f' ? ' ♀' : ' ♂'), 12, 88, '#8a3a2a');
      if (st.name) text(ctx, st.name, 12, 99);
      // Descripción de raza
      panel(ctx, 4, 116, 232, 42);
      wrap(RACE_DESC[ap.race], 218).slice(0, 3).forEach((l, i) => text(ctx, l, 11, 122 + i * 11));
      const k = steps[st.step];
      panel(ctx, 108, 4, 128, 110);
      text(ctx, `${st.step + 1}/${steps.length}  ${k}`, 116, 10, '#8a3a2a');
      if (k === 'Nombre') {
        ctx.fillStyle = '#e8dcc0'; ctx.fillRect(114, 22, 116, 12); text(ctx, st.name + (fr % 40 < 20 ? '_' : ''), 117, 24);
        KB.forEach((row, ry) => { for (let i = 0; i < row.length; i++) { const x = 114 + i * 8, y = 40 + ry * 11; if (ry === st.ky && i === st.kx) { ctx.fillStyle = '#b8322c'; ctx.fillRect(x - 1, y - 2, 8, 10); drawText(ctx, row[i], x + 1, y, '#fff'); } else text(ctx, row[i], x + 1, y); } });
        const ay = 40 + KB.length * 11 + 2;
        ['Borrar', 'Aceptar'].forEach((s, i) => { const x = 118 + i * 54; if (st.ky === KB.length && st.kx === i) { ctx.fillStyle = '#b8322c'; ctx.fillRect(x - 3, ay - 2, textWidth(s) + 6, 10); drawText(ctx, s, x, ay, '#fff'); } else text(ctx, s, x, ay); });
        drawText(ctx, 'Teclado: escribe y Enter', 116, 104, '#8a7a6a');
      } else {
        const o = opts(k); const top = Math.max(0, Math.min(st.sel - 3, o.length - 7));
        o.slice(top, top + 7).forEach((s, i) => {
          const j = top + i; const y = 24 + i * 12;
          if (j === st.sel) drawText(ctx, '▶', 114, y, '#b8322c');
          if (k === 'Piel' || k === 'Pelo' || k === 'Ropa') { ctx.fillStyle = '#1c1424'; ctx.fillRect(122, y - 1, 9, 9); ctx.fillStyle = (k === 'Piel' ? skins() : k === 'Pelo' ? HAIRS : TOPS)[j]; ctx.fillRect(123, y, 7, 7); text(ctx, s, 134, y); }
          else text(ctx, s, 122, y);
        });
        drawText(ctx, 'A/▶ sigue · B/◀ vuelve', 114, 104, '#8a7a6a');
      }
    },
  };
}

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
