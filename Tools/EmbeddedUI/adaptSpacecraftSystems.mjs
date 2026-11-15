export function adaptSpacecraftSystems(edit) {
  edit('js/contracts/world.js',
    ['    p.subcategory={bus:',"    if(p.type!=='thermal')p.subcategory={bus:"],
    ["    else p.dimensionsM=p.type==='comms'","    else if(p.type!=='thermal')p.dimensionsM=p.type==='comms'"],
    ['    p.intendedStrengths=`',"    if(p.type!=='thermal')p.intendedStrengths=`"],
    ['    p.limitations=`',"    if(p.type!=='thermal')p.limitations=`"]);
  edit('js/engine/evaluate.js',
    ['  const dryMass = busMass', "  const thermal = (design.thermalIds||[]).map(id=>data.parts.find(p=>p.id===id&&p.type==='thermal')).filter(Boolean);\n  const thermalMass = thermal.reduce((sum,p)=>sum+p.mass,0);\n  const dryMass = thermalMass + busMass"],
    ['...batteries, ...fuels, ...instruments].filter(Boolean)', '...batteries, ...fuels, ...instruments, ...thermal].filter(Boolean)']);
  edit('js/contracts/validate.js',
    ['export const SCHEMA_VERSION=2;', "import {validateRules} from '../unity/spacecraftSystems.js';\nexport const SCHEMA_VERSION=2;"],
    ['  if(design.evidencePlan!=null', '  if(design.autonomy!==undefined)design.autonomy=validateRules(design.autonomy);\n  if(design.evidencePlan!=null'],
    ["['instrumentIds','instrument']]){", "['instrumentIds','instrument'],['thermalIds','thermal']]){"],
    ["type==='instrument'?100:2","type==='instrument'?100:type==='thermal'?24:2"]);
  edit('js/engine/operations.js',
    ["import {projectAssembly}", "import {createSystems,MODES} from '../unity/spacecraftSystems.js';\nimport {SYSTEM_INCIDENTS,commandSystemFault,stepSpacecraftOperations,systemsSummary} from '../unity/systemsOperations.js';\nimport {projectAssembly}"],
    ['export const INCIDENTS={','export const INCIDENTS={\n  radio:SYSTEM_INCIDENTS.radio,'],
    ['{science=true,relayTraffic=false}={}', '{science=true,relayTraffic=false,systems=design.missionId!==\'tutorial\'}={}'],
    ['    ...(relayTraffic&&relay?', '    ...(systems?{systems:createSystems(design,data)}:{}),\n    ...(relayTraffic&&relay?'],
    ['    hardware:{modelVersion:2,','    hardware:{directional:!relay&&instruments.some(p=>(mission.relevance?.[p.id]??mission.relevance?.[p.roleId]??0)>0&&p.kind!==\'relay\'&&!/magnetometer|particle|plasma|radiation/i.test(p.id)),modelVersion:2,'],
    ["  if(!['auto','observe','downlink','safe'].includes(mode)||state.finished)", "  if(!MODES.includes(mode)||state.finished||mode==='charge'&&!state.systems)"],
    ['  if(!INCIDENTS[incident.id]?.choices', '  const systemResult=commandSystemFault(state,choiceId);\n  if(systemResult!==null)return systemResult;\n  if(!INCIDENTS[incident.id]?.choices'],
    ['  let mode=state.mode;','  if(state.systems)return stepSpacecraftOperations(state,env,INCIDENTS);\n  let mode=state.mode;'],
    ['  return {...evidenceSummary(state.evidence),missionId:', '  return {...evidenceSummary(state.evidence),...systemsSummary(state.systems),missionId:']);
  edit('js/contracts/missionRun.js',
    ["import {validateRelay}", "import {validateSystems,MODES} from '../unity/spacecraftSystems.js';\nimport {SYSTEM_INCIDENTS} from '../unity/systemsOperations.js';\nimport {validateRelay}"],
    ["!['auto','observe','downlink','safe'].includes(", "!MODES.includes(",2],
    ['!Object.values(INCIDENTS).some(i=>i.choices.some(c=>c.id===command.choiceId))', '![...Object.values(INCIDENTS),...Object.values(SYSTEM_INCIDENTS)].some(i=>i.choices.some(c=>c.id===command.choiceId))'],
    ['  assertSerializable(run);','  assertSerializable(run);\n  validateSystems(run.operations?.systems);validateSystems(run.cruise?.systems);']);
  edit('js/three/workshopAssembly.js',
    ["import {createSolarWing}", "import {loadThermalModel} from './thermalModels.js';\nimport {createSolarWing}"],
    ['    }else if(metadata(p).internal){', `    }else if(p.type==='thermal'){
     loadThermalModel(p.id).then(model=>{
      if(instances.get(c.instanceId)!==root){disposeObject(model);return;}
      root.add(model);
     }).catch(error=>console.error('Thermal hardware could not load:',error));
    }else if(metadata(p).internal){`]);
  edit('js/transfer/cruise.js',
    ["import {ARRIVAL_KITS}", "import {createSystems} from '../unity/spacecraftSystems.js';\nimport {systemsSummary} from '../unity/systemsOperations.js';\nimport {cruiseSystemsPower,queueCruiseTransmit} from '../unity/systemsCruise.js';\nimport {ARRIVAL_KITS}"],
    ['{science=true,assumptions}={}', "{science=true,assumptions,systems=mission.destination!=='proxima'}={}"],
    [' return {\n  evidence:createEvidence', ' return {\n  ...(systems?{systems:createSystems(design,data),uplink:null,groundHold:false,usefulIntervalSec:0}:{}),\n  evidence:createEvidence'],
    [' const net=(generation-loadW)*seconds/3600;', ' if(state.systems)return cruiseSystemsPower(state,seconds,sunAu,loadW,generation);\n const net=(generation-loadW)*seconds/3600;'],
    ['  state.transmit=!state.transmit;state.pending=null;','  if(state.systems){\n   if(!queueCruiseTransmit(state))return false;\n  }else{\n  state.transmit=!state.transmit;state.pending=null;'],
    ["  record(state,state.transmit?'Earth downlink started.':'Earth downlink paused.');","  record(state,state.transmit?'Earth downlink started.':'Earth downlink paused.');\n  }"],
    ['  if(powered&&radioOn){','  if(state.systems?state.usefulIntervalSec>0:powered&&radioOn){'],
    ['h.rateGbDay*hours/24','h.rateGbDay*(state.systems?state.usefulIntervalSec:seconds)/86400'],
    ['  state.collectedGb=h.dataGbDay*SCIENCE_HOURS/24;','  state.collectedGb=h.dataGbDay*(state.systems?state.usefulIntervalSec:seconds)/86400;'],
    [' return {...evidenceSummary(state.evidence),missionId:', ' return {...evidenceSummary(state.evidence),...systemsSummary(state.systems),missionId:'],
    [" if(!Array.isArray(state.inFlight)",` if(state.systems&&(typeof state.groundHold!=='boolean'||!Number.isFinite(state.usefulIntervalSec)||state.usefulIntervalSec<0||
   (state.uplink!==null&&(typeof state.uplink?.transmit!=='boolean'||!Number.isFinite(state.uplink?.arrivesSec)||state.uplink.arrivesSec<state.elapsedSec))))throw Error('Invalid cruise uplink checkpoint');
 if(!Array.isArray(state.inFlight)`]);
  edit('js/ui/missionControl.js',
    ["import {initializeOperations", "import {INTENTS,advancePointing,pointingEnvironment} from '../unity/spacecraftSystems.js';\nimport {incidentEvidence,incidentOptions} from '../unity/systemsOperations.js';\nimport {initializeOperations"],
    ["['observe','01','Observe'],['downlink','02','Transmit'],['safe','03','Safe mode']", "[\'observe\',\'01\',state.systems?\'Observe target\':\'Observe\'],[\'downlink\',\'02\',state.systems?\'Point to Earth\':\'Transmit\'],...(state.systems?[[\'charge\',\'03\',\'Charge\']]:[]),[\'safe\',\'04\',\'Safe mode\']"],
    ['<p id="mode-explanation">Flight systems online</p>', '<p id="mode-explanation">Flight systems online</p>${state.systems?\'<p class="pointing-status" id="pointing-status"></p>\':\'\'}'],
    ["find('temperature-live').textContent=state.temperature.toFixed(0)+' °C';",
      `find('temperature-live').textContent=state.systems
      ? Math.round(state.systems.payloadC)+' °C payload · '+Math.round(state.systems.batteryC)+' °C battery'+(state.systems.heaterOn?' · Heater on':'')
      : state.temperature.toFixed(0)+' °C';
    if(state.systems){
      const s=state.systems;
      const requested=state.mode==='auto'?s.intent:state.mode;
      find('pointing-status').textContent='Sun '+(state.sunlit?'lit':'eclipsed')+' · Earth '+(state.contact?'contact':'out of contact')+
        ' · Target '+(s.intent==='observe'&&s.settleSec===0?'tracked':'standing by')+
        ' · '+(requested!==s.intent?'Queued: '+INTENTS[requested]:s.settleSec>0?'Turning to '+INTENTS[requested]:INTENTS[requested]);
    }`],
    ["find('mode-explanation').textContent=state.cooldown","find('mode-explanation').textContent=state.systems?.lastReason|| (state.cooldown"],
    ["'Returning stored observations to the ground';","'Returning stored observations to the ground');"],
    ['const event=INCIDENTS[incidentShown];','const event=incidentOptions(state,INCIDENTS);'],
    ['<p>${event.description}</p><div class="incident-choices">','<p>${event.description}</p>${incidentEvidence(state)?`<p>${incidentEvidence(state)}</p>`:\'\'}<div class="incident-choices">'],
    ["const help={auto:","const help={charge:'Turn the solar wings toward the Sun and pause the payload.',auto:"],
    ['view.setTime(seconds,{orbit:state.orbit,paused:state.paused||state.finished||Boolean(state.pendingIncident)});',
      `const spacecraft=state.systems, turnTime=seconds-operationsElapsedSec(state.tick);
    const orient=spacecraft?{...spacecraft,quaternion:spacecraft.quaternion.slice()}:null;
    if(orient&&turnTime>0&&!state.paused&&state.mode!=='auto'&&state.mode!==orient.intent&&state.batteryWh>0){
      advancePointing(orient,state.mode,pointingEnvironment(state,seconds),turnTime);
    }
    view.setTime(seconds,{orbit:state.orbit,attitude:orient?.quaternion,paused:state.paused||state.finished||Boolean(state.pendingIncident)});`]);
}
