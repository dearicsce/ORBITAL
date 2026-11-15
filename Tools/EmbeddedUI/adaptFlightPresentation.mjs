export function adaptFlightPresentation(edit) {
  edit('js/ui/reportAnimation.js',
    ["import { queueLines } from './speech.js';\n",""],
    ["export function animateReport(container,rating,eventSentence)","export function animateReport(container,rating)"],
    ["  queueLines(ids.map(id=>({characterId:id,text:rating.comments[id]+(id==='engineer'?eventSentence:''),options:{pointAt:'#report-'+id}})));\n",""]);
  edit('js/ui/rocketSelect.js',
    ["import { showLine } from './speech.js';\n",""],
    ["    showLine('nova','Choose enough lift for your spacecraft and its destination.',{pointAt:'#rocket-info'});\n",""]);
  edit('js/transfer/planning.js',
    ['function planChecks(plan,design,mission,data,evaluation,completed){\n const issues=[];',
      `function planChecks(plan,design,mission,data,evaluation,completed,{structured=false}={}){
 const issues=[];
 const issue=(code,message,limitLabel)=>structured?{code,message,...(limitLabel?{limitLabel}:{})}:message;
 const fail=(code,message,limitLabel)=>issues.push(issue(code,message,limitLabel));`],
    ["return ['Confirm a transfer flight plan.'];", "return [issue('transfer-plan','Confirm a transfer flight plan.')];"],
    ["return ['The saved flight plan belongs to a different mission or orbit.'];", "return [issue('transfer-plan','The saved flight plan belongs to a different mission or orbit.')];"],
    ["return ['Use the assigned low Earth departure orbit.'];", "return [issue('transfer-plan','Use the assigned low Earth departure orbit.')];"],
    ["issues.push('Restore the published", "fail('transfer-plan','Restore the published"],
    ["issues.push(module.name+", "fail('transfer-module',module.name+"],
    ["issues.push('The stellar flyby", "fail('transfer-module','The stellar flyby"],
    ["issues.push('Reserve the experimental", "fail('transfer-module','Reserve the experimental"],
    ["issues.push('The voyage exceeds", "fail('transfer-lifetime','The voyage exceeds"],
    ["issues.push('Jupiter operations", "fail('transfer-radiation','Jupiter operations"],
    ["issues.push('Battery and generation", "fail('transfer-science-power','Battery and generation"],
    ["issues.push('Cruise generation", "fail('transfer-cruise-power','Cruise generation"],
    ["issues.push('The distance-limited radio", "fail('transfer-radio','The distance-limited radio"],
    ["issues.push('Recorder or payload", "fail('transfer-recorder','Recorder or payload"],
    ["issues.push('Spacecraft propellant", "fail('transfer-correction','Spacecraft propellant"],
    ["issues.push('Add a compatible braking stage with enough arrival delta-v.');",
      "fail('transfer-arrival','The selected braking stage cannot supply the required arrival delta-v.',Math.floor(capability).toLocaleString('en-US')+' m/s available');"],
    ["issues.push('Choose the flyby", "fail('transfer-flyby','Choose the flyby"],
    ["   if(9350+t.departureDv>available||(preset?.capacity.tli||0)<h.stackKg)issues.push('This preset cannot provide the departure energy and transfer stack mass. Build a suitable custom launcher.');",
     `   const departureMass=preset?.capacity.tli||0;
   const required=9350+t.departureDv;
   const number=n=>Math.round(n).toLocaleString('en-US');
   if(required>available)fail('departure-energy',
     'Departure needs '+number(required)+' m/s. The selected launcher supplies '+number(available)+' m/s for this transfer.',
     available?number(available)+' m/s available':'Preset has no rated departure capability');
   if(departureMass<h.stackKg)fail('departure-mass',
     'The loaded stack is '+h.stackKg.toFixed(1)+' kg. This launcher is rated for '+number(departureMass)+' kg on departure.',
     number(departureMass)+' kg departure limit');`],
    ['}catch(error){issues.push(error.message);}', "}catch(error){fail('transfer-plan',error.message);}"]);
  edit('js/engine/gate.js',
    ["for(const [index,message] of planChecks(design.flightPlan,design,mission,data,evalResult,completed).entries())checks.push({id:'transfer-'+index,ok:false,message});",
     "for(const [index,issue] of planChecks(design.flightPlan,design,mission,data,evalResult,completed,{structured:true}).entries())checks.push({id:'transfer-'+index,ok:false,...issue});"],
    ["checks.push({id:'fairing',ok:false,message:issue.message});","checks.push({id:'fairing',ok:false,message:issue.message,limitLabel:issue.measurement?issue.measurement.limit+' '+issue.measurement.unit+' fairing limit':''});"]);
  edit('js/ui/flightPlan.js',
    ["import {escapeHtml", "import {renderPlanReadiness} from '../unity/planReadiness.js';\nimport {escapeHtml"],
    [' <div class="plan-layout">',' <section class="plan-readiness" id="plan-readiness" aria-live="polite"></section><div class="plan-layout">'],
    ["let rows=[['Loaded spacecraft", "let rows=[['mass','Loaded spacecraft"],
    ["['Estimated mission cost'", "['cost','Estimated mission cost'"],
    ["['Stack delta-v demand'", "['stackDv','Stack delta-v demand'"],
    ["['Arrival',mission.tag", "['arrival','Arrival',mission.tag"],
    ["['Downlink at planning distance'", "['radio','Downlink at planning distance'"],
    ["['Farthest generation / cruise draw'", "['farPower','Farthest generation / cruise draw'"],
    ["['Equipment lifetime'", "['lifetime','Equipment lifetime'"],
    ["['Trim / arrival propellant'", "['trim','Trim / arrival propellant'"],
    ...['Departure opportunity','Opportunity recurrence','Departure burn','Cruise duration','Mid-course allowance','Conditions','Planning link distance','One-way signal time'].map(label=>["['"+label+"',","['','"+label+"',"]),
    ["  find('telemetry').innerHTML=`<h3>Engineering and trajectory</h3><dl>${rows.map(([name,value])=>`<dt>${name}</dt><dd>${escape(value)}</dd>`).join('')}</dl>${failed.length?`<h4>Open checks</h4><ul class=\"text-red\">${failed.map(c=>`<li>${escape(c.message)}</li>`).join('')}</ul>`:'<p class=\"text-green\">All checks passed.</p>'}`;",
     `  const measurements={
   power:['solar','Solar generation','W'], eclipse:['reserve','Usable battery reserve','Wh'],
   slots:['slots','Payload slots used','slots'], computer:['processing','Daily data to process','GB/day'],
   pointing:['pointing','Installed attitude control',''], comms:['radio','Communications installed',''],
   fuel:['trim','Carried insertion propellant','kg']
  };
  for(const check of failed){
   const measurement=measurements[check.id];
   if(measurement&&!rows.some(([key])=>key===measurement[0])){
    const [key,label,unit]=measurement;
    const value=check.id==='comms'?'None':typeof check.value==='number'?check.value.toFixed(1)+' '+unit:String(check.value);
    rows.push([key,label,value]);
   }
  }
  renderPlanReadiness({status:find('readiness'),telemetry:find('telemetry'),rows,failed,onFix});`],
    [" const find=id=>container.querySelector('#plan-'+id);",
     ` const find=id=>container.querySelector('#plan-'+id);
 function onFix(action){
  if(action==='custom'){showScreen('rocketWorkshop',{mission:true,planDraft:structuredClone(plan)});return;}
  if(action==='rockets'||action==='orbit'||action==='workshop'){
   showScreen({rockets:'rocketSelect',orbit:'orbitSelect',workshop:'workshop'}[action],{mission:true});
   return;
  }
  const input=container.querySelector('#'+action);
  input?.focus();
  input?.scrollIntoView({block:'center'});
 }`]);
  edit('js/ui/rocketWorkshop.js',
    ["orbit?recommendedPlan(mission,orbit.id,completed):null;", "orbit?(params.planDraft??recommendedPlan(mission,orbit.id,completed)):null;"],
    ["← ${academy?'Flight Academy':missionMode?'Launcher presets':'Mission control'}", "← ${academy?'Flight Academy':params.planDraft?'Transfer plan':missionMode?'Launcher presets':'Mission control'}"],
    ["Catalogue tank diameters · schematic stage lengths", "Schematic proportions · engineering checks use catalogue dimensions"],
    ["showScreen(missionMode?'rocketSelect':'menu');", "showScreen(params.planDraft?'flightPlan':missionMode?'rocketSelect':'menu',{planDraft:params.planDraft});"],
    ["setDesign({rocketId:rocket.id,planId:null});saveProgress();showScreen('orbitSelect');};",
     "setDesign({rocketId:rocket.id,rocketBlueprint:rocket,planId:null,flightPlan:null});saveProgress();showScreen(params.planDraft?'flightPlan':'orbitSelect',{planDraft:params.planDraft});};"]);
  edit('js/ui/flightPlan.js',
    ['renderFlightPlan(container,data){','renderFlightPlan(container,data,{planDraft}={}){'],
    [" const plan=selected.flightPlan?structuredClone(selected.flightPlan):recommendedPlan(mission,selected.orbitId,state.completedMissions);",
     " const prior=planDraft?.missionId===mission.id&&planDraft.orbitId===selected.orbitId?planDraft:selected.flightPlan;\n const plan=prior?structuredClone(prior):recommendedPlan(mission,selected.orbitId,state.completedMissions);"]);
  edit('js/rocket/reference.js',
    ["helio?'ORBITAL Heliopause':lunar?'ORBITAL Lunar Courier':frontier?'ORBITAL Frontier':expedition?'ORBITAL Expedition':'ORBITAL Courier'",
     "helio?'Horizon Escape':lunar?'Stratus Lunar':frontier?'Horizon Deep Space':expedition?'Summit Transfer':'Vector 1 Custom'"]);
  edit('js/campaign.js',
    ["  const concept=data.launchers.find(l=>l.id==='albatross');if(concept)concept.name='Ares I · concept preset';",""]);
  edit('js/three/customVehicle.js',
    [" if(rocket.name!=='Untitled launcher'){context.font='600 34px system-ui';context.fillText(rocket.name,256,144,465);}", ""],
    ["context.fillText('ORBITAL',256,89);", "context.textBaseline='middle';context.fillText('ORBITAL',256,90);"],
    ["  label.name='orbital_wordmark_decal';label.rotation.z=Math.PI/2;label.position.set(0,6,(core?.diameterM||1.8)*.29+.012);",
     "  label.name='orbital_wordmark_decal';label.rotation.z=Math.PI/2;label.position.set(0,6,root.userData.coreRadius+.012);"]);
  edit('js/three/rocketWorkshopView.js',
    ["import {customVehicle}", "import {visibleHardwareBounds} from './flightFraming.js';\nimport {customVehicle}"],
    [" let model=null,config=null;", ` let model=null,config=null,bounds=null;
 function frameRocket(){
  if(!bounds||bounds.isEmpty()||!container.clientHeight)return;
  const center=bounds.getCenter(new THREE.Vector3());
  const radius=bounds.getSize(new THREE.Vector3()).length()/2;
  const vertical=Math.tan(THREE.MathUtils.degToRad(kit.camera.fov/2));
  const aspect=container.clientWidth/container.clientHeight;
  const angle=Math.atan(vertical*Math.min(1,aspect));
  const distance=1.13*radius/Math.sin(angle);
  const direction=kit.camera.position.clone().sub(kit.controls.target).normalize();
  kit.controls.target.copy(center);
  kit.controls.maxDistance=Math.max(82,distance*2.2);
  kit.camera.position.copy(center).addScaledVector(direction,distance);
  kit.controls.update();
 }
 const resize=new ResizeObserver(frameRocket);
 resize.observe(container);`],
    ["   const key=JSON.stringify([blueprint.name,blueprint.parts]);","   const key=JSON.stringify(blueprint.parts);"],
    ["    if(node.name==='interstage')","    if(node.name==='engine_skirt')node.visible=Boolean(installed.coreEngine);\n    if(['interstage','interstage_transition'].includes(node.name))"],
    ["   const bounds=new THREE.Box3().setFromObject(model);\n   model.position.y=-bounds.min.y;\n   bounds.translate(model.position);\n   bay.fit(bounds);",
     "   bounds=visibleHardwareBounds([model]);\n   if(bounds.isEmpty())return;\n   model.position.y=-bounds.min.y;\n   bounds.translate(model.position);\n   bay.fit(bounds);\n   frameRocket();"],
    ["  destroy(){kit.destroy();}","  destroy(){resize.disconnect();kit.destroy();}"]);
}
