import {newRocket} from './engineering.js';
import {STANDARD_STAGING,BOOSTER_STAGING} from './catalogue.js';

export function referenceRocket(mission){
 const rocket=newRocket();
 const helio=['frontier','precursor'].includes(mission?.destination);
 const lunar=mission?.destination==='moon';
 const expedition=Boolean(mission?.transfer&&!lunar);
 const frontier=expedition&&['ceres','jupiter','europa','saturn','uranus','neptune','frontier','precursor'].includes(mission.destination);
 rocket.name=helio?'Horizon Escape':lunar?'Stratus Lunar':frontier?'Horizon Deep Space':expedition?'Summit Transfer':'Vector 1 Custom';
 rocket.parts={
  coreTank:helio?'core-helio':lunar?'core-28':frontier?'core-frontier':expedition?'core-methane':'core-18',
  coreEngine:helio?'core-helio-engine':lunar?'core-k3':frontier?'core-frontier-engine':expedition?'core-m3':'core-k1',
  upperTank:helio?'upper-helio':frontier?'upper-frontier':expedition?'upper-h28':'upper-18',
  upperEngine:helio?'upper-helio-engine':frontier?'upper-frontier-engine':expedition?'upper-h3':'upper-k1',
  separator:lunar?'sep-reducer':expedition?'sep-28':'sep-18',adapter:expedition?'adapter-28':'adapter-18',
  fairing:expedition?'fairing-28':'fairing-18',guidance:'guidance-1',boosters:expedition||lunar?'solid-pair':null
 };
 rocket.staging=[...(expedition||lunar?BOOSTER_STAGING:STANDARD_STAGING)];
 return rocket;
}
