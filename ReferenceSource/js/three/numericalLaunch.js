import {fitPayloadToFairing} from './payloadFit.js';
import {flightCameraInput} from './flightCameraInput.js';
import * as THREE from 'three';
import {ascentVehicle,simulateAscent,sampleFlight,payloadDeployment} from '../engine/ascent.js';
import {BODIES,bodyAngle,eclipsed,propagate,toInertial} from '../engine/orbitalGeometry.js';
import {customVehicle} from './customVehicle.js';
import {createLaunchVehicle} from './launchVehicle.js';
import {createAssembly} from './spacecraftParts.js';
import {addStars,createScene} from './sceneKit.js';
import {createEarthBody} from './earthMaterial.js';
import {createAtmosphere,createLaunchEnvironment} from './launchEnvironment.js';
import {createLaunchExhaust} from './launchExhaust.js';
import {createOrbitPath} from './orbitPresentation.js';
import {createOrbitalEventFX} from './orbitalEventFX.js';
import {OPERATION_WINDOW_SEC} from '../engine/flightClock.js';
import {PAD_DECK_Y} from './launchTimeline.js';
import {createFlightAudio} from '../audio/flightAudio.js';

const R=BODIES.earth.radiusM;
const metresPerUnit=2;
const deploymentS=12;
const releaseS=3;
const Y=new THREE.Vector3(0,1,0);
const asThree=([x,y,z])=>new THREE.Vector3(x,z,-y);
const speeds=[1,4,16,64];

export function createNumericalLaunch(container,{design,data,target,payloadKg,checkpoint,onPhase,onTelemetry,onDone}){
 let flight;
 try {flight=simulateAscent(ascentVehicle(design,payloadKg),target);}
 catch(error){
  let active=true;
  queueMicrotask(()=>{if(active)onDone({success:false,reason:error.message});});
  return {destroy(){active=false;},getCheckpoint:()=>({version:1,timeS:0,paused:false,speed:1}),skip(){},togglePause(){},setSpeed(){},setCamera(){},unlockAudio(){}};
 }
 const total=flight.end.timeS+(flight.orbit?deploymentS:0);
 const deployment=flight.orbit&&payloadDeployment(flight,payloadKg,releaseS);
 let time=Math.min(checkpoint?.timeS??0,total),speed=speeds.includes(checkpoint?.speed)?checkpoint.speed:1,paused=checkpoint?.paused??false,finished=false,ready=false;
 let cameraMode=checkpoint?.camera??'track',cameraBlend=0,phase='',eventIndex=sampleFlight(flight,time).eventCount;
 let liveOrbit=null,operationTime=0,operationMode='follow',northVisible=false,orbitRing=null;
 const kit=createScene(container,{controls:false,far:9e6,logDepth:true});
 const cameraInput=flightCameraInput(kit.renderer?.domElement);
 kit.sun.shadow.mapSize.set(512,512);
 if(kit.renderer)kit.renderer.shadowMap.autoUpdate=false;
 const pad=sampleFlight(flight,3).positionM;
 const basisUp=asThree(pad).normalize();
 const tangent=asThree([-Math.sin(target.raanRad)*Math.cos(target.inclinationRad),
  Math.cos(target.raanRad)*Math.cos(target.inclinationRad),Math.sin(target.inclinationRad)]);
 const basis=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4()
  .makeBasis(tangent,basisUp,new THREE.Vector3().crossVectors(tangent,basisUp))).invert();
 const direction=xyz=>asThree(xyz).applyQuaternion(basis);
 const sun=direction([1,0,0]);
 const spinAxis=direction([0,0,1]);
 const globe=createEarthBody(R/metresPerUnit,{sunDirection:sun.toArray()});
 kit.scene.add(globe);
 const site=createLaunchEnvironment(kit);
 const tower=site.getObjectByName('service_tower_0');
 if(tower){tower.position.z=-5.8;tower.userData.setArmOpening(1);}
 const sky=createAtmosphere(kit),stars=addStars(kit.scene);
 const rocket=design.rocketBlueprint?customVehicle(design.rocketBlueprint):createLaunchVehicle(design.launcherId);
 kit.scene.add(rocket);
 const payload=new THREE.Group();
 payload.name='mission_payload';
 const adapter=rocket.getObjectByName('payload_adapter');
 adapter.parent.add(payload);
 payload.position.y=adapter.position.y+.175;
 const attachment=payload.position.clone();
 payload.scale.setScalar(1/metresPerUnit);
 const assembly=createAssembly(payload);
 const audio=createFlightAudio();
 const orbitalEffects=createOrbitalEventFX(kit.scene,payload,kit.camera);
 const icon=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshBasicMaterial({color:0x9aebd9}));
 icon.visible=false;kit.scene.add(icon);
 const north=new THREE.ArrowHelper(spinAxis,new THREE.Vector3().addScaledVector(spinAxis,4),.65,0xe9bd75,.19,.12);
 north.visible=false;kit.scene.add(north);
 const prograde=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.6,0x9aebd9,.19,.12);
 prograde.visible=false;kit.scene.add(prograde);
 const craftMaterials=new Map();
 let shadowed=false;
 let followOffset=new THREE.Vector3(-4,2,7),craftOffset=new THREE.Vector3();
 const base=-new THREE.Box3().setFromObject(rocket).min.y;
 const bounds=new THREE.Box3().setFromObject(rocket).getSize(new THREE.Vector3());
 const nozzles=[],parts=new Map();
 rocket.updateMatrixWorld(true);
 rocket.traverse(node=>{
  if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}
  if(node.userData.flightPartId)parts.set(node.userData.flightPartId,node);
  const id=node.userData.flightEngineId;
  if(id){
   const {height,radiusBottom}=node.geometry.parameters;
   nozzles.push({id,name:node.name,local:node.localToWorld(new THREE.Vector3(0,-height/2,0)),radius:radiusBottom});
  }
 });
 const origin=new THREE.Vector3();
 const project=position=>direction(position).sub(origin).divideScalar(metresPerUnit);
 const orientation=state=>new THREE.Quaternion().setFromUnitVectors(Y,direction(state.direction));
 const rootAt=state=>project(state.positionM).addScaledVector(direction(state.positionM).normalize(),base);
 const exhaust=createLaunchExhaust(kit.scene,{
  nozzles,orientation,floorY:()=>site.visible?site.position.y:-Infinity,
  emissionState:t=>{const state=sampleFlight(flight,t);return {...state,altitudeKm:state.altitudeM/1000};},
  emissionDrift:(state,age)=>{
   const atmosphere=new THREE.Vector3().crossVectors(spinAxis,direction(state.positionM))
    .multiplyScalar(2*Math.PI/BODIES.earth.rotationSec);
   const relative=direction(state.velocityMps).sub(atmosphere);
   return atmosphere.multiplyScalar(age).addScaledVector(relative,(1-Math.exp(-age*.6))/.6).divideScalar(metresPerUnit);
  },
  nozzlePosition:(nozzle,state)=>nozzle.local.clone().applyQuaternion(orientation(state)).add(rootAt(state))
 });
 const released=[];
 for(const event of flight.events){
  for(const id of event.partIds){
   const node=parts.get(id);
   const local=node.getWorldPosition(new THREE.Vector3());
   const q=orientation(event);
   const radial=direction(event.positionM).normalize();
   const kick=new THREE.Vector3();
   if(id.startsWith('booster'))kick.set(local.x,0,local.z).normalize().multiplyScalar(2);
   if(id.startsWith('fairing'))kick.set(0,0,id==='fairing-left'?1.5:-1.5);
   const before=sampleFlight(flight,event.timeS-.05);
   const offset=local.clone().applyQuaternion(q);
   const rotational=offset.clone().sub(local.clone().applyQuaternion(orientation(before))).multiplyScalar(metresPerUnit/.05);
   const velocity=direction(event.velocityMps).add(rotational).add(kick.applyQuaternion(q));
   const eci=direction(event.positionM).addScaledVector(offset,metresPerUnit).addScaledVector(radial,base*metresPerUnit);
   const gravity=radial.multiplyScalar(-BODIES.earth.mu/(Math.hypot(...event.positionM)**2));
   const detached=node.clone(true);
   if(id==='core')for(const child of [...detached.children])if(child.userData.flightPartId?.startsWith('booster'))child.removeFromParent();
   kit.scene.add(detached);
   released.push({event,node,detached,q,eci,velocity,gravity});
  }
 }
 function finish(keepView=true){
  if(finished)return;
  finished=true;
  audio.destroy();
  const orbit=deployment?.payloadOrbit;
  if(!orbit){onDone({success:false,reason:flight.reason});return;}
  const duration=deploymentS-releaseS;
  const advance=duration*Math.sqrt(BODIES.earth.mu/orbit.semiMajorAxisM**3);
  liveOrbit={...orbit,meanAnomalyRad:orbit.meanAnomalyRad+advance,epochS:orbit.epochS+duration};
  if(keepView&&ready&&kit.renderer){
   kit.scene.attach(payload);
   if(time===total&&payload.position.length()<100){
    craftOffset.copy(payload.position);
    followOffset.copy(kit.camera.position).sub(payload.position);
   }
   rocket.visible=site.visible=false;
   exhaust.hide();sky.hide();
   released.forEach(item=>{item.detached.visible=false;});
   orbitRing=createOrbitPath(design.orbitId,{orbit:liveOrbit,exaggerated:false});
   orbitRing.quaternion.copy(basis);kit.scene.add(orbitRing);
  }
  onDone({success:true,insertion:{orbit:liveOrbit,
   insertionTimeS:flight.end.timeS,positionM:flight.end.positionM,velocityMps:flight.end.velocityMps,massKg:flight.end.massKg,
   upperPropellantKg:flight.end.propellantKgByTank.upper,events:[...flight.events,deployment.event]}});
 }
 function drawOrbit(now){
  const inertialPosition=propagate(liveOrbit,operationTime);
  const position=direction(inertialPosition);
  const spin=bodyAngle('earth',liveOrbit.epochS+operationTime);
  const up=position.clone().normalize();
  globe.visible=true;
  globe.quaternion.setFromAxisAngle(spinAxis,spin).multiply(basis);
  kit.camera.up.copy(operationMode==='follow'?up:spinAxis);
  icon.visible=north.visible=orbitRing.visible=prograde.visible=false;
  if(operationMode==='follow'){
   globe.scale.setScalar(1);
   globe.position.copy(position).multiplyScalar(-1/metresPerUnit);
   payload.visible=true;payload.position.copy(craftOffset);
   const offset=cameraInput.offset(followOffset,up);
   kit.camera.position.copy(payload.position).add(offset);
   const screenUp=up.clone().projectOnPlane(offset).normalize();
   kit.camera.lookAt(payload.position.clone().addScaledVector(screenUp,-1.15));
  }else{
   payload.visible=false;
   globe.position.set(0,0,0);globe.scale.setScalar(4*metresPerUnit/R);
   icon.position.copy(position).multiplyScalar(4/R);
   icon.visible=orbitRing.visible=true;north.visible=northVisible;
   prograde.position.copy(icon.position);
   prograde.setDirection(direction(propagate(liveOrbit,operationTime+.5)).sub(position).normalize());
   prograde.visible=true;
   kit.camera.position.copy(cameraInput.offset(direction([12,-14,8]),spinAxis));
   if(operationMode==='fixed')kit.camera.position.applyAxisAngle(spinAxis,spin);
   kit.camera.lookAt(0,0,0);
  }
  const inShadow=eclipsed(inertialPosition,'earth');
  if(inShadow!==shadowed){
   shadowed=inShadow;
   for(const [material,{color,environment}] of craftMaterials){
    material.color.copy(color).multiplyScalar(shadowed?.17:1);
    if(environment!==undefined)material.envMapIntensity=environment*(shadowed?.12:1);
   }
  }
  assembly.animate(0);
  orbitalEffects.update(now);
  stars.visible=true;stars.material.opacity=.75;stars.position.copy(kit.camera.position);
  kit.sun.position.copy(sun).multiplyScalar(100);
 }
 let shadowAge=1;
 function draw(dt){
  if(finished||!ready)return;
  if(!paused)time=Math.min(total,time+dt*(time>=flight.end.timeS?Math.min(4,speed):speed));
  const state=sampleFlight(flight,time);
  const after=time-flight.end.timeS;
  const releasedPayload=deployment&&after>=releaseS;
  const age=after-releaseS;
  const coastOrbit=releasedPayload?deployment.payloadOrbit:after>0?flight.orbit:null;
  const coastTime=releasedPayload?age:after;
  const position=coastOrbit?propagate(coastOrbit,coastTime):state.positionM;
  const stagePosition=releasedPayload?propagate(deployment.upperOrbit,age):position;
  const altitudeKm=(Math.hypot(...position)-R)/1000;
  origin.copy(direction(position));
  const padNow=toInertial(pad,'earth',time-3);
  const padUp=direction(padNow).normalize();
  site.position.copy(project(padNow)).addScaledVector(padUp,-PAD_DECK_Y);
  site.quaternion.setFromAxisAngle(spinAxis,bodyAngle('earth',time-3));
  site.visible=altitudeKm<8;
  globe.visible=true;
  globe.position.copy(origin).multiplyScalar(-1/metresPerUnit);
  globe.scale.setScalar((R-4)/R);
  globe.quaternion.setFromAxisAngle(spinAxis,bodyAngle('earth',time)).multiply(basis);
  rocket.position.copy(rootAt({...state,positionM:stagePosition}));
  rocket.quaternion.copy(orientation(state));
  for(const {node,detached,event,q,eci,velocity,gravity} of released){
   const age=time-event.timeS;
   node.visible=age<0;
   detached.visible=age>=0&&age<35;
   if(detached.visible){
    detached.position.copy(eci).addScaledVector(velocity,age).addScaledVector(gravity,age*age/2).sub(origin).divideScalar(metresPerUnit);
    detached.quaternion.copy(q);
    detached.rotateZ(age*.14);
   }
  }
  const shift=direction(position).sub(direction(stagePosition)).divideScalar(metresPerUnit)
   .applyQuaternion(rocket.quaternion.clone().invert());
  payload.position.copy(attachment).add(shift);
  assembly.animate(releasedPayload?1-THREE.MathUtils.smoothstep(age,0,deploymentS-releaseS):1);
  if(after<=0)exhaust.update(time,{...state,altitudeKm},{});
  else exhaust.hide();
  const dark=THREE.MathUtils.smoothstep(altitudeKm,9,85);
  const up=direction(position).normalize();
  stars.visible=dark>.6;
  stars.material.opacity=Math.max(0,(dark-.6)/.4)*.75;
  const follow=new THREE.Vector3(0,bounds.y*.48,0).applyQuaternion(rocket.quaternion);
  const payloadAim=payload.getWorldPosition(new THREE.Vector3());
  const climb=THREE.MathUtils.smoothstep(altitudeKm,.02,2);
  const targetPoint=rocket.position.clone().add(follow).lerp(payloadAim,after>0?THREE.MathUtils.smoothstep(after,0,8):0);
  cameraBlend+=(Number(cameraMode==='wide')-cameraBlend)*(1-Math.exp(-dt*4));
  const deploymentOffset=up.clone().multiplyScalar(7).add(new THREE.Vector3(-2,1,5));
  const offset=new THREE.Vector3(bounds.y*(.66-.9*climb),bounds.y*.26,bounds.y*1.43)
   .lerp(new THREE.Vector3(-bounds.y*2.4,bounds.y*.62,bounds.y*3.2),cameraBlend)
   .lerp(deploymentOffset,after>0?THREE.MathUtils.smoothstep(after,1,12)*(1-cameraBlend):0);
  const portrait=kit.camera.aspect<.82;
  if(portrait)offset.multiplyScalar(.82/kit.camera.aspect);
  offset.copy(cameraInput.offset(offset,up));
  kit.camera.position.copy(targetPoint).add(offset);
  const cameraRadial=kit.camera.position.clone().sub(globe.position);
  const minimumRadius=(R-2)/metresPerUnit;
  if(cameraRadial.length()<minimumRadius)kit.camera.position.copy(globe.position).add(cameraRadial.setLength(minimumRadius));
  kit.camera.up.copy(up);
  if(portrait)targetPoint.addScaledVector(up.clone().projectOnPlane(offset).normalize(),-offset.length()*.13);
  kit.camera.lookAt(targetPoint);
  sky.update(dark);
  stars.position.copy(kit.camera.position);
  kit.sun.position.copy(site.visible?new THREE.Vector3(14,23,12):sun.clone().multiplyScalar(100));
  shadowAge+=dt;
  if(kit.renderer&&site.visible&&shadowAge>.08){kit.renderer.shadowMap.needsUpdate=true;shadowAge=0;}
  const cues=flight.events.slice(eventIndex,state.eventCount);
  eventIndex=state.eventCount;
  audio.update({throttle:state.throttle,altitudeKm,paused,events:cues,camera:cameraMode});
  const latest=flight.events[state.eventCount-1];
  const caption=state.phase==='failed'?state.label:releasedPayload?'Orbital coast · Spacecraft clear · Deploying arrays':after>0?'Orbital coast · Preparing payload release':
   latest&&time-latest.timeS<7?({'liftoff':'Liftoff · Clearing the launch mount','boosters':'Booster separation · Core burn continues',
    'core':'Core separation · Upper stage ignition','fairing':'Fairing halves released','insertion':'Orbital insertion confirmed'}[latest.id]||state.label):state.label;
  if(caption!==phase){phase=caption;onPhase(caption);}
  const fuel=releasedPayload?0:state.attachedPartIds.reduce((sum,id)=>sum+state.propellantKgByTank[id],0);
  const capacity=releasedPayload?0:state.attachedPartIds.reduce((sum,id)=>sum+flight.samples[0].propellantKgByTank[id],0);
  const speedMps=coastOrbit?Math.sqrt(BODIES.earth.mu*(2/Math.hypot(...position)-1/coastOrbit.semiMajorAxisM)):state.speedMps;
  const verticalMps=coastOrbit?(Math.hypot(...propagate(coastOrbit,coastTime+.025))-Math.hypot(...propagate(coastOrbit,coastTime-.025)))/.05:state.verticalMps;
  const velocityMps=coastOrbit?propagate(coastOrbit,coastTime+.025).map((x,i)=>(x-propagate(coastOrbit,coastTime-.025)[i])/.05):state.velocityMps;
  const spin=2*Math.PI/BODIES.earth.rotationSec;
  const airSpeedMps=Math.hypot(velocityMps[0]+spin*position[1],velocityMps[1]-spin*position[0],velocityMps[2]);
  onTelemetry({...state,positionM:position,velocityMps,airSpeedMps,massKg:releasedPayload?payloadKg:state.massKg,elapsed:time,altitudeKm,fuel,speedMps,verticalMps,
   orbit:coastOrbit,fuelPercent:capacity?Math.round(100*fuel/capacity):0,progress:time/total,stage:caption});
  if(time>=total)finish();
 }
 let lastFrame;
 kit.draw=(_dt,now)=>{
  const dt=lastFrame===undefined||document.hidden?0:Math.max(0,Math.min(.25,now-lastFrame));
  lastFrame=now;
  if(orbitRing)drawOrbit(now);else draw(dt);
 };
 assembly.update(design,data).then(()=>{
  if(kit.dead)return;
  for(const part of assembly.instances.values())part.userData.born=-Infinity;
  assembly.animate(1);
  fitPayloadToFairing(payload,rocket);
  payload.traverse(node=>{
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    if(material?.color&&!craftMaterials.has(material))craftMaterials.set(material,{color:material.color.clone(),environment:material.envMapIntensity});
   }
  });
  ready=true;
  if(!kit.renderer)onPhase('3D unavailable · Advance to flight result');
 }).catch(()=>{if(!kit.dead){ready=true;onPhase('Spacecraft model unavailable · Flight telemetry online');}});
 const destroy=()=>{finished=true;orbitRing=null;cameraInput.destroy();audio.destroy();globe.userData.stopTexture();assembly.destroy();kit.destroy();};
 return {
  setSpeed(value){if(speeds.includes(value))speed=value;},
  setCamera(value){if(['track','wide'].includes(value)){cameraMode=value;cameraInput.reset();}},
  resetCamera(){cameraInput.reset();},
  unlockAudio:audio.unlock,
  togglePause(){paused=!paused;audio.update({paused:true,events:[]});},
  getCheckpoint:()=>({version:1,timeS:time,paused,speed,camera:cameraMode}),
  getMetrics:()=>({...kit.metrics,drawCalls:kit.renderer?.info.render.calls||0}),
  skip(){time=total;finish(false);},
  getOrbitView(){
   if(!orbitRing)return null;
   return {
    setTime(seconds){operationTime=seconds;},setProgress(p){operationTime=p*OPERATION_WINDOW_SEC;},
    setCamera(mode,northPole){operationMode=mode;northVisible=northPole;},flash:orbitalEffects.flash,destroy
   };
  },
  destroy
 };
}
