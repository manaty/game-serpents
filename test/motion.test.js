import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionBuffer} from '../src/motion.js';
const state=(time,x,extra={})=>({time,world:{w:3600,h:3600},players:[{id:'p1',x,y:500,angle:0,alive:true,deaths:0,body:[[x,500],[x-9,500]],...extra}]});

test('ten network updates per second produce continuous sixty-frame motion without mutating snapshots',()=>{
 const buffer=new MotionBuffer;let last=0,movingFrames=0,networkUpdates=0;
 for(let frame=0;frame<180;frame++){
  const now=frame*1000/60;
  if(frame%6===0){const s=state(frame/60,frame/60*185),original=JSON.stringify(s);buffer.push(s,now);buffer.sample(now+1);assert.equal(JSON.stringify(s),original);networkUpdates++;}
  const x=buffer.sample(now).players[0].x;
  assert.ok(x>=last-1e-8);
  if(frame>30){assert.ok(x-last<5,'no packet-sized jump');if(x>last+.1)movingFrames++;}
  last=x;
 }
 assert.equal(networkUpdates,30);assert.ok(movingFrames>140);
});

test('head, body and angle interpolate across wrapped seams along the short path',()=>{
 const buffer=new MotionBuffer;buffer.push(state(0,3590,{angle:Math.PI-.1}),0);buffer.push(state(.1,10,{angle:-Math.PI+.1}),100);
 const p=buffer.sample(150).players[0];assert.ok(p.x>3590||p.x<10);assert.ok(Math.abs(p.angle)>3);assert.ok(p.body[0][0]>3590||p.body[0][0]<10);
});

test('late packets have bounded prediction; pause and respawn reset the visual position',()=>{
 const buffer=new MotionBuffer;buffer.push(state(0,100),0);buffer.push(state(.1,118.5),100);
 assert.equal(buffer.sample(2000).players[0].x,137);
 assert.equal(buffer.sample(4000).players[0].x,137);
 buffer.push(state(.1,118.5),4100,true);assert.equal(buffer.sample(8000).players[0].x,118.5);
 buffer.push(state(.2,1500,{deaths:1}),8200,false);assert.equal(buffer.sample(8250).players[0].x,1500);
 buffer.push(state(.3,1500,{deaths:1,alive:false}),8300,false);assert.equal(buffer.sample(8320).players[0].alive,false);
});
