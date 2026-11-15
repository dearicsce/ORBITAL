import {BODIES} from './orbitalGeometry.js';
import {elementsFromState} from './ascent.js';

const {radiusM:R,mu}=BODIES.earth;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const length=a=>Math.hypot(...a);
const unit=a=>a.map(x=>x/length(a));

export function formatAltitude(metres){
 return Math.abs(metres)<1000 ? Math.max(0,metres).toFixed(0)+' m' : (metres/1000).toFixed(2)+' km';
}

// Unpowered, two-body prediction in the instantaneous orbital plane. Stop at
// the surface: a suborbital trajectory must never be drawn through the planet.
export function trajectoryPreview(position,velocity){
 const elements=elementsFromState(position,velocity);
 const up=unit(position),radial=dot(velocity,up);
 const transverse=velocity.map((v,i)=>v-radial*up[i]);
 const tangent=length(transverse)>1e-6?unit(transverse):unit(Math.abs(up[0])<.9?[0,-up[2],up[1]]:[-up[1],up[0],0]);
 const project=r=>[dot(r,tangent),dot(r,up)];
 let r=[...position],v=[...velocity];
 const points=[project(r)];
 const period=elements.semiMajorAxisM>0?2*Math.PI*Math.sqrt(elements.semiMajorAxisM**3/mu):12000;
 const horizon=Math.min(12000,period);
 const step=Math.min(10,horizon/720);
 let impact=false;
 for(let time=0;time<horizon;time+=step){
  const dt=Math.min(step,horizon-time);
  const a=r.map(x=>-mu*x/length(r)**3);
  const next=r.map((x,i)=>x+v[i]*dt+.5*a[i]*dt*dt);
  if(length(next)<R){
   // Interpolate the last segment to the surface for a visible impact endpoint.
   let low=0,high=1;
   for(let i=0;i<24;i++){const m=(low+high)/2;const p=r.map((x,k)=>x+(next[k]-x)*m);if(length(p)>R)low=m;else high=m;}
   points.push(project(r.map((x,i)=>x+(next[i]-x)*low)));impact=true;break;
  }
  const b=next.map(x=>-mu*x/length(next)**3);
  v=v.map((x,i)=>x+.5*(a[i]+b[i])*dt);r=next;points.push(project(r));
 }
 return {elements,points,impact,radiusM:R,status:elements.periapsisM>=100000?'Orbit clear of atmosphere':elements.periapsisM>=0?'Orbit intersects atmosphere':'Suborbital · surface impact'};
}
