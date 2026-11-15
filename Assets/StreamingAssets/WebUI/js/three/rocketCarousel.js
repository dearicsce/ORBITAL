import * as THREE from 'three';
import { loadLauncherModel } from './launcherModels.js';
import { createScene, disposeObject } from './sceneKit.js';

export const BAY_SPECS = [
  { id: 'skylark', bayIndex: 0, bayCode: 'BAY 01', pad: 'LC-41', defaultCost: 9, subtitle: '2-Stage Sounding Launcher · Clamshell Fairing' },
  { id: 'sprint', bayIndex: 1, bayCode: 'BAY 02', pad: 'LC-41', defaultCost: 10, subtitle: 'Carbon-Shell 3-Engine Sprint Launcher · Compact Fairing' },
  { id: 'kestrel', bayIndex: 2, bayCode: 'BAY 03', pad: 'LC-41', defaultCost: 12, subtitle: '5-Engine Light Core Launcher · Compact Earth Orbit' },
  { id: 'condor', bayIndex: 3, bayCode: 'BAY 04', pad: 'LC-39A', defaultCost: 45, subtitle: 'Medium Launcher with Twin Boosters · Earth Orbit' },
  { id: 'meridian', bayIndex: 4, bayCode: 'BAY 05', pad: 'LC-39A', defaultCost: 55, subtitle: 'Booster-Free Launcher with Expanded Fairing' },
  { id: 'asterion', bayIndex: 5, bayCode: 'BAY 06', pad: 'LC-39A', defaultCost: 62, subtitle: 'Twin-Booster Stack · Expanded Payload Shroud' },
  { id: 'albatross', bayIndex: 6, bayCode: 'BAY 07', pad: 'LC-39B', defaultCost: 110, subtitle: 'Heavy 2-Stage Launcher · Lunar Departure Stack' },
  { id: 'vanguard', bayIndex: 7, bayCode: 'BAY 08', pad: 'LC-39B', defaultCost: 138, subtitle: 'Twin-Booster Heavy Launcher · High Delta-V Stack' },
  { id: 'roc', bayIndex: 8, bayCode: 'BAY 09', pad: 'SLC-4E', defaultCost: 250, subtitle: '4-Booster Super-Heavy Launcher · Deep Space Injection' },
  { id: 'leviathan', bayIndex: 9, bayCode: 'BAY 10', pad: 'SLC-4E', defaultCost: 212, subtitle: '9-Engine Super-Heavy Core with 4 Liquid Boosters' }
];

const BAY_Z_COORDS = [-32, -16, 0, 16, 32];

function createHangarBayFloorTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Concrete micro-grain
  for (let i = 0; i < 2800; i++) {
    const x = (i * 97) % size;
    const y = (i * 151 + Math.floor(i / 64) * 29) % size;
    const shade = 14 + (i % 9);
    ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 22})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Expansion joint grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  const step = 64;
  for (let p = 0; p <= size; p += step) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
  ctx.lineWidth = 1;
  for (let p = 32; p < size; p += step) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function createHangarBaySignTexture(bayCode, vehicleTitle, isAccessible) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const accentHex = isAccessible ? '#38bdf8' : '#f59e0b';
  const statusText = isAccessible ? 'RAIL ROLLOUT SYSTEM: READY // STANDBY' : 'RESTRICTED // UNLOCK REQUIRED';

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 180);

  ctx.fillStyle = accentHex;
  ctx.fillRect(16, 18, 150, 44);

  ctx.fillStyle = '#020617';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bayCode, 91, 41);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('VERTICAL INTEGRATION & STORAGE', 182, 41);

  ctx.fillStyle = isAccessible ? '#f8fafc' : '#94a3b8';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(vehicleTitle.toUpperCase(), 22, 118);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(statusText, 22, 158);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRocketCarousel(container, options = {}) {
  const {
    launcherIds = BAY_SPECS.map(b => b.id),
    accessibleIds = [],
    lockedIds = [],
    selectedId = null,
    onSelect = () => {},
    data = null
  } = options;

  // Camera positioned to frame full height of scaled rocket on turntable
  const kit = createScene(container, {
    position: [0, 14.0, 58.0],
    target: [0, 12.0, 0],
    shadows: true,
    far: 2000
  });

  if (!kit.renderer) {
    kit.destroy();
    return { select() {}, destroy() {} };
  }

  // Rich atmospheric daylight sky background
  kit.scene.background = new THREE.Color('#38bdf8');

  // Hemisphere lighting for daytime sky and terrain bounce
  const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 1.3);
  kit.scene.add(hemi);

  // Directional sun light streaming through the glass windows
  kit.sun.position.set(35, 55, 30);
  kit.sun.intensity = 2.6;

  // Additional soft fill light from the opposite side
  const fillLight = new THREE.DirectionalLight(0xa5f3fc, 1.2);
  fillLight.position.set(-35, 30, -30);
  kit.scene.add(fillLight);

  // High-Bay Industrial Spotlights
  const centerSpot = new THREE.SpotLight(0xffffff, 4.5, 70, Math.PI / 4, 0.35, 1.0);
  centerSpot.position.set(0, 48, 0);
  centerSpot.target.position.set(0, 0, 0);
  kit.scene.add(centerSpot);
  kit.scene.add(centerSpot.target);

  // Outside landscape terrain visible through the panoramic glass walls
  const outsideTerrain = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x334839, roughness: 0.94, metalness: 0.05 })
  );
  outsideTerrain.rotation.x = -Math.PI / 2;
  outsideTerrain.position.y = -0.15;
  outsideTerrain.receiveShadow = true;
  kit.scene.add(outsideTerrain);

  // Outside crawlerway road leading to launch pads
  const crawlerway = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 400),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, metalness: 0.15 })
  );
  crawlerway.rotation.x = -Math.PI / 2;
  crawlerway.position.set(0, -0.12, 220);
  crawlerway.receiveShadow = true;
  kit.scene.add(crawlerway);

  // ==========================================================================
  // HANGAR 110 x 110 x 85 STRUCTURE & RECESSED RAILS
  // ==========================================================================
  const bayHalfSpan = 55.0;
  const bayHeight = 85.0;

  const hangarGroup = new THREE.Group();
  kit.scene.add(hangarGroup);

  const hangarFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.78 });
  const hangarCladdingLightMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.38, metalness: 0.58 });
  const hangarCladdingDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.52, metalness: 0.65 });
  const hangarSteelDeckMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45, metalness: 0.68 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });
  const hazardYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.45 });
  const brushedTitaniumMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
  const railTrackMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.82 });
  const warmLedStripMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  const nasaWhitePanelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.25 });
  const towerRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42, metalness: 0.35 });

  const hangarGlassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    metalness: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // 1. Industrial Concrete Bay Floor
  const floorTex = createHangarBayFloorTexture();
  const hangarFloor = new THREE.Mesh(
    new THREE.BoxGeometry(bayHalfSpan * 2, 0.36, bayHalfSpan * 2),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.86, metalness: 0.14 })
  );
  hangarFloor.position.y = 0.18;
  hangarFloor.receiveShadow = true;
  hangarGroup.add(hangarFloor);

  // 2. Central Circular Reinforced Steel Turntable Foundation
  const circularBaseFoundation = new THREE.Mesh(
    new THREE.CylinderGeometry(14.5, 15.4, 0.42, 64),
    hangarFrameMat
  );
  circularBaseFoundation.position.y = 0.38;
  circularBaseFoundation.receiveShadow = true;
  hangarGroup.add(circularBaseFoundation);

  const circularInnerSteelDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(13.2, 13.2, 0.24, 64),
    hangarSteelDeckMat
  );
  circularInnerSteelDeck.position.y = 0.68;
  circularInnerSteelDeck.receiveShadow = true;
  hangarGroup.add(circularInnerSteelDeck);

  // Safety perimeter ring
  const safetyPerimeterRing = new THREE.Mesh(
    new THREE.RingGeometry(12.2, 12.65, 64),
    hazardYellowMat
  );
  safetyPerimeterRing.rotation.x = -Math.PI / 2;
  safetyPerimeterRing.position.y = 0.82;
  hangarGroup.add(safetyPerimeterRing);

  // Radial titanium perimeter ribs
  for (let rIdx = 0; rIdx < 12; rIdx++) {
    const a = (rIdx / 12) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 5.2), brushedTitaniumMat);
    rib.position.set(Math.sin(a) * 9.4, 0.82, Math.cos(a) * 9.4);
    rib.rotation.y = a;
    hangarGroup.add(rib);
  }

  // 3. Central Rotating Turntable Group
  const turntableGroup = new THREE.Group();
  turntableGroup.position.y = 0.25;
  hangarGroup.add(turntableGroup);

  const turntableOuterCurb = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.6, 0.7, 64), hangarFrameMat);
  turntableOuterCurb.position.y = 0.35;
  turntableGroup.add(turntableOuterCurb);

  const turntablePlatter = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 6.7, 0.88, 64), darkSteelMat);
  turntablePlatter.position.y = 0.44;
  turntableGroup.add(turntablePlatter);

  const turntableRimRing = new THREE.Mesh(new THREE.RingGeometry(5.65, 5.95, 64), brushedTitaniumMat);
  turntableRimRing.rotation.x = -Math.PI / 2;
  turntableRimRing.position.y = 0.9;
  turntableGroup.add(turntableRimRing);

  // 8 Yellow Clamp Lugs around the platter
  for (let p = 0; p < 8; p++) {
    const pa = (p / 8) * Math.PI * 2;
    const clampLug = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 1.1), hazardYellowMat);
    clampLug.position.set(Math.sin(pa) * 5.2, 0.95, Math.cos(pa) * 5.2);
    clampLug.rotation.y = pa;
    turntableGroup.add(clampLug);
  }

  // Mount point for active vehicle on turntable
  const turntableMount = new THREE.Group();
  turntableMount.position.y = 0.9;
  turntableGroup.add(turntableMount);

  // 4. Recessed Floor Rail Tracks
  [-1.35, 1.35].forEach((rx) => {
    const spineRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 72.0), railTrackMat);
    spineRail.position.set(rx, 0.4, 0);
    hangarGroup.add(spineRail);
  });

  BAY_Z_COORDS.forEach((bz) => {
    [-1.1, 1.1].forEach((rzOff) => {
      const crossRail = new THREE.Mesh(new THREE.BoxGeometry(72.0, 0.07, 0.22), railTrackMat);
      crossRail.position.set(0, 0.39, bz + rzOff);
      hangarGroup.add(crossRail);
    });
  });

  // 5. Superstructure Columns & Perimeter Beams
  const columnCoords = [
    [-bayHalfSpan, -bayHalfSpan],
    [bayHalfSpan, -bayHalfSpan],
    [-bayHalfSpan, bayHalfSpan],
    [bayHalfSpan, bayHalfSpan],
    [-bayHalfSpan, -27.5],
    [-bayHalfSpan, 0],
    [-bayHalfSpan, 27.5],
    [bayHalfSpan, -27.5],
    [bayHalfSpan, 0],
    [bayHalfSpan, 27.5],
    [-27.5, -bayHalfSpan],
    [0, -bayHalfSpan],
    [27.5, -bayHalfSpan],
    [-24.0, bayHalfSpan],
    [24.0, bayHalfSpan]
  ];

  columnCoords.forEach(([cx, cz], idx) => {
    const isCorner = idx < 4;
    const colW = isCorner ? 4.2 : 2.8;
    const col = new THREE.Mesh(new THREE.BoxGeometry(colW, bayHeight, colW), hangarFrameMat);
    col.position.set(cx, bayHeight / 2, cz);
    col.castShadow = true;
    hangarGroup.add(col);

    const rib = new THREE.Mesh(new THREE.BoxGeometry(colW + 0.5, bayHeight - 3, 0.7), hangarCladdingLightMat);
    rib.position.set(cx, bayHeight / 2, cz);
    hangarGroup.add(rib);
  });

  // Horizontal Tie Beams at 4 Tiers
  [20.0, 42.0, 64.0, bayHeight - 1.8].forEach((tierY, tIdx) => {
    const isRoof = tIdx === 3;
    const beamH = isRoof ? 3.4 : 1.6;

    const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(2.2, beamH, bayHalfSpan * 2 + 3), isRoof ? hangarCladdingLightMat : hangarFrameMat);
    leftBeam.position.set(-bayHalfSpan, tierY, 0);
    hangarGroup.add(leftBeam);

    const rightBeam = new THREE.Mesh(new THREE.BoxGeometry(2.2, beamH, bayHalfSpan * 2 + 3), isRoof ? hangarCladdingLightMat : hangarFrameMat);
    rightBeam.position.set(bayHalfSpan, tierY, 0);
    hangarGroup.add(rightBeam);

    const rearBeam = new THREE.Mesh(new THREE.BoxGeometry(bayHalfSpan * 2 + 3, beamH, 2.2), isRoof ? hangarCladdingLightMat : hangarFrameMat);
    rearBeam.position.set(0, tierY, -bayHalfSpan);
    hangarGroup.add(rearBeam);

    if (isRoof) {
      const frontHeaderStrip = new THREE.Mesh(new THREE.BoxGeometry(bayHalfSpan * 2 + 3.4, 0.45, 2.5), hazardYellowMat);
      frontHeaderStrip.position.set(0, tierY, bayHalfSpan);
      hangarGroup.add(frontHeaderStrip);
    }
  });

  // 6. Side Observation Walls with Large Glass Windows
  const buildSideWall = (sideX) => {
    const sideGroup = new THREE.Group();
    sideGroup.position.set(sideX, 0, 0);
    hangarGroup.add(sideGroup);

    const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.0, bayHalfSpan * 2), hangarCladdingDarkMat);
    lowerWall.position.y = 4.0;
    sideGroup.add(lowerWall);

    const upperFascia = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12.0, bayHalfSpan * 2), hangarCladdingLightMat);
    upperFascia.position.y = bayHeight - 6.0;
    sideGroup.add(upperFascia);

    [-36.0, 0.0, 36.0].forEach((winZ) => {
      const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 62.0), hangarGlassMat);
      winGlass.rotation.y = Math.PI / 2;
      winGlass.position.set(0, 40.0, winZ);
      winGlass.renderOrder = 2;
      sideGroup.add(winGlass);
    });
  };
  buildSideWall(-bayHalfSpan);
  buildSideWall(bayHalfSpan);

  // 7. Rear Integration Wall with Wide Panoramic Window
  const rearLowerBulkhead = new THREE.Mesh(new THREE.BoxGeometry(bayHalfSpan * 2, 5.0, 1.4), hangarCladdingDarkMat);
  rearLowerBulkhead.position.set(0, 2.5, -bayHalfSpan);
  hangarGroup.add(rearLowerBulkhead);

  const rearUpperFascia = new THREE.Mesh(new THREE.BoxGeometry(bayHalfSpan * 2, 12.0, 1.6), hangarCladdingLightMat);
  rearUpperFascia.position.set(0, bayHeight - 6.0, -bayHalfSpan);
  hangarGroup.add(rearUpperFascia);

  [-43.0, 43.0].forEach((panelX) => {
    const solidCladPanel = new THREE.Mesh(new THREE.BoxGeometry(18.0, 68.0, 1.2), hangarCladdingDarkMat);
    solidCladPanel.position.set(panelX, 39.0, -bayHalfSpan);
    hangarGroup.add(solidCladPanel);

    const silverStripe = new THREE.Mesh(new THREE.BoxGeometry(12.0, 58.0, 1.35), hangarCladdingLightMat);
    silverStripe.position.set(panelX, 39.0, -bayHalfSpan);
    hangarGroup.add(silverStripe);
  });

  const rearCenterGlass = new THREE.Mesh(new THREE.PlaneGeometry(66.0, 68.0), hangarGlassMat);
  rearCenterGlass.position.set(0, 39.0, -bayHalfSpan);
  rearCenterGlass.renderOrder = 2;
  hangarGroup.add(rearCenterGlass);

  // 8. Front Facade & NASA VAB Emblems
  [-39.5, 39.5].forEach((flankX) => {
    const frontFlankWall = new THREE.Mesh(new THREE.BoxGeometry(31.0, bayHeight, 1.5), hangarCladdingDarkMat);
    frontFlankWall.position.set(flankX, bayHeight / 2, bayHalfSpan);
    hangarGroup.add(frontFlankWall);

    const frontSilverClad = new THREE.Mesh(new THREE.BoxGeometry(24.0, bayHeight - 12, 1.68), hangarCladdingLightMat);
    frontSilverClad.position.set(flankX, bayHeight / 2, bayHalfSpan);
    hangarGroup.add(frontSilverClad);
  });

  // US Flag on Left Flank
  const vabFlagBacking = new THREE.Mesh(new THREE.BoxGeometry(11.0, 18.0, 0.35), nasaWhitePanelMat);
  vabFlagBacking.position.set(-39.5, 56.0, bayHalfSpan + 0.95);
  hangarGroup.add(vabFlagBacking);

  const vabFlagCanton = new THREE.Mesh(new THREE.BoxGeometry(4.8, 8.2, 0.44), new THREE.MeshBasicMaterial({ color: 0x1e3a8a }));
  vabFlagCanton.position.set(-42.5, 60.8, bayHalfSpan + 0.98);
  hangarGroup.add(vabFlagCanton);

  for (let s = 0; s < 4; s++) {
    const flagStripe = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.2, 0.42), towerRedMat);
    flagStripe.position.set(-39.5, 48.5 + s * 4.4, bayHalfSpan + 0.97);
    hangarGroup.add(flagStripe);
  }

  // NASA Meatball Disc on Right Flank
  const vabMeatballDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0x1d4ed8 }));
  vabMeatballDisc.rotation.x = Math.PI / 2;
  vabMeatballDisc.position.set(39.5, 56.0, bayHalfSpan + 0.95);
  hangarGroup.add(vabMeatballDisc);

  // Rollout Portal Curtain Glass
  const rolloutHeader = new THREE.Mesh(new THREE.BoxGeometry(48.0, 13.0, 2.2), hangarFrameMat);
  rolloutHeader.position.set(0, bayHeight - 6.5, bayHalfSpan);
  hangarGroup.add(rolloutHeader);

  for (let leaf = 0; leaf < 3; leaf++) {
    const doorLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(44.0, 2.2, 2.5),
      leaf % 2 === 0 ? hangarCladdingLightMat : hazardYellowMat
    );
    doorLeaf.position.set(0, bayHeight - 14.5 + leaf * 2.6, bayHalfSpan + 0.25);
    hangarGroup.add(doorLeaf);
  }

  const portalGlassCurtain = new THREE.Mesh(new THREE.PlaneGeometry(48.0, 72.0), hangarGlassMat);
  portalGlassCurtain.position.set(0, 36.0, bayHalfSpan);
  portalGlassCurtain.renderOrder = 2;
  hangarGroup.add(portalGlassCurtain);

  // 9. Overhead Bridge Cranes & Vaulted Roof Trusses
  [-6.5, 6.5].forEach((craneZ) => {
    const bridgeGirder = new THREE.Mesh(new THREE.BoxGeometry(bayHalfSpan * 2 - 2.4, 2.1, 1.8), hazardYellowMat);
    bridgeGirder.position.set(0, bayHeight - 8.5, craneZ);
    hangarGroup.add(bridgeGirder);
  });

  const hoistTrolley = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.8, 15.0), darkSteelMat);
  hoistTrolley.position.set(0, bayHeight - 7.2, 0);
  hangarGroup.add(hoistTrolley);

  const craneHookBlock = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 1.8, 16), hazardYellowMat);
  craneHookBlock.position.set(0, bayHeight - 12.5, 0);
  hangarGroup.add(craneHookBlock);

  for (let rx = -45; rx <= 45; rx += 15) {
    const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, bayHalfSpan * 2), hangarFrameMat);
    roofBeam.position.set(rx, bayHeight - 0.9, 0);
    hangarGroup.add(roofBeam);

    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, bayHalfSpan * 2 - 8), warmLedStripMat);
    ledStrip.position.set(rx, bayHeight - 1.9, 0);
    hangarGroup.add(ledStrip);
  }

  // ==========================================================================
  // 10 STRUCTURAL STORAGE BAYS (5 LEFT, 5 RIGHT)
  // ==========================================================================
  const baySlots = [];
  const interactiveObjects = [];

  BAY_SPECS.forEach((bSpec) => {
    const isLeft = bSpec.bayIndex < 5;
    const rowIdx = bSpec.bayIndex % 5;
    const homeX = isLeft ? -34.0 : 34.0;
    const homeZ = BAY_Z_COORDS[rowIdx];

    const isAccessible = accessibleIds.length > 0 ? accessibleIds.includes(bSpec.id) : !lockedIds.includes(bSpec.id);

    const bayCellGroup = new THREE.Group();
    bayCellGroup.position.set(homeX, 0, homeZ);
    hangarGroup.add(bayCellGroup);

    // 4 upright gantry posts
    [
      [-5.0, -5.0],
      [5.0, -5.0],
      [-5.0, 5.0],
      [5.0, 5.0]
    ].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 32.0, 0.55), hangarFrameMat);
      post.position.set(cx, 16.0, cz);
      bayCellGroup.add(post);
    });

    // Catwalk platforms at y = 14 and 28
    [14.0, 28.0].forEach((py) => {
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 10.4), darkSteelMat);
      ledge.position.set(isLeft ? -4.6 : 4.6, py, 0);
      bayCellGroup.add(ledge);
    });

    // Overhead Header & Numbered Sign Board
    const headerCross = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 10.4), hangarFrameMat);
    headerCross.position.set(isLeft ? 5.0 : -5.0, 31.0, 0);
    bayCellGroup.add(headerCross);

    // Find custom name if provided in data
    let rocketDisplayName = bSpec.id.toUpperCase();
    if (data?.launchers) {
      const match = data.launchers.find(l => l.id === bSpec.id);
      if (match?.name) rocketDisplayName = match.name;
    }

    const signTex = createHangarBaySignTexture(bSpec.bayCode, rocketDisplayName, isAccessible);
    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(9.4, 2.2),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    signBoard.position.set(isLeft ? 5.38 : -5.38, 31.0, 0);
    signBoard.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
    bayCellGroup.add(signBoard);

    // Mobile Rollout Pallet on Floor
    const palletGroup = new THREE.Group();
    palletGroup.position.set(homeX, 0.35, homeZ);
    hangarGroup.add(palletGroup);

    const palletBase = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.55, 7.6), darkSteelMat);
    palletBase.position.y = 0.28;
    palletGroup.add(palletBase);

    const palletTrim = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.22, 7.8),
      isAccessible ? hazardYellowMat : new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 })
    );
    palletTrim.position.y = 0.18;
    palletGroup.add(palletTrim);

    palletBase.userData = { baySpec: bSpec, isAccessible };
    palletTrim.userData = { baySpec: bSpec, isAccessible };
    interactiveObjects.push(palletBase, palletTrim);

    const rocketHolder = new THREE.Group();
    rocketHolder.position.y = 0.55;
    palletGroup.add(rocketHolder);

    // Asynchronously load the 3D rocket model into this bay
    loadLauncherModel(bSpec.id).then((model) => {
      if (kit.dead) {
        disposeObject(model);
        return;
      }
      model.scale.setScalar(2.05);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.x = -center.x;
      model.position.z = -center.z;
      model.position.y = -box.min.y;

      if (!isAccessible) {
        // Dim and tint locked models slightly
        model.traverse((node) => {
          if (node.isMesh && node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => {
              if (m.color) m.color.multiplyScalar(0.72);
            });
          }
        });
      }

      model.traverse((node) => {
        if (node.isMesh) {
          node.userData = { baySpec: bSpec, isAccessible };
          interactiveObjects.push(node);
        }
      });

      rocketHolder.add(model);
    }).catch((err) => {
      console.warn(`Could not load bay rocket model for ${bSpec.id}:`, err);
    });

    baySlots.push({
      bSpec,
      homeX,
      homeZ,
      palletGroup,
      rocketHolder,
      isAccessible
    });
  });

  // ==========================================================================
  // ACTIVE ROCKET ON CENTRAL TURNTABLE
  // ==========================================================================
  let activeModel = null;
  let activeSelectedId = null;
  let revision = 0;

  function setTurntableRocket(id) {
    if (activeSelectedId === id && activeModel) return;
    activeSelectedId = id;
    const req = ++revision;

    loadLauncherModel(id).then((model) => {
      if (kit.dead || req !== revision) {
        disposeObject(model);
        return;
      }
      for (const prev of [...turntableMount.children]) {
        turntableMount.remove(prev);
        disposeObject(prev);
      }
      model.scale.setScalar(2.05);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.x = -center.x;
      model.position.z = -center.z;
      model.position.y = -box.min.y;
      turntableMount.add(model);
      activeModel = model;

      const height = box.max.y - box.min.y;
      const target = new THREE.Vector3(0, Math.min(13.5, height * 0.45 + 0.8), 0);
      if (kit.controls) {
        kit.controls.target.copy(target);
        kit.controls.update();
      }
    }).catch((err) => {
      console.warn(`Could not load active turntable model for ${id}:`, err);
    });
  }

  // Mount initial selection
  const initial = selectedId || (accessibleIds.length ? accessibleIds[0] : launcherIds[0]);
  if (initial) setTurntableRocket(initial);

  // ==========================================================================
  // CONTROLS & CONTINUOUS ROTATION
  // ==========================================================================
  if (kit.controls) {
    kit.controls.enablePan = false;
    kit.controls.maxPolarAngle = Math.PI * 0.485; // Never dip below floor
    kit.controls.minDistance = 15.0;
    kit.controls.maxDistance = 85.0;
  }

  const motionPref = matchMedia('(prefers-reduced-motion: reduce)');
  kit.draw = (dt) => {
    if (!motionPref.matches) {
      turntableGroup.rotation.y += dt * 0.28;
    }
  };

  // Click on bay rocket or pallet to select
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerDown(event) {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, kit.camera);
    const hits = raycaster.intersectObjects(interactiveObjects, false);
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      const data = hitObj.userData;
      if (data?.baySpec) {
        onSelect(data.baySpec.id);
      }
    }
  }

  container.addEventListener('pointerdown', onPointerDown);

  return {
    select(id) {
      setTurntableRocket(id);
    },
    destroy() {
      container.removeEventListener('pointerdown', onPointerDown);
      kit.destroy();
    }
  };
}
