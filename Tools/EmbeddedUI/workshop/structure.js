// Spacecraft coordinates in metres: +X right, +Y top, +Z front. Origin: adapter base.
export const BUS_STRUCTURES = {
 bus_micro:{w:.86,h:1.1,d:.77,bays:8,payloads:1,propulsionPorts:2},
 bus_small:{w:1.35,h:1.4,d:1.12,bays:12,payloads:2,propulsionPorts:3},
 bus_medium:{w:1.9,h:1.8,d:1.646,bays:18,payloads:3,propulsionPorts:4},
 bus_large:{w:1.95,h:2.65,d:1.75,bays:24,payloads:4,propulsionPorts:6}
};
export const FACE_NAMES=['front','back','left','right','top','bottom'];
export function structure(id){return BUS_STRUCTURES[id]||BUS_STRUCTURES.bus_micro;}
export function surfaces(id){const {w,h,d}=structure(id);const result={
 front:{origin:[0,h/2,d/2],normal:[0,0,1],u:[1,0,0],v:[0,1,0],size:[w,h]},
 back:{origin:[0,h/2,-d/2],normal:[0,0,-1],u:[-1,0,0],v:[0,1,0],size:[w,h]},
 right:{origin:[w/2,h/2,0],normal:[1,0,0],u:[0,0,-1],v:[0,1,0],size:[d,h]},
 left:{origin:[-w/2,h/2,0],normal:[-1,0,0],u:[0,0,1],v:[0,1,0],size:[d,h]},
 top:{origin:[0,h,0],normal:[0,1,0],u:[1,0,0],v:[0,0,-1],size:[w,d]},
 bottom:{origin:[0,0,0],normal:[0,-1,0],u:[1,0,0],v:[0,0,1],size:[w,d]}
};
 if(id==='bus_small'){for(const face of ['front','back'])result[face].size[0]=w-.3;for(const face of ['left','right'])result[face].size[0]=d-.3;}
 if(id==='bus_medium'){result.front.size[0]=result.back.size[0]=w/2;const r=w/2;result.right={origin:[.75*r,h/2,.4330127*r],normal:[.8660254,0,.5],u:[.5,0,-.8660254],v:[0,1,0],size:[r,h]};result.left={origin:[-.75*r,h/2,-.4330127*r],normal:[-.8660254,0,-.5],u:[-.5,0,.8660254],v:[0,1,0],size:[r,h]};}
 if(id==='bus_large')for(const face of ['front','back','left','right']){result[face].origin[1]=h*.355;result[face].size[1]=h*.71;result[face].size[0]*=.85;}
 for(const face of ['top','bottom'])result[face].size=result[face].size.map(n=>n*(id==='bus_large'?.5:id==='bus_medium'?.65:.8));
 return result; }
export function mountPosition(busId,c){
 const s=surfaces(busId)[c.attachmentSurfaceId];
 if(s)return s.origin.map((n,i)=>n+s.u[i]*c.localPosition[0]+s.v[i]*c.localPosition[1]+s.normal[i]*c.localPosition[2]);
 const {h,w,d}=structure(busId),index=Number(c.bayId?.split('-')[1])||0;
 return [((index%2)-.5)*w*.42,.16+Math.floor(index/4)*h*.115,((Math.floor(index/2)%2)-.5)*d*.42];
}
export function metadata(p){
 const internal=p?.internal===true||['battery','computer','pointing','fuel'].includes(p?.type);
 return {internal,span:p?.mountSpan||(['panel','comms'].includes(p?.type)?.18:.22),bayUnits:p?.bayUnits||1,
  wingLength:p?.wingLength||({panel_s:1.1,panel_m:1.65,panel_l:2.2}[p?.id]||1.1)};
}
export function propulsionPort(busId,index){
 const face=['back','front','left','right','back','front'][index]||'back',s=surfaces(busId)[face],count=structure(busId).propulsionPorts;
 const u=count>4&&['back','front'].includes(face)?s.size[0]*(index>=4?.25:-.25):0,v=-s.size[1]*.3;
 return {face,u,v,normal:s.normal,position:s.origin.map((n,i)=>n+s.u[i]*u+s.v[i]*v)};
}
// Convex structural half-spaces, independent of decorative rails, blankets and fins.
export function structuralProxies(id){
 const {w,h,d}=structure(id),plane=(normal,distance)=>({normal,distance});
 const ends=(low,high)=>[plane([0,1,0],high),plane([0,-1,0],-low)];
 const box=(low,high)=>[...ends(low,high),plane([1,0,0],w/2),plane([-1,0,0],w/2),plane([0,0,1],d/2),plane([0,0,-1],d/2)];
 if(id==='bus_medium')return [{planes:[...ends(0,h),...Array.from({length:6},(_,i)=>plane([Math.sin(i*Math.PI/3),0,Math.cos(i*Math.PI/3)],w/2*Math.sqrt(3)/2))]}];
 if(id==='bus_large')return [{planes:box(0,h*.71)},{planes:[...ends(h*.71,h),...Array.from({length:8},(_,i)=>{const angle=Math.PI/8+i*Math.PI/4;return plane([Math.sin(angle),0,Math.cos(angle)],w*.43*Math.cos(Math.PI/8));})]}];
 const planes=box(0,h);if(id==='bus_small')for(const x of [-1,1])for(const z of [-1,1])planes.push(plane([x,0,z],w/2+d/2-.15));return [{planes}];
}
