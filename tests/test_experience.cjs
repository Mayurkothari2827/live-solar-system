const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const S=require('../orbit-store.js'),tours=require('../orbit-tours.js'),ROOT=path.resolve(__dirname,'..');
async function boot(){
 class Element{constructor(){this.children=[];this.dataset={};this.style={};this.value='';this.open=false;this.textContent='';this.events={};this.classList={toggle(){},remove(){}};}append(...items){this.children.push(...items)}replaceChildren(...items){this.children=items;}addEventListener(k,fn){this.events[k]=fn;}showModal(){this.open=true;}close(){this.open=false;}focus(){}click(){this.onclick?.();}}
 const ids=new Map([...fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 let snapshot={kind:'solar',id:399,view:'close',scale:'physical',epoch:1790000000,camera:[.5,1,8]},restores=[],qualities=[],saved=new Map();
 const engine={kind:'solar',ready:()=>true,quality:q=>qualities.push(q),snapshot:()=>structuredClone(snapshot),restore:s=>{restores.push(s);snapshot=s;return {ok:true}},telemetry:()=>({name:'Earth',epoch:1790000000,valid:true,position:[1,2,3],velocity:[4,5,6],frame:'ITRF93'}),reset(){},closePanel:()=>false};
 const intervals=[],location={href:'https://orbit.test/',pathname:'/'};
 const ctx={window:{ORBIT:engine,OrbitStore:S,OrbitTours:tours},document:{body:new Element(),hidden:false,getElementById:id=>ids.get(id),createElement:()=>new Element()},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},navigator:{},location,URL,Date,File,Blob,setInterval:fn=>{intervals.push(fn);return intervals.length},clearInterval(){},setTimeout,fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(ROOT,url)))})};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'orbit-experience.js'),'utf8'),ctx);intervals.forEach(fn=>fn());ids.get('experience-open').onclick();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
 return {ids,restores,qualities,saved,ctx};
}
test('directory loads actual catalogs and science, quality and discoveries persist',async()=>{const a=await boot();assert(a.ids.get('directory-results').children.length>0);a.ids.get('directory-search').value='Europa';a.ids.get('directory-search').oninput();assert.match(a.ids.get('directory-results').children[0].textContent,/Europa/);a.ids.get('experience-mode').onchange({target:{value:'science'}});assert.equal(a.ctx.document.body.dataset.experience,'science');a.ids.get('graphics-quality').onchange({target:{value:'low'}});assert.equal(a.qualities.at(-1),'low');a.ids.get('bookmark-object').onclick();a.ids.get('save-scene').onclick();const saved=S.read(a.ctx.localStorage);assert.equal(saved.bookmarks.length,1);assert.equal(saved.views.length,1);assert.equal(saved.views[0].scene.epoch,1790000000);assert.equal(saved.bookmarks[0].scene.epoch,undefined);assert.equal(saved.mode,'science');assert(a.ids.get('profile-data').children.length>0);});
test('manual tours use engine navigation, pause progression and preserve resumable steps',async()=>{const a=await boot();a.ids.get('tour-list').children[0].onclick();assert.equal(a.restores.at(-1).id,10);assert.equal(a.ids.get('journey-card').hidden,false);a.ids.get('journey-next').onclick();assert.equal(a.restores.at(-1).id,399);a.ids.get('journey-pause').onclick();const count=a.restores.length;a.ids.get('journey-next').onclick();assert.equal(a.restores.length,count);a.ids.get('journey-pause').onclick();a.ids.get('journey-next').onclick();assert.equal(a.restores.at(-1).id,599);assert.equal(S.read(a.ctx.localStorage).tour.step,2);a.ids.get('journey-exit').onclick();assert(a.ids.get('journey-card').hidden);});
test('comparisons preserve physical radius ratios and do not invent missing Moon properties',async()=>{
 const a=await boot(),columns=a.ids.get('comparison').children;
 const directory=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/solar-directory.json'))).bodies;
 const earth=directory.find(b=>b.id===399),moon=directory.find(b=>b.id===301);
 assert.equal(parseFloat(columns[0].children[1].style.width),120);
 assert(Math.abs(parseFloat(columns[1].children[1].style.width)/120-moon.radius/earth.radius)<1e-12);
 const entries=columns[1].children[2].children;for(const name of ['mass','gravity','rotation','period']){const i=entries.findIndex(e=>e.textContent===name);assert.equal(entries[i+1].textContent,'Unavailable in this dataset');}
});
test('scene sharing includes reproducible UTC and camera; cancellation does not report success',async()=>{
 const a=await boot();let shared;a.ctx.navigator.share=async value=>{shared=value;};await a.ids.get('share-scene').onclick();const s=S.parse(shared.url,'solar');assert.equal(s.id,399);assert.equal(s.epoch,1790000000);assert.deepEqual(s.camera,[.5,1,8]);
 a.ctx.navigator.share=async()=>{const e=Error('cancel');e.name='AbortError';throw e;};await a.ids.get('share-scene').onclick();assert.equal(a.ids.get('experience-status').textContent,'Sharing cancelled.');
});
test('native link and image sharing cancellation is shown as cancellation',async()=>{
 const a=await boot(),cancel=async()=>{throw Error('Share canceled');};a.ctx.window.OrbitNative={share:cancel,shareImage:cancel};a.ctx.window.ORBIT.screenshot=async()=>new Blob(['png'],{type:'image/png'});
 await a.ids.get('share-scene').onclick();assert.equal(a.ids.get('experience-status').textContent,'Sharing cancelled.');await a.ids.get('capture-scene').onclick();assert.equal(a.ids.get('experience-status').textContent,'Sharing cancelled.');
});
