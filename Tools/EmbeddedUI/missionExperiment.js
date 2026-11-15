import {createOperations, chooseMode, stepOperations, resolveIncident, operationSummary, operationEnvironment, INCIDENTS} from '../engine/operations.js';
import {forecastIncidentChoice} from './systemsOperations.js';
import {createCruise, cruiseCommand, stepCruise, cruiseSummary} from '../transfer/cruise.js';
import {selectEncounterPlan} from './scienceTransfer.js';
import {SCIENCE_VERSION} from './scienceScenarios.js';
import {evaluateDesign, checkLaunchGate} from '../engine.js';
import {catalog, placementIssues, projectAssembly} from '../workshop/blueprint.js';
import {initializeOperations,initializeFromLaunch} from './missionLifecycle.js';
import {attachPhysicalCruise} from './physicalCruise.js';
import {ascentVehicle,simulateAscent,numericalTarget} from '../engine/ascent.js';
import {relayPolicy} from './relayTraffic.js';

const transferCommands = {departure:'depart', correction:'correct', encounter:'acquire', science:'observe', downlink:'transmit'};

export const ORBIT_PLANS = {
  recorded: 'Recorded spacecraft commands',
  auto: 'Autopilot throughout',
  transmit: 'Autopilot, then transmit after last target',
  observe: 'Observe throughout',
  protect: 'Protect the relay between service periods'
};
export const SAIL_ASSUMPTIONS = {
  speed: {speedFraction: .04},
  life: {lifetimeYears: 80},
  receiver: {receiverFactor: .1}
};

export function hardwareOptions(design, data) {
  const options = [];
  if (!design.assembly) return options;
  for (const [index, component] of design.assembly.components.entries()) {
    const part = catalog(data, component.catalogId);
    if (!['battery', 'comms', 'computer'].includes(part?.type)) continue;
    for (const replacement of data.parts.filter(p => p.type === part.type && p.id !== part.id)) {
      const assembly = structuredClone(design.assembly);
      assembly.components[index].catalogId = replacement.id;
      if (placementIssues(assembly, data).length) continue;
      options.push({id: index + '/' + replacement.id, from: part.name, to: replacement.name,
        location: component.bayId ?? component.attachmentSurfaceId,
        design: projectAssembly({...design, assembly}, data)});
    }
  }
  return options;
}

export function prepareHardwareTrial(run, data, option) {
  const replacement = hardwareOptions(run.design, data).find(candidate => candidate.id === option);
  if (!replacement) throw Error('This replacement does not fit the recorded assembly.');
  const {design} = replacement;
  return {...replacement, evaluation: evaluateDesign(design, data),
    gateIssues: checkLaunchGate(design, data).filter(check => !check.ok).map(check => check.message)};
}

export function rerunExperiment(run, data, input = {}) {
  const initial = run.operations ?? run.cruise;
  if (run.simulationVersion !== SCIENCE_VERSION || initial?.evidence?.version !== SCIENCE_VERSION || !run.launchResult?.success)
    throw Error('This experiment needs a flown checkpoint from the current model.');
  const {schedule = 'recorded', plan, assumption, perturbation, hardware,scope='deployment'} = input;
  if(!['deployment','full-mission'].includes(scope))throw Error('Unknown experiment scope');
  const hardwareTrial = hardware ? prepareHardwareTrial(run, data, hardware) : null;
  const design = hardwareTrial?.design ?? run.design;
  const evalResult = hardwareTrial?.evaluation ?? run.evalResult;
  const {mission} = run;
  let trialRun=run,fullLaunch=null;
  if(scope==='full-mission'){
    const flight=simulateAscent(ascentVehicle(design,evalResult.launchMass),numericalTarget(design));
    fullLaunch={model:flight.modelVersion,success:!flight.reason,reason:flight.reason,timeSec:flight.end.timeS,orbit:flight.orbit};
    if(flight.reason) return {format:'orbital-isolated-trial',scope,sourceRunId:run.runId??null,simulationVersion:run.simulationVersion,scoringVersion:run.scoringVersion,missionId:mission.id,initialSeed:run.initialSeed,sourceBundle:run.sourceBundle??null,design,input,commands:[],state:{},summary:{passed:false,objectives:[],science:{usefulGb:0,minimumWh:0,servedWh:0,contactSec:0},collectedGb:0,deliveredGb:0,lostGb:0,storageGb:0,fuelKg:0,elapsedMinutes:flight.end.timeS/60},launchResult:fullLaunch,massKg:evalResult.launchMass,costM:evalResult.totalCost,gateIssues:hardwareTrial?.gateIssues??[]};
    trialRun=structuredClone(run);trialRun.design=design;trialRun.evalResult=evalResult;
    if(trialRun.lifecycle){trialRun.lifecycle.design=structuredClone(design);initializeFromLaunch(trialRun,{orbit:flight.orbit,insertionTimeS:flight.end.timeS,positionM:flight.end.positionM,velocityMps:flight.end.velocityMps,massKg:flight.end.massKg,upperPropellantKg:flight.end.propellantKgByTank.upper,upperIgnitions:flight.end.ignitions.upper});}
  }
  let state, summary;
  const commands = [];
  if (run.operations) {
    const trialOrbit=scope==='full-mission'&&['leo','sso'].includes(design.orbitId)?fullLaunch.orbit:initial.orbit;
    const placed = trialOrbit ? {...design, orbitElements: trialOrbit} : design;
    state = createOperations(placed, data, evalResult,{relayTraffic:!!initial.relayTraffic,systems:Boolean(initial.systems)});
    initializeOperations(trialRun,state);
    if (schedule === 'observe') {chooseMode(state, 'observe');commands.push({tick:0,type:'mode',mode:'observe'});}
    const end = Math.max(...state.evidence.scenario.windows.map(([, , endTick]) => endTick));
    for (let i = 0; i < state.totalTicks && !state.finished; i++) {
      const recordedCommands = (run.commands ?? []).filter(c => c.status === 'applied' && c.tick === state.tick);
      const resolve = choice => {
        if (!resolveIncident(state, choice)) throw Error('Recorded incident choice is unavailable.');
        commands.push({tick:state.tick, type:'incident', choice});
      };
      if (state.pendingIncident && !recordedCommands.some(c => c.type === 'incident')) {
        const incident = state.pendingIncident;
        const recorded = initial.resolvedIncidents.find(c => c.id === incident.id && c.tick === state.tick);
        const endedHere = recordedCommands.some(c => c.type === 'end');
        if (recorded || !endedHere) {
          const fallback = forecastIncidentChoice(state,INCIDENTS);
          resolve(recorded?.choice ?? fallback);
        }
      }
      for (const c of recordedCommands) {
        if (c.type === 'incident') resolve(c.choiceId);
        if (c.type === 'mode' && schedule === 'recorded') {chooseMode(state, c.mode);commands.push(c);}
        if (c.type === 'end') {
          state.finished = true;
          state.log.push({tick:state.tick, type:'command', text:'Operational window ended early by flight director.'});
          commands.push(c);
        }
      }
      if (state.finished) break;
      for(const c of run.relayPolicyCommands??[])if(c.tick===state.tick)relayPolicy(state,c.policy);
      for(const c of run.sourcePolicyCommands??[])if(c.tick===state.tick)state.evidence.sourcePolicy=c.policy;
      let mode;
      if (schedule === 'transmit' && state.tick >= end) {
        const env = operationEnvironment(state);
        mode = (env.contactFraction ?? Number(env.contact)) > 0 && state.storageGb > 1e-9 ? 'downlink' : 'safe';
      }
      if (schedule === 'protect') {
        const inService = state.evidence.scenario.windows.some(([, start, stop]) => i >= start && i < stop);
        const env = operationEnvironment(state);
        mode = (design.orbitId === 'geo' && i >= end) || (!inService && (env.contactFraction ?? Number(env.contact)) < .15) ? 'safe' : 'auto';
      }
      if (mode && mode !== state.mode) {
        chooseMode(state, mode);
        commands.push({tick:state.tick, type:'mode', mode});
      }
      if (perturbation?.outageTick === state.tick)
        state.contactOutage = Math.max(state.contactOutage, perturbation.outageTicks);
      stepOperations(state);
    }
    summary = operationSummary(state);
  } else {
    state = attachPhysicalCruise(createCruise(design, mission, data, evalResult,
      {assumptions: SAIL_ASSUMPTIONS[assumption],systems:Boolean(initial.systems)}),trialRun);
    if (perturbation) state.hardware.rateGbDay *= perturbation.rateFactor;
    selectEncounterPlan(state, plan ?? initial.observationPlan);
    const recorded = initial.experimentCommands ?? [];
    let commandIndex = 0;
    for (let i = 0; i < 350 && !state.finished; i++) {
      const c = recorded[commandIndex];
      if (c && c.phase === state.phase && c.tick === state.tick && c.downlinkTicks === state.downlinkTicks) {
        if (cruiseCommand(state, c.command)) commands.push(c);
        else if (c.command === 'correct' && cruiseCommand(state, 'coast'))
          commands.push({...c, command:'coast', rejected:'Insufficient trim propellant for recorded correction'});
        else throw Error('Recorded transfer command is unavailable.');
        commandIndex++;
      } else if (state.pending) {
        const command = transferCommands[state.pending];
        if (!cruiseCommand(state, command)) throw Error('Flight command unavailable at ' + state.pending);
        commands.push({command, automatic:true});
      } else stepCruise(state);
    }
    summary = cruiseSummary(state);
  }
  return {
    format:'orbital-isolated-trial',scope,controls:scope==='deployment'?'Achieved deployment fixed; cannot establish launch feasibility':'Launcher/design rerun through ascent and selected transfer',
    confounded:[hardware,plan,assumption,schedule!=='recorded',perturbation].filter(Boolean).length>1,sourceBundle:run.sourceBundle??null,sourceProducts:run.sourceProducts??null,
    sourceRunId:run.runId ?? null, simulationVersion:run.simulationVersion,
    scoringVersion:SCIENCE_VERSION, missionId:mission.id, initialSeed:run.initialSeed,
    initialOrbit:initial.orbit ?? null, design, input, commands, state, summary,
    launchResult:fullLaunch??run.launchResult, gateIssues:hardwareTrial?.gateIssues ?? [],
    massKg:evalResult.launchMass, costM:evalResult.totalCost
  };
}

export function robustnessTrials(run, data) {
  return [211, 571, 887].map(seed => {
    const unit = ((Math.imul(seed, 2654435761) >>> 0) % 1000) / 1000;
    const perturbation = run.operations
      ? {seed, outageTick:24 + Math.floor(unit * 52), outageTicks:6}
      : {seed, rateFactor:.55 + unit * .35};
    return rerunExperiment(run, data, {perturbation});
  });
}
