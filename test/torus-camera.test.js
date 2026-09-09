import test from 'node:test';
import assert from 'node:assert/strict';
import {followCamera,clearance,cameraSpace,clipNear} from '../src/torus-camera.js';

test('drone clears the entire torus, including the inner hole, at every altitude',()=>{
 const world={w:3600,h:3600};
 for(let x=0;x<3600;x+=100)for(let y=0;y<3600;y+=50)for(const angle of [0,1,2,3,4,5])for(const time of [0,12,36]){
  const camera=followCamera(null,{x,y,angle},world,time,1/30);
  assert.ok(clearance(camera.position)>=.35-1e-8);
  assert.ok(camera.position.every(Number.isFinite));
  assert.ok(Math.hypot(camera.position[0],camera.position[2])>.1);
  const target=cameraSpace(camera.target,camera);
  assert.ok(target.z>.08 && Math.abs(target.x)<1e-8 && Math.abs(target.y)<1e-8);
 }
});

test('wrapped crossings and a changing leader keep the moving drone outside terrain',()=>{
 let camera;const world={w:3600,h:3600};
 for(let i=0;i<1800;i++){
  const previous=camera;
  camera=followCamera(camera,{x:(3500+i*12+(i>=900?1800:0))%3600,y:(3450+i*8+(i>=900?1700:0))%3600,angle:i<900?.1:3.2},world,i/30,1/30);
  assert.ok(clearance(camera.position)>=.35-1e-8);
  if(previous){for(let j=1;j<10;j++){const between=camera.position.map((n,k)=>previous.position[k]+(n-previous.position[k])*j/10);assert.ok(clearance(between)>.3);}}
 }
});

test('polygons crossing the camera plane are clipped before perspective projection',()=>{
 const clipped=clipNear([{x:-1,y:0,z:-1},{x:1,y:0,z:1},{x:1,y:1,z:1}]);
 assert.equal(clipped.length,4);
 assert.ok(clipped.every(p=>p.z>=.08-1e-8));
 assert.deepEqual(clipNear([{x:0,y:0,z:-1},{x:1,y:0,z:-1},{x:0,y:1,z:-1}]),[]);
});
