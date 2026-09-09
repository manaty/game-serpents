export const COLORS=['#66e9eb','#ff88bb','#d9ba76','#a694ff','#9de278','#6aa9ff','#ff9270','#ebe786'];
export const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=x=>typeof x==='number'&&Number.isFinite(x);
export class Base{
 setup(players,options){this.options=options;this.seed=(options.seed>>>0)||Math.floor(Math.random()*4294967295)||1;this.players=players.slice(0,8).map((p,i)=>({id:p.id,number:p.number||i+1,color:COLORS[i],score:0,alive:true,boost:false,inputUntil:0,energy:100,deaths:0}));this.time=0;this.left=options.seconds||60;this.phase='playing';this.round=1;this.intermission=0;this.winner=null;this.winners=[];this.ended=false;this.serial=0;this.events=[];this.accumulator=0;}
 restore(saved){if(saved){for(const [k,v]of Object.entries(saved))if(!['you','world','kind'].includes(k))this[k]=copy(v);this.release();}}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 emit(type,data={}){this.events.push({id:++this.serial,type,time:this.time,...data});if(this.events.length>24)this.events.shift();}
 input(id,action,value){if(id===null&&action==='hostTimeUp'){this.finish();return null;}const p=this.players.find(p=>p.id===id&&!p.bot);if(!p)throw Error('spectator');if(this.ended||this.phase!=='playing'||!p.alive)throw Error('unavailable');if(action!=='steer'||!value||!finite(value.x)||!finite(value.y)||value.boost!==undefined&&typeof value.boost!=='boolean')throw Error('invalidInput');p.boost=value.boost===true;p.inputUntil=this.time+.3;return p;}
 release(id){for(const p of this.players)if(!id||p.id===id){p.boost=false;p.inputUntil=0;}}
 addPlayer(){}
 finish(){if(this.ended)return;this.ended=true;this.phase='finished';this.release();const humans=this.players.filter(p=>!p.bot),best=Math.max(...humans.map(p=>p.score));this.winners=humans.filter(p=>p.score===best).map(p=>p.id);this.winner=this.winners.length===1?this.winners[0]:'draw';this.emit('win',{winners:this.winners});}
 status(){return{winner:this.winner,ended:this.ended,requiredPlayers:[]};}
 save(){const out={};for(const [k,v]of Object.entries(this))out[k]=copy(v);return out;}
 advance(dt){if(this.ended||!finite(dt)||dt<=0)return false;this.accumulator+=Math.min(1,dt);while(this.accumulator>=this.interval&&!this.ended){this.accumulator-=this.interval;this.step(this.interval);}return true;}
 publicPlayers(){return this.players.map(({inputUntil,desired,boost,...p})=>({...p,body:p.body?.slice()}));}
}
