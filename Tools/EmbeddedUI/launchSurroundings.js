import * as THREE from 'three';

// Authored scenery around the fictional equatorial pad, not a NASA land map.
// The 2 m/unit tangent mesh follows Earth's curvature and has no altitude jumps.
// It bridges the 1.6 km launch complex and the low-resolution global texture.
export function createLaunchSurroundings(kit,radiusM){
 const span=240000,geometry=new THREE.PlaneGeometry(span,span,128,128);
 geometry.rotateX(-Math.PI/2);
 const vertices=geometry.attributes.position,colors=[];
 const ocean=new THREE.Color('#164f69'),land=new THREE.Color('#76806a'),sand=new THREE.Color('#a49b78');
 for(let i=0;i<vertices.count;i++){
  const x=vertices.getX(i),z=vertices.getZ(i),r=Math.hypot(x,z);
  const coast=1200+9000*Math.sin(z/14000)+5000*Math.sin(z/3800);
  const inland=1-THREE.MathUtils.smoothstep(x-coast,-1800,1800);
  const edge=1-THREE.MathUtils.smoothstep(r,70000,115000);
  const color=ocean.clone().lerp(sand,inland*edge).lerp(land,inland*edge*THREE.MathUtils.smoothstep(coast-x,0,7000));
  colors.push(color.r,color.g,color.b,edge);
  const metresX=x*2,metresZ=z*2;
  vertices.setY(i,(Math.sqrt(radiusM**2-metresX**2-metresZ**2)-radiusM)/2-.4);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:false,roughness:.96,metalness:0}));
 mesh.name='Authored_curved_launch_coast';mesh.userData.credit='ORBITAL authored scenery; not observed terrain';
 kit.scene.add(mesh);return mesh;
}
