import assert from 'node:assert/strict';
import * as THREE from '../../Assets/StreamingAssets/WebUI/vendor/three/three.module.js';
import { createLaunchVehicle, createDeLavalNozzle } from '../EmbeddedUI/launchVehicle.js';
import { createLaunchExhaust } from '../EmbeddedUI/launchExhaust.js';
import { createLiveAdapter } from '../EmbeddedUI/liveAdapter.js';

console.log('Running Aegis Rocket & Exhaust Regression Tests...\n');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

// 1. LatheGeometry De Laval Nozzle Generation
await test('1. LatheGeometry De Laval nozzle has smooth parabolic bell geometry', () => {
  const mat = new THREE.MeshBasicMaterial();
  const nozzle = createDeLavalNozzle(0.12, 0.45, 0.85, mat);

  assert.ok(nozzle.isMesh, 'Must be a THREE.Mesh');
  assert.equal(nozzle.geometry.type, 'LatheGeometry', 'Must be a LatheGeometry');
  assert.ok(nozzle.geometry.parameters.points.length >= 16, 'Must have at least 16 contour profile points');
  assert.equal(nozzle.geometry.parameters.points[0].x, 0.12, 'Throat radius matches parameter');
  assert.equal(nozzle.geometry.parameters.points.at(-1).x, 0.45, 'Exit radius matches parameter');
  assert.equal(nozzle.geometry.parameters.points.at(-1).y, -0.85, 'Nozzle length matches parameter along -Y');
});

// 2. Distinct Silhouettes for Light, Medium, Heavy, and Super-Heavy
await test('2. Distinct silhouettes for all 4 vehicle classes with proper flight nodes', () => {
  // Light (Albatross / Courier 1.8m)
  const light = createLaunchVehicle('albatross');
  const lightLower = light.getObjectByName('stage_lower');
  const lightEngines = lightLower.children.filter(c => c.userData.flightEngineId === 'core');
  assert.equal(lightEngines.length, 1, 'Light rocket has 1 core De Laval engine');
  assert.ok(light.getObjectByName('fairing_left'), 'Must have left fairing');
  assert.ok(light.getObjectByName('fairing_right'), 'Must have right fairing');

  // Medium (Condor 2.8m)
  const medium = createLaunchVehicle('condor');
  const mediumLower = medium.getObjectByName('stage_lower');
  const mediumEngines = mediumLower.children.filter(c => c.userData.flightEngineId === 'core');
  assert.equal(mediumEngines.length, 3, 'Medium rocket has 3 core De Laval engine cluster');

  // Heavy (Roc with 4 Boosters)
  const heavy = createLaunchVehicle('roc');
  const heavyLower = heavy.getObjectByName('stage_lower');
  const heavyBoosters = heavyLower.children.filter(c => c.name.startsWith('booster_'));
  assert.equal(heavyBoosters.length, 4, 'Heavy rocket has 4 solid rocket boosters');
  assert.ok(heavyBoosters[0].getObjectByName('booster_nozzle'), 'Booster has De Laval nozzle');
  assert.ok(heavyBoosters[0].getObjectByName('booster_nose'), 'Booster has aerodynamic nosecone');

  // Super-Heavy (Helio 3.5m+ with 7 engines)
  const superHeavy = createLaunchVehicle('super_heavy');
  const shLower = superHeavy.getObjectByName('stage_lower');
  const shEngines = shLower.children.filter(c => c.userData.flightEngineId === 'core');
  assert.equal(shEngines.length, 7, 'Super-heavy rocket has 7 core engine cluster');
});

// 3. Rocket Body-Frame Nozzle Exit Transform
await test('3. Nozzle exit coordinates are strictly in rocket body frame', () => {
  const rocket = createLaunchVehicle('condor');
  rocket.updateMatrixWorld(true);

  const nozzles = [];
  rocket.traverse(node => {
    const id = node.userData.flightEngineId;
    if (id) {
      if (node.geometry && !node.geometry.boundingBox) node.geometry.computeBoundingBox();
      const bbox = node.geometry?.boundingBox;
      const minY = bbox ? bbox.min.y : -0.5;
      const radius = bbox ? Math.max(Math.abs(bbox.max.x), Math.abs(bbox.max.z)) : 0.4;
      const exitWorld = node.localToWorld(new THREE.Vector3(0, minY, 0));
      const localInRocket = rocket.worldToLocal(exitWorld.clone());
      nozzles.push({ id, name: node.name, local: localInRocket, radius });
    }
  });

  assert.ok(nozzles.length >= 4, 'Must register core engines and upper engine');
  const coreNozzle = nozzles.find(n => n.id === 'core');
  assert.ok(coreNozzle, 'Core nozzle found');
  assert.ok(coreNozzle.local.y <= 0.1, 'Core nozzle exit must be at base of rocket (y <= 0.1 in rocket space)');

  const upperNozzle = nozzles.find(n => n.id === 'upper');
  assert.ok(upperNozzle, 'Upper nozzle found');
  assert.ok(upperNozzle.local.y > 5.0, 'Upper nozzle exit must be located at the interstage junction');
});

// 4. Exhaust direction, stage ownership and vacuum cutoff.
await test('4. Exhaust stays downstream and follows attached engine state', () => {
  const scene = new THREE.Scene();
  const nozzles = [
    {id:'core',local:new THREE.Vector3(0,0,0),radius:.25},
    {id:'upper',local:new THREE.Vector3(0,10,0),radius:.45},
  ];
  const exhaust=createLaunchExhaust(scene,{
    nozzles,orientation:()=>new THREE.Quaternion(),nozzlePosition:n=>n.local.clone(),
  });
  const root=scene.getObjectByName('aegis_launch_exhaust');
  exhaust.update(1,{altitudeKm:75,throttle:1,attachedPartIds:['upper'],engineStatesById:{upper:1,core:0}});
  const upper=root.getObjectByName('exhaust_upper');
  assert.ok(upper.visible);
  assert.equal(root.getObjectByName('exhaust_core').visible,false);
  upper.traverse(mesh=>{
    if(!mesh.geometry)return;
    mesh.geometry.computeBoundingBox();
    assert.ok(mesh.geometry.boundingBox.max.y<=1e-6,'Plume geometry cannot extend above its nozzle');
  });
  assert.equal(root.children.some(node=>node.isSprite&&node.visible),false,'No smoke in vacuum');
  exhaust.update(2,{altitudeKm:180,throttle:0,attachedPartIds:['upper'],engineStatesById:{upper:0}});
  assert.equal(upper.visible,false);
  exhaust.destroy();
  assert.equal(scene.children.length,0);
});

// 5. LiveAdapter Flight Telemetry & HUD Commands
await test('5. LiveAdapter exposes flight HUD telemetry and handles flight commands', async () => {
  const adapter = createLiveAdapter({
    initialRoute: 'flight',
    initialFlight: {
      tPlusS: 45.2,
      altitudeM: 12500,
      speedMps: 420,
      stage: 'core',
      burnActive: true,
      eventLabel: 'Max-Q · Throttle bucket'
    }
  });

  const state1 = adapter.getState();
  assert.equal(state1.route, 'flight');
  assert.ok(state1.flight, 'Must provide flight HUD snapshot');
  assert.equal(state1.flight.tPlusS, 45.2);
  assert.equal(state1.flight.altitudeM, 12500);
  assert.equal(state1.flight.stage, 'core');
  assert.equal(state1.actions.setPaused.enabled, true);
  assert.equal(state1.actions.deploy.enabled, false, 'Deploy must be disabled before orbit');

  // Test setEffects command
  const fxResult = await adapter.dispatch({ type: 'setEffects', payload: { enabled: false } });
  assert.equal(fxResult.accepted, true);
  assert.equal(adapter.getState().scene.effectsEnabled, false);

  // Test skipToCalculatedResult
  const skipResult = await adapter.dispatch({ type: 'skipToCalculatedResult' });
  assert.equal(skipResult.accepted, true);

  const stateOrbit = adapter.getState();
  assert.equal(stateOrbit.flight.stage, 'orbit');
  assert.equal(stateOrbit.flight.altitudeM, 550000);
  assert.equal(stateOrbit.actions.deploy.enabled, true, 'Deploy action enabled in orbit');

  // Test deploy
  const deployResult = await adapter.dispatch({ type: 'deploy' });
  assert.equal(deployResult.accepted, true);
  assert.equal(adapter.getState().flight.eventLabel, 'Spacecraft deployed into orbit');
});

console.log('\nALL 5 ROCKET & EXHAUST REGRESSION TESTS PASSED!');
