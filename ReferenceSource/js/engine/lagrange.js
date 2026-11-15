import {BODIES} from './orbitalGeometry.js';

// DE440 gravitational parameters (m³/s²).
// https://ssd.jpl.nasa.gov/astro_par.html
export const LAGRANGE_SYSTEMS={
 earthMoon:{primaryMu:BODIES.earth.mu,secondaryMu:BODIES.moon.mu,separationM:384400000},
 sunEarth:{primaryMu:1.32712440041279419e20,secondaryMu:BODIES.earth.mu,separationM:149597870700}
};

// Planar circular restricted three-body equilibria in the synodic frame.
// Return primary-centred coordinates in units of the body separation.
export function lagrangePoints({primaryMu,secondaryMu}){
 const mu=secondaryMu/(primaryMu+secondaryMu);
 const force=x=>{
  const p=x+mu,s=x-1+mu;
  return x-(1-mu)*Math.sign(p)/p**2-mu*Math.sign(s)/s**2;
 };
 function root(low,high){
  for(let i=0;i<55;i++){
   const mid=(low+high)/2;
   if(force(mid)>0)high=mid;
   else low=mid;
  }
  return (low+high)/2+mu;
 }
 const gap=1e-10;
 return [
  ['L1',root(-mu+gap,1-mu-gap),0],
  ['L2',root(1-mu+gap,3),0],
  ['L3',root(-3,-mu-gap),0],
  ['L4',.5,Math.sqrt(3)/2],
  ['L5',.5,-Math.sqrt(3)/2]
 ];
}
