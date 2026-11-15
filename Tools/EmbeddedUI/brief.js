import {compatibleSavedBuilds} from '../workshop/compatibility.js';
import {difficultyLabel, REWARDS, missionDifficulty} from '../workshop/economy.js';
import {getState, setDesign, saveProgress} from '../state.js';
import {showScreen} from './router.js';
import {starterDesign, missionPrerequisite} from '../campaign.js';
import {missionImage, bindMissionImages} from './missionArt.js';
import {mountMissionDeck} from '../presentation/liveAdapterFacade.js';
import {mountPanel} from '../presentation/mountPanel.js';
import {missionBriefing} from '../unity/campaignPresentation.js';
import {bodyById, missionDestination} from '../campaignAtlas.js';
import {mountReferenceCraft,referenceForMission} from '../three/referenceCraft.js';
import {sourceCard} from '../unity/sourceUI.js';

export function renderBrief(container, data, choices = {}) {
  const state = getState();
  const mission = data.missions.find(entry => entry.id === state.currentDesign.missionId) || data.missions[0];
  if (mission.id === 'dip') {
    container.replaceChildren();
    return mountMissionDeck(container, data, 'brief');
  }

  const budget = (mission.budget || 320) * (data.difficulty[state.difficulty]?.budgetMultiplier || 1);
  const preset = starterDesign(mission, data, state.difficulty);
  const compatible = compatibleSavedBuilds(mission, data, state).length;
  const priorSelection = choices.blueprint || choices.library;
  const workshop = options => showScreen('workshop', {mission:true, ...options});
  const actions = {
    evidencePlan: value => {
      if(!['balanced','focused'].includes(value))return {ok:false,reason:'Unknown evidence plan.'};
      setDesign({evidencePlan:value});
      if(!saveProgress())return {ok:false,reason:'The observation plan could not be saved.'};
      panel.update(snapshot());
    },
    starter: () => workshop({preset}),
    next: () => workshop(priorSelection ? choices : {}),
    'my-satellites': () => workshop({library:true}),
    'new-satellite': () => workshop({newBuild:true}),
    approach: value => {
      const bundle = missionBriefing(mission, data).sourceAvailable;
      if (value && value !== bundle) return {ok:false, reason:'This archive is unavailable.'};
      setDesign({scienceBundleId:value || null});
      const saved = saveProgress();
      panel.update(snapshot());
      return saved ? {ok:true} : {ok:false, reason:'The mission approach could not be saved.'};
    },
  };
  function snapshot() {
    const selectedSource = getState().currentDesign.scienceBundleId;
    return {
      ...missionBriefing(mission, data, selectedSource), selectedSource,
      selectedPlan:getState().currentDesign.evidencePlan ?? 'balanced',
      metrics: [
        {label:'Mission budget', value:'$' + budget.toFixed(0) + 'M'},
        {label:'Design life', value:mission.targetLifetime + ' years'},
        {label:'Destination', value:mission.transfer ? bodyById(missionDestination(mission))?.name ?? mission.tag : data.orbits.find(orbit => orbit.id === preset.orbitId)?.name ?? mission.tag},
        {label:'Prerequisites', value:missionPrerequisite(mission, data) || 'None'},
        {label:'Difficulty', value:difficultyLabel(mission)},
        {label:'First-clear reward', value:(state.completedMissions[mission.id] ? 0 : REWARDS[missionDifficulty(mission)][0]) + ' coins'},
      ],
      actions: [
        {id:'starter', label:'Use mission preset', primary:!priorSelection},
        {id:'next', label:choices.blueprint ? 'Continue with ' + choices.blueprint.name : choices.library ? 'Choose your spacecraft' : 'Continue current build', primary:Boolean(priorSelection)},
        {id:'my-satellites', label:'My Satellites (' + compatible + ' compatible)'},
        {id:'new-satellite', label:'Build a new satellite'},
      ],
    };
  }
  const reference=referenceForMission(mission.id);
  container.innerHTML = '<section class="campaign-brief" data-screen="brief">' +
    '<header class="orbital-topbar"><button class="orbital-button" id="back">← Mission map</button><span>Mission briefing</span></header>' +
    '<div class="campaign-brief-body">' + (reference?'<aside id="mission-reference-model"></aside>':
      '<div class="campaign-brief-art">' + missionImage(mission) + '</div>') +
    '<main><div id="campaign-brief-panel"></div>' + sourceCard(mission.id) + '</main></div></section>';
  bindMissionImages(container);
  container.querySelector('#back').onclick = () => showScreen('missionSelect');
  const panel = mountPanel(container.querySelector('#campaign-brief-panel'), 'brief', snapshot(), actions);
  const cleanReference=reference?mountReferenceCraft(container.querySelector('#mission-reference-model'),reference):null;
  return ()=>{panel.destroy();cleanReference?.();};
}
