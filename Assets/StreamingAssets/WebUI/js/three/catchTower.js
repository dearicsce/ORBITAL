import * as THREE from 'three';

// Original illustrative tower, not a surveyed SpaceX installation or catch solver.
export function createCatchTower() {
  const root = new THREE.Group(); root.name = 'ORBITAL_catch_tower';
  const steel = new THREE.MeshStandardMaterial({color:0x9aa8b3,metalness:.75,roughness:.32});
  const dark = new THREE.MeshStandardMaterial({color:0x293b48,metalness:.7,roughness:.4});
  const pad = new THREE.MeshStandardMaterial({color:0xd6a544,metalness:.5,roughness:.42});
  function box(parent,name,dimensions,position,material=steel) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...dimensions),material);
    mesh.name=name;mesh.position.set(...position);parent.add(mesh);return mesh;
  }
  function beam(parent,name,a,b,width=.35,material=steel) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(width,width,delta.length(),12),material);
    mesh.name=name;mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(mesh);return mesh;
  }
  box(root,'foundation',[17,2,17],[0,1,0],dark);
  for(const x of [-5,5])for(const z of [-5,5])box(root,`column_${x}_${z}`,[.9,108,.9],[x,56,z]);
  for(let y=4;y<=104;y+=10){
    for(const z of [-5,5]){
      beam(root,'horizontal',[-5,y,z],[5,y,z],.32);
      beam(root,'diagonal_A',[-5,y,z],[5,y+10,z],.22);
      beam(root,'diagonal_B',[5,y,z],[-5,y+10,z],.22);
    }
    for(const x of [-5,5]){
      beam(root,'depth_tie',[x,y,-5],[x,y,5],.32);
      beam(root,'depth_diagonal',[x,y,-5],[x,y+10,5],.22);
    }
    box(root,'service_deck',[10,.2,10],[0,y,0],dark);
  }
  box(root,'lift_shaft',[2.2,108,2.2],[-2.8,56,-2.8],dark);
  const carriage=new THREE.Group();carriage.name='vertical_catch_carriage';carriage.position.set(0,76,6);root.add(carriage);
  box(carriage,'crosshead',[15,4,3],[0,0,0],dark);
  for(const x of [-6,6])box(carriage,'rail_guide',[1.5,8,2],[x,0,-1]);
  const arms=[];
  for(const side of [-1,1]){
    const pivot=new THREE.Group();pivot.name=side<0?'arm_left_pivot':'arm_right_pivot';pivot.position.set(side*4.6,0,1.2);carriage.add(pivot);arms.push(pivot);
    for(const x of [-.65,.65]){
      box(pivot,'arm_upper_chord',[.42,.5,17],[x,1.15,8.5]);
      box(pivot,'arm_lower_chord',[.42,.5,17],[x,-1.15,8.5]);
      for(let z=0;z<16;z+=2)beam(pivot,'arm_diagonal',[x,-1.15,z],[x,1.15,z+2],.13);
    }
    for(let z=1;z<17;z+=2)box(pivot,'arm_cross_tie',[1.65,.22,.3],[0,1.15,z]);
    box(pivot,'catch_contact_rail',[.65,.75,14],[-side*.9,1.65,9],pad);
    box(pivot,'end_buffer',[1.8,2.7,1],[0,0,17],dark);
    beam(carriage,'actuator',[side*6,-1,0],[side*4.6,-1,6],.32,dark);
  }
  root.userData.setArmOpening = value => {
    const opening=Math.max(0,Math.min(1,value));
    arms.forEach((arm,i)=>arm.rotation.y=(i===0?-1:1)*opening*.35);
  };
  root.userData.setArmOpening(.3);
  root.userData.description='Illustrative lattice tower with carriage, paired articulated truss arms and inward contact rails. No catch dynamics simulated.';
  return root;
}
