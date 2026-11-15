// Independent two-body model. SI units. Right-handed inertial XYZ: +Z north,
// XY equator, +X epoch zero longitude. Body-fixed frame rotates about +Z.
// Epoch is scenario t=0, not a real date or a TLE/SGP4 prediction.
export const TAU=2*Math.PI, RAD=Math.PI/180;
export const BODIES={earth:{radiusM:6371008.4,mu:3.98600435507e14,rotationSec:86164.09054},moon:{radiusM:1737400,mu:4.902800118e12,rotationSec:655.720*3600}};
export const ORBIT_PRESETS={
 leo:{body:'earth',altitudeM:500000,inclinationRad:51.6*RAD},
 sso:{body:'earth',altitudeM:700000,inclinationRad:98.2*RAD},
 geo:{body:'earth',semiMajorAxisM:Math.cbrt(BODIES.earth.mu*(BODIES.earth.rotationSec/TAU)**2),inclinationRad:0},
 llo:{body:'moon',altitudeM:100000,inclinationRad:90*RAD}
};
export const START_ANOMALY=-.25;
export function validateOrbit(o){
 if(!o||!BODIES[o.body])throw Error('Unsupported central body');
 for(const k of ['semiMajorAxisM','eccentricity','inclinationRad','raanRad','argumentRad','meanAnomalyRad'])if(!Number.isFinite(o[k]))throw Error('Non-finite orbital element: '+k);
 if(o.epochS!==undefined&&!Number.isFinite(o.epochS))throw Error('Invalid orbit epoch');
 if(o.semiMajorAxisM>1e10||o.eccentricity<0||o.eccentricity>=1||o.semiMajorAxisM*(1-o.eccentricity)<=BODIES[o.body].radiusM||o.inclinationRad<0||o.inclinationRad>Math.PI)throw Error('Orbit must be elliptic with periapsis above the surface and inclination 0–180°');
 return o;
}
export function presetOrbit(id,overrides={}){
 const p=ORBIT_PRESETS[id];if(!p)return null;
 return validateOrbit({body:p.body,semiMajorAxisM:p.semiMajorAxisM||BODIES[p.body].radiusM+p.altitudeM,eccentricity:0,inclinationRad:p.inclinationRad,raanRad:0,argumentRad:0,meanAnomalyRad:START_ANOMALY,...overrides});
}
export function orbitalPeriod(o){validateOrbit(o);return TAU*Math.sqrt(o.semiMajorAxisM**3/BODIES[o.body].mu);}
const rotateZ=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a),p[2]];
export function propagate(o,timeSec){
 validateOrbit(o);if(!Number.isFinite(timeSec))throw Error('Invalid elapsed seconds');
 const n=Math.sqrt(BODIES[o.body].mu/o.semiMajorAxisM**3),M=((o.meanAnomalyRad+n*timeSec+Math.PI)%TAU+TAU)%TAU-Math.PI,e=o.eccentricity;
 let E=e<.8?M:Math.sign(M||1)*Math.PI;
 for(let i=0;i<40;i++){const delta=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));E-=delta;if(Math.abs(delta)<1e-13)break;}
 const plane=[o.semiMajorAxisM*(Math.cos(E)-e),o.semiMajorAxisM*Math.sqrt(1-e*e)*Math.sin(E),0];
 const v=rotateZ(plane,o.argumentRad),c=Math.cos(o.inclinationRad),s=Math.sin(o.inclinationRad);
 return rotateZ([v[0],v[1]*c,v[1]*s],o.raanRad);
}
export function bodyAngle(body,elapsedSec){return (elapsedSec%BODIES[body].rotationSec)*TAU/BODIES[body].rotationSec;}
export function toFixed(position,body,timeSec){return rotateZ(position,-bodyAngle(body,timeSec));}
export function toInertial(position,body,timeSec){return rotateZ(position,bodyAngle(body,timeSec));}
export function surfacePoint(body,latitudeDeg,longitudeDeg){const a=latitudeDeg*RAD,b=longitudeDeg*RAD,r=BODIES[body].radiusM;return [r*Math.cos(a)*Math.cos(b),r*Math.cos(a)*Math.sin(b),r*Math.sin(a)];}
export function subSatellite(positionFixed){const r=Math.hypot(...positionFixed);return {latitudeDeg:Math.asin(positionFixed[2]/r)/RAD,longitudeDeg:Math.atan2(positionFixed[1],positionFixed[0])/RAD};}
export function segmentBlocked(a,b,radiusM){const d=b.map((v,i)=>v-a[i]),dd=d.reduce((s,v)=>s+v*v,0);if(!dd)return Math.hypot(...a)<radiusM;const u=Math.max(0,Math.min(1,-a.reduce((s,v,i)=>s+v*d[i],0)/dd));return Math.hypot(...a.map((v,i)=>v+u*d[i]))<radiusM-1e-5;}
export function elevation(positionFixed,station,body){const p=surfacePoint(body,station.latitudeDeg,station.longitudeDeg),d=positionFixed.map((v,i)=>v-p[i]);return Math.asin(Math.max(-1,Math.min(1,d.reduce((s,v,i)=>s+v*p[i],0)/(Math.hypot(...d)*BODIES[body].radiusM))))/RAD;}
export function eclipsed(position,body,sunDirection=[1,0,0]){const norm=Math.hypot(...sunDirection);if(!norm)throw Error('Sun direction must be nonzero');const sun=sunDirection.map(v=>v/norm),dot=position.reduce((s,v,i)=>s+v*sun[i],0);return dot<0&&Math.hypot(...position.map((v,i)=>v-dot*sun[i]))<BODIES[body].radiusM;}
// Scenario network: real geographic coordinates, assumed masks/availability.
export const EARTH_STATIONS=[{id:'canberra',latitudeDeg:-35.398,longitudeDeg:148.981,maskDeg:10},{id:'madrid',latitudeDeg:40.431,longitudeDeg:-4.249,maskDeg:10},{id:'goldstone',latitudeDeg:35.247,longitudeDeg:-116.793,maskDeg:10},{id:'svalbard',latitudeDeg:78.23,longitudeDeg:15.41,maskDeg:10}];
export const DEFAULT_TARGETS={earth:[{id:'equatorial',latitudeDeg:0,longitudeDeg:0,maskDeg:30},{id:'polar',latitudeDeg:80,longitudeDeg:15,maskDeg:30}],moon:[{id:'south-pole',latitudeDeg:-89,longitudeDeg:0,maskDeg:20}]};
export function geometryAt(o,timeSec,stations=EARTH_STATIONS,targets=DEFAULT_TARGETS[o.body]){
 const positionM=propagate(o,timeSec),fixedM=toFixed(positionM,o.body,timeSec+(o.epochS??0)),ground=subSatellite(fixedM);
 // Lunar Earth link: fixed distant Earth direction in this short scenario;
 // lunar occultation computed explicitly, Earth network handover not resolved.
 const visibleStations=o.body==='moon'?(segmentBlocked(positionM,[384400000,0,0],BODIES.moon.radiusM)?[]:['earth-link']):stations.filter(s=>elevation(fixedM,s,o.body)>=(s.maskDeg??10)).map(s=>s.id);
 return {timeSec,body:o.body,positionM,fixedM,...ground,sunlit:!eclipsed(positionM,o.body),contact:visibleStations.length>0,visibleStations,targetIds:targets.filter(t=>elevation(fixedM,t,o.body)>=(t.maskDeg??30)).map(t=>t.id)};
}
export function accessWindows(o,startSec,durationSec,{stations=EARTH_STATIONS,targets=DEFAULT_TARGETS[o.body],sampleSec=30}={}){
 if(!Number.isFinite(durationSec)||durationSec<0||durationSec>604800||!Number.isFinite(sampleSec)||sampleSec<=0)throw Error('Invalid forecast span');
 const windows=[],active=new Map();
 for(let t=startSec;t<=startSec+durationSec+sampleSec;t+=sampleSec){const end=Math.min(t,startSec+durationSec),g=geometryAt(o,end,stations,targets),keys=t>startSec+durationSec?[]:[...g.visibleStations.map(id=>'contact:'+id),...g.targetIds.map(id=>'target:'+id)];
  for(const [id,fromSec]of active)if(!keys.includes(id)){windows.push({id,fromSec,toSec:end});active.delete(id);}
  keys.forEach(id=>{if(!active.has(id))active.set(id,end);});
 }
 for(const [id,fromSec]of active)windows.push({id,fromSec,toSec:startSec+durationSec});
 return windows;
}
export function intervalEnvironment(o,startSec,durationSec,stations=EARTH_STATIONS){
 if(!Number.isFinite(durationSec)||durationSec<=0||durationSec>86400)throw Error('Interval must be positive and at most one day');
 const n=Math.ceil(durationSec/15);let sunlitFraction=0,contactFraction=0;
 for(let i=0;i<n;i++){const g=geometryAt(o,startSec+(i+.5)*durationSec/n,stations);sunlitFraction+=Number(g.sunlit)/n;contactFraction+=Number(g.contact)/n;}
 return {...geometryAt(o,startSec+durationSec,stations),sunlitFraction,contactFraction};
}
const forecastCache=new Map();
export function geometryForecast(o,stations=EARTH_STATIONS){
 validateOrbit(o);const key=JSON.stringify([o,stations]);if(forecastCache.has(key))return forecastCache.get(key);
 let contactSec=0,sunlitSec=0;
 for(let t=7.5;t<32400;t+=15){const g=geometryAt(o,t,stations);if(g.contact)contactSec+=15;if(g.sunlit)sunlitSec+=15;}
 const periodSec=orbitalPeriod(o),count=Math.min(7200,Math.ceil(periodSec*2/30)),step=periodSec*2/count;
 let current=0,longestEclipseSec=0;
 for(let i=0;i<count;i++){if(eclipsed(propagate(o,(i+.5)*step),o.body)){current+=step;longestEclipseSec=Math.max(current,longestEclipseSec);}else current=0;}
 const result=Object.freeze({periodSec,contactFraction:contactSec/32400,sunlitFraction:sunlitSec/32400,longestEclipseSec:Math.min(periodSec,longestEclipseSec),eclipseToleranceSec:step});
 if(forecastCache.size>=64)forecastCache.delete(forecastCache.keys().next().value);forecastCache.set(key,result);return result;
}
