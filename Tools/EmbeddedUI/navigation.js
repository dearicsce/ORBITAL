// Educational planar body ephemerides + 3D two-body spacecraft propagation.
// SI, J2000 ecliptic, seconds from 2026-11-05 00:00 TDB. Never UTC.
export const NAV_VERSION='dated-conics-1';
export const NAV_EPOCH='2026-11-05T00:00:00';
export const AU=149597870700, DAY=86400, SUN_MU=1.32712440018e20, EARTH_MU=3.98600435507e14;
export const navProvenance={version:NAV_VERSION,epochTDB:NAV_EPOCH,frame:'J2000 ecliptic',units:'m, m/s, TDB seconds',
 rangeTDB:['2026-11-01','2027-12-31'],provider:'NASA/JPL Horizons; ORBITAL derived circular approximation',
 source:'https://ssd.jpl.nasa.gov/horizons/',constants:'https://ssd.jpl.nasa.gov/astro_par.html',
 input:'Bundled horizons-atlas-reference.json: Earth/Mars positions at JD 2461349.5 TDB',
 transformation:'Project initial longitude into ecliptic XY; fixed mean radii 1 and 1.524 AU; Kepler circular mean motion. Lunar phase zero at scenario epoch is authored.',
 limitations:'Not interpolated Horizons trajectories. Circular coplanar body model omits eccentricity, perturbations and lunar inclination. Lunar dates are scenario geometry, not actual lunar launch windows. Impulsive burns, patched Earth escape, no operational navigation accuracy.'};
export const norm=v=>Math.hypot(...v),add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function dateSeconds(value){
 if(typeof value!=='string'||!/^202[67]-\d\d-\d\d(?:T\d\d:\d\d:\d\d)?$/.test(value))throw Error('Use a supported TDB calendar date.');
 const ms=Date.parse(value+'Z'),t=(ms-Date.parse(NAV_EPOCH+'Z'))/1000;
 if(!Number.isFinite(t)||ms<Date.parse('2026-11-01Z')||ms>Date.parse('2027-12-31Z'))throw Error('Date outside pinned navigation range.');
 if(new Date(ms).toISOString().slice(0,19)!==(value.length===10?value+'T00:00:00':value))throw Error('Invalid TDB calendar date');
 return t;
}
export function bodyState(body,t){
 const radius=body==='moon'?384400000:(body==='earth'?1:body==='mars'?1.524:NaN)*AU;
 if(!Number.isFinite(radius)||!Number.isFinite(t))throw Error('Unsupported navigation body/time');
 const mu=body==='moon'?EARTH_MU:SUN_MU;
 const phase=body==='moon'?0:body==='earth'?Math.atan2(99670599.13118644,109885602.3601905):Math.atan2(233561578.1023529,-51019726.92011663);
 const rate=Math.sqrt(mu/radius**3),angle=phase+rate*t;
 return {r:[radius*Math.cos(angle),radius*Math.sin(angle),0],v:[-radius*rate*Math.sin(angle),radius*rate*Math.cos(angle),0]};
}
export function equatorialToEcliptic(v){const a=23.43928*Math.PI/180;return [v[0],v[1]*Math.cos(a)+v[2]*Math.sin(a),-v[1]*Math.sin(a)+v[2]*Math.cos(a)];}
export function eclipticToEquatorial(v){const a=23.43928*Math.PI/180;return [v[0],v[1]*Math.cos(a)-v[2]*Math.sin(a),v[1]*Math.sin(a)+v[2]*Math.cos(a)];}
function stumpff(z){if(Math.abs(z)<1e-7)return [.5-z/24+z*z/720,1/6-z/120+z*z/5040];if(z>0){const q=Math.sqrt(z);return [(1-Math.cos(q))/z,(q-Math.sin(q))/q**3];}const q=Math.sqrt(-z);return [(Math.cosh(q)-1)/(-z),(Math.sinh(q)-q)/q**3];}
// Zero-revolution universal-variable Lambert, short prograde arc. Fail closed.
export function lambert(r1v,r2v,seconds,mu){
 const r1=norm(r1v),r2=norm(r2v),cos=Math.max(-1,Math.min(1,dot(r1v,r2v)/(r1*r2)));
 const crossZ=r1v[0]*r2v[1]-r1v[1]*r2v[0],sin=(crossZ>=0?1:-1)*Math.sqrt(1-cos*cos);
 const A=sin*Math.sqrt(r1*r2/(1-cos));
 if(!Number.isFinite(A)||Math.abs(A)<1||seconds<=0||mu<=0)throw Error('Degenerate or unsupported Lambert geometry');
 function at(z){const [C,S]=stumpff(z);if(C<=0)return null;const y=r1+r2+A*(z*S-1)/Math.sqrt(C);if(y<0)return null;const x=Math.sqrt(y/C);return {y,time:(x*x*x*S+A*Math.sqrt(y))/Math.sqrt(mu)};}
 let lo=-4*Math.PI*Math.PI,hi=4*Math.PI*Math.PI-1e-6;
 for(let i=0;i<150;i++){const mid=(lo+hi)/2,q=at(mid);if(!q||q.time<seconds)lo=mid;else hi=mid;}
 const q=at((lo+hi)/2);if(!q||Math.abs(q.time-seconds)>.01)throw Error('No supported transfer solution');
 const f=1-q.y/r1,g=A*Math.sqrt(q.y/mu),gd=1-q.y/r2;
 return {v1:mul(sub(r2v,mul(r1v,f)),1/g),v2:mul(sub(mul(r2v,gd),r1v),1/g)};
}
export function propagateState(state,seconds,mu,maxStep=3600){
 if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(maxStep)||maxStep<=0)throw Error('Invalid propagation interval');
 let r=[...state.r],v=[...state.v];const n=Math.max(1,Math.ceil(seconds/maxStep)),h=seconds/n;
 const accel=r=>mul(r,-mu/norm(r)**3);
 for(let i=0;i<n;i++){
  const a=accel(r),r2=add(r,mul(v,h/2)),v2=add(v,mul(a,h/2)),a2=accel(r2),r3=add(r,mul(v2,h/2)),v3=add(v,mul(a2,h/2)),a3=accel(r3),r4=add(r,mul(v3,h)),v4=add(v,mul(a3,h)),a4=accel(r4);
  r=add(r,mul(add(add(v,mul(v2,2)),add(mul(v3,2),v4)),h/6));v=add(v,mul(add(add(a,mul(a2,2)),add(mul(a3,2),a4)),h/6));
 }
 return {r,v};
}
const pathCache=new WeakMap();
export function navigationPosition(t,fraction){
 let points=pathCache.get(t);
 if(!points){points=[structuredClone(t.initial)];for(let i=1;i<=120;i++)points.push(propagateState(points.at(-1),t.travelSec/120,t.centralMu,t.lunar?30:1800));pathCache.set(t,points);}
 const x=Math.max(0,Math.min(120,fraction*120)),i=Math.floor(x),j=Math.min(120,i+1);return points[i].r.map((v,k)=>v+(points[j].r[k]-v)*(x-i));
}
export function datedTrajectory(mission,design,plan,parking){
 if(!['moon','mars'].includes(mission.destination)||!mission.transfer)throw Error('Dated navigation supports Moon/Mars transfer missions only');
 const lunar=mission.destination==='moon',launchTdbSec=dateSeconds(plan.launchDateTDB),epoch=launchTdbSec+(parking?.insertionTimeS??0);
 const mu=lunar?EARTH_MU:SUN_MU,travelSec=(lunar?5:259)*DAY;
 const earth=bodyState('earth',epoch),start=lunar?(parking?equatorialToEcliptic(parking.positionM):[6871008.4,0,0]):earth.r;
 const end=bodyState(mission.destination,epoch+travelSec),solution=lambert(start,end.r,travelSec,mu);
 const radius=parking?norm(parking.positionM):6871008.4,speed=parking?norm(parking.velocityMps):Math.sqrt(EARTH_MU/radius);
 const departureDv=lunar?norm(sub(solution.v1,parking?equatorialToEcliptic(parking.velocityMps):[0,speed,0])):Math.max(0,Math.sqrt(2*EARTH_MU/radius+norm(sub(solution.v1,earth.v))**2)-speed);
 const arrivalRelative=norm(sub(solution.v2,end.v));
 const target=lunar?{name:'Moon',radiusM:1737400,mu:4.902800118e12}:{name:'Mars',au:1.524,radiusM:3389500,mu:4.282837e13};
 const periapsis=target.radiusM+(lunar?100000:300000),arrivalDv=mission.transfer.type==='capture'?Math.sqrt(arrivalRelative**2+2*target.mu/periapsis)-Math.sqrt(target.mu/periapsis):mission.transfer.type==='rendezvous'?arrivalRelative:0;
 return {navigationVersion:NAV_VERSION,provenance:navProvenance,epochTdbSec:epoch,launchTdbSec,center:lunar?'earth':'sun',frame:'J2000 ecliptic',units:'SI',target,lunar,centralMu:mu,travelSec,departureDv,arrivalDv,arrivalRelative,correctionDv:lunar?18:40,
  r1:norm(start),r2:norm(end.r),a:(norm(start)+norm(end.r))/2,distanceM:lunar?384400000:2.524*AU,lightMinutes:(lunar?384400000:2.524*AU)/299792458/60,
  departureDay:epoch/DAY,synodicDays:lunar?29.53:780,phaseDeg:Math.atan2(end.r[1],end.r[0])*180/Math.PI,conditions:navProvenance.limitations,
  initial:{r:start,v:solution.v1},targetState:end,solution,periapsis};
}
