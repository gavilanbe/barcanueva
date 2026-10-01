// Estado global de la partida: tiempo, jugador, relaciones, reputación, flags. Todo serializable.
export const PHASES = [
  { id: 'manana', name: 'Mañana', from: 360 }, { id: 'dia', name: 'Día', from: 600 }, { id: 'tarde', name: 'Tarde', from: 900 },
  { id: 'crepusculo', name: 'Crepúsculo', from: 1140 }, { id: 'noche', name: 'Noche', from: 1260 },
];
export const SEASONS = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
export const SEASON_LEN = 28;
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const BASIC = [
  ['fue', 'FUERZA', 'Potencia y capacidad física'], ['int', 'INTELIGENCIA', 'Potencia de los conjuros'],
  ['def', 'DEFENSA', 'Resistir el daño físico'], ['esp', 'ESPÍRITU', 'Resistir el daño mágico'],
  ['car', 'CARISMA', 'Convencer, persuadir, seducir. Desbloquea mejores respuestas'],
];
export const KNOW = [
  ['nat', 'NATURALEZA', 'Plantas y criaturas: identificarlas, adiestrarlas, cultivar'],
  ['his', 'HISTORIA', 'Recordar datos de lugares y sucesos'],
  ['arc', 'ARCANO', 'Folclore, mitos, leyendas y magia'],
  ['alq', 'ALQUIMIA', 'Brebajes, transmutaciones y recetas nuevas'],
  ['art', 'ARTESANÍA', 'Trabajar metal, madera y fibra'],
  ['caz', 'CAZA Y PESCA', 'Obtener recursos especiales de criaturas salvajes'],
  ['com', 'COMERCIO', 'Vender más caro y comprar más barato'],
];
export const STAT_NAME = Object.fromEntries([...BASIC, ...KNOW].map(([k, n]) => [k, n]));

export const S = {
  day: 1, min: 7 * 60, // empieza el Día 1 a las 7:00
  player: null, npc: {}, flags: {}, rep: { ciudad: 0, seu: 0, mar: 0, pagano: 0, corte: 0, gremios: 0 },
  inv: {}, money: 60, eco: null, forage: {}, farm: {}, quests: {}, known: {}, learned: {}, recipes: {}, log: [],
  pos: { map: 'ciudad', x: 20, y: 4, dir: 'down' }, house: null, rank: 0, ailments: [], stash: {}, pets: [],
};

export function newGame(p) {
  Object.assign(S, {
    day: 1, min: 7 * 60, player: p, npc: {}, flags: {}, rep: { ciudad: 0, seu: 0, mar: 0, pagano: 0, corte: 0, gremios: 0 },
    inv: { pan: 3, venda: 2 }, money: 60, eco: null, forage: {}, farm: {}, quests: {}, known: {}, learned: {}, recipes: {}, log: [],
    pos: { map: 'ciudad', x: 20, y: 3, dir: 'down' }, house: null, rank: 0, ailments: [], stash: {}, pets: [],
  });
  p.level = 1; p.xp = 0; p.hpMax = maxHp(p); p.hp = p.hpMax; p.mpMax = maxMp(p); p.mp = p.mpMax; p.ptsB = 0; p.ptsK = 0;
  p.spells = ['chispa']; p.energy = 100;
}

export const maxHp = (p) => 20 + p.stats.fue * 2 + p.stats.def * 3 + (p.level - 1) * 5 + (p.race === 'enano' ? 6 : 0);
export const maxMp = (p) => 6 + p.stats.int * 2 + p.stats.esp * 2 + (p.level - 1) * 2 + (p.race === 'elfo' ? 4 : 0) + (p.race === 'tiefling' ? 2 : 0);
export const mod = (v) => Math.floor(v / 2); // modificador de tirada desde la estadística
export const stat = (k) => { const p = S.player; const base = p.stats[k] ?? p.know[k] ?? 0; return base + (equipBonus(k) || 0); };
let equipBonusFn = () => 0; export function setEquipBonus(f) { equipBonusFn = f; }
function equipBonus(k) { return equipBonusFn(k); }

export function phase(min = S.min) { let p = PHASES[4]; for (const ph of PHASES) if (min >= ph.from) p = ph; if (min < 360) p = PHASES[4]; return p; }
export function season(day = S.day) { return Math.floor(((day - 1) % (SEASON_LEN * 4)) / SEASON_LEN); }
export function dayOfSeason(day = S.day) { return ((day - 1) % SEASON_LEN) + 1; }
export function year(day = S.day) { return Math.floor((day - 1) / (SEASON_LEN * 4)) + 1; }
export function weekday(day = S.day) { return WEEKDAYS[(day - 1) % 7]; }
export function clock(min = S.min) { const h = Math.floor(min / 60), m = Math.floor(min % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
export function dateStr(day = S.day) { return `Día ${day} · ${dayOfSeason(day)} de ${SEASONS[season(day)]}`; }

export const XP_FOR = (lvl) => Math.floor(40 * Math.pow(lvl, 1.55));

// Relación: -100..100
export const TIERS = [
  [-100, 'Enemistad', '#8a1a1a'], [-60, 'Hostil', '#b83a2a'], [-25, 'Desconfianza', '#c87a3a'], [-5, 'Neutral', '#8a8a7a'],
  [15, 'Cordial', '#6a9a4a'], [40, 'Amistad', '#3a8a4a'], [70, 'Íntimo', '#3a6ab8'],
];
export function tier(v) { let t = TIERS[0]; for (const x of TIERS) if (v >= x[0]) t = x; return t; }
export function npcState(id) { return (S.npc[id] ||= { rel: null, met: false, talkedDay: 0, giftDay: 0, romance: 0, flags: {}, alive: true, hits: 0 }); }

export function addItem(id, n = 1) { S.inv[id] = (S.inv[id] || 0) + n; if (S.inv[id] <= 0) delete S.inv[id]; }
export function hasItem(id, n = 1) { return (S.inv[id] || 0) >= n; }
export function logEvent(s) { S.log.unshift(`D${S.day} ${clock()} · ${s}`); if (S.log.length > 60) S.log.pop(); }

export function save(slot = 'barcanueva_save') {
  try { localStorage.setItem(slot, JSON.stringify(S)); return true; } catch (e) { return false; }
}
export function load(slot = 'barcanueva_save') {
  try { const d = JSON.parse(localStorage.getItem(slot)); if (!d || !d.player) return false; Object.assign(S, d); return true; } catch (e) { return false; }
}
export function hasSave(slot = 'barcanueva_save') { try { return !!localStorage.getItem(slot); } catch (e) { return false; } }
