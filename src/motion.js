const wrap=(v,n)=>((v%n)+n)%n;
const delta=(a,b,n)=>((a-b+n*1.5)%n)-n/2;
const mix=(a,b,t,n)=>wrap(a+delta(b,a,n)*t,n);
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

export function smoothHeading(current,target,dt){
 const turn=Math.atan2(Math.sin(target-current),Math.cos(target-current)),limit=3.5*Math.min(.05,Math.max(0,dt));
 return current+Math.max(-limit,Math.min(limit,turn));
}

// A small jitter buffer creates animation frames locally, never network messages.
export class MotionBuffer{
 constructor(){this.frames=[];this.delay=.1;this.lastTime=-Infinity;}
 push(state,now,frozen=false){
  const last=this.frames[this.frames.length-1];
  if(!last||state.time<last.state.time||frozen||this.frozen!==frozen){this.frames=[];this.lastTime=state.time;}
  this.frozen=frozen;
  const previous=this.frames[this.frames.length-1];
  if(previous&&state.time===previous.state.time){previous.state=state;return;}
  if(previous){const interval=state.time-previous.state.time;if(interval>0&&interval<.5)this.delay+=(Math.min(.2,Math.max(.075,interval*1.25))-this.delay)*.15;}
  this.frames.push({state,now});if(this.frames.length>12)this.frames.shift();
 }
 sample(now){
  const latest=this.frames[this.frames.length-1];if(!latest)return null;
  if(this.frozen||this.frames.length===1)return latest.state;
  const target=Math.max(this.lastTime,Math.min(latest.state.time+.1,latest.state.time+(now-latest.now)/1000-this.delay));
  this.lastTime=target;
  let before=this.frames[0],after=latest;
  for(let i=1;i<this.frames.length;i++){after=this.frames[i];if(after.state.time>=target)break;before=after;}
  const W=latest.state.world.w,H=latest.state.world.h;
  // Authoritative deaths/respawns take effect immediately, without a ghost gliding there.
  const current=new Map(latest.state.players.map(p=>[p.id,p]));
  if(target>latest.state.time){
   const prev=this.frames[this.frames.length-2],elapsed=latest.state.time-prev.state.time;
   const old=new Map(prev.state.players.map(p=>[p.id,p])),extra=Math.min(.1,target-latest.state.time);
   return {...latest.state,players:latest.state.players.map(p=>{
    const a=old.get(p.id);if(!a||p.visible===false||a.visible===false||!p.alive||a.alive!==p.alive||a.deaths!==p.deaths||elapsed<=0||Math.hypot(delta(p.x,a.x,W),delta(p.y,a.y,H))>600)return p;
    const dx=delta(p.x,a.x,W)/elapsed*extra,dy=delta(p.y,a.y,H)/elapsed*extra;
    return {...p,x:wrap(p.x+dx,W),y:wrap(p.y+dy,H),body:p.body.map(b=>[wrap(b[0]+dx,W),wrap(b[1]+dy,H)])};
   })};
  }
  const duration=after.state.time-before.state.time,t=duration>0?Math.max(0,Math.min(1,(target-before.state.time)/duration)):1;
  const old=new Map(before.state.players.map(p=>[p.id,p]));
  return {...latest.state,players:after.state.players.map(p=>{
   const a=old.get(p.id),live=current.get(p.id)||p;
   if(!a||live.visible===false||a.visible===false||!live.alive||a.alive!==live.alive||a.deaths!==live.deaths||Math.hypot(delta(p.x,a.x,W),delta(p.y,a.y,H))>600)return live;
   return {...live,x:mix(a.x,p.x,t,W),y:mix(a.y,p.y,t,H),angle:angle(a.angle,p.angle,t),body:p.body.map((b,i)=>{
    const previous=a.body[Math.min(i,a.body.length-1)];
    return !previous||Math.hypot(delta(b[0],previous[0],W),delta(b[1],previous[1],H))>600?b:[mix(previous[0],b[0],t,W),mix(previous[1],b[1],t,H)];
   })};
  })};
 }
}
