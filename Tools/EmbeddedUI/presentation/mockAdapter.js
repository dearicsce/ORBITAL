/**
 * Test-only mock adapter implementing GameAdapter interface from Docs/UI_HANDOFF.md.
 * Allows the presentation UI track to run offline verification against agreed mock fixtures.
 */

export const MOCK_FIXTURES = {
  title: {
    schemaVersion: 1,
    modelVersion: 'mock',
    missionId: 'catch-next-dip',
    runId: null,
    designRevision: null,
    route: 'title',
    phase: 'idle',
    canResume: false,
    issues: [],
    actions: {
      start: { enabled: true },
      openCampaign: { enabled: true }
    }
  },

  noSelection: {
    schemaVersion: 1,
    modelVersion: 'mock',
    missionId: 'catch-next-dip',
    runId: null,
    designRevision: null,
    route: 'brief',
    phase: 'choose',
    canResume: false,
    issues: [],
    brief: {
      title: 'Catch the Next Dip',
      objective: 'Two teams predict different times for this star to dim. You can look once.',
      scientificQuestion: 'Does star KIC 11446443 dip every 2.47 days (H1) or every 4.94 days (H2)?'
    },
    choices: {
      windows: [
        { id: 'A', label: 'Window A', archiveDate: '16 May 2009', archiveTimeBkjd: 135.116, predictions: { H1: 'Dip', H2: 'Flat' } },
        { id: 'B', label: 'Window B', archiveDate: '24 May 2009', archiveTimeBkjd: 142.528, predictions: { H1: 'Dip', H2: 'Dip' } },
        { id: 'C', label: 'Window C', archiveDate: '17 May 2009', archiveTimeBkjd: 136.000, predictions: { H1: 'Flat', H2: 'Flat' } }
      ]
    },
    plan: { windowId: null, prediction: null, recipeId: 'native', policyId: 'bracket', caseId: 'nominal' },
    actions: {
      chooseWindow: { enabled: true },
      setPrediction: { enabled: true },
      openWorkshop: { enabled: false, reasonCode: 'window_required', message: 'Choose an observation window to proceed to spacecraft assembly.' }
    }
  },

  blockedMount: {
    schemaVersion: 1,
    modelVersion: 'mock',
    missionId: 'catch-next-dip',
    runId: null,
    designRevision: 'mock-d3',
    route: 'workshop',
    phase: 'mount-check',
    canResume: false,
    scene: { available: true, view: 'hangar', effectsEnabled: true },
    issues: [{
      code: 'invalid_mount',
      severity: 'blocking',
      step: 'workshop',
      message: 'Solar wing mounting offset must be flush with the bus face (0 mm offset).',
      partIds: ['wing-left'],
      measurement: { value: 0.02, limit: 0.00, unit: 'm' },
      repair: { label: 'Snap flush', control: 'workshop', command: 'snapFlush' }
    }],
    actions: {
      selectPart: { enabled: true },
      movePart: { enabled: true },
      setCraftView: { enabled: true },
      saveDraft: { enabled: true },
      openLauncher: { enabled: false, reasonCode: 'invalid_mount' },
      snapFlush: { enabled: true },
      resetRotation: { enabled: false }
    }
  },

  blockedFit: {
    schemaVersion: 1,
    modelVersion: 'mock',
    missionId: 'catch-next-dip',
    runId: null,
    designRevision: 'mock-d7',
    route: 'workshop',
    phase: 'stowed-fit',
    canResume: false,
    scene: { available: true, view: 'stowed', effectsEnabled: true },
    issues: [{
      code: 'fairing_height',
      severity: 'blocking',
      step: 'launcher',
      message: "The stowed wing exceeds this fairing's usable height (2.31 m measured vs 2.00 m limit).",
      partIds: ['wing-right'],
      measurement: { value: 2.31, limit: 2.00, unit: 'm' },
      repair: { label: 'Choose taller fairing', control: 'launcher', command: 'openLauncher' }
    }],
    actions: {
      selectPart: { enabled: true },
      movePart: { enabled: true },
      setCraftView: { enabled: true },
      saveDraft: { enabled: true },
      openLauncher: { enabled: false, reasonCode: 'fairing_height' },
      snapFlush: { enabled: false },
      resetRotation: { enabled: false }
    }
  },

  validCraft: {
    schemaVersion: 1,
    modelVersion: 'mock',
    missionId: 'catch-next-dip',
    runId: null,
    designRevision: 'mock-d8',
    route: 'workshop',
    phase: 'ready',
    canResume: false,
    scene: { available: true, view: 'hangar', effectsEnabled: true },
    issues: [],
    actions: {
      selectPart: { enabled: true },
      movePart: { enabled: true },
      setCraftView: { enabled: true },
      saveDraft: { enabled: true },
      openLauncher: { enabled: true },
      snapFlush: { enabled: false },
      resetRotation: { enabled: false }
    },
    resources: {
      remainingWh: 12.0,
      capacityWh: 15.0,
      storeSlotsUsed: 3,
      storeSlotsTotal: 8,
      massKg: 3.8,
      massLimitKg: 4.0,
      creditsUsed: 5.5,
      creditsLimit: 9.0
    }
  }
};

export function createMockAdapter(initialStateKey = 'blockedMount') {
  let currentState = structuredClone(MOCK_FIXTURES[initialStateKey] || MOCK_FIXTURES.blockedMount);
  const listeners = new Set();

  function notify() {
    for (const cb of listeners) {
      try { cb(structuredClone(currentState)); } catch (e) { console.error('MockAdapter listener error:', e); }
    }
  }

  return {
    getState() {
      return structuredClone(currentState);
    },

    setState(fixtureKeyOrState) {
      if (typeof fixtureKeyOrState === 'string' && MOCK_FIXTURES[fixtureKeyOrState]) {
        currentState = structuredClone(MOCK_FIXTURES[fixtureKeyOrState]);
      } else if (typeof fixtureKeyOrState === 'object') {
        currentState = structuredClone(fixtureKeyOrState);
      }
      notify();
    },

    subscribe(callback) {
      listeners.add(callback);
      return () => { listeners.delete(callback); };
    },

    async preview(plan) {
      return {
        designRevision: currentState.designRevision,
        valid: currentState.issues.length === 0,
        issues: currentState.issues,
        energyNeedWh: 3.3,
        expectedPackets: 4
      };
    },

    async dispatch(command) {
      if (!command || !command.type) {
        return { accepted: false, reasonCode: 'invalid_command', message: 'Command type is required.' };
      }

      switch (command.type) {
        case 'snapFlush':
          currentState = structuredClone(MOCK_FIXTURES.validCraft);
          notify();
          return { accepted: true };

        case 'openLauncher':
          if (currentState.issues.length > 0) {
            return {
              accepted: false,
              reasonCode: currentState.issues[0].code,
              message: currentState.issues[0].message
            };
          }
          currentState.route = 'launcher';
          notify();
          return { accepted: true };

        case 'saveDraft':
          return { accepted: true, message: 'Draft saved.' };

        case 'setCraftView':
          if (currentState.scene) {
            currentState.scene.view = command.payload?.view || 'hangar';
          }
          notify();
          return { accepted: true };

        case 'kepler/setPlan':
          if (!currentState.plan) currentState.plan = {};
          Object.assign(currentState.plan, command.payload);
          notify();
          return { accepted: true };

        case 'kepler/setDesign':
          if (!currentState.design) currentState.design = {};
          Object.assign(currentState.design, command.payload);
          notify();
          return { accepted: true };

        case 'kepler/commit':
          currentState.route = 'flight';
          notify();
          return { accepted: true };

        case 'kepler/advance':
        case 'kepler/finish':
          currentState.route = 'report';
          notify();
          return { accepted: true };

        case 'kepler/retry':
          currentState.route = 'workshop';
          if (!currentState.history) currentState.history = [];
          currentState.history.push({ plan: { ...(currentState.plan || {}) }, design: { ...(currentState.design || {}) } });
          if (command.payload?.plan) Object.assign(currentState.plan, command.payload.plan);
          if (command.payload?.design) Object.assign(currentState.design, command.payload.design);
          notify();
          return { accepted: true };

        case 'kepler/finishMission':
          currentState.route = 'menu';
          notify();
          return { accepted: true };

        default:
          return { accepted: true };
      }
    }
  };
}
