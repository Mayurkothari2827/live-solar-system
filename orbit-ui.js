/* Presentation only: all positions, radii and time states come from the existing engine. */
(function (root) {
  'use strict';
  const format = (value, digits=1) => value.toLocaleString('en-GB', {maximumFractionDigits:digits});
  function model(t, properties, now) {
    const current = t.valid && Number.isFinite(t.start) && Number.isFinite(t.end) && t.start <= now && now <= t.end;
    const live = current && t.clockState === 'live' && Math.abs(t.epoch-now) < 5;
    const status = !t.valid ? 'Unavailable' : t.clockState === 'paused' ? 'Paused' : live ? 'Live now' : t.clockState === 'live' ? 'Expired data' : 'Playback';
    const period = properties?.bodies?.[t.id]?.period;
    return {
      status, live,
      distance: t.valid && Number.isFinite(t.distanceSun) ? (t.distanceSun >= 1e6 ? format(t.distanceSun/1e6)+' M km' : format(t.distanceSun,0)+' km') : 'Unavailable',
      radius: Number.isFinite(t.radius) ? format(t.radius)+' km' : 'Unavailable',
      period: Number.isFinite(period) ? format(period*365.25,2)+' days' : 'Unavailable',
      temperature:'Unavailable'
    };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = {model}; return; }
  const $ = id => document.getElementById(id), engine = root.ORBIT;
  if (!engine || !document.body.classList.contains('orbit-ui')) return;
  document.body.dataset.uiPlatform = root.Capacitor?.getPlatform?.() || 'web';
  let properties = null, manifest = null, lastId;
  const write = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
  async function references() {
    try {
      const responses = await Promise.all(['/assets/planet-properties.json','/assets/texture-manifest.json'].map(url=>fetch(url)));
      if (!responses.every(r=>r.ok)) return;
      [properties, manifest] = await Promise.all(responses.map(r=>r.json()));
      lastId = undefined; refresh();
    } catch (_) { /* Reference measurements remain unavailable offline until loaded. */ }
  }
  function refresh() {
    if (document.hidden) return;
    const t = engine.telemetry(), values = model(t,properties,Date.now()/1000);
    write('metric-distance',values.distance); write('metric-radius',values.radius);
    write('metric-period',values.period); write('metric-temperature',values.temperature);
    write('live-label',values.status);
    $('live').classList.toggle('active',values.live);
    document.body.dataset.liveStatus = values.live ? 'live' : 'inactive';
    $('live').setAttribute('aria-label', values.live ? 'Live now. Return to current UTC' : values.status+'. Return to current UTC');
    $('live').title = values.live ? 'Current UTC model'+' · reference surface imagery' : 'Return to current UTC; data must cover the selected instant';
    const body = engine.catalog().find(b=>b.id === t.id);
    const derivative = manifest?.textures?.[body?.texture]?.small?.path;
    const thumbnailKey = t.id+':'+(derivative||'');
    if (lastId !== thumbnailKey) {
      lastId = thumbnailKey;
      const image = $('selected-thumbnail');
      image.hidden = !derivative;
      if (derivative) image.src='/assets/'+derivative;
      const jupiter = engine.catalog().find(b=>b.id===599);
      const overviewMap = manifest?.textures?.[jupiter?.texture]?.small?.path;
      $('overview-thumbnail').hidden = !overviewMap;
      if (overviewMap) $('overview-thumbnail').src='/assets/'+overviewMap;
    }
    try {
      const saved=root.OrbitStore.read(localStorage).bookmarks.some(b=>b.scene?.kind==='solar' && Number(b.scene.id)===t.id);
      $('quick-save').setAttribute('aria-pressed',String(saved));
      $('quick-save').setAttribute('aria-label',saved?'Discovery saved on this device':'Save this discovery');
      write('quick-save',saved?'♥':'♡');
    } catch (_) { /* Saving reports its own storage errors through the existing controller. */ }
  }
  $('search-open').onclick=()=>{ $('experience-open').onclick(); $('directory-search').focus(); $('directory-search').scrollIntoView({block:'center'}); };
  $('quick-share').onclick=()=> $('share-scene').onclick();
  $('quick-save').onclick=()=>{ $('bookmark-object').onclick(); $('announcement').textContent=$('experience-status').textContent; refresh(); };
  $('compass').onclick=()=> $('top-view').onclick();
  // Surface sharing errors/copy confirmation outside the closed explorer dialog.
  new MutationObserver(()=>{ $('announcement').textContent=$('experience-status').textContent; }).observe($('experience-status'),{childList:true});
  let queued = false;
  const stateObserver = new MutationObserver(()=>{
    if (queued) return; queued = true;
    queueMicrotask(()=>{queued=false;refresh();});
  });
  for (const id of ['clock-mode','state-dot','scene-name']) stateObserver.observe($(id),{childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',refresh);
  root.addEventListener('online',references);
  setInterval(refresh,1000); references(); refresh();
})(typeof window !== 'undefined' ? window : globalThis);
