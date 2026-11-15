import * as THREE from 'three';
import {createLaunchSite} from './launchSite.js';
export function createLaunchEnvironment(kit){const group=createLaunchSite();kit.scene.add(group);return group;}
export function createAtmosphere(kit){
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{darkness:{value:0}},vertexShader:'varying vec3 vDirection;void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:"varying vec3 vDirection;uniform float darkness;void main(){float h=smoothstep(-0.05,0.6,vDirection.y);vec3 sky=mix(vec3(0.28,0.46,0.62),vec3(0.065,0.20,0.43),h);float sun=pow(max(0.0,dot(normalize(vDirection),normalize(vec3(-0.5,0.12,-0.8)))),180.0);sky+=vec3(1.0,0.7,0.35)*sun;gl_FragColor=vec4(mix(sky,vec3(0.002,0.006,0.015),darkness),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment> }"});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),material);sky.frustumCulled=false;sky.renderOrder=-10;kit.scene.add(sky);
 return {update(darkness){sky.position.copy(kit.camera.position);material.uniforms.darkness.value=darkness;},hide(){sky.visible=false;}};
}
