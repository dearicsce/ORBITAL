import {flightCameraInput} from './flightCameraInput.js';
import {OPERATION_WINDOW_SEC} from '../engine/flightClock.js';
import * as THREE from 'three';
import {createAssembly} from './spacecraftParts.js';
import {createScene,addStars} from './sceneKit.js';
import {operationCamera,createOrbitPath} from './orbitPresentation.js';
import {createOrbitalEventFX} from './orbitalEventFX.js';
import {addWorldBody} from './worldBody.js';
import {createFlightFrame} from './flightFrame.js';

export function createOrbitOps(container,{orbitId,design,data,initialProgress=0,operationsSnapshot=null,stowed=false}){
 const orbit=operationsSnapshot?.orbit||design?.orbitElements;
 const kit=createScene(container,{position:operationCamera(orbitId,orbit),controls:false,space:true});
 if(kit.sun){kit.sun.position.set(40,0,0);kit.sun.target.position.set(0,0,0);if(!kit.sun.target.parent)kit.scene.add(kit.sun.target);}
 const globe=addWorldBody(kit.scene,orbitId,4);addStars(kit.scene);
 const localOrbitPath=createOrbitPath(orbitId,{orbit});kit.scene.add(localOrbitPath);
 const craft=new THREE.Group();craft.scale.setScalar(.38);kit.scene.add(craft);
 const assembly=createAssembly(craft);if(design&&data)assembly.update(design,data);
 const input=flightCameraInput(kit.renderer?.domElement);
 const frame=createFlightFrame(kit.scene,kit.camera,craft,globe,orbitId,orbit,input,container);
 const effects=createOrbitalEventFX(kit.scene,craft,kit.camera);
 let elapsedSec=initialProgress*OPERATION_WINDOW_SEC,presentationPaused=false,activeOrbit=orbit;
 frame.sample(elapsedSec);
 kit.draw=(_dt,now)=>{frame.sample(elapsedSec,activeOrbit,presentationPaused);localOrbitPath.position.copy(frame.origin);localOrbitPath.visible=container.dataset.orbitCamera!=='solar';assembly.animate(stowed?1:0);effects.update(now);};
 return {
  setTime(seconds,{orbit:nextOrbit,paused=false}={}){elapsedSec=seconds;presentationPaused=paused;activeOrbit=nextOrbit||activeOrbit;frame.sample(elapsedSec,activeOrbit,presentationPaused);},
  setProgress(p){this.setTime(Math.max(0,Math.min(1,p))*OPERATION_WINDOW_SEC);},
  setCamera(mode,north){frame.setCamera(mode,north);frame.sample(elapsedSec,activeOrbit,presentationPaused);},
  focusTarget(id){frame.focusTarget(id);frame.sample(elapsedSec,activeOrbit,presentationPaused);},
  onTargetSelected(callback){frame.onTargetSelected(callback);},
  sun:kit.sun,craft,kit,draw:kit.draw,
  getMetrics:()=>({...kit.metrics,drawCalls:kit.renderer?.info.render.calls||0}),
  flash:effects.flash,destroy(){frame.destroy();input.destroy();globe.userData.stopTexture();assembly.destroy();kit.destroy();}
 };
}
