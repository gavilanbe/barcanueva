// Galería de iconos (sólo desarrollo): cada icono ampliado con su id debajo y una tira a tamaño real.
import { itemIcon, uiIcon, spellIcon, emote, EMOTES, UI_ICONS, hasItemIcon } from '../../js/icons.js';
import { ITEMS, SPELLS } from '../../js/data/items.js';

export function render({ what = 'items', bgs = [['#f2e4c2', '#3a2a30']], cols = 12 } = {}) {
  let list = [];
  if (what === 'items') list = Object.keys(ITEMS).map((id) => [id, itemIcon(id), !hasItemIcon(id)]);
  if (what === 'ui') list = [...UI_ICONS.map((n) => [n, uiIcon(n)]), ...Object.keys(SPELLS).map((id) => ['✦' + id, spellIcon(id)]), ...EMOTES.flatMap((e) => [[e + ' 0', emote(e, 0)], [e + ' 1', emote(e, 1)]])];
  const cw = 56, ch = 62; const rows = Math.ceil(list.length / cols);
  const stripW = cols * cw; let sx = 0, srows = 1; for (const [, cv] of list) { if (sx + cv.width + 3 > stripW) { sx = 0; srows++; } sx += cv.width + 3; }
  const panelH = rows * ch + 10 + srows * 19 + 6;
  const c = document.getElementById('g'); c.width = stripW + 8; c.height = panelH * bgs.length; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  bgs.forEach(([bg, ink], b) => {
    const oy = b * panelH; x.fillStyle = bg; x.fillRect(0, oy, c.width, panelH); x.font = '9px monospace';
    list.forEach(([id, cv, miss], i) => {
      const s = Math.max(1, Math.floor(48 / cv.width)); const cx = 4 + (i % cols) * cw, cy = oy + 4 + Math.floor(i / cols) * ch;
      x.drawImage(cv, cx + Math.round((cw - cv.width * s) / 2), cy + Math.round((48 - cv.height * s) / 2), cv.width * s, cv.height * s);
      x.fillStyle = miss ? '#e0206a' : ink; x.fillText(id.slice(0, 10), cx + 1, cy + 58);
    });
    let px = 4, py = oy + rows * ch + 10; for (const [, cv] of list) { if (px + cv.width + 3 > stripW) { px = 4; py += 19; } x.drawImage(cv, px, py); px += cv.width + 3; }
  });
}

// Zoom de una selección: ids de objetos, 'u:nombre' de interfaz, 's:id' de conjuro, 'e:nombre' de emoción
export function zoom(ids, s = 6, cols = 8, bg = '#f2e4c2') {
  const pick = (id) => (id.startsWith('u:') ? uiIcon(id.slice(2)) : id.startsWith('s:') ? spellIcon(id.slice(2)) : id.startsWith('e:') ? emote(id.slice(2), 0) : itemIcon(id));
  const cw = 16 * s + 12, ch = 16 * s + 22; const c = document.getElementById('g'); c.width = cols * cw + 8; c.height = Math.ceil(ids.length / cols) * ch + 8;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.font = '11px monospace';
  ids.forEach((id, i) => { const cv = pick(id); const cx = 4 + (i % cols) * cw, cy = 4 + Math.floor(i / cols) * ch; x.drawImage(cv, cx, cy, cv.width * s, cv.height * s); x.fillStyle = '#3a2a30'; x.fillText(id, cx, cy + 16 * s + 14); });
}
