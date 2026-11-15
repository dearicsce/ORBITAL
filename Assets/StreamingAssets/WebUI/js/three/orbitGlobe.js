import {attachStarBackground} from './starfield.js';
import * as THREE from 'three';
import {createScene,addEarth,addStars} from './sceneKit.js';
import {addWorldBody} from './worldBody.js';
import {createOrbitPath,renderPosition} from './orbitPresentation.js';
import {presetOrbit,propagate,orbitalPeriod,BODIES,bodyAngle} from '../engine/orbitalGeometry.js';
export function createOrbitGlobe(container,{orbits,selectedId,onSelect}){
 const kit=createScene(container,{position:[7,5,9],space:true}),earth=addEarth(kit.scene,2),moon=addWorldBody(kit.scene,'llo',2);addStars(kit.scene);
 const stopSky=attachStarBackground(kit.scene);
 kit.sun.position.set(40,0,0);
 const rings=new Map();for(const o of orbits){const ring=createOrbitPath(o.id,{bodyRadius:2,exaggerated:false});ring.userData.orbit=o.id;kit.scene.add(ring);rings.set(o.id,ring);}
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.045,16,12),new THREE.MeshBasicMaterial({color:0xe0ffa4}));kit.scene.add(dot);
 let selected=selectedId,elapsed=0,currentOrbit=null;
 function select(id,override=null){selected=id;elapsed=0;const o=override||presetOrbit(id);currentOrbit=o;if(o){const old=rings.get(id);if(old){old.geometry.dispose();const next=createOrbitPath(id,{bodyRadius:2,exaggerated:false,orbit:o});old.geometry=next.geometry;next.material.dispose();}}earth.visible=!!o&&o.body==='earth';moon.visible=!!o&&o.body==='moon';dot.visible=!!o;for(const [key,ring]of rings){ring.visible=!!o&&key===id;ring.material.opacity=.7;}const extent=o?Math.max(2,2*o.semiMajorAxisM/BODIES[o.body].radiusM):3;kit.camera.position.set(extent*1.8,extent*1.2,extent*2.3);kit.controls?.target.set(0,0,0);kit.camera.lookAt(0,0,0);}
 select(selectedId);kit.draw=dt=>{elapsed+=dt;const o=currentOrbit;if(o){const time=elapsed*orbitalPeriod(o)/30;dot.position.copy(renderPosition(propagate(o,time),selected,2,false));(o.body==='moon'?moon:earth).rotation.y=bodyAngle(o.body,time);}};
 return {select,destroy(){earth.userData.stopTexture();moon.userData.stopTexture?.();stopSky();kit.destroy();}};
}
