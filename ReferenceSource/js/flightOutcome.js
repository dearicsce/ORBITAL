import {rateDesign} from './engine.js';
import {applyEvents} from './events.js';
import {canCompleteFlight} from './flightCompletion.js';
export function rateFlight(design,data,evaluation,launch,eventResults,operations=null) {
  const adjusted=applyEvents(evaluation,eventResults);
  const rating=rateDesign(design,data,eventResults,adjusted);
  if(launch.success){
    if(operations){
      rating.scientist=Math.floor(rating.scientist*operations.scienceFactor*2)/2;
      rating.total=rating.engineer+rating.scientist+rating.accountant;
      rating.medal=(data.settings.medals||[]).find(m=>rating.total>=m.minStars&&rating.total<=m.maxStars)?.name||null;
      rating.comments.scientist=`Returned ${operations.deliveredGb.toFixed(2)} GB during the operational window. ${operations.passed?'All flight objectives achieved.':'One or more flight objectives remain unmet.'}`;
      if(!operations.passed)rating.medal=null;
    }
    if(!canCompleteFlight(design.missionId,rating,data.settings?.passStars??3,{launchResult:launch,operationsSummary:operations}))rating.medal=null;
    return rating;
  }
  const engineer=Math.min(.5,rating.engineer);
  return {engineer,scientist:0,accountant:0,total:engineer,medal:null,comments:{
    engineer:'Launch vehicle structural failure on ascent. Spacecraft was lost before orbital entry.',
    scientist:'No science data was gathered because the mission failed to reach orbit.',
    accountant:'Total mission loss. Launch insurance does not cover vehicle disintegration.'
  }};
}
