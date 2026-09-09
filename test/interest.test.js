import test from 'node:test';
import assert from 'node:assert/strict';
import {InterestIndex} from '../server/interest.js';
import {Game,W,H,delta} from '../server/game.js';
const world={w:W,h:H},viewport={width:870,height:1650};
test('spatial interest covers the entire viewport plus margin across both seams',()=>{
 const index=new InterestIndex,food=[];let id=0;
 for(let x=0;x<W;x+=59)for(let y=0;y<H;y+=59)food.push({id:++id,x,y});
 index.sync([],food,world,1);
 for(const x of [0,20,1800,3599])for(const y of [0,20,1800,3599]){
  const own={id:'p',x,y,deaths:0},view=index.view(own,viewport,world),sent=new Set(view.food.map(f=>f.id));
  for(const f of food){const dx=delta(f.x,x,W),dy=delta(f.y,y,H);if(Math.abs(dx)<viewport.width/2+200&&dy>-.42*viewport.height-200&&dy<.58*viewport.height+200)assert.ok(sent.has(f.id),'missing visible food');}
  assert.ok(sent.size<food.length*.4,'distant food is culled');
 }
});
test('body entering view is included even when its head is distant; deletions update index',()=>{
 const index=new InterestIndex,own={id:'p',x:100,y:100,deaths:0},other={id:'q',x:1800,y:1800,alive:true,deaths:0,body:[[1800,1800,2],[100,100,1],[3590,100,0]]};
 index.sync([other],[{id:1,x:120,y:120}],world,1);let view=index.view(own,viewport,world);
 assert.deepEqual(view.bodies.get('q'),other.body.slice(1));assert.equal(view.food.length,1);
 other.body=[];index.sync([other],[],world,2);view=index.view(own,viewport,world);assert.equal(view.food.length,0);assert.equal(view.bodies.size,0);
});
test('hysteresis retains boundary cells briefly, then drops them after movement or respawn',()=>{
 const index=new InterestIndex,own={id:'p',x:1000,y:1000,deaths:0},v={width:320,height:320};
 index.sync([],[{id:1,x:640,y:1000}],world,1);assert.equal(index.view(own,v,world).food.length,1);
 own.x=1140;assert.equal(index.view(own,v,world).food.length,1);
 own.deaths++;assert.equal(index.view(own,v,world).food.length,0);
 own.x=1000;index.view(own,v,world);own.x=1400;assert.equal(index.view(own,v,world).food.length,0);
});
test('stable trajectory and food IDs survive motion and save/restore, including legacy saves',()=>{
 const g=new Game([{id:'p'}],null,{seed:123,bots:0}),p=g.players[0],first=p.body[0].slice(),food=g.food.map(f=>({...f}));
 g.advance(.1);assert.deepEqual(p.body.find(b=>b[2]===first[2]),first);assert.ok(p.pathSequence>first[2]);
 for(const f of food){const next=g.food.find(n=>n.id===f.id);if(next)assert.deepEqual(next,f);}
 const restored=new Game([],g.save());assert.deepEqual(restored.snapshot('p'),g.snapshot('p'));
 const old=g.save();delete old.nextFoodId;old.food.forEach(f=>delete f.id);old.players.forEach(p=>{delete p.pathSequence;p.body=p.body.map(b=>b.slice(0,2));});
 const migrated=new Game([],old);migrated.advance(.1);assert.equal(new Set(migrated.food.map(f=>f.id)).size,migrated.food.length);assert.ok(migrated.players.every(p=>p.body.every(b=>Number.isSafeInteger(b[2]))));
});
test('viewport is bounded and private; display keeps all heads and only leader trajectory',()=>{
 const g=new Game([{id:'p'},{id:'q'}],null,{seed:123,bots:4});g.action('p','viewport',{width:870,height:900});g.action('q','viewport',{width:870,height:2000});
 assert.throws(()=>g.action('absent','viewport',viewport),/spectator/);assert.throws(()=>g.action('p','viewport',{width:NaN,height:3}));
 g.action('p','viewport',{width:1e9,height:1});assert.deepEqual(g.viewports.p,{width:1800,height:320});
 const display=g.snapshot();assert.ok(display.players.every(p=>Number.isFinite(p.x)));assert.equal(display.players.filter(p=>p.body.length).length,1);assert.equal(display.food.length,0);
 assert.equal(g.snapshot('p').viewports,undefined);assert.ok(g.snapshot('q').food.length<g.food.length);
});

test('wire positions use quarter units without changing authoritative movement or collisions',()=>{
 const g=new Game([{id:'p'}],null,{seed:123,bots:0});g.advance(.1);const original=JSON.stringify(g.save()),s=g.snapshot('p'),own=g.players[0],wire=s.players[0];
 assert.ok(Math.abs(wire.x-own.x)<=.125);assert.ok(Math.abs(wire.y-own.y)<=.125);assert.ok(Math.abs(wire.angle-own.angle)<=.00005);
 for(const b of wire.body){assert.ok(Number.isInteger(b[0]*4)&&Number.isInteger(b[1]*4));const real=own.body.find(r=>r[2]===b[2]);assert.ok(Math.abs(real[0]-b[0])<=.125&&Math.abs(real[1]-b[1])<=.125);}
 assert.ok(s.food.every(f=>Number.isInteger(f.x*4)&&Number.isInteger(f.y*4)));assert.equal(JSON.stringify(g.save()),original);
});
