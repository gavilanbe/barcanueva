// Utilidades comunes: RNG con semilla, color, lienzos.
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
export function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgb(r, g, b) { const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
export function shade(c, f) { const [r, g, b] = hex(c); return f < 1 ? rgb(r * f, g * f, b * f * 1.04 + 4) : rgb(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1)); }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }

// Contorno automático: todo píxel transparente vecino (4-conexo) de uno opaco pasa a color de contorno.
export function outline(cv, color = '#1c1424') {
  const x = cv.getContext('2d'); const { width: w, height: h } = cv;
  const d = x.getImageData(0, 0, w, h); const a = d.data; const [r, g, b] = hex(color);
  const op = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 0 && !(a[(j * w + i) * 4] === r && a[(j * w + i) * 4 + 1] === g && a[(j * w + i) * 4 + 2] === b && a[(j * w + i) * 4 + 3] === 254);
  const mark = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (a[(j * w + i) * 4 + 3] === 0 && (op(i - 1, j) || op(i + 1, j) || op(i, j - 1) || op(i, j + 1))) mark.push(j * w + i);
  }
  for (const k of mark) { a[k * 4] = r; a[k * 4 + 1] = g; a[k * 4 + 2] = b; a[k * 4 + 3] = 254; }
  x.putImageData(d, 0, 0);
  return cv;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
export const rand = Math.random;
export const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
