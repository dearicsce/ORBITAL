import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
if (!root) throw Error('Pass the original browser project directory.');
const { enrichCampaign } = await import(pathToFileURL(path.join(root, 'js/campaign.js')));
const world = enrichCampaign(JSON.parse(fs.readFileSync(path.join(root, 'data/world1.json'), 'utf8')));
const records = world.missions.filter(m => m.id !== 'tutorial').map(m => ({
  id: m.id,
  name: m.name,
  objective: m.objective || m.brief || '',
  requires: m.requires || [],
  level: m.id === 'proxima-sail' ? 2
    : m.chapter === 'transfer' && !m.id.startsWith('lunar-') ? 1 : 0,
}));
if (records.length !== new Set(records.map(m => m.id)).size ||
    records.some(m => m.requires.some(id => !records.some(record => record.id === id)))) {
  throw Error('Duplicate contract or broken prerequisite.');
}
fs.writeFileSync(new URL('../Assets/Resources/browser-campaign-v2.json', import.meta.url),
  JSON.stringify({ schemaVersion: 2, records }, null, 2) + '\n');

