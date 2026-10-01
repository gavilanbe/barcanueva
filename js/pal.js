// Paleta maestra de Barcanueva y utilidades de color.
//
// Reglas de estilo (todo el arte del juego las sigue):
//  · Luz desde arriba a la izquierda; sombras hacia abajo a la derecha.
//  · Nada de negro puro: el trazo más oscuro es INK (violeta casi negro).
//  · Rampas con desplazamiento de tono: las sombras se enfrían (hacia azul-violeta) y ganan algo de
//    saturación; las luces se calientan (hacia amarillo) y pierden saturación. Nunca «multiplicar por 0,7».
//  · Contorno selectivo (sel-out): el borde de cada sprite es un tono oscuro del color que bordea;
//    más claro arriba y a la izquierda, INK abajo (contacto con el suelo).
//  · Dithering sólo en degradados grandes (cielos, agua profunda, sombras), con Bayer 4×4 o damero.
//  · Cada material usa 3-4 tonos de su rampa como mucho en 16 px; los detalles se leen por silueta.

export const INK = '#1a1022';
export const INK2 = '#2b1d36';
export const WHITE = '#fff8ec';

// ───────────── Conversión ─────────────
export function rgb(hex) {
  if (hex[0] !== '#') return [255, 0, 255];
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function hex(r, g, b) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
export function toHsl(c) {
  let [r, g, b] = rgb(c); r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn; const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
export function toHsv(c) {
  let [r, g, b] = rgb(c); r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return [h, mx ? d / mx : 0, mx];
}
export function fromHsv(h, s, v) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); v = Math.max(0, Math.min(1, v));
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
const toward = (h, t, max) => { const d = ((t - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), max); };

// Desplaza un color n pasos: n<0 más oscuro y frío, n>0 más claro y cálido (en HSV, para que las
// sombras de los colores pastel no se vuelvan chillonas).
export function shift(c, n) {
  let [h, s, v] = toHsv(c);
  for (let i = 0; i < Math.abs(n); i++) {
    if (n < 0) { h = toward(h, 255, 10); v *= 0.8; s = Math.min(1, s + 0.08 * (1 - s) + 0.03); }
    else { h = toward(h, h > 190 && h < 265 ? 195 : 52, 8); v += (1 - v) * 0.32; s *= 0.84; }
  }
  return fromHsv(h, s, v);
}
// Rampa de 7 tonos (0 = más oscuro, 3 = base, 6 = más claro). Cacheada.
const rampCache = new Map();
export function ramp(c) {
  let r = rampCache.get(c); if (r) return r;
  r = [-3, -2, -1, 0, 1, 2, 3].map((k) => (k ? shift(c, k) : c)); rampCache.set(c, r); return r;
}
export function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
export function alpha(c, a) { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; }
export function lum(c) { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

// ───────────── Rampas con nombre (oscuro → claro) ─────────────
export const PAL = {
  grass: ['#122a2a', '#183a32', '#1f4c38', '#29623e', '#357a42', '#479446', '#62ae4e', '#88c85e', '#b4dc78'],
  forest: ['#0d1e24', '#12292c', '#173634', '#1d4438', '#24543c', '#2e6640', '#3c7a44'],
  dry: ['#3a3a24', '#55542c', '#727034', '#8f8c40', '#ada852', '#c8c26c', '#e0d88e'],
  dirt: ['#3a2428', '#573830', '#764e38', '#966842', '#b4844e', '#cca262', '#e0be7e', '#eed8a4'],
  sand: ['#6e5038', '#93704a', '#b28e5c', '#ccaa72', '#e0c48c', '#eedaaa', '#f8ecca'],
  mud: ['#2a1c22', '#3e2a2a', '#553a32', '#6c4c3c', '#856048', '#9c7658'],
  stone: ['#181425', '#262b44', '#3a4466', '#5a6988', '#8b9bb4', '#c0cbdc', '#e8eef6'],
  cobble: ['#241c2a', '#372c3c', '#4c404e', '#635662', '#7c6e76', '#988a8c', '#b8aca8', '#d8cec6'],
  wstone: ['#3a2630', '#563a3a', '#765444', '#957052', '#b28c64', '#ccaa7c', '#e2c89c', '#f2e2c0'],
  water: ['#0c1a38', '#10305e', '#134a86', '#1866a6', '#1e86c8', '#3aa8e0', '#6ccaf0', '#b8ecfc'],
  sea: ['#0a1230', '#0e1e4c', '#122e6a', '#174288', '#1c58a2', '#2670b8'],
  terra: ['#3a1a22', '#5a2626', '#7e3428', '#a2462e', '#c25e36', '#da7a46', '#ea9a62', '#f6be8a'],
  wood: ['#24161c', '#3e2426', '#5c362e', '#7c4c38', '#9c6644', '#b88252', '#d2a06a'],
  leaf: ['#0d1f24', '#12302e', '#174334', '#1e583a', '#287040', '#368a46', '#4ca44c', '#6cbe56', '#98d46a'],
  pine: ['#0b1a22', '#0f272c', '#143636', '#1a473e', '#215a48', '#2c6e52', '#3c845e'],
  olive: ['#25302c', '#36463a', '#4a5c48', '#627456', '#7c8e68', '#9aa87e', '#bcc69c'],
  plaster: ['#6c4e46', '#8c6c5a', '#ac8c70', '#c8aa88', '#dec6a4', '#eedcbe', '#faf0dc'],
  snow: ['#4a5878', '#6c7c9c', '#94a4c0', '#bccade', '#dee8f4', '#f6faff'],
  gold: ['#3e2418', '#6a3e1a', '#9a5e1c', '#cc8a26', '#f0b030', '#fcd456', '#fff0a0'],
  iron: ['#1a1824', '#2c2c3a', '#424656', '#5e6476', '#7e8698', '#a6aebe', '#d4dae4'],
  red: ['#2e0c1a', '#520f22', '#7c1a2a', '#a42632', '#cc3a3c', '#e8604e', '#f6927a'],
  blue: ['#121634', '#1a2654', '#223a78', '#2c5298', '#3e70b8', '#5e94d4', '#94c0ec'],
  green: ['#0e2220', '#16362a', '#1f4c34', '#2a643c', '#3a7e46', '#56a050', '#82c066'],
  purple: ['#1c1028', '#30183c', '#482654', '#62366a', '#824e86', '#a66ea4', '#cc9ac6'],
  fire: ['#4a1020', '#8a1c28', '#d0302e', '#f06a26', '#fca63a', '#fedc6a', '#fffbe0'],
  paper: ['#4a3430', '#7a5a48', '#b08c66', '#d8bc8c', '#ecdab0', '#f6eccc', '#fffaea'],
  night: ['#0a0a1e', '#121434', '#1c2050', '#282e6a', '#3a4488'],
};
// Elige un tono de una rampa con índice fraccionario recortado.
export function pick(r, i) { return r[Math.max(0, Math.min(r.length - 1, Math.round(i)))]; }

// ───────────── Contorno selectivo ─────────────
// Todo píxel transparente vecino (4-conexo) de uno opaco se pinta con el color vecino oscurecido.
// Por la orientación de la luz: borde inferior → INK casi puro; derecho → muy oscuro; superior/izquierdo → más suave.
export function outlineSel(cv, { ink = INK, top = 0.62, side = 0.7, right = 0.8, bottom = 0.92, solid = null } = {}) {
  const x = cv.getContext('2d'); const { width: w, height: h } = cv;
  const d = x.getImageData(0, 0, w, h); const a = d.data; const src = new Uint8ClampedArray(a);
  const [ir, ig, ib] = rgb(ink);
  const op = (i, j) => i >= 0 && j >= 0 && i < w && j < h && src[(j * w + i) * 4 + 3] > 128;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4; if (src[k + 3] > 0) continue;
    let s = -1, ni = -1;
    // vecino de arriba ⇒ este píxel queda debajo del sprite
    if (op(i, j - 1)) { s = bottom; ni = ((j - 1) * w + i) * 4; }
    if (op(i - 1, j) && right > s) { s = right; ni = (j * w + i - 1) * 4; }
    if (op(i + 1, j) && side > s) { s = side; ni = (j * w + i + 1) * 4; }
    if (op(i, j + 1) && top > s) { s = top; ni = ((j + 1) * w + i) * 4; }
    if (s < 0) continue;
    if (solid) { const [r, g, b] = rgb(solid); a[k] = r; a[k + 1] = g; a[k + 2] = b; a[k + 3] = 255; continue; }
    a[k] = src[ni] + (ir - src[ni]) * s; a[k + 1] = src[ni + 1] + (ig - src[ni + 1]) * s; a[k + 2] = src[ni + 2] + (ib - src[ni + 2]) * s; a[k + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return cv;
}

// Silueta: copia del sprite rellena de un color (destellos de golpe, sombras, siluetas de títulos).
const silCache = new WeakMap();
export function silhouette(cv, color = '#ffffff') {
  let m = silCache.get(cv); if (!m) { m = new Map(); silCache.set(cv, m); }
  let c = m.get(color); if (c) return c;
  c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d');
  x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  m.set(color, c); return c;
}
