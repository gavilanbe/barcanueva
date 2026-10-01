// Actividades del mundo: carteles, muebles, recolectar, pescar, cultivar, cazar, dormir, curarse, rezar, crear.
import { S, stat, mod, addItem, hasItem, logEvent, season, phase, npcState, clock, save, weekday, dayOfSeason, SEASONS } from './state.js';
import { ITEMS, RECIPES, CRAFTS, SPELLS } from './data/items.js';
import { SP, fishPool, takeFish, count } from './eco.js';
import { BUILDINGS, PLACES, MAPS } from './world.js';
import { TILE } from './tiles.js';
import { ui, panel, itemIco, icon } from './ui.js';
import { transition, burst, spawn, ease } from './fx.js';
import { drawBig, bigWidth, textWidth, drawOutlined } from './font.js';
import { dirs } from './util.js';
import { G, addXP, advance, enterMap, newDay, invalidateMap, weatherToday } from './game.js';
import { sfx } from './audio.js';
import { check, learn, changeRel, g } from './talk.js';
import { fight, animalEnemy, npcEnemy, monster } from './battle.js';
import { NPC_BY_ID } from './data/npcs.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ───────────── Carteles ─────────────
G.hooks.sign = async (s) => {
  await ui.say(s.text);
  const k = `sign:${G.map.id}:${s.x},${s.y}`;
  if (!S.known[k]) { S.known[k] = 1; if (s.stat) learn(s.stat, 1, 'cartel'); }
};

// ───────────── Edificios (paredes) ─────────────
G.hooks.building = async (b) => {
  if (b.kind === 'puesto') { const v = Object.entries(S.flags.market || {}).find(([, m]) => PLACES[m.place] && Math.abs(PLACES[m.place].x - b.x) < 2 && Math.abs(PLACES[m.place].y - b.y) < 4); await ui.say(v ? `Puesto de ${NPC_BY_ID[v[0]]?.name || '¿?'} (${v[1].who}).` : 'Un puesto vacío. Hoy no ha venido nadie.'); return; }
  if (b.kind === 'barca') { await boat(b); return; }
  if (b.kind === 'altar' || b.kind === 'templo') { await pagan(b); return; }
  if (b.forSale && !S.house) { await buyHouse(b); return; }
  await ui.say(b.name + '.');
};

async function buyHouse(b) {
  const i = await ui.ask(`Se vende esta casa por ${b.forSale} dineros. Razón: Lonja de Mar.`, ['Comprarla', 'Ahora no']);
  if (i !== 0) return;
  if (S.money < b.forSale) { await ui.say('No tienes tanto dinero. La Taula de Canvi presta... a su precio.'); return; }
  S.money -= b.forSale; S.house = b.id; b.forSale = 0; addItem('llave_casa'); sfx('good'); invalidateMap('ciudad');
  S.rep.ciudad += 5; if (S.rank < 1) S.rank = 1; addXP(60, 'Casa propia'); logEvent('Compras una casa en Barcanueva');
  await ui.say('¡Ya tienes casa en Barcanueva! Puedes dormir en tu cama, guardar cosas en el arcón y trabajar en la mesa.');
}

// ───────────── Muebles ─────────────
G.hooks.object = async (o) => {
  const bid = G.map.id.slice(4); const b = BUILDINGS[bid]; const mine = S.house === bid;
  switch (o.type) {
    case 'cama':
      if (mine || G.map.id === 'int_' + S.flags.inn) return sleep();
      if (b?.kind === 'hospital') return ui.say('Camas para enfermos. Habla con quien cuida el sanatorio.');
      return ui.say(mine ? '' : 'No es tu cama.');
    case 'arcon': if (mine) return stash(); return ui.say('Un arcón cerrado. No es tuyo.');
    case 'caldero': return alchemy();
    case 'yunque': case 'fragua': return craft('forja');
    case 'mesa': if (mine) return craft('casa'); return ui.say('Una mesa. Huele a escudella.');
    case 'estante':
      if (b?.id === 't_libros') return ui.say('Libros y más libros. Elies los vende; no se prestan.');
      if (mine || b?.kind === 'casa') return ui.say(pick(['Cacharros, un rosario, un pañuelo bordado.', 'Tarros de conserva y una figura de un pastorcillo... ¿agachado?', 'Una rueca y un ovillo de lana.']));
      return ui.say('Mercancía de la tienda.');
    case 'altar': return church(b);
    case 'cruz': return church(b);
    case 'pila': return holyWater(b);
    case 'banco': return ui.say('Un banco de madera, pulido por siglos de rodillas.');
    case 'claustro':
      if (S.flags.oca_back) return ui.say('Las trece ocas blancas del claustro. Trece años tenía Santa Olaia.');
      return ui.say('Las ocas del claustro. Cuentas... una, dos... doce. Falta una.');
    case 'chimenea': if (hasItem('carne')) { const i = await ui.ask('El fuego está vivo. ¿Asar algo?', ['Asar carne', 'Asar pescado', 'Nada']); if (i === 0 && hasItem('carne')) { addItem('carne', -1); addItem('carne_asada'); addXP(3, 'Cocinas'); } if (i === 1 && hasItem('pescado')) { addItem('pescado', -1); addItem('pescado_asado'); addXP(3, 'Cocinas'); } return; } return ui.say('El fuego crepita.');
    case 'barra': return ui.say('La barra. Habla con quien atiende.');
    case 'barriles': return ui.say(pick(['Vino del Penedès.', 'Cerveza. Huele a pan fermentado.', 'Un barril vacío... o casi.']));
    case 'trono': return ui.say('El trono de los condes de Barcanueva. Ni se te ocurra sentarte.');
    case 'tapiz': return ui.say('Un tapiz: Guifré el Velloso herido, y un emperador pintándole cuatro barras con los dedos.').then(() => { if (!S.known['tapiz']) { S.known['tapiz'] = 1; learn('his', 1, 'tapiz'); } });
    case 'huesos': return ui.say('Huesos viejos de algún animal... o de alguien que no encontró la salida.');
    case 'casco': return ui.say('El casco de una galera a medio construir. Huele a brea y a pino.');
    default: return ui.say('...');
  }
};

// ───────────── Dormir ─────────────
export async function sleep(where = 'tu cama') {
  const i = await ui.ask(`¿Dormir hasta mañana? (${clock()})`, ['Dormir', 'No']);
  if (i !== 0) return;
  S.flags.sleeping = true; sfx('close');
  const p = S.player; let dream = false;
  await transition('sleep', async () => {
    const cur = S.min; const mins = cur < 360 ? 420 - cur : 1440 - cur + 420; advance(mins); S.flags.sleeping = false;
    p.hp = p.hpMax; p.mp = p.mpMax; S.ailments = S.ailments.filter((a) => a !== 'cansancio');
    if (Math.random() < 0.06 && !S.pet) dream = true;
    if (dream) { await ui.say('Sueñas que algo enorme y negro se te sienta en el pecho. No puedes respirar... (La Pesanta...)', { expr: 'miedo' }); p.hp = Math.round(p.hpMax * 0.7); if (!S.known.pesanta) { S.known.pesanta = 1; learn('arc', 1, 'la Pesanta'); } }
    await dayCard();
  }, { dur: 46, durIn: 30 });
  if (S.flags.spouse) { const sp = NPC_BY_ID[S.flags.spouse]; await ui.say(`${sp.name} ya ha preparado el desayuno. «Buenos días, dormilón${S.player.sex === 'f' ? 'a' : ''}».`); changeRel(sp, 1, true); }
  save(); ui.toast('Partida guardada', '#c8e0ff', 'guardar');
  await G.hooks.morning?.();
}
// Tarjeta del nuevo día sobre negro: día, fecha, estación, clima y fiesta
export function dayCard() {
  const f = G.hooks.festivalToday?.(); const wk = weatherToday(); sfx('banner');
  return ui.custom({ t: 0, update() { if (this.t > 150 || (this.t > 30 && (input.pressed('A') || input.pressed('B')))) this.done = true; },
    draw(ctx, fr) {
      ctx.fillStyle = '#0c0812'; ctx.fillRect(0, 0, 240, 160);
      const k = Math.min(1, this.t / 18), out = this.t > 132 ? (this.t - 132) / 18 : 0; const a = Math.max(0, k - out);
      ctx.globalAlpha = a;
      const big = `Día ${S.day}`; drawBig(ctx, big, 120 - bigWidth(big, 3) / 2, 34 - Math.round((1 - ease.outBack(k)) * 12), '#fff0c8', '#3a2228', 3);
      const l2 = `${weekday()} · ${dayOfSeason()} de ${SEASONS[season()]}`; drawText(ctx, l2, Math.round(120 - textWidth(l2) / 2), 84, '#f0b030');
      const si = icon(['primavera', 'verano', 'otono', 'invierno'][season()]), wi = icon({ sol: 'sol', nubes: 'nube', lluvia: 'lluvia', tormenta: 'lluvia', niebla: 'niebla', nieve: 'nieve' }[wk]);
      if (si) ctx.drawImage(si, 102, 98); if (wi) ctx.drawImage(wi, 126, 98);
      const wt = { sol: 'Soleado', nubes: 'Nublado', lluvia: 'Lluvia', tormenta: 'Tormenta', niebla: 'Niebla', nieve: 'Nieve' }[wk] || ''; drawText(ctx, wt, Math.round(120 - textWidth(wt) / 2), 114, '#c8b8d8');
      if (f) { const s2 = `★ ${f.name} ★`; drawText(ctx, s2, Math.round(120 - textWidth(s2) / 2), 132, '#ff9ac8'); }
      ctx.globalAlpha = 1;
    } });
}
async function stash() {
  const i = await ui.choose(['Guardar', 'Sacar', 'Nada'], { cancel: 2, title: 'Arcón' });
  if (i === 0) { const inv = Object.keys(S.inv).filter((k) => ITEMS[k]?.type !== 'clave'); if (!inv.length) return; const j = await ui.choose([...inv.map((k) => ({ label: ITEMS[k].name, right: `×${S.inv[k]}`, icon: itemIco(k) })), 'Volver'], { cancel: inv.length, max: 6 }); if (j < inv.length) { const k = inv[j]; const n = S.inv[k]; addItem(k, -n); S.stash[k] = (S.stash[k] || 0) + n; } }
  if (i === 1) { const st = Object.keys(S.stash); if (!st.length) return ui.say('El arcón está vacío.'); const j = await ui.choose([...st.map((k) => ({ label: ITEMS[k].name, right: `×${S.stash[k]}`, icon: itemIco(k) })), 'Volver'], { cancel: st.length, max: 6 }); if (j < st.length) { const k = st[j]; addItem(k, S.stash[k]); delete S.stash[k]; } }
}

// ───────────── Alquimia ─────────────
async function alchemy() {
  const herbs = Object.keys(S.inv).filter((k) => ['hierba', 'seta', 'material', 'regalo', 'cultivo'].includes(ITEMS[k]?.type) && !['anillo', 'libro_versos'].includes(k));
  if (herbs.length < 2) return ui.say('Un caldero. Necesitas al menos dos ingredientes distintos.');
  const a = await ui.choose([...herbs.map((k) => ({ label: ITEMS[k].name, right: `×${S.inv[k]}`, icon: itemIco(k), hint: ITEMS[k].desc })), 'Nada'], { cancel: herbs.length, title: 'Primer ingrediente', max: 6 }); if (a === herbs.length) return;
  const rest = herbs.filter((k) => k !== herbs[a]);
  const b = await ui.choose([...rest.map((k) => ({ label: ITEMS[k].name, right: `×${S.inv[k]}`, icon: itemIco(k), hint: ITEMS[k].desc })), 'Nada'], { cancel: rest.length, title: 'Segundo ingrediente', max: 6 }); if (b === rest.length) return;
  const ins = [herbs[a], rest[b]].sort();
  const rec = RECIPES.find((r) => r.in.join() === ins.join());
  addItem(ins[0], -1); addItem(ins[1], -1); advance(30);
  const known = rec && S.recipes[rec.out];
  if (rec?.needs === 'sant_joan' && !S.flags.santJoanNight) { await ui.say('La mezcla chisporrotea y se apaga. Algo falta: quizá el momento no es el adecuado.'); addItem('brebaje'); return; }
  const r = await check('Alquimia', ['alq'], rec ? (known ? rec.dc - 4 : rec.dc) : 18, mod(stat('int')));
  if (rec && r.ok) { addItem(rec.out, r.crit ? 2 : 1); if (!known) { S.recipes[rec.out] = 1; ui.toast('¡Receta nueva!', '#f8e060'); addXP(20, 'Descubrimiento'); } else addXP(6); sfx('magic'); await ui.say(`Obtienes ${ITEMS[rec.out].name}${r.crit ? ' (x2)' : ''}.`); return; }
  if (!rec && r.ok) { await ui.say('Estos ingredientes no combinan, pero aprendes algo de sus virtudes.'); learn('alq', 1, 'experimento'); return; }
  addItem('brebaje'); await ui.say('Un humo pestilente. Te queda un brebaje turbio.');
}

// ───────────── Artesanía ─────────────
async function craft(where) {
  const list = CRAFTS.filter((c) => where === 'forja' || !['cuchillo', 'lanza', 'casco', 'azada', 'amuleto_plata'].includes(c.out));
  const lbl = (c) => ({ label: ITEMS[c.out].name, icon: itemIco(c.out), disabled: !Object.entries(c.in).every(([k, n]) => hasItem(k, n)), hint: `${Object.entries(c.in).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(' + ')}. ${ITEMS[c.out].desc}` });
  const i = await ui.choose([...list.map(lbl), 'Nada'], { cancel: list.length, title: where === 'forja' ? 'Forja' : 'Banco de trabajo', max: 6 });
  if (i === list.length) return;
  const c = list[i]; for (const [k, n] of Object.entries(c.in)) addItem(k, -n); advance(60);
  const r = await check('Artesanía', ['art'], c.dc, mod(stat('fue')) > 0 && where === 'forja' ? 1 : 0);
  if (r.ok) { addItem(c.out); sfx('good'); addXP(8 + c.dc, 'Creas algo'); await ui.say(`Has hecho: ${ITEMS[c.out].name}.`); if (r.crit) learn('art', 1, 'obra maestra'); }
  else { await ui.say('Se te tuerce el trabajo y echas a perder parte del material.'); for (const [k, n] of Object.entries(c.in)) if (n > 1) addItem(k, 1); }
}

// ───────────── Iglesias ─────────────
async function church(b) {
  const seu = b?.variant === 'seu';
  const opts = ['Rezar', seu ? 'Confesarse (10 d.)' : 'Dar limosna (5 d.)', 'Pedir la bendición', 'Irse'];
  const i = await ui.choose(opts, { cancel: 3, title: seu ? 'La Seu' : 'Santa María de la Mar' });
  if (i === 0) {
    advance(20);
    if (S.flags.prayed === S.day) return ui.say('Rezas en silencio.');
    S.flags.prayed = S.day; S.rep[seu ? 'seu' : 'mar'] += 1; S.player.mp = Math.min(S.player.mpMax, S.player.mp + 4); addXP(3, 'Oración');
    if (S.player.race === 'tiefling' && seu) { await ui.say('Unas beatas se apartan de ti y cuchichean. Una señala tus cuernos.'); S.rep.seu -= 1; return; }
    return ui.say(seu ? 'El incienso pesa. Las bóvedas parecen mirarte desde muy arriba.' : 'La luz entra por el rosetón y lo tiñe todo de miel. Aquí se respira.');
  }
  if (i === 1) {
    const n = seu ? 10 : 5; if (S.money < n) return ui.say('No te llega.');
    S.money -= n; S.rep[seu ? 'seu' : 'mar'] += 2; S.rep.pagano -= seu ? 1 : 0; addXP(4);
    if (seu) { S.ailments = S.ailments.filter((a) => a !== 'maldicion'); return ui.say('«Ego te absolvo.» Sales más ligero... y más pobre.'); }
    return ui.say('Mosén Jaume te sonríe desde el altar. «Los bastaixos te lo agradecen».');
  }
  if (i === 2) {
    const r = await check('Fe (ESPÍRITU)', ['esp'], seu ? 14 : 10, Math.floor(S.rep[seu ? 'seu' : 'mar'] / 10));
    if (r.ok) { S.flags.blessed = S.day; S.player.hp = S.player.hpMax; if (!S.player.spells.includes('bendicion') && r.crit) { S.player.spells.push('bendicion'); ui.toast('Conjuro: Bendición', '#f8e060'); } return ui.say('Recibes la bendición. Te sientes en paz: PV al máximo.'); }
    return ui.say('No sientes nada. Quizá el problema no es el cura.');
  }
}
async function holyWater(b) {
  if (b?.variant === 'mar' && S.flags.holy !== S.day) { S.flags.holy = S.day; addItem('agua_bendita'); return ui.say('Llenas una redoma con agua bendita de la pila.'); }
  return ui.say('Te santiguas con agua de la pila.');
}

// ───────────── Altares paganos ─────────────
const GODS = {
  altar_pradera: { god: 'las Encantadas', offer: ['miel', 'cinta', 'huevo'], gift: 'nat', text: 'La tierra bebe la ofrenda. Una brisa huele a trigo maduro.' },
  altar_bosque: { god: 'el Espíritu del Dolmen', offer: ['bellota', 'muerdago', 'miel'], gift: 'arc', text: 'Algo se mueve bajo las losas. Una voz sin boca dice tu nombre.' },
  altar_rio: { god: 'las Dones d’Aigua', offer: ['peine_oro', 'concha', 'cinta'], gift: 'caz', text: 'El manantial borbotea más fuerte. En el agua ves un reflejo que no es el tuyo.' },
  templo_montana: { god: 'la Madre de las Cumbres', offer: ['miel', 'queso', 'cinta'], gift: 'esp', text: 'El viento se detiene. Por un instante, la montaña respira contigo.' },
  templo_mar: { god: 'la Señora del Mar', offer: ['concha', 'pulpo', 'perfume'], gift: 'car', text: 'Una ola rompe fuera de tiempo y moja tus pies. Es un sí.' },
};
async function pagan(b) {
  const gd = GODS[b.id]; if (!gd) return ui.say(b.name);
  await ui.say(`${b.name}. Un lugar sagrado para ${gd.god}, anterior a la cruz.`);
  const offers = gd.offer.filter((k) => hasItem(k));
  const i = await ui.choose([...offers.map((k) => `Ofrendar ${ITEMS[k].name}`), 'Meditar', 'Irse'], { cancel: offers.length + 1 });
  if (i === offers.length + 1) return;
  if (i === offers.length) { advance(20); S.player.mp = Math.min(S.player.mpMax, S.player.mp + 6); addXP(3); return ui.say('Te sientas en silencio. Recuperas algo de espíritu.'); }
  const k = offers[i]; addItem(k, -1);
  if (S.flags['offer_' + b.id] === S.day) return ui.say('Ya has ofrendado hoy aquí.');
  S.flags['offer_' + b.id] = S.day; S.rep.pagano += 3; S.rep.seu -= 1; addXP(10, 'Ofrenda');
  await ui.say(gd.text);
  if (k === 'peine_oro') { G.hooks.returnComb?.(); return; }
  if (!S.flags['blessing_' + b.id]) { S.flags['blessing_' + b.id] = 1; learn(gd.gift, 1, gd.god); }
  if (S.rep.pagano >= 15 && !S.player.spells.includes('calmar')) { S.player.spells.push('calmar'); ui.toast('Conjuro: Calmar bestia', '#f8e060'); }
}

// ───────────── Barcos ─────────────
async function boat(b) {
  if (G.map.id === 'costa') { return ui.say('Una barca varada en la arena. Huele a sal y a brea.'); }
  const i = await ui.ask('Una barca de pescadores. Por unas monedas te llevan por la costa.', ['A la costa del Besós (8 d.)', 'Pescar mar adentro (15 d.)', 'Nada']);
  if (i === 0) { if (S.money < 8) return ui.say('No te llega.'); S.money -= 8; sfx('splash'); await transition('wipe', () => { advance(60); enterMap('costa', 28, 29, 'up'); }, { dir: 'right', dur: 26 }); return; }
  if (i === 1) { if (S.money < 15) return ui.say('No te llega.'); S.money -= 15; advance(120); return fish('costa', true); }
}

// ───────────── Casillas: recolectar, pescar, cultivar ─────────────
const FORAGE = {
  pradera: [['romero', 3], ['tomillo', 3], ['hiperico', 1, [1]], ['adelfa', 1], ['huevo', 1], ['trigo', 1, [1]], ['uva', 1, [2]], ['rosa', 1, [0]]],
  bosque: [['bellota', 4, [2, 3]], ['rovellon', 2, [2]], ['cep', 1, [2]], ['oronja', 1, [1, 2]], ['oronja_verde', 1, [1, 2]], ['trufa', 1, [3]], ['muerdago', 1, [3]], ['belladona', 1], ['madera', 3], ['beleno', 1], ['ruda', 1]],
  montana: [['pinones', 2], ['salvia', 2], ['ajenjo', 1], ['madera', 2], ['cep', 1, [2]], ['beleno', 1], ['miel', 1, [1]]],
  rio: [['cana', 3], ['ruda', 1], ['adelfa', 2], ['cangrejo', 1], ['hiperico', 1, [1]]],
  costa: [['concha', 3], ['romero', 2], ['pinones', 1], ['sal', 1], ['erizo_mar', 1]],
  montjuic: [['romero', 2], ['tomillo', 2], ['pinones', 1], ['hueso', 1]],
  urbano: [['pan', 0]],
};
G.hooks.tile = async (t, x, y) => {
  const m = G.map; const T = TILE[t];
  if (T?.water || t === 'f') {
    if (t === 'f') { if (S.flags.drank !== S.day) { S.flags.drank = S.day; S.player.hp = Math.min(S.player.hpMax, S.player.hp + 5); if (m.id === 'ciudad' && x === 15 && y === 12) { S.flags.canaletas = 1; return ui.say('Bebes de la fuente de Canaletas. Dicen que quien bebe de ella, siempre vuelve.'); } return ui.say('Agua fresca. +5 PV'); } return; }
    if (hasItem('cana_pescar') && m.outdoor) return fish(m.id);
    return ui.say(hasItem('cana_pescar') ? 'Aquí no pican.' : 'Agua. Sin caña no hay pesca.');
  }
  if (t === 'a' || t === 'A') return farm(x, y, t);
  if (m.outdoor && ['"', ',', 'B', 'T', 'P', 'O', 'Q', 'u', 'm', 'C', 's', 'V', 'R'].includes(t)) return forage(x, y, t);
  if (t === 'c') return ui.say('La boca de una cueva. Sólo se oye gotear.');
};
async function forage(x, y, t) {
  const m = G.map; const key = `${m.id}:${x},${y}`;
  if ((S.forage[key] || 0) > S.day) return ui.say(pick(['Aquí ya has buscado.', 'No queda nada.', 'Rebuscas... nada.']));
  S.forage[key] = S.day + 3; advance(10);
  if (t === 'V') { if (season() === 2) { addItem('uva', 2); addXP(3, 'Vendimia'); return ui.say('Coges dos racimos de uva. Nadie mira... de momento.'); } return ui.say('La viña aún no da fruto.'); }
  if (t === 'O') { if (season() >= 2) { addItem('aceitunas'); addXP(2); return ui.say('Varas el olivo: unas aceitunas.'); } return ui.say('Olivo. Las aceitunas maduran en otoño.'); }
  const r = await check('Buscar (NATURALEZA)', ['nat'], 9);
  if (!r.ok) return ui.say('No encuentras nada útil.');
  const pool = (FORAGE[m.biome] || FORAGE.pradera).filter(([, w, seas]) => w > 0 && (!seas || seas.includes(season())));
  const tot = pool.reduce((s, [, w]) => s + w, 0); let v = Math.random() * tot; let got = pool[0][0];
  for (const [k, w] of pool) { v -= w; if (v <= 0) { got = k; break; } }
  if (t === 'm' || t === 'C') got = Math.random() < 0.6 ? 'cana' : got;
  if (t === 's') got = Math.random() < 0.7 ? 'concha' : got;
  // Con poca naturaleza, la oronja verde parece oronja buena
  if (got === 'oronja_verde' && stat('nat') < 4 && !r.crit) { addItem('oronja_verde'); addXP(2); return ui.say('Encuentras una seta blanca preciosa. ¿Oronja? Eso parece.'); }
  const n = r.crit ? 2 : 1; addItem(got, n); addXP(3, 'Recolectas');
  if (got === 'miel' && total_bees_low()) { await ui.say('Hay pocas colmenas este año. La miel escasea.'); }
  return ui.say(`Encuentras: ${ITEMS[got].name}${n > 1 ? ' x2' : ''}.`);
}
function total_bees_low() { return (S.eco?.pollination ?? 1) < 0.4; }

export async function fish(mapId, sea = false) {
  const pool = fishPool(mapId); const ids = Object.keys(pool);
  if (!ids.length) return ui.say('Ni un pez. El agua está vacía.');
  // ¿Qué especie picará? Ponderada por abundancia
  const tot = ids.reduce((s2, k) => s2 + pool[k], 0); let v = Math.random() * tot; let sp = ids[0];
  for (const k of ids) { v -= pool[k]; if (v <= 0) { sp = k; break; } }
  const rain = ['lluvia', 'tormenta'].includes(weatherToday());
  advance(10 + Math.floor(Math.random() * 20));
  // Fase 1: la picada. Pulsa A cuando el corcho se hunda.
  sfx('swing');
  const hook = await ui.custom({
    t: 0, bite: 50 + Math.floor(Math.random() * (rain ? 70 : 130)), win: 20 + mod(stat('caz')) * 3, fakes: Math.random() < 0.5 ? [20 + Math.floor(Math.random() * 25)] : [],
    update() {
      this.t++;
      if (this.t === this.bite) { sfx('splash'); const P = G.player; const d2 = dirs[P.dir]; burst(P.px + 8 + d2[0] * 22, P.py + 8 + d2[1] * 22, 8, { colors: ['#e8faff', '#a8d8f0'], speed: 1.2, life: 18, ay: 0.08, layer: 'world' }); }
      if (this.fakes.includes(this.t)) sfx('tick');
      const pr = input.pressed('A');
      if (this.t < this.bite) { if (pr && this.t > 10) { this.done = true; this.result = 'early'; } return; }
      if (this.t < this.bite + this.win) { if (pr) { this.done = true; this.result = 'ok'; } return; }
      this.done = true; this.result = 'late';
    },
    draw(ctx, fr) {
      const P = G.player; const [cx, cy] = G.cam; const d2 = dirs[P.dir];
      const hx = P.px - cx + 8 + d2[0] * 6, hy = P.py - cy + 2;
      const bx = P.px - cx + 8 + d2[0] * 22, by0 = P.py - cy + 8 + d2[1] * 22;
      const biting = this.t >= this.bite; const nib = this.fakes.some((f) => this.t >= f && this.t < f + 8);
      const by = by0 + (biting ? (fr % 4 < 2 ? 3 : 1) : nib ? 1 : Math.round(Math.sin(fr / 12)));
      ctx.fillStyle = '#8a6a3a'; for (let i = 0; i <= 8; i++) ctx.fillRect(Math.round(P.px - cx + 8 + d2[0] * i), Math.round(P.py - cy + 4 - i + (d2[1] > 0 ? i * 1.5 : 0)), 1, 1);
      ctx.fillStyle = 'rgba(240,240,240,.8)'; const n = 16; for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(hx + (bx - hx) * t), Math.round(hy + (by - hy) * t + Math.sin(t * Math.PI) * (biting ? 1 : 4)), 1, 1); }
      ctx.fillStyle = '#f8f0e8'; ctx.fillRect(bx - 1, by, 3, 3); ctx.fillStyle = '#e84a4a'; ctx.fillRect(bx - 1, by - 1, 3, 2);
      if (!biting && fr % 50 < 25) ringAt(ctx, bx, by0 + 2, 3 + (fr % 50) / 8);
      if (biting) { drawOutlined(ctx, '¡PICA! (A)', bx - 22, by - 16, '#fcd456', '#1a1022'); }
      else if (fr % 90 < 60) drawOutlined(ctx, '...', bx - 4, by - 12, '#ffffff', '#1a1022');
    },
  });
  if (hook !== 'ok') return ui.say(hook === 'early' ? 'Tiras demasiado pronto y asustas al pez.' : 'Se te ha escapado el pez.');
  // Fase 2: la lucha. Mantén A para subir la zona verde y deja al pez dentro hasta llenar la barra.
  const s0 = SP[sp]; const hard = s0.rate === 'baja' ? 2 : s0.rate === 'media' ? 1 : 0; const item = s0.item;
  const zone = 22 + mod(stat('caz')) * 3 + (sea ? 2 : 0); const H0 = 96;
  sfx('ok');
  const caught = await ui.custom({
    t: 0, zy: H0 / 2 - zone / 2, zv: 0, fy: H0 / 2 - 4, fv: 0, ft: 40, prog: 0.35, target: H0 / 2,
    update() {
      this.t++;
      // zona del jugador: gravedad y empuje
      this.zv += input.held('A') ? -0.22 : 0.18; this.zv *= 0.9; this.zy += this.zv;
      if (this.zy < 0) { this.zy = 0; this.zv = 0; } if (this.zy > H0 - zone) { this.zy = H0 - zone; this.zv *= -0.3; }
      // el pez: cambia de objetivo según su bravura
      if (--this.ft <= 0) { this.target = Math.random() * (H0 - 8); this.ft = 30 + Math.random() * (60 - hard * 18); }
      this.fv += (this.target - this.fy) * (0.004 + hard * 0.003); this.fv *= 0.86 - hard * 0.02; this.fy += this.fv;
      this.fy = Math.max(0, Math.min(H0 - 8, this.fy));
      const inside = this.fy + 4 >= this.zy && this.fy + 4 <= this.zy + zone;
      this.prog += inside ? 0.0056 - hard * 0.001 : -(0.0022 + hard * 0.0008);
      if (inside && this.t % 8 === 0) sfx('tick');
      if (this.prog >= 1) { this.done = true; this.result = true; }
      if (this.prog <= 0) { this.done = true; this.result = false; }
    },
    draw(ctx, fr) {
      const x0 = 196, y0 = 22; panel(ctx, x0 - 8, y0 - 8, 44, H0 + 16, 'dark');
      ctx.fillStyle = '#10305e'; ctx.fillRect(x0, y0, 14, H0); ctx.fillStyle = '#134a86'; for (let y = 0; y < H0; y += 6) ctx.fillRect(x0, y0 + y + ((fr >> 3) % 6), 14, 1);
      const inside = this.fy + 4 >= this.zy && this.fy + 4 <= this.zy + zone;
      ctx.fillStyle = inside ? '#62c070' : '#3a8a4a'; ctx.fillRect(x0 + 1, Math.round(y0 + this.zy), 12, zone); ctx.fillStyle = '#a8f0a0'; ctx.fillRect(x0 + 1, Math.round(y0 + this.zy), 12, 1);
      const ic = itemIco(item); const wob = Math.round(Math.sin(fr / 3) * 1);
      if (ic) ctx.drawImage(ic, x0 - 1 + wob, Math.round(y0 + this.fy) - 4); else { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x0 + 3, Math.round(y0 + this.fy), 8, 6); }
      // progreso
      ctx.fillStyle = '#1a1022'; ctx.fillRect(x0 + 19, y0, 6, H0); const ph = Math.round(H0 * this.prog); ctx.fillStyle = this.prog > 0.7 ? '#fcd456' : this.prog < 0.25 ? '#e84a4a' : '#f0a030'; ctx.fillRect(x0 + 20, y0 + H0 - ph, 4, ph);
      drawOutlined(ctx, 'A', x0 + 4, y0 + H0 + 4 - 0, input.held('A') ? '#fcd456' : '#c8b8d8', '#1a1022');
      // sedal tenso
      const P = G.player; const [cx, cy] = G.cam; const d2 = dirs[P.dir]; const bx = P.px - cx + 8 + d2[0] * 22, by = P.py - cy + 8 + d2[1] * 22 + (fr % 6 < 3 ? 1 : 0);
      ctx.fillStyle = 'rgba(240,240,240,.9)'; for (let i = 0; i <= 14; i++) { const t = i / 14; ctx.fillRect(Math.round(P.px - cx + 8 + d2[0] * 6 + (bx - (P.px - cx + 8 + d2[0] * 6)) * t), Math.round(P.py - cy + 2 + (by - (P.py - cy + 2)) * t), 1, 1); }
      if (fr % 10 === 0) burst(bx + cx, by + cy, 2, { colors: ['#e8faff'], speed: 0.8, life: 12, ay: 0.06, layer: 'world' });
    },
  });
  if (!caught) return ui.say('¡El sedal se afloja! El pez se ha soltado.');
  takeFish(mapId, sp); addItem(item); sfx('splash'); sfx('item'); addXP(5 + hard * 4, 'Pesca');
  S.known['sp:' + sp] = 1;
  const P = G.player; spawn({ x: P.px + 8, y: P.py - 6, vx: 0, vy: -0.8, ay: 0.03, life: 50, kind: 'sprite', img: itemIco(item), layer: 'world', fade: false });
  if (SP[sp].flagship) logEvent(`Pescas un ${ITEMS[item].name.toLowerCase()}. Quedan muy pocos.`);
  return ui.say(`¡Has pescado ${ITEMS[item].name}!`);
}
function ringAt(ctx, x, y, r) { ctx.fillStyle = 'rgba(232,250,255,.6)'; ctx.fillRect(Math.round(x - r), Math.round(y), Math.round(r * 2), 1); }
import { input } from './input.js';
import { drawText } from './font.js';
function input_pressed() { return input.pressed('A'); }
function drawTextAt(ctx, s, x, y) { drawText(ctx, s, x, y, '#f8e060', '#000'); }

// Huerto: la parcela de Agnès del Prat (casillas de tierra labrada en el Llano)
async function farm(x, y, t) {
  const key = `${G.map.id}:${x},${y}`; const f = S.farm[key];
  if (!S.flags.plot && G.map.id === 'pradera') return ui.say('Tierra de la Masía del Prat. Habla con Agnès si quieres trabajarla.');
  if (!f) {
    const seeds = Object.keys(S.inv).filter((k) => ITEMS[k]?.type === 'semilla');
    if (!seeds.length) return ui.say('Tierra labrada. Necesitas semillas.');
    if (!hasItem('azada')) return ui.say('Te hace falta una azada.');
    const i = await ui.choose([...seeds.map((k) => `${ITEMS[k].name} x${S.inv[k]}`), 'Nada'], { cancel: seeds.length, title: 'Sembrar' });
    if (i === seeds.length) return;
    addItem(seeds[i], -1); S.farm[key] = { seed: seeds[i], day: S.day, water: S.day }; advance(15); addXP(3, 'Siembras');
    return ui.say(`Siembras ${ITEMS[seeds[i]].name.toLowerCase()}. Riégalo cada día.`);
  }
  const it = ITEMS[f.seed]; const grown = Math.min(it.days, (f.grow || 0));
  if (grown >= it.days) {
    const r = await check('Cosechar (NATURALEZA)', ['nat'], 8);
    const dmg = S.eco?.cropDamage || 0; const pol = S.eco?.pollination ?? 1;
    let n = 1 + (r.ok ? 1 : 0) + (r.crit ? 1 : 0); n = Math.max(1, Math.round(n * (1 - dmg) * (f.seed === 'sem_alcachofa' ? 0.7 + pol * 0.3 : 1)));
    addItem(it.grows, n); delete S.farm[key]; addXP(10, 'Cosecha');
    if (dmg > 0.2) await ui.say('Los jabalíes y los ratones han hecho destrozos en el huerto.');
    return ui.say(`Cosechas ${n} × ${ITEMS[it.grows].name}.`);
  }
  if (f.water === S.day) return ui.say(`${it.name.replace('Semillas de ', '').replace('Plantel de ', '')}: ${grown}/${it.days} días. Ya está regado.`);
  f.water = S.day; addXP(1); advance(5); return ui.say(`Riegas. (${grown}/${it.days} días)`);
}

// ───────────── Animales ─────────────
G.hooks.animal = async (e) => {
  const s = SP[e.sp]; const a = e.a; const cria = a.age < s.mature;
  const known = S.known['sp:' + e.sp];
  const opts = ['Observar', 'Cazar', 'Calmar', s.plan === 'enjambre' ? 'Buscar miel' : null, 'Dejarlo'].filter(Boolean);
  const i = await ui.choose(opts, { cancel: opts.length - 1, title: known ? s.name : '¿Qué animal es?' });
  const o = opts[i];
  if (o === 'Observar') {
    const r = await check('Observar (NATURALEZA)', ['nat'], 8);
    if (r.ok) {
      S.known['sp:' + e.sp] = Math.max(1, known || 0);
      const n = count(G.map.id, e.sp);
      await ui.say(`${s.name}, ${a.sex === 'm' ? 'macho' : 'hembra'}${cria ? ', cría' : ''}. ${dietText(s)} Hay unos ${n} en esta zona.`);
      if (!S.known['obs:' + e.sp]) { S.known['obs:' + e.sp] = 1; addXP(6, 'Nueva especie'); }
    } else await ui.say('Se mueve demasiado rápido para verlo bien.');
    return;
  }
  if (o === 'Cazar') { await fight(animalEnemy(e)); return; }
  if (o === 'Calmar') { const en = animalEnemy(e); const r = await check('Calmar (NATURALEZA + CARISMA)', ['nat', 'car'], 8 + s.size * 3); if (r.ok) { e.calm = true; await ui.say(`${s.name} se deja acercar.`); addXP(5); if (s.size <= 1 && !S.pet && s.plan !== 'enjambre' && s.plan !== 'serpiente') { const j = await ui.ask('¿Llevártelo contigo?', ['Sí', 'No']); if (j === 0) { const L = S.eco.maps[G.map.id]; L.splice(L.indexOf(a), 1); e.gone = true; S.pet = { sp: e.sp, name: s.name, since: S.day }; addXP(15, 'Mascota'); } } } else await ui.say('Se asusta.'); return; }
  if (o === 'Buscar miel') {
    const r = await check('Sacar miel (NATURALEZA)', ['nat'], 12, hasItem('sueno') ? 4 : 0);
    if (r.ok) { addItem('miel'); if (r.crit) addItem('cera'); addXP(5, 'Miel'); return ui.say('Sacas un panal sin que te piquen demasiado.'); }
    S.player.hp = Math.max(1, S.player.hp - 6); return ui.say('¡Ay! ¡Ay! ¡AY! Las abejas te persiguen. (-6 PV)');
  }
};
function dietText(s) { if (s.diet === 'veg') return 'Come hierba, semillas o frutos.'; const prey = s.diet.map((d) => SP[d]?.name?.toLowerCase()).filter(Boolean).slice(0, 3); return `Caza ${prey.join(', ')}.`; }
G.hooks.pet = async (e) => { const i = await ui.ask(`Tu ${S.pet.name.toLowerCase()} te mira con cariño.`, ['Acariciar', 'Soltarlo en libertad', 'Nada']); if (i === 0) { addXP(1); ui.toast('♥'); } if (i === 1) { const L = S.eco.maps[G.map.id]; if (L) L.push({ id: Date.now(), sp: S.pet.sp, sex: Math.random() < 0.5 ? 'm' : 'f', age: 100, hunger: 0 }); S.pet = null; e.gone = true; await ui.say('Se aleja sin mirar atrás. Así debe ser.'); } };

// ───────────── Encuentros ─────────────
G.hooks.encounter = async (kind, e) => {
  if (kind === 'hierba') {
    const L = S.eco?.maps[G.map.id] || []; const snakes = L.filter((a) => (a.sp === 'vibora' || a.sp === 'culebra') && SP[a.sp].act.includes(phase().id));
    if (snakes.length && Math.random() < 0.5) { const a = snakes[0]; const s = SP[a.sp]; await ui.say(`¡Pisas una ${s.name.toLowerCase()} escondida en la hierba!`); await fight({ kind: 'animal', sp: a.sp, a, name: s.name, hp: s.hp, hpMax: s.hp, atk: s.atk || 2, def: 1, esp: 1 }); return; }
    if (Math.random() < 0.4) { const got = pick(G.map.biome === 'bosque' ? ['bellota', 'madera', 'rovellon'] : ['romero', 'tomillo', 'huevo']); addItem(got); ui.toast(`Entre la hierba: ${ITEMS[got].name}`); }
    return;
  }
  if (kind === 'embiste' && e) { await ui.say(`¡${SP[e.sp].name} carga contra ti!`); await fight(animalEnemy(e)); return; }
  if (kind === 'caza' && e) { await ui.say(`Unos ojos brillan en la oscuridad... ¡${SP[e.sp].name}!`); await fight(animalEnemy(e)); return; }
  if (kind === 'pica' && e) { S.player.hp = Math.max(1, S.player.hp - 3); await ui.say('¡Una abeja te pica! (-3 PV)'); return; }
  if (kind === 'noche') {
    const fae = await import('./eco.js').then((m) => m.faeAvailable());
    const pool = ['bandido', 'bandido'];
    if (fae.quarantamaula) pool.push('quarantamaula', 'quarantamaula');
    if (fae.simiot && G.map.biome === 'bosque') pool.push('simiot', 'simiot');
    if (G.map.biome === 'pradera') pool.push('follet');
    const id = pick(pool);
    if (id === 'bandido' && S.flags.perotFriend) { await ui.say('Un silbido en la oscuridad. «Es amigo de Perot, dejadlo pasar.»'); return; }
    const intro = { bandido: '¡Un bandolero sale de entre las sombras!', quarantamaula: 'Algo enorme, negro y sin forma te corta el paso. La Quarantamaula...', simiot: 'Un ser simiesco baja de un árbol, gruñendo. ¡Un simiot!', follet: 'Un follet travieso te enreda los cordones y te reta.' }[id];
    await fight({ ...monster(id), intro }); return;
  }
};

// ───────────── Desmayos y sanatorios ─────────────
G.hooks.faint = async () => {
  S.flags.sleeping = true; let lost = 0;
  await ui.say('Se te cierran los ojos. Te desplomas de cansancio donde estás...');
  await transition('sleep', async () => {
    lost = Math.min(S.money, Math.floor(S.money * 0.1)); S.money -= lost;
    advance(360 < S.min ? 0 : 480 - S.min); S.flags.sleeping = false; S.player.hp = Math.round(S.player.hpMax * 0.6);
    await dayCard();
  }, { dur: 30, durIn: 30 });
  await ui.say(lost ? `Despiertas entumecido. Alguien te ha aligerado la bolsa: -${lost} dineros.` : 'Despiertas entumecido y con la boca seca.');
};
// Derrota: la parte que ocurre a oscuras (pasan los días y despiertas en el hospital) y la que se cuenta después
let koInfo = null;
G.hooks.knockoutPrep = (enemy) => {
  const grave = enemy.kind !== 'npc';
  const days = grave ? 2 : 1; for (let i = 0; i < days; i++) newDay();
  S.min = 9 * 60; S.player.hp = Math.round(S.player.hpMax * 0.5);
  if (grave && !S.ailments.includes('herida')) S.ailments.push('herida');
  const cost = Math.min(S.money, grave ? 30 : 10); S.money -= cost;
  enterMap('int_hosp_cruz', 7, 6, 'down');
  koInfo = { grave, days, cost };
};
G.hooks.knockoutAfter = async () => {
  const { grave, days, cost } = koInfo || { grave: false, days: 1, cost: 0 };
  await ui.say(`Despiertas en el Hospital de la Santa Cruz, ${days} día${days > 1 ? 's' : ''} después. El doctor Oller te ha cosido.${cost ? ` Te cobran ${cost} dineros.` : ''}`);
  if (grave) await ui.say('Tienes una herida que tardará en cerrarse. Pide tratamiento en un sanatorio o usa ungüentos.');
};
G.hooks.knockout = async (enemy) => { await ui.say('Todo se vuelve negro...'); G.hooks.knockoutPrep(enemy); await G.hooks.knockoutAfter(); };
// Tratamientos en los sanatorios
export async function treatment(npc) {
  const fast = npc.id === 'aleix';
  const ail = S.ailments; const hurt = S.player.hp < S.player.hpMax;
  if (!ail.length && !hurt) return ui.say(fast ? 'Estás sano. Vete, que tengo enfermos de verdad.' : 'Estás hecho un roble, hijo. Ve con Dios.');
  const days = Math.max(ail.length ? (fast ? 1 : 2) * ail.length : 0, hurt ? 1 : 0);
  const cost = fast ? 12 * Math.max(1, ail.length) : 4 * Math.max(1, ail.length);
  const i = await ui.ask(fast ? `Te puedo curar en ${days} día${days > 1 ? 's' : ''}. Cuesta ${cost} dineros. Doloroso, pero efectivo.` : `Aquí curamos despacio: ${days + 1} días de reposo, ${cost} dineros y mucho caldo.`, ['Aceptar', 'No']);
  if (i !== 0) return;
  if (S.money < cost) return ui.say('No te llega. Vuelve cuando tengas.');
  S.money -= cost; const n = fast ? days : days + 1;
  for (let k = 0; k < n; k++) newDay(); S.min = 8 * 60;
  S.ailments = []; S.player.hp = S.player.hpMax; S.player.mp = S.player.mpMax;
  if (!fast) { learn('nat', 1, 'Hermana Clara'); }
  await ui.say(fast ? `${n} día${n > 1 ? 's' : ''} después, sales como nuevo. Con alguna cicatriz más.` : `${n} días de caldo y reposo. Sales curado... y con un par de remedios aprendidos.`);
  G.hooks.afterTreatment?.();
}
