// Lleva combates completos hasta el final con pulsaciones al azar y busca excepciones.
// Uso: node tools/battle-test.mjs [vueltas]
import { launch } from './cdp.mjs';
const p = await launch('http://localhost:8494/index.html?quick=humano,m&at=bosque,23,20&hour=11');
await p.sleep(1500);
const ev = (s) => p.eval(s).catch((e) => 'ERR ' + e.message.slice(0, 300));
const keys = ['A', 'A', 'A', 'A', 'down', 'right', 'left', 'up', 'B', 'start'];
const foes = [
  "__barca.monster('bandido')", "__barca.monster('quarantamaula')", "__barca.monster('simiot')", "__barca.monster('follet')",
  "__barca.animalEnemy({sp:'jabali',a:{id:9001,sp:'jabali',sex:'m',age:99},hp:30})", "__barca.animalEnemy({sp:'lobo',a:{id:9002,sp:'lobo',sex:'f',age:99},hp:28})",
  "__barca.animalEnemy({sp:'conejo',a:{id:9003,sp:'conejo',sex:'f',age:99},hp:6})", "__barca.animalEnemy({sp:'vibora',a:{id:9004,sp:'vibora',sex:'f',age:99},hp:6})",
  "__barca.animalEnemy({sp:'oso',a:{id:9005,sp:'oso',sex:'m',age:99},hp:60})", "Object.assign(__barca.monster('drac'),{hp:30})",
];
const rounds = +(process.argv[2] || 1); const results = [];
for (let r = 0; r < rounds; r++) for (const f of foes) {
  await ev(`(()=>{const S=__barca.S;S.player.hp=S.player.hpMax;S.player.mp=S.player.mpMax;S.money=50;S.inv.pocion=2;S.inv.sueno=1;S.inv.agua_bendita=1;S.inv.cinta=1;S.inv.carne=1;S.inv.bellota=2;S.player.spells=['chispa','escarcha','sanar','calmar','bendicion'];window.__res=null;__barca.fight(${f}).then(x=>window.__res=x)})()`);
  const t0 = Date.now(); let res = null;
  while (Date.now() - t0 < 150000) {
    await p.key(keys[Math.floor(Math.random() * keys.length)], 30); await p.sleep(45);
    res = await ev('window.__res'); if (res) break;
  }
  // limpiar diálogos pendientes (hospital, etc.)
  for (let i = 0; i < 60 && (await ev('__barca.ui.busy')); i++) { await p.key('A', 30); await p.sleep(50); }
  results.push(`${f.slice(9, 40)} → ${res} (${((Date.now() - t0) / 1000).toFixed(1)} s, mode ${await ev('__barca.G.mode')})`);
  console.log(results[results.length - 1]);
}
const errs = p.logs.filter((l) => /EXC|error/i.test(l));
console.log('ERRORES', errs.length); console.log([...new Set(errs)].slice(0, 15).join('\n'));
await p.canvas('/tmp/battle-test.png');
p.close();
