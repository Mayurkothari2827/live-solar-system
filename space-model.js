/* Catalog positions in an ICRS-aligned, right-handed Three.js frame.
   +X: RA 0°, Dec 0°; +Y: north pole; -Z: RA 90°, Dec 0°. */
(function(root){
'use strict';
const PC_TO_LY=3.261563777,AU_KM=149597870.7,RS_PER_SOLAR_KM=2.95333938;
function position(raDeg,decDeg,distancePc){
 if(![raDeg,decDeg,distancePc].every(Number.isFinite)||distancePc<0||Math.abs(decDeg)>90)return null;
 const r=raDeg*Math.PI/180,d=decDeg*Math.PI/180;
 return [distancePc*Math.cos(d)*Math.cos(r),distancePc*Math.sin(d),-distancePc*Math.cos(d)*Math.sin(r)];
}
function compress(point,unit=1){
 const r=Math.hypot(...point);if(!r)return [0,0,0];
 const gain=6*Math.log1p(r/unit)/r;return point.map(v=>v*gain);
}
function schwarzschildKm(massSolar){return Number.isFinite(massSolar)&&massSolar>0?massSolar*RS_PER_SOLAR_KM:null;}
function starColor(k){return k&&k<3800?0xffb48b:k&&k<5400?0xffe0b4:k&&k>7500?0xa8cfff:0xe9f1ff;}
function systemLayout(planets){
 return planets.map((p,i)=>({planet:p,angle:i*2.39996323,radius:p.pl_orbsmax>0?2.4+2.5*Math.log1p(p.pl_orbsmax/.02):null,phaseKnown:false}));
}
const api={PC_TO_LY,AU_KM,RS_PER_SOLAR_KM,position,compress,schwarzschildKm,starColor,systemLayout};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpaceModel=api;
})(typeof window==='undefined'?globalThis:window);
