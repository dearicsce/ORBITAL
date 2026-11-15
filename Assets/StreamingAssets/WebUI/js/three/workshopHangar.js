import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function createWorkshopHangar(scene,{launcher=false}={}){
  const room=new THREE.Group();
  scene.add(room);
  scene.background.set(0x0b1924);
  const steel=new THREE.MeshStandardMaterial({color:0x4c6570,metalness:.4,roughness:.62});
  const inset=new THREE.MeshStandardMaterial({color:0x122532,metalness:.35,roughness:.7});
  const amber=new THREE.MeshStandardMaterial({color:0xc58c3e,roughness:.66});
  const lamp=new THREE.MeshBasicMaterial({color:0x8ce5ee});
  const sizeM=launcher?60:24,height=launcher?39:4.5,wallDistance=launcher?25:7.4;
  const block=(parent,material,w,h,d,x,y,z)=>{
    const object=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    object.position.set(x,y,z);
    parent.add(object);
    return object;
  };
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(sizeM,sizeM),inset);
  floor.position.y=-.08;
  floor.rotation.x=-Math.PI/2;
  floor.receiveShadow=true;
  room.add(floor);
  const grid=new THREE.GridHelper(sizeM,launcher?60:48,0x396771,0x254650);
  grid.position.y=-.075;
  room.add(grid);
  const fixture=new THREE.Group();
  room.add(fixture);
  block(fixture,steel,launcher?5.8:1.85,.12,launcher?5.8:1.55,0,-.02,0);
  const marking=launcher?2.65:.81;
  for(const x of [-marking,marking])for(const z of [-marking,marking]){
    block(fixture,amber,.16,.013,.04,x,.044,z);
    block(fixture,amber,.04,.013,.16,x,.044,z);
  }
  const rails=new THREE.Group();
  room.add(rails);
  for(const side of [-1,1]){
    block(room,amber,.04,.006,12,side*2,-.068,0);
    block(rails,amber,launcher?.55:.12,launcher?.55:.17,launcher?40:16,side*(launcher?9:2.55),height-.7,0);
    block(rails,lamp,launcher?.18:.04,.035,launcher?24:8,side*(launcher?8.7:2.45),height-.87,0);
  }
  block(rails,amber,launcher?19:5.25,launcher?.65:.18,launcher?1.5:.26,0,height-.72,launcher?-8:-2.4);
  const walls=Array.from({length:4},(_,i)=>{
    const panel=new THREE.Group();
    panel.rotation.y=i*Math.PI/2;
    room.add(panel);
    const pitch=launcher?5:2,z=-wallDistance;
    block(panel,steel,wallDistance*2+.6,height,.22,0,height/2,z);
    for(let x=-wallDistance;x<wallDistance;x+=pitch){
      const mid=x+pitch/2;
      block(panel,steel,launcher?.46:.13,height,launcher?1.25:.28,x,height/2,z+.24);
      block(panel,inset,pitch-.28,launcher?2.1:.95,launcher?.55:.16,mid,launcher?1.3:.53,z+.25);
      for(const y of launcher?[5,14,23,32]:[2.1]){
        block(panel,inset,pitch-.32,launcher?5.7:1.28,.12,mid,y,z+.2);
        block(panel,lamp,pitch-.6,launcher?.12:.035,.08,mid,y+(launcher?3:1.15),z+.29);
      }
      for(let vent=0;vent<3;vent++)block(panel,steel,pitch*.54,.028,.06,mid,.4+vent*.11,z+(launcher?.57:.36));
    }
    if(launcher)for(const y of [10,20,30]){
      block(panel,steel,wallDistance*1.9,.45,2.2,0,y,z+1.23);
      block(panel,amber,wallDistance*1.9,.09,.09,0,y+1.15,z+2.24);
    }
    for(const material of [steel,inset,lamp,amber]){
      const pieces=panel.children.filter(mesh=>mesh.material===material);
      if(!pieces.length)continue;
      const geometries=pieces.map(mesh=>mesh.geometry.translate(...mesh.position.toArray()));
      panel.remove(...pieces);
      panel.add(new THREE.Mesh(mergeGeometries(geometries),material));
      geometries.forEach(geometry=>geometry.dispose());
    }
    return panel;
  });
  const center=new THREE.Vector3(),size=new THREE.Vector3();
  return {
    fit(bounds){
      bounds.getCenter(center);
      bounds.getSize(size);
      room.position.y=bounds.min.y-.15;
      fixture.position.x=center.x;
      fixture.position.z=center.z;
      if(!launcher)fixture.scale.set(Math.max(1,size.x*.60),1,Math.max(1,size.z*.71));
    },
    frame(camera){
      const under=camera.position.y<room.position.y;
      floor.visible=grid.visible=fixture.visible=!under;
      rails.visible=!under&&camera.position.y-room.position.y<height-.5;
      for(const wall of walls){
        const far=camera.position.x*Math.sin(wall.rotation.y)+camera.position.z*Math.cos(wall.rotation.y);
        wall.visible=!under&&far>-.15;
      }
    }
  };
}
