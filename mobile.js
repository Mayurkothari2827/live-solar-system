/* Mobile presentation mirrors the astronomy UI; it never computes or alters an epoch. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const compact = window.matchMedia('(max-width: 760px), (max-width: 1024px) and (max-height: 600px) and (pointer: coarse)');
  const dock = document.querySelector('.mobile-dock');
  const buttons = [...dock.querySelectorAll('[data-sheet]')];
  const inspector = byId('inspector');
  const details = inspector.querySelector('.data-details');
  let active = '', returnFocus = null, detailsWasOpen = false;
  const titles = { telemetry: 'Telemetry', moons: 'Moons & satellites', data: 'Data & accuracy' };
  function setSheet(name, trigger) {
    if (!compact.matches) return;
    const next = name === active ? '' : name;
    if (active === 'data') details.open = detailsWasOpen;
    active = next;
    document.body.dataset.sheet = next;
    buttons.forEach(button => button.setAttribute('aria-expanded', String(button.dataset.sheet === next)));
    byId('sheet-backdrop').hidden = !next;
    inspector.setAttribute('aria-hidden', String(!next || next === 'time'));
    if (next) {
      returnFocus = trigger || returnFocus;
      if (next === 'time') byId('close-time-sheet').focus({ preventScroll: true });
      else {
        byId('sheet-title').textContent = titles[next];
        inspector.scrollTop = 0;
        if (next === 'data') { detailsWasOpen = details.open; details.open = true; }
        byId('close-sheet').focus({ preventScroll: true });
      }
    } else if (returnFocus) { returnFocus.focus({ preventScroll: true }); returnFocus = null; }
  }
  buttons.forEach(button => button.addEventListener('click', () => setSheet(button.dataset.sheet, button)));
  ['close-sheet', 'close-time-sheet', 'sheet-backdrop'].forEach(id => byId(id).addEventListener('click', () => setSheet('')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { event.preventDefault(); setSheet(''); } });
  function adapt() {
    if (!compact.matches) {
      const focusedClose = document.activeElement === byId('close-sheet') || document.activeElement === byId('close-time-sheet');
      if (active === 'data') details.open = detailsWasOpen;
      active = ''; document.body.dataset.sheet = '';
      buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
      byId('sheet-backdrop').hidden = true;
      inspector.removeAttribute('aria-hidden'); returnFocus = null;
      if (focusedClose) byId('body-select').focus({ preventScroll: true });
    } else inspector.setAttribute('aria-hidden', String(!active || active === 'time'));
  }
  compact.addEventListener('change', adapt);
  adapt();
  function mirror() {
    const epoch = byId('utc-clock').getAttribute('datetime');
    const date = epoch ? new Date(epoch) : null;
    if (date && Number.isFinite(date.getTime())) {
      const iso = date.toISOString();
      const displayClock = byId('mobile-utc-clock');
      displayClock.textContent = iso.slice(11, 19) + ' UTC';
      displayClock.setAttribute('datetime', iso);
      byId('mobile-clock-date').textContent = iso.slice(0, 10);
    }
    const source = byId('state-label').textContent;
    byId('hud-source-state').textContent = source;
    document.body.dataset.ephemerisStatus = byId('state-dot').classList.contains('ready') ? 'ready' : /unavailable|failed|error/i.test(source) ? 'unavailable' : 'pending';
    const label = byId('clock-mode').textContent;
    const state = /paused/i.test(label) ? 'paused' : byId('live').classList.contains('active') ? 'live' : 'playback';
    document.body.dataset.clockState = state;
    byId('mobile-clock-state').textContent = state === 'live' ? 'REAL TIME' : state === 'paused' ? 'PAUSED' : label.replace(/playback/i, '').trim().toUpperCase() + ' PLAYBACK';
  }
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; mirror(); });
  });
  ['utc-clock', 'clock-mode', 'live', 'state-label', 'state-dot'].forEach(id => observer.observe(byId(id), { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['datetime', 'class'] }));
  mirror();
})();
