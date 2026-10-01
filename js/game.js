// Escena de mundo: mapa, cámara, entidades (jugador, PNJ, animales), tiempo, luz, clima, ambiente y transiciones.
import { MAPS, PLACES, BUILDINGS, interior } from './world.js';
import { TS, TILE, renderMap, drawAnimated, drawAnimatedFront } from './tiles.js';
import * as BLD from './buildings.js';
import { charSprite } from './chars.js';
import { animalSprite } from './sprites.js';
import { drawFurniture, ANIMATED_FURNITURE } from './furniture.js';
import { S, phase, PHASES, clock, dateStr, season, dayOfSeason, weekday, npcState, XP_FOR, maxHp, maxMp, logEvent, save, SEASONS } from './state.js';
import { SP, ecoDay, faeAvailable } from './eco.js';
import { NPCS, NPC_BY_ID } from './data/npcs.js';
import { ITEMS } from './data/items.js';
import { ui, W, H, panel, text, icon, bar, T as UIT } from './ui.js';
import { drawText, textWidth, drawOutlined } from './font.js';
import { input } from './input.js';
import { sfx, music, step as stepSound, ambient } from './audio.js';
import { canvas, hash2, dirs, clamp } from './util.js';
import { fx, spawn, burst, shake, transition, trans, drawParts, drawTrans, drawFlash, ease, tween } from './fx.js';
import { INK, alpha, mix, PAL } from './pal.js';
import { bayer, ellipse, ellipseDither } from './px.js';

export const G = {
  mode: 'title', map: null, player: null, ents: [], frame: 0, fade: 0, fadeTo: null, cam: [0, 0], camF: [0, 0], phaseId: null,
  hooks: {}, // talk, interact, newDay, festival… (los rellenan otros módulos)
  debug: false, timeScale: 1.5, // minutos de juego por segundo real
};
const MOVE_FR = 8; // fotogramas por casilla andando
let EMOTES = null; import('./icons.js').then((m) => { EMOTES = m; }).catch(() => {});

// ───────────── Aspecto del jugador (equipo incluido) ─────────────
export function playerLook() {
  const p = S.player; const eq = {};
  for (const slot of ['head', 'body', 'cape']) { const it = p.equip?.[slot]; if (it && ITEMS[it]?.eq?.look) eq[slot] = ITEMS[it].eq.look; }
  return { ...p.look, race: p.race, sex: p.sex, equip: eq };
}
export function npcLook(n) { return { ...n.look, race: n.race, sex: n.sex, age: n.age, equip: n.look.equip || {} }; }

// ───────────── Capas del mapa (cacheadas por mapa y estación) ─────────────
const layers = new Map();
function mapLayers(m) {
  const sea = season(); const key = m.id + ':' + sea;
  let L = layers.get(key); if (L) return L;
  const bRows = new Map(); for (const b of m.buildings) { const r = b.y + b.h - 1; if (!bRows.has(r)) bRows.set(r, []); bRows.get(r).push(b); }
  const oRows = new Map(); for (const o of m.objects) { const r = o.y + o.h - 1; if (!oRows.has(r)) oRows.set(r, []); oRows.get(r).push(o); }
  const tmp = canvas(1, 1);
  L = renderMap(m, sea, (bx, ox, row) => {
    for (const o of oRows.get(row) || []) {
      if (ANIMATED_FURNITURE.has(o.type)) continue; // los animados se pintan cada fotograma
      // mueble: base completa; lo que asoma sobre su huella, a la capa superior
      const [c, x] = canvas(o.w * TS + 8, o.h * TS + 24); drawFurniture(x, o, 4, 20, 0);
      bx.drawImage(c, o.x * TS - 4, o.y * TS - 20); ox.drawImage(c, 0, 0, c.width, 20, o.x * TS - 4, o.y * TS - 20, c.width, 20);
    }
    for (const b of (bRows.get(row) || []).sort((a, z) => a.x - z.x)) {
      const [c, x] = canvas(b.w * TS + 8, b.h * TS + 28); BLD.drawBuilding(x, b, b.x * TS - 4, b.y * TS - 28);
      bx.drawImage(c, b.x * TS - 4, b.y * TS - 28); ox.drawImage(c, 0, 0, c.width, 28, b.x * TS - 4, b.y * TS - 28, c.width, 28);
    }
  });
  // luces de la noche
  const pts = [];
  for (const [x, y] of L.lamps) pts.push([x * TS + 8, y * TS - 10, 34, 'lamp']);
  const LR = { win: 13, slit: 8, shop: 18, lamp: 30, fire: 38, glow: 22, rose: 20 };
  for (const b of m.buildings) { if (b.lit?.length) for (const r of b.lit) pts.push([r.x + r.w / 2, r.y + r.h / 2 + 2, LR[r.k] || 13, r.k === 'lamp' ? 'lamp' : r.k === 'fire' ? 'fire' : r.k === 'glow' ? 'glow' : r.k === 'rose' ? 'rose' : 'win']); else if (['casa', 'taberna', 'tienda', 'masia', 'cabana', 'hospital', 'cuartel'].includes(b.kind)) pts.push([b.door.x * TS + 8, b.door.y * TS + 6, 18, 'win']); }
  for (const o of m.objects) if (['chimenea', 'vela', 'altar', 'fragua', 'caldero'].includes(o.type)) pts.push([o.x * TS + o.w * 8, o.y * TS + 8, o.type === 'chimenea' || o.type === 'fragua' ? 52 : 26, 'fire']);
  L.lights = pts; L.season = sea;
  L.smoke = m.buildings.flatMap((b) => b.smoke || []);
  L.animObjs = m.objects.filter((o) => ANIMATED_FURNITURE.has(o.type));
  layers.set(key, L);
  if (layers.size > 10) layers.delete(layers.keys().next().value);
  return L;
}
export { mapLayers };
export function dumpMap(id) { const m = MAPS[id] || interior(id); const L = mapLayers(m); const [c, x] = canvas(L.W, L.H); x.drawImage(L.base, 0, 0); x.drawImage(L.over, 0, 0); return c.toDataURL(); }
export function invalidateMap(id) { for (const k of [...layers.keys()]) if (k.startsWith(id + ':')) layers.delete(k); }

// ───────────── Entidades ─────────────
function ent(kind, x, y, extra = {}) { return { kind, x, y, px: x * TS, py: y * TS, dir: 'down', mv: 0, from: null, frame: 0, path: null, idle: 60 + Math.random() * 120, seed: Math.floor(Math.random() * 400), ...extra }; }

export function occupied(x, y, except) { return G.ents.some((e) => e !== except && !e.gone && e.x === x && e.y === y && e.kind !== 'animal_small'); }
function walkable(m, x, y, who) {
  if (m.solidAt(x, y)) return false;
  const t = m.get(x, y);
  if (TILE[t]?.water && t !== '~') return false;
  if (who?.kind === 'npc' && (t === '"' && m.biome === 'urbano')) return false;
  return true;
}

// BFS hacia un objetivo (casilla). Devuelve lista de pasos.
export function findPath(m, sx, sy, tx, ty, maxN = 2500) {
  if (sx === tx && sy === ty) return [];
  const key = (x, y) => y * m.w + x; const prev = new Map([[key(sx, sy), -1]]); const q = [[sx, sy]]; let n = 0, qi = 0;
  while (qi < q.length && n++ < maxN) {
    const [x, y] = q[qi++];
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy; const k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || prev.has(k)) continue;
      if (!(nx === tx && ny === ty) && !walkable(m, nx, ny)) continue;
      prev.set(k, key(x, y));
      if (nx === tx && ny === ty) {
        const out = []; let c = k; while (c !== key(sx, sy)) { out.unshift([c % m.w, Math.floor(c / m.w)]); c = prev.get(c); } return out;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

// ───────────── Horarios de PNJ ─────────────
function resolvePlace(npc, key, ph) {
  if (!key) return null;
  if (key === 'home') {
    const h = npc.home; if (!h) return null;
    const cands = ph === 'noche' ? ['cama', 'tendero', 'fuego', 'mesa', 'rincon'] : ['mesa', 'fuego', 'rincon', 'mesa2', 'tendero', 'cama'];
    for (const c of cands) if (PLACES[h + ':' + c]) return PLACES[h + ':' + c];
    const any = Object.keys(PLACES).find((k) => k.startsWith(h + ':')); return any ? PLACES[any] : null;
  }
  return PLACES[key] || null;
}
export function npcTarget(npc, ph = phase().id) {
  const st = npcState(npc.id);
  if (!st.alive || st.gone) return null;
  const ov = G.hooks.override?.(npc, ph); if (ov !== undefined) return ov ? resolvePlace(npc, ov, ph) : null;
  if (npc.traveler) {
    const today = S.flags.travel?.[npc.id]; if (!today || !npc.traveler.when.includes(ph)) return null;
    return resolvePlace(npc, today, ph);
  }
  let key = npc.sched[ph];
  if (weekday() === 'Domingo' && npc.sched.sun && (ph === 'manana' || ph === 'dia')) key = npc.sched.sun;
  return resolvePlace(npc, key, ph);
}

function spawnNPCs() {
  const m = G.map; const ph = phase().id;
  G.ents = G.ents.filter((e) => e.kind === 'player' || e.kind === 'pet');
  for (const n of NPCS) {
    const t = npcTarget(n, ph); if (!t || t.map !== m.id) continue;
    const [x, y] = freeNear(m, t.x, t.y);
    G.ents.push(ent('npc', x, y, { npc: n, ap: npcLook(n), home: [t.x, t.y], dir: 'down', ghost: n.ghost }));
  }
  spawnAnimals();
}
function freeNear(m, x, y) {
  if (walkable(m, x, y) && !occupied(x, y)) return [x, y];
  for (let r = 1; r < 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (walkable(m, nx, ny) && !occupied(nx, ny)) return [nx, ny]; }
  return [x, y];
}

// Cambio de franja estando en el mapa: los PNJ caminan hacia su nuevo sitio o se van por la salida más cercana.
function rescheduleNPCs() {
  const m = G.map; const ph = phase().id;
  for (const e of G.ents) {
    if (e.kind !== 'npc') continue;
    const t = npcTarget(e.npc, ph);
    if (t && t.map === m.id) { e.home = [t.x, t.y]; e.path = findPath(m, e.x, e.y, t.x, t.y); e.leaving = false; }
    else { const ex = nearestExit(m, e.x, e.y); e.leaving = true; e.path = ex ? findPath(m, e.x, e.y, ex[0], ex[1]) : null; if (!e.path) e.gone = true; }
  }
  for (const n of NPCS) {
    if (G.ents.some((e) => e.npc === n)) continue;
    const t = npcTarget(n, ph); if (!t || t.map !== m.id) continue;
    const ex = nearestExit(m, t.x, t.y) || [t.x, t.y]; const [x, y] = freeNear(m, ex[0], ex[1]);
    const e = ent('npc', x, y, { npc: n, ap: npcLook(n), home: [t.x, t.y], ghost: n.ghost }); e.path = findPath(m, x, y, t.x, t.y); G.ents.push(e);
  }
}
function nearestExit(m, x, y) {
  const c = [];
  for (const w of m.warps) c.push([w.x, w.y + (m.outdoor ? 1 : -1)]);
  for (const [edge, ex] of Object.entries(m.exits || {})) for (const v of ex.range) c.push(edge === 'north' ? [v, 0] : edge === 'south' ? [v, m.h - 1] : edge === 'west' ? [0, v] : [m.w - 1, v]);
  c.sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y));
  return c[0];
}

// ───────────── Animales visibles ─────────────
function spawnAnimals() {
  const m = G.map; if (!m.outdoor || !S.eco?.maps[m.id]) return;
  const ph = phase().id; const list = S.eco.maps[m.id].filter((a) => SP[a.sp] && !SP[a.sp].fish && SP[a.sp].act?.includes(ph));
  list.sort((a, b) => hash2(a.id, S.day, 7) - hash2(b.id, S.day, 7));
  const cap = m.biome === 'urbano' ? 7 : 14; let n = 0;
  for (const a of list) {
    if (n >= cap) break;
    const s = SP[a.sp];
    for (let tries = 0; tries < 30; tries++) {
      const x = Math.floor(hash2(a.id, tries, 3) * m.w), y = Math.floor(hash2(tries, a.id, 5) * m.h);
      const t = m.get(x, y);
      if (!walkable(m, x, y) || occupied(x, y)) continue;
      if (m.biome === 'urbano' && !['+', '=', 'k'].includes(t)) continue;
      if (['rana', 'galapago', 'garza', 'anade', 'nutria', 'castor'].includes(a.sp) && !nearWater(m, x, y)) continue;
      if (Math.abs(x - G.player.x) + Math.abs(y - G.player.y) < 5) continue;
      G.ents.push(ent('animal', x, y, { a, sp: a.sp, dir: hash2(x, y) > 0.5 ? 'left' : 'right', hp: Math.round(s.hp * (a.age < s.mature ? 0.5 : 1)) }));
      n++; break;
    }
  }
}
function nearWater(m, x, y) { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (TILE[m.get(x + i, y + j)]?.water) return true; return false; }

// ───────────── Clima del día ─────────────
export function weatherToday() {
  const w = S.flags.weather; if (w && w.day === S.day) return w.kind;
  const sea = season(); const r = hash2(S.day, 77, 3);
  const kind = sea === 0 ? (r < 0.62 ? 'sol' : r < 0.82 ? 'nubes' : 'lluvia') : sea === 1 ? (r < 0.78 ? 'sol' : r < 0.9 ? 'nubes' : 'tormenta') : sea === 2 ? (r < 0.4 ? 'sol' : r < 0.62 ? 'nubes' : r < 0.82 ? 'lluvia' : r < 0.92 ? 'niebla' : 'tormenta') : (r < 0.45 ? 'sol' : r < 0.7 ? 'nubes' : r < 0.85 ? 'niebla' : 'nieve');
  S.flags.weather = { day: S.day, kind }; return kind;
}
function localWeather() {
  const m = G.map; if (!m?.outdoor) return 'interior';
  let w = weatherToday();
  if (w === 'nieve' && !['montana', 'bosque', 'pradera'].includes(m.biome)) w = 'lluvia';
  if (m.biome === 'montana' && (w === 'lluvia' || w === 'tormenta') && season() === 3) w = 'nieve';
  return w;
}

// ───────────── Entrar en mapas ─────────────
export function enterMap(id, x, y, dir = 'down', silent = false) {
  const m = MAPS[id] || interior(id); if (!m) { console.warn('mapa', id); return; }
  const prevMap = G.map;
  G.map = m; S.pos = { map: id, x, y, dir };
  G.player = ent('player', x, y, { dir }); G.ents = [G.player];
  if (S.pet) G.ents.push(ent('pet', x, y + 1 < m.h ? y + 1 : y, { sp: S.pet.sp, dir: 'right' }));
  spawnNPCs(); G.phaseId = phase().id;
  if (!S.known['map:' + id]) { S.known['map:' + id] = 1; if (!silent && id !== 'ciudad') addXP(8, 'Lugar nuevo'); }
  updateMusic();
  mapLayers(m);
  fx.parts = fx.parts.filter((p) => p.layer === 'screen');
  G.mapLabel = null;
  G.hooks.enterMap?.(m);
  if (G.mapLabel && prevMap !== m) { const sub = m.outdoor ? ({ urbano: 'Intramuros', pradera: 'Extramuros', bosque: 'Sierra', montana: 'Montaña', rio: 'Ribera', costa: 'Litoral', montjuic: 'Monte' }[m.biome] || '') : ''; ui.banner(G.mapLabel.name, { sub, sfx: m.outdoor ? 'banner' : 'page' }); }
  G.mapLabel = null;
  camSnap();
  G.reacted = new Set();
}
export function updateMusic() {
  const m = G.map; const ph = phase().id; const b = m.biome;
  let s = b === 'urbano' ? 'ciudad' : b === 'bosque' || b === 'montana' ? 'bosque' : 'campo';
  if (!m.outdoor) { const bid = m.id.slice(4); const k = BUILDINGS[bid]?.kind; s = k === 'taberna' ? 'taberna' : k === 'catedral' ? 'iglesia' : k === 'castillo' ? 'castillo' : ph === 'noche' ? 'noche' : 'ciudad'; if (m.biome === 'cueva') s = 'noche'; }
  if (m.id === 'montjuic') s = 'castillo';
  if ((ph === 'noche' || ph === 'crepusculo') && m.outdoor) s = 'noche';
  if (G.mode === 'battle') return; // la música de combate la gestiona battle.js
  music(s);
  // ambiente sonoro
  const night = ph === 'noche' || ph === 'crepusculo'; const w = localWeather();
  let a = '';
  if (!m.outdoor) a = BUILDINGS[m.id.slice(4)]?.kind === 'taberna' || m.objects.some((o) => o.type === 'chimenea' || o.type === 'fragua') ? 'fuego' : '';
  else { a = night ? 'grillos buho' : 'pajaros'; if (b === 'costa') a += ' costa gaviotas'; if (b === 'rio') a += ' rio'; if (b === 'montana') a += ' viento'; if (b === 'urbano' && !night) a = 'gaviotas'; if (w === 'lluvia' || w === 'tormenta') a = 'lluvia' + (b === 'costa' ? ' costa' : ''); }
  ambient(a || null);
}
// Transición con iris hacia el jugador (puertas) o barrido (bordes de mapa)
function transitionTo(kind, fn, o = {}) {
  if (trans.on) return;
  const p = G.player; const [cx, cy] = G.cam;
  sfx(kind === 'iris' ? 'door' : 'whoosh');
  transition(kind, fn, { cx: p.px - cx + 8, cy: p.py - cy, ...o });
}

// ───────────── Tiempo ─────────────
export function advance(mins) {
  S.min += mins;
  while (S.min >= 1440) { S.min -= 1440; newDay(); }
  const ph = phase().id;
  if (ph !== G.phaseId) { G.phaseId = ph; if (G.map) { rescheduleNPCs(); refreshAnimals(); updateMusic(); } G.hooks.phase?.(ph); }
}
function refreshAnimals() { G.ents = G.ents.filter((e) => e.kind !== 'animal'); spawnAnimals(); }
export function newDay() {
  S.day++;
  const news = ecoDay() || [];
  S.flags.travel = {};
  for (const n of NPCS) if (n.traveler) {
    let ok = Math.random() < n.traveler.freq;
    if (n.fae === 'dona_aigua' && !faeAvailable().dona_aigua) ok = false;
    if (npcState(n.id).gone) ok = false;
    if (ok) S.flags.travel[n.id] = n.traveler.places[Math.floor(Math.random() * n.traveler.places.length)];
  }
  for (const id in S.npc) { S.npc[id].talked = 0; }
  G.hooks.newDay?.(news);
  for (const n of news) ui.toast(n, '#f8c080');
  if (G.map) updateMusic();
}

// ───────────── XP y niveles ─────────────
export function addXP(n, why) {
  const p = S.player; p.xp += n;
  if (why && n >= 3) ui.toast(`+${n} XP · ${why}`, '#c8f0a8');
  while (p.xp >= XP_FOR(p.level)) {
    p.xp -= XP_FOR(p.level); p.level++; p.ptsB += 5; p.ptsK += 5;
    p.hpMax = maxHp(p); p.mp = p.mpMax = maxMp(p); p.hp = p.hpMax;
    sfx('level'); ui.announce(`¡NIVEL ${p.level}!`, { sub: '+5 básicas · +5 sabiduría' }); ui.toast(`Nivel ${p.level}: reparte puntos en Estado`, '#f8e060', 'estrella'); logEvent(`Subes a nivel ${p.level}`);
    if (G.player && G.mode === 'world') { const [cx, cy] = G.cam; for (let i = 0; i < 24; i++) spawn({ x: G.player.px + 8 + (Math.random() - 0.5) * 12, y: G.player.py + 12, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 1.4, life: 50, kind: 'star', color: i % 2 ? '#fcd456' : '#fff4c0', layer: 'sky' }); }
  }
}

// ───────────── Bucle del mundo ─────────────
export function updateWorld() {
  // compatibilidad con código que aún pide fundidos a la antigua
  if (G.fade > 0) { const f = G.fadeTo; G.fade = 0; G.fadeTo = null; transition(f ? 'fade' : 'sleep', f || null); }
  if (trans.on) { camFollow(); return; }
  if (ui.busy) { camFollow(); return; }
  advance(G.timeScale / 60);
  if (S.min > 150 && S.min < 360 && !S.flags.sleeping) { G.hooks.faint?.(); return; }
  const p = G.player;
  // Paseo guionizado (escenas): el jugador avanza solo por una lista de direcciones
  if (G.auto) {
    if (p.mv > 0) stepEnt(p, 1);
    else if (G.auto.q.length) tryMove(p, G.auto.q.shift());
    else { const r = G.auto.res; G.auto = null; r(); }
    for (const e of G.ents) { if (e === p || e.gone) continue; if (e.kind === 'npc') updateNPC(e); else if (e.kind === 'animal') updateAnimal(e); else if (e.kind === 'pet') updatePet(e); }
    camFollow(); return;
  }
  if (input.pressed('S')) { G.hooks.menu?.(); return; }
  if (p.mv > 0) stepEnt(p, input.held('B') ? 2 : 1);
  if (p.mv === 0) {
    const d = input.dir();
    if (d) {
      if (p.dir !== d && !p.turned) { p.dir = d; p.turned = 4; }
      else if (!p.turned || --p.turned <= 0) { p.turned = 0; tryMove(p, d); }
    } else p.turned = 0;
    if (p.mv === 0 && input.pressed('A')) interact();
  }
  p.still = p.mv === 0 && !input.dir() ? (p.still || 0) + 1 : 0;
  for (const e of G.ents) {
    if (e === p || e.gone) continue;
    if (e.kind === 'npc') updateNPC(e); else if (e.kind === 'animal') updateAnimal(e); else if (e.kind === 'pet') updatePet(e);
  }
  G.ents = G.ents.filter((e) => !e.gone);
  reactions();
  ambientFx();
  camFollow();
}

function tryMove(e, d) {
  const [dx, dy] = dirs[d]; const nx = e.x + dx, ny = e.y + dy; const m = G.map;
  e.dir = d;
  if (e === G.player && (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h)) {
    const edge = nx < 0 ? 'west' : nx >= m.w ? 'east' : ny < 0 ? 'north' : 'south';
    const ex = m.exits?.[edge]; const v = edge === 'north' || edge === 'south' ? e.x : e.y;
    if (ex && v >= ex.range[0] - 1 && v <= ex.range[ex.range.length - 1] + 1) {
      const Tm = MAPS[ex.to]; const te = ex.toEdge || { north: 'south', south: 'north', east: 'west', west: 'east' }[edge]; const tv = clamp(ex.map(v), 0, (te === 'north' || te === 'south' ? Tm.w : Tm.h) - 1);
      const pos = te === 'south' ? [tv, Tm.h - 1, 'up'] : te === 'north' ? [tv, 0, 'down'] : te === 'west' ? [0, tv, 'right'] : [Tm.w - 1, tv, 'left'];
      transitionTo('wipe', () => enterMap(ex.to, pos[0], pos[1], pos[2]), { dir: { north: 'up', south: 'down', east: 'right', west: 'left' }[edge] });
      return;
    }
    bumpFx(e, d); return;
  }
  if (e === G.player) {
    const w = m.warps.find((w) => w.x === nx && w.y === ny);
    if (w) { useWarp(w); return; }
  }
  if (!walkable(m, nx, ny, e) || occupied(nx, ny, e)) { if (e === G.player && !e.bumped) { bumpFx(e, d); e.bumped = 12; } return; }
  e.from = [e.x, e.y]; e.x = nx; e.y = ny; e.mv = MOVE_FR;
}
function bumpFx(e, d) {
  sfx('bump'); const [dx, dy] = dirs[d];
  for (let i = 0; i < 3; i++) spawn({ x: e.px + 8 + dx * 7 + (Math.random() - 0.5) * 6, y: e.py + 13 + dy * 4, vx: -dx * 0.3 + (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.3, life: 14, kind: 'puff', size: 1, color: '#d8c8a8', layer: 'world' });
  G.camNudge = [dx * 2, dy * 2];
}
function terrainAt(x, y) {
  const t = G.map.get(x, y);
  if (t === '~') return 'water'; if (t === 'i' || t === 'k' || t === 'q' || t === 'e') return 'wood';
  if (t === '=' || t === '+' || t === 'I' || t === 'r' || t === 'v') return 'stone'; if (t === 's') return 'sand'; if (t === 'n') return 'snow';
  if (t === '"' || t === 'm') return 'tall'; return 'grass';
}
function stepEnt(e, speed = 1) {
  e.mv = Math.max(0, e.mv - speed);
  const t = 1 - e.mv / MOVE_FR;
  e.px = (e.from[0] + (e.x - e.from[0]) * t) * TS; e.py = (e.from[1] + (e.y - e.from[1]) * t) * TS;
  e.frame = e.mv > MOVE_FR / 2 ? ((e.stepN || 0) % 2 ? 1 : 3) : 0;
  if (e.mv === 0) { e.stepN = (e.stepN || 0) + 1; e.px = e.x * TS; e.py = e.y * TS; if (e === G.player) arrived(speed > 1); else if (e.kind === 'npc' && Math.abs(e.x - G.player.x) + Math.abs(e.y - G.player.y) < 6 && e.stepN % 2) {} }
}
function arrived(running) {
  const p = G.player; if (p.bumped) p.bumped = 0;
  const t = G.map.get(p.x, p.y); const ter = terrainAt(p.x, p.y);
  if (p.stepN % 2 === 0 || running) stepSound(ter === 'tall' ? 'grass' : ter);
  if (ter === 'tall') { sfx('rustle'); for (let i = 0; i < 3; i++) spawn({ x: p.px + 4 + Math.random() * 8, y: p.py + 8 + Math.random() * 4, vx: (Math.random() - 0.5) * 0.8, vy: -0.8 - Math.random() * 0.6, ay: 0.06, life: 26, kind: 'leaf', color: PAL.grass[5], color2: PAL.grass[7], layer: 'world' }); }
  if (ter === 'sand' || ter === 'snow') { const off = p.stepN % 2 ? 3 : -3; const horiz = p.dir === 'left' || p.dir === 'right'; spawn({ x: p.px + 8 + (horiz ? 0 : off), y: p.py + 13 + (horiz ? off * 0.5 : 0), life: 420, kind: 'px', size: 2, color: ter === 'sand' ? 'rgba(150,110,70,.55)' : 'rgba(150,170,210,.6)', layer: 'ground' }); }
  if (ter === 'water') { for (let i = 0; i < 4; i++) spawn({ x: p.px + 8, y: p.py + 14, vx: (Math.random() - 0.5) * 1.2, vy: -0.6 - Math.random() * 0.6, ay: 0.08, life: 18, kind: 'px', color: '#c8f0ff', layer: 'world' }); spawn({ x: p.px + 8, y: p.py + 14, life: 22, kind: 'ring', size: 2, color: '#e8faff', layer: 'ground' }); }
  if (running && (ter === 'grass' || ter === 'sand' || ter === 'stone' || ter === 'snow')) { const c = ter === 'sand' ? '#f0dcb0' : ter === 'snow' ? '#ffffff' : ter === 'stone' ? '#c8bcb0' : '#d8c8a0'; spawn({ x: p.px + 8 - dirs[p.dir][0] * 6, y: p.py + 14, vx: -dirs[p.dir][0] * 0.4, vy: -0.25, life: 16, kind: 'puff', size: 1, color: c, layer: 'ground' }); }
  if (t === '"' && G.map.outdoor && Math.random() < 0.035) G.hooks.encounter?.('hierba');
  if (G.map.outdoor && S.min >= 1260 && Math.random() < 0.004 && G.map.biome !== 'urbano') G.hooks.encounter?.('noche');
  if (!S.known[`t:${G.map.id}:${p.x >> 3}:${p.y >> 3}`]) { S.known[`t:${G.map.id}:${p.x >> 3}:${p.y >> 3}`] = 1; addXP(1); }
}
export function useWarp(w) {
  if (w.secret && G.hooks.secretWarp && !G.hooks.secretWarp(w)) return;
  if (G.hooks.canEnter && !G.hooks.canEnter(w)) return;
  if (w.exit) { transitionTo('iris', () => enterMap(w.to, w.tx, w.ty, 'down')); return; }
  if (w.secretEntry) { transitionTo('fade', () => { enterMap(w.to, w.tx, w.ty, 'right'); G.hooks.infiltrate?.(); }); return; }
  const m = interior(w.to);
  const ex = m.warps.find((x) => x.exit);
  if (w.building) G.doorOpen = { b: BUILDINGS[w.building], t: 0 };
  transitionTo('iris', () => { G.doorOpen = null; enterMap(w.to, ex ? ex.x : 1, ex ? ex.y - 1 : 1, 'up'); });
}

function updateNPC(e) {
  if (e.mv > 0) { stepEnt(e); return; }
  if (e.talking) return;
  if (e.path && e.path.length) {
    const [nx, ny] = e.path[0];
    if (occupied(nx, ny, e) || (G.player.x === nx && G.player.y === ny)) { e.wait = (e.wait || 0) + 1; if (e.wait === 40 && G.player.x === nx && G.player.y === ny) emote(e, 'dots'); if (e.wait > 90) { e.path = findPath(G.map, e.x, e.y, e.home[0], e.home[1]); e.wait = 0; } return; }
    e.wait = 0; e.path.shift();
    const d = nx > e.x ? 'right' : nx < e.x ? 'left' : ny > e.y ? 'down' : 'up';
    tryMove(e, d);
    if (e.leaving && !e.path.length) e.gone = true;
    return;
  }
  if (e.leaving) { e.gone = true; return; }
  if (--e.idle <= 0) {
    e.idle = 90 + Math.random() * 200;
    const fixed = e.npc.shop || /:(tendero|tabernero|medico|cambista|conde|condesa|altar)$/.test(e.npc.sched?.[G.phaseId] || '') || e.npc.id === 'arnau_guardia';
    if (fixed) { e.dir = 'down'; if (Math.random() < 0.18 && e.npc.shop) emote(e, 'note'); return; }
    if (Math.random() < 0.08) emote(e, G.phaseId === 'noche' ? 'zzz' : ['note', 'dots', 'idea'][Math.floor(Math.random() * 3)]);
    const ds = ['up', 'down', 'left', 'right']; const d = ds[Math.floor(Math.random() * 4)]; const [dx, dy] = dirs[d];
    if (Math.abs(e.x + dx - e.home[0]) + Math.abs(e.y + dy - e.home[1]) <= 2) tryMove(e, d); else e.dir = d;
  }
}

function updateAnimal(e) {
  const s = SP[e.sp]; const p = G.player;
  if (e.flying) { e.flyT++; e.px += e.fvx; e.py += e.fvy - e.flyT * 0.02; if (e.flyT > 90) e.gone = true; return; }
  if (e.mv > 0) { stepEnt(e, e.fast ? 2 : 1); return; }
  const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
  const flee = (s.beh === 'huye' || s.beh === 'vuela') && dist < (S.player.sneak ? 2 : 4) && !e.calm;
  if (s.beh === 'vuela' && dist < 2 && !e.calm) { // echa a volar de verdad
    e.flying = true; e.flyT = 0; e.fvx = (e.x >= p.x ? 1 : -1) * (0.9 + Math.random() * 0.5); e.fvy = -0.6 - Math.random() * 0.4; e.dir = e.fvx > 0 ? 'right' : 'left'; sfx('flap');
    for (let i = 0; i < 3; i++) spawn({ x: e.px + 8, y: e.py + 8, vx: (Math.random() - 0.5), vy: -Math.random(), ay: 0.03, life: 30, kind: 'leaf', color: SP[e.sp].col[0], layer: 'world' });
    return;
  }
  if (s.beh === 'embiste' && dist <= 2 && !e.calm && !e.charged && Math.random() < 0.02) { e.charged = true; G.hooks.encounter?.('embiste', e); return; }
  if (s.beh === 'caza' && dist <= 3 && !e.calm && (S.min > 1140 || S.min < 360) && Math.random() < 0.01) { G.hooks.encounter?.('caza', e); return; }
  if (s.beh === 'pica' && dist <= 1 && !e.calm && Math.random() < 0.01) { G.hooks.encounter?.('pica', e); return; }
  if (flee) {
    if (!e.fast) { emote(e, '!'); }
    e.fast = true; const dx = Math.sign(e.x - p.x), dy = Math.sign(e.y - p.y);
    const opts = [[dx, 0], [0, dy], [dx, dy === 0 ? 1 : 0], [dx === 0 ? 1 : 0, dy]].filter(([a, b]) => a || b);
    for (const [a, b] of opts) { const d = a > 0 ? 'right' : a < 0 ? 'left' : b > 0 ? 'down' : 'up'; const bx = e.x, by = e.y; tryMove(e, d); if (e.x !== bx || e.y !== by) { e.dir = a < 0 ? 'left' : a > 0 ? 'right' : e.dir; spawn({ x: e.px + 8, y: e.py + 14, vy: -0.2, life: 12, kind: 'puff', size: 1, color: '#d8c8a8', layer: 'ground' }); return; } }
    return;
  }
  e.fast = false;
  if (Array.isArray(s.diet) && !e.calm) {
    const prey = G.ents.find((o) => o.kind === 'animal' && !o.gone && !o.flying && s.diet.includes(o.sp) && Math.abs(o.x - e.x) + Math.abs(o.y - e.y) < 6);
    if (prey && Math.random() < 0.3) {
      if (Math.abs(prey.x - e.x) + Math.abs(prey.y - e.y) <= 1 && Math.random() < 0.25) {
        prey.gone = true; const L = S.eco.maps[G.map.id]; const i = L.indexOf(prey.a); if (i >= 0) L.splice(i, 1);
        if (dist < 9) { ui.toast(`${s.name} caza un ${SP[prey.sp].name.toLowerCase()}.`, '#f8a0a0'); burst(prey.px + 8, prey.py + 10, 8, { color: '#e8e0d0', colors: ['#e8e0d0', '#a83a3a'], life: 20, speed: 1.2, layer: 'world' }); }
        return;
      }
      const d = Math.abs(prey.x - e.x) > Math.abs(prey.y - e.y) ? (prey.x > e.x ? 'right' : 'left') : (prey.y > e.y ? 'down' : 'up');
      tryMove(e, d); if (d === 'left' || d === 'right') e.dir = d; return;
    }
  }
  if (--e.idle <= 0) {
    e.idle = 40 + Math.random() * 140;
    if (Math.random() < 0.35) { e.pose = 'idle'; e.poseT = 50; return; }
    const d = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
    tryMove(e, d); if (d === 'left' || d === 'right') e.dir = d;
  }
}
function updatePet(e) {
  if (e.mv > 0) { stepEnt(e); return; }
  const p = G.player; const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
  if (d > 8) { e.x = p.x; e.y = p.y; e.px = e.x * TS; e.py = e.y * TS; return; }
  if (d > 1) {
    const path = findPath(G.map, e.x, e.y, p.x, p.y, 400);
    if (path && path.length > 1) { const [nx, ny] = path[0]; const dd = nx > e.x ? 'right' : nx < e.x ? 'left' : ny > e.y ? 'down' : 'up'; tryMove(e, dd); if (dd === 'left' || dd === 'right') e.dir = dd; }
  } else if (p.still > 120 && Math.random() < 0.004) emote(e, 'heart');
}

export function autoWalk(dirsList) { G.letterbox = G.letterbox || 0; tween(G, { letterbox: 1 }, 20, ease.outCubic); return new Promise((res) => { G.auto = { q: [...dirsList], res: () => { tween(G, { letterbox: 0 }, 24, ease.inOutQuad); res(); } }; }); }

// ───────────── Emoticonos y reacciones ─────────────
export function emote(e, name, life = 70) { e.emote = { name, t: 0, life }; if (e === G.player || (Math.abs(e.x - G.player.x) + Math.abs(e.y - G.player.y) < 8)) sfx('emote'); }
function reactions() {
  const p = G.player; if (!G.reacted) G.reacted = new Set();
  for (const e of G.ents) {
    if (e.kind !== 'npc' || e.talking || e.emote) continue;
    const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y); if (d > 2) continue;
    const k = e.npc.id + ':' + S.day + ':' + G.phaseId; if (G.reacted.has(k)) continue; G.reacted.add(k);
    const att = G.hooks.attitude?.(e.npc); const st = S.npc[e.npc.id];
    const rel = st?.rel ?? 0;
    let em = null;
    if (st?.partner || st?.married) em = 'heart';
    else if (att === 'miedo') em = 'sweat'; else if (att === 'hostil') em = 'anger'; else if (att === 'respeto') em = '!'; else if (att === 'burla') em = 'note';
    else if (!st?.met) em = Math.random() < 0.5 ? '?' : null; else if (rel >= 40) em = 'heart'; else if (rel >= 15 && Math.random() < 0.5) em = 'note';
    if (em) { if (e.mv === 0 && !e.path?.length) e.dir = Math.abs(p.x - e.x) > Math.abs(p.y - e.y) ? (p.x > e.x ? 'right' : 'left') : (p.y > e.y ? 'down' : 'up'); emote(e, em); }
  }
}

// ───────────── Partículas de ambiente ─────────────
function ambientFx() {
  const m = G.map; const [cx, cy] = G.cam; const ph = phase().id; const night = ph === 'noche'; const sea = season(); const f = G.frame; const w = localWeather();
  const rx = () => cx + Math.random() * W, ry = () => cy + Math.random() * H;
  if (m.outdoor) {
    if (w === 'lluvia' || w === 'tormenta') { for (let i = 0; i < (w === 'tormenta' ? 5 : 3); i++) spawn({ x: rx() + 20, y: cy - 4 + Math.random() * 40, vx: -1.2, vy: 5.5, life: 26 + Math.random() * 10, kind: 'streak', size: 4, color: alpha('#bcd8f0', 0.75), layer: 'sky', fade: false, floor: undefined, splash: true }); if (f % 3 === 0) spawn({ x: rx(), y: ry(), life: 10, kind: 'ring', size: 1, color: alpha('#d8ecff', 0.6), layer: 'ground' }); }
    if (w === 'nieve' && f % 2 === 0) spawn({ x: rx(), y: cy - 4, vx: -0.2 + Math.random() * 0.2, vy: 0.5 + Math.random() * 0.4, life: 300, kind: 'leaf', color: '#ffffff', layer: 'sky', fade: false, seed: Math.random() });
    if (m.biome === 'bosque' && !night && f % 18 === 0) spawn({ x: rx(), y: cy - 4, vx: 0.3, vy: 0.35, life: 280, kind: 'leaf', color: sea === 2 ? '#d8782a' : PAL.leaf[5], color2: sea === 2 ? '#f0b040' : PAL.leaf[7], layer: 'sky', seed: Math.random() });
    if (m.biome === 'bosque' && sea === 2 && f % 9 === 0) spawn({ x: rx(), y: cy - 4, vx: 0.4, vy: 0.4, life: 260, kind: 'leaf', color: '#c8602a', color2: '#e89a3a', layer: 'sky', seed: Math.random() });
    if ((m.biome === 'pradera' || m.biome === 'montjuic') && !night && sea < 2 && w === 'sol' && f % 40 === 0) spawn({ x: rx(), y: ry(), vx: (Math.random() - 0.5) * 0.3, vy: -0.1, life: 200, kind: 'leaf', color: ['#f8f0a0', '#f8c0e0', '#ffffff'][Math.floor(Math.random() * 3)], layer: 'world', seed: Math.random() });
    if (night && sea >= 1 && sea <= 2 && (m.biome === 'rio' || m.biome === 'bosque' || m.biome === 'pradera') && f % 14 === 0) spawn({ x: rx(), y: ry(), vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, life: 160, kind: 'star', color: '#d8ff80', layer: 'sky', glow: true });
    if (m.biome === 'costa' && f % 24 === 0) spawn({ x: rx(), y: ry(), vx: 0.25, vy: -0.05, life: 120, kind: 'px', color: alpha('#ffffff', 0.5), layer: 'sky' });
    if (S.flags.festToday === 'Sant Jordi' && m.id === 'ciudad' && f % 7 === 0) spawn({ x: rx(), y: cy - 4, vx: 0.3, vy: 0.45, life: 300, kind: 'leaf', color: '#e8304a', color2: '#ff7088', layer: 'sky', seed: Math.random() });
    if (S.flags.santJoanNight && night && f % 30 === 0) { const x0 = rx(), y0 = cy + H; burst(x0, y0 - 60 - Math.random() * 40, 18, { colors: ['#fcd456', '#f06a26', '#ffffff', '#e84a8a'], speed: 1.8, life: 40, ay: 0.03, kind: 'spark', layer: 'sky' }); sfx('pop'); }
    if (S.flags.festToday === 'La Mercè' && night && f % 40 === 0) { burst(rx(), cy + 20 + Math.random() * 40, 22, { colors: ['#fcd456', '#5ab0ff', '#ffffff', '#ff5a6a'], speed: 2, life: 46, ay: 0.03, kind: 'spark', layer: 'sky' }); }
  } else {
    if (f % 30 === 0) { const px_ = rx(), py_ = ry(); if (m.get(Math.floor(px_ / TS), Math.floor(py_ / TS)) !== '#') spawn({ x: px_, y: py_, vx: 0.05, vy: -0.03, life: 240, kind: 'px', color: alpha('#fff0c0', 0.5), layer: 'sky' }); }
  }
  // humo de chimeneas
  const L = mapLayers(m);
  if (L.smoke.length && f % 10 === 0) for (const s of L.smoke) { if (s.x < cx - 10 || s.x > cx + W + 10 || s.y < cy - 30 || s.y > cy + H + 30) continue; if (Math.random() < (night || sea === 3 ? 0.9 : 0.5)) spawn({ x: s.x + (Math.random() - 0.5) * 2, y: s.y, vx: 0.12 + Math.random() * 0.1, vy: -0.32, life: 90, kind: 'puff', size: 1, color: alpha('#d8d4dc', 0.55), layer: 'sky' }); }
  // chimeneas y fuegos de interior: chispas
  for (const o of L.animObjs) if ((o.type === 'chimenea' || o.type === 'fragua') && f % 12 === 0) spawn({ x: o.x * TS + o.w * 8 + (Math.random() - 0.5) * 6, y: o.y * TS + o.h * 16 - 10, vx: (Math.random() - 0.5) * 0.3, vy: -0.6, life: 40, kind: 'px', color: '#fcd456', layer: 'world' });
}

// ───────────── Interacción (botón A) ─────────────
function interact() {
  const p = G.player; const [dx, dy] = dirs[p.dir]; const tx = p.x + dx, ty = p.y + dy; const m = G.map;
  const e = G.ents.find((o) => o !== p && !o.gone && o.x === tx && o.y === ty);
  if (e?.kind === 'npc') { G.hooks.talk?.(e); return; }
  if (e?.kind === 'animal') { G.hooks.animal?.(e); return; }
  if (e?.kind === 'pet') { G.hooks.pet?.(e); return; }
  const sign = m.signs?.find((s) => s.x === tx && s.y === ty) || m.signs?.find((s) => s.x === p.x && s.y === p.y && p.dir === 'up');
  if (sign) { G.hooks.sign?.(sign); return; }
  const obj = m.objects.find((o) => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  if (obj) { G.hooks.object?.(obj); return; }
  const b = m.buildings.find((b) => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h);
  if (b) { G.hooks.building?.(b); return; }
  G.hooks.tile?.(m.get(tx, ty), tx, ty);
}

// ───────────── Cámara ─────────────
function camTarget() {
  const p = G.player; const m = G.map; const [ldx, ldy] = dirs[p.dir] || [0, 0];
  let cx = p.px + 8 - W / 2 + ldx * 10, cy = p.py + 8 - H / 2 + ldy * 8;
  cx = m.w * TS <= W ? (m.w * TS - W) / 2 : clamp(cx, 0, m.w * TS - W);
  cy = m.h * TS <= H ? (m.h * TS - H) / 2 : clamp(cy, 0, m.h * TS - H);
  return [cx, cy];
}
function camSnap() { const [x, y] = camTarget(); G.camF = [x, y]; G.cam = [Math.round(x), Math.round(y)]; }
function camFollow() {
  if (!G.player) return; const [tx, ty] = camTarget();
  G.camF[0] += (tx - G.camF[0]) * 0.12; G.camF[1] += (ty - G.camF[1]) * 0.12;
  if (Math.abs(tx - G.camF[0]) < 0.3) G.camF[0] = tx; if (Math.abs(ty - G.camF[1]) < 0.3) G.camF[1] = ty;
  let nx = 0, ny = 0; if (G.camNudge) { nx = G.camNudge[0]; ny = G.camNudge[1]; G.camNudge = Math.abs(nx) + Math.abs(ny) > 0.5 ? [nx * 0.6, ny * 0.6] : null; }
  G.cam = [Math.round(G.camF[0] + fx.sx + nx), Math.round(G.camF[1] + fx.sy + ny)];
}

// ───────────── Dibujo ─────────────
const TINT = { manana: ['#ffd8b0', 0.16], dia: null, tarde: ['#ffc070', 0.2], crepusculo: ['#c86a80', 0.42], noche: ['#2a3478', 0.6] };
const dark = canvas(W, H); // capa de oscuridad nocturna
export function drawWorld(ctx) {
  const m = G.map; if (!m) return; const [cx, cy] = G.cam; const fr = G.frame; const L = mapLayers(m); const sea = L.season;
  ctx.fillStyle = '#0e0a12'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(L.base, -cx, -cy);
  drawAnimated(ctx, m, L, cx, cy, fr, sea);
  for (const o of L.animObjs) drawFurniture(ctx, o, o.x * TS - cx, o.y * TS - cy, fr);
  drawCrops(ctx, m, cx, cy);
  if (G.doorOpen) { G.doorOpen.t = Math.min(1, G.doorOpen.t + 0.12); try { BLD.drawDoorOpen?.(ctx, G.doorOpen.b, cx, cy, G.doorOpen.t); } catch (e) { } }
  drawParts(ctx, 'ground', cx, cy);
  // Entidades por profundidad (los voladores siempre encima)
  const list = G.ents.filter((e) => !e.gone).sort((a, b) => (a.flying ? 9999 : a.py) - (b.flying ? 9999 : b.py));
  const feet = [];
  for (const e of list) {
    const x = Math.round(e.px - cx), y = Math.round(e.py - cy);
    if (x < -24 || y < -32 || x > W + 8 || y > H + 24) continue;
    if (e.kind === 'player' || e.kind === 'npc') {
      ellipseDither(ctx, x + 8, y + 14, 6, 2, 'rgba(20,10,30,0.4)', 0.95);
      const ap = e.kind === 'player' ? playerLook() : e.ap;
      const idle = e.mv === 0 && (e.kind === 'npc' || e.still > 20);
      const frm = e.mv > 0 ? e.frame : idle && Math.floor((fr + e.seed) / 34) % 2 ? 4 : 0;
      const blink = (fr + e.seed * 7) % 200 < 6;
      if (e.ghost) ctx.globalAlpha = 0.55 + Math.sin(fr / 10) * 0.15;
      const wade = G.map.get(e.x, e.y) === '~' && e.mv === 0;
      if (wade) ctx.drawImage(charSprite(ap, e.dir, frm, blink), 0, 0, 16, 20, x, y - 8 + 2, 16, 20);
      else ctx.drawImage(charSprite(ap, e.dir, frm, blink), x, y - 8);
      ctx.globalAlpha = 1;
      if (wade) { ctx.fillStyle = alpha('#c8f0ff', 0.7); ctx.fillRect(x + 3, y + 13, 10, 1); }
      if (e.kind === 'npc' && G.hooks.npcBadge) G.hooks.npcBadge(ctx, e, x, y);
      if (e.mv === 0 || e.mv < 4) feet.push([e.x, e.y]); else feet.push([e.from?.[0] ?? e.x, e.from?.[1] ?? e.y], [e.x, e.y]);
    } else if (e.kind === 'animal' || e.kind === 'pet') {
      const s = SP[e.sp]; const a = e.a; const cria = a && a.age < s.mature;
      if (!e.flying) { ellipseDither(ctx, x + 8, y + 14, 5, 2, 'rgba(20,10,30,0.4)', 0.85); }
      else { ellipseDither(ctx, x + 8, Math.round(e.py0 ?? (e.py0 = e.py)) - cy + 14, 4, 1, 'rgba(20,10,30,0.3)', 0.6); }
      let pose = 'walk', f = 0;
      if (e.flying) { pose = 'fly'; f = Math.floor(fr / 5) % 2; }
      else if (e.mv > 0) f = Math.floor(fr / 6) % 4;
      else if (s.plan === 'enjambre') { pose = 'fly'; f = Math.floor(fr / 6) % 2; }
      else if (e.poseT > 0) { e.poseT--; pose = 'idle'; f = Math.floor(fr / 16) % 2; }
      else { pose = 'idle'; f = Math.floor((fr + e.seed) / 40) % 2; }
      ctx.drawImage(animalSprite(e.sp, e.dir === 'left' ? 'left' : 'right', f, cria, a?.sex, pose), x, y);
      if (!e.flying) feet.push([e.x, e.y]);
    }
  }
  drawAnimatedFront(ctx, m, L, cx, cy, fr, sea, feet);
  drawParts(ctx, 'world', cx, cy);
  ctx.drawImage(L.over, -cx, -cy);
  drawLighting(ctx, m, L, cx, cy);
  drawWeatherOverlay(ctx, m, cx, cy);
  drawParts(ctx, 'sky', cx, cy);
  // emoticonos (por encima de la luz para que se lean)
  for (const e of list) if (e.emote) drawEmote(ctx, e, Math.round(e.px - cx), Math.round(e.py - cy));
  drawTexts(ctx, cx, cy);
  drawHint(ctx, cx, cy);
  if (G.letterbox > 0.01) { const hh = Math.round(16 * G.letterbox); ctx.fillStyle = '#0c0812'; ctx.fillRect(0, 0, W, hh); ctx.fillRect(0, H - hh, W, hh); }
}
// Qué hay delante del jugador (para la burbuja «A ...»)
function hintAt() {
  const p = G.player; if (!p || p.mv > 0 || (p.still || 0) < 12 || ui.busy || trans.on || G.auto) return null;
  const [dx, dy] = dirs[p.dir]; const tx = p.x + dx, ty = p.y + dy; const m = G.map;
  const e = G.ents.find((o) => o !== p && !o.gone && o.x === tx && o.y === ty);
  if (e?.kind === 'npc') return [tx, ty, 'Hablar', 'accion']; if (e?.kind === 'animal') return [tx, ty, 'Observar', 'ecosistema']; if (e?.kind === 'pet') return [tx, ty, 'Mimar', 'corazon'];
  if (m.signs?.find((s) => s.x === tx && s.y === ty)) return [tx, ty, 'Leer', 'diario'];
  const obj = m.objects.find((o) => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  if (obj) { const L = { cama: 'Dormir', caldero: 'Alquimia', yunque: 'Forjar', fragua: 'Forjar', altar: 'Rezar', cruz: 'Rezar', pila: 'Agua bendita', arcon: 'Arcón', chimenea: 'Fuego', mesa: 'Mesa' }; return [tx, ty, L[obj.type] || 'Mirar', 'saber']; }
  const b = m.buildings.find((b) => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h); if (b) return b.forSale && !S.house ? [tx, ty, 'Comprar', 'moneda'] : null;
  const t = m.get(tx, ty);
  if (TILE[t]?.water || t === 'f') return S.inv.cana_pescar && t !== 'f' && m.outdoor ? [tx, ty, 'Pescar', 'caz'] : t === 'f' ? [tx, ty, 'Beber', 'gota'] : null;
  if ((t === 'a' || t === 'A') && S.flags.plot) return [tx, ty, 'Huerto', 'nat'];
  return null;
}
function drawHint(ctx, cx, cy) {
  const h = hintAt(); if (!h) { G.hintT = 0; return; } G.hintT = Math.min(10, (G.hintT || 0) + 1);
  const [tx, ty, lab, ic] = h; const k = ease.outBack(G.hintT / 10); const w = textWidth(lab) + 20; const x = Math.round(tx * TS + 8 - cx - w / 2), y = Math.round(ty * TS - cy - 14 - Math.sin(G.frame / 10) * 1.5);
  if (k < 0.2) return; const ww = Math.round(w * k);
  ctx.fillStyle = INK; ctx.fillRect(x + (w - ww) / 2 - 1, y - 1, ww + 2, 12); ctx.fillStyle = 'rgba(33,24,44,.94)'; ctx.fillRect(x + (w - ww) / 2, y, ww, 10);
  if (k < 0.9) return;
  ctx.fillStyle = '#a42632'; ctx.fillRect(x + 2, y + 1, 8, 8); drawText(ctx, 'A', x + 4, y + 2, '#fff0d8');
  drawText(ctx, lab, x + 13, y + 2, '#fff4d8', INK);
}
function drawCrops(ctx, m, cx, cy) {
  for (const [k, f] of Object.entries(S.farm || {})) {
    const [mid, pos] = k.split(':'); if (mid !== m.id) continue; const [x, y] = pos.split(',').map(Number);
    const X = x * TS - cx, Y = y * TS - cy; if (X < -16 || Y < -16 || X > W || Y > H) continue;
    const it = ITEMS[f.seed]; const g = Math.min(1, (f.grow || 0) / (it?.days || 4)); const wet = f.water === S.day;
    if (wet) { ctx.fillStyle = 'rgba(40,24,30,.35)'; ctx.fillRect(X + 1, Y + 1, 14, 14); }
    const stage = g >= 1 ? 3 : g > 0.6 ? 2 : g > 0.2 ? 1 : 0; const sway = Math.floor((G.frame + x * 11) / 20) % 2;
    const col = f.seed === 'sem_trigo' ? ['#7ab04a', '#c8a030', '#e8c050'] : f.seed === 'sem_col' ? ['#5aa04a', '#8ac860', '#b8e080'] : f.seed === 'sem_alcachofa' ? ['#4a8a6a', '#6aa88a', '#8a5aa8'] : ['#4a7a5a', '#6a9a6a', '#8ab890'];
    for (const [ox, oy] of [[3, 4], [10, 4], [3, 11], [10, 11]]) {
      if (stage === 0) { ctx.fillStyle = '#5a3a24'; ctx.fillRect(X + ox, Y + oy + 2, 2, 1); ctx.fillStyle = col[0]; ctx.fillRect(X + ox, Y + oy + 1, 1, 1); continue; }
      const h = stage * 2 + 1; ctx.fillStyle = col[0]; ctx.fillRect(X + ox + (stage > 1 ? sway : 0), Y + oy + 3 - h, 1, h); ctx.fillRect(X + ox - 1, Y + oy + 2 - Math.floor(h / 2), 3, 1);
      if (stage >= 2) { ctx.fillStyle = col[1]; ctx.fillRect(X + ox - 1 + sway, Y + oy + 1 - h, 3, 2); }
      if (stage === 3) { ctx.fillStyle = col[2]; ctx.fillRect(X + ox + sway, Y + oy + 1 - h, 2, 2); ctx.fillStyle = '#fff8c0'; ctx.fillRect(X + ox + sway, Y + oy + 1 - h, 1, 1); }
    }
  }
}
function drawEmote(ctx, e, x, y) {
  const m = e.emote; m.t++; if (m.t > m.life) { e.emote = null; return; }
  const pop = m.t < 8 ? ease.outBackBig(m.t / 8) : m.t > m.life - 6 ? 1 - (m.t - (m.life - 6)) / 6 : 1;
  const bob = Math.round(Math.sin(m.t / 6) * 1);
  const img = EMOTES?.emote?.(m.name, Math.floor(m.t / 10) % 2);
  const top = e.kind === 'animal' ? y - 12 : y - 22;
  if (img) {
    const h2 = Math.max(1, Math.round(img.height * pop));
    ctx.drawImage(img, 0, 0, img.width, img.height, x + 9 - Math.floor(img.width / 2) + 2, top - h2 + img.height + bob - 2, img.width, h2);
  } else {
    // reserva si aún no hay iconos: burbuja simple
    const s = { '!': '!', '?': '?', heart: '♥', note: '♪', anger: '#', sweat: '·', zzz: 'z', dots: '…', idea: '*', star: '★' }[m.name] || '!';
    const bw = 11; const bx = x + 6, by = top - 6 + bob;
    ctx.fillStyle = INK; ctx.fillRect(bx - 1, by - 1, bw + 2, 12); ctx.fillStyle = '#fff8ec'; ctx.fillRect(bx, by, bw, 10); ctx.fillRect(bx + 2, by + 10, 2, 2);
    drawText(ctx, s, bx + 3, by + 2, m.name === 'heart' || m.name === 'anger' ? '#d83a4a' : INK);
  }
}
function drawTexts(ctx, cx, cy) {
  for (const t of fx.texts) {
    if (t.layer !== 'world') continue;
    const k = t.t / t.life; const x = Math.round(t.x - cx - textWidth(t.text) / 2), y = Math.round(t.y - cy);
    if (k > 0.75 && (t.t & 1)) continue;
    drawOutlined(ctx, t.text, x, y, t.color, t.outline);
  }
}

// Luz: tinte de la franja, oscuridad con focos tramados, ventanas encendidas y el farolillo del jugador
function drawLighting(ctx, m, L, cx, cy) {
  const ph = phase().id; const tint = TINT[ph]; const w = localWeather();
  const gloom = w === 'lluvia' || w === 'tormenta' ? 0.22 : w === 'nubes' ? 0.08 : w === 'niebla' ? 0.12 : 0;
  if (m.outdoor && gloom) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = alpha('#6a7088', gloom * 1.4); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  const nightish = ph === 'noche' || ph === 'crepusculo';
  if (tint && m.outdoor) {
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = tint[1] + (ph === 'noche' ? nightDepth() : 0);
    ctx.fillStyle = tint[0]; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  const indoorDark = !m.outdoor && (m.biome === 'cueva' || ph === 'noche');
  if (nightish && m.outdoor || indoorDark) {
    // oscuridad con agujeros de luz (bandas tramadas en lugar de degradados lisos)
    const [dc, dx] = dark; const deep = m.outdoor ? (ph === 'noche' ? 0.5 + nightDepth() : 0.22) : m.biome === 'cueva' ? 0.62 : 0.3;
    dx.globalCompositeOperation = 'source-over'; dx.clearRect(0, 0, W, H); dx.fillStyle = alpha('#0a0a24', deep); dx.fillRect(0, 0, W, H);
    dx.globalCompositeOperation = 'destination-out';
    const flick = Math.sin(G.frame / 7) * 1.5;
    const holes = []; for (const [x, y, r0, k] of L.lights) holes.push([x - cx, y - cy, r0 + (k === 'fire' ? flick * 2 : flick * 0.5)]);
    const p = G.player; holes.push([p.px - cx + 8, p.py - cy + 6, S.flags.lantern ? 46 : 24]);
    for (const [hx, hy, r] of holes) { if (hx < -70 || hy < -70 || hx > W + 70 || hy > H + 70) continue; for (let k = 4; k >= 1; k--) { dx.fillStyle = `rgba(0,0,0,${0.3})`; dx.beginPath(); dx.arc(Math.round(hx), Math.round(hy), Math.round(r * k / 4), 0, 7); dx.fill(); } }
    dx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dc, 0, 0);
    // halo cálido aditivo
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r0, k] of L.lights) {
      const sx = x - cx, sy = y - cy; if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
      const col = k === 'fire' ? '255,140,60' : k === 'lamp' ? '255,200,110' : k === 'glow' ? '110,255,140' : k === 'rose' ? '255,120,190' : '255,180,90';
      for (let q = 3; q >= 1; q--) { ctx.fillStyle = `rgba(${col},0.05)`; ctx.beginPath(); ctx.arc(Math.round(sx), Math.round(sy), Math.round((r0 + flick) * q / 3 * 0.8), 0, 7); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (m.outdoor) for (const b of m.buildings) { if (b.x * TS - cx > W + 40 || (b.x + b.w) * TS - cx < -40 || b.y * TS - cy > H + 40 || (b.y + b.h) * TS - cy < -60) continue; try { BLD.drawBuildingLights?.(ctx, b, cx, cy, G.frame); } catch (e) { } }
    // faroles: la llama brilla
    for (const [x, y] of L.lamps) { const sx = x * TS - cx + 8, sy = y * TS - cy - 10; if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue; ctx.fillStyle = '#fff2b0'; ctx.fillRect(sx - 2, sy - 1, 4, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, sy, 1, 1); }
  }
}
function nightDepth() { const h = S.min / 60; return h >= 21 ? Math.min(0.18, (h - 21) * 0.08) : h < 6 ? 0.18 - Math.max(0, h - 4) * 0.09 : 0; }
function drawWeatherOverlay(ctx, m, cx, cy) {
  if (!m.outdoor) return; const w = localWeather(); const f = G.frame;
  if (w === 'nubes' || w === 'lluvia' || w === 'tormenta' || w === 'sol') {
    // sombras de nubes que cruzan el mapa
    const n = w === 'sol' ? 3 : 7; const MW = m.w * TS + 240, MH = m.h * TS + 120;
    for (let i = 0; i < n; i++) {
      const wx = ((i * 331 + f * (0.16 + (i % 3) * 0.04)) % MW) - 120 - cx, wy = ((i * 173 + f * 0.04) % MH) - 60 - cy;
      if (wx < -110 || wx > W + 110 || wy < -50 || wy > H + 50) continue;
      ellipseDither(ctx, Math.round(wx), Math.round(wy), 48 + (i % 3) * 16, 20 + (i % 2) * 7, 'rgba(20,24,48,0.5)', w === 'sol' ? 0.1 : 0.24);
    }
  }
  if (w === 'niebla') { for (let y = 0; y < H; y += 2) { const k = 0.18 + Math.sin(y / 18 + f / 90) * 0.1; for (let x = (y >> 1) & 1; x < W; x += 2) if (bayer(x + Math.floor(f / 6), y) < k) { ctx.fillStyle = 'rgba(230,236,244,0.55)'; ctx.fillRect(x, y, 1, 1); } } }
  if (w === 'tormenta' && hash2(Math.floor(f / 10), S.day, 9) < 0.012 && !G.lightning) { G.lightning = 8; sfx('thunder'); }
  if (G.lightning > 0) { G.lightning--; ctx.fillStyle = alpha('#f0f4ff', G.lightning % 3 === 0 ? 0.55 : 0.2); ctx.fillRect(0, 0, W, H); }
}

// ───────────── HUD ─────────────
const hud = { money: null, hpG: 1, mpG: 1, alpha: 1 };
export function drawHUD(ctx) {
  const ph = phase(); const p = S.player; const pl = G.player;
  // se aparta si el jugador pasa por debajo
  const [cx, cy] = G.cam; const sx = pl ? pl.px - cx : 0, sy = pl ? pl.py - cy : 0;
  const under = (sy < 34 && (sx < 92 || sx > 150));
  hud.alpha += ((under ? 0.35 : 1) - hud.alpha) * 0.15; ctx.globalAlpha = hud.alpha;
  // Reloj con esfera de día y noche
  const bw = 88; ctx.fillStyle = INK; ctx.fillRect(2, 2, bw, 27); ctx.fillStyle = 'rgba(33,24,44,.92)'; ctx.fillRect(3, 3, bw - 2, 25); ctx.fillStyle = '#4a3462'; ctx.fillRect(3, 3, bw - 2, 1);
  drawDial(ctx, 15, 15);
  const col = { manana: '#f8d070', dia: '#fff4a0', tarde: '#f8a050', crepusculo: '#f08080', noche: '#a8b8ff' }[ph.id];
  drawText(ctx, clock(), 29, 6, '#fff4dc', INK);
  drawText(ctx, ph.name, 29, 17, col, INK);
  const si = icon(['primavera', 'verano', 'otono', 'invierno'][season()]); if (si) ctx.drawImage(si, bw - 14, 5);
  const wi = icon({ sol: 'sol', nubes: 'nube', lluvia: 'lluvia', tormenta: 'lluvia', niebla: 'niebla', nieve: 'nieve' }[weatherToday()]); if (wi && G.map?.outdoor) ctx.drawImage(wi, bw - 14, 16);
  // Dinero con contador animado
  if (hud.money === null) hud.money = S.money; hud.money += (S.money - hud.money) * 0.2; if (Math.abs(S.money - hud.money) < 0.5) hud.money = S.money;
  const ms = String(Math.round(hud.money)); const mw = textWidth(ms) + 22;
  ctx.fillStyle = INK; ctx.fillRect(W - mw - 2, 2, mw, 13); ctx.fillStyle = 'rgba(33,24,44,.92)'; ctx.fillRect(W - mw - 1, 3, mw - 2, 11);
  const ci = icon('moneda'); if (ci) ctx.drawImage(ci, W - mw + 1, 3); else { ctx.fillStyle = '#fcd456'; ctx.fillRect(W - mw + 3, 6, 5, 5); }
  drawText(ctx, ms, W - mw + 15, 5, Math.round(hud.money) !== S.money ? '#fff4a0' : '#fcd456', INK);
  // Vida y maná con «fantasma»
  const f1 = p.hp / p.hpMax, f2 = p.mp / p.mpMax; hud.hpG = hud.hpG > f1 ? hud.hpG - 0.006 : f1; hud.mpG = hud.mpG > f2 ? hud.mpG - 0.006 : f2;
  const x0 = W - 58; ctx.fillStyle = INK; ctx.fillRect(x0 - 2, 16, 58, 15); ctx.fillStyle = 'rgba(33,24,44,.92)'; ctx.fillRect(x0 - 1, 17, 56, 13);
  const hi = icon('corazon'), mi = icon('gota');
  if (hi) ctx.drawImage(hi, x0, 17); if (mi) ctx.drawImage(mi, x0, 23);
  const low = f1 < 0.25 && Math.floor(G.frame / 12) % 2;
  bar(ctx, x0 + 13, 19, 40, 3, f1, hud.hpG, low ? ['#7a1a1a', '#ff7060', '#ffb0a0'] : ['#7a1a24', '#e8443c', '#ff8a70']);
  bar(ctx, x0 + 13, 25, 40, 2, f2, hud.mpG, ['#1a2a6a', '#4a8af0', '#9ac8ff']);
  if (S.ailments.length) { const ai = S.ailments.includes('veneno') ? '#7ad050' : '#e86060'; ctx.fillStyle = ai; ctx.fillRect(x0 - 5, 18 + (Math.floor(G.frame / 20) % 2), 2, 2); }
  ctx.globalAlpha = 1;
}
function drawDial(ctx, cx, cy) {
  const r = 10; const min = S.min; const day = min >= 360 && min < 1200;
  const skyC = { manana: '#f8c890', dia: '#78b8f0', tarde: '#f0a060', crepusculo: '#9a5a8a', noche: '#1c2050' }[phase().id];
  ellipse(ctx, cx, cy, r, r, INK); ellipse(ctx, cx, cy, r - 1, r - 1, skyC);
  ctx.fillStyle = '#2a5a3a'; ctx.fillRect(cx - r + 1, cy + 2, 2 * r - 2, r - 2); ellipse(ctx, cx, cy + 2, r - 1, 1, '#3a7a4a');
  for (let y = cy + 3; y <= cy + r; y++) { const w = Math.round(Math.sqrt(Math.max(0, (r - 1) ** 2 - (y - cy) ** 2))); ctx.fillStyle = '#2a4a34'; ctx.fillRect(cx - w, y, w * 2, 1); }
  // astro sobre el arco: 6:00 a la izquierda, 18:00 a la derecha (la luna al revés)
  const t = day ? (min - 360) / 840 : ((min + 1440 - 1200) % 1440) / 600; const a = Math.PI * (1 - Math.min(1, Math.max(0, t)));
  const ax = Math.round(cx + Math.cos(a) * (r - 4)), ay = Math.round(cy + 1 - Math.sin(a) * (r - 4));
  if (day) { ctx.fillStyle = '#fff4a0'; ctx.fillRect(ax - 1, ay - 2, 3, 5); ctx.fillRect(ax - 2, ay - 1, 5, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(ax - 1, ay - 1, 1, 1); }
  else { ctx.fillStyle = '#f0f0ff'; ctx.fillRect(ax - 1, ay - 2, 3, 5); ctx.fillRect(ax - 2, ay - 1, 2, 3); ctx.fillStyle = skyC; ctx.fillRect(ax, ay - 1, 2, 3); if ((G.frame >> 4) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 5, cy - 4, 1, 1); ctx.fillRect(cx + 4, cy - 6, 1, 1); } }
  ctx.fillStyle = INK; ctx.fillRect(cx - r, cy + 2, 1, 1); ctx.fillRect(cx + r - 1, cy + 2, 1, 1);
}
