// Runtime and resource checks with real Three.js math and a mocked renderer/DOM.
// Synthetic ephemerides isolate interpolation and playback from remote services.
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),THREE=require(path.join(ROOT,'assets/three.min.js'));
const catalogue=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/solar-catalog.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/texture-manifest.json')));
const OrbitModel=require(path.join(ROOT,'solar-orbits.js'));
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
function fixtures(windowSeconds=3600){
 const records={};
 for(const b of catalogue.bodies){
  const epoch=NOW/1000,start=epoch-windowSeconds,end=epoch+windowSeconds,radii={199:.387,299:.723,399:1,499:1.524,599:5.204,699:9.582,799:19.2,899:30.07};
  const x=b.id===10?0:b.id===301?384400:b.parent===10?AU*radii[b.id]:600000;
  const velocity=b.parent===10?(b.id===399?29.78:Math.sqrt(OrbitModel.SUN_GM/x)):0,period=b.id===399?86164:100000;
  const angle=b.parent===10&&b.id!==399?b.id*.039:0,c=Math.cos(angle),s=Math.sin(angle);
  const samples=[start,epoch,end].map(t=>[t,x*c-velocity*s*(t-epoch),x*s+velocity*c*(t-epoch),0,-velocity*s,velocity*c,0]);
  records[b.id]={id:b.id,start,end,samples,orientationStart:start,orientationStep:60,source:'Test fixture',fetchedUTC:new Date(NOW).toISOString()};
  if(b.id!==607)records[b.id].orientations=Array.from({length:121},(_,i)=>{const angle=(start+i*60-epoch)/period*Math.PI;return [0,Math.sin(angle),0,Math.cos(angle)];});
 }
 return records;
}
async function boot({mobile=false,reduced=false,delayedImages=false,missing=[],perBody=false,failures=new Set(),failureSeconds=0}={}){
 const elements=new Map();for(const m of fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element());
 const viewport=elements.get('scene');viewport.clientWidth=mobile?390:1000;viewport.clientHeight=mobile?844:600;
 const document=new Target();Object.assign(document,{getElementById:id=>elements.get(id),createElement:()=>new Element(),hidden:false,documentElement:new Element(),body:new Element()});
 const frames=[],imageRequests=[],images=[],renders=[],disposed=[],fetchRequests=[],records=fixtures(perBody?86400:3600);
 for(const id of missing)delete records[id];
 let wallClock=NOW,performanceClock=0,pixelRatio,options;
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[wallClock]));}static now(){return wallClock;}}
 const window=new Target();window.SolarOrbitGuides=OrbitModel;window.THREE={...THREE,WebGLRenderer:class{
  constructor(config){options=config;this.domElement=new Element();this.capabilities={getMaxAnisotropy:()=>8};}
  setPixelRatio(value){pixelRatio=value;}setClearColor(){}setSize(){}
  render(scene,camera){scene.updateMatrixWorld();renders.push({scene,camera});}
 },Texture:class extends THREE.Texture {dispose(){disposed.push(this.image?.src);super.dispose();}}};
 const context={window,document,console,devicePixelRatio:3,performance:{now:()=>performanceClock},matchMedia:q=>({matches:q.includes('reduced-motion')?reduced:mobile}),ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},Image:class {
  constructor(){this.width=2048;this.height=1024;images.push(this);}
  set src(value){this._src=value;imageRequests.push(value);if(!delayedImages)Promise.resolve().then(()=>this.onload());}get src(){return this._src;}
 },requestAnimationFrame:fn=>frames.push(fn),fetch:async url=>{fetchRequests.push(url);const id=Number(String(url).split('id=')[1]);if(failures.has(id))wallClock+=failureSeconds*1000;return {ok:!failures.has(id),json:async()=>url==='/api/catalog'?{...structuredClone(catalogue),...(perBody?{delivery:'per-body'}:{})}:url==='/assets/texture-manifest.json'?manifest:perBody?records[id]:{bodies:records,status:{ready:Object.keys(records).length-1,busy:false,message:'Ready'}}};},Date:FixedDate,Math,Map,Set,Uint8Array,AbortController,setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),context,{filename:'app.js'});
 for(let i=0;i<8;i++)await flush();
 function frame(seconds=1/30){performanceClock+=seconds*1000;wallClock+=seconds*1000;const callback=frames.shift();assert(callback);callback(performanceClock);}
 frame();await flush();
 return {engine:window.ORBIT,window,elements,document,options,get pixelRatio(){return pixelRatio;},frames,renders,imageRequests,images,disposed,fetchRequests,records,frame,advanceWall:seconds=>wallClock+=seconds*1000,get scene(){return renders.at(-1)?.scene;},get camera(){return renders.at(-1)?.camera;},get clock(){return wallClock;},get now(){return performanceClock;},groups(){return this.scene.children.filter(o=>o.isGroup);},select(id){elements.get('body-select').onchange({target:{value:String(id)}});}};
}

test('phone resources use packaged maps, bounded geometry and pixel density; off-screen Moon and rings stay unloaded',async()=>{
 const app=await boot({mobile:true});
 assert.equal(app.pixelRatio,1.25);assert.equal(app.options.antialias,false);assert.equal(app.document.documentElement.dataset.renderProfile,'mobile');
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
 const trail=app.scene.children.find(o=>o.userData.trajectoryBodyId===301),geometry=trail.geometry;
 app.frame(.5);assert.equal(trail.geometry,geometry);
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

test('cinematic overview shows textured bodies and closed state-derived guides instead of subpixel planets',async()=>{
 const app=await boot({mobile:true});app.elements.get('overview').onclick();app.frame(.6);await flush();
 assert.equal(app.document.body.dataset.view,'overview');assert.equal(app.elements.get('overview-toolbar').hidden,false);
 const groups=app.groups().filter(g=>g.visible),guides=app.scene.children.filter(o=>o.userData.kind==='osculating-guide'&&o.visible);
 assert.equal(groups.length,9);assert.equal(guides.length,8);
 for(const group of groups){
  const id=group.children[0].userData.bodyId,radiusPixels=group.scale.x*844/(2*Math.tan(app.camera.fov*Math.PI/360)*app.camera.position.distanceTo(group.position));
  assert(radiusPixels>=7.9,`${id} remains a visible surface (${radiusPixels}px radius)`);
  assert(!group.children[0].material.uniforms.dayMap.value.isDataTexture,`${id} surface map is loaded`);
  const meta=catalogue.bodies.find(b=>b.id===id);assert(app.imageRequests.includes('/assets/'+manifest.textures[meta.texture].small.path));
  if(id===10)continue;
  const guide=guides.find(line=>line.userData.orbitBodyId===id),positions=guide.geometry.attributes.position;
  assert.equal(positions.count,257);const first=new THREE.Vector3().fromBufferAttribute(positions,0),last=new THREE.Vector3().fromBufferAttribute(positions,256);
  assert(first.distanceTo(last)<1e-5);assert(first.distanceTo(group.position)<1e-4,'guide and live planet share the same display transform');
 }
 assert.match(app.elements.get('scale-label').textContent,/Spacing compressed/);
 assert(app.imageRequests.some(p=>p.includes('saturn_ring_alpha-small')));
});

test('cinematic, real-distance and physical modes preserve live direction and rotation while labeling their scale',async()=>{
 const app=await boot();app.elements.get('overview').onclick();app.frame(.04);app.elements.get('pause').onclick();
 const earth=app.groups()[3],direction=earth.position.clone().normalize(),rotation=earth.quaternion.clone(),compressed=earth.position.length();
 const scale=app.elements.get('overview-scale');scale.value='proportional';scale.onchange();app.frame(.04);
 assert(earth.position.clone().normalize().distanceTo(direction)<1e-12);assert(earth.quaternion.angleTo(rotation)<1e-7);
 const realDistance=earth.position.length();assert(Math.abs(realDistance-1)<.001);assert(compressed>realDistance*5);
 assert.match(app.elements.get('scale-label').textContent,/Real distances.*Sizes enlarged/);
 scale.value='physical';scale.onchange();app.frame(.04);
 assert.equal(app.elements.get('readable-scale').checked,false);assert(Math.abs(earth.scale.x-6378.1366/AU)<1e-10);
 assert.equal(earth.position.length(),realDistance);assert(earth.quaternion.angleTo(rotation)<1e-7);
 assert.match(app.elements.get('scale-label').textContent,/Physical sizes and distances/);
 app.elements.get('trails').checked=false;app.elements.get('trails').onchange();app.frame(.04);
 assert.equal(app.scene.children.filter(o=>o.isLine&&o.visible).length,0);assert.equal(app.elements.get('guide-note').hidden,true);
 app.select(699);app.frame(.04);assert.equal(app.elements.get('overview-toolbar').hidden,true);
 assert.equal(app.scene.children.filter(o=>o.userData.kind==='osculating-guide'&&o.visible).length,0);
});

test('overview refits when a newly downloaded outer planet becomes available',async()=>{
 const app=await boot({mobile:true,missing:[899]});app.elements.get('overview').onclick();app.frame(.04);
 const initial=app.camera.position.length();assert.equal(app.groups().filter(g=>g.visible).length,8);
 app.records[899]=fixtures()[899];app.advanceWall(301);app.frame(.04);await flush();app.frame(.04);
 assert.equal(app.groups().filter(g=>g.visible).length,9);assert(app.camera.position.length()>initial);
 assert.equal(app.scene.children.filter(o=>o.userData.kind==='osculating-guide'&&o.visible).length,8);
 const neptune=app.groups().find(group=>group.children[0].userData.bodyId===899),point=neptune.position.clone().project(app.camera);
 assert(Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z<1,'new Neptune stays in the fitted overview');
});


test('covered phone panels reduce draws without slowing simulated time',async()=>{
 const app=await boot({mobile:true});app.elements.get('speed').onchange({target:{value:'3600'}});
 const earth=app.groups()[3],before=earth.quaternion.clone();app.document.body.dataset.sheet='data';
 const count=app.renders.length;for(let i=0;i<240;i++)app.frame(1/120);
 assert(app.renders.length-count<=2);assert(earth.quaternion.angleTo(before)>.1);
 app.document.body.dataset.sheet='';const resumed=app.renders.length;for(let i=0;i<120;i++)app.frame(1/120);
 assert(app.renders.length-resumed>=25);
});
test('sustained slow frames reduce pixel density while preserving playback',async()=>{
 const app=await boot({mobile:true});app.elements.get('speed').onchange({target:{value:'3600'}});
 const earth=app.groups()[3],before=earth.quaternion.clone();for(let i=0;i<120;i++)app.frame(.05);
 assert.equal(app.pixelRatio,1);assert(earth.quaternion.angleTo(before)>.1);
});


test('scene restoration rejects uncovered epochs and preserves valid saved settings',async()=>{
 const app=await boot({mobile:true});const before=app.engine.snapshot();
 assert.equal(app.engine.restore({kind:'solar',id:399,epoch:1}).ok,false);
 assert.equal(app.engine.snapshot().id,before.id);
 const valid=app.engine.telemetry().epoch;
 assert.equal(app.engine.restore({kind:'solar',id:301,view:'close',scale:'physical',epoch:valid,camera:[.2,1,8]}).ok,true);
 app.frame(.04);assert.equal(app.engine.snapshot().id,301);assert.equal(app.engine.snapshot().epoch,valid);
 assert.equal(app.engine.snapshot().scale,'physical');assert.equal(app.engine.telemetry().relativeTo,'parent body');
 app.engine.quality('low');app.frame(.04);assert.equal(app.pixelRatio,1);
 assert.equal(app.groups()[3].children[0].geometry.parameters.widthSegments,40);
 app.engine.quality('high');assert.equal(app.pixelRatio,2);
});
test('native background suspends rendering without accelerated catch-up',async()=>{
 const app=await boot();app.elements.get('speed').onchange({target:{value:'3600'}});
 const count=app.renders.length;app.document.body.dataset.nativeBackground='true';app.frame(4);assert.equal(app.renders.length,count);
 app.document.body.dataset.nativeBackground='false';app.document.dispatch('visibilitychange');app.frame(.04);
 assert(app.renders.length>count);
});


test('current UTC beyond downloaded data never remains marked available',async()=>{
 const app=await boot();app.advanceWall(8000);app.frame(.04);
 assert.equal(app.engine.telemetry().valid,false);
 assert.equal(app.engine.telemetry().position,null);
 assert.match(app.elements.get('state-label').textContent,/unavailable/);
});

test('lowering graphics quality releases higher resolution GPU maps',async()=>{
 const app=await boot({mobile:true});app.select(399);app.engine.quality('high');app.frame(.04);for(let i=0;i<8;i++)await flush();
 const earth=app.groups()[3];assert.equal(earth.children[0].material.uniforms.hasNormal.value,1);
 app.engine.quality('low');assert.equal(earth.children[0].material.uniforms.hasNormal.value,0);await flush();assert(app.disposed.length>0);
 app.frame(.04);for(let i=0;i<8;i++)await flush();assert.equal(earth.children[0].material.uniforms.hasNormal.value,0);
});

// Persistent upstream failures must not starve unrelated bodies on every retry.
test('per-body retries reach healthy bodies after three upstream failures and reconnect retries failures',async()=>{
 const failures=new Set([599,501,502]);const a=await boot({perBody:true,failures});
 assert(!a.fetchRequests.includes('/api/ephemeris?id=499'));
 a.advanceWall(31);a.frame(.04);for(let i=0;i<8;i++)await flush();
 assert(a.fetchRequests.includes('/api/ephemeris?id=499'),'healthy Mars must be reached on the next retry');
 a.elements.get('overview').onclick();a.frame(.04);assert(a.groups().find(g=>g.children[0].userData.bodyId===499).visible);
 const prior=a.fetchRequests.filter(x=>x==='/api/ephemeris?id=599').length;failures.clear();a.window.dispatch('online');for(let i=0;i<8;i++)await flush();
 assert(a.fetchRequests.filter(x=>x==='/api/ephemeris?id=599').length>prior);
 assert.equal(a.elements.get('notice').textContent,'');
});

test('solar context recovery preserves selected body, clock and camera state',async()=>{
 const a=await boot({mobile:true});const canvas=a.elements.get('scene').children[0],before=a.engine.snapshot();let prevented=false;
 canvas.dispatch('webglcontextlost',{preventDefault(){prevented=true;}});assert(prevented);assert.equal(a.elements.get('loading').hidden,false);
 canvas.dispatch('webglcontextrestored');assert.equal(a.elements.get('loading').hidden,true);
 const after=a.engine.snapshot();assert.equal(after.id,before.id);assert.equal(after.epoch,before.epoch);assert.deepEqual(after.camera,before.camera);
 a.frame(.04);assert.equal(a.engine.telemetry().valid,true);
});
test('solar pointer drag, pinch and cancellation change only camera controls',async()=>{
 const a=await boot({mobile:true}),v=a.elements.get('scene'),before=a.engine.snapshot();
 v.dispatch('pointerdown',{pointerId:1,clientX:100,clientY:100});v.dispatch('pointermove',{pointerId:1,clientX:140,clientY:120});v.dispatch('pointercancel',{pointerId:1,type:'pointercancel'});
 const dragged=a.engine.snapshot();assert.notDeepEqual(dragged.camera.slice(0,2),before.camera.slice(0,2));assert.equal(dragged.id,before.id);
 v.dispatch('pointerdown',{pointerId:1,clientX:100,clientY:100});v.dispatch('pointerdown',{pointerId:2,clientX:200,clientY:100});
 v.dispatch('pointermove',{pointerId:2,clientX:220,clientY:100});v.dispatch('pointermove',{pointerId:2,clientX:280,clientY:100});
 assert(a.engine.snapshot().camera[2]<dragged.camera[2]);v.dispatch('pointercancel',{pointerId:1,type:'pointercancel'});v.dispatch('pointercancel',{pointerId:2,type:'pointercancel'});
 const after=a.engine.snapshot();v.dispatch('pointermove',{pointerId:2,clientX:600,clientY:500});assert.deepEqual(a.engine.snapshot().camera,after.camera);
 assert.equal(a.engine.telemetry().valid,true);
});

test('slow upstream timeouts cannot undo retry fairness after cooldown expiry',async()=>{
 const a=await boot({perBody:true,failures:new Set([599,501,502]),failureSeconds:55});
 a.advanceWall(91);a.frame(.04);for(let i=0;i<8;i++)await flush();
 assert(a.fetchRequests.includes('/api/ephemeris?id=899'),'a healthy outer planet must not be starved by repeated slow failures');
});

test('presentation telemetry preserves heliocentric distance for a selected moon and explicit playback state',async()=>{
 const app=await boot();app.select(301);app.frame(.04);const moon=app.engine.telemetry();
 assert.equal(moon.id,301);assert(moon.distanceSun>AU,'Moon card uses heliocentric distance, not Earth-relative range');assert.equal(moon.clockState,'live');
 app.elements.get('pause').onclick();assert.equal(app.engine.telemetry().clockState,'paused');
 app.elements.get('speed').onchange({target:{value:'60'}});assert.equal(app.engine.telemetry().clockState,'playback');
});

test('drag follows the finger vertically and horizontally while clamp preserves camera poles',async()=>{
 const a=await boot({mobile:true}),v=a.elements.get('scene');a.engine.restore({kind:'solar',id:399,camera:[0,Math.PI/2,5]});for(let i=0;i<45;i++)a.frame(.04);
 const point=new THREE.Vector3(0,0,1),before=point.clone().project(a.camera);
 v.dispatch('pointerdown',{pointerId:1,clientX:100,clientY:100});v.dispatch('pointermove',{pointerId:1,clientX:140,clientY:60});for(let i=0;i<45;i++)a.frame(.04);
 const after=point.clone().project(a.camera);assert(after.y>before.y,'drag up moves the visible surface up');assert(after.x>before.x,'drag right moves the visible surface right');
 v.dispatch('pointermove',{pointerId:1,clientX:140,clientY:-10000});assert(a.engine.snapshot().camera[1]<Math.PI);v.dispatch('pointercancel',{pointerId:1,type:'pointercancel'});
});
test('science state composes moon vectors in a common heliocentric frame and expires safely',async()=>{
 const a=await boot(),snapshot=a.engine.science(),earth=snapshot.rows.find(b=>b.id===399),moon=snapshot.rows.find(b=>b.id===301);assert(earth.valid&&moon.valid);assert(Math.abs(moon.position[0]-earth.position[0]-384400)<1);assert(moon.velocity.every(Number.isFinite));
 a.elements.get('science-dialog').open=true;const count=a.renders.length;for(let i=0;i<240;i++)a.frame(1/120);assert(a.renders.length-count<=2,'atlas obscures the canvas and caps its work');
 a.advanceWall(8000);a.frame(1.1);assert(a.engine.science().rows.every(b=>!b.valid));
});
