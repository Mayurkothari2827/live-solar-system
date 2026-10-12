import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Share} from '@capacitor/share';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
// Native UI and data work from a bundled shell; only ephemerides use the backend.
if(Capacitor.isNativePlatform()){
 const original=window.fetch.bind(window),backend='https://live-solar-system.vercel.app';
 const recordValid=(r,id)=>r&&String(r.id)===id&&Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.start<=Date.now()/1000&&r.end>Date.now()/1000&&Array.isArray(r.samples)&&r.samples.length>1&&r.samples.every((row,i)=>Array.isArray(row)&&row.length===7&&row.every(Number.isFinite)&&(!i||row[0]>r.samples[i-1][0]))&&r.samples[0][0]<=r.start&&r.samples[r.samples.length-1][0]>=r.end;
 let downloadGeneration=0,storageWork=Promise.resolve();
 const queueStorage=work=>storageWork=storageWork.then(work,work);
 const pathFor=url=>'ephemeris/'+(url.pathname.endsWith('catalog')?'catalog':url.searchParams.get('id')||'unknown')+'.json';
 async function read(path){try{const r=await Filesystem.readFile({path,directory:Directory.Data,encoding:Encoding.UTF8});return JSON.parse(r.data);}catch(_){return null;}}
 async function put(path,data){try{await Filesystem.writeFile({path,data:JSON.stringify(data),directory:Directory.Data,encoding:Encoding.UTF8,recursive:true});}catch(_){/* View still works when storage is full. */}}
 window.fetch=async(input,options={})=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url,base=new URL(location.href),url=new URL(raw,base);
  if(url.protocol!==base.protocol||url.host!==base.host||!url.pathname.startsWith('/api/'))return original(input,options);
  if(!['/api/catalog','/api/ephemeris'].includes(url.pathname))return new Response(JSON.stringify({error:'Unsupported native API route'}),{status:404});
  const isCatalog=url.pathname==='/api/catalog',id=url.searchParams.get('id'),generation=downloadGeneration;
  if(!isCatalog&&!/^\d{1,5}$/.test(id||''))return new Response(JSON.stringify({error:'Invalid body ID'}),{status:400});
  if((options.method||input?.method||'GET').toUpperCase()!=='GET')return new Response(null,{status:405});
  const signal=options.signal||input?.signal;
  const checkAbort=()=>{if(signal?.aborted)throw new DOMException('Request aborted','AbortError');};checkAbort();
  const path=pathFor(url),valid=data=>isCatalog?Array.isArray(data?.bodies):recordValid(data,id);
  const get=()=>{const request=CapacitorHttp.get({url:backend+url.pathname+url.search,readTimeout:55000,connectTimeout:15000});if(!signal)return request;return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('Request aborted','AbortError'));};const finish=(fn,value)=>{signal.removeEventListener('abort',abort);fn(value);};signal.addEventListener('abort',abort,{once:true});request.then(value=>finish(resolve,value),error=>finish(reject,error));if(signal.aborted)abort();});};
  try{const r=await get();if(r.status!==200)throw Error('API unavailable');const data=typeof r.data==='string'?JSON.parse(r.data):r.data;checkAbort();if(!valid(data))throw Error('Invalid data');await queueStorage(async()=>{checkAbort();if(generation===downloadGeneration)await put(path,data);});if(window.OrbitNative?.onData)window.OrbitNative.onData(false);return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  }catch(error){checkAbort();const data=await read(path);checkAbort();if(generation===downloadGeneration&&valid(data)){window.OrbitNative?.onData?.(true);return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});}return new Response(JSON.stringify({error:'No downloaded native ephemeris valid at current UTC. Reconnect to refresh.'}),{status:503});}
 };
 window.OrbitNative={
  share:options=>Share.share(options),
  async shareImage(blob){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});const file=await Filesystem.writeFile({path:'orbit-share/orbit-view.png',data,directory:Directory.Cache,recursive:true});return Share.share({title:'ORBIT · model view',files:[file.uri]});},
  async clearDownloads(){downloadGeneration++;await queueStorage(async()=>{const entries=await Filesystem.readdir({path:'',directory:Directory.Data});if(entries.files.some(file=>file.name==='ephemeris'))await Filesystem.rmdir({path:'ephemeris',directory:Directory.Data,recursive:true});});},
  onData(cached){const el=document.getElementById('app-connection');if(el){el.hidden=!cached;el.textContent=cached?'Downloaded native data · source validity applies':'';}}
 };
 App.addListener('backButton',()=>{if(document.getElementById('app-dialog')?.open){document.getElementById('app-dialog').close();return;}if(window.OrbitBack?.())return;if(location.pathname.includes('space'))location.href='/';else document.getElementById('experience-open')?.click();});
 App.addListener('appStateChange',({isActive})=>{document.body.dataset.nativeBackground=isActive?'false':'true';document.dispatchEvent(new Event('visibilitychange'));if(isActive)window.dispatchEvent(new Event('online'));});
}
