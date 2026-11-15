import * as THREE from 'three';
import {sampleAscent, STAGING} from './launchTimeline.js';

function firing(nozzle, state) {
  if (!state || (state.throttle ?? Number(state.ignition)) <= .001) return false;
  if (state.attachedPartIds && !state.attachedPartIds.includes(nozzle.id)) return false;
  if (state.engineStatesById) return Boolean(state.engineStatesById[nozzle.id]);
  if (!state.ignition) return false;
  return (state.flight > STAGING.core) === (nozzle.id === 'upper');
}

function smokeTexture() {
  const size=64, data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size-.5,v=y/size-.5,r=Math.hypot(u,v);
    const noise=.8+.12*Math.sin(u*29+v*18)*Math.cos(v*23-u*7);
    const i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=240;
    data[i+3]=Math.round(255*noise*Math.max(0,1-THREE.MathUtils.smoothstep(r,.02,.48))**2);
  }
  const texture=new THREE.DataTexture(data,size,size);
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  return texture;
}

function plumeMaterial(inner) {
  return new THREE.ShaderMaterial({
    uniforms:{clock:{value:0},strength:{value:1},vacuum:{value:0},inner:{value:Number(inner)}},
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,
    vertexShader:`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 plumeUV;
      varying vec3 plumeNormal;
      varying vec3 plumeView;
      void main(){
        plumeUV=uv;
        vec4 p=modelViewMatrix*vec4(position,1.);
        plumeNormal=normalize(normalMatrix*normal);plumeView=normalize(-p.xyz);
        gl_Position=projectionMatrix*p;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform float clock,strength,vacuum,inner;
      varying vec2 plumeUV;
      varying vec3 plumeNormal,plumeView;
      void main(){
        #include <logdepthbuf_fragment>
        float t=1.-plumeUV.y;
        float facing=pow(abs(dot(normalize(plumeNormal),normalize(plumeView))),.8);
        float fade=pow(1.-smoothstep(.12,1.,t),1.8)*smoothstep(0.,.045,t);
        float shimmer=.87+.13*sin(t*83.-clock*37.+sin(plumeUV.x*31.));
        vec3 warm=mix(vec3(1.,.84,.54),vec3(1.,.22,.025),smoothstep(.08,.75,t));
        vec3 cool=mix(vec3(.65,.85,1.),vec3(.15,.38,.72),t);
        vec3 color=mix(warm,cool,vacuum*.8);
        color=mix(color,vec3(1.,.96,.84),inner*.8);
        gl_FragColor=vec4(color,fade*facing*shimmer*strength*mix(.17,.8,inner));
      }`,
  });
}

// Every jet begins at its nozzle exit and extends along the vehicle's -Y axis.
// The geometry itself contains no upstream vertices, including in vacuum.
export function createLaunchExhaust(scene, motion) {
  const root=new THREE.Group();root.name='aegis_launch_exhaust';scene.add(root);
  const jets=motion.nozzles.map(nozzle=>{
    const r=Math.max(.06,nozzle.radius??.25), group=new THREE.Group();
    group.name='exhaust_'+nozzle.id;root.add(group);
    const make=(name,top,bottom,length,inner)=>{
      const geometry=new THREE.CylinderGeometry(top,bottom,length,32,16,true);
      geometry.translate(0,-length/2,0);
      const mesh=new THREE.Mesh(geometry,plumeMaterial(inner));mesh.name=name;
      mesh.frustumCulled=false;group.add(mesh);return mesh;
    };
    return {nozzle,group,r,core:make('hot_core',r*.72,r*.03,r*10,true),
      envelope:make('soft_expansion',r*.85,r*2.2,r*18,false)};
  });
  const texture=smokeTexture();
  const puffs=Array.from({length:48},()=>{
    const puff=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xaeb5bb,
      transparent:true,depthWrite:false,opacity:0}));
    puff.name='atmospheric_smoke';root.add(puff);return puff;
  });
  const light=new THREE.PointLight(0xffb274,0,12);root.add(light);
  const tail=new THREE.Vector3(),q=new THREE.Quaternion(),z=new THREE.Vector3(0,0,1);
  let dead=false;
  return {
    update(seconds,state,options={}) {
      if(dead)return;root.visible=true;light.intensity=0;
      const altitude=state.altitudeKm??0,throttle=state.throttle??1;
      for(const {nozzle,group,core,envelope} of jets){
        group.visible=firing(nozzle,state);if(!group.visible)continue;
        group.position.copy(motion.nozzlePosition(nozzle,state));
        group.quaternion.copy(motion.orientation?.(state)??q.setFromAxisAngle(z,-(state.pitch??0)));
        const vacuum=THREE.MathUtils.smoothstep(altitude,25,100);
        const pulse=(.96+.04*Math.sin(seconds*41))*Math.sqrt(throttle);
        core.scale.set(1,pulse,1);
        envelope.scale.set(1+vacuum*.7,pulse*(1+vacuum*.45),1+vacuum*.7);
        for(const mesh of [core,envelope]){
          mesh.material.uniforms.clock.value=seconds;
          mesh.material.uniforms.strength.value=throttle;
          mesh.material.uniforms.vacuum.value=vacuum;
        }
        if(!light.intensity){light.position.copy(group.position);light.intensity=2.5*throttle*(1-vacuum);}
      }
      const latest=Math.floor(seconds*18);
      for(let i=0;i<puffs.length;i++){
        const puff=puffs[i],index=latest-i,emitted=index/18,age=seconds-emitted;
        puff.visible=false;
        if(index<0||age>2.7||altitude>55)continue;
        const sample=motion.emissionState?.(emitted)??sampleAscent(emitted,options);
        if(!sample||(sample.altitudeKm??0)>48)continue;
        const sources=motion.nozzles.filter(n=>firing(n,sample));
        if(!sources.length)continue;
        const nozzle=sources[index%sources.length],swirl=index*2.39996;
        tail.set(0,-1,0).applyQuaternion(motion.orientation?.(sample)??q.identity());
        puff.position.copy(motion.nozzlePosition(nozzle,sample)).addScaledVector(tail,age*7);
        if(motion.emissionDrift)puff.position.add(motion.emissionDrift(sample,age));
        const floor=motion.floorY?.()??-Infinity,grounded=puff.position.y<floor+.7;
        const spread=age*(grounded?2.1:.7);
        puff.position.x+=Math.cos(swirl)*spread;puff.position.z+=Math.sin(swirl)*spread;
        puff.position.y=Math.max(floor,puff.position.y)+age*.2;
        puff.scale.setScalar(nozzle.radius*2+age*(grounded?2.6:1.4));
        puff.material.rotation=swirl;
        puff.material.opacity=(1-age/2.7)**1.7*(1-(sample.altitudeKm??0)/48)*.34;
        puff.visible=true;
      }
    },
    hide(){root.visible=false;},show(){root.visible=true;},
    destroy(){if(dead)return;dead=true;root.removeFromParent();
      for(const {core,envelope} of jets)for(const mesh of [core,envelope]){mesh.geometry.dispose();mesh.material.dispose();}
      for(const puff of puffs)puff.material.dispose();texture.dispose();
    },
  };
}
