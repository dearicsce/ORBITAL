import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-loader.mjs',import.meta.url);
const THREE=await import('three');
const {presetOrbit,toFixed,propagate,RAD}=await import('../js/engine/orbitalGeometry.js');
const {bodyAngle,OPERATION_STEP_SEC}=await import('../js/engine/flightClock.js');
const {createLaunchSpace,DEPLOYMENT_SECONDS}=await import('../js/three/launchSpace.js');
const {createLaunchMotion}=await import('../js/three/launchMotion.js');
const {createLaunchVehicle}=await import('../js/three/launchVehicle.js');
const {ASCENT_SECONDS}=await import('../js/three/launchTimeline.js');
const {createFlightFrame}=await import('../js/three/flightFrame.js');
const {operationPoint,renderPosition}=await import('../js/three/orbitPresentation.js');

function fixture(orbit){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1.6,.1,500);
 camera.position.set(14,6,18);
 const horizon=new THREE.Mesh(new THREE.SphereGeometry(180),new THREE.MeshBasicMaterial());
 horizon.position.set(0,-185,0);horizon.rotation.y=bodyAngle('earth',-DEPLOYMENT_SECONDS);
 scene.add(horizon);
 const craft=new THREE.Group();craft.position.set(41,108,0);scene.add(craft);
 const space=createLaunchSpace({scene,camera},{orbitId:'leo',orbitElements:orbit},null,{craft,horizon,assembly:{animate(){},destroy(){}}});
 return {space,scene,camera,craft,horizon};
}
const delta=.001;
for(const degrees of [0,51.6,90,98.2,180]){
 const orbit=presetOrbit('leo',{inclinationRad:degrees*RAD,eccentricity:.03});
 const {space,scene,camera,craft,horizon}=fixture(orbit);
 await Promise.resolve();
 assert.ok(space.ready);
 space.update(0);assert.equal(horizon.rotation.y,bodyAngle('earth',-DEPLOYMENT_SECONDS));
 space.update(1-delta/DEPLOYMENT_SECONDS);const before=craft.position.clone();
 space.update(1);const insertion=craft.position.clone(),earthAtInsertion=horizon.rotation.y,viewAtInsertion=camera.quaternion.clone();
 space.updateOperations(0,0,0,{elapsedSec:0,orbit});
 assert.ok(craft.position.distanceTo(insertion)<1e-10,'spacecraft position at handoff');
 assert.equal(horizon.rotation.y,earthAtInsertion);
 assert.ok(1-Math.abs(camera.quaternion.dot(viewAtInsertion))<1e-12,'camera aim at handoff');
 space.updateOperations(0,0,delta,{elapsedSec:delta,orbit});
 const inbound=insertion.clone().sub(before).divideScalar(delta),outbound=craft.position.clone().sub(insertion).divideScalar(delta);
 assert.ok(inbound.distanceTo(outbound)<1e-5,'continuous spacecraft velocity through insertion');
 const angularMomentum=insertion.clone().cross(craft.position).y;
 if(degrees===90)assert.ok(Math.abs(angularMomentum)<1e-12,'polar plane');
 else assert.equal(Math.sign(angularMomentum),degrees<90?1:-1,'direction uses the same north pole as Earth rotation');
 const clock=OPERATION_STEP_SEC*3.25;
 const expected=operationPoint('leo',clock,orbit);
 for(const mode of ['inertial','follow','fixed']){
  space.setCamera(mode,true);
  space.updateOperations(0,0,0,{elapsedSec:clock,orbit});
  assert.ok(craft.position.distanceTo(expected)<1e-12,'camera cannot affect propagated orbit');
  assert.equal(horizon.rotation.y,bodyAngle('earth',clock));
 }
 const restored=fixture(orbit);
 const frame=createFlightFrame(restored.scene,restored.camera,restored.craft,restored.horizon,'leo',orbit);
 frame.setCamera('fixed',true);frame.sample(clock);
 assert.ok(restored.craft.position.distanceTo(craft.position)<1e-12);
 assert.equal(restored.horizon.rotation.y,horizon.rotation.y);
 frame.setCamera('follow',false);
 for(let time=0;time<=6400;time+=160){
  frame.sample(time);
  const radial=restored.craft.position.clone().normalize();
  assert.ok(restored.camera.position.dot(radial)>restored.craft.position.length(),'follow camera stays outside the planet');
 }
 const fixed=renderPosition(toFixed(propagate(orbit,clock),'earth',clock),'leo',4,true,orbit);
 assert.ok(craft.position.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-horizon.rotation.y).distanceTo(fixed)<1e-12);
 scene.clear();restored.scene.clear();
}
const ascentScene=new THREE.Scene(),ascentCamera=new THREE.PerspectiveCamera(45,1.6,.1,500);
const rocket=createLaunchVehicle('orbital-custom',{custom:{booster:{count:2}}});
rocket.name='orbital_custom_vehicle';ascentScene.add(rocket);
const payload=new THREE.Group();payload.position.set(0,13.7,0);rocket.add(payload);
const booster=rocket.getObjectByName('booster_0'),lower=rocket.getObjectByName('stage_lower');
const motion=createLaunchMotion(rocket,ascentScene,payload,16);
motion.sample(11);
assert.equal(booster.parent,ascentScene,'custom boosters detach before the core');
assert.equal(lower.parent,rocket);
motion.sample(16);
assert.equal(lower.parent,ascentScene,'core detaches after booster release');
motion.sample(0);
assert.equal(lower.parent,rocket);assert.equal(booster.parent,lower);
for(const [id,count] of [['condor',2],['roc',4]]){
 const preset=createLaunchVehicle(id);
 ascentScene.add(preset);
 const presetMotion=createLaunchMotion(preset,ascentScene,null,16);
 const core=preset.getObjectByName('stage_lower'),upper=preset.getObjectByName('stage_upper');
 const boosters=Array.from({length:count},(_,i)=>preset.getObjectByName('booster_'+i));
 presetMotion.sample(11);
 assert.ok(boosters.every(part=>part.parent===ascentScene),'Every preset booster separates before core cutoff');
 assert.equal(core.parent,preset);
 presetMotion.sample(16);
 assert.equal(core.parent,ascentScene);
 assert.equal(upper.parent,preset,'Upper stage stays on the flight trajectory');
 presetMotion.sample(0);
 assert.ok(boosters.every(part=>part.parent===core),'Seeking back restores the launch stack');
 ascentScene.remove(preset);
}
motion.sample(ASCENT_SECONDS-delta);
const atPrevious=payload.getWorldPosition(new THREE.Vector3());
const {camera:cameraPosition,target}=motion.sample(ASCENT_SECONDS);
ascentCamera.position.copy(cameraPosition);ascentCamera.lookAt(target);
const atBoundary=payload.getWorldPosition(new THREE.Vector3());
const horizon=new THREE.Mesh(new THREE.SphereGeometry(180),new THREE.MeshBasicMaterial());
horizon.position.set(0,-185,0);horizon.rotation.y=bodyAngle('earth',-DEPLOYMENT_SECONDS);ascentScene.add(horizon);
const deployment=createLaunchSpace({scene:ascentScene,camera:ascentCamera},{orbitId:'leo'},null,
 {craft:payload,horizon,entryVelocity:motion.payloadVelocityAtInsertion(),assembly:{animate(){},destroy(){}}});
await Promise.resolve();
deployment.update(0);
assert.ok(payload.position.distanceTo(atBoundary)<1e-10,'ascent position carries into deployment');
deployment.update(delta/DEPLOYMENT_SECONDS);
const launchVelocity=atBoundary.clone().sub(atPrevious).divideScalar(delta);
const earlyDeployment=payload.position.clone().sub(atBoundary).divideScalar(delta);
assert.ok(launchVelocity.distanceTo(earlyDeployment)<.01,'ascent velocity carries into deployment');

const geo=presetOrbit('geo'),zero=operationPoint('geo',0,geo);
for(const seconds of [OPERATION_STEP_SEC,2000,30000]){
 const fixed=operationPoint('geo',seconds,geo).applyAxisAngle(new THREE.Vector3(0,1,0),-bodyAngle('earth',seconds));
 assert.ok(fixed.distanceTo(zero)<1e-8,'geostationary craft is stationary in the Earth-fixed frame');
}
console.log('PASS: actual deployment handoff, position, velocity, Earth angle and camera; prograde, polar, retrograde and geostationary references.');
