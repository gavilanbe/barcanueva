// Combate por turnos de Barcanueva: tiradas de d20 con «pulso», paradas a tiempo, intenciones del rival que
// se leen según lo que sabes de él, acciones de folclore propias de cada criatura y la balanza de
// SENY I RAUXA (la calma y el arrebato catalanes): atacar empuja hacia la rauxa (más daño, menos defensa),
// guardarse y calmar empujan hacia el seny (más defensa y mejores tiradas). En cada extremo hay un golpe especial.
import { S, stat, mod, addItem, hasItem, logEvent, npcState, phase, season as seasonNow } from './state.js';
import { ITEMS, SPELLS } from './data/items.js';
import { SP, removeAnimal } from './eco.js';
import { ui, W, H, panel, text, icon, itemIco, bar, hand, drawD20, T as UIT } from './ui.js';
import { drawText, textWidth, drawOutlined, drawBig, bigWidth, bigText } from './font.js';
import { figure, backBust } from './portraits.js';
import { animalSprite } from './sprites.js';
import * as SPR from './sprites.js';
import { G, addXP, playerLook, npcLook, updateMusic, weatherToday } from './game.js';
import { sfx, music, jingle } from './audio.js';
import { input } from './input.js';
import { fx, tween, wait, ease, prog, shake, freeze, flash, spawn, burst, popText, transition, trans, ringPx, sparkle } from './fx.js';
import { INK, alpha, silhouette, PAL, mix } from './pal.js';
import { ellipse, ellipseDither, bayer } from './px.js';

let BA = null; import('./battleart.js').then((m) => { BA = m; }).catch(() => {});
let ICO = null; import('./icons.js').then((m) => { ICO = m; }).catch(() => {});
const d = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(Math.random() * s); return t; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const B = { active: null };

// Enemigos «de encuentro» (no forman parte de la población simulada)
export const MONSTERS = {
  bandido: { name: 'Bandolero', hp: 26, atk: 5, def: 3, esp: 1, xp: 30, loot: ['cuchillo', 'vino'], money: [5, 25], look: { skin: '#c98e62', hair: '#2a1d18', hairStyle: 0, top: '#4a4a3a', bottom: '#3a3a2a', beard: true, equip: { head: 'capucha' } } },
  quarantamaula: { name: 'Quarantamaula', hp: 40, atk: 7, def: 4, esp: 5, xp: 70, loot: ['hueso', 'piel'], fae: true, color: ['#2a2a30', '#e84a2a'], weak: 'fuego' },
  simiot: { name: 'Simiot', hp: 36, atk: 6, def: 3, esp: 2, xp: 60, loot: ['piel', 'uva'], fae: true, color: ['#5a4a3a', '#d8c8a8'], weak: 'santo' },
  follet: { name: 'Follet', hp: 14, atk: 3, def: 6, esp: 6, xp: 25, loot: ['cinta'], fae: true, color: ['#6a8a3a', '#e8c040'] },
  drac: { name: 'Drac de Olorda', hp: 140, atk: 13, def: 8, esp: 8, xp: 400, loot: ['cornamenta', 'plata', 'plata'], fae: true, color: ['#3a7a3a', '#e8c040'], boss: true, weak: 'frio' },
};

// ───────────── Repertorio de movimientos ─────────────
// kind: attack | charge | guard | flee | taunt | shadow | heal | tangle | evade | surrender
// windup: fotogramas de preparación (más largo = más fácil de parar) · feint: amago · pow: multiplicador de daño
const MV = {
  golpe: { name: 'Golpe', icon: 'i_ataque', kind: 'attack', pow: 1, windup: 34 },
  punetazo: { name: 'Puñetazo', icon: 'i_ataque', kind: 'attack', pow: 1, windup: 30 },
  mordisco: { name: 'Mordisco', icon: 'i_ataque', kind: 'attack', pow: 1, windup: 26, fx: 'bite' },
  zarpazo: { name: 'Zarpazo', icon: 'i_ataque', kind: 'attack', pow: 1.1, windup: 30, fx: 'claw' },
  picotazo: { name: 'Picotazo', icon: 'i_ataque', kind: 'attack', pow: 0.7, windup: 22 },
  aguijon: { name: 'Aguijón', icon: 'i_ataque', kind: 'attack', pow: 0.6, windup: 18, poison: 0.35 },
  dentellada: { name: 'Dentellada', icon: 'i_fuerte', kind: 'attack', pow: 1.5, windup: 24, fx: 'bite' },
  embestida: { name: 'Embestida', icon: 'i_fuerte', kind: 'attack', pow: 1.7, windup: 52, fx: 'impact' },
  punalada: { name: 'Puñalada', icon: 'i_fuerte', kind: 'attack', pow: 1.6, windup: 40, feint: true, fx: 'slash' },
  robar: { name: 'Mano larga', icon: 'i_robo', kind: 'attack', pow: 0.5, windup: 30, steal: true, feint: true },
  devorar: { name: 'Devorar', icon: 'i_fuerte', kind: 'attack', pow: 2, windup: 62, fx: 'bite' },
  coletazo: { name: 'Coletazo', icon: 'i_ataque', kind: 'attack', pow: 1, windup: 32, fx: 'impact' },
  llamarada: { name: 'Llamarada', icon: 'i_fuerte', kind: 'attack', pow: 2.1, windup: 58, fx: 'fire', noPerfect: true },
  enredar: { name: 'Enredar', icon: 'i_especial', kind: 'tangle', pow: 0.3, windup: 28, feint: true },
  pellizco: { name: 'Pellizco', icon: 'i_ataque', kind: 'attack', pow: 0.8, windup: 20, feint: true },
  empujon: { name: 'Empujón', icon: 'i_ataque', kind: 'attack', pow: 0.6, windup: 26, push: 1 },
  escarbar: { name: 'Escarba el suelo', icon: 'i_carga', kind: 'charge', next: 'embestida', say: 'escarba el suelo y resopla' },
  acechar: { name: 'Acecha', icon: 'i_carga', kind: 'charge', next: 'dentellada', say: 'se agazapa y te clava la mirada' },
  afilar: { name: 'Prepara el golpe', icon: 'i_carga', kind: 'charge', next: 'punalada', say: 'cambia el cuchillo de mano' },
  inspirar: { name: 'Toma aire', icon: 'i_carga', kind: 'charge', next: 'llamarada', say: 'hincha el pecho: le brilla la garganta' },
  defender: { name: 'Se protege', icon: 'i_defensa', kind: 'guard', say: 'se encoge y se protege' },
  salto: { name: 'Salta', icon: 'i_defensa', kind: 'evade', say: 'salta a una rama y te observa desde arriba' },
  vuelo: { name: 'Alza el vuelo', icon: 'i_defensa', kind: 'evade', say: 'bate las alas y se eleva' },
  huir: { name: 'Huida', icon: 'i_huida', kind: 'flee' },
  amenaza: { name: 'Amenaza', icon: 'i_especial', kind: 'taunt', say: 'te provoca: «¿Eso es todo?»' },
  rugido: { name: 'Rugido', icon: 'i_especial', kind: 'taunt', say: 'ruge y la tierra tiembla', sfx: 'roar' },
  chillido: { name: 'Chillido', icon: 'i_especial', kind: 'taunt', say: 'chilla y enseña los colmillos', sfx: 'screech' },
  insulto: { name: 'Insulto', icon: 'i_especial', kind: 'taunt', say: 'te dice algo sobre tu madre' },
  sombra: { name: 'Sombra', icon: 'i_sombra', kind: 'shadow', say: 'se deshace en una niebla negra' },
  risitas: { name: 'Risitas', icon: 'i_cura', kind: 'heal', say: 'se ríe a carcajadas y se recompone' },
  rendirse: { name: 'Se rinde', icon: 'i_huida', kind: 'surrender' },
};
function moveset(e) {
  if (e.kind === 'animal') {
    const s = SP[e.sp]; const bite = ['ave_suelo', 'pajaro', 'rapaz', 'zancuda', 'pato'].includes(s.plan) ? 'picotazo' : ['gato', 'oso', 'ardilla'].includes(s.plan) ? 'zarpazo' : 'mordisco';
    if (s.beh === 'pica') return [['aguijon', 4], ['huir', 1]];
    if (s.beh === 'embiste') return [[bite, 3], ['escarbar', 2], ...(e.sp === 'oso' ? [['rugido', 1]] : [])];
    if (s.beh === 'caza') return [[bite, 3], ['acechar', 2], ['rugido', 1]];
    if (s.beh === 'ignora') return [[bite, 2], ['defender', 2], ['huir', 1]];
    return [[bite, 2], ['huir', e.hp < e.hpMax ? 3 : 1]];
  }
  if (e.kind === 'npc') return [['punetazo', 4], ['empujon', 1], ['insulto', 1], ...(e.hp < e.hpMax * 0.25 ? [['rendirse', 3]] : [])];
  switch (e.id) {
    case 'bandido': return [['golpe', 3], ['afilar', 2], ['robar', 2], ['amenaza', 1], ...(e.hp < e.hpMax * 0.3 ? [['huir', 2]] : [])];
    case 'quarantamaula': return [['zarpazo', 3], ['sombra', 1], ['devorar', 2]];
    case 'simiot': return [['zarpazo', 3], ['salto', 1], ['chillido', 1]];
    case 'follet': return [['pellizco', 2], ['enredar', 2], ['risitas', 1], ...(e.hp < e.hpMax * 0.4 ? [['huir', 1]] : [])];
    case 'drac': return [['coletazo', 3], ['inspirar', 2], ['vuelo', 1], ['rugido', 1]];
  }
  return [['golpe', 1]];
}
function chooseMove(e) {
  if (e.charged) { const m = e.charged; e.charged = null; return m; }
  const list = moveset(e).filter(([m]) => !(m === 'huir' && e.boss)); let tot = list.reduce((s, [, w]) => s + w, 0), r = Math.random() * tot;
  for (const [m, w] of list) { r -= w; if (r <= 0) return m; } return list[0][0];
}
// ¿Se lee la intención? Según el saber que toca: bestias → NATURALEZA o CAZA; criaturas → ARCANO; personas → CARISMA
function canRead(e) {
  if (B.active?.reveal) return true; if (e.shadow > 0) return false;
  if (e.kind === 'animal') return Math.max(stat('nat'), stat('caz')) >= 3;
  if (e.fae) return stat('arc') >= 4;
  return stat('car') >= 3 || stat('his') >= 4;
}

// ───────────── Enemigos ─────────────
export function animalEnemy(entity) {
  const s = SP[entity.sp]; const a = entity.a; const cria = a.age < s.mature;
  return { kind: 'animal', sp: entity.sp, a, ent: entity, name: s.name, hp: entity.hp, hpMax: entity.hp, atk: Math.round((s.atk || 1) * (cria ? 0.5 : 1)), def: Math.min(6, (s.size || 0) * 2 + (s.plan === 'tortuga' ? 4 : 0)), esp: 1 };
}
export function npcEnemy(npc) {
  const armorish = npc.look.equip?.body === 'cota' || npc.look.equip?.body === 'coraza';
  const hp = 22 + (npc.race === 'enano' ? 8 : 0) + (npc.faction === 'guardia' ? 10 : 0);
  return { kind: 'npc', npc, name: npc.name, hp, hpMax: hp, atk: npc.faction === 'guardia' ? 6 : 4, def: armorish ? 5 : 2, esp: 2 };
}
export function monster(id) { const m = MONSTERS[id]; return { kind: 'monster', id, ...m, hpMax: m.hp, loot: [...(m.loot || [])] }; }

// ───────────── Combate ─────────────
const EN0 = { x: 176, y: 76 }, PL0 = { x: 70, y: 120 };
export async function fight(enemy) {
  const p = S.player;
  if (B.active) return 'busy';
  // «¡!» sobre el jugador y transición de persianas con la imagen congelada
  const snap = document.createElement('canvas'); snap.width = W; snap.height = H; snap.getContext('2d').drawImage(document.getElementById('screen'), 0, 0);
  if (G.player) { G.player.emote = { name: '!', t: 0, life: 40 }; sfx('encounter'); await wait(26); }
  B.active = {
    e: enemy, t: 0, cam: 0, zoom: 1, needle: 0, buff: 0, guard: 0, reveal: false, adv: 0, streak: 0, turn: 0, log: [],
    pl: { ox: -150, oy: 0, flash: 0, pose: 'idle', hurt: 0, alpha: 1, hpG: p.hp / p.hpMax, mpG: p.mp / p.mpMax },
    en: { ox: 150, oy: 0, flash: 0, pose: 'idle', hurt: 0, alpha: 1, dissolve: 0, hpG: Math.max(0, enemy.hp) / enemy.hpMax, scale: 1 },
    intent: null, menu: false, biome: G.map?.biome || 'pradera', ph: phase().id,
  };
  { const w = G.map?.outdoor ? weatherToday() : null; const s = seasonNow(); B.active.weather = w === 'lluvia' || w === 'tormenta' ? 'rain' : w === 'nieve' ? 'snow' : G.map?.biome === 'bosque' && s === 2 ? 'leaves' : (phase().id === 'noche' && s >= 1 && s <= 2 && G.map?.outdoor) ? 'fireflies' : null; }
  const b = B.active;
  music(enemy.boss ? 'jefe' : 'batalla');
  await transition('battle', () => { G.mode = 'battle'; try { BA?.warmBattleBg?.(b.biome, b.ph); } catch (er) { } }, { snap, dur: 34, hold: 6, durIn: 22 });
  sfx('whoosh');
  tween(b.en, { ox: 0 }, 26, ease.outCubic); await tween(b.pl, { ox: 0 }, 26, ease.outCubic);
  if (enemy.kind === 'animal' && SP[enemy.sp]?.beh === 'embiste') sfx('growl'); else if (enemy.id === 'drac') sfx('roar'); else if (enemy.fae) sfx('screech');
  await ui.say(enemy.intro || introLine(enemy), { auto: 90 });
  // Iniciativa: emboscada o sorpresa
  let enemyFirst = !!enemy.ambush;
  if (!enemyFirst && enemy.kind === 'animal' && enemy.ent && G.player && !enemy.hunted) {
    const s = SP[enemy.sp]; if (s.beh !== 'caza' && s.beh !== 'embiste') { b.surprise = true; popText(EN0.x, EN0.y - 54, '¡Desprevenido!', { color: '#fcd456' }); sfx('alert'); }
  }
  let result = null;
  b.intent = chooseMove(enemy);
  if (enemyFirst) { result = await enemyTurn(enemy); }
  while (!result) {
    b.turn++;
    // Turno del jugador
    if (b.tangled) { b.tangled = 0; await say('Sigues enredado y no puedes hacer nada.'); }
    else { const r = await playerTurn(enemy); if (r === 'again') continue; if (r) { result = r; break; } }
    if (enemy.hp <= 0) { result = 'win'; break; }
    // Efectos al final del turno del jugador
    if (enemy.poison) { const pd = d(1, 4); await hitEnemy(enemy, pd, { fx: 'poison', color: '#8ae07a', silent: true }); popText(enX(), EN0.y - 40, 'veneno', { color: '#8ae07a' }); if (enemy.hp <= 0) { result = 'win'; break; } }
    if (enemy.sleep > 0) { enemy.sleep--; spawnZ(); await say(`${enemy.name} duerme profundamente.`); b.intent = chooseMove(enemy); continue; }
    result = await enemyTurn(enemy);
    if (!result && p.hp <= 0) result = 'lose';
  }
  const out = await finish(enemy, result);
  b.menu = false;
  if (result === 'lose') {
    await transition('sleep', async () => { await ui.say('Todo se vuelve negro...'); B.active = null; G.mode = 'world'; G.hooks.knockoutPrep?.(enemy); updateMusic(); }, { dur: 30, durIn: 34 });
    await G.hooks.knockoutAfter?.(enemy);
  } else await transition('fade', () => { B.active = null; G.mode = 'world'; updateMusic(); }, { dur: 18 });
  return out;
}
function introLine(e) {
  if (e.kind === 'animal') { const s = SP[e.sp]; return s.beh === 'embiste' ? `¡${e.name} se planta frente a ti, resoplando!` : s.beh === 'caza' ? `¡${e.name} te enseña los colmillos!` : `¡${e.name} te hace frente!`; }
  if (e.kind === 'npc') return `${e.name} se remanga. «Vamos a ver qué sabes hacer.»`;
  return `¡${e.name} te hace frente!`;
}
const say = (s, o = {}) => ui.say(s, { auto: 100, ...o });
const par = (y) => (BA?.parallaxAt ? BA.parallaxAt(y, B.active?.biome || 'pradera') : y < 100 ? 0.58 : 0.85);
const enX = () => EN0.x - (B.active?.cam || 0) * par(EN0.y) + (B.active?.en.ox || 0);
const plX = () => PL0.x - (B.active?.cam || 0) * par(PL0.y) + (B.active?.pl.ox || 0);
function spawnZ() { for (let i = 0; i < 3; i++) popText(enX() + 10 + i * 6, EN0.y - 50 - i * 6, 'z', { color: '#c8d8ff', vy: -0.5, life: 50 }); }
function weapon() { const w = S.player.equip?.weapon; return w ? ITEMS[w].eq : { atk: 1 }; }
function armor() { let t = 0; for (const s of ['head', 'body', 'cape']) { const it = S.player.equip?.[s]; if (it) t += ITEMS[it].eq.def || 0; } return t; }
function pushNeedle(n) {
  const b = B.active; const old = b.needle; b.needle = Math.max(-5, Math.min(5, b.needle + n));
  if (b.needle !== old) { b.needleBump = 10; if (Math.abs(b.needle) === 5 && Math.abs(old) < 5) { sfx(b.needle > 0 ? 'rauxa' : 'seny'); popText(PL0.x + 40, 96, b.needle > 0 ? '¡RAUXA!' : 'SENY', { color: b.needle > 0 ? '#ff7050' : '#7ae0e0', big: true, life: 60 }); } }
}
const rauxa = () => Math.max(0, B.active.needle), seny = () => Math.max(0, -B.active.needle);

// ───────────── Turno del jugador ─────────────
async function playerTurn(e) {
  const b = B.active; const p = S.player;
  b.menu = true;
  const i = await commandMenu(e);
  b.menu = false;
  if (i === 'special') return special(e);
  if (i === 0) return attack(e);
  if (i === 1) { const r = await cast(e); return r === false ? 'again' : r || null; }
  if (i === 2) { const r = await useItem(e); return r === false ? 'again' : r || null; }
  if (i === 3) { const r = await actions(e); return r === false ? 'again' : r || null; }
  if (i === 4) { b.guard = 1; pushNeedle(-2); sfx('block'); burstAt(plX(), PL0.y - 34, 'shield'); if (p.mp < p.mpMax) p.mp++; popText(plX(), PL0.y - 66, 'En guardia', { color: '#9ac8ff' }); await wait(30); return null; }
  if (i === 5) return flee(e);
}

// Menú de órdenes: rejilla de 3×2 con iconos y, en los extremos de la balanza, el golpe especial con MENÚ.
const CMDS = [['Atacar', 'atacar', 'Golpe con tu arma. Empuja hacia la rauxa.'], ['Conjuro', 'conjuro', 'INTELIGENCIA + ARCANO. Consume PM.'], ['Objeto', 'objeto', 'Pociones, comida, humos...'], ['Acción', 'accion', 'Calmar, observar, negociar, conjurar... según el rival.'], ['Guardia', 'guardia', 'Te cubres: parar es más fácil y el daño, menor. Empuja hacia el seny.'], ['Huir', 'huir', 'FUERZA + NATURALEZA.']];
function commandMenu(e) {
  const b = B.active;
  return ui.custom({
    i: b.lastCmd || 0, t: 0,
    update() {
      const o = this.i;
      if (input.pressed('left') && this.i % 3 > 0) this.i--; if (input.pressed('right') && this.i % 3 < 2) this.i++;
      if (input.pressed('up') && this.i >= 3) this.i -= 3; if (input.pressed('down') && this.i < 3) this.i += 3;
      if (o !== this.i) sfx('move');
      if (input.pressed('A') && this.t > 4) { this.done = true; this.result = this.i; b.lastCmd = this.i; sfx('ok'); }
      if (input.pressed('S') && Math.abs(b.needle) === 5) { this.done = true; this.result = 'special'; sfx('ok'); }
    },
    draw(ctx, fr) {
      const op = prog(this.t, 10, 0, ease.outBack); const y0 = 112 + Math.round((1 - op) * 50);
      panel(ctx, 2, y0, 236, 47, 'dark');
      for (let k = 0; k < 6; k++) {
        const cx = 8 + (k % 3) * 76, cy = y0 + 6 + Math.floor(k / 3) * 19; const sel = k === this.i;
        const lift = sel ? 1 + Math.round(Math.abs(Math.sin(fr / 8))) : 0;
        ctx.fillStyle = sel ? '#f0b030' : '#140e1c'; ctx.fillRect(cx, cy - lift, 72, 16); ctx.fillStyle = sel ? '#4a3462' : '#2a1e38'; ctx.fillRect(cx + 1, cy + 1 - lift, 70, 14);
        if (sel) { ctx.fillStyle = '#5e4478'; ctx.fillRect(cx + 1, cy + 1 - lift, 70, 1); }
        const ic = icon(CMDS[k][1]); if (ic) ctx.drawImage(ic, cx + 3, cy + 2 - lift);
        drawText(ctx, CMDS[k][0], cx + 18, cy + 4 - lift, sel ? '#fff4d8' : '#c8b8d8', INK);
      }
      // descripción en una cinta
      const ds = CMDS[this.i][2]; const dw = Math.min(232, textWidth(ds) + 12);
      ctx.fillStyle = INK; ctx.fillRect(4, y0 - 12, dw, 12); ctx.fillStyle = 'rgba(33,24,44,.95)'; ctx.fillRect(5, y0 - 11, dw - 2, 10); drawText(ctx, ds, 10, y0 - 9, '#e8d8f0', INK);
      if (Math.abs(b.needle) === 5) {
        const r = b.needle > 0; const s = r ? '¡RAUXA! · pulsa MENÚ' : 'SENY · pulsa MENÚ'; const w = textWidth(s) + 14; const x = 236 - w; const yy = y0 - 26 + Math.round(Math.sin(fr / 6));
        ctx.fillStyle = INK; ctx.fillRect(x - 1, yy - 1, w + 2, 13); ctx.fillStyle = r ? '#a42632' : '#1e6a7a'; ctx.fillRect(x, yy, w, 11); ctx.fillStyle = r ? '#e8604e' : '#5ac8d0'; ctx.fillRect(x, yy, w, 1);
        drawText(ctx, s, x + 7, yy + 2, '#fff8e8', INK);
      }
    },
  });
}

// Tirada de combate (en el panel de abajo, sin tapar la escena). Pulso perfecto = +2.
function broll(label, modv, dc, o = {}) {
  const adv = o.adv || (B.active?.adv ? 1 : 0); if (B.active) B.active.adv = 0;
  return ui.custom({
    t: 0, t2: 0, final: null, face: 1, face2: 1, rot: 0, sq: 1, ringT: o.ringT || 42, pulse: 0,
    update() {
      this.t++;
      if (!this.final) {
        this.rot += 0.4 * (1 - this.t / 60); this.sq = Math.abs(Math.cos(this.t * 0.5)) * 0.6 + 0.4;
        if (this.t % 3 === 0) { this.face = 1 + Math.floor(Math.random() * 20); this.face2 = 1 + Math.floor(Math.random() * 20); sfx('tick'); }
        const r = 30 - (this.t / this.ringT) * 21; const pressed = (input.pressed('A') || input.pressed('B')) && this.t > 5;
        if (pressed || this.t >= this.ringT) {
          const dd = Math.abs(r - 11); this.pulse = pressed ? (dd <= 2.5 ? 2 : dd <= 5.5 ? 1 : 0) : 0;
          const r1 = 1 + Math.floor(Math.random() * 20), r2 = 1 + Math.floor(Math.random() * 20); const roll = adv > 0 ? Math.max(r1, r2) : adv < 0 ? Math.min(r1, r2) : r1;
          this.face = r1; this.face2 = r2; this.kept = roll === r1 ? 0 : 1;
          const total = roll + modv + this.pulse;
          this.final = { roll, total, crit: roll === 20, fumble: roll === 1, ok: roll === 20 || (roll !== 1 && total >= dc), pulse: this.pulse };
          sfx('land'); if (this.pulse === 2) { sfx('pulse'); burst(34, 136, 10, { layer: 'screen', colors: ['#fff4c0', '#fcd456'], speed: 2, life: 18, kind: 'spark' }); if (B.active) { B.active.streak++; } } else if (B.active) B.active.streak = 0;
        }
      } else {
        this.t2++;
        if (this.t2 === 10) { const f = this.final; sfx(f.crit ? 'crit_roll' : f.fumble ? 'fumble' : f.ok ? 'good' : 'bad'); if (f.crit) burst(34, 136, 18, { layer: 'screen', colors: ['#fff070', '#fcd456', '#ffffff'], speed: 2.4, life: 26, kind: 'spark' }); }
        if ((this.t2 > 14 && (input.pressed('A') || input.pressed('B'))) || this.t2 > 46) { this.done = true; this.result = this.final; }
      }
    },
    draw(ctx, fr) {
      const op = prog(this.t, 8, 0, ease.outBack); const y0 = 112 + Math.round((1 - op) * 50);
      panel(ctx, 2, y0, 236, 47, 'dark');
      const f = this.final; const st = !f || this.t2 < 10 ? 'idle' : f.crit ? 'crit' : f.fumble ? 'fum' : f.ok ? 'ok' : 'ko';
      const DC = { idle: ['#3a2a68', '#5a46a0', '#8a76d0'], ok: ['#1e5a34', '#2f8a46', '#62c070'], ko: ['#6a1a24', '#a8303a', '#e0605a'], crit: ['#8a5a10', '#e0a020', '#fff070'], fum: ['#2a1418', '#5a2028', '#8a3a3a'] }[st];
      const cx = 34, cy = y0 + 23;
      const hop = !f ? Math.round(-Math.abs(Math.sin(this.t * 0.35)) * 4) : 0;
      if (adv) { drawD20(ctx, cx - 7, cy + hop, 10, this.rot, this.sq, this.face, f && this.kept !== 0 ? ['#2a1418', '#4a2a30', '#6a4048'] : DC); drawD20(ctx, cx + 9, cy + 3 + hop, 8, -this.rot, this.sq, this.face2, f && this.kept !== 1 ? ['#2a1418', '#4a2a30', '#6a4048'] : DC); }
      else drawD20(ctx, cx, cy + hop, 13, this.rot, this.sq, this.face, DC, INK, st === 'crit' ? 0.7 : 0);
      if (!f) { const r = Math.round(30 - (this.t / this.ringT) * 21); const near = Math.abs(r - 11) <= 2.5; ringPx(ctx, cx, cy, Math.max(2, r), near ? '#fcd456' : alpha('#ffffff', 0.7)); if (near) ringPx(ctx, cx, cy, r + 1, '#f0b030'); }
      drawText(ctx, label, 64, y0 + 6, '#f0b030', INK);
      const ms = (modv >= 0 ? '+' : '') + modv; drawText(ctx, `d20 ${ms}${adv ? (adv > 0 ? ' · ventaja' : ' · desventaja') : ''}`, 64, y0 + 18, '#c8b8d8', INK); drawText(ctx, `CD ${dc}`, 200, y0 + 18, '#f0a0a0', INK);
      if (!f) { if (this.t < 30 && fr % 30 < 20) drawText(ctx, 'A: ¡pulso!', 64, y0 + 31, '#fcd456', INK); }
      else {
        let tx = 64; const parts = [[String(f.roll), '#ffffff'], [` ${ms}`, '#c8b8d8']]; if (f.pulse) parts.push([` +${f.pulse} pulso`, '#fcd456']); parts.push([` = ${f.total}`, f.ok ? '#8ae07a' : '#ff8070']);
        for (const [s, c] of parts) { drawText(ctx, s, tx, y0 + 31, c, INK); tx += textWidth(s) + 1; }
        if (this.t2 >= 10) { const w = f.crit ? '¡CRÍTICO!' : f.fumble ? '¡PIFIA!' : f.ok ? 'ÉXITO' : 'FALLO'; const col = f.crit ? '#fcd456' : f.fumble ? '#e84a4a' : f.ok ? '#6ad070' : '#e86050'; const s = prog(this.t2, 8, 10, ease.outBackBig); if (s > 0.05) drawBig(ctx, w, 236 - bigWidth(w, 2) - 4, y0 + 22 - Math.round((1 - s) * 12), col, INK, 2); }
      }
    },
  });
}

// ───────────── Ataque ─────────────
async function attack(e) {
  const b = B.active; const w = weapon();
  const ac = 10 + e.def + (e.evade ? 5 : 0) + (e.guard ? 2 : 0);
  const bonus = mod(stat('fue')) + Math.floor((w.atk || 0) / 2) + (b.buff ? 2 : 0) + (S.flags.buff_fue === S.day ? 1 : 0) + (b.surprise ? 2 : 0) + (b.streak >= 3 ? 1 : 0);
  tween(b.pl, { ox: 8 }, 10, ease.outQuad);
  const r = await broll('Ataque (FUERZA)', bonus, ac);
  const critRange = (e.kind === 'animal' ? 20 - Math.floor((stat('caz') + stat('nat')) / 6) : 20) - (b.weakSpot ? 3 : 0) - (rauxa() >= 4 ? 1 : 0);
  const crit = r.ok && r.roll >= critRange;
  b.surprise = false; e.guard = 0;
  pushNeedle(1 + (crit ? 1 : 0) + (r.fumble ? 1 : 0));
  // Embestida del jugador
  b.pl.pose = 'attack'; sfx('swing');
  await tween(b.pl, { ox: 62, oy: -26 }, 8, ease.inQuad);
  if (!r.ok) {
    if (e.evade) { popText(enX(), EN0.y - 56, 'Fuera de alcance', { color: '#c8c8d8' }); }
    tween(b.en, { ox: -14 }, 6, ease.outQuad).then(() => tween(b.en, { ox: 0 }, 12, ease.inOutQuad));
    sfx('miss'); popText(enX(), EN0.y - 50, r.fumble ? '¡PIFIA!' : 'Falla', { color: r.fumble ? '#ff7060' : '#c8c8d8' });
    if (r.fumble) { S.player.hp = Math.max(1, S.player.hp - 2); b.pl.flash = 8; popText(plX(), PL0.y - 60, '-2', { color: '#ff7060', big: true }); }
    await tween(b.pl, { ox: 0, oy: 0 }, 14, ease.outCubic); b.pl.pose = 'idle'; addXP(1); e.evade = 0;
    return null;
  }
  e.evade = 0;
  let dmg = d(1, 6) + Math.max(0, mod(stat('fue'))) + (w.atk || 1) + (S.flags.buff_fue === S.day ? 2 : 0) + (rauxa() >= 2 ? 1 : 0) + (rauxa() >= 4 ? 1 : 0) - (seny() >= 3 ? 1 : 0);
  if (crit) dmg *= 2; if (e.venomBlade) dmg += d(1, 6);
  if (S.flags.poisonBlade && !e.poison) { e.poison = true; S.flags.poisonBlade = false; }
  await hitEnemy(e, Math.max(1, dmg), { crit, fx: crit ? 'slash2' : 'slash' });
  if (crit) await say(e.kind === 'animal' && critRange < 20 ? `¡Crítico! Sabes dónde golpear a un ${e.name.toLowerCase()}.` : '¡CRÍTICO!', { auto: 50 });
  await tween(b.pl, { ox: 0, oy: 0 }, 14, ease.outCubic); b.pl.pose = 'idle';
  addXP(2);
  return null;
}
// Golpe al rival: congelación, destello, retroceso, número de daño y barra que se vacía con retraso
async function hitEnemy(e, dmg, o = {}) {
  const b = B.active;
  e.hp -= dmg; b.en.flash = o.crit ? 12 : 8; b.en.pose = 'hurt'; b.en.hurt = 18;
  sfx(o.crit ? 'crit' : dmg >= 10 ? 'hit2' : 'hit'); freeze(o.crit ? 9 : 5); shake(o.crit ? 0.65 : 0.32);
  if (o.crit) { flash('#ffffff', 0.7, 10); b.zoom = 1.08; tween(b, { zoom: 1 }, 18, ease.outCubic); }
  burstAt(enX(), EN0.y - 26, o.fx || 'impact');
  burst(enX(), EN0.y - 26, o.crit ? 16 : 8, { layer: 'screen', colors: o.color ? [o.color, '#ffffff'] : ['#ffffff', '#fff0a0', '#f0b030'], speed: o.crit ? 3 : 2, life: 20, kind: 'spark' });
  popText(enX(), EN0.y - 58, String(dmg), { color: o.color || (o.crit ? '#fcd456' : '#ffffff'), big: true, vy: -2.2, life: 54 });
  tween(b.en, { ox: 10 }, 5, ease.outQuad).then(() => tween(b.en, { ox: 0 }, 14, ease.outCubic));
  await wait(o.silent ? 14 : 22);
}
function burstAt(x, y, kind) { const b = B.active; if (!b) return; (b.fxs ||= []).push({ kind, x, y, t: 0, dur: BA?.FX_FRAMES?.[kind] || { slash: 18, slash2: 24, claw: 18, bite: 18, impact: 16, fire: 30, frost: 30, bolt: 26, heal: 36, holy: 40, calm: 46, smoke: 40, poison: 28, dust: 20, charge: 30, shield: 22, counter: 20, dark: 34, roar: 30, coins: 30 }[kind] || 24, dir: x > 120 ? 1 : -1 }); }

// ───────────── Conjuros ─────────────
async function cast(e) {
  const b = B.active; const p = S.player; const list = (p.spells || []).filter((s) => SPELLS[s]);
  if (!list.length) { await say('No conoces ningún conjuro.', { auto: 70 }); return false; }
  const i = await ui.choose([...list.map((s) => ({ label: SPELLS[s].name, right: `${SPELLS[s].mp} PM`, hint: SPELLS[s].desc, disabled: p.mp < SPELLS[s].mp, icon: ICO?.spellIcon?.(s) })), 'Volver'], { cancel: list.length, style: 'dark', x: 116, y: Math.max(4, 104 - (list.length + 1) * 12 - 10) });
  if (i === list.length) return false;
  const id = list[i]; const sp = SPELLS[id]; p.mp -= sp.mp;
  const mag = weapon().mag || 0;
  b.pl.pose = 'cast'; sfx('charge'); burstAt(plX(), PL0.y - 40, 'charge'); await wait(26);
  if (sp.kind === 'cura') { const h = d(...sp.dice) + mod(stat('esp')) + mag; p.hp = Math.min(p.hpMax, p.hp + h); sfx('heal'); burstAt(plX(), PL0.y - 30, 'heal'); popText(plX(), PL0.y - 64, `+${h}`, { color: '#8ae07a', big: true }); pushNeedle(-1); await wait(36); b.pl.pose = 'idle'; return null; }
  if (sp.kind === 'buff') { b.buff = 1; sfx('holy'); burstAt(plX(), PL0.y - 30, 'holy'); pushNeedle(-1); await say('Una luz dorada te envuelve: +2 a tus ataques.', { auto: 70 }); b.pl.pose = 'idle'; return null; }
  if (sp.kind === 'calmar') { b.pl.pose = 'idle'; const r = await calm(e, 3); return r; }
  const r = await broll(`${sp.name} (INT + ARCANO)`, mod(stat('int')) + mod(stat('arc')) + mag + (seny() >= 2 ? 1 : 0) + (seny() >= 4 ? 1 : 0), 10 + e.esp);
  pushNeedle(1);
  const kind = sp.elem === 'fuego' ? 'fire' : sp.elem === 'frio' ? 'frost' : 'bolt';
  sfx(kind === 'fire' ? 'fire' : kind === 'frost' ? 'ice' : 'thunder');
  if (kind === 'bolt') flash('#c8e0ff', 0.6, 12);
  if (!r.ok) { burstAt(enX() + 30, EN0.y - 20, 'dust'); popText(enX(), EN0.y - 50, 'Se deshace en el aire', { color: '#c8c8d8' }); await wait(30); b.pl.pose = 'idle'; return null; }
  let dmg = d(...sp.dice) + Math.max(0, mod(stat('int'))) + mag; if (r.crit) dmg *= 2;
  let weakTxt = '';
  if (e.weak === 'fuego' && sp.elem === 'fuego') { dmg = Math.round(dmg * 1.6); weakTxt = '¡Le teme al fuego!'; }
  else if (e.weak === 'frio' && sp.elem === 'frio') { dmg = Math.round(dmg * 1.5); weakTxt = '¡El frío le duele!'; }
  else if (e.fae && sp.elem === 'fuego') dmg = Math.round(dmg * 0.7);
  if (sp.elem === 'frio') { e.slow = 2; }
  await hitEnemy(e, Math.max(1, dmg), { crit: r.crit, fx: kind, color: kind === 'frost' ? '#a8e8ff' : kind === 'bolt' ? '#c8e0ff' : '#ffb060' });
  if (weakTxt) await say(weakTxt, { auto: 60 });
  if (sp.elem === 'frio') popText(enX(), EN0.y - 70, 'lento', { color: '#a8e8ff' });
  b.pl.pose = 'idle'; addXP(3);
  return null;
}

// ───────────── Objetos ─────────────
async function useItem(e) {
  const b = B.active; const p = S.player; const inv = Object.keys(S.inv).filter((k) => ITEMS[k] && (ITEMS[k].heal || ITEMS[k].mp || ITEMS[k].battle || ITEMS[k].cure));
  if (!inv.length) { await say('No llevas nada útil.', { auto: 60 }); return false; }
  const i = await ui.choose([...inv.map((k) => ({ label: ITEMS[k].name, right: `×${S.inv[k]}`, hint: ITEMS[k].desc, icon: ICO?.itemIcon?.(k) })), 'Volver'], { cancel: inv.length, max: 6, style: 'dark', x: 100, y: 8 });
  if (i === inv.length) return false;
  const k = inv[i]; const it = ITEMS[k]; addItem(k, -1);
  // el objeto vuela del jugador a su destino
  const ic = ICO?.itemIcon?.(k);
  if (ic) { const target = it.battle ? [enX(), EN0.y - 30] : [plX(), PL0.y - 40]; const o = { x: plX(), y: PL0.y - 50 }; spawn({ x: o.x, y: o.y, vx: (target[0] - o.x) / 24, vy: (target[1] - o.y) / 24 - 1.2, ay: 0.1, life: 24, kind: 'sprite', img: ic, layer: 'screen', fade: false }); sfx('whoosh'); await wait(24); }
  if (it.battle === 'dormir') { e.sleep = 3; sfx('magic'); burstAt(enX(), EN0.y - 30, 'smoke'); await say(`El humo envuelve a ${e.name}. Se duerme.`, { auto: 70 }); return null; }
  if (it.battle === 'veneno_arma') { e.poison = true; S.flags.poisonBlade = false; burstAt(plX(), PL0.y - 40, 'poison'); await say('Untas el filo con veneno.', { auto: 60 }); return null; }
  if (k === 'agua_bendita' && e.fae) { const dd = d(3, 6) + (e.weak === 'santo' ? 6 : 0); await hitEnemy(e, dd, { fx: 'holy', color: '#fff4c0' }); return null; }
  if (it.heal) { p.hp = Math.max(1, Math.min(p.hpMax, p.hp + it.heal)); sfx(it.heal > 0 ? 'heal' : 'bad'); burstAt(plX(), PL0.y - 30, 'heal'); popText(plX(), PL0.y - 64, `${it.heal > 0 ? '+' : ''}${it.heal}`, { color: it.heal > 0 ? '#8ae07a' : '#ff7060', big: true }); }
  if (it.mp) { p.mp = Math.min(p.mpMax, p.mp + it.mp); popText(plX() + 14, PL0.y - 54, `+${it.mp} PM`, { color: '#9ac8ff' }); }
  if (it.cure) S.ailments = S.ailments.filter((a) => a !== it.cure);
  await wait(30); return null;
}

// ───────────── Acciones de folclore ─────────────
const FOOD = { veg: ['bellota', 'col', 'trigo', 'alcachofa', 'uva', 'aceitunas', 'pan', 'castanas', 'miel', 'pinones'], meat: ['carne', 'pescado', 'sardina', 'trucha', 'barbo', 'huevo'] };
function actionList(e) {
  const o = [];
  if (e.kind === 'animal') {
    const s = SP[e.sp]; const meat = Array.isArray(s.diet); const food = Object.keys(S.inv).find((k) => (meat ? FOOD.meat : FOOD.veg).includes(k));
    o.push({ id: 'calmar', label: 'Calmar', hint: 'NATURALEZA + CARISMA. Si se calma, se acaba el combate (y quizá se venga contigo).' });
    o.push({ id: 'ofrecer', label: food ? `Ofrecer ${ITEMS[food].name.toLowerCase()}` : 'Ofrecer comida', hint: food ? 'Con algo de comer en la mano, calmarlo es mucho más fácil.' : 'No llevas nada que le apetezca.', disabled: !food, food });
    o.push({ id: 'observar', label: 'Observar', hint: 'NATURALEZA. Lees sus intenciones y su punto débil (crítico más fácil).' });
    o.push({ id: 'espantar', label: 'Espantar', hint: 'FUERZA + CARISMA. Que se vaya sin más; no hay botín.' });
  } else if (e.kind === 'npc') {
    o.push({ id: 'calmar', label: 'Calmar los ánimos', hint: 'CARISMA. Acabar la pelea sin más golpes.' });
    o.push({ id: 'burla', label: 'Burlarse', hint: 'CARISMA. Si le enfadas, golpea más fuerte pero se cubre peor.' });
    o.push({ id: 'rendirse', label: 'Rendirte', hint: 'Se acaba la pelea. Tu orgullo, en cambio...' });
  } else if (e.id === 'bandido') {
    o.push({ id: 'negociar', label: 'Negociar', hint: 'CARISMA. Unas monedas a cambio de tu pellejo.' });
    o.push({ id: 'amenazar', label: 'Amenazar', hint: 'FUERZA. A ver quién tiene más miedo.' });
    const met = S.npc.perot?.met; o.push({ id: 'perot', label: 'Nombrar a Perot', hint: met ? 'Conoces a Perot Rocaguinarda. Los bandoleros le respetan.' : 'Aún no conoces a Perot Rocaguinarda.', disabled: !met });
    o.push({ id: 'observar', label: 'Estudiarle', hint: 'HISTORIA. Lees sus intenciones.' });
  } else {
    o.push({ id: 'conjurar', label: 'Conjurar', hint: 'ARCANO + ESPÍRITU. Las palabras antiguas lo devuelven a la niebla.' });
    o.push({ id: 'rezar', label: 'Rezar', hint: 'ESPÍRITU. La fe ahuyenta lo que no es de este mundo.' });
    if (e.id === 'follet') { o.push({ id: 'tarea', label: 'Encargarle una tarea', hint: 'ARCANO. Los follets no saben estarse quietos: dale trabajo.' }); o.push({ id: 'cinta', label: 'Ofrecer una cinta', hint: hasItem('cinta') ? 'Dicen que les chiflan las cintas de colores.' : 'No llevas ninguna cinta.', disabled: !hasItem('cinta') }); }
    if (e.id === 'drac') o.push({ id: 'jordi', label: 'Plegaria a Sant Jordi', hint: hasItem('rosa') ? 'ESPÍRITU. Llevas una rosa: Sant Jordi escucha.' : 'ESPÍRITU. Sin una rosa, Sant Jordi anda distraído.' });
    o.push({ id: 'observar', label: 'Recordar las rondallas', hint: 'ARCANO. ¿Qué cuentan de esta criatura? Lees sus intenciones y su punto débil.' });
  }
  return o;
}
async function actions(e) {
  const b = B.active; const list = actionList(e);
  const i = await ui.choose([...list.map((o) => ({ label: o.label, hint: o.hint, disabled: o.disabled, icon: icon(o.id === 'observar' ? 'saber' : 'accion') })), 'Volver'], { cancel: list.length, style: 'dark', x: 92, y: Math.max(4, 104 - (list.length + 1) * 12 - 10) });
  if (i === list.length) return false;
  const a = list[i]; pushNeedle(-1);
  const sb = (seny() >= 2 ? 1 : 0) + (seny() >= 4 ? 1 : 0);
  switch (a.id) {
    case 'calmar': return calm(e, sb);
    case 'ofrecer': { addItem(a.food, -1); const ic = ICO?.itemIcon?.(a.food); if (ic) { spawn({ x: plX(), y: PL0.y - 50, vx: (enX() - plX()) / 26, vy: (EN0.y - 30 - PL0.y + 50) / 26 - 1.2, ay: 0.1, life: 26, kind: 'sprite', img: ic, layer: 'screen', fade: false }); await wait(26); } sfx('charm'); burstAt(enX(), EN0.y - 30, 'calm'); return calm(e, sb + 6); }
    case 'observar': {
      const r = await broll(e.kind === 'animal' ? 'Observar (NATURALEZA)' : e.fae ? 'Rondallas (ARCANO)' : 'Estudiar (HISTORIA)', mod(stat(e.kind === 'animal' ? 'nat' : e.fae ? 'arc' : 'his')) + sb, 9);
      if (r.ok) { b.reveal = true; b.weakSpot = true; sfx('learn'); await say(weakText(e), { auto: 110 }); } else await say('No sacas nada en claro.', { auto: 60 });
      return null;
    }
    case 'espantar': {
      const s = SP[e.sp]; const r = await broll('Espantar (FUERZA + CARISMA)', mod(stat('fue')) + mod(stat('car')) + sb, 9 + (s.size || 0) * 3 + (s.beh === 'caza' ? 3 : 0));
      if (r.ok) { sfx('roar'); burstAt(enX(), EN0.y - 30, 'roar'); await tween(b.en, { ox: 160 }, 22, ease.inQuad); await say(`${e.name} se da la vuelta y se pierde de vista.`, { auto: 70 }); if (e.ent) e.ent.gone = true; return 'scared'; }
      await say(`${e.name} no se deja impresionar.`, { auto: 60 }); return null;
    }
    case 'burla': { const r = await broll('Burlarse (CARISMA)', mod(stat('car')) + sb, 11); if (r.ok) { e.atk += 1; e.def = Math.max(0, e.def - 2); burstAt(enX(), EN0.y - 40, 'roar'); await say(`${e.name} se pone rojo de rabia. Pega más, pero se descubre.`, { auto: 80 }); } else await say('No le hace ni gracia.', { auto: 60 }); return null; }
    case 'rendirse': { await say('Levantas las manos. «Vale, vale, tú ganas.»', { auto: 70 }); S.rep.ciudad -= 1; return 'calm'; }
    case 'negociar': return calm(e, sb);
    case 'amenazar': { const r = await broll('Amenazar (FUERZA)', mod(stat('fue')) + sb, 13); if (r.ok) { sfx('roar'); await tween(b.en, { ox: 160 }, 22, ease.inQuad); await say('El bandolero se lo piensa mejor y sale corriendo.', { auto: 70 }); return 'scared'; } await say('«¡Ja! ¿Me amenazas tú a mí?»', { auto: 60 }); return null; }
    case 'perot': { const rel = S.npc.perot?.rel || 0; const r = rel >= 40 ? { ok: true } : await broll('Nombrar a Perot (CARISMA)', mod(stat('car')) + sb, 10); if (r.ok) { S.flags.perotFriend = true; await say('«¿Amigo de Perot? Haberlo dicho antes.» Te devuelve el saludo y desaparece entre los árboles.', { auto: 110 }); return 'calm'; } await say('«Perot no tiene amigos como tú.»', { auto: 60 }); return null; }
    case 'conjurar': return calm(e, sb);
    case 'rezar': { const r = await broll('Rezar (ESPÍRITU)', mod(stat('esp')) + sb + (S.rep.seu >= 10 || S.rep.mar >= 10 ? 2 : 0), e.boss ? 18 : 13); sfx('holy'); burstAt(plX(), PL0.y - 30, 'holy'); if (r.ok) { const dd = d(2, 6) + mod(stat('esp')) + (e.weak === 'santo' ? 6 : 0); await hitEnemy(e, Math.max(2, dd), { fx: 'holy', color: '#fff4c0' }); if (!e.boss && e.hp <= e.hpMax / 3) { await say(`${e.name} retrocede ante la luz y se desvanece.`, { auto: 80 }); return 'calm'; } } else await say('Las palabras se te traban.', { auto: 60 }); return null; }
    case 'tarea': { const r = await broll('Encargarle una tarea (ARCANO)', mod(stat('arc')) + sb, 11); if (r.ok) { await say('Le pides que cuente los granos de mijo de un saco. Se pone a contarlos con mucha seriedad... y se olvida de ti.', { auto: 120 }); return 'calm'; } await say('«¡Ja! ¡Ni hablar!» Se ríe y te tira de la oreja.', { auto: 70 }); return null; }
    case 'cinta': { addItem('cinta', -1); sfx('charm'); burstAt(enX(), EN0.y - 30, 'calm'); await say('El follet se ata la cinta a la gorra, encantado. Te hace una reverencia y se esfuma.', { auto: 100 }); S.flags.folletFriend = 1; return 'calm'; }
    case 'jordi': { const rose = hasItem('rosa'); const r = await broll('Plegaria a Sant Jordi (ESPÍRITU)', mod(stat('esp')) + sb + (rose ? 5 : 0), 15); if (r.ok) { flash('#fff0d0', 0.8, 16); sfx('holy'); burstAt(enX(), EN0.y - 30, 'holy'); const dd = d(4, 8) + (rose ? 10 : 0); await say(rose ? 'La rosa se enciende de luz roja. Por un instante, ves una lanza que baja del cielo.' : 'Una luz pálida cae sobre el drac.', { auto: 100 }); await hitEnemy(e, dd, { fx: 'holy', crit: rose, color: '#ff8a8a' }); if (rose) addItem('rosa', -1); } else await say('El cielo calla.', { auto: 60 }); return null; }
  }
  return null;
}
function weakText(e) {
  if (e.kind === 'animal') { const s = SP[e.sp]; const t = { embiste: 'Cuando escarba, va a embestir: guárdate o párale a tiempo.', caza: 'Cuando se agazapa, prepara la dentellada.', huye: 'Busca la salida: no le quites ojo.', pica: 'Pica rápido, sin aviso: atento.', ignora: 'Si se encoge, golpea flojo.' }[s.beh] || 'Lees su cuerpo.'; return `${e.name}: ${t} Ahora ves por dónde golpear.`; }
  if (e.id === 'bandido') return 'Los bandoleros amagan antes de la puñalada. No pares al primer gesto.';
  if (e.id === 'quarantamaula') return '«La Quarantamaula no soporta la luz.» El fuego le hace mucho daño.';
  if (e.id === 'simiot') return '«Al simiot lo echaron con reliquias y agua bendita.»';
  if (e.id === 'follet') return '«Al follet hay que darle faena, o se aburre y te la lía.»';
  if (e.id === 'drac') return '«Sant Jordi venció al drac con una lanza y una rosa.» Y el frío le entumece.';
  return 'Lees sus intenciones.';
}
async function calm(e, bonus = 0) {
  const b = B.active;
  if (e.kind === 'animal') {
    const s = SP[e.sp]; const dc = 8 + (s.size || 0) * 3 + (s.beh === 'caza' || s.beh === 'embiste' ? 3 : 0) + (e.hp < e.hpMax / 2 ? -2 : 0);
    const r = await broll('Calmar (NAT + CAR)', mod(stat('nat')) + mod(stat('car')) + bonus, dc);
    if (r.ok) { sfx('charm'); burstAt(enX(), EN0.y - 30, 'calm'); await say(`${e.name} se tranquiliza y te mira con curiosidad.`, { auto: 80 }); return 'calm'; }
    await say(`${e.name} no se fía de ti.`, { auto: 60 }); return null;
  }
  if (e.kind === 'npc') {
    const r = await broll('Calmar los ánimos (CARISMA)', mod(stat('car')) + bonus, 13);
    if (r.ok) { burstAt(enX(), EN0.y - 30, 'calm'); await say(`${e.name} baja los puños. «Está bien, está bien...»`, { auto: 80 }); return 'calm'; }
    await say('«¡No me vengas con palabritas!»', { auto: 60 }); return null;
  }
  if (e.fae) {
    const r = await broll('Conjurar (ARCANO + ESPÍRITU)', mod(stat('arc')) + mod(stat('esp')) + bonus, e.boss ? 20 : 14);
    if (r.ok) { sfx('magic'); burstAt(enX(), EN0.y - 30, 'dark'); await say(`Pronuncias las palabras antiguas. ${e.name} se desvanece entre la niebla.`, { auto: 90 }); return 'calm'; }
    await say('Las palabras no surten efecto.', { auto: 60 }); return null;
  }
  const r = await broll('Negociar (CARISMA)', mod(stat('car')) + bonus, 14);
  if (r.ok) { const n = Math.min(S.money, 10); S.money -= n; sfx('coin'); await say(`Le das ${n} dineros y te deja en paz.`, { auto: 80 }); return 'calm'; }
  await say('«¡La bolsa o la vida!»', { auto: 60 }); return null;
}

// ───────────── Golpes especiales: ¡RAUXA! y SENY ─────────────
async function special(e) {
  const b = B.active;
  if (b.needle >= 5) {
    // Ráfaga de tres golpes al ritmo: pulsa A cuando el marcador cruce el centro
    flash('#ff6040', 0.5, 14); sfx('rauxa'); await say('¡RAUXA! La sangre te hierve.', { auto: 50 });
    let total = 0;
    for (let k = 0; k < 3; k++) {
      const q = await rhythm(k);
      b.pl.pose = 'attack'; sfx('swing'); await tween(b.pl, { ox: 60 + k * 4, oy: -24 }, 5, ease.inQuad);
      let dmg = d(1, 6) + Math.max(0, mod(stat('fue'))) + (weapon().atk || 1) + (q === 2 ? 4 : q === 1 ? 1 : -2);
      dmg = Math.max(1, dmg); total += dmg;
      await hitEnemy(e, dmg, { crit: q === 2, fx: k === 2 ? 'slash2' : 'slash' });
      await tween(b.pl, { ox: 20, oy: -6 }, 6, ease.outQuad);
      if (e.hp <= 0) break;
    }
    await tween(b.pl, { ox: 0, oy: 0 }, 12, ease.outCubic); b.pl.pose = 'idle';
    b.needle = 0; addXP(6); return null;
  }
  // SENY: calma lúcida. Curación, ves todo lo que piensa el rival y la próxima tirada va con ventaja.
  flash('#7ae0e0', 0.45, 18); sfx('seny'); burstAt(plX(), PL0.y - 30, 'holy');
  const h = d(1, 8) + Math.max(1, mod(stat('esp'))) + 2; S.player.hp = Math.min(S.player.hpMax, S.player.hp + h);
  popText(plX(), PL0.y - 64, `+${h}`, { color: '#8ae07a', big: true });
  b.reveal = true; b.adv = 1; b.guard = 1; b.needle = 0;
  await say('SENY. Respiras hondo y lo ves todo claro: sus intenciones, tus opciones. (Ventaja en la próxima tirada.)', { auto: 120 });
  return null;
}
// Marcador que barre una barra: centro = perfecto. Devuelve 0, 1 o 2.
function rhythm(k) {
  return ui.custom({
    t: 0, speed: 3.2 + k * 0.9, res: null, hold: 0,
    update() {
      this.t++; if (this.res !== null) { if (++this.hold > 10) { this.done = true; this.result = this.res; } return; }
      const x = this.pos(); if ((input.pressed('A') || input.pressed('B')) && this.t > 3) { const dd = Math.abs(x - 120); this.res = dd <= 6 ? 2 : dd <= 18 ? 1 : 0; sfx(this.res === 2 ? 'perfect' : this.res ? 'block' : 'early'); if (this.res === 2) burst(x, 135, 12, { layer: 'screen', colors: ['#fff070', '#ff7050'], speed: 2.4, life: 20, kind: 'spark' }); }
      if (this.t > 200 / this.speed * 2.4) { this.res = 0; }
    },
    pos() { const span = 200; const p = (this.t * this.speed) % (span * 2); return 20 + (p < span ? p : span * 2 - p); },
    draw(ctx, fr) {
      panel(ctx, 2, 112, 236, 47, 'dark');
      drawText(ctx, `Golpe ${k + 1} de 3`, 10, 118, '#ff9070', INK);
      ctx.fillStyle = INK; ctx.fillRect(18, 132, 204, 10); ctx.fillStyle = '#3a1a2a'; ctx.fillRect(19, 133, 202, 8);
      ctx.fillStyle = '#7c2a2a'; ctx.fillRect(102, 133, 36, 8); ctx.fillStyle = '#e8604e'; ctx.fillRect(114, 133, 12, 8); ctx.fillStyle = '#fcd456'; ctx.fillRect(118, 133, 4, 8);
      const x = Math.round(this.res !== null ? this.frozen ?? (this.frozen = this.pos()) : this.pos());
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, 129, 3, 16); ctx.fillStyle = INK; ctx.fillRect(x - 2, 128, 1, 18); ctx.fillRect(x + 2, 128, 1, 18);
      if (this.res !== null) { const w = ['Flojo', 'Bien', '¡Perfecto!'][this.res]; drawOutlined(ctx, w, 120 - textWidth(w) / 2, 147, ['#c8c8d8', '#f0d080', '#fcd456'][this.res], INK); }
    },
  });
}

// ───────────── Huir ─────────────
async function flee(e) {
  const b = B.active;
  if (e.boss) { await say('¡No hay escapatoria!', { auto: 60 }); return null; }
  const r = await broll('Huir (FUERZA + NATURALEZA)', mod(stat('fue')) + mod(stat('nat')), e.kind === 'animal' && SP[e.sp]?.beh === 'caza' ? 13 : 9);
  if (r.ok) { sfx('flee'); b.pl.pose = 'idle'; await tween(b.pl, { ox: -160 }, 24, ease.inQuad); await say('¡Pones tierra de por medio!', { auto: 60 }); return 'flee'; }
  sfx('no'); await tween(b.pl, { ox: -20 }, 8, ease.outQuad); await tween(b.pl, { ox: 0 }, 10, ease.outQuad); await say('¡No consigues escapar!', { auto: 60 }); return null;
}

// ───────────── Turno del rival ─────────────
async function enemyTurn(e) {
  const b = B.active; const p = S.player;
  const id = b.intent || chooseMove(e); const mv = MV[id]; b.intent = null;
  if (e.shadow > 0) e.shadow--;
  let res = null;
  switch (mv.kind) {
    case 'attack': case 'tangle': res = await enemyAttack(e, mv); break;
    case 'charge': e.charged = mv.next; sfx('charge'); burstAt(enX(), EN0.y - 30, 'charge'); b.en.pose = 'attack'; await say(`${e.name} ${mv.say}...`, { auto: 70 }); b.en.pose = 'idle'; break;
    case 'guard': e.guard = 1; sfx('block'); burstAt(enX(), EN0.y - 30, 'shield'); await say(`${e.name} ${mv.say}.`, { auto: 60 }); break;
    case 'evade': e.evade = 1; sfx('whoosh'); await tween(b.en, { oy: -26 }, 14, ease.outQuad); await say(`${e.name} ${mv.say}.`, { auto: 60 }); tween(b.en, { oy: -8 }, 20, ease.inOutQuad); break;
    case 'taunt': sfx(mv.sfx || 'growl'); burstAt(enX(), EN0.y - 30, 'roar'); shake(0.3); pushNeedle(2); await say(`${e.name} ${mv.say}. ¡Te saca de quicio! (+2 rauxa)`, { auto: 80 }); break;
    case 'shadow': e.shadow = 2; sfx('magic'); burstAt(enX(), EN0.y - 30, 'dark'); await say(`${e.name} ${mv.say}. Ya no adivinas qué hará.`, { auto: 70 }); break;
    case 'heal': { const h = 5 + d(1, 4); e.hp = Math.min(e.hpMax, e.hp + h); sfx('heal'); burstAt(enX(), EN0.y - 30, 'heal'); popText(enX(), EN0.y - 58, `+${h}`, { color: '#8ae07a', big: true }); await say(`${e.name} ${mv.say}.`, { auto: 60 }); break; }
    case 'flee': {
      if (e.kind === 'animal' || e.kind === 'monster') {
        const r = await broll('Cortarle el paso (CAZA Y PESCA)', mod(stat('caz')), 11);
        if (!r.ok) { sfx('flee'); await tween(b.en, { ox: 170 }, 20, ease.inQuad); await say(`¡${e.name} se escabulle!`, { auto: 60 }); if (e.ent) e.ent.gone = true; res = 'escaped'; }
        else await say(`${e.name} intenta huir, pero le cortas el paso.`, { auto: 60 });
      }
      break;
    }
    case 'surrender': await say(`${e.name} levanta las manos. «¡Basta, basta! Tú ganas.»`, { auto: 80 }); e.hp = 0; res = 'win'; break;
  }
  if (e.evade && mv.kind !== 'evade') e.evade = 0;
  if (e.slow > 0) e.slow--;
  b.guard = 0;
  if (!res && p.hp <= 0) res = 'lose';
  if (!res) b.intent = chooseMove(e);
  return res;
}

// Ataque del rival con ventana de parada. Línea de tiempo por fotogramas: preparación (con amago), embestida,
// impacto en T, recuperación. Pulsar A o B: muy pronto → precipitado; ventana → bloqueo; justo → ¡parada!
function enemyAttack(e, mv) {
  const b = B.active; const p = S.player;
  const W0 = Math.round(mv.windup * (e.slow ? 1.35 : 1)); const feint = mv.feint && Math.random() < 0.7;
  const FE = feint ? Math.round(W0 * 0.45) : 0; // el amago añade una pausa engañosa
  const T0 = W0 + FE + 7; // impacto
  const win = 6 + Math.max(0, mod(stat('def'))) + (b.guard ? 5 : 0) + (seny() >= 2 ? 2 : 0) - Math.floor(rauxa() / 2);
  const perf = 3 + (stat('def') >= 6 ? 1 : 0) + (b.guard ? 1 : 0);
  tween(b, { cam: -16 }, 14, ease.inOutQuad);
  return ui.custom({
    t: 0, press: null, res: null, kind: 'eatk',
    update() {
      const t = ++this.t;
      // animación del rival
      if (t <= W0) { const k = t / W0; b.en.ox = 10 * ease.outQuad(Math.min(1, k * 1.3)); b.en.oy = -3 * k; b.en.pose = k > 0.6 ? 'attack' : 'idle'; if (t === W0 - 10) { b.gleam = 10; sfx('alert'); } }
      else if (t <= W0 + FE) { const k = (t - W0) / Math.max(1, FE); b.en.ox = 10 - 26 * Math.sin(k * Math.PI) ; if (t === W0 + 2) sfx('swing'); }
      else if (t <= T0) { const k = (t - W0 - FE) / 7; b.en.ox = 10 - 100 * ease.inQuad(k); b.en.oy = 46 * ease.inQuad(k); }
      // entrada del jugador
      if (this.press === null && (input.pressed('A') || input.pressed('B')) && t > 2) {
        this.press = t;
        if (t < T0 - win - 2) { this.early = true; sfx('early'); popText(plX(), PL0.y - 70, '¡Precipitado!', { color: '#ff9070' }); b.pl.pose = 'cast'; }
        else { b.pl.pose = 'cast'; sfx('swing'); }
      }
      if (t === T0) this.resolve();
      if (t > T0 && t <= T0 + 14) { b.en.ox = -90 + (t - T0) * 1.5; }
      if (t > T0 + 14) { const k = Math.min(1, (t - T0 - 14) / 16); b.en.ox = (-69) * (1 - ease.outCubic(k)); b.en.oy = 46 * (1 - ease.outCubic(k)); }
      if (t >= T0 + 32) { b.en.ox = 0; b.en.oy = 0; b.en.pose = 'idle'; if (b.pl.pose !== 'hurt' || t > T0 + 40) b.pl.pose = 'idle'; if (t >= T0 + 40) { this.done = true; this.result = this.res; tween(b, { cam: 0 }, 16, ease.inOutQuad); } }
    },
    resolve() {
      const pr = this.press; let par = 'none';
      if (pr !== null && !this.early) { const dt = T0 - pr; if (dt >= -1 && dt <= perf) par = 'perfect'; else if (dt >= -2 && dt <= win) par = 'block'; }
      if (par === 'perfect' && mv.noPerfect) par = 'block';
      // ¿acierta? d20 + ataque contra tu defensa
      const ac = 10 + mod(stat('def')) + armor() + (seny() >= 4 ? 1 : 0) - (rauxa() >= 3 ? 1 : 0);
      const r = 1 + Math.floor(Math.random() * 20); const hit = r === 20 || (r !== 1 && r + e.atk >= ac);
      if (par === 'perfect') {
        this.res = { par }; freeze(7); flash('#fff4c0', 0.5, 8); sfx('perfect'); shake(0.25); burstAt(plX() + 18, PL0.y - 40, 'shield');
        popText(plX(), PL0.y - 74, '¡PARADA!', { color: '#fcd456', big: true, life: 50 }); pushNeedle(-1); b.streak++;
        // contraataque
        const c = d(1, 4) + Math.max(0, mod(stat('fue'))); setTimeout(() => { if (B.active) { e.hp -= c; b.en.flash = 8; sfx('counter'); burstAt(enX(), EN0.y - 30, 'counter'); popText(enX(), EN0.y - 58, String(c), { color: '#fcd456', big: true }); } }, 120);
        return;
      }
      if (!hit && par !== 'block') { this.res = { par: 'miss' }; sfx('dodge'); popText(plX(), PL0.y - 70, 'Esquivas', { color: '#c8e0ff' }); tween(b.pl, { ox: -16 }, 6, ease.outQuad).then(() => tween(b.pl, { ox: 0 }, 12, ease.inOutQuad)); return; }
      let dmg = Math.round((d(1, 6) + Math.floor(e.atk / 2) + (r === 20 ? d(1, 6) : 0)) * (mv.pow || 1));
      const red = e.fae ? mod(stat('esp')) : Math.floor(armor() / 2); dmg = Math.max(1, dmg - Math.max(0, red) + (rauxa() >= 3 ? 1 : 0) - (seny() >= 4 ? 1 : 0));
      if (par === 'block') { dmg = Math.max(1, Math.ceil(dmg / 2)); if (b.guard) dmg = Math.max(1, Math.floor(dmg * 0.7)); sfx('block'); burstAt(plX() + 16, PL0.y - 40, 'shield'); popText(plX(), PL0.y - 82, 'Bloqueo', { color: '#9ac8ff' }); }
      else { if (b.guard) dmg = Math.max(1, Math.ceil(dmg / 2)); sfx(dmg >= 9 ? 'hit2' : 'hit'); pushNeedle(1); b.streak = 0; }
      p.hp -= dmg; b.pl.flash = 10; b.pl.pose = 'hurt'; freeze(par === 'block' ? 3 : 6); shake(par === 'block' ? 0.2 : r === 20 ? 0.6 : 0.4);
      if (par !== 'block') flash('#ff3030', 0.25, 10);
      burstAt(plX() + 6, PL0.y - 40, mv.fx || 'impact');
      popText(plX(), PL0.y - 66, String(dmg), { color: '#ff6a5a', big: true, vy: -2 });
      if (r === 20) popText(plX(), PL0.y - 86, '¡Crítico!', { color: '#ff9070' });
      tween(b.pl, { ox: -10 }, 5, ease.outQuad).then(() => tween(b.pl, { ox: 0 }, 14, ease.outCubic));
      if (mv.steal && S.money > 0) { const n = Math.min(S.money, 4 + d(2, 6)); S.money -= n; sfx('steal'); burstAt(plX(), PL0.y - 40, 'coins'); popText(plX() + 20, PL0.y - 52, `-${n} d.`, { color: '#fcd456' }); }
      if (mv.push) pushNeedle(mv.push);
      if (mv.kind === 'tangle' && par === 'none') { b.tangled = 1; popText(plX(), PL0.y - 86, '¡Enredado!', { color: '#c8e070' }); }
      if (mv.poison && Math.random() < mv.poison && !S.ailments.includes('veneno')) { S.ailments.push('veneno'); popText(plX() + 10, PL0.y - 90, 'Envenenado', { color: '#8ae07a' }); }
      if (e.kind === 'animal' && SP[e.sp]?.venom && Math.random() < 0.5 && !S.ailments.includes('veneno')) { S.ailments.push('veneno'); popText(plX() + 10, PL0.y - 90, 'Envenenado', { color: '#8ae07a' }); }
      this.res = { par, dmg };
    },
    draw(ctx, fr) {
      // anillo que se cierra sobre el jugador hasta el impacto
      const t = this.t; if (t > T0 + 4 || this.press !== null && t > this.press + 8) return;
      const cx = Math.round(plX() + 2), cy = PL0.y - 34; const left = T0 - t; const span = Math.min(T0, 44);
      const r = Math.max(9, Math.round(9 + 34 * Math.max(0, left) / span));
      const col = left <= perf && left >= -1 ? '#fcd456' : left <= win ? '#ffffff' : alpha('#c8b8d8', 0.6);
      if (left < span + 4) { ringPx(ctx, cx, cy, r, col); ringPx(ctx, cx, cy, 9, alpha('#ffffff', 0.35)); if (left <= perf && left >= -1) ringPx(ctx, cx, cy, r + 1, '#f0b030'); }
      if (b.turn <= 2 && !S.flags.parryTaught && left < span && left > 0) { const s = 'A: ¡para!'; drawOutlined(ctx, s, cx - textWidth(s) / 2, cy + 18, '#fcd456', INK); }
    },
  }).then((res) => { if (res && res.par === 'perfect') S.flags.parryTaught = 1; return null; });
}

// ───────────── Final ─────────────
async function finish(e, result) {
  const b = B.active; const p = S.player;
  if (result === 'calm') {
    burst(enX(), EN0.y - 30, 14, { layer: 'screen', colors: ['#ff9ac8', '#fff4c0'], speed: 1.2, life: 40, kind: 'star', ay: -0.03 });
    if (e.kind === 'animal') {
      e.ent && (e.ent.calm = true); addXP(12, 'Bestia calmada'); S.known['sp:' + e.sp] = 2;
      const s = SP[e.sp];
      if (s.size <= 1 && !S.pet && ['gato', 'perro', 'conejo', 'ardilla', 'mustelido', 'ave_suelo', 'rapaz', 'erizo', 'tortuga'].includes(s.plan)) {
        const i = await ui.ask(`${e.name} te sigue con la mirada. ¿Quieres que te acompañe?`, ['Adoptarlo', 'Dejarlo ir']);
        if (i === 0) { removeAnimal(G.map.id, e.a.id); e.ent && (e.ent.gone = true); S.pet = { sp: e.sp, name: e.name, since: S.day }; sfx('heart'); addXP(15, 'Nueva mascota'); logEvent(`Adoptas un ${e.name.toLowerCase()}`); }
      }
    } else if (e.kind === 'npc') addXP(10); else addXP(Math.round((e.xp || 20) / 2), 'Enemigo ahuyentado');
    return 'calm';
  }
  if (result === 'scared') { addXP(e.kind === 'animal' ? 4 : Math.round((e.xp || 20) / 3), 'Lo ahuyentas'); return 'flee'; }
  if (result === 'flee' || result === 'escaped') return result;
  if (result === 'win') {
    // disolución del rival y fanfarria
    sfx('down'); b.en.pose = 'hurt';
    await tween(b.en, { dissolve: 1 }, 34, ease.inQuad);
    jingle('victoria'); b.victory = 1;
    const loot = []; let money = 0, xp = 0;
    if (e.kind === 'animal') {
      const s = SP[e.sp]; removeAnimal(G.map.id, e.a.id); if (e.ent) e.ent.gone = true;
      const r = await ui.roll('Aprovechar la pieza (CAZA Y PESCA)', mod(stat('caz')), 11, { pulse: 1 });
      const got = [...s.res]; if (r.ok && s.res.length) got.push(s.res[0]); if (r.crit && s.res.length) got.push(s.res[s.res.length - 1]); if (!r.ok) got.splice(0, Math.ceil(got.length / 2));
      for (const k of got) { addItem(k); loot.push(k); }
      xp = 6 + (s.hp || 5); S.known['sp:' + e.sp] = Math.max(1, S.known['sp:' + e.sp] || 0); S.flags.kills = (S.flags.kills || 0) + 1;
      await results(e, xp, loot, 0, 'Caza');
      if (a_cria(e)) { S.rep.pagano -= 1; await ui.say('(Era una cría. Los guardabosques no lo aprueban.)'); }
      if (s.flagship) logEvent(`Matas un ${s.name.toLowerCase()}. Quedan pocos.`);
    } else if (e.kind === 'npc') {
      xp = 20; await results(e, xp, [], 0, 'Pelea ganada'); await ui.say(`${e.name} se rinde, magullado.`);
      const st = npcState(e.npc.id); st.rel = Math.max(-100, (st.rel || 0) - 5);
      if (e.npc.traits.includes('bruto') || e.npc.traits.includes('bromista')) st.rel += 12;
    } else {
      xp = e.xp || 20; for (const k of e.loot || []) { addItem(k); loot.push(k); }
      if (e.money) { money = e.money[0] + Math.floor(Math.random() * (e.money[1] - e.money[0])); S.money += money; }
      await results(e, xp, loot, money, 'Victoria');
    }
    p.hp = Math.max(1, p.hp); return 'win';
  }
  if (result === 'lose') {
    p.hp = 0; sfx('defeat'); b.pl.pose = 'hurt'; b.defeat = 1;
    await tween(b.pl, { alpha: 0 }, 50, ease.inQuad);
    return 'lose';
  }
}
function a_cria(e) { return e.a && e.a.age < SP[e.sp].mature; }
// Panel de resultados: XP que cuenta, botín que aparece objeto a objeto
function results(e, xp, loot, money, why) {
  const p = S.player; let given = false;
  return ui.custom({
    t: 0,
    update() {
      this.t++;
      if (this.t === 30 && !given) { given = true; addXP(xp, why); }
      if (this.t > 10 && this.t % 12 === 0 && this.t / 12 - 1 < loot.length) sfx('item');
      if (this.t > 50 && (input.pressed('A') || input.pressed('B'))) this.done = true;
    },
    draw(ctx, fr) {
      const op = prog(this.t, 12, 0, ease.outBack); const y0 = 24 + Math.round((1 - op) * -40);
      const s = '¡VICTORIA!'; drawBig(ctx, s, 120 - bigWidth(s, 2) / 2, y0, '#fcd456', INK, 2);
      if (fr % 6 === 0) spawn({ x: 120 - 50 + Math.random() * 100, y: y0 + 8 + Math.random() * 14, vy: -0.3, life: 30, kind: 'star', color: '#fff4c0', layer: 'screen' });
      const ph = 28 + Math.ceil(Math.max(1, loot.length) / 5) * 20; const py = 112 - (ph > 48 ? ph - 48 : 0);
      panel(ctx, 2, py, 236, ph + 0, 'dark');
      const xs = `+${Math.round(xp * Math.min(1, this.t / 30))} XP`; drawText(ctx, xs, 10, py + 7, '#c8f0a8', INK);
      if (money) drawText(ctx, `+${Math.round(money * Math.min(1, this.t / 30))} dineros`, 90, py + 7, '#fcd456', INK);
      const xpF = Math.min(1, p.xp / Math.max(1, (40 * Math.pow(p.level, 1.55)) | 0)); bar(ctx, 170, py + 9, 60, 3, xpF, xpF, ['#6a5a10', '#fcd456', '#fff4a0']);
      if (!loot.length) drawText(ctx, 'Sin botín.', 10, py + 22, '#a898b8', INK);
      loot.forEach((k, i) => {
        const at = 10 + i * 12; if (this.t < at) return; const pp = prog(this.t, 8, at, ease.outBackBig);
        const x = 10 + (i % 5) * 46, y = py + 20 + Math.floor(i / 5) * 20; const ic = itemIco(k);
        if (ic) { const h = Math.max(1, Math.round(16 * pp)); ctx.drawImage(ic, 0, 0, 16, 16, x, y + 16 - h, 16, h); }
        drawText(ctx, (ITEMS[k]?.name || k).slice(0, 7), x + 17, y + 5, '#f8ecd0', INK);
      });
      if (this.t > 50 && fr % 40 < 26) drawText(ctx, '▼', 226, py + ph - 10, '#f0b030');
    },
  });
}

// ───────────── Dibujo del combate ─────────────
const buf = document.createElement('canvas'); buf.width = W; buf.height = H; const bctx = buf.getContext('2d'); bctx.imageSmoothingEnabled = false;
const scaledCache = new Map();
function scaled3(cv) { let c = scaledCache.get(cv); if (c) return c; c = document.createElement('canvas'); c.width = cv.width * 3; c.height = cv.height * 3; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, c.width, c.height); scaledCache.set(cv, c); return c; }
function enemySprite(e, pose, frame) {
  if (e.kind === 'animal') {
    const s = SP[e.sp]; const cria = e.a && e.a.age < s.mature;
    if (typeof SPR.animalBattle === 'function') { try { return SPR.animalBattle(e.sp, frame, cria, e.a?.sex, pose); } catch (er) { } }
    return scaled3(animalSprite(e.sp, 'left', pose === 'attack' ? 1 : frame, cria, e.a?.sex));
  }
  const fp = pose === 'idle' ? (frame ? 'idle1' : 'idle0') : pose;
  if (e.kind === 'npc') return figure(npcLook(e.npc), 'front', fp);
  if (e.look) return figure({ ...e.look, race: 'humano', sex: 'm' }, 'front', fp);
  if (BA?.monsterSprite) { try { return BA.monsterSprite(e.id, frame, pose); } catch (er) { } }
  return null;
}
const SKY = { manana: ['#f8c8a0', '#fce8c8'], dia: ['#88c8f0', '#c8e8f8'], tarde: ['#f0a868', '#f8d8a0'], crepusculo: ['#7a4a7a', '#d87a7a'], noche: ['#141a40', '#2a3060'] };
export function drawBattle(ctx0, fr) {
  const b = B.active; if (!b) return; const e = b.e; b.t++;
  const ctx = b.zoom > 1.001 ? bctx : ctx0;
  const cam = b.cam + fx.sx * 0.5;
  // Fondo
  if (BA?.drawBattleBg) { try { BA.drawBattleBg(ctx, b.biome, b.ph, fr, cam); } catch (er) { fallbackBg(ctx, b, cam); } } else fallbackBg(ctx, b, cam);
  // Plataformas
  const ex = Math.round(EN0.x - cam * par(EN0.y) + fx.sx), ey = EN0.y + fx.sy, px_ = Math.round(PL0.x - cam * par(PL0.y) + fx.sx), py_ = PL0.y + fx.sy;
  const platform = (x, y, rx, ry) => { if (BA?.drawPlatform) { try { BA.drawPlatform(ctx, x, y, rx, ry, b.biome, b.ph); return; } catch (er) { } } ellipse(ctx, x, y + 2, rx, ry, 'rgba(20,10,30,.35)'); ellipse(ctx, x, y, rx, ry, '#4a8a3a'); ellipse(ctx, x - 3, y - 1, rx - 6, ry - 3, '#6ab04a'); };
  platform(ex, ey, 46, 10); platform(px_, py_ - 1, 54, 11);
  // Rival
  const en = b.en; const efr = Math.floor(fr / 22) % 2;
  const pose = en.hurt > 0 ? 'hurt' : en.pose; if (en.hurt > 0) en.hurt--;
  let spr = enemySprite(e, pose, efr);
  const ebob = pose === 'idle' && !e.sleep ? Math.round(Math.sin(fr / 14) * 1) : 0;
  if (spr) {
    const sx = Math.round(ex + en.ox - spr.width / 2), sy = Math.round(ey + en.oy - spr.height + 4 + ebob);
    if (en.dissolve < 1) { const shx = ex + Math.round(en.ox * 0.6), shr = Math.round(spr.width * 0.32) - Math.round(Math.max(0, -en.oy) * 0.2); if (BA?.drawShadow) BA.drawShadow(ctx, shx, ey + 1, Math.max(6, shr), 4, 0.6 * (1 - en.dissolve)); else ellipseDither(ctx, shx, ey + 2, Math.max(6, shr), 4, 'rgba(20,10,30,0.5)', 0.9 * (1 - en.dissolve)); }
    if (en.dissolve > 0) drawDissolve(ctx, spr, sx, sy, en.dissolve, fr);
    else if (en.flash > 0 && (en.flash-- % 4 < 2)) ctx.drawImage(silhouette(spr, '#ffffff'), sx, sy);
    else { if (e.sleep) ctx.globalAlpha = 0.85; ctx.drawImage(spr, sx, sy); ctx.globalAlpha = 1; }
    if (b.gleam > 0) { b.gleam--; sparkle(ctx, sx + Math.round(spr.width * 0.25), sy + Math.round(spr.height * 0.3), 2 + (b.gleam > 5 ? 2 : 0), '#ffffff'); }
    if (e.evade) { ctx.fillStyle = alpha('#ffffff', 0.4); for (let i = 0; i < 3; i++) ctx.fillRect(sx + 8 + i * 10, sy + spr.height + 4 + ((fr / 4 + i * 3) % 6), 6, 1); }
  } else drawMonsterFallback(ctx, e, ex + en.ox - 24, ey + en.oy - 50, fr);
  // Jugador de espaldas
  const pl = b.pl; const ppose = pl.pose === 'idle' ? (Math.floor(fr / 26) % 2 ? 'idle1' : 'idle0') : pl.pose;
  const pspr = backBust(playerLook(), ppose);
  const pxs = Math.round(px_ + pl.ox - pspr.width / 2), pys = Math.round(py_ + pl.oy - pspr.height - 4);
  if (BA?.drawShadow) BA.drawShadow(ctx, px_ + Math.round(pl.ox * 0.7), py_ - 1, 16, 4, 0.6 * pl.alpha); else ellipseDither(ctx, px_ + Math.round(pl.ox * 0.7), py_, 16, 4, 'rgba(20,10,30,0.5)', 0.9);
  if (pl.alpha < 1) ctx.globalAlpha = Math.max(0, pl.alpha);
  if (pl.flash > 0 && (pl.flash-- % 4 < 2)) ctx.drawImage(silhouette(pspr, '#ffffff'), pxs, pys); else ctx.drawImage(pspr, pxs, pys);
  ctx.globalAlpha = 1;
  if (b.tangled) { ctx.fillStyle = '#7a9a3a'; for (let i = 0; i < 6; i++) ctx.fillRect(pxs + 10 + ((i * 7 + Math.floor(fr / 6)) % 24), pys + 30 + ((i * 5) % 20), 3, 1); }
  // Efectos
  for (const f of b.fxs || []) {
    f.t++; const t = Math.min(1, f.t / f.dur);
    if (BA?.drawFx) { try { BA.drawFx(ctx, f.kind, f.x, f.y, t, { dir: f.dir }); } catch (er) { fallbackFx(ctx, f, t); } } else fallbackFx(ctx, f, t);
  }
  if (b.fxs) b.fxs = b.fxs.filter((f) => f.t < f.dur);
  // Clima del día sobre la escena
  if (BA?.drawWeather && b.weather) { try { BA.drawWeather(ctx, b.weather, fr, cam); } catch (er) { } }
  // Cajas de información
  drawEnemyBox(ctx, b, e, fr); drawPlayerBox(ctx, b, fr);
  if (S.player.hp / S.player.hpMax < 0.25 && !b.victory && fr % 70 === 0) sfx('heartbeat');
  if (S.player.hp / S.player.hpMax < 0.25 && !b.victory) { const a = 0.18 + Math.sin(fr / 10) * 0.08; ctx.fillStyle = alpha('#c01020', a); ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(0, 0, 2, H); ctx.fillRect(W - 2, 0, 2, H); }
  if (b.defeat) { ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = alpha('#808080', Math.min(1, (1 - b.pl.alpha))); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  if (ctx !== ctx0) { const z = b.zoom; const vw = W / z, vh = H / z; const cx = Math.max(0, Math.min(W - vw, ex - vw / 2)), cy = Math.max(0, Math.min(H - vh, ey - 30 - vh / 2)); ctx0.drawImage(buf, cx, cy, vw, vh, 0, 0, W, H); }
}
function drawDissolve(ctx, spr, x, y, k, fr) {
  const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height; const cx = c.getContext('2d'); cx.drawImage(spr, 0, 0);
  const id = cx.getImageData(0, 0, c.width, c.height); const a = id.data;
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) { const n = (j * c.width + i) * 4; if (!a[n + 3]) continue; const th = bayer(i, j) * 0.7 + (1 - j / c.height) * 0.3; if (th < k) { a[n + 3] = 0; if (Math.random() < 0.012) spawn({ x: x + i, y: y + j, vx: (Math.random() - 0.5) * 0.4, vy: -0.4 - Math.random() * 0.6, life: 30, kind: 'px', color: `rgb(${a[n]},${a[n + 1]},${a[n + 2]})`, layer: 'screen' }); } else if (th < k + 0.08) { a[n] = 255; a[n + 1] = 248; a[n + 2] = 220; } }
  cx.putImageData(id, 0, 0); ctx.drawImage(c, x, y);
}
function drawEnemyBox(ctx, b, e, fr) {
  const x = 6, y = 6, w = 108, h = 30; const slide = Math.round((1 - prog(b.t, 20, 20, ease.outBack)) * -120);
  panel(ctx, x + slide, y, w, h, 'dark');
  const cria = e.a && SP[e.sp] && e.a.age < SP[e.sp].mature;
  const nm = e.name + (e.kind === 'animal' ? (e.a?.sex === 'm' ? ' ♂' : ' ♀') : '');
  drawText(ctx, nm.length > 17 ? nm.slice(0, 16) + '.' : nm, x + 7 + slide, y + 6, '#fff4d8', INK);
  if (cria) drawText(ctx, 'cría', x + w - 28 + slide, y + 6, '#f0a0c0', INK);
  const f = Math.max(0, e.hp) / e.hpMax; b.en.hpG = b.en.hpG > f ? Math.max(f, b.en.hpG - 0.008) : f;
  drawText(ctx, 'PV', x + 7 + slide, y + 17, '#ff8070', INK);
  bar(ctx, x + 22 + slide, y + 19, 78, 4, f, b.en.hpG, f > 0.5 ? ['#1e6a34', '#48c048', '#a0f0a0'] : f > 0.2 ? ['#8a6a10', '#e8c030', '#fff0a0'] : ['#7a1a24', '#e84830', '#ff9a80']);
  if (canRead(e) || stat('nat') >= 6) drawText(ctx, `${Math.max(0, e.hp)}`, x + w - 6 - textWidth(`${Math.max(0, e.hp)}`) + slide, y + 6, '#a8c8a8', INK);
  // estados
  let sx = x + 7 + slide; const st = [];
  if (e.poison) st.push(['veneno', '#8ae07a']); if (e.sleep) st.push(['dormido', '#c8d8ff']); if (e.slow) st.push(['lento', '#a8e8ff']); if (e.guard) st.push(['guardia', '#9ac8ff']); if (e.charged) st.push(['¡carga!', '#ff9070']);
  for (const [s, c] of st) { drawOutlined(ctx, s, sx, y + h + 2, c, INK); sx += textWidth(s) + 5; }
  // Intención del rival, sobre su cabeza
  if (b.intent && !b.victory && b.menu) {
    const mv = MV[b.intent]; const read = canRead(e); const ic = icon(read ? mv.icon : 'i_duda');
    const ix = Math.round(enX()) - 7, iy = 18 + Math.round(Math.sin(fr / 10) * 2);
    ctx.fillStyle = INK; ctx.fillRect(ix - 2, iy - 2, 16 + (read ? textWidth(mv.name) + 4 : 0), 16); ctx.fillStyle = 'rgba(33,24,44,.92)'; ctx.fillRect(ix - 1, iy - 1, 14 + (read ? textWidth(mv.name) + 4 : 0), 14);
    if (ic) ctx.drawImage(ic, ix, iy); if (read) drawText(ctx, mv.name, ix + 15, iy + 3, mv.kind === 'attack' ? (mv.pow > 1.3 ? '#ff8070' : '#f8e0c0') : '#c8e0ff', INK);
  }
}
function drawPlayerBox(ctx, b, fr) {
  const p = S.player; const x = 128, y = 80, w = 108, h = 31; const slide = Math.round((1 - prog(b.t, 20, 26, ease.outBack)) * 140);
  panel(ctx, x + slide, y, w, h, 'dark');
  drawText(ctx, p.name.slice(0, 11), x + 7 + slide, y + 4, '#fff4d8', INK); drawText(ctx, `Nv${p.level}`, x + w - 26 + slide, y + 4, '#f0b030', INK);
  const f = Math.max(0, p.hp) / p.hpMax; b.pl.hpG = b.pl.hpG > f ? Math.max(f, b.pl.hpG - 0.008) : f; const fm = p.mp / p.mpMax; b.pl.mpG = b.pl.mpG > fm ? Math.max(fm, b.pl.mpG - 0.008) : fm;
  drawText(ctx, 'PV', x + 7 + slide, y + 13, '#ff8070', INK);
  bar(ctx, x + 22 + slide, y + 14, 46, 3, f, b.pl.hpG, f > 0.5 ? ['#1e6a34', '#48c048', '#a0f0a0'] : f > 0.25 ? ['#8a6a10', '#e8c030', '#fff0a0'] : ['#7a1a24', '#e84830', '#ff9a80']);
  bar(ctx, x + 22 + slide, y + 19, 46, 1, fm, b.pl.mpG, ['#1a2a6a', '#4a8af0', '#9ac8ff']);
  drawText(ctx, `${Math.max(0, p.hp)}/${p.hpMax}`, x + 71 + slide, y + 13, '#f8ecd0', INK);
  // Balanza de seny i rauxa
  const gx = x + 20 + slide, gy = y + 25, gw = 70; const n = b.needle;
  ctx.fillStyle = INK; ctx.fillRect(gx - 1, gy - 1, gw + 2, 5);
  for (let k = -5; k <= 5; k++) { const cx = gx + Math.round((k + 5) * (gw - 6) / 10) + 1; const on = (n < 0 && k >= n && k < 0) || (n > 0 && k <= n && k > 0); ctx.fillStyle = k < 0 ? (on ? '#5ac8d0' : '#1e3a44') : k > 0 ? (on ? '#e8604e' : '#4a1a24') : '#a898b8'; ctx.fillRect(cx - 2, gy, 5, 3); }
  const nx = gx + Math.round((n + 5) * (gw - 6) / 10) + 1; const bump = b.needleBump > 0 ? b.needleBump-- % 2 : 0;
  ctx.fillStyle = '#fff4d8'; ctx.fillRect(nx - 1, gy - 3 - bump, 3, 2); ctx.fillRect(nx, gy - 1 - bump, 1, 1);
  const si = icon('seny'), ri = icon('rauxa'); if (si) ctx.drawImage(si, gx - 14, gy - 5); if (ri) ctx.drawImage(ri, gx + gw + 2, gy - 5);
  if (Math.abs(n) === 5) { ctx.fillStyle = alpha(n > 0 ? '#ff7050' : '#7ae0e0', 0.25 + Math.sin(fr / 5) * 0.15); ctx.fillRect(gx - 1, gy - 1, gw + 2, 5); }
  if (b.streak >= 2) drawOutlined(ctx, `racha ×${b.streak}`, x + slide + 4, y - 9, '#fcd456', INK);
}
function fallbackBg(ctx, b, cam) {
  const s = SKY[b.ph] || SKY.dia; for (let y = 0; y < 72; y += 6) { ctx.fillStyle = y < 36 ? s[0] : s[1]; ctx.fillRect(0, y, W, 6); }
  ctx.fillStyle = '#4a8a3a'; ctx.fillRect(0, 72, W, H - 72); ctx.fillStyle = '#3a7a34'; for (let y = 76; y < H; y += 8) ctx.fillRect(0, y, W, 2);
}
function fallbackFx(ctx, f, t) {
  const r = Math.round(4 + t * 16); ringPx(ctx, Math.round(f.x), Math.round(f.y), r, alpha('#ffffff', 1 - t));
}
function drawMonsterFallback(ctx, e, x, y, fr) {
  const [c1, c2] = e.color || ['#5a3a5a', '#e8c040']; const bob = Math.round(Math.sin(fr / 10) * 2);
  ctx.fillStyle = INK; ctx.fillRect(x + 8, y + 10 + bob, 36, 34); ctx.fillStyle = c1; ctx.fillRect(x + 10, y + 12 + bob, 32, 30); ctx.fillStyle = c2; ctx.fillRect(x + 16, y + 20 + bob, 5, 5); ctx.fillRect(x + 30, y + 20 + bob, 5, 5);
}
