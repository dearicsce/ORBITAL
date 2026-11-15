import {compatibleSavedBuilds} from '../workshop/compatibility.js';
import {difficultyLabel, REWARDS, missionDifficulty} from '../workshop/economy.js';
import {getState, setDesign, saveProgress} from '../state.js';
import {showScreen} from './router.js';
import {starterDesign, missionPrerequisite} from '../campaign.js';
import {missionImage, bindMissionImages, featuredMissions, featuredArt} from './missionArt.js';
import {leavePracticeProfile} from '../unity/practiceProfile.js';
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
    'adapt-m2': () => workshop({adaptFrom:'m2'}),
    'adapt-scout': () => workshop({adaptFrom:'mars-scout'}),
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
        {id:'starter', label:'Use mission preset', primary:!priorSelection && mission.id !== 'relay' && mission.id !== 'mars-orbiter'},
        ...(mission.id === 'relay' ? [{id:'adapt-m2', label:'Adapt Remote Links Spacecraft →', primary:true}] : []),
        ...(mission.id === 'mars-orbiter' ? [{id:'adapt-scout', label:'Adapt Mars Scout Spacecraft →', primary:true}] : []),
        {id:'next', label:choices.blueprint ? 'Continue with ' + choices.blueprint.name : choices.library ? 'Choose your spacecraft' : 'Continue current build', primary:Boolean(priorSelection)},
        {id:'my-satellites', label:'My Satellites (' + compatible + ' compatible)'},
        {id:'new-satellite', label:'Build a new satellite'},
      ],
    };
  }
  const reference=referenceForMission(mission.id);
  const adaptNotice = mission.id === 'relay'
    ? '<div class="adaptation-brief-callout" style="margin: 0.8rem 0; padding: 0.8rem; background: rgba(127, 224, 248, 0.08); border-left: 3px solid #7fe0f8; border-radius: 4px;"><h4 style="margin: 0 0 0.3rem; color: #7fe0f8; font-size: 0.9rem;">Inherited Design Adaptation Available</h4><p style="margin: 0; font-size: 0.82rem; color: #a7b7c4; line-height: 1.4;">This mission can inherit the spacecraft design from <strong>Remote Links (Earth LEO)</strong>. Translunar departure and far-side lunar occultation will require upgrading battery Wh, recorder capacity, and propulsion mass.</p></div>'
    : mission.id === 'mars-orbiter'
      ? '<div class="adaptation-brief-callout" style="margin: 0.8rem 0; padding: 0.8rem; background: rgba(127, 224, 248, 0.08); border-left: 3px solid #7fe0f8; border-radius: 4px;"><h4 style="margin: 0 0 0.3rem; color: #7fe0f8; font-size: 0.9rem;">Inherited Design Adaptation Available</h4><p style="margin: 0; font-size: 0.82rem; color: #a7b7c4; line-height: 1.4;">This mission can inherit the spacecraft design from <strong>Mars Scout (Flyby)</strong>. Entering Martian orbit rather than flying by requires retro-propulsion capture fuel, larger solar arrays (43% solar flux at 1.52 AU), and recorder upgrades.</p></div>'
      : '';
  container.innerHTML = '<section class="campaign-brief" data-screen="brief">' +
    '<header class="orbital-topbar"><button class="orbital-button" id="back">'+(state.practiceMode?'← Return to campaign':'← Mission map')+'</button><span>'+(state.practiceMode?'Isolated practice':'Mission briefing')+'</span></header>' +
    '<div class="campaign-brief-body">' + (reference?'<aside id="mission-reference-model"></aside>':
      '<div class="campaign-brief-art">' + (featuredMissions[mission.id]?featuredArt(mission.id):missionImage(mission)) + '</div>') +
    '<main><div id="campaign-brief-panel"></div>' + adaptNotice + sourceCard(mission.id) + '</main></div></section>';
  bindMissionImages(container);
  container.querySelector('#back').onclick = () => {
    if (!state.practiceMode || !leavePracticeProfile()) showScreen('missionSelect');
  };
  const panel = mountPanel(container.querySelector('#campaign-brief-panel'), 'brief', snapshot(), actions);
  const cleanReference=reference?mountReferenceCraft(container.querySelector('#mission-reference-model'),reference):null;
  return ()=>{panel.destroy();cleanReference?.();};
}
