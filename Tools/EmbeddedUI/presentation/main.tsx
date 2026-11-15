import { CampaignPanel, type PanelController } from './Panels';
import { createRoot } from 'react-dom/client';
import { BriefAndPredictionScreen, TitleAndDeckScreen } from './Deck';
import './main.css';

export function mountOrbitalUI(container: HTMLElement, screen: 'title' | 'brief') {
  if (!window.OrbitalAdapter) throw new Error('Mission control adapter has not been initialized.');
  const root = createRoot(container);
  root.render(
    <div className="orbital-root" data-screen={screen === 'title' ? 'menu' : 'brief'}>
      {screen === 'title' ? <TitleAndDeckScreen /> : <BriefAndPredictionScreen />}
    </div>,
  );
  return () => root.unmount();
}

function mountOrbitalPanel(container: HTMLElement, kind: string, controller: PanelController) {
  const root = createRoot(container);
  root.render(<CampaignPanel kind={kind} controller={controller} />);
  return () => root.unmount();
}

Object.assign(window, { mountOrbitalUI, mountOrbitalPanel });
