import assert from 'node:assert/strict';
import {BODIES,presetOrbit,propagate,orbitalPeriod,eclipsed,toFixed,toInertial,RAD} from '../js/engine/orbitalGeometry.js';
import {transferTrajectory,transferPosition,generationAt,fuelForDv,AU_M,DAY_SEC} from '../js/transfer/planning.js';
import {stepOperations,MINUTES_PER_TICK} from '../js/engine/operations.js';
const near=(actual,expected,relative=1e-5)=>assert.ok(Math.abs(actual-expected)<=Math.max(1e-8,Math.abs(expected)*relative),`${actual} != ${expected}`);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
let samples=0;
for(const id of ['leo','sso','geo','llo'])for(const eccentricity of [0,.05,.3,.75]){
 const orbit=presetOrbit(id,{eccentricity,semiMajorAxisM:(BODIES[id==='llo'?'moon':'earth'].radiusM+700000)/(1-eccentricity)});
 const period=orbitalPeriod(orbit),mu=BODIES[orbit.body].mu;
 const expectedEnergy=-mu/(2*orbit.semiMajorAxisM),expectedH=Math.sqrt(mu*orbit.semiMajorAxisM*(1-eccentricity**2));
 for(let i=0;i<80;i++){
  const t=period*i/80,dt=.01,p=propagate(orbit,t),before=propagate(orbit,t-dt),after=propagate(orbit,t+dt),v=after.map((n,k)=>(n-before[k])/(2*dt));
  near(Math.hypot(...v)**2/2-mu/Math.hypot(...p),expectedEnergy);
  near(Math.hypot(...cross(p,v)),expectedH);
  const restored=toInertial(toFixed(p,orbit.body,t),orbit.body,t);p.forEach((n,k)=>near(restored[k],n));
  const closed=propagate(orbit,t+period);p.forEach((n,k)=>near(closed[k],n));samples++;
 }
}
for(const [inc,sign] of [[0,1],[51.6,1],[98.2,-1],[180,-1]]){
 const o=presetOrbit('leo',{inclinationRad:inc*RAD}),p=propagate(o,0),q=propagate(o,1);
 assert.equal(Math.sign(cross(p,q)[2]),sign);
}
assert.equal(eclipsed([-7000000,0,0],'earth'),true);
assert.equal(eclipsed([7000000,0,0],'earth'),false);
assert.equal(eclipsed([-7000000,7000000,0],'earth'),false);
const trajectory=destination=>transferTrajectory({destination,transfer:{type:'flyby'}},{orbitId:'leo'},{window:'nominal'});
const mars=trajectory('mars');assert.ok(mars.travelSec/DAY_SEC>258&&mars.travelSec/DAY_SEC<260);
const venus=trajectory('venus');assert.ok(venus.travelSec/DAY_SEC>145&&venus.travelSec/DAY_SEC<147);
for(const t of [mars,venus,trajectory('moon'),trajectory('frontier')]){
 near(Math.hypot(...transferPosition(t,0)),t.r1);near(Math.hypot(...transferPosition(t,1)),t.r2);
 assert.ok(t.departureDv>0&&t.travelSec>0);
}
assert.ok(trajectory('moon').synodicDays>29.5&&trajectory('moon').synodicDays<29.6);
const h={panelW:1000,isotopeW:0};near(generationAt(h,2,0),generationAt(h,1,0)/4);
near(generationAt({panelW:0,isotopeW:100},1,45*365.25*DAY_SEC),50);
const dv=3200,wet=500,isp=310,fuel=fuelForDv(dv,wet,isp);near(9.80665*isp*Math.log(wet/(wet-fuel)),dv);
assert.throws(()=>fuelForDv(-1,wet));assert.throws(()=>fuelForDv(1,wet,0));assert.throws(()=>generationAt(h,0,0));
// Independent transition fixture: a night-science interval must not be rounded
// to a whole bright/dark tick according to its endpoint.
const source=await import('node:fs');
const {enrichCampaign,starterDesign}=await import('../js/campaign.js');
const {evaluateDesign}=await import('../js/engine.js');
const {createOperations,operationEnvironment}=await import('../js/engine/operations.js');
const data=enrichCampaign(JSON.parse(source.readFileSync(new URL('../data/world1.json',import.meta.url))));
const mission=data.missions.find(m=>m.id==='m1'),design=starterDesign(mission,data);
const state=createOperations(design,data,evaluateDesign(design,data));
state.mode='observe';state.profile.nightScience=true;state.difficulty='easy';state.hardware.relevant=true;state.hardware.orbitFit=1;
state.batteryWh=state.batteryCapacityWh=1e9;state.storageCapacityGb=1e9;
let transitions=0;
for(let i=0;i<state.totalTicks;i++){
 const env=operationEnvironment(state),before=state.collectedGb;
 stepOperations(state);
 if(env.sunlitFraction>0&&env.sunlitFraction<1){near(state.collectedGb-before,state.hardware.dataGbDay/1440*MINUTES_PER_TICK*(1-env.sunlitFraction));transitions++;}
 near(state.collectedGb,state.storageGb+state.deliveredGb+state.lostGb);
}
assert.ok(transitions>0);
console.log(`PASS: ${samples} orbital energy/angular-momentum samples, frame round trips, direction, eclipse, transfer timing/endpoints, lunar recurrence, inverse-square generation, decay, rocket equation, night fractions and data conservation.`);
