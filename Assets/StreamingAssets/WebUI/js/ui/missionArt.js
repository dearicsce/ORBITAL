import {ANCHOR} from '../kepler/keplerConfig.js';
import {archivedNeighborhood} from '../kepler/keplerSource.js';
import {missionDestination} from '../campaignAtlas.js';
import {ATLAS_TEXTURES,atlasTexture} from '../content/atlasTextures.js';
import {lagrangeChart} from './lagrangeChart.js';
export const featuredMissions = {
  m1: {name:'Flood Watch', objective:'Observe a floodplain and send useful data before the deadline.', file:'images/missions/manchar-landsat.jpg', credit:'NASA Earth Observatory / USGS · Landsat 8'},
  relay: {name:'Far-side Relay', objective:'Get lunar crew messages to Earth before they expire.', file:atlasTexture('earthrise.jpg'), credit:'NASA · Apollo 8 Earthrise'},
  'mars-scout': {name:'Mars Scout', objective:'Split a Mars flyby between two targets and return the science.', file:'images/missions/mars-viking-globe.jpg', credit:'NASA/JPL-Caltech · Viking mosaic'},
};

export function featuredArt(id) {
  const {file, credit} = featuredMissions[id];
  return `<div class="featured-art featured-art-${id}"><img class="mission-photo" src="${file}" alt=""><span>${credit}</span></div>`;
}
export const ATLAS_PORTRAITS={
 mercury:{file:'mercury-portrait.jpg',credit:'MESSENGER enhanced colour · NASA / JHUAPL / Carnegie Institution of Washington'},
 ceres:{file:'ceres-portrait.jpg',credit:'Dawn enhanced colour · NASA / JPL-Caltech / UCLA / MPS / DLR / IDA'},
 uranus:{file:'uranus-portrait.png',credit:'Webb NIRCam infrared composite · NASA / ESA / CSA / STScI'}
};

export function destinationArt(id){
  const portrait=ATLAS_PORTRAITS[id];
  if(portrait)return `<img class="mission-photo atlas-portrait" src="${atlasTexture(portrait.file)}" alt="" loading="lazy">`;
  if(id!=='frontier'&&id!=='precursor')return null;
  return `<svg class="frontier-art" viewBox="0 0 480 180" aria-hidden="true">
    <path d="M65 43C177 14 261 9 396 84C298 155 185 173 65 145C24 135 26 63 65 43Z" fill="#12374a" stroke="#78aac2"/>
    <path d="M129 84H445" stroke="#f3bc79" stroke-width="2" stroke-dasharray="4 5"/>
    <circle cx="129" cy="84" r="7" fill="#ffd49b"/>
    <circle cx="${id==='frontier'?396:445}" cy="84" r="5" fill="#b6f3f4"/>
    <text x="35" y="26">HELIOPAUSE / SCHEMATIC</text>
    <text x="108" y="117">SUN</text>
    <text x="458" y="62" text-anchor="end">${id==='frontier'?'BOUNDARY':'INTERSTELLAR MEDIUM'}</text>
  </svg>`;
}
export function missionArt(id) {
  const scenes = {
    m1: '<path fill="#163c45" d="M0 180Q100 100 220 170T500 130V500H0Z"/><path fill="#1e8ba0" d="M260 150Q100 250 270 310T220 500H400Q450 340 290 280T310 150Z"/><g fill="#718c9b"><ellipse cx="140" cy="100" rx="110" ry="32"/><ellipse cx="300" cy="65" rx="120" ry="35"/></g><path stroke="#77d9e9" stroke-width="3" d="M70 150l-20 45m90-35-20 45m90-55-20 45m150-65-20 45m90-30-20 45"/>',
    m2: '<path fill="#324c68" d="M0 330 150 90 300 350 410 140 500 300V500H0Z"/><path fill="#c4dfeb" d="m110 154 40-64 50 86-50-20Z m270 41 30-55 35 57-35-13Z"/><path fill="#122c38" d="M0 390Q200 260 500 380V500H0Z"/><path fill="#edae67" d="M200 335h32v34h-32Z m40 12h28v30h-28Z m-75 10h25v30h-25Z"/><path fill="none" stroke="#5ee7ec" stroke-width="4" d="M245 310v-45m-24 0q24-28 48 0m-65-17q41-44 82 0m-98-20q57-60 114 0"/>',
    m3: '<circle cx="380" cy="80" r="32" fill="#367f9a"/><path fill="#697689" d="M0 300Q220 160 500 320V500H0Z"/><ellipse cx="250" cy="330" rx="145" ry="65" fill="#263449"/><ellipse cx="255" cy="340" rx="115" ry="43" fill="#111d30"/><path fill="#b0f5ff" d="m210 335 6-19 6 19 19 6-19 6-6 19-6-19-19-6Z m85 18 4-12 4 12 12 4-12 4-4 12-4-12-12-4Z"/>'
  };
  return `<svg class="mission-art" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="500" height="500" fill="#0c1c31"/>${scenes[id] || scenes.m1}</svg>`;
}
export function missionImage(mission) {
  const destination=missionDestination(mission),spec=ATLAS_TEXTURES[destination];
  if(mission.id === 'dip') {
    const samples = archivedNeighborhood(ANCHOR);
    const flux = samples.map(row => row.flux);
    const low = Math.min(...flux), high = Math.max(...flux);
    const points = samples.map(({time,flux}) => {
      const x = 8 + 224 * (time - samples[0].time) / (samples.at(-1).time - samples[0].time);
      const y = 84 - 64 * (flux - low) / (high - low);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return `<svg class="kepler-curve-art" viewBox="0 0 240 104" role="img" aria-label="Kepler observations showing the star dim and brighten"><rect width="240" height="104" fill="#101c30"/><path d="M8 30H232M8 55H232M8 80H232" fill="none" stroke="#20394b"/><polyline points="${points}" fill="none" stroke="#9adbd8" stroke-width="2.5"/></svg>`;
  }
  if(destination==='transfer')return lagrangeChart({decorative:true});
  if(mission.id==='lunar-pathfinder'||mission.id==='comet-pass'){
    const file=mission.id==='lunar-pathfinder'?'earthrise.jpg':'comet-67p.jpg';
    return '<img class="mission-photo" src="'+atlasTexture(file)+'" alt="" loading="lazy">';
  }
  const art=destinationArt(destination);
  if(art)return art;
  if(mission.transfer)return `<span class="transfer-art"><span class="transfer-art-orbit"></span><span class="transfer-art-world" ${spec?.file?`style="--body-texture:url(&quot;${atlasTexture(spec.file)}&quot;)"`:''}></span><span class="transfer-art-tag">${mission.tag.toUpperCase()}</span></span>`;
  if(!['m1','m2','m3','tutorial'].includes(mission.id)){
    const lunar=mission.chapter==='frontier'&&mission.id!=='observatory';
    return `<span class="mission-orbit-art art-${mission.id}" aria-hidden="true"><span class="mission-art-stars"></span><span class="mission-art-planet ${lunar?'moon':''}"></span><span class="mission-art-probe"><span></span></span><span class="mission-art-coordinate">${lunar?'LUNAR SCIENCE / DEEP SPACE':'EARTH SYSTEMS / ORBITAL SURVEY'}</span></span>`;
  }
  return `${missionArt(mission.id)}${mission.image ? `<span class="mission-photo-frame"><img class="mission-photo" src="${mission.image}" alt="" loading="lazy"></span>` : ''}`;
}
export function bindMissionImages(container) {
  container.querySelectorAll('.mission-photo').forEach(img => { img.onerror = () => img.remove(); });
}
