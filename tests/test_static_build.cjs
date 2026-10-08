const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');

test('static build removes obsolete output and retains both observatories', () => {
  const output = path.join(ROOT, 'public');
  const oldAsset = path.join(output, 'assets', 'removed-feature-fixture', 'data.json');
  fs.mkdirSync(path.dirname(oldAsset), {recursive:true});
  fs.writeFileSync(oldAsset, '{}');
  fs.writeFileSync(path.join(output, 'removed-feature-fixture.html'), 'obsolete');
  execFileSync('python3', ['build_static.py'], {cwd:ROOT, timeout:30000});
  assert.equal(fs.existsSync(oldAsset), false);
  assert.equal(fs.existsSync(path.dirname(oldAsset)), false);
  assert.equal(fs.existsSync(path.join(output, 'removed-feature-fixture.html')), false);
  for (const file of ['index.html','app.js','mobile.js','solar-orbits.js','space.html','space.js','space-model.js','space.css','assets/space/catalog.json','assets/space/nearby.json']) {
    assert.ok(fs.existsSync(path.join(output, file)), file);
  }
  for (const file of ['server.py', 'api', 'kernels']) {
    assert.equal(fs.existsSync(path.join(output, file)), false, file);
  }
});
