const CELL=128,MARGIN=200,HYSTERESIS=128;
const wrap=(x,n)=>((x%n)+n)%n;
function cellsOnAxis(min,max,size){
 if(max-min>=size)return Array.from({length:Math.ceil(size/CELL)},(_,i)=>i);
 const start=wrap(min,size),end=start+max-min,result=[];
 const add=(a,b)=>{for(let i=Math.floor(a/CELL);i<=Math.floor((b-1e-7)/CELL);i++)result.push(i);};
 add(start,Math.min(size,end));if(end>size)add(0,end-size);return result;
}
export function regionCells(own,viewport,world,margin=MARGIN){
 const xs=cellsOnAxis(own.x-viewport.width/2-margin,own.x+viewport.width/2+margin,world.w);
 const ys=cellsOnAxis(own.y-viewport.height*.42-margin,own.y+viewport.height*.58+margin,world.h);
 const cells=new Set;for(const x of xs)for(const y of ys)cells.add(x+':'+y);return cells;
}
export class InterestIndex{
 constructor(){this.items=new Map;this.cells=new Map;this.observers=new Map;this.stamp=null;}
 key(x,y){return Math.floor(x/CELL)+':'+Math.floor(y/CELL);}
 sync(players,food,world,stamp){
  if(stamp===this.stamp)return;this.stamp=stamp;const current=new Set;
  const insert=(id,x,y,value)=>{current.add(id);const key=this.key(wrap(x,world.w),wrap(y,world.h)),old=this.items.get(id);if(old?.key===key){old.value=value;return;}if(old)this.cells.get(old.key)?.delete(id);if(!this.cells.has(key))this.cells.set(key,new Map);const item={key,value};this.items.set(id,item);this.cells.get(key).set(id,item);};
  for(const f of food)insert('f'+f.id,f.x,f.y,{food:f});
  for(const p of players)if(p.alive)for(const point of p.body)insert('p'+p.id+':'+p.deaths+':'+point[2],point[0],point[1],{player:p.id,point});
  for(const[id,item]of this.items)if(!current.has(id)){this.cells.get(item.key)?.delete(id);this.items.delete(id);}
  for(const[key,items]of this.cells)if(!items.size)this.cells.delete(key);
 }
 view(own,viewport,world){
  const wanted=regionCells(own,viewport,world),outer=regionCells(own,viewport,world,MARGIN+HYSTERESIS),previous=this.observers.get(own.id);
  if(previous?.deaths===own.deaths&&previous.width===viewport.width&&previous.height===viewport.height)for(const cell of previous.cells)if(outer.has(cell))wanted.add(cell);
  this.observers.set(own.id,{cells:wanted,deaths:own.deaths,...viewport});
  const food=[],bodies=new Map;
  for(const cell of wanted)for(const item of this.cells.get(cell)?.values()||[]){const value=item.value;if(value.food)food.push({...value.food});else{if(!bodies.has(value.player))bodies.set(value.player,[]);bodies.get(value.player).push(value.point.slice());}}
  food.sort((a,b)=>a.id-b.id);for(const body of bodies.values())body.sort((a,b)=>b[2]-a[2]);
  return {food,bodies,contains:(x,y)=>wanted.has(this.key(wrap(x,world.w),wrap(y,world.h)))};
 }
}
