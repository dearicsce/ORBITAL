import * as THREE from 'three';

let cellCanvas=null;
function getCellCanvas(){if(cellCanvas)return cellCanvas;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d');c.scale(.5,.5);c.fillStyle='#101c30';c.fillRect(0,0,2048,1024);
  for(let x=0;x<12;x++)for(let y=0;y<6;y++){
    const px=x*170.667+7,py=y*170.667+7;
    c.fillStyle=(Math.min(x,11-x)+Math.min(y,5-y))%2?'#10294e':'#15335c';c.fillRect(px,py,156,156);
    c.strokeStyle='#52759a';c.lineWidth=2;c.strokeRect(px,py,156,156);
    c.strokeStyle='#8fa7bb';c.lineWidth=1.3;
    for(let line=1;line<8;line++){c.beginPath();c.moveTo(px+line*19.5,py+2);c.lineTo(px+line*19.5,py+154);c.stroke();}
    c.fillStyle='#a9b9cb';c.fillRect(px,py+50,156,2);c.fillRect(px,py+104,156,2);
  }
  cellCanvas=canvas;return canvas;
}

// Mounting origin at the hinge, deployed along +X. Both faces are real geometry.
export function createSolarWing(id,physicalWidth=null) {
  const width=physicalWidth||{solar_wing_s:1.1,solar_wing_m:1.65,solar_wing_l:2.2}[id]||1.65;
  const height=width*.38,root=new THREE.Group();root.name='root_hinge';
  const canvas=getCellCanvas();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const cells=new THREE.MeshStandardMaterial({map:texture,color:0xffffff,metalness:.08,roughness:.55,envMapIntensity:.08});cells.userData.originalSolar=true;
  const frame=new THREE.MeshStandardMaterial({color:0x9aa9b6,metalness:.6,roughness:.4});
  const back=new THREE.MeshStandardMaterial({color:0x142332,metalness:.15,roughness:.65});
  function box(name,dimensions,position,material){const m=new THREE.Mesh(new THREE.BoxGeometry(...dimensions),material);m.name=name;m.position.set(...position);root.add(m);return m;}
  box('mounting_yoke',[.26,.12,.12],[.08,0,0],frame);
  for(let i=0;i<2;i++){
    const length=(width-.18)/2-.02,x=.18+i*(length+.04)+length/2;
    box(i?'panel_outer':'panel_inner',[length,height,.035],[x,0,0],back);
    box('photovoltaic_front',[length-.025,height-.025,.004],[x,0,.021],cells);
    box('photovoltaic_back',[length-.025,height-.025,.004],[x,0,-.021],cells);
    for(const y of [-height/2,height/2])box('frame_long',[length+.025,.018,.055],[x,y,0],frame);
    for(const end of [-1,1])box('frame_end',[.018,height,.055],[x+end*length/2,0,0],frame);
  }
  box('panel_joint',[.08,.1,.08],[(width+.18)/2,0,0],frame);
  root.userData.hingeOrigin=[0,0,0];return root;
}
