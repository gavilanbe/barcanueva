// Interfaz modal por promesas: await ui.say(), ui.choose(), ui.roll()... El mundo se congela mientras ui.busy.
import { drawText, wrap, textWidth } from './font.js';
import { input } from './input.js';
import { portrait } from './chars.js';
import { sfx } from './audio.js';

export const W = 240, H = 160;
const INK = '#3a2a30', INK_S = '#d8c8a0', PAPER = '#f8f0d8', EDGE = '#3a2a22', EDGE2 = '#c8a870';

export function panel(ctx, x, y, w, h, fill = PAPER) {
  ctx.fillStyle = EDGE; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = fill; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = EDGE2; ctx.fillRect(x + 3, y + 3, w - 6, 1); ctx.fillRect(x + 3, y + h - 4, w - 6, 1); ctx.fillRect(x + 3, y + 3, 1, h - 6); ctx.fillRect(x + w - 4, y + 3, 1, h - 6);
}
export const text = (ctx, s, x, y, c = INK, sh = INK_S) => drawText(ctx, s, x, y, c, sh);

class Say {
  constructor(msg, opt) {
    this.speaker = opt.speaker; this.ap = opt.ap; this.lines = wrap(msg, this.ap ? 186 : 222); this.page = 0; this.chars = 0; this.done = false;
    this.auto = opt.auto;
  }
  update() {
    const pageLines = this.lines.slice(this.page * 3, this.page * 3 + 3).join('');
    if (this.chars < pageLines.length) { this.chars += input.held('A') || input.held('B') ? 4 : 1.5; if (input.pressed('A')) this.chars = 999; return; }
    if (input.pressed('A') || input.pressed('B') || (this.auto && (this.t = (this.t || 0) + 1) > this.auto)) {
      if ((this.page + 1) * 3 < this.lines.length) { this.page++; this.chars = 0; sfx('blip'); } else { this.done = true; sfx('blip'); }
    }
  }
  draw(ctx, fr) {
    const y = 110; panel(ctx, 2, y, 236, 48);
    let tx = 10;
    if (this.ap) { ctx.fillStyle = '#e8dcc0'; ctx.fillRect(7, y + 7, 34, 34); ctx.drawImage(portrait(this.ap), 7, y + 7); tx = 46; }
    if (this.speaker) { const w = textWidth(this.speaker) + 12; panel(ctx, 6, y - 13, w, 16, '#3a2a22'); drawText(ctx, this.speaker, 12, y - 8, '#f8e0a0', '#1c1424'); }
    let left = Math.floor(this.chars);
    const lines = this.lines.slice(this.page * 3, this.page * 3 + 3);
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; text(ctx, s, tx, y + 8 + i * 12); });
    if (left >= 0 && fr % 30 < 20) drawText(ctx, '▼', 226, y + 38, '#b8322c');
  }
}

class Choose {
  constructor(opts, o) {
    this.opts = opts; this.i = 0; this.title = o.title; this.cancel = o.cancel ?? -1; this.top = 0; this.cols = o.cols || 1; this.prompt = o.prompt;
    this.w = Math.min(228, Math.max(70, ...opts.map((s) => textWidth(typeof s === 'string' ? s : s.label) + 22), this.title ? textWidth(this.title) + 16 : 0));
    this.max = Math.min(opts.length, o.max || 7);
    this.x = o.x ?? W - this.w - 4; this.y = o.y ?? Math.max(4, 108 - this.max * 12 - 10 - (this.title ? 12 : 0));
  }
  label(k) { const o = this.opts[k]; return typeof o === 'string' ? o : o.label; }
  dis(k) { const o = this.opts[k]; return typeof o === 'object' && o.disabled; }
  update() {
    const n = this.opts.length;
    if (this.cols > 1) {
      const c = this.cols;
      if (input.pressed('up') && this.i - c >= 0) { this.i -= c; sfx('move'); }
      if (input.pressed('down') && this.i + c < n) { this.i += c; sfx('move'); }
      if (input.pressed('left') && this.i % c > 0) { this.i--; sfx('move'); }
      if (input.pressed('right') && this.i % c < c - 1 && this.i + 1 < n) { this.i++; sfx('move'); }
    } else {
    if (input.pressed('up')) { this.i = (this.i + n - 1) % n; sfx('move'); }
    if (input.pressed('down')) { this.i = (this.i + 1) % n; sfx('move'); }
    }
    if (this.i < this.top) this.top = this.i; if (this.i >= this.top + this.max) this.top = this.i - this.max + 1;
    if (input.pressed('A')) { if (this.dis(this.i)) { sfx('no'); return; } this.done = true; this.result = this.i; sfx('ok'); }
    if (input.pressed('B') && this.cancel !== null) { this.done = true; this.result = this.cancel; sfx('back'); }
  }
  draw(ctx) {
    if (this.cols > 1) {
      panel(ctx, 2, 110, 236, 48);
      if (this.prompt) wrap(this.prompt, 96).slice(0, 3).forEach((l, i) => text(ctx, l, 10, 118 + i * 12));
      panel(ctx, 110, 110, 128, 48);
      this.opts.forEach((o, k) => { const x = 124 + (k % this.cols) * 56, y = 118 + Math.floor(k / this.cols) * 12; text(ctx, this.label(k), x, y, this.dis(k) ? '#a89880' : INK); if (k === this.i) drawText(ctx, '▶', x - 8, y, '#b8322c'); });
      return;
    }
    const hh = this.max * 12 + 10 + (this.title ? 12 : 0);
    panel(ctx, this.x, this.y, this.w, hh);
    let y = this.y + 6;
    if (this.title) { text(ctx, this.title, this.x + 8, y, '#8a3a2a'); y += 12; }
    for (let k = this.top; k < this.top + this.max; k++) {
      const s = this.label(k);
      text(ctx, s, this.x + 14, y, this.dis(k) ? '#a89880' : INK, this.dis(k) ? null : INK_S);
      if (k === this.i) drawText(ctx, '▶', this.x + 6, y, '#b8322c');
      y += 12;
    }
    if (this.top > 0) drawText(ctx, '▲', this.x + this.w - 10, this.y + 4, '#8a3a2a');
    if (this.top + this.max < this.opts.length) drawText(ctx, '▼', this.x + this.w - 10, this.y + hh - 10, '#8a3a2a');
    const o = this.opts[this.i];
    if (typeof o === 'object' && o.hint) { const ls = wrap(o.hint, 220); panel(ctx, 2, 124, 236, 34); ls.slice(0, 2).forEach((l, i) => text(ctx, l, 9, 131 + i * 12)); }
  }
}

// Tirada de d20 con animación. Resuelve {roll, total, ok, crit, fumble}
class Roll {
  constructor(label, mod, dc, opt) { this.label = label; this.mod = mod; this.dc = dc; this.t = 0; this.face = 1; this.adv = opt.adv || 0; this.final = null; }
  update() {
    this.t++;
    if (!this.final) {
      if (this.t % 3 === 0) { this.face = 1 + Math.floor(Math.random() * 20); sfx('tick'); }
      if (this.t > 36 || (this.t > 10 && input.pressed('A'))) {
        let r = 1 + Math.floor(Math.random() * 20);
        if (this.adv) { const r2 = 1 + Math.floor(Math.random() * 20); r = this.adv > 0 ? Math.max(r, r2) : Math.min(r, r2); }
        this.face = r; const total = r + this.mod;
        this.final = { roll: r, total, crit: r === 20, fumble: r === 1, ok: r === 20 || (r !== 1 && total >= this.dc) };
        this.t2 = 0; sfx(this.final.ok ? 'good' : 'bad');
      }
    } else if (++this.t2 > 20 && (input.pressed('A') || input.pressed('B') || this.t2 > 110)) { this.done = true; this.result = this.final; }
  }
  draw(ctx, fr) {
    panel(ctx, 50, 30, 140, 76);
    text(ctx, this.label, 120 - textWidth(this.label) / 2, 36, '#8a3a2a');
    // Dado (icosaedro de frente)
    const cx = 92, cy = 72; const col = this.final ? (this.final.crit ? '#e8c050' : this.final.fumble ? '#8a2a2a' : this.final.ok ? '#4a8a4a' : '#8a4a3a') : '#5a4a7a';
    ctx.fillStyle = '#1c1424'; for (let r = -15; r <= 15; r++) { const w = Math.round(15 - Math.abs(r) * 0.45); ctx.fillRect(cx - w - 1, cy + r, w * 2 + 2, 1); }
    ctx.fillStyle = col; for (let r = -14; r <= 14; r++) { const w = Math.round(14 - Math.abs(r) * 0.45); ctx.fillRect(cx - w, cy + r, w * 2, 1); }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; for (let r = -14; r <= -2; r++) { const w = Math.round(14 - Math.abs(r) * 0.45); ctx.fillRect(cx - w, cy + r, w, 1); }
    const f = String(this.face); drawText(ctx, f, cx - textWidth(f) / 2, cy - 3, '#ffffff', '#1c1424');
    const ms = (this.mod >= 0 ? '+' : '') + this.mod;
    text(ctx, 'd20 ' + ms, 118, 56); text(ctx, 'CD ' + this.dc, 118, 68);
    if (this.adv) text(ctx, this.adv > 0 ? 'Ventaja' : 'Desventaja', 118, 44, this.adv > 0 ? '#3a7a3a' : '#8a2a2a');
    if (this.final) {
      text(ctx, '= ' + this.final.total, 118, 80, this.final.ok ? '#2a6a2a' : '#8a2a2a');
      const r = this.final.crit ? '¡CRÍTICO!' : this.final.fumble ? '¡PIFIA!' : this.final.ok ? 'Éxito' : 'Fallo';
      text(ctx, r, 118, 92, this.final.ok ? '#2a6a2a' : '#8a2a2a');
    }
  }
}

class Custom { constructor(o) { Object.assign(this, o); } }

export const ui = {
  stack: [], toasts: [],
  get busy() { return this.stack.length > 0; },
  push(w) { return new Promise((res) => { w.resolve = res; this.stack.push(w); }); },
  say(msg, opt = {}) { return this.push(new Say(msg, opt)); },
  async sayAll(msgs, opt = {}) { for (const m of msgs) await this.say(m, opt); },
  choose(opts, o = {}) { return this.push(new Choose(opts, o)); },
  async ask(msg, opts, o = {}) { const s = new Say(msg, o); s.keep = true; this.stack.push(s); const r = await this.choose(opts, o); this.stack.splice(this.stack.indexOf(s), 1); return r; },
  roll(label, mod, dc, opt = {}) { return this.push(new Roll(label, mod, dc, opt)); },
  custom(o) { return this.push(new Custom(o)); },
  toast(msg, color = '#f8f0d8') { this.toasts.push({ msg, color, t: 150 }); if (this.toasts.length > 4) this.toasts.shift(); },
  update() {
    const w = this.stack[this.stack.length - 1];
    if (w) { w.update(); if (w.done) { this.stack.splice(this.stack.indexOf(w), 1); w.resolve(w.result); } }
    for (const t of this.toasts) t.t--; this.toasts = this.toasts.filter((t) => t.t > 0);
  },
  draw(ctx, fr) {
    for (const w of this.stack) w.draw(ctx, fr);
    let y = 30;
    for (const t of this.toasts) {
      const w = textWidth(t.msg) + 10; ctx.globalAlpha = Math.min(1, t.t / 20);
      ctx.fillStyle = 'rgba(28,20,36,.82)'; ctx.fillRect(W - w - 3, y, w, 12); drawText(ctx, t.msg, W - w + 2, y + 3, t.color, '#000'); ctx.globalAlpha = 1; y += 14;
    }
  },
};
