import * as THREE from 'three';
import {sampleAscent, ASCENT_SECONDS, LIFTOFF_SECONDS, PAD_DECK_Y, STAGING} from './launchTimeline.js';

// Authored cinematic scene units, never physical metres or operations time.
// Absolute-time sampling makes gameplay and inspection independent of frame rate
// and seek history. Released parts retain their release-world transform.
export function createLaunchMotion(rocket, world, payload, height, deckY=PAD_DECK_Y) {
  rocket.updateMatrixWorld(true);
  const baseY=deckY-new THREE.Box3().setFromObject(rocket).min.y+rocket.position.y;
  const yawAxis=new THREE.Vector3(0,0,1);
  const parts=[],nozzles=[];
  rocket.traverse(object=>{
    const booster=/^booster_\d+$/.test(object.name);
    const threshold=booster?STAGING.boosters:object.name==='stage_lower'?STAGING.core:
      object.name.startsWith('fairing_')?STAGING.fairing:null;
    if(threshold!==null)parts.push({object,threshold,booster,parent:object.parent,
      position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()});
    if(['engine_bell','booster_nozzle','upper_engine'].includes(object.name)){
      const {height,radiusBottom}=object.geometry.parameters;
      const exit=object.localToWorld(new THREE.Vector3(0,-height/2,0));
      nozzles.push({name:object.name,local:rocket.worldToLocal(exit),radius:radiusBottom*object.getWorldScale(new THREE.Vector3()).x});
    }
  });
  const releaseOrder=[...parts].sort((a,b)=>Number(b.object.name.startsWith('booster_'))-Number(a.object.name.startsWith('booster_')));
  const positionAt=state=>new THREE.Vector3(state.downrange,baseY+state.height,0);
  const pose = state => {
    rocket.position.copy(positionAt(state));
    rocket.rotation.set(0,0,-state.pitch);
    rocket.updateMatrixWorld(true);
  };
  function payloadPositionAt(seconds){
    const state=sampleAscent(seconds);
    return payload.position.clone().applyAxisAngle(yawAxis,-state.pitch).add(positionAt(state));
  }
  return {
    nozzles,
    nozzlePosition(nozzle,state){
      return nozzle.local.clone().applyAxisAngle(yawAxis,-state.pitch).add(positionAt(state));
    },
    payloadVelocityAtInsertion(){
      if(!payload)return new THREE.Vector3();
      const step=.001;
      return payloadPositionAt(ASCENT_SECONDS).sub(payloadPositionAt(ASCENT_SECONDS-step)).divideScalar(step);
    },
    sample(seconds, options={}) {
      const state=sampleAscent(seconds,options);
      for(const {object,parent,position,quaternion,scale} of parts){
        parent.add(object);object.position.copy(position);object.quaternion.copy(quaternion);
        object.scale.copy(scale);object.visible=true;
      }
      // Boosters leave while the core is still attached to the moving stack.
      for(const {object,threshold,booster,position} of releaseOrder){
        const lower=object.name==='stage_lower';
        if(state.flight>threshold){
          const releaseSeconds=LIFTOFF_SECONDS+threshold*(ASCENT_SECONDS-LIFTOFF_SECONDS);
          pose(sampleAscent(releaseSeconds,options));
          world.updateMatrixWorld(true);world.attach(object);
          const age=seconds-releaseSeconds;
          const velocity=positionAt(sampleAscent(releaseSeconds+.001,options))
            .sub(positionAt(sampleAscent(releaseSeconds-.001,options))).multiplyScalar(500);
          const kick=booster?new THREE.Vector3(position.x,0,position.z).normalize().multiplyScalar(2.6):
            lower?new THREE.Vector3(0,-2.4,0):new THREE.Vector3(object.name==='fairing_left'?2.3:-2.3,0,0);
          object.position.addScaledVector(velocity.add(kick.applyAxisAngle(yawAxis,rocket.rotation.z)),age);
          object.position.y-=age*age*(lower?1.8:.9);
          object.rotation.z+=age*(lower?.14:booster?.28:0);
          object.rotation.x+=age*(booster?kick.z*.13:kick.z*.25);
        }
      }
      pose(state);
      const nozzle=rocket.getObjectByName(state.flight>STAGING.core?'upper_engine':'engine_bell');
      const engine=nozzle?.getWorldPosition(new THREE.Vector3())||rocket.position.clone();
      const target=positionAt(state).add(new THREE.Vector3(Math.sin(state.pitch)*height*.49,Math.cos(state.pitch)*height*.49,0));
      const follow=THREE.MathUtils.smoothstep(state.flight,.06,.36);
      const camera=target.clone().add(new THREE.Vector3(height*(1.55-.96*follow),height*(.18+.1*follow),height*(2.55-.38*follow)));
      if(payload&&state.flight>STAGING.core){
        const blend=THREE.MathUtils.smoothstep(state.flight,STAGING.core,.96);
        const point=payload.getWorldPosition(new THREE.Vector3());
        target.lerp(point,blend);camera.lerp(point.clone().add(new THREE.Vector3(height*.26,height*.12,height*.55)),blend);
      }
      return {state,engine,target,camera,horizonVisible:state.flight>.35,padVisible:state.flight<.65};
    },
    hideReleased(){for(const {object} of parts)if(object.parent===world)object.visible=false;}
  };
}
