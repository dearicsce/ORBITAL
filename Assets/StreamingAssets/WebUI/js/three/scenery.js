import * as THREE from 'three';
export function scenery(id) {
  const group=new THREE.Group();
  const white=new THREE.MeshStandardMaterial({color:0xdde8ef,roughness:.6});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.8,.9,1,24),white);base.position.y=.5;group.add(base);
  if(id==='observatory') {
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.85,24,16,0,Math.PI*2,0,Math.PI/2),white);dome.position.y=1;group.add(dome);
    const slit=new THREE.Mesh(new THREE.BoxGeometry(.14,1,.5),new THREE.MeshStandardMaterial({color:0x102439}));slit.position.set(0,1.45,.6);group.add(slit);
  } else {
    const dish=new THREE.Mesh(new THREE.ConeGeometry(.9,.35,32,1,true),white);dish.position.y=1.4;dish.rotation.z=-.5;group.add(dish);
  }
  return group;
}
