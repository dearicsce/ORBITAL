import * as THREE from 'three';
import {bodyAngle, centralBody} from '../engine/flightClock.js';
import {operationPoint, operationCamera} from './orbitPresentation.js';

export const CAMERA_MODES = {
  inertial: 'Inertial',
  follow: 'Follow spacecraft',
  fixed: 'Earth-fixed'
};

export function createFlightFrame(scene, camera, craft, globe, orbitId, orbit) {
  const north = new THREE.Vector3(0, 1, 0);
  const home = new THREE.Vector3(...operationCamera(orbitId, orbit));
  const aim = new THREE.Vector3();
  const target = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const arrow = new THREE.ArrowHelper(north, new THREE.Vector3(), .95, 0x88eade, .27, .17);
  const pole = new THREE.ArrowHelper(north, new THREE.Vector3(0, 4, 0), 1.1, 0xf3c46d, .23, .15);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.10,12,8),
    new THREE.MeshBasicMaterial({color:0x8ef8e0,toneMapped:false}));
  scene.add(arrow, pole, beacon);
  let mode = 'inertial', showNorth = false;
  return {
    setCamera(modeId, northVisible) {
      if (Object.hasOwn(CAMERA_MODES, modeId)) mode = modeId;
      showNorth = Boolean(northVisible);
    },
    sample(elapsedSec, activeOrbit = orbit) {
      const spin = bodyAngle(centralBody(orbitId, activeOrbit), elapsedSec+(activeOrbit?.epochS??0));
      craft.position.copy(operationPoint(orbitId, elapsedSec, activeOrbit));
      globe.rotation.y = spin;
      tangent.copy(operationPoint(orbitId, elapsedSec + 1, activeOrbit))
        .sub(operationPoint(orbitId, elapsedSec - 1, activeOrbit));
      radial.copy(craft.position).normalize();
      beacon.position.copy(craft.position).addScaledVector(radial,.35);
      beacon.visible=mode!=='follow';
      arrow.visible = tangent.lengthSq() > 0;
      if (arrow.visible) {
        arrow.position.copy(craft.position).addScaledVector(radial, .48);
        arrow.setDirection(tangent.normalize());
      }
      pole.visible = showNorth;
      target.copy(aim);
      camera.position.copy(home);
      camera.up.copy(north);
      if (mode === 'follow') {
        target.copy(craft.position);
        camera.position.copy(craft.position).addScaledVector(radial, 4.5).addScaledVector(arrow.visible?tangent:north, 2.1);
        camera.up.copy(radial);
      } else if (mode === 'fixed') {
        camera.position.applyAxisAngle(north, spin);
        target.applyAxisAngle(north, spin);
      }
      camera.lookAt(target);
    }
  };
}
