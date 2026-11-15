import {BODIES} from '../engine/orbitalGeometry.js';

// NASA Science OLI requirements, accessed 2026-11-09.
// https://science.nasa.gov/mission/landsat/oli/
// Manually transcribed published instrument specifications, in SI units.
export const OLI=Object.freeze({
 source:'https://science.nasa.gov/mission/landsat/oli/',
 altitudeM:705000, multispectralSampleM:30, swathM:185000
});

// Fixed angular pixel size and nadir, using mean orbital altitude and a spherical
// Earth. ORBITAL adopts the published OLI sample spacing as its authored goal.
export function floodwatchSampling(missionId,orbit){
 if(missionId!=='m1'||orbit?.body!=='earth')return null;
 const altitudeM=orbit.semiMajorAxisM-BODIES.earth.radiusM;
 const sampleM=altitudeM/OLI.altitudeM*OLI.multispectralSampleM;
 return {altitudeM,sampleM,meetsBenchmark:sampleM<=OLI.multispectralSampleM};
}

export function samplingText(sample){
 if(!sample)return 'Floodwatch needs an Earth orbit for its Landsat-inspired detail requirement.';
 const result=sample.meetsBenchmark?'meets':'exceeds';
 return `Floodwatch estimates ${sample.sampleM.toFixed(1)} m per pixel at ${(sample.altitudeM/1000).toFixed(0)} km mean altitude. This ${result} the 30 m limit for useful observations.`;
}

export function floodwatchReport(run){
 const sample=run?.operations?.sampling;
 if(!sample)return '';
 return `<p>${samplingText(sample)} ${sample.meetsBenchmark?'The camera could collect useful data in Observe mode.':'No observations met the modeled detail requirement. A lower orbit improves sampling and changes contact and eclipse timing.'} The estimate assumes nadir pointing and fixed angular pixel size. <a href="${OLI.source}" target="_blank" rel="noopener">NASA Landsat OLI specifications ↗</a></p>`;
}
