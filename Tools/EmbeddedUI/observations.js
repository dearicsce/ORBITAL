import {showScreen} from '../ui/router.js';
export const EVIDENCE_STORIES=[
  {id:'spalte',title:'A changing Arctic frontier',place:'Spalte Glacier · Northeast Greenland',before:'assets/imported/connected-earth/GlacierB.jpg',after:'assets/imported/connected-earth/GlacierA.jpg',beforeDate:'16 August 1986',afterDate:'24 July 2020',source:'https://science.nasa.gov/earth/earth-observatory/spalte-splits-147350/',sourceTitle:'NASA Earth Observatory · Spalte Splits',credit:'NASA Earth Observatory / Landsat. Local image files supplied through The Changing World project.',description:'These Landsat images show the glacier system before and after Spalte broke apart in 2020. Compare the upper-right inlet: the continuous ice branch is replaced by open water and separated icebergs.',lesson:'One image is a snapshot. Repeated observations let scientists track change. An observation mission needs consistent coverage, useful measurements and enough downlink capacity to return them.',question:'Which mission capability makes this comparison possible?',answers:[{text:'Repeated observations with comparable coverage',correct:true},{text:'A larger rocket without a suitable instrument',correct:false},{text:'Collecting images without transmitting them',correct:false}],feedback:'Repeated, comparable observations reveal change over time. The images also have to reach the ground; data left in a full spacecraft recorder cannot help the science team.'},
  {id:'katla',title:'Look beyond the white pixels',place:'Mýrdalsjökull ice cap · Iceland',before:'assets/imported/connected-earth/katlaA.jpg',after:'assets/imported/connected-earth/katlaB.jpg',beforeDate:'16 September 1986',afterDate:'20 September 2014',source:'https://science.nasa.gov/earth/earth-observatory/myrdalsjokull-then-and-now-84707/',sourceTitle:'NASA Earth Observatory · Mýrdalsjökull Then and Now',credit:'NASA Earth Observatory images by Jesse Allen, using Landsat data from USGS. Local files supplied through The Changing World project.',description:'The ice cap sits above Katla volcano. Its appearance changes with snow cover, exposed ash, geothermal effects and glacier movement. A change in bright-white area alone does not measure glacier loss.',lesson:'Interpretation matters as much as collection. USGS notes that fresh snow in the 1986 image makes a simple white-pixel comparison misleading. Scientists examine glacier termini and comparable measurements.',question:'What should the science team avoid?',answers:[{text:'Assuming every change in white area is lost glacier ice',correct:true},{text:'Checking image dates and sensor information',correct:false},{text:'Comparing the position of glacier termini',correct:false}],feedback:'Snow, season and surface conditions affect an image. Match the observation to the question before claiming a result.',extraSource:'https://eros.usgs.gov/media-gallery/image-of-the-week/icelands-ice-caps'}
];

const product=['Landsat 5 and Landsat 8 OLI','Landsat 5 TM and Landsat 8 OLI'];
function mountStories(host){
 let selected=0;
 function draw(focus=false){
  const story=EVIDENCE_STORIES[selected];
  host.innerHTML=`<div class="evidence-tabs" role="group" aria-label="Observation comparison">${EVIDENCE_STORIES.map((s,i)=>`<button class="orbital-button" data-story="${i}" aria-pressed="${i===selected}">${s.id==='spalte'?'Greenland':'Iceland'}</button>`).join('')}</div>
  <h3>${story.place}</h3><p>${product[selected]} · ${story.beforeDate} and ${story.afterDate}</p>
  <div class="evidence-comparison ${story.id}" style="--reveal:50%"><img src="${story.before}" alt="${story.place}, ${story.beforeDate}" class="evidence-before"><img src="${story.after}" alt="${story.place}, ${story.afterDate}" class="evidence-after"><div class="evidence-divider" aria-hidden="true"></div><span class="evidence-date before-date">${story.beforeDate}</span><span class="evidence-date after-date">${story.afterDate}</span></div>
  <label>Compare the observations <output>50%</output><input type="range" min="0" max="100" value="50"></label><p class="evidence-credit">${story.credit}</p>
  <p>${story.description}</p><p>${story.lesson}</p><div class="evidence-question"><h4>${story.question}</h4>${story.answers.map((a,i)=>`<button class="orbital-button" data-answer="${i}">${a.text}</button>`).join('')}<p role="status" class="observation-feedback"></p></div>
  <p><a href="${story.source}" target="_blank" rel="noopener noreferrer">${story.sourceTitle} ↗</a>${story.extraSource?` · <a href="${story.extraSource}" target="_blank" rel="noopener noreferrer">USGS interpretation ↗</a>`:''}</p>
  <p>These historical optical observations illustrate repeat coverage and interpretation. The Ice frontier mission uses a simulated thermal payload and an authored schedule. Its spacecraft does not generate these images, and they do not enter the score.</p>`;
  const comparison=host.querySelector('.evidence-comparison'),slider=host.querySelector('input');
  const missing=()=>{
   if(comparison.querySelector('[role="status"]'))return;
   comparison.querySelectorAll('img').forEach(img=>img.hidden=true);
   const message=document.createElement('p');message.setAttribute('role','status');
   message.textContent='Comparison images unavailable. The observation notes and source links are below.';
   comparison.append(message);slider.disabled=true;
  };
  comparison.querySelectorAll('img').forEach(img=>{img.onerror=missing;if(img.complete&&!img.naturalWidth)missing();});
  slider.oninput=()=>{comparison.style.setProperty('--reveal',slider.value+'%');host.querySelector('output').textContent=slider.value+'%';};
  host.querySelectorAll('[data-story]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.story);draw(true);});
  host.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{host.querySelector('.observation-feedback').textContent=(story.answers[Number(b.dataset.answer)].correct?'Correct. ':'Try again. ')+story.feedback;});
  if(focus)host.querySelector('[aria-pressed=true]').focus();
 }
 draw();
}
export function observationMarkup(missionId){
 return missionId==='ice'?'<details class="mission-observations"><summary>Study the target · historical NASA observations</summary><div data-observations></div></details>':'';
}
export function bindObservations(container){
 for(const details of container.querySelectorAll('.mission-observations')){
  const host=details.querySelector('[data-observations]');
  details.addEventListener('toggle',()=>{if(details.open&&!host.hasChildNodes())mountStories(host);});
 }
}
export function renderEvidence(container){
 container.innerHTML='<section class="earth-evidence mission-archive" data-screen="evidence"><header class="orbital-topbar"><button class="orbital-brand" id="evidence-home">◉ ORBITAL<span>OBSERVATION ARCHIVE</span></button><button class="orbital-button" id="evidence-campaign">Campaign map ↗</button></header><main class="mission-observations archive-content"><h1>Compare Earth observations</h1><div data-observations></div></main></section>';
 mountStories(container.querySelector('[data-observations]'));
 container.querySelector('#evidence-home').onclick=()=>showScreen('menu');
 container.querySelector('#evidence-campaign').onclick=()=>showScreen('missionSelect');
}

