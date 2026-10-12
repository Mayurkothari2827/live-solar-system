const {test}=require('node:test');
const assert=require('node:assert/strict');
const {model}=require('../orbit-ui.js');
const t={id:399,valid:true,start:90,end:110,epoch:100,clockState:'live',distanceSun:149600000,radius:6378.1366};
const props={bodies:{399:{period:1.0000174}}};
test('presentation uses sourced equatorial radius and period without inventing temperature',()=>{
 const m=model(t,props,100);assert.equal(m.radius,'6,378.1 km');assert.equal(m.period,'365.26 days');assert.equal(m.distance,'149.6 M km');assert.equal(m.temperature,'Unavailable');
});
test('live badge requires valid current coverage and current simulation UTC',()=>{
 assert.equal(model(t,props,100).live,true);
 for(const change of [{valid:false},{start:101},{end:99},{epoch:90},{clockState:'playback'},{clockState:'paused'}])assert.equal(model({...t,...change},props,100).live,false);
 assert.equal(model({...t,end:99},props,100).status,'Expired data');
});
test('paused and historical presentation never calls loaded data live',()=>{
 assert.equal(model({...t,clockState:'paused'},props,100).status,'Paused');assert.equal(model({...t,clockState:'playback'},props,100).status,'Playback');
});
test('missing position and missing reference properties remain unavailable',()=>{
 const m=model({...t,valid:false,radius:undefined},null,100);assert.equal(m.status,'Unavailable');assert.equal(m.distance,'Unavailable');assert.equal(m.radius,'Unavailable');assert.equal(m.period,'Unavailable');
});

test('header thumbnails recover after catalog loading; quick actions delegate to existing controllers',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const elements=new Map([...fs.readFileSync(require.resolve('../index.html'),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{textContent:'',hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},classList:{toggle(){}},focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}}]));
 const document={hidden:false,body:{classList:{contains:()=>true},dataset:{}},getElementById:id=>elements.get(id),addEventListener(){}};
 let catalog=[],tick,bookmarks=[],shared=0,opened=0;
 const window={Capacitor:{getPlatform:()=> 'ios'},ORBIT:{telemetry:()=>t,catalog:()=>catalog},OrbitStore:{read:()=>({bookmarks})},addEventListener(){}};
 elements.get('experience-open').onclick=()=>opened++;elements.get('share-scene').onclick=()=>shared++;
 elements.get('bookmark-object').onclick=()=>{bookmarks=[{scene:{kind:'solar',id:399}}];elements.get('experience-status').textContent='Saved';};elements.get('top-view').onclick=()=>{};
 vm.runInNewContext(fs.readFileSync(require.resolve('../orbit-ui.js'),'utf8'),{window,document,localStorage:{},Date:class extends Date{static now(){return 100000;}},MutationObserver:class{observe(){}},queueMicrotask,setInterval:fn=>tick=fn,fetch:async url=>({ok:true,json:async()=>url.includes('properties')?props:{textures:{earth:{small:{path:'optimized/earth.webp'}},jupiter:{small:{path:'optimized/jupiter.webp'}}}}})});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(document.body.dataset.uiPlatform,'ios');assert.equal(elements.get('selected-thumbnail').hidden,true);
 catalog=[{id:399,texture:'earth'},{id:599,texture:'jupiter'}];tick();assert.equal(elements.get('selected-thumbnail').src,'/assets/optimized/earth.webp');assert.equal(elements.get('selected-thumbnail').hidden,false);
 elements.get('search-open').onclick();assert.equal(opened,1);assert.equal(elements.get('directory-search').focused,true);
 elements.get('quick-share').onclick();assert.equal(shared,1);elements.get('quick-save').onclick();assert.equal(elements.get('quick-save').attrs['aria-pressed'],'true');
});
