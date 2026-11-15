import {CAMERA_MODES} from '../three/flightFrame.js';

export function cameraControls(orbitId) {
  return `<div class="flight-camera"><label>Camera <select data-flight-camera>${Object.entries(CAMERA_MODES).map(([id,name])=>`<option value="${id}">${id==='fixed'&&orbitId==='llo'?'Moon-fixed':name}</option>`).join('')}</select></label><label><input type="checkbox" data-flight-north> North pole</label><small>Mint arrow · inertial orbital direction</small></div>`;
}

export function bindCameraControls(container, view, saved = {}, save = () => {}) {
  const mode = container.querySelector('[data-flight-camera]');
  const north = container.querySelector('[data-flight-north]');
  mode.value = Object.hasOwn(CAMERA_MODES, saved.mode) ? saved.mode : 'inertial';
  north.checked = saved.north === true;
  function update() {
    view.setCamera(mode.value, north.checked);
  }
  mode.onchange = north.onchange = () => {
    update();
    save({mode: mode.value, north: north.checked});
  };
  update();
}
