// Captura una página de galería (tools/gallery/<nombre>.html) a PNG a resolución nativa del lienzo #g.
// Uso: CDP_PORT=9350 node tools/gal.mjs animals /ruta/salida.png [espera_ms]
import { launch } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const [,, name, out, wait = 900] = process.argv;
const p = await launch(`http://localhost:8494/tools/gallery/${name}.html`);
await p.sleep(+wait);
const data = await p.eval(`(async()=>{ if (window.ready) await window.ready; const c=document.getElementById('g'); return c ? c.toDataURL() : null })()`);
if (data) writeFileSync(out, Buffer.from(data.split(',')[1], 'base64')); else console.log('sin lienzo #g');
const errs = p.logs.filter((l) => /EXC|error/i.test(l)); if (errs.length) console.log(errs.join('\n'));
p.close();
