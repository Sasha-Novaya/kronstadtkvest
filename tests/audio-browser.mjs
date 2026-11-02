import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const {chromium,webkit} = createRequire(import.meta.url)('playwright');
const base = process.env.QUEST_TEST_URL ?? 'http://localhost:3000';
const key = 'kronstadtkvest:progress:kronstadt-walk';
const browser = await (process.env.QUEST_ENGINE === 'webkit' ? webkit.launch({headless:true}) : chromium.launch({executablePath: process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}));
const errors=[];
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{
  const NativeAudio=window.Audio;
  window.__audios=[];
  window.Audio=function(...args) {const el=new NativeAudio(...args);window.__audios.push(el);return el;};
});
const page=await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));
const button=name=>page.getByRole('button',{name,exact:true});
const click=async name=>button(name).click();
const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k))?.progress,key);
const media=()=>page.evaluate(()=>({time:window.__audios[0].currentTime,paused:window.__audios[0].paused,src:window.__audios[0].src}));
const seek=async value=>{
 const range=page.getByRole('slider');
 await range.evaluate((el,v)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 await page.waitForFunction(v=>Math.abs(window.__audios[0].currentTime-v)<1,value);
};
try {
 await page.goto(base+'/dev/start');
 await click('Мы на месте');await page.getByRole('textbox').fill('Аудиотест');await click('Подняться на борт!');
 await button('Пауза').waitFor();
 assert.equal((await media()).paused,false);
 assert.ok((await saved()).visitedAudio.length===1);
 console.log('PASS: first entry autoplays and saves the screen');
 const initialImage=await page.locator('img').first().getAttribute('src');
 await click('Пауза');await seek(90);
 assert.equal((await media()).paused,true);
 const intro=JSON.parse(await readFile(new URL('../src/quests/kronstadt-walk/content/start.json',import.meta.url),'utf8')).steps[2].clips[0];
 const visualAt=t=>intro.visuals.filter(v=>(v.at??0)<=t).at(-1).image;

 const stage=()=>page.locator('img').first().getAttribute('src');
 const at90=await stage();await seek(20);const at20=await stage();
 assert.notEqual(visualAt(90),visualAt(20));assert.notEqual(at90,at20);
 await seek(90);assert.equal(await stage(),at90);
 console.log('PASS: seeking both directions while paused updates illustrations');
 await click('Продолжить');await seek(45);assert.equal((await media()).paused,false);
 await click('назад 10 с');
 await page.waitForFunction(()=>window.__audios[0].currentTime<38);
 assert.equal((await media()).paused,false);
 console.log('PASS: seeking while playing and back ten seconds preserve playback');
 // Настоящее движение мышью по стандартному ползунку.
 const box=await page.getByRole('slider').boundingBox();
 if (process.env.QUEST_ENGINE === 'webkit') {
   await page.touchscreen.tap(box.x+box.width*.6,box.y+box.height/2);
 } else {
   await page.mouse.move(box.x+box.width*.25,box.y+box.height/2);
   await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height/2,{steps:8});await page.mouse.up();
 }
 await page.waitForFunction(()=>window.__audios[0].currentTime>60);
 await page.screenshot({path:process.env.QUEST_ENGINE === 'webkit' ? 'audio-webkit-mobile.png' : 'audio-mobile.png',fullPage:true});
 await click('Далее');await button('Пауза').waitFor();
 assert.match((await media()).src,/howto/);
 assert.equal((await saved()).visitedAudio.length,2);
 await click('Назад');await button('Слушать').waitFor();
 assert.equal((await media()).paused,true);
 await page.reload();await button('Слушать').waitFor();assert.equal((await media()).paused,true);
 console.log('PASS: next audio autoplays, back and reload stay silent');
 await click('Слушать');await button('Пауза').waitFor();
 await seek(0);assert.equal(await stage(),initialImage);
 await page.evaluate(()=>{const a=window.__audios[0];a.currentTime=a.duration-.05;});
 await button('Прослушать снова').waitFor();await click('Прослушать снова');
 await button('Пауза').waitFor();assert.ok((await media()).time<2);
 console.log('PASS: manual play and replay');
 page.once('dialog',d=>d.accept());await click('Начать заново');
 await click('Мы на месте');await page.getByRole('textbox').fill('Снова');await click('Подняться на борт!');
 await button('Пауза').waitFor();assert.equal((await saved()).visitedAudio.length,1);
 console.log('PASS: reset clears audio history');
 // Принудительный отказ play() проверяет именно обработку запрета браузером.
 const blocked=await browser.newContext({viewport:{width:390,height:844}});
 await blocked.addInitScript(()=>{
   const play=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){return window.__allowAudio?play.call(this):Promise.reject(new DOMException('Blocked','NotAllowedError'));};
 });
 const p=await blocked.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/dev/start');await p.getByRole('button',{name:'Мы на месте',exact:true}).click();
 await p.getByRole('textbox').fill('Блокировка');
 await p.getByRole('button',{name:'Подняться на борт!',exact:true}).click();
 await p.getByRole('button',{name:'Продолжить',exact:true}).waitFor();
 assert.equal(await p.getByRole('button',{name:'Пауза',exact:true}).count(),0);
 await p.evaluate(()=>window.__allowAudio=true);
 await p.getByRole('button',{name:'Продолжить',exact:true}).click();
 await p.getByRole('button',{name:'Пауза',exact:true}).waitFor();
 await blocked.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: blocked autoplay shows working manual control, no uncaught errors');
} finally {await browser.close();}
