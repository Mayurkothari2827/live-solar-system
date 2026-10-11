(() => {
'use strict';
const $=id=>document.getElementById(id),dialog=$('app-dialog'),button=$('app-menu');
let promptEvent=null,registration=null,reloading=false;
const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function status(){const offline=!navigator.onLine;$('app-connection').hidden=!offline;$('app-connection').textContent=offline?'Offline · downloaded content only':'';}
button.onclick=()=>dialog.showModal();$('app-close').onclick=()=>{dialog.close();button.focus();};
window.addEventListener('online',status);window.addEventListener('offline',status);status();
$('install-app').hidden=installed();
$('install-help').textContent=installed()?'ORBIT is running as an installed app.':'On iPhone or iPad: open in Safari, tap Share, then Add to Home Screen. In other browsers, use the install option in the browser menu when available.';
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;$('install-app').hidden=false;$('install-app').textContent='Install ORBIT';});
$('install-app').onclick=async()=>{if(!promptEvent){$('install-help').focus();return;}const event=promptEvent;promptEvent=null;try{await event.prompt();const result=await event.userChoice;if(result.outcome==='accepted')$('install-app').hidden=true;}catch(_){$('install-help').textContent='Use your browser menu to install ORBIT.';}};
window.addEventListener('appinstalled',()=>{$('install-app').hidden=true;$('install-help').textContent='ORBIT is installed. Open it from your home screen.';});
if(!('serviceWorker' in navigator)||!window.isSecureContext){$('offline-ready').textContent='Offline support requires HTTPS or localhost in a browser that supports service workers.';return;}
function updateReady(){if(!registration?.waiting)return;$('update-app').hidden=false;button.textContent='App · update';}
$('update-app').onclick=()=>registration?.waiting?.postMessage({type:'ACTIVATE_UPDATE'});
navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});
navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='CACHED_DATA'||event.data?.type==='DATA_UNAVAILABLE'){$('app-connection').hidden=false;$('app-connection').textContent=event.data.type==='CACHED_DATA'?'Using downloaded data · see Data for validity':'No valid downloaded data · reconnect';}});
navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{registration=reg;updateReady();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',updateReady);});return navigator.serviceWorker.ready;}).then(()=>{$('offline-ready').textContent='App pages and deep-space catalogs are saved. Viewed local textures and valid ephemerides are saved as space permits. Telescope images need a connection.';}).catch(()=>{$('offline-ready').textContent='Offline setup failed. The website still works online; reload to retry.';});
})();
