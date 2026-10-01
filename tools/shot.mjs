// Uso: node tools/shot.mjs "<query>" out.png [pasos...]  pasos: k:A, k:up*3, w:500, e:<js>
import { launch } from './cdp.mjs';
const [,, q, out, ...steps] = process.argv;
const p = await launch(`http://localhost:8494/index.html?${q}`);
await p.sleep(1200);
for (const s of steps) {
  const [t, v] = [s.slice(0, s.indexOf(':')), s.slice(s.indexOf(':') + 1)];
  if (t === 'k') { const [k, n = 1] = v.split('*'); for (let i = 0; i < +n; i++) { await p.key(k, 90); await p.sleep(160); } }
  if (t === 'w') await p.sleep(+v);
  if (t === 'e') console.log('eval', JSON.stringify(await p.eval(v)));
  if (t === 's') await p.canvas(v);
}
await p.canvas(out);
console.log('logs', p.logs.slice(0, 20).join('\n'));
p.close();
