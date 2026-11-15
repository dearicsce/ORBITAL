import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {createLaunchVehicle} from './launchVehicle.js';
import {createCatchTower} from './catchTower.js';
import {PAD_DECK_Y} from './launchTimeline.js';
import {loadLocalTexture} from './localTexture.js';
export function createLaunchSite(){
  const group=new THREE.Group();group.name='launch_complex';
  const grass=surface('Grass004',0xb0ad86,1.4,0xb0ad86,true);
  const concrete=surface('Concrete030',0xb5b3aa,4,0x96928a);
  const asphalt=surface('Asphalt012',0x9eaaa9,3,0x49555b);
  const white=new THREE.MeshStandardMaterial({color:0xc5ccca,roughness:.65});
  const line=new THREE.MeshBasicMaterial({color:0xe0d4a2});
  const box=(name,w,h,d,x,y,z,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.name=name;m.position.set(x,y,z);m.receiveShadow=true;if(material.userData.tileM)worldUV(m.geometry,x,z,material.userData.tileM);group.add(m);return m;};
  const groundHeight=(x,z)=>{
    const outside=THREE.MathUtils.smoothstep(Math.max(Math.abs(x)-170,Math.abs(z+40)-160),0,160);
    return -.2+outside*(1.6*Math.sin(x*.014)*Math.cos(z*.011)+.6*Math.sin(z*.035));
  };
  const terrain=new THREE.PlaneGeometry(1600,1600,180,180);terrain.rotateX(-Math.PI/2);
  const vertices=terrain.attributes.position,colors=[];
  for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),z=vertices.getZ(i);vertices.setY(i,groundHeight(x,z));const moisture=.5+.25*Math.sin(x*.031)*Math.cos(z*.024)+.2*Math.sin((x+z)*.008);const color=new THREE.Color().lerpColors(new THREE.Color('#9b986d'),new THREE.Color('#70806b'),moisture);colors.push(color.r,color.g,color.b);}
  terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();worldUV(terrain,0,0,grass.userData.tileM);
  const meadow=new THREE.Mesh(terrain,grass);meadow.name='grass_meadow';meadow.receiveShadow=true;group.add(meadow);
  const gravel=surface('Concrete030',0x8c826b,2,0x776c5a),water=new THREE.MeshStandardMaterial({color:0x455e61,roughness:.3,metalness:.15});
  box('coastal_water',650,.1,1600,620,-.38,0,water);
  for(const z of [20,-42,-100])box('gravel_road_shoulder',250,.035,10,0,-.17,z,gravel);
  for(const x of [-120,120,-70,0,85])box('gravel_road_shoulder',10,.035,120,x,-.17,-40,gravel);
  // Drainage corridors and lined retention ponds, kept clear of access roads.
  box('drainage_bank',244,.06,3,0,-.15,29,gravel);
  box('drainage_water',244,.03,1.2,0,-.10,29,water);
  const junctions=[-120,-70,0,85,120];
  for(let i=1;i<junctions.length;i++){
    const x=(junctions[i]+junctions[i-1])/2,width=junctions[i]-junctions[i-1]-10;
    box('drainage_bank',width,.06,3,x,-.15,-32,gravel);
    box('drainage_water',width,.03,1.2,x,-.10,-32,water);
  }
  box('retention_basin',25,.04,16,122,-.1,-118,gravel);box('retention_water',22,.05,13,122,-.06,-118,water);
  for(const z of [20,-42,-100]){
    box('access_road',247,.04,7,0,-.13,z,asphalt);
    for(let x=-114;x<117;x+=8){
      if([-70,0,85].some(junction=>Math.abs(x-junction)<6))continue;
      box('road_center_marking',3,.012,.12,x,-.10,z,line);
    }
  }
  for(const x of [-120,120,-70,0,85])box('pad_access_road',7,.04,120,x,-.122,-40,asphalt);
  const pads=[[0,0],[-70,-60],[85,-68]];
  for(const [i,[x,z]] of pads.entries()){
    box('pad_'+(i+1),22,.3,24,x,-.1,z,concrete);
    box('flame_trench',4,.12,18,x,-.02,z+7,asphalt);
    const tower=createCatchTower();tower.scale.setScalar(.18);tower.position.set(x,0,z-3.4);tower.userData.setArmOpening(1);tower.name='service_tower_'+i;group.add(tower);
    const deck=new THREE.Mesh(new THREE.TorusGeometry(1.46,.22,12,48),asphalt);
    deck.name='launch_mount';deck.rotation.x=-Math.PI/2;deck.position.set(x,PAD_DECK_Y-.22,z);group.add(deck);
    for(const side of [-1,1]){
      box('mount_pedestal',.55,1.05,2.2,x+side*1.42,.54,z,concrete);
      box('hold_down_rail',1.05,.12,.38,x+side*.99,PAD_DECK_Y-.06,z,asphalt);
    }
    if(i){const vehicle=createLaunchVehicle(i===1?'condor':'kestrel');vehicle.scale.setScalar(.8);vehicle.position.set(x,PAD_DECK_Y+.18,z);vehicle.name='standby_launcher_'+i;group.add(vehicle);}
    for(const side of [-1,1])box('equipment_shed',3,2,3,x+side*10,1,z-7,white);
  }
  box('vehicle_assembly_hall',26,12,22,-67,6,-112,white);
  box('hangar_door',18,9,.1,-67,4.5,-100.9,asphalt);
  for(let i=0;i<8;i++)box('door_section',.1,9,.1,-75+i*2.3,4.5,-100.8,concrete);
  box('operations_building',20,4,10,42,2,-35,white);
  box('roof_equipment',5,1,3,42,4.5,-35,asphalt);
  box('logistics_apron',35,.12,20,-88,-.07,8,concrete);
  box('maintenance_hall',23,5,9,-88,2.5,3,white);
  for(let i=0;i<4;i++)box('maintenance_bay',3.6,3.6,.12,-96+i*5,1.8,7.54,asphalt);
  box('staging_apron',30,.12,23,76,-.07,34,concrete);
  for(let i=0;i<5;i++)box('staging_lane',.12,.012,13,65+i*5,.005,33,line);
  for(let i=0;i<3;i++){
    box('support_container',5.8,2.25,2.25,66+i*8,1.05,42,white);
    box('container_door',1.9,1.9,.05,66+i*8,1.05,40.85,asphalt);
  }
  const pipe=new THREE.MeshStandardMaterial({color:0xadb3b0,metalness:.7,roughness:.4});
  const cylinder=(name,r,h,x,y,z,material)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),material);m.position.set(x,y,z);m.name=name;m.castShadow=true;group.add(m);return m;};
  for(const [x,z] of pads){
    box('apron_edge',28,.06,30,x,-.14,z,gravel);
    for(const dx of [-8,8]){box('reinforced_curb',.3,.35,22,x+dx,.12,z,concrete);for(let k=0;k<5;k++)box('pad_safety_marking',.7,.02,1.3,x+dx+1,.08,z-8+k*4,line);}
    // Flame deflector extends from the launch table into the trench.
    box('trench_wall',.6,1.5,14,x-2.8,.4,z+5,concrete);box('trench_wall',.6,1.5,14,x+2.8,.4,z+5,concrete);
    const deflector=box('steel_flame_deflector',4,.25,6,x,.25,z+4,asphalt);deflector.rotation.x=-.2;
    box('water_deluge_pipe',.16,.16,20,x-4,.3,z+2,pipe);
    for(let i=0;i<3;i++){cylinder('propellant_storage_tank',1.1,4,x+16,2,z-9+i*3,white);cylinder('tank_footing',1.35,.2,x+16,0,z-9+i*3,concrete);}
    box('tank_service_pipe',.12,.12,12,x+14,.5,z-6,pipe);
    box('blast_berm',2,1.1,26,x-17,.3,z,gravel);
    for(let k=0;k<9;k++){cylinder('perimeter_fence_post',.035,1.8,x-14,.9,z-15+k*4,pipe);box('fence_wire',.025,.025,32,x-14,.6+k*.13,z+1,pipe);}
  }
  // Remote treeline outside the operational safety zone: trunks plus layered
  // irregular crowns, replacing the evenly scattered lawn spheres.
  const leaf=new THREE.MeshStandardMaterial({color:0x384c32,roughness:1}),bark=new THREE.MeshStandardMaterial({color:0x655c48,roughness:1});
  const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),leaf,420),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.2,3,7),bark,140);crowns.name='landscape_treeline';trunks.name='tree_trunks';
  let seed=431;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const matrix=new THREE.Matrix4();
  for(let i=0;i<140;i++){
    const u=random(),v=random(),h=3+random()*4;
    const x=i<88?-295+u*560:-188-u*125;
    const z=i<88?-175-v*140:-165+v*280;
    const y=groundHeight(x,z);
    matrix.compose(new THREE.Vector3(x,y+h*.45,z),new THREE.Quaternion(),new THREE.Vector3(1,h/3,1));
    trunks.setMatrixAt(i,matrix);
    for(let j=0;j<3;j++){
      const origin=new THREE.Vector3(x+(random()-.5)*1.5,y+h*.68+j*.7,z+(random()-.5)*1.5);
      const angle=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),random()*6);
      matrix.compose(origin,angle,new THREE.Vector3(1.5+random(),h*.28,1.4+random()));
      crowns.setMatrixAt(i*3+j,matrix);
    }
  }
  group.add(trunks,crowns);
  const blades=new THREE.InstancedMesh(new THREE.PlaneGeometry(.1,.35),new THREE.MeshStandardMaterial({color:0x777e51,roughness:1,side:THREE.DoubleSide}),3000);blades.name='grass_tufts';
  for(let i=0;i<3000;i++){const x=(random()-.5)*300,z=(random()-.5)*260;const clear=Math.abs(x)<12||Math.abs(x+70)<10||Math.abs(x-85)<10||[20,-42,-100].some(r=>Math.abs(z-r)<8)||pads.some(([px,pz])=>Math.hypot(x-px,z-pz)<23);matrix.compose(new THREE.Vector3(x,clear?-2:0,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),random()*6),new THREE.Vector3(1,.5+random(),1));blades.setMatrixAt(i,matrix);}group.add(blades);
  group.updateMatrixWorld(true);const batches=new Map(),remove=[];group.userData.siteFeatures=[];
  group.traverse(o=>{if(o.name)group.userData.siteFeatures.push(o.name);if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)){const key=o.material.uuid;if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});batches.get(key).geometries.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);}});
  for(const o of remove){o.removeFromParent();o.geometry.dispose();}
  for(const {material,geometries} of batches.values()){const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);}}
  return group;
}

function worldUV(geometry,x,z,tileM){
  const {position,normal,uv}=geometry.attributes;
  for(let i=0;i<position.count;i++){
    const px=position.getX(i)+x,py=position.getY(i),pz=position.getZ(i)+z;
    if(Math.abs(normal.getX(i))>.5&&Math.abs(normal.getY(i))<.5)uv.setXY(i,pz/tileM,py/tileM);
    else if(Math.abs(normal.getZ(i))>.5&&Math.abs(normal.getY(i))<.5)uv.setXY(i,px/tileM,py/tileM);
    else uv.setXY(i,px/tileM,pz/tileM);
  }
  uv.needsUpdate=true;
}
function surface(id,color,tileM,baseColor,vertexColors=false){
  const material=new THREE.MeshStandardMaterial({color:baseColor,roughness:1,normalScale:new THREE.Vector2(.5,.5),vertexColors});
  material.userData.tileM=tileM;
  const textures=[];
  let disposed=false;
  // A pending texture samples black. Keep the graded surfaces readable while
  // the PBR images load, even when the first frame comes before image decoding.
  for(const [key,suffix] of [['map','Color'],['normalMap','NormalGL'],['roughnessMap','Roughness']]){
    const texture=loadLocalTexture(new URL(`../../textures/launch/${id}_2K-JPG_${suffix}.jpg`,import.meta.url).href,loaded=>{
      if(disposed){loaded.dispose();return;}
      material[key]=loaded;
      if(key==='map')material.color.set(color);
      material.needsUpdate=true;
    });
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.anisotropy=8;
    if(key==='map')texture.colorSpace=THREE.SRGBColorSpace;
    textures.push(texture);
  }
  material.addEventListener('dispose',()=>{
    disposed=true;
    textures.forEach(texture=>texture.dispose());
  });
  return material;
}
