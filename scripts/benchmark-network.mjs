import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,mkdtemp} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Game} from '../server/game.js';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {RoomParty} from '@manaty/retro-museum-sdk/room-party';
import {StateEncoder,StateDecoder} from '@manaty/retro-museum-sdk/state-delta';
const baseline=await mkdtemp(join(tmpdir(),'serpents-benchmark-'));
await writeFile(join(baseline,'package.json'),'{"type":"module"}');
for(const file of ['game.js','base.js'])await writeFile(join(baseline,file),execFileSync('git',['show','69bc7bd:server/'+file]));
const {Game:OldGame}=await import(pathToFileURL(join(baseline,'game.js')).href);
const pack=JSON.parse(await readFile('dist/game.rmg.json'));
let now=0;const ids=Array.from({length:8},(_,i)=>String(i+1).padStart(32,'0'));
const create=Engine=>{const party=new RoomParty({definition:{pack,createEngine:(players,saved,options)=>new Engine(players,saved,{...options,seed:123})},clock:()=>now});ids.forEach((id,i)=>party.join(id,{name:'Player '+(i+1),avatar:'/play/avatars/'+String(i+1).repeat(64)+'.jpg'}));party.admin('start',{seconds:120,bots:4,arena:'garden'});return party;};
const old=create(OldGame),next=create(Game),codecs=[...ids,null].map(()=>({encoder:new StateEncoder,decoder:new StateDecoder})),rows=[];
now=3001;old.tick();next.tick();for(const id of ids)next.engine.action(id,'viewport',{width:870,height:1600});
const bytes=x=>Buffer.byteLength(typeof x==='string'?x:JSON.stringify(x));
let codecMs=0;
for(let tick=0;tick<200;tick++){
 now+=100;old.tick();next.tick();
 // Network-only optimization: same RNG, physical trajectories, scores and deaths.
 assert.deepEqual(next.engine.players.map(p=>[p.x,p.y,p.angle,p.mass,p.deaths,p.body.map(b=>b.slice(0,2))]),old.engine.players.map(p=>[p.x,p.y,p.angle,p.mass,p.deaths,p.body]));
 for(const [i,id] of [...ids,null].entries()){
  const state=party=>{const p=party.snapshot(id);return {party:p,phase:p.phase,remainingMs:p.remainingMs,durationMs:900000,introRemainingMs:p.introRemainingMs,language:'en',station:'1',room:'1',sessionId:p.id};};
  const before=state(old),after=state(next),{encoder,decoder}=codecs[i];
  if(tick===100){encoder.reset();decoder.reset();} // Include a reconnect/full snapshot per client.
  const start=performance.now(),message=encoder.encode(after,tick+1);codecMs+=performance.now()-start;
  assert.deepEqual(JSON.parse(JSON.stringify(decoder.accept(JSON.parse(message)))),JSON.parse(JSON.stringify(after)));
  encoder.acknowledge(tick+1);
  rows.push({role:id?'phone':'display',before:bytes({type:'state',sequence:tick+1,state:before}),filtered:bytes({type:'state',sequence:tick+1,state:after}),delta:bytes(message),type:JSON.parse(message).type});
 }
}
const summaries=Object.fromEntries(['phone','display'].map(role=>{const a=rows.filter(r=>r.role===role),mean=k=>Math.round(a.reduce((s,r)=>s+r[k],0)/a.length);return[role,{beforeBytes:mean('before'),filteredBytes:mean('filtered'),wireBytes:mean('delta'),reduction:Math.round(mean('before')/mean('delta')*100)/100,fullFrames:a.filter(r=>r.type==='state').length,frames:a.length}];}));
const result={scope:'Deterministic 20-second simulation, 8 humans + 4 bots, 870×1600 phone viewports, full reconnect halfway. Raw JSON payload only, excludes TCP/TLS/WebSocket headers. Every reconstructed frame equals its full authoritative state; physical game state remains identical to v1.0.2.',summaries,meanEncodeMs:codecMs/rows.length};
await writeFile('docs/network-bandwidth.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
assert.ok(summaries.phone.reduction>=5,'at least 5x smaller phone traffic');old.engine=null;next.engine=null;old.dispose();next.dispose();
