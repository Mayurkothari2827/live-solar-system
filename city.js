/* Bikaner: real OpenStreetMap geometry with a live Open-Meteo atmosphere. */
(() => {
'use strict';
const $=id=>document.getElementById(id),T=window.THREE,rad=Math.PI/180;
const location={lat:28.0229,lon:73.3180},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const formatTime=t=>new Date(t*1000).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let weather=null,weatherFailure=false,mood='live',lastWeatherFetch=0,weatherPending=false,renderWeather=()=>{};
const weatherNames={0:'Clear skies',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Rain showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Thunderstorm with hail'};
const icon=(code,day=true)=>code>=95?'ϟ':code>=71&&code<=77||code>=85&&code<=86?'❄':code>=51?'☂':code>=45?'≋':code>=2?'☁':day?'☀':'☾';
const bearing=degrees=>['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees/45)%8];
const value=(n,suffix='',digits=0)=>Number.isFinite(n)?n.toFixed(digits)+suffix:'—';
function updateWeatherUI(){
 $('local-clock').textContent=formatTime(Date.now()/1000);
 if(!weather)return;
 const c=weather.current,age=Date.now()/1000-c.time,stale=age>7200||age< -900||weatherFailure;
 $('temperature').textContent=value(c.temperature_2m);$('condition').textContent=weatherNames[c.weather_code]||'Weather conditions';$('weather-icon').textContent=icon(c.weather_code,c.is_day);
 $('feels-like').textContent=`Feels like ${value(c.apparent_temperature,'°')} · model estimate`;
 $('wind').textContent=`${value(c.wind_speed_10m,' km/h')} ${Number.isFinite(c.wind_direction_10m)?bearing(c.wind_direction_10m):''}`;
 $('humidity').textContent=value(c.relative_humidity_2m,'%');$('cloud-cover').textContent=value(c.cloud_cover,'%');$('precipitation').textContent=value(c.precipitation,' mm',1);
 $('sunrise').textContent=weather.daily?.sunrise?.[0]?formatTime(weather.daily.sunrise[0]):'—';$('sunset').textContent=weather.daily?.sunset?.[0]?formatTime(weather.daily.sunset[0]):'—';
 const status=$('weather-status');status.replaceChildren(document.createElement('span'),document.createTextNode(stale?'CACHED / STALE':'LIVE MODEL'));status.classList.toggle('stale',stale);
 $('weather-updated').textContent=`Model time ${new Date(c.time*1000).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short'})}, ${formatTime(c.time)} IST`;
 $('weather-message').textContent=stale?'Showing last available conditions. Live weather could not be verified.':'';
 const hourly=$('hourly-forecast');hourly.replaceChildren();
 const h=weather.hourly;
 if(Array.isArray(h?.time)){let first=h.time.findIndex(t=>t>=Date.now()/1000-1800);if(first<0)first=h.time.length;
  for(let i=first;i<Math.min(first+12,h.time.length);i++){const el=document.createElement('div');el.className='hour';
   const time=document.createElement('time');time.textContent=formatTime(h.time[i]);const pict=document.createElement('div');pict.className='forecast-icon';pict.textContent=icon(h.weather_code?.[i],h.is_day?.[i]??true);
   const temp=document.createElement('strong');temp.textContent=value(h.temperature_2m?.[i],'°');const chance=document.createElement('small');chance.textContent=value(h.precipitation_probability?.[i],'% rain');el.append(time,pict,temp,chance);hourly.append(el);
  }
  if(!hourly.children.length){const n=document.createElement('span');n.className='muted';n.textContent='Forecast window has expired.';hourly.append(n);}
 }
 renderWeather();
}
async function fetchWeather(){
 if(weatherPending)return;weatherPending=true;$('refresh-weather').disabled=true;
 const params=new URLSearchParams({latitude:location.lat,longitude:location.lon,current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,visibility',hourly:'temperature_2m,weather_code,precipitation_probability,is_day',daily:'sunrise,sunset',timezone:'Asia/Kolkata',timeformat:'unixtime',forecast_days:'2'});
 try{const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:AbortSignal.timeout(18000)});if(!response.ok)throw new Error('Weather HTTP '+response.status);const data=await response.json();
  if(!Number.isFinite(data.current?.time)||!Number.isFinite(data.current?.temperature_2m)||!Number.isFinite(data.current?.weather_code))throw new Error('Incomplete weather response');
  weather=data;weatherFailure=false;lastWeatherFetch=Date.now();try{localStorage.setItem('bikaner-weather-v1',JSON.stringify({saved:Date.now(),data}));}catch(_){}updateWeatherUI();
 }catch(error){weatherFailure=true;if(weather)updateWeatherUI();else{$('weather-status').textContent='UNAVAILABLE';$('weather-status').classList.add('stale');$('condition').textContent='Weather unavailable';$('weather-message').textContent='Live weather could not be loaded. Retry with ↻. No weather readings are invented.';}renderWeather();}
 finally{weatherPending=false;$('refresh-weather').disabled=false;}
}
try{const saved=JSON.parse(localStorage.getItem('bikaner-weather-v1'));if(saved&&Date.now()-saved.saved<24*3600000&&Number.isFinite(saved.data?.current?.time)){weather=saved.data;weatherFailure=true;updateWeatherUI();}}catch(_){}
$('refresh-weather').onclick=fetchWeather;fetchWeather();setInterval(()=>{updateWeatherUI();if(!document.hidden&&Date.now()-lastWeatherFetch>600000)fetchWeather();},60000);
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{});};
if(!T){$('map-loading-text').textContent='3D renderer unavailable. Weather is still available.';return;}
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('map-loading-text').textContent='WebGL is unavailable on this device. Weather is still available.';return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Aerial 3D map of Bikaner with current weather effects. Drag to orbit, shift-drag to pan, and scroll to zoom.');$('city-scene').append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,2,60000);scene.fog=new T.FogExp2(0xc4c9b0,.000055);
const hemisphere=new T.HemisphereLight(0xc6e5f7,0x9d7950,2.4);scene.add(hemisphere);
const sun=new T.DirectionalLight(0xffe2b1,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-2200;sun.shadow.camera.right=2200;sun.shadow.camera.top=2200;sun.shadow.camera.bottom=-2200;sun.shadow.camera.near=1;sun.shadow.camera.far=10000;sun.shadow.bias=-.00015;sun.shadow.normalBias=1.5;scene.add(sun);scene.add(sun.target);
const city=new T.Group();scene.add(city);
const terrainMaterial=new T.MeshStandardMaterial({color:0xc4a979,roughness:1});
const ground=new T.Mesh(new T.PlaneGeometry(50000,50000),terrainMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.6;ground.receiveShadow=true;scene.add(ground);
let azimuth=-.55,polar=1.03,radius=1900,targetRadius=1900,desiredPolar=polar,desiredAzimuth=azimuth;
const focus=new T.Vector3(0,0,0),targetFocus=focus.clone();let width=1,height=1,labels=[],mapData=null,cameraPreset='fort';
const coords=([lon,lat])=>[(lon-location.lon)*111320*Math.cos(location.lat*rad),-(lat-location.lat)*111320];
function rng(seed){let a=typeof seed==='number'?seed:2166136261; if(typeof seed!=='number')for(const ch of String(seed))a=Math.imul(a^ch.charCodeAt(0),16777619); a>>>=0;return()=>{a=(1664525*a+1013904223)>>>0;return a/4294967296;};}
function makeGrain(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),rand=rng(7318);ctx.fillStyle='#dfcfad';ctx.fillRect(0,0,256,256);for(let i=0;i<8000;i++){const c=rand()>.5?255:65;ctx.fillStyle=`rgba(${c},${c*.92},${c*.75},${rand()*.08})`;ctx.fillRect(rand()*256,rand()*256,1+rand()*2,1+rand()*2);}const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(350,350);texture.colorSpace=T.SRGBColorSpace;return texture;}
terrainMaterial.map=makeGrain();
function facadeTexture(){const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d'),rand=rng(29);x.fillStyle='#e6d3ae';x.fillRect(0,0,128,128);for(let i=0;i<3000;i++){x.fillStyle=`rgba(116,80,48,${rand()*.13})`;x.fillRect(rand()*128,rand()*128,rand()*3+1,1);}x.fillStyle='#bbaa8b';x.fillRect(0,124,128,4);for(const p of [22,83]){x.fillStyle='#eedabd';x.fillRect(p-4,31,28,56);x.fillStyle='#665e4f';x.fillRect(p,35,19,47);x.fillStyle='#898271';x.fillRect(p+2,38,6,40);x.fillStyle='#d9c4a1';x.fillRect(p-5,83,30,5);}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}
const wallMaterial=new T.MeshStandardMaterial({map:facadeTexture(),vertexColors:true,roughness:.92});
const roofMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.95});
const buffers=()=>({p:[],n:[],u:[],c:[]});
function tri(buffer,a,b,c,normal,color,uv=[[0,0],[1,0],[0,1]]){for(const [i,p] of [a,b,c].entries()){buffer.p.push(...p);buffer.n.push(...normal);buffer.u.push(...uv[i]);buffer.c.push(color.r,color.g,color.b);}}
function meshFrom(buffer,material){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(buffer.p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(buffer.n,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(buffer.u,2));geometry.setAttribute('color',new T.Float32BufferAttribute(buffer.c,3));geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;city.add(mesh);return mesh;}
function ring(points){const result=points.map(coords);if(result.length>2&&result[0][0]===result.at(-1)[0]&&result[0][1]===result.at(-1)[1])result.pop();return result.map(([x,z])=>new T.Vector2(x,-z));}
function polygonGeometry(points,holes=[]){const shape=new T.Shape(ring(points));for(const h of holes)shape.holes.push(new T.Path(ring(h)));const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);return g;}
const roofObjects=[];
function addBuildings(buildings){
 const walls=buffers(),roofs=buffers(),trim=buffers();let known=0;
 for(const b of buildings){if(b.coordinates.length<4)continue;const rand=rng(b.id),historic=b.tags?.historic||b.kind==='castle';let h=Number(b.height)||Number(b.levels)*3.2;
  if(h>0)known++;else h=historic?14:5.8+rand()*5.2;h=clamp(h,2.5,150);
  const outer=ring(b.coordinates),holes=(b.holes||[]).map(ring);const all=[...outer,...holes.flat()];if(outer.length<3)continue;
  const col=new T.Color().setHSL(historic?.07:.10+rand()*.035,.20+rand()*.18,.53+rand()*.18),roofColor=col.clone().multiplyScalar(1.10);
  const triangles=T.ShapeUtils.triangulateShape(outer,holes);
  for(const t of triangles){const points=t.map(i=>[all[i].x,h,-all[i].y]);tri(roofs,points[0],points[1],points[2],[0,1,0],roofColor);}
  for(const contour of [outer,...holes]){for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length],dx=b.x-a.x,dz=a.y-b.y,len=Math.hypot(dx,dz);if(!len)continue;const n=[-dz/len,0,dx/len],p=[a.x,0,-a.y],q=[b.x,0,-b.y],r=[b.x,h,-b.y],s=[a.x,h,-a.y],u=len/7,v=h/3.2;
    tri(walls,p,q,r,n,col,[[0,0],[u,0],[u,v]]);tri(walls,p,r,s,n,col,[[0,0],[u,v],[0,v]]);
    // Parapet caps are a rendering detail, not a surveyed architectural feature.
    const top=h+.5,inner=[n[0]*-.4,0,n[2]*-.4];tri(trim,[a.x,h,-a.y],[b.x,h,-b.y],[b.x,top,-b.y],n,roofColor);tri(trim,[a.x,h,-a.y],[b.x,top,-b.y],[a.x,top,-a.y],n,roofColor);
    tri(trim,[a.x,top,-a.y],[b.x,top,-b.y],[b.x+inner[0],top,-b.y+inner[2]],[0,1,0],roofColor);
  }}
  if(outer.length===4&&rand()<.25){const x=outer.reduce((s,v)=>s+v.x,0)/4,z=-outer.reduce((s,v)=>s+v.y,0)/4;roofObjects.push({x,y:h+1,z});}
 }
 // A double-sided wall material also handles inconsistent winding in OSM rings.
 wallMaterial.side=T.DoubleSide;roofMaterial.side=T.DoubleSide;meshFrom(walls,wallMaterial);meshFrom(roofs,roofMaterial);meshFrom(trim,roofMaterial);
 if(roofObjects.length){const tanks=new T.InstancedMesh(new T.CylinderGeometry(.8,.8,1.6,8),new T.MeshStandardMaterial({color:0x494a41,roughness:.8}),roofObjects.length),matrix=new T.Matrix4();roofObjects.forEach((p,i)=>tanks.setMatrixAt(i,matrix.makeTranslation(p.x,p.y,p.z)));tanks.castShadow=true;city.add(tanks);}
 return known;
}
function addRoads(roads){const road=buffers(),lines=buffers(),walk=buffers(),roadColor=new T.Color(0x65685d),lineColor=new T.Color(0xd7ceb1),curbColor=new T.Color(0xbfb69e);
 const widths={motorway:19,trunk:16,primary:13,secondary:10,tertiary:8,residential:5.5,unclassified:5,service:4,living_street:4,pedestrian:4,footway:1.4,path:1.2,track:3,steps:1.5};
 function strip(buffer,a,b,w,y,color){const d=new T.Vector2(b[0]-a[0],b[1]-a[1]),len=d.length();if(!len)return;const x=-d.y/len*w/2,z=d.x/len*w/2;const p=[a[0]+x,y,a[1]+z],q=[b[0]+x,y,b[1]+z],r=[b[0]-x,y,b[1]-z],s=[a[0]-x,y,a[1]-z];tri(buffer,p,q,r,[0,1,0],color);tri(buffer,p,r,s,[0,1,0],color);}
 for(const r of roads){const points=r.coordinates.map(coords),w=widths[r.kind]||5;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];strip(walk,a,b,w+1.8,.03,curbColor);strip(road,a,b,w,.08,roadColor);if(w>=8){const len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<len-3;d+=10){const k=d/len,l=Math.min(d+4,len)/len;strip(lines,[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k],[a[0]+(b[0]-a[0])*l,a[1]+(b[1]-a[1])*l],.17,.12,lineColor);}}}}
 for(const [b,col] of [[walk,0xffffff],[road,0xffffff],[lines,0xffffff]]){if(b.p.length){const m=meshFrom(b,new T.MeshStandardMaterial({color:col,vertexColors:true,roughness:.88,side:T.DoubleSide}));m.castShadow=false;}}
}
function inside(point,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function addFortWall(area){
 const points=area.coordinates.map(coords),segments=points.length-1,material=new T.MeshStandardMaterial({color:0xab7954,roughness:.95,map:facadeTexture()}),walls=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,segments),dummy=new T.Object3D(),merlons=[];
 for(let i=0;i<segments;i++){const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);dummy.position.set((a[0]+b[0])/2,5,(a[1]+b[1])/2);dummy.rotation.set(0,angle,0);dummy.scale.set(len+.3,10,3.8);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);for(let d=1;d<len;d+=4.5)merlons.push({x:a[0]+dx*d/len,z:a[1]+dz*d/len,angle});}
 walls.castShadow=true;walls.receiveShadow=true;city.add(walls);
 const crenels=new T.InstancedMesh(new T.BoxGeometry(1.8,1.1,3.8),new T.MeshStandardMaterial({color:0xb5865f,roughness:1}),merlons.length);merlons.forEach((p,i)=>{dummy.position.set(p.x,10.5,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();crenels.setMatrixAt(i,dummy.matrix);});crenels.castShadow=true;city.add(crenels);
}
function addAreas(areas){const trees=[];for(const area of areas){if(area.coordinates.length<4)continue;const kind=area.kind||'',water=/water|reservoir|basin|pond/.test(kind),green=/park|garden|grass|forest|wood|recreation|pitch/.test(kind),historic=/castle|fort|historic/.test(kind);if(!water&&!green&&!historic)continue;
  if(historic&&area.tags?.barrier==='city_wall')addFortWall(area);
  const m=new T.Mesh(polygonGeometry(area.coordinates,area.holes),new T.MeshStandardMaterial({color:water?0x759d92:green?0x899868:0xb49770,roughness:water?.24:.98,metalness:water?.2:0,side:T.DoubleSide}));m.position.y=water?.015:-.01;m.receiveShadow=true;city.add(m);
  if(green){const p=area.coordinates.map(coords),x0=Math.min(...p.map(v=>v[0])),x1=Math.max(...p.map(v=>v[0])),z0=Math.min(...p.map(v=>v[1])),z1=Math.max(...p.map(v=>v[1])),rand=rng(area.id);const count=Math.min(100,Math.floor((x1-x0)*(z1-z0)/700));for(let i=0;i<count*3&&trees.length<2400;i++){const x=x0+rand()*(x1-x0),z=z0+rand()*(z1-z0);if(inside([x,z],p)&&!(area.holes||[]).some(h=>inside([x,z],h.map(coords))))trees.push({x,z,size:3+rand()*3});}}
 }
 if(trees.length){const canopy=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0x667c42,roughness:.95}),trees.length),trunk=new T.InstancedMesh(new T.CylinderGeometry(.45,.7,1,5),new T.MeshStandardMaterial({color:0x706043}),trees.length),dummy=new T.Object3D();trees.forEach((t,i)=>{dummy.position.set(t.x,t.size+3,t.z);dummy.scale.set(t.size,t.size*.85,t.size);dummy.updateMatrix();canopy.setMatrixAt(i,dummy.matrix);dummy.position.y=2;dummy.scale.set(1,4,1);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);});canopy.castShadow=true;trunk.castShadow=true;city.add(canopy,trunk);}
}
function addLabels(landmarks){for(const item of landmarks.slice(0,22)){const p=coords(item.coordinates),el=document.createElement('span');el.className='place-label';el.textContent=item.name;$('landmark-labels').append(el);labels.push({el,position:new T.Vector3(p[0],35,p[1]),priority:/junagarh/i.test(item.name)});}}
// NOAA-style solar position approximation, sufficient for visual sun direction.
function sunPosition(date){const jd=date.getTime()/86400000+2440587.5,n=jd-2451545,L=(280.46+.9856474*n)*rad,g=(357.528+.9856003*n)*rad,ecliptic=L+1.915*rad*Math.sin(g)+.02*rad*Math.sin(2*g),obliquity=(23.439-.0000004*n)*rad,dec=Math.asin(Math.sin(obliquity)*Math.sin(ecliptic)),ra=Math.atan2(Math.cos(obliquity)*Math.sin(ecliptic),Math.cos(ecliptic)),sidereal=(280.46061837+360.98564736629*n+location.lon)*rad,h=sidereal-ra,lat=location.lat*rad;
 return new T.Vector3(-Math.cos(dec)*Math.sin(h),Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(h),-(Math.cos(lat)*Math.sin(dec)-Math.sin(lat)*Math.cos(dec)*Math.cos(h))).normalize();}
const skyUniforms={sunDir:{value:sunPosition(new Date())},cloud:{value:.0},time:{value:0},wind:{value:new T.Vector2()},cameraPos:{value:new T.Vector3()},night:{value:0},storm:{value:0}};
const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',fragmentShader:`precision highp float;
 varying vec3 vWorld;uniform vec3 sunDir;uniform float cloud,time,night,storm;uniform vec2 wind;uniform vec3 cameraPos;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.09)+.05*noise(p*8.13);}
 void main(){vec3 ray=normalize(vWorld-cameraPos);float up=max(ray.y,0.);float sunset=1.-smoothstep(.02,.28,abs(sunDir.y));vec3 horizon=mix(vec3(.72,.79,.76),vec3(1.,.59,.29),sunset*.48);vec3 zenith=vec3(.19,.43,.61);vec3 col=mix(horizon,zenith,pow(up,.4));col=mix(col,vec3(.019,.035,.064)+up*.013,night);col=mix(col,vec3(.23,.30,.34),storm*.57*(1.-night));float mu=dot(ray,sunDir);col+=vec3(1.,.82,.48)*pow(max(mu,0.),32.)*.18*(1.-night);col+=vec3(3.,2.6,1.9)*smoothstep(.99987,.99998,mu)*(1.-night);
 if(cloud>.01&&ray.y>-.04){float opacity=0.;vec3 cloudColor=vec3(0.);for(int i=0;i<7;i++){float layer=4600.+float(i)*180.;float dist=(layer-cameraPos.y)/max(ray.y,.035);if(dist>0.&&dist<24000.){vec2 p=(cameraPos.xz+ray.xz*dist+wind*time)*.0014;float density=smoothstep(1.-cloud*.76,1.15-cloud*.66,fbm(p+float(i)*.13));density*=.18;vec3 lit=mix(vec3(.48,.53,.55),vec3(.98,.94,.82),float(i)/7.);lit=mix(lit,vec3(.09,.12,.16),night);lit*=1.-storm*.33;cloudColor+=lit*density*(1.-opacity);opacity+=density*(1.-opacity);}}col=col*(1.-opacity)+cloudColor;}
 if(night>.2&&ray.y>0.){vec2 sp=floor(ray.xz/(ray.y+.25)*750.);float stars=step(.9993,hash(sp));col+=stars*night*.55;}
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
const sky=new T.Mesh(new T.SphereGeometry(45000,32,16),skyMaterial);sky.frustumCulled=false;scene.add(sky);
const rainCount=2600,rainPositions=new Float32Array(rainCount*6),rainSeeds=Array.from({length:rainCount},(_,i)=>{const r=rng(i+82);return{x:(r()-.5)*1300,z:(r()-.5)*1300,y:r()*800};});
const rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.BufferAttribute(rainPositions,3));rainGeometry.setDrawRange(0,0);const rainMaterial=new T.LineBasicMaterial({color:0xd3e0df,transparent:true,opacity:.28,depthWrite:false});const rain=new T.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;scene.add(rain);
let weatherState={cloud:0,rain:0,windX:0,windZ:0,night:0,visibility:30000},nightLights=null;
function addNightLights(roads){const positions=[];for(const r of roads.filter(r=>/primary|secondary|tertiary/.test(r.kind))){let last=null;for(const c of r.coordinates){const p=coords(c);if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>55){positions.push(p[0],5,p[1]);last=p;}}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const c=canvas.getContext('2d'),g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#fff5c1');g.addColorStop(.2,'#ffc271');g.addColorStop(1,'rgba(255,175,70,0)');c.fillStyle=g;c.fillRect(0,0,32,32);nightLights=new T.Points(geo,new T.PointsMaterial({map:new T.CanvasTexture(canvas),size:18,transparent:true,depthWrite:false,color:0xffd798,blending:T.AdditiveBlending}));nightLights.visible=false;city.add(nightLights);}
renderWeather=()=>{
 const c=weather?.current,effects=$('weather-effects').checked;let direction=sunPosition(new Date()),cover=c?.cloud_cover/100||0,precip=c?.precipitation||0,visibility=Number.isFinite(c?.visibility)?c.visibility:30000;
 if(mood==='golden'){direction=new T.Vector3(-.7,.13,.7).normalize();cover=.18;precip=0;}if(mood==='rain'){direction=new T.Vector3(-.5,.25,.6).normalize();cover=1;precip=3;visibility=6500;}if(mood==='night'){direction=new T.Vector3(.4,-.5,-.7).normalize();cover=.16;precip=0;}
 const night=1-clamp((direction.y+.10)/.18,0,1),wind=(c?.wind_speed_10m||0)/3.6,bearing=(c?.wind_direction_10m||0)*rad;
 weatherState={cloud:effects?cover:0,rain:effects?precip:0,windX:-Math.sin(bearing)*wind,windZ:Math.cos(bearing)*wind,night,visibility};
 skyUniforms.sunDir.value.copy(direction);skyUniforms.cloud.value=weatherState.cloud;skyUniforms.night.value=night;skyUniforms.storm.value=effects?clamp(precip/3,0,1):0;skyUniforms.wind.value.set(-weatherState.windX,-weatherState.windZ);
 sun.position.copy(direction).multiplyScalar(6000);sun.intensity=(1-night)*(4.0-cover*2.6);sun.color.set(direction.y<.22?0xffc27d:0xffeed5);hemisphere.intensity=(1.9+cover*.7)*(1-night)+.45*night;hemisphere.color.set(night?0x536f9f:0xc2dcec);hemisphere.groundColor.set(night?0x303749:0xa88b64);renderer.toneMappingExposure=night?1.35:1.12;
 scene.fog.color.set(night?0x16202f:precip&&effects?0x8d9a97:0xc6cbbb);scene.fog.density=night?.0001:effects?clamp(1.2/Math.max(visibility,1500),.000022,.00055):.000022;terrainMaterial.roughness=precip&&effects?.52:1;
 if(nightLights)nightLights.visible=night>.25;$('preview-notice').hidden=mood==='live';
};
$('weather-effects').onchange=renderWeather;
for(const button of document.querySelectorAll('[data-mood]'))button.onclick=()=>{mood=button.dataset.mood;for(const b of document.querySelectorAll('[data-mood]'))b.classList.toggle('active',b===button);renderWeather();};
function setCamera(preset){cameraPreset=preset;targetFocus.set(0,0,0);desiredAzimuth=-.55;if(preset==='fort'){targetRadius=1500;desiredPolar=1.08;}else if(preset==='aerial'){targetRadius=4800;desiredPolar=.62;}else{targetRadius=650;desiredPolar=1.36;targetFocus.set(0,15,80);}for(const b of document.querySelectorAll('[data-camera]'))b.classList.toggle('active',b.dataset.camera===preset);}
for(const button of document.querySelectorAll('[data-camera]'))button.onclick=()=>setCamera(button.dataset.camera);
function zoom(factor){targetRadius=clamp(targetRadius*factor,180,10000);}
$('zoom-in').onclick=()=>zoom(.76);$('zoom-out').onclick=()=>zoom(1.3);$('reset-view').onclick=()=>setCamera(cameraPreset);$('north').onclick=()=>{desiredAzimuth=0;};
const pointers=new Map();let pinch=0;const viewport=$('city-scene');
viewport.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});
viewport.addEventListener('pointerdown',e=>{viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});$('auto-orbit').checked=false;});
viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoom(pinch/d);pinch=d;return;}if(e.shiftKey||e.buttons===2){const scale=radius/height*.8;targetFocus.x+=(-Math.cos(azimuth)*dx-Math.sin(azimuth)*dy)*scale;targetFocus.z+=(Math.sin(azimuth)*dx-Math.cos(azimuth)*dy)*scale;targetFocus.x=clamp(targetFocus.x,-2400,2400);targetFocus.z=clamp(targetFocus.z,-2400,2400);}else{desiredAzimuth-=dx*.004;desiredPolar=clamp(desiredPolar+dy*.004,.08,1.48);}});
for(const event of ['pointerup','pointercancel'])viewport.addEventListener(event,e=>{pointers.delete(e.pointerId);pinch=0;});viewport.addEventListener('contextmenu',e=>e.preventDefault());
const resize=()=>{width=viewport.clientWidth;height=viewport.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(viewport);
function positionLabels(){const busy=[];for(const l of [...labels].sort((a,b)=>b.priority-a.priority)){l.el.hidden=true;if(!$('show-labels').checked)continue;const p=l.position.clone().project(camera);if(p.z>1||p.z< -1)continue;const x=(p.x+1)*width/2,y=(1-p.y)*height/2;if(x<90||x>width-130||y<120||y>height-190)continue;const box={x:x-70,y:y-15,w:140,h:32};if(width>900&&((x<450&&y<370)||(x>width-380&&y<620)))continue;if(busy.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;l.el.style.left=x+'px';l.el.style.top=y+'px';l.el.hidden=false;busy.push(box);}}
let previous=performance.now(),elapsed=0,lastLighting=0,lastLabels=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.1);previous=now;if(document.hidden)return;elapsed+=dt;const ease=reduced?1:1-Math.exp(-dt*5);
 if($('auto-orbit').checked&&!reduced)desiredAzimuth+=dt*.028;radius+=(targetRadius-radius)*ease;polar+=(desiredPolar-polar)*ease;azimuth+=(desiredAzimuth-azimuth)*ease;focus.lerp(targetFocus,ease);camera.position.set(focus.x+radius*Math.sin(polar)*Math.sin(azimuth),focus.y+radius*Math.cos(polar),focus.z+radius*Math.sin(polar)*Math.cos(azimuth));camera.lookAt(focus);camera.updateMatrixWorld();
 sky.position.copy(camera.position);skyUniforms.cameraPos.value.copy(camera.position);skyUniforms.time.value=reduced?0:elapsed;
 $('north').querySelector('svg').style.transform=`rotate(${-azimuth/rad}deg)`;
 const count=weatherState.rain>0?Math.floor(clamp(weatherState.rain/4,.08,1)*rainCount):0;rainGeometry.setDrawRange(0,count*2);
 if(count){for(let i=0;i<count;i++){const seed=rainSeeds[i],y=((seed.y-(reduced?0:elapsed)*110)%800+800)%800;const x=camera.position.x+seed.x+weatherState.windX*y/110,z=camera.position.z+seed.z+weatherState.windZ*y/110;rainPositions.set([x,camera.position.y-300+y,z,x-weatherState.windX*.12,camera.position.y-285+y,z-weatherState.windZ*.12],i*6);}rainGeometry.attributes.position.needsUpdate=true;}
 if(now-lastLighting>30000){renderWeather();lastLighting=now;}if(now-lastLabels>120){positionLabels();lastLabels=now;const meters=2*radius*Math.tan(camera.fov*rad/2)/height*55;$('scale-text').textContent=meters>=1000?(meters/1000).toFixed(1)+' km':Math.round(meters/10)*10+' m';}
 renderer.render(scene,camera);
}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('map-loading').hidden=false;$('map-loading-text').textContent='Graphics paused. Reload to restore the city view.';});
async function loadMap(){try{const response=await fetch('/assets/bikaner.json');if(!response.ok)throw new Error('Map HTTP '+response.status);mapData=await response.json();addAreas(mapData.areas||[]);addRoads(mapData.roads||[]);const known=addBuildings(mapData.buildings||[]);addNightLights(mapData.roads||[]);addLabels(mapData.landmarks||[]);
 $('map-coverage').textContent=`${mapData.buildings.length.toLocaleString()} mapped buildings · ${mapData.roads.length.toLocaleString()} road segments. ${known} buildings have mapped heights or floor counts; others use estimated heights. Rooftop fittings, trees in mapped parks, and street lighting are illustrative. Map snapshot ${mapData.source?.fetchedUTC?.slice(0,10)||'available locally'}.`;
 $('map-loading').hidden=true;setCamera('fort');renderWeather();
 }catch(e){$('map-loading-text').textContent='The Bikaner map could not load. Reload to try again.';console.error(e);}}
renderWeather();loadMap();requestAnimationFrame(frame);
})();
