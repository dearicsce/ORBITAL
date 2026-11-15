import {fitPayloadToFairing} from './payloadFit.js';
import {customVehicle} from './customVehicle.js';
import {createLaunchMotion} from './launchMotion.js';
import {createAssembly} from './spacecraftParts.js';
import {bodyAngle, OPERATION_WINDOW_SEC} from '../engine/flightClock.js';
import * as THREE from 'three';
import {createScene,addStars,disposeObject,addEarth,roundPointsMaterial} from './sceneKit.js';
import {getModel} from './models.js';
import {createLaunchExhaust} from './launchExhaust.js';
import {createLaunchEnvironment,createAtmosphere} from './launchEnvironment.js';
import {createLaunchSpace,DEPLOYMENT_SECONDS} from './launchSpace.js';
import {ASCENT_SECONDS,STAGING} from './launchTimeline.js';
export function createLaunchScene(container,{launcherId,launchResult,data,design,onPhase,onTelemetry=()=>{},onSpaceReached=()=>{},onDone,checkpoint,manualDeployment=false,transferCoast=false}) {
 const kit=createScene(container,{position:[10,6,16],target:[0,4,0],controls:false});
 const horizon=addEarth(kit.scene,180);horizon.position.set(0,-185,0);horizon.visible=false;
 const atmosphere=createAtmosphere(kit);const environment=createLaunchEnvironment(kit),stars=addStars(kit.scene);stars.visible=false;
 let lastPresentationTime=performance.now()/1000;
 let rocket=null,elapsed=checkpoint?.elapsed??0,paused=Boolean(checkpoint?.paused),finished=false,space=null,spaceElapsed=checkpoint?.spaceElapsed??0,loading=true,motion=null,exhaust=null,operations=null,payload=null,assembly=null;
 const failureAt=checkpoint?.failureAt??(8+Math.random()*4);
 const getCheckpoint=()=>({elapsed,spaceElapsed,paused,failureAt});
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(360*3),3));
 const failureParticles=new THREE.Points(geometry,roundPointsMaterial({color:0xff8148,size:.15}));kit.scene.add(failureParticles);failureParticles.visible=false;
 const modelReady=design.rocketBlueprint?Promise.resolve().then(()=>customVehicle(design.rocketBlueprint)):getModel(launcherId);
 modelReady.then(async model=>{
  if(kit.dead){disposeObject(model);return;}
  rocket=model;
  payload=new THREE.Group();
  payload.name='mission_payload';
  payload.scale.setScalar(.26);
  assembly=createAssembly(payload);
  rocket.add(payload);
  rocket.updateMatrixWorld(true);
  const adapter=rocket.getObjectByName('payload_adapter');
  const adapterY=adapter?rocket.worldToLocal(new THREE.Vector3(0,new THREE.Box3().setFromObject(adapter).max.y,0)).y:11.5;
  payload.position.set(0,adapterY,0);
  await assembly.update(design,data);
  if(kit.dead){assembly.destroy();disposeObject(model);return;}
  for(const part of assembly.instances.values())part.userData.born=-Infinity;
  assembly.animate(1);
  fitPayloadToFairing(payload,rocket);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  kit.scene.add(model);
  const height=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
  motion=createLaunchMotion(rocket,kit.scene,payload,height);
  exhaust=createLaunchExhaust(kit.scene,motion);
  const initial=motion.sample(0);
  kit.camera.position.copy(initial.camera);
  kit.camera.lookAt(initial.target);
  exhaust.update(0,initial.state,{});
  if(kit.renderer?.compileAsync)await kit.renderer.compileAsync(kit.scene,kit.camera);
  if(kit.dead)return;
  loading=false;
  lastPresentationTime=performance.now()/1000;
  onPhase('Vehicle ready on launch pad');
 }).catch(()=>{
  if(kit.dead)return;
  rocket=null;
  loading=false;
  onPhase('Unable to load launch vehicle · Skip to continue');
 });
 const finish=()=>{if(finished)return;finished=true;onDone({success:launchResult.success});};
 kit.draw=(dt,t)=>{
  const presentationDt=Math.max(0,t-lastPresentationTime);lastPresentationTime=t;
  if(operations){space.updateOperations(0,dt,t,operations);stars.position.copy(kit.camera.position);return;}
  if(finished||loading||!rocket)return;
  const flightDt=paused?0:presentationDt;
  if(space){if(space.ready)spaceElapsed=Math.min(DEPLOYMENT_SECONDS,spaceElapsed+flightDt);const p=Math.min(1,spaceElapsed/DEPLOYMENT_SECONDS);space.update(p);stars.position.copy(kit.camera.position);onTelemetry({elapsed:elapsed+spaceElapsed,progress:.6+p*.4,stage:transferCoast?'Parking-orbit insertion':'Payload deployment'});onPhase(space.caption?.(p)||'Orbital deployment');if(p===1)finish();return;}
  elapsed=Math.min(launchResult.success?ASCENT_SECONDS:Infinity,elapsed+flightDt);horizon.rotation.y=bodyAngle('earth',elapsed-ASCENT_SECONDS-DEPLOYMENT_SECONDS);const options={success:launchResult.success,failureAt};
  const sampled=motion.sample(elapsed,options),{state}=sampled;
  const hasBoosters=motion.nozzles.some(n=>n.name==='booster_nozzle');
  const upper=state.flight>STAGING.core;
  const stage=state.failed?'Vehicle lost':upper?'Upper stage':state.ignition?
    hasBoosters&&state.flight<=STAGING.boosters?'Core + boosters':'First stage':'Prelaunch';
  onTelemetry({elapsed,progress:state.flight*.6,stage,altitudeKm:state.altitudeKm,pitchDeg:90-THREE.MathUtils.radToDeg(state.pitch)});
  onPhase(state.failed?state.phase:hasBoosters&&state.flight>STAGING.boosters&&state.flight<.51?
    'Booster separation confirmed · Core burn continues':upper&&state.flight<.72?
    'Stage separation confirmed · Upper stage ignition':state.flight>STAGING.fairing&&state.flight<.84?
    'Fairing halves released · Upper stage burn':state.phase);
  assembly?.animate(1);
  exhaust.update(elapsed,state,options);

  const darkness=THREE.MathUtils.smoothstep(state.altitudeKm,14,92);kit.scene.background.setRGB(.32*(1-darkness),.5*(1-darkness),.68*(1-darkness));stars.position.copy(sampled.camera);stars.visible=true;stars.material.transparent=true;stars.material.opacity=Math.max(0,(darkness-.5)*2);horizon.visible=state.flight>.35;
  environment.position.y=0;environment.visible=state.flight<.65;
  const cameraTarget=sampled.target;
  kit.camera.position.copy(sampled.camera);kit.camera.lookAt(cameraTarget);atmosphere.update(darkness);
  if(state.failed){rocket.visible=false;motion.hideReleased();failureParticles.visible=true;const age=elapsed-failureAt;const a=failureParticles.geometry.attributes.position.array;for(let i=0;i<360;i++){a[i*3]=rocket.position.x+Math.sin(i*5)*age*5;a[i*3+1]=rocket.position.y+Math.cos(i*3)*age*4-age*age;a[i*3+2]=Math.sin(i*11)*age*4;}failureParticles.geometry.attributes.position.needsUpdate=true;failureParticles.material.opacity=Math.max(0,1-age/3);if(state.finishedFailure)finish();return;}
  if(state.reachedSpace){if(kit.renderer){kit.renderer.shadowMap.autoUpdate=false;kit.renderer.shadowMap.needsUpdate=false;}atmosphere.hide();motion.hideReleased();onSpaceReached();rocket.visible=false;environment.visible=false;horizon.visible=false;exhaust.hide();space=createLaunchSpace(kit,design,data,{craft:payload,assembly,stage:rocket,horizon,target:cameraTarget,entryVelocity:motion.payloadVelocityAtInsertion(),manualDeployment:manualDeployment||transferCoast,transferCoast});kit.scene.background.set(0x030913);}
 };
 if(!kit.renderer)onPhase('3D unavailable · Use Skip to continue');
 const destroy=()=>{finished=true;operations=null;horizon.userData.stopTexture();space?.destroy();if(!space)assembly?.destroy();kit.destroy();};
 return {getOrbitView(){if(!space?.ready)return null;operations={elapsedSec:0,orbit:null,paused:false,attitude:null};const sample=()=>space.updateOperations(0,0,performance.now()/1000,operations);sample();return {setTime(seconds,{orbit=null,paused=false,attitude=null}={}){operations={elapsedSec:seconds,orbit,paused,attitude};sample();},setProgress(p,options){this.setTime(Math.max(0,Math.min(1,p))*OPERATION_WINDOW_SEC,options);},setCamera(mode,north){space.setCamera(mode,north);sample();},focusTarget(id){space.focusTarget(id);sample();},onTargetSelected(callback){space.onTargetSelected(callback);},flash(type){space.flash(type);},destroy};},getCheckpoint,togglePause(){paused=!paused;lastPresentationTime=performance.now()/1000;},getMetrics:()=>({...kit.metrics,drawCalls:kit.renderer?.info.render.calls||0}),skip(){if(space?.ready)space.update(1);finish();},destroy};
}

