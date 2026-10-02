// Real Three.js geometry with a mocked renderer, texture decoder, and DOM.
// These checks cover runtime behavior and georeferencing, not visual browser QA.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const THREE=require(path.join(ROOT,'assets/three.min.js'));
const readJSON=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const html=fs.readFileSync(path.join(ROOT,'city.html'),'utf8');
const map=readJSON('assets/bikaner.json'),dense=readJSON('assets/bikaner-buildings.json');
const imagery=readJSON('assets/bikaner-imagery/metadata.json');
const materials=readJSON('assets/city-materials/credits.json');
const NOW=Date.parse('2026-10-02T06:30:00Z');
const coords=([lon,lat])=>[(lon-73.3180)*111320*Math.cos(28.0229*Math.PI/180),-(lat-28.0229)*111320];
const geographic=([x,z])=>[73.3180+x/(111320*Math.cos(28.0229*Math.PI/180)),28.0229-z/111320];
const distance=feature=>{const p=coords(feature.coordinates[0]);return p[0]**2+p[1]**2;};
// Most checks use real central Bikaner outlines and roads, keeping tests fast.
const smallMap={...map,buildings:[...map.buildings].sort((a,b)=>distance(a)-distance(b)).slice(0,32),roads:[...map.roads].sort((a,b)=>distance(a)-distance(b)).slice(0,48),areas:map.areas.slice(0,2),landmarks:map.landmarks.slice(0,4)};
const smallDense={...dense,buildings:[...dense.buildings].sort((a,b)=>distance(a)-distance(b)).slice(0,96)};

class EventTarget {
 constructor(){this.events=new Map();}
 addEventListener(type,listener){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(listener);}
 dispatch(type,event={}){event.type=type;event.target??=this;event.preventDefault??=()=>{};for(const listener of this.events.get(type)||[])listener(event);this['on'+type]?.(event);}
}
class Element extends EventTarget {
 constructor(tagName='DIV'){
  super();this.tagName=tagName.toUpperCase();this.children=[];this.style={};this.dataset={};this.checked=false;this.hidden=false;
  this.disabled=false;this.clientWidth=1440;this.clientHeight=900;this.value='';this._text='';
  const classes=new Set();this.classList={add(...s){s.forEach(x=>classes.add(x));},remove(...s){s.forEach(x=>classes.delete(x));},contains:s=>classes.has(s),toggle(s,force){const active=force??!classes.has(s);if(active)classes.add(s);else classes.delete(s);return active;}};
 }
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(c=>c.textContent||'').join('');}
 append(...children){this.children.push(...children);}appendChild(child){this.append(child);}
 replaceChildren(...children){this._text='';this.children=children;}
 setAttribute(name,value){this[name]=value;}setPointerCapture(){}
 querySelector(){return this.svg||(this.svg=new Element('svg'));}
 getContext(){return {fillRect(){},drawImage(){},createRadialGradient(){return {addColorStop(){}};}};}
}

function weatherFixture(age=0){
 const time=NOW/1000-age;
 return {
  current:{time,temperature_2m:34.2,apparent_temperature:35.1,weather_code:2,is_day:1,cloud_cover:27,precipitation:0,wind_speed_10m:18,wind_direction_10m:90,relative_humidity_2m:40,visibility:25000},
  daily:{sunrise:[NOW/1000-19000],sunset:[NOW/1000+24000]},
  hourly:{time:Array.from({length:24},(_,i)=>NOW/1000+i*3600),temperature_2m:Array(24).fill(34),weather_code:Array(24).fill(2),is_day:Array(24).fill(1),precipitation_probability:Array(24).fill(10)}
 };
}

async function boot({offline=false,cached=null,reduced=false,data=weatherFixture(),mapFixture=smallMap,denseFixture=smallDense,missingResources=[],failedTextures=[]}={}){
 const elements=new Map();
 for(const match of html.matchAll(/<([\w-]+)[^>]+id="([^"]+)"[^>]*>/g)){
  const element=new Element(match[1]);element.checked=/\bchecked\b/.test(match[0]);element.hidden=/\bhidden\b/.test(match[0]);elements.set(match[2],element);
 }
 const buttons=[];
 for(const match of html.matchAll(/<button\s+data-(mood|camera|walk)="([^"]+)"[^>]*>/g)){const element=new Element('button');element.dataset[match[1]]=match[2];buttons.push(element);}
 const document={hidden:false,body:new Element('body'),documentElement:new Element('html'),getElementById:id=>elements.get(id),createElement:tag=>new Element(tag),createTextNode:text=>{const node=new Element();node.textContent=text;return node;},querySelectorAll:selector=>{const key=selector.match(/data-(\w+)/)?.[1];return buttons.filter(b=>b.dataset[key]);}};
 document.documentElement.requestFullscreen=async()=>{document.fullscreenElement=document.documentElement;};document.exitFullscreen=()=>{document.fullscreenElement=null;};
 const frames=[],intervals=[],storage=new Map(),requests=[],textureRequests=[],warnings=[],errors=[];
 if(cached)storage.set('bikaner-weather-v1',JSON.stringify({saved:NOW-1000,data:cached}));
 let rendered=null,clock=NOW;
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 const three={...THREE,TextureLoader:class {
  async loadAsync(url){textureRequests.push(url);if(failedTextures.includes(url))throw new Error('Texture unavailable');
   assert(fs.existsSync(path.join(ROOT,url)),`Referenced texture exists: ${url}`);
   const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.name=url;texture.flipY=true;return texture;
  }
 },WebGLRenderer:class {
  constructor(){this.domElement=new Element('canvas');this.capabilities={getMaxAnisotropy:()=>8};this.shadowMap={};}
  setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld();rendered={scene,camera};}
 }};
 const window=new EventTarget();window.THREE=three;window.innerWidth=1440;
 const assets=new Map([['/assets/bikaner.json',mapFixture],['/assets/bikaner-buildings.json',denseFixture],['/assets/bikaner-imagery/metadata.json',imagery],['/assets/city-materials/credits.json',materials]]);
 const context={window,document,console:{log(){},warn:(...args)=>warnings.push(args),error:(...args)=>errors.push(args)},devicePixelRatio:1,performance:{now:()=>0},matchMedia:()=>({matches:reduced}),ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},URLSearchParams,AbortSignal,Float32Array,Date:FixedDate,Math,Map,Set,requestAnimationFrame:fn=>frames.push(fn),setInterval:fn=>intervals.push(fn),fetch:async url=>{
  requests.push(String(url));
  if(assets.has(url))return {ok:!missingResources.includes(url)&&assets.get(url)!=null,status:404,json:async()=>structuredClone(assets.get(url))};
  assert(String(url).startsWith('https://api.open-meteo.com/v1/forecast?'),`Unexpected request: ${url}`);
  if(offline)throw new Error('Network unavailable');
  return {ok:true,json:async()=>structuredClone(data)};
 }};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,'city.js'),'utf8'),context,{filename:'city.js'});
 for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
 let elapsed=0;
 function frame(seconds=.05){elapsed+=seconds*1000;const callback=frames.shift();assert(callback,'animation frame is scheduled');callback(elapsed);}
 frame();
 return {elements,buttons,requests,textureRequests,storage,document,window,warnings,errors,frame,intervals,advance:seconds=>clock+=seconds*1000,get rendered(){return rendered;},mood(name){buttons.find(b=>b.dataset.mood===name).onclick();frame();},camera(name){buttons.find(b=>b.dataset.camera===name).onclick();frame();},key(code,down=true){window.dispatch(down?'keydown':'keyup',{code,target:document.body});}};
}

function sceneParts(app){
 const scene=app.rendered.scene,city=scene.children.find(x=>x.isGroup);
 const walls=city.children.filter(x=>x.isMesh&&x.material.vertexColors&&String(x.material.onBeforeCompile).includes('cityUv'));
 return {scene,city,sky:scene.children.find(x=>x.material?.isShaderMaterial),rain:scene.children.find(x=>x.isLineSegments),walls};
}
function checkWallNormals(walls){
 const a=new THREE.Vector3(),b=a.clone(),c=a.clone(),n=a.clone();let checked=0;
 for(const mesh of walls){const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
  for(let i=0;i<position.count;i+=3){a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);b.sub(a);c.sub(a);b.cross(c);if(b.length()<1e-6)continue;n.fromBufferAttribute(normal,i);assert(b.normalize().dot(n)>.99,`inverted wall normal at triangle ${i/3}`);checked++;}
 }
 return checked;
}

test('all 38,801 real building footprints load in bounded batches at correct east/north coordinates',async()=>{
 const app=await boot({mapFixture:map,denseFixture:dense}),{city,walls}=sceneParts(app);
 assert(app.elements.get('map-loading').hidden);assert.equal(app.errors.length,0);
 assert.match(app.elements.get('map-coverage').textContent,/38,801 mapped buildings \(Overture Maps\)/);
 assert(walls.length>=100&&walls.length<=250,'building batches must be spatially culled without creating excessive draw calls');assert(city.children.length>100);
 const bounds=new THREE.Box3(),expected=new THREE.Box3(),heights=new Set();let vertices=0,expectedVertices=0;
 for(const b of dense.buildings){for(const contour of [b.coordinates,...(b.holes||[])]){const points=contour.map(coords);if(points.at(-1)[0]===points[0][0]&&points.at(-1)[1]===points[0][1])points.pop();expectedVertices+=points.filter((p,i)=>Math.hypot(p[0]-points[(i+1)%points.length][0],p[1]-points[(i+1)%points.length][1])>0).length*6;for(const [x,z] of points)expected.expandByPoint(new THREE.Vector3(x,0,z));}}
 for(const wall of walls){const p=wall.geometry.attributes.position;assert(p.count<150000);vertices+=p.count;wall.geometry.computeBoundingBox();bounds.union(wall.geometry.boundingBox);for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));if(p.getY(i)>0)heights.add(p.getY(i).toFixed(2));}}
 assert.equal(vertices,expectedVertices,'every footprint edge is retained through batch flushes');assert(vertices>900000);assert(heights.size>100);
 for(const dimension of ['x','z']){assert(Math.abs(bounds.min[dimension]-expected.min[dimension])<.01);assert(Math.abs(bounds.max[dimension]-expected.max[dimension])<.01);}
 assert(checkWallNormals(walls)>300000);
 assert.equal(app.elements.get('hourly-forecast').children.length,12);assert.equal(app.elements.get('weather-status').textContent,'LIVE MODEL');
 const requested=new URL(app.requests.find(url=>url.startsWith('https://')));assert.equal(requested.searchParams.get('latitude'),'28.0229');assert.equal(requested.searchParams.get('longitude'),'73.318');
});

test('scanned materials load with color maps in sRGB and data maps in linear space',async()=>{
 const app=await boot(),{walls}=sceneParts(app),wall=walls[0].material;
 assert.equal(app.errors.length,0);assert.equal(app.textureRequests.filter(p=>p.startsWith('/assets/city-materials/')).length,9);
 assert.match(wall.map.name,/beige_wall_002_diff/);assert.equal(wall.map.colorSpace,THREE.SRGBColorSpace);assert.equal(wall.normalMap.colorSpace,THREE.NoColorSpace);assert.equal(wall.roughnessMap.colorSpace,THREE.NoColorSpace);assert.equal(wall.map.wrapS,THREE.RepeatWrapping);assert.equal(wall.map.anisotropy,8);
 for(const texture of [wall.map,wall.normalMap,wall.roughnessMap]){assert.equal(texture.repeat.x,.375,'a 4.5 m façade segment uses 12 m-wide plaster tiles');assert.equal(texture.repeat.y,3.2/3,'3.2 m floors use 3 m-high plaster tiles');}
});

test('satellite crops use metadata bounds with north at the top and east at the right',async()=>{
 const app=await boot(),{scene}=sceneParts(app);
 const crops=scene.children.filter(o=>o.isMesh&&o.material.map?.name.startsWith('/assets/bikaner-imagery/'));
 assert.equal(crops.length,imagery.images.length);assert.equal(imagery.isLive,false);assert.match(app.elements.get('imagery-credit').textContent,/2025 annual mosaic/);
 for(const image of imagery.images){const mesh=crops.find(m=>m.material.map.name.endsWith(image.file));assert(mesh,image.file);const [w,s,e,n]=image.boundsWGS84,sw=coords([w,s]),ne=coords([e,n]),p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
  mesh.updateMatrixWorld();const vertex=new THREE.Vector3();let verified=0;
  for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const u=uv.getX(i),v=uv.getY(i);if(u===0&&v===1){assert(Math.abs(vertex.x-sw[0])<.01);assert(Math.abs(vertex.z-ne[1])<.01);verified++;}if(u===1&&v===0){assert(Math.abs(vertex.x-ne[0])<.01);assert(Math.abs(vertex.z-sw[1])<.01);verified++;}}
  assert.equal(verified,2);assert(mesh.material.map.flipY,'standard TextureLoader orientation remains north-up');
 }
});

test('walking uses a 1.72 m eye height, blocks buildings, and releases keyboard/touch movement',async()=>{
 const rectangle=[[-4,-4],[4,-4],[4,4],[-4,4],[-4,-4]].map(geographic);
 const fixture={...smallMap,buildings:[{id:'collision-fixture',coordinates:rectangle,height:4}],areas:[],landmarks:[],roads:[{kind:'residential',coordinates:[[0,8],[0,8]].map(geographic)}]};
 const app=await boot({mapFixture:fixture,denseFixture:null});app.camera('street');
 assert.equal(app.rendered.camera.position.y,1.72);assert(app.document.body.classList.contains('walking'));assert.equal(app.elements.get('walk-controls').hidden,false);assert.equal(app.rendered.camera.fov,72);
 const initial=app.rendered.camera.position.clone();app.key('KeyW');for(let i=0;i<80;i++)app.frame(.1);app.key('KeyW',false);
 const stopped=app.rendered.camera.position.clone();assert(stopped.z<initial.z-3);assert(stopped.z>=4&&stopped.z<4.18,'walking must stop outside the mapped building footprint');assert.equal(stopped.y,1.72);
 app.key('KeyS');for(let i=0;i<10;i++)app.frame(.1);app.key('KeyS',false);assert(Math.abs(app.rendered.camera.position.z-stopped.z-1.7)<1e-6);
 app.key('KeyS');app.window.dispatch('blur');const paused=app.rendered.camera.position.clone();app.frame(.1);assert(app.rendered.camera.position.distanceTo(paused)<1e-9);
 const touch=app.buttons.find(b=>b.dataset.walk==='KeyS');touch.dispatch('pointerdown',{pointerId:1});app.frame(.1);assert(app.rendered.camera.position.z>paused.z);touch.dispatch('pointercancel',{pointerId:1});const released=app.rendered.camera.position.clone();app.frame(.1);assert(app.rendered.camera.position.distanceTo(released)<1e-9);
 app.elements.get('reset-view').onclick();app.frame();assert(app.rendered.camera.position.distanceTo(initial)<1e-9);
 app.camera('aerial');assert(!app.document.body.classList.contains('walking'));assert(app.elements.get('walk-controls').hidden);assert(app.rendered.camera.position.y>1.72);
});

test('immersive toggle and Escape restore panels; fullscreen can be entered and exited',async()=>{
 const app=await boot();app.elements.get('immersive').onclick();assert(app.document.body.classList.contains('immersive'));assert.equal(app.elements.get('immersive').textContent,'Show panels');
 app.key('Escape');assert(!app.document.body.classList.contains('immersive'));assert.equal(app.elements.get('immersive').textContent,'Hide panels');
 await app.elements.get('fullscreen').onclick();assert.equal(app.document.fullscreenElement,app.document.documentElement);app.elements.get('fullscreen').onclick();assert.equal(app.document.fullscreenElement,null);
});

test('walking cannot cross the fort perimeter walls',async()=>{
 const rectangle=[[-4,-4],[4,-4],[4,4],[-4,4],[-4,-4]].map(geographic);
 const fixture={...smallMap,buildings:[],areas:[{id:'fort-collision',kind:'fort',tags:{barrier:'city_wall'},coordinates:rectangle}],landmarks:[],roads:[{kind:'residential',coordinates:[[0,8],[0,8]].map(geographic)}]};
 const app=await boot({mapFixture:fixture,denseFixture:null});app.camera('street');app.key('KeyW');for(let i=0;i<40;i++)app.frame(.1);app.key('KeyW',false);
 assert(app.rendered.camera.position.z>=6.2&&app.rendered.camera.position.z<6.38,'eye position must stop clear of the 3.8 m-thick fort wall');assert.equal(app.rendered.camera.position.y,1.72);
});

test('façade shader matches bundled standard shader chunks and night preview changes its light uniform',async()=>{
 const app=await boot(),wall=sceneParts(app).walls[0].material;
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};wall.onBeforeCompile(shader);
 const expand=source=>source.replace(/#include <([\w\d_]+)>/g,(_,name)=>{assert(name in THREE.ShaderChunk,`missing bundled shader chunk ${name}`);return expand(THREE.ShaderChunk[name]);});
 const vertex=expand(shader.vertexShader),fragment=expand(shader.fragmentShader);
 assert.match(vertex,/varying vec2 cityUv;/);assert.match(fragment,/varying vec2 cityUv;/);assert.match(vertex,/cityWorld=\(modelMatrix/);assert.match(fragment,/totalEmissiveRadiance\+=/);assert(fragment.indexOf('float windowMask=')<fragment.indexOf('totalEmissiveRadiance+='));
 assert(shader.uniforms.cityNight.value<.05);app.mood('night');assert(shader.uniforms.cityNight.value>.9);
});

test('weather moods update effects without changing live weather readings',async()=>{
 const app=await boot(),{sky,rain}=sceneParts(app),temperature=app.elements.get('temperature').textContent;
 app.mood('rain');assert.equal(sky.material.uniforms.cloud.value,1);assert(rain.geometry.drawRange.count>0);assert(rain.geometry.attributes.position.array.some(v=>v!==0));assert.equal(app.elements.get('temperature').textContent,temperature);assert.equal(app.elements.get('preview-notice').hidden,false);
 app.mood('night');assert(sky.material.uniforms.night.value>.9);assert.equal(rain.geometry.drawRange.count,0);
 app.mood('live');assert.equal(app.elements.get('preview-notice').hidden,true);assert.equal(sky.material.uniforms.cloud.value,.27);
 app.elements.get('weather-effects').checked=false;app.elements.get('weather-effects').onchange();app.frame();assert.equal(sky.material.uniforms.cloud.value,0);assert.equal(rain.geometry.drawRange.count,0);
});

test('missing optional dense footprints, imagery, and scanned textures preserve usable OSM geometry',async()=>{
 const app=await boot({offline:true,missingResources:['/assets/bikaner-buildings.json','/assets/bikaner-imagery/metadata.json','/assets/city-materials/credits.json']});
 assert(app.elements.get('map-loading').hidden);assert.equal(app.errors.length,0);assert.match(app.elements.get('map-coverage').textContent,/32 mapped buildings \(OpenStreetMap\)/);assert.match(app.elements.get('imagery-credit').textContent,/unavailable/);assert(sceneParts(app).walls[0].geometry.attributes.position.count>0);app.camera('street');assert.equal(app.rendered.camera.position.y,1.72);
});

test('individual scanned-texture failures keep the procedural façade fallback',async()=>{
 const app=await boot({failedTextures:['/assets/city-materials/'+materials.materials.wall.diffuse]});const wall=sceneParts(app).walls[0].material;
 assert(wall.map.isCanvasTexture);assert(app.warnings.length>0);assert(app.elements.get('map-loading').hidden);
});

test('weather outage preserves map access and labels cached data stale',async()=>{
 const app=await boot({offline:true,cached:weatherFixture(3600)});
 assert(app.elements.get('map-loading').hidden);assert.equal(app.elements.get('temperature').textContent,'34');assert.equal(app.elements.get('weather-status').textContent,'CACHED / STALE');assert(app.elements.get('weather-status').classList.contains('stale'));assert.match(app.elements.get('weather-message').textContent,/could not be verified/);assert.equal(app.elements.get('refresh-weather').disabled,false);
});

test('weather outage without cache reports unavailable without invented readings',async()=>{
 const app=await boot({offline:true});assert(app.elements.get('map-loading').hidden);assert.equal(app.elements.get('weather-status').textContent,'UNAVAILABLE');assert.equal(app.elements.get('condition').textContent,'Weather unavailable');assert(!/\d/.test(app.elements.get('temperature').textContent));assert.equal(sceneParts(app).rain.geometry.drawRange.count,0);
});

test('old successful weather responses are explicitly stale',async()=>{const app=await boot({data:weatherFixture(3*3600)});assert.equal(app.elements.get('weather-status').textContent,'CACHED / STALE');});

test('partial hourly forecast leaves valid current conditions usable',async()=>{
 const data=weatherFixture();data.hourly={time:data.hourly.time};const app=await boot({data});assert.equal(app.elements.get('weather-status').textContent,'LIVE MODEL');assert.equal(app.elements.get('temperature').textContent,'34');assert.equal(app.elements.get('hourly-forecast').children.length,12);assert.equal(app.elements.get('refresh-weather').disabled,false);
});

test('reduced motion freezes sky animation and suppresses automatic orbit',async()=>{
 const app=await boot({reduced:true});app.elements.get('auto-orbit').checked=true;app.frame();const position=app.rendered.camera.position.clone();for(let i=0;i<20;i++)app.frame();assert(app.rendered.camera.position.distanceTo(position)<1e-9);assert.equal(sceneParts(app).sky.material.uniforms.time.value,0);app.camera('aerial');assert(app.rendered.camera.position.distanceTo(position)>1000);
});

test('static build includes city routes, dense footprints, imagery, and textures without Python sources',()=>{
 execFileSync('python3',['build_static.py'],{cwd:ROOT,stdio:'pipe',timeout:30000});
 for(const name of ['city.html','city.js','city.css','assets/bikaner.json','assets/bikaner-buildings.json','assets/three.min.js','assets/bikaner-imagery/metadata.json','assets/city-materials/credits.json',...imagery.images.map(i=>'assets/bikaner-imagery/'+i.file),...Object.values(materials.materials).flatMap(m=>['diffuse','normal','roughness'].map(k=>'assets/city-materials/'+m[k]))])assert(fs.existsSync(path.join(ROOT,'public',name)),name);
 assert(!fs.existsSync(path.join(ROOT,'public/server.py')));assert(!fs.existsSync(path.join(ROOT,'public/kernels')));
});
