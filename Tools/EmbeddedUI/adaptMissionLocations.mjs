export function adaptMissionLocations(edit) {
  edit('js/engine/gate.js',
    ["import { evaluateDesign }", "import {orbitLocationIssue} from '../unity/missionRoute.js';\nimport { evaluateDesign }"],
    ['  const checks = [];', "  const checks = [];\n  const locationIssue = orbitLocationIssue(mission, design, data.orbits);\n  if (locationIssue) checks.push({id:'mission-orbit',ok:false,message:locationIssue});"],
    ["const departureDv=mission?.transfer&&design.flightPlan&&orbit?.id==='leo'?transferTrajectory(mission,design,design.flightPlan).departureDv:0;", "const departureDv=mission?.transfer&&design.flightPlan&&!locationIssue?transferTrajectory(mission,design,design.flightPlan).departureDv:0;"]);
  edit('js/transfer/cruise.js',
    [" if(state.paused)return false;", " if(state.paused)return false;\n if(command==='observe'&&(!state.arrived||state.tick!==CRUISE_STEPS))return false;"]);
  edit('js/ui/flightPlan.js',
    ["import {NAV_VERSION}", "import {transferDestination, operatingLocation, orbitLocationIssue} from '../unity/missionRoute.js';\nimport {NAV_VERSION}"],
    [' const orbit=data.orbits.find', " if(orbitLocationIssue(mission,selected,data.orbits)){queueMicrotask(()=>showScreen('orbitSelect'));return;}\n const orbit=data.orbits.find"],
    [' const orbit=data.orbits.find', ' const destination = mission.transfer ? transferDestination(mission) : null;\n const orbit=data.orbits.find'],
    ['← Departure orbit', "← ${destination?'Earth departure orbit':'Operating location'}"],
    ['<h1>Flight plan</h1>', "<h1>${destination?'Plan transfer to '+escape(destination.name):'Flight plan'}</h1>"],
    ["<h2>${mission.name}</h2><p>", "<h2>${mission.name}</h2>${destination?`<p class=\"mission-route-summary\">Earth parking orbit <span aria-hidden=\"true\">→</span> ${escape(destination.name)} · ${escape(destination.arrival)}</p>`:''}<p>"],
    ['<details open><summary>Transfer approximation</summary>', '<details><summary>How this transfer is modeled</summary>'],
    ['Review the parking orbit, launcher and spacecraft before certifying this flight. The operations window samples power, eclipse and ground passes.', "Review the launcher and spacecraft for ${escape(operatingLocation(selected.orbitId))}."]);
  edit('js/ui/rocketSelect.js',
    ['Next: choose orbit →', "${mission.transfer?'Next: Earth departure orbit':'Next: operating location'} →"]);
  edit('js/ui/missionControl.js',
    ["import {cameraControls", "import {operatingLocation} from '../unity/missionRoute.js';\nimport {cameraControls"],
    ["${design.orbitId.toUpperCase()} / ${mission.chapter==='frontier'?'LUNAR & DEEP SPACE':'EARTH ORBIT'}", '${operatingLocation(design.orbitId)}'],
    ['<summary>Ground track, contacts & target access</summary>', "<summary>${state.orbit?'Ground track, contacts & target access':'Guided observing and contact windows'}</summary>"],
    ["find('orbit-altitude').textContent=`${altitude.toFixed(1)} km altitude`;\n    }", "find('orbit-altitude').textContent=`${altitude.toFixed(1)} km altitude`;\n    }else if(design.orbitId==='lagrange'){\n      find('orbit-altitude').textContent='Guided location';\n    }"]);
}
