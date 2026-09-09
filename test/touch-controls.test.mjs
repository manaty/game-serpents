import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {Game} from '../server/game.js';

test('touch steering follows a sliding finger, supports simultaneous boost and switches back to joystick',{timeout:30000},async()=>{
 const pack=JSON.parse(await readFile('dist/game.rmg.json')),players=[{id:'p1',number:1,name:'Touch player',connected:true}],game=new Game(players,null,{bots:0});
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<iframe sandbox="allow-scripts" style="border:0;width:100vw;height:100vh;position:fixed;inset:0"></iframe>');
  await page.evaluate(({html,state})=>{window.actions=[];window.state=state;const f=document.querySelector('iframe');addEventListener('message',e=>{if(e.source!==f.contentWindow)return;if(e.data?.type==='ready')f.contentWindow.postMessage({retroMuseum:1,type:'state',state,role:'controller'},'*');if(e.data?.type==='action'){actions.push(e.data);f.contentWindow.postMessage({retroMuseum:1,type:'ack',id:e.data.id},'*');}});f.srcdoc=html;},{html:pack.view,state:{phase:'playing',language:'en',party:{id:'touch-test',players,you:'p1',community:game.snapshot('p1')}}});
  const f=page.frameLocator('iframe');await f.locator('.pads:not(.disabled)').waitFor();
  await f.locator('[data-controls]').click();await f.locator('[data-control-mode]').selectOption('touch');
  assert.ok(await f.locator('.joystick').isHidden());
  const canvas=f.locator('canvas');await page.waitForTimeout(100);
  const b=await canvas.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
  const down={pointerId:21,clientX:b.x+b.w*.92,clientY:b.y+b.h*.42};
  await canvas.dispatchEvent('pointerdown',down);await page.waitForFunction(()=>actions.some(a=>a.value.x>.9));
  await page.waitForTimeout(60);
  await canvas.dispatchEvent('pointermove',{...down,clientX:b.x+b.w*.5,clientY:b.y+b.h*.12});
  await page.waitForFunction(()=>actions.some(a=>a.value.y<-.9));
  await f.locator('[data-boost]').dispatchEvent('pointerdown',{pointerId:22});await page.waitForFunction(()=>actions.some(a=>a.value.boost&&a.value.y<-.9));
  await page.waitForTimeout(60);
  await canvas.dispatchEvent('pointermove',{...down,clientX:b.x+b.w*.08});await page.waitForFunction(()=>actions.some(a=>a.value.boost&&a.value.x<-.9));
  await f.locator('[data-boost]').dispatchEvent('pointerup',{pointerId:22});
  await canvas.dispatchEvent('pointercancel',down);assert.ok(await f.locator('.touch-target').isHidden());
  await page.waitForFunction(()=>{const a=actions.at(-1).value;return !a.boost&&a.x===0&&a.y===0;});
  // A language/state update must not reset the player's chosen control mode.
  await page.evaluate(()=>{state.language='fr';document.querySelector('iframe').contentWindow.postMessage({retroMuseum:1,type:'state',state,role:'controller'},'*');});
  await f.locator('.touch-steering').waitFor();await f.locator('[data-controls]').click();assert.equal(await f.locator('[data-control-mode]').inputValue(),'touch');
  await page.screenshot({path:'docs/screenshots/touch-settings-fr.png'});
  await f.locator('[data-control-mode]').selectOption('joystick');assert.ok(await f.locator('.joystick').isVisible());
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
