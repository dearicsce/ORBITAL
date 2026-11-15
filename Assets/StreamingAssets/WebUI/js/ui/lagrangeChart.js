import {BODIES} from '../engine/orbitalGeometry.js';
import {lagrangePoints,LAGRANGE_SYSTEMS} from '../engine/lagrange.js';

const points=lagrangePoints(LAGRANGE_SYSTEMS.earthMoon);
const separation=LAGRANGE_SYSTEMS.earthMoon.separationM;
const unit=194,originX=289,originY=225;
const earthRadius=BODIES.earth.radiusM/separation*unit;
const moonRadius=BODIES.moon.radiusM/separation*unit;

export function lagrangeChart({decorative=false}={}){
  return `<svg class="lagrange-chart" viewBox="0 0 640 440" ${decorative?'aria-hidden="true"':'role="img" aria-label="Earth–Moon system viewed from above. L1 is between Earth and Moon, L2 beyond the Moon, L3 opposite the Moon, L4 leads and L5 trails the Moon by 60 degrees."'} xmlns="http://www.w3.org/2000/svg">
   <text class="lagrange-heading" x="23" y="34">EARTH–MOON / LAGRANGE POINTS</text>
   <circle class="lagrange-orbit" cx="${originX}" cy="${originY}" r="${unit}"/>
   <path class="lagrange-axis" d="M${originX-unit} ${originY}H${originX+unit*1.19} M${originX} ${originY}L386 57 483 225 386 393Z"/>
   <circle class="lagrange-body earth" cx="${originX}" cy="${originY}" r="${earthRadius}"/>
   <circle class="lagrange-body moon" cx="${originX+unit}" cy="${originY}" r="${moonRadius}"/>
   <text x="${originX}" y="${originY+27}">Earth</text><text x="${originX+unit}" y="${originY+27}">Moon</text>
   ${points.map(([label,x,y])=>`<g transform="translate(${originX+unit*x} ${originY-unit*y})">
     <path class="lagrange-point" d="M0 -6L6 0 0 6 -6 0Z"/>
     <text class="lagrange-label" y="${label==='L5'?29:-13}">${label}</text>
   </g>`).join('')}
   <path class="lagrange-axis" d="M26 392v7h${unit*100000000/separation}v-7"/>
   <text class="lagrange-scale" x="26" y="420">100,000 km</text>
  </svg>`;
}

export function sunEarthLagrangeChart(){
 const all=lagrangePoints(LAGRANGE_SYSTEMS.sunEarth);
 const mark=(label,x,y,captionY=-11)=>`<g transform="translate(${x} ${y})"><path class="lagrange-point" d="M0 -5L5 0 0 5 -5 0Z"/><text class="lagrange-label" y="${captionY}">${label}</text></g>`;
 const nearEarth=all.slice(0,2).map(([name,x])=>mark(name,320+(x-1)*16000,308));
 return `<svg class="lagrange-chart" viewBox="0 0 640 352" role="img" aria-label="Sun–Earth rotating frame with a magnified inset for Earth and L1 and L2">
   <text class="lagrange-heading" x="23" y="29">SUN–EARTH / ROTATING FRAME</text>
   <circle class="lagrange-orbit" cx="305" cy="151" r="106"/>
   <path class="lagrange-axis" d="M199 151H411 M305 151L358 59 411 151 358 243Z"/>
   <circle cx="305" cy="151" r="6" fill="#f1c66f"/><text x="305" y="175">Sun</text>
   <circle class="lagrange-body earth" cx="411" cy="151" r="4"/><text x="526" y="154">Earth / L1 / L2</text>
   ${all.slice(2).map(([name,x,y])=>mark(name,305+106*x,151-106*y))}
   <path class="lagrange-axis" d="M24 237v7h106v-7"/>
   <text class="lagrange-scale" x="23" y="262">1 AU · BODY ICONS ENLARGED</text>
   <path class="lagrange-axis" d="M126 308H514"/>
   <circle class="lagrange-body earth" cx="320" cy="308" r="4"/><text x="320" y="333">Earth</text>
   ${nearEarth.join('')}
   <text class="lagrange-scale" x="23" y="278">EARTH INSET · 151× DISTANCE SCALE</text>
 </svg>`;
}

export function interactiveLagrangeChart(){
  const marker=(id,name,x,y)=>`<button type="button" class="lagrange-hit" data-body="${id}"
    style="left:${x/640*100}%;top:${y/440*100}%" aria-label="Inspect ${name}"></button>`;
  return `<div class="earth-atlas-chart">${lagrangeChart()}
    ${marker('earth-orbit','Earth',originX,originY)}
    ${marker('moon','Moon',originX+unit,originY)}
    ${marker('transfer','Lagrange points',originX+unit/2,originY-unit*Math.sqrt(3)/2)}
  </div>`;
}
