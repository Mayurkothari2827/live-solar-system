const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { SUN_GM: mu, AU_KM: AU, ellipseFromState, compressPosition } = require('../solar-orbits.js');
const norm = p => Math.hypot(...p);
const dot = (a,b) => a.reduce((sum,x,i) => sum+x*b[i], 0);
const near = (actual, expected, relative=1e-10) => assert(Math.abs(actual-expected) <= Math.max(1e-7, Math.abs(expected)*relative), `${actual} ≠ ${expected}`);
const vectorNear = (a,b,relative=1e-10) => a.forEach((x,i) => near(x,b[i],relative));

function rotate([x,y,z]) {
  // A non-axis-aligned proper rotation exercises all three coordinates.
  const i=.61, w=.38, o=1.17;
  const a=x*Math.cos(w)-y*Math.sin(w), b=x*Math.sin(w)+y*Math.cos(w);
  const c=b*Math.cos(i)-z*Math.sin(i), d=b*Math.sin(i)+z*Math.cos(i);
  return [a*Math.cos(o)-c*Math.sin(o), a*Math.sin(o)+c*Math.cos(o), d];
}
function state(a,e,E) {
  const b=a*Math.sqrt(1-e*e), rate=Math.sqrt(mu/a**3)/(1-e*Math.cos(E));
  return {r:rotate([a*(Math.cos(E)-e),b*Math.sin(E),0]),v:rotate([-a*Math.sin(E)*rate,b*Math.cos(E)*rate,0])};
}

test('a tilted eccentric guide uses the current state, correct focus and actual periapsis/apoapsis',()=>{
  const a=AU*1.524,e=.0934,E=1.13,{r,v}=state(a,e,E),orbit=ellipseFromState(r,v);
  assert(orbit);assert.equal(orbit.points.length,257);vectorNear(orbit.points[0],r);assert.deepEqual(orbit.points[256],orbit.points[0]);
  near(orbit.a,a);near(orbit.e,e);near(orbit.periapsis,a*(1-e));near(orbit.apoapsis,a*(1+e));
  for(const p of orbit.points) {
    assert(Math.abs(dot(p,orbit.normal))/norm(p)<1e-13);
    const x=dot(p,orbit.periapsisDirection),y=dot(p,orbit.transverseDirection);
    near((x/a+e)**2+(y/orbit.b)**2,1);
    // The polar equation uses the Sun at the origin, not the ellipse centre.
    near(norm(p),a*(1-e*e)/(1+e*x/norm(p)));
  }
  near(norm(orbit.normal),1);near(norm(orbit.periapsisDirection),1);near(dot(orbit.normal,orbit.periapsisDirection),0);
});

test('circular and near-circular states keep a stable plane without singular periapsis',()=>{
  for(const e of [0,1e-14,1e-9]) {
    const {r,v}=state(AU,e,2.3),orbit=ellipseFromState(r,v,128);assert(orbit);assert.equal(orbit.points.length,129);vectorNear(orbit.points[0],r);
    near(orbit.a,AU);near(orbit.e,e);for(const p of orbit.points)assert(p.every(Number.isFinite));
  }
});

test('eccentric-anomaly samples include true periapsis and apoapsis when starting there',()=>{
  const a=AU*.387,e=.2056,{r,v}=state(a,e,0),orbit=ellipseFromState(r,v,{samples:256});
  near(norm(orbit.points[0]),a*(1-e));near(norm(orbit.points[128]),a*(1+e));
  // Orbital angular momentum and energy recover the same state geometry.
  const energy=dot(v,v)/2-mu/norm(r);near(energy,-mu/(2*orbit.a));
});

test('radial, invalid, parabolic and hyperbolic states get no invented guide',()=>{
  const invalid=[
    [null,[1,2,3]],[[0,0,0],[1,2,3]],[[AU,0,0],[0,0,0]],[[AU,0,0],[1,0,0]],
    [[AU,NaN,0],[0,30,0]],[[AU,0,Infinity],[0,30,0]],[[AU,0],[0,30,0]],
    [[AU,0,0],[0,Math.sqrt(2*mu/AU),0]],[[AU,0,0],[0,80,0]]
  ];
  for(const [r,v] of invalid)assert.equal(ellipseFromState(r,v),null);
  assert.equal(ellipseFromState([AU,0,0],[0,30,0],{mu:-1}),null);
  assert.equal(ellipseFromState([AU,0,0],[0,30,0],{samples:NaN}),null);
});

test('sample limits and alternate positive gravitational parameters remain bounded',()=>{
  const orbit=ellipseFromState([10000,0,0],[0,Math.sqrt(398600/10000),0],{mu:398600,samples:1});
  assert.equal(orbit.points.length,17);near(orbit.a,10000);near(orbit.e,0);
  assert.equal(ellipseFromState([AU,0,0],[0,30,0],{samples:1e6}).points.length,4097);
});

test('presentation compression is monotonic and preserves directions and attachment to guides',()=>{
  let previous=0;
  for(const radius of [.001,.1,.387,1,5.2,9.58,19.2,30.1]) {
    const result=compressPosition([radius*AU,0,0]);assert(result[0]>previous);previous=result[0];near(result[1],0);near(result[2],0);
  }
  assert.deepEqual(compressPosition([0,0,0]),[0,0,0]);
  const {r,v}=state(AU*30,.01,1.2),orbit=ellipseFromState(r,v);
  vectorNear(compressPosition(orbit.points[0]),compressPosition(r));
  const p=compressPosition(r);vectorNear(p.map(x=>x/norm(p)),r.map(x=>x/norm(r)));
  assert.equal(compressPosition([NaN,0,0]),null);assert.equal(compressPosition([1,0,0],0),null);assert.equal(compressPosition([1,0,0],AU,0),null);
});

test('browser export works without a module loader or Three.js',()=>{
  const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../solar-orbits.js'),'utf8'),context);
  assert.equal(context.window.SolarOrbitGuides.SUN_GM,mu);assert.equal(typeof context.window.SolarOrbitGuides.ellipseFromState,'function');
});
