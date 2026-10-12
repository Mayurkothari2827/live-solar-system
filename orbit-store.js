/* Validated local exploration state. No ephemeris is calculated in this module. */
(function(root){
'use strict';
const key='orbit-experience-v1';
const defaults=()=>({version:1,mode:'explorer',quality:'balanced',localTime:false,bookmarks:[],views:[],tour:null});
function scene(value){
 if(!value||!['solar','space'].includes(value.kind))return null;
 const s={kind:value.kind};
 if(value.kind==='solar'){
  if(!Number.isInteger(Number(value.id))||Number(value.id)<0)return null;
  s.id=Number(value.id);s.view=['close','overview','system'].includes(value.view)?value.view:'close';
  s.scale=['cinematic','proportional','physical'].includes(value.scale)?value.scale:'cinematic';
  if(Number.isFinite(value.epoch)&&value.epoch>0)s.epoch=value.epoch;
 }else {s.layer=['milky','nearby','galaxies','blackholes'].includes(value.layer)?value.layer:'milky';s.id=String(value.id||'milky').slice(0,100);}
 if(Array.isArray(value.camera)&&value.camera.length===3&&value.camera.every(Number.isFinite))s.camera=[Math.max(-100,Math.min(100,value.camera[0])),Math.max(.015,Math.min(Math.PI-.015,value.camera[1])),Math.max(.025,Math.min(25000,value.camera[2]))];
 return s;
}
function read(storage){try{const raw=JSON.parse(storage.getItem(key)||'null');if(raw?.version!==1)return defaults();return {...defaults(),mode:raw.mode==='science'?'science':'explorer',quality:['low','balanced','high'].includes(raw.quality)?raw.quality:'balanced',localTime:raw.localTime===true,bookmarks:(Array.isArray(raw.bookmarks)?raw.bookmarks:[]).filter(x=>scene(x.scene)&&typeof x.name==='string').slice(0,50).map(x=>({name:x.name.slice(0,100),scene:scene(x.scene)})),views:(Array.isArray(raw.views)?raw.views:[]).filter(x=>scene(x.scene)&&typeof x.name==='string').slice(0,20).map(x=>({name:x.name.slice(0,100),scene:scene(x.scene)})),tour:raw.tour&&typeof raw.tour.id==='string'&&Number.isInteger(raw.tour.step)&&raw.tour.step>=0?{id:raw.tour.id.slice(0,60),step:raw.tour.step}:null};}catch(_){return defaults();}}
function write(storage,data){try{storage.setItem(key,JSON.stringify({...data,version:1}));return true;}catch(_){return false;}}
function link(s,base){s=scene(s);if(!s)return null;const u=new URL(s.kind==='solar'?'/':'/space.html',base);u.searchParams.set('object',s.id);if(s.kind==='solar'){u.searchParams.set('view',s.view);u.searchParams.set('scale',s.scale);if(s.epoch)u.searchParams.set('epoch',s.epoch.toFixed(3));}else u.searchParams.set('layer',s.layer);if(s.camera)u.searchParams.set('camera',s.camera.join(','));return u.href;}
function parse(url,kind){const u=new URL(url),q=u.searchParams;if(!q.has('object')&&!q.has('epoch'))return null;return scene({kind,id:kind==='solar'?Number(q.get('object')||399):q.get('object')||'milky',layer:q.get('layer'),view:q.get('view'),scale:q.get('scale'),epoch:q.has('epoch')?Number(q.get('epoch')):undefined,camera:q.has('camera')?q.get('camera').split(',').map(Number):undefined});}
const api={key,defaults,scene,read,write,link,parse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrbitStore=api;
})(typeof window==='undefined'?globalThis:window);
