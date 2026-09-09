import{Game}from'../server/game.js';
globalThis.RetroMuseumGame={create:(players,saved,options)=>{
 const game=new Game(players,saved,options);
 // QuickJS serializes the returned value synchronously before it crosses the VM
 // boundary. Avoid cloning the entire save twice; native Game.save still clones.
 Object.defineProperty(game,'save',{enumerable:false,value:()=>({...game})});
 return game;
}};
