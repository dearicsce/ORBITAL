
export function adaptCampaignPresentation(edit) {
  edit('js/data.js',
    ["  const data=validateWorld(enrichCampaign(await response.json()));",
     "  const enriched=enrichCampaign(await response.json());\n  if(!enriched.missions.some(mission=>mission.id==='dip'))enriched.missions.push({\n    schemaVersion:2,units:{budget:'million USD',lifetime:'year'},\n    id:'dip',name:'Catch the Next Dip',chapter:'earth',tag:'Exoplanet Transit Photometry', destination:'earth-orbit',\n    brief:'Two teams expect this star to dim on different schedules. You can look once.',\n    objective:'Choose an observing window and return evidence that distinguishes the two predictions.',\n    budget:320,targetLifetime:3,launchers:['kestrel','condor','albatross','roc'],requires:[],payload:'optical_camera',\n    relevance:{optical_camera:1},orbitFit:{leo:1,sso:1},profile:{coverage:52,delivered:1,contact:0.18,eclipse:0,incidents:['radiation','storage']},\n    missionDifficulty:3\n  });\n  const data=validateWorld(enriched);"],
  );
  edit('js/campaign.js', 
    ["const lunar=mission.chapter==='frontier';","const lunar=mission.chapter==='frontier'&&mission.id!=='dip';"],
  );
  edit('js/campaignAtlas.js', 
    [" return mission.programChapter||"," if(mission.id==='dip')return 'Earth Operations';\n return mission.programChapter||"],
  );
  edit('js/ui/missionSelect.js', 
    ['<button class="orbital-button primary" id="map-build"', '<button class="orbital-button primary" id="map-brief" ${unlocked?\'\':\'disabled\'}>Open briefing</button><button class="orbital-button" id="map-build"'],
    ['rocketId:null,planId:null,flightWorkflow:true,scienceBundleId','rocketId:null,rocketBlueprint:null,planId:null,flightPlan:null,flightWorkflow:true,scienceBundleId'],
    ["saveProgress();showScreen('workshop',{mission:true,...options});",
     "saveProgress();showScreen(options.brief||m.id==='dip'?'brief':'workshop',{mission:true,...options});"],
    ["  panel.querySelector('#map-build').onclick=()=>enter();",
     "  panel.querySelector('#map-brief').onclick=()=>enter(null,{brief:true});\n  panel.querySelector('#map-build').onclick=()=>enter();"],
    ['${m.profile?.delivered||0} GB returned in operations',
     "${m.id==='dip'?'Whole packets within the selected contact case':m.profile?.relay?'Scheduled check-ins; powered service':(m.profile?.delivered||0)+' GB return target'}"],
  );
  edit('js/ui/missionControl.js', 
    ["export function renderMissionControl", "import {mountEvidenceTimeline} from '../unity/campaignEvidenceView.js';\n\nexport function renderMissionControl"],
    ['<div id="ops-preview" class="ops-preview"></div>', '<div id="ops-preview" class="ops-preview"></div><div id="ops-evidence-panel"></div>'],
    ["  function render(){", "  const evidencePanel=state.evidence?mountEvidenceTimeline(find('ops-evidence-panel'),()=>state):null;\n  function render(){\n    evidencePanel?.refresh();"],
    ["save();view.destroy();};", "save();evidencePanel?.destroy();view.destroy();};"],
  );
  edit('js/ui/cruise.js', 
    ["export function renderCruise", "import {mountEvidenceTimeline} from '../unity/campaignEvidenceView.js';\n\nexport function renderCruise"],
    ['<p id="cruise-log" role="status"></p>', '<p id="cruise-log" role="status"></p><div id="cruise-evidence-panel"></div>'],
    [" function render(){", " const evidencePanel=state.evidence?mountEvidenceTimeline(find('evidence-panel'),()=>state):null;\n function render(){\n  evidencePanel?.refresh();"],
    ["window.removeEventListener('pagehide',save);save();};","window.removeEventListener('pagehide',save);save();evidencePanel?.destroy();};"],
  );
}
