// Procedural 3D primitive fallbacks for spacecraft, launch vehicles, and instruments
import * as THREE from 'three';
import { scenery } from './scenery.js';

export function createPrimitiveFallback(id) {
  if (['observatory','ground_station'].includes(id)) return scenery(id);
  const root = new THREE.Group();
  root.name = `fallback_${id}`;

  if (['kestrel', 'condor', 'albatross', 'roc'].includes(id)) {
    buildRocket(root, id);
  } else if (id === 'launch_tower') {
    buildLaunchTower(root);
  } else if (id.startsWith('bus_')) {
    buildBus(root, id);
  } else if (id.startsWith('solar_wing_')) {
    buildSolarWing(root, id);
  } else if (id.startsWith('comms_')) {
    buildComms(root, id);
  } else if (id.startsWith('fuel_')) {
    buildFuel(root, id);
  } else if (id.startsWith('battery_')) {
    buildBattery(root, id);
  } else {
    buildInstrument(root, id);
  }

  return root;
}

function buildRocket(root, id) {
  const configs = {
    kestrel: { radius: 0.35, height: 7.0, boosters: 0, color: 0xe2e8f0 },
    condor: { radius: 0.55, height: 8.5, boosters: 2, color: 0x94a3b8 },
    albatross: { radius: 0.85, height: 10.5, boosters: 4, color: 0x0284c7 },
    roc: { radius: 1.2, height: 12.0, boosters: 6, color: 0x0f172a }
  };
  const cfg = configs[id] || configs.kestrel;

  // Main rocket core
  const coreMat = new THREE.MeshStandardMaterial({ color: cfg.color, metalness: 0.4, roughness: 0.4 });
  const coreGeo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.height, 24);
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = cfg.height / 2;
  root.add(core);

  // Nose cone
  const coneHeight = cfg.radius * 2.2;
  const coneGeo = new THREE.ConeGeometry(cfg.radius, coneHeight, 24);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.5 });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = cfg.height + coneHeight / 2;
  root.add(cone);

  // 4 Stabilizing Fins at base
  const finGeo = new THREE.BoxGeometry(cfg.radius * 0.1, cfg.radius * 1.4, cfg.radius * 1.2);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    const angle = (i * Math.PI) / 2;
    fin.position.set(Math.cos(angle) * (cfg.radius + cfg.radius * 0.5), cfg.radius * 0.7, Math.sin(angle) * (cfg.radius + cfg.radius * 0.5));
    fin.rotation.y = -angle;
    root.add(fin);
  }

  // Engine bell
  const engineGeo = new THREE.CylinderGeometry(cfg.radius * 0.3, cfg.radius * 0.6, cfg.radius * 0.7, 16);
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.position.y = -cfg.radius * 0.35;
  root.add(engine);

  // Strap-on boosters
  if (cfg.boosters > 0) {
    const bRadius = cfg.radius * 0.5;
    const bHeight = cfg.height * 0.65;
    const bGeo = new THREE.CylinderGeometry(bRadius, bRadius, bHeight, 16);
    const bConeGeo = new THREE.ConeGeometry(bRadius, bRadius * 1.8, 16);
    const bMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.3, roughness: 0.5 });

    for (let b = 0; b < cfg.boosters; b++) {
      const bAngle = (b * 2 * Math.PI) / cfg.boosters;
      const dist = cfg.radius + bRadius + 0.08;
      const booster = new THREE.Mesh(bGeo, bMat);
      booster.name = `booster_${b+1}`;
      booster.position.set(Math.cos(bAngle) * dist, bHeight / 2, Math.sin(bAngle) * dist);
      const bCone = new THREE.Mesh(bConeGeo, coneMat);
      bCone.position.set(Math.cos(bAngle) * dist, bHeight + (bRadius * 1.8) / 2, Math.sin(bAngle) * dist);
      root.add(booster);
      root.add(bCone);
    }
  }
}

function buildLaunchTower(root) {
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.4 });
  const platMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });

  // 4 Main corner legs
  const legGeo = new THREE.BoxGeometry(0.3, 14.0, 0.3);
  const positions = [
    [-1.5, 7.0, -1.5],
    [1.5, 7.0, -1.5],
    [-1.5, 7.0, 1.5],
    [1.5, 7.0, 1.5]
  ];
  positions.forEach((pos) => {
    const leg = new THREE.Mesh(legGeo, towerMat);
    leg.position.set(pos[0], pos[1], pos[2]);
    root.add(leg);
  });

  // Cross horizontal rings every 2 units
  const barGeoX = new THREE.BoxGeometry(3.0, 0.2, 0.2);
  const barGeoZ = new THREE.BoxGeometry(0.2, 0.2, 3.0);
  for (let y = 1.5; y <= 13.5; y += 2.0) {
    const b1 = new THREE.Mesh(barGeoX, towerMat);
    b1.position.set(0, y, 1.5);
    const b2 = new THREE.Mesh(barGeoX, towerMat);
    b2.position.set(0, y, -1.5);
    const b3 = new THREE.Mesh(barGeoZ, towerMat);
    b3.position.set(1.5, y, 0);
    const b4 = new THREE.Mesh(barGeoZ, towerMat);
    b4.position.set(-1.5, y, 0);
    root.add(b1, b2, b3, b4);
  }

  // Umbilical swing arms
  const armGeo = new THREE.BoxGeometry(2.2, 0.3, 0.4);
  const arm = new THREE.Mesh(armGeo, platMat);
  arm.position.set(0.6, 9.5, 1.8);
  root.add(arm);

  // Base platform
  const baseGeo = new THREE.BoxGeometry(4.5, 0.6, 4.5);
  const base = new THREE.Mesh(baseGeo, platMat);
  base.position.set(0, 0.3, 0);
  root.add(base);
}

function buildBus(root, id) {
  const busSizes = {
    bus_micro: [1.0, 1.0, 1.1],
    bus_small: [1.2, 1.2, 1.4],
    bus_medium: [1.5, 1.5, 1.8],
    bus_large: [2.0, 2.0, 2.4]
  };
  const dim = busSizes[id] || [1.2, 1.2, 1.4];
  const busMat = new THREE.MeshStandardMaterial({
    color: id === 'bus_large' ? 0xd97706 : id === 'bus_medium' ? 0x94a3b8 : 0x64748b,
    metalness: 0.7,
    roughness: 0.3
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(dim[0], dim[1], dim[2]), busMat);
  mesh.position.y = dim[1] / 2;
  root.add(mesh);
}

function buildSolarWing(root, id) {
  const wingSizes = {
    solar_wing_s: [0.06, 0.7, 1.3],
    solar_wing_m: [0.06, 1.1, 2.0],
    solar_wing_l: [0.06, 1.5, 2.8]
  };
  const dim = wingSizes[id] || [0.06, 1.0, 1.8];

  // Strut connector
  const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const strut = new THREE.Mesh(strutGeo, strutMat);
  strut.rotation.z = Math.PI / 2;
  strut.position.set(0.18, dim[1] / 2, 0);
  root.add(strut);

  // Photovoltaic panel array
  const panelGeo = new THREE.BoxGeometry(dim[2], dim[1], dim[0]);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.2 });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0.35 + dim[2] / 2, dim[1] / 2, 0);
  root.add(panel);
}

function buildComms(root, id) {
  if (id === 'comms_uhf') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xcfd8dc }));
    mast.position.y = 0.35;
    root.add(mast);
    return;
  }
  const dishRadius = id === 'comms_ka_band' ? 0.6 : id === 'comms_x_band' ? 0.45 : 0.3;
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(dishRadius, 0.06, 0.18, 24),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.7, roughness: 0.3 })
  );
  dish.position.y = 0.15;
  const subFeed = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
  subFeed.position.y = 0.28;
  root.add(dish, subFeed);
}

function buildFuel(root, id) {
  const heights = { fuel_s: 0.4, fuel_m: 0.6, fuel_l: 0.8 };
  const h = heights[id] || 0.5;
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, h, 16),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.4 })
  );
  tank.position.y = h / 2;
  root.add(tank);
}

function buildBattery(root, id) {
  const heights = { battery_s: 0.2, battery_m: 0.3, battery_l: 0.45 };
  const h = heights[id] || 0.25;
  const bat = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, h, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.3, roughness: 0.5 })
  );
  bat.position.y = h / 2;
  root.add(bat);
}

function buildInstrument(root, id) {
  const colors = {
    optical_camera: 0x38bdf8,
    weather_imager: 0xfbbf24,
    magnetometer: 0xa855f7,
    thermal_imager: 0xf43f5e,
    radar_imager: 0xf97316,
    spectrometer: 0x818cf8,
    laser_altimeter: 0x10b981,
    neutron_detector: 0x06b6d4,
    transponder_s: 0xec4899,
    transponder_m: 0xd946ef,
    transponder_l: 0xc084fc
  };
  const mat = new THREE.MeshStandardMaterial({ color: colors[id] || 0x38bdf8, metalness: 0.5, roughness: 0.3 });

  if (id === 'optical_camera') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16), mat);
    barrel.position.y = 0.2;
    root.add(barrel);
  } else if (id === 'magnetometer') {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), mat);
    boom.position.y = 0.45;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mat);
    tip.position.y = 0.9;
    root.add(boom, tip);
  } else if (id === 'radar_imager') {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), mat);
    panel.position.y = 0.3;
    root.add(panel);
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat);
    box.position.y = 0.15;
    root.add(box);
  }
}
