import * as THREE from 'three';

// Complete original educational vehicle visuals, separate from performance data.
export function createLaunchVehicle(id,{upperOnly=false,custom=null}={}) {
  const root=new THREE.Group();root.name='assembled_launch_vehicle';
  const white=new THREE.MeshStandardMaterial({color:0xe9eceb,roughness:.48,metalness:.15});
  const dark=new THREE.MeshStandardMaterial({color:0x17212b,roughness:.48,metalness:.45});
  const metal=new THREE.MeshStandardMaterial({color:0x8e9ba5,roughness:.35,metalness:.7});
  const atlas=['condor','roc','atlas_upper'].includes(id),ares=id==='albatross',r=custom?(custom.core?.diameterM||1.8)*.29:atlas?.55:ares?.37:.43;
  const upperR=custom?(custom.upper?.diameterM||1.8)*.29:r;
  const lower=new THREE.Group();lower.name='stage_lower';const upper=new THREE.Group();upper.name='stage_upper';
  lower.userData.flightPartId='core';upper.userData.flightPartId='upper';
  const lowerH=10,upperH=3.1;upper.position.y=upperOnly?0:10.25;
  const cylinder=(parent,name,rt,rb,h,y,mat)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,48),mat);m.name=name;m.position.y=y;parent.add(m);return m;};
  cylinder(lower,'first_stage_tank',r,r,lowerH,lowerH/2,white);
  cylinder(lower,'interstage',r*1.01,r*1.01,.9,lowerH-.1,dark);
  for(let i=0;i<(custom?(custom.core?.port==='28'?3:1):atlas?1:9);i++){
    const angle=i*Math.PI*2/8,engine=cylinder(lower,'engine_bell',r*.13,r*.21,.55,.05,metal);
    engine.userData.flightEngineId='core';
    if(i){engine.position.x=Math.cos(angle)*r*.55;engine.position.z=Math.sin(angle)*r*.55;}
  }
  for(const y of [1.4,3.8,6.2,8.6])cylinder(lower,'tank_join',r*1.006,r*1.006,.025,y,metal);
  cylinder(upper,'upper_stage_tank',upperR,upperR,upperH,upperH/2+.1,white);
  cylinder(upper,'upper_engine',upperR*.23,upperR*.56,.65,-.2,dark).userData.flightEngineId='upper';
  cylinder(upper,'payload_adapter',upperR*.55,upperR*.85,.35,upperH+.22,metal);
  root.add(upper);
  if(!upperOnly){
    root.add(lower);
    const width=custom?(custom.fairing?.radiusM||1.45)*.47:r;
    const points=[new THREE.Vector2(width*1.27,0),new THREE.Vector2(width*1.35,.2),new THREE.Vector2(width*1.35,1.8),new THREE.Vector2(width*1.15,2.4),new THREE.Vector2(width*.62,3.1),new THREE.Vector2(0,3.45)];
    for(let i=0;i<2;i++){
      const material=white.clone();material.side=THREE.DoubleSide;
      const fairing=new THREE.Mesh(new THREE.LatheGeometry(points,48,i*Math.PI,Math.PI),material);
      fairing.name=i?'fairing_right':'fairing_left';fairing.userData.flightPartId=i?'fairing-right':'fairing-left';fairing.position.y=13.4;root.add(fairing);
    }
    const boosterCount=custom?(custom.booster?.count||0):atlas?(id==='roc'?4:2):0;
    for(let i=0;i<boosterCount;i++){
      const booster=new THREE.Group();booster.name='booster_'+i;const a=i*Math.PI*2/boosterCount;booster.position.set(Math.cos(a)*r*1.7,0,Math.sin(a)*r*1.7);
      booster.userData.flightPartId='booster-'+i;
      cylinder(booster,'booster_case',r*.42,r*.42,6.8,3.5,white);cylinder(booster,'booster_nose',0,r*.42,1.1,7.45,white);cylinder(booster,'booster_nozzle',r*.2,r*.3,.5,.2,dark).userData.flightEngineId=booster.userData.flightPartId;lower.add(booster);
    }
  }
  root.userData.visualModel='Original schematic complete launch stack; not flight-certified dimensions';return root;
}
