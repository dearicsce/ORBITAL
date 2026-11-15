import {mountMissionDeck} from '../presentation/liveAdapterFacade.js';

export function renderMenu(container, data) {
  container.replaceChildren();
  return mountMissionDeck(container, data, 'title');
}
