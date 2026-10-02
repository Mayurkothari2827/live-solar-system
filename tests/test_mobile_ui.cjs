const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'mobile.js'), 'utf8');
class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(fn); }
  emit(name, event = {}) { for (const fn of this.listeners.get(name) || []) fn(event); }
}
function boot(compact = true) {
  const document = new Target();
  class Element extends Target {
    constructor() { super(); this.dataset = {}; this.attributes = {}; this.textContent = ''; this.hidden = false; this.open = false; this.scrollTop = 0; this.classes = new Set(); this.classList = { contains: name => this.classes.has(name) }; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    focus() { document.activeElement = this; }
  }
  const ids = new Map([...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const buttons = ['telemetry', 'moons', 'time', 'data'].map(name => { const button = new Element(); button.dataset.sheet = name; return button; });
  const details = new Element(), dock = new Element(), media = new Target(); media.matches = compact;
  dock.querySelectorAll = () => buttons; ids.get('inspector').querySelector = () => details;
  const body = new Element(); Object.assign(document, { body, activeElement: null, getElementById: id => ids.get(id), querySelector: () => dock });
  ids.get('utc-clock').setAttribute('datetime', '2026-10-02T12:34:56.123Z');
  ids.get('clock-mode').textContent = 'Real time · 1×'; ids.get('live').classes.add('active');
  ids.get('state-label').textContent = 'JPL ephemeris loaded'; ids.get('state-dot').classes.add('ready');
  let notify; const window = { matchMedia: () => media };
  vm.runInNewContext(source, { window, document, Date, Number, queueMicrotask, MutationObserver: class { constructor(fn) { notify = fn; } observe() {} } });
  return { document, body, buttons, ids, details, media, click(name) { buttons.find(button => button.dataset.sheet === name).emit('click'); }, async mutation() { notify(); await Promise.resolve(); } };
}

test('mobile sheets toggle with accessible state, Escape dismissal and return focus', () => {
  const ui = boot(); assert.equal(ui.ids.get('inspector').getAttribute('aria-hidden'), 'true');
  ui.click('telemetry'); assert.equal(ui.body.dataset.sheet, 'telemetry');
  assert.equal(ui.buttons[0].getAttribute('aria-expanded'), 'true');
  assert.equal(ui.ids.get('sheet-backdrop').hidden, false); assert.equal(ui.document.activeElement, ui.ids.get('close-sheet'));
  ui.click('moons'); assert.equal(ui.body.dataset.sheet, 'moons'); assert.equal(ui.buttons[0].getAttribute('aria-expanded'), 'false');
  assert.equal(ui.ids.get('sheet-title').textContent, 'Moons & satellites');
  let prevented = false; ui.document.emit('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert(prevented); assert.equal(ui.body.dataset.sheet, ''); assert.equal(ui.ids.get('sheet-backdrop').hidden, true);
  assert.equal(ui.document.activeElement, ui.buttons[1]); assert.equal(ui.ids.get('inspector').getAttribute('aria-hidden'), 'true');
});

test('data sheet preserves desktop disclosure state and rotation never leaves focus hidden', () => {
  const ui = boot(); ui.details.open = false; ui.click('data'); assert.equal(ui.details.open, true);
  ui.ids.get('close-sheet').emit('click'); assert.equal(ui.details.open, false);
  ui.details.open = true; ui.click('data'); ui.click('data'); assert.equal(ui.details.open, true);
  ui.click('telemetry'); ui.media.matches = false; ui.media.emit('change');
  assert.equal(ui.body.dataset.sheet, ''); assert.equal(ui.ids.get('inspector').getAttribute('aria-hidden'), null);
  assert.equal(ui.document.activeElement, ui.ids.get('body-select'));
  assert(ui.buttons.every(button => button.getAttribute('aria-expanded') === 'false'));
  ui.click('time'); assert.equal(ui.body.dataset.sheet, '', 'desktop dock cannot open a mobile sheet');
});

test('time drawer and backdrop change presentation without touching the epoch', () => {
  const ui = boot(); ui.click('time'); assert.equal(ui.body.dataset.sheet, 'time');
  assert.equal(ui.document.activeElement, ui.ids.get('close-time-sheet')); assert.equal(ui.ids.get('inspector').getAttribute('aria-hidden'), 'true');
  ui.ids.get('sheet-backdrop').emit('click'); assert.equal(ui.body.dataset.sheet, '');
  assert.equal(ui.ids.get('utc-clock').getAttribute('datetime'), '2026-10-02T12:34:56.123Z');
  assert.equal(ui.document.activeElement, ui.buttons[2]);
});

test('phone clock mirrors the actual displayed UTC epoch and distinguishes accelerated playback and pause', async () => {
  const ui = boot(); assert.equal(ui.ids.get('mobile-utc-clock').textContent, '12:34:56 UTC');
  assert.equal(ui.ids.get('mobile-clock-date').textContent, '2026-10-02'); assert.equal(ui.body.dataset.clockState, 'live');
  ui.ids.get('utc-clock').setAttribute('datetime', '2026-10-03T01:02:03Z');
  ui.ids.get('clock-mode').textContent = '3,600× playback'; ui.ids.get('live').classes.delete('active'); await ui.mutation();
  assert.equal(ui.ids.get('mobile-utc-clock').textContent, '01:02:03 UTC'); assert.equal(ui.ids.get('mobile-clock-date').textContent, '2026-10-03');
  assert.equal(ui.body.dataset.clockState, 'playback'); assert.equal(ui.ids.get('mobile-clock-state').textContent, '3,600× PLAYBACK');
  ui.ids.get('clock-mode').textContent = 'Paused'; await ui.mutation(); assert.equal(ui.body.dataset.clockState, 'paused');
  assert.equal(ui.ids.get('mobile-clock-state').textContent, 'PAUSED');
});

test('missing ephemeris remains unavailable independently of clock mode; invalid timestamps are not fabricated', async () => {
  const ui = boot(); assert.equal(ui.body.dataset.ephemerisStatus, 'ready');
  ui.ids.get('state-dot').classes.delete('ready'); ui.ids.get('state-label').textContent = 'Position data unavailable';
  ui.ids.get('utc-clock').setAttribute('datetime', 'invalid'); await ui.mutation();
  assert.equal(ui.body.dataset.ephemerisStatus, 'unavailable'); assert.equal(ui.ids.get('hud-source-state').textContent, 'Position data unavailable');
  assert.equal(ui.body.dataset.clockState, 'live'); assert.equal(ui.ids.get('mobile-utc-clock').textContent, '12:34:56 UTC');
  ui.ids.get('state-label').textContent = 'Connecting to JPL data'; await ui.mutation(); assert.equal(ui.body.dataset.ephemerisStatus, 'pending');
});
