import assert from 'node:assert/strict';
import {BODIES,TAU,RAD,presetOrbit,validateOrbit,orbitalPeriod,propagate,toFixed,toInertial,surfacePoint,elevation,segmentBlocked,eclipsed,geometryAt,accessWindows,intervalEnvironment} from '../js/engine/orbitalGeometry.js';
let n=0;const check=(ok,message)=>{assert.ok(ok,message);n++;},close=(a,b,t,message)=>check(Math.abs(a-b)<t,message);
const leo=presetOrbit('leo'),geo=presetOrbit('geo'),lunar=presetOrbit('llo');
close(orbitalPeriod(leo),5668.15,1,'500 km mean-radius circular period reference within 1 s');
close(orbitalPeriod(geo),86164.09054,1e-6,'GEO sidereal period');
const e=presetOrbit('leo',{eccentricity:.03,meanAnomalyRad:0});
close(Math.hypot(...propagate(e,0)),e.semiMajorAxisM*(1-.03),1e-6,'Elliptic pericentre');
close(Math.hypot(...propagate(e,orbitalPeriod(e)/2)),e.semiMajorAxisM*1.03,1e-6,'Elliptic apocentre');
for(const o of [leo,geo,lunar,e]){const p=propagate(o,0),q=propagate(o,orbitalPeriod(o));close(Math.hypot(...p.map((x,i)=>x-q[i])),0,1e-6,'Orbit closes after one period');for(let t=0;t<33000;t+=33){const v=propagate(o,t);check(Math.hypot(...v)>BODIES[o.body].radiusM,'No body intersections');const f=toFixed(v,o.body,t),back=toInertial(f,o.body,t);close(Math.hypot(...back.map((x,i)=>x-v[i])),0,1e-6,'Frame transform inverse');}}
const r=BODIES.earth.radiusM,s={latitudeDeg:0,longitudeDeg:0};
close(elevation([r+500000,0,0],s,'earth'),90,1e-8,'Zenith elevation');check(elevation([-r-500000,0,0],s,'earth')<0,'Far side below horizon');
check(segmentBlocked([r+500000,0,0],[-r-500000,0,0],r),'Body blocks far-side link');check(!segmentBlocked([r+500000,0,0],[r+500000,1e6,0],r),'Unobstructed link');
check(eclipsed([-r-500000,0,0],'earth'),'Night-side cylinder eclipse');check(!eclipsed([r+500000,0,0],'earth'),'Sunward lit');check(!eclipsed([-r-500000,2*r,0],'earth'),'Above shadow cylinder');
const polar={id:'polar',latitudeDeg:89,longitudeDeg:0,maskDeg:5};
check(accessWindows(presetOrbit('leo',{inclinationRad:0}),0,12000,{stations:[polar]}).every(w=>!w.id.startsWith('contact:')),'Equatorial orbit cannot see polar station');
check(accessWindows(presetOrbit('sso'),0,12000,{stations:[polar]}).some(w=>w.id==='contact:polar'),'Polar orbit reaches polar station');
check(accessWindows(leo,0,32400,{stations:[]}).every(w=>!w.id.startsWith('contact:')),'No station means no Earth contact');
const station={id:'test',latitudeDeg:0,longitudeDeg:0,maskDeg:0};const zenith=presetOrbit('leo',{inclinationRad:0,meanAnomalyRad:0});
check(geometryAt(zenith,0,[station]).contact,'Station at initial subpoint sees craft');check(!geometryAt(zenith,0,[{...station,maskDeg:91}]).contact,'Elevation mask affects visibility');
check(geometryAt(lunar,0).body==='moon'&&Math.hypot(...geometryAt(lunar,0).positionM)<2e6,'Moon frame not Earth frame');
for(const bad of [{eccentricity:1},{eccentricity:-.1},{semiMajorAxisM:r},{inclinationRad:4},{raanRad:NaN}]){assert.throws(()=>presetOrbit('leo',bad));n++;}
check(presetOrbit('lagrange')===null,'Unsupported halo has no invented orbit');
check(JSON.stringify(intervalEnvironment(leo,0,270))===JSON.stringify(intervalEnvironment(leo,0,270)),'Deterministic interval integration');
console.log(`PASS: ${n} orbital geometry assertions`);
