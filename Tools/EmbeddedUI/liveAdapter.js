import { placementIssues, makeBlueprint, projectAssembly, copy, uid } from './workshop/blueprint.js';
import { geometryIssues, stowedEnvelope } from './workshop/collision.js';
import { surfaces, structure } from './workshop/structure.js';
import {
  ANCHOR,
  PERIOD,
  WINDOWS,
  BATTERIES,
  STORES,
  PROCESSORS,
  PROFILES,
  CASES,
  COSTS,
  COMPACT,
  WIDE,
  designStats as keplerDesignStats,
} from './kepler/keplerConfig.js';
import {
  predictionAt,
  predictsDip,
  disagreementOverlap,
} from './kepler/keplerPredictions.js';
import {
  selectSpan,
  preview as keplerPreviewCalc,
  freshAttempt,
  packetize,
  advance as advanceKepler,
  finish as finishKepler,
  evaluate as evaluateKepler,
  compareCases as compareKeplerCases,
} from './kepler/keplerMission.js';
import {
  mapOrbitalToKepler,
  FICTIONAL_ACCESS_PROFILE_DOC,
} from './kepler/keplerMapping.js';
import {
  buildTimeline,
  diagnoseCausalLimiter,
  calculateDeltas,
  generateStressMatrix,
} from './kepler/keplerInvestigation.js';

/**
 * Normalizes an issue from placementIssues or geometryIssues to the agreed UI contract Issue schema.
 */
function normalizeIssue(raw, defaultStep = 'workshop') {
  return {
    code: raw.code || 'placement_error',
    severity: raw.severity === 'error' || raw.severity === 'blocking' ? 'blocking' : 'warning',
    step: raw.step || defaultStep,
    message: raw.message || 'Validation error',
    partIds: raw.partIds || (raw.instanceId ? [raw.instanceId] : ['bus']),
    ...(raw.measurement ? { measurement: raw.measurement } : {}),
    ...(raw.repair ? { repair: raw.repair } : {}),
  };
}

/**
 * Creates a Live Game Adapter conforming to GameAdapter interface in Docs/UI_HANDOFF.md.
 */
export function createLiveAdapter(options = {}) {
  const data = options.data || { missions: [], parts: [], instruments: [], orbits: [], difficulty: {} };
  let blueprint = options.blueprint || makeBlueprint({ busId: 'bus_micro' }, data, 'Live Spacecraft');
  let launcher = options.launcher || { id: 'rocket_light', fairingRadiusM: 0.95, fairingHeightM: 2.50 };
  let route = options.initialRoute || 'workshop';
  let craftView = options.initialView || 'hangar';
  let selectedPartId = null;
  let runId = options.runId || null;
  let designRevision = 'rev-' + uid().slice(0, 8);
  let flightTelemetry = options.initialFlight || null;
  let effectsEnabled = options.initialEffects !== false;
  let paused = false;
  let speed = 1.0;
  let cameraMode = 'track';

  // Kepler Catch the Next Dip state
  let keplerDesign = { ...(options.keplerDesign || COMPACT) };
  let keplerPlan = {
    window: 'A',
    recipe: 'native',
    policy: 'bracket',
    caseId: 'nominal',
    prediction: null,
    ...(options.keplerPlan || {}),
  };
  let keplerAttempt = options.keplerAttempt ? { ...options.keplerAttempt } : null;
  let keplerCommitted = Boolean(options.keplerCommitted);
  let keplerHistory = options.keplerHistory ? [...options.keplerHistory] : [];

  const listeners = new Set();

  function validate() {
    const rawPlacement = placementIssues(blueprint.assembly, data);
    const rawGeometry = launcher ? geometryIssues(blueprint.assembly, data, launcher) : [];

    // De-duplicate by code + instanceId
    const seen = new Set();
    const result = [];
    for (const item of [...rawPlacement, ...rawGeometry]) {
      const key = (item.code || '') + ':' + (item.instanceId || '') + ':' + (item.message || '');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(normalizeIssue(item, item.code?.startsWith('fairing') ? 'launcher' : 'workshop'));
      }
    }
    return result;
  }

  function getSnapshot() {
    const issues = validate();
    const isBlocking = issues.some((i) => i.severity === 'blocking');
    const phase = issues.some((i) => i.code === 'invalid_mount' || i.code === 'disconnected_mount')
      ? 'mount-check'
      : issues.some((i) => i.code?.startsWith('fairing'))
      ? 'stowed-fit'
      : issues.length > 0
      ? 'craft-issues'
      : 'ready';

    // Derive Kepler model state
    const mapped = mapOrbitalToKepler(blueprint, data);
    const effectiveDesign = { ...mapped.design, ...keplerDesign };
    const kPreview = keplerPreviewCalc(effectiveDesign, keplerPlan);
    const kCases = compareKeplerCases(effectiveDesign, keplerPlan);
    const kEvidence = keplerAttempt?.ground?.length ? evaluateKepler(keplerAttempt.ground) : null;
    const kTimeline = buildTimeline(keplerAttempt || freshAttempt(0, effectiveDesign, keplerPlan), keplerPlan, keplerPlan.caseId || 'nominal');
    const kDiagnosis = diagnoseCausalLimiter(keplerAttempt || freshAttempt(0, effectiveDesign, keplerPlan), kEvidence || { adequate: false }, keplerPlan, keplerPlan.caseId || 'nominal');
    const kStressMatrix = generateStressMatrix(effectiveDesign, keplerPlan);
    const prevRun = keplerHistory.length > 0 ? keplerHistory[keplerHistory.length - 1] : null;
    const kDeltas = prevRun ? calculateDeltas(prevRun, { attempt: keplerAttempt, evidence: kEvidence }) : null;

    const snap = {
      schemaVersion: 1,
      modelVersion: 'live',
      missionId: options.missionId || 'catch-next-dip',
      runId,
      designRevision,
      route,
      phase,
      canResume: false,
      scene: {
        available: true,
        view: craftView,
        effectsEnabled: effectsEnabled,
      },
      issues,
      actions: {
        selectPart: { enabled: route === 'workshop' },
        movePart: { enabled: route === 'workshop' },
        setCraftView: { enabled: true },
        saveDraft: { enabled: route === 'workshop' },
        openLauncher: {
          enabled: route === 'workshop' && !isBlocking,
          ...(isBlocking ? { reasonCode: issues[0].code, message: issues[0].message } : {}),
        },
        snapFlush: {
          enabled: issues.some(
            (i) => i.repair?.command === 'snapFlush' || i.code === 'disconnected_mount' || i.code === 'invalid_mount'
          ),
        },
        resetRotation: {
          enabled: issues.some((i) => i.repair?.command === 'resetRotation' || i.code === 'mount_tilt'),
        },
        setPaused: { enabled: route === 'flight' },
        setSpeed: { enabled: route === 'flight' },
        setCamera: { enabled: route === 'flight' },
        setEffects: { enabled: true },
        skipToCalculatedResult: { enabled: route === 'flight' },
        deploy: { enabled: route === 'flight' && flightTelemetry?.stage === 'orbit' },
        // Kepler actions
        keplerSetPlan: { enabled: true },
        keplerSetDesign: { enabled: !keplerCommitted },
        keplerCommit: { enabled: kPreview.issues.length === 0 && !isBlocking },
        keplerAdvance: { enabled: Boolean(keplerAttempt && keplerAttempt.stage !== 'complete') },
        keplerFinish: { enabled: true },
        keplerRetry: { enabled: true },
      },
      resources: {
        remainingWh: keplerAttempt ? keplerAttempt.energy : effectiveDesign ? BATTERIES[effectiveDesign.battery].wh : 12.0,
        capacityWh: effectiveDesign ? BATTERIES[effectiveDesign.battery].wh : 15.0,
        storeSlotsUsed: keplerAttempt ? keplerAttempt.stored.length + keplerAttempt.queue.length : blueprint.assembly.components.length,
        storeSlotsTotal: effectiveDesign ? STORES[effectiveDesign.store].slots : 12,
        massKg: mapped.realValues.totalMassKg,
        massLimitKg: 150.0,
        creditsUsed: mapped.teachingValues.credits,
        creditsLimit: 9.0,
      },
      kepler: {
        manifestId: 'kepler-q1-v1',
        datasetChecksum: '10bfca91bdd928deda2e638de7a27cdc940b879452408a96b5be6146944639e9',
        narrative:
          'Two teams expect this star to dim on different schedules. You can look once. Choose when to look so the readings that reach Earth tell the two predictions apart.',
        scientificQuestion: 'Does star KIC 11446443 dim every 2.47 days (H1) or every 4.94 days (H2)?',
        windows: WINDOWS,
        tutorial: {
          center: ANCHOR,
          label: 'Known shared event at T0 (132.65 BKJD)',
          description: 'Archive witness reveals both hypotheses predict a dip here with returned baseline before and after.',
        },
        design: effectiveDesign,
        plan: keplerPlan,
        preview: kPreview,
        attempt: keplerAttempt
          ? {
              id: keplerAttempt.id,
              stage: keplerAttempt.stage,
              energy: keplerAttempt.energy,
              storedCount: keplerAttempt.stored.length,
              queueCount: keplerAttempt.queue.length,
              ground: keplerAttempt.ground,
              excluded: keplerAttempt.excluded,
              ledger: keplerAttempt.ledger,
              failed: keplerAttempt.failed,
            }
          : null,
        evidence: kEvidence,
        cases: kCases,
        mapping: mapped,
        timeline: kTimeline,
        diagnosis: kDiagnosis,
        stressMatrix: kStressMatrix,
        deltas: kDeltas,
        history: keplerHistory,
        accessProfileDoc: FICTIONAL_ACCESS_PROFILE_DOC,
      },
    };

    if (route === 'flight' || flightTelemetry) {
      snap.flight = flightTelemetry || {
        tPlusS: 0,
        altitudeM: 0,
        speedMps: 0,
        stage: 'pad',
        burnActive: true,
        eventLabel: 'Liftoff · T+0.0s',
      };
    }

    return snap;
  }

  function notify() {
    const snap = getSnapshot();
    for (const cb of listeners) {
      try {
        cb(snap);
      } catch (e) {
        console.error('Adapter listener error:', e);
      }
    }
  }

  return {
    getState() {
      return getSnapshot();
    },

    subscribe(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    async preview(plan) {
      const issues = validate();
      const mapped = mapOrbitalToKepler(blueprint, data);
      const effectiveDesign = { ...mapped.design, ...keplerDesign };
      const effectivePlan = plan ? { ...keplerPlan, ...plan } : keplerPlan;
      const kPreview = keplerPreviewCalc(effectiveDesign, effectivePlan);

      return {
        designRevision,
        valid: issues.length === 0 && kPreview.issues.length === 0,
        issues: [...issues, ...kPreview.issues.map((msg) => ({ code: 'kepler_preview_issue', severity: 'blocking', step: 'workshop', message: msg }))],
        energyNeedWh: kPreview.energy,
        expectedPackets: kPreview.expected,
        rawCount: kPreview.rawCount,
      };
    },

    async dispatch(command) {
      if (!command || !command.type) {
        return { accepted: false, reasonCode: 'invalid_command', message: 'Command type is required.' };
      }

      switch (command.type) {
        case 'selectPart': {
          selectedPartId = command.payload?.partId || null;
          notify();
          return { accepted: true };
        }

        case 'movePart': {
          const { partId, localPosition, localRotation, attachmentSurfaceId } = command.payload || {};
          const c = blueprint.assembly.components.find((comp) => comp.instanceId === partId);
          if (!c) return { accepted: false, reasonCode: 'part_not_found', message: `Component ${partId} not found.` };
          if (localPosition) c.localPosition = [...localPosition];
          if (localRotation) c.localRotation = [...localRotation];
          if (attachmentSurfaceId) c.attachmentSurfaceId = attachmentSurfaceId;
          c.placementStatus = 'placed';
          designRevision = 'rev-' + uid().slice(0, 8);
          notify();
          return { accepted: true };
        }

        case 'snapFlush': {
          const targetId = command.payload?.partId || selectedPartId;
          const comps = targetId
            ? blueprint.assembly.components.filter((comp) => comp.instanceId === targetId)
            : blueprint.assembly.components;

          for (const c of comps) {
            c.localPosition[2] = 0; // Snap normal offset flush
            const s = surfaces(blueprint.assembly.busId)[c.attachmentSurfaceId];
            if (s) {
              const maxU = s.size[0] / 2 - 0.05;
              const maxV = s.size[1] / 2 - 0.05;
              c.localPosition[0] = Math.max(-maxU, Math.min(maxU, c.localPosition[0]));
              c.localPosition[1] = Math.max(-maxV, Math.min(maxV, c.localPosition[1]));
            }
          }
          designRevision = 'rev-' + uid().slice(0, 8);
          notify();
          return { accepted: true };
        }

        case 'resetRotation': {
          const targetId = command.payload?.partId || selectedPartId;
          const comps = targetId
            ? blueprint.assembly.components.filter((comp) => comp.instanceId === targetId)
            : blueprint.assembly.components;

          for (const c of comps) {
            c.localRotation = [0, 0, 0];
          }
          designRevision = 'rev-' + uid().slice(0, 8);
          notify();
          return { accepted: true };
        }

        case 'setCraftView': {
          craftView = command.payload?.view || 'hangar';
          notify();
          return { accepted: true };
        }

        case 'setLauncher': {
          if (command.payload?.launcher) {
            launcher = command.payload.launcher;
          }
          designRevision = 'rev-' + uid().slice(0, 8);
          notify();
          return { accepted: true };
        }

        case 'saveDraft': {
          blueprint.updatedAt = new Date().toISOString();
          designRevision = 'rev-' + uid().slice(0, 8);
          notify();
          return { accepted: true, message: 'Draft saved.' };
        }

        case 'openLauncher': {
          const issues = validate();
          const blocking = issues.find((i) => i.severity === 'blocking');
          if (blocking) {
            return {
              accepted: false,
              reasonCode: blocking.code,
              message: blocking.message,
            };
          }
          route = 'launcher';
          notify();
          return { accepted: true };
        }

        case 'openWorkshop': {
          route = 'workshop';
          notify();
          return { accepted: true };
        }

        case 'setPaused': {
          paused = Boolean(command.payload?.paused);
          notify();
          return { accepted: true };
        }

        case 'setSpeed': {
          speed = Number(command.payload?.speed) || 1.0;
          notify();
          return { accepted: true };
        }

        case 'setCamera': {
          cameraMode = command.payload?.camera || 'track';
          notify();
          return { accepted: true };
        }

        case 'setEffects':
        case 'flight/setEffects': {
          effectsEnabled = typeof command.payload === 'boolean'
            ? command.payload
            : Boolean(command.payload?.enabled ?? command.payload?.effectsEnabled ?? true);
          notify();
          return { accepted: true };
        }

        case 'skipToCalculatedResult': {
          route = 'flight';
          flightTelemetry = {
            tPlusS: 580,
            altitudeM: 550000,
            speedMps: 7600,
            stage: 'orbit',
            burnActive: false,
            eventLabel: 'Orbital insertion confirmed',
          };
          notify();
          return { accepted: true };
        }

        case 'deploy': {
          if (flightTelemetry?.stage === 'orbit') {
            flightTelemetry.eventLabel = 'Spacecraft deployed into orbit';
            notify();
            return { accepted: true };
          }
          return { accepted: false, reasonCode: 'not_in_orbit', message: 'Spacecraft can only deploy after orbital insertion.' };
        }

        // --- Kepler Mission Commands ---
        case 'kepler/setPlan': {
          keplerPlan = { ...keplerPlan, ...command.payload };
          notify();
          return { accepted: true };
        }

        case 'kepler/setDesign': {
          if (keplerCommitted) {
            return { accepted: false, reasonCode: 'hardware_locked', message: 'Hardware design is frozen for this mission attempt.' };
          }
          keplerDesign = { ...keplerDesign, ...command.payload };
          designRevision = 'rev-' + uid().slice(0, 8);
          notify();
          return { accepted: true };
        }

        case 'kepler/commit': {
          const mapped = mapOrbitalToKepler(blueprint, data);
          const effectiveDesign = { ...mapped.design, ...keplerDesign };
          const kPreview = keplerPreviewCalc(effectiveDesign, keplerPlan);
          if (kPreview.issues.length > 0) {
            return { accepted: false, reasonCode: 'preview_issues', message: kPreview.issues.join(' ') };
          }
          keplerCommitted = true;
          keplerAttempt = freshAttempt(Date.now(), effectiveDesign, keplerPlan);
          notify();
          return { accepted: true, attemptId: keplerAttempt.id };
        }

        case 'kepler/advance': {
          const mapped = mapOrbitalToKepler(blueprint, data);
          const effectiveDesign = { ...mapped.design, ...keplerDesign };
          if (!keplerAttempt) {
            keplerAttempt = freshAttempt(Date.now(), effectiveDesign, keplerPlan);
          }
          keplerAttempt = advanceKepler(keplerAttempt);
          notify();
          return { accepted: true, stage: keplerAttempt.stage, failed: keplerAttempt.failed };
        }

        case 'kepler/finish': {
          const mapped = mapOrbitalToKepler(blueprint, data);
          const effectiveDesign = { ...mapped.design, ...keplerDesign };
          if (!keplerAttempt) {
            keplerAttempt = freshAttempt(Date.now(), effectiveDesign, keplerPlan);
          }
          keplerAttempt = finishKepler(keplerAttempt);
          notify();
          return { accepted: true, stage: keplerAttempt.stage, groundPackets: keplerAttempt.ground.length };
        }

        case 'kepler/retry': {
          // Retry resets resources and ledgers, freezing a fresh snapshot while preserving modified design/plan
          const mapped = mapOrbitalToKepler(blueprint, data);
          const effectiveDesign = { ...mapped.design, ...keplerDesign };
          if (keplerAttempt) {
            const ev = keplerAttempt.ground.length ? evaluateKepler(keplerAttempt.ground) : null;
            keplerHistory.push({
              attempt: { ...keplerAttempt },
              evidence: ev,
              plan: { ...keplerPlan },
              design: { ...effectiveDesign },
              prediction: command.payload?.prediction || keplerPlan.prediction || null,
            });
          }
          keplerCommitted = false;
          if (command.payload?.plan) keplerPlan = { ...keplerPlan, ...command.payload.plan };
          if (command.payload?.design) keplerDesign = { ...keplerDesign, ...command.payload.design };
          keplerAttempt = freshAttempt(Date.now(), { ...mapped.design, ...keplerDesign }, keplerPlan);
          if (command.payload?.autoFinish) {
            keplerAttempt = finishKepler(keplerAttempt);
          }
          notify();
          return { accepted: true, message: 'Fresh attempt initialized with reset resources.', attemptId: keplerAttempt.id };
        }

        case 'kepler/finishMission': {
          route = 'menu';
          notify();
          return { accepted: true };
        }

        default:
          return { accepted: false, reasonCode: 'unsupported_command', message: `Command ${command.type} not supported.` };
      }
    },

    // For testing / inspection
    getBlueprint() {
      return copy(blueprint);
    },
    setBlueprint(b) {
      blueprint = copy(b);
      designRevision = 'rev-' + uid().slice(0, 8);
      notify();
    },
    setFlightTelemetry(telemetry) {
      flightTelemetry = telemetry ? { ...telemetry } : null;
      notify();
    },
    setRoute(r) {
      route = r;
      notify();
    },
    getKeplerAttempt() {
      return keplerAttempt ? { ...keplerAttempt } : null;
    },
    setKeplerPlan(p) {
      keplerPlan = { ...keplerPlan, ...p };
      notify();
    },
    setKeplerDesign(d) {
      keplerDesign = { ...keplerDesign, ...d };
      notify();
    },
  };
}
