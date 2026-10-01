// Escena de mundo: mapa, cámara, entidades (jugador, NPCs, animales), tiempo, luz y transiciones.
import { MAPS, PLACES, BUILDINGS, interior, neighborsFor } from './world.js';
import { TS, TILE, drawTile, tileCtx } from './tiles.js';
import { drawBuilding } from './buildings.js';
import { charSprite } from './chars.js';
import { animalSprite, drawFurniture } from './sprites.js';
import { S, phase, PHASES, clock, dateStr, season, dayOfSeason, weekday, npcState, XP_FOR, maxHp, maxMp, logEvent, save, SEASONS } from './state.js';
import { SP, ecoDay, faeAvailable } from './eco.js';
import { NPCS, NPC_BY_ID } from './data/npcs.js';
import { ITEMS } from './data/items.js';
import { ui, W, H, panel, text } from './ui.js';
import { drawText, textWidth } from './font.js';
import { input } from './input.js';
import { sfx, music } from './audio.js';
import { canvas, hash2, dirs, clamp } from './util.js';

export const G = {
  mode: 'title', map: null, player: null, ents: [], frame: 0, fade: 0, fadeTo: null, cam: [0, 0], phaseId: null,
  hooks: {}, // talk, interact, newDay, festival… (los rellenan otros módulos)
  debug: false, timeScale: 1.5, // minutos de juego por segundo real
};
const MOVE_FR = 8; // fotogramas por casilla andando

// ───────────── Aspecto del jugador (equipo incluido) ─────────────
export function playerLook() {
  const p = S.player; const eq = {};
  for (const slot of ['head', 'body', 'cape']) { const it = p.equip?.[slot]; if (it && ITEMS[it]?.eq?.look) eq[slot] = ITEMS[it].eq.look; }
  return { ...p.look, race: p.race, sex: p.sex, equip: eq };
}
export function npcLook(n) { return { ...n.look, race: n.race, sex: n.sex, equip: n.look.equip || {} }; }

// ───────────── Prerender del mapa ─────────────
const layers = new Map();
function mapLayer(m, fr) {
  const key = m.id + ':' + fr;
  if (layers.has(key)) return layers.get(key);
  const [cv, x] = canvas(m.w * TS, m.h * TS);
  tileCtx.biome = m.biome;
  const isTree = (c) => c === 'T' || c === 'Q' || c === 'O';
  for (let y = 0; y < m.h; y++) for (let i = 0; i < m.w; i++) {
    const c = m.get(i, y);
    tileCtx.tree = isTree(c) ? { left: isTree(m.get(i - 1, y)), right: isTree(m.get(i + 1, y)), up: isTree(m.get(i, y - 1)) } : null;
    const nb = (c === 's' || c === ':' || c === 'r' || TILE[c]?.water) ? neighborsFor(m, i, y) : null;
    drawTile(x, c, i * TS, y * TS, i, y, fr, nb);
  }
  for (const o of m.objects) drawFurniture(x, o, o.x * TS, o.y * TS, fr);
  for (const b of [...m.buildings].sort((a, b) => a.y + a.h - (b.y + b.h))) drawBuilding(x, b);
  layers.set(key, cv);
  return cv;
}
export function dumpMap(id, fr = 0) { return mapLayer(MAPS[id] || interior(id), fr).toDataURL(); }
export function invalidateMap(id) { layers.delete(id + ':0'); layers.delete(id + ':1'); }

// ───────────── Entidades ─────────────
function ent(kind, x, y, extra = {}) { return { kind, x, y, px: x * TS, py: y * TS, dir: 'down', mv: 0, from: null, frame: 0, path: null, idle: 60 + Math.random() * 120, ...extra }; }

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
  const key = (x, y) => y * m.w + x; const prev = new Map([[key(sx, sy), -1]]); const q = [[sx, sy]]; let n = 0;
  while (q.length && n++ < maxN) {
    const [x, y] = q.shift();
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

// ───────────── Horarios de NPCs ─────────────
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

function spawnNPCs(arrivingFrom = null) {
  const m = G.map; const ph = phase().id;
  G.ents = G.ents.filter((e) => e.kind === 'player');
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

// Cambio de franja estando en el mapa: los NPCs caminan hacia su nuevo sitio o se van por la salida más cercana.
function rescheduleNPCs() {
  const m = G.map; const ph = phase().id;
  for (const e of G.ents) {
    if (e.kind !== 'npc') continue;
    const t = npcTarget(e.npc, ph);
    if (t && t.map === m.id) { e.home = [t.x, t.y]; e.path = findPath(m, e.x, e.y, t.x, t.y); e.leaving = false; }
    else { const ex = nearestExit(m, e.x, e.y); e.leaving = true; e.path = ex ? findPath(m, e.x, e.y, ex[0], ex[1]) : null; if (!e.path) e.gone = true; }
  }
  // Llegadas: entran por la puerta o el borde más cercano a su destino
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
  // Mezcla determinista por día para no ver siempre los mismos
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

// ───────────── Entrar en mapas ─────────────
export function enterMap(id, x, y, dir = 'down', silent = false) {
  const m = MAPS[id] || interior(id); if (!m) { console.warn('mapa', id); return; }
  G.map = m; S.pos = { map: id, x, y, dir };
  G.player = ent('player', x, y, { dir }); G.ents = [G.player];
  if (S.pet) G.ents.push(ent('pet', x, y + 1 < m.h ? y + 1 : y, { sp: S.pet.sp, dir: 'right' }));
  spawnNPCs(); G.phaseId = phase().id;
  if (!S.known['map:' + id]) { S.known['map:' + id] = 1; if (!silent && id !== 'ciudad') addXP(8, 'Lugar nuevo'); }
  updateMusic();
  G.hooks.enterMap?.(m);
  camSnap();
}
export function updateMusic() {
  const m = G.map; const ph = phase().id; const b = m.biome;
  let s = b === 'urbano' ? 'ciudad' : b === 'bosque' || b === 'montana' ? 'bosque' : 'campo';
  if (!m.outdoor) { const bid = m.id.slice(4); const k = BUILDINGS[bid]?.kind; s = k === 'taberna' ? 'taberna' : k === 'catedral' ? 'iglesia' : k === 'castillo' ? 'castillo' : ph === 'noche' ? 'noche' : 'ciudad'; if (m.biome === 'cueva') s = 'noche'; }
  if (m.id === 'montjuic') s = 'castillo';
  if ((ph === 'noche' || ph === 'crepusculo') && m.outdoor) s = 'noche';
  music(G.mode === 'battle' ? 'batalla' : s);
}
function transition(fn) { G.fade = 1; G.fadeTo = fn; sfx('door'); }

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
  // Viajeros de hoy
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
}

// ───────────── XP y niveles ─────────────
export function addXP(n, why) {
  const p = S.player; p.xp += n;
  if (why && n >= 3) ui.toast(`+${n} XP · ${why}`, '#c8f0a8');
  while (p.xp >= XP_FOR(p.level)) {
    p.xp -= XP_FOR(p.level); p.level++; p.ptsB += 5; p.ptsK += 5;
    p.hpMax = maxHp(p); p.mpMax = maxMp(p); p.hp = p.hpMax; p.mp = p.mpMax;
    sfx('level'); ui.toast(`¡NIVEL ${p.level}! +5 básicas, +5 sabiduría`, '#f8e060'); logEvent(`Subes a nivel ${p.level}`);
  }
}

// ───────────── Bucle del mundo ─────────────
export function updateWorld() {
  if (G.fade > 0) {
    G.fade += 0.08;
    if (G.fade >= 2 && G.fadeTo) { const f = G.fadeTo; G.fadeTo = null; f(); }
    if (G.fade >= 3) G.fade = 0;
    return;
  }
  if (ui.busy) return;
  advance(G.timeScale / 60);
  // Madrugada: si no duermes, te desplomas
  if (S.min > 150 && S.min < 360 && !S.flags.sleeping) { G.hooks.faint?.(); return; }
  const p = G.player;
  if (input.pressed('S')) { G.hooks.menu?.(); return; }
  // Movimiento del jugador
  if (p.mv > 0) stepEnt(p, input.held('B') ? 2 : 1);
  if (p.mv === 0) {
    const d = input.dir();
    if (d) {
      if (p.dir !== d && !p.turned) { p.dir = d; p.turned = 4; }
      else if (!p.turned || --p.turned <= 0) { p.turned = 0; tryMove(p, d); }
    } else p.turned = 0;
    if (p.mv === 0 && input.pressed('A')) interact();
  }
  // NPCs, animales, mascota
  for (const e of G.ents) {
    if (e === p || e.gone) continue;
    if (e.kind === 'npc') updateNPC(e); else if (e.kind === 'animal') updateAnimal(e); else if (e.kind === 'pet') updatePet(e);
  }
  G.ents = G.ents.filter((e) => !e.gone);
  camFollow();
}

function tryMove(e, d) {
  const [dx, dy] = dirs[d]; const nx = e.x + dx, ny = e.y + dy; const m = G.map;
  e.dir = d;
  // Bordes: salidas del mapa
  if (e === G.player && (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h)) {
    const edge = nx < 0 ? 'west' : nx >= m.w ? 'east' : ny < 0 ? 'north' : 'south';
    const ex = m.exits?.[edge]; const v = edge === 'north' || edge === 'south' ? e.x : e.y;
    if (ex && v >= ex.range[0] - 1 && v <= ex.range[ex.range.length - 1] + 1) {
      const T = MAPS[ex.to]; const te = ex.toEdge || { north: 'south', south: 'north', east: 'west', west: 'east' }[edge]; const tv = clamp(ex.map(v), 0, (te === 'north' || te === 'south' ? T.w : T.h) - 1);
      const pos = te === 'south' ? [tv, T.h - 1, 'up'] : te === 'north' ? [tv, 0, 'down'] : te === 'west' ? [0, tv, 'right'] : [T.w - 1, tv, 'left'];
      transition(() => enterMap(ex.to, pos[0], pos[1], pos[2]));
      return;
    }
    sfx('bump'); return;
  }
  if (e === G.player) {
    const w = m.warps.find((w) => w.x === nx && w.y === ny);
    if (w) { useWarp(w); return; }
  }
  if (!walkable(m, nx, ny, e) || occupied(nx, ny, e)) { if (e === G.player && !e.bumped) { sfx('bump'); e.bumped = 12; } return; }
  e.from = [e.x, e.y]; e.x = nx; e.y = ny; e.mv = MOVE_FR;
}
function stepEnt(e, speed = 1) {
  e.mv = Math.max(0, e.mv - speed);
  const t = 1 - e.mv / MOVE_FR;
  e.px = (e.from[0] + (e.x - e.from[0]) * t) * TS; e.py = (e.from[1] + (e.y - e.from[1]) * t) * TS;
  e.frame = e.mv > MOVE_FR / 2 ? ((e.stepN || 0) % 2 ? 1 : 3) : 0;
  if (e.mv === 0) { e.stepN = (e.stepN || 0) + 1; e.px = e.x * TS; e.py = e.y * TS; if (e === G.player) arrived(); }
}
function arrived() {
  const p = G.player; if (p.bumped) p.bumped = 0;
  const t = G.map.get(p.x, p.y);
  if (t === '"' && G.map.outdoor && Math.random() < 0.035) G.hooks.encounter?.('hierba');
  if (G.map.outdoor && S.min >= 1260 && Math.random() < 0.004 && G.map.biome !== 'urbano') G.hooks.encounter?.('noche');
  if (!S.known[`t:${G.map.id}:${p.x >> 3}:${p.y >> 3}`]) { S.known[`t:${G.map.id}:${p.x >> 3}:${p.y >> 3}`] = 1; addXP(1); }
}
export function useWarp(w) {
  if (w.secret && G.hooks.secretWarp && !G.hooks.secretWarp(w)) return;
  if (G.hooks.canEnter && !G.hooks.canEnter(w)) return;
  if (w.exit) { transition(() => enterMap(w.to, w.tx, w.ty, 'down')); return; }
  if (w.secretEntry) { transition(() => { enterMap(w.to, w.tx, w.ty, 'right'); G.hooks.infiltrate?.(); }); return; }
  const m = interior(w.to);
  const ex = m.warps.find((x) => x.exit);
  transition(() => enterMap(w.to, ex ? ex.x : 1, ex ? ex.y - 1 : 1, 'up'));
}

function updateNPC(e) {
  if (e.mv > 0) { stepEnt(e); return; }
  if (e.talking) return;
  if (e.path && e.path.length) {
    const [nx, ny] = e.path[0];
    if (occupied(nx, ny, e) || (G.player.x === nx && G.player.y === ny)) { e.wait = (e.wait || 0) + 1; if (e.wait > 90) { e.path = findPath(G.map, e.x, e.y, e.home[0], e.home[1]); e.wait = 0; } return; }
    e.wait = 0; e.path.shift();
    const d = nx > e.x ? 'right' : nx < e.x ? 'left' : ny > e.y ? 'down' : 'up';
    tryMove(e, d);
    if (e.leaving && !e.path.length) e.gone = true;
    return;
  }
  if (e.leaving) { e.gone = true; return; }
  // Paseíto alrededor de su puesto (los tenderos y el guardia del castillo no se mueven)
  if (--e.idle <= 0) {
    e.idle = 90 + Math.random() * 200;
    const fixed = e.npc.shop || /:(tendero|tabernero|medico|cambista|conde|condesa|altar)$/.test(e.npc.sched?.[G.phaseId] || '') || e.npc.id === 'arnau_guardia';
    if (fixed) { e.dir = 'down'; return; }
    const ds = ['up', 'down', 'left', 'right']; const d = ds[Math.floor(Math.random() * 4)]; const [dx, dy] = dirs[d];
    if (Math.abs(e.x + dx - e.home[0]) + Math.abs(e.y + dy - e.home[1]) <= 2) tryMove(e, d); else e.dir = d;
  }
}

function updateAnimal(e) {
  const s = SP[e.sp]; const p = G.player;
  if (e.mv > 0) { stepEnt(e, e.fast ? 2 : 1); return; }
  const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
  const flee = (s.beh === 'huye' || s.beh === 'vuela') && dist < (S.player.sneak ? 2 : 4) && !e.calm;
  if (s.beh === 'vuela' && dist < 2 && !e.calm) { e.gone = true; return; } // echa a volar
  if (s.beh === 'embiste' && dist <= 2 && !e.calm && !e.charged && Math.random() < 0.02) { e.charged = true; G.hooks.encounter?.('embiste', e); return; }
  if (s.beh === 'caza' && dist <= 3 && !e.calm && (S.min > 1140 || S.min < 360) && Math.random() < 0.01) { G.hooks.encounter?.('caza', e); return; }
  if (s.beh === 'pica' && dist <= 1 && !e.calm && Math.random() < 0.01) { G.hooks.encounter?.('pica', e); return; }
  if (flee) {
    e.fast = true; const dx = Math.sign(e.x - p.x), dy = Math.sign(e.y - p.y);
    const opts = [[dx, 0], [0, dy], [dx, dy === 0 ? 1 : 0], [dx === 0 ? 1 : 0, dy]].filter(([a, b]) => a || b);
    for (const [a, b] of opts) { const d = a > 0 ? 'right' : a < 0 ? 'left' : b > 0 ? 'down' : 'up'; const bx = e.x, by = e.y; tryMove(e, d); if (e.x !== bx || e.y !== by) { e.dir = a < 0 ? 'left' : a > 0 ? 'right' : e.dir; return; } }
    return;
  }
  e.fast = false;
  // Depredador visible persigue a una presa visible
  if (Array.isArray(s.diet) && !e.calm) {
    const prey = G.ents.find((o) => o.kind === 'animal' && !o.gone && s.diet.includes(o.sp) && Math.abs(o.x - e.x) + Math.abs(o.y - e.y) < 6);
    if (prey && Math.random() < 0.3) {
      if (Math.abs(prey.x - e.x) + Math.abs(prey.y - e.y) <= 1 && Math.random() < 0.25) {
        prey.gone = true; const L = S.eco.maps[G.map.id]; const i = L.indexOf(prey.a); if (i >= 0) L.splice(i, 1);
        if (dist < 9) ui.toast(`${s.name} caza un ${SP[prey.sp].name.toLowerCase()}.`, '#f8a0a0');
        return;
      }
      const d = Math.abs(prey.x - e.x) > Math.abs(prey.y - e.y) ? (prey.x > e.x ? 'right' : 'left') : (prey.y > e.y ? 'down' : 'up');
      tryMove(e, d); if (d === 'left' || d === 'right') e.dir = d; return;
    }
  }
  if (--e.idle <= 0) {
    e.idle = 40 + Math.random() * 140;
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
  }
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
  const p = G.player; const m = G.map;
  let cx = p.px + 8 - W / 2, cy = p.py + 8 - H / 2;
  cx = m.w * TS <= W ? (m.w * TS - W) / 2 : clamp(cx, 0, m.w * TS - W);
  cy = m.h * TS <= H ? (m.h * TS - H) / 2 : clamp(cy, 0, m.h * TS - H);
  return [Math.round(cx), Math.round(cy)];
}
function camSnap() { G.cam = camTarget(); }
function camFollow() { G.cam = camTarget(); }

// ───────────── Dibujo ─────────────
const TINT = { manana: ['#ffe0c0', 0.18], dia: null, tarde: ['#ffc890', 0.22], crepusculo: ['#d87070', 0.55], noche: ['#3a4a98', 0.62] };
export function drawWorld(ctx) {
  const m = G.map; const [cx, cy] = G.cam; const fr = Math.floor(G.frame / 32) % 2;
  ctx.fillStyle = '#0e0a12'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(mapLayer(m, fr), -cx, -cy);
  // Entidades ordenadas por profundidad
  const list = G.ents.filter((e) => !e.gone).sort((a, b) => a.py - b.py);
  for (const e of list) {
    const x = Math.round(e.px - cx), y = Math.round(e.py - cy);
    if (x < -24 || y < -32 || x > W + 8 || y > H + 16) continue;
    if (e.kind === 'player' || e.kind === 'npc') {
      ctx.fillStyle = 'rgba(20,10,30,.28)'; ctx.fillRect(x + 3, y + 13, 10, 3); ctx.fillRect(x + 4, y + 12, 8, 5);
      const ap = e.kind === 'player' ? playerLook() : e.ap;
      if (e.ghost) ctx.globalAlpha = 0.55 + Math.sin(G.frame / 10) * 0.15;
      ctx.drawImage(charSprite(ap, e.dir, e.frame), x, y - 8 - (e.kind === 'npc' && e.ap.race === 'enano' ? 0 : 0));
      ctx.globalAlpha = 1;
      if (e.kind === 'npc' && G.hooks.npcBadge) G.hooks.npcBadge(ctx, e, x, y);
    } else if (e.kind === 'animal' || e.kind === 'pet') {
      ctx.fillStyle = 'rgba(20,10,30,.22)'; ctx.fillRect(x + 4, y + 13, 8, 2);
      const a = e.a; const cria = a && a.age < SP[e.sp].mature;
      ctx.drawImage(animalSprite(e.sp, e.dir === 'left' ? 'left' : 'right', (Math.floor(G.frame / 12) + (e.mv ? 1 : 0)) % 2 && e.mv ? 1 : (SP[e.sp].plan === 'enjambre' ? Math.floor(G.frame / 8) % 2 : 0), cria, a?.sex), x, y);
    }
  }
  // Luz de la franja
  const ph = phase().id; const tint = TINT[ph];
  if (tint && (m.outdoor || ph === 'noche')) {
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = m.outdoor ? tint[1] + (ph === 'noche' ? nightDepth() : 0) : 0.35;
    ctx.fillStyle = tint[0]; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (ph === 'noche' || ph === 'crepusculo') drawLights(ctx, m, cx, cy);
  }
  // Transición
  if (G.fade > 0) { const a = G.fade < 1 ? G.fade : G.fade < 2 ? 1 : 3 - G.fade; ctx.fillStyle = `rgba(14,10,18,${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
}
function nightDepth() { const h = S.min / 60; return h >= 21 ? Math.min(0.2, (h - 21) * 0.08) : h < 6 ? 0.2 - Math.max(0, h - 4) * 0.1 : 0; }

let lightCache = null;
function drawLights(ctx, m, cx, cy) {
  if (!lightCache || lightCache.id !== m.id) {
    const pts = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.get(x, y) === 'L') pts.push([x * TS + 8, y * TS + 4, 26]);
    for (const b of m.buildings) if (['casa', 'taberna', 'tienda', 'masia', 'cabana', 'hospital', 'cuartel'].includes(b.kind)) pts.push([b.door.x * TS + 8, b.door.y * TS + 6, b.kind === 'taberna' ? 30 : 18]);
    for (const o of m.objects) if (['chimenea', 'vela', 'altar', 'fragua', 'caldero'].includes(o.type)) pts.push([o.x * TS + o.w * 8, o.y * TS + 10, o.type === 'chimenea' ? 46 : 26]);
    lightCache = { id: m.id, pts };
  }
  ctx.globalCompositeOperation = 'lighter';
  const flick = Math.sin(G.frame / 7) * 1.5;
  for (const [x, y, r0] of lightCache.pts) {
    const sx = x - cx, sy = y - cy; if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
    for (let k = 3; k >= 1; k--) { const r = (r0 + flick) * k / 3; ctx.fillStyle = `rgba(255,190,90,${0.07})`; ctx.beginPath(); ctx.arc(Math.round(sx), Math.round(sy), Math.round(r), 0, 7); ctx.fill(); }
  }
  // El jugador lleva un farolillo de noche
  if (S.flags.lantern) { const p = G.player; ctx.fillStyle = 'rgba(255,200,120,.08)'; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(Math.round(p.px - cx + 8), Math.round(p.py - cy + 6), 14 * k, 0, 7); ctx.fill(); } }
  ctx.globalCompositeOperation = 'source-over';
}

export function drawHUD(ctx) {
  const ph = phase();
  const icon = { manana: '☀', dia: '☀', tarde: '☀', crepusculo: '☾', noche: '☾' }[ph.id];
  const col = { manana: '#f8d070', dia: '#f8f070', tarde: '#f8a050', crepusculo: '#e87070', noche: '#a0b0f8' }[ph.id];
  const s1 = `Día ${S.day} ${clock()}`; const s2 = `${ph.name} · ${dayOfSeason()} ${SEASONS[season()].slice(0, 3)}.`;
  const w = Math.max(textWidth(s1), textWidth(s2)) + 22;
  ctx.fillStyle = 'rgba(28,20,36,.78)'; ctx.fillRect(2, 2, w, 24);
  drawText(ctx, icon, 5, 5, col, '#000'); drawText(ctx, s1, 16, 5, '#f8f0d8', '#000'); drawText(ctx, s2, 16, 15, col, '#000');
  const money = `${S.money} d.`; const mw = textWidth(money) + 8;
  ctx.fillStyle = 'rgba(28,20,36,.78)'; ctx.fillRect(W - mw - 2, 2, mw, 12); drawText(ctx, money, W - mw + 2, 5, '#f8d860', '#000');
  // Barras de vida y maná
  const p = S.player; const bw = 40;
  ctx.fillStyle = 'rgba(28,20,36,.78)'; ctx.fillRect(W - bw - 6, 16, bw + 4, 10);
  ctx.fillStyle = '#5a1a1a'; ctx.fillRect(W - bw - 4, 18, bw, 3); ctx.fillStyle = '#e84a4a'; ctx.fillRect(W - bw - 4, 18, Math.round(bw * p.hp / p.hpMax), 3);
  ctx.fillStyle = '#1a2a5a'; ctx.fillRect(W - bw - 4, 22, bw, 2); ctx.fillStyle = '#5a9af8'; ctx.fillRect(W - bw - 4, 22, Math.round(bw * p.mp / p.mpMax), 2);
  // Nombre del lugar al entrar
  if (G.mapLabel && G.mapLabel.t > 0) {
    G.mapLabel.t--; const s = G.mapLabel.name; const tw = textWidth(s) + 16; ctx.globalAlpha = Math.min(1, G.mapLabel.t / 20);
    panel(ctx, (W - tw) / 2, 56, tw, 18); text(ctx, s, (W - tw) / 2 + 8, 62); ctx.globalAlpha = 1;
  }
}
