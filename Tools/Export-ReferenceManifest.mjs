import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, output] = process.argv.slice(2);
if (!root || !output) throw Error('Pass the reference directory and output JSON path.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const load = file => import(pathToFileURL(path.resolve(root, file)).href);
const [campaign, validation, economy, rocket, transfer] = await Promise.all([
  load('js/campaign.js'), load('js/contracts/validate.js'), load('js/workshop/economy.js'),
  load('js/rocket/catalogue.js'), load('js/transfer/catalogue.js'),
]);
const world = validation.validateWorld(campaign.enrichCampaign(read('data/world1.json')));
const order = campaign.programOrder(world);
const manifest = {
  referenceBuild: read('data/build-identity.json'),
  campaignOrder: order.map(mission => mission.id),
  firstMissionId: order[0].id,
  rewardPolicy: {
    source: 'js/workshop/economy.js',
    byDifficulty: economy.REWARDS.map(([first, repeat]) => ({ first, repeat })),
    eligibility: 'Authoritative completed flight with passing rating; transfer missions require a cruise result.',
    deduplication: 'One claim per run ID; previously completed missions receive repeat rewards.',
  },
  ...world,
  missions: world.missions.map(mission => ({
    ...mission,
    starterDesign: campaign.starterDesign(mission, world),
  })),
  rocketParts: rocket.ROCKET_PARTS,
  rocketStaging: { standard: rocket.STANDARD_STAGING, boosters: rocket.BOOSTER_STAGING },
  transferTargets: transfer.TRANSFER_TARGETS,
  cruiseModules: transfer.CRUISE_MODULES,
  arrivalKits: transfer.ARRIVAL_KITS,
  transferWindowOffsets: transfer.WINDOW_OFFSETS,
};
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Exported ${order.length} campaign missions, ${world.parts.length} parts and ${world.instruments.length} instruments.`);
