// Ecosistema vivo basado en individuos. Cada animal: sexo, edad (cría/adulto), hambre.
// Tick diario: alimentación (herbívoros contra vegetación, depredadores contra presas reales), cría estacional,
// maduración, vejez, capacidad de carga, extinción local y migración entre mapas vecinos.
import { S, season, logEvent } from './state.js';
import { mulberry } from './util.js';

// Especies simuladas en el mundo visible (subconjunto de docs/especies.json con cuerpo dibujable).
// plan: forma del sprite · size 1..3 · K por bioma · diet: presas (ids) o 'veg' · flee/charge · res: botín
export const SP = {
  conejo: { name: 'Conejo', plan: 'conejo', col: ['#a88a6a', '#e8dcc8'], size: 1, K: { pradera: 24, bosque: 10, costa: 10, montjuic: 12 }, diet: 'veg', rate: 'alta', mature: 10, act: ['manana', 'crepusculo', 'noche'], beh: 'huye', hp: 6, res: ['carne', 'piel'], breed: [0, 1, 2] },
  liebre: { name: 'Liebre', plan: 'conejo', col: ['#b89a6a', '#d8c8a8'], size: 1, K: { pradera: 6, montana: 5 }, diet: 'veg', rate: 'alta', mature: 12, act: ['manana', 'crepusculo', 'noche'], beh: 'huye', hp: 8, res: ['carne', 'piel'], breed: [0, 1] },
  perdiz: { name: 'Perdiz', plan: 'ave_suelo', col: ['#a8886a', '#c83a2a'], size: 1, K: { pradera: 14, montana: 8, montjuic: 6 }, diet: 'veg', rate: 'alta', mature: 14, act: ['manana', 'tarde'], beh: 'huye', hp: 5, res: ['carne', 'pluma'], breed: [0] },
  jabali: { name: 'Jabalí', plan: 'cuadrupedo', col: ['#5a4a3a', '#3a2e24'], size: 2, K: { bosque: 7, pradera: 3, montana: 3 }, diet: 'veg', rate: 'alta', mature: 24, act: ['crepusculo', 'noche', 'manana'], beh: 'embiste', hp: 30, atk: 6, res: ['carne', 'carne', 'piel', 'colmillo'], tusks: true, breed: [0, 3] },
  corzo: { name: 'Corzo', plan: 'cuadrupedo', col: ['#b8784a', '#e8d8c0'], size: 2, K: { bosque: 5, montana: 4 }, diet: 'veg', rate: 'media', mature: 28, act: ['manana', 'tarde', 'crepusculo'], beh: 'huye', hp: 18, res: ['carne', 'carne', 'piel'], antlers: 1, breed: [0] },
  ciervo: { name: 'Ciervo', plan: 'cuadrupedo', col: ['#8a5a3a', '#d8c0a0'], size: 3, K: { montana: 4, bosque: 2 }, diet: 'veg', rate: 'baja', mature: 40, act: ['manana', 'crepusculo', 'noche'], beh: 'huye', hp: 34, atk: 5, res: ['carne', 'carne', 'piel', 'cornamenta'], antlers: 2, breed: [0] },
  cabra_montes: { name: 'Cabra montés', plan: 'cuadrupedo', col: ['#9a7a5a', '#5a4a3a'], size: 2, K: { montana: 6 }, diet: 'veg', rate: 'baja', mature: 36, act: ['manana', 'tarde', 'crepusculo'], beh: 'huye', hp: 24, atk: 5, res: ['carne', 'piel', 'cornamenta'], horns: true, breed: [0] },
  ardilla: { name: 'Ardilla roja', plan: 'ardilla', col: ['#c85a2a', '#f0d8b8'], size: 1, K: { bosque: 12, montana: 8 }, diet: 'veg', rate: 'media', mature: 14, act: ['manana', 'dia', 'tarde'], beh: 'huye', hp: 4, res: ['piel'], breed: [0, 1] },
  raton_campo: { name: 'Ratón de campo', plan: 'raton', col: ['#8a7a5a', '#d8c8a8'], size: 0, K: { pradera: 30, bosque: 24, montana: 14, rio: 12 }, diet: 'veg', rate: 'alta', mature: 6, act: ['crepusculo', 'noche'], beh: 'huye', hp: 2, res: [], breed: [0, 1, 2] },
  rata: { name: 'Rata negra', plan: 'raton', col: ['#3a3438', '#6a6068'], size: 0, K: { urbano: 28, costa: 6, rio: 6 }, diet: 'veg', rate: 'alta', mature: 6, act: ['crepusculo', 'noche'], beh: 'huye', hp: 3, res: [], breed: [0, 1, 2, 3] },
  gorrion: { name: 'Gorrión', plan: 'pajaro', col: ['#8a6a4a', '#d8c8a8'], size: 0, K: { urbano: 18, pradera: 14 }, diet: 'veg', rate: 'alta', mature: 8, act: ['manana', 'dia', 'tarde'], beh: 'vuela', hp: 1, res: ['pluma'], breed: [0, 1] },
  paloma: { name: 'Paloma', plan: 'pajaro', col: ['#8a8aa0', '#b8b8c8'], size: 1, K: { urbano: 14, montjuic: 4, costa: 4 }, diet: 'veg', rate: 'alta', mature: 10, act: ['manana', 'dia', 'tarde'], beh: 'vuela', hp: 2, res: ['carne', 'pluma'], breed: [0, 1, 2] },
  gaviota: { name: 'Gaviota patiamarilla', plan: 'pajaro', col: ['#f0f0f0', '#8a9aa8'], size: 1, K: { costa: 6, urbano: 4, rio: 2 }, diet: ['sardina_b'], rate: 'media', mature: 20, act: ['manana', 'dia', 'tarde', 'crepusculo'], beh: 'vuela', hp: 3, res: ['pluma'], breed: [0] },
  pota_blava: { name: 'Gallina pota blava', plan: 'ave_suelo', col: ['#e8dcc8', '#3a6ac8'], size: 1, K: { pradera: 8 }, diet: 'veg', rate: 'alta', mature: 12, act: ['manana', 'dia', 'tarde'], beh: 'huye', hp: 4, res: ['carne', 'pluma'], domestic: true, breed: [0, 1, 2] },
  gato: { name: 'Gato', plan: 'gato', col: ['#6a5a4a', '#e8d8c8'], size: 1, K: { urbano: 6, pradera: 2 }, diet: ['rata', 'raton_campo', 'gorrion'], rate: 'alta', mature: 14, act: ['crepusculo', 'noche', 'tarde'], beh: 'ignora', hp: 6, res: [], breed: [0, 1, 2] },
  zorro: { name: 'Zorro', plan: 'perro', col: ['#d8783a', '#f0e8d8'], size: 1, K: { bosque: 3, pradera: 2, costa: 1, montjuic: 1 }, diet: ['conejo', 'raton_campo', 'pota_blava', 'perdiz', 'liebre'], rate: 'media', mature: 20, act: ['crepusculo', 'noche'], beh: 'huye', hp: 10, atk: 3, res: ['piel_fina'], breed: [3, 0] },
  lobo: { name: 'Lobo', plan: 'perro', col: ['#7a7470', '#c8c0b8'], size: 2, K: { bosque: 3, montana: 3 }, diet: ['corzo', 'jabali', 'ciervo', 'conejo', 'cabra_montes', 'liebre'], rate: 'baja', mature: 40, act: ['crepusculo', 'noche'], beh: 'caza', hp: 28, atk: 7, res: ['piel', 'piel', 'hueso'], pack: true, breed: [3], litter: [2, 5] },
  lince: { name: 'Lince', plan: 'gato', col: ['#b8986a', '#e8d8b8'], size: 2, K: { montana: 2, bosque: 1 }, diet: ['conejo', 'liebre', 'corzo', 'perdiz'], rate: 'baja', mature: 40, act: ['crepusculo', 'noche'], beh: 'huye', hp: 20, atk: 6, res: ['piel_fina'], breed: [0], litter: [1, 3] },
  oso: { name: 'Oso pardo', plan: 'oso', col: ['#5a3e2a', '#3a2a1e'], size: 3, K: { montana: 1, bosque: 1 }, diet: 'veg', rate: 'baja', mature: 60, act: ['manana', 'crepusculo', 'noche'], beh: 'embiste', hp: 60, atk: 11, res: ['carne', 'carne', 'piel', 'piel', 'hueso'], breed: [3], flagship: true },
  garduna: { name: 'Garduña', plan: 'mustelido', col: ['#6a4a3a', '#f0e8d8'], size: 1, K: { bosque: 3, urbano: 1, montana: 2 }, diet: ['raton_campo', 'rata', 'ardilla', 'gorrion'], rate: 'media', mature: 20, act: ['noche'], beh: 'huye', hp: 6, atk: 2, res: ['piel_fina'], breed: [0] },
  gineta: { name: 'Gineta', plan: 'mustelido', col: ['#b8a888', '#3a3030'], size: 1, K: { bosque: 2, rio: 2 }, diet: ['raton_campo', 'ardilla'], rate: 'media', mature: 20, act: ['noche'], beh: 'huye', hp: 6, atk: 2, res: ['piel_fina'], spots: true, breed: [0, 1] },
  tejon: { name: 'Tejón', plan: 'oso', col: ['#8a8a8a', '#e8e8e8'], size: 1, K: { bosque: 3, pradera: 1 }, diet: 'veg', rate: 'baja', mature: 30, act: ['crepusculo', 'noche'], beh: 'embiste', hp: 14, atk: 4, res: ['piel'], breed: [0] },
  erizo: { name: 'Erizo', plan: 'erizo', col: ['#7a6a5a', '#c8b8a0'], size: 0, K: { pradera: 4, bosque: 3, urbano: 1 }, diet: 'veg', rate: 'media', mature: 16, act: ['crepusculo', 'noche'], beh: 'ignora', hp: 4, res: [], breed: [0, 1] },
  nutria: { name: 'Nutria', plan: 'mustelido', col: ['#5a4030', '#b8a080'], size: 1, K: { rio: 3, costa: 1 }, diet: ['anguila_b', 'trucha_b', 'barbo_b'], rate: 'baja', mature: 30, act: ['crepusculo', 'noche'], beh: 'huye', hp: 10, atk: 3, res: ['piel_fina'], breed: [0], flagship: true },
  castor: { name: 'Castor', plan: 'oso', col: ['#6a4a2a', '#4a3a2a'], size: 1, K: { rio: 2 }, diet: 'veg', rate: 'baja', mature: 40, act: ['crepusculo', 'noche'], beh: 'huye', hp: 12, res: ['piel_fina'], breed: [0], flagship: true },
  garza: { name: 'Garza real', plan: 'zancuda', col: ['#a8b0b8', '#e8e8f0'], size: 2, K: { rio: 3, costa: 1 }, diet: ['rana', 'anguila_b', 'barbo_b'], rate: 'media', mature: 30, act: ['manana', 'dia', 'crepusculo'], beh: 'vuela', hp: 8, res: ['pluma', 'pluma'], breed: [0] },
  anade: { name: 'Ánade real', plan: 'pato', col: ['#3a7a4a', '#a88a6a'], size: 1, K: { rio: 8, pradera: 1 }, diet: 'veg', rate: 'alta', mature: 16, act: ['manana', 'crepusculo'], beh: 'vuela', hp: 4, res: ['carne', 'pluma'], breed: [0] },
  rana: { name: 'Rana común', plan: 'rana', col: ['#5a9a3a', '#c8d880'], size: 0, K: { rio: 20, pradera: 4 }, diet: 'veg', rate: 'alta', mature: 8, act: ['crepusculo', 'noche'], beh: 'huye', hp: 1, res: [], breed: [0, 1] },
  galapago: { name: 'Galápago leproso', plan: 'tortuga', col: ['#5a6a3a', '#8a8a5a'], size: 1, K: { rio: 4 }, diet: 'veg', rate: 'media', mature: 40, act: ['dia', 'tarde'], beh: 'ignora', hp: 10, res: [], breed: [0, 1] },
  tortuga: { name: 'Tortuga mediterránea', plan: 'tortuga', col: ['#8a7a3a', '#d8b848'], size: 1, K: { costa: 4, pradera: 2 }, diet: 'veg', rate: 'baja', mature: 50, act: ['manana', 'dia'], beh: 'ignora', hp: 12, res: [], breed: [0, 1] },
  lagarto: { name: 'Lagarto ocelado', plan: 'lagarto', col: ['#5a8a3a', '#3a7ac8'], size: 1, K: { pradera: 3, costa: 3, montjuic: 2 }, diet: 'veg', rate: 'media', mature: 24, act: ['dia'], beh: 'huye', hp: 6, atk: 2, res: [], breed: [0, 1] },
  vibora: { name: 'Víbora áspid', plan: 'serpiente', col: ['#8a6a4a', '#3a2a1a'], size: 1, K: { montana: 3, bosque: 2 }, diet: ['raton_campo'], rate: 'baja', mature: 30, act: ['dia', 'tarde'], beh: 'embiste', hp: 6, atk: 5, venom: true, res: ['veneno'], breed: [1] },
  culebra: { name: 'Culebra bastarda', plan: 'serpiente', col: ['#6a7a4a', '#a8b068'], size: 1, K: { pradera: 3, costa: 2, bosque: 1 }, diet: ['raton_campo', 'lagarto', 'rana'], rate: 'media', mature: 30, act: ['manana', 'dia', 'tarde'], beh: 'huye', hp: 6, atk: 2, res: ['piel'], breed: [1] },
  lechuza: { name: 'Lechuza', plan: 'rapaz', col: ['#e8d8b0', '#f8f0e0'], size: 1, K: { pradera: 2, urbano: 2 }, diet: ['raton_campo', 'rata'], rate: 'media', mature: 30, act: ['crepusculo', 'noche'], beh: 'vuela', hp: 5, res: ['pluma'], breed: [0] },
  cernicalo: { name: 'Cernícalo', plan: 'rapaz', col: ['#b8784a', '#8a9aa8'], size: 1, K: { pradera: 2, urbano: 1, montjuic: 1 }, diet: ['raton_campo', 'lagarto', 'gorrion'], rate: 'media', mature: 30, act: ['manana', 'dia', 'tarde'], beh: 'vuela', hp: 4, res: ['pluma'], breed: [0] },
  aguila: { name: 'Águila real', plan: 'rapaz', col: ['#5a3e2a', '#c8a060'], size: 2, K: { montana: 2 }, diet: ['conejo', 'liebre', 'ardilla', 'perdiz'], rate: 'baja', mature: 60, act: ['dia', 'tarde'], beh: 'vuela', hp: 14, atk: 5, res: ['pluma', 'pluma'], breed: [0] },
  halcon: { name: 'Halcón peregrino', plan: 'rapaz', col: ['#4a5a6a', '#e8e0d8'], size: 1, K: { urbano: 1, costa: 1, montana: 1 }, diet: ['paloma', 'gorrion'], rate: 'baja', mature: 40, act: ['manana', 'dia', 'tarde'], beh: 'vuela', hp: 6, res: ['pluma'], breed: [0] },
  abeja: { name: 'Abejas (enjambre)', plan: 'enjambre', col: ['#e8c030', '#2a2020'], size: 0, K: { pradera: 6, bosque: 3, montana: 3 }, diet: 'veg', rate: 'alta', mature: 6, act: ['manana', 'dia'], beh: 'pica', hp: 3, atk: 2, res: ['miel', 'cera'], breed: [0, 1] },
  oca: { name: 'Oca blanca', plan: 'ave_suelo', col: ['#f8f8f0', '#f0a030'], size: 1, K: {}, diet: 'veg', rate: 'media', mature: 10, act: [], beh: 'ignora', hp: 4, res: [], breed: [] },
  // Peces (no visibles: sólo pesca) — el sufijo _b marca «biomasa»
  sardina_b: { name: 'Sardinas', fish: true, K: { costa: 90 }, diet: 'veg', rate: 'alta', mature: 8, breed: [3, 0, 1], item: 'sardina' },
  dorada_b: { name: 'Doradas', fish: true, K: { costa: 8 }, diet: ['erizo_b'], rate: 'media', mature: 20, breed: [3], item: 'dorada' },
  lubina_b: { name: 'Lubinas', fish: true, K: { costa: 8, rio: 2 }, diet: ['sardina_b'], rate: 'media', mature: 20, breed: [3], item: 'lubina' },
  pulpo_b: { name: 'Pulpos', fish: true, K: { costa: 4 }, diet: ['erizo_b'], rate: 'media', mature: 16, breed: [0], item: 'pulpo' },
  erizo_b: { name: 'Erizos de mar', fish: true, K: { costa: 60 }, diet: 'posidonia', rate: 'alta', mature: 10, breed: [0, 1, 2], item: 'erizo_mar' },
  trucha_b: { name: 'Truchas', fish: true, K: { rio: 18, montana: 8 }, diet: 'veg', rate: 'media', mature: 14, breed: [2, 3], item: 'trucha' },
  barbo_b: { name: 'Barbos', fish: true, K: { rio: 30 }, diet: 'veg', rate: 'alta', mature: 10, breed: [0, 1], item: 'barbo' },
  anguila_b: { name: 'Anguilas', fish: true, K: { rio: 10 }, diet: 'veg', rate: 'media', mature: 20, breed: [2], item: 'anguila', migrant: true },
  cangrejo_b: { name: 'Cangrejos', fish: true, K: { rio: 12 }, diet: 'veg', rate: 'media', mature: 10, breed: [1], item: 'cangrejo' },
  esturion_b: { name: 'Esturiones', fish: true, K: { rio: 2 }, diet: 'veg', rate: 'baja', mature: 80, breed: [0], item: 'esturion', flagship: true },
};
export const RATE = { alta: 0.22, media: 0.1, baja: 0.04 }; // prob. diaria de parto de una hembra fértil en temporada
const LITTER = { alta: [2, 5], media: [1, 3], baja: [1, 2] };
const SEASON_P = { alta: 0.95, media: 0.8, baja: 0.55 }; // prob. de parir en una estación de cría
const MAP_BIOME = { ciudad: 'urbano', montjuic: 'montjuic', pradera: 'pradera', bosque: 'bosque', montana: 'montana', rio: 'rio', costa: 'costa' };
export const ECO_MAPS = Object.keys(MAP_BIOME);
const NEIGH = { ciudad: ['pradera', 'costa', 'montjuic'], montjuic: ['ciudad'], pradera: ['ciudad', 'bosque', 'rio', 'costa'], bosque: ['pradera', 'montana', 'rio'], montana: ['bosque'], rio: ['pradera', 'bosque'], costa: ['ciudad', 'pradera'] };
let uid = 1;

function mk(sp, rnd, adult = true) { return { id: uid++, sp, sex: rnd() < 0.5 ? 'm' : 'f', age: adult ? SP[sp].mature + Math.floor(rnd() * 60) : 0, hunger: 0 }; }

export function initEco() {
  const rnd = mulberry(4242);
  const eco = { maps: {}, veg: {}, posidonia: 1, gone: {}, events: [], day: S.day, stats: {} };
  for (const m of ECO_MAPS) {
    const b = MAP_BIOME[m]; eco.maps[m] = []; eco.veg[m] = 1;
    for (const [id, s] of Object.entries(SP)) {
      const K = s.K[b]; if (!K) continue;
      let n = Math.round(K * (0.6 + rnd() * 0.3));
      if (id === 'oso' && m === 'bosque') n = 0; // el oso sólo queda en el Montseñal
      for (let i = 0; i < n; i++) eco.maps[m].push(mk(id, rnd));
      // garantiza ambos sexos
      const ind = eco.maps[m].filter((a) => a.sp === id); if (ind.length >= 2) { ind[0].sex = 'm'; ind[1].sex = 'f'; }
    }
  }
  uid = 1 + Math.max(0, ...Object.values(eco.maps).flat().map((a) => a.id));
  S.eco = eco;
  return eco;
}

export function count(map, sp) { return S.eco.maps[map].filter((a) => a.sp === sp).length; }
export function total(sp) { let n = 0; for (const m of ECO_MAPS) n += count(m, sp); return n; }
export function speciesIn(map) { const c = {}; for (const a of S.eco.maps[map] || []) c[a.sp] = (c[a.sp] || 0) + 1; return c; }

export function removeAnimal(map, id) { const L = S.eco.maps[map]; const i = L.findIndex((a) => a.id === id); if (i >= 0) return L.splice(i, 1)[0]; return null; }
export function takeFish(map, sp) { const L = S.eco.maps[map]; const i = L.findIndex((a) => a.sp === sp && a.age >= SP[sp].mature); if (i >= 0) { L.splice(i, 1); return true; } return false; }

// Tick diario de todo el ecosistema.
export function ecoDay() {
  const eco = S.eco; if (!eco) return;
  const rnd = Math.random; const se = season(); const news = [];
  const before = {}; for (const sp of Object.keys(SP)) before[sp] = total(sp);
  for (const m of ECO_MAPS) {
    const b = MAP_BIOME[m]; const L = eco.maps[m];
    // Vegetación: se regenera y los herbívoros la consumen
    const load = (sp) => (SP[sp].size || 0.3) + 0.3;
    const herb = L.filter((a) => SP[a.sp].diet === 'veg' && !SP[a.sp].fish).reduce((s, a) => s + load(a.sp) * (a.age < SP[a.sp].mature ? 0.4 : 1), 0);
    // Capacidad vegetal = lo que comen las especies herbívoras a su capacidad de carga (menos en invierno)
    const vegK = Object.entries(SP).filter(([, x]) => x.diet === 'veg' && !x.fish && x.K[b]).reduce((s, [id, x]) => s + x.K[b] * load(id), 0) * 1.15 * (se === 3 ? 0.7 : 1) * (1 - (eco.logged?.[m] || 0));
    eco.veg[m] = Math.max(0.05, Math.min(1.3, eco.veg[m] + 0.12 - (vegK ? herb / vegK : 0) * 0.12));
    // Alimentación. Los depredadores sólo cazan con hambre; una presa grande sacia varios días.
    for (const a of [...L]) {
      const s = SP[a.sp];
      if (s.diet === 'veg') { a.hunger = s.fish || eco.veg[m] > 0.3 ? 0 : a.hunger + 1; continue; }
      if (s.diet === 'posidonia') { a.hunger = eco.posidonia > 0.2 ? 0 : a.hunger + 1; continue; }
      if (!L.includes(a)) continue; // ya cazado hoy
      a.hunger++;
      if (a.age < s.mature || a.hunger < 1) continue; // digiriendo; las crías comen de sus padres
      // Parte de la dieta es genérica (insectos, carroña, huevos): los generalistas sobreviven sin presas concretas
      const generic = s.fish ? 0.35 : s.size >= 2 ? 0.25 : 0.4;
      // Refugio: los últimos individuos de cada presa se esconden bien (los depredadores no extinguen solos a sus presas; el jugador sí puede)
      const nPrey = {}; for (const p of L) if (s.diet.includes(p.sp)) nPrey[p.sp] = (nPrey[p.sp] || 0) + 1;
      const prey = L.filter((p) => s.diet.includes(p.sp) && p !== a && nPrey[p.sp] > Math.ceil((SP[p.sp].K[b] || 2) * 0.35));
      const halfSat = s.diet.some((d) => SP[d]?.fish) ? 24 : 8 + (s.size || 1) * 4; // saturación de Holling: con pocas presas cuesta mucho encontrarlas
      const eff = prey.length ? 0.3 * prey.length / (prey.length + halfSat) : 0;
      if (rnd() < eff) {
        const v = prey[Math.floor(rnd() * prey.length)]; L.splice(L.indexOf(v), 1);
        const food = SP[v.sp].fish ? 3 : [1, 3, 10, 16][SP[v.sp].size || 0];
        a.hunger = -food;
        // La manada comparte la presa grande
        if (s.pack && SP[v.sp].size >= 2) for (const o of L) if (o.sp === a.sp && o !== a) o.hunger = Math.min(o.hunger, -Math.floor(food * 0.6));
      } else if (rnd() < generic) a.hunger = -1;
    }
    // Posidonia (costa): la pastan los erizos
    if (m === 'costa') { const er = L.filter((a) => a.sp === 'erizo_b').length; eco.posidonia = Math.max(0, Math.min(1, eco.posidonia + 0.03 - 0.03 * er / (0.8 * SP.erizo_b.K.costa))); }
    // Hambre, vejez y sobrepoblación
    const byS = {}; for (const a of L) (byS[a.sp] ||= []).push(a);
    for (const [sp, arr] of Object.entries(byS)) {
      const s = SP[sp]; const K = (s.K[b] || 1) * (s.diet === 'veg' ? Math.min(1.2, 0.4 + eco.veg[m]) : 1);
      for (const a of arr) {
        a.age++;
        const starve = a.hunger > (s.size >= 2 ? 12 : 7);
        const old = a.age > s.mature * 14 && rnd() < 0.015;
        const crowd = arr.length > K * 1.4 && rnd() < 0.08;
        if (starve || old || crowd) {
          // Antes de morir de hambre o apretujado, intenta emigrar
          if ((starve || crowd) && !s.fish && rnd() < 0.5) { const to = NEIGH[m].filter((n) => SP[sp].K[MAP_BIOME[n]]); if (to.length) { const n = to[Math.floor(rnd() * to.length)]; L.splice(L.indexOf(a), 1); a.hunger = 0; eco.maps[n].push(a); continue; } }
          L.splice(L.indexOf(a), 1);
        }
      }
    }
    // Cría estacional: cada hembra adulta pare como mucho una vez por estación de cría.
    for (const [sp] of Object.entries(byS)) {
      const s = SP[sp]; if (!s.breed.includes(se)) continue;
      const arr = L.filter((a) => a.sp === sp);
      const adults = arr.filter((a) => a.age >= s.mature);
      if (!adults.some((a) => a.sex === 'm')) continue;
      const K = s.K[b] || 1; if (arr.length >= K * 1.5) continue;
      const seasonKey = Math.floor((S.day - 1) / 28);
      for (const f of adults.filter((a) => a.sex === 'f')) {
        if (f.hunger > 3 || f.bred === seasonKey) continue;
        if (rnd() < SEASON_P[s.rate] / 20) {
          f.bred = seasonKey;
          const [lo, hi] = s.litter || LITTER[s.rate]; const n = lo + Math.floor(rnd() * (hi - lo + 1));
          for (let i = 0; i < n; i++) L.push(mk(sp, rnd, false));
        }
      }
    }
    // Recolonización: si la especie no está pero puede vivir aquí, llega alguien de un mapa vecino.
    // Las especies comunes pueden llegar muy de tarde en tarde desde fuera de la comarca; las emblemáticas, nunca.
    for (const [sp, s] of Object.entries(SP)) {
      if (!s.K[b] || L.some((a) => a.sp === sp)) continue;
      if (s.flagship && eco.gone[sp]) continue; // extinción regional permanente
      if (!s.flagship && s.rate !== 'baja' && rnd() < 1 / 400) { const a = mk(sp, rnd), c = mk(sp, rnd); a.sex = 'm'; c.sex = 'f'; L.push(a, c); continue; }
      for (const n of NEIGH[m]) { const src = eco.maps[n].filter((a) => a.sp === sp && a.age >= s.mature); if (src.length >= 3 && rnd() < 0.08) { const a = src[0]; eco.maps[n].splice(eco.maps[n].indexOf(a), 1); L.push(a); break; } }
    }
  }
  // Extinciones y noticias
  for (const sp of Object.keys(SP)) {
    const t = total(sp);
    if (before[sp] > 0 && t === 0) { eco.gone[sp] = S.day; news.push(`${SP[sp].name}: extinguido en toda la comarca.`); }
    for (const m of ECO_MAPS) { const c = count(m, sp); const k = eco.stats[m + ':' + sp]; if (k > 0 && c === 0 && t > 0) news.push(`${SP[sp].name}: ya no queda ninguno en ${mapName(m)}.`); eco.stats[m + ':' + sp] = c; }
  }
  // Cascadas → eventos del mundo
  const wolves = total('lobo') + total('lince'), boars = count('pradera', 'jabali') + count('bosque', 'jabali');
  eco.cropDamage = Math.max(0, Math.min(0.6, (boars - 8) * 0.04 + (count('pradera', 'raton_campo') - 18) * 0.02 - count('pradera', 'lechuza') * 0.03));
  eco.pollination = Math.min(1, total('abeja') / 8);
  eco.rats = count('ciudad', 'rata');
  if (eco.cropDamage > 0.2 && !eco.flagCrop) { eco.flagCrop = true; news.push('Los payeses se quejan: los jabalíes y los ratones arrasan el Llano.'); }
  if (eco.cropDamage < 0.1) eco.flagCrop = false;
  if (eco.rats > 22 && !eco.flagRats) { eco.flagRats = true; news.push('Hay plaga de ratas en la ciudad. Se teme la pestilencia.'); }
  if (eco.rats < 14) eco.flagRats = false;
  if (wolves === 0 && !eco.flagWolf) { eco.flagWolf = true; news.push('No quedan lobos ni linces. Por las noches se oye algo peor en la sierra...'); }
  if (eco.posidonia < 0.3 && !eco.flagPos) { eco.flagPos = true; news.push('Los erizos se han comido la posidonia. Hay menos peces en la costa.'); }
  eco.events = [...news, ...eco.events].slice(0, 20);
  for (const n of news) logEvent(n);
  return news;
}

// Pesca: probabilidad de captura según biomasa de peces del mapa
export function fishPool(map) {
  const L = S.eco.maps[map] || []; const c = {};
  for (const a of L) if (SP[a.sp].fish && a.age >= SP[a.sp].mature) c[a.sp] = (c[a.sp] || 0) + 1;
  return c;
}

export function mapName(m) { return { ciudad: 'Barcanueva', montjuic: 'el Monte del Juïc', pradera: 'el Llano', bosque: 'Collsaverola', montana: 'el Montseñal', rio: 'el Lobregat', costa: 'la costa' }[m] || m; }

// Condiciones de aparición de criaturas fantásticas (según el estado del ecosistema)
export function faeAvailable() {
  const e = S.eco;
  return {
    dona_aigua: count('rio', 'nutria') > 0 && count('rio', 'trucha_b') >= 4,
    simiot: total('lobo') === 0 && (count('bosque', 'jabali') > 7),
    quarantamaula: total('lobo') === 0 && total('lince') === 0,
    peix_nicolau: e.posidonia > 0.6 && count('costa', 'sardina_b') > 15,
    minairons: true,
  };
}
