import * as THREE from 'three';
import {presetOrbit,propagate,BODIES,orbitalPeriod} from '../engine/orbitalGeometry.js';
export const ORBIT_CAMERA=[10.8,6.6,14.4];
// Altitude deliberately exaggerated for legibility; directions/elements are shared
// with the engine. Real altitude/period are always shown in the telemetry/map.
export function orbitRadius(id){return {leo:5.6,sso:5.8,geo:7,llo:5.6,lagrange:7.5}[id]||5.6;}
export function renderPosition(position,id,bodyRadius=4,exaggerated=true,override=null){const o=override||presetOrbit(id);if(!o)return new THREE.Vector3(...position);const physical=BODIES[o.body].radiusM,r=Math.hypot(...position),alt=r-physical,scale=exaggerated?(orbitRadius(id)-bodyRadius)/(o.semiMajorAxisM-physical):bodyRadius/physical;return new THREE.Vector3(position[0],position[2],-position[1]).normalize().multiplyScalar(exaggerated?bodyRadius+(orbitRadius(id)-4)+(r-o.semiMajorAxisM*(1-o.eccentricity))*bodyRadius/physical:bodyRadius+alt*scale);}
export function orbitPoint(id,meanAnomaly,override=null){const o=override?{...override,meanAnomalyRad:meanAnomaly}:presetOrbit(id,{meanAnomalyRad:meanAnomaly});if(!o)return new THREE.Vector3(7.5,0,0);return renderPosition(propagate(o,0),id,4,true,o);}
export function operationPoint(id,elapsedSec,override=null){const o=override||presetOrbit(id);return o?renderPosition(propagate(o,elapsedSec),id,4,true,o):new THREE.Vector3(7.5,0,0);}
export function createOrbitPath(id,{bodyRadius=4,exaggerated=true,orbit=null}={}){const o=orbit||presetOrbit(id),points=o?Array.from({length:240},(_,i)=>renderPosition(propagate(o,orbitalPeriod(o)*i/240),id,bodyRadius,exaggerated,o)):[];const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x76dfd8,transparent:true,opacity:.52}));line.visible=!!o;return line;}

export function operationCamera(id,orbit=null){const o=orbit||presetOrbit(id);if(!o)return ORBIT_CAMERA.slice();const far=renderPosition([o.semiMajorAxisM*(1+o.eccentricity),0,0],id,4,true,o).length();return ORBIT_CAMERA.map(v=>v*Math.max(1,far/7));}
