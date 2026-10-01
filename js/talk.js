// Conversación con NPCs: reacciones por raza, relación, regalos, persuasión, romance, saber, rumores, encargos y comercio.
import { S, npcState, tier, TIERS, stat, mod, addItem, hasItem, logEvent, STAT_NAME, season, dayOfSeason, phase } from './state.js';
import { ITEMS } from './data/items.js';
import { SHOPS, MARKET, MARKET_RARE } from './data/shops.js';
import { NPC_BY_ID } from './data/npcs.js';
import { ui } from './ui.js';
import { G, addXP, npcLook } from './game.js';
import { sfx } from './audio.js';
import { SP, count } from './eco.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const has = (n, ...t) => t.some((x) => n.traits.includes(x) || n.traits.includes(x + 'a') || n.traits.includes(x.replace(/o$/, 'a')));
export const g = (m, f) => (S.player.sex === 'f' ? f : m);
const P = () => S.player;

// Raza aparente: la capucha oculta los cuernos a quien no te conoce
function apparentRace(npc) {
  const p = P(); const st = npcState(npc.id);
  if (p.race === 'tiefling' && p.equip?.head === 'capucha' && !st.sawHorns) return 'humano';
  return p.race;
}
export function initialRel(npc) {
  const r = apparentRace(npc); let v = 0;
  if (r === 'elfo') { v += 15; if (has(npc, 'elfofilo', 'noble')) v += 12; }
  if (r === 'tiefling') { v -= 8; if (has(npc, 'prejuicioso')) v -= 32; if (has(npc, 'devoto')) v -= 14; if (has(npc, 'supersticioso')) v -= 14; if (has(npc, 'tolerante')) v += 10; if (has(npc, 'marginado')) v += 14; }
  if (r === 'enano') v += 8;
  if (npc.race === P().race) v += 6;
  return Math.max(-70, Math.min(40, v));
}
export function attitude(npc) {
  const r = apparentRace(npc); const rel = npcState(npc.id).rel;
  if (r === 'tiefling' && npc.race !== 'tiefling') {
    if (has(npc, 'prejuicioso') && rel < 40) return 'hostil';
    if ((has(npc, 'supersticioso') || has(npc, 'devoto')) && rel < 25) return 'miedo';
  }
  if (r === 'enano' && npc.race !== 'enano' && rel < 55 && !has(npc, 'sabio')) return 'burla';
  if (r === 'elfo' && npc.race !== 'elfo') return 'respeto';
  return 'normal';
}
const RACE_LINES = {
  respeto: () => [g('¡Oh! Un elfo. Es un honor, señor.', '¡Oh! Una elfa. Es un honor, señora.'), 'Disculpad, no os había visto. ¿En qué puedo serviros?', 'Qué porte... se nota la sangre antigua.', 'Pasad, pasad. Para vos, siempre hay sitio.'],
  miedo: () => ['¡Santa Olaia! ¡Esos cuernos...! No te acerques mucho.', '(Se santigua sin disimulo.) ¿Q-qué quieres?', 'Aparta, aparta... No traigo nada para ti.', '(Retrocede un paso y aprieta un amuleto.)'],
  hostil: () => ['Lo que faltaba: un cornudo del infierno. ¿Qué quieres?', 'Los de tu ralea deberíais estar fuera de las murallas.', 'Habla rápido, demonio, que tengo cosas que hacer.', 'Si fuera por mí, el Tribunal ya te habría visitado.'],
  burla: () => [g('¡Ja! ¿Y tú de dónde sales, de debajo de una mesa?', '¡Ja! ¿Y tú de dónde sales, de debajo de una mesa?'), '¡Mira qué barbas! ¿Vienes a la procesión de los cabezudos?', g('Hola, pequeñín... digo, ¡hola, buen enano! ¡Ja, ja!', 'Hola, pequeñina... digo, ¡hola, buena enana! ¡Ja, ja!'), '¿Te subo a un taburete para que hablemos a la misma altura?', '¡Un enano! Esto trae buena suerte, dicen. Déjame que te toque la cabeza.'],
};

function relTier(v) { return TIERS.findIndex((t, i) => v >= t[0] && (i === TIERS.length - 1 || v < TIERS[i + 1][0])); }
export function changeRel(npc, d, silent) {
  const st = npcState(npc.id); const before = relTier(st.rel);
  st.rel = Math.max(-100, Math.min(100, st.rel + d));
  const after = relTier(st.rel);
  if (!silent && d) ui.toast(`${npc.name}: ${d > 0 ? '+' : ''}${d} ♥`, d > 0 ? '#f8a0c0' : '#a0a0c0');
  if (after !== before) { ui.toast(`${npc.name} ahora: ${TIERS[after][1]}`, TIERS[after][2]); logEvent(`${npc.name}: ${TIERS[after][1]}`); }
}

// Saber: carteles y lecciones dan tercios; tres tercios = +1
export function learn(k, thirds = 1, src = '') {
  S.learned[k] = (S.learned[k] || 0) + thirds;
  let up = 0; while (S.learned[k] >= 3) { S.learned[k] -= 3; P().know[k]++; up++; }
  if (up) { sfx('good'); ui.toast(`¡${STAT_NAME[k]} +${up}!`, '#a0e0f8'); logEvent(`${STAT_NAME[k]} sube a ${P().know[k]}${src ? ' (' + src + ')' : ''}`); }
  else ui.toast(`${STAT_NAME[k]} +${'⅓⅔'[S.learned[k] - 1] || ''}`, '#a0e0f8');
  addXP(6, 'Aprendes algo');
}

// Tirada con modificadores de estadística(s)
export async function check(label, keys, dc, bonus = 0, opt = {}) {
  const m = keys.reduce((s, k) => s + mod(stat(k)), 0) + bonus;
  const r = await ui.roll(label, m, dc, opt);
  addXP(r.ok ? 4 : 2);
  return r;
}

// ───────────── Conversación ─────────────
export async function talk(e) {
  const npc = e.npc; const st = npcState(npc.id); const p = P();
  e.talking = true;
  const face = { up: 'down', down: 'up', left: 'right', right: 'left' }[G.player.dir]; e.dir = face;
  const ap = npcLook(npc);
  const say = (s) => ui.say(s, { speaker: st.met ? npc.name : '???', ap });
  try {
    if (st.rel === null) st.rel = initialRel(npc);
    if (p.race === 'tiefling' && p.equip?.head !== 'capucha') st.sawHorns = true;
    const special = G.hooks.npcSpecial?.(npc, e, say);
    if (special?.intercept) { st.met = true; await special.intercept(); return; }
    const att = attitude(npc);
    // Saludo
    if (!st.met) {
      if (att !== 'normal') await say(pick(RACE_LINES[att]()));
      await say(npc.hello[0]);
      st.met = true;
      if (npc.job !== '¿?') await ui.say(`${npc.name}. ${npc.job}.`, { speaker: npc.name, ap });
      addXP(5, 'Conoces a alguien');
    } else {
      const t = relTier(st.rel);
      if (att !== 'normal' && Math.random() < 0.35) await say(pick(RACE_LINES[att]()));
      const hl = t >= 6 ? npc.hello[2] : t >= 4 ? npc.hello[1] : st.rel < -25 ? coldLine(npc) : npc.hello[Math.random() < 0.5 ? 0 : 1];
      await say(hl);
    }
    if (st.rel <= -60 && !npc.shop) { await say(pick(['No tengo nada que hablar contigo.', 'Lárgate.', '...'])); return; }
    await menu(npc, e, say, special);
  } finally { e.talking = false; }
}
function coldLine(n) { return pick(['¿Tú otra vez? Qué quieres.', 'Hmm.', 'No tengo tiempo.', 'Di lo que tengas que decir y vete.']); }

async function menu(npc, e, say, special) {
  const st = npcState(npc.id);
  while (true) {
    const opts = [{ label: 'Charlar', f: () => chat(npc, say) }, { label: 'Preguntar…', f: () => ask(npc, say) }, { label: 'Regalar', f: () => gift(npc, say) }];
    const sh = shopFor(npc, e); if (sh) opts.push({ label: sh === 'banco' ? 'Taula de Canvi' : 'Comerciar', f: () => shop(npc, sh, say) });
    if (G.hooks.services) for (const s of G.hooks.services(npc) || []) opts.push(s);
    opts.push({ label: 'Pedir encargo', f: () => request(npc, say) });
    opts.push({ label: 'Persuadir', f: () => persuade(npc, say) });
    if (npc.romance && npc.age !== 'nino') opts.push({ label: st.partner ? 'Cariño ♥' : 'Coquetear', f: () => flirt(npc, say) });
    if (special?.options) opts.push(...special.options);
    opts.push({ label: 'Provocar', f: () => provoke(npc, e, say) });
    opts.push({ label: 'Adiós', f: null });
    const i = await ui.choose(opts.map((o) => ({ label: o.label, hint: o.hint })), { cancel: opts.length - 1 });
    const o = opts[i]; if (!o.f) { await say(pick(['Ve con Dios.', 'Hasta luego.', 'Adéu.', 'Cuídate.'])); return; }
    const r = await o.f(); if (r === 'end') return;
  }
}

function shopFor(npc, e) {
  const today = S.flags.market?.[npc.id]; if (today && ['manana', 'dia'].includes(phase().id)) return 'mercado:' + npc.id;
  if (!npc.shop) return null;
  if (npc.shop === 'genoves') return 'genoves';
  // Sólo comercia en su puesto
  const k = npc.sched?.[phase().id] || ''; if (/tendero|tabernero|medico|cambista/.test(k) || npc.shop === 'granja') return npc.shop;
  return null;
}

// ───────────── Charla ─────────────
async function chat(npc, say) {
  const st = npcState(npc.id);
  const lines = contextLines(npc);
  await say(pick(lines));
  if (st.talked !== S.day) {
    st.talked = S.day;
    let d = 2 + Math.max(0, mod(stat('car')));
    const att = attitude(npc); if (att === 'hostil') d = Math.max(1, d - 2); if (att === 'burla') d += 1;
    if (S.flags.wineBuzz === S.day) d += 1;
    changeRel(npc, d); addXP(2);
  } else await ui.say('(Ya habéis charlado hoy.)');
}
function contextLines(npc) {
  const ph = phase().id; const out = [];
  const sea = ['Qué primavera más bonita. Los vencejos han vuelto.', 'Qué calor. Ni las lagartijas salen a mediodía.', 'Ya huele a castañas. El otoño me pone melancólico.', 'Este frío se mete en los huesos.'][season()];
  out.push(sea);
  if (ph === 'noche') out.push('A estas horas no se debería andar por ahí. Ni la guardia se fía de la noche.');
  if (ph === 'manana') out.push('Buenos días. A esta hora la ciudad huele a pan.');
  if (ph === 'crepusculo') out.push('Ya cae el sol. Pronto encenderán los faroles.');
  const e = S.eco; if (e) {
    if (e.cropDamage > 0.2) out.push('Dicen que los jabalíes arrasan el Llano. El pan subirá.');
    if (e.flagRats) out.push('Hay ratas por todas partes. Mi abuela decía que así empieza la peste.');
    if (count('bosque', 'lobo') + count('montana', 'lobo') === 0) out.push('Ya no se oyen lobos en la sierra. No sé si alegrarme.');
    if (e.posidonia < 0.4) out.push('Los pescadores vuelven con las redes medio vacías.');
  }
  const t = npc.traits;
  if (t.includes('devoto') || t.includes('devota')) out.push('¿Has ido a misa este domingo? Dios lleva la cuenta.');
  if (t.includes('chismosa') || t.includes('chismoso')) out.push(pick(npc.rumor));
  if (t.includes('bromista')) out.push(pick(['¿Sabes por qué el Tibidabo es tan alto? ¡Porque el diablo quería ver a quién tentar! Ja.', '¿Qué le dijo una sardina a otra? ¡Nos vemos en la lata!', 'Un enano entra en una taberna... y el tabernero no lo ve. ¡Ja!']));
  if (t.includes('pagano') || t.includes('pagana')) out.push('La luna está creciendo. Buen tiempo para sembrar lo que quieras que dure.');
  if (t.includes('romantico') || t.includes('romantica')) out.push('¿No te parece que en esta ciudad todo el mundo está enamorado de alguien que no le corresponde?');
  if (npc.shop) out.push('El negocio va como va. Si traes buen género, te lo compro.');
  out.push(...(npc.rumor || []).slice(0, 1));
  return out;
}

// ───────────── Preguntar ─────────────
async function ask(npc, say) {
  const st = npcState(npc.id);
  const opts = ['Sobre su vida', 'Rumores', 'Enséñame algo', 'Un secreto', 'Volver'];
  const i = await ui.choose(opts, { cancel: 4 });
  if (i === 0) {
    if (st.rel >= 15) { await say(npc.bio); if (!st.bio) { st.bio = 1; addXP(4); } }
    else await say(pick(['No te conozco lo bastante para contarte mi vida.', '¿Y a ti qué te importa?', 'Quizá otro día.']));
  }
  if (i === 1) {
    const r = [...(npc.rumor || [])]; const news = S.eco?.events?.slice(0, 2) || [];
    for (const n of news) r.push('He oído que... ' + n.charAt(0).toLowerCase() + n.slice(1));
    await say(pick(r)); addXP(1);
    if (/cantera/.test(r.join(' '))) S.flags.knows_cantera = 1;
  }
  if (i === 2) {
    const L = npc.lesson; if (!L) return;
    if (st.lesson) { await say('Ya te lo conté. ¿No te acuerdas? ' + L.text.split('.')[0] + '.'); return; }
    if (st.rel < 5) { await say('¿Enseñarte? Primero habrá que conocerse.'); return; }
    await say(L.text); st.lesson = 1; learn(L.stat, 1, npc.name);
  }
  if (i === 3) {
    if (st.secret) { await say(npc.secret); return; }
    if (st.rel >= 60) { await say(npc.secret); st.secret = 1; addXP(15, 'Un secreto'); logEvent(`Secreto de ${npc.name}`); G.hooks.secret?.(npc); return; }
    if (st.rel >= 30) {
      const r = await check('Sonsacar (CARISMA)', ['car'], 16);
      if (r.ok) { await say(npc.secret); st.secret = 1; addXP(15, 'Un secreto'); G.hooks.secret?.(npc); }
      else { await say('Eso no te lo voy a contar. Todavía.'); changeRel(npc, -2); }
      return;
    }
    await say('¿Secretos? Yo no tengo secretos. Y si los tuviera, no serían para ti.');
  }
}

// ───────────── Regalos ─────────────
async function gift(npc, say) {
  const st = npcState(npc.id);
  const inv = Object.keys(S.inv).filter((k) => ITEMS[k] && ITEMS[k].type !== 'clave' || ['peine_oro', 'pluma_oca'].includes(k));
  if (!inv.length) { await ui.say('No llevas nada que regalar.'); return; }
  const i = await ui.choose([...inv.map((k) => ({ label: `${ITEMS[k].name} x${S.inv[k]}`, hint: ITEMS[k].desc })), 'Nada'], { cancel: inv.length, title: 'Regalar' });
  if (i === inv.length) return;
  const it = inv[i];
  if (st.giftDay === S.day) { await say('Ya me has hecho un regalo hoy. No me malacostumbres.'); return; }
  addItem(it, -1); st.giftDay = S.day;
  const rose = it === 'rosa' && season() === 0 && dayOfSeason() === 23;
  const r = G.hooks.giftSpecial?.(npc, it); if (r) { await r(); return; }
  if (npc.likes.includes(it)) { await say(pick(['¡Oh! ¿Para mí? ¡Me encanta!', '¡Cómo sabías que me gusta esto!', 'Esto sí que es un buen regalo. Gracias de corazón.'])); changeRel(npc, rose ? 30 : 14); if (npc.romance && rose) st.romance = (st.romance || 0) + 2; }
  else if (npc.dislikes.includes(it)) { await say(pick(['¿Esto? ¿En serio?', 'Puedes quedártelo. No, en serio: quédatelo.', 'Qué detalle tan... desafortunado.'])); changeRel(npc, -10); }
  else { await say(pick(['Gracias, qué amable.', 'Oh, gracias. Le daré buen uso.', 'Un detalle bonito.'])); changeRel(npc, rose ? 18 : 5); if (rose && npc.romance) st.romance = (st.romance || 0) + 1; }
  if (it === 'filtro' && npc.romance) { st.romance = (st.romance || 0) + 2; changeRel(npc, 10); S.rep.seu -= 5; await ui.say('(Sus ojos brillan de una forma extraña. Esto no está bien, y lo sabes.)'); }
  addXP(3);
}

// ───────────── Persuadir ─────────────
async function persuade(npc, say) {
  const st = npcState(npc.id);
  const opts = ['Rebaja en sus precios', 'Que te preste algo de dinero', 'Que te cuente algo que no debería', 'Nada'];
  const i = await ui.choose(opts, { cancel: 3, title: 'Persuadir' });
  if (i === 3) return;
  const t = relTier(st.rel); const dc = 17 - t * 1.5 + (attitude(npc) === 'hostil' ? 4 : 0);
  const r = await check('Persuadir (CARISMA)', ['car'], Math.round(dc), attitude(npc) === 'respeto' ? 2 : 0);
  if (!r.ok) { await say(pick(['No me vas a enredar con palabras bonitas.', 'Buen intento.', 'Ni lo sueñes.'])); changeRel(npc, r.fumble ? -8 : -2); return; }
  if (i === 0) { st.discount = S.day; await say('Está bien, está bien. Hoy te hago precio de amigo.'); }
  if (i === 1) {
    if (st.lent) { await say('Ya te presté una vez. ¿Me has devuelto algo?'); return; }
    const n = 10 + t * 8; S.money += n; st.lent = n; sfx('coin'); await say(`Toma ${n} dineros. Y que no se repita.`); changeRel(npc, -3);
  }
  if (i === 2) { await say(r.crit ? npc.secret : pick(npc.rumor)); if (r.crit) st.secret = 1; }
}

// ───────────── Romance ─────────────
async function flirt(npc, say) {
  const st = npcState(npc.id); const p = P();
  if (st.married) { await say(pick(['¿Sabes? Me alegro cada mañana de haberte dicho que sí.', 'Hoy he pensado en ti todo el día.', 'Vuelve pronto a casa.'])); if (st.talked !== S.day) { st.talked = S.day; changeRel(npc, 3); } return; }
  if (st.partner) {
    const opts = ['Decirle algo bonito', hasItem('anillo') ? 'Pedir matrimonio (anillo)' : { label: 'Pedir matrimonio (necesitas un anillo)', disabled: true }, 'Volver'];
    const i = await ui.choose(opts, { cancel: 2 });
    if (i === 0) { await say(pick(['Tú sí que sabes hacerme sonreír.', 'Para, que me pongo colorado. Bueno, no pares.', 'Contigo el día se me hace corto.'])); if (st.talked !== S.day) { st.talked = S.day; changeRel(npc, 4); } }
    if (i === 1) {
      if (st.rel < 85) { await say('Te quiero... pero aún no. Dame tiempo.'); return; }
      if (!S.house) { await say('¿Casarnos? ¡Sí! Pero... ¿dónde viviríamos? Consigue una casa primero.'); return; }
      addItem('anillo', -1); st.married = true; S.flags.spouse = npc.id; sfx('heart'); logEvent(`Te casas con ${npc.name}`);
      await say('Sí. Sí, sí y mil veces sí.'); addXP(80, 'Boda'); G.hooks.wedding?.(npc);
    }
    return;
  }
  if (st.rel < 20) { await say(pick(['¿Perdona? ¿Te conozco?', '(Te mira como si hubieras dicho algo en latín.)', 'Uy. No.'])); changeRel(npc, -2); return; }
  if (attitude(npc) === 'hostil' || (attitude(npc) === 'miedo' && st.rel < 50)) { await say('¿Contigo? ¿Estás loco? ¡Con esos cuernos!'); changeRel(npc, -5); return; }
  if (st.flirtDay === S.day) { await say('Ya me has dicho bastantes cosas bonitas por hoy.'); return; }
  st.flirtDay = S.day;
  const dc = 12 + (st.romance || 0) - Math.floor((st.rel - 20) / 15) + (attitude(npc) === 'burla' ? 2 : 0);
  const r = await check('Seducir (CARISMA)', ['car'], dc, S.flags.wineBuzz === S.day ? 1 : 0);
  if (r.ok) {
    st.romance = (st.romance || 0) + (r.crit ? 2 : 1); sfx('heart');
    await say(pick(['(Se ríe y baja la mirada.) Eres un peligro.', 'Qué cosas dices... sigue.', 'Me gusta cómo me miras.', 'Si lo dices así, me lo creo.']));
    changeRel(npc, 5);
    if (st.romance >= 4 && st.rel >= 60) {
      const i = await ui.ask(`${npc.name} te mira en silencio. Es el momento.`, ['Declararte', 'Aún no']);
      if (i === 0) { st.partner = true; S.flags.partner = npc.id; sfx('heart'); await say(pick(['Yo también. Desde hace tiempo.', '¿De verdad? ...Sí. Sí, quiero.', 'Pensaba que nunca me lo dirías.'])); addXP(40, 'Pareja'); logEvent(`Empiezas una relación con ${npc.name}`); }
    }
  } else { await say(pick(['Eh... no. No sé qué intentabas, pero no.', '(Una risa incómoda.)', 'Creo que no me has entendido.'])); changeRel(npc, r.fumble ? -6 : -2); }
}

// ───────────── Provocar ─────────────
async function provoke(npc, e, say) {
  const i = await ui.ask('¿Seguro? Insultar tiene consecuencias.', ['Insultar', 'Desafiar a pelear', 'Mejor no']);
  if (i === 2) return;
  const brave = has(npc, 'valiente', 'bruto', 'fuerte', 'estricto', 'orgulloso', 'bromista') || npc.faction === 'guardia';
  changeRel(npc, i === 0 ? -15 : -8);
  if (i === 0) { await say(pick(['¡¿Cómo te atreves?!', 'Esto no se me olvida.', 'Eres una vergüenza para Barcanueva.'])); S.rep.ciudad -= 1; return 'end'; }
  if (!brave) { await say('¡Socorro! ¡Guardia!'); S.rep.ciudad -= 3; if (G.map.biome === 'urbano') await G.hooks.guardFine?.(20); return 'end'; }
  await say(pick(['¿Pelea? Con mucho gusto.', 'Vas a lamentarlo.', '¡A ver qué sabes hacer!']));
  await G.hooks.brawl?.(npc, e);
  return 'end';
}

// ───────────── Encargos ─────────────
const WANTS = {
  taberna: ['pescado', 'carne', 'uva', 'miel', 'trigo'], t_hierbas: ['romero', 'ruda', 'hiperico', 'muerdago', 'rovellon'], t_forja: ['hierro', 'madera', 'colmillo'],
  t_sastre: ['piel', 'lana', 'pluma', 'piel_fina'], t_libros: ['tinta_sepia', 'pluma'], t_alquimia: ['belladona', 'beleno', 'veneno', 'trufa'], t_pan: ['trigo', 'huevo', 'miel', 'pinones'],
  t_velas: ['cera', 'miel'], t_pesca: ['sardina', 'dorada', 'pulpo', 'lubina'], t_ceramica: ['madera'], hospital: ['romero', 'hiperico', 'salvia'], granja: ['sem_trigo', 'madera'],
};
async function request(npc, say) {
  const st = npcState(npc.id);
  if (st.req && !st.req.done) {
    const it = st.req.item; const n = st.req.n;
    if (hasItem(it, n)) {
      addItem(it, -n); const pay = st.req.pay; S.money += pay; sfx('coin');
      await say(`¡${ITEMS[it].name}! Justo lo que necesitaba. Toma ${pay} dineros.`);
      changeRel(npc, 8); addXP(25, 'Encargo cumplido'); st.req.done = true; S.rep.ciudad += 1; logEvent(`Encargo cumplido para ${npc.name}`);
    } else await say(`¿Me traes ${n} ${ITEMS[it].name.toLowerCase()}? Aún lo espero.`);
    return;
  }
  if (st.rel < 0) { await say('¿Encargarte algo a ti? No me fío.'); return; }
  const pool = WANTS[npc.shop] || (npc.faction === 'guardia' ? ['carne_asada', 'vino'] : npc.faction === 'pagano' ? ['concha', 'miel', 'muerdago'] : npc.faction === 'seu' ? ['cera', 'agua_bendita'] : ['pan', 'pescado', 'carne', 'madera', 'huevo']);
  const it = pick(pool); const n = 1 + Math.floor(Math.random() * 3); const pay = Math.round((ITEMS[it].price || 5) * n * 1.6 + 10);
  st.req = { item: it, n, pay, day: S.day };
  await say(`Pues mira, sí. Tráeme ${n} × ${ITEMS[it].name.toLowerCase()} y te daré ${pay} dineros.`);
  logEvent(`Encargo: ${n} ${ITEMS[it].name} para ${npc.name}`);
}

// ───────────── Comercio ─────────────
export function priceBuy(base, npc) { const rel = npc ? npcState(npc.id).rel || 0 : 0; let f = 1.25 - 0.03 * (stat('com') + stat('car')) - rel / 400; if (npc && npcState(npc.id).discount === S.day) f -= 0.2; if (npc && attitude(npc) === 'hostil') f += 0.25; if (npc && attitude(npc) === 'respeto') f -= 0.05; return Math.max(1, Math.round(base * Math.max(0.55, f))); }
export function priceSell(base, npc) { const rel = npc ? npcState(npc.id).rel || 0 : 0; const f = 0.4 + 0.03 * (stat('com') + stat('car')) + rel / 500; return Math.max(1, Math.round(base * Math.min(0.95, f))); }

function marketStock(npc) {
  const m = S.flags.market?.[npc.id]; return m ? m.items : [];
}
async function shop(npc, id, say) {
  if (id === 'banco') return bank(npc, say);
  const isMarket = id.startsWith('mercado:'); const def = isMarket ? { items: marketStock(npc), buys: ['*'] } : SHOPS[id];
  let items = [...def.items]; if (def.seasonal) items.push(...def.seasonal[season()]);
  items = [...new Set(items)].filter((k) => ITEMS[k]);
  while (true) {
    const i = await ui.choose(['Comprar', 'Vender', 'Salir'], { cancel: 2, title: isMarket ? 'Puesto del mercado' : def.name });
    if (i === 2) return;
    if (i === 0) {
      while (true) {
        const mk = def.markup || 1;
        const j = await ui.choose([...items.map((k) => ({ label: `${ITEMS[k].name}  ${priceBuy(ITEMS[k].price * mk, npc)} d.`, hint: ITEMS[k].desc + (S.inv[k] ? ` (tienes ${S.inv[k]})` : '') })), 'Volver'], { cancel: items.length, title: `Dineros: ${S.money}`, max: 6 });
        if (j === items.length) break;
        const k = items[j]; const pr = priceBuy(ITEMS[k].price * mk, npc);
        if (S.money < pr) { sfx('no'); await ui.say('No te llega el dinero.'); continue; }
        S.money -= pr; addItem(k); sfx('coin'); ui.toast(`+1 ${ITEMS[k].name}`); addXP(1);
        if (ITEMS[k].type === 'libro' && !S.flags['read_' + k]) ui.toast('Léelo desde la mochila.');
      }
    } else {
      while (true) {
        const inv = Object.keys(S.inv).filter((k) => ITEMS[k] && ITEMS[k].type !== 'clave' && (def.buys.includes('*') || def.buys.includes(k) || def.buys.includes(ITEMS[k].type)));
        if (!inv.length) { await ui.say('No tienes nada que aquí te compren.'); break; }
        const j = await ui.choose([...inv.map((k) => ({ label: `${ITEMS[k].name} x${S.inv[k]}  ${priceSell(ITEMS[k].price, npc)} d.`, hint: ITEMS[k].desc })), 'Volver'], { cancel: inv.length, title: `Vender · ${S.money} d.`, max: 6 });
        if (j === inv.length) break;
        const k = inv[j]; const pr = priceSell(ITEMS[k].price, npc);
        addItem(k, -1); S.money += pr; sfx('coin'); addXP(1);
      }
    }
  }
}
async function bank(npc, say) {
  const loan = S.flags.loan;
  const opts = [loan ? `Devolver préstamo (${loan.owe} d.)` : 'Pedir préstamo de 200 d.', 'Vender plata y joyas', 'Salir'];
  const i = await ui.choose(opts, { cancel: 2, title: 'Taula de Canvi' });
  if (i === 0) {
    if (loan) { if (S.money < loan.owe) { await say('No tienes suficiente. El plazo corre.'); return; } S.money -= loan.owe; S.flags.loan = null; changeRel(npc, 8); S.rep.gremios += 2; await say('Deuda saldada. Da gusto tratar con gente formal.'); return; }
    if ((npcState(npc.id).rel || 0) < 10 && S.rank < 1) { await say('No te conozco lo suficiente para prestarte nada. Vuelve cuando tengas nombre en la ciudad.'); return; }
    S.money += 200; S.flags.loan = { owe: 260, due: S.day + 28 }; sfx('coin'); await say('Doscientos dineros. Me devolverás doscientos sesenta en veintiocho días. Y si no... bueno, no quieras saberlo.');
  }
  if (i === 1) return shop(npc, 'genoves', say);
}

// ───────────── Mercado del día ─────────────
export function rollMarket() {
  S.flags.market = {};
  const vendors = ['agnes', 'rosa_ferrer', 'merce', 'sebastia', 'esteve', 'laia_puig', 'rafel', 'enriqueta', 'andreu', 'quim'].filter((id) => NPC_BY_ID[id]);
  const chosen = vendors.sort(() => Math.random() - 0.5).slice(0, 3);
  if (S.flags.travel?.lanfranco) chosen.push('lanfranco');
  if (S.flags.travel?.madrona) chosen.push('madrona');
  chosen.slice(0, 6).forEach((id, i) => {
    const prof = MARKET[Math.floor(Math.random() * MARKET.length)];
    const items = prof.items.sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 3));
    if (Math.random() < 0.3) items.push(MARKET_RARE[Math.floor(Math.random() * MARKET_RARE.length)]);
    S.flags.market[id] = { place: 'mercado' + i, items, who: prof.who };
  });
}

G.hooks.talk = talk;
