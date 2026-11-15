import {createOrbitGlobe} from './orbitGlobe.js';
export function createOrbitView(container){const ids=['leo','sso','geo','llo','lagrange'];const view=createOrbitGlobe(container,{orbits:ids.map(id=>({id})),selectedId:'sso',onSelect(){}});return {updateOrbit:id=>view.select(id),setOrbit:id=>view.select(id),destroy:view.destroy};}
