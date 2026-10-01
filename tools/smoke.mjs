import { launch } from './cdp.mjs';
const p = await launch('http://localhost:8494/index.html?quick=elfo,f');
await p.sleep(1200);
const ev = (s) => p.eval(s).catch((e) => 'ERR ' + e.message.slice(0, 200));
const mash = async (n = 20) => { for (let i = 0; i < n; i++) { if (!(await p.eval('__barca.ui.busy'))) break; await p.key(Math.random() < 0.7 ? 'A' : 'down', 40); await p.sleep(60); } };
// 1) Recorrer todos los mapas e interiores
const maps = await ev(`Object.keys(__barca.MAPS)`);
for (const id of maps) { await ev(`(()=>{const m=__barca.MAPS['${id}'];let x=1,y=1;for(let j=1;j<m.h-1;j++)for(let i=1;i<m.w-1;i++){if(!m.solidAt(i,j)){x=i;y=j;j=999;break}}__barca.enterMap('${id}',x,y)})()`); await p.sleep(60); await mash(3); }
console.log('mapas', maps.length);
// 2) Pasar tiempo: 60 días con cambios de franja en la ciudad
await ev(`__barca.enterMap('ciudad',20,3)`);
for (let d = 0; d < 60; d++) { await ev(`__barca.advance(1440/5)`); await mash(4); await ev(`__barca.advance(1440/5*4)`); await mash(4); }
console.log('día', await ev('__barca.S.day'), 'eco', await ev('JSON.stringify(Object.fromEntries(["lobo","jabali","conejo","sardina_b","trucha_b","abeja"].map(k=>[k,Object.values(__barca.S.eco.maps).flat().filter(a=>a.sp===k).length])))'));
// 3) Hablar con todos los NPCs visibles en varios mapas y franjas
for (const [map, h] of [['ciudad', 9], ['ciudad', 16], ['ciudad', 20], ['pradera', 10], ['bosque', 10], ['costa', 11], ['rio', 19], ['montana', 21]]) {
  await ev(`__barca.S.min=${h * 60};__barca.enterMap('${map}',20,20)`); await p.sleep(100);
  const ids = (await ev(`__barca.G.ents.filter(e=>e.kind==='npc').map(e=>e.npc.id)`)) || [];
  for (const id of ids.slice(0, 8)) { await ev(`__barca.talkTo('${id}')`); await mash(25); }
  console.log(map, h, ids.length, 'npcs');
}
// 4) Combates contra monstruos
for (const m of ['bandido', 'quarantamaula', 'follet']) { await ev(`__barca.S.player.hp=__barca.S.player.hpMax;void __barca.fight(__barca.monster('${m}'))`); await mash(80); }
console.log('hp', await ev('__barca.S.player.hp'), 'lvl', await ev('__barca.S.player.level'), 'xp', await ev('__barca.S.player.xp'));
// 5) Menú
await p.key('start'); await mash(40);
console.log('mode', await ev('__barca.G.mode'), 'busy', await ev('__barca.ui.busy'));
const errs = p.logs.filter((l) => /EXC|error/i.test(l));
console.log('ERRORES', errs.length); console.log([...new Set(errs)].slice(0, 15).join('\n'));
await p.canvas('/tmp/smoke.png');
p.close();
