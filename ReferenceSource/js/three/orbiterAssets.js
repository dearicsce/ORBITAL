import * as THREE from 'three';
import {DDSLoader} from 'three/addons/loaders/DDSLoader.js';
const base=new URL('../../models/orbiter-source/',import.meta.url);
export function loadOrbiterTexture(file,{repeat=1}={}) {
 const texture=new DDSLoader().load(new URL('Textures/'+file,base).href,undefined,undefined,()=>{});
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);return texture;
}
export function parseOrbiterMesh(text,{textures=true}={}) {
 const lines=text.split(/\r?\n/).map(line=>line.split(';')[0].trim()).filter(Boolean),group=new THREE.Group();
 const textureStart=lines.findIndex(l=>/^TEXTURES \d+/.test(l));
 const textureNames=textureStart<0?[]:lines.slice(textureStart+1);
 let materialId=0,textureId=0;
 for(let i=0;i<lines.length;i++){
  if(/^MATERIAL \d+$/.test(lines[i]))materialId=Number(lines[i].split(' ')[1]);
  if(/^TEXTURE \d+$/.test(lines[i]))textureId=Number(lines[i].split(' ')[1]);
  const match=lines[i].match(/^GEOM\s+(\d+)\s+(\d+)/);if(!match)continue;
  const vertices=Number(match[1]),triangles=Number(match[2]),positions=[],normals=[],uv=[],indices=[];
  for(let v=0;v<vertices;v++){const row=lines[++i].split(/\s+/).map(Number);positions.push(row[0],row[1],-row[2]);normals.push(row[3],row[4],-row[5]);uv.push(row[6]||0,1-(row[7]||0));}
  for(let t=0;t<triangles;t++){const row=lines[++i].split(/\s+/).map(Number);indices.push(row[0],row[2],row[1]);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=new THREE.MeshStandardMaterial({color:materialId===3?0x3b4247:0xc0c5c8,roughness:.85,metalness:.12,side:THREE.DoubleSide});
  if(textures&&textureId>0&&textureNames[textureId-1])material.map=loadOrbiterTexture(textureNames[textureId-1].replaceAll('\\','/'));
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name='orbiter_group_'+group.children.length;group.add(mesh);
 }
 return group;
}
export async function loadOrbiterMesh(file){const response=await fetch(new URL(file,base));if(!response.ok)throw Error('Orbiter mesh unavailable: '+file);return parseOrbiterMesh(await response.text());}
