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
  const data=validateWorld(enrichCampaign(await response.json()));
  configureStateContracts(data);configureFlightContracts(data);return data;
}
