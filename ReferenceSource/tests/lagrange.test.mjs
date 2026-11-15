import assert from 'node:assert/strict';
import {lagrangePoints,LAGRANGE_SYSTEMS} from '../js/engine/lagrange.js';

for(const system of Object.values(LAGRANGE_SYSTEMS)){
 const mu=system.secondaryMu/(system.primaryMu+system.secondaryMu);
 const points=lagrangePoints(system);
 for(const [name,x,y] of points){
  const d1=Math.hypot(x,y),d2=Math.hypot(x-1,y);
  const ax=x-mu-(1-mu)*x/d1**3-mu*(x-1)/d2**3;
  const ay=y-(1-mu)*y/d1**3-mu*y/d2**3;
  assert.ok(Math.hypot(ax,ay)<1e-12,name+' must balance in the rotating frame');
  if(name==='L4'||name==='L5')assert.ok(Math.abs(d1-1)+Math.abs(d2-1)<1e-12);
 }
}
const moon=lagrangePoints(LAGRANGE_SYSTEMS.earthMoon);
assert.ok(Math.abs(moon[0][1]-.8490657)<1e-6);
assert.ok(Math.abs(moon[1][1]-1.16783275)<1e-6);
const sun=lagrangePoints(LAGRANGE_SYSTEMS.sunEarth);
for(const [,x] of sun.slice(0,2)){
 const distanceKm=Math.abs(x-1)*LAGRANGE_SYSTEMS.sunEarth.separationM/1000;
 assert.ok(distanceKm>1.47e6&&distanceKm<1.53e6);
}
console.log('PASS: both rotating frames, equilibrium residuals, triangular geometry and collinear distance references.');
