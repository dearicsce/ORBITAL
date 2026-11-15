import {missionDifficulty} from '../workshop/economy.js';
import {metadata} from '../workshop/structure.js';
import {whToJ, gbToBits, gbDayToBitSec} from './units.js';

// The existing catalog's labelled kg/W/Wh/decimal-GB/day values remain the
// authored source. SI resource contracts are rebuilt, never independently edited.
export function adaptWorld(data) {
  if(data.schemaVersion!==undefined&&![1,2].includes(data.schemaVersion))throw new Error('Unsupported world schema');
  data.schemaVersion=2;
  for(const o of data.orbits){if(o.id==='sso')o.tip='700 km / 98.2 degree guided SSO preset. Eclipse depends on Sun/orbit geometry; two-body propagation does not model nodal precession.';if(o.id==='lagrange')o.tip='Distant destination schematic. Contact and sunlight use guided assumptions; no physical halo or transfer orbit is propagated.';}
  for(const p of [...data.parts,...data.instruments]) {
    if(p.schemaVersion!==undefined&&![1,2].includes(p.schemaVersion))throw new Error('Unsupported part schema');
    p.schemaVersion=2;
    p.unlockPrice??=p.unlock==='start'?0:p.id==='bus_large'?800:p.id==='bus_medium'?350:p.unlock==='after_m3'?550:p.unlock==='after_m2'?350:200;
    p.visualId ||= p.id.startsWith('panel_')?p.id.replace('panel_','solar_wing_'):p.id;
    p.category=p.type||'instrument';
    if(p.type!=='thermal')p.subcategory={bus:'structural bus',panel:'deployable solar wing',battery:'energy storage',comms:'radio and antenna',computer:'computer and recorder',pointing:(p.quality||'coarse')+' attitude package',fuel:'integrated propulsion'}[p.type]||(p.kind==='relay'?'relay payload':p.roleId||p.id);
    p.bayUnits??=p.type==='fuel'?(p.id==='fuel_l'?3:p.id==='fuel_m'?2:1):p.id==='battery_l'?2:1;
    const mounting=metadata(p);
    p.attachmentRequirements={parent:'bus',kind:p.type==='bus'?'structural':p.type==='fuel'?'internal bay and thruster port':mounting.internal?'internal bay':p.type==='panel'?'articulated surface':'exterior surface'};
    p.unlockPrerequisites=[]; // Campaign grants remain an alternative to a coin purchase.
    p.description||=p.type==='fuel'?'Integrated thruster, controller and propellant tank. Wet mass includes propellant. Guided fuel budgets are simulated; thrust and specific impulse are not.':`${p.name}: ${p.subcategory}. Fictional mass, cost and resource values for engineering trade-offs.`;
    if(p.type==='fuel'){p.includesThruster=true;p.dryHardwareKg=p.mass-p.fuelKg;}
    if(mounting.internal)p.installationVolumeM3=p.bayUnits*.24*.1*.18;
    else if(p.type==='panel')p.dimensionsM=[mounting.wingLength,mounting.wingLength*.38,.055];
    else if(p.type==='bus')p.dimensionsM=({bus_micro:[.86,1.1,.77],bus_small:[1.35,1.4,1.12],bus_medium:[1.9,1.8,1.646],bus_large:[1.95,2.65,1.75]})[p.id];
    else if(p.type!=='thermal')p.dimensionsM=p.type==='comms'?[.44,.5,.44]:p.visualId==='magnetometer'?[.09,.52,.09]:[.24,.32,.24];
    if(p.type!=='thermal')p.intendedStrengths=`${p.type==='panel'?(p.power/2)+' W per wing':p.capacityWh?p.capacityWh+' Wh storage':p.maxDataGbDay?p.maxDataGbDay+' GB/day processing':p.baseDownlinkGbDay?p.baseDownlinkGbDay+' GB/day reference link':p.fuelKg?p.fuelKg+' kg usable propellant':p.quality?p.quality+' pointing':p.dataPerDay?p.dataPerDay+' GB/day payload data':p.kind==='relay'?'service relay payload':p.slots+' payload interfaces'}.`;
    if(p.type!=='thermal')p.limitations=`${p.mass} kg catalogue mass; $${p.cost}M construction${mounting.internal?'; '+p.bayUnits+' occupied bay units':''}${p.requiredPointing?'; requires '+p.requiredPointing+' pointing':''}.`;
    p.balanceStatus||='Authored educational balance; not measured flight hardware';
    p.units ||= {mass:'kg',cost:'million USD',power:'W',dataPerDay:'decimal GB/day'};
    p.units.length='m';p.units.volume='m³';
    if(p.type==='computer')p.recorderCapacityGb ??= {computer_basic:8,computer_advanced:24,computer_rad_hard:12}[p.id] ?? 2;
    if(p.type==='comms'){p.transmitPowerW ??= p.power||0;p.standbyPowerW ??= (p.power||0)*.25;}
    p.resources={massKg:p.mass||0,costUsd:(p.cost||0)*1e6,generatedPowerW:p.type==='panel'?p.power||0:0,basePowerW:p.baseLoad||0,operatingPowerW:p.type==='panel'?0:p.power||0,batteryCapacityJ:whToJ(p.capacityWh||0),recorderCapacityBit:gbToBits(p.recorderCapacityGb||0),processingBitPerSec:gbDayToBitSec(p.maxDataGbDay||0),instrumentBitPerSec:gbDayToBitSec(p.dataPerDay||0),transmitPowerW:p.transmitPowerW||0,standbyPowerW:p.standbyPowerW||0,propellantKg:p.fuelKg||0};
  }
  for(const l of data.launchers){const e={kestrel:[1.5,3.8],condor:[2,5.5],albatross:[2.4,6.5],roc:[3,8]}[l.id]||[2,5];l.fairingRadiusM=e[0];l.fairingHeightM=e[1];}
  for(const m of data.missions){m.missionDifficulty??=missionDifficulty(m);m.schemaVersion=2;m.units={budget:'million USD',targetLifetime:'years',coverage:'percent of sampled observing time',delivered:'decimal GB'};}
  return data;
}

