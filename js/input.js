// Entrada unificada: teclado + controles táctiles. Botones lógicos: up down left right A B S.
const held = new Set();
const pressed = new Set();
let lastDir = null;

const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'A', Space: 'A', Enter: 'A', KeyX: 'B', Backspace: 'B', Escape: 'S', KeyC: 'S', Tab: 'S', ShiftLeft: 'S', ShiftRight: 'S',
};

function down(b) { if (!held.has(b)) pressed.add(b); held.add(b); if (['up', 'down', 'left', 'right'].includes(b)) lastDir = b; }
function up(b) { held.delete(b); }

export const input = {
  typing: null, // callback(key) cuando se escribe texto (nombre del personaje)
  init() {
    addEventListener('keydown', (e) => {
      if (this.typing && !e.metaKey && !e.ctrlKey) {
        if (((e.key.length === 1 && e.key !== ' ') || e.key === 'Backspace' || e.key === 'Enter') && this.typing(e.key)) { e.preventDefault(); return; }
      }
      const b = KEYS[e.code]; if (b) { down(b); e.preventDefault(); }
    });
    addEventListener('keyup', (e) => { const b = KEYS[e.code]; if (b) up(b); });
    addEventListener('blur', () => held.clear());
    const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    if (touch) document.body.classList.add('touch');
    const bind = (id, b) => {
      const el = document.getElementById(id);
      const on = (e) => { e.preventDefault(); el.classList.add('on'); down(b); };
      const off = (e) => { e.preventDefault(); el.classList.remove('on'); up(b); };
      el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false }); el.addEventListener('mousedown', on); el.addEventListener('mouseup', off);
    };
    bind('bA', 'A'); bind('bB', 'B'); bind('bS', 'S');
    const dp = document.getElementById('dpad');
    let cur = null;
    const dpMove = (e) => {
      e.preventDefault();
      const t = e.touches ? e.touches[0] : e; if (!t) return;
      const r = dp.getBoundingClientRect();
      const dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
      const b = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (Math.hypot(dx, dy) < r.width * 0.12) { if (cur) up(cur); cur = null; return; }
      if (b !== cur) { if (cur) up(cur); cur = b; down(b); }
    };
    const dpEnd = (e) => { e.preventDefault(); if (cur) up(cur); cur = null; };
    dp.addEventListener('touchstart', dpMove, { passive: false }); dp.addEventListener('touchmove', dpMove, { passive: false });
    dp.addEventListener('touchend', dpEnd, { passive: false }); dp.addEventListener('touchcancel', dpEnd, { passive: false });
    // En móvil, tocar la pantalla para escribir el nombre abre el teclado del sistema.
    this.touch = touch;
  },
  held: (b) => held.has(b),
  pressed: (b) => pressed.has(b),
  dir() {
    if (lastDir && held.has(lastDir)) return lastDir;
    for (const d of ['up', 'down', 'left', 'right']) if (held.has(d)) return d;
    return null;
  },
  endFrame() { pressed.clear(); },
  press(b) { down(b); setTimeout(() => up(b), 30); }, // para pruebas
};
