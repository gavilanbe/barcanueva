// Menú de pausa: estado y reparto de puntos, mochila, relaciones, saber, diario, ecosistema, guardar.
import { S, BASIC, KNOW, STAT_NAME, tier, XP_FOR, maxHp, maxMp, stat, save, npcState, addItem, logEvent, clock, dateStr, phase, SEASONS, season } from './state.js';
import { ITEMS, SPELLS, RECIPES } from './data/items.js';
import { NPCS } from './data/npcs.js';
import { SP, ECO_MAPS, count, total, mapName } from './eco.js';
import { ui, W, H, panel, text } from './ui.js';
import { drawText, textWidth, wrap } from './font.js';
import { input } from './input.js';
import { charSprite, RACE_NAME, portrait } from './chars.js';
import { G, addXP, playerLook } from './game.js';
import { learn } from './talk.js';
import { RANKS } from './events.js';
import { sfx, audio } from './audio.js';
import { setEquipBonus } from './state.js';

// Bonificaciones del equipo a las estadísticas
setEquipBonus((k) => { let b = 0; for (const it of Object.values(S.player?.equip || {})) { const e = ITEMS[it]?.eq; if (e?.bonus?.[k]) b += e.bonus[k]; } if (k === 'fue' && S.flags?.buff_fue === S.day) b += 2; return b; });

G.hooks.menu = async () => {
  sfx('ok');
  while (true) {
    const p = S.player; const pts = p.ptsB + p.ptsK;
    const i = await ui.choose(['Estado' + (pts ? ' ★' : ''), 'Mochila', 'Relaciones', 'Saber', 'Diario', 'Ecosistema', 'Guardar', 'Opciones', 'Volver'], { cancel: 8, x: 158, y: 4, max: 9 });
    if (i === 0) await status();
    if (i === 1) await bag();
    if (i === 2) await relations();
    if (i === 3) await knowledge();
    if (i === 4) await journal();
    if (i === 5) await ecology();
    if (i === 6) { save(); sfx('good'); await ui.say('Partida guardada.'); }
    if (i === 7) await options();
    if (i === 8) return;
  }
};

// ───────────── Estado ─────────────
export function statusWidget(mode = 'menu') {
  return {
    sel: 0, mode,
    update() {
      const p = S.player; const rows = [...BASIC, ...KNOW];
      if (input.pressed('up')) { this.sel = (this.sel + rows.length - 1) % rows.length; sfx('move'); }
      if (input.pressed('down')) { this.sel = (this.sel + 1) % rows.length; sfx('move'); }
      const [k] = rows[this.sel]; const basic = this.sel < BASIC.length;
      if (input.pressed('A') || input.pressed('right')) {
        if (basic && p.ptsB > 0) { p.stats[k]++; p.ptsB--; sfx('ok'); p.hpMax = maxHp(p); p.mpMax = maxMp(p); if (this.mode === 'create') { p.hp = p.hpMax; p.mp = p.mpMax; } }
        else if (!basic && p.ptsK > 0) { p.know[k]++; p.ptsK--; sfx('ok'); }
        else sfx('no');
      }
      if (input.pressed('left') && this.mode === 'create') {
        const base = basic ? p.stats : p.know; if (base[k] > 0) { base[k]--; basic ? p.ptsB++ : p.ptsK++; sfx('back'); p.hpMax = maxHp(p); p.mpMax = maxMp(p); p.hp = p.hpMax; p.mp = p.mpMax; }
      }
      if (input.pressed('B') || (this.mode === 'create' && input.pressed('S'))) { this.done = true; }
      if (this.mode === 'create' && input.pressed('S')) this.done = true;
    },
    draw(ctx) {
      const p = S.player; ctx.fillStyle = '#2a2030'; ctx.fillRect(0, 0, W, H);
      panel(ctx, 2, 2, 82, 156);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(10, 10, 66, 58); ctx.drawImage(charSprite(playerLook(), 'down', 0), 27, 13, 32, 48);
      text(ctx, p.name, 8, 74); text(ctx, `${RACE_NAME[p.race]} ${p.sex === 'f' ? '♀' : '♂'}`, 8, 85, '#6a4a3a');
      text(ctx, `Nivel ${p.level}`, 8, 96, '#8a3a2a');
      ctx.fillStyle = '#3a2a30'; ctx.fillRect(8, 107, 70, 3); ctx.fillStyle = '#e8c030'; ctx.fillRect(8, 107, Math.round(70 * p.xp / XP_FOR(p.level)), 3);
      text(ctx, `PV ${p.hp}/${p.hpMax}`, 8, 113); text(ctx, `PM ${p.mp}/${p.mpMax}`, 8, 124);
      text(ctx, RANKS[S.rank], 8, 135, '#3a5a8a'); if (S.ailments.length) text(ctx, S.ailments.join(', '), 8, 146, '#b8322c');
      panel(ctx, 86, 2, 152, 156);
      const rows = [...BASIC, ...KNOW]; let y = 7;
      text(ctx, `BÁSICAS  (${p.ptsB} pts)`, 94, y, p.ptsB ? '#b8322c' : '#8a3a2a'); y += 11;
      rows.forEach(([k, n], i) => {
        if (i === BASIC.length) { y += 2; text(ctx, `SABIDURÍA  (${p.ptsK} pts)`, 94, y, p.ptsK ? '#b8322c' : '#8a3a2a'); y += 11; }
        const base = i < BASIC.length ? p.stats[k] : p.know[k]; const eff = stat(k); const bonus = eff - base;
        if (i === this.sel) { ctx.fillStyle = '#ecd8a8'; ctx.fillRect(90, y - 1, 144, 9); drawText(ctx, '▶', 91, y, '#b8322c'); }
        text(ctx, n, 98, y); const vs = String(base) + (bonus ? (bonus > 0 ? '+' : '') + bonus : '');
        text(ctx, vs, 196 - textWidth(vs), y, bonus ? '#3a6ab8' : '#3a2a30');
        const lp = S.learned[k]; if (lp) text(ctx, '⅓⅔'[lp - 1] || '', 200, y, '#6a8a6a');
        for (let b = 0; b < Math.min(10, base); b++) { ctx.fillStyle = i < BASIC.length ? '#b85a3a' : '#3a7a8a'; ctx.fillRect(208 + (b % 5) * 5, y + (b >= 5 ? 4 : 0), 4, 3); }
        y += 9;
      });
      const [, , desc] = rows[this.sel];
      ctx.fillStyle = '#2a2030'; ctx.fillRect(86, 160 - 1, 152, 1);
      const hint = this.mode === 'create' ? '◀ quitar · ▶/A poner · MENÚ: listo' : (p.ptsB || p.ptsK ? 'A: asignar punto · B: salir' : desc);
      drawText(ctx, hint.slice(0, 40), 92, 147, '#6a5a4a');
    },
  };
}
async function status() { await ui.custom(statusWidget()); }

// ───────────── Mochila ─────────────
const TYPE_ORDER = ['equipo', 'pocion', 'comida', 'libro', 'regalo', 'hierba', 'seta', 'pesca', 'caza', 'cultivo', 'semilla', 'material', 'clave'];
async function bag() {
  while (true) {
    const keys = Object.keys(S.inv).filter((k) => ITEMS[k] && S.inv[k] > 0).sort((a, b) => TYPE_ORDER.indexOf(ITEMS[a].type) - TYPE_ORDER.indexOf(ITEMS[b].type));
    if (!keys.length) { await ui.say('La mochila está vacía.'); return; }
    const eq = S.player.equip || {};
    const lbl = (k) => ({ label: `${Object.values(eq).includes(k) ? 'E ' : ''}${ITEMS[k].name} x${S.inv[k]}`, hint: ITEMS[k].desc });
    const i = await ui.choose([...keys.map(lbl), 'Volver'], { cancel: keys.length, title: `Mochila · ${S.money} d.`, x: 4, y: 4, max: 8 });
    if (i === keys.length) return;
    await useItem(keys[i]);
  }
}
export async function useItem(k) {
  const it = ITEMS[k]; const p = S.player; p.equip ||= {};
  const opts = [];
  if (it.eq) opts.push(Object.values(p.equip).includes(k) ? 'Quitar' : 'Equipar');
  if (it.heal || it.mp || it.cure || it.buff) opts.push(it.type === 'comida' || it.type === 'seta' ? 'Comer' : 'Usar');
  if (it.type === 'libro') opts.push('Leer');
  if (it.type === 'pocion' && it.battle) opts.push('(sólo en combate)');
  opts.push('Tirar', 'Volver');
  const j = await ui.choose(opts, { cancel: opts.length - 1 });
  const o = opts[j];
  if (o === 'Equipar') { p.equip[it.eq.slot] = k; sfx('ok'); p.hpMax = maxHp(p); p.mpMax = maxMp(p); if (it.hides) ui.toast('La capucha oculta tus rasgos'); }
  if (o === 'Quitar') { delete p.equip[it.eq.slot]; sfx('back'); }
  if (o === 'Comer' || o === 'Usar') {
    addItem(k, -1);
    if (it.heal) p.hp = Math.max(1, Math.min(p.hpMax, p.hp + it.heal)); if (it.mp) p.mp = Math.min(p.mpMax, p.mp + it.mp);
    if (it.cure) S.ailments = S.ailments.filter((a) => a !== it.cure); if (it.buff) S.flags['buff_' + it.buff] = S.day;
    if (k === 'vino') S.flags.wineBuzz = S.day;
    if (k === 'oronja_verde') { p.hp = 1; S.ailments.push('veneno'); await ui.say('Un dolor terrible te dobla. Era una oronja verde. Necesitas un antídoto o un médico, ya.'); return; }
    sfx('ok'); await ui.say(`${it.name}${it.heal > 0 ? ` (+${it.heal} PV)` : ''}${it.mp ? ` (+${it.mp} PM)` : ''}.`); addXP(1);
  }
  if (o === 'Leer') {
    if (S.flags['read_' + k]) { await ui.say('Ya lo has leído. Hojeas tus pasajes favoritos.'); return; }
    S.flags['read_' + k] = 1; G.hooks.advance?.(120);
    await ui.say(`Lees «${it.name}» de cabo a rabo. ${it.desc}`); learn(it.know, 3, it.name); addXP(15, 'Lectura');
    if (k === 'lib_tibidabo') { S.flags.knows_devil = 1; await ui.say('En la última página, alguien ha dibujado un monte con una iglesia encima y una silueta negra en la cumbre.'); }
  }
  if (o === 'Tirar') { if (it.type === 'clave') { await ui.say('Mejor no.'); return; } addItem(k, -1); }
}

// ───────────── Relaciones ─────────────
async function relations() {
  const met = NPCS.filter((n) => S.npc[n.id]?.met);
  if (!met.length) { await ui.say('Aún no conoces a nadie.'); return; }
  met.sort((a, b) => (S.npc[b.id].rel || 0) - (S.npc[a.id].rel || 0));
  await ui.custom({
    sel: 0, top: 0,
    update() {
      if (input.pressed('up')) { this.sel = Math.max(0, this.sel - 1); sfx('move'); } if (input.pressed('down')) { this.sel = Math.min(met.length - 1, this.sel + 1); sfx('move'); }
      if (this.sel < this.top) this.top = this.sel; if (this.sel >= this.top + 6) this.top = this.sel - 5;
      if (input.pressed('B') || input.pressed('A')) this.done = true;
    },
    draw(ctx) {
      ctx.fillStyle = '#2a2030'; ctx.fillRect(0, 0, W, H); panel(ctx, 2, 2, 236, 156);
      text(ctx, `Relaciones (${met.length}/${NPCS.length})`, 10, 8, '#8a3a2a');
      met.slice(this.top, this.top + 6).forEach((n, i) => {
        const k = this.top + i; const st = S.npc[n.id]; const [, tn, tc] = tier(st.rel || 0); const y = 22 + i * 17;
        if (k === this.sel) { ctx.fillStyle = '#ecd8a8'; ctx.fillRect(6, y - 2, 228, 16); }
        ctx.drawImage(charSprite({ ...n.look, race: n.race, sex: n.sex, equip: n.look.equip || {} }, 'down', 0), 0, 0, 16, 14, 9, y - 1, 16, 14);
        text(ctx, n.name, 28, y); text(ctx, tn, 150, y, tc);
        const v = st.rel || 0; ctx.fillStyle = '#c8b898'; ctx.fillRect(28, y + 10, 100, 2); ctx.fillStyle = v >= 0 ? '#e86890' : '#6a6a9a'; ctx.fillRect(v >= 0 ? 78 : 78 + v / 2, y + 10, Math.abs(v) / 2, 2);
        if (st.married) drawText(ctx, '♥♥', 212, y, '#e84a6a'); else if (st.partner) drawText(ctx, '♥', 216, y, '#e84a6a'); else if (st.romance) text(ctx, '♥'.repeat(Math.min(3, st.romance)), 208, y, '#f8a0c0');
      });
      const n = met[this.sel]; const st = S.npc[n.id];
      const info = `${n.job}. ${st.bio ? n.bio : 'Pregúntale por su vida para saber más.'}`;
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(6, 124, 228, 30); wrap(info, 222).slice(0, 2).forEach((l, i) => text(ctx, l, 9, 127 + i * 12, '#4a3a30', null));
    },
  });
}

// ───────────── Saber: conjuros, recetas, rumores ─────────────
async function knowledge() {
  const i = await ui.choose(['Conjuros', 'Recetas', 'Reputación', 'Volver'], { cancel: 3 });
  if (i === 0) { const sp = S.player.spells.map((k) => ({ label: `${SPELLS[k].name} (${SPELLS[k].mp} PM)`, hint: SPELLS[k].desc })); const locked = Object.entries(SPELLS).filter(([k]) => !S.player.spells.includes(k)).map(([k, s]) => ({ label: '???', hint: `Se aprende con ${Object.entries(s.learn || {}).map(([a, b]) => `${STAT_NAME[a]} ${b}`).join(', ') || 'algún maestro'}...`, disabled: true })); await ui.choose([...sp, ...locked, 'Volver'], { cancel: sp.length + locked.length, title: 'Conjuros' }); }
  if (i === 1) { const r = RECIPES.map((x) => S.recipes[x.out] ? { label: `${ITEMS[x.out].name}: ${x.in.map((k) => ITEMS[k].name).join(' + ')}`, hint: ITEMS[x.out].desc } : { label: '??? + ???', hint: 'Experimenta en un caldero.', disabled: true }); await ui.choose([...r, 'Volver'], { cancel: r.length, title: 'Recetas' }); }
  if (i === 2) { const r = S.rep; await ui.say(`Ciudad ${r.ciudad} · Seu ${r.seu} · Santa María ${r.mar} · Corte ${r.corte} · Gremios ${r.gremios} · Cultos antiguos ${r.pagano}.\nRango: ${RANKS[S.rank]}.`); }
  // Los conjuros se aprenden al alcanzar las estadísticas
  for (const [k, s] of Object.entries(SPELLS)) if (s.learn && !S.player.spells.includes(k) && Object.entries(s.learn).every(([a, b]) => stat(a) >= b)) { S.player.spells.push(k); ui.toast(`Conjuro aprendido: ${s.name}`, '#f8e060'); }
}

// ───────────── Diario ─────────────
async function journal() {
  const qs = [];
  if (S.flags.oca_q === 1) qs.push('La oca perdida: busca la oca de la Seu cerca del mercado.');
  if (S.flags.oca_q === 2) qs.push('La oca perdida: llévala a la Hermana Olaia.');
  if (S.flags.boar_q === 1) qs.push('Jabalíes en el Llano: reduce la población de jabalíes (Joan Ferrer).');
  if (hasCarta()) qs.push('Lleva la carta del Consejo al castillo del Monte del Juïc.');
  if (S.flags.enriq_seen && !S.flags.enriq_clear) qs.push('La «bruja» del Raval: desmiente el rumor ante quien lo difunde.');
  if (S.flags.rosa_bendita && !S.flags.arnau_free) qs.push('Una rosa bendita... ¿para quién?');
  for (const [id, st] of Object.entries(S.npc)) if (st.req && !st.req.done) qs.push(`Encargo: ${st.req.n} × ${ITEMS[st.req.item].name} para ${NPCS.find((n) => n.id === id)?.name}.`);
  const opts = [...qs.map((q) => ({ label: q.split(':')[0], hint: q })), 'Registro de sucesos', 'Volver'];
  const i = await ui.choose(opts, { cancel: opts.length - 1, title: `Diario · ${dateStr()}` });
  if (i === opts.length - 2) { const L = S.log.slice(0, 30); if (!L.length) return ui.say('Nada aún.'); await ui.choose([...L.map((l) => ({ label: l.slice(0, 40), hint: l })), 'Volver'], { cancel: L.length, max: 7 }); }
}
function hasCarta() { return (S.inv.carta_fiveller || 0) > 0; }

// ───────────── Ecosistema ─────────────
async function ecology() {
  const known = Object.keys(SP).filter((k) => !SP[k].fish && k !== 'oca' && S.known['sp:' + k]);
  const fish = Object.keys(SP).filter((k) => SP[k].fish && S.known['sp:' + k]);
  const opts = [...known, ...fish].map((k) => {
    const nat = stat('nat'); const t = total(k);
    const est = nat >= 6 ? `${t}` : nat >= 3 ? (t === 0 ? 'ninguno' : t < 5 ? 'escasos' : t < 20 ? 'bastantes' : 'muchos') : '?';
    const where = ECO_MAPS.filter((m) => count(m, k) > 0).map(mapName).join(', ');
    return { label: `${SP[k].name}: ${est}`, hint: t === 0 ? 'Desaparecido de la comarca.' : `Visto en: ${where}.` };
  });
  const e = S.eco; const hdr = e ? `Pasto ${Math.round((e.veg.pradera || 0) * 100)}% · Posidonia ${Math.round(e.posidonia * 100)}% · Polinización ${Math.round((e.pollination ?? 1) * 100)}%` : '';
  if (!opts.length) return ui.say('No has observado ninguna especie todavía. Acércate a un animal y obsérvalo (A).');
  await ui.choose([...opts, 'Volver'], { cancel: opts.length, title: hdr.slice(0, 44), max: 7 });
}

async function options() {
  const i = await ui.choose([audio.muted ? 'Activar sonido' : 'Silenciar', `Velocidad del tiempo: ${G.timeScale}×`, 'Volver'], { cancel: 2 });
  if (i === 0) audio.muted = !audio.muted;
  if (i === 1) G.timeScale = G.timeScale === 1.5 ? 1 : G.timeScale === 1 ? 3 : 1.5;
}
