// Fuente de mapa de bits estilo GBA. Celda de 8 filas (0..7), línea base en la fila 6.
// Las tildes se componen: base + marca encima. Altura de línea recomendada: 11 px.
const G = {};
const def = (ch, top, rows) => { G[ch] = { top, rows, w: Math.max(...rows.map((r) => r.length)) }; };
const S = (s) => s.split(' ');

// Mayúsculas (filas 0-6)
def('A', 0, S('.###. #...# #...# ##### #...# #...# #...#'));
def('B', 0, S('####. #...# #...# ####. #...# #...# ####.'));
def('C', 0, S('.###. #...# #.... #.... #.... #...# .###.'));
def('D', 0, S('####. #...# #...# #...# #...# #...# ####.'));
def('E', 0, S('##### #.... #.... ####. #.... #.... #####'));
def('F', 0, S('##### #.... #.... ####. #.... #.... #....'));
def('G', 0, S('.###. #...# #.... #.### #...# #...# .####'));
def('H', 0, S('#...# #...# #...# ##### #...# #...# #...#'));
def('I', 0, S('### .#. .#. .#. .#. .#. ###'));
def('J', 0, S('..### ...#. ...#. ...#. #..#. #..#. .##..'));
def('K', 0, S('#...# #..#. #.#.. ##... #.#.. #..#. #...#'));
def('L', 0, S('#.... #.... #.... #.... #.... #.... #####'));
def('M', 0, S('#...# ##.## #.#.# #.#.# #...# #...# #...#'));
def('N', 0, S('#...# ##..# #.#.# #..## #...# #...# #...#'));
def('O', 0, S('.###. #...# #...# #...# #...# #...# .###.'));
def('P', 0, S('####. #...# #...# ####. #.... #.... #....'));
def('Q', 0, S('.###. #...# #...# #...# #.#.# #..#. .##.#'));
def('R', 0, S('####. #...# #...# ####. #.#.. #..#. #...#'));
def('S', 0, S('.#### #.... #.... .###. ....# ....# ####.'));
def('T', 0, S('##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..'));
def('U', 0, S('#...# #...# #...# #...# #...# #...# .###.'));
def('V', 0, S('#...# #...# #...# #...# #...# .#.#. ..#..'));
def('W', 0, S('#...# #...# #...# #.#.# #.#.# ##.## #...#'));
def('X', 0, S('#...# #...# .#.#. ..#.. .#.#. #...# #...#'));
def('Y', 0, S('#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..'));
def('Z', 0, S('##### ....# ...#. ..#.. .#... #.... #####'));
// Minúsculas
def('a', 2, S('.##. ...# .### #..# .###'));
def('b', 0, S('#... #... ###. #..# #..# #..# ###.'));
def('c', 2, S('.### #... #... #... .###'));
def('d', 0, S('...# ...# .### #..# #..# #..# .###'));
def('e', 2, S('.##. #..# #### #... .###'));
def('f', 0, S('..## .#.. ###. .#.. .#.. .#.. .#..'));
def('g', 2, S('.### #..# #..# .### ...# ###.'));
def('h', 0, S('#... #... ###. #..# #..# #..# #..#'));
def('i', 0, S('# . # # # # #'));
def('ı', 2, S('# # # # #'));
def('j', 0, S('.# .. .# .# .# .# .# #.'));
def('k', 0, S('#... #... #..# #.#. ##.. #.#. #..#'));
def('l', 0, S('#. #. #. #. #. #. .#'));
def('m', 2, S('##.#. #.#.# #.#.# #.#.# #.#.#'));
def('n', 2, S('###. #..# #..# #..# #..#'));
def('o', 2, S('.##. #..# #..# #..# .##.'));
def('p', 2, S('###. #..# #..# ###. #... #...'));
def('q', 2, S('.### #..# #..# .### ...# ...#'));
def('r', 2, S('#.## ##.. #... #... #...'));
def('s', 2, S('.### #... .##. ...# ###.'));
def('t', 1, S('.#.. ###. .#.. .#.. .#.. ..##'));
def('u', 2, S('#..# #..# #..# #..# .###'));
def('v', 2, S('#...# #...# .#.#. .#.#. ..#..'));
def('w', 2, S('#...# #.#.# #.#.# #.#.# .#.#.'));
def('x', 2, S('#..# #..# .##. #..# #..#'));
def('y', 2, S('#..# #..# #..# .### ...# .##.'));
def('z', 2, S('#### ..#. .#.. #... ####'));
// Dígitos
def('0', 0, S('.##. #..# #.## ##.# #..# #..# .##.'));
def('1', 0, S('.#. ##. .#. .#. .#. .#. ###'));
def('2', 0, S('.##. #..# ...# ..#. .#.. #... ####'));
def('3', 0, S('###. ...# ...# .##. ...# ...# ###.'));
def('4', 0, S('#..# #..# #..# #### ...# ...# ...#'));
def('5', 0, S('#### #... ###. ...# ...# #..# .##.'));
def('6', 0, S('.##. #... #... ###. #..# #..# .##.'));
def('7', 0, S('#### ...# ..#. .#.. .#.. .#.. .#..'));
def('8', 0, S('.##. #..# #..# .##. #..# #..# .##.'));
def('9', 0, S('.##. #..# #..# .### ...# ...# .##.'));
// Signos
def('.', 6, S('#'));
def(',', 5, S('.# .# #.'));
def('!', 0, S('# # # # # . #'));
def('¡', 2, S('# . # # # # #'));
def('?', 0, S('.##. #..# ...# ..#. .#.. .... .#..'));
def('¿', 2, S('..#. .... ..#. .#.. #... #..# .##.'));
def(':', 2, S('# . . . #'));
def(';', 2, S('.# .. .. .# .# #.'));
def("'", 0, S('# # .'));
def('’', 0, S('# # .'));
def('"', 0, S('#.# #.# ...'));
def('-', 3, S('###'));
def('–', 3, S('####'));
def('—', 3, S('#####'));
def('+', 2, S('.#. .#. ### .#. .#.'));
def('=', 2, S('### ... ###'));
def('(', 0, S('.# #. #. #. #. #. .#'));
def(')', 0, S('#. .# .# .# .# .# #.'));
def('[', 0, S('## #. #. #. #. #. ##'));
def(']', 0, S('## .# .# .# .# .# ##'));
def('/', 0, S('...# ...# ..#. .#.. #... #... #...'));
def('%', 0, S('##..# ##.#. ...#. ..#.. .#... .#.## #..##'));
def('·', 3, S('#'));
def('*', 1, S('#.#.# .###. ##### .###. #.#.#'));
def('«', 2, S('..#.# .#.#. #.#.. .#.#. ..#.#'));
def('»', 2, S('#.#.. .#.#. ..#.# .#.#. #.#..'));
def('<', 1, S('...# ..#. .#.. #... .#.. ..#. ...#'));
def('>', 1, S('#... .#.. ..#. ...# ..#. .#.. #...'));
def('_', 6, S('####'));
def('#', 0, S('.#.#. ##### .#.#. .#.#. ##### .#.#. .....'));
def('&', 0, S('.##.. #..#. #.#.. .#... #.#.# #..#. .##.#'));
def('♥', 1, S('.#.#. ##### ##### .###. ..#..'));
def('★', 0, S('..#.. ..#.. ##### .###. .#.#. #...#'));
def('▶', 0, S('#... ##.. ###. #### ###. ##.. #...'));
def('◀', 0, S('...# ..## .### #### .### ..## ...#'));
def('▼', 2, S('##### .###. ..#..'));
def('▲', 2, S('..#.. .###. #####'));
def('◆', 1, S('..#.. .###. ##### .###. ..#..'));
def('●', 1, S('.###. ##### ##### ##### .###.'));
def('○', 1, S('.###. #...# #...# #...# .###.'));
def('☀', 0, S('#.#.# .###. ##### ##### ##### .###. #.#.#'));
def('☾', 0, S('.##.. #.... #.... #.... #.... #.... .##..'));
def('†', 0, S('.#. ### .#. .#. .#. .#. ...'));
def('ç', 2, S('.### #... #... #... .### ..#.'));
def('Ç', 0, S('.###. #...# #.... #.... #.... #...# .###. ..#..'));
def('×', 2, S('#...# .#.#. ..#.. .#.#. #...#'));
def('♂', 0, S('..### ...## ..#.# .##.. #..#. #..#. .##..'));
def('♀', 0, S('.###. #...# #...# .###. ..#.. .###. ..#..'));
def('♪', 0, S('..##. ..#.# ..#.. ..#.. .##.. ###.. .#...'));
def('…', 6, S('#.#.#'));
def('⅓', 0, S('#.... #..#. #.#.. ..#.. .#.## #...# ....#'));
def('⅔', 0, S('##... .#.#. #.#.. ..#.. .#.## #...# ....#'));
def('✓', 1, S('....# ...#. #.#.. .#...'));
def('✗', 1, S('#...# .#.#. ..#.. .#.#. #...#'));
def('↑', 0, S('..#.. .###. #.#.# ..#.. ..#.. ..#.. ..#..'));
def('↓', 0, S('..#.. ..#.. ..#.. ..#.. #.#.# .###. ..#..'));
def('→', 1, S('...#. ....# ##### ....# ...#.'));
def('←', 1, S('.#... #.... ##### #.... .#...'));
def('º', 0, S('.#. #.# .#. ... ###'));
def('ª', 0, S('.##. #.## .### .... ####'));
def('@', 0, S('.###. #...# #.### #.#.# #.### #.... .###.'));

// Marcas diacríticas: [filas, desplazamiento x] relativas a la parte superior del glifo base.
const MARK = {
  acute: S('.# #.'), grave: S('#. .#'), diaer: S('#.#'), tilde: S('.#.# #.#.'), circ: S('.#. #.#'),
};
const COMPOSED = {
  'á': ['a', 'acute'], 'é': ['e', 'acute'], 'í': ['ı', 'acute'], 'ó': ['o', 'acute'], 'ú': ['u', 'acute'],
  'à': ['a', 'grave'], 'è': ['e', 'grave'], 'ì': ['ı', 'grave'], 'ò': ['o', 'grave'], 'ù': ['u', 'grave'],
  'ä': ['a', 'diaer'], 'ë': ['e', 'diaer'], 'ï': ['ı', 'diaer'], 'ö': ['o', 'diaer'], 'ü': ['u', 'diaer'],
  'ñ': ['n', 'tilde'], 'â': ['a', 'circ'], 'ê': ['e', 'circ'], 'ô': ['o', 'circ'],
  'Á': ['A', 'acute'], 'É': ['E', 'acute'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'], 'Ú': ['U', 'acute'],
  'À': ['A', 'grave'], 'È': ['E', 'grave'], 'Ò': ['O', 'grave'], 'Ñ': ['N', 'tilde'], 'Ü': ['U', 'diaer'], 'Ï': ['I', 'diaer'],
};

function glyph(ch) {
  if (G[ch]) return { base: G[ch] };
  const c = COMPOSED[ch];
  if (c) return { base: G[c[0]], mark: MARK[c[1]] };
  return null;
}

// ───────────── Texto enriquecido ─────────────
// Códigos en línea con «^»: ^r rojo · ^g verde · ^b azul · ^y oro · ^p rosa · ^c cian · ^o naranja · ^k gris · ^0 color normal
// ^w onda (alterna) · ^s temblor (alterna) · ^^ un «^» literal.
export const RICH = { r: '#c8323c', g: '#2f8a3e', b: '#2c5aa0', y: '#b8781c', p: '#c84a7a', c: '#1e86a8', o: '#d0601e', k: '#8a7a70' };
export const RICH_DARK = { r: '#ff6a5a', g: '#8ae07a', b: '#8ab8ff', y: '#ffd456', p: '#ff9ac8', c: '#7ae0f0', o: '#ffa040', k: '#a89aa8' };
const isCode = (s, i) => s[i] === '^' && i + 1 < s.length;

export function charWidth(ch) {
  if (ch === ' ') return 3;
  const g = glyph(ch); return g ? g.base.w + 1 : 4;
}
export function textWidth(s) {
  let w = 0;
  for (let i = 0; i < s.length; i++) { if (isCode(s, i)) { if (s[i + 1] === '^') w += charWidth('^'); i++; continue; } w += charWidth(s[i]); }
  return Math.max(0, w - 1);
}

// Dibuja texto (con códigos de color). y es la parte superior de la celda de mayúsculas.
export function drawText(ctx, s, x, y, color = '#f8f0d8', shadow = null, pal = null) {
  if (shadow) drawRaw(ctx, s, x + 1, y + 1, shadow, null);
  return drawRaw(ctx, s, x, y, color, pal || (lumHex(color) > 0.6 ? RICH_DARK : RICH));
}
function lumHex(c) { if (c[0] !== '#') return 0.5; const n = parseInt(c.slice(1, 7), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
function drawRaw(ctx, s, x, y, color, pal) {
  let cx = x; ctx.fillStyle = color;
  for (let i = 0; i < s.length; i++) {
    if (isCode(s, i)) {
      const k = s[++i]; if (k === '^') { cx = glyphAt(ctx, '^', cx, y); continue; }
      if (pal) ctx.fillStyle = k === '0' ? color : (pal[k] || ctx.fillStyle);
      continue;
    }
    cx = glyphAt(ctx, s[i], cx, y);
  }
  return cx;
}
// Pinta un glifo con el fillStyle actual y devuelve la x siguiente.
export function glyphAt(ctx, ch, cx, y) {
  if (ch === ' ') return cx + 3;
  const g = glyph(ch); if (!g) return cx + 4;
  const b = g.base;
  for (let r = 0; r < b.rows.length; r++) { const row = b.rows[r]; let run = -1; for (let c = 0; c <= row.length; c++) { if (row[c] === '#') { if (run < 0) run = c; } else if (run >= 0) { ctx.fillRect(cx + run, y + b.top + r, c - run, 1); run = -1; } } }
  if (g.mark) {
    const my = b.top >= 2 ? y + b.top - 2 : y - 3;
    const mx = cx + Math.max(0, Math.floor((b.w - g.mark[0].length) / 2));
    for (let r = 0; r < g.mark.length; r++) for (let c = 0; c < g.mark[r].length; c++) if (g.mark[r][c] === '#') ctx.fillRect(mx + c, my + r, 1, 1);
  }
  return cx + b.w + 1;
}

// Parte un texto en líneas de maxW píxeles. Respeta \n y arrastra los códigos activos a la línea siguiente.
export function wrap(s, maxW) {
  const out = [];
  for (const para of s.split('\n')) {
    let line = ''; let carry = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (textWidth(t) > maxW && line) { out.push(line); carry = activeCodes(carry + line); line = carry + word; } else line = t;
    }
    out.push(line);
  }
  return out;
}
function activeCodes(s) {
  let col = '', w = false, sh = false;
  for (let i = 0; i < s.length; i++) if (isCode(s, i)) { const k = s[++i]; if (k === 'w') w = !w; else if (k === 's') sh = !sh; else if (k === '0') col = ''; else if (k !== '^') col = k; }
  return (col ? '^' + col : '') + (w ? '^w' : '') + (sh ? '^s' : '');
}

// Línea → glifos con posición, color y efecto (para la máquina de escribir de los diálogos).
export function glyphs(line, pal = RICH) {
  const out = []; let x = 0, col = null, w = false, sh = false;
  for (let i = 0; i < line.length; i++) {
    if (isCode(line, i)) { const k = line[++i]; if (k === 'w') w = !w; else if (k === 's') sh = !sh; else if (k === '0') col = null; else if (k === '^') { out.push({ ch: '^', x, col, w, sh }); x += charWidth('^'); } else col = pal[k] || col; continue; }
    out.push({ ch: line[i], x, col, w, sh }); x += charWidth(line[i]);
  }
  return out;
}
// Dibuja los n primeros glifos (n = Infinity: todos). t = fotograma para ondas y temblores.
export function drawGlyphs(ctx, gl, x, y, color, shadow, n = Infinity, t = 0) {
  const m = Math.min(n, gl.length);
  for (let pass = shadow ? 0 : 1; pass < 2; pass++) {
    for (let i = 0; i < m; i++) {
      const g = gl[i]; if (g.ch === ' ') continue;
      let dy = 0, dx = 0;
      if (g.w) dy = Math.round(Math.sin(t / 7 + i * 0.7) * 1.4);
      if (g.sh) { const q = Math.floor(t / 3); dx = ((q * 7 + i * 13) % 3) - 1; dy += ((q * 11 + i * 5) % 3) - 1; }
      ctx.fillStyle = pass === 0 ? shadow : g.col || color;
      glyphAt(ctx, g.ch, x + g.x + dx + (pass === 0 ? 1 : 0), y + dy + (pass === 0 ? 1 : 0));
    }
  }
}
export function stripCodes(s) { return s.replace(/\^(.)/g, (m, k) => (k === '^' ? '^' : '')); }

// Texto con contorno completo (8 vecinos): legible sobre cualquier fondo.
export function drawOutlined(ctx, s, x, y, color = '#ffffff', outline = '#1a1022') {
  const plain = stripCodes(s);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) drawRaw(ctx, plain, x + dx, y + dy, outline, null);
  return drawRaw(ctx, s, x, y, color, RICH_DARK);
}

// Texto grande: la fuente ampliada ×scale con contorno de 1 px (en píxeles ampliados) y sombra dura.
const bigCache = new Map();
export function bigText(s, color = '#ffffff', outline = '#1a1022', scale = 2, shadow = null) {
  const key = s + color + outline + scale + shadow; let c = bigCache.get(key); if (c) return c;
  const w = textWidth(s) + 4, h = 13;
  const a = document.createElement('canvas'); a.width = w; a.height = h; const x = a.getContext('2d');
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) drawRaw(x, s, 2 + dx, 3 + dy, outline, null);
  if (shadow) { drawRaw(x, s, 2, 4, shadow, null); drawRaw(x, s, 3, 4, outline, null); }
  drawRaw(x, s, 2, 3, color, null);
  c = document.createElement('canvas'); c.width = w * scale; c.height = (h + (shadow ? 1 : 0)) * scale; const y = c.getContext('2d'); y.imageSmoothingEnabled = false;
  y.drawImage(a, 0, 0, w * scale, h * scale);
  if (bigCache.size > 300) bigCache.delete(bigCache.keys().next().value);
  bigCache.set(key, c); return c;
}
export function drawBig(ctx, s, x, y, color, outline, scale = 2) { const c = bigText(s, color, outline, scale); ctx.drawImage(c, Math.round(x), Math.round(y)); return c.width; }
export function bigWidth(s, scale = 2) { return (textWidth(s) + 4) * scale; }
