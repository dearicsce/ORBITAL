import {metadata,mountPosition,surfaces,structure,propulsionPort,structuralProxies} from './structure.js';

const dot = (a,b) => a.reduce((s,n,i) => s + n*b[i], 0);
const add = (a,b) => a.map((n,i) => n + b[i]);
const sub = (a,b) => a.map((n,i) => n - b[i]);
const mul = (a,k) => a.map(n => n*k);
const cross = (a,b) => [
  a[1]*b[2] - a[2]*b[1],
  a[2]*b[0] - a[0]*b[2],
  a[0]*b[1] - a[1]*b[0]
];
const norm = v => Math.hypot(...v);
const unit = v => { const l = norm(v); return l > 1e-9 ? mul(v, 1/l) : [0,0,0]; };

/**
 * Compute the 8 corner vertices of an oriented box in world space.
 */
function computeOBBVertices(center, axes, halfSizes) {
  const vertices = [];
  for (const dx of [-1, 1]) {
    for (const dy of [-1, 1]) {
      for (const dz of [-1, 1]) {
        vertices.push(add(center,
          add(mul(axes[0], dx * halfSizes[0]),
          add(mul(axes[1], dy * halfSizes[1]),
              mul(axes[2], dz * halfSizes[2])))));
      }
    }
  }
  return vertices;
}

/**
 * Separating Axis Theorem (SAT) test between two 3D Oriented Bounding Boxes (OBBs).
 * Returns true if the two OBBs intersect, false if disjoint.
 */
export function testOBBOBB(obb1, obb2) {
  const T = sub(obb2.center, obb1.center);
  const A = obb1.axes;
  const B = obb2.axes;
  const a = obb1.halfSizes;
  const b = obb2.halfSizes;

  // Rotation matrix from B to A: R[i][j] = dot(A[i], B[j])
  const R = [
    [Math.abs(dot(A[0], B[0])), Math.abs(dot(A[0], B[1])), Math.abs(dot(A[0], B[2]))],
    [Math.abs(dot(A[1], B[0])), Math.abs(dot(A[1], B[1])), Math.abs(dot(A[1], B[2]))],
    [Math.abs(dot(A[2], B[0])), Math.abs(dot(A[2], B[1])), Math.abs(dot(A[2], B[2]))]
  ];

  const EPS = 1e-6;

  // 1. Test A's 3 coordinate axes
  for (let i = 0; i < 3; i++) {
    const ra = a[i];
    const rb = b[0] * R[i][0] + b[1] * R[i][1] + b[2] * R[i][2];
    if (Math.abs(dot(T, A[i])) > ra + rb + EPS) return false;
  }

  // 2. Test B's 3 coordinate axes
  for (let j = 0; j < 3; j++) {
    const ra = a[0] * R[0][j] + a[1] * R[1][j] + a[2] * R[2][j];
    const rb = b[j];
    if (Math.abs(dot(T, B[j])) > ra + rb + EPS) return false;
  }

  // 3. Test 9 cross-product axes: A[i] x B[j]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const axis = cross(A[i], B[j]);
      const l = norm(axis);
      if (l < 1e-4) continue; // Parallel edges
      const uaxis = mul(axis, 1 / l);

      const ra =
        a[0] * Math.abs(dot(A[0], uaxis)) +
        a[1] * Math.abs(dot(A[1], uaxis)) +
        a[2] * Math.abs(dot(A[2], uaxis));
      const rb =
        b[0] * Math.abs(dot(B[0], uaxis)) +
        b[1] * Math.abs(dot(B[1], uaxis)) +
        b[2] * Math.abs(dot(B[2], uaxis));

      if (Math.abs(dot(T, uaxis)) > ra + rb + EPS) return false;
    }
  }

  return true;
}

/**
 * Compute exact oriented bounding boxes for a component at a given fold angle.
 */
export function componentOBBs(busId, c, p, fold = 0) {
  if (c.bayId || metadata(p).internal) return [];
  const s = surfaces(busId)[c.attachmentSurfaceId];
  if (!s) return [];

  const normal = unit(s.normal);
  const u = unit(s.u);
  const v = unit(s.v);
  const origin = mountPosition(busId, c);

  if (p.type === 'panel') {
    const angleRad = (c.localRotation?.[1] || 0) * (Math.PI / 180);
    const cosM = Math.cos(angleRad);
    const sinM = Math.sin(angleRad);

    const normalM = normal;
    const vM = add(mul(v, cosM), mul(u, sinM));
    const negUM = add(mul(mul(u, -1), cosM), mul(v, sinM));

    const stand = metadata(p).wingLength * 0.19 + 0.08;
    const wingLength = metadata(p).wingLength;
    const wingHeight = wingLength * 0.38;
    const panelThickness = 0.035;

    // 1. Mount stand OBB
    const standCenter = add(origin, mul(normalM, stand / 2));
    const standAxes = [normalM, vM, negUM];
    const standHalfSizes = [stand / 2, 0.05, 0.05];
    const standOBB = {
      center: standCenter,
      axes: standAxes,
      halfSizes: standHalfSizes,
      vertices: computeOBBVertices(standCenter, standAxes, standHalfSizes)
    };

    // 2. Solar panel wing OBB
    const theta = Math.min(1, Math.max(0, fold)) * (Math.PI / 2);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const wingX = add(mul(normalM, cosT), mul(vM, sinT));
    const wingY = add(mul(mul(normalM, -1), sinT), mul(vM, cosT));
    const wingZ = negUM;

    const hingePos = add(origin, mul(normalM, stand));
    const panelCenter = add(hingePos, mul(wingX, wingLength / 2));
    const panelAxes = [wingX, wingY, wingZ];
    const panelHalfSizes = [wingLength / 2, wingHeight / 2, panelThickness / 2];
    const panelOBB = {
      center: panelCenter,
      axes: panelAxes,
      halfSizes: panelHalfSizes,
      vertices: computeOBBVertices(panelCenter, panelAxes, panelHalfSizes)
    };

    return [standOBB, panelOBB];
  } else {
    // Non-wing exterior equipment
    const angleRad = (c.localRotation?.[1] || 0) * (Math.PI / 180);
    const cosM = Math.cos(angleRad);
    const sinM = Math.sin(angleRad);

    const uM = add(mul(u, cosM), mul(v, -sinM));
    const normM = normal;
    const negVM = add(mul(mul(v, -1), cosM), mul(u, -sinM));

    const halfW = (p.externalHalfWidthM || 0.11);
    const halfH = (p.externalHeightM ? p.externalHeightM / 2 : 0.11);
    const halfD = (p.externalDepthM || 0.11);

    const center = add(origin, mul(normM, halfH));
    const axes = [uM, normM, negVM];
    const halfSizes = [halfW, halfH, halfD];

    return [{
      center,
      axes,
      halfSizes,
      vertices: computeOBBVertices(center, axes, halfSizes)
    }];
  }
}

/**
 * Oriented bounding proxy around external mounts and stowed/deployed wing volumes.
 */
export function externalProxy(busId, c, p, fold = 0) {
  if (c.bayId || metadata(p).internal) return null;

  const points = [];
  if (fold === 'sweep') {
    // Test 5 sweep steps to build conservative bounding points
    for (const f of [0, 0.25, 0.5, 0.75, 1.0]) {
      const obbs = componentOBBs(busId, c, p, f);
      for (const obb of obbs) {
        points.push(...obb.vertices);
      }
    }
  } else {
    const obbs = componentOBBs(busId, c, p, Number(fold) || 0);
    for (const obb of obbs) {
      points.push(...obb.vertices);
    }
  }

  if (!points.length) return null;

  return {
    min: [0, 1, 2].map(i => Math.min(...points.map(pt => pt[i]))),
    max: [0, 1, 2].map(i => Math.max(...points.map(pt => pt[i])))
  };
}

/**
 * Check if two components collide while stowed or along their deployment sweep paths.
 * Returns null if clear, or collision details if colliding.
 */
export function testSweepCollision(busId, itemA, itemB) {
  // Broad-phase check
  const boxA = externalProxy(busId, itemA.c, itemA.p, itemA.p.type === 'panel' ? 'sweep' : 0);
  const boxB = externalProxy(busId, itemB.c, itemB.p, itemB.p.type === 'panel' ? 'sweep' : 0);
  if (!boxA || !boxB) return null;

  const broadOverlap = [0, 1, 2].every(i =>
    Math.min(boxA.max[i], boxB.max[i]) - Math.max(boxA.min[i], boxB.min[i]) > 0.005
  );
  if (!broadOverlap) return null;

  // 1. Check stowed pose (fold = 1.0)
  const obbsStowedA = componentOBBs(busId, itemA.c, itemA.p, 1.0);
  const obbsStowedB = componentOBBs(busId, itemB.c, itemB.p, 1.0);
  for (const a of obbsStowedA) {
    for (const b of obbsStowedB) {
      if (testOBBOBB(a, b)) {
        return { collides: true, phase: 'stowed', stepA: 1.0, stepB: 1.0 };
      }
    }
  }

  // 2. Narrow phase: test oriented OBBs across 9 fine deployment steps
  const steps = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0];
  const stepsA = itemA.p.type === 'panel' ? steps : [0];
  const stepsB = itemB.p.type === 'panel' ? steps : [0];

  for (const stepA of stepsA) {
    const obbsA = componentOBBs(busId, itemA.c, itemA.p, stepA);
    for (const stepB of stepsB) {
      // If both are 1.0, we already checked stowed above
      if (stepA === 1.0 && stepB === 1.0) continue;
      const obbsB = componentOBBs(busId, itemB.c, itemB.p, stepB);
      for (const a of obbsA) {
        for (const b of obbsB) {
          if (testOBBOBB(a, b)) {
            return { collides: true, phase: 'deployment', stepA, stepB };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Find the true stowed envelope dimensions (radius and height) evaluated at actual points.
 */
export function stowedEnvelope(assembly, data) {
  const definitions = [...(data?.parts || []), ...(data?.instruments || [])];
  const busId = assembly.busId || 'bus_micro';
  const { w, h, d } = structure(busId);

  // Actual points on the bus structure
  const allPoints = [];
  for (const x of [-w / 2, w / 2]) {
    for (const y of [0, h]) {
      for (const z of [-d / 2, d / 2]) {
        allPoints.push({ pos: [x, y, z], partId: 'bus', partName: 'Spacecraft bus' });
      }
    }
  }

  // Actual points on placed external components in stowed pose
  for (const c of assembly.components) {
    if (c.placementStatus !== 'placed') continue;
    const p = definitions.find(d => d.id === c.catalogId);
    if (!p || metadata(p).internal) continue;
    const obbs = componentOBBs(busId, c, p, 1.0); // Fold = 1.0 (stowed)
    for (const obb of obbs) {
      for (const pt of obb.vertices) {
        allPoints.push({ pos: pt, partId: c.instanceId, partName: p.name });
      }
    }
  }

  let maxRadiusSq = 0;
  let maxRadiusPart = null;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxHeightPart = null;

  for (const item of allPoints) {
    const [x, y, z] = item.pos;
    const rSq = x * x + z * z;
    if (rSq > maxRadiusSq) {
      maxRadiusSq = rSq;
      maxRadiusPart = item;
    }
    if (y < minY) minY = y;
    if (y > maxY) {
      maxY = y;
      maxHeightPart = item;
    }
  }

  return {
    radiusM: Math.sqrt(maxRadiusSq),
    heightM: maxY - minY,
    minY,
    maxY,
    maxRadiusPart,
    maxHeightPart
  };
}

/**
 * Validates spacecraft engineering clearances and launcher fairing fit.
 */
export function geometryIssues(a, data, launcher = null) {
  if (!a?.busId) return [];

  const definitions = [...(data?.parts || []), ...(data?.instruments || [])];
  const parts = [];

  for (const c of a.components) {
    const p = definitions.find(d => d.id === c.catalogId);
    if (p && !metadata(p).internal && c.placementStatus === 'placed' && c.attachmentSurfaceId) {
      parts.push({ c, p });
    }
    if (p?.type === 'fuel' && c.placementStatus === 'placed' && Number.isSafeInteger(c.configuration.propulsionPort)) {
      const port = propulsionPort(a.busId, c.configuration.propulsionPort);
      parts.push({
        c: {
          ...c,
          attachmentSurfaceId: port.face,
          bayId: null,
          localPosition: [port.u, port.v, 0],
          localRotation: [0, 0, 0]
        },
        p: { ...p, type: 'thruster', externalHalfWidthM: 0.055, externalHeightM: 0.18 }
      });
    }
  }

  const issues = [];
  const reported = new Set();
  const hulls = structuralProxies(a.busId);

  // 1. Structural bus collision check (Check 1: mount_face / structural clearance)
  for (const item of parts) {
    const steps = item.p.type === 'panel' ? [0, 0.5, 1.0] : [0];
    let busCollision = false;
    for (const step of steps) {
      const obbs = componentOBBs(a.busId, item.c, item.p, step);
      for (const obb of obbs) {
        for (const pt of obb.vertices) {
          if (hulls.some(hull => hull.planes.every(plane => dot(pt, plane.normal) < plane.distance - 0.003))) {
            busCollision = true;
            break;
          }
        }
        if (busCollision) break;
      }
      if (busCollision) break;
    }
    if (busCollision) {
      issues.push({
        instanceId: item.c.instanceId,
        partIds: [item.c.instanceId],
        checkCategory: 'mount_face',
        code: 'bus_intersection',
        severity: 'blocking',
        step: 'workshop',
        message: item.p.name + ' intersects the structural bus proxy.',
        repair: {
          label: 'Offset mount',
          control: 'workshop',
          command: 'snapFlush',
          tip: 'Move mount or adjust angle so geometry does not penetrate the bus hull.'
        }
      });
    }
  }

  // 2. Part-to-part stowed and deployment sweep collision (Check 2: stowed_clearance & Check 3: deployment_clearance)
  for (let i = 0; i < parts.length; i++) {
    for (let j = 0; j < i; j++) {
      if (reported.has(i)) continue;
      const first = parts[i];
      const second = parts[j];
      const hit = testSweepCollision(a.busId, first, second);
      if (hit) {
        reported.add(i);
        const isStowed = hit.phase === 'stowed';
        issues.push({
          instanceId: first.c.instanceId,
          partIds: [first.c.instanceId, second.c.instanceId],
          checkCategory: isStowed ? 'stowed_clearance' : 'deployment_clearance',
          code: isStowed ? 'stowed_clearance' : 'deployment_clearance',
          severity: 'blocking',
          step: 'workshop',
          message: isStowed
            ? `${first.p.name} intersects ${second.p.name} while stowed (stowed/deployment clearance violation).`
            : `${first.p.name} intersects ${second.p.name} along deployment sweep path.`,
          repair: {
            label: isStowed ? 'Move mount' : 'Space mounts or shorter wing',
            control: 'workshop',
            command: 'moveMount',
            tip: isStowed
              ? 'Reposition or rotate wing mounts to provide folded clearance.'
              : 'Space wings further apart or choose a shorter wing span to ensure non-intersecting deployment arcs.'
          }
        });
      }
    }
  }

  // 3. Launcher fairing envelope check (Check 4: fairing_fit)
  if (launcher?.fairingRadiusM) {
    const envelope = stowedEnvelope(a, data);
    const fairingRadius = launcher.fairingRadiusM;
    const fairingHeight = launcher.fairingHeightM;

    if (envelope.radiusM > fairingRadius + 1e-4) {
      issues.push({
        instanceId: envelope.maxRadiusPart?.partId || 'bus',
        partIds: [envelope.maxRadiusPart?.partId || 'bus'],
        checkCategory: 'fairing_fit',
        code: 'fairing_radius',
        severity: 'blocking',
        step: 'launcher',
        measurement: { value: Number(envelope.radiusM.toFixed(3)), limit: fairingRadius, unit: 'm' },
        message: 'Stowed assembly radius (' + envelope.radiusM.toFixed(2) + ' m) exceeds the launcher’s educational fairing radius (' + fairingRadius.toFixed(2) + ' m).',
        repair: {
          label: 'Choose wider fairing',
          control: 'launcher',
          command: 'openLauncher',
          tip: 'Select a wider fairing or shorter wing to fit inside the payload envelope.'
        }
      });
    }

    if (envelope.heightM > fairingHeight + 1e-4) {
      issues.push({
        instanceId: envelope.maxHeightPart?.partId || 'bus',
        partIds: [envelope.maxHeightPart?.partId || 'bus'],
        checkCategory: 'fairing_fit',
        code: 'fairing_height',
        severity: 'blocking',
        step: 'launcher',
        measurement: { value: Number(envelope.heightM.toFixed(3)), limit: fairingHeight, unit: 'm' },
        message: 'Stowed assembly height (' + envelope.heightM.toFixed(2) + ' m) exceeds the launcher’s educational fairing height (' + fairingHeight.toFixed(2) + ' m).',
        repair: {
          label: 'Choose taller fairing',
          control: 'launcher',
          command: 'openLauncher',
          tip: 'Select a taller launcher fairing or reposition components lower on the bus.'
        }
      });
    }
  }

  return issues;
}
