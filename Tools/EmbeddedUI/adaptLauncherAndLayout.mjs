
export function adaptLauncherAndLayout(edit) {
  edit('js/data.js',
    ["import { enrichCampaign }", "import {addLauncherPresets} from './rocket/launcherAdditions.js';\nimport { enrichCampaign }"],
    ["const data=validateWorld(enriched);","const data=validateWorld(addLauncherPresets(enriched));"],
  );
  edit('js/transfer/planning.js',
    ["const available=({albatross:13100,roc:14400})[preset?.id]||0;",
     "const available=preset?.departureCapability??({albatross:13100,roc:14400})[preset?.id]??0;"],
  );
  edit('js/ui/flightPlan.js',
    ["Object.entries(CRUISE_MODULES).map(([id,m])=>",
     "Object.entries(CRUISE_MODULES).filter(([id])=>id!=='beamed'||mission.destination==='proxima').map(([id,m])=>"],
  );
  edit('js/three/payloadFit.js',
    [" const profile=fairing?.geometry?.parameters?.points;",
     " const exported=fairing?.userData.fairingProfile;\n const profile=Array.isArray(exported)?exported.flatMap((value,i)=>i%2?[]:[new THREE.Vector2(exported[i+1],value)]):fairing?.geometry?.parameters?.points;"],
  );
  edit('js/ui/rocketSelect.js',
    ["    const assembly = state.currentDesign.assembly;",
     "    if(l.description){const role=document.createElement('p');role.textContent=l.description;container.querySelector('#rocket-info h2').after(role);}\n    const assembly = state.currentDesign.assembly;"],
    ["setDesign({launcherId:selected,rocketId:null,planId:null});",
     "setDesign({launcherId:selected,rocketId:null,rocketBlueprint:null,planId:null,flightPlan:null});"],
  );
  edit('js/ui/missionSelect.js',
    ["selectedId=null,listView=false", "selectedId=null,listView=true"],
    ['<small>Dotted links show campaign prerequisites.</small>', "${listView?'':'<small>Dotted links show campaign prerequisites.</small>'}"],
    ['<p>Follow the dotted campaign route from your first satellite to the frontier.</p>', '<p>Choose a contract to see its objective and open a briefing.</p>'],
    ['<section class="program-bodies"><h2>Celestial atlas</h2>', '<details class="program-bodies"><summary>Explore the celestial atlas</summary>'],
    ['</div></section></main>', '</div></details></main>'],
    ['${agencyMarkup}<div id="map-history-host"></div></section>',
     '<details class="program-reference"><summary>Sources and spaceflight history</summary>${agencyMarkup}<div id="map-history-host"></div></details></section>'],
    ['<p class="mission-journey"><strong>Brief</strong> → Design → Readiness → Flight → Debrief</p>', ''],
    ['else setDesign({missionId:m.id,launcherId:', 'else setDesign({missionId:m.id,evidencePlan:null,launcherId:'],
    ["  if(matchMedia('(max-width:760px)').matches){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');}",
     "  if(matchMedia('(max-width:760px)').matches)panel.scrollIntoView({block:'nearest'});"],
  );
  edit('js/ui/missionControl.js',
    ["  const command=input=>", "  if(!saved&&!training&&design.evidencePlan==='focused'&&state.evidence&&!state.profile.relay){\n    Object.assign(session,reduceRunCommand(session,{type:'mode',mode:'observe'}));\n    state=session.operations;\n  }\n  const command=input=>"],
  );
  edit('js/transfer/cruise.js',
    ["observationPlan:'balanced',experimentCommands:[],", "observationPlan:design.evidencePlan==='focused'?'priority':'balanced',experimentCommands:[],"],
  );
  edit('js/contracts/validate.js',
    ["  if(design.scienceBundleId", "  if(design.evidencePlan!=null&&!['balanced','focused'].includes(design.evidencePlan))throw Error('Invalid evidence plan');\n  if(design.scienceBundleId"],
  );
}
