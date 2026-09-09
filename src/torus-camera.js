export const MAJOR_RADIUS=2.35, MINOR_RADIUS=.86;
const TAU=Math.PI*2;
const add=(a,b,k=1)=>a.map((v,i)=>v+b[i]*k);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const unit=a=>{const length=Math.hypot(...a)||1;return a.map(v=>v/length);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const approach=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;

export function surface(u,v){
 const radial=MAJOR_RADIUS+MINOR_RADIUS*Math.cos(v);
 return [radial*Math.cos(u),MINOR_RADIUS*Math.sin(v),radial*Math.sin(u)];
}

export function clearance(position){
 return Math.hypot(Math.hypot(position[0],position[2])-MAJOR_RADIUS,position[1])-MINOR_RADIUS;
}

export function followCamera(previous,leader,world,time,dt,reduced=false){
 const targetU=leader.x/world.w*TAU,targetV=leader.y/world.h*TAU;
 const blend=reduced?1:1-Math.exp(-Math.min(dt,.1)*6);
 const u=previous?approach(previous.u,targetU,blend):targetU;
 const v=previous?approach(previous.v,targetV,blend):targetV;
 const heading=previous?approach(previous.heading,leader.angle||0,blend):leader.angle||0;
 const normal=[Math.cos(v)*Math.cos(u),Math.sin(v),Math.cos(v)*Math.sin(u)];
 const tangentU=[-Math.sin(u),0,Math.cos(u)],tangentV=[-Math.sin(v)*Math.cos(u),Math.cos(v),-Math.sin(v)*Math.sin(u)];
 const forward=add(tangentU.map(n=>n*Math.cos(heading)),tangentV,Math.sin(heading));
 const side=unit(cross(forward,normal));
 // Keep the drone on this side of the hole, even at its lowest inner surface.
 const holeLimit=Math.cos(v)<0?(MAJOR_RADIUS-.4)/-Math.cos(v)-MINOR_RADIUS:Infinity;
 const height=Math.min(reduced?1.9:1.9+Math.sin(time*.13)*.45,holeLimit);
 const ground=surface(u,v);
 const lean=1-.55*Math.max(0,-Math.cos(v));
 let position=add(add(add(ground,normal,height),forward,-.55*lean),side,reduced?0:Math.sin(time*.09)*.18*lean);
 // Exact distance to the solid torus. Enforce clearance after the trailing offset.
 const radial=Math.hypot(position[0],position[2]);
 const center=[MAJOR_RADIUS*position[0]/radial,0,MAJOR_RADIUS*position[2]/radial];
 const away=unit(add(position,center,-1));
 if(clearance(position)<.35)position=add(center,away,MINOR_RADIUS+.35);
 const target=add(add(ground,normal,.04),forward,.15);
 const look=unit(add(target,position,-1)),right=unit(cross(look,forward)),up=unit(cross(right,look));
 return {u,v,heading,height,position,target,right,up,look};
}

export function cameraSpace(point,camera){
 const relative=add(point,camera.position,-1);
 return {x:dot(relative,camera.right),y:dot(relative,camera.up),z:dot(relative,camera.look)};
}

export function clipNear(points,near=.08){
 const output=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],insideA=a.z>=near,insideB=b.z>=near;
  if(insideA)output.push(a);
  if(insideA!==insideB){const t=(near-a.z)/(b.z-a.z);output.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:near});}
 }
 return output;
}
