/* NASA/JPL ephemerides, SPICE orientation, camera-relative rendering. */
(() => {
'use strict';
const $=id=>document.getElementById(id),T=window.THREE,AU=149597870.7;
if(!T){$('loading-message').textContent='The 3D renderer is unavailable.';return;}
const viewport=$('scene'),labelLayer=$('labels');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});}catch(error){$('loading-message').textContent='WebGL is unavailable on this device.';return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Live three-dimensional solar system. Positions from JPL Horizons and rotation from SPICE. Use the planet selector, moon buttons, view buttons, and zoom controls to explore.');
viewport.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.001,1e7);
const sphere=new T.SphereGeometry(1,112,72);
const white=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
const black=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);black.needsUpdate=true;
let catalogue=[],records={},bodies=new Map(),selected=399,view='close',mode='live',paused=false,speed=1,sim=Date.now()/1000;
let start=0,end=0,width=1,height=1,theta=.5,phi=1.2,distance=5.7,targetDistance=5.7;
let frameNow=0,previous=performance.now(),lastUI=0,fetching=false,nextFetch=0,ready=false,assetFailures=new Set();
let apiState={},lastTrail=0,needsTrails=true;
const origin=new T.Vector3(),lightWorld=new T.Vector3(),lightView=new T.Vector3(),project=new T.Vector3();
const qTemp=new T.Quaternion(),pTemp=new T.Vector3(),vTemp=new T.Vector3();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const vertex=`
 varying vec2 vUv;varying vec3 vN;varying vec3 vEye;varying vec3 vWorld;
 #include <common>
 #include <logdepthbuf_pars_vertex>
 void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vEye=-mv.xyz;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*mv;
 #include <logdepthbuf_vertex>
 }`;
const shadowGLSL=`
 uniform vec3 lightWorld;uniform vec3 occluders[8];uniform float occRadii[8];uniform float solarAngle;
 float eclipse(){float s=1.;for(int i=0;i<8;i++){if(occRadii[i]>0.){vec3 delta=occluders[i]-vWorld;float along=dot(delta,lightWorld);if(along>0.){float impact=length(delta-along*lightWorld);float pen=max(along*solarAngle,.00003);float visibility=smoothstep(occRadii[i]-pen,occRadii[i]+pen,impact);s=min(s,visibility);}}}return s;}`;
const fragment=`
 uniform sampler2D dayMap;uniform sampler2D nightMap;uniform sampler2D normalMap;
 uniform vec3 lightView;uniform float hasNormal;uniform float normalStrength;uniform float earth;uniform float sun;uniform float cloud;
 varying vec2 vUv;varying vec3 vN;varying vec3 vEye;varying vec3 vWorld;
 #include <common>
 #include <logdepthbuf_pars_fragment>
 ${shadowGLSL}
 vec3 relief(vec3 N){vec3 q0=dFdx(-vEye),q1=dFdy(-vEye);vec2 st0=dFdx(vUv),st1=dFdy(vUv);vec3 t=normalize(q0*st1.t-q1*st0.t),b=normalize(-q0*st1.s+q1*st0.s);vec3 m=texture2D(normalMap,vUv).xyz*2.-1.;m.xy*=normalStrength;return normalize(t*m.x+b*m.y+N*m.z);}
 void main(){
 #include <logdepthbuf_fragment>
 vec4 tex=texture2D(dayMap,vUv);vec3 N=normalize(vN);if(hasNormal>.5)N=relief(N);vec3 L=normalize(lightView);float nl=dot(N,L);float vis=eclipse();vec3 color;
 if(sun>.5){color=tex.rgb*3.;}else{
 color=tex.rgb*(.013+1.4*max(nl,0.)*vis);
 if(earth>.5){float sea=smoothstep(.025,.15,tex.b-tex.r);vec3 H=normalize(L+normalize(vEye));float spec=pow(max(dot(N,H),0.),100.);color+=vec3(.75,.85,1.)*spec*sea*.6*max(nl,0.)*vis;color+=texture2D(nightMap,vUv).rgb*(1.-smoothstep(-.16,.04,nl))*.8;}
 }
 float alpha=1.;if(cloud>.5){alpha=smoothstep(.09,.85,tex.r)*.8;color=vec3(.94,.97,1.)*(.017+1.25*max(nl,0.)*vis);}
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
const textures=new Map();
async function texture(path,max=4096,color=true){
 const key=path+':'+max+':'+color;if(textures.has(key))return textures.get(key);
 const promise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{
  const ratio=Math.min(1,max/image.width),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const t=new T.CanvasTexture(canvas);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resolve(t);
 };image.onerror=()=>{assetFailures.add(path);reject(new Error('Image unavailable: '+path));};image.src='/assets/'+path;});textures.set(key,promise);return promise;
}
function material(id){return new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,extensions:{derivatives:true},uniforms:{dayMap:{value:white},nightMap:{value:black},normalMap:{value:white},hasNormal:{value:0},normalStrength:{value:.24},earth:{value:id===399?1:0},sun:{value:id===10?1:0},cloud:{value:0},lightWorld:{value:new T.Vector3()},lightView:{value:new T.Vector3()},occluders:{value:Array.from({length:8},()=>new T.Vector3())},occRadii:{value:Array(8).fill(0)},solarAngle:{value:.00465}}});}
function atmosphere(body,color,height,opacity){
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,vertexShader:vertex,fragmentShader:`
 uniform vec3 tint;uniform vec3 lightView;uniform float opacity;varying vec3 vN;varying vec3 vEye;varying vec3 vWorld;varying vec2 vUv;
 #include <common>
 #include <logdepthbuf_pars_fragment>
 void main(){
 #include <logdepthbuf_fragment>
 vec3 N=normalize(vN);float rim=pow(1.-abs(dot(N,normalize(vEye))),3.);float lit=smoothstep(-.3,.7,dot(N,normalize(lightView)));gl_FragColor=vec4(tint,rim*lit*opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,uniforms:{tint:{value:new T.Color(color)},lightView:{value:new T.Vector3()},opacity:{value:opacity}}});
 const mesh=new T.Mesh(sphere,m);mesh.scale.copy(body.mesh.scale).multiplyScalar(height);body.group.add(mesh);body.atmosphere=mesh;
}
function makeBody(meta){
 const group=new T.Group();scene.add(group);const mat=material(meta.id),mesh=new T.Mesh(sphere,mat);
 mesh.scale.set(meta.radii[0]/meta.radius,meta.radii[2]/meta.radius,meta.radii[1]/meta.radius);mesh.userData.bodyId=meta.id;group.add(mesh);
 const label=document.createElement('span');label.className='body-label';label.textContent=meta.name;labelLayer.append(label);
 const trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x6e85a7,transparent:true,opacity:.3,depthWrite:false}));scene.add(trail);
 const b={...meta,group,mesh,material:mat,label,trail,raw:new T.Vector3(),velocity:new T.Vector3(),absolute:new T.Vector3(),drawRadius:1,mapLevel:0,loaded:false,orientationAvailable:false};
 if(meta.id===399){atmosphere(b,0x518de6,1.015,.65);const cm=material(0);cm.uniforms.cloud.value=1;cm.transparent=true;cm.depthWrite=false;const clouds=new T.Mesh(sphere,cm);clouds.scale.copy(mesh.scale).multiplyScalar(1.0018);group.add(clouds);b.clouds=clouds;}
 if(meta.id===299)atmosphere(b,0xbfac81,1.025,.3);
 if(meta.id===606)atmosphere(b,0xd19d5a,1.05,.5);
 if(meta.id===499)atmosphere(b,0xc79062,1.009,.12);
 if(meta.id===699){
  const rg=new T.RingGeometry(1.11,2.32,224,1),p=rg.attributes.position,uv=rg.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,(Math.hypot(p.getX(i),p.getY(i))-1.11)/1.21,.5);
  rg.rotateX(-Math.PI/2);
  const rm=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:`uniform sampler2D dayMap;uniform vec3 lightView;varying vec2 vUv;varying vec3 vN;varying vec3 vEye;varying vec3 vWorld;
  #include <common>
  #include <logdepthbuf_pars_fragment>
  ${shadowGLSL}
  void main(){
  #include <logdepthbuf_fragment>
  vec4 col=texture2D(dayMap,vUv);float angle=abs(dot(normalize(vN),normalize(lightView)));gl_FragColor=vec4(col.rgb*(.06+eclipse()*(.38+.7*angle)),col.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`,side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{dayMap:{value:white},lightWorld:{value:new T.Vector3()},lightView:{value:new T.Vector3()},occluders:{value:Array.from({length:8},()=>new T.Vector3())},occRadii:{value:Array(8).fill(0)},solarAngle:{value:.001}}});
  const ring=new T.Mesh(rg,rm);group.add(ring);b.ring=ring;texture('8k_saturn_ring_alpha.png',4096).then(t=>rm.uniforms.dayMap.value=t).catch(()=>{});
 }
 if(meta.id===10){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=g.createRadialGradient(128,128,24,128,128,128);r.addColorStop(0,'rgba(255,245,212,.7)');r.addColorStop(.27,'rgba(255,197,104,.16)');r.addColorStop(1,'rgba(255,156,70,0)');g.fillStyle=r;g.fillRect(0,0,256,256);const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthWrite:false,transparent:true,blending:T.AdditiveBlending}));sp.scale.set(8,8,1);group.add(sp);}
 return b;
}
async function ensureMap(b,quality){
 if(!b.texture||b.mapLevel>=quality)return;b.mapLevel=quality;
 try{b.material.uniforms.dayMap.value=await texture(b.texture,quality);b.loaded=true;
  if(b.id===399){b.material.uniforms.nightMap.value=await texture('8k_earth_nightmap.jpg',2048);b.clouds.material.uniforms.dayMap.value=await texture('8k_earth_clouds.jpg',2048);}
  const normal={199:'mercury-normal.png',301:'moon-normal.png',399:'earth-normal.png',499:'mars-normal.png'}[b.id];
  if(normal&&quality>=4096){b.material.uniforms.normalMap.value=await texture(normal,2048,false);b.material.uniforms.hasNormal.value=1;b.material.uniforms.normalStrength.value=b.id===399?.13:.34;}
 }catch(error){b.mapLevel=0;$('notice').textContent='One or more surface maps could not load; positions remain available.';}
}
const starGeo=new T.BufferGeometry(),starPos=[],starColors=[];let seed=89141;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<1800;i++){const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z),brightness=.2+random()*.5;starPos.push(r*Math.cos(a)*90000,z*90000,r*Math.sin(a)*90000);starColors.push(brightness*.88,brightness*.93,brightness);}
starGeo.setAttribute('position',new T.Float32BufferAttribute(starPos,3));starGeo.setAttribute('color',new T.Float32BufferAttribute(starColors,3));
const stars=new T.Points(starGeo,new T.PointsMaterial({size:1.1,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.8,depthWrite:false}));scene.add(stars);
function indexAt(record,t){const a=record.samples;let i=Math.floor((t-a[0][0])/(a[1][0]-a[0][0]));return Math.max(0,Math.min(a.length-2,i));}
function stateAt(record,t,out,velocity){
 const a=record.samples,i=indexAt(record,t),p=a[i],q=a[i+1],dt=q[0]-p[0],u=T.MathUtils.clamp((t-p[0])/dt,0,1),u2=u*u,u3=u2*u;
 const h00=2*u3-3*u2+1,h10=u3-2*u2+u,h01=-2*u3+3*u2,h11=u3-u2;
 const pos=[0,0,0],vel=[0,0,0];for(let k=0;k<3;k++){pos[k]=h00*p[k+1]+h10*dt*p[k+4]+h01*q[k+1]+h11*dt*q[k+4];vel[k]=((6*u2-6*u)*p[k+1]+(3*u2-4*u+1)*dt*p[k+4]+(-6*u2+6*u)*q[k+1]+(3*u2-2*u)*dt*q[k+4])/dt;}
 out.set(pos[0],pos[2],-pos[1]);if(velocity)velocity.set(vel[0],vel[2],-vel[1]);
 return {i,u};
}
function setStates(t){
 for(const b of bodies.values()){
  const rec=records[b.id];b.hasData=Boolean(rec&&t>=rec.start&&t<=rec.end);
  if(!b.hasData)continue;
  const {i,u}=stateAt(rec,t,b.raw,b.velocity);b.absolute.copy(b.raw);
  b.orientationAvailable=Boolean(rec.orientations);
  if(rec.orientations){const step=rec.orientationStep||300,oi=Math.max(0,Math.min(rec.orientations.length-2,Math.floor((t-(rec.orientationStart||rec.start))/step))),ou=T.MathUtils.clamp((t-(rec.orientationStart||rec.start)-oi*step)/step,0,1);b.group.quaternion.fromArray(rec.orientations[oi]).normalize();qTemp.fromArray(rec.orientations[oi+1]).normalize();b.group.quaternion.slerp(qTemp,ou);}
 }
 for(const b of bodies.values())if(b.parent!==10&&b.parent!==0){const parent=bodies.get(b.parent);b.hasData=b.hasData&&Boolean(parent?.hasData);if(b.hasData)b.absolute.add(parent.absolute);}
}
function parentBody(){const b=bodies.get(selected);return b.parent!==10&&b.parent!==0?bodies.get(b.parent):b;}
function family(){const parent=parentBody();return [...bodies.values()].filter(b=>b.id===parent.id||b.parent===parent.id);}
function visibleBodies(){return view==='overview'?[...bodies.values()].filter(b=>b.parent===10||b.id===10):family();}
function unit(){return view==='overview'?AU:bodies.get(selected).radius;}
function fitDistance(){
 const b=bodies.get(selected),aspect=Math.min(1,width/height),fov=Math.tan(camera.fov*Math.PI/360);
 if(view==='overview')return 34/(fov*aspect)*1.12;
 if(view==='system'){
  let radius=2;for(const member of family())if(member.hasData)radius=Math.max(radius,member.absolute.distanceTo(b.absolute)/b.radius+member.radius/b.radius);
  return radius/(fov*aspect)*1.17;
 }
 return (b.id===699?3:1.4)/(fov*aspect);
}
function resize(){width=viewport.clientWidth;height=viewport.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(ready)targetDistance=fitDistance();}
new ResizeObserver(resize).observe(viewport);resize();
function aimAtSun(){const b=bodies.get(selected);pTemp.copy(b.absolute).negate().normalize();theta=Math.atan2(pTemp.x,pTemp.z)+.44;phi=Math.acos(T.MathUtils.clamp(pTemp.y,-1,1))-.23;phi=T.MathUtils.clamp(phi,.2,Math.PI-.2);}
function setView(next){
 view=next;if(!ready)return;
 if(view==='overview')selected=10;
 if(view==='system'){const parent=parentBody();selected=parent.id;}
 if(view==='overview'){theta=.25;phi=.69;}else aimAtSun();
 targetDistance=fitDistance();distance=targetDistance;needsTrails=true;refreshSelection();
}
function select(id,nextView='close'){
 if(!bodies.has(Number(id)))return;selected=Number(id);setView(nextView);$('announcement').textContent='Exploring '+bodies.get(selected).name;
}
function refreshSelection(){
 const b=bodies.get(selected),isOverview=view==='overview';$('body-select').value=String(selected);
 $('scene-name').textContent=isOverview?'Solar system':b.name;$('scene-kind').textContent=isOverview?'EIGHT PLANETS · ONE STAR':b.kind.toUpperCase();
 $('scene-note').textContent=isOverview?'Proportional orbital distances':view==='system'?'Moon positions and physical spacing':'Sunlit geometry · Astronomical rotation';
 $('closeup').classList.toggle('active',view==='close');$('system-view').classList.toggle('active',view==='system');
 const children=[...bodies.values()].filter(x=>x.parent===b.id);$('system-view').disabled=!children.length&&b.parent===10||b.id===10;
 $('scale-option').hidden=!isOverview;$('body-radius').textContent=b.radius.toLocaleString('en-GB',{maximumFractionDigits:1})+' km';
 $('rotation-note').textContent=b.rotationNote;$('distance-origin').textContent=b.parent===0?'origin':bodies.get(b.parent)?.name||'Sun';
 const list=$('moon-list');list.replaceChildren();
 if(b.parent!==10&&b.parent!==0){const button=document.createElement('button');button.className='parent-return';button.textContent='← '+bodies.get(b.parent).name+' system';button.onclick=()=>select(b.parent,'system');list.append(button);}
 for(const moon of children){const button=document.createElement('button');button.type='button';const name=document.createElement('span');name.textContent=moon.name;const value=document.createElement('span');value.className='moon-distance';value.id='moon-distance-'+moon.id;button.append(name,value);button.onclick=()=>select(moon.id);list.append(button);}
 if(!children.length&&b.parent===10){const p=document.createElement('p');p.className='empty-moons';p.textContent='No natural moons.';list.append(p);}
 $('moon-heading').textContent=b.id===10?'PLANETS':b.parent!==10&&b.parent!==0?'PARENT SYSTEM':'MOONS IN THIS MODEL';$('moon-count').textContent=children.length?String(children.length):'';
 for(const body of visibleBodies())ensureMap(body,body.id===selected&&view==='close'?4096:1024);
 updateUI();
}
function updateClockControls(){
 $('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');$('live').classList.toggle('active',mode==='live'&&!paused);$('speed').value=String(speed);
 $('clock-mode').textContent=paused?'Paused':mode==='live'?'Real time · 1×':`${speed.toLocaleString()}× playback`;
}
function updateUI(){
 if(!ready)return;
 const b=bodies.get(selected),rec=records[b.id];
 $('utc-clock').textContent=new Date(sim*1000).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'UTC'})+' UTC';
 $('utc-clock').dateTime=new Date(sim*1000).toISOString();
 $('scrub').value=String((sim-start)/(end-start)*1000);
 const diff=sim-Date.now()/1000;$('time-offset').textContent=mode==='live'?'NOW':(diff>=0?'+':'−')+(Math.abs(diff)/3600).toFixed(1)+' h';
 if(b.hasData){const range=b.raw.length();$('body-distance').textContent=b.parent===10?(range/AU).toFixed(6)+' AU':range.toLocaleString('en-GB',{maximumFractionDigits:0})+' km';$('body-speed').textContent=b.velocity.length().toFixed(3)+' km/s';}
 else{$('body-distance').textContent='Unavailable';$('body-speed').textContent='Unavailable';}
 const ok=b.hasData; $('state-dot').classList.toggle('ready',ok);$('state-label').textContent=ok?'JPL ephemeris loaded':'Position data unavailable';
 if(rec){$('solution').textContent=rec.source+' · '+(b.orientationAvailable?b.frame:'Orientation unavailable');$('fetched').textContent=rec.fetchedUTC;$('window').textContent=new Date(rec.start*1000).toISOString().slice(0,16)+' — '+new Date(rec.end*1000).toISOString().slice(0,16)+' UTC';}
 for(const moon of family()){const el=$('moon-distance-'+moon.id);if(el)el.textContent=moon.hasData?Math.round(moon.raw.length()).toLocaleString()+' km':'Unavailable';}
 $('scale-label').textContent=view==='overview'?($('readable-scale').checked?'Proportional distances · Body sizes enlarged':'Physical sizes and distances'):'Physical sizes and distances · 48 h trajectories';
 if(b.id!==607&&rec&&!b.orientationAvailable)$('rotation-note').textContent='Orientation data unavailable. Rotation is not being simulated.';
}
function drawTrails(){
 if(!ready)return;const scale=unit();const selectedBody=bodies.get(selected),visible=visibleBodies();
 for(const b of bodies.values()){
  const rec=records[b.id];const show=$('trails').checked&&rec&&visible.includes(b)&&(view==='overview'?b.id!==10:b.parent!==10&&b.parent!==0);
  b.trail.visible=Boolean(show);if(!show)continue;
  const points=[];const parent=bodies.get(b.parent);
  for(let i=0;i<rec.samples.length;i+=2){const row=rec.samples[i];const p=new T.Vector3(row[1],row[3],-row[2]);if(view!=='overview')p.add(parent.absolute).sub(origin);points.push(p.divideScalar(scale));}
  b.trail.geometry.dispose();b.trail.geometry=new T.BufferGeometry().setFromPoints(points);
 }
 needsTrails=false;lastTrail=frameNow;
}
function uniformsFor(mat,b,others,ownRadius=false){
 const u=mat.uniforms;u.lightWorld.value.copy(lightWorld);u.lightView.value.copy(lightView);
 u.solarAngle.value=Math.asin(Math.min(1,695700/Math.max(b.absolute.length(),695701)));
 let j=0;for(const other of others){if(other===b&&!ownRadius||j===8)continue;u.occluders.value[j].copy(other.group.position);u.occRadii.value[j]=other.drawRadius;j++;}
 for(;j<8;j++)u.occRadii.value[j]=0;
}
function positionLabels(visible){
 const occupied=[];for(const b of bodies.values())b.label.style.display='none';
 if(!$('show-labels').checked)return;
 for(const b of visible){
  if(!b.hasData||view==='close'&&b.id===selected)continue;
  project.copy(b.group.position).project(camera);if(project.z>1||project.z< -1)continue;
  const cx=(project.x+1)*width/2,cy=(1-project.y)*height/2;
  if(cx<0||cx>width||cy<100||cy>height-80)continue;
  const w=Math.max(50,b.name.length*7),h=18,r=Math.min(45,Math.max(4,b.drawRadius*height/(Math.max(camera.position.distanceTo(b.group.position),.1)*.65)));
  const options=[[cx+r+5,cy-8],[cx-w/2,cy-r-20],[cx-w/2,cy+r+7],[cx-r-w-5,cy-8]];
  for(const [x,y] of options){const rect={x,y,w,h};if(x<8||x+w>width-8||y<98||y+h>height-76||occupied.some(a=>x<a.x+a.w+5&&x+w+5>a.x&&y<a.y+a.h+4&&y+h+4>a.y))continue;b.label.style.display='block';b.label.style.transform=`translate(${x}px,${y}px)`;occupied.push(rect);break;}
 }
}
async function fetchData(){
 if(fetching)return;fetching=true;
 try{
  const response=await fetch('/api/ephemerides',{cache:'no-store'});if(!response.ok)throw new Error('Data service '+response.status);
  const payload=await response.json();records=payload.bodies;apiState=payload.status;
  const all=Object.values(records);if(!all.length)throw new Error(payload.status.message||'Waiting for JPL data');
  start=Math.max(...all.map(r=>r.start));end=Math.min(...all.map(r=>r.end));
  setStates(sim);
  if(records[selected]&&!ready){ready=true;setView('close');$('loading').hidden=true;}
  $('loading-message').textContent=`${payload.status.message} · ${payload.status.ready}/29 bodies`;
  $('range-start').textContent=new Date(start*1000).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
  $('range-end').textContent=new Date(end*1000).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
  nextFetch=Date.now()+(payload.status.busy?10000:300000);needsTrails=true;
  const missing=29-(payload.status.ready||0);if(missing&&payload.status.busy)$('notice').textContent=`Loading ${missing} more bodies from JPL…`;
  else if(missing)$('notice').textContent=`${missing} bodies have unavailable data. Their positions are not invented.`;
  else if(!assetFailures.size)$('notice').textContent='';
 }catch(error){$('loading-message').textContent=error.message;nextFetch=Date.now()+30000;$('notice').textContent='Live data connection unavailable. Only the displayed cached time window remains valid.';}
 finally{fetching=false;}
}
async function boot(){
 try{const response=await fetch('/api/catalog');if(!response.ok)throw new Error('Local data service unavailable');const cat=await response.json();catalogue=cat.bodies;
  for(const meta of catalogue)bodies.set(meta.id,makeBody(meta));
  const selectEl=$('body-select');selectEl.replaceChildren();const planetGroup=document.createElement('optgroup');planetGroup.label='Sun & planets';selectEl.append(planetGroup);
  for(const b of bodies.values())if(b.parent===10||b.id===10){const option=document.createElement('option');option.value=b.id;option.textContent=b.name;planetGroup.append(option);}
  for(const parent of bodies.values()){const children=[...bodies.values()].filter(x=>x.parent===parent.id&&parent.id!==10);if(!children.length)continue;const group=document.createElement('optgroup');group.label=parent.name+' moons';for(const child of children){const option=document.createElement('option');option.value=child.id;option.textContent=child.name;group.append(option);}selectEl.append(group);}
  await fetchData();updateClockControls();
 }catch(error){$('loading-message').textContent=error.message;}
}
$('body-select').onchange=e=>select(Number(e.target.value));$('overview').onclick=()=>setView('overview');$('closeup').onclick=()=>setView('close');$('system-view').onclick=()=>setView('system');
$('top-view').onclick=()=>{phi=.015;theta=0;};$('fit').onclick=()=>{targetDistance=fitDistance();};
function zoom(f){if(!ready)return;const near=view==='overview'?.025:Math.max(1.12,bodies.get(selected).id===699?2.6:1.12);targetDistance=T.MathUtils.clamp(targetDistance*f,near,view==='overview'?900:25000);}
$('zoom-in').onclick=()=>zoom(.78);$('zoom-out').onclick=()=>zoom(1.28);
$('live').onclick=()=>{mode='live';paused=false;speed=1;sim=Date.now()/1000;updateClockControls();if(sim<start||sim>end)fetchData();};
$('pause').onclick=()=>{if(!paused){paused=true;mode='playback';}else paused=false;updateClockControls();};
$('speed').onchange=e=>{speed=Number(e.target.value);mode='playback';paused=false;updateClockControls();};
$('scrub').oninput=e=>{if(!ready)return;sim=start+(end-start)*Number(e.target.value)/1000;paused=true;mode='playback';needsTrails=true;updateClockControls();};
$('trails').onchange=()=>needsTrails=true;$('readable-scale').onchange=()=>updateUI();
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{});};
const pointers=new Map();let dragged=false,down=null,pinch=0;
viewport.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});
viewport.addEventListener('pointerdown',e=>{viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};dragged=false;});
viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoom(pinch/d);pinch=d;dragged=true;return;}if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)dragged=true;theta-=(e.clientX-old.x)*.005;phi=T.MathUtils.clamp(phi+(e.clientY-old.y)*.005,.015,Math.PI-.015);});
function endPointer(e){pointers.delete(e.pointerId);pinch=0;if(!ready||dragged||e.type!=='pointerup')return;const rect=viewport.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let best=24,nearest=null;for(const b of visibleBodies()){if(!b.hasData)continue;project.copy(b.group.position).project(camera);const gap=Math.hypot((project.x+1)*width/2-x,(1-project.y)*height/2-y);if(project.z<1&&gap<best){best=gap;nearest=b;}}if(nearest)select(nearest.id);}
viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;$('loading-message').textContent='The graphics context was lost. Reload to restore the model.';});
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.15);previous=now;frameNow=now;if(document.hidden)return;
 if(Date.now()>nextFetch&&!fetching&&catalogue.length)fetchData();if(!ready)return;
 if(!paused){if(mode==='live')sim=Date.now()/1000;else sim+=dt*speed;}
 if(sim<start||sim>end){if(mode==='live'){$('notice').textContent='Current time is outside the loaded ephemeris. Refreshing data…';fetchData();return;}sim=T.MathUtils.clamp(sim,start,end);paused=true;$('notice').textContent='Reached the edge of the downloaded ephemeris. Choose Live now to return.';updateClockControls();}
 setStates(sim);const focused=bodies.get(selected),visible=visibleBodies(),u=unit();origin.copy(view==='overview'?new T.Vector3():focused.absolute);
 for(const b of bodies.values()){
  b.group.visible=visible.includes(b)&&b.hasData;if(!b.group.visible){b.trail.visible=false;continue;}
  b.group.position.copy(b.absolute).sub(origin).divideScalar(u);
  b.drawRadius=b.radius/u;
  if(view==='overview'&&$('readable-scale').checked)b.drawRadius={10:.10,199:.018,299:.026,399:.028,499:.022,599:.15,699:.13,799:.10,899:.10}[b.id]||b.drawRadius;
  b.group.scale.setScalar(b.drawRadius);
 }
 const ease=reduced?1:1-Math.exp(-dt*7);distance+=(targetDistance-distance)*ease;
 camera.position.set(distance*Math.sin(phi)*Math.sin(theta),distance*Math.cos(phi),distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(const b of visible){
  lightWorld.copy(b.absolute).negate().normalize();if(b.id===10)lightWorld.set(1,0,0);lightView.copy(lightWorld).transformDirection(camera.matrixWorldInverse);
  const occluders=view==='overview'?[]:visible.filter(o=>o.hasData&&o!==b).sort((a,c)=>a.absolute.distanceToSquared(b.absolute)-c.absolute.distanceToSquared(b.absolute));
  uniformsFor(b.material,b,occluders);if(b.clouds)uniformsFor(b.clouds.material,b,occluders);if(b.atmosphere)b.atmosphere.material.uniforms.lightView.value.copy(lightView);
  if(b.ring)uniformsFor(b.ring.material,b,[b,...occluders],true);
 }
 if(needsTrails||now-lastTrail>500)drawTrails();
 renderer.render(scene,camera);positionLabels(visible);
 if(now-lastUI>250){lastUI=now;updateUI();}
}
boot();requestAnimationFrame(frame);
})();
