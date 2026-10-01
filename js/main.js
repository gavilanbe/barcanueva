// Arranque, pantalla de título, bucle principal y escalado.
import { input } from './input.js';
import { ui, W, H, panel, text } from './ui.js';
import { drawText, textWidth } from './font.js';
import { S, newGame, load, hasSave, save, maxHp, maxMp, logEvent } from './state.js';
import { buildWorld, MAPS } from './world.js';
import { dumpMap, G, enterMap, updateWorld, drawWorld, drawHUD, advance, newDay, addXP } from './game.js';
import { initEco } from './eco.js';
import { drawBattle, B, fight, animalEnemy, monster } from './battle.js';
import { creator, allocate } from './creator.js';
import { sfx, music } from './audio.js';
import { rollMarket } from './talk.js';
import { fish } from './activities.js';
import './events.js';
import './menu.js';
import { hash2 } from './util.js';
import { NPCS } from './data/npcs.js';

const cv = document.getElementById('screen'); const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
input.init(); buildWorld();
G.hooks.advance = advance;

function resize() {
  const touch = document.body.classList.contains('touch');
  const aw = innerWidth - (touch ? 8 : 16), ah = (touch ? innerHeight * 0.6 - 30 : innerHeight) - 16;
  let s = Math.min(aw / W, ah / H);
  if (!touch || s >= 2) s = Math.max(1, Math.floor(s));
  cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', resize); resize();

// ───────────── Título ─────────────
function drawTitle(fr) {
  // Cielo de crepúsculo en bandas
  const sky = ['#2a1e4a', '#3e2a5a', '#5a3466', '#7a3e6a', '#a04a64', '#c86a5a', '#e89a5a', '#f8c070'];
  sky.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * 11, W, 11); });
  for (let i = 0; i < 20; i++) { ctx.fillStyle = '#f8f0d8'; if ((i * 7 + Math.floor(fr / 20)) % 9) ctx.fillRect((i * 53) % W, (i * 17) % 40, 1, 1); }
  // Sol poniente
  ctx.fillStyle = '#f8d878'; for (let r = 0; r < 14; r++) { const w = Math.round(Math.sqrt(196 - r * r)); ctx.fillRect(170 - w, 84 - r, w * 2, 1); }
  // Montañas (Collsaverola) y el monte con el castillo
  ctx.fillStyle = '#3a2848'; for (let x = 0; x < W; x++) { const h = 70 + Math.sin(x / 23) * 8 + Math.sin(x / 7) * 2; ctx.fillRect(x, h, 1, 100); }
  ctx.fillStyle = '#2a1e38'; for (let x = 0; x < 70; x++) { const h = 72 - Math.sin((x / 70) * Math.PI) * 18; ctx.fillRect(x, h, 1, 100); }
  ctx.fillRect(22, 44, 26, 12); for (let i = 0; i < 26; i += 5) ctx.fillRect(22 + i, 41, 3, 3); ctx.fillRect(30, 36, 8, 8); ctx.fillStyle = '#b8322c'; ctx.fillRect(34, 28, 6, 4);
  // Ciudad amurallada
  ctx.fillStyle = '#1e1628';
  ctx.fillRect(60, 96, 170, 30); for (let x = 60; x < 230; x += 6) ctx.fillRect(x, 93, 3, 3);
  const houses = [[70, 86, 14], [86, 80, 10], [98, 84, 16], [150, 82, 12], [164, 78, 14], [180, 86, 10], [192, 80, 16], [210, 84, 14]];
  for (const [x, y, w] of houses) { ctx.fillRect(x, y, w, 20); ctx.fillRect(x + 2, y - 3, w - 4, 3); }
  // Dos catedrales
  ctx.fillRect(116, 60, 8, 40); ctx.fillRect(136, 60, 8, 40); ctx.fillRect(116, 72, 28, 28); ctx.fillRect(119, 52, 2, 8); ctx.fillRect(139, 52, 2, 8); ctx.fillRect(126, 64, 8, 10);
  ctx.fillRect(196, 66, 6, 30); ctx.fillRect(212, 66, 6, 30); ctx.fillRect(196, 76, 22, 20);
  // Ventanas encendidas
  for (let i = 0; i < 18; i++) { if (hash2(i, Math.floor(fr / 90), 3) > 0.35) { ctx.fillStyle = '#f8c060'; ctx.fillRect(66 + ((i * 29) % 160), 88 + ((i * 7) % 16), 1, 2); } }
  // Mar
  for (let y = 126; y < H; y += 3) { ctx.fillStyle = y % 6 ? '#2a3a6a' : '#34467a'; ctx.fillRect(0, y, W, 3); }
  for (let i = 0; i < 12; i++) { ctx.fillStyle = '#f8c070'; ctx.fillRect(150 + ((i * 13 + Math.floor(fr / 8)) % 40), 128 + i * 3 % 30, 6 - (i % 3), 1); }
  // Título grande (fuente ampliada)
  const title = 'BARCANUEVA';
  const tw = textWidth(title) + 2; const tc = document.createElement('canvas'); tc.width = tw; tc.height = 11; const t2 = tc.getContext('2d');
  drawText(t2, title, 0, 1, '#f8e8b0', '#8a2a2a');
  ctx.drawImage(tc, 0, 0, tw, 11, Math.round(W / 2 - tw * 1.5), 6, tw * 3, 33);
  const sub = 'Crónicas de una ciudad junto al mar';
  drawText(ctx, sub, (W - textWidth(sub)) / 2, 42, '#f8d8a0', '#2a1e38');
  if (!ui.busy && fr % 60 < 40) { const s = 'Pulsa A'; drawText(ctx, s, (W - textWidth(s)) / 2, 142, '#ffffff', '#1c1424'); }
}

async function titleMenu() {
  music('ciudad');
  while (true) {
    await ui.custom({ update() { if (input.pressed('A') || input.pressed('S')) { this.done = true; sfx('ok'); } }, draw() { } });
    const opts = [hasSave() ? 'Continuar' : { label: 'Continuar', disabled: true }, 'Nueva partida'];
    const i = await ui.choose(opts, { x: 88, y: 96, cancel: null });
    if (i === 0 && load()) { continueGame(); return; }
    if (i === 1) { await newGameFlow(); return; }
  }
}

async function newGameFlow() {
  G.mode = 'create';
  const r = await ui.custom(creator());
  const p = { name: r.name, sex: r.ap.sex, race: r.ap.race, look: { skin: r.ap.skin, hair: r.ap.hair, hairStyle: r.ap.hairStyle, top: r.ap.top, bottom: r.ap.bottom, beard: r.ap.beard },
    stats: { fue: 0, int: 0, def: 0, esp: 0, car: 0 }, know: { nat: 0, his: 0, arc: 0, alq: 0, art: 0, caz: 0, com: 0 }, level: 1, equip: { body: 'tunica' } };
  newGame(p); p.equip = { body: 'tunica' }; S.inv.tunica = 1;
  if (p.race === 'enano') { S.inv.garrote = 1; p.equip.weapon = 'garrote'; }
  if (p.race === 'elfo') S.inv.miel = 1;
  if (p.race === 'tiefling') { S.inv.capucha = 1; }
  await allocate();
  p.hpMax = maxHp(p); p.hp = p.hpMax; p.mpMax = maxMp(p); p.mp = p.mpMax;
  initEco(); newDayInit();
  G.mode = 'world';
  enterMap('ciudad', 20, 3, 'down', true);
  await intro();
}
function newDayInit() { S.flags.travel = {}; for (const n of NPCS) if (n.traveler && Math.random() < n.traveler.freq) S.flags.travel[n.id] = n.traveler.places[Math.floor(Math.random() * n.traveler.places.length)]; rollMarket(); }

async function intro() {
  const p = S.player;
  await ui.say(`Día 1. Primavera. Tras semanas de camino, ${p.name} cruza el Portal del Ángel y entra en Barcanueva.`);
  await ui.say('La ciudad huele a sal, a pan y a incienso. Al fondo, la Seu; más abajo, el mar. En el monte del Juïc, el castillo del Conde Barnabás vigila el puerto.');
  const race = {
    humano: 'Nadie te presta especial atención. Aquí llegan forasteros cada día.',
    elfo: 'Una mujer se aparta para cederte el paso y un niño te mira las orejas con la boca abierta.',
    tiefling: 'Una vieja se santigua al verte los cuernos. Un guardia no te quita el ojo de encima.',
    enano: 'Dos mozos se dan un codazo y se ríen. «¡Mira, un enano! ¡Para el Corpus!»',
  }[p.race];
  await ui.say(race);
  await ui.say('Llevas 60 dineros, algo de pan y todo un año por delante. Puedes vivir como quieras: trabajar, cazar, cultivar, hacer amigos... o enemigos. (A: hablar/interactuar · B: correr · MENÚ: menú)');
  logEvent('Llegas a Barcanueva');
}

function continueGame() {
  G.mode = 'world';
  if (!S.eco) initEco();
  enterMap(S.pos.map, S.pos.x, S.pos.y, S.pos.dir || 'down', true);
  ui.toast(`Bienvenido de nuevo, ${S.player.name}`);
}

// ───────────── Bucle ─────────────
let last = performance.now(), acc = 0; const STEP = 1000 / 60;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= STEP) { tick(); acc -= STEP; }
  render(); requestAnimationFrame(frame);
}
function tick() {
  G.frame++;
  const busy = ui.busy;
  ui.update();
  if (busy) input.endFrame(); // la pulsación que cierra un diálogo no debe llegar al mundo
  if (G.mode === 'world') updateWorld();
  input.endFrame();
}
function render() {
  if (G.mode === 'title') drawTitle(G.frame);
  else if (G.mode === 'battle' && B.active) drawBattle(ctx, G.frame);
  else if ((G.mode === 'world' || G.mode === 'battle') && G.map) { drawWorld(ctx); drawHUD(ctx); }
  else { ctx.fillStyle = '#2a2030'; ctx.fillRect(0, 0, W, H); }
  ui.draw(ctx, G.frame);
}
requestAnimationFrame(frame);

// Ganchos de depuración
window.__barca = {
  talkTo(id) { const e = G.ents.find((x) => x.npc?.id === id); if (!e) return 'no está'; const p = G.player; p.x = e.x; p.y = e.y + 1; p.px = p.x * 16; p.py = p.y * 16; p.dir = 'up'; G.hooks.talk(e); return 'ok'; },
  where(id) { return G.ents.filter((e) => !id || e.npc?.id === id || e.sp === id).map((e) => (e.npc?.id || e.sp || e.kind) + '@' + e.x + ',' + e.y).join(' '); },
  fish, fight, animalEnemy, monster, dumpMap, G, S, MAPS, ui, input, enterMap, advance, newDay, addXP, save, NPCS };

const qs = new URLSearchParams(location.search);
if (qs.has('quick')) {
  // Partida rápida para pruebas: ?quick=elfo,f
  const [race = 'humano', sex = 'm'] = qs.get('quick').split(',');
  const p = { name: 'Prueba', sex, race, look: { skin: race === 'tiefling' ? '#c9504a' : '#e8b48c', hair: '#5a3620', hairStyle: 1, top: '#3a6a9a', bottom: '#4a4a6a', beard: race === 'enano' }, stats: { fue: 2, int: 2, def: 2, esp: 2, car: 2 }, know: { nat: 2, his: 2, arc: 2, alq: 1, art: 1, caz: 1, com: 1 }, level: 1, equip: {} };
  newGame(p); p.equip = { body: 'tunica' }; S.inv.tunica = 1; S.inv.cana_pescar = 1; S.inv.azada = 1; S.inv.sem_col = 3;
  p.hpMax = maxHp(p); p.hp = p.hpMax; p.mpMax = maxMp(p); p.mp = p.mpMax;
  initEco(); newDayInit(); G.mode = 'world';
  const at = (qs.get('at') || 'ciudad,20,3').split(','); if (qs.has('hour')) S.min = +qs.get('hour') * 60;
  enterMap(at[0], +at[1], +at[2], 'down', true);
} else { G.mode = 'title'; titleMenu(); }
