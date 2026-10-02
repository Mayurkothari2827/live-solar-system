// Runtime and resource checks with real Three.js math and a mocked renderer/DOM.
// Synthetic ephemerides isolate interpolation and playback from remote services.
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),THREE=require(path.join(ROOT,'assets/three.min.js'));
const catalogue=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/solar-catalog.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/texture-manifest.json')));
const NOW=Date.parse('2026-10-02T12:00:00Z'),AU=149597870.7;
const flush=()=>new Promise(resolve=>setImmediate(resolve));

class Target {
 constructor(){this.events=new Map();}
 addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);}
 dispatch(type,event={}){for(const fn of this.events.get(type)||[])fn(event);}
}
class Element extends Target {
 constructor(){super();this.children=[];this.value='';this.checked=true;this.hidden=false;this.style={};this.dataset={};this.clientWidth=1000;this.clientHeight=600;this.classList={toggle(){},add(){},remove(){}};}
 append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}setAttribute(k,v){this[k]=v;}setPointerCapture(){}
 getContext(){return {drawImage(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}
}
function fixtures(){
 const records={};
 for(const b of catalogue.bodies){
  const epoch=NOW/1000,start=epoch-3600,end=epoch+3600,x=b.id===10?0:b.id===301?384400:b.parent===10?AU*(b.id===399?1:1+b.id/1000):600000;
  const velocity=b.id===399?29.78:0,period=b.id===399?86164:100000;
  const samples=[start,epoch,end].map(t=>[t,x,velocity*(t-epoch),0,0,velocity,0]);
  records[b.id]={id:b.id,start,end,samples,orientationStart:start,orientationStep:60,source:'Test fixture',fetchedUTC:new Date(NOW).toISOString()};
  if(b.id!==607)records[b.id].orientations=Array.from({length:121},(_,i)=>{const angle=(start+i*60-epoch)/period*Math.PI;return [0,Math.sin(angle),0,Math.cos(angle)];});
 }
 return records;
}
async function boot({mobile=false,reduced=false,delayedImages=false}={}){
 const elements=new Map();for(const m of fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element());
 const viewport=elements.get('scene');viewport.clientWidth=mobile?390:1000;viewport.clientHeight=mobile?844:600;
 const document=new Target();Object.assign(document,{getElementById:id=>elements.get(id),createElement:()=>new Element(),hidden:false,documentElement:new Element()});
 const frames=[],imageRequests=[],images=[],renders=[],disposed=[],fetchRequests=[],records=fixtures();
 let wallClock=NOW,performanceClock=0,pixelRatio,options;
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[wallClock]));}static now(){return wallClock;}}
 const window=new Target();window.THREE={...THREE,WebGLRenderer:class{
  constructor(config){options=config;this.domElement=new Element();this.capabilities={getMaxAnisotropy:()=>8};}
  setPixelRatio(value){pixelRatio=value;}setClearColor(){}setSize(){}
  render(scene,camera){scene.updateMatrixWorld();renders.push({scene,camera});}
 },Texture:class extends THREE.Texture {dispose(){disposed.push(this.image?.src);super.dispose();}}};
 const context={window,document,console,devicePixelRatio:3,performance:{now:()=>performanceClock},matchMedia:q=>({matches:q.includes('reduced-motion')?reduced:mobile}),ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},Image:class {
  constructor(){this.width=2048;this.height=1024;images.push(this);}
  set src(value){this._src=value;imageRequests.push(value);if(!delayedImages)Promise.resolve().then(()=>this.onload());}get src(){return this._src;}
 },requestAnimationFrame:fn=>frames.push(fn),fetch:async url=>{fetchRequests.push(url);return {ok:true,json:async()=>url==='/api/catalog'?structuredClone(catalogue):url==='/assets/texture-manifest.json'?manifest:{bodies:records,status:{ready:29,busy:false,message:'Ready'}}};},Date:FixedDate,Math,Map,Set,Uint8Array,AbortController,setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),context,{filename:'app.js'});
 for(let i=0;i<8;i++)await flush();
 function frame(seconds=1/30){performanceClock+=seconds*1000;wallClock+=seconds*1000;const callback=frames.shift();assert(callback);callback(performanceClock);}
 frame();await flush();
 return {elements,document,options,pixelRatio,frames,renders,imageRequests,images,disposed,fetchRequests,frame,advanceWall:seconds=>wallClock+=seconds*1000,get scene(){return renders.at(-1)?.scene;},get camera(){return renders.at(-1)?.camera;},get clock(){return wallClock;},get now(){return performanceClock;},groups(){return this.scene.children.filter(o=>o.isGroup);},select(id){elements.get('body-select').onchange({target:{value:String(id)}});}};
}

test('phone resources use packaged maps, bounded geometry and pixel density; off-screen Moon and rings stay unloaded',async()=>{
 const app=await boot({mobile:true});
 assert.equal(app.pixelRatio,1.5);assert.equal(app.options.antialias,false);assert.equal(app.document.documentElement.dataset.renderProfile,'mobile');
 const earth=app.groups()[3];assert.equal(earth.children[0].geometry.parameters.widthSegments,64);assert.equal(earth.children[0].geometry.parameters.heightSegments,40);
 assert.equal(app.scene.children.find(o=>o.isPoints).geometry.attributes.position.count,800);
 assert(app.imageRequests.length>=4);assert(app.imageRequests.every(p=>p.startsWith('/assets/optimized/')));
 assert(!app.imageRequests.some(p=>p.includes('moon-')||p.includes('saturn_ring')));
 assert.equal(earth.children[0].material.uniforms.dayMap.value.colorSpace,THREE.SRGBColorSpace);
 assert.equal(earth.children[0].material.uniforms.normalMap.value.colorSpace,THREE.NoColorSpace);
 assert(earth.children[0].material.uniforms.hasNormal.value===1);
});

test('mobile draw throttling preserves accelerated position/rotation and a paused clock',async()=>{
 const app=await boot({mobile:true}),earth=app.groups()[3],q0=earth.quaternion.clone(),begin=app.renders.length;
 app.elements.get('speed').onchange({target:{value:'3600'}});
 for(let i=0;i<120;i++)app.frame(1/120);
 const rendered=app.renders.length-begin;assert(rendered>=25&&rendered<=30,`draw count ${rendered}`);
 const lastSimTime=Date.parse(app.elements.get('utc-clock').dateTime)/1000;
 // One second at 3600× advances ~one hour even when most RAF callbacks skip drawing.
 const angle=q0.angleTo(earth.quaternion);assert(angle>.24&&angle<.27,`rotation ${angle}`);
 assert(lastSimTime>=NOW/1000&&lastSimTime<=NOW/1000+3600);
 app.elements.get('pause').onclick();app.frame(.2);const pausedQuaternion=earth.quaternion.clone();app.frame(.5);assert(earth.quaternion.angleTo(pausedQuaternion)<1e-8);
});

test('live time uses the wall clock and hidden tabs pause rendering/playback without catch-up',async()=>{
 const app=await boot({mobile:true}),earth=app.groups()[3];
 app.advanceWall(15);app.frame(.04);const expected=2*Math.PI*((app.clock-NOW)/1000)/86164;
 assert(Math.abs(earth.quaternion.angleTo(new THREE.Quaternion())-expected)<1e-7);
 app.elements.get('speed').onchange({target:{value:'3600'}});const q=earth.quaternion.clone(),count=app.renders.length;
 app.document.hidden=true;app.document.dispatch('visibilitychange');app.frame(2);app.frame(2);assert.equal(app.renders.length,count);
 app.document.hidden=false;app.document.dispatch('visibilitychange');app.frame(.04);
 assert(Math.abs(q.angleTo(earth.quaternion)-2*Math.PI*144/86164)<1e-7);
});

test('physical Earth–Moon spacing and overview sizes stay unchanged; trails reuse geometry',async()=>{
 const app=await boot({mobile:true}),earth=app.groups()[3],moon=app.groups()[9];
 assert.equal(earth.position.length(),0);assert(Math.abs(moon.position.length()-384400/6378.1366)<.001);
 app.elements.get('system-view').onclick();app.frame(.04);await flush();
 assert(app.camera.position.length()>150);
 const trails=app.scene.children.filter(o=>o.isLine),geometry=trails[9].geometry;
 app.frame(.5);assert.equal(trails[9].geometry,geometry);
 app.select(301);app.frame(.04);await flush();assert(moon.position.length()<1e-9);assert(earth.position.length()>200);assert(app.imageRequests.some(p=>p.includes('8k_moon-detail')));
 app.elements.get('overview').onclick();app.frame(.04);assert.equal(app.groups().filter(g=>g.visible).length,9);
 app.elements.get('readable-scale').checked=false;app.frame(.04);assert(Math.abs(earth.scale.x-6378.1366/AU)<1e-10);
 app.select(607);assert(app.elements.get('rotation-note').textContent.includes('Chaotic'));
});

test('switching systems frees phone textures and late requests cannot overwrite the current selection',async()=>{
 const app=await boot({mobile:true,delayedImages:true});
 const earth=app.groups()[3],original=app.images[0];app.select(499);app.select(399);
 original.onload();await flush();
 assert.equal(earth.children[0].material.uniforms.dayMap.value.image.width,1,'stale first Earth texture must be ignored');
 // Resolve all active downloads, including auxiliary maps added after day maps.
 for(let pass=0;pass<4;pass++){for(const image of [...app.images])image.onload();await flush();}
 assert(earth.children[0].material.uniforms.dayMap.value.image.src.includes('8k_earth_daymap-detail'));
 assert(app.disposed.some(p=>p?.includes('8k_earth_daymap-detail')));
 app.select(499);app.frame(.04);await flush();assert(earth.children[0].material.uniforms.dayMap.value.image.width===1);
});

test('desktop retains detailed spheres, antialiasing and original 4k surface decode limit',async()=>{
 const app=await boot();assert.equal(app.pixelRatio,2);assert.equal(app.options.antialias,true);
 assert.equal(app.groups()[3].children[0].geometry.parameters.widthSegments,112);
 assert.equal(app.scene.children.find(o=>o.isPoints).geometry.attributes.position.count,1800);
 assert(app.imageRequests.includes('/assets/8k_earth_daymap.jpg'));
 const initial=app.renders.length;for(let i=0;i<60;i++)app.frame(1/60);assert.equal(app.renders.length-initial,60);
});

test('all texture derivatives are present, below phone budgets and preserve source credit references',()=>{
 const credits=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/optimized/credits.json')));
 for(const [original,entry] of Object.entries(manifest.textures)){
  for(const tier of ['small','detail']){const variant=entry[tier],name=path.basename(variant.path);assert(fs.existsSync(path.join(ROOT,'assets',variant.path)));assert.equal(fs.statSync(path.join(ROOT,'assets',variant.path)).size,variant.bytes);assert(variant.width<=(tier==='small'?1024:2048));assert.equal(credits[name].original,original);assert(credits[name].credit);}
 }
 const originals=Object.values(manifest.textures).reduce((sum,x)=>sum+x.sourceBytes,0),small=Object.values(manifest.textures).reduce((sum,x)=>sum+x.small.bytes,0);
 assert(small/originals<.05);const earth=['8k_earth_daymap.jpg','8k_earth_clouds.jpg','8k_earth_nightmap.jpg'].reduce((sum,name)=>sum+manifest.textures[name].detail.bytes,manifest.textures['earth-normal.png'].small.bytes);assert(earth<1_000_000);
});
