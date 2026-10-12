const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function boot({scheme='https'}={}){
 const cache=new Map(),listeners={},badge={hidden:true},dialog={open:true,close(){this.open=false;}};
 const now=Date.now()/1000;
 let response={status:200,data:{id:399,start:now-100,end:now+100,samples:[[now-100,1,2,3,4,5,6],[now+100,1,2,3,4,5,6]]}},offline=false;
 const location={href:scheme+'://localhost/space.html',origin:scheme+'://localhost',pathname:'/space.html'};
 const window={fetch:async()=>new Response('external'),dispatchEvent(){}};
 const context={window,location,Response,URL,Date,DOMException,Event,document:{getElementById:id=>id==='app-dialog'?dialog:badge,body:{dataset:{}},dispatchEvent(){}},Capacitor:{isNativePlatform:()=>true},CapacitorHttp:{get:async()=>{if(offline)throw Error('offline');return response;}},App:{addListener:(name,fn)=>listeners[name]=fn},Share:{share:async()=>{}},Directory:{Data:'DATA',Cache:'CACHE'},Encoding:{UTF8:'UTF8'},Filesystem:{readdir:async()=>({files:cache.size?[{name:'ephemeris'}]:[]}),readFile:async({path})=>({data:cache.get(path)}),writeFile:async({path,data})=>{cache.set(path,data);return {uri:path};},rmdir:async()=>cache.clear()}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../native/bridge.js'),'utf8').replace(/^import .*;\n/gm,''),context);
 return {context,window,cache,listeners,badge,dialog,location,set offline(v){offline=v;},set response(v){response=v;}};
}
test('native downloads reject wrong bodies and expired caches; valid offline data clears on request',async()=>{
 const b=boot();assert.equal((await b.window.fetch('/api/ephemeris?id=399')).status,200);b.offline=true;assert.equal((await b.window.fetch('/api/ephemeris?id=399')).status,200);assert.equal(b.badge.hidden,false);
 b.cache.set('ephemeris/399.json',JSON.stringify({id:499,start:0,end:Date.now()/1000+100,samples:[1,2]}));assert.equal((await b.window.fetch('/api/ephemeris?id=399')).status,503);
 b.cache.set('ephemeris/399.json',JSON.stringify({id:399,start:0,end:1,samples:[1,2]}));assert.equal((await b.window.fetch('/api/ephemeris?id=399')).status,503);
 await b.window.OrbitNative.clearDownloads();assert.equal(b.cache.size,0);b.offline=false;await b.window.fetch('/api/ephemeris?id=399');assert.equal(b.badge.hidden,true);
});
test('native bridge respects abort, route boundaries, methods and Android panel back',async()=>{
 const b=boot();assert.equal((await b.window.fetch('/api/ephemeris?id=../../x')).status,400);assert.equal((await b.window.fetch('/api/catalog',{method:'POST'})).status,405);assert.equal(await (await b.window.fetch('https://other.test/api/catalog')).text(),'external');
 const c=new AbortController();c.abort();await assert.rejects(b.window.fetch('/api/catalog',{signal:c.signal}),{name:'AbortError'});
 b.window.OrbitBack=()=>true;b.listeners.backButton();assert.equal(b.dialog.open,false);delete b.window.OrbitBack;assert.equal(b.location.href,'https://localhost/space.html');b.listeners.backButton();assert.equal(b.location.href,'/');
});
test('cache clearing invalidates requests already in flight',async()=>{
 const b=boot();let resolve;const now=Date.now()/1000;b.response=new Promise(r=>resolve=r);
 const pending=b.window.fetch('/api/ephemeris?id=399');await b.window.OrbitNative.clearDownloads();resolve({status:200,data:{id:399,start:now-100,end:now+100,samples:[[now-100,1,2,3,4,5,6],[now+100,1,2,3,4,5,6]]}});assert.equal((await pending).status,200);assert.equal(b.cache.size,0);
});

test('iOS custom scheme routes only its own bundled API authority',async()=>{const b=boot({scheme:'capacitor'});assert.equal((await b.window.fetch(new URL('capacitor://localhost/api/ephemeris?id=399'))).status,200);assert.equal(await (await b.window.fetch('capacitor://elsewhere/api/catalog')).text(),'external');});
test('native cancellation rejects promptly while an uncancellable HTTP transport remains pending',async()=>{
 const b=boot();let resolve;b.response=new Promise(r=>resolve=r);const c=new AbortController(),pending=b.window.fetch('/api/ephemeris?id=399',{signal:c.signal});c.abort();
 await assert.rejects(Promise.race([pending,new Promise((_,reject)=>setTimeout(()=>reject(Error('Abort did not return promptly')),100))]),{name:'AbortError'});
 const now=Date.now()/1000;resolve({status:200,data:{id:399,start:now-1,end:now+100,samples:[[now-1,1,2,3,4,5,6],[now+100,1,2,3,4,5,6]]}});await new Promise(r=>setImmediate(r));assert.equal(b.cache.size,0);
});

test('native lifecycle emits visibility and reconnection without altering astronomical data',()=>{
 const b=boot(),events=[];b.context.document.dispatchEvent=e=>events.push(e.type);b.context.window.dispatchEvent=e=>events.push(e.type);
 b.listeners.appStateChange({isActive:false});assert.equal(b.context.document.body.dataset.nativeBackground,'true');
 b.listeners.appStateChange({isActive:true});assert.equal(b.context.document.body.dataset.nativeBackground,'false');
 assert.deepEqual(events,['visibilitychange','visibilitychange','online']);
});
test('native image sharing writes only the scoped cache file and propagates cancellation',async()=>{
 const b=boot(),writes=[],shares=[];b.context.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,cG5n';this.onload();}};
 b.context.Filesystem.writeFile=async args=>{writes.push(args);return {uri:'file:///app/cache/orbit-share/orbit-view.png'};};
 b.context.Share.share=async args=>shares.push(args);await b.window.OrbitNative.shareImage({});
 assert.equal(writes[0].directory,'CACHE');assert.equal(writes[0].path,'orbit-share/orbit-view.png');assert.equal(writes[0].data,'cG5n');
 assert.equal(shares[0].files[0],'file:///app/cache/orbit-share/orbit-view.png');
 b.context.Share.share=async()=>{throw Error('Share canceled');};await assert.rejects(b.window.OrbitNative.shareImage({}),/Share canceled/);
});
