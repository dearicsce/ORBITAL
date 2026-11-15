import * as THREE from 'three';

/**
 * Creates a LatheGeometry De Laval rocket nozzle with realistic converging-diverging bell curve.
 * Origin (0,0,0) is at the throat / gimbal mount, extending downstream along -Y.
 */
export function createDeLavalNozzle(throatR, exitR, length, material) {
  const points = [];
  const steps = 16;
  // Throat radius, expansion bell following parabolic contour
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = throatR + (exitR - throatR) * Math.pow(t, 0.72);
    const y = -t * length;
    points.push(new THREE.Vector2(r, y));
  }
  const geo = new THREE.LatheGeometry(points, 24);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Procedural Launch Vehicle generator using the Aegis design language.
 * Produces distinct silhouettes for Light, Medium, Heavy, and Super-Heavy classes.
 */
export function createLaunchVehicle(id, { upperOnly = false, custom = null } = {}) {
  const root = new THREE.Group();
  root.name = 'assembled_launch_vehicle';

  // Aegis Studio PBR Materials
  const matWhiteAero = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.20,
    roughness: 0.35
  });
  const matDarkCarbon = new THREE.MeshStandardMaterial({
    color: 0x1e2533,
    metalness: 0.45,
    roughness: 0.55
  });
  const matTitanium = new THREE.MeshStandardMaterial({
    color: 0xd0d7e2,
    metalness: 0.88,
    roughness: 0.24
  });
  const matNozzleBell = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.92,
    roughness: 0.32,
    side: THREE.DoubleSide
  });

  // Determine vehicle class and core diameter
  // Light: 1.8m (r=0.52), Medium: 2.8m (r=0.81), Heavy: 2.8m with Boosters, Super-Heavy: 3.5m+
  const isCustom = Boolean(custom);
  const shapeId = {skylark:'albatross',meridian:'condor',vanguard:'condor'}[id] ?? id;
  const coreDiameter = custom?.core?.diameterM || (shapeId === 'albatross' ? 1.8 : ['condor', 'atlas_upper'].includes(shapeId) ? 2.8 : 2.8);
  const isSuperHeavy = custom?.core?.id === 'core-helio' || id === 'super_heavy';
  const isHeavy = custom?.core?.id === 'core-frontier' || id === 'roc' || (!isSuperHeavy && custom?.booster?.count >= 2);
  const isLight = coreDiameter <= 1.8 && !isHeavy && !isSuperHeavy;

  const r = (coreDiameter * (isSuperHeavy ? 0.38 : 0.29));
  const upperDiameter = custom?.upper?.diameterM || coreDiameter;
  const upperR = upperDiameter * (isSuperHeavy ? 0.38 : 0.29);

  const lower = new THREE.Group();
  lower.name = 'stage_lower';
  lower.userData.flightPartId = 'core';

  const upper = new THREE.Group();
  upper.name = 'stage_upper';
  upper.userData.flightPartId = 'upper';

  const lowerH = isSuperHeavy ? 14.0 : isHeavy ? 12.0 : isLight ? 9.5 : 10.5;
  const upperH = isSuperHeavy ? 4.8 : isLight ? 2.6 : 3.4;
  upper.position.y = upperOnly ? 0 : lowerH + 0.25;

  const cylinder = (parent, name, rt, rb, h, y, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 48), mat);
    m.name = name;
    m.position.y = y;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // 1. Core / First Stage Tank
  cylinder(lower, 'first_stage_tank', r, r, lowerH, lowerH / 2, matWhiteAero);

  // Decorative aerodynamic raceway along the core
  const raceway = new THREE.Mesh(
    new THREE.BoxGeometry(r * 0.08, lowerH * 0.92, r * 0.08),
    matDarkCarbon
  );
  raceway.name = 'aerodynamic_raceway';
  raceway.position.set(r * 0.99, lowerH / 2, 0);
  lower.add(raceway);

  // Interstage section with dark carbon finish and structural stiffeners
  const interstageH = isSuperHeavy ? 1.4 : isLight ? 0.75 : 1.0;
  cylinder(lower, 'interstage', r * 1.01, r * 1.01, interstageH, lowerH - interstageH / 2, matDarkCarbon);

  // Vertical stiffener ribs around interstage
  const ribCount = isLight ? 8 : 16;
  for (let i = 0; i < ribCount; i++) {
    const angle = (i * Math.PI * 2) / ribCount;
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, interstageH * 0.9, 0.04),
      matTitanium
    );
    rib.position.set(Math.cos(angle) * r * 1.02, lowerH - interstageH / 2, Math.sin(angle) * r * 1.02);
    lower.add(rib);
  }

  // 2. Core Engine Cluster with LatheGeometry De Laval Nozzles
  const engineBaseY = 0.0;
  const engineMountPlate = cylinder(lower, 'engine_mount_plate', r * 0.95, r * 0.95, 0.2, engineBaseY + 0.1, matTitanium);

  // Determine engine count based on class
  let coreEngineCount = 1;
  if (isSuperHeavy) coreEngineCount = 7;
  else if (isHeavy) coreEngineCount = 5;
  else if (custom?.core?.port === '28' || id === 'condor') coreEngineCount = 3;
  else if (id === 'roc') coreEngineCount = 4;

  const nozzleThroatR = isLight ? r * 0.14 : r * 0.10;
  const nozzleExitR = isLight ? r * 0.32 : r * 0.24;
  const nozzleLen = isLight ? 0.65 : 0.75;

  for (let i = 0; i < coreEngineCount; i++) {
    const engine = createDeLavalNozzle(nozzleThroatR, nozzleExitR, nozzleLen, matNozzleBell);
    engine.name = i === 0 ? 'engine_bell' : `engine_bell_${i}`;
    engine.userData.flightEngineId = 'core';
    engine.position.y = engineBaseY;

    if (coreEngineCount === 1) {
      engine.position.set(0, engineBaseY, 0);
    } else if (coreEngineCount === 3) {
      const angle = (i * Math.PI * 2) / 3;
      engine.position.set(Math.cos(angle) * r * 0.45, engineBaseY, Math.sin(angle) * r * 0.45);
    } else if (coreEngineCount === 4) {
      const angle = (i * Math.PI * 2) / 4 + Math.PI / 4;
      engine.position.set(Math.cos(angle) * r * 0.48, engineBaseY, Math.sin(angle) * r * 0.48);
    } else if (coreEngineCount === 5) {
      if (i === 0) engine.position.set(0, engineBaseY, 0);
      else {
        const angle = ((i - 1) * Math.PI * 2) / 4;
        engine.position.set(Math.cos(angle) * r * 0.52, engineBaseY, Math.sin(angle) * r * 0.52);
      }
    } else if (coreEngineCount >= 7) {
      if (i === 0) engine.position.set(0, engineBaseY, 0);
      else {
        const angle = ((i - 1) * Math.PI * 2) / 6;
        engine.position.set(Math.cos(angle) * r * 0.58, engineBaseY, Math.sin(angle) * r * 0.58);
      }
    }
    lower.add(engine);
  }

  // Metallic tank weld rings along the core
  const weldSpacing = lowerH / 4;
  for (let y = weldSpacing * 0.5; y < lowerH - 0.5; y += weldSpacing) {
    cylinder(lower, 'tank_join', r * 1.006, r * 1.006, 0.03, y, matTitanium);
  }

  // 3. Upper Stage
  cylinder(upper, 'upper_stage_tank', upperR, upperR, upperH, upperH / 2 + 0.1, matWhiteAero);

  // Upper Stage De Laval Vacuum Engine (larger expansion ratio)
  const upperEngine = createDeLavalNozzle(upperR * 0.14, upperR * 0.54, 0.85, matNozzleBell);
  upperEngine.name = 'upper_engine';
  upperEngine.userData.flightEngineId = 'upper';
  upperEngine.position.y = 0.05;
  upper.add(upperEngine);

  // Payload adapter cone
  cylinder(upper, 'payload_adapter', upperR * 0.52, upperR * 0.85, 0.38, upperH + 0.25, matTitanium);
  root.add(upper);

  // 4. Fairings and Boosters (when complete stack)
  if (!upperOnly) {
    root.add(lower);

    // Aerodynamic Fairing Halves
    const fairingRadius = custom?.fairing?.radiusM ? custom.fairing.radiusM * 0.47 : r * 1.25;
    const fairingBaseY = lowerH + upperH + 0.45;
    const fairingPoints = [
      new THREE.Vector2(fairingRadius * 1.05, 0),
      new THREE.Vector2(fairingRadius * 1.15, 0.25),
      new THREE.Vector2(fairingRadius * 1.15, 2.2),
      new THREE.Vector2(fairingRadius * 0.95, 3.1),
      new THREE.Vector2(fairingRadius * 0.52, 3.8),
      new THREE.Vector2(0, 4.25)
    ];

    for (let i = 0; i < 2; i++) {
      const fairingMat = matWhiteAero.clone();
      fairingMat.side = THREE.DoubleSide;
      const fairing = new THREE.Mesh(
        new THREE.LatheGeometry(fairingPoints, 48, i * Math.PI, Math.PI),
        fairingMat
      );
      fairing.name = i ? 'fairing_right' : 'fairing_left';
      fairing.userData.flightPartId = i ? 'fairing-right' : 'fairing-left';
      fairing.position.y = fairingBaseY;
      fairing.castShadow = true;
      fairing.receiveShadow = true;
      root.add(fairing);
    }

    // Optional Solid Rocket Boosters (Heavy silhouette)
    const boosterCount = custom ? (custom.booster?.count || 0) : (id === 'roc' ? 4 : ['condor','vanguard'].includes(id) ? 2 : 0);
    const boosterH = lowerH * 0.72;
    const boosterR = r * 0.42;

    for (let i = 0; i < boosterCount; i++) {
      const booster = new THREE.Group();
      booster.name = `booster_${i}`;
      const angle = (i * Math.PI * 2) / boosterCount;
      booster.position.set(Math.cos(angle) * r * 1.68, 0, Math.sin(angle) * r * 1.68);
      booster.userData.flightPartId = `booster-${i}`;

      // Booster casing & slanted aerodynamic nosecone
      cylinder(booster, 'booster_case', boosterR, boosterR, boosterH, boosterH / 2 + 0.6, matWhiteAero);

      const noseCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, boosterR, 1.4, 32),
        matWhiteAero
      );
      noseCone.name = 'booster_nose';
      noseCone.position.y = boosterH + 1.3;
      booster.add(noseCone);

      // Booster De Laval gimballed nozzle
      const boosterNozzle = createDeLavalNozzle(boosterR * 0.22, boosterR * 0.58, 0.6, matNozzleBell);
      boosterNozzle.name = 'booster_nozzle';
      boosterNozzle.userData.flightEngineId = `booster-${i}`;
      boosterNozzle.position.y = 0.6;
      booster.add(boosterNozzle);

      // Attachment struts linking booster to core
      for (const strutY of [1.5, boosterH * 0.85]) {
        const strut = new THREE.Mesh(
          new THREE.BoxGeometry(r * 0.35, 0.08, 0.12),
          matTitanium
        );
        strut.position.set(-Math.cos(angle) * r * 0.28, strutY, -Math.sin(angle) * r * 0.28);
        booster.add(strut);
      }

      lower.add(booster);
    }
  }

  root.userData.visualModel = 'Aegis procedural launch stack; PBR De Laval geometry';
  return root;
}
