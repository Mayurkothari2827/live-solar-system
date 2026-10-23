/* Bump VERSION whenever the shell changes. Updates activate only on user request. */
const VERSION='orbit-pwa-v7';
const SHELL=VERSION+'-shell',RUNTIME=VERSION+'-assets',DATA='orbit-pwa-data-v1';
const FILES=['/science-model.js','/science-atlas.js','/science-atlas.css','/assets/science-atlas.json','/orbit-ui.js','/orbit-ui.css','/orbit-store.js','/orbit-tours.js','/orbit-experience.js','/orbit-experience.css','/assets/solar-directory.json','/assets/planet-properties.json','/','/index.html','/space.html','/style.css','/app.js','/mobile.js','/solar-orbits.js','/space.css','/space.js','/space-model.js','/pwa.js','/pwa.css','/manifest.webmanifest','/assets/three.min.js','/assets/texture-manifest.json','/assets/space/catalog.json','/assets/space/nearby.json','/assets/icons/orbit-192.png','/assets/icons/orbit-512.png','/assets/icons/orbit-maskable.png','/assets/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('orbit-pwa-')&&![SHELL,RUNTIME,DATA].includes(key))await caches.delete(key);await self.clients.claim();})()));
let writes=Promise.resolve(),cacheGeneration=0;
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
 if(event.data?.type==='CLEAR_DOWNLOADS'){cacheGeneration++;const clear=async()=>{for(const key of await caches.keys())if(key.startsWith('orbit-pwa-')&&(key.endsWith('-assets')||key.includes('-data-')))await caches.delete(key);};writes=writes.then(clear,clear);event.waitUntil(writes.then(()=>event.ports?.[0]?.postMessage({ok:true}),()=>event.ports?.[0]?.postMessage({ok:false})));}
});
function save(cacheName,key,response,limit,maxBytes,generation=cacheGeneration){
 const work=async()=>{try{if(generation!==cacheGeneration)return;const blob=await response.blob();if(blob.size>maxBytes)return;const cache=await caches.open(cacheName);const headers=new Headers(response.headers);headers.set('X-Orbit-Bytes',String(blob.size));await cache.put(key,new Response(blob,{status:response.status,headers}));const keys=await cache.keys();let total=0;for(const entry of keys)total+=Number((await cache.match(entry)).headers.get('X-Orbit-Bytes')||0);while(keys.length>limit||total>48*1024*1024){const old=keys.shift();total-=Number((await cache.match(old)).headers.get('X-Orbit-Bytes')||0);await cache.delete(old);}}catch(_){/* Storage limits must never break viewing. */}};
 writes=writes.then(work,work);return writes;
}
async function announce(clientId,type){const client=await self.clients.get(clientId);client?.postMessage({type});}
function validRecord(record,now,id){return record&&String(record.id)===String(id)&&Number.isFinite(record.start)&&Number.isFinite(record.end)&&record.start<=now&&record.end>now&&Array.isArray(record.samples)&&record.samples.length>1&&record.samples.every((row,i)=>Array.isArray(row)&&row.length===7&&row.every(Number.isFinite)&&(!i||row[0]>record.samples[i-1][0]))&&record.samples[0][0]<=record.start&&record.samples[record.samples.length-1][0]>=record.end;}
async function usable(response,url){
 const path=url.pathname;
 if(!response?.ok)return null;
 try{const data=await response.clone().json(),now=Date.now()/1000;
  if(path==='/api/catalog')return Array.isArray(data.bodies)&&data.bodies.length?response:null;
  if(path==='/api/ephemeris')return validRecord(data,now,url.searchParams.get('id'))?response:null;
  const bodies=Object.fromEntries(Object.entries(data.bodies||{}).filter(([id,r])=>validRecord(r,now,id)));
  if(!Object.keys(bodies).length)return null;
  return new Response(JSON.stringify({...data,bodies,status:{...data.status,busy:false,ready:Object.keys(bodies).filter(k=>k!=='10').length,message:'Downloaded ephemeris'}}),{headers:{'Content-Type':'application/json'}});
 }catch(_){return null;}
}
async function api(event,url){
 const generation=cacheGeneration,cache=await caches.open(DATA),key=url.href;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),55000);
 try{const response=await fetch(event.request,{signal:controller.signal});if(!response.ok)throw Error('Unavailable');
  const checked=await usable(response,url);if(!checked)throw Error('Invalid ephemeris');event.waitUntil(save(DATA,key,checked.clone(),34,24*1024*1024,generation));
  event.waitUntil(announce(event.clientId,'FRESH_DATA'));return checked;
 }catch(_){const cached=await usable(await cache.match(key),url);
  if(cached){event.waitUntil(announce(event.clientId,'CACHED_DATA'));return cached;}
  event.waitUntil(announce(event.clientId,'DATA_UNAVAILABLE'));
  return new Response(JSON.stringify({error:'Offline: no downloaded data valid for the current time. Reconnect to refresh.'}),{status:503,headers:{'Content-Type':'application/json'}});
 }finally{clearTimeout(timeout);}
}
self.addEventListener('fetch',event=>{
 const generation=cacheGeneration,url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(['/api/catalog','/api/ephemeris','/api/ephemerides'].includes(url.pathname)){event.respondWith(api(event,url));return;}
 const path=url.pathname==='/space'?'/space.html':url.pathname;
 if(FILES.includes(path)){event.respondWith((async()=>{const cached=await (await caches.open(SHELL)).match(path);return cached||fetch(event.request);})());return;}
 // Cache only bounded local textures; external observations remain online-only.
 if(!url.pathname.startsWith('/assets/')||! /\.(webp|png|jpg|jpeg)$/.test(url.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(RUNTIME),cached=await cache.match(url.href);if(cached)return cached;
  try{const response=await fetch(event.request);if(response.ok)event.waitUntil(save(RUNTIME,url.href,response.clone(),40,2*1024*1024,generation));return response;}catch(_){return Response.error();}
 })());
});
