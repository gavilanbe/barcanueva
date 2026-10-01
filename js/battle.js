// Combate por turnos estilo GBA con tiradas de d20 (a lo D&D).
import { S, stat, mod, addItem, hasItem, logEvent, npcState } from './state.js';
import { ITEMS, SPELLS } from './data/items.js';
import { SP, removeAnimal } from './eco.js';
import { ui, W, H, panel, text } from './ui.js';
import { drawText, textWidth } from './font.js';
import { charSprite } from './chars.js';
import { animalSprite } from './sprites.js';
import { G, addXP, playerLook, npcLook, updateMusic } from './game.js';
import { sfx } from './audio.js';
import { check } from './talk.js';

const d = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(Math.random() * s); return t; };
export const B = { active: null };

const BACK = {
  pradera: ['#88c8f0', '#b8e0f8', '#6ab04a', '#4a8a3a'], bosque: ['#5a8a6a', '#8ab08a', '#3a6a3a', '#2a4a2a'], montana: ['#a8c8e8', '#d8e8f8', '#8a8a7a', '#6a6a5a'],
  rio: ['#88c8f0', '#c8e8f8', '#5aa05a', '#3a7ab0'], costa: ['#78b8f0', '#b8e0f8', '#e8d8a0', '#3a78b8'], urbano: ['#98b0d0', '#c8d8e8', '#a8a098', '#8a8278'],
  interior: ['#4a3a2a', '#6a5a4a', '#8a6a4a', '#6a4a2a'], cueva: ['#2a2430', '#3a3440', '#5a5048', '#3a3430'], montjuic: ['#88c8f0', '#b8e0f8', '#6ab04a', '#4a8a3a'],
};

// Enemigos «de encuentro» (no forman parte de la población simulada)
export const MONSTERS = {
  bandido: { name: 'Bandolero', hp: 26, atk: 5, def: 3, esp: 1, xp: 30, loot: ['cuchillo', 'vino'], money: [5, 25], look: { skin: '#c98e62', hair: '#2a1d18', hairStyle: 0, top: '#4a4a3a', bottom: '#3a3a2a', beard: true, equip: { head: 'capucha' } } },
  quarantamaula: { name: 'Quarantamaula', hp: 40, atk: 7, def: 4, esp: 5, xp: 70, loot: ['hueso', 'piel'], fae: true, color: ['#2a2a30', '#e84a2a'] },
  simiot: { name: 'Simiot', hp: 36, atk: 6, def: 3, esp: 2, xp: 60, loot: ['piel', 'uva'], fae: true, color: ['#5a4a3a', '#d8c8a8'] },
  follet: { name: 'Follet', hp: 14, atk: 3, def: 6, esp: 6, xp: 25, loot: ['cinta'], fae: true, color: ['#6a8a3a', '#e8c040'] },
  drac: { name: 'Drac de Olorda', hp: 140, atk: 13, def: 8, esp: 8, xp: 400, loot: ['cornamenta', 'plata', 'plata'], fae: true, color: ['#3a7a3a', '#e8c040'], boss: true },
};

export async function fight(enemy) {
  const p = S.player;
  if (B.active) return 'busy'; // nunca dos combates a la vez
  B.active = { e: enemy, shake: 0, flash: 0, t: 0, msg: '', pShake: 0, buff: 0 };
  G.mode = 'battle'; updateMusic();
  await ui.say(enemy.intro || `¡${enemy.name} te hace frente!`);
  let result = null;
  while (!result) {
    // Turno del jugador
    const acts = ['Atacar', 'Conjuro', 'Objeto', enemy.kind === 'animal' ? 'Calmar' : 'Hablar', 'Huir'];
    const i = await ui.choose(acts, { cols: 2, cancel: null, prompt: `¿Qué hará ${p.name}?` });
    if (i === 0) await attack(enemy);
    if (i === 1) { if (!(await cast(enemy))) continue; }
    if (i === 2) { if (!(await useItem(enemy))) continue; }
    if (i === 3) { const r = await calm(enemy); if (r) { result = r; break; } }
    if (i === 4) {
      if (enemy.boss) { await ui.say('¡No hay escapatoria!'); }
      else { const r = await check('Huir (FUERZA + NATURALEZA)', ['fue', 'nat'], enemy.kind === 'animal' && SP[enemy.sp]?.beh === 'caza' ? 13 : 9); if (r.ok) { result = 'flee'; await ui.say('¡Pones tierra de por medio!'); break; } await ui.say('¡No consigues escapar!'); }
    }
    if (enemy.hp <= 0) { result = 'win'; break; }
    // Turno enemigo
    if (enemy.sleep > 0) { enemy.sleep--; await ui.say(`${enemy.name} duerme profundamente.`); continue; }
    if (enemy.poison) { const pd = d(1, 4); enemy.hp -= pd; await ui.say(`El veneno hace efecto: ${pd} de daño.`); if (enemy.hp <= 0) { result = 'win'; break; } }
    await enemyTurn(enemy);
    if (enemy.escaped) { result = 'escaped'; if (enemy.ent) enemy.ent.gone = true; break; }
    if (p.hp <= 0) { result = 'lose'; break; }
  }
  const out = await finish(enemy, result);
  B.active = null; G.mode = 'world'; updateMusic();
  return out;
}

function weapon() { const w = S.player.equip?.weapon; return w ? ITEMS[w].eq : { atk: 1 }; }
function armor() { let t = 0; for (const s of ['head', 'body', 'cape']) { const it = S.player.equip?.[s]; if (it) t += ITEMS[it].eq.def || 0; } return t; }

async function attack(e) {
  const w = weapon(); const ac = 10 + e.def;
  const bonus = mod(stat('fue')) + Math.floor((w.atk || 0) / 2) + (B.active.buff ? 2 : 0) + (S.flags.buff_fue === S.day ? 1 : 0);
  const r = await ui.roll('Ataque (FUERZA)', bonus, ac);
  // Conocer a la bestia amplía el rango de crítico
  const critRange = e.kind === 'animal' ? 20 - Math.floor((stat('caz') + stat('nat')) / 6) : 20;
  const crit = r.roll >= critRange && r.ok;
  if (!r.ok) { await ui.say(r.fumble ? '¡Tropiezas y casi te clavas tu propia arma!' : 'Fallas.'); if (r.fumble) S.player.hp = Math.max(1, S.player.hp - 2); addXP(1); return; }
  let dmg = d(1, 6) + Math.max(0, mod(stat('fue'))) + (w.atk || 1) + (S.flags.buff_fue === S.day ? 2 : 0);
  if (crit) dmg *= 2; if (e.venomBlade) dmg += d(1, 6);
  if (S.flags.poisonBlade && !e.poison) { e.poison = true; S.flags.poisonBlade = false; }
  e.hp -= dmg; B.active.shake = 12; B.active.flash = 6; sfx(crit ? 'crit' : 'hit');
  await ui.say(crit ? (e.kind === 'animal' && critRange < 20 ? `¡Crítico! Sabes dónde golpear a un ${e.name.toLowerCase()}: ${dmg} de daño.` : `¡CRÍTICO! ${dmg} de daño.`) : `Golpeas: ${dmg} de daño.`);
  addXP(2);
}

async function cast(e) {
  const p = S.player; const list = (p.spells || []).filter((s) => SPELLS[s]);
  if (!list.length) { await ui.say('No conoces ningún conjuro.'); return false; }
  const i = await ui.choose([...list.map((s) => ({ label: `${SPELLS[s].name} (${SPELLS[s].mp} PM)`, hint: SPELLS[s].desc, disabled: p.mp < SPELLS[s].mp })), 'Volver'], { cancel: list.length });
  if (i === list.length) return false;
  const sp = SPELLS[list[i]]; p.mp -= sp.mp; sfx('magic');
  const mag = weapon().mag || 0;
  if (sp.kind === 'cura') { const h = d(...sp.dice) + mod(stat('esp')) + mag; p.hp = Math.min(p.hpMax, p.hp + h); await ui.say(`Una luz tibia te recorre: +${h} PV.`); return true; }
  if (sp.kind === 'buff') { B.active.buff = 1; await ui.say('Te sientes bendecido: +2 a tus ataques.'); return true; }
  if (sp.kind === 'calmar') { const r = await calm(e, true); if (r) { B.active.forced = r; e.hp = Math.min(e.hp, 0.0001); e.calmed = true; } return true; }
  const r = await ui.roll(`${sp.name} (INTELIGENCIA + ARCANO)`, mod(stat('int')) + mod(stat('arc')) + mag, 10 + e.esp);
  if (!r.ok) { await ui.say('El conjuro se deshace en el aire.'); return true; }
  let dmg = d(...sp.dice) + Math.max(0, mod(stat('int'))) + mag; if (r.crit) dmg *= 2;
  if (e.fae && sp.elem === 'fuego') dmg = Math.round(dmg * 0.7);
  e.hp -= dmg; B.active.shake = 12; B.active.flash = 8; await ui.say(`${sp.name}: ${dmg} de daño.`); addXP(3);
  return true;
}

async function useItem(e) {
  const p = S.player; const inv = Object.keys(S.inv).filter((k) => ITEMS[k] && (ITEMS[k].heal || ITEMS[k].mp || ITEMS[k].battle || ITEMS[k].cure));
  if (!inv.length) { await ui.say('No llevas nada útil.'); return false; }
  const i = await ui.choose([...inv.map((k) => ({ label: `${ITEMS[k].name} x${S.inv[k]}`, hint: ITEMS[k].desc })), 'Volver'], { cancel: inv.length, max: 6 });
  if (i === inv.length) return false;
  const k = inv[i]; const it = ITEMS[k]; addItem(k, -1);
  if (it.battle === 'dormir') { e.sleep = 3; await ui.say(`El humo envuelve a ${e.name}. Se duerme.`); return true; }
  if (it.battle === 'veneno_arma') { e.poison = true; await ui.say('Untas el filo con veneno.'); return true; }
  if (it.heal) p.hp = Math.max(1, Math.min(p.hpMax, p.hp + it.heal)); if (it.mp) p.mp = Math.min(p.mpMax, p.mp + it.mp);
  await ui.say(`Usas ${it.name}.`); return true;
}

async function calm(e, magic = false) {
  if (e.kind === 'animal') {
    const s = SP[e.sp]; const dc = 8 + (s.size || 0) * 3 + (s.beh === 'caza' || s.beh === 'embiste' ? 3 : 0) + (e.hp < e.hpMax / 2 ? -2 : 0);
    const r = await check('Calmar (NATURALEZA + CARISMA)', ['nat', 'car'], dc, magic ? 3 : 0);
    if (r.ok) { await ui.say(`${e.name} se tranquiliza y te mira con curiosidad.`); return 'calm'; }
    await ui.say(`${e.name} no se fía de ti.`); return null;
  }
  if (e.kind === 'npc') {
    const r = await check('Calmar los ánimos (CARISMA)', ['car'], 13);
    if (r.ok) { await ui.say(`${e.name} baja los puños. «Está bien, está bien...»`); return 'calm'; }
    await ui.say('«¡No me vengas con palabritas!»'); return null;
  }
  if (e.fae) {
    const r = await check('Conjurar (ARCANO + ESPÍRITU)', ['arc', 'esp'], 14);
    if (r.ok) { await ui.say(`Pronuncias las palabras antiguas. ${e.name} se desvanece entre la niebla.`); return 'calm'; }
    await ui.say('Las palabras no surten efecto.'); return null;
  }
  const r = await check('Negociar (CARISMA)', ['car'], 14);
  if (r.ok) { const n = Math.min(S.money, 10); S.money -= n; await ui.say(`Le das ${n} dineros y te deja en paz.`); return 'calm'; }
  await ui.say('«¡La bolsa o la vida!»'); return null;
}

async function enemyTurn(e) {
  const p = S.player;
  if (e.kind === 'animal' && ['huye', 'vuela', 'ignora'].includes(SP[e.sp]?.beh) && Math.random() < (e.hp < e.hpMax ? 0.55 : 0.35)) {
    const r = await check('Cortarle el paso (CAZA Y PESCA)', ['caz'], 11);
    if (!r.ok) { await ui.say(`¡${e.name} se escabulle!`); e.escaped = true; return; }
    await ui.say(`${e.name} intenta huir, pero le cortas el paso.`); return;
  } const ac = 10 + mod(stat('def')) + armor();
  const r = 1 + Math.floor(Math.random() * 20); const hit = r === 20 || (r !== 1 && r + e.atk >= ac);
  if (!hit) { await ui.say(`${e.name} ataca... ¡y falla!`); return; }
  let dmg = d(1, 6) + Math.floor(e.atk / 2) + (r === 20 ? d(1, 6) : 0);
  const red = e.fae ? mod(stat('esp')) : Math.floor(armor() / 2); dmg = Math.max(1, dmg - Math.max(0, red));
  p.hp -= dmg; B.active.pShake = 10; sfx('hit');
  const verb = e.kind === 'animal' ? (SP[e.sp]?.venom ? 'te muerde' : SP[e.sp]?.beh === 'pica' ? 'te pica' : SP[e.sp]?.beh === 'embiste' ? 'te embiste' : 'te ataca') : 'te golpea';
  await ui.say(`${e.name} ${verb}: ${dmg} de daño.${r === 20 ? ' ¡Crítico!' : ''}`);
  if (e.kind === 'animal' && SP[e.sp]?.venom && Math.random() < 0.5 && !S.ailments.includes('veneno')) { S.ailments.push('veneno'); await ui.say('¡Estás envenenado!'); }
}

async function finish(e, result) {
  const p = S.player;
  if (result === 'calm' || B.active?.forced === 'calm') {
    if (e.kind === 'animal') { e.ent && (e.ent.calm = true); addXP(12, 'Bestia calmada'); S.known['sp:' + e.sp] = 2;
      const s = SP[e.sp];
      if (s.size <= 1 && !S.pet && ['gato', 'perro', 'conejo', 'ardilla', 'mustelido', 'ave_suelo', 'rapaz', 'erizo', 'tortuga'].includes(s.plan)) {
        const i = await ui.ask(`${e.name} te sigue con la mirada. ¿Quieres que te acompañe?`, ['Adoptarlo', 'Dejarlo ir']);
        if (i === 0) { removeAnimal(G.map.id, e.a.id); e.ent && (e.ent.gone = true); S.pet = { sp: e.sp, name: e.name, since: S.day }; addXP(15, 'Nueva mascota'); logEvent(`Adoptas un ${e.name.toLowerCase()}`); }
      }
    } else if (e.kind === 'npc') { addXP(10); } else addXP(Math.round((e.xp || 20) / 2), 'Enemigo ahuyentado');
    return 'calm';
  }
  if (result === 'flee' || result === 'escaped') return result;
  if (result === 'win') {
    sfx('good');
    if (e.kind === 'animal') {
      const s = SP[e.sp]; removeAnimal(G.map.id, e.a.id); if (e.ent) e.ent.gone = true;
      const loot = [...s.res]; const r = await check('Aprovechar la pieza (CAZA Y PESCA)', ['caz'], 11);
      if (r.ok && s.res.length) loot.push(s.res[0]); if (r.crit && s.res.length) loot.push(s.res[s.res.length - 1]);
      if (!r.ok) loot.splice(0, Math.ceil(loot.length / 2));
      for (const k of loot) addItem(k); const names = loot.map((k) => ITEMS[k].name).join(', ');
      await ui.say(loot.length ? `Obtienes: ${names}.` : 'Destrozas la pieza y no aprovechas nada.');
      addXP(6 + (s.hp || 5), 'Caza'); S.known['sp:' + e.sp] = Math.max(1, S.known['sp:' + e.sp] || 0); S.flags.kills = (S.flags.kills || 0) + 1;
      if (a_cria(e)) { S.rep.pagano -= 1; await ui.say('(Era una cría. Los guardabosques no lo aprueban.)'); }
      if (s.flagship) logEvent(`Matas un ${s.name.toLowerCase()}. Quedan pocos.`);
    } else if (e.kind === 'npc') {
      await ui.say(`${e.name} se rinde, magullado.`); addXP(20, 'Pelea ganada');
      const st = npcState(e.npc.id); st.rel = Math.max(-100, (st.rel || 0) - 5);
      if (e.npc.traits.includes('bruto') || e.npc.traits.includes('bromista')) st.rel += 12; // algunos respetan al que gana
    } else {
      addXP(e.xp || 20, 'Victoria'); for (const k of e.loot || []) addItem(k);
      if (e.money) { const n = e.money[0] + Math.floor(Math.random() * (e.money[1] - e.money[0])); S.money += n; }
      await ui.say(`Victoria. ${(e.loot || []).map((k) => ITEMS[k].name).join(', ')}`);
    }
    p.hp = Math.max(1, p.hp); return 'win';
  }
  if (result === 'lose') { p.hp = 0; await G.hooks.knockout?.(e); return 'lose'; }
}
function a_cria(e) { return e.a && e.a.age < SP[e.sp].mature; }

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

// ───────────── Dibujo del combate ─────────────
export function drawBattle(ctx, fr) {
  const b = B.active; if (!b) return; const e = b.e;
  const bg = BACK[G.map.biome] || BACK.pradera; const night = S.min > 1200 || S.min < 360;
  // Cielo en bandas
  for (let y = 0; y < 70; y += 6) { ctx.fillStyle = y < 30 ? bg[0] : bg[1]; ctx.fillRect(0, y, W, 6); }
  if (night) { ctx.fillStyle = 'rgba(30,30,90,.55)'; ctx.fillRect(0, 0, W, 70); ctx.fillStyle = '#f8f0c0'; for (let i = 0; i < 12; i++) ctx.fillRect((i * 37) % W, (i * 13) % 50, 1, 1); }
  ctx.fillStyle = bg[2]; ctx.fillRect(0, 70, W, H - 70); ctx.fillStyle = bg[3]; for (let y = 74; y < H; y += 8) ctx.fillRect(0, y, W, 2);
  // Plataformas
  const plat = (cx, cy, rw, rh, c) => { ctx.fillStyle = c; for (let r = -rh; r <= rh; r++) { const w = Math.round(rw * Math.sqrt(1 - (r * r) / (rh * rh))); ctx.fillRect(cx - w, cy + r, w * 2, 1); } };
  plat(172, 72, 44, 9, bg[3]); plat(62, 118, 50, 10, bg[3]);
  // Enemigo
  const sh = b.shake > 0 ? (b.shake-- % 2 ? 3 : -3) : 0;
  const ex = 172 - 24 + sh, ey = 20;
  if (!(b.flash > 0 && b.flash-- % 2)) {
    if (e.kind === 'animal') ctx.drawImage(animalSprite(e.sp, 'left', Math.floor(fr / 20) % 2, e.a && e.a.age < SP[e.sp].mature, e.a?.sex), ex, ey + 6, 48, 48);
    else if (e.kind === 'npc') ctx.drawImage(charSprite(npcLook(e.npc), 'down', 0), ex + 4, ey - 8, 40, 60);
    else if (e.look) ctx.drawImage(charSprite({ ...e.look, race: 'humano', sex: 'm' }, 'down', 0), ex + 4, ey - 8, 40, 60);
    else drawMonster(ctx, e, ex, ey, fr);
  }
  // Jugador de espaldas
  const ps = b.pShake > 0 ? (b.pShake-- % 2 ? 2 : -2) : 0;
  ctx.drawImage(charSprite(playerLook(), 'up', 0), 44 + ps, 52, 40, 60);
  // Cajas de vida
  const hpBox = (x, y, name, hp, max, lvl, showNum) => {
    panel(ctx, x, y, 100, showNum ? 33 : 24); text(ctx, name, x + 7, y + 6);
    const w = 70, f = Math.max(0, hp) / max; ctx.fillStyle = '#3a2a30'; ctx.fillRect(x + 22, y + 16, w + 2, 5);
    ctx.fillStyle = f > 0.5 ? '#48c048' : f > 0.2 ? '#e8c030' : '#e84830'; ctx.fillRect(x + 23, y + 17, Math.round(w * f), 3);
    drawText(ctx, 'PV', x + 8, y + 15, '#b8322c');
    if (showNum) text(ctx, `${Math.max(0, hp)}/${max}`, x + 50, y + 22);
    if (lvl) text(ctx, lvl, x + 96 - textWidth(lvl) - 4, y + 6, '#8a3a2a');
  };
  const cria = e.a && e.a.age < SP[e.sp]?.mature;
  hpBox(8, 8, e.name + (e.kind === 'animal' ? (e.a.sex === 'm' ? ' ♂' : ' ♀') : ''), e.hp, e.hpMax, cria ? 'cría' : '');
  const p = S.player; hpBox(132, 72, p.name, p.hp, p.hpMax, `Nv${p.level}`, true);
  ctx.fillStyle = '#1a2a5a'; ctx.fillRect(140, 101, 40, 2); ctx.fillStyle = '#5a9af8'; ctx.fillRect(140, 101, Math.round(40 * p.mp / p.mpMax), 2);
}
function drawMonster(ctx, e, x, y, fr) {
  const [c1, c2] = e.color || ['#5a3a5a', '#e8c040']; const bob = Math.round(Math.sin(fr / 10) * 2);
  const P = (c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py + bob, w, h); };
  if (e.id === 'drac') { P('#1c1424', 2, 14, 46, 30); P(c1, 4, 16, 42, 26); P(c2, 10, 30, 30, 8); P(c1, 34, 4, 14, 14); P('#e84a2a', 42, 8, 3, 3); P(c1, 0, 8, 10, 14); P('#8ae08a', 6, 6, 4, 6); for (let i = 8; i < 40; i += 6) P('#e8c040', i, 12, 3, 4); return; }
  if (e.id === 'quarantamaula') { P('#1c1424', 6, 10, 38, 36); P(c1, 8, 12, 34, 32); P(c2, 14, 20, 5, 5); P(c2, 30, 20, 5, 5); P('#f8f0d8', 16, 34, 18, 3); return; }
  if (e.id === 'simiot') { P('#1c1424', 10, 6, 30, 40); P(c1, 12, 8, 26, 36); P(c2, 16, 12, 18, 12); P('#1c1424', 19, 16, 3, 3); P('#1c1424', 28, 16, 3, 3); P(c1, 4, 18, 8, 22); P(c1, 38, 18, 8, 22); return; }
  P('#1c1424', 14, 14, 22, 26); P(c1, 16, 16, 18, 22); P(c2, 20, 20, 3, 3); P(c2, 27, 20, 3, 3); P(c1, 14, 8, 6, 8); P(c1, 30, 8, 6, 8);
}
