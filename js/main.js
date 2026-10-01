// Arranque, pantalla de título, bucle principal y escalado.
import { input } from './input.js';
import { ui, W, H, panel, text, T as UIT, hand } from './ui.js';
import { drawText, textWidth, drawOutlined, bigText, drawBig, bigWidth } from './font.js';
import { S, newGame, load, hasSave, save, maxHp, maxMp, logEvent } from './state.js';
import { buildWorld, MAPS } from './world.js';
import { dumpMap, G, enterMap, updateWorld, drawWorld, drawHUD, advance, newDay, addXP, autoWalk, emote, letterbox } from './game.js';
import { initEco } from './eco.js';
import { drawBattle, B, fight, animalEnemy, monster } from './battle.js';
import { creator, allocate } from './creator.js';
import { sfx, music, preloadMusic, musicState } from './audio.js';
import { rollMarket } from './talk.js';
import { fish } from './activities.js';
import './events.js';
import './menu.js';
import { hash2 } from './util.js';
import { NPCS } from './data/npcs.js';
import { fx, ease, prog, transition, trans, drawTrans, drawParts, drawFlash, spawn, sparkle } from './fx.js';
import { INK, PAL, mix, alpha } from './pal.js';
import { bayer, ellipse, gradientBands, poly } from './px.js';

const cv = document.getElementById('screen'); const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
input.init(); buildWorld();
G.hooks.advance = advance;

function resize() {
  const touch = document.body.classList.contains('touch');
  const aw = innerWidth - (touch ? 24 : 48), ah = (touch ? innerHeight * 0.6 - 44 : innerHeight - 64) - 16;
  let s = Math.min(aw / W, ah / H);
  if (!touch || s >= 2) s = Math.max(1, Math.floor(s));
  cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', resize); resize();

// ───────────── Título ─────────────
// Atardecer sobre Barcanueva: cielo tramado, sol que se pone y se refleja, montes, castillo del Juïc, la ciudad
// con sus dos catedrales y ventanas que se encienden, mar con olas, una barca, gaviotas y nubes.
let titleBg = null; const title = { t: 0, phase: 'intro', menu: null };
function buildTitleBg() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  gradientBands(x, 0, 0, W, 100, ['#1c1638', '#2a1e4a', '#3e2a5a', '#5a3466', '#7a3e6a', '#a04a64', '#c86a5a', '#e89a5a', '#f8c070'], 3);
  // estrellas altas
  for (let i = 0; i < 40; i++) { const sx = Math.floor(hash2(i, 1, 9) * W), sy = Math.floor(hash2(i, 2, 9) * 36); x.fillStyle = sy < 18 ? '#fff8e0' : '#e8c8d8'; x.fillRect(sx, sy, 1, 1); }
  // sol
  for (let r = -16; r < 16; r++) { const w = Math.round(Math.sqrt(256 - r * r)); x.fillStyle = Math.abs(r) < 5 ? '#fff4c0' : Math.abs(r) < 10 ? '#fce08a' : '#f8c870'; x.fillRect(172 - w, 70 + r, w * 2, 1); }
  for (let r = 17; r < 26; r++) { x.fillStyle = 'rgba(255,220,150,.10)'; const w = Math.round(Math.sqrt(r * r - 0)); x.fillRect(172 - w, 70 - 2, w * 2, 4); }
  // Collsaverola (lejos)
  for (let X = 0; X < W; X++) { const h = 66 + Math.sin(X / 23) * 7 + Math.sin(X / 7.3) * 2 + Math.sin(X / 51) * 4; x.fillStyle = '#4a2e58'; x.fillRect(X, Math.round(h), 1, 120); x.fillStyle = '#5a3866'; x.fillRect(X, Math.round(h), 1, 1); }
  for (let X = 0; X < W; X++) { const h = 78 + Math.sin(X / 17 + 2) * 5 + Math.sin(X / 6) * 1.5; x.fillStyle = '#3a2448'; x.fillRect(X, Math.round(h), 1, 120); }
  // Monte del Juïc con el castillo
  for (let X = 0; X < 84; X++) { const h = 74 - Math.sin((X / 84) * Math.PI) * 22; x.fillStyle = '#2a1a36'; x.fillRect(X, Math.round(h), 1, 100); }
  x.fillStyle = '#2a1a36'; x.fillRect(22, 44, 30, 12); for (let i = 0; i < 30; i += 5) x.fillRect(22 + i, 41, 3, 3); x.fillRect(31, 34, 10, 10); x.fillRect(32, 31, 2, 3); x.fillRect(38, 31, 2, 3);
  x.fillStyle = '#b8322c'; x.fillRect(36, 24, 7, 4); x.fillStyle = '#e8c050'; x.fillRect(36, 25, 7, 1); x.fillStyle = '#2a1a36'; x.fillRect(35, 24, 1, 8);
  // ciudad amurallada
  const sil = '#1e1428', sl = '#2c1e38';
  x.fillStyle = sil; x.fillRect(56, 98, 184, 30); for (let X = 56; X < 240; X += 6) x.fillRect(X, 95, 3, 3);
  const houses = [[62, 86, 14], [78, 80, 10], [90, 84, 16], [150, 82, 12], [164, 78, 14], [180, 86, 10], [192, 80, 16], [210, 84, 14], [226, 88, 12], [104, 88, 10]];
  for (const [hx, hy, w] of houses) { x.fillStyle = sil; x.fillRect(hx, hy, w, 20); x.fillRect(hx + 2, hy - 3, w - 4, 3); x.fillStyle = sl; x.fillRect(hx, hy, 1, 20); }
  // la Seu (agujas) y Santa María (torres octogonales)
  x.fillStyle = sil; x.fillRect(116, 60, 8, 40); x.fillRect(136, 60, 8, 40); x.fillRect(116, 72, 28, 28);
  poly(x, [[116, 60], [120, 46], [124, 60]], sil); poly(x, [[136, 60], [140, 46], [144, 60]], sil); x.fillRect(119, 42, 2, 5); x.fillRect(139, 42, 2, 5); x.fillRect(126, 64, 8, 10); poly(x, [[125, 64], [130, 56], [135, 64]], sil);
  x.fillStyle = '#4a2e48'; for (const sx of [130]) { x.fillRect(sx - 3, 76, 6, 6); }
  x.fillStyle = sil; x.fillRect(196, 64, 7, 34); x.fillRect(213, 64, 7, 34); x.fillRect(196, 76, 24, 22); x.fillRect(195, 62, 9, 2); x.fillRect(212, 62, 9, 2);
  // reflejos en las aristas
  x.fillStyle = '#4a2a48'; x.fillRect(123, 60, 1, 40); x.fillRect(143, 60, 1, 40); x.fillRect(202, 64, 1, 34); x.fillRect(219, 64, 1, 34);
  // mar
  gradientBands(x, 0, 126, W, 34, ['#3a3a7a', '#2e346e', '#262c5e', '#1e2450', '#181c40'], 2);
  c._ready = true; return c;
}
// Letra del logotipo: crema con degradado dorado, contorno de tinta y sombra granate, ampliada ×3
const logoCache = new Map();
function logoLetter(ch) {
  let c = logoCache.get(ch); if (c) return c;
  const w = textWidth(ch) + 4, h = 12; const a = document.createElement('canvas'); a.width = w; a.height = h; const x = a.getContext('2d');
  const D = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [dx, dy] of D) drawText(x, ch, 2 + dx, 4 + dy, '#3a0e1a'); drawText(x, ch, 2, 4, '#7c1a2a'); // sombra
  for (const [dx, dy] of D) drawText(x, ch, 2 + dx, 2 + dy, INK);
  drawText(x, ch, 2, 2, '#fff4d0');
  const d = x.getImageData(0, 0, w, h); const px = d.data; const grad = [[255, 246, 214], [255, 240, 196], [252, 224, 150], [246, 200, 110], [236, 172, 82], [222, 146, 62], [200, 120, 50]];
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const k = (y * w + i) * 4; if (px[k] === 255 && px[k + 1] === 244 && px[k + 2] === 208) { const g = grad[Math.max(0, Math.min(6, y - 2))]; px[k] = g[0]; px[k + 1] = g[1]; px[k + 2] = g[2]; } }
  x.putImageData(d, 0, 0);
  c = document.createElement('canvas'); c.width = w * 3; c.height = h * 3; const y = c.getContext('2d'); y.imageSmoothingEnabled = false; y.drawImage(a, 0, 0, w * 3, h * 3);
  logoCache.set(ch, c); return c;
}
const LIT = []; for (let i = 0; i < 26; i++) LIT.push([62 + Math.floor(hash2(i, 5, 3) * 170), 88 + Math.floor(hash2(i, 6, 3) * 18), 20 + Math.floor(hash2(i, 7, 3) * 200)]);
function drawTitle(fr) {
  if (!titleBg) titleBg = buildTitleBg();
  const t = title.t++;
  ctx.drawImage(titleBg, 0, 0);
  // estrellas que titilan
  for (let i = 0; i < 10; i++) if ((fr + i * 37) % 120 < 6) sparkle(ctx, Math.floor(hash2(i, 11, 2) * W), Math.floor(hash2(i, 12, 2) * 40), 1, '#fffbe8');
  // nubes alargadas que pasan delante del sol
  for (let i = 0; i < 4; i++) { const cx = ((i * 97 + fr * (0.08 + i * 0.03)) % (W + 120)) - 60, cy = 44 + i * 9; ctx.fillStyle = i % 2 ? '#c85e6a' : '#a84e6a'; ctx.fillRect(Math.round(cx), cy, 44 - i * 6, 2); ctx.fillRect(Math.round(cx) + 6, cy - 1, 24 - i * 3, 1); ctx.fillStyle = '#f0a070'; ctx.fillRect(Math.round(cx) + 4, cy + 2, 30 - i * 5, 1); }
  // ventanas que se van encendiendo
  for (const [wx, wy, at] of LIT) { if (t < at) continue; const on = hash2(wx, Math.floor(fr / 70), 3) > 0.1; if (on) { ctx.fillStyle = '#f8c060'; ctx.fillRect(wx, wy, 1, 2); } }
  // olas y reflejo del sol
  for (let y = 128; y < H; y += 3) { const o = Math.floor((fr / 6 + y * 3) % 24); ctx.fillStyle = 'rgba(120,140,220,.35)'; for (let x0 = -24 + o; x0 < W; x0 += 24) ctx.fillRect(x0, y, 6 + (y % 5), 1); }
  for (let i = 0; i < 14; i++) { const w = 7 - (i % 4); const wob = Math.round(Math.sin(fr / 10 + i) * 2); ctx.fillStyle = i < 4 ? '#fff0b0' : '#f8c070'; ctx.fillRect(166 - w / 2 + wob + ((i * 7) % 9) - 4, 128 + i * 2, w, 1); }
  // barca con vela latina cruzando
  const bx = ((fr * 0.12) % (W + 60)) - 30, by = 138 + Math.round(Math.sin(fr / 20));
  ctx.fillStyle = '#1e1428'; ctx.fillRect(Math.round(bx), by, 14, 2); ctx.fillRect(Math.round(bx) + 2, by + 2, 10, 1); ctx.fillRect(Math.round(bx) + 6, by - 12, 1, 12); poly(ctx, [[bx + 7, by - 12], [bx + 15, by - 2], [bx + 7, by - 2]], '#2c1e38');
  // gaviotas
  for (let i = 0; i < 3; i++) { const gx = ((fr * (0.35 + i * 0.1) + i * 90) % (W + 40)) - 20, gy = 30 + i * 12 + Math.round(Math.sin(fr / 18 + i) * 4); const up = Math.floor(fr / 8 + i) % 2; ctx.fillStyle = '#2a1e38'; ctx.fillRect(Math.round(gx), gy, 1, 1); ctx.fillRect(Math.round(gx) - 2, gy - (up ? 1 : 0), 2, 1); ctx.fillRect(Math.round(gx) + 1, gy - (up ? 1 : 0), 2, 1); ctx.fillRect(Math.round(gx) - 3, gy - (up ? 2 : -1), 1, 1); ctx.fillRect(Math.round(gx) + 3, gy - (up ? 2 : -1), 1, 1); }
  // Logotipo: letras que caen y rebotan, brillo que lo recorre
  const word = 'BARCANUEVA'; const letters = [...word].map(logoLetter); const total = letters.reduce((a, l) => a + l.width - 6, 0) + 6; let lx = Math.round(W / 2 - total / 2);
  letters.forEach((img, i) => {
    const d = i * 4; const p = Math.min(1, Math.max(0, (t - d) / 22)); if (p <= 0) { lx += img.width - 6; return; }
    const y = Math.round(8 - (1 - ease.outBounce(p)) * 50); const wob = t > 70 ? Math.round(Math.sin((fr + i * 6) / 14) * 1) : 0;
    ctx.drawImage(img, lx, y + wob); lx += img.width - 6;
  });
  if (t > 70) { const sh = (fr * 3) % 420; if (sh < total) { const sx = Math.round(W / 2 - total / 2 + sh); const sy = 14 + Math.round(Math.abs(Math.sin(sh / 18)) * 18); sparkle(ctx, sx, sy, 3, '#ffffff'); sparkle(ctx, sx - 9, sy + 8, 1, '#fff4c0'); } }
  // subtítulo tecleado
  const sub = 'Crónicas de una ciudad junto al mar'; const n = Math.max(0, Math.floor((t - 50) / 1.5)); const s = sub.slice(0, n);
  if (n > 0) drawOutlined(ctx, s, Math.round((W - textWidth(sub)) / 2), 52, '#f8e0b0', '#2a1838');
  if (!ui.busy && t > 90 && title.phase === 'intro') { const a = 'Pulsa A'; const blink = fr % 60 < 42; if (blink) { drawOutlined(ctx, a, Math.round((W - textWidth(a)) / 2), 142, '#ffffff', '#1c1424'); hand(ctx, Math.round((W - textWidth(a)) / 2) - 12 + Math.round(Math.sin(fr / 6) * 1.5), 141); } }
}

async function titleMenu() {
  music('titulo'); preloadMusic(['ciudad', 'batalla', 'victoria']); title.t = 0; title.phase = 'intro';
  while (true) {
    await ui.custom({ update() { if ((input.pressed('A') || input.pressed('S')) && title.t > 30) { if (title.t < 90) title.t = 90; else { this.done = true; sfx('ok'); } } }, draw() { } });
    title.phase = 'menu';
    const opts = [hasSave() ? 'Continuar' : { label: 'Continuar', disabled: true }, 'Nueva partida'];
    const i = await ui.choose(opts, { x: 82, y: 92, cancel: null, start: hasSave() ? 0 : 1 });
    if (i === 0 && load()) { await transition('curtain', () => continueGame()); return; }
    if (i === 1) { await transition('curtain', () => { G.mode = 'create'; }); await newGameFlow(); return; }
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
  await transition('iris', () => { G.mode = 'world'; enterMap('ciudad', 20, 0, 'down', true); }, { cx: 120, cy: 80 });
  await intro();
}
function newDayInit() { S.flags.travel = {}; for (const n of NPCS) if (n.traveler && Math.random() < n.traveler.freq) S.flags.travel[n.id] = n.traveler.places[Math.floor(Math.random() * n.traveler.places.length)]; rollMarket(); }

async function intro() {
  const p = S.player;
  await autoWalk(['down', 'down', 'down', 'down'], true);
  emote(G.player, '!');
  await ui.say(`Día 1. Primavera. Tras semanas de camino, ${p.name} cruza el Portal del Ángel y entra en Barcanueva.`);
  await ui.say('La ciudad huele a sal, a pan y a incienso. Al fondo, la Seu; más abajo, el mar. En el monte del Juïc, el castillo del Conde Barnabás vigila el puerto.');
  const race = {
    humano: 'Nadie te presta especial atención. Aquí llegan forasteros cada día.',
    elfo: 'Una mujer se aparta para cederte el paso y un niño te mira las orejas con la boca abierta.',
    tiefling: 'Una vieja se santigua al verte los cuernos. Un guardia no te quita el ojo de encima.',
    enano: 'Dos mozos se dan un codazo y se ríen. «¡Mira, un enano! ¡Para el Corpus!»',
  }[p.race];
  await ui.say(race);
  await ui.say('Llevas ^y60 dineros^0, algo de pan y todo un año por delante. Puedes vivir como quieras: trabajar, cazar, cultivar, hacer amigos... o enemigos.');
  letterbox(false);
  await ui.say('^bA^0: hablar e interactuar · ^bB^0 (mantener): correr · ^bMENÚ^0: estado, mochila, diario... En las tiradas, pulsa ^yA^0 cuando el anillo abrace el dado para ganar ^y«pulso»^0.');
  logEvent('Llegas a Barcanueva');
}

function continueGame() {
  G.mode = 'world';
  if (!S.eco) initEco();
  enterMap(S.pos.map, S.pos.x, S.pos.y, S.pos.dir || 'down', true);
  ui.toast(`Bienvenido de nuevo, ${S.player.name}`, '#f8e0b0', 'estado');
}

// ───────────── Bucle ─────────────
let last = performance.now(), acc = 0; const STEP = 1000 / 60;
function frame(now) {
  requestAnimationFrame(frame); // primero: un error en un fotograma no debe parar el juego
  acc += Math.min(100, now - last); last = now;
  try { while (acc >= STEP) { tick(); acc -= STEP; } render(); } catch (e) { acc = 0; console.error(e); }
}
function tick() {
  G.frame++;
  fx.update();
  const busy = ui.busy;
  ui.update();
  if (busy) input.endFrame(); // la pulsación que cierra un diálogo no debe llegar al mundo
  if (G.mode === 'world' && !fx.frozen) updateWorld();
  input.endFrame();
}
function render() {
  const t0 = performance.now(); render2(); const dt = performance.now() - t0; G.perf = G.perf ? G.perf * 0.95 + dt * 0.05 : dt; if (dt > (G.perfMax || 0)) G.perfMax = dt;
}
function render2() {
  if (G.mode === 'title') drawTitle(G.frame);
  else if (G.mode === 'battle' && B.active) drawBattle(ctx, G.frame);
  else if ((G.mode === 'world' || G.mode === 'battle') && G.map) { drawWorld(ctx); drawHUD(ctx); }
  else { ctx.fillStyle = '#1a1424'; ctx.fillRect(0, 0, W, H); }
  if (!trans.on || trans.kind !== 'battle' || trans.phase !== 'out') drawTrans(ctx);
  ui.draw(ctx, G.frame);
  if (trans.on && trans.kind === 'battle' && trans.phase === 'out') drawTrans(ctx);
  drawParts(ctx, 'screen');
  for (const t of fx.texts) {
    if (t.layer !== 'screen') continue; const k = t.t / t.life; if (k > 0.8 && (t.t & 1)) continue;
    const pop = t.t < 6 ? ease.outBackBig(t.t / 6) : 1;
    if (t.big) { const sc = 2; const w = bigWidth(t.text, sc); const img = bigText(t.text, t.color, t.outline, sc); const h = Math.round(img.height * pop); ctx.drawImage(img, 0, 0, img.width, img.height, Math.round(t.x - w / 2), Math.round(t.y - h / 2), img.width, h); }
    else drawOutlined(ctx, t.text, Math.round(t.x - textWidth(t.text) / 2), Math.round(t.y), t.color, t.outline);
  }
  drawFlash(ctx);
}
requestAnimationFrame(frame);

// Ganchos de depuración
window.__barca = {
  talkTo(id) { const e = G.ents.find((x) => x.npc?.id === id); if (!e) return 'no está'; const p = G.player; p.x = e.x; p.y = e.y + 1; p.px = p.x * 16; p.py = p.y * 16; p.dir = 'up'; G.hooks.talk(e); return 'ok'; },
  where(id) { return G.ents.filter((e) => !id || e.npc?.id === id || e.sp === id).map((e) => (e.npc?.id || e.sp || e.kind) + '@' + e.x + ',' + e.y).join(' '); },
  fish, fight, animalEnemy, monster, dumpMap, G, S, MAPS, ui, input, enterMap, advance, newDay, addXP, save, NPCS, fx, musicState };

const qs = new URLSearchParams(location.search);
if (qs.has('quick')) {
  // Partida rápida para pruebas: ?quick=elfo,f
  const [race = 'humano', sex = 'm'] = qs.get('quick').split(',');
  const p = { name: 'Prueba', sex, race, look: { skin: race === 'tiefling' ? '#c9504a' : '#e8b48c', hair: '#5a3620', hairStyle: 1, top: '#3a6a9a', bottom: '#4a4a6a', beard: race === 'enano' }, stats: { fue: 2, int: 2, def: 2, esp: 2, car: 2 }, know: { nat: 2, his: 2, arc: 2, alq: 1, art: 1, caz: 1, com: 1 }, level: 1, equip: {} };
  newGame(p); p.equip = { body: 'tunica' }; S.inv.tunica = 1; S.inv.cana_pescar = 1; S.inv.azada = 1; S.inv.sem_col = 3;
  p.hpMax = maxHp(p); p.hp = p.hpMax; p.mpMax = maxMp(p); p.mp = p.mpMax;
  initEco(); newDayInit(); G.mode = 'world';
  const at = (qs.get('at') || 'ciudad,20,3').split(','); if (qs.has('hour')) S.min = +qs.get('hour') * 60;
  if (qs.has('day')) S.day = +qs.get('day');
  if (qs.has('weather')) S.flags.weather = { day: S.day, kind: qs.get('weather') };
  enterMap(at[0], +at[1], +at[2], 'down', true);
} else { G.mode = 'title'; titleMenu(); }
