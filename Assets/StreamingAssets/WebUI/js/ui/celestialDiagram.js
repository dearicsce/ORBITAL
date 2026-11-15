import {interactiveLagrangeChart,sunEarthLagrangeChart} from './lagrangeChart.js';
import {CELESTIAL_BODIES} from '../campaignAtlas.js';
import {TRANSFER_TARGETS} from '../transfer/catalogue.js';

function solarDistanceScale(){
 const bodies=CELESTIAL_BODIES.filter(body=>body.level==='solar'&&body.distanceAU)
  .map(body=>[body.name,body.distanceAU]);
 const bands=[
  ['INNER SYSTEM',2,[...bodies.filter(([,au])=>au<2),['67P perihelion',TRANSFER_TARGETS.comet.au]].sort((a,b)=>a[1]-b[1])],
  ['PLANETARY SYSTEM',32,bodies.filter(([,au])=>au>=2)],
  ['SOLAR WIND BOUNDARY',128,[['Neptune',TRANSFER_TARGETS.neptune.au],['Heliopause scenario',TRANSFER_TARGETS.frontier.au]]]
 ];
 return `<details class="atlas-distance"><summary>Solar System distance scale</summary>
 <p>Linear radial distance from the Sun in each band. Dots mark positions on the scale and use a fixed display size.</p>
 ${bands.map(([title,limit,marks])=>`<svg viewBox="0 0 640 123" role="img" aria-label="${title.toLowerCase()} radial distances in astronomical units">
 <text x="22" y="20" class="scale-title">${title}</text><path d="M36 69H604"/><text x="36" y="91">Sun</text><text x="604" y="91">${limit} AU</text>
 ${marks.map(([name,au],i)=>{const x=36+568*au/limit,y=i%2?106:47;return `<path d="M${x} 69V${i%2?92:53}"/><circle cx="${x}" cy="69" r="3"/><text x="${x}" y="${y}">${name}</text><title>${name}, ${au} AU</title>`;}).join('')}
 </svg>`).join('')}</details>`;
}

export function celestialDiagram(level){
 if(level==='earth')return `${interactiveLagrangeChart()}<p>Earth–Moon rotating frame · Earth and Moon radii and the 384,400 km mean separation share one scale. Diamonds mark the equilibrium points.</p>
 <details><summary>Sun–Earth Lagrange map</summary>${sunEarthLagrangeChart()}<p>Both diagrams use circular restricted three-body equilibrium points. Halo and Lissajous trajectories occupy regions around collinear points.</p></details>`;
 const groups={
  solar:{label:'Solar System',centre:'sun',bodies:[['mercury',.2,2.9],['venus',.27,-1.6],['earth',.32,.6],['mars',.39,2.1],['comet',.45,-1.25],['ceres',.48,-.25],['jupiter',.58,-2.65],['saturn',.69,1.15],['uranus',.8,-1.25],['neptune',.88,.28],['frontier',.98,2.72]],scale:'Orbital distance compressed. The heliopause is a boundary.'},
  jupiter:{label:'Jupiter system',centre:'jupiter',bodies:[['io',.29,.4],['europa',.44,-.9],['ganymede',.65,1.8],['callisto',.94,-2.8]],scale:'Orbital distance compressed. Moons shown in order from Jupiter.'},
  stars:{label:'Nearby stars',centre:'home-system',bodies:[['proxima',.44,-.6],['barnard',.62,2.15],['sirius',.89,-2.75]],scale:'Distances in light-years are listed below. Directions are illustrative.'},
  galaxy:{label:'Milky Way',centre:'milky-way',bodies:[['orion-spur',.61,-.7]],scale:'The Orion Spur marks the Solar System’s approximate neighbourhood.'}
 };
 const model=groups[level];if(!model)return '';
 const [cx,cy]=[320,155];
 const r=120;
 const orbit=level==='solar'||level==='jupiter';
 const circles=model.bodies.map(([id,d])=>`<ellipse cx="${cx}" cy="${cy}" rx="${d*r*2}" ry="${d*r*.82}" class="${id==='frontier'?'boundary':''}"/>`).join('');
 const starLines=model.bodies.map(([,d,angle])=>`<path d="M${cx} ${cy}L${cx+d*r*2*Math.cos(angle)} ${cy+d*r*.82*Math.sin(angle)}"/>`).join('');
 const names={'earth-orbit':'Earth','home-system':'Solar System','milky-way':'Galactic centre','orion-spur':'Solar neighbourhood','transfer':'Transfer region',comet:'Comet 67P',proxima:'Proxima Centauri',barnard:'Barnard’s star'};
 const marker=(id,x,y)=>{const label=names[id]||id[0].toUpperCase()+id.slice(1);return `<button class="atlas-marker" style="--body-x:${x/6.4}%;--body-y:${y/3.2}%;--body-size:${id===model.centre?36:21}px" data-body="${id}" aria-label="Inspect ${label}"><span class="atlas-body atlas-${id}"></span><span class="atlas-marker-label">${label}</span></button>`;};
 return `<div class="atlas-diagram" aria-label="${model.label} diagram"><svg viewBox="0 0 640 320" preserveAspectRatio="none" aria-hidden="true"><path class="atlas-grid" d="M0 155H640 M320 0V320"/>${orbit?circles:starLines}</svg><span class="atlas-diagram-title">${model.label.toUpperCase()} / REFERENCE VIEW</span>${marker(model.centre,cx,cy)}${model.bodies.map(([id,d,angle])=>marker(id,cx+d*r*2*Math.cos(angle),cy+d*r*.82*Math.sin(angle))).join('')}<span class="atlas-diagram-scale">SCHEMATIC · SEPARATE BODY AND DISTANCE SCALES</span></div><p>${model.scale} Body sizes use separate illustrative scaling.</p>${level==='solar'?solarDistanceScale():''}`;
}
