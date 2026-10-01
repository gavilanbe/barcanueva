// Mapas de Barcanueva: ciudad intramuros, castillo, cinco biomas extramuros e interiores generados.
import { mulberry, hash2 } from './util.js';
import { TILE } from './tiles.js';

export const MAPS = {};
export const PLACES = {}; // id → {map,x,y} (puestos de NPCs, puntos de interés)
export const BUILDINGS = {}; // id → building

class B {
  constructor(id, name, w, h, fill, opts = {}) {
    Object.assign(this, { id, name, w, h, outdoor: true, biome: 'urbano', buildings: [], objects: [], warps: [], exits: {}, signs: [], ...opts });
    this.t = new Array(w * h).fill(fill);
    this.block = new Uint8Array(w * h);
    this.rnd = mulberry(opts.seed || id.length * 977);
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? '#' : this.t[y * this.w + x]; }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.t[y * this.w + x] = c; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  // camino serpenteante entre dos puntos
  path(x0, y0, x1, y1, c = ':', wid = 2, wig = 0.35) {
    let x = x0, y = y0;
    const put = () => { for (let j = 0; j < wid; j++) for (let i = 0; i < wid; i++) { const cur = this.get(x + i, y + j); if (cur !== 'q' && cur !== 'k') this.set(x + i, y + j, TILE[cur]?.water ? 'q' : c); } };
    let guard = 0;
    while ((x !== x1 || y !== y1) && guard++ < 2000) {
      put();
      const dx = Math.sign(x1 - x), dy = Math.sign(y1 - y);
      if (dx && dy) { if (this.rnd() < 0.5) x += dx; else y += dy; }
      else if (dx) { x += dx; if (this.rnd() < wig && Math.abs(y1 - y) < 3) y += this.rnd() < 0.5 ? 1 : -1; }
      else { y += dy; if (this.rnd() < wig && Math.abs(x1 - x) < 3) x += this.rnd() < 0.5 ? 1 : -1; }
    }
    put(); return this;
  }
  // Ruido de valor suave (0..1) para manchas naturales en lugar de sal y pimienta
  noise(x, y, sc = 6, seed = 1) {
    const fx = x / sc, fy = y / sc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sm = (t) => t * t * (3 - 2 * t); const h = (i, j) => hash2(i, j, seed);
    const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
    return (a + (b - a) * sm(tx)) * (1 - sm(ty)) + (c + (d - c) * sm(tx)) * sm(ty);
  }
  clumps(c, thr, where = () => true, seed = 1, sc = 6, jitter = 0.15) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.noise(x, y, sc, seed) + (hash2(x, y, seed + 7) - 0.5) * jitter > thr && where(this.get(x, y), x, y)) this.set(x, y, c);
    return this;
  }
  scatter(c, dens, where = () => true, seed = 1) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (hash2(x, y, seed) < dens && where(this.get(x, y), x, y)) this.set(x, y, c);
    return this;
  }
  blob(cx, cy, r, c, rough = 0.3, seed = 3) {
    for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.1) + (hash2(x, y, seed) - 0.5) * r * rough * 2;
      if (d < r) this.set(x, y, c);
    }
    return this;
  }
  building(b) {
    b.map = this.id;
    b.door = b.door || { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    if (!b.noEnter) this.rect(b.x - 1, b.y + b.h, b.w + 2, 1, this.get(b.door.x, b.y + b.h) === '#' ? ':' : TILE[this.get(b.door.x, b.y + b.h)]?.solid ? (this.biome === 'urbano' ? '=' : ':') : this.get(b.door.x, b.y + b.h));
    for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) this.block[j * this.w + i] = 1;
    if (!b.noEnter) this.block[b.door.y * this.w + b.door.x] = 0;
    const under = this.get(b.door.x, b.door.y + 1);
    if (!b.noEnter && (TILE[under]?.solid || under === '"' || TILE[under]?.water)) this.set(b.door.x, b.door.y + 1, this.outdoor && this.biome !== 'urbano' ? ':' : '=');
    this.buildings.push(b); BUILDINGS[b.id] = b;
    if (!b.noEnter) this.warps.push({ x: b.door.x, y: b.door.y, to: 'int_' + b.id, building: b.id });
    return b;
  }
  place(id, x, y, extra = {}) { PLACES[id] = { map: this.id, x, y, ...extra }; return this; }
  solidAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true;
    if (this.block[y * this.w + x]) return true;
    return !!TILE[this.get(x, y)]?.solid;
  }
}

function finalize(m) {
  // Los puntos de interés siempre deben ser pisables
  for (const p of Object.values(PLACES)) if (p.map === m.id && !m.block[p.y * m.w + p.x] && (TILE[m.get(p.x, p.y)]?.solid || TILE[m.get(p.x, p.y)]?.water && m.get(p.x, p.y) !== '~')) m.set(p.x, p.y, m.outdoor ? (m.biome === 'urbano' ? '+' : m.biome === 'costa' ? 's' : ':') : m.get(1, 3));
  MAPS[m.id] = m; return m;
}

// ───────────────────────── CIUDAD ─────────────────────────
function buildCity() {
  const m = new B('ciudad', 'Barcanueva', 60, 46, '=', { biome: 'urbano', seed: 1714 });
  // Mar y puerto
  m.rect(0, 38, 60, 8, 'W');
  m.rect(2, 35, 56, 3, 'k');
  for (const px of [20, 30, 44]) m.rect(px, 38, 2, 6, 'k');
  // Muralla
  m.rect(0, 0, 60, 1, 'Z'); m.rect(0, 1, 60, 1, 'H');
  m.rect(0, 0, 2, 38, 'H'); m.rect(58, 0, 2, 38, 'H');
  m.rect(0, 36, 2, 2, 'H'); m.rect(58, 36, 2, 2, 'H');
  // Puertas
  m.rect(20, 0, 2, 2, '='); m.rect(0, 22, 2, 2, '='); m.rect(58, 22, 2, 2, '=');
  m.exits = {
    north: { to: 'pradera', range: [20, 21], map: (v) => v + 3 },
    west: { to: 'montjuic', range: [22, 23], map: (v) => v - 8 },
    east: { to: 'costa', range: [22, 23], map: (v) => v - 6 },
  };
  // La Rambla (antiguo torrente) con plátanos
  for (let y = 2; y < 35; y++) { m.set(13, y, y % 3 === 0 ? 'T' : '+'); m.set(15, y, y % 3 === 0 ? 'T' : '+'); m.set(14, y, '+'); }
  m.set(15, 12, 'f'); // Fuente de Canaletas
  m.set(13, 22, '+'); m.set(15, 22, '+'); m.set(13, 23, '+'); m.set(15, 23, '+'); m.set(13, 24, '+'); m.set(15, 24, '+');
  // Calle Ancha (de puerta a puerta)
  m.rect(2, 22, 56, 2, '=');
  // Plazas
  m.rect(24, 10, 16, 4, '+'); m.set(31, 12, 'f');
  m.rect(40, 31, 14, 3, '+');
  m.rect(3, 13, 9, 8, '+');
  m.rect(19, 16, 8, 2, '+');
  // Árboles de plaza
  for (const [x, y] of [[25, 13], [38, 13], [41, 33], [52, 33], [3, 20], [11, 20]]) m.set(x, y, 'T');
  // Faroles
  for (const [x, y] of [[12, 5], [12, 17], [16, 26], [26, 21], [36, 21], [47, 21], [24, 13], [39, 10], [53, 31], [29, 34], [8, 21], [48, 14], [5, 27], [36, 28]]) m.set(x, y, 'L');

  // Catedrales
  m.building({ id: 'seu', kind: 'catedral', variant: 'seu', name: 'Catedral de la Santa Cruz y Santa Olaia', x: 27, y: 3, w: 10, h: 7, door: { x: 31, y: 9 } });
  m.building({ id: 'mar', kind: 'catedral', variant: 'mar', name: 'Santa María de la Mar', x: 42, y: 24, w: 10, h: 7, door: { x: 46, y: 30 } });
  // Sanatorios
  m.building({ id: 'hosp_cruz', kind: 'hospital', name: 'Hospital de la Santa Cruz', x: 3, y: 4, w: 8, h: 5, door: { x: 6, y: 8 } });
  m.building({ id: 'hosp_pau', kind: 'hospital', name: 'Casa de Convalecencia de San Pau', x: 49, y: 3, w: 8, h: 5, door: { x: 52, y: 7 } });
  // Tabernas
  m.building({ id: 'tab_oca', kind: 'taberna', name: 'La Oca Blanca', x: 40, y: 11, w: 5, h: 4 });
  m.building({ id: 'tab_drac', kind: 'taberna', name: 'El Drac Borratxo', x: 24, y: 30, w: 5, h: 4 });
  m.building({ id: 'tab_gats', kind: 'taberna', name: 'Los Cuatro Gatos', x: 16, y: 4, w: 4, h: 4 });
  m.building({ id: 'tab_ramb', kind: 'taberna', name: 'La Bodega de Canaletas', x: 8, y: 24, w: 4, h: 4, door: { x: 9, y: 27 } });
  // Institución y guardia
  m.building({ id: 'consell', kind: 'casa', name: 'Casa del Consejo de Ciento', x: 22, y: 10, w: 5, h: 5, wall: '#d8c8a0', roof: '#8a4a3a' });
  m.building({ id: 'cuartel', kind: 'cuartel', name: 'Veguería (cuartel de la guardia)', x: 23, y: 3, w: 4, h: 4, wall: '#c8b898' });
  m.building({ id: 'llotja', kind: 'casa', name: 'Lonja de Mar', x: 31, y: 29, w: 7, h: 5, wall: '#e0d0b0', roof: '#7a6a5a' });
  m.building({ id: 'drassanes', kind: 'casa', name: 'Atarazanas', x: 3, y: 29, w: 9, h: 5, wall: '#c8a878', roof: '#8a5a3a' });
  // Tiendas especializadas
  const shop = (id, name, x, y, icon, awning) => m.building({ id, kind: 'tienda', name, x, y, w: 4, h: 4, icon: ICON[icon], awning });
  shop('t_hierbas', 'Herboristería La Ruda', 16, 17, 'hierbas', '#3a9a5a');
  shop('t_forja', 'Ferrería del Call', 27, 17, 'forja', '#5a5a6a');
  shop('t_sastre', 'Sastrería Bonanova', 32, 17, 'sastre', '#c84a6a');
  shop('t_libros', 'Librería del Arco', 37, 17, 'libros', '#3a5a8a');
  shop('t_alquimia', 'Botica del Alambique', 42, 17, 'alquimia', '#6a3a9a');
  shop('t_pan', 'Horno de Sant Jaume', 17, 25, 'pan', '#e8a030');
  shop('t_velas', 'Cerería del Vidrio', 22, 25, 'vela', '#c8a030');
  shop('t_pesca', 'Pescadería del Muelle', 18, 30, 'pescado', '#3a7ac8');
  shop('t_ceramica', 'Alfarería de la Riera', 47, 17, 'ceramica', '#c86a44');
  // Casas de ciudadanos
  const casas = [
    ['c_raval1', 3, 10], ['c_raval2', 8, 10], ['c_raval3', 3, 24], ['c_ribera1', 47, 11], ['c_ribera2', 52, 11], ['c_ribera3', 52, 17],
    ['c_seu1', 39, 3], ['c_seu2', 43, 3], ['c_centro1', 27, 25], ['c_centro2', 32, 25], ['c_centro3', 37, 25], ['c_call1', 17, 12],
    ['c_port1', 12, 30], ['c_port2', 39, 30], ['c_port3', 54, 25], ['c_norte1', 3, 16 - 14 + 0], ['c_norte2', 32, 2 + 12],
  ];
  for (const [id, x, y] of casas) if (!overlaps(m, x, y, 4, 3)) m.building({ id, kind: 'casa', name: 'Casa', x, y, w: 4, h: 3 });
  BUILDINGS.c_centro3 && (BUILDINGS.c_centro3.forSale = 800);
  // Mercado de la Boquería (puestos)
  for (const [i, x, y] of [[0, 4, 14], [1, 7, 14], [2, 10, 14], [3, 4, 17], [4, 7, 17], [5, 10, 17]]) {
    const st = m.building({ id: 'puesto' + i, kind: 'puesto', name: 'Puesto del mercado', x, y, w: 2, h: 2, noEnter: true });
    m.place('mercado' + i, x + (i % 2), y + 2);
  }
  // Barcas amarradas
  for (const [i, x] of [[0, 22], [1, 32], [2, 46]]) m.building({ id: 'barca' + i, kind: 'barca', name: 'Barca', x, y: 39, w: 3, h: 3, noEnter: true });
  // Puntos de interés
  m.place('rambla_n', 14, 6).place('rambla_s', 14, 30).place('canaletas', 14, 12).place('plaza_seu', 30, 12).place('plaza_seu2', 28, 11)
    .place('plaza_mar', 46, 32).place('fossar', 50, 32).place('muelle', 26, 36).place('muelle2', 40, 36).place('muelle3', 50, 36)
    .place('puerta_n', 20, 3).place('puerta_e', 56, 22).place('puerta_o', 3, 22).place('mercado', 7, 21)
    .place('sant_jaume', 22, 16).place('calle_ancha', 30, 23).place('calle_ancha2', 44, 22).place('llotja_f', 34, 34)
    .place('drassanes_f', 7, 34).place('call', 18, 15).place('ribera', 50, 15);
  m.signs.push({ x: 12, y: 12, text: 'Fuente de Canaletas. Dicen que quien bebe de ella, siempre vuelve a Barcanueva.', stat: 'arc' });
  m.signs.push({ x: 26, y: 13, text: 'Plaza de la Seu. Bajo estas losas duermen los muros de la vieja Barcino.', stat: 'his' });
  m.signs.push({ x: 40, y: 33, text: 'Fossar de las Moreras. Aquí yacen los que defendieron la ciudad. «En el fossar no se entierra ningún traidor.»', stat: 'his' });
  m.signs.push({ x: 19, y: 16, text: 'Plaza de Sant Jaume. Aquí el Consejo de Ciento pregona las ordenanzas.', stat: 'his' });
  m.signs.push({ x: 3, y: 21, text: 'Mercado de la Boquería. Se abre al alba. Prohibido vender carne de gato por liebre.', stat: 'com' });
  return finalize(m);
}
import { ICONS as ICON } from './buildings.js';

function overlaps(m, x, y, w, h) {
  for (let j = y - 1; j <= y + h; j++) for (let i = x; i < x + w; i++) {
    if (m.block[j * m.w + i]) return true;
    const c = m.get(i, j); if (c === 'H' || c === 'Z' || c === 'W' || c === 'k' || c === 'T' || c === 'f') return true;
  }
  return false;
}

// ───────────────────────── MONTJUÏC Y CASTILLO ─────────────────────────
function buildMontjuic() {
  const m = new B('montjuic', 'Monte del Juïc', 40, 30, '.', { biome: 'pradera', seed: 99 });
  m.scatter('P', 0.1, (c) => c === '.', 5).scatter('R', 0.03, (c) => c === '.', 6).scatter('"', 0.08, (c) => c === '.', 7).scatter('*', 0.03, (c) => c === '.', 8);
  m.rect(0, 26, 40, 4, 'W'); m.rect(0, 24, 40, 2, 's');
  m.rect(0, 0, 40, 1, 'M');
  m.path(38, 14, 20, 12, ':', 2).path(20, 12, 20, 9, ':', 2);
  m.rect(12, 9, 18, 3, '+');
  m.exits = { east: { to: 'ciudad', range: [14, 15], map: (v) => v + 8 } };
  m.building({ id: 'castillo', kind: 'castillo', name: 'Castillo del Conde Barnabás', x: 12, y: 1, w: 16, h: 8, door: { x: 20, y: 8 } });
  // Cantera íbera: el «a no ser...» (pasadizo a las bodegas del castillo)
  m.rect(2, 3, 5, 5, 'M'); m.set(4, 7, 'c'); m.rect(3, 8, 3, 2, 'r');
  m.warps.push({ x: 4, y: 7, to: 'int_cantera', secret: 'cantera' });
  // Cementerio judío (el monte le debe el nombre)
  for (const [x, y] of [[30, 4], [32, 4], [34, 4], [30, 6], [32, 6], [34, 6], [31, 8], [33, 8]]) m.set(x, y, 'x');
  m.signs.push({ x: 29, y: 7, text: 'Piedras con letras hebreas medio borradas. «Monte de los judíos», decían los viejos.', stat: 'his' });
  m.place('castillo_puerta', 20, 10).place('castillo_bloqueo', 20, 9).place('castillo_lado', 22, 9).place('castillo_guardia', 19, 10).place('montjuic_mirador', 30, 20).place('cantera_f', 4, 9);
  return finalize(m);
}

// ───────────────────────── EXTRAMUROS ─────────────────────────
function buildPradera() {
  const m = new B('pradera', 'Llano de Barcanueva', 48, 36, '.', { biome: 'pradera', seed: 211 });
  m.clumps('"', 0.58, (c) => c === '.', 11, 5).scatter('*', 0.04, (c) => c === '.', 12).clumps('T', 0.72, (c) => c === '.', 13, 6).scatter('T', 0.01, (c) => c === '.', 15).scatter('B', 0.015, (c) => c === '.', 14);
  // Campos
  m.rect(4, 4, 10, 6, 'A'); m.rect(4, 10, 10, 1, 'F');
  m.rect(30, 22, 12, 6, 'a'); m.rect(30, 21, 12, 1, 'F');
  m.rect(4, 22, 9, 7, 'V');
  for (let y = 14; y < 20; y += 2) for (let x = 34; x < 46; x += 3) m.set(x, y, 'O');
  // Caminos: sur (ciudad) — norte (bosque) — oeste (río) — este (costa)
  m.path(23, 35, 23, 18, ':', 2).path(23, 18, 23, 0, ':', 2).path(23, 17, 0, 17, ':', 2).path(24, 17, 47, 12, ':', 2);
  m.exits = {
    south: { to: 'ciudad', range: [23, 24], map: (v) => v - 3 },
    north: { to: 'bosque', range: [23, 24], map: (v) => v },
    west: { to: 'rio', range: [17, 18], map: (v) => v },
    east: { to: 'costa', range: [12, 13], map: (v) => v - 10, toEdge: 'north' },
  };
  m.building({ id: 'masia_ferrer', kind: 'masia', name: 'Masía Ferrer', x: 15, y: 5, w: 6, h: 4 });
  m.building({ id: 'masia_prat', kind: 'masia', name: 'Masía del Prat', x: 28, y: 14, w: 6, h: 4 });
  m.building({ id: 'molino', kind: 'casa', name: 'Molino de la Riera', x: 8, y: 13, w: 4, h: 3 });
  // Menhir de las Encantadas
  m.rect(40, 3, 5, 5, '.'); m.set(42, 4, 'Y'); m.set(41, 6, '*'); m.set(43, 6, '*');
  m.building({ id: 'altar_pradera', kind: 'altar', name: 'Altar de la Piedra Larga', x: 42, y: 6, w: 1, h: 1, noEnter: true });
  m.place('campo_trigo', 9, 11).place('campo_huerta', 35, 28).place('viña', 8, 29).place('masia_ferrer_f', 18, 10).place('masia_prat_f', 31, 19)
    .place('cruce', 22, 18).place('menhir', 42, 8).place('olivar', 38, 20).place('molino_f', 10, 17);
  m.signs.push({ x: 41, y: 8, text: 'La Piedra Larga. Los payeses dejan leche aquí la noche de San Juan, «para que las Encantadas no se lleven la cosecha».', stat: 'arc' });
  return finalize(m);
}

function buildBosque() {
  const m = new B('bosque', 'Sierra de Collsaverola', 48, 36, ',', { biome: 'bosque', seed: 331 });
  m.clumps('T', 0.42, (c) => c === ',', 21, 5).clumps('Q', 0.62, (c) => c === 'T', 22, 7).clumps('P', 0.66, (c) => c === 'T', 26, 6).scatter('T', 0.12, (c) => c === ',', 28).scatter('B', 0.05, (c) => c === ',', 23).clumps('"', 0.6, (c) => c === ',', 24, 4);
  m.blob(10, 9, 5, ',', 0.3).blob(38, 26, 5, ',', 0.3).blob(40, 8, 4, ',', 0.2).blob(24, 18, 3, ',', 0.4);
  m.scatter('*', 0.05, (c, x, y) => c === ',' && Math.hypot(x - 38, y - 26) < 5, 25).scatter('"', 0.15, (c, x, y) => c === ',' && Math.hypot(x - 10, y - 9) < 6, 27);
  m.path(23, 35, 23, 0, ':', 2, 0.5).path(24, 20, 0, 22, ':', 2).path(24, 12, 40, 8, ':', 2).path(23, 26, 37, 28, ':', 1).path(22, 12, 11, 10, ':', 1);
  m.exits = { south: { to: 'pradera', range: [23, 25], map: (v) => v }, north: { to: 'montana', range: [23, 25], map: (v) => v }, west: { to: 'rio', range: [21, 23], map: (v) => v + 9, toEdge: 'north' } };
  m.building({ id: 'cabana_bruja', kind: 'cabana', name: 'Cabaña de la Vella', x: 8, y: 6, w: 4, h: 3 });
  m.building({ id: 'cabana_guarda', kind: 'cabana', name: 'Casa del guardabosques', x: 37, y: 5, w: 4, h: 3 });
  // Dolmen (altar pagano)
  m.rect(36, 24, 5, 4, '.'); m.set(37, 25, 'x'); m.set(39, 25, 'x');
  m.building({ id: 'altar_bosque', kind: 'altar', name: 'Dolmen de la Cova d’en Daina', x: 38, y: 25, w: 1, h: 1, noEnter: true });
  m.place('bruja_f', 10, 10).place('claro', 38, 28).place('guarda_f', 39, 9).place('sendero', 23, 18).place('dolmen', 38, 27);
  m.signs.push({ x: 36, y: 27, text: 'Losas enormes forman una cámara. Quien la construyó no conocía la cruz.', stat: 'arc' });
  return finalize(m);
}

function buildMontana() {
  const m = new B('montana', 'Montseñal', 48, 36, '.', { biome: 'montana', seed: 443 });
  m.clumps('u', 0.55, (c) => c === '.', 33, 7).clumps('P', 0.5, (c) => c === '.' || c === 'u', 31, 5).scatter('P', 0.05, (c) => c === '.', 37).scatter('R', 0.04, (c) => c === '.', 32);
  m.rect(0, 0, 48, 7, 'n'); m.scatter('K', 0.05, (c) => c === 'n', 34);
  for (let x = 0; x < 48; x++) { const h = 7 + Math.floor(hash2(x, 0, 35) * 3); m.rect(x, h, 1, 2, 'M'); }
  m.rect(22, 7, 3, 4, ':');
  for (let x = 0; x < 48; x++) if (x < 14 || x > 34) { const h = 16 + Math.floor(hash2(x, 1, 36) * 2); m.rect(x, h, 1, 2, 'M'); }
  m.path(23, 35, 23, 10, ':', 2, 0.6).path(23, 22, 8, 20, ':', 2).path(23, 13, 38, 12, ':', 2);
  m.rect(6, 19, 3, 4, ':'); m.rect(36, 11, 3, 6, ':');
  m.exits = { south: { to: 'bosque', range: [23, 24], map: (v) => v } };
  m.building({ id: 'ermita', kind: 'casa', name: 'Ermita de Sant Medir', x: 36, y: 13, w: 4, h: 3, wall: '#d8d0c0', roof: '#7a6a5a' });
  m.building({ id: 'templo_montana', kind: 'templo', name: 'Santuario de la Madre de las Cumbres', x: 20, y: 2, w: 7, h: 4, noEnter: true });
  m.set(6, 18, 'c'); m.warps.push({ x: 6, y: 18, to: 'int_cueva_oso', secret: null });
  m.place('ermita_f', 38, 17).place('cumbre', 23, 7).place('pastos', 12, 28).place('cueva_f', 7, 21).place('mirador', 30, 24);
  m.signs.push({ x: 25, y: 7, text: 'Piedras con ofrendas de miel y cintas. Los pastores suben aquí en el solsticio.', stat: 'arc' });
  return finalize(m);
}

function buildRio() {
  const m = new B('rio', 'Riberas del Lobregat', 48, 36, '.', { biome: 'rio', seed: 557 });
  m.scatter('"', 0.15, (c) => c === '.', 41).scatter('T', 0.08, (c) => c === '.', 42).scatter('*', 0.04, (c) => c === '.', 43);
  // Río de norte a sur y estanque
  for (let y = 0; y < 36; y++) { const cx = 14 + Math.round(Math.sin(y / 5) * 3); m.rect(cx - 2, y, 5, 1, 'w'); m.set(cx - 3, y, '~'); m.set(cx + 3, y, '~'); }
  m.blob(34, 27, 6, 'w', 0.25); m.blob(34, 27, 7, '~', 0.2, 9); m.blob(34, 27, 5.5, 'w', 0.25);
  m.scatter('m', 0.5, (c, x, y) => c === '.' && nearWater(m, x, y), 44).scatter('C', 0.12, (c, x, y) => c === 'm', 45);
  m.path(47, 17, 0, 17, ':', 2).path(22, 17, 30, 5, ':', 2);
  m.exits = { east: { to: 'pradera', range: [17, 18], map: (v) => v }, north: { to: 'bosque', range: [30, 32], map: (v) => v - 9, toEdge: 'west' } };
  m.path(30, 5, 30, 0, ':', 3);
  m.building({ id: 'cabana_pescador', kind: 'cabana', name: 'Barraca del pescador', x: 40, y: 12, w: 4, h: 3 });
  m.building({ id: 'molino_rio', kind: 'casa', name: 'Molino del Lobregat', x: 3, y: 10, w: 4, h: 3 });
  m.rect(22, 29, 5, 4, '.'); m.set(24, 31, ':');
  m.building({ id: 'altar_rio', kind: 'altar', name: 'Fuente de las Dones d’Aigua', x: 24, y: 30, w: 1, h: 1, noEnter: true });
  m.place('estanque', 30, 20).place('pescador_f', 41, 16).place('puente', 14, 17).place('fuente_dones', 24, 32).place('molino_rio_f', 5, 14);
  m.signs.push({ x: 23, y: 32, text: 'Un manantial entre juncos. Hay peines de hueso y cintas atados a las cañas.', stat: 'arc' });
  return finalize(m);
}
function nearWater(m, x, y) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (TILE[m.get(x + i, y + j)]?.water) return true; return false; }

function buildCosta() {
  const m = new B('costa', 'Costa del Besós', 48, 36, '.', { biome: 'costa', seed: 661 });
  m.scatter('"', 0.1, (c) => c === '.', 51).scatter('P', 0.07, (c) => c === '.', 52).scatter('B', 0.04, (c) => c === '.', 53);
  for (let y = 0; y < 36; y++) { const sx = 30 + Math.round(Math.sin(y / 6) * 2 + y * 0.1); m.rect(sx, y, 4, 1, 's'); m.rect(sx + 4, y, 48, 1, 'W'); m.set(sx + 4, y, 'w'); }
  m.rect(0, 30, 34, 6, 's'); m.rect(0, 33, 34, 3, 'W'); m.rect(0, 32, 34, 1, 'w');
  m.scatter('p', 0.3, (c) => c === 'W', 54);
  // Acantilados del norte
  m.rect(30, 0, 18, 4, 'M'); m.set(36, 4, 'c'); m.rect(35, 5, 3, 2, 's');
  m.warps.push({ x: 36, y: 4, to: 'int_cueva_contrabando', secret: null });
  m.path(0, 22, 26, 22, ':', 2).path(10, 0, 10, 22, ':', 2);
  m.exits = { west: { to: 'ciudad', range: [16, 17], map: (v) => v + 6 }, north: { to: 'pradera', range: [2, 3], map: (v) => v + 10, toEdge: 'east' } };
  m.path(0, 16, 12, 22, ':', 2); m.path(2, 0, 10, 6, ':', 2);
  m.building({ id: 'barraca1', kind: 'cabana', name: 'Barraca de pescadores', x: 18, y: 25, w: 4, h: 3 });
  m.building({ id: 'barraca2', kind: 'cabana', name: 'Barraca de la Caleta', x: 24, y: 25, w: 4, h: 3 });
  m.building({ id: 'templo_mar', kind: 'templo', name: 'Templo de la Señora del Mar', x: 18, y: 8, w: 7, h: 4, noEnter: true });
  m.building({ id: 'barca_costa', kind: 'barca', name: 'Barca varada', x: 31, y: 28, w: 3, h: 3, noEnter: true });
  m.place('playa', 28, 29).place('barracas', 22, 29).place('templo_mar_f', 21, 13).place('cala', 36, 7).place('pinar', 6, 10);
  m.signs.push({ x: 17, y: 12, text: 'Columnas antiguas cubiertas de salitre. En el ara, conchas y una lamparilla de aceite aún caliente.', stat: 'arc' });
  return finalize(m);
}

// ───────────────────────── INTERIORES ─────────────────────────
// Se generan al vuelo según el tipo de edificio. Los muebles son objetos sólidos con su pintor.
const INT_SIZE = { catedral: [16, 14], hospital: [14, 10], taberna: [12, 9], castillo: [18, 13], tienda: [9, 8], casa: [9, 7], masia: [11, 8], cabana: [8, 7], cuartel: [10, 8] };

export function interior(id) {
  if (MAPS[id]) return MAPS[id];
  if (id === 'int_cantera') return cantera();
  if (id === 'int_cueva_oso') return cueva('int_cueva_oso', 'Cueva del oso', 'montana', 6, 19);
  if (id === 'int_cueva_contrabando') return cueva('int_cueva_contrabando', 'Cueva de los contrabandistas', 'costa', 36, 5);
  const b = BUILDINGS[id.slice(4)]; if (!b) return null;
  const special = { consell: [12, 9], llotja: [12, 9], drassanes: [14, 9] }[b.id];
  const [w, h] = special || INT_SIZE[b.kind] || [9, 7];
  const stone = ['catedral', 'hospital', 'castillo', 'cuartel'].includes(b.kind) || ['consell', 'llotja'].includes(b.id);
  const m = new B(id, b.name, w, h, stone ? 'I' : 'i', { outdoor: false, biome: 'interior', seed: w * 31 + h });
  m.rect(0, 0, w, 2, 'j'); m.rect(0, 0, 1, h, '#'); m.rect(w - 1, 0, 1, h, '#'); m.rect(0, h - 1, w, 1, '#');
  const ex = Math.floor(w / 2); m.set(ex, h - 1, 'e');
  m.warps.push({ x: ex, y: h - 1, to: b.map, tx: b.door.x, ty: b.door.y + 1, exit: true });
  m.building_ = b.id;
  const O = (type, x, y, ow = 1, oh = 1, extra = {}) => { m.objects.push({ type, x, y, w: ow, h: oh, ...extra }); for (let j = y; j < y + oh; j++) for (let i = x; i < x + ow; i++) m.block[j * w + i] = 1; };
  const S = (name, x, y) => m.place(b.id + ':' + name, x, y);
  switch (b.kind) {
    case 'catedral': {
      m.rect(ex - 1, 2, 3, h - 3, 'v');
      O('altar', ex - 1, 2, 3, 1); O('cruz', ex, 1, 1, 1, { severe: b.variant === 'seu' });
      for (let y = 5; y < h - 2; y += 2) { O('banco', 2, y, ex - 3, 1); O('banco', ex + 2, y, w - ex - 4, 1); }
      O('vela', 1, 2); O('vela', w - 2, 2); O('pila', 1, h - 3); O('pila', w - 2, h - 3);
      S('altar', ex, 3); S('banco', ex - 2, 6); S('banco2', ex + 2, 8); S('lado', w - 3, 4); S('entrada', ex + 1, h - 3); S('confesionario', 2, 3);
      if (b.variant === 'seu') { m.rect(1, 2, 2, 1, 'I'); O('claustro', 1, 3, 1, 1); S('ocas', 3, h - 3); }
      break;
    }
    case 'hospital': {
      for (let x = 1; x < w - 1; x += 2) { if (x === ex || x === ex - 1) continue; O('cama', x, 3, 1, 2); O('cama', x, h - 5 > 5 ? 6 : 5, 1, 2); }
      O('mesa', ex - 1, 2, 3, 1); O('estante', 1, 2, 2, 1);
      S('medico', ex, 3); S('enfermo', 3, 5); S('cama_jugador', 1, 5); break;
    }
    case 'taberna': {
      m.rect(1, 2, w - 2, 1, 'i');
      O('barra', 1, 3, 5, 1); O('barriles', 1, 2, 2, 1); O('barriles', 4, 2, 2, 1); O('chimenea', w - 3, 1, 2, 2);
      O('mesa', 3, 6, 2, 1); O('mesa', w - 4, 5, 2, 1);
      S('tabernero', 3, 2 + 0); S('barra1', 2, 4); S('barra2', 5, 4); S('mesa1', 3, 7); S('mesa2', 5, 6); S('mesa3', w - 4, 6); S('mesa4', w - 2, 5); S('fuego', w - 3, 4);
      PLACES[b.id + ':tabernero'].y = 2; m.block[2 * w + 3] = 0; m.set(3, 2, 'i');
      break;
    }
    case 'tienda': {
      O('mostrador', 1, 3, w - 4, 1); O('estante', 1, 1, w - 2, 1, { goods: b.icon ? b.id : null });
      if (b.id === 't_forja') { O('yunque', w - 2, 3); O('fragua', w - 3, 1, 2, 1); }
      if (b.id === 't_alquimia' || b.id === 't_hierbas') O('caldero', w - 2, 3);
      if (b.id === 't_libros') O('estante', w - 2, 3, 1, 3);
      S('tendero', 3, 2); S('cliente', 3, 4); break;
    }
    case 'castillo': {
      m.rect(ex - 1, 2, 3, h - 3, 'v');
      O('trono', ex, 2, 1, 1); O('trono2', ex - 2, 2, 1, 1); O('tapiz', 2, 0, 2, 2); O('tapiz', w - 4, 0, 2, 2);
      O('columna', 3, 5); O('columna', w - 4, 5); O('columna', 3, 9); O('columna', w - 4, 9);
      O('mesa', 1, 7, 2, 2); O('chimenea', w - 3, 1, 2, 2);
      S('conde', ex, 3); S('condesa', ex - 2, 3); S('heredero', ex + 2, 4); S('senescal', ex - 3, 5); S('guardia1', ex - 2, h - 3); S('guardia2', ex + 2, h - 3);
      S('corte1', 2, 6); S('corte2', w - 3, 7); S('corte3', 4, 10); S('bufon', w - 5, 10);
      break;
    }
    case 'cuartel': { O('mesa', 2, 4, 3, 1); O('armero', 1, 1, 3, 1); O('cama', w - 2, 2, 1, 2); O('cama', w - 3, 2, 1, 2); S('capitan', 3, 3); S('guardia', 6, 5); break; }
    default: {
      // Casas, masías y cabañas
      O('cama', 1, 2, 1, 2); if (w > 8) O('cama', 2, 2, 1, 2);
      O('mesa', ex - 1, 4, 2, 1); O('silla', ex + 1, 4); O(b.kind === 'cabana' ? 'caldero' : 'chimenea', w - 3, 1, 2, 2);
      O('arcon', w - 2, h - 3); if (b.kind === 'masia') { O('barriles', 4, 2, 2, 1); O('estante', w - 5, 1, 2, 1); } else O('estante', 3, 1, 2, 1);
      S('cama', 1, 4); S('mesa', ex - 1, 5); S('fuego', w - 3, 3); S('rincon', 2, h - 3); S('mesa2', ex + 1, 5);
    }
  }
  if (b.id === 'consell') { m.objects.length = 0; m.block.fill(0); O('mesa', 3, 3, 6, 2); O('tapiz', 5, 0, 2, 2); S('conseller', 5, 5); S('conseller2', 8, 5); S('escribano', 2, 3); }
  if (b.id === 'llotja') { m.objects.length = 0; m.block.fill(0); O('mostrador', 1, 3, 5, 1); O('columna', 8, 4); O('columna', 8, 7); O('mesa', 9, 2, 2, 1); S('cambista', 3, 2); S('consul', 10, 4); S('mercader', 6, 6); }
  if (b.id === 'drassanes') { m.objects.length = 0; m.block.fill(0); O('casco', 3, 3, 7, 3); O('madera', 11, 2, 2, 2); S('maestro', 11, 5); S('calafate', 2, 6); }
  for (let x = 1; x < w - 1; x++) for (let y = 0; y < 2; y++) m.block[y * w + x] = 1;
  return finalize(m);
}

function cantera() {
  const m = new B('int_cantera', 'Cantera íbera', 14, 10, 'r', { outdoor: false, biome: 'cueva', seed: 5 });
  m.rect(0, 0, 14, 2, 'M'); m.rect(0, 0, 1, 10, 'M'); m.rect(13, 0, 1, 10, 'M'); m.rect(0, 9, 14, 1, 'M');
  m.set(2, 9, 'e'); m.warps.push({ x: 2, y: 9, to: 'montjuic', tx: 4, ty: 8, exit: true });
  m.rect(7, 2, 5, 5, 'M'); m.rect(9, 2, 1, 6, 'r'); m.set(9, 1, 'c');
  m.warps.push({ x: 9, y: 1, to: 'int_castillo', tx: 1, ty: 11, secretEntry: true });
  m.objects.push({ type: 'huesos', x: 4, y: 5, w: 1, h: 1 });
  m.signs.push({ x: 4, y: 4, text: 'Marcas de cincel íberas y, más nuevas, una flecha pintada con hollín que señala al fondo: «CELLER».', stat: 'his' });
  return finalize(m);
}
function cueva(id, name, back, bx, by) {
  const m = new B(id, name, 12, 9, 'r', { outdoor: false, biome: 'cueva', seed: id.length });
  m.rect(0, 0, 12, 2, 'M'); m.rect(0, 0, 1, 9, 'M'); m.rect(11, 0, 1, 9, 'M'); m.rect(0, 8, 12, 1, 'M');
  m.set(6, 8, 'e'); m.warps.push({ x: 6, y: 8, to: back, tx: bx, ty: by, exit: true });
  m.rect(2, 2, 2, 2, 'M'); m.rect(8, 3, 2, 1, 'M');
  m.place(id + ':fondo', 5, 3).place(id + ':rincon', 9, 5);
  return finalize(m);
}

export function buildWorld() {
  buildCity(); buildMontjuic(); buildPradera(); buildBosque(); buildMontana(); buildRio(); buildCosta();
  // Interiores de todos los edificios para registrar sus PLACES
  for (const id of Object.keys(BUILDINGS)) if (!BUILDINGS[id].noEnter) interior('int_' + id);
  interior('int_cantera'); interior('int_cueva_oso'); interior('int_cueva_contrabando');
  // El castillo tiene una puerta trasera desde las bodegas
  const c = MAPS.int_castillo; c.set(1, 11, 'I'); c.block[11 * c.w + 1] = 0;
}

export function neighborsFor(m, x, y) {
  const k = (c) => (TILE[c]?.water ? 'w' : c === '.' || c === '"' || c === '*' || c === ',' ? 'g' : 'l');
  return { up: k(m.get(x, y - 1)), down: k(m.get(x, y + 1)), left: k(m.get(x - 1, y)), right: k(m.get(x + 1, y)) };
}
