import {metadata,mountPosition,surfaces,structure,propulsionPort,structuralProxies} from './structure.js';
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const add=(a,b)=>a.map((n,i)=>n+b[i]);
const mul=(a,k)=>a.map(n=>n*k);
// Conservative world-axis proxies containing the entire articulated hinge path.
// Mesh ornamentation is excluded. No rendered objects enter saved state.
export function externalProxy(busId,c,p,fold=0){
 const s=surfaces(busId)[c.attachmentSurfaceId];if(!s)return null;
 const wing=p.type==='panel',swept=wing&&fold==='sweep',m=metadata(p),origin=mountPosition(busId,c),angle=c.localRotation[1]*Math.PI/180;
 const normal=s.normal,u=s.u,v=s.v;
 const basis=wing?[normal,v,mul(u,-1)]:[u,normal,mul(v,-1)];
 const length=m.wingLength,height=length*.38,stand=length*.19+.08;
 const halfWidth=p.externalHalfWidthM??(p.type==='comms'?.22:.12),externalHeight=p.externalHeightM??(p.type==='comms'?.5:(p.visualId==='magnetometer'||p.id==='magnetometer')?.52:.32);
 const halfHeight=height/2+.012,reach=Math.hypot(length+.015,halfHeight);
 const lo=swept?[0,-halfHeight,-.065]:wing?[-.05,-halfHeight,-.065]:[-halfWidth,0,-halfWidth],hi=swept?[stand+reach,reach,.065]:wing?[length+.015,halfHeight,.065]:[halfWidth,externalHeight,halfWidth];
 const points=[];
 for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]]){
  let local=[x,y,z];
  if(wing){if(!swept){const t=fold*Math.PI/2;local=[stand+x*Math.cos(t)-y*Math.sin(t),x*Math.sin(t)+y*Math.cos(t),z];}const [a,b,d]=local;local=[a,b*Math.cos(angle)-d*Math.sin(angle),b*Math.sin(angle)+d*Math.cos(angle)];}
  else{const [a,b,d]=local;local=[a*Math.cos(angle)+d*Math.sin(angle),b,-a*Math.sin(angle)+d*Math.cos(angle)];}
  points.push(add(origin,add(mul(basis[0],local[0]),add(mul(basis[1],local[1]),mul(basis[2],local[2])))));
 }
 return {points,min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))};
}
const overlaps=(a,b)=>a&&b&&[0,1,2].every(i=>Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])>.005);
export function geometryIssues(a,data,launcher=null){
 const definitions=[...data.parts,...data.instruments],parts=a.components.map(c=>({c,p:definitions.find(p=>p.id===c.catalogId)})).filter(({c,p})=>p&&!metadata(p).internal&&c.placementStatus==='placed');
 for(const c of a.components){const p=definitions.find(p=>p.id===c.catalogId);if(p?.type==='fuel'&&c.placementStatus==='placed'&&Number.isSafeInteger(c.configuration.propulsionPort)){const port=propulsionPort(a.busId,c.configuration.propulsionPort);parts.push({c:{...c,attachmentSurfaceId:port.face,bayId:null,localPosition:[port.u,port.v,0],localRotation:[0,0,0]},p:{...p,type:'thruster',externalHalfWidthM:.055,externalHeightM:.18}});}}
 const issues=[],samples=parts.map(({c,p})=>[externalProxy(a.busId,c,p,p.type==='panel'?'sweep':0)]),reported=new Set(),hulls=structuralProxies(a.busId);
 for(let i=0;i<parts.length;i++)if(samples[i].some(box=>box?.points.some(point=>hulls.some(hull=>hull.planes.every(plane=>dot(point,plane.normal)<plane.distance-.0015)))))issues.push({instanceId:parts[i].c.instanceId,severity:'error',message:parts[i].p.name+' intersects the structural bus proxy.'});
 for(let i=0;i<parts.length;i++)for(let j=0;j<i;j++){
  if(reported.has(i))continue;
  const first=parts[i],second=parts[j];let collision=false;
  search:for(const firstBox of samples[i])for(const secondBox of samples[j])if(overlaps(firstBox,secondBox)){collision=true;break search;}
  if(collision){reported.add(i);issues.push({instanceId:first.c.instanceId,severity:'error',message:first.p.name+' intersects '+second.p.name+' in the stowed/deployment clearance proxy.'});}
 }
 if(launcher?.fairingRadiusM){const {w,h,d}=structure(a.busId),bounds={min:[-w/2,0,-d/2],max:[w/2,h,d/2]};
  for(const {c,p}of parts){const box=externalProxy(a.busId,c,p,p.type==='panel'?1:0);if(box)for(let i=0;i<3;i++){bounds.min[i]=Math.min(bounds.min[i],box.min[i]);bounds.max[i]=Math.max(bounds.max[i],box.max[i]);}}
  const radius=Math.hypot(Math.max(Math.abs(bounds.min[0]),bounds.max[0]),Math.max(Math.abs(bounds.min[2]),bounds.max[2]));
  if(radius>launcher.fairingRadiusM||bounds.max[1]-bounds.min[1]>launcher.fairingHeightM)issues.push({instanceId:'bus',severity:'error',message:'Stowed assembly exceeds the launcher’s educational fairing envelope ('+launcher.fairingRadiusM+' m radius / '+launcher.fairingHeightM+' m height).'});
 }
 return issues;
}
