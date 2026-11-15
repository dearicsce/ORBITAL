import * as THREE from 'three';
import {sampleAscent,STAGING} from './launchTimeline.js';

const active = (nozzle,state) => state.engineStatesById ? (state.engineStatesById[nozzle.id]||0) : state.ignition && (state.flight > STAGING.core
  ? nozzle.name === 'upper_engine'
  : nozzle.name === 'engine_bell' || nozzle.name === 'booster_nozzle' && state.flight <= STAGING.boosters);

function smokeTexture(){
  const size=96,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size-.5,v=y/size-.5;
    const n=.72+.13*Math.sin(u*38+v*19)*Math.cos(v*28)+.15*Math.sin(v*55-u*21)*Math.cos(u*42);
    const r=Math.hypot(u,v);
    const i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=255;
    data[i+3]=Math.round(255*n*(1-THREE.MathUtils.smoothstep(r,.07,.49))**1.5);
  }
  const texture=new THREE.DataTexture(data,size,size);
  texture.magFilter=texture.minFilter=THREE.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

export function createLaunchExhaust(scene,motion){
  const group=new THREE.Group();
  scene.add(group);
  const texture=smokeTexture();
  const puffs=Array.from({length:66},()=>{
    const puff=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xd1ccc2,
      transparent:true,depthWrite:false}));
    group.add(puff);
    return puff;
  });
  const geometry=new THREE.LatheGeometry([
    [0,0],[1,0],[1.36,.13],[1.52,.3],[1.21,.65],[.32,.94],[0,1]
  ].map(([r,y])=>new THREE.Vector2(r,-y)),16);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,
    uniforms:{clock:{value:0}},
    vertexShader:`varying float along;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){along=-position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`uniform float clock;varying float along;
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        float shock=.87+.13*cos(along*46.0-clock*17.0);
        vec3 flame=mix(vec3(.61,.79,1.),vec3(1.,.38,.08),smoothstep(.08,.73,along));
        gl_FragColor=vec4(flame*1.25,(1.-smoothstep(.19,1.,along))*shock*.68);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const jets=motion.nozzles.map(nozzle=>{
    const jet=new THREE.Mesh(geometry,material);
    group.add(jet);
    return {nozzle,jet};
  });
  const light=new THREE.PointLight(0xff9b53,0,16);
  group.add(light);
  const tail=new THREE.Vector3();
  return {
    update(seconds,state,options){
      material.uniforms.clock.value=seconds;
      light.intensity=0;
      for(const {jet,nozzle} of jets){
        jet.visible=active(nozzle,state);
        if(!jet.visible)continue;
        jet.position.copy(motion.nozzlePosition(nozzle,state));
        if(motion.orientation)jet.quaternion.copy(motion.orientation(state));
        else jet.rotation.z=-state.pitch;
        const width=nozzle.radius*(1+Math.min(1,state.altitudeKm/75)*.9);
        const throttle=Number(active(nozzle,state));
        jet.scale.set(width,Math.max(.7,nozzle.radius*19)*Math.sqrt(throttle)*(1+.16*Math.sin(seconds*42+nozzle.local.z*5)),width);
        if(!light.intensity){light.intensity=4.5;light.position.copy(jet.position);}
      }
      // Recreate the trail from emission times so pause and resumed launches give the same plume.
      const latest=Math.floor(seconds*24);
      for(let i=0;i<puffs.length;i++){
        const index=latest-i,emitted=index/24,age=seconds-emitted;
        const emission=motion.emissionState?.(emitted)||sampleAscent(emitted,options);
        const sources=motion.nozzles.filter(nozzle=>active(nozzle,emission));
        const puff=puffs[i];
        puff.visible=Boolean(sources.length)&&emission.altitudeKm<55;
        if(!puff.visible)continue;
        const nozzle=sources[index%sources.length];
        const swirl=index*2.39996;
        if(motion.orientation)tail.set(0,-1,0).applyQuaternion(motion.orientation(emission));
        else tail.set(-Math.sin(emission.pitch),-Math.cos(emission.pitch),0);
        puff.position.copy(motion.nozzlePosition(nozzle,emission)).addScaledVector(tail,age*4);
        if(motion.emissionDrift)puff.position.add(motion.emissionDrift(emission,age));
        const floor=motion.floorY?.()??.28;
        const grounded=puff.position.y<floor;
        const spread=age*(grounded?3.6:1.1);
        puff.position.x+=Math.cos(swirl)*spread;
        puff.position.z+=Math.sin(swirl)*spread+(grounded?age*1.4:0);
        puff.position.y=Math.max(floor,puff.position.y)+age*.12;
        puff.scale.setScalar(.44+age*(grounded?1.8:1.1));
        puff.material.rotation=swirl;
        const density=nozzle.name==='booster_nozzle'?.72:.58;
        puff.material.opacity=density*(1-age/2.8)**2*(1-emission.altitudeKm/55);
      }
    },
    hide(){group.visible=false;}
  };
}
