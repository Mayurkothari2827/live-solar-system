// Real Three.js geometry with a mocked renderer/DOM; this is not visual browser QA.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const THREE=require(path.join(ROOT,'assets/three.min.js'));
const html=fs.readFileSync(path.join(ROOT,'city.html'),'utf8');
const script=fs.readFileSync(path.join(ROOT,'city.js'),'utf8');
const map=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/bikaner.json'),'utf8'));
const NOW=Date.parse('2026-09-28T06:30:00Z');

class Element {
 constructor(){
  this.children=[];this.style={};this.dataset={};this.checked=false;this.hidden=false;
  this.disabled=false;this.clientWidth=1440;this.clientHeight=900;this.value='';this._text='';
  const classes=new Set();this.classList={add(...s){s.forEach(x=>classes.add(x));},remove(...s){s.forEach(x=>classes.delete(x));},contains:s=>classes.has(s),toggle(s,force){const active=force??!classes.has(s);if(active)classes.add(s);else classes.delete(s);return active;}};
 }
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(c=>c.textContent||'').join('');}
 append(...children){this.children.push(...children);}appendChild(child){this.append(child);}
 replaceChildren(...children){this._text='';this.children=children;}
 setAttribute(name,value){this[name]=value;}addEventListener(){}setPointerCapture(){}
 querySelector(){return this.svg||(this.svg=new Element());}
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

async function boot({offline=false,cached=null,reduced=false,data=weatherFixture()}={}){
 const elements=new Map();
 for(const match of html.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)){
  const element=new Element();element.checked=/\bchecked\b/.test(match[0]);element.hidden=/\bhidden\b/.test(match[0]);elements.set(match[1],element);
 }
 const buttons=[];
 for(const match of html.matchAll(/<button\s+data-(mood|camera)="([^"]+)"[^>]*>/g)){const element=new Element();element.dataset[match[1]]=match[2];buttons.push(element);}
 const document={hidden:false,getElementById:id=>elements.get(id),createElement:()=>new Element(),createTextNode:text=>{const node=new Element();node.textContent=text;return node;},querySelectorAll:selector=>buttons.filter(b=>selector.includes('mood')?b.dataset.mood:b.dataset.camera)};
 const frames=[],intervals=[],storage=new Map();
 if(cached)storage.set('bikaner-weather-v1',JSON.stringify({saved:NOW-1000,data:cached}));
 let rendered=null,clock=NOW;
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 const three={...THREE,WebGLRenderer:class {
  constructor(){this.domElement=new Element();this.capabilities={getMaxAnisotropy:()=>8};this.shadowMap={};}
  setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld();rendered={scene,camera};}
 }};
 const requests=[];
 const context={window:{THREE:three},document,console,devicePixelRatio:1,performance:{now:()=>0},matchMedia:()=>({matches:reduced}),ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},URLSearchParams,AbortSignal,Float32Array,Date:FixedDate,Math,Map,Set,requestAnimationFrame:fn=>frames.push(fn),setInterval:fn=>intervals.push(fn),fetch:async url=>{
  requests.push(String(url));
  if(url==='/assets/bikaner.json')return {ok:true,json:async()=>structuredClone(map)};
  if(offline)throw new Error('Network unavailable');
  return {ok:true,json:async()=>structuredClone(data)};
 }};
 vm.createContext(context);vm.runInContext(script,context,{filename:'city.js'});
 for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));
 let elapsed=0;
 function frame(seconds=.05){elapsed+=seconds*1000;const callback=frames.shift();assert(callback,'animation frame is scheduled');callback(elapsed);}
 frame();
 return {elements,buttons,requests,storage,frame,intervals,advance:seconds=>clock+=seconds*1000,get rendered(){return rendered;},mood(name){buttons.find(b=>b.dataset.mood===name).onclick();frame();},camera(name){buttons.find(b=>b.dataset.camera===name).onclick();frame();}};
}

function sceneParts(app){
 const scene=app.rendered.scene,city=scene.children.find(x=>x.isGroup);
 return {scene,city,sky:scene.children.find(x=>x.material?.isShaderMaterial),rain:scene.children.find(x=>x.isLineSegments),walls:city.children.find(x=>x.isMesh&&x.material.vertexColors&&x.material.map)};
}

test('actual Bikaner geometry loads at the correct east/north coordinates',async()=>{
 const app=await boot(),{city,walls}=sceneParts(app);
 assert(app.elements.get('map-loading').hidden);
 assert.match(app.elements.get('map-coverage').textContent,/1,948 mapped buildings/);
 assert(city.children.length>5);assert(walls.geometry.attributes.position.count>10000);
 const coords=map.buildings.flatMap(b=>b.coordinates).map(([lon,lat])=>[(lon-73.3180)*111320*Math.cos(28.0229*Math.PI/180),-(lat-28.0229)*111320]);
 walls.geometry.computeBoundingBox();
 assert(Math.abs(walls.geometry.boundingBox.min.x-Math.min(...coords.map(p=>p[0])))<.01);
 assert(Math.abs(walls.geometry.boundingBox.max.z-Math.max(...coords.map(p=>p[1])))<.01);
 assert.equal(app.elements.get('hourly-forecast').children.length,12);
 assert.equal(app.elements.get('weather-status').textContent,'LIVE MODEL');
 const requested=new URL(app.requests.find(url=>url.startsWith('https://')));
 assert.equal(requested.searchParams.get('latitude'),'28.0229');
 assert.equal(requested.searchParams.get('longitude'),'73.318');
});

test('wall normals agree with triangle winding so city sunlight faces correctly',async()=>{
 const app=await boot(),{walls}=sceneParts(app),position=walls.geometry.attributes.position,normal=walls.geometry.attributes.normal;
 const a=new THREE.Vector3(),b=a.clone(),c=a.clone(),n=a.clone();let checked=0;
 for(let i=0;i<position.count;i+=3){
  a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
  b.sub(a);c.sub(a);b.cross(c);if(b.length()<1e-6)continue;
  n.fromBufferAttribute(normal,i);assert(b.normalize().dot(n)>.99,`inverted wall normal at triangle ${i/3}`);checked++;
 }
 assert(checked>10000);
});

test('weather moods update effects without changing live weather readings',async()=>{
 const app=await boot(),{sky,rain}=sceneParts(app),temperature=app.elements.get('temperature').textContent;
 app.mood('rain');assert.equal(sky.material.uniforms.cloud.value,1);assert(rain.geometry.drawRange.count>0);assert(rain.geometry.attributes.position.array.some(v=>v!==0));
 assert.equal(app.elements.get('temperature').textContent,temperature);assert.equal(app.elements.get('preview-notice').hidden,false);
 app.mood('night');assert(sky.material.uniforms.night.value>.9);assert.equal(rain.geometry.drawRange.count,0);
 app.mood('live');assert.equal(app.elements.get('preview-notice').hidden,true);assert.equal(sky.material.uniforms.cloud.value,.27);
 app.elements.get('weather-effects').checked=false;app.elements.get('weather-effects').onchange();app.frame();
 assert.equal(sky.material.uniforms.cloud.value,0);assert.equal(rain.geometry.drawRange.count,0);
});

test('weather outage preserves map access and labels cached data stale',async()=>{
 const app=await boot({offline:true,cached:weatherFixture(3600)});
 assert(app.elements.get('map-loading').hidden);assert.equal(app.elements.get('temperature').textContent,'34');
 assert.equal(app.elements.get('weather-status').textContent,'CACHED / STALE');assert(app.elements.get('weather-status').classList.contains('stale'));
 assert.match(app.elements.get('weather-message').textContent,/could not be verified/);
 assert.equal(app.elements.get('refresh-weather').disabled,false);
});

test('weather outage without cache reports unavailable without invented readings',async()=>{
 const app=await boot({offline:true});
 assert(app.elements.get('map-loading').hidden);assert.equal(app.elements.get('weather-status').textContent,'UNAVAILABLE');
 assert.equal(app.elements.get('condition').textContent,'Weather unavailable');assert(!/\d/.test(app.elements.get('temperature').textContent));
 assert.equal(sceneParts(app).rain.geometry.drawRange.count,0);
});

test('old successful weather responses are explicitly stale',async()=>{
 const app=await boot({data:weatherFixture(3*3600)});
 assert.equal(app.elements.get('weather-status').textContent,'CACHED / STALE');
});

test('reduced motion freezes sky animation and suppresses automatic orbit',async()=>{
 const app=await boot({reduced:true});app.elements.get('auto-orbit').checked=true;app.frame();
 const position=app.rendered.camera.position.clone();for(let i=0;i<20;i++)app.frame();
 assert(app.rendered.camera.position.distanceTo(position)<1e-9);
 assert.equal(sceneParts(app).sky.material.uniforms.time.value,0);
 app.camera('aerial');assert(app.rendered.camera.position.distanceTo(position)>1000);
});

test('static build contains every city route and asset without Python sources',()=>{
 execFileSync('python3',['build_static.py'],{cwd:ROOT,stdio:'pipe'});
 for(const name of ['city.html','city.js','city.css','assets/bikaner.json','assets/three.min.js'])assert(fs.existsSync(path.join(ROOT,'public',name)),name);
 assert(!fs.existsSync(path.join(ROOT,'public/server.py')));
 assert(!fs.existsSync(path.join(ROOT,'public/kernels')));
});
