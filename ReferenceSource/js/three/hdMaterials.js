import * as THREE from 'three';

// Original analytic PBR surface finish. Patterns are evaluated per pixel rather
// than enlarged from the source's 512 px maps. No geometry or scientific claim.
export function applyHDMaterials(root, {solar = false} = {}) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const longest = Math.max(...size.toArray(), 0.001);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const center = bounds.getCenter(new THREE.Vector3()).applyMatrix4(inverse);
  const materials = new Set();
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const before = mesh.onBeforeRender;
    mesh.onBeforeRender = function (...args) {
      inverse.copy(root.matrixWorld).invert();
      before?.apply(this, args);
    };
    for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) {
      if (!material?.isMeshStandardMaterial || material.userData.originalSolar || materials.has(material)) continue;
      materials.add(material);
      const name = `${material.name} ${mesh.name}`.toLowerCase();
      const kind = solar || /solar|panelblue|array/.test(name) ? 2 : /gold|bronze|foil_gold/.test(name) ? 1 : /black|dark|rubber/.test(name) ? 4 : /white|dish/.test(name) ? 3 : material.map ? 5 : 0;
      material.metalness = kind === 2 ? .45 : kind === 3 ? .18 : .72;
      material.roughness = kind === 2 ? .3 : kind === 4 ? .7 : .38;
      if (kind !== 5) {
        material.color.set([0xb8c2cb, 0xc4a45b, 0x15375e, 0xe4e6df, 0x202832][kind]);
        // Preserve the source texture allocation for disposal, but do not sample
        // a blurry atlas for a known material family.
      }
      material.onBeforeCompile = shader => {
        shader.uniforms.hdInverse = {value: inverse};
        shader.uniforms.hdCenter = {value: center};
        shader.uniforms.hdDensity = {value: 48 / longest};
        shader.vertexShader = 'varying vec3 hdPosition;\nuniform mat4 hdInverse;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nhdPosition=(hdInverse*modelMatrix*vec4(transformed,1.0)).xyz;');
        shader.fragmentShader = `varying vec3 hdPosition; uniform vec3 hdCenter; uniform float hdDensity;
float hdGrid(vec2 uv, float width) {
  vec2 a=abs(fract(uv-0.5)-0.5); vec2 aa=max(fwidth(uv),vec2(0.001));
  return 1.0-min(smoothstep(vec2(width),vec2(width)+aa,a).x,smoothstep(vec2(width),vec2(width)+aa,a).y);
}\n` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
#include <map_fragment>
vec3 hp=abs(hdPosition-hdCenter)*hdDensity;
vec3 hn=abs(normalize(cross(dFdx(hdPosition),dFdy(hdPosition))));
vec2 huv=hn.z>hn.x&&hn.z>hn.y?hp.xy:hn.y>hn.x?hp.xz:hp.zy;
float seams=hdGrid(huv*0.25,0.014);
float cells=hdGrid(huv*vec2(1.0,2.0),0.018);
float wires=hdGrid(huv*vec2(1.0,14.0),0.012);
float weave=0.5+0.5*cos(huv.x*34.0)*cos(huv.y*34.0);
vec3 hdMetal=vec3(0.53,0.59,0.65)*(1.0-0.12*seams)*(0.96+0.04*weave);
vec3 hdGold=vec3(0.64,0.43,0.14)*(0.91+0.09*weave)*(1.0-0.18*seams);
vec3 hdSolar=mix(vec3(0.025,0.075,0.17),vec3(0.32,0.49,0.64),max(cells*0.65,wires*0.3));
${kind===5 ? `float hdWarm=step(diffuseColor.b*1.35,diffuseColor.r)*step(diffuseColor.b*1.15,diffuseColor.g);
float hdDark=1.0-step(0.045,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));
diffuseColor.rgb=mix(mix(hdMetal,hdGold,hdWarm),vec3(0.018,0.024,0.033),hdDark);` : `diffuseColor.rgb=${kind===2?'hdSolar':kind===1?'hdGold':kind===3?'vec3(0.78,0.80,0.76)*(1.0-seams*0.08)':kind===4?'vec3(0.018,0.024,0.033)*(0.96+0.04*weave)':'hdMetal'};`}
`);
      };
      material.customProgramCacheKey = () => 'orbital-hd-symmetric-v1-' + kind;
      material.needsUpdate = true;
    }
  });
  root.userData.materialFinish = 'Original resolution-independent symmetric PBR patterns';
  return root;
}
