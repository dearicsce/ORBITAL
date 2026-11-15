import {projectAssembly,placementIssues,catalog} from './blueprint.js';
import {evaluateDesign,checkLaunchGate} from '../engine.js';
export function summarizeBlueprint(b,data,{deployment={},mission=null,allowed=null}={}){
 const design=projectAssembly({...deployment,missionId:mission?.id||null,assembly:b.assembly},data),engineering=evaluateDesign(design,data),issues=placementIssues(b.assembly,data,allowed);
 const payloads=b.assembly.components.filter(c=>data.instruments.some(p=>p.id===c.catalogId)).map(c=>catalog(data,c.catalogId).name);
 const general=[!design.busId&&!issues.length?'Choose a bus.':null,!design.computerId?'Add a flight computer.':null,!design.commsId?'Add communications.':null,!design.pointingId?'Add attitude control.':null,!payloads.length?'Add a payload for a mission role.':null,engineering.panelPower<engineering.averageLoad*1.1?'Solar generation has insufficient engineering margin.':null,engineering.batteryUsableWh<=0?'Add battery reserve.':null].filter(Boolean);
 const ready=issues.length===0&&(mission?checkLaunchGate(design,data).every(c=>c.ok):general.length===0);
 return {engineering,payloads,issues,general,ready,status:ready?(mission?'Ready for '+mission.name:'Ready for mission selection'):'Draft — needs engineering / placement'};
}
