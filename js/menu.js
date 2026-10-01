// Cuaderno de viaje (menú de pausa): estado y reparto de puntos, mochila en rejilla, relaciones con retrato,
// saber, diario, ecosistema, guardar y opciones. Todo entra y sale con animación sobre el mundo atenuado.
import { S, BASIC, KNOW, STAT_NAME, tier, XP_FOR, maxHp, maxMp, stat, save, npcState, addItem, logEvent, clock, dateStr, phase, SEASONS, season, weekday } from './state.js';
import { ITEMS, SPELLS, RECIPES } from './data/items.js';
import { NPCS } from './data/npcs.js';
import { SP, ECO_MAPS, count, total, mapName } from './eco.js';
import { ui, W, H, panel, text, icon, itemIco, bar, hand, T as UIT, prefs, savePrefs } from './ui.js';
import { drawText, textWidth, wrap, drawOutlined } from './font.js';
import { input } from './input.js';
import { charSprite, RACE_NAME } from './chars.js';
import { bust, figure } from './portraits.js';
import { animalSprite, animalBattle } from './sprites.js';
import { G, addXP, playerLook, mapLayers } from './game.js';
import { MAPS, BUILDINGS } from './world.js';
import { learn } from './talk.js';
import { RANKS } from './events.js';
import { sfx, audio, setMuted, setMusicVol } from './audio.js';
import { setEquipBonus } from './state.js';
import { ease, prog, burst, spawn } from './fx.js';
import { INK, alpha } from './pal.js';
import { bayer } from './px.js';

// Bonificaciones del equipo a las estadísticas
setEquipBonus((k) => { let b = 0; for (const it of Object.values(S.player?.equip || {})) { const e = ITEMS[it]?.eq; if (e?.bonus?.[k]) b += e.bonus[k]; } if (k === 'fue' && S.flags?.buff_fue === S.day) b += 2; return b; });

// Velo tramado sobre el mundo
function veil(ctx, k) { ctx.fillStyle = 'rgba(14,8,24,0.62)'; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (bayer(x >> 1, y >> 1) < k) ctx.fillRect(x, y, 2, 2); }
// Fondo de página (pantallas completas del cuaderno)
function page(ctx, t, title, ic) {
  const k = Math.min(1, t / 8); veil(ctx, k);
  const y = Math.round((1 - ease.outCubic(k)) * 24);
  panel(ctx, 2, 2 + y, 236, 156);
  if (title) {
    const w = textWidth(title) + (ic ? 30 : 16); ctx.fillStyle = '#7c1a2a'; ctx.fillRect(8, y - 1, w, 13); ctx.fillStyle = '#a42632'; ctx.fillRect(8, y - 2, w, 13); ctx.fillStyle = '#cc3a3c'; ctx.fillRect(8, y - 2, w, 1);
    const im = ic ? icon(ic) : null; if (im) ctx.drawImage(im, 12, y - 1); drawText(ctx, title, 12 + (im ? 15 : 0), y + 1, '#fff0d8', '#520f22');
  }
  return y;
}

const ENTRIES = [['Estado', 'estado'], ['Mochila', 'mochila'], ['Relaciones', 'relaciones'], ['Saber', 'saber'], ['Diario', 'diario'], ['Mapa', 'mapa'], ['Ecosistema', 'ecosistema'], ['Guía', 'saber'], ['Guardar', 'guardar'], ['Opciones', 'opciones']];
let lastEntry = 0;
G.hooks.menu = async () => {
  sfx('open');
  while (true) {
    const i = await pauseMenu();
    if (i === 0) await status();
    if (i === 1) await bag();
    if (i === 2) await relations();
    if (i === 3) await knowledge();
    if (i === 4) await journal();
    if (i === 5) await mapScreen();
    if (i === 6) await ecology();
    if (i === 7) await guide();
    if (i === 8) await saveGame();
    if (i === 9) await options();
    if (i === -1) { sfx('close'); return; }
  }
};

function pauseMenu() {
  return ui.custom({
    i: lastEntry, t: 0, hy: null,
    update() {
      const n = ENTRIES.length; const o = this.i;
      if (input.pressed('up')) this.i = (this.i + n - 1) % n; if (input.pressed('down')) this.i = (this.i + 1) % n;
      if (o !== this.i) { sfx('move'); this.bounce = 6; }
      if (input.pressed('A') && this.t > 3) { lastEntry = this.i; this.done = true; this.result = this.i; sfx('ok'); }
      if ((input.pressed('B') || input.pressed('S')) && this.t > 3) { this.done = true; this.result = -1; }
    },
    draw(ctx, fr) {
      const k = Math.min(1, this.t / 8); veil(ctx, k * 0.75);
      const p = S.player; const x0 = Math.round(W - 92 * ease.outBack(Math.min(1, this.t / 12)));
      // ficha del personaje
      const fy = 3; panel(ctx, x0 - 2, fy, 92, 49, 'dark');
      ctx.fillStyle = '#d8c39a'; ctx.fillRect(x0 + 3, fy + 4, 40, 40); ctx.drawImage(bust(playerLook(), 'neutral', 0, (fr % 160) < 6), x0 + 3, fy + 4);
      drawText(ctx, p.name.slice(0, 8), x0 + 46, fy + 6, '#fff4d8', INK); drawText(ctx, `Nv ${p.level}`, x0 + 46, fy + 17, '#f0b030', INK);
      bar(ctx, x0 + 46, fy + 29, 38, 2, p.xp / XP_FOR(p.level), p.xp / XP_FOR(p.level), ['#6a5a10', '#fcd456', '#fff4a0']);
      const ci = icon('moneda'); if (ci) ctx.drawImage(ci, x0 + 45, fy + 34); drawText(ctx, String(S.money), x0 + 59, fy + 36, '#fcd456', INK);
      // entradas
      const ly = fy + 51; const h = ENTRIES.length * 10 + 6; panel(ctx, x0 - 2, ly, 92, h, 'dark');
      const ty = ly + 5 + this.i * 10; if (this.hy === null) this.hy = ty; this.hy += (ty - this.hy) * 0.45;
      ctx.fillStyle = '#4a3462'; ctx.fillRect(x0 + 2, Math.round(this.hy) - 1, 84, 10); ctx.fillStyle = '#f0b030'; ctx.fillRect(x0 + 2, Math.round(this.hy) - 1, 2, 10);
      ENTRIES.forEach(([lab, ic], j) => {
        const rowT = prog(this.t, 6, 2 + j, ease.outCubic); const off = Math.round((1 - rowT) * 20); const y = ly + 5 + j * 10; const sel = j === this.i;
        const im = icon(ic); const b = sel && this.bounce > 0 ? -Math.round(Math.sin((this.bounce / 6) * Math.PI) * 2) : 0;
        if (im) ctx.drawImage(im, x0 + 6 + off, y - 2 + b);
        const pts = j === 0 && (p.ptsB + p.ptsK) > 0;
        drawText(ctx, lab, x0 + 21 + off + (sel ? 1 : 0), y, sel ? '#fff4d8' : '#b8a8c8', INK);
        if (pts && fr % 40 < 26) drawText(ctx, '★', x0 + 76, y, '#fcd456', INK);
      });
      if (this.bounce > 0) this.bounce--;
      // fecha y lugar
      const dl = `${weekday()} · ${dateStr()}`; const pl = G.map?.name || '';
      const bw = Math.max(textWidth(dl), textWidth(pl)) + 14; panel(ctx, 4, 136 + Math.round((1 - k) * 30), Math.min(142, bw), 22, 'dark');
      drawText(ctx, dl.replace('Primavera', 'Prim.').replace('Invierno', 'Inv.'), 10, 141 + Math.round((1 - k) * 30), '#e8d8f0', INK); drawText(ctx, pl.slice(0, 26), 10, 150 + Math.round((1 - k) * 30), '#f0b030', INK);
    },
  });
}

// ───────────── Estado ─────────────
const STAT_ICON = { fue: 'fue', int: 'int', def: 'def', esp: 'esp', car: 'car', nat: 'nat', his: 'his', arc: 'arc', alq: 'alq', art: 'art', caz: 'caz', com: 'com' };
export function statusWidget(mode = 'menu') {
  return {
    sel: 0, mode, t: 0, flashK: null,
    update() {
      const p = S.player; const rows = [...BASIC, ...KNOW];
      if (input.pressed('up')) { this.sel = (this.sel + rows.length - 1) % rows.length; sfx('move'); }
      if (input.pressed('down')) { this.sel = (this.sel + 1) % rows.length; sfx('move'); }
      const [k] = rows[this.sel]; const basic = this.sel < BASIC.length;
      if (input.pressed('A') || input.pressed('right')) {
        if (basic && p.ptsB > 0) { p.stats[k]++; p.ptsB--; sfx('ok'); this.flashK = [k, 12]; p.hpMax = maxHp(p); p.mpMax = maxMp(p); if (this.mode === 'create') { p.hp = p.hpMax; p.mp = p.mpMax; } }
        else if (!basic && p.ptsK > 0) { p.know[k]++; p.ptsK--; sfx('ok'); this.flashK = [k, 12]; }
        else sfx('no');
      }
      if (input.pressed('left') && this.mode === 'create') {
        const base = basic ? p.stats : p.know; if (base[k] > 0) { base[k]--; basic ? p.ptsB++ : p.ptsK++; sfx('back'); p.hpMax = maxHp(p); p.mpMax = maxMp(p); p.hp = p.hpMax; p.mp = p.mpMax; }
      }
      if (input.pressed('B') || (this.mode === 'create' && input.pressed('S'))) { this.done = true; }
    },
    draw(ctx, fr) {
      const p = S.player; const y0 = page(ctx, this.t, this.mode === 'create' ? 'Puntos' : 'Estado', 'estado');
      // ficha izquierda
      const fx_ = 6, fy = y0 + 14; ctx.fillStyle = '#e8d8b4'; ctx.fillRect(fx_ + 2, fy, 76, 66); ctx.fillStyle = '#d8c39a'; ctx.fillRect(fx_ + 2, fy + 50, 76, 16);
      const fig = figure(playerLook(), 'front', Math.floor(fr / 30) % 2 ? 'idle1' : 'idle0'); ctx.drawImage(fig, fx_ + 18, fy);
      text(ctx, p.name, 8, fy + 70); text(ctx, `${RACE_NAME[p.race]} ${p.sex === 'f' ? '♀' : '♂'}`, 8, fy + 81, '#6a4a3a');
      text(ctx, `Nivel ${p.level}`, 8, fy + 92, UIT.title); bar(ctx, 8, fy + 103, 70, 3, p.xp / XP_FOR(p.level), p.xp / XP_FOR(p.level), ['#6a5a10', '#e8b030', '#fff0a0']);
      text(ctx, `PV ${p.hp}/${p.hpMax}`, 8, fy + 109); text(ctx, `PM ${p.mp}/${p.mpMax}`, 8, fy + 120);
      text(ctx, RANKS[S.rank], 8, fy + 131, '#2c5aa0');
      // equipo
      ['weapon', 'amulet'].map((s) => p.equip?.[s]).filter(Boolean).forEach((k2, i) => { const ic = itemIco(k2); ctx.fillStyle = '#d8c39a'; ctx.fillRect(fx_ + 59, fy + 2 + i * 19, 18, 18); if (ic) ctx.drawImage(ic, fx_ + 60, fy + 3 + i * 19); });
      if (S.ailments.length) text(ctx, S.ailments.join(', '), 8, fy + 142 - 12, '#b8322c');
      // estadísticas
      const rows = [...BASIC, ...KNOW]; let y = y0 + 6;
      const hx = 88; text(ctx, `BÁSICAS`, hx + 6, y, UIT.title); text(ctx, `${p.ptsB} pts`, 200, y, p.ptsB ? '#b8322c' : '#8a7a70'); y += 10;
      rows.forEach(([k, n], i) => {
        if (i === BASIC.length) { y += 2; text(ctx, `SABIDURÍA`, hx + 6, y, UIT.title); text(ctx, `${p.ptsK} pts`, 200, y, p.ptsK ? '#b8322c' : '#8a7a70'); y += 10; }
        const base = i < BASIC.length ? p.stats[k] : p.know[k]; const eff = stat(k); const bonus = eff - base;
        if (i === this.sel) { ctx.fillStyle = UIT.sel; ctx.fillRect(hx + 1, y - 2, 145, 10); hand(ctx, hx - 7 + Math.round(Math.sin(fr / 5) * 1.5), y); }
        const im = icon(STAT_ICON[k]); if (im) ctx.drawImage(im, hx + 3, y - 2);
        text(ctx, n, hx + 17, y, i === this.sel ? '#2a1420' : UIT.ink); const vs = String(base) + (bonus ? (bonus > 0 ? '+' : '') + bonus : '');
        const fl = this.flashK && this.flashK[0] === k && this.flashK[1]-- > 0;
        text(ctx, vs, 186 - textWidth(vs), y, fl ? '#e8a020' : bonus ? '#2c5aa0' : UIT.ink);
        const lp = S.learned[k]; if (lp) text(ctx, '⅓⅔'[lp - 1] || '', 189, y, '#3a7a3a');
        for (let b = 0; b < Math.min(10, base); b++) { ctx.fillStyle = i < BASIC.length ? '#c85a3a' : '#2a8a9a'; ctx.fillRect(198 + (b % 5) * 7, y + (b >= 5 ? 4 : 0), 6, 3); ctx.fillStyle = i < BASIC.length ? '#f08a5a' : '#5ac0c8'; ctx.fillRect(198 + (b % 5) * 7, y + (b >= 5 ? 4 : 0), 6, 1); }
        y += 9;
      });
      const [, , desc] = rows[this.sel];
      const hint = this.mode === 'create' ? '◀ quitar · ▶/A poner · MENÚ: listo' : (p.ptsB || p.ptsK ? 'A: asignar punto · B: salir' : desc);
      panel(ctx, 86, 141, 150, 17, 'dark'); drawText(ctx, hint.slice(0, 36), 92, 146, '#e8d8f0', INK);
    },
  };
}
async function status() { await ui.custom(statusWidget()); }

// ───────────── Mochila (rejilla con iconos) ─────────────
const TYPE_ORDER = ['equipo', 'pocion', 'comida', 'libro', 'regalo', 'hierba', 'seta', 'pesca', 'caza', 'cultivo', 'semilla', 'material', 'clave'];
const TYPE_NAME = { equipo: 'Equipo', pocion: 'Poción', comida: 'Comida', libro: 'Libro', regalo: 'Regalo', hierba: 'Hierba', seta: 'Seta', pesca: 'Pesca', caza: 'Caza', cultivo: 'Cosecha', semilla: 'Semilla', material: 'Material', clave: 'Objeto clave' };
let bagSel = 0;
async function bag() {
  while (true) {
    const keys = Object.keys(S.inv).filter((k) => ITEMS[k] && S.inv[k] > 0).sort((a, b) => TYPE_ORDER.indexOf(ITEMS[a].type) - TYPE_ORDER.indexOf(ITEMS[b].type));
    if (!keys.length) { await ui.say('La mochila está vacía.'); return; }
    const k = await ui.custom({
      t: 0, top: 0, sel: Math.min(bagSel, keys.length - 1),
      update() {
        const C = 8, n = keys.length; const o = this.sel;
        if (input.pressed('left') && this.sel % C > 0) this.sel--; if (input.pressed('right') && this.sel % C < C - 1 && this.sel + 1 < n) this.sel++;
        if (input.pressed('up') && this.sel >= C) this.sel -= C; if (input.pressed('down') && this.sel + C < n) this.sel += C; else if (input.pressed('down') && Math.floor(this.sel / C) < Math.floor((n - 1) / C)) this.sel = n - 1;
        if (o !== this.sel) sfx('move');
        const row = Math.floor(this.sel / C); if (row < this.top) this.top = row; if (row > this.top + 3) this.top = row - 3;
        if (input.pressed('A') && this.t > 3) { this.done = true; this.result = keys[this.sel]; bagSel = this.sel; sfx('ok'); }
        if (input.pressed('B') || input.pressed('S')) { this.done = true; this.result = null; bagSel = this.sel; }
      },
      draw(ctx, fr) {
        const y0 = page(ctx, this.t, `Mochila`, 'mochila');
        const ci = icon('moneda'); if (ci) ctx.drawImage(ci, 186, y0 + 4); text(ctx, `${S.money} d.`, 200, y0 + 6, '#8a5a1c');
        const eq = Object.values(S.player.equip || {}); const C = 8;
        for (let r = 0; r < 4; r++) for (let c = 0; c < C; c++) {
          const i = (this.top + r) * C + c; const x = 12 + c * 27, y = y0 + 20 + r * 25;
          ctx.fillStyle = '#e2cfa4'; ctx.fillRect(x, y, 22, 22); ctx.fillStyle = '#d0b98a'; ctx.fillRect(x, y + 21, 22, 1); ctx.fillRect(x + 21, y, 1, 22);
          if (i >= keys.length) continue;
          const k2 = keys[i]; const sel = i === this.sel; const pop = sel ? Math.round(Math.abs(Math.sin(fr / 8)) * 1) : 0;
          if (sel) { ctx.fillStyle = '#f0b030'; ctx.fillRect(x - 1, y - 1, 24, 24); ctx.fillStyle = '#fff4c8'; ctx.fillRect(x, y, 22, 22); }
          const ic = itemIco(k2); if (ic) ctx.drawImage(ic, x + 3, y + 3 - pop);
          if (S.inv[k2] > 1) drawOutlined(ctx, String(S.inv[k2]), x + 21 - textWidth(String(S.inv[k2])), y + 14, '#ffffff', INK);
          if (eq.includes(k2)) { ctx.fillStyle = '#2c5aa0'; ctx.fillRect(x + 1, y + 1, 5, 5); drawText(ctx, 'E', x + 1, y, '#ffffff'); }
        }
        const rows = Math.ceil(keys.length / C); if (this.top > 0) drawText(ctx, '▲', 226, y0 + 18, '#b8322c'); if (this.top + 4 < rows) drawText(ctx, '▼', 226, y0 + 112, '#b8322c');
        const it = ITEMS[keys[this.sel]];
        panel(ctx, 6, 124, 228, 32, 'dark');
        drawText(ctx, it.name, 12, 129, '#fff4d8', INK); const tn = TYPE_NAME[it.type] || ''; drawText(ctx, tn, 228 - textWidth(tn), 129, '#f0b030', INK);
        wrap(it.desc, 214).slice(0, 2).forEach((l, i) => drawText(ctx, l, 12, 139 + i * 9, '#c8b8d8', INK));
      },
    });
    if (!k) return;
    await useItem(k);
  }
}
export async function useItem(k) {
  const it = ITEMS[k]; const p = S.player; p.equip ||= {};
  const opts = [];
  if (it.eq) opts.push(Object.values(p.equip).includes(k) ? 'Quitar' : 'Equipar');
  if (it.heal || it.mp || it.cure || it.buff) opts.push(it.type === 'comida' || it.type === 'seta' ? 'Comer' : 'Usar');
  if (it.type === 'libro') opts.push('Leer');
  if (it.type === 'pocion' && it.battle) opts.push({ label: 'Sólo en combate', disabled: true });
  opts.push('Tirar', 'Volver');
  const j = await ui.choose(opts, { cancel: opts.length - 1, title: it.name, x: 140, y: 40 });
  const o = typeof opts[j] === 'string' ? opts[j] : '';
  if (o === 'Equipar') { p.equip[it.eq.slot] = k; sfx('equip'); p.hpMax = maxHp(p); p.mpMax = maxMp(p); ui.toast(`${it.name} equipado`, '#c8e0ff', 'estado'); if (it.hides) ui.toast('La capucha oculta tus rasgos'); }
  if (o === 'Quitar') { delete p.equip[it.eq.slot]; sfx('back'); }
  if (o === 'Comer' || o === 'Usar') {
    addItem(k, -1);
    if (it.heal) p.hp = Math.max(1, Math.min(p.hpMax, p.hp + it.heal)); if (it.mp) p.mp = Math.min(p.mpMax, p.mp + it.mp);
    if (it.cure) S.ailments = S.ailments.filter((a) => a !== it.cure); if (it.buff) S.flags['buff_' + it.buff] = S.day;
    if (k === 'vino') S.flags.wineBuzz = S.day;
    if (k === 'oronja_verde') { p.hp = 1; S.ailments.push('veneno'); sfx('bad'); await ui.say('Un dolor terrible te dobla. Era una oronja verde. Necesitas un antídoto o un médico, ya.'); return; }
    sfx(it.heal > 0 || it.mp ? 'heal' : 'ok'); await ui.say(`${it.name}${it.heal > 0 ? ` (+${it.heal} PV)` : ''}${it.mp ? ` (+${it.mp} PM)` : ''}.`); addXP(1);
  }
  if (o === 'Leer') {
    if (S.flags['read_' + k]) { await ui.say('Ya lo has leído. Hojeas tus pasajes favoritos.'); return; }
    S.flags['read_' + k] = 1; G.hooks.advance?.(120);
    await ui.say(`Lees «${it.name}» de cabo a rabo. ${it.desc}`); learn(it.know, 3, it.name); addXP(15, 'Lectura');
    if (k === 'lib_tibidabo') { S.flags.knows_devil = 1; await ui.say('En la última página, alguien ha dibujado un monte con una iglesia encima y una silueta negra en la cumbre.'); }
  }
  if (o === 'Tirar') { if (it.type === 'clave') { await ui.say('Mejor no.'); return; } addItem(k, -1); sfx('back'); }
}

// ───────────── Relaciones ─────────────
async function relations() {
  const met = NPCS.filter((n) => S.npc[n.id]?.met);
  if (!met.length) { await ui.say('Aún no conoces a nadie.'); return; }
  met.sort((a, b) => (S.npc[b.id].rel || 0) - (S.npc[a.id].rel || 0));
  await ui.custom({
    sel: 0, top: 0, t: 0,
    update() {
      if (input.pressed('up')) { this.sel = Math.max(0, this.sel - 1); sfx('move'); } if (input.pressed('down')) { this.sel = Math.min(met.length - 1, this.sel + 1); sfx('move'); }
      if (this.sel < this.top) this.top = this.sel; if (this.sel >= this.top + 4) this.top = this.sel - 3;
      if (input.pressed('B') || input.pressed('A') || input.pressed('S')) this.done = true;
    },
    draw(ctx, fr) {
      const y0 = page(ctx, this.t, `Relaciones · ${met.length}/${NPCS.length}`, 'relaciones');
      met.slice(this.top, this.top + 4).forEach((n, i) => {
        const k = this.top + i; const st = S.npc[n.id]; const [, tn, tc] = tier(st.rel || 0); const y = y0 + 14 + i * 26;
        if (k === this.sel) { ctx.fillStyle = UIT.sel; ctx.fillRect(6, y - 2, 228, 25); }
        const ap = { ...n.look, race: n.race, sex: n.sex, age: n.age, equip: n.look.equip || {} };
        ctx.fillStyle = '#d8c39a'; ctx.fillRect(9, y - 1, 24, 23); ctx.drawImage(bust(ap, (st.rel || 0) >= 40 ? 'alegre' : (st.rel || 0) <= -25 ? 'furia' : 'neutral', 0, false), 8, 6, 24, 23, 9, y - 1, 24, 23);
        text(ctx, n.name, 38, y + 1); text(ctx, tn, 160, y + 1, tc);
        const v = st.rel || 0; ctx.fillStyle = '#c8b898'; ctx.fillRect(38, y + 13, 100, 3); ctx.fillStyle = INK; ctx.fillRect(88, y + 12, 1, 5); ctx.fillStyle = v >= 0 ? '#e86890' : '#6a6a9a'; ctx.fillRect(v >= 0 ? 89 : 88 + Math.round(v / 2), y + 13, Math.round(Math.abs(v) / 2), 3);
        if (st.married) drawText(ctx, '♥♥', 214, y + 1, '#e84a6a'); else if (st.partner) drawText(ctx, '♥', 218, y + 1, '#e84a6a'); else if (st.romance) text(ctx, '♥'.repeat(Math.min(3, st.romance)), 208, y + 1, '#f8a0c0');
        const ic = icon(n.faction === 'guardia' ? 'def' : n.faction === 'seu' ? 'esp' : n.faction === 'pagano' ? 'arc' : n.faction === 'corte' ? 'car' : n.shop ? 'com' : 'nat'); if (ic) ctx.drawImage(ic, 142, y + 9);
      });
      if (this.top > 0) drawText(ctx, '▲', 226, y0 + 8, '#b8322c'); if (this.top + 4 < met.length) drawText(ctx, '▼', 226, y0 + 112, '#b8322c');
      const n = met[this.sel]; const st = S.npc[n.id];
      const info = `${n.job}. ${st.bio ? n.bio : 'Pregúntale por su vida para saber más.'}`;
      panel(ctx, 6, 124, 228, 32, 'dark'); wrap(info, 214).slice(0, 3).forEach((l, i) => drawText(ctx, l, 12, 129 + i * 9, '#e8d8f0', INK));
    },
  });
}

// ───────────── Saber: conjuros, recetas, reputación ─────────────
async function knowledge() {
  const ICO = await import('./icons.js').catch(() => null);
  const i = await ui.choose([{ label: 'Conjuros', icon: icon('conjuro') }, { label: 'Recetas', icon: icon('alq') }, { label: 'Reputación', icon: icon('car') }, 'Volver'], { cancel: 3, title: 'Saber', x: 140, y: 40 });
  if (i === 0) { const sp = S.player.spells.map((k) => ({ label: SPELLS[k].name, right: `${SPELLS[k].mp} PM`, hint: SPELLS[k].desc, icon: ICO?.spellIcon?.(k) })); const locked = Object.entries(SPELLS).filter(([k]) => !S.player.spells.includes(k)).map(([k, s]) => ({ label: '???', hint: `Se aprende con ${Object.entries(s.learn || {}).map(([a, b]) => `${STAT_NAME[a]} ${b}`).join(', ') || 'algún maestro'}...`, disabled: true, icon: icon('candado') })); await ui.choose([...sp, ...locked, 'Volver'], { cancel: sp.length + locked.length, title: 'Conjuros', x: 60, y: 8 }); }
  if (i === 1) { const r = RECIPES.map((x) => S.recipes[x.out] ? { label: ITEMS[x.out].name, hint: `${x.in.map((k) => ITEMS[k].name).join(' + ')}. ${ITEMS[x.out].desc}`, icon: itemIco(x.out) } : { label: '??? + ???', hint: 'Experimenta en un caldero.', disabled: true, icon: icon('candado') }); await ui.choose([...r, 'Volver'], { cancel: r.length, title: 'Recetas', x: 60, y: 8, max: 8 }); }
  if (i === 2) await reputation();
  // Los conjuros se aprenden al alcanzar las estadísticas
  for (const [k, s] of Object.entries(SPELLS)) if (s.learn && !S.player.spells.includes(k) && Object.entries(s.learn).every(([a, b]) => stat(a) >= b)) { S.player.spells.push(k); sfx('learn'); ui.toast(`Conjuro aprendido: ${s.name}`, '#f8e060', 'conjuro'); }
}
async function reputation() {
  const R = [['Ciudad', 'ciudad', '#c8a040'], ['La Seu', 'seu', '#8a8aa0'], ['Santa María', 'mar', '#3a7ac8'], ['Corte', 'corte', '#a42632'], ['Gremios', 'gremios', '#8a5a2a'], ['Cultos antiguos', 'pagano', '#3a8a4a']];
  await ui.custom({ t: 0, update() { if ((input.pressed('A') || input.pressed('B') || input.pressed('S')) && this.t > 4) this.done = true; },
    draw(ctx) { const y0 = page(ctx, this.t, 'Reputación', 'car'); text(ctx, `Rango: ${RANKS[S.rank]}`, 12, y0 + 12, UIT.title);
      R.forEach(([n, k, c], i) => { const v = S.rep[k] || 0; const y = y0 + 28 + i * 18; text(ctx, n, 12, y); ctx.fillStyle = '#c8b898'; ctx.fillRect(110, y + 2, 110, 5); ctx.fillStyle = INK; ctx.fillRect(165, y, 1, 9); const w = Math.round(Math.min(55, Math.abs(v)) ); ctx.fillStyle = v >= 0 ? c : '#6a6a9a'; ctx.fillRect(v >= 0 ? 166 : 165 - w, y + 2, w, 5); text(ctx, String(v), 224 - textWidth(String(v)), y - 1, v >= 0 ? '#2f7a3a' : '#9a2a2a'); });
      drawText(ctx, 'A/B: volver', 12, 146, '#8a7a70'); } });
}

// ───────────── Diario ─────────────
async function journal() {
  const qs = [];
  if (S.flags.oca_q === 1) qs.push(['La oca perdida', 'Busca la oca de la Seu cerca del mercado.']);
  if (S.flags.oca_q === 2) qs.push(['La oca perdida', 'Llévala a la Hermana Olaia.']);
  if (S.flags.boar_q === 1) qs.push(['Jabalíes en el Llano', 'Reduce la población de jabalíes (Joan Ferrer).']);
  if (hasCarta()) qs.push(['Carta del Consejo', 'Lleva la carta del Consejo al castillo del Monte del Juïc.']);
  if (S.flags.enriq_seen && !S.flags.enriq_clear) qs.push(['La «bruja» del Raval', 'Desmiente el rumor ante quien lo difunde.']);
  if (S.flags.rosa_bendita && !S.flags.arnau_free) qs.push(['Una rosa bendita', '¿Para quién será?']);
  for (const [id, st] of Object.entries(S.npc)) if (st.req && !st.req.done) qs.push([`Encargo`, `${st.req.n} × ${ITEMS[st.req.item].name} para ${NPCS.find((n) => n.id === id)?.name}.`, st.req.item]);
  const opts = [...qs.map(([t, h, it]) => ({ label: t, hint: h, icon: it ? itemIco(it) : icon('diario') })), { label: 'Registro de sucesos', icon: icon('reloj') }, 'Volver'];
  const i = await ui.choose(opts, { cancel: opts.length - 1, title: `Diario · ${dateStr()}`, x: 40, y: 8 });
  if (i === opts.length - 2) { const L = S.log.slice(0, 30); if (!L.length) return ui.say('Nada aún.'); await ui.choose([...L.map((l) => ({ label: l.slice(0, 34), hint: l })), 'Volver'], { cancel: L.length, max: 7, x: 30, y: 8 }); }
}
function hasCarta() { return (S.inv.carta_fiveller || 0) > 0; }

// ───────────── Mapa: el lugar actual en miniatura y la comarca ─────────────
const miniCache = new Map();
const NODES = { montana: [120, 16], bosque: [120, 38], rio: [58, 54], pradera: [120, 60], costa: [184, 70], ciudad: [120, 82], montjuic: [56, 86] };
async function mapScreen() {
  const m = G.map; const L = mapLayers(m);
  const key = m.id + ':' + L.season; let mini = miniCache.get(key);
  if (!mini) { mini = document.createElement('canvas'); mini.width = Math.ceil(L.W / 4); mini.height = Math.ceil(L.H / 4); const x = mini.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(L.base, 0, 0, mini.width, mini.height); x.drawImage(L.over, 0, 0, mini.width, mini.height); miniCache.set(key, mini); }
  const here = m.outdoor ? m.id : (BUILDINGS[m.id.slice(4)]?.map || S.pos.map);
  await ui.custom({
    t: 0, tab: m.outdoor ? 0 : 0,
    update() { if (input.pressed('left') || input.pressed('right')) { this.tab ^= 1; sfx('page'); this.t2 = 0; } if ((input.pressed('A') || input.pressed('B') || input.pressed('S')) && this.t > 4) this.done = true; this.t2 = (this.t2 || 0) + 1; },
    draw(ctx, fr) {
      const y0 = page(ctx, this.t, this.tab ? 'Comarca' : m.name, 'mapa');
      const VX = 8, VY = y0 + 14, VW = 224, VH = 108;
      ctx.fillStyle = '#3a2228'; ctx.fillRect(VX - 1, VY - 1, VW + 2, VH + 2);
      if (!this.tab) {
        const p = G.player; const px = p.px / 4 + 2, py = p.py / 4 + 2;
        let ox = Math.round(px - VW / 2), oy = Math.round(py - VH / 2); ox = Math.max(0, Math.min(Math.max(0, mini.width - VW), ox)); oy = Math.max(0, Math.min(Math.max(0, mini.height - VH), oy));
        const dx = mini.width < VW ? Math.round((VW - mini.width) / 2) : 0, dy = mini.height < VH ? Math.round((VH - mini.height) / 2) : 0;
        ctx.fillStyle = '#1a1424'; ctx.fillRect(VX, VY, VW, VH);
        ctx.drawImage(mini, ox, oy, Math.min(VW, mini.width), Math.min(VH, mini.height), VX + dx, VY + dy, Math.min(VW, mini.width), Math.min(VH, mini.height));
        // marcadores: personas y misiones
        for (const e of G.ents) { if (e.kind !== 'npc') continue; const ex = VX + dx + e.px / 4 + 2 - ox, ey = VY + dy + e.py / 4 + 2 - oy; if (ex < VX || ey < VY || ex > VX + VW - 2 || ey > VY + VH - 2) continue; const st = S.npc[e.npc.id]; const q = st?.req && !st.req.done; ctx.fillStyle = q ? '#fcd456' : st?.met ? '#f8ecd0' : '#a898b8'; ctx.fillRect(Math.round(ex), Math.round(ey), 2, 2); }
        const bl = fr % 30 < 20; const mx = Math.round(VX + dx + px - ox), my = Math.round(VY + dy + py - oy);
        ctx.fillStyle = INK; ctx.fillRect(mx - 2, my - 2, 5, 5); ctx.fillStyle = bl ? '#ff5050' : '#ffffff'; ctx.fillRect(mx - 1, my - 1, 3, 3);
        // salidas con el nombre del destino
        for (const [edge, ex] of Object.entries(m.exits || {})) { const T = MAPS[ex.to]; if (!T) continue; const nm = (S.known['map:' + ex.to] ? T.name : '???'); const w = textWidth(nm) + 10;
          const ax = edge === 'west' ? VX + 2 : edge === 'east' ? VX + VW - w - 2 : Math.round(VX + VW / 2 - w / 2), ay = edge === 'north' ? VY + 2 : edge === 'south' ? VY + VH - 12 : Math.round(VY + VH / 2 - 5);
          ctx.fillStyle = 'rgba(26,16,34,.85)'; ctx.fillRect(ax, ay, w, 10); drawText(ctx, (edge === 'west' ? '←' : edge === 'east' ? '→' : edge === 'north' ? '↑' : '↓') + nm.slice(0, 18), ax + 2, ay + 2, '#f0d8a0'); }
      } else {
        ctx.fillStyle = '#e8d4a8'; ctx.fillRect(VX, VY, VW, VH);
        for (let i = 0; i < 40; i++) { ctx.fillStyle = '#d8c094'; ctx.fillRect(VX + Math.floor(((i * 97) % VW)), VY + Math.floor((i * 53) % VH), 2, 1); }
        // mar y costa
        ctx.fillStyle = '#9ac0d0'; ctx.fillRect(VX + 150, VY + 96, 74, 12); ctx.fillRect(VX + 196, VY + 60, 28, 48); ctx.fillRect(VX, VY + 100, 150, 8);
        const links = [['montana', 'bosque'], ['bosque', 'pradera'], ['bosque', 'rio'], ['rio', 'pradera'], ['pradera', 'ciudad'], ['pradera', 'costa'], ['ciudad', 'costa'], ['ciudad', 'montjuic']];
        for (const [a2, b2] of links) { const [ax, ay] = NODES[a2], [bx, by] = NODES[b2]; const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let i = 0; i <= n; i += 3) { ctx.fillStyle = '#9a6a3a'; ctx.fillRect(VX + Math.round(ax + (bx - ax) * i / n) - 8, VY + Math.round(ay + (by - ay) * i / n) - 8, 2, 1); } }
        const IC = { montana: 'nieve', bosque: 'nat', rio: 'gota', pradera: 'primavera', costa: 'nube', ciudad: 'estado', montjuic: 'candado' };
        for (const [id, [nx, ny]] of Object.entries(NODES)) {
          const known = S.known['map:' + id] || id === 'ciudad'; const x = VX + nx - 8, y = VY + ny - 8; const cur = id === here;
          ctx.fillStyle = INK; ctx.fillRect(x - 7, y - 7, 15, 15); ctx.fillStyle = cur ? '#f0b030' : known ? '#f6eccc' : '#b8a888'; ctx.fillRect(x - 6, y - 6, 13, 13);
          const im = icon(known ? IC[id] : 'i_duda'); if (im) ctx.drawImage(im, x - 6, y - 6);
          const nm = known ? MAPS[id].name : '???'; drawText(ctx, nm, Math.round(x - textWidth(nm) / 2), y + 9, cur ? '#a42632' : '#4a3430', '#f6eccc');
          if (cur && fr % 40 < 26) { ctx.fillStyle = '#a42632'; ctx.fillRect(x - 8, y - 8, 17, 1); ctx.fillRect(x - 8, y + 8, 17, 1); ctx.fillRect(x - 8, y - 8, 1, 17); ctx.fillRect(x + 8, y - 8, 1, 17); }
        }
      }
      drawText(ctx, `◀ ▶ ${this.tab ? 'este lugar' : 'la comarca'} · B volver`, 12, 146, '#8a7a70');
      if (!m.outdoor && !this.tab) drawText(ctx, 'Interior', 190, 146, '#8a7a70');
    },
  });
}

// ───────────── Ecosistema ─────────────
async function ecology() {
  const known = Object.keys(SP).filter((k) => !SP[k].fish && k !== 'oca' && S.known['sp:' + k]);
  const fish = Object.keys(SP).filter((k) => SP[k].fish && S.known['sp:' + k]);
  const list = [...known, ...fish];
  if (!list.length) return ui.say('No has observado ninguna especie todavía. Acércate a un animal y obsérvalo (A).');
  const e = S.eco;
  await ui.custom({
    sel: 0, top: 0, t: 0,
    update() {
      if (input.pressed('up')) { this.sel = Math.max(0, this.sel - 1); sfx('move'); } if (input.pressed('down')) { this.sel = Math.min(list.length - 1, this.sel + 1); sfx('move'); }
      if (this.sel < this.top) this.top = this.sel; if (this.sel >= this.top + 6) this.top = this.sel - 5;
      if (input.pressed('B') || input.pressed('A') || input.pressed('S')) this.done = true;
    },
    draw(ctx, fr) {
      const y0 = page(ctx, this.t, 'Ecosistema', 'ecosistema');
      if (e) { const ind = [['Pasto', e.veg.pradera || 0, '#62ae4e'], ['Posidonia', e.posidonia, '#2a8a6a'], ['Polinización', e.pollination ?? 1, '#f0b030']]; ind.forEach(([n, v, c], i) => { const x = 12 + i * 76; drawText(ctx, n, x, y0 + 12, UIT.ink); bar(ctx, x, y0 + 21, 64, 3, v, v, [c, c, '#ffffff']); }); }
      const nat = stat('nat');
      // ficha de la especie seleccionada, con su figura grande
      const ks = list[this.sel]; const ss = SP[ks];
      ctx.fillStyle = '#e8d4a8'; ctx.fillRect(160, y0 + 30, 72, 88); ctx.fillStyle = '#d8c094'; ctx.fillRect(160, y0 + 100, 72, 18);
      if (!ss.fish && typeof animalBattle === 'function') { const big = animalBattle(ks, Math.floor(fr / 24) % 2, false, 'm', 'idle'); const sc = big.width > 48 ? 1 : 1; ctx.drawImage(big, Math.round(196 - big.width / 2), y0 + 112 - big.height); }
      else { const ic = itemIco(ss.item); if (ic) ctx.drawImage(ic, 188, y0 + 90); }
      list.slice(this.top, this.top + 6).forEach((k, i) => {
        const j = this.top + i; const y = y0 + 30 + i * 15; const s = SP[k]; const t = total(k);
        if (j === this.sel) { ctx.fillStyle = UIT.sel; ctx.fillRect(6, y - 2, 150, 14); }
        if (!s.fish) ctx.drawImage(animalSprite(k, 'right', Math.floor(fr / 20) % 2, false, 'f', 'idle'), 8, y - 4); else { const ic = itemIco(s.item); if (ic) ctx.drawImage(ic, 8, y - 4); }
        text(ctx, s.name.length > 16 ? s.name.slice(0, 15) + '.' : s.name, 28, y); const est = nat >= 6 ? `${t}` : nat >= 3 ? (t === 0 ? 'ninguno' : t < 5 ? 'escasos' : t < 20 ? 'bastantes' : 'muchos') : '?';
        text(ctx, est, 152 - textWidth(est), y, t === 0 ? '#9a2a2a' : UIT.ink);
      });
      const k = list[this.sel]; const t = total(k); const where = ECO_MAPS.filter((m) => count(m, k) > 0).map(mapName).join(', ');
      panel(ctx, 6, 124, 228, 32, 'dark'); wrap(t === 0 ? 'Desaparecido de la comarca.' : `Visto en: ${where}.`, 214).slice(0, 3).forEach((l, i) => drawText(ctx, l, 12, 129 + i * 9, '#e8d8f0', INK));
    },
  });
}

// ───────────── Guía: cómo se juega ─────────────
const GUIDE = [
  ['Controles', 'estado', ['^bFlechas^0: andar. Mantén ^bB^0 para correr.', '^bA^0: hablar, mirar, recoger, pescar... Cuando te pares delante de algo, una burbuja «A ...» te dice qué puedes hacer.', '^bMENÚ^0: este cuaderno. Desde aquí, estado, mochila, mapa y guardar.', 'Dormir en una cama guarda la partida. Si a las 2:30 sigues en pie, te desplomas.']],
  ['Tiradas y pulso', 'dado', ['Casi todo se decide con un ^yd20^0: tu tirada más tu estadística contra una dificultad (CD).', 'Mientras el dado rueda, un anillo se cierra sobre él. Pulsa ^yA^0 cuando lo abrace: ^y¡pulso!^0 suma +1 (+2 en combate).', 'Un 20 natural es ^ycrítico^0; un 1 es ^rpifia^0.']],
  ['Combate', 'atacar', ['Atacar, conjurar, objetos, acciones, guardia o huir. Encima del rival ves lo que hará después, si sabes leer a esa criatura (NATURALEZA, ARCANO o CARISMA).', 'Cuando te ataque, un anillo se cierra sobre ti: pulsa ^yA^0 justo antes del golpe para ^bbloquear^0, o en el último instante para una ^y¡parada!^0 sin daño y con contraataque. Si pulsas muy pronto, «precipitado».']],
  ['Seny i rauxa', 'rauxa', ['La balanza de abajo mide tu calma (^cseny^0) y tu arrebato (^rrauxa^0).', 'Atacar y recibir golpes te llevan a la rauxa: pegas más, te defiendes peor. La guardia, calmar y curar te llevan al seny: paras mejor y aciertas en todo lo que no es pegar.', 'En un extremo, pulsa ^yMENÚ^0: ^r¡RAUXA!^0 son tres golpes al ritmo; ^cSENY^0 te cura y te deja ver todo lo que piensa el rival.']],
  ['Acciones de folclore', 'accion', ['Cada criatura tiene sus debilidades. A las bestias se las calma, se las alimenta o se las espanta.', 'A un bandolero se le negocia, se le amenaza... o se le nombra a Perot. Al follet hay que darle faena. La Quarantamaula teme el fuego.', 'Y dicen que en la sierra duerme un drac. Pregunta a quien sepa de rondallas.']],
  ['Vida en Barcanueva', 'nat', ['Recolecta en la hierba y los bosques, cultiva en la huerta de Agnès, pesca con caña (la picada y luego la lucha), mezcla en los calderos y forja en la ferrería.', 'Habla con todos: cada uno tiene su vida, rumores, un secreto y una lección. Regalos, encargos y fiestas acercan; los insultos alejan.', 'El ecosistema vive: lo que cazas falta. El mapa te muestra dónde estás y lo que te falta por explorar.']],
];
async function guide() {
  let pg = 0;
  await ui.custom({
    t: 0,
    update() { const o = pg; if (input.pressed('right') || input.pressed('down')) pg = Math.min(GUIDE.length - 1, pg + 1); if (input.pressed('left') || input.pressed('up')) pg = Math.max(0, pg - 1); if (o !== pg) { sfx('page'); this.pt = 0; } this.pt = (this.pt || 0) + 1; if ((input.pressed('A') || input.pressed('B') || input.pressed('S')) && this.t > 4) this.done = true; },
    draw(ctx, fr) {
      const [title, ic, paras] = GUIDE[pg]; const y0 = page(ctx, this.t, `Guía · ${title}`, ic);
      const k = Math.min(1, (this.pt || 0) / 8); const off = Math.round((1 - ease.outCubic(k)) * 10);
      let y = y0 + 14;
      for (const para of paras) { for (const l of wrap(para, 214)) { text(ctx, l, 12 + off, y); y += 11; } y += 4; if (y > 136) break; }
      for (let i = 0; i < GUIDE.length; i++) { ctx.fillStyle = i === pg ? '#a42632' : '#d8c094'; ctx.fillRect(100 + i * 8, 148, 5, 3); }
      drawText(ctx, '◀ ▶ página · B volver', 12, 146, '#8a7a70');
    },
  });
}

// ───────────── Guardar y opciones ─────────────
async function saveGame() {
  const ok = save();
  await ui.custom({ t: 0, update() { if (this.t > 70 || (this.t > 20 && (input.pressed('A') || input.pressed('B')))) this.done = true; if (this.t === 30) sfx(ok ? 'good' : 'no'); },
    draw(ctx, fr) {
      veil(ctx, Math.min(1, this.t / 8) * 0.7); const k = ease.outBack(Math.min(1, this.t / 12)); const w = Math.round(150 * k); if (w < 10) return;
      panel(ctx, 120 - w / 2, 58, w, 40, 'dark'); if (k < 0.9) return;
      const ic = icon('guardar'); if (ic) ctx.drawImage(ic, 58, 66 + (this.t < 30 ? Math.round(Math.sin(this.t / 2) * 2) : 0));
      const s = this.t < 30 ? 'Escribiendo en el diario' + '.'.repeat(Math.floor(this.t / 8) % 4) : ok ? 'Partida guardada.' : 'No se pudo guardar.';
      drawText(ctx, s, 74, 68, '#fff4d8', INK); if (this.t >= 30) drawText(ctx, `${dateStr()} · ${clock()}`, 74, 80, '#f0b030', INK);
      if (this.t === 31) burst(66, 72, 10, { layer: 'screen', colors: ['#fcd456', '#ffffff'], speed: 1.6, life: 22, kind: 'spark' });
    } });
}
async function options() {
  let i = 0;
  while (true) {
    const TS = { 1: 'normal', 2: 'rápido', 3: 'al instante' }; const MV = { 0: 'sin música', 0.25: 'baja', 0.5: 'media', 0.8: 'alta' };
    i = await ui.choose([
      { label: audio.muted ? 'Sonido: apagado' : 'Sonido: encendido', icon: icon('opciones') },
      { label: `Música: ${MV[audio.musicVol] ?? 'media'}`, icon: icon('estrella') },
      { label: `Texto: ${TS[prefs.text] || 'normal'}`, icon: icon('diario') },
      { label: `Paso del tiempo: ${G.timeScale}×`, icon: icon('reloj') }, 'Volver'], { cancel: 4, title: 'Opciones', x: 110, y: 30, start: i });
    if (i === 0) setMuted(!audio.muted);
    if (i === 1) setMusicVol(audio.musicVol >= 0.8 ? 0 : audio.musicVol >= 0.5 ? 0.8 : audio.musicVol >= 0.25 ? 0.5 : 0.25);
    if (i === 2) prefs.text = prefs.text >= 3 ? 1 : prefs.text + 1;
    if (i === 3) G.timeScale = G.timeScale === 1.5 ? 1 : G.timeScale === 1 ? 3 : 1.5;
    prefs.music = audio.musicVol; prefs.muted = audio.muted; savePrefs();
    if (i === 4) return;
  }
}
