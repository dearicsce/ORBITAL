import {mount} from '../unity/bridge.js';
let view = null;
export function startEarth(container) {
  stopEarth();
  if (container) view = mount(container, 'earth');
}
export function stopEarth() { view?.destroy(); view = null; }
