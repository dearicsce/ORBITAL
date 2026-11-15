import {CAMERA_MODES} from '../three/flightFrame.js';

export function cameraControls(orbitId) {
  const isMoon = orbitId === 'llo';
  const isLagrange = orbitId === 'lagrange';
  return `<div class="flight-camera">
    <label>Camera <select data-flight-camera>
      <option value="solar">Solar System</option>
      <option value="earth-moon">Earth–Moon</option>
      <option value="follow">Spacecraft</option>
      <option value="inertial">${isLagrange?'Region overview':'Orbit overview'}</option>
      ${isLagrange?'':`<option value="fixed">${isMoon ? 'Moon-fixed' : 'Earth-fixed'}</option>`}
    </select></label>
    <button type="button" class="orbital-btn-focus-craft" data-focus-craft title="Return focus to player spacecraft">Focus spacecraft</button>
    <label><input type="checkbox" data-flight-north> North pole</label>
    <small>Drag to rotate · Scroll to zoom · Select celestial bodies</small>
  </div>`;
}

export function bindCameraControls(container, view, saved = {}, save = () => {}) {
  const mode = container.querySelector('[data-flight-camera]');
  const north = container.querySelector('[data-flight-north]');
  const focusCraft = container.querySelector('[data-focus-craft]');
  if (!mode || !north) return;

  // Start new runs at the operating location and restore available saved views.
  const initialMode = [...mode.options].some(option => option.value===saved?.mode) ? saved.mode : 'inertial';
  mode.value = initialMode;
  north.checked = saved?.north === true;

  function update() {
    view.setCamera?.(mode.value, north.checked);
  }

  mode.onchange = () => {
    update();
    save({mode: mode.value, north: north.checked});
  };

  north.onchange = () => {
    update();
    save({mode: mode.value, north: north.checked});
  };

  if (focusCraft) {
    focusCraft.onclick = () => {
      mode.value = 'follow';
      update();
      save({mode: mode.value, north: north.checked});
      updateNote();
    };
  }

  if (typeof view.onTargetSelected === 'function') {
    view.onTargetSelected((targetId,activeMode) => {
      if (Object.hasOwn(CAMERA_MODES,activeMode)||targetId === 'craft') {
        mode.value = activeMode||'follow';
        save({mode: mode.value, north: north.checked});
        updateNote();
      }
    });
  }

  update();
  const note = document.createElement('small');
  note.className = 'world-scale-note';
  const updateNote = () => {note.textContent = mode.value==='solar' ? 'Illustrative positions · compressed distances and body sizes · mission clock' : mode.value==='follow' ? 'Camera follows spacecraft · orbit continues around the planet' : mode.value==='fixed' ? 'Rotating body frame · geostationary craft can appear still' : 'Mission clock · orbit altitude and Earth–Moon distance exaggerated';};
  container.querySelector('.flight-camera').append(note);
  mode.addEventListener('change',updateNote);
  updateNote();
}
