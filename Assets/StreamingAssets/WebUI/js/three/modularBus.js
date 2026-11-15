import * as THREE from 'three';
import {structure,surfaces} from '../workshop/structure.js';
export const busDimensions=structure;
export function modularHardpoints(id){const {h,w,d}=structure(id),sideHeight=id==='bus_large'?h*.71:h;return {panelPairs:[{},{}],comms:{pos:[-w*.23,h,-d*.16],dir:[0,1,0]},instruments:Array.from({length:4},(_,i)=>({pos:[(i%2-.5)*w*.5,sideHeight*(i<2?.7:.28),d/2],dir:[0,0,1]})),fuel:[],batteries:[]};}
export function createModularBus(id){
 const root=new THREE.Group();root.name=id;const {w,h,d}=structure(id);
 const silver=new THREE.MeshStandardMaterial({color:0xd5dcdd,metalness:.4,roughness:.48}),gold=new THREE.MeshStandardMaterial({color:0xb99a51,metalness:.65,roughness:.6}),frame=new THREE.MeshStandardMaterial({color:0x637786,metalness:.75,roughness:.3}),dark=new THREE.MeshStandardMaterial({color:0x233746,metalness:.3,roughness:.65});
 const add=(name,geo,mat,pos,skin=false)=>{const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.position.set(...pos);mesh.userData.busSkin=skin;root.add(mesh);return mesh;};
 const box=(name,size,pos,mat=silver,skin=false)=>add(name,new THREE.BoxGeometry(...size),mat,pos,skin);
 if(id==='bus_medium'){
  // Flat front/back hexagonal prism; vertices at +/-X. Dimensions match attachment planes.
  add('enclosed_bus',new THREE.CylinderGeometry(w/2,w/2,h-.08,6).rotateY(Math.PI/6),gold,[0,h/2,0],true);
  for(const y of [.035,h-.035])add('hexagonal_payload_deck',new THREE.CylinderGeometry(w*.51,w*.51,.07,6).rotateY(Math.PI/6),silver,[0,y,0]);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;box('hex_corner_strut',[.045,h,.045],[Math.cos(a)*w/2,h/2,Math.sin(a)*w/2],frame);}
 }else if(id==='bus_small'){
  const shape=new THREE.Shape(),bevel=.15;
  shape.moveTo(-w/2+bevel,-d/2);for(const [x,z]of [[w/2-bevel,-d/2],[w/2,-d/2+bevel],[w/2,d/2-bevel],[w/2-bevel,d/2],[-w/2+bevel,d/2],[-w/2,d/2-bevel],[-w/2,-d/2+bevel]])shape.lineTo(x,z);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:h-.06,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,h-.03,0);add('enclosed_bus',g,gold,[0,0,0],true);
  for(const y of [.06,h])add('bounded_deck',new THREE.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false}).rotateX(Math.PI/2),silver,[0,y,0]);
  for(const side of [-1,1]){box('side_equipment_plate',[.025,h*.7,d*.66],[side*w/2,h*.5,0],silver,true);for(const z of [-.3,.3])box('structural_side_rail',[.05,h,.05],[side*(w/2-.1),h/2,z],frame);}
 }else{
  const large=id==='bus_large',bodyH=large?h*.71:h;
  box('enclosed_bus',[w*.97,bodyH-.06,d*.97],[0,bodyH/2,0],gold,true);
  for(const side of [-1,1]){
   box('thermal_front_back',[w*.85,bodyH*.86,.025],[0,bodyH/2,side*d/2],silver,true);
   box('thermal_side',[.025,bodyH*.86,d*.85],[side*w/2,bodyH/2,0],silver,true);
   for(const z of [-1,1])box('corner_rail',[large?.07:.045,bodyH,.045],[side*w/2,bodyH/2,z*d/2],frame);
  }
  for(const y of [.025,bodyH-.025])box('structural_deck',[w,.05,d],[0,y,0]);
  if(large){
   add('upper_payload_turret',new THREE.CylinderGeometry(w*.38,w*.43,h-bodyH-.04,8),gold,[0,bodyH+(h-bodyH-.04)/2,0],true);
   add('upper_payload_deck',new THREE.CylinderGeometry(w*.4,w*.4,.065,8),silver,[0,h-.0325,0]);
   for(const side of [-1,1]){box('wing_mount_girder',[.12,.22,d*.75],[side*w/2,bodyH*.6,0],frame);for(let n=0;n<8;n++)box('radiator_fin',[w*.6,.025,.045],[0,.25+n*.13,side*(d/2+.025)],dark,true);}
  }
 }
 // Internal trays are structural, not selectable simulated equipment.
 for(let n=0;n<Math.ceil(structure(id).bays/4);n++)box('internal_tray',[w*.65,.018,d*.65],[0,.1+n*h*.115,0],frame);
 add('launch_adapter',new THREE.CylinderGeometry(w*.24,w*.31,.085,32),frame,[0,.015,0]);
 root.userData.structure={origin:[0,0,0],adapter:[0,0,0],surfaces:surfaces(id),units:'m'};return root;
}
export function createModularEquipment(id){
 const root=new THREE.Group();root.name=id;
 const metal=new THREE.MeshStandardMaterial({name:'white_equipment',color:0xc9d1d3,roughness:.5,metalness:.35}),dark=new THREE.MeshStandardMaterial({name:'black_optics',color:0x101e29,roughness:.24,metalness:.4});
 const add=(name,geometry,material,y)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.position.y=y;root.add(m);return m;};
 add('bolted_mount',new THREE.BoxGeometry(.18,.04,.18),metal,.02);
 if(id.startsWith('comms_')){
  add('antenna_stem',new THREE.CylinderGeometry(.018,.026,.18,12),metal,.11);
  if(id==='comms_uhf')for(const x of [-.1,.1]){const m=add('uhf_whip',new THREE.CylinderGeometry(.006,.006,.3,8),metal,.19);m.position.x=x;}
  else {const points=Array.from({length:25},(_,i)=>{const r=i/24*.2;return new THREE.Vector2(r,.21+r*r*1.2);});const dish=add('reflector_dish',new THREE.LatheGeometry(points,48),metal,0);dish.material.side=THREE.DoubleSide;add('feed',new THREE.CylinderGeometry(.012,.012,.14,12),dark,.32);}
 }else if(id==='magnetometer'){add('sensor_boom',new THREE.CylinderGeometry(.012,.018,.42,12),metal,.23);add('sensor_head',new THREE.BoxGeometry(.09,.07,.09),dark,.47);}
 else if(id.startsWith('transponder'))add('relay_electronics',new THREE.BoxGeometry(.17,.16,.16),metal,.1);
 else {add('instrument_housing',new THREE.BoxGeometry(.21,.14,.21),metal,.1);add('optical_baffle',new THREE.CylinderGeometry(.09,.09,.13,40),dark,.23);add('aperture',new THREE.CylinderGeometry(.072,.072,.006,40),dark,.299);}
 return root;
}
