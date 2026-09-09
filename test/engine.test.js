import test from'node:test';import assert from'node:assert/strict';import{Game,W,H,delta}from'../server/game.js';import{GameRuntime}from'@manaty/retro-museum-sdk/runtime';import{readFile}from'node:fs/promises';const players=n=>Array.from({length:n},(_,i)=>({id:'p'+i,number:i+1})),make=(n=2,o={})=>new Game(players(n),null,{seed:3,bots:0,...o}),advance=(g,s)=>{for(let t=0;t<s;t+=.05)g.advance(.05);};
test('square torus, 1–8 humans plus configurable bots; authority and invalid inputs',()=>{const g=make(8,{bots:4});assert.equal(g.players.length,12);assert.equal(W,H);assert.ok(g.snapshot().world.torus);assert.throws(()=>g.action('bot-0','steer',{x:1,y:0}),/spectator/);assert.throws(()=>g.action('p0','steer',{x:NaN,y:0}));});
test('both seams wrap without death or discontinuous body segments',()=>{for(const axis of ['x','y']){const g=make(1),p=g.players[0];p[axis]=W-2;p.angle=p.desired=axis==='x'?0:Math.PI/2;p.body=[[p.x,p.y],[p.x-10,p.y]];g.advance(.05);assert.ok(p[axis]<10);assert.ok(p.alive);assert.ok(Math.abs(delta(p.body[0][0],p.body[1][0],W))<20);}});
test('smooth turn is limited; boost costs mass and stops after release/expiry',()=>{const g=make(1),p=g.players[0],a=p.angle;g.action(p.id,'steer',{x:0,y:1});g.advance(.05);assert.ok(Math.abs(p.angle-a)<=3.5*.05+.001);p.mass=30;g.action(p.id,'steer',{x:0,y:1,boost:true});advance(g,.25);assert.ok(p.mass<30);g.release(p.id);g.advance(.05);assert.equal(p.sprinting,false);});
test('food across seam is collected and boost trail sheds reusable seeds',()=>{const g=make(1),p=g.players[0];Object.assign(p,{x:W-5,y:300,angle:0,desired:0,mass:30});g.food=[{x:3,y:300,value:5,color:1}];g.advance(.05);assert.equal(p.mass,35);assert.equal(p.score,35);assert.equal(g.food.some(f=>f.x===3&&f.y===300),false);});
test('body collisions and head-on collisions work across the toroidal boundary',()=>{const g=make(),[a,b]=g.players;Object.assign(a,{x:W-4,y:500,angle:0,desired:0,immuneUntil:0,body:[[W-4,500],[W-14,500]]});Object.assign(b,{x:100,y:510,angle:0,desired:0,immuneUntil:0,body:[[100,510],[3,500],[3,510]]});g.advance(.05);assert.equal(a.alive,false);const h=make(),[c,d]=h.players;Object.assign(c,{x:W-5,y:500,angle:0,desired:0,immuneUntil:0});Object.assign(d,{x:5,y:500,angle:Math.PI,desired:Math.PI,immuneUntil:0});h.advance(.05);assert.ok(h.players.every(p=>!p.alive));});
test('neck contact is safe, collision spills food, respawn resets length and protects briefly',()=>{const g=make(1),p=g.players[0];p.immuneUntil=0;p.body=[0,9,18].map(d=>[p.x-Math.cos(p.angle)*d,p.y-Math.sin(p.angle)*d]);g.advance(.05);assert.ok(p.alive);g.crash(p);assert.equal(p.alive,false);advance(g,3.1);assert.ok(p.alive);assert.ok(p.mass>=18);g.spawn(p,0);assert.equal(p.mass,18);assert.ok(p.immuneUntil>g.time);});
test('largest human wins, bots do not occupy podium, ties and restoration work',()=>{const g=make(2,{bots:2});g.players[0].mass=40;g.players[0].score=40;g.players[2].score=80;g.finish();assert.equal(g.winner,'p0');const tie=make();tie.finish();assert.equal(tie.winner,'draw');assert.deepEqual(new Game([],g.save()).snapshot(),g.snapshot());});
test('complete solo and eight-player matches stay bounded and end naturally',()=>{for(const n of [1,8]){const g=make(n,{bots:4,seconds:60});advance(g,61);assert.ok(g.ended);assert.ok(g.players.every(p=>p.x>=0&&p.x<W&&p.y>=0&&p.y<H&&p.body.length<=100));assert.ok(g.food.length<=700);assert.ok(g.winners.every(id=>!id.startsWith('bot-')));}});
test('QuickJS twelve-serpent spatial collision index fits sandbox budgets',async()=>{const pack=JSON.parse(await readFile('dist/game.rmg.json')),g=new GameRuntime(pack,players(8),null,{bots:4});try{for(let i=0;i<160;i++){g.advance(.25);if(i%10===0)assert.ok(JSON.stringify(g.snapshot()).length<150000);}assert.equal(g.snapshot().players.length,12);assert.deepEqual(g.metadata.requiredPlayers,[]);}finally{g.dispose();}});

test('own-body hits kill once, including both wrapped seams and boost',()=>{
 for(const axis of ['x','y'])for(const seam of [false,true])for(const boost of [false,true]){
  const g=make(1),p=g.players[0],start=seam?W-5:1000,other=1000;
  const point=n=>axis==='x'?[((n%W)+W)%W,other]:[other,((n%H)+H)%H];
  const head=point(start);Object.assign(p,{x:head[0],y:head[1],angle:axis==='x'?0:Math.PI/2,desired:axis==='x'?0:Math.PI/2,immuneUntil:0,mass:30,boost,inputUntil:10,body:[0,-9,-18,-27,-36,-45,-54,10].map(n=>point(start+n))});
  g.advance(.05);assert.equal(p.alive,false,JSON.stringify({axis,seam,boost}));assert.equal(p.deaths,1);assert.equal(p.respawn,3);assert.equal(p.boost,false);assert.equal(p.sprinting,false);
  assert.equal(g.events.filter(e=>e.type==='crash'&&e.player===p.id).length,1);
 }
});

test('normal straight movement and turns do not collide with the attached neck',()=>{
 for(const boost of [false,true]){
  const g=make(1),p=g.players[0];p.immuneUntil=0;p.mass=30;
  for(let i=0;i<90;i++){const target=i<30?p.angle:p.angle+.12;g.action(p.id,'steer',{x:Math.cos(target),y:Math.sin(target),boost});g.advance(.05);assert.ok(p.alive,'ordinary turns remain safe');}
 }
});
