import {START_ANOMALY,orbitalPeriod,presetOrbit} from '../engine/orbitalGeometry.js';
import {bodyAngle,centralBody,OPERATION_WINDOW_SEC} from '../engine/flightClock.js';
import {createFlightFrame} from './flightFrame.js';
import * as THREE from 'three';
import {createOrbitalEventFX} from './orbitalEventFX.js';
import {operationPoint,createOrbitPath,operationCamera} from './orbitPresentation.js';
import {createAssembly} from './spacecraftParts.js';
import {addWorldBody} from './worldBody.js';
import {disposeObject} from './sceneKit.js';
export const DEPLOYMENT_SECONDS=18;
export const INSERTION_ANGLE=START_ANOMALY;
export function createLaunchSpace(kit,design,data,continuation={}) {
 if(kit?.sun){kit.sun.position.set(40,0,0);kit.sun.target.position.set(0,0,0);if(!kit.sun.target.parent)kit.scene.add(kit.sun.target);}
 const group=continuation.group||new THREE.Group();if(!continuation.group)kit.scene.add(group);
 const craft=continuation.craft||new THREE.Group();group.attach(craft);
 const assembly=continuation.assembly||createAssembly(craft);
 const built=continuation.assembly?Promise.resolve():assembly.update(design,data);
 const earth=continuation.horizon||addWorldBody(group,design.orbitId,4);
 if(continuation.horizon)group.attach(earth);earth.visible=true;
 const lunar=design.orbitId==='llo',moon=lunar?addWorldBody(group,'llo',4):null;if(moon)moon.visible=false;
 const stage=continuation.stage;if(stage){group.attach(stage);stage.visible=true;}
 const entryVelocity=continuation.entryVelocity||new THREE.Vector3();
 const initialPosition=craft.position.clone(),initialScale=craft.scale.clone(),initialRotation=craft.quaternion.clone();
 const initialCamera=kit.camera.position.clone(),initialTarget=continuation.target?.clone()||initialPosition.clone();
 const bodyPosition=earth.position.clone(),bodyScale=earth.scale.clone(),horizonRadius=earth.geometry.parameters.radius||4;
 const initialRadius=horizonRadius*bodyScale.x;
 const relative=initialPosition.clone().sub(bodyPosition);
 const orbit=design.orbitElements||presetOrbit(design.orbitId);
 const lead=orbit&&entryVelocity.lengthSq()>0?orbitalPeriod(orbit)*.055:0;
 const point=time=>operationPoint(design.orbitId,time,orbit);
 const basis=(position,velocity)=>{
  const radial=position.clone().normalize();
  const tangent=velocity.clone().addScaledVector(radial,-velocity.dot(radial)).normalize();
  return new THREE.Matrix4().makeBasis(radial,tangent,new THREE.Vector3().crossVectors(radial,tangent));
 };
 const startPoint=lead?point(-lead):null;
 const startVelocity=lead?point(-lead+.5).sub(point(-lead-.5)):null;
 const entryRotation=lead?new THREE.Quaternion().setFromRotationMatrix(
  basis(relative,entryVelocity).multiply(basis(startPoint,startVelocity).transpose())):new THREE.Quaternion();
 const initialUp=kit.camera.up.clone();
 const initialBodyRotation=earth.quaternion.clone();
 const inverseEntry=entryRotation.clone().invert();
 const entryTangent=entryVelocity.clone().projectOnPlane(relative.clone().normalize());
 const startClockRate=lead?entryTangent.length()/relative.length()/(startVelocity.clone()
  .projectOnPlane(startPoint.clone().normalize()).length()/startPoint.length()):0;
 const radialRate=lead?entryVelocity.dot(relative.clone().normalize())-
  startVelocity.dot(startPoint.clone().normalize())*startClockRate:0;
 // Monotonic clock through the last arc. A short easing window absorbs the
 // change from compressed ascent to operations time without backtracking.
 const clockWindow=lead?Math.min(.35,lead/Math.max(1,(startClockRate-1)*DEPLOYMENT_SECONDS)):0;
 const clockTravel=p=>{
  if(!lead)return (p-1)*DEPLOYMENT_SECONDS;
  const ramp=1-(1-Math.min(p/clockWindow,1))**3;
  const fastTravel=(startClockRate-1)*DEPLOYMENT_SECONDS*clockWindow/3;
  return -lead+fastTravel*ramp+(lead-fastTravel-DEPLOYMENT_SECONDS)*p*p*(3-2*p)+DEPLOYMENT_SECONDS*p;
 };
 const radialBlend=(from,to,t)=>{const a=from.clone().normalize(),b=to.clone().normalize(),q=new THREE.Quaternion().setFromUnitVectors(a,b);return a.applyQuaternion(new THREE.Quaternion().slerp(q,t));};
 const stagePosition=stage?.position.clone(),stageScale=stage?.scale.clone(),stageRotation=stage?.quaternion.clone();
 const finalCamera=new THREE.Vector3(...operationCamera(design.orbitId,design.orbitElements)),finalTarget=new THREE.Vector3();
 const ring=createOrbitPath(design.orbitId,{orbit:design.orbitElements});ring.material.opacity=0;group.add(ring);
 const effects=createOrbitalEventFX(group,craft,kit.camera);let loaded=false,dead=false,frame;
 built.then(()=>{if(!dead)loaded=true;});
 const smooth=(a,b,p)=>THREE.MathUtils.smoothstep(p,a,b);
 return {get ready(){return loaded;},caption(p){if(continuation.transferCoast)return 'Upper stage attached · Earth parking orbit';return lunar&&p>.5&&p<.75?'Lunar transfer · travel time compressed / illustrative trajectory':p<.2?'Upper-stage coast · Payload separation':p<.46?'Separation confirmed · Spacecraft drifting clear':p<.7?(continuation.manualDeployment?'Arrays stowed · Awaiting command':'Hinges deploying · Solar arrays unfolding'):'Insertion complete · Establishing stable orbit';},
 update(p){if(!loaded)return;
  const time=clockTravel(p);
  const travel=THREE.MathUtils.smootherstep(p,0,1),unfold=smooth(.35,.7,p),destination=operationPoint(design.orbitId,time,design.orbitElements);
  earth.rotation.y=bodyAngle(continuation.horizon?'earth':centralBody(design.orbitId,design.orbitElements),time);
  if(moon)moon.rotation.y=bodyAngle('moon',time);
  earth.position.copy(bodyPosition).lerp(new THREE.Vector3(),travel);
  const radius=THREE.MathUtils.lerp(initialRadius,4,travel);
  const altitude=THREE.MathUtils.lerp(relative.length()-initialRadius,destination.length()-4,travel)
   +radialRate*DEPLOYMENT_SECONDS*p*(1-p)**6;
  const heading=entryRotation.clone().slerp(new THREE.Quaternion(),smooth(.36,1,p));
  const radial=lead?destination.clone().normalize().applyQuaternion(heading):radialBlend(relative,destination,travel);
  craft.position.copy(earth.position).addScaledVector(radial,radius+altitude);
  if(lead){
   const physicalSpin=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),bodyAngle('earth',time));
   earth.quaternion.copy(initialBodyRotation).premultiply(inverseEntry).slerp(physicalSpin,travel).premultiply(heading);
  }
  craft.scale.copy(initialScale).lerp(new THREE.Vector3(.38,.38,.38),travel);
  craft.quaternion.copy(initialRotation).slerp(new THREE.Quaternion(),travel);assembly.animate(continuation.manualDeployment?1:1-unfold);
  if(stage){
   const attitude=heading.clone().multiply(inverseEntry);
   stage.quaternion.copy(stageRotation).premultiply(attitude);
   const separation=stagePosition.clone().sub(initialPosition).multiplyScalar(THREE.MathUtils.lerp(1,.16,travel));
   if(!continuation.transferCoast)separation.addScaledVector(entryTangent.clone().normalize(),-3*smooth(.12,.65,p));
   stage.position.copy(craft.position).add(separation.applyQuaternion(attitude));
   stage.scale.copy(stageScale).multiplyScalar(THREE.MathUtils.lerp(1,.16,travel));
   stage.visible=continuation.transferCoast||p<.72;
  }
  earth.position.copy(bodyPosition).lerp(new THREE.Vector3(),travel);earth.scale.copy(bodyScale).lerp(new THREE.Vector3(4/horizonRadius,4/horizonRadius,4/horizonRadius),travel);
  if(p===1)earth.scale.setScalar(4/horizonRadius);
  if(moon){moon.position.copy(earth.position);const arrival=smooth(.5,.75,p);earth.visible=arrival<1;moon.visible=arrival>0;earth.material.transparent=true;moon.material.transparent=true;earth.material.opacity=1-arrival;moon.material.opacity=arrival;earth.children.forEach(c=>c.visible=arrival<.5);}
  ring.material.opacity=smooth(.65,1,p)*.52;
  // Interpolate both camera and aim point in the spacecraft's moving frame.
  // Blending the aim point in world space lets the moving craft leave the frustum
  // before the final orbit camera arrives, especially late in deployment.
  const cameraBlend=lead?smooth(.42,1,p):travel;
  const offset=(start,end)=>start.clone().sub(initialPosition).applyQuaternion(inverseEntry)
   .lerp(end.clone().sub(destination),cameraBlend).applyQuaternion(heading);
  const entryOffset=initialCamera.clone().sub(initialPosition).applyQuaternion(inverseEntry);
  const orbitOffset=finalCamera.clone().sub(destination);
  const cameraOffset=lead?radialBlend(entryOffset,orbitOffset,cameraBlend)
   .multiplyScalar(THREE.MathUtils.lerp(entryOffset.length(),orbitOffset.length(),cameraBlend))
   .applyQuaternion(heading):offset(initialCamera,finalCamera);
  kit.camera.position.copy(craft.position).add(cameraOffset);
  const trackingTarget=craft.position.clone().add(offset(initialTarget,finalTarget));
  kit.camera.up.copy(initialUp).applyQuaternion(inverseEntry).lerp(new THREE.Vector3(0,1,0),cameraBlend).applyQuaternion(heading).normalize();
  kit.camera.lookAt(trackingTarget);
 },updateOperations(progress,_dt,now,{orbit=null,elapsedSec=progress*OPERATION_WINDOW_SEC}={}){
  effects.update(now);assembly.animate();
  frame??=createFlightFrame(group,kit.camera,craft,moon||earth,design.orbitId,orbit||design.orbitElements);
  frame.sample(elapsedSec,orbit||design.orbitElements);
 },setCamera(mode,north){frame?.setCamera(mode,north);},flash:effects.flash,destroy(){dead=true;earth.userData.stopTexture?.();moon?.userData.stopTexture?.();assembly.destroy();if(!continuation.group){disposeObject(group);group.removeFromParent();}}};
}
