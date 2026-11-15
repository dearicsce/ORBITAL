import {addLauncherPresets} from './rocket/launcherAdditions.js';
import { enrichCampaign } from './campaign.js';
import {validateWorld} from './contracts/validate.js';
import {configureStateContracts} from './state.js';
import {configureFlightContracts} from './flightSession.js';
export async function loadData(basePath = '') {
  const url = basePath ? `${basePath.replace(/\/$/, '')}/data/world1.json` : new URL('../data/world1.json', import.meta.url).href;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load world data: ${response.status} ${response.statusText}`);
  }
  const enriched=enrichCampaign(await response.json());
  if(!enriched.missions.some(mission=>mission.id==='dip'))enriched.missions.push({
    schemaVersion:2,units:{budget:'million USD',lifetime:'year'},
    id:'dip',name:'Catch the Next Dip',chapter:'earth',tag:'Exoplanet Transit Photometry', destination:'earth-orbit',
    brief:'Two teams expect this star to dim on different schedules. You can look once.',
    objective:'Choose an observing window and return evidence that distinguishes the two predictions.',
    budget:320,targetLifetime:3,launchers:['kestrel','condor','albatross','roc'],requires:[],payload:'optical_camera',
    relevance:{optical_camera:1},orbitFit:{leo:1,sso:1},profile:{coverage:52,delivered:1,contact:0.18,eclipse:0,incidents:['radiation','storage']},
    missionDifficulty:3
  });
  const data=validateWorld(addLauncherPresets(enriched));
  configureStateContracts(data);configureFlightContracts(data);return data;
}
