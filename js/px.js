// Primitivas de dibujo «a píxel»: sin antialias, siempre en coordenadas enteras.
// Todas dibujan con fillRect, así funcionan en cualquier contexto 2D (también en lienzos de caché).

export const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const bayer = (x, y) => (BAYER4[y & 3][x & 3] + 0.5) / 16;

// P(ctx, ox, oy) → función p(color, x, y, w=1, h=1) con origen desplazado.
export function painter(ctx, ox = 0, oy = 0) {
  return (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
}

// Elipse rellena (filas enteras): cx, cy centro; rx, ry radios.
export function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color; cx = Math.round(cx); cy = Math.round(cy);
  for (let r = -ry; r <= ry; r++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r * r) / (ry * ry + 0.0001))));
    if (w > 0) ctx.fillRect(cx - w, cy + r, w * 2, 1);
  }
}
// Contorno de elipse de 1 px.
export function ellipseLine(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color; cx = Math.round(cx); cy = Math.round(cy);
  let prev = null;
  for (let r = -ry; r <= ry; r++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r * r) / (ry * ry + 0.0001))));
    const pw = prev === null ? 0 : prev;
    const a = Math.min(w, pw), b = Math.max(w, pw);
    if (r === -ry || r === ry) { ctx.fillRect(cx - w, cy + r, w * 2, 1); }
    else { ctx.fillRect(cx - b, cy + r, Math.max(1, b - a), 1); ctx.fillRect(cx + a, cy + r, Math.max(1, b - a), 1); }
    prev = w;
  }
}
export function circle(ctx, cx, cy, r, color) { ellipse(ctx, cx, cy, r, r, color); }

// Elipse con relleno tramado (sombras suaves sobre el suelo): densidad 0..1.
export function ellipseDither(ctx, cx, cy, rx, ry, color, dens = 0.5) {
  ctx.fillStyle = color; cx = Math.round(cx); cy = Math.round(cy);
  for (let r = -ry; r <= ry; r++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r * r) / (ry * ry + 0.0001))));
    for (let i = -w; i < w; i++) if (bayer(cx + i, cy + r) < dens) ctx.fillRect(cx + i, cy + r, 1, 1);
  }
}

// Línea de Bresenham.
export function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  while (n++ < 2000) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

// Polígono relleno por líneas de barrido (vértices [[x,y],...]).
export function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  let y0 = Infinity, y1 = -Infinity; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs = []; const yc = y + 0.5;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) ctx.fillRect(a, y, b - a, 1); }
  }
}

// Rectángulo tramado entre dos colores (t = proporción de c2, 0..1).
export function ditherRect(ctx, x, y, w, h, c1, c2, t = 0.5) {
  ctx.fillStyle = c1; ctx.fillRect(x, y, w, h); ctx.fillStyle = c2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bayer(x + i, y + j) < t) ctx.fillRect(x + i, y + j, 1, 1);
}

// Degradado vertical por bandas tramadas a partir de una lista de colores (cielos, mar, fondos).
export function gradientV(ctx, x, y, w, h, cols) {
  const n = cols.length - 1;
  for (let j = 0; j < h; j++) {
    const f = (j / Math.max(1, h - 1)) * n; const k = Math.min(n - 1, Math.floor(f)); const t = f - k;
    for (let i = 0; i < w; i++) { ctx.fillStyle = bayer(x + i, y + j) < t ? cols[k + 1] : cols[k]; ctx.fillRect(x + i, y + j, 1, 1); }
  }
}
// Versión rápida: sólo tramado en la franja de transición entre bandas (para fondos grandes).
export function gradientBands(ctx, x, y, w, h, cols, ditherRows = 3) {
  const n = cols.length; const band = h / n;
  for (let k = 0; k < n; k++) { ctx.fillStyle = cols[k]; ctx.fillRect(x, Math.round(y + k * band), w, Math.ceil(band) + 1); }
  for (let k = 1; k < n; k++) {
    const by = Math.round(y + k * band);
    for (let r = -ditherRows; r < ditherRows; r++) {
      const yy = by + r; if (yy < y || yy >= y + h) continue;
      const t = (r + ditherRows + 0.5) / (ditherRows * 2);
      for (let i = 0; i < w; i++) { ctx.fillStyle = bayer(x + i, yy) < t ? cols[k] : cols[k - 1]; ctx.fillRect(x + i, yy, 1, 1); }
    }
  }
}

// Ruido de valor suave y determinista (0..1) para texturas.
export function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
export function vnoise(x, y, sc = 8, s = 0) {
  const fx = x / sc, fy = y / sc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const sm = (t) => t * t * (3 - 2 * t);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  const u = sm(tx), v = sm(ty);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
export function fbm(x, y, sc = 16, s = 0, oct = 3) {
  let t = 0, amp = 1, norm = 0;
  for (let o = 0; o < oct; o++) { t += vnoise(x, y, sc, s + o * 97) * amp; norm += amp; amp *= 0.5; sc /= 2; }
  return t / norm;
}
