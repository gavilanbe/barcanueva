// Calendario festivo, misiones con guion, ascenso social, servicios especiales de NPCs y secretos.
import { S, npcState, addItem, hasItem, logEvent, season, dayOfSeason, phase, stat, mod, SEASONS, save } from './state.js';
import { ITEMS, SPELLS } from './data/items.js';
import { NPC_BY_ID, NPCS } from './data/npcs.js';
import { PLACES, BUILDINGS } from './world.js';
import { SP, count, total } from './eco.js';
import { ui } from './ui.js';
import { drawText } from './font.js';
import { G, addXP, enterMap, advance, npcTarget } from './game.js';
import { sfx } from './audio.js';
import { check, learn, changeRel, rollMarket, g, initialRel } from './talk.js';
import { sleep, treatment } from './activities.js';
import { fight, npcEnemy, monster } from './battle.js';
import { hash2 } from './util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const N = (id) => NPC_BY_ID[id];

// ───────────── Calendario (año = 4 estaciones × 28 días) ─────────────
export const FESTIVALS = [
  { s: 0, d: 3, name: 'Romería de Sant Medir', place: ['ermita_f', 'pastos', 'mirador'], ph: ['manana', 'dia'], text: 'Hoy es Sant Medir. Los de Gràcia suben a la ermita del Montseñal lanzando caramelos y habas.' },
  { s: 0, d: 23, name: 'Sant Jordi', place: ['rambla_n', 'rambla_s', 'canaletas', 'plaza_seu', 'sant_jaume'], ph: ['manana', 'dia', 'tarde'], text: 'Día de Sant Jordi: la Rambla se llena de rosas. Quien ama, regala una. (Las rosas valen la mitad y enamoran el doble.)' },
  { s: 0, d: 26, name: 'Corpus: l’ou com balla', place: ['plaza_seu', 'plaza_seu2', 'rambla_n'], ph: ['manana', 'dia'], text: 'Corpus. En el claustro de la Seu un huevo baila sobre el chorro de la fuente. Por la tarde salen los gigantes, la Mulassa y el Àliga.' },
  { s: 1, d: 23, name: 'Revetlla de Sant Joan', place: ['playa', 'barracas', 'plaza_mar', 'fossar', 'menhir'], ph: ['crepusculo', 'noche'], text: 'La noche más corta. Hogueras en las plazas y en la playa del Besós, coca y petardos. Dicen que esta noche las Encantadas salen de la Piedra Larga.', sj: true },
  { s: 2, d: 11, name: 'Sant Martí', place: ['masia_ferrer_f', 'masia_prat_f', 'mercado'], ph: ['manana', 'dia'], text: 'Sant Martí: día de matanza en las masías. Butifarras para todo el invierno.' },
  { s: 2, d: 24, len: 4, name: 'Fiesta Mayor de la Mercè', place: ['plaza_mar', 'fossar', 'plaza_seu', 'rambla_s', 'muelle'], ph: ['dia', 'tarde', 'crepusculo'], text: 'La Mercè, patrona que libró a la ciudad de la langosta. Gigantes, castells y, al anochecer, ball de diables con fuego de verdad.' },
  { s: 2, d: 28, name: 'Castanyada y Noche de Ánimas', place: ['home'], ph: ['crepusculo', 'noche'], text: 'Noche de Todos los Santos. Castañas, panellets y campanas toda la noche para que las ánimas no se pierdan. Dicen que el Comte Arnau cabalga.' },
  { s: 3, d: 12, name: 'Santa Olaia de las Trece', place: ['plaza_seu', 'plaza_seu2', 'seu:banco'], ph: ['manana', 'dia'], text: 'Santa Olaia, patrona de la Seu. Trece campanadas y procesión: trece ocas, trece años, trece martirios.' },
  { s: 3, d: 17, name: 'Sant Antoni: los Tres Tombs', place: ['calle_ancha', 'calle_ancha2', 'puerta_n', 'rambla_n'], ph: ['manana', 'dia'], text: 'Sant Antoni Abad: carros y bestias dan tres vueltas al barrio para recibir la bendición. Los animales se bendicen gratis.' },
  { s: 3, d: 21, len: 3, name: 'Carnestoltes', place: ['rambla_n', 'rambla_s', 'canaletas', 'mercado'], ph: ['tarde', 'crepusculo', 'noche'], text: 'Carnaval: reina el Rey Carnal. Máscaras por la Rambla; ni los guardias saben quién es quién. (Hasta el Tribunal hace la vista gorda.)' },
  { s: 3, d: 25, name: 'Nadal: el Tió', place: ['home'], ph: ['tarde', 'crepusculo', 'noche'], text: 'Navidad. En cada casa se golpea al Tió con un palo para que cague turrones.' },
  { s: 3, d: 28, name: 'L’Home dels Nassos', place: ['rambla_n', 'canaletas', 'sant_jaume'], ph: ['dia', 'tarde'], text: 'Último día del año: dicen que por la Rambla pasea l’Home dels Nassos, que tiene tantas narices como días quedan. Hoy, una.' },
];
export function festivalToday(day = S.day) {
  const s = season(day), d = dayOfSeason(day);
  return FESTIVALS.find((f) => f.s === s && d >= f.d && d < f.d + (f.len || 1));
}

// ───────────── Horarios alterados: fiestas, mercado, guardia del castillo ─────────────
G.hooks.override = (npc, ph) => {
  if (npc.id === 'arnau_guardia') return S.flags.castle_ok ? 'castillo_lado' : 'castillo_bloqueo';
  const mk = S.flags.market?.[npc.id]; if (mk && (ph === 'manana' || ph === 'dia')) return mk.place;
  if (npc.id === 'lluna' && S.flags.lluna_home && ph === 'noche') return S.house ? S.house + ':cama' : undefined;
  if (S.flags.spouse === npc.id && S.house && (ph === 'crepusculo' || ph === 'noche')) return S.house + ':' + (ph === 'noche' ? 'cama' : 'mesa');
  const f = festivalToday();
  if (f && f.ph.includes(ph) && !npc.traveler && !npc.shop && !['castillo', 'seu', 'cuartel'].includes(npc.home) && hash2(npc.id.length * 31 + npc.name.length, S.day, 9) < 0.55) return pick2(f.place, npc.id);
  if (npc.id === 'guifre' && ph === 'crepusculo' && S.flags.guifre_grounded) return 'castillo:heredero';
  return undefined;
};
function pick2(arr, seed) { return arr[Math.floor(hash2(seed.length, S.day, 13) * arr.length)]; }

// ───────────── Nuevo día ─────────────
G.hooks.newDay = (news) => {
  rollMarket();
  // Huerto: crece lo regado ayer
  for (const f of Object.values(S.farm)) if (f.water >= S.day - 1) f.grow = (f.grow || 0) + 1;
  // Préstamo
  if (S.flags.loan && S.day > S.flags.loan.due && !S.flags.loan.warned) { S.flags.loan.warned = true; S.flags.loan.owe = Math.round(S.flags.loan.owe * 1.3); news.push('La Taula de Canvi reclama tu deuda con recargo.'); S.rep.gremios -= 5; }
  // Heridas y veneno
  if (S.ailments.includes('veneno')) S.player.hp = Math.max(1, S.player.hp - 5);
  if (S.ailments.includes('herida') && Math.random() < 0.15) S.ailments = S.ailments.filter((a) => a !== 'herida');
  // Pacto: el precio se cobra
  if (S.flags.pact) S.player.stats.esp = Math.max(0, S.player.stats.esp - (Math.random() < 0.1 ? 1 : 0));
  S.flags.santJoanNight = false;
  const f = festivalToday(); if (f) { S.flags.festToday = f.name; news.unshift(`Hoy: ${f.name}.`); } else S.flags.festToday = null;
  if (f?.sj) S.flags.santJoanNight = true;
  if (f?.name === 'L’Home dels Nassos') S.flags.travel.home_nassos = 'rambla_n';
  checkRank(news);
};
G.hooks.morning = async () => {
  const f = festivalToday(); if (f && S.flags.festShown !== S.day) { S.flags.festShown = S.day; await ui.say(`★ ${f.name} ★\n${f.text}`); }
};
G.hooks.enterMap = (m) => { G.mapLabel = { name: m.name, t: 90 }; const f = festivalToday(); if (f && S.flags.festShown !== S.day && m.outdoor) { S.flags.festShown = S.day; setTimeout(() => ui.say(`★ ${f.name} ★\n${f.text}`), 50); } };
G.hooks.phase = (ph) => { if (ph === 'noche' && S.flags.festToday === 'Revetlla de Sant Joan') ui.toast('Arden las hogueras de Sant Joan', '#f8a040'); };

// ───────────── Ascenso social ─────────────
export const RANKS = ['Forastero', 'Vecino', 'Ciudadano honrado', 'Prohombre', 'Jurado del Consejo de Ciento', 'Caballero de la Corte'];
function checkRank(news) {
  const r = S.rep; let rank = S.rank;
  if (rank < 1 && (S.house || r.ciudad >= 10)) rank = 1;
  if (rank === 1 && r.ciudad >= 25 && S.player.level >= 3) rank = 2;
  if (rank === 2 && S.flags.aval) rank = 3;
  if (rank === 3 && S.flags.jurado) rank = 4;
  if (S.flags.knight) rank = 5;
  if (rank !== S.rank) { S.rank = rank; news.push(`Ahora eres ${RANKS[rank]} de Barcanueva.`); logEvent(`Rango: ${RANKS[rank]}`); addXP(40); }
}

// ───────────── Servicios por NPC ─────────────
G.hooks.services = (npc) => {
  const st = npcState(npc.id); const o = [];
  if (npc.id === 'aleix' || npc.id === 'clara') o.push({ label: 'Tratamiento', hint: npc.id === 'aleix' ? 'Rápido, caro y doloroso.' : 'Lento, barato y con cariño.', f: () => treatment(npc) });
  if (npc.shop === 'taberna' && /tabernero/.test(npc.sched[phase().id])) {
    o.push({ label: 'Alquilar cama (10 d.)', hint: 'Dormir aquí hasta mañana.', f: async () => { if (S.money < 10) return ui.say('No te llega.'); S.money -= 10; S.flags.inn = npc.home; await sleep(); } });
    o.push({ label: 'Invitar a una ronda (15 d.)', hint: 'Todos los presentes te lo agradecerán.', f: () => round(npc) });
  }
  if (npc.id === 'agnes' && !S.flags.plot) o.push({ label: 'Pedir un trozo de huerta', f: async () => { if (st.rel < 10) return ui.say(`¿Mi tierra? A ${g('un desconocido', 'una desconocida')}, no.`); S.flags.plot = 1; addXP(10); await ui.say('Te dejo las hileras del sur. Siembra, riega cada día y cosecha. Lo que saques es tuyo. Hace falta azada, eso sí.'); } });
  if (npc.id === 'vella' && !S.flags.vella_taught) o.push({ label: 'Pedirle que te enseñe', f: async () => {
    if (st.rel < 20) return ui.say('¿Enseñarte? Primero tráeme algo que valga la pena. Y ven a menudo.');
    S.flags.vella_taught = 1; S.recipes.pocion = 1; S.recipes.sueno = 1; S.recipes.antidoto = 1; learn('alq', 3, 'la Vella'); if (!S.player.spells.includes('escarcha')) S.player.spells.push('escarcha');
    await ui.say('Romero y miel para las heridas. Beleño y adelfa para dormir bestias. Ruda y ajenjo para los venenos. Y esto: el frío de la montaña, en la palma de la mano.'); ui.toast('Conjuro: Escarcha', '#f8e060'); } });
  if (npc.id === 'elies') o.push({ label: 'Leer un rato (5 d.)', f: async () => { if (S.flags.readShop === S.day) return ui.say('Ya has leído bastante por hoy. Los ojos también se cansan.'); if (S.money < 5) return ui.say('Cinco dineros. No es una biblioteca de caridad.'); S.money -= 5; S.flags.readShop = S.day; advance(90); learn(pick(['his', 'arc', 'nat', 'com']), 1, 'lectura'); } });
  if (npc.id === 'fiveller' && !hasItem('carta_fiveller') && !S.flags.castle_ok) o.push({ label: 'Pedir audiencia con el Conde', f: async () => {
    if (st.rel < 25 || S.rep.ciudad < 5) return ui.say('¿Una carta del Consejo? Primero demuestra que te importa esta ciudad. Ayuda a sus vecinos.');
    addItem('carta_fiveller'); addXP(15); await ui.say('Toma. Llévale esta carta al Conde. Y de paso, dile de mi parte que el Consejo no aprobará el tributo del vino.'); } });
  if (npc.id === 'josep_puig' && S.rank === 2 && !S.flags.aval) o.push({ label: 'Pedir aval del gremio', f: async () => { if (st.rel < 40 || S.rep.gremios < 5) return ui.say('El gremio avala a quien trabaja con los gremios. Haz encargos, comercia, crea. Luego hablamos.'); S.flags.aval = 1; await ui.say('Tienes mi aval. Desde hoy serás tenido por prohombre de esta ciudad.'); } });
  if (npc.id === 'fiveller' && S.rank === 3 && !S.flags.jurado) o.push({ label: 'Pedir un sitio en el Consejo', f: async () => { if (st.rel < 55 || S.rep.ciudad < 50) return ui.say('El Consejo de Ciento elige a sus jurados por su servicio a la ciudad. Aún no es tu hora.'); S.flags.jurado = 1; await ui.say('Serás jurado del Consejo de Ciento. Que Dios y la ciudad te juzguen por tus votos.'); } });
  if (npc.id === 'mossen_jaume' && hasItem('rosa') && !S.flags.rosa_bendita) o.push({ label: 'Bendecir una rosa', f: async () => { S.flags.rosa_bendita = 1; await ui.say('¿Una rosa? Qué petición tan bonita. Ya está bendecida. Que haga el bien que tenga que hacer.'); } });
  if (npc.id === 'tambori') o.push({ label: 'Ver la función (2 d.)', f: async () => { if (S.money < 2) return; S.money -= 2; advance(30); await ui.say(pick(['Tamborí hace bailar a una mulassa de cartón que escupe petardos. El público grita.', 'Representa a Sant Jordi matando al drac... pero el drac gana y se casa con la princesa.', 'Imita al obispo Ermengol con una escoba por báculo. Alguien mira nervioso hacia la Seu.'])); addXP(3); if (!S.known.tambori) { S.known.tambori = 1; learn('arc', 1, 'juglar'); } } });
  if (npc.id === 'madrona') o.push({ label: 'Echar las cartas (5 d.)', f: () => tarot(npc) });
  if (npc.id === 'quim' && !S.flags.license) o.push({ label: 'Licencia de caza (20 d.)', hint: 'Cazar en el coto del Conde sin licencia es delito.', f: async () => { if (S.money < 20) return; S.money -= 20; S.flags.license = 1; await ui.say('Caza con cabeza. Nada de crías ni de hembras preñadas. Y si ves lobos, déjalos.'); } });
  if (npc.id === 'aleix' && S.flags.corpse) o.push({ label: 'Hablar de los cadáveres', f: async () => { await ui.say('...Sí, compro cadáveres. ¿Me vas a denunciar? Sin ellos, mañana no sabría salvarte la vida.'); } });
  return o;
};
async function round(npc) {
  if (S.money < 15) return ui.say('No te llega para invitar a nadie.');
  S.money -= 15; S.flags.wineBuzz = S.day; sfx('coin');
  const here = G.ents.filter((e) => e.kind === 'npc'); for (const e of here) { const st = npcState(e.npc.id); if (st.rel === null) st.rel = initialRel(e.npc); changeRel(e.npc, 3, true); }
  ui.toast(`+3 ♥ con ${here.length} personas`, '#f8a0c0'); addXP(5, 'Ronda');
  await ui.say(pick(['«¡Por Barcanueva!» Chocan las jarras.', '¡Alguien arranca a cantar! Hasta el tabernero se suma.', 'La taberna entera brinda a tu salud.']));
}
async function tarot(npc) {
  if (S.money < 5) return; S.money -= 5;
  const hints = [];
  if (!S.flags.castle_ok) hints.push('La Torre: una puerta cerrada tiene otra puerta debajo. Piedra vieja, íbera.');
  if (!S.flags.oca_back) hints.push('La Estrella: algo blanco se ha perdido entre las frutas del mercado.');
  if (total('lobo') === 0) hints.push('La Luna: el que aullaba ya no aúlla. Las bestias del pan crecen.');
  if (S.flags.spouse) hints.push('Los Enamorados, derecha. Cuídalo.');
  hints.push('La Rueda: quien bebe en Canaletas vuelve. Siempre vuelve.');
  if (!S.flags.pact) hints.push('El Diablo: en la cumbre, alguien ofrece todo. Todo cuesta.');
  hints.push(`El Mundo: faltan ${28 * 4 - ((S.day - 1) % 112)} días para que acabe el año.`);
  await ui.say(pick(hints)); addXP(3);
}

// ───────────── Misiones y encuentros especiales ─────────────
G.hooks.npcSpecial = (npc, e, say) => {
  const st = npcState(npc.id);
  switch (npc.id) {
    case 'arnau_guardia': return { intercept: () => castleGate(npc, say) };
    case 'olaia': {
      const o = [];
      if (!S.flags.oca_q) o.push({ label: '¿Qué te pasa?', f: async () => { S.flags.oca_q = 1; await say('Falta una de las trece ocas del claustro. Si el obispo lo descubre... Por favor, ¿la buscarías? Alguien la vio cerca del mercado.'); logEvent('Misión: la oca perdida'); } });
      if (S.flags.oca_q === 2) o.push({ label: 'Devolver la oca', f: async () => { S.flags.oca_q = 3; S.flags.oca_back = 1; await say('¡Oh! ¡Blanca! ¡Estás aquí! ...Gracias. De verdad. Toma, una de sus plumas; da buena suerte.'); addItem('pluma_oca'); changeRel(npc, 20); S.rep.seu += 5; addXP(50, 'Misión cumplida'); } });
      return { options: o };
    }
    case 'candela': return { options: S.flags.enriq_seen && !S.flags.enriq_clear ? [{ label: 'Desmentir lo de Enriqueta', f: async () => {
      const r = await check('Convencer (CARISMA + HISTORIA)', ['car', 'his'], 13);
      if (r.ok) { S.flags.enriq_clear = 1; await say('...¿Sopa? ¿A los huérfanos? Yo... yo sólo repetía lo que se dice. Iré a retirar la denuncia. Que Dios me perdone.'); changeRel(N('enriqueta'), 25, false); S.rep.ciudad += 6; addXP(60, 'Rumor desmontado'); logEvent('Desmontas la leyenda de Enriqueta'); }
      else { await say('¡Tonterías! Esa mujer es una bruja y lo sabe todo el Raval.'); changeRel(npc, -5); } } }] : [] };
    case 'enriqueta': return { options: st.rel >= 15 && !S.flags.enriq_seen ? [{ label: 'Preguntar por los niños', f: async () => { S.flags.enriq_seen = 1; await say('Ven. Mira. Siete niños, un caldero de sopa y dos mantas. Esta es mi «brujería». Ahora, si quieres, cuéntalo.'); addXP(15); } }] : [] };
    case 'caballero_negro': return { options: S.flags.pact ? [] : [{ label: '¿Qué ofreces?', f: () => pact(npc, say) }] };
    case 'comte_arnau': return { options: S.flags.arnau_free ? [] : [{ label: 'Ofrecerle la rosa bendita', f: async () => {
      if (!S.flags.rosa_bendita || !hasItem('rosa')) return say('...Una rosa... bendecida... en la iglesia de los pobres... Sólo eso... podría...');
      if (S.flags.festToday !== 'Castanyada y Noche de Ánimas') return say('...Ahora no... La noche de las ánimas... Sólo esa noche...');
      addItem('rosa', -1); S.flags.arnau_free = 1; npcState(npc.id).gone = true; e.gone = true; sfx('bell');
      await say('...Adelaida... ¿me perdonas? ...Sí... Ya no quema...'); await ui.say('El Comte Arnau se deshace en una bruma dorada. Los perros de fuego callan para siempre.');
      addXP(150, 'Alma liberada'); learn('arc', 3, 'Comte Arnau'); S.rep.mar += 5; logEvent('Liberas al Comte Arnau'); } }] };
    case 'lluna': {
      const o = [];
      if (hasItem('peine_oro')) o.push({ label: 'Devolverle el peine de oro', f: async () => { addItem('peine_oro', -1); changeRel(npc, 40); await say('¡Mi peine! ...Lo llevaba buscando desde la luna de las cerezas. Ahora puedo quedarme.'); addXP(40); } });
      if (st.partner || st.married) o.push({ label: '¿Eres una dona d’aigua?', hint: 'Hay preguntas que no se hacen.', f: async () => {
        await say('...'); await say('Lo has dicho. Lo has dicho en voz alta.'); await ui.say('Lluna se deshace en agua clara que se escurre entre las piedras hacia el río. No volverás a verla.');
        st.gone = true; st.partner = false; st.married = false; S.flags.spouse = S.flags.spouse === 'lluna' ? null : S.flags.spouse; e.gone = true; logEvent('Rompes la regla de la dona d’aigua'); } });
      if (st.married && !S.flags.lluna_home) S.flags.lluna_home = 1;
      return { options: o };
    }
    case 'andreu': return { options: st.secret && !S.flags.comb_given && st.rel >= 45 ? [{ label: 'Pedirle el peine de oro', f: async () => { S.flags.comb_given = 1; addItem('peine_oro'); await say('...Tienes razón. No es mío. Devuélveselo tú. Yo no me atrevo a mirarla a los ojos.'); } }] : [] };
    case 'ferrer': {
      if (!S.flags.boar_q && (S.eco?.cropDamage > 0.15 || count('pradera', 'jabali') + count('bosque', 'jabali') > 10)) return { options: [{ label: '¿Problemas en el campo?', f: async () => { S.flags.boar_q = 1; S.flags.boar_kills0 = S.flags.kills || 0; S.flags.boar_base = count('pradera', 'jabali') + count('bosque', 'jabali'); await say('¡Los jabalíes! Me arrasan el trigo. Mata tres y te pago 60 dineros. O haz lo que quieras, pero que dejen mi campo.'); logEvent('Misión: jabalíes en el Llano'); } }] };
      if (S.flags.boar_q === 1) { const now = count('pradera', 'jabali') + count('bosque', 'jabali'); if (S.flags.boar_base - now >= 3) return { options: [{ label: 'Ya hay menos jabalíes', f: async () => { S.flags.boar_q = 2; S.money += 60; sfx('coin'); changeRel(npc, 15); addXP(40, 'Misión'); await say('¡Se nota! El trigo vuelve a crecer derecho. Toma lo prometido.'); if (total('lobo') === 0) await say('Aunque... sin lobos volverán. Mi abuelo decía que el lobo era el guarda del trigo.'); } }] }; }
      return {};
    }
    case 'barnabas': return { options: audience(npc, say) };
    case 'senescal': return { options: npcState('senescal').secret || S.flags.senescal_known ? [{ label: 'Sé lo de la lista', f: async () => {
      const r = await check('Amenazar (CARISMA + FUERZA)', ['car', 'fue'], 15);
      if (r.ok) { S.flags.senescal_bribed = 1; S.money += 150; await say('...Silencio. Toma. Ciento cincuenta dineros y olvidas lo que sabes. ¿Entendido?'); S.rep.corte -= 3; }
      else { await say('No sé de qué me hablas. Guardias, acompañad a esta persona a la salida.'); S.flags.castle_ok = false; await ui.say('Te echan del castillo.'); enterMap('montjuic', 20, 11, 'down'); } } }] : [] };
    case 'home_nassos': return {};
  }
  return null;
};

// El guardia del castillo: «a no ser...»
async function castleGate(npc, say) {
  if (S.flags.castle_ok) { await say(pick(['Adelante. El Conde recibe en el salón.', 'Pasa, pasa.'])); return; }
  const opts = [];
  if (hasItem('carta_fiveller')) opts.push({ label: 'Traigo una carta del Consejo', k: 'carta' });
  if (S.rank >= 2 || S.rep.corte >= 10) opts.push({ label: 'Soy ciudadano honrado de Barcanueva', k: 'rango' });
  opts.push({ label: 'Asuntos importantes (persuadir)', k: 'car' });
  opts.push({ label: 'Ofrecer 30 dineros', k: 'soborno' });
  opts.push({ label: 'Nada, me voy', k: 'no' });
  const i = await ui.ask('Alto. Esto es el castillo del Conde Barnabás. ¿Qué motivo te trae?', opts.map((o) => o.label), { cancel: opts.length - 1, speaker: npc.name, ap: { ...npc.look, race: npc.race, sex: npc.sex, equip: npc.look.equip } });
  const k = opts[i].k;
  if (k === 'no') return say('Pues circula.');
  if (k === 'carta') { addItem('carta_fiveller', -1); S.flags.letter_delivered = 1; S.flags.castle_ok = true; await say('Sello del Consejo de Ciento. Adelante, pasa. El Conde te recibirá.'); addXP(10); return openGate(); }
  if (k === 'rango') { S.flags.castle_ok = true; await say('Conozco tu nombre. Adelante.'); return openGate(); }
  if (k === 'car') {
    const elf = S.player.race === 'elfo' ? 4 : 0; const tief = S.player.race === 'tiefling' && S.player.equip?.head !== 'capucha' ? -3 : 0;
    const r = await check('Persuadir al guardia (CARISMA)', ['car'], 17, elf + tief);
    if (r.ok) { S.flags.castle_ok = true; await say(elf ? 'Disculpad, no sabía que... Adelante, por supuesto.' : 'Está bien. Pero si me metes en un lío, te busco.'); return openGate(); }
    return say(tief ? 'Con esos cuernos, ni en sueños.' : 'No me convences. Circula.');
  }
  if (k === 'soborno') {
    if (S.money < 30) return say('¿Con qué? ¿Con piedras?');
    const r = await check('Soborno (CARISMA + COMERCIO)', ['car', 'com'], 14);
    if (r.ok) { S.money -= 30; S.flags.castle_ok = true; S.rep.corte -= 2; await say('...Yo no he visto nada. Pasa rápido.'); return openGate(); }
    changeRel(npc, -15); S.rep.ciudad -= 3; return say('¿Me tomas por un Mateu cualquiera? ¡Largo de aquí antes de que llame a la Capitana!');
  }
}
function openGate() { const e = G.ents.find((x) => x.npc?.id === 'arnau_guardia'); if (e) { e.home = [PLACES.castillo_lado.x, PLACES.castillo_lado.y]; e.path = null; e.x = e.home[0]; e.y = e.home[1]; e.px = e.x * 16; e.py = e.y * 16; } }

// La cantera íbera: el «a no ser...»
G.hooks.secretWarp = (w) => {
  if (w.secret === 'cantera') {
    if (S.flags.knows_cantera || S.flags.cantera_found) return true;
    (async () => {
      await ui.say('Una grieta en la roca, tapada por zarzas. Parece no llevar a ninguna parte.');
      const r = await check('Examinar (HISTORIA)', ['his'], 14);
      if (r.ok) { S.flags.cantera_found = 1; await ui.say('Marcas de cincel: esto es una cantera íbera. Y el aire que sale de la grieta es corriente... Hay un pasadizo.'); addXP(20, 'Secreto'); }
      else await ui.say('Sólo piedras y zarzas.');
    })();
    return false;
  }
  return true;
};
G.hooks.infiltrate = async () => {
  S.flags.infiltrated = S.day;
  await ui.say('Subes por una escalera de piedra húmeda y empujas una trampilla. Estás en las bodegas... y luego en el salón del castillo.');
  const r = await check('Pasar desapercibido (CARISMA)', ['car'], 13, S.player.race === 'enano' ? 2 : 0);
  if (r.ok) { await ui.say('Nadie repara en ti. Te mezclas con los cortesanos como si llevaras años aquí.'); S.flags.castle_ok = true; addXP(30, 'Infiltración'); }
  else { await ui.say('—¡Eh! ¿Y tú quién eres? ¿Cómo has entrado?'); S.flags.caught = S.day; }
};

async function audienceBase(npc, say) { }
function audience(npc, say) {
  const o = [];
  if (S.flags.caught === S.day && !S.flags.caught_resolved) o.push({ label: 'Explicar cómo has entrado', f: async () => {
    S.flags.caught_resolved = 1;
    const r = await check('Convencer al Conde (CARISMA)', ['car'], 12);
    if (r.ok) { await say('¿Por la cantera íbera? ¡Ja! Mi abuelo la usaba para ver a sus amantes. Tienes valor. Me caes bien.'); S.rep.corte += 8; S.flags.castle_ok = true; changeRel(npc, 10); }
    else { await say('¡Guardias! Que lo saquen de aquí y que pague veinte dineros de multa.'); S.money = Math.max(0, S.money - 20); S.rep.corte -= 5; S.flags.castle_ok = false; enterMap('montjuic', 20, 11, 'down'); }
  } });
  if (S.flags.letter_delivered === 1) o.push({ label: 'Transmitir el mensaje del Consejo', f: async () => {
    S.flags.letter_delivered = 2;
    const i = await ui.ask('El Conde lee la carta de Fiveller con el ceño fruncido. «¿Y tú qué opinas del tributo del vino?»', ['Que el Consejo tiene razón', 'Que la ciudad debe pagar a su señor', 'Que busque otro modo de pagar sus deudas']);
    if (i === 0) { S.rep.ciudad += 8; S.rep.corte -= 3; changeRel(N('fiveller'), 15); await say('Hmm. Hablas como un conseller. Retiraré el tributo... por ahora.'); }
    if (i === 1) { S.rep.corte += 8; S.rep.ciudad -= 5; changeRel(N('fiveller'), -15); await say('¡Al fin alguien sensato! El tributo se aplicará.'); logEvent('El tributo del vino se aprueba'); }
    if (i === 2) { const r = await check('Diplomacia (CARISMA + COMERCIO)', ['car', 'com'], 14); if (r.ok) { S.rep.corte += 5; S.rep.ciudad += 5; await say('...¿Vender la galera nueva a los genoveses? No es mala idea. Nada mal.'); } else await say('Fácil de decir. Retírate.'); }
    addXP(40, 'Política');
  } });
  if (S.rep.corte >= 30 && S.rank >= 3 && !S.flags.knight) o.push({ label: 'Solicitar un título', f: async () => { S.flags.knight = 1; addItem('capa_real'); await say('Arrodíllate. Por los servicios prestados a Barcanueva, te nombro Caballero de mi Corte. Toma este manto.'); addXP(150, 'Nombramiento'); } });
  if (npcState('senescal').secret) o.push({ label: 'Denunciar al senescal', f: async () => {
    const r = await check('Convencer al Conde (CARISMA + HISTORIA)', ['car', 'his'], 15);
    if (r.ok) { await say('¿Berenguer? ¿Con el obispo? ...Las cuentas no cuadraban desde hace años. Guardias: arrestad al senescal.'); npcState('senescal').gone = true; S.rep.corte += 15; S.rep.seu -= 10; addXP(100, 'Conspiración desbaratada'); logEvent('El senescal Berenguer cae en desgracia'); }
    else { await say('Acusaciones sin pruebas. Cuida tu lengua en esta casa.'); S.rep.corte -= 5; }
  } });
  return o;
}

// El pacto del Monte del Te Daré (una vez por partida)
async function pact(npc, say) {
  await say('Mira abajo: la ciudad, el puerto, el llano, el mar. Haec omnia tibi dabo. Todo esto te daré. Sólo tienes que pedir... y postrarte.');
  const i = await ui.choose(['Riquezas', 'Poder en la ciudad', 'Saber', 'Amor', 'No quiero nada de ti'], { cancel: 4 });
  if (i === 4) { await say('Volverás. Siempre vuelven.'); S.rep.mar += 2; addXP(20); return; }
  const j = await ui.ask('«Por un precio pequeño: algo que no usas. Tu sombra.»', ['Aceptar', 'Rechazar']);
  if (j !== 0) { await say('Qué pena. Qué sensatez tan aburrida.'); return; }
  S.flags.pact = i + 1; sfx('bad'); logEvent('Pacto con el Caballero de Negro');
  if (i === 0) { S.money += 1000; await say('Mil dineros de oro. Cuéntalos: no falta ninguno.'); }
  if (i === 1) { S.rep.ciudad += 30; S.rep.corte += 30; await say('Mañana todos sabrán tu nombre. Y lo dirán con respeto. O con miedo, que es lo mismo.'); }
  if (i === 2) { for (const k of Object.keys(S.player.know)) S.player.know[k] += 2; await say('Sabes cosas que no deberías. Disfrútalas.'); addItem('lib_tibidabo'); }
  if (i === 3) { for (const n of NPCS) if (n.romance) { const st = npcState(n.id); if (st.rel !== null) st.rel = Math.min(100, st.rel + 25); } await say('Te amarán. No te preguntes por qué.'); }
  await ui.say('Miras al suelo. Bajo tus pies, a la luz de la luna, no hay sombra.');
  for (const n of NPCS) if (n.traits.includes('devoto') || n.traits.includes('devota')) { const st = npcState(n.id); if (st.rel !== null) st.rel -= 20; }
  S.rep.seu -= 20; addXP(50);
}

// Regalos especiales
G.hooks.giftSpecial = (npc, it) => {
  if (npc.id === 'lluna' && it === 'peine_oro') return async () => { changeRel(npc, 40); await ui.say('¡Mi peine! Ahora puedo quedarme.', { speaker: npc.name }); };
  if (npc.id === 'caballero_negro' && it === 'agua_bendita') return async () => { await ui.say('(Sisea como una sartén.) Qué gracioso. Qué gracioso eres.', { speaker: npc.name }); npcState(npc.id).rel -= 30; };
  return null;
};

// El secreto de alguien puede abrir otras puertas
G.hooks.secret = (npc) => {
  if (['elies', 'pelat', 'marc', 'bartomeu', 'arnau_guardia', 'rafel', 'elisenda'].includes(npc.id)) S.flags.knows_cantera = 1;
  if (npc.id === 'fra_medir') S.flags.temple_map = 1;
  if (npc.id === 'aleix') S.flags.corpse = 1;
  if (npc.id === 'guifre') S.flags.guifre_secret = 1;
  if (npc.id === 'ermengol' || npc.id === 'senescal') S.flags.senescal_known = 1;
};

// Oca perdida: un ave blanca escondida entre los puestos del mercado
G.hooks.enterMapExtra = null;
const _enter = G.hooks.enterMap;
G.hooks.enterMap = (m) => {
  _enter(m);
  if (m.id === 'ciudad' && S.flags.oca_q === 1 && ['manana', 'dia', 'tarde'].includes(phase().id)) {
    G.ents.push({ kind: 'animal', sp: 'oca', a: { id: -13, sp: 'oca', sex: 'f', age: 99 }, x: 5, y: 20, px: 80, py: 320, dir: 'right', mv: 0, frame: 0, idle: 999, quest: 'oca', calm: true });
  }
};
const _animal = G.hooks.animal;
G.hooks.animal = async (e) => {
  if (e.quest === 'oca') {
    const r = await check('Atrapar la oca (NATURALEZA)', ['nat'], 10);
    if (r.ok) { e.gone = true; S.flags.oca_q = 2; await ui.say('¡La tienes! La oca blanca grazna indignada bajo tu brazo. Llévala a la Hermana Olaia.'); addXP(15); }
    else await ui.say('La oca te pica en la mano y se escabulle entre los puestos. ¡Cuac!');
    return;
  }
  return _animal(e);
};

// Marcas sobre los NPCs
G.hooks.npcBadge = (ctx, e, x, y) => {
  const id = e.npc.id; const st = S.npc[id];
  let m = null, c = '#f8e060';
  if (id === 'olaia' && (!S.flags.oca_q || S.flags.oca_q === 2)) m = '!';
  if (st?.req && !st.req.done && hasItem(st.req.item, st.req.n)) m = '!';
  if (st?.partner || st?.married) { m = '♥'; c = '#f86890'; }
  if (id === 'arnau_guardia' && !S.flags.castle_ok) m = '?';
  if (m) { const b = Math.floor(G.frame / 16) % 2; drawText(ctx, m, x + 6, y - 18 - b, c, '#1c1424'); }
};

// Pelea contra un NPC
G.hooks.brawl = async (npc, e) => {
  const r = await fight(npcEnemy(npc));
  if (G.map.biome === 'urbano' && r === 'win') { S.rep.ciudad -= 3; await G.hooks.guardFine?.(15); }
};
G.hooks.guardFine = async (n) => {
  await ui.say('¡Un guardia llega corriendo! «Alteración del orden. Multa.»');
  const pay = Math.min(S.money, n); S.money -= pay; S.rep.ciudad -= 2;
  await ui.say(pay < n ? `Pagas ${pay} dineros; el resto te lo apuntan. La Capitana no olvidará tu cara.` : `Pagas ${n} dineros de multa.`);
};
G.hooks.canEnter = (w) => {
  if (w.building === 'castillo' && !S.flags.castle_ok) { ui.say('El guardia te corta el paso.'); return false; }
  if (w.building && S.house !== w.building && BUILDINGS[w.building]?.kind === 'casa' && !BUILDINGS[w.building].forSale && isNightLocked(w.building)) { ui.say('La puerta está cerrada con llave. Es de noche.'); return false; }
  return true;
};
function isNightLocked(bid) { const ph = phase().id; if (ph !== 'noche') return false; return !['consell', 'llotja', 'drassanes'].includes(bid) || true; }
