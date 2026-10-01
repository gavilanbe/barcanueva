import { launch } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const p = await launch('http://localhost:8494/index.html?quick=humano,m');
await p.sleep(1000);
for (const id of process.argv.slice(2)) { const d = await p.eval(`__barca.dumpMap('${id}')`); writeFileSync(`/tmp/map_${id}.png`, Buffer.from(d.split(',')[1], 'base64')); }
console.log(p.logs.join('\n')); p.close();
